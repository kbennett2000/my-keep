'use strict';

/**
 * Auth route tests. Drives the exported Express app in-process via supertest.
 *
 * A throwaway DATA_DIR is set BEFORE requiring the app, so importing db.js
 * creates a fresh temp database and these tests never touch real data.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Must happen before requiring the app (db.js reads DATA_DIR at import time).
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mykeep-test-'));
process.env.DATA_DIR = TMP_DIR;
process.env.SESSION_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/app');

after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test('register: success returns id + username and sets a session cookie', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice', password: 'password123' });
  assert.equal(res.status, 201);
  assert.equal(res.body.username, 'alice');
  assert.ok(Number.isInteger(res.body.id));
  assert.ok(res.headers['set-cookie'], 'expected a session cookie');
});

test('register: duplicate username -> 409', async () => {
  await request(app).post('/api/auth/register').send({ username: 'dupe', password: 'password123' });
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'dupe', password: 'password123' });
  assert.equal(res.status, 409);
});

test('register: short password -> 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'shorty', password: 'short' });
  assert.equal(res.status, 400);
});

test('register: empty username -> 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: '   ', password: 'password123' });
  assert.equal(res.status, 400);
});

test('login: correct credentials -> 200 + cookie', async () => {
  await request(app).post('/api/auth/register').send({ username: 'bob', password: 'password123' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bob', password: 'password123' });
  assert.equal(res.status, 200);
  assert.equal(res.body.username, 'bob');
  assert.ok(res.headers['set-cookie']);
});

test('login: wrong password -> 401', async () => {
  await request(app).post('/api/auth/register').send({ username: 'carol', password: 'password123' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'carol', password: 'wrongpassword' });
  assert.equal(res.status, 401);
});

test('login: unknown user -> 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'nobody', password: 'password123' });
  assert.equal(res.status, 401);
});

test('GET /me without a cookie -> 401 (requireAuth blocks anonymous access)', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /me with a session cookie -> the right user', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: 'dave', password: 'password123' });
  const res = await agent.get('/api/auth/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.username, 'dave');
});

test('logout: old cookie no longer authenticates', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: 'erin', password: 'password123' });
  assert.equal((await agent.get('/api/auth/me')).status, 200);

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 200);
  assert.deepEqual(logout.body, { ok: true });

  assert.equal((await agent.get('/api/auth/me')).status, 401);
});
