# MyKeep

A self-hosted, fully-offline Google Keep clone for home-LAN use. Node.js + Express +
`better-sqlite3` backend, React + Vite SPA, single Docker deployable. Zero internet dependency
at runtime — no CDNs, self-hosted fonts, bundled icons. Default port **8065** (configurable via
the `PORT` env var).

The implementation plan lives at the path noted when the project was planned; this file is the
standing guidance for *how* we work.

## Git workflow

- **Branch per slice**, off `main`: `slice/N-short-name`.
- **Scoped conventional commits**, small and atomic: `feat(api)`, `feat(web)`,
  `feat(auth)`, `feat(notes)`, `fix(...)`, `test(...)`, `docs(...)`, `chore(...)`.
- **PR per slice** via `gh`. The PR body states what landed, the open-question answers, and
  how it was verified.
- **Kris reviews and merges. Claude Code never self-merges. Never push to `main`. Never
  `--force`.**
- Plan Mode for every slice: produce a plan, Kris approves, then implement.

## Engineering principles

- **Tests are required.** Cover the security-critical invariants explicitly — above all that
  every query is scoped by `user_id` so no user can read or mutate another user's notes,
  labels, or attachments. Mark slow/integration tests (anything that boots the server or hits
  the DB end-to-end) so the fast unit suite stays fast.
- **Linted and type-safe**: backend and frontend ESLint-clean; React components written so
  prop and data shapes are obvious and checkable. Green before a PR.
- **Migrations**: schema changes go through the `db.js` migration bootstrap
  (`CREATE TABLE IF NOT EXISTS` + ordered, idempotent migration steps). No ad-hoc drift, no
  hand-edited production DB.
- **Single deployable unit**: a multi-stage Dockerfile builds the Vite SPA, then **one** Node
  process serves the static SPA + the JSON API on a single port. No separate web server.
- **Offline is a hard invariant**: nothing the browser loads or calls may leave the box at
  runtime. No CDN `<link>`/`<script>`, no Google Fonts, no remote analytics. Fonts are
  self-hosted via `@font-face`; icons are bundled into the JS at build time. Every PR that
  touches the client must keep `grep -rE "https?://" client/dist server/public` free of
  runtime asset/CDN references.
- **Dependency discipline**: MyKeep is deliberately lean — new dependencies need a reason.
  Prefer the platform and small, well-understood libraries over frameworks that pull large
  trees. The whole app must `npm ci` and build offline from a warm cache.
- **ADRs** in `docs/adr/` for genuinely new architectural decisions (not routine work).
- **Spec is canon — until reality corrects it.** If implementation reveals the plan/spec is
  wrong, fix the spec in the same PR with a `docs:` commit and note why. Reality wins; the
  spec gets updated, not worked around.

## Documentation
### The one rule everything serves

**Write for one real reader — and run every line past them.** Picture a specific person: curious,
non-technical, has never done this before, one frustration from closing the tab. Before anything
ships, hold each sentence and each step up to them and ask three things — *would they know what this
means? would they know how to do it? would they see why they're doing it?* Any "no" → cut it, explain
it, or move it. Every rule below is an instance of this one.

### The voice rules (each paired with the mistake it prevents — the mistake is what makes it stick)

- **Break the wall — a scannable page is itself reassurance.** Short paragraphs, frequent plain
  subheads, numbered steps for anything sequential, a code block for anything they'd type, one bold
  phrase per section. *Prevents:* a dense wall that signals "this is hard" before they've read a word.
- **No unexplained jargon — especially tooling.** Gloss and link every tool or term on first mention
  (the editor, the terminal, the package manager, the language). *Prevents:* the reader stranded on a
  word — and the subtler error of naming a scary unknown to "reassure" ("don't worry, no [X]"), which
  only teaches them [X] is something to fear.
- **Just-in-time, not just-in-case.** Explain a thing in the step that needs it, never earlier. Put
  the roadmap at the *end* as encouragement, not a syllabus at the front. *Prevents:* front-loaded
  caveats — and, worst, answering an unasked question, because a reassurance *plants* the fear it
  meant to soothe.
- **Motivation is timed, not cut.** The "you did it / this is real / you're becoming a builder" beats
  land hardest right after a win, at a section's close — never as opening preamble. *Prevents:*
  identity and proof beats falling flat because they arrived before the reader earned the feeling.
- **Show the win before the explanation.** Get the reader to a working, visible result as fast as
  possible, *then* explain how it works for the reader who's now curious. *Prevents:* the teach-then-do
  wall — making someone read a full explanation before anything happens.
- **Set up once; don't re-gate.** Establish setup a single time; later steps assume it's done and link
  back rather than re-explaining. Setup reappears only as symptom-tied troubleshooting. *Prevents:*
  re-charging a toll every section, which reads as friction and mild condescension.

### Two traps to name explicitly (we hit both, repeatedly)

- **Break-to-test.** Never ask the reader to do something whose only purpose is to exercise the work —
  break something, stop a service, force an error. That's the builder's job, already done for them.
  The reader only does what a real user would naturally do, and meets error states through reassurance
  ("if you ever see this, here's what it means"), never by being told to cause them. *(This one slipped
  past every specific rule above — it's the reason the root rule has to exist.)*
- **Completeness as a reflex.** "Everything true" is not "everything useful." If a sentence isn't
  helping the reader do the thing in front of them right now, it's costing them attention and
  confidence. Cut it.

### Before you call a page done

**Read it back as the reader, not the author.** Walk it top to bottom as that first-timer following it
literally — not as the writer confirming it works. Every noun explained or obvious; every step has a
how and a why; nothing asks them to break, inventory, or pre-learn. If you wouldn't follow it
comfortably with zero background, fix it before you ship.
