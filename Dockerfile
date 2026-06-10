# syntax=docker/dockerfile:1

# ---------- builder: install deps + build the client ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# better-sqlite3 is the only native dependency; it needs a toolchain to compile.
# (bcryptjs, multer, and the session store are pure JS.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Server production deps first (compiles better-sqlite3 against this base image).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Client build deps, then the full source, then build the SPA into server/public.
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY . .
RUN cd client && npm run build

# ---------- runtime: slim image that just runs the server ----------
# Same base as the builder so the compiled better-sqlite3 binary matches
# (same architecture and glibc).
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8065 \
    DATA_DIR=/app/data

# Only what the server needs at runtime — no client/ or its node_modules.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server

EXPOSE 8065

# Liveness probe via Node's built-in fetch (no curl/wget needed in the image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8065)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
