'use strict';

/**
 * Image attachment tests: upload, owner-scoped serve, delete — plus the
 * isolation invariant that one user can't fetch or delete another's image.
 */

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mykeep-att-test-'));
process.env.DATA_DIR = TMP_DIR;
process.env.SESSION_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/app');

after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

// Smallest valid PNG (1x1 transparent pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let seq = 0;
async function newUser() {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: `att${seq++}`, password: 'password123' });
  return agent;
}

async function makeNote(agent) {
  return (await agent.post('/api/notes').send({ title: 'with image' })).body;
}

test('upload image -> 201 with url; note hydration includes it', async () => {
  const a = await newUser();
  const note = await makeNote(a);

  const up = await a
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' });
  assert.equal(up.status, 201);
  assert.equal(up.body.mime, 'image/png');
  assert.equal(up.body.url, `/api/attachments/${up.body.id}`);

  const reread = await a.get(`/api/notes/${note.id}`);
  assert.equal(reread.body.attachments.length, 1);
  assert.equal(reread.body.attachments[0].id, up.body.id);
  assert.equal(reread.body.attachments[0].url, `/api/attachments/${up.body.id}`);
});

test('non-image upload -> 400', async () => {
  const a = await newUser();
  const note = await makeNote(a);
  const up = await a
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', Buffer.from('not an image'), { filename: 'note.txt', contentType: 'text/plain' });
  assert.equal(up.status, 400);
});

test('owner can fetch the image bytes', async () => {
  const a = await newUser();
  const note = await makeNote(a);
  const up = await a
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' });

  const got = await a.get(up.body.url);
  assert.equal(got.status, 200);
  assert.match(got.headers['content-type'], /image\/png/);
});

test('delete removes the row and file (subsequent GET 404)', async () => {
  const a = await newUser();
  const note = await makeNote(a);
  const up = await a
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' });

  assert.equal((await a.delete(up.body.url)).status, 200);
  assert.equal((await a.get(up.body.url)).status, 404);
  assert.equal((await a.get(`/api/notes/${note.id}`)).body.attachments.length, 0);
});

// ---------------- isolation ----------------

test('User B cannot fetch or delete User A image', async () => {
  const a = await newUser();
  const b = await newUser();
  const note = await makeNote(a);
  const up = await a
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' });

  assert.equal((await b.get(up.body.url)).status, 404);
  assert.equal((await b.delete(up.body.url)).status, 404);

  // Still there for A.
  assert.equal((await a.get(up.body.url)).status, 200);
});

test('User B cannot upload to User A note', async () => {
  const a = await newUser();
  const b = await newUser();
  const note = await makeNote(a);
  const up = await b
    .post(`/api/notes/${note.id}/attachments`)
    .attach('image', PNG, { filename: 'pixel.png', contentType: 'image/png' });
  assert.equal(up.status, 404);
});
