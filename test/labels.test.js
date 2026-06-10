'use strict';

/**
 * Label CRUD + assignment tests, including cross-user isolation: a user must
 * never touch another user's labels or assign labels across the boundary.
 */

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mykeep-labels-test-'));
process.env.DATA_DIR = TMP_DIR;
process.env.SESSION_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/app');

after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

let seq = 0;
async function newUser() {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: `lbl${seq++}`, password: 'password123' });
  return agent;
}

test('label create / duplicate / empty / list', async () => {
  const a = await newUser();
  const created = await a.post('/api/labels').send({ name: 'Work' });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, 'Work');

  assert.equal((await a.post('/api/labels').send({ name: 'Work' })).status, 409);
  assert.equal((await a.post('/api/labels').send({ name: '   ' })).status, 400);

  const list = await a.get('/api/labels');
  assert.deepEqual(list.body.map((l) => l.name), ['Work']);
});

test('label rename and delete', async () => {
  const a = await newUser();
  const id = (await a.post('/api/labels').send({ name: 'Temp' })).body.id;

  const renamed = await a.patch(`/api/labels/${id}`).send({ name: 'Permanent' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, 'Permanent');

  assert.equal((await a.delete(`/api/labels/${id}`)).status, 200);
  assert.equal((await a.get('/api/labels')).body.length, 0);
});

test('assign / unassign label, note hydration includes labels', async () => {
  const a = await newUser();
  const note = (await a.post('/api/notes').send({ title: 'tagged' })).body;
  const label = (await a.post('/api/labels').send({ name: 'Important' })).body;

  const assigned = await a.post(`/api/notes/${note.id}/labels`).send({ labelId: label.id });
  assert.equal(assigned.status, 201);

  const reread = await a.get(`/api/notes/${note.id}`);
  assert.deepEqual(reread.body.labels, [{ id: label.id, name: 'Important' }]);

  // Idempotent: assigning again doesn't duplicate.
  await a.post(`/api/notes/${note.id}/labels`).send({ labelId: label.id });
  assert.equal((await a.get(`/api/notes/${note.id}`)).body.labels.length, 1);

  const unassigned = await a.delete(`/api/notes/${note.id}/labels/${label.id}`);
  assert.equal(unassigned.status, 200);
  assert.equal((await a.get(`/api/notes/${note.id}`)).body.labels.length, 0);
});

test('?label= filters the notes list', async () => {
  const a = await newUser();
  const tagged = (await a.post('/api/notes').send({ title: 'has label' })).body;
  await a.post('/api/notes').send({ title: 'no label' });
  const label = (await a.post('/api/labels').send({ name: 'Filter' })).body;
  await a.post(`/api/notes/${tagged.id}/labels`).send({ labelId: label.id });

  const filtered = await a.get(`/api/notes?label=${label.id}`);
  assert.deepEqual(filtered.body.map((n) => n.id), [tagged.id]);
});

// ---------------- cross-user isolation ----------------

test('User B cannot rename or delete User A label', async () => {
  const a = await newUser();
  const b = await newUser();
  const labelA = (await a.post('/api/labels').send({ name: 'A label' })).body;

  assert.equal((await b.patch(`/api/labels/${labelA.id}`).send({ name: 'hacked' })).status, 404);
  assert.equal((await b.delete(`/api/labels/${labelA.id}`)).status, 404);

  // Untouched.
  assert.equal((await a.get('/api/labels')).body[0].name, 'A label');
});

test('User B cannot assign A label, nor assign to A note', async () => {
  const a = await newUser();
  const b = await newUser();
  const noteA = (await a.post('/api/notes').send({ title: 'A note' })).body;
  const labelA = (await a.post('/api/labels').send({ name: 'A label' })).body;
  const noteB = (await b.post('/api/notes').send({ title: 'B note' })).body;
  const labelB = (await b.post('/api/labels').send({ name: 'B label' })).body;

  // B tries to put A's label on B's own note -> 404 (label not B's).
  assert.equal((await b.post(`/api/notes/${noteB.id}/labels`).send({ labelId: labelA.id })).status, 404);
  // B tries to put B's label on A's note -> 404 (note not B's).
  assert.equal((await b.post(`/api/notes/${noteA.id}/labels`).send({ labelId: labelB.id })).status, 404);
});
