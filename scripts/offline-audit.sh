#!/usr/bin/env bash
#
# Offline audit: fail if the built SPA gained a real external (CDN/asset) URL.
#
# MyKeep must have zero runtime internet dependency. This greps the production
# build for http(s) URLs and allows only a short list of strings that are known
# never to be fetched:
#   - reactjs.org / react.dev  — React's error-decoder link, shown only in a
#                                console message; never requested.
#   - prosemirror.net          — a docs link inside a ProseMirror (TipTap) thrown
#                                Error message; never requested.
#   - www.w3.org               — XML/SVG/MathML namespace identifiers; these are
#                                DOM constants, not network requests.
# Anything else is treated as a regression and fails the build.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC="$ROOT/server/public"

# Build the client if the output isn't present (e.g. a fresh checkout / CI).
if [ ! -f "$PUBLIC/index.html" ]; then
  echo "server/public not found — building the client first…"
  (cd "$ROOT/client" && npm ci && npm run build)
fi

# Allowlist of hosts that may appear as inert strings (never fetched).
ALLOW='reactjs\.org|react\.dev|prosemirror\.net|www\.w3\.org'

# Collect every external URL token in the build, minus the allowlisted ones.
offenders="$(grep -rhoE "https?://[a-zA-Z0-9./_-]+" "$PUBLIC" \
  | sort -u \
  | grep -vE "https?://($ALLOW)" || true)"

if [ -n "$offenders" ]; then
  echo "❌ offline audit FAILED — unexpected external URL(s) in server/public:"
  echo "$offenders" | sed 's/^/   /'
  echo
  echo "The app must not load anything from the internet at runtime. Vendor the"
  echo "resource locally, or (if it is genuinely inert) add it to the allowlist"
  echo "in scripts/offline-audit.sh with a comment explaining why."
  exit 1
fi

echo "✅ offline audit clean — no external asset/CDN URLs in the build."
