// Generates the documentation screenshots in docs/images/ by driving the real
// app in a headless browser (Playwright). It boots a throwaway server against a
// temporary, empty database, seeds a realistic set of demo notes via the API,
// then captures each screen. The PNGs it writes are committed to the repo, so
// nobody needs to run this just to read the docs — it's an on-demand asset tool.
//
//   npm run screenshots
//
// One-time setup on a fresh machine: install a browser for Playwright. This
// script uses your system Google Chrome (channel: 'chrome'); alternatively run
// `npx playwright install chromium` if that build exists for your OS.
//
// Not wired into the test suite — it talks to a real browser and a child server.

import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IMAGES = join(ROOT, 'docs', 'images');
const PORT = 8199;
const BASE = `http://localhost:${PORT}`;
const USER = { username: 'demo', password: 'keepdemo123' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      // server not up yet
    }
    await sleep(250);
  }
  throw new Error(`server did not become healthy at ${BASE} within ${timeoutMs}ms`);
}

function ensureBuild() {
  if (existsSync(join(ROOT, 'server', 'public', 'index.html'))) return;
  console.log('• building the client (server/public missing)…');
  const r = spawnSync('npm', ['run', 'build'], { cwd: join(ROOT, 'client'), stdio: 'inherit' });
  if (r.status !== 0) throw new Error('client build failed');
}

// ---- demo content -----------------------------------------------------------

async function seed(api) {
  const label = async (name) => (await (await api.post(`${BASE}/api/labels`, { data: { name } })).json()).id;
  const home = await label('Home');
  const work = await label('Work');
  const ideas = await label('Ideas');

  const note = async (data) => (await (await api.post(`${BASE}/api/notes`, { data })).json()).id;
  const patch = (id, data) => api.patch(`${BASE}/api/notes/${id}`, { data });
  const assign = (id, labelId) => api.post(`${BASE}/api/notes/${id}/labels`, { data: { labelId } });

  // A pinned welcome note up top.
  const welcome = await note({
    type: 'text',
    color: 'yellow',
    title: 'Welcome to MyKeep 👋',
    body: '<p>Your notes live right here, on your own network. Add one in the box above — type, or start a checklist.</p>',
  });
  await patch(welcome, { pinned: true });

  // A pinned work note with a label.
  const standup = await note({
    type: 'text',
    color: 'orange',
    title: 'Standup notes',
    body: '<p>Ship the docs update. Review the open pull request. Plan next week.</p>',
  });
  await patch(standup, { pinned: true });
  await assign(standup, work);

  // A checklist.
  await note({
    type: 'list',
    color: 'default',
    title: 'Groceries',
    items: [
      { content: 'Coffee', checked: false },
      { content: 'Milk', checked: false },
      { content: 'Bananas', checked: false },
      { content: 'Bread', checked: true },
      { content: 'Eggs', checked: true },
    ],
  });

  // A note with links (shows the clickable-URL feature) + a label.
  const readlater = await note({
    type: 'text',
    color: 'blue',
    title: 'Read later',
    body: '<p>Good reads: https://www.theverge.com and cnn.com — open right from the note.</p>',
  });
  await assign(readlater, ideas);

  // A trip note with a label.
  const trip = await note({
    type: 'text',
    color: 'teal',
    title: 'Trip to Portland',
    body: '<p>Book the train tickets. Pack a rain jacket ☔. Find a good coffee spot near the hotel.</p>',
  });
  await assign(trip, home);

  // A green idea note.
  await note({
    type: 'text',
    color: 'green',
    title: 'Weekend project',
    body: '<p>Build a little weather display for the kitchen window.</p>',
  });

  // A couple more so the grid feels full — and share a label so the "Home"
  // filtered view has more than one note in it.
  const books = await note({
    type: 'list',
    color: 'purple',
    title: 'Books to read',
    items: [
      { content: 'Project Hail Mary', checked: false },
      { content: 'The Pragmatic Programmer', checked: false },
    ],
  });
  await assign(books, home);
  const garden = await note({
    type: 'text',
    color: 'pink',
    title: 'Garden',
    body: '<p>Water the tomatoes. Plant basil this weekend.</p>',
  });
  await assign(garden, home);
}

// ---- banner -----------------------------------------------------------------

