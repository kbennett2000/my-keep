# MyKeep — v1 Verification

This is the record of how MyKeep's hard requirements were verified, and how to reproduce the checks. It is
the capstone of the build (Slice 12).

## The headline requirement: zero runtime internet dependency

MyKeep must work with **no internet access at runtime** — no CDNs, no remote fonts/icons, no telemetry.
This is verified two ways: a static guard over the build, and a live run with the network physically cut.

### 1. Static guard — `npm run audit:offline`

[`scripts/offline-audit.sh`](../scripts/offline-audit.sh) greps the production build (`server/public`) for
any `http(s)://` URL and fails if it finds one that isn't on a tiny allowlist of strings that are **never
fetched**:

- `reactjs.org` / `react.dev` — React's error-decoder link, printed only in a console error message.
- `www.w3.org` — XML/SVG/MathML **namespace identifiers**; these are DOM constants, not network requests.

```bash
npm run audit:offline
# ✅ offline audit clean — no external asset/CDN URLs in the build.
```

The guard is real, not a no-op: injecting `https://cdn.example.com/evil.js` into the build makes it exit 1
with the offending URL listed. Run it in CI after the client build to catch regressions.

### 2. Live proof — running with `--network none`

The strong proof: build the image, run it with **no network interface except loopback**, then show the
open internet is unreachable *and* the app still works end-to-end.

```bash
docker build -t mykeep .
docker run -d --name mykeep-offline --network none -e SESSION_SECRET=offlinetest mykeep
# container interfaces: ["lo"]  — loopback only, no route to the internet
```

Driving the app from *inside* that container (loopback only) produced:

```json
{
  "1_internet":  "unreachable (good): EAI_AGAIN",   // fetch https://example.com — DNS fails, no net
  "2_health":    { "ok": true },
  "3_index":     "200 served MyKeep SPA",
  "4_register":  { "id": 1, "username": "off" },
  "5_textNote":  "Offline note",
  "6_listNote":  "Groceries (items=2)",
  "7_hydratedLabels": ["home"]
}
```

Internet was unreachable, yet health, the SPA, registration, a text note, a checklist note with items, and
label create/assign/hydrate all succeeded. **The app needs nothing from the internet.**

(Reproduce by execing a Node script that `fetch`es `https://example.com` — expect failure — then walks the
localhost `/api/*` flow — expect success.)

## Automated tests

| Suite | Command | Result |
|-------|---------|--------|
| Backend (API) | `npm test` | **35 / 35** pass |
| Frontend (UI) | `cd client && npm test` | **61 / 61** pass |
| Dependency audit (server) | `npm audit` | **0 vulnerabilities** |
| Dependency audit (client) | `cd client && npm audit` | **0 vulnerabilities** |

Backend tests include the **cross-user isolation** invariant (a user can never read or mutate another
user's notes, items, labels, or attachments). Frontend tests cover the data layer and every interactive
component (drag-reorder logic, label/attachment mutations, dark mode, etc.).

## Docker deployment (Slice 11)

Verified on a live Docker daemon:

- `docker compose build` succeeds (better-sqlite3 compiles in the builder; the client builds).
- `docker compose up -d` → `/api/health` returns `{"ok":true}`; the real SPA is served; register + create
  note work.
- **Persistence:** `docker compose down && up` keeps your notes (host `./data` volume holds `keep.db` +
  `uploads/`).
- **Configurable port:** set `PORT=9000` in `.env` → reachable on `:9000`, default `:8065` no longer.

## Feature checklist (all working)

- [x] Multi-user accounts — register / login / logout, bcrypt-hashed passwords, private per user
- [x] Text notes and checklists (add / check / delete items; checked sink to bottom)
- [x] Colors (12-color Keep palette), pin, archive (with an Archive view + unarchive)
- [x] Search (title / body / checklist content), within the current view
- [x] Labels — create / rename / delete, assign to notes, filter by label in the sidebar
- [x] Image attachments — upload, thumbnails on card + editor, delete (owner-scoped serving)
- [x] Drag-reorder notes (persists)
- [x] Light / dark theme (persisted)
- [x] 100% offline, LAN-only, Docker-deployable on port 8065 (configurable)

## Known follow-ups (not v1 blockers)

- The container runs as **root**, so files in the host `./data` are root-owned (backup needs `sudo`). A
  non-root user with uid mapping can harden this.
- Deferred features: reminders/notifications; trash with 30-day delete; export; note sharing between users.
