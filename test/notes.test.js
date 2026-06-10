'use strict';

/**
 * Notes + items API tests. The headline is cross-user isolation: a user must
 * never be able to read or mutate another user's notes or items.
 *
 * A throwaway DATA_DIR is set BEFORE requiring the app so these tests use a
 * fresh temp database and never touch real data.
 */

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mykeep-notes-test-'));
process.env.DATA_DIR = TMP_DIR;
process.env.SESSION_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/app');

after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

let userSeq = 0;
/** Register a fresh user and return a cookie-carrying supertest agent. */
async function newUser() {
  const agent = request.agent(app);
  const username = `user${userSeq++}`;
  await agent.post('/api/auth/register').send({ username, password: 'password123' });
  return agent;
}

test('auth required: list and create without a cookie -> 401', async () => {
  assert.equal((await request(app).get('/api/notes')).status, 401);
  assert.equal((await request(app).post('/api/notes').send({ title: 'x' })).status, 401);
});

test('create text note with defaults', async () => {
  const a = await newUser();
  const res = await a.post('/api/notes').send({ title: 'Hello', body: 'world' });
  assert.equal(res.status, 201);
  assert.equal(res.body.type, 'text');
  assert.equal(res.body.title, 'Hello');
  assert.equal(res.body.color, 'default');
  assert.equal(res.body.pinned, 0);
  assert.equal(res.body.archived, 0);
  assert.deepEqual(res.body.items, []);
});

test('create list note seeds items, embedded on read', async () => {
  const a = await newUser();
  const res = await a.post('/api/notes').send({
    type: 'list',
    title: 'Groceries',
    items: [{ content: 'Milk' }, { content: 'Eggs', checked: true }],
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.items[0].content, 'Milk');
  assert.equal(res.body.items[1].checked, 1);
});

test('invalid color and type -> 400', async () => {
  const a = await newUser();
  assert.equal((await a.post('/api/notes').send({ color: 'chartreuse' })).status, 400);
  assert.equal((await a.post('/api/notes').send({ type: 'spreadsheet' })).status, 400);
});

test('list returns only the caller notes, pinned first', async () => {
  const a = await newUser();
  await a.post('/api/notes').send({ title: 'first' });
  const second = await a.post('/api/notes').send({ title: 'second' });
  await a.patch(`/api/notes/${second.body.id}`).send({ pinned: true });

  const list = await a.get('/api/notes');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 2);
  assert.equal(list.body[0].title, 'second'); // pinned floats to top
});

test('archived filter and search', async () => {
  const a = await newUser();
  const keep = await a.post('/api/notes').send({ title: 'shopping list', body: 'bananas' });
  const arch = await a.post('/api/notes').send({ title: 'old note' });
  await a.patch(`/api/notes/${arch.body.id}`).send({ archived: true });

  const active = await a.get('/api/notes');
  assert.deepEqual(active.body.map((n) => n.id), [keep.body.id]);

  const archived = await a.get('/api/notes?archived=1');
  assert.deepEqual(archived.body.map((n) => n.id), [arch.body.id]);

  const found = await a.get('/api/notes?q=banana');
  assert.deepEqual(found.body.map((n) => n.id), [keep.body.id]);

  const none = await a.get('/api/notes?q=zzzznope');
  assert.equal(none.body.length, 0);
});

test('patch toggles and bumps updated_at; delete cascades items', async () => {
  const a = await newUser();
  const note = await a.post('/api/notes').send({
    type: 'list',
    items: [{ content: 'one' }],
  });
  const id = note.body.id;

  const patched = await a.patch(`/api/notes/${id}`).send({ color: 'teal', pinned: true });
  assert.equal(patched.body.color, 'teal');
  assert.equal(patched.body.pinned, 1);
  assert.notEqual(patched.body.updated_at, note.body.updated_at);

  assert.equal((await a.delete(`/api/notes/${id}`)).status, 200);
  assert.equal((await a.get(`/api/notes/${id}`)).status, 404);
  // The item is gone too (cascade): patching it now 404s.
  const itemId = note.body.items[0].id;
  assert.equal((await a.patch(`/api/items/${itemId}`).send({ checked: true })).status, 404);
});

test('checklist item add / check / delete', async () => {
  const a = await newUser();
  const note = await a.post('/api/notes').send({ type: 'list' });
  const id = note.body.id;

  const added = await a.post(`/api/notes/${id}/items`).send({ content: 'task' });
  assert.equal(added.status, 201);
  const itemId = added.body.id;

  const checked = await a.patch(`/api/items/${itemId}`).send({ checked: true });
  assert.equal(checked.body.checked, 1);

  assert.equal((await a.delete(`/api/items/${itemId}`)).status, 200);
  const reread = await a.get(`/api/notes/${id}`);
  assert.equal(reread.body.items.length, 0);
});

test('reorder sets positions and persists', async () => {
  const a = await newUser();
  const n1 = await a.post('/api/notes').send({ title: 'n1' });
  const n2 = await a.post('/api/notes').send({ title: 'n2' });
  // n2 currently on top (higher position). Push n1 above it.
  const res = await a.patch('/api/notes/reorder').send({
    positions: [{ id: n1.body.id, position: 100 }, { id: n2.body.id, position: 50 }],
  });
  assert.equal(res.status, 200);
  const list = await a.get('/api/notes');
  assert.deepEqual(list.body.map((n) => n.title), ['n1', 'n2']);
});

// ---------------- cross-user isolation (the security invariant) ----------------

test('User B cannot read, patch, or delete User A note', async () => {
  const a = await newUser();
  const b = await newUser();
  const aNote = (await a.post('/api/notes').send({ title: 'A secret' })).body;

  assert.equal((await b.get(`/api/notes/${aNote.id}`)).status, 404);
  assert.equal((await b.patch(`/api/notes/${aNote.id}`).send({ title: 'hacked' })).status, 404);
  assert.equal((await b.delete(`/api/notes/${aNote.id}`)).status, 404);

  // A's note is untouched.
  const reread = await a.get(`/api/notes/${aNote.id}`);
  assert.equal(reread.body.title, 'A secret');
});

test('A notes never appear in B list', async () => {
  const a = await newUser();
  const b = await newUser();
  await a.post('/api/notes').send({ title: 'A only' });
  const bList = await b.get('/api/notes');
  assert.equal(bList.body.length, 0);
});

test('reorder including another user note -> 403, nothing changes', async () => {
  const a = await newUser();
  const b = await newUser();
  const aNote = (await a.post('/api/notes').send({ title: 'A' })).body;
  const bNote = (await b.post('/api/notes').send({ title: 'B' })).body;

  const res = await b.patch('/api/notes/reorder').send({
    positions: [{ id: bNote.id, position: 999 }, { id: aNote.id, position: 1 }],
  });
  assert.equal(res.status, 403);

  // B's own note position was not changed either (transaction never ran).
  const aReread = await a.get(`/api/notes/${aNote.id}`);
  assert.equal(aReread.body.position, aNote.position);
});

test('User B cannot patch or delete User A item', async () => {
  const a = await newUser();
  const b = await newUser();
  const aNote = (await a.post('/api/notes').send({ type: 'list', items: [{ content: 'mine' }] })).body;
  const itemId = aNote.items[0].id;

  assert.equal((await b.patch(`/api/items/${itemId}`).send({ checked: true })).status, 404);
  assert.equal((await b.delete(`/api/items/${itemId}`)).status, 404);

  const reread = await a.get(`/api/notes/${aNote.id}`);
  assert.equal(reread.body.items[0].checked, 0); // untouched
});