const BANNER_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1280px; height: 640px; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #fffdf5 0%, #f1f7ff 100%);
    display: flex; align-items: center; gap: 56px; padding: 0 80px; overflow: hidden;
  }
  .left { flex: 1; }
  .brand { font-size: 84px; font-weight: 700; color: #202124; letter-spacing: -2px; }
  .brand .k { color: #fbbc04; }
  .tag { margin-top: 18px; font-size: 30px; line-height: 1.35; color: #5f6368; max-width: 560px; }
  .pills { margin-top: 30px; display: flex; gap: 12px; flex-wrap: wrap; }
  .pill { font-size: 19px; color: #3c4043; background: #fff; border: 1px solid #dadce0;
          border-radius: 999px; padding: 8px 18px; box-shadow: 0 1px 2px rgba(60,64,67,.12); }
  .cards { width: 360px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; transform: rotate(-4deg); }
  .card { border-radius: 12px; padding: 16px; box-shadow: 0 6px 16px rgba(60,64,67,.18);
          font-size: 17px; color: #202124; min-height: 92px; }
  .card b { display: block; margin-bottom: 6px; font-size: 18px; }
  .card .ck { color: #5f6368; }
  .yellow { background: #fff475; } .green { background: #ccff90; } .blue { background: #cbf0f8; }
  .pink { background: #fdcfe8; } .teal { background: #a7ffeb; } .orange { background: #fbbc04; }
</style></head><body>
  <div class="left">
    <div class="brand"><span class="k">My</span>Keep</div>
    <div class="tag">Your private, offline notes — on your own network.</div>
    <div class="pills">
      <span class="pill">Notes &amp; checklists</span>
      <span class="pill">Labels &amp; colours</span>
      <span class="pill">Self-hosted</span>
      <span class="pill">No internet needed</span>
    </div>
  </div>
  <div class="cards">
    <div class="card yellow"><b>Welcome 👋</b>Your notes live here.</div>
    <div class="card green"><b>Weekend</b>Weather display.</div>
    <div class="card blue"><b>Read later</b>Two good reads.</div>
    <div class="card pink"><b>Groceries</b><span class="ck">☑ Bread &nbsp; ☐ Coffee</span></div>
  </div>
</body></html>`;

// ---- main -------------------------------------------------------------------

async function main() {
  ensureBuild();
  mkdirSync(IMAGES, { recursive: true });

  const dataDir = mkdtempSync(join(tmpdir(), 'mykeep-shots-'));
  console.log(`• booting server on :${PORT} (data: ${dataDir})`);
  const server = spawn('node', ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), SESSION_SECRET: 'screenshots', DATA_DIR: dataDir, NODE_ENV: 'production' },
    stdio: 'ignore',
  });

  const browser = await chromium.launch({ channel: 'chrome' });
  let failed;
  try {
    await waitForHealth();

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const shot = async (name) => {
      await page.screenshot({ path: join(IMAGES, `${name}.png`) });
      console.log(`  ✓ ${name}.png`);
    };

    // 1. Login page (before any session).
    await page.goto(BASE);
    await page.waitForSelector('.auth-card');
    await shot('login');

    // 2. Register + seed demo content via the API (shares the page's cookies).
    const reg = await ctx.request.post(`${BASE}/api/auth/register`, { data: USER });
    if (!reg.ok()) throw new Error(`register failed: ${reg.status()}`);
    await seed(ctx.request);

    // 3. The populated grid (light) — the hero.
    await page.goto(BASE);
    await page.waitForSelector('.note-card');
    await sleep(400);
    await shot('notes-grid');

    // 4. Dark mode.
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
    await sleep(250);
    await shot('notes-grid-dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') !== 'dark');

    // 5. A note open in the editor, then its colour picker.
    await page.locator('.note-card', { hasText: 'Weekend project' }).getByText('Weekend project').click();
    await page.waitForSelector('.modal');
    await sleep(250);
    await shot('editor');
    await page.locator('.modal').getByRole('button', { name: 'Change color' }).click();
    await page.waitForSelector('.color-picker');
    await sleep(200);
    await shot('colors');
    await page.keyboard.press('Escape');

    // 6. A checklist note.
    await page.locator('.note-card', { hasText: 'Groceries' }).getByText('Groceries').click();
    await page.waitForSelector('.modal');
    await sleep(250);
    await shot('checklist');
    await page.keyboard.press('Escape');

    // 7. Labels: the sidebar filters the grid to one label's notes.
    await page.locator('.sidebar-item', { hasText: 'Home' }).click();
    await page.waitForSelector('.note-card');
    await sleep(350);
    await shot('labels');
    await page.locator('.sidebar-item', { hasText: 'Notes' }).click();
    await page.waitForSelector('.note-card');

    // 8. Search.
    await page.locator('input[aria-label="Search"]').fill('portland');
    await sleep(600); // debounce + reload
    await page.waitForSelector('.note-card');
    await shot('search');
    await page.locator('input[aria-label="Search"]').fill('');
    await sleep(400);

    // 9. Archive view (archive one note first so it isn't empty).
    const ids = await (await ctx.request.get(`${BASE}/api/notes?archived=0`)).json();
    const garden = ids.find((n) => n.title === 'Garden');
    if (garden) await ctx.request.patch(`${BASE}/api/notes/${garden.id}`, { data: { archived: true } });
    await page.locator('.sidebar-item', { hasText: 'Archive' }).click();
    await page.waitForSelector('.note-card');
    await sleep(300);
    await shot('archive');
    await page.locator('.sidebar-item', { hasText: 'Notes' }).click();

    // 10. Mobile — the two-column grid.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await page.waitForSelector('.note-card');
    await sleep(400);
    await shot('mobile');

    await ctx.close();

    // 11. Banner (its own page + viewport).
    const bctx = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
    const bpage = await bctx.newPage();
    await bpage.setContent(BANNER_HTML, { waitUntil: 'load' });
    await sleep(150);
    await bpage.screenshot({ path: join(IMAGES, 'banner.png') });
    console.log('  ✓ banner.png');
    await bctx.close();
  } catch (err) {
    failed = err;
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }

  if (failed) {
    console.error('\n✗ screenshot run failed:', failed.message);
    process.exit(1);
  }
  console.log(`\n✓ screenshots written to docs/images/`);
}

main();
