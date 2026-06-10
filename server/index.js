'use strict';

/**
 * MyKeep server entry point.
 *
 * One Node process serves the JSON API under /api and (once the client is built)
 * the React SPA from server/public. Sessions are stored in the same SQLite
 * database so logins survive restarts with no external dependency.
 *
 * Slice 1 wires up the skeleton only: config, session middleware, a health
 * check, and guarded static serving. Auth/notes/labels/attachments routes land
 * in later slices.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);

const { db } = require('./db');

const PORT = Number(process.env.PORT) || 8065;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-to-a-long-random-string';
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

// Behind a LAN reverse proxy or not, trust the first hop so secure-cookie logic
// (added later) and req.ip behave sensibly.
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new SqliteStore({
      client: db,
      // express-session calls store.clear()/prune via this table.
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Plain HTTP on the LAN, so no `secure` flag here.
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
);

// --- API ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Route stubs for later slices are mounted here as they land:
//   app.use('/api/auth', require('./routes/auth'));
//   app.use('/api/notes', require('./routes/notes'));
//   app.use('/api/labels', require('./routes/labels'));
//   app.use('/api', require('./routes/attachments'));

// --- Static SPA (guarded: no-ops until the client has been built) ---
if (fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
  app.use(express.static(PUBLIC_DIR));

  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyKeep listening on http://0.0.0.0:${PORT}`);
});
