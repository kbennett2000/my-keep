'use strict';

/**
 * Image attachments: upload, owner-scoped serve, delete.
 *
 * Files live on disk in UPLOADS_DIR under a random, unguessable name; the DB row
 * ties each file to a note (and thus a user). Serving and deleting are gated by
 * ownership through that note, so images stay as private as the notes they
 * belong to. We deliberately serve by attachment id (owner-checked), not by raw
 * filename, so URLs can't be guessed or enumerated across users.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { db, UPLOADS_DIR } = require('../db');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const stmtOwnedNote = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?');
const stmtInsertAttachment = db.prepare('INSERT INTO attachments (note_id, filename, mime) VALUES (?, ?, ?)');
// Resolve an attachment together with its note's owner so routes can enforce ownership.
const stmtGetAttachmentWithOwner = db.prepare(`
  SELECT a.*, n.user_id AS owner_id
  FROM attachments a JOIN notes n ON n.id = a.note_id
  WHERE a.id = ?
`);
const stmtDeleteAttachment = db.prepare('DELETE FROM attachments WHERE id = ?');

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Keep only a short, safe extension derived from the uploaded filename.
function safeExt(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + safeExt(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(null, false); // reject non-images; handler turns the missing file into a 400
  },
});

// ============= upload (mounted at /api/notes) =============
const noteAttachmentsRouter = express.Router();

// POST /api/notes/:id/attachments   (multipart, field name: image)
noteAttachmentsRouter.post('/:id/attachments', upload.single('image'), (req, res) => {
  const noteId = parseId(req.params.id);
  if (!noteId || !stmtOwnedNote.get(noteId, req.session.userId)) {
    // Clean up an accepted upload if the note isn't the caller's.
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
    return res.status(404).json({ error: 'not found' });
  }
  if (!req.file) return res.status(400).json({ error: 'an image file is required' });

  const info = stmtInsertAttachment.run(noteId, req.file.filename, req.file.mimetype);
  res.status(201).json({ id: info.lastInsertRowid, mime: req.file.mimetype, url: `/api/attachments/${info.lastInsertRowid}` });
});

// ============= serve / delete (mounted at /api/attachments) =============
const attachmentsRouter = express.Router();

// GET /api/attachments/:id  — owner-scoped stream
attachmentsRouter.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && stmtGetAttachmentWithOwner.get(id);
  if (!row || row.owner_id !== req.session.userId) return res.status(404).json({ error: 'not found' });
  res.type(row.mime);
  res.sendFile(path.join(UPLOADS_DIR, row.filename));
});

// DELETE /api/attachments/:id
attachmentsRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && stmtGetAttachmentWithOwner.get(id);
  if (!row || row.owner_id !== req.session.userId) return res.status(404).json({ error: 'not found' });
  stmtDeleteAttachment.run(id);
  fs.rm(path.join(UPLOADS_DIR, row.filename), { force: true }, () => {});
  res.json({ ok: true });
});

module.exports = { noteAttachmentsRouter, attachmentsRouter };
