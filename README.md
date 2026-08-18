# User Management API

A Node.js + Express + TypeScript backend, built with a Repository Layer + MVC architecture.

## Task 1: Basic Express Server

### Setup

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

The server starts on `http://localhost:3000` (configurable via `.env`, see `.env.example`).

### Endpoints

- `GET /hello` — returns a JSON greeting message.

### Other scripts

- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run lint` — run ESLint
- `npm run format` — run Prettier

## Run with Docker

Runs the API and its own MongoDB in separate containers, so you don't need MongoDB installed locally at all.

```bash
cp .env.example .env   # if you don't already have one; fill in the JWT secrets
docker compose up --build
```

The API is then available at `http://localhost:3000`, connected to the `mongo` container (not whatever `MONGODB_URI` is set to in `.env` — Compose overrides that to point at the container). Data, uploaded files, and logs persist across restarts via Docker volumes.

Stop with `docker compose down` (add `-v` to also wipe the database/volumes).
