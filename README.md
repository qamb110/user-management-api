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
- `npm test` — run the test suite with coverage

## Tests

```bash
npm test
```

Runs unit tests (`tests/unit/`) and integration tests (`tests/integration/`, using `supertest` against the app plus an in-memory MongoDB via `mongodb-memory-server` — no real database needed) with a coverage report. The run fails if coverage drops below 60% (configured in `jest.config.js`).

## Run with Docker

Runs the API and its own MongoDB in separate containers, so you don't need MongoDB installed locally at all.

```bash
cp .env.example .env   # if you don't already have one; fill in the JWT secrets
docker compose up --build
```

The API is then available at `http://localhost:3000`, connected to the `mongo` container (not whatever `MONGODB_URI` is set to in `.env` — Compose overrides that to point at the container). Data, uploaded files, and logs persist across restarts via Docker volumes.

Stop with `docker compose down` (add `-v` to also wipe the database/volumes).

## API Documentation (Swagger)

Once the server is running, open `http://localhost:3000/api-docs` in a browser for interactive, try-it-out API documentation covering every endpoint (auth, users, uploads, tasks) — including request/response schemas and which routes need a bearer token.

Click **Authorize** at the top of the page, paste in an access token (from `POST /login`), and you can call protected endpoints directly from the browser. The raw OpenAPI spec (e.g. for importing into Postman) is available at `/api-docs.json`.
