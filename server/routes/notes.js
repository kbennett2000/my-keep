'use strict';

/**
 * Notes + checklist-items API. Every route is mounted behind requireAuth, and
 * every query is scoped to req.session.userId — a user can only ever read or
 * mutate their own notes, items, labels, and attachments.
 *
 * Ownership is enforced in exactly one place (getOwnedNote): note and item
 * handlers alike resolve the owning note first and 404 if it isn't the caller's,
 * so there's no existence leak and no scattered auth checks to get wrong.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const { db, UPLOADS_DIR } = require('../db');

// Keep's palette. The client maps these names to CSS variables.
const COLORS = new Set([
  'default', 'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'darkblue', 'purple', 'pink', 'brown', 'gray',
]);
const TYPES = new Set(['text', 'list']);

// --- Prepared statements (compiled once) ---
const stmtMaxPosition = db.prepare('SELECT COALESCE(MAX(position), 0) AS max FROM notes WHERE user_id = ?');
const stmtInsertNote = db.prepare(`
  INSERT INTO notes (user_id, type, title, body, color, position)
  VALUES (@user_id, @type, @title, @body, @color, @position)
`);
const stmtGetOwnedNote = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?');
const stmtDeleteNote = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?');

const stmtInsertItem = db.prepare(`
  INSERT INTO list_items (note_id, content, checked, position)
  VALUES (@note_id, @content, @checked, @position)
`);
const stmtItemsForNote = db.prepare('SELECT * FROM list_items WHERE note_id = ? ORDER BY position ASC, id ASC');
const stmtMaxItemPosition = db.prepare('SELECT COALESCE(MAX(position), 0) AS max FROM list_items WHERE note_id = ?');
// Resolve an item together with its note's owner, so item routes can enforce ownership.
const stmtGetItemWithOwner = db.prepare(`
  SELECT li.*, n.user_id AS owner_id
  FROM list_items li JOIN notes n ON n.id = li.note_id
  WHERE li.id = ?
`);
const stmtDeleteItem = db.prepare('DELETE FROM list_items WHERE id = ?');

const stmtLabelsForNote = db.prepare(`
  SELECT l.id, l.name FROM labels l
  JOIN note_labels nl ON nl.label_id = l.id
  WHERE nl.note_id = ?
  ORDER BY l.name COLLATE NOCASE ASC
`);
const stmtAttachmentsForNote = db.prepare('SELECT id, mime FROM attachments WHERE note_id = ? ORDER BY id ASC');
const stmtAttachmentFilesForNote = db.prepare('SELECT filename FROM attachments WHERE note_id = ?');

/** Returns the note row if it belongs to userId, else undefined. */
function getOwnedNote(id, userId) {
  return stmtGetOwnedNote.get(id, userId);
}

/** Hydrate a note row with its items, labels, and attachments for API responses. */
function hydrate(note) {
  return {
    ...note,
    items: stmtItemsForNote.all(note.id),
    labels: stmtLabelsForNote.all(note.id),
    attachments: stmtAttachmentsForNote.all(note.id).map((a) => ({ ...a, url: `/api/attachments/${a.id}` })),
  };
}

/** Parse an id path param to a positive integer, or null if invalid. */
function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ===================== notes router (mounted at /api/notes) =====================
const notesRouter = express.Router();

// GET /api/notes?archived=0&q=&label=
notesRouter.get('/', (req, res) => {
  const userId = req.session.userId;
  const archived = req.query.archived === '1' ? 1 : 0;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const labelId = parseId(req.query.label);

  // Build the query from the active filters. Notes stay user-scoped throughout.
  const joins = [];
  const where = ['n.user_id = ?', 'n.archived = ?'];
  const params = [userId, archived];
  if (q) {
    joins.push('LEFT JOIN list_items li ON li.note_id = n.id');
    const like = `%${q}%`;
    where.push('(n.title LIKE ? OR n.body LIKE ? OR li.content LIKE ?)');
    params.push(like, like, like);
  }
  if (labelId) {
    joins.push('JOIN note_labels nl ON nl.note_id = n.id');
    where.push('nl.label_id = ?');
    params.push(labelId);
  }

  const rows = db.prepare(`
    SELECT DISTINCT n.* FROM notes n ${joins.join(' ')}
    WHERE ${where.join(' AND ')}
    ORDER BY n.pinned DESC, n.position DESC, n.id DESC
  `).all(...params);
  res.json(rows.map(hydrate));
});

// POST /api/notes
notesRouter.post('/', (req, res) => {
  const userId = req.session.userId;
  const body = req.body || {};

  const type = body.type === undefined ? 'text' : body.type;
  if (!TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });

  const color = body.color === undefined ? 'default' : body.color;
  if (!COLORS.has(color)) return res.status(400).json({ error: 'invalid color' });

  if (body.items !== undefined && !Array.isArray(body.items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }

  const title = typeof body.title === 'string' ? body.title : '';
  const text = typeof body.body === 'string' ? body.body : '';
  const position = stmtMaxPosition.get(userId).max + 1;

  const create = db.transaction(() => {
    const info = stmtInsertNote.run({ user_id: userId, type, title, body: text, color, position });
    const noteId = info.lastInsertRowid;
    if (Array.isArray(body.items)) {
      body.items.forEach((item, i) => {
        stmtInsertItem.run({
          note_id: noteId,
          content: typeof item?.content === 'string' ? item.content : '',
          checked: item?.checked ? 1 : 0,
          position: typeof item?.position === 'number' ? item.position : i,
        });
      });
    }
    return noteId;
  });

  const noteId = create();
  res.status(201).json(hydrate(getOwnedNote(noteId, userId)));
});

