'use strict';

/**
 * Label CRUD and note↔label assignment. All routes behind requireAuth; every
 * query is scoped by user_id, and assignment verifies the user owns *both* the
 * note and the label before linking them.
 *
 * Exports two routers:
 *  - labelsRouter      mounted at /api/labels
 *  - noteLabelsRouter  mounted at /api/notes (note-scoped assign/unassign)
 */

const express = require('express');
const { db } = require('../db');

const stmtListLabels = db.prepare('SELECT id, name FROM labels WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC');
const stmtInsertLabel = db.prepare('INSERT INTO labels (user_id, name) VALUES (?, ?)');
const stmtGetOwnedLabel = db.prepare('SELECT id, name FROM labels WHERE id = ? AND user_id = ?');
const stmtRenameLabel = db.prepare('UPDATE labels SET name = ? WHERE id = ? AND user_id = ?');
const stmtDeleteLabel = db.prepare('DELETE FROM labels WHERE id = ? AND user_id = ?');
const stmtOwnedNote = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?');
const stmtAssign = db.prepare('INSERT OR IGNORE INTO note_labels (note_id, label_id) VALUES (?, ?)');
const stmtUnassign = db.prepare('DELETE FROM note_labels WHERE note_id = ? AND label_id = ?');

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ===================== labels router (mounted at /api/labels) =====================
const labelsRouter = express.Router();

// GET /api/labels
labelsRouter.get('/', (req, res) => {
  res.json(stmtListLabels.all(req.session.userId));
});

// POST /api/labels
labelsRouter.post('/', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const info = stmtInsertLabel.run(req.session.userId, name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'label already exists' });
    }
    throw err;
  }
});

// PATCH /api/labels/:id
labelsRouter.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !stmtGetOwnedLabel.get(id, req.session.userId)) {
    return res.status(404).json({ error: 'not found' });
  }
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    stmtRenameLabel.run(name, id, req.session.userId);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'label already exists' });
    }
    throw err;
  }
  res.json({ id, name });
});

// DELETE /api/labels/:id
labelsRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !stmtGetOwnedLabel.get(id, req.session.userId)) {
    return res.status(404).json({ error: 'not found' });
  }
  stmtDeleteLabel.run(id, req.session.userId); // FK cascade clears note_labels
  res.json({ ok: true });
});

// ============= note-scoped assign/unassign (mounted at /api/notes) =============
const noteLabelsRouter = express.Router();

// POST /api/notes/:id/labels  { labelId }
noteLabelsRouter.post('/:id/labels', (req, res) => {
  const userId = req.session.userId;
  const noteId = parseId(req.params.id);
  const labelId = parseId(req.body?.labelId);
  if (!noteId || !labelId) return res.status(400).json({ error: 'noteId and labelId required' });
  // Both must belong to the caller, else 404 (no existence leak either way).
  if (!stmtOwnedNote.get(noteId, userId) || !stmtGetOwnedLabel.get(labelId, userId)) {
    return res.status(404).json({ error: 'not found' });
  }
  stmtAssign.run(noteId, labelId);
  res.status(201).json({ ok: true });
});

// DELETE /api/notes/:id/labels/:labelId
noteLabelsRouter.delete('/:id/labels/:labelId', (req, res) => {
  const userId = req.session.userId;
  const noteId = parseId(req.params.id);
  const labelId = parseId(req.params.labelId);
  if (!noteId || !labelId || !stmtOwnedNote.get(noteId, userId)) {
    return res.status(404).json({ error: 'not found' });
  }
  stmtUnassign.run(noteId, labelId);
  res.json({ ok: true });
});

module.exports = { labelsRouter, noteLabelsRouter };
