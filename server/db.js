'use strict';

/**
 * SQLite bootstrap + schema migrations for MyKeep.
 *
 * Opens (creating if needed) the database at ${DATA_DIR}/keep.db, enables WAL +
 * foreign keys, and runs idempotent `CREATE TABLE IF NOT EXISTS` migrations for
 * the full data model. Importing this module is the single source of schema
 * truth — every later slice reuses the exported `db` handle.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Resolve the data directory (where keep.db and uploaded images live). Relative
// paths resolve against the project root, not the cwd of whoever launched node.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure the data + uploads directories exist before SQLite tries to open a file in them.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'keep.db'));

// WAL gives better concurrency for a small multi-user app; foreign keys must be
// turned on per-connection in SQLite (off by default).
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Idempotent schema. Safe to run on every boot.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'list')),
    title      TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    color      TEXT NOT NULL DEFAULT 'default',
    pinned     INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
    archived   INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    position   REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

  CREATE TABLE IF NOT EXISTS list_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id  INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    content  TEXT NOT NULL DEFAULT '',
    checked  INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
    position REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_list_items_note ON list_items(note_id);

  CREATE TABLE IF NOT EXISTS labels (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    UNIQUE (user_id, name)
  );
  CREATE INDEX IF NOT EXISTS idx_labels_user ON labels(user_id);

  CREATE TABLE IF NOT EXISTS note_labels (
    note_id  INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, label_id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
`);

module.exports = { db, DATA_DIR, UPLOADS_DIR };