// PATCH /api/notes/reorder  (declared before /:id so "reorder" isn't read as an id)
notesRouter.patch('/reorder', (req, res) => {
  const userId = req.session.userId;
  const positions = req.body?.positions;
  if (!Array.isArray(positions)) {
    return res.status(400).json({ error: 'positions must be an array' });
  }
  for (const p of positions) {
    const id = parseId(p?.id);
    if (id === null || typeof p.position !== 'number') {
      return res.status(400).json({ error: 'each entry needs a numeric id and position' });
    }
    if (!getOwnedNote(id, userId)) {
      return res.status(403).json({ error: 'one or more notes are not yours' });
    }
  }
  const update = db.prepare('UPDATE notes SET position = ? WHERE id = ? AND user_id = ?');
  const apply = db.transaction(() => {
    for (const p of positions) update.run(p.position, Number(p.id), userId);
  });
  apply();
  res.json({ ok: true });
});

// GET /api/notes/:id
notesRouter.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const note = id && getOwnedNote(id, req.session.userId);
  if (!note) return res.status(404).json({ error: 'not found' });
  res.json(hydrate(note));
});

// PATCH /api/notes/:id
notesRouter.patch('/:id', (req, res) => {
  const userId = req.session.userId;
  const id = parseId(req.params.id);
  const note = id && getOwnedNote(id, userId);
  if (!note) return res.status(404).json({ error: 'not found' });

  const body = req.body || {};
  const fields = {};
  if (body.title !== undefined) fields.title = String(body.title);
  if (body.body !== undefined) fields.body = String(body.body);
  if (body.type !== undefined) {
    if (!TYPES.has(body.type)) return res.status(400).json({ error: 'invalid type' });
    fields.type = body.type;
  }
  if (body.color !== undefined) {
    if (!COLORS.has(body.color)) return res.status(400).json({ error: 'invalid color' });
    fields.color = body.color;
  }
  if (body.pinned !== undefined) fields.pinned = body.pinned ? 1 : 0;
  if (body.archived !== undefined) fields.archived = body.archived ? 1 : 0;

  const keys = Object.keys(fields);
  if (keys.length > 0) {
    const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE notes SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = @id AND user_id = @user_id`)
      .run({ ...fields, id, user_id: userId });
  }
  res.json(hydrate(getOwnedNote(id, userId)));
});

// DELETE /api/notes/:id
notesRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const note = id && getOwnedNote(id, req.session.userId);
  if (!note) return res.status(404).json({ error: 'not found' });

  // Capture attachment filenames before the cascade clears their rows, then
  // unlink the files so a deleted note doesn't orphan images on disk.
  const files = stmtAttachmentFilesForNote.all(id).map((r) => r.filename);
  stmtDeleteNote.run(id, req.session.userId);
  for (const f of files) {
    fs.rm(path.join(UPLOADS_DIR, f), { force: true }, () => {});
  }
  res.json({ ok: true });
});

// POST /api/notes/:id/items
notesRouter.post('/:id/items', (req, res) => {
  const id = parseId(req.params.id);
  const note = id && getOwnedNote(id, req.session.userId);
  if (!note) return res.status(404).json({ error: 'not found' });

  const item = req.body || {};
  const content = typeof item.content === 'string' ? item.content : '';
  const checked = item.checked ? 1 : 0;
  const position = typeof item.position === 'number'
    ? item.position
    : stmtMaxItemPosition.get(id).max + 1;

  const info = stmtInsertItem.run({ note_id: id, content, checked, position });
  res.status(201).json({ id: info.lastInsertRowid, note_id: id, content, checked, position });
});

// ===================== items router (mounted at /api/items) =====================
const itemsRouter = express.Router();

// PATCH /api/items/:id
itemsRouter.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && stmtGetItemWithOwner.get(id);
  if (!row || row.owner_id !== req.session.userId) return res.status(404).json({ error: 'not found' });

  const body = req.body || {};
  const fields = {};
  if (body.content !== undefined) fields.content = String(body.content);
  if (body.checked !== undefined) fields.checked = body.checked ? 1 : 0;
  if (body.position !== undefined) {
    if (typeof body.position !== 'number') return res.status(400).json({ error: 'position must be a number' });
    fields.position = body.position;
  }
  const keys = Object.keys(fields);
  if (keys.length > 0) {
    const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE list_items SET ${setClause} WHERE id = @id`).run({ ...fields, id });
  }
  res.json(stmtGetItemWithOwner.get(id));
});

// DELETE /api/items/:id
itemsRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && stmtGetItemWithOwner.get(id);
  if (!row || row.owner_id !== req.session.userId) return res.status(404).json({ error: 'not found' });
  stmtDeleteItem.run(id);
  res.json({ ok: true });
});

module.exports = { notesRouter, itemsRouter };
