# --- Stage 1: build ---
# Compiles our TypeScript source into plain JavaScript (dist/). We use a
# separate build stage so the final image doesn't need TypeScript, dev
# dependencies, or our raw source at all — just the compiled output.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only the package files first so Docker can cache the npm install
# step — it only re-runs if package.json/package-lock.json actually change,
# not every time we edit application code.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# --- Stage 2: production ---
# A clean, minimal image that only contains what's needed to RUN the app:
# production dependencies + the compiled dist/ folder from the build stage.
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Folders the app writes to at runtime (uploaded files, log files).
RUN mkdir -p uploads logs

# Running as root inside a container is unnecessary risk — if the app were
# ever compromised, a non-root process has far less it can do to the
# container/host. Node's official image already ships a "node" user for
# this purpose.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Lets `docker ps` / Docker Compose report whether the app is actually
# responding, not just whether the process is running.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/hello || exit 1

CMD ["node", "dist/server.js"]
