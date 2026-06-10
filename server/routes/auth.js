'use strict';

/**
 * Authentication routes: register, login, logout, me.
 *
 * Success of register/login establishes the session by setting
 * `req.session.userId`; that cookie (configured in app.js) is what every
 * user-scoped route later trusts via requireAuth.
 */

const express = require('express');
const { db } = require('../db');
const { hashPassword, verifyPassword } = require('../auth');
const { requireAuth } = require('../middleware');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;

// Prepared statements (compiled once, reused per request).
const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
const findByUsername = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
const findById = db.prepare('SELECT id, username FROM users WHERE id = ?');

function validateCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username) return { error: 'username is required' };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  return { username, password };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const creds = validateCredentials(req.body);
    if (creds.error) return res.status(400).json({ error: creds.error });

    const hash = await hashPassword(creds.password);

    let result;
    try {
      result = insertUser.run(creds.username, hash);
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'username already taken' });
      }
      throw err;
    }

    req.session.userId = result.lastInsertRowid;
    res.status(201).json({ id: result.lastInsertRowid, username: creds.username });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    // Generic 401 in all failure cases below — no user-enumeration.
    const user = username ? findByUsername.get(username) : undefined;
    const ok = user && (await verifyPassword(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'invalid username or password' });

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = findById.get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  res.json({ id: user.id, username: user.username });
});

module.exports = router;
