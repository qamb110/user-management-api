# Project Evaluation & Interview Preparation

**Project:** User Management API
**Stack:** Node.js · Express 4 · TypeScript · MongoDB (Mongoose) · JWT · WebSocket · Docker · Swagger

This document is written to be **spoken out loud**. Every explanation uses plain English, and every claim points at real code in this repository, like `src/app.ts:16`. Read Part 1 and Part 8 if you only have 20 minutes. Read everything if you have an evening.

---

## Table of contents

| Part | What it covers |
|---|---|
| **Part 1** | The project at a glance — what to say in the first 2 minutes |
| **Part 2** | Architecture — the 6 layers and how a request travels through them |
| **Part 3** | Every library, and why it was chosen |
| **Part 4** | Deep dives — auth, roles, database, validation, uploads, WebSocket, logging, Swagger, Docker, testing |
| **Part 5** | Core Node.js concepts, taught using this code |
| **Part 6** | 120+ likely questions with model answers |
| **Part 7** | Known gaps and how to defend them |
| **Part 8** | Appendices — endpoint table, file index, demo script, cram sheet |

---
---

# Part 1 — The project at a glance

## 1.1 The one-paragraph pitch

This is a backend REST API for managing users and their tasks. A person can sign up, log in, and get back a token that proves who they are. Admins can create users, update them, delete them, and assign tasks. Regular users can see and move only their own tasks. Users can upload a profile picture. Admins who are watching the system get a live message the moment a new user signs up, over a WebSocket. The whole thing is documented with Swagger and runs in Docker with its own database, so anyone can start it with one command.

## 1.2 The 30-second answer

> "I built a User Management REST API in Node.js, Express and TypeScript, with MongoDB for storage.
> It does authentication with JWT access and refresh tokens, role-based access for admins and normal users, a task board where admins assign work and users move it along, profile-picture uploads, and a live WebSocket feed for admins.
> It's organised in six layers so each file has one job, it's fully documented with Swagger, and it runs in Docker with its own MongoDB container."

## 1.3 The 2-minute answer

Say it in this order — it follows the way the project was actually built.

1. **The problem.** An API that manages user accounts safely, and lets admins hand out tasks.
2. **The foundation.** Express server in TypeScript. TypeScript catches mistakes before the code runs. Entry point is `src/server.ts`, app setup is `src/app.ts`.
3. **The layers.** Route → validator → middleware → controller → service → repository → model. Each layer only does one job, and only the repository layer is allowed to talk to the database.
4. **Authentication.** Passwords are hashed with bcrypt, never stored as plain text. Login returns a short-lived access token (15 minutes) and a long-lived refresh token (15 days). Refresh tokens rotate — each one can only be used once — and if an old one is used again, the system assumes it was stolen and logs the user out everywhere.
5. **Authorisation.** Two roles, `user` and `admin`. Some routes are admin-only. Some checks can only happen after loading data — for example, "is this task yours?" — so those live in the service layer.
6. **The task board.** Four fixed statuses — Backlog, Todo, InProgress, Completed — created automatically when the app starts. Admins create and assign tasks. Users see only their own and can move them.
7. **Extras.** Profile-picture upload with multer, size and type limits. Live WebSocket feed so admins see new signups without refreshing. Winston logging to console and files. Swagger docs at `/api-docs`.
8. **Delivery.** Multi-stage Dockerfile and a Compose file that starts the API and MongoDB together. One command, `docker compose up --build`, and it runs anywhere.
9. **Testing.** 58 tests — unit tests for the password and JWT utilities, and integration tests that send real HTTP requests through the whole stack against an in-memory MongoDB. Coverage is around 94%, with a threshold that fails the build if it drops.
10. **Honesty.** "The clearest next step is a CI pipeline to run those tests automatically on every push, and fixing the fact that sign-up currently lets anyone request the admin role."

## 1.4 What is actually in the project

| Feature | Where it lives |
|---|---|
| Health check | `src/routes/hello.routes.ts` |
| Sign up / user CRUD / soft delete | `src/routes/user.routes.ts`, `src/services/user.service.ts` |
| Login + refresh token rotation | `src/routes/auth.routes.ts`, `src/services/auth.service.ts` |
| Role-based access (user / admin) | `src/middlewares/authenticate.ts`, `src/services/task.service.ts` |
| Task board with 4 statuses | `src/routes/task.routes.ts`, `src/services/task.service.ts` |
| Profile-picture upload | `src/middlewares/upload.ts`, `src/controllers/upload.controller.ts` |
| Live admin feed | `src/websocket/socket.ts` |
| Logging | `src/utils/logger.ts`, `src/middlewares/requestLogger.ts` |
| API docs | `src/config/swagger.ts` + `@openapi` blocks in every route file |
| Containers | `Dockerfile`, `docker-compose.yml`, `DOCKER-FAQ.md` |
| Tests (58, ~94% coverage) | `tests/unit/`, `tests/integration/`, `jest.config.js` |

## 1.5 The three ways to run it

| Command | What happens | When to use it |
|---|---|---|
| `npm run dev` | `ts-node-dev` runs the TypeScript directly and restarts on every save | While coding |
| `npm run build && npm start` | `tsc` compiles TypeScript into plain JavaScript in `dist/`, then Node runs `dist/server.js` | To check the production build works |
| `docker compose up --build` | Builds the image, starts MongoDB, waits for it to be healthy, then starts the API | Demo, or a fresh machine |
| `npm test` | Runs all 58 tests against an in-memory MongoDB and prints a coverage report | Before pushing |

**Key point to make:** Node cannot run TypeScript files. It only runs JavaScript. So TypeScript is always turned into JavaScript first — either ahead of time by `tsc` (`npm run build`), or on the fly by `ts-node-dev` (`npm run dev`).

## 1.6 The project's history — build it as a story

Nine commits, six clear steps, each on its own branch with a pull request. If asked "how did you approach this?", walk this ladder:

| # | Commit | What landed |
|---|---|---|
| 1 | `3b4f2e4` | Bootstrap: Express server, `/hello`, ESLint, Prettier, `.env.example` |
| 2 | `94a9c9a` (PR #1) | The big one — users, JWT auth, refresh tokens, repositories, services, validators |
| 3 | `1e270a3` (PR #2) | Tasks + todo statuses, file uploads, Winston logging |
| 4 | `68d609c` (PR #3) | WebSocket live feed |
| 5 | `d6987bb` | Docker + Compose |
| 6 | `636a9c9` | Swagger documentation |

Branches used: `feat/implement-jwt-token-with-refresh-flow`, `feat/implement-todo-task`, `feat/implement-WebSocket`, `feat/create-swagger-doc`. That branch-per-feature plus PR habit is worth mentioning — it shows normal team workflow, not one giant commit.

---
---

# Part 2 — Architecture: the six layers

## 2.1 The idea in one line

**Every file has one job, and layers only talk to the layer directly below them.**

An analogy that works well out loud:

> A restaurant. The **waiter** (controller) takes your order and brings your food — he does not cook. The **chef** (service) decides how the dish is made — he does not go shopping. The **storekeeper** (repository) is the only person allowed into the store room (the database). If you let the waiter walk into the store room, the kitchen falls apart.

## 2.2 The layers

| Layer | Folder | Its one job | What it must **never** do |
|---|---|---|---|
| **Route** | `src/routes/` | Map a URL + HTTP method to a chain of functions | Contain logic |
| **Validator** | `src/validators/` | Check the *shape* of the input (required, is it an email, is it strong) | Touch the database |
| **Middleware** | `src/middlewares/` | Cross-cutting work: auth, logging, file upload, validation result | Know about a specific feature |
| **Controller** | `src/controllers/` | Read the request, call a service, send an HTTP response | Business rules or database queries |
| **Service** | `src/services/` | The actual business rules: hash the password, check ownership, decide what 404 means | Touch a Mongoose model directly |
| **Repository** | `src/repositories/` | The only place that queries the database | Contain business rules |
| **Model** | `src/models/` | Describe what a document looks like and its database-level rules | Anything else |

Supporting folders: `src/utils/` (small reusable helpers — JWT, password, logger), `src/config/` (database connection, Swagger spec), `src/websocket/` (the live feed).

## 2.3 The rule that holds it together

This comment at `src/repositories/user.repository.ts:3-6` is the contract:

```ts
// The Repository Layer is the ONLY place in the app allowed to talk to the
// Mongoose model directly. Controllers/services call these functions instead
// of importing `User` themselves. This keeps database query details in one
// place, so if we ever change how we query Mongo, we only change this file.
```

**Why this matters, in plain words:** if you ever swap MongoDB for PostgreSQL, you rewrite the four files in `src/repositories/` and nothing else. Every service, controller and route keeps working. That is the whole payoff.

## 2.4 What each layer looks like in real code

**Route** — no logic, just a chain (`src/routes/user.routes.ts:153-160`):

```ts
router.put(
  '/:id',
  authenticate,          // 1. who are you?
  requireAdminRole,      // 2. are you an admin?
  updateUserValidation,  // 3. is the input valid?
  validate,              // 4. stop here if it isn't
  userController.updateUser, // 5. do the work
);
```

**Controller** — read, call, respond (`src/controllers/user.controller.ts:57-64`):

```ts
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};
```

**Service** — the rules live here (`src/services/user.service.ts:84-100`). Notice it builds a partial update, so a field you did not send is not overwritten with `undefined`:

```ts
const updateData: userRepository.UpdateUserInput = {};
if (username) updateData.username = username;
if (email) updateData.email = email;
if (role) updateData.role = role;
if (password) updateData.password = await hashPassword(password);

const updatedUser = await userRepository.updateUserById(id, updateData);
if (!updatedUser) {
  throw new ServiceError('User not found', 404);
}
```

**Repository** — one query, nothing else (`src/repositories/user.repository.ts:43-47`):

```ts
export const updateUserById = (id: string, data: UpdateUserInput): Promise<IUser | null> => {
  // { new: true } makes Mongoose return the document AFTER the update,
  // instead of the old version before the change.
  return User.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
};
```

## 2.5 How the layers talk to each other

Two mechanisms, and it's worth naming them:

**Going down — plain function calls.** A controller calls `userService.updateUser(...)`. A service calls `userRepository.updateUserById(...)`. Nothing clever, just imports and function calls.

**Coming back up — return values, or a thrown error.** This is the interesting half. When something goes wrong deep down, the service throws a `ServiceError` carrying an HTTP status code (`src/services/user.service.ts:16-22`):

```ts
export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

The controller catches it and turns it into a response (`src/controllers/user.controller.ts:15-28`):

```ts
const handleError = (res: Response, error: unknown): void => {
  if (error instanceof userService.ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  if (isDuplicateKeyError(error)) {
    res.status(409).json({ message: 'Username or email is already in use' });
    return;
  }
  logger.error('Unhandled error in user controller', { error });
  res.status(500).json({ message: 'Something went wrong' });
};
```

**Say this clearly:** the service layer knows nothing about Express. It doesn't have `res`. It throws an error with a status code, and the controller decides how to turn that into HTTP. That's what makes the service testable without a web server.

There is also a **sideways** connection: the user service calls `broadcastNewUser()` to push a WebSocket message (`src/services/user.service.ts:57`). That's the one place a service reaches out to something other than a repository.

## 2.6 Trace 1 — a full request: `POST /users` (sign up)

Follow this hop by hop. This is the single most useful thing to memorise.

| # | What happens | Where |
|---|---|---|
| 1 | Request arrives at the Node HTTP server | `src/server.ts:24` |
| 2 | `requestLogger` starts a timer and registers a `finish` listener | `src/middlewares/requestLogger.ts:9-14` |
| 3 | `express.json()` parses the JSON body into `req.body` | `src/app.ts:19` |
| 4 | Express matches `/users` to the user router | `src/app.ts:37` |
| 5 | `createUserValidation` checks username, email, password strength, role | `src/validators/user.validator.ts:20-32` |
| 6 | `validate` sends `400` if any rule failed, otherwise calls `next()` | `src/middlewares/validate.ts:8-19` |
| 7 | `userController.createUser` calls the service | `src/controllers/user.controller.ts:30-37` |
| 8 | `userService.createUser` hashes the password with bcrypt | `src/services/user.service.ts:42` |
| 9 | `userRepository.createUser` runs `User.create(...)` | `src/repositories/user.repository.ts:23-25` |
| 10 | Mongoose applies schema rules (`required`, `unique`, `trim`, `lowercase`) and writes to MongoDB | `src/models/user.model.ts:16-62` |
| 11 | `toSafeUser` strips the password hash out of the object | `src/services/user.service.ts:27-30` |
| 12 | `broadcastNewUser` pushes `{ event: 'user_created' }` to every connected admin | `src/websocket/socket.ts:63-75` |
| 13 | Controller responds `201` with the safe user | `src/controllers/user.controller.ts:33` |
| 14 | The `finish` event fires; `requestLogger` writes the line with status and duration | `src/middlewares/requestLogger.ts:14-27` |

If step 10 fails because the username already exists, MongoDB throws error code `11000`, it bubbles up to `handleError`, and the client gets **409 Conflict** instead of a raw database error (`src/controllers/user.controller.ts:12-13, 21-24`).

## 2.7 Trace 2 — `PATCH /tasks/:id/status` (the interesting one)

This trace shows why authorisation is not always a middleware.

| # | What happens | Where |
|---|---|---|
| 1 | `authenticate` reads `Authorization: Bearer <token>`, verifies it, sets `req.user = { sub, role }` | `src/middlewares/authenticate.ts:20-39` |
| 2 | `updateTaskStatusValidation` checks the id is a valid Mongo id and the status is one of the four names | `src/validators/task.validator.ts:15-19` |
| 3 | `validate` stops with `400` if anything failed | `src/middlewares/validate.ts` |
| 4 | Controller calls the service with the id, new status and `req.user` | `src/controllers/task.controller.ts:34-41` |
| 5 | Service loads the task; `404` if it doesn't exist | `src/services/task.service.ts:65-68` |
| 6 | Service checks **ownership**: are you the assignee, or an admin? `403` if neither | `src/services/task.service.ts:73-80` |
| 7 | Service converts the status *name* ("Todo") into the status document's `_id` | `src/services/task.service.ts:82-85` |
| 8 | Repository updates and re-populates the references | `src/repositories/task.repository.ts:42-45` |
| 9 | `200` with the full updated task | `src/controllers/task.controller.ts:37` |

**The point to make out loud:** notice that `requireAdminRole` is *not* in this chain. That is deliberate, and the code says why (`src/routes/task.routes.ts:123-125`). To know whether you're allowed to move this task, you first have to load the task from the database and see who it's assigned to. Middleware runs before any data is loaded, so the check cannot live there. It belongs in the service.

```ts
// src/services/task.service.ts:75-80
// Only the person the task is assigned to, or an admin, may move it.
const isOwner = assignedToUser._id.toString() === requestingUser.sub;
const isAdmin = requestingUser.role === 'admin';
if (!isOwner && !isAdmin) {
  throw new ServiceError('You are not allowed to update this task', 403);
}
```

## 2.8 Middleware order in `src/app.ts` — and why it is that order

```ts
app.use(requestLogger);                              // :16
app.use(express.json());                             // :19
app.use('/uploads', express.static(UPLOADS_DIR));    // :23
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // :28
app.get('/api-docs.json', (_req, res) => { res.json(swaggerSpec); }); // :29-31
app.use('/', helloRoutes);                           // :34
app.use('/', authRoutes);                            // :35
app.use('/', uploadRoutes);                          // :36
app.use('/users', userRoutes);                       // :37
app.use('/tasks', taskRoutes);                       // :38
```

**Express runs middleware top to bottom, in registration order.** So:

- `requestLogger` is **first** so it wraps everything — including requests that get rejected by validation. If it were last, rejected requests would never be logged.
- `express.json()` must come **before** any route that reads `req.body`. Without it, `req.body` is `undefined`.
- The routers come **last**, because a router is where the response finally gets sent.

**A great follow-up to be ready for:** "What if you moved `express.json()` below the routes?" Answer: every POST and PUT would break, because `req.body` would be undefined by the time the controller reads it.

## 2.9 The `dotenv` trap — a very likely question

Look at `src/server.ts:1-9`:

```ts
import dotenv from 'dotenv';

// Load variables from the .env file into process.env BEFORE importing
// anything else. Other modules (e.g. src/utils/jwt.ts) read env vars like
// JWT_ACCESS_SECRET as soon as they're imported, so dotenv must run first
// or those values would still be undefined at that point.
dotenv.config();

import app from './app';
```

**Why it must be there.** `src/utils/jwt.ts:7-8` reads the secrets at the top level of the file:

```ts
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
```

That line runs **the moment the file is imported**, not when a function is called. So if `import app` ran first, it would pull in the routes, which pull in the middleware, which pulls in `jwt.ts` — and `JWT_ACCESS_SECRET` would still be `undefined`, because `.env` hadn't been read yet. Tokens would then be signed with `undefined` as the secret.

**What you'd say if asked "how would you make this safer?"** Wrap the secrets in a function so they're read when used, not when imported — or add a startup check that throws if any required variable is missing. Right now the `as string` cast tells TypeScript to trust it, which hides the problem.

---
---

# Part 3 — Every library, and why it was chosen

For each one: what it is in one line, where it's used here, and the "why not something else?" answer.

## 3.1 Runtime dependencies

### express `^4.19.2`
**What it is:** the web framework — it handles incoming HTTP requests and routing.
**Where:** `src/app.ts`, every file in `src/routes/`.
**Why:** it is small, unopinionated, and the middleware model maps perfectly onto the layered design here.
**Why not Fastify?** Fastify is faster, but for this size of project the difference is irrelevant, and Express has far more examples and middleware available.
**Why not NestJS?** Nest gives you this structure out of the box, but then the structure isn't *your* decision — building the layers by hand shows you understand *why* they exist.
**Note:** this is Express **4**. Express 5 changes how async errors are handled (it forwards rejected promises to the error handler automatically). In 4, an unhandled promise rejection in a route would crash — which is why every controller has its own `try/catch`.

### mongoose `^9.9.2`
**What it is:** an ODM — Object Document Mapper. It lets you define a schema for MongoDB documents and gives you a typed model to query with.
**Where:** all four files in `src/models/`, used only through `src/repositories/`.
**Why:** MongoDB itself has no schema. Mongoose adds one, so `required`, `unique`, `enum`, `trim` and `lowercase` are enforced before anything reaches the database.
**Why not the raw `mongodb` driver?** You'd write validation by hand and get no `populate()` for joining references.
**Why MongoDB and not SQL?** The data here is document-shaped and the relationships are simple (a task points at a user and a status). If the project grew reporting requirements with lots of joins, PostgreSQL would be the better fit — that's an honest answer, and a good one.

### jsonwebtoken `^9.0.3`
**What it is:** creates and verifies JWTs — signed tokens that prove who a user is.
**Where:** `src/utils/jwt.ts`.
**Why:** it's the standard library for this, and it handles signing, expiry and verification in one call.
**Why not server-side sessions?** Sessions need shared storage between servers. JWTs are stateless — any server holding the secret can verify a token without a database lookup. The trade-off is that you can't easily cancel a JWT before it expires, which is exactly why access tokens here only last 15 minutes.

### bcrypt `^6.0.0`
**What it is:** hashes passwords.
**Where:** `src/utils/password.ts:25-36`.
**Why:** bcrypt is *deliberately slow*. That's the feature. A fast hash lets an attacker try billions of guesses per second; bcrypt at 10 salt rounds makes each guess expensive.
**Why not SHA-256?** SHA-256 is designed to be fast, which makes it a bad choice for passwords. Also bcrypt automatically adds a random salt to every hash, so two users with the same password get different hashes.
**Why not argon2?** Argon2 is the newer recommendation and is a good answer to "what would you use next time". bcrypt is more widely supported and battle-tested.

### express-validator `^7.3.2`
**What it is:** middleware that checks and cleans request fields.
**Where:** `src/validators/`, applied per route, collected by `src/middlewares/validate.ts`.
**Why:** it plugs directly into the middleware chain, so validation happens before the controller runs — no `if (!req.body.email)` inside controllers.
**Why not Joi or Zod?** Both are excellent and Zod gives you TypeScript types from the schema for free. express-validator was chosen because it's Express-native and needs no extra wiring. Zod would be the upgrade if this project grew.

### multer `^2.2.0`
**What it is:** parses `multipart/form-data` — that's the encoding browsers use to upload files.
**Where:** `src/middlewares/upload.ts`.
**Why:** `express.json()` cannot read file uploads. Multer streams the file to disk and puts the details on `req.file`.
**Why not save to S3 or Cloudinary?** For a real deployment you would — disk storage disappears when a container restarts. For this project, local disk plus a Docker volume was the simpler correct choice.

### ws `^8.21.3`
**What it is:** a minimal WebSocket server. WebSockets keep a connection open both ways, so the server can push messages to the client without being asked.
**Where:** `src/websocket/socket.ts`.
**Why:** the reasoning is already in the code (`src/websocket/socket.ts:6-9`) — this app needs exactly one thing, "tell admins a user was created". `ws` needs no special client library; any standard WebSocket client works.
**Why not Socket.IO?** Socket.IO adds rooms, automatic reconnection and fallback to polling. All useful — and all unnecessary here. It also forces clients to use the Socket.IO client library.

### winston `^3.19.0`
**What it is:** a logging library with levels and multiple outputs.
**Where:** `src/utils/logger.ts`, used everywhere.
**Why not `console.log`?** Three reasons: log levels (you can turn down the noise in production with `LOG_LEVEL`), multiple destinations (console *and* files at the same time), and structured JSON in files so a log tool can parse them.
**Why not pino?** Pino is faster. Winston's multiple-transport setup was easier to configure for the console-plus-two-files layout here.

### swagger-jsdoc `^6.3.0` + swagger-ui-express `^5.0.1`
**What they are:** the first reads special `@openapi` comments in your code and builds an OpenAPI spec; the second serves an interactive web page from that spec.
**Where:** `src/config/swagger.ts`, mounted at `src/app.ts:28-31`.
**Why:** the documentation sits directly above the route it describes, so it's much harder for the two to drift apart than if the spec were a separate YAML file.

### dotenv `^16.4.5`
**What it is:** reads a `.env` file into `process.env`.
**Where:** `src/server.ts:7`.
**Why:** secrets must never be hardcoded. `.env` is gitignored; `.env.example` is committed and shows the shape without real values.

### mongodb `^7.5.0`
The underlying driver Mongoose uses. It's listed directly in `package.json` but the code never imports it — Mongoose brings it in anyway.

### uuid `^14.0.1` — **be ready for this one**
This is listed as a dependency but is **never used**. `src/utils/jwt.ts:2` imports `randomUUID` from Node's built-in `crypto` module instead. If an evaluator scans `package.json` and asks, the honest answer is: *"I added it, then realised Node has `crypto.randomUUID` built in since Node 14, so I used that and forgot to remove the package. It should be uninstalled."* That's a fine answer — it shows you know Node's standard library.

## 3.2 Development dependencies

| Package | What it does here |
|---|---|
| `typescript ^5.4.5` | Compiles `src/*.ts` to `dist/*.js`. Config in `tsconfig.json`, `strict: true` |
| `ts-node-dev ^2.0.0` | Runs TypeScript directly and restarts on save (`npm run dev`). `--transpile-only` skips type-checking for speed |
| `jest ^30` + `ts-jest` | The test runner; `ts-jest` lets it run TypeScript directly. Config in `jest.config.js` |
| `supertest ^7` | Sends HTTP requests to the Express app in-process, without opening a port |
| `mongodb-memory-server ^11` | Runs a real MongoDB in memory for integration tests — not a mock |
| `eslint ^8.57.0` + `@typescript-eslint/*` | Catches bad patterns (unused variables, unsafe types) |
| `eslint-config-prettier` | Turns off ESLint's formatting rules so ESLint and Prettier don't fight |
| `prettier ^3.3.2` | Formats code consistently — single quotes, semicolons, 100-char lines |
| `@types/*` | Type definitions for libraries written in plain JavaScript, so TypeScript understands them |

**Question to expect:** "What's the difference between `dependencies` and `devDependencies`?"
**Answer:** `dependencies` are needed to *run* the app. `devDependencies` are only needed to *build* it or work on it. This matters in production — the Dockerfile runs `npm ci --omit=dev` at `Dockerfile:30`, so TypeScript, ESLint and Prettier never end up in the final image. That makes it smaller and reduces the attack surface.

## 3.3 TypeScript setup

`tsconfig.json`:

```json
{
  "target": "ES2020",
  "module": "commonjs",
  "rootDir": "src",
  "outDir": "dist",
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "resolveJsonModule": true
}
```

In plain English:
- `target: ES2020` — which JavaScript version to output. ES2020 gives modern features like optional chaining (`req.user?.role`).
- `module: commonjs` — output uses `require()`, which is Node's classic module system. This is why `__dirname` works in `src/middlewares/upload.ts:9`.
- `strict: true` — the important one. TypeScript refuses to let you use a value that might be `null` or `undefined` without checking it first. This is why the code is full of `if (!user) throw ...` guards.
- `esModuleInterop: true` — lets you write `import express from 'express'` even though Express is a CommonJS module.
- `skipLibCheck: true` — don't type-check inside `node_modules`. Faster builds.

---
---

# Part 4 — Deep dives

## 4.1 Authentication — the full journey

### 4.1.1 The idea, in plain words

HTTP is **stateless**. Every request arrives with no memory of the one before it. So after you log in, every later request has to prove who you are again.

Two ways to do that:
- **Sessions:** the server remembers you and gives you an ID. Every request, the server looks that ID up in its memory or database.
- **Tokens (what this project uses):** the server gives you a signed note. Every request, you show the note. The server checks the signature — no lookup needed.

**The analogy:** a session is a guest list at the door — the bouncer has to check the list every time. A JWT is a wristband with a tamper-proof seal — the bouncer just looks at it. Faster, but you can't remove someone from the list once the wristband is on. That's why access tokens here expire in 15 minutes.

### 4.1.2 What a JWT actually is

Three parts joined by dots: `header.payload.signature`.

- **Header** — which algorithm signed it.
- **Payload** — the data. Here: `{ sub: "<userId>", role: "admin" }` (`src/utils/jwt.ts:35-38`).
- **Signature** — a hash of the first two parts plus the secret.

**Critical point, and a very common question:** a JWT is **encoded, not encrypted**. Anyone can paste it into jwt.io and read the payload. What they *cannot* do is change it, because they don't have the secret to produce a matching signature. That's exactly why the code comment at `src/utils/jwt.ts:32-34` says:

```ts
// What we store inside each token. Notice there's no password or other
// sensitive data in here — JWT payloads are just base64, not encrypted,
// so anyone holding the token can read them.
```

So: never put a password, an email, or anything private in a JWT payload. This project puts only a user id and a role.

### 4.1.3 Two tokens, two secrets, two lifetimes

| | Access token | Refresh token |
|---|---|---|
| Payload | `{ sub, role }` | `{ sub, jti }` |
| Secret | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| Lifetime | 15 minutes | 15 days |
| Sent with | every API request | only to `POST /refresh-token` |
| Stored server-side? | no | only its `jti`, never the token |

**Why two different secrets?** The `.env.example` comment explains it: if one secret leaks, the other token type is still safe. An attacker with the access secret could forge short-lived access tokens, but couldn't forge refresh tokens to keep the attack alive.

**Why is the access token so short?** Because a JWT can't be cancelled. If one is stolen, the only protection is that it expires quickly. 15 minutes is the blast radius.

**Why is the refresh token long-lived then?** So the user isn't forced to log in every 15 minutes. Its safety comes from a different mechanism: rotation (next section).

### 4.1.4 Sign up — `POST /users`

Password never touches the database in plain form (`src/services/user.service.ts:39-49`):

```ts
export const createUser = async (payload: CreateUserPayload) => {
  const { username, email, role, password } = payload;
  const hashedPassword = await hashPassword(password);
  const user = await userRepository.createUser({
    username, email, role, password: hashedPassword,
  });
```

And `hashPassword` (`src/utils/password.ts:25-27`):

```ts
const SALT_ROUNDS = 10;
export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};
```

**What "salt rounds" means, in plain English.** A salt is random data mixed into the password before hashing, so two people with the password `hello` get different hashes. "10 rounds" means bcrypt repeats its internal work 2^10 = 1024 times. Each extra round *doubles* the time. 10 is the common default: slow enough to frustrate attackers, fast enough that a login still feels instant.

**Why hashing and not encryption?** Encryption can be reversed — if someone steals the key, they get every password. Hashing is one-way. Even the developers cannot read a user's password. When someone logs in, bcrypt re-hashes what they typed and compares (`src/utils/password.ts:31-36`).

### 4.1.5 Login — `POST /login`

`src/services/auth.service.ts:37-60`:

```ts
export const login = async (username: string, password: string) => {
  const user = await userRepository.findActiveUserByUsername(username);

  // We deliberately use the same generic error message whether the
  // username doesn't exist or the password is wrong. Being specific (e.g.
  // "no such user") would let an attacker discover which usernames are
  // registered just by trying logins.
  if (!user) {
    logger.warn('Login failed: unknown username', { username });
    throw new ServiceError('Invalid username or password', 401);
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    logger.warn('Login failed: wrong password', { username });
    throw new ServiceError('Invalid username or password', 401);
  }

  const tokens = await issueTokenPair(user);
  return { ...tokens, user: toSafeUser(user) };
};
```

Three things to point out here, all deliberate:

1. **`findActiveUserByUsername`** filters `isDeleted: false` — a soft-deleted user cannot log in.
2. **Identical error messages.** This prevents *user enumeration* — an attacker trying usernames can't tell which ones exist. But the logs *do* distinguish the two cases, so you can still debug. Security for the outside, detail on the inside.
3. **`toSafeUser`** strips the password hash before the user object goes into the response.

### 4.1.6 Verifying a request — the `authenticate` middleware

`src/middlewares/authenticate.ts:20-39`:

```ts
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Access token is missing' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Access token is invalid or expired' });
  }
};
```

Points worth making:
- The token comes in the standard header: `Authorization: Bearer eyJhbGci...`.
- `jwt.verify` throws for **three** different problems — bad signature, malformed token, expired token. From the client's point of view they're all "you're not authenticated", so one 401 covers all three. The code comment at `:34-36` says exactly this.
- On success, the decoded payload is attached to `req.user`, so every later function knows who is calling — without another database query.

**A very likely question: "how does TypeScript know `req.user` exists?"** Express's `Request` type has no `user` property. So the code extends it (`src/middlewares/authenticate.ts:7-14`):

```ts
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}
```

This is called **declaration merging** — you're adding a field to an existing interface from another package. It's optional (`user?`) because the property only exists after this middleware runs. That's why controllers on protected routes write `req.user!` — the `!` tells TypeScript "I know it's set here, because `authenticate` ran first" (`src/controllers/task.controller.ts:27`).

### 4.1.7 Refresh token rotation — the best part of the project

**The problem:** refresh tokens live 15 days. If one is stolen, the attacker has 15 days of access. How do you limit that?

**The answer: rotation.** Every time a refresh token is used, it is thrown away and a brand-new one is issued. Each refresh token works exactly **once**.

**The analogy:** a cinema ticket that gets swapped for a new one every time you re-enter. If someone photocopied your old ticket, it no longer works.

**And then the clever bit — reuse detection.** If a *used* token shows up again, something is wrong. Either an attacker stole it, or the real user's copy leaked. You can't tell which, so the safe move is to revoke *everything* for that user and force a fresh login.

`src/services/auth.service.ts:62-105` — the whole flow:

```ts
export const refreshToken = async (oldToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  const storedToken = await refreshTokenRepository.findByJti(payload.jti);
  if (!storedToken) {
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  if (storedToken.revoked) {
    // This token was already used once (rotation revokes it after use) ...
    // Seeing it again is a strong signal it was stolen ...
    logger.warn('Refresh token reuse detected — revoking all tokens for user', {
      userId: payload.sub,
    });
    await refreshTokenRepository.revokeAllForUser(payload.sub);
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  const user = await userRepository.findActiveUserById(payload.sub);
  if (!user) {
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  // Rotation: retire the token that was just used before issuing a new one,
  // so it can never be redeemed a second time.
  await refreshTokenRepository.revokeByJti(payload.jti);

  return issueTokenPair(user);
};
```

**What `jti` is.** "JWT ID" — a unique random id put inside the refresh token when it's created (`src/utils/jwt.ts:55`, using `crypto.randomUUID()`). It's the handle the database uses to find and revoke that specific token.

**The design decision worth highlighting:** the raw refresh token string is **never stored**. Only its `jti`, owner, expiry and revoked flag (`src/models/refreshToken.model.ts:3-15`):

```ts
// We do NOT store the raw refresh token string in the database. The token
// itself is a signed JWT, so its signature already proves it's genuine; all
// we need to track server-side is enough metadata to revoke/rotate it
```

**Why that's smart:** if someone dumps your database, they get a list of random UUIDs — useless. They cannot reconstruct a working token, because a token needs a valid signature made with the refresh secret.

And the four checks in order, all returning the same generic 401: invalid signature/expired → unknown `jti` → already revoked (theft response) → user gone or soft-deleted.

### 4.1.8 Parsing durations — a small nice detail

`src/utils/jwt.ts:13-30`:

```ts
const UNIT_TO_SECONDS: Record<string, number> = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 };

const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_SECONDS[unit];
};
```

**Why this exists:** `.env` holds human-friendly values like `15m` and `15d`. `jsonwebtoken` accepts strings, but its TypeScript types for them are awkward, and relying on someone else's string parsing is fragile. Converting to a plain number of seconds up front makes the types simple and the behaviour predictable. And a typo like `15x` fails loudly at startup, not silently at runtime.

## 4.2 Authorisation — roles and ownership

**Authentication vs authorisation** — get this distinction crisp, it's asked constantly:
- **Authentication = who are you?** Handled by `authenticate`.
- **Authorisation = what are you allowed to do?** Handled by `requireAdminRole` and the service-layer checks.

This project enforces authorisation in **three** places, for three different reasons.

### Place 1 — route middleware, for simple role checks

`src/middlewares/authenticate.ts:44-51`:

```ts
export const requireAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Only admins are allowed to perform this action' });
    return;
  }
  next();
};
```

Used on `PUT /users/:id`, `DELETE /users/:id`, and `POST /tasks`. It must run **after** `authenticate`, because it reads `req.user`.

**401 vs 403 — know the difference.** 401 Unauthorized means "I don't know who you are" (no token, bad token). 403 Forbidden means "I know exactly who you are, and you're not allowed." This code gets that right.

### Place 2 — the service layer, when the answer depends on data

Listing tasks (`src/services/task.service.ts:52-58`):

```ts
// Admins see the whole board; everyone else only sees tasks assigned to them.
export const getTasks = async (requestingUser: AccessTokenPayload) => {
  if (requestingUser.role === 'admin') {
    return taskRepository.findAllTasks();
  }
  return taskRepository.findTasksAssignedTo(requestingUser.sub);
};
```

Notice: `GET /tasks` is the **same URL** for both roles, but returns different data. The route doesn't need to know that — it just calls the service and passes `req.user`.

Moving a task (`src/services/task.service.ts:73-80`) — the ownership check quoted earlier. This is the case that **cannot** be middleware, because you must load the task first.

### Place 3 — the WebSocket handler

`src/websocket/socket.ts:41-44`:

```ts
if (payload.role !== 'admin') {
  socket.close(4003, 'Forbidden: admin only');
  return;
}
```

WebSockets have no HTTP status codes after the handshake, so it uses **close codes**. 4000–4999 is the range reserved for application-defined codes. The choice of 4001 for "unauthenticated" and 4003 for "forbidden" deliberately echoes HTTP 401 and 403 — nice detail to mention.

## 4.3 The database layer

### 4.3.1 The four collections

| Model | Collection | Purpose |
|---|---|---|
| `User` | `users` | accounts |
| `RefreshToken` | `refreshtokens` | which refresh tokens are still valid |
| `Task` | `tasks` | tasks assigned to users |
| `TodoStatus` | `todo` | the four fixed status lanes |

Two of these set the collection name explicitly. `src/models/todoStatus.model.ts:23-26` explains why:

```ts
// Stored in a collection named "todo" (per the task spec), even though the
// model is called TodoStatus — mongoose would otherwise name the collection
// "todostatuses", so we set it explicitly.
export const TodoStatus = mongoose.model<ITodoStatus>('TodoStatus', todoStatusSchema, 'todo');
```

**A likely question: "how does Mongoose name collections?"** It lowercases the model name and pluralises it. `User` → `users`. `RefreshToken` → `refreshtokens`. Its guess for `TodoStatus` would be `todostatuses`, which the spec didn't want — hence the third argument.

### 4.3.2 The User schema, field by field

`src/models/user.model.ts:16-62`:

| Field | Rules | Why |
|---|---|---|
| `username` | `required`, `unique`, `trim` | `trim` removes accidental spaces, so `" john "` and `"john"` aren't different users |
| `email` | `required`, `unique`, `trim`, `lowercase` | `lowercase` prevents `A@x.com` and `a@x.com` being two accounts |
| `role` | `enum: ['user','admin']`, `default: 'user'` | the enum rejects bad data like `role: "boss"`; the default means new accounts are never accidentally admins |
| `password` | `required` | always a bcrypt hash — hashing happens in the service layer |
| `isDeleted` | `default: false` | the soft-delete flag |
| `profilePicture` | optional | stores a URL like `/uploads/abc.jpg`, not the image bytes |
| `createdAt` / `updatedAt` | added by `timestamps: true` | Mongoose manages these automatically |

**Design decision to defend: why is the password hashed in the service, not in a Mongoose `pre('save')` hook?** Both work. A hook is more foolproof — you literally cannot forget. Doing it in the service keeps the model a pure description of data and puts all business logic in one layer, which matches the rest of the architecture. Say you chose consistency, and acknowledge the hook is the safer default in a bigger team.

### 4.3.3 Relationships — refs and populate

MongoDB has no `JOIN`. Instead, a document stores the `_id` of another document, and Mongoose can fetch it for you.

`src/models/task.model.ts:21-33`:

```ts
status: {
  // "ref" tells mongoose which model this id points to, so we can
  // later .populate('status') to get the full status document instead
  // of just its id.
  type: Schema.Types.ObjectId,
  ref: 'TodoStatus',
  required: true,
},
assigned_to: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
```

And the populate, in the repository (`src/repositories/task.repository.ts:13-14`):

```ts
const withPopulatedRefs = (task: ITask) =>
  task.populate([{ path: 'status' }, { path: 'assigned_to', select: 'username email role' }]);
```

Two things to highlight:

1. **`select: 'username email role'`** is a security decision. Without it, populating `assigned_to` would embed the *entire* user document — including the password hash — inside every task response. The `select` limits it to three safe fields.
2. **What populate actually does.** It is not a database join. Mongoose runs a second query to fetch the referenced documents and stitches them in. So `GET /tasks` is roughly three queries, not one. For this size that's fine; at scale you'd consider `$lookup` in an aggregation, or embedding the status name directly on the task.

### 4.3.4 Soft delete

`DELETE /users/:id` does not delete anything. It flips a flag (`src/repositories/user.repository.ts:49-53`):

```ts
// "Soft" delete: we flip the isDeleted flag instead of removing the
// document, so the data isn't lost and can be audited/restored later.
export const softDeleteUserById = (id: string): Promise<IUser | null> => {
  return User.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true });
};
```

**Why soft delete?** Three reasons, all worth saying: you can undo a mistake; you keep the audit trail; and hard-deleting a user would leave tasks pointing at a user that no longer exists.

**And the discipline it requires:** *every single read* must filter it out. Look at the repository — `findAllActiveUsers`, `findActiveUserById`, `findActiveUserByUsername`, `updateUserById` and `softDeleteUserById` all include `isDeleted: false`. Miss one, and deleted users start reappearing.

**A good follow-up you should have ready:** "How would you make that safer?" A Mongoose *query middleware* (`schema.pre('find', ...)`) could add the filter automatically, so it can never be forgotten. Right now it's applied by hand in each function.

### 4.3.5 Indexes

There are no explicit `schema.index()` calls. The indexes that exist come from `unique: true` — MongoDB creates a unique index to enforce it — on `User.username`, `User.email`, `RefreshToken.jti` and `TodoStatus.name`.

**What an index is, in plain English:** the index at the back of a book. Without it, finding a topic means reading every page. With it, you jump straight there. Same for a database — without an index, MongoDB scans every document.

**What's missing and worth admitting:** `Task.assigned_to` has no index, but `findTasksAssignedTo` queries by it on every non-admin `GET /tasks`. With many tasks that becomes a full collection scan. Adding `taskSchema.index({ assigned_to: 1 })` would fix it. This is a strong thing to volunteer.

### 4.3.6 Seeding the four statuses

The statuses aren't created through the API — they're created at startup (`src/repositories/todoStatus.repository.ts:17-23`):

```ts
// Makes sure all 4 fixed status documents exist. Uses upsert so running
// this on every app startup is safe — it creates any that are missing and
// does nothing to ones that already exist (no duplicates).
export const seedDefaultStatuses = async (): Promise<void> => {
  await Promise.all(
    STATUS_NAMES.map((name) =>
      TodoStatus.findOneAndUpdate({ name }, { name }, { upsert: true, new: true }),
    ),
  );
};
```

Called from `src/config/database.ts:28`, right after the connection succeeds.

**Two concepts to name here:**
- **Upsert** = update if it exists, insert if it doesn't. One atomic operation.
- **Idempotent** = running it once or a hundred times gives the same result. That's what makes it safe on every restart.

And **`Promise.all`** runs all four upserts at the same time rather than one after another — a nice small example of concurrency to point at.

### 4.3.7 The connection

`src/config/database.ts:8-33` — fail fast, with a clear message:

```ts
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in the environment variables');
}
try {
  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected successfully');
  await seedDefaultStatuses();
} catch (error) {
  logger.error('Failed to connect to MongoDB', { error });
  throw error;   // server.ts catches this and exits
}
```

**Why connect before listening?** `src/server.ts:17-22` explains it: there's no point accepting requests you know will fail. If the database is unreachable, the process exits with code 1 (`src/server.ts:34`), and a process manager or Docker knows startup failed and can restart or alert.

## 4.4 Validation — three layers of defence

Input is checked at three levels, each catching what the others can't.

| Layer | Checks | Example | Where |
|---|---|---|---|
| **1. express-validator** | Shape: is it there, is it an email, is it strong, is it a valid id | `body('email').isEmail()` | `src/validators/` |
| **2. Service layer** | Business rules that need the database | "does this `assigned_to` user actually exist?" | `src/services/task.service.ts:23-26` |
| **3. Mongoose schema** | Database-level rules | `required`, `unique`, `enum` | `src/models/` |

**Why three?** Layer 1 can't know whether a user id exists — that needs a query. Layer 2 can't catch a race where two people register the same username at the same moment — only the database's unique index can. Layer 3 alone would produce ugly errors and would run too late. Each layer is the right place for its own kind of check.

### 4.4.1 How express-validator works here

Rules are declared as **chains** (`src/validators/user.validator.ts:20-32`):

```ts
export const createUserValidation = [
  body('username').trim().notEmpty().withMessage('username is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('email is required')
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('password is required'),
  passwordRule,
  roleRule.optional(),
];
```

Each chain is itself a middleware. It records any failure onto the request but does **not** stop it. One shared middleware then checks the results (`src/middlewares/validate.ts:8-19`):

```ts
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array().map((e) => e.msg) });
    return;
  }
  next();
};
```

**The benefit to state:** the "did validation fail?" check is written once, not repeated in every controller. And because all rules run before `validate`, the client gets **every** problem back in one response, not just the first.

**Validators vs sanitizers.** `notEmpty()` and `isEmail()` are validators — they check. `trim()` and `normalizeEmail()` are **sanitizers** — they *change* `req.body` before the controller sees it. So `" JOHN@X.COM "` becomes `john@x.com`.

### 4.4.2 Single source of truth — a pattern used twice

**The password rule** lives in exactly one place (`src/utils/password.ts:9-17`):

```ts
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
export const isPasswordStrong = (password: string): boolean => PASSWORD_RULE.test(password);
export const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters long and include ...';
```

The validator imports both the check and the message (`src/validators/user.validator.ts:12-14`), so the rule and the error message can never disagree.

**Reading that regex out loud** (each `(?=...)` is a "lookahead" — it checks the whole string contains something, without consuming characters):
- `(?=.*[a-z])` — at least one lowercase letter
- `(?=.*[A-Z])` — at least one uppercase letter
- `(?=.*\d)` — at least one digit
- `(?=.*[^\w\s])` — at least one symbol (not a letter, digit, underscore or space)
- `.{8,}` — at least 8 characters total

**The status names** use the same pattern. `STATUS_NAMES` is defined once on the model (`src/models/todoStatus.model.ts:7`) and imported by the validator (`src/validators/task.validator.ts:2`), so the enum in the database and the allowed values in the API can't drift apart.

### 4.4.3 One real bug in the validators — know about it before they find it

`src/validators/task.validator.ts:4-19`:

```ts
const statusNameRule = body('status').isIn(STATUS_NAMES).withMessage(...);

export const createTaskValidation = [ ..., statusNameRule.optional() ];
export const updateTaskStatusValidation = [ ..., statusNameRule ];
```

`statusNameRule` is **one object**, shared by both arrays. Calling `.optional()` on it *mutates* that shared object rather than making a copy. So the `.optional()` intended only for create also applies to update. In practice the bug is masked, because `updateTaskStatusValidation` has a separate `body('status').notEmpty()` rule at line 17 that catches a missing status anyway.

The same shape appears with `roleRule.optional()` in `src/validators/user.validator.ts`.

**The fix:** make each rule a function that returns a fresh chain — `const statusNameRule = () => body('status').isIn(...)` — then call `statusNameRule()` in each array.

Volunteering this is a strong move: it shows you understand that express-validator chains are mutable objects, not plain descriptions.

## 4.5 File uploads

### 4.5.1 Why multer is needed at all

`express.json()` reads JSON bodies. A file upload is not JSON — browsers send it as `multipart/form-data`, which splits the body into parts with boundary markers, and the file part is raw binary. Multer parses that format, writes the file to disk, and puts the details on `req.file`.

### 4.5.2 The configuration

`src/middlewares/upload.ts`:

```ts
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');   // :9

if (!fs.existsSync(UPLOADS_DIR)) {          // :13-15
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']; // :19
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB                                // :21
```

**Why `__dirname` and not a relative path?** `__dirname` is the folder of the *current file*. A plain relative path like `./uploads` would be resolved against the *current working directory*, which changes depending on where you started the app from. Using `__dirname` means uploads always land in the same place.

### 4.5.3 The security bit — generated filenames

`src/middlewares/upload.ts:27-36`:

```ts
filename: (req: Request, file, callback) => {
  // We build our own filename instead of trusting the one the client
  // sent. This avoids two problems: two users uploading "photo.jpg" would
  // otherwise overwrite each other, and a crafted filename (e.g. containing
  // "../") could otherwise be used to write outside the uploads folder.
  const userId = req.user?.sub ?? 'unknown';
  const extension = path.extname(file.originalname);
  const uniqueName = `${userId}-${Date.now()}${extension}`;
  callback(null, uniqueName);
},
```

Two attacks stopped by one decision:
- **Overwrites.** Two users both uploading `photo.jpg` would clobber each other. Prefixing the user id plus a timestamp makes every name unique.
- **Path traversal.** A filename like `../../etc/passwd` would let an attacker write outside the uploads folder. Never using the client's filename removes that risk entirely.

**Be honest about the remaining gap:** the *extension* still comes from the client's filename via `path.extname()`. The MIME type is checked, but a file could be sent with `image/png` as its declared type and `.html` as its extension. Since `/uploads` is served statically, that's a stored-XSS risk. The fix is to derive the extension from the verified MIME type instead of the filename.

### 4.5.4 Filtering and limits

```ts
const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {   // :39-45
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
    return;
  }
  callback(null, true);
};

const singleImageUpload = multer({                     // :49-53
  storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('image');
```

`.single('image')` means: one file, in a form field named `image`. Anything else is rejected.

**Why a size limit matters:** without one, someone could upload a 10 GB file and fill your disk. That's a denial-of-service. The limit is enforced *while streaming*, so multer aborts as soon as the limit is crossed — it doesn't read the whole file first.

### 4.5.5 The error wrapper

`src/middlewares/upload.ts:55-67`:

```ts
// multer reports problems (wrong file type, file too big) by calling
// next(err) with its own error object. Without this wrapper, that error
// would fall through to Express's default HTML error page instead of a
// clean JSON response, so we catch it here and turn it into a normal 400.
export const uploadProfilePicture = (req: Request, res: Response, next: NextFunction): void => {
  singleImageUpload(req, res, (err: unknown) => {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
      return;
    }
    next();
  });
};
```

This exists precisely **because** the app has no global error handler. Without the wrapper, a rejected upload would return Express's default HTML error page to an API client expecting JSON. Good detail to mention — it shows you understood the consequence of the earlier design choice.

### 4.5.6 Why middleware order matters here

`src/routes/upload.routes.ts:48-51`:

```ts
router.post('/upload', authenticate, uploadMiddleware, uploadController.uploadProfilePicture);
```

`authenticate` **must** come before multer, because multer's `filename` callback reads `req.user?.sub` to build the filename. Flip the order and every upload would be saved as `unknown-<timestamp>.jpg`.

### 4.5.7 The controller

`src/controllers/upload.controller.ts:11-26`:

```ts
if (!req.file) {
  res.status(400).json({ message: 'No image file was uploaded' });
  return;
}
// req.user is set by the authenticate middleware, so we know exactly
// which user this upload belongs to — never trust a user id from the
// request body for this.
const userId = req.user!.sub;
const fileUrl = `/uploads/${req.file.filename}`;
const user = await userService.updateProfilePicture(userId, fileUrl);
```

**The security principle here has a name: never trust client input for identity.** If the user id came from `req.body`, anyone could overwrite anyone else's profile picture. Taking it from the verified token makes that impossible.

The database stores the **URL**, not the image. Images live on disk and are served by `express.static` at `src/app.ts:23`.

## 4.6 WebSockets — the live admin feed

### 4.6.1 The problem it solves

Normal HTTP is one-way: the client asks, the server answers. The server can't start a conversation. So how does an admin dashboard know a new user just signed up?

- **Polling** — ask every 5 seconds. Wasteful, and always up to 5 seconds stale.
- **WebSocket** — open a connection once and keep it open. The server pushes the moment something happens.

This project uses the second.

### 4.6.2 One server, one port, two protocols

`src/server.ts:24-30`:

```ts
const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

// Attach the WebSocket server to the same underlying HTTP server, so
// WS clients connect to the same host/port as the REST API.
initWebSocketServer(server);
```

And `src/websocket/socket.ts:24-25`:

```ts
export const initWebSocketServer = (httpServer: Server): void => {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });
```

**How can two protocols share one port?** Because a WebSocket connection *starts* as an ordinary HTTP request. The client sends a normal GET with `Upgrade: websocket` and `Connection: Upgrade` headers. The server replies `101 Switching Protocols`, and from that point the same TCP connection carries WebSocket frames instead of HTTP. That's called the **WebSocket handshake**.

`app.listen()` returns Node's `http.Server`. The `ws` library hooks into that server's `upgrade` event and takes over only requests to `/ws`. Everything else stays with Express.

**Why this matters practically:** one port to expose, one Docker `EXPOSE 3000`, no CORS or firewall complications.

### 4.6.3 Authenticating a WebSocket

`src/websocket/socket.ts:27-56`:

```ts
wss.on('connection', (socket, request) => {
  // The access token is passed as a query param:
  // ws://host/ws?token=<accessToken>
  const url = new URL(request.url || '', 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    socket.close(4001, 'Unauthorized: missing token');
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.role !== 'admin') {
      socket.close(4003, 'Forbidden: admin only');
      return;
    }

    connectedAdmins.add(socket);
    socket.on('close', () => { connectedAdmins.delete(socket); });
  } catch {
    socket.close(4001, 'Unauthorized: invalid or expired token');
  }
});
```

**Why the token is in the query string:** the browser's built-in `WebSocket` API doesn't let you set custom headers. So `Authorization: Bearer ...` isn't available. Passing the token as a query parameter is the common workaround.

**Be ready to critique it, because they will ask.** Query strings get written into server access logs and proxy logs, so the token can leak into places you don't control. Two better options: send the token in the `Sec-WebSocket-Protocol` header (a known hack, but headers aren't logged the same way), or accept the connection unauthenticated and require the client to send an auth message as its first frame, closing the socket if it doesn't arrive within a second or two.

**And note the important cleanup:** `socket.on('close', ...)` removes the socket from the Set. Without it, the Set would grow forever as admins connect and disconnect — a memory leak.

### 4.6.4 Broadcasting

`src/websocket/socket.ts:63-75`:

```ts
export const broadcastNewUser = (user: unknown): void => {
  if (!wss || connectedAdmins.size === 0) {
    return;
  }
  const message = JSON.stringify({ event: 'user_created', data: user });
  for (const socket of connectedAdmins) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};
```

Three careful details:
- The early return means creating a user costs nothing when no admin is watching.
- The message is serialised **once**, outside the loop, not once per admin.
- `readyState === WebSocket.OPEN` guards against sockets that are mid-close. Sending on a closing socket throws.

Called from exactly one place (`src/services/user.service.ts:53-57`), and it broadcasts the **password-stripped** user:

```ts
const safeUser = toSafeUser(user);
// Lets any connected admin see the new user show up live, without
// needing to refresh/re-poll GET /users.
broadcastNewUser(safeUser);
```

### 4.6.5 The scaling limit — already documented in the code

`src/websocket/socket.ts:11-17`:

```ts
// Every currently-connected, verified-admin socket. This is just an
// in-memory Set, which is fine for a single-process app like this one. If
// this ever ran as multiple server instances behind a load balancer, an
// admin connected to instance A wouldn't hear about events on instance B —
// that would need a shared pub/sub layer (e.g. Redis) to fan messages out
// across instances. Out of scope for this practice project.
const connectedAdmins = new Set<WebSocket>();
```

**Explain it out loud like this:** the list of connected admins lives in this one process's memory. If you run two copies of the API behind a load balancer, admin A connects to copy 1 and admin B to copy 2. A user created on copy 1 only notifies admin A — copy 2 has no idea it happened. The fix is Redis pub/sub: each instance publishes the event to Redis, and every instance subscribes and forwards to its own sockets.

Knowing the limit *and* the fix is much stronger than not hitting the limit at all.

### 4.6.6 Other gaps worth knowing

- **No heartbeat.** If a client's network dies without a proper close, the server may keep a dead socket in the Set. The standard fix is a ping/pong interval that terminates sockets which don't answer.
- **No re-check of token expiry.** The token is verified once, at connect. An admin stays connected long after their 15-minute access token expires. A periodic re-verification would fix it.
- **Only one event.** Task creation and status changes broadcast nothing. An obvious next feature.

## 4.7 Logging

### 4.7.1 The shared logger

`src/utils/logger.ts` — one logger for the whole app. Its reasoning (`:5-9`):

```ts
// One shared logger for the whole app, instead of every file calling
// console.log/console.error directly. This gives us consistent formatting,
// log levels, and one place to change WHERE logs go (console, files, or
// later something like a log aggregation service) without touching every
// file that logs something.
```

Three transports (`:38-53`) — a "transport" is just a destination:

| Transport | Format | Contains |
|---|---|---|
| Console | coloured, human-readable | everything at or above `LOG_LEVEL` |
| `logs/error.log` | JSON | errors only — quick to scan when something breaks |
| `logs/combined.log` | JSON | everything — the full history |

**Why JSON in files but pretty text on the console?** A human reads the console, so colour and alignment help. A machine reads the files — a log tool like Elasticsearch or Datadog can parse JSON fields and let you search by `userId`. Right tool for each reader.

Levels, most to least severe: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. Setting `LOG_LEVEL=warn` hides everything below warn.

**Note a small gap:** `LOG_LEVEL` is read at `src/utils/logger.ts:22` but isn't listed in `.env.example`. Someone reading only that file wouldn't know the option exists.

### 4.7.2 Two kinds of logs

The project deliberately separates them, and the comment at `src/middlewares/requestLogger.ts:4-8` says so: request logs capture *that* a request happened; event logs capture *why* something happened.

**Request logs** — every request, automatically (`src/middlewares/requestLogger.ts:9-30`):

```ts
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  // "finish" fires once the response has actually been sent, so this is
  // where we know the final status code and can measure the full duration.
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`;

    if (res.statusCode >= 500) logger.error(message);
    else if (res.statusCode >= 400) logger.warn(message);
    else logger.info(message);
  });

  next();
};
```

Three things to point at:
- **`res.on('finish')`** — the response object is an EventEmitter. `finish` fires after the last byte is sent, which is the only moment you know the final status code. A common alternative is monkey-patching `res.send`, which is far messier.
- **`process.hrtime.bigint()`** — a high-resolution timer in nanoseconds, unaffected by the system clock changing. `Date.now()` would work but is coarser and can jump.
- **Status-to-level mapping** — 5xx is our fault (error), 4xx is the client's (warn), everything else is routine (info). So `logs/error.log` only fills with genuine server problems.

**Event logs** — meaningful moments, logged by hand:

| Event | Level | Where |
|---|---|---|
| User created | info | `src/services/user.service.ts:51` |
| User soft-deleted | **warn** | `src/services/user.service.ts:125` |
| Login failed (unknown user / wrong password) | warn | `src/services/auth.service.ts:45, 51` |
| Refresh token reuse detected | warn | `src/services/auth.service.ts:86` |
| Admin connected to WebSocket | info | `src/websocket/socket.ts:47` |

Note the deliberate choice at `src/services/user.service.ts:123-125`: deleting a user is logged at **warn**, not info, because it's a consequential admin action worth standing out when scanning logs.

## 4.8 Swagger documentation

### 4.8.1 The approach

Two libraries working together:
- **swagger-jsdoc** reads `@openapi` comment blocks from the route files and builds an OpenAPI 3.0 spec.
- **swagger-ui-express** serves an interactive web page from that spec.

The rationale is in the code (`src/config/swagger.ts:4-10`):

```ts
// Instead of writing the whole spec by hand in one giant file,
// swagger-jsdoc reads specially-formatted comment blocks (starting with
// "@openapi") directly above each route in src/routes/*, and stitches them
// together with the shared config below (title, servers, reusable schemas).
// Keeping the docs next to the route they describe makes them much more
// likely to stay up to date when a route changes.
```

**That last sentence is the whole argument.** Documentation in a separate file drifts, because nobody remembers to update two places. Documentation two lines above the route gets updated when the route does.

### 4.8.2 The shared pieces

**The security scheme** (`src/config/swagger.ts:28-34`) is what makes the **Authorize** button work in the UI:

```ts
securitySchemes: {
  bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
},
```

A route opts in by adding `security: [{ bearerAuth: [] }]` to its own block.

**Eleven reusable schemas** (`src/config/swagger.ts:38-162`): `User`, `CreateUserInput`, `UpdateUserInput`, `LoginInput`, `AuthTokens`, `RefreshTokenInput`, `Task`, `CreateTaskInput`, `UpdateTaskStatusInput`, `ErrorResponse`, `ValidationErrorResponse`. Routes reference them with `$ref` instead of repeating field lists — the same don't-repeat-yourself thinking as the rest of the project.

### 4.8.3 A small but clever detail

`src/config/swagger.ts:166-176`:

```ts
// Looks for "@openapi" comment blocks in route files. Both extensions are
// listed so this works whether the app is running from source with
// ts-node-dev (.ts) or from the compiled build with `node dist/server.js`
// (.js) — whichever pattern doesn't match any real files is simply ignored.
apis: [
  path.join(__dirname, '..', 'routes', '*.ts'),
  path.join(__dirname, '..', 'routes', '*.js'),
],
```

**Why both extensions?** In development the files are `.ts`. In production, after `tsc`, they're `.js` in `dist/`. Listing both means the docs work in either mode. And because `tsc` preserves comments by default, the `@openapi` blocks survive compilation.

### 4.8.4 Where it's mounted

`src/app.ts:28-31`:

```ts
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});
```

`/api-docs` is the interactive page. `/api-docs.json` is the raw spec — you can import that straight into Postman or Insomnia and get every endpoint pre-configured.

**A fair question to expect:** "Should the docs be public in production?" Honest answer: probably not for an internal API — it hands an attacker a complete map. You'd guard it behind auth or disable it when `NODE_ENV === 'production'`.

## 4.9 Docker

`DOCKER-FAQ.md` in this repo covers this in depth. Here are the points most likely to be asked about.

### 4.9.1 The multi-stage build

`Dockerfile` has two stages.

**Stage 1, `builder`** — has TypeScript, compiles `src/` into `dist/`.
**Stage 2, `production`** — starts fresh, installs only production dependencies, and copies **only** `dist/` across (`Dockerfile:32`):

```dockerfile
COPY --from=builder /app/dist ./dist
```

**Why bother?** The final image contains no TypeScript compiler, no ESLint, no Prettier, and none of your source code. Smaller image, faster deploys, less to attack. This is the single best thing to say about the Dockerfile.

### 4.9.2 Layer caching

`Dockerfile:9-13`:

```dockerfile
# Copy only the package files first so Docker can cache the npm install
# step — it only re-runs if package.json/package-lock.json actually change,
# not every time we edit application code.
COPY package.json package-lock.json ./
RUN npm ci
```

**The concept:** Docker caches each instruction as a layer. If an instruction's inputs haven't changed, it reuses the cache. If you copied all your source *before* `npm ci`, then changing one line of code would invalidate the cache and re-install every dependency — turning a 5-second rebuild into a 2-minute one. Copying `package.json` first means dependencies are only reinstalled when they actually change.

### 4.9.3 `npm ci` vs `npm install`

`ci` stands for "clean install". It installs exactly what `package-lock.json` says, deletes `node_modules` first, and fails if the lock file and `package.json` disagree. `npm install` may update the lock file. For a reproducible build you want `ci` — the same input always gives the same output.

### 4.9.4 Running as a non-root user

`Dockerfile:37-42`:

```dockerfile
# Running as root inside a container is unnecessary risk — if the app were
# ever compromised, a non-root process has far less it can do to the
# container/host. Node's official image already ships a "node" user for
# this purpose.
RUN chown -R node:node /app
USER node
```

This is the **principle of least privilege**. Containers run as root by default. If your app is compromised, root inside the container is a much better starting point for an attacker than an unprivileged user.

### 4.9.5 The healthcheck

`Dockerfile:48-49`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/hello || exit 1
```

**The distinction that matters:** a running process is not the same as a working app. Node could be alive but stuck. The healthcheck actually calls `/hello` and checks it responds, so `docker ps` reports health, not just liveness. `--start-period=10s` gives the app time to boot before failures count against it.

That's also the real job of the `/hello` route — it looks trivial, but it's the healthcheck target.

### 4.9.6 Compose — the two mechanisms worth explaining

**Waiting for the database properly** (`docker-compose.yml:22-28`):

```yaml
depends_on:
  mongo:
    condition: service_healthy
```

Plain `depends_on` only waits for the container to *start*, not for MongoDB to be *ready to accept connections*. Since this app exits if it can't connect (`src/server.ts:34`), that race would break startup. `condition: service_healthy` waits for Mongo's own healthcheck to pass first.

**Overriding the connection string** (`docker-compose.yml:38-42`):

```yaml
env_file:
  - .env
environment:
  MONGODB_URI: mongodb://mongo:27017/user-management-api
  PORT: 3000
```

In Compose, an explicit `environment:` entry **wins** over the same key in `env_file:`. So the JWT secrets come from your `.env`, but `MONGODB_URI` is forced to point at the `mongo` container — no matter what a developer happens to have in their own `.env` (an Atlas URL, say). It means a teammate can clone and run with zero configuration changes.

**How does the hostname `mongo` resolve?** Compose creates a network and registers every service by its name as a DNS entry (`docker-compose.yml:2-6`). The `api` container can reach the database at `mongo:27017` without any IP addresses or manual networking.

### 4.9.7 Volumes — why data survives

```yaml
volumes:
  - mongo_data:/data/db        # database files
  - uploads_data:/app/uploads  # uploaded pictures
  - logs_data:/app/logs        # log files
```

A container's filesystem disappears when the container is removed. A **named volume** is storage managed by Docker that outlives the container. Without `mongo_data`, every rebuild would wipe the database.

`docker compose down` stops containers but keeps volumes. `docker compose down -v` also deletes the volumes — that's the clean-slate command.

### 4.9.8 `.dockerignore`

Excludes `node_modules`, `dist`, `.env`, `.git`, `logs`, `uploads`. Two reasons: speed (the build context stays small) and safety (`.env` never gets baked into an image where anyone with the image could read it).

---

# Part 4.10 — Testing

## 4.10.1 What exists

**58 tests across 8 files, all passing.** Run them with `npm test`.

```
Test Suites: 8 passed, 8 total
Tests:       58 passed, 58 total
```

Coverage of `src/`:

| Metric | Coverage | Threshold in `jest.config.js` |
|---|---|---|
| Statements | **93.89%** | 60% |
| Branches | **75.23%** | 55% |
| Functions | **96.15%** | 60% |
| Lines | **93.73%** | 60% |

Every route file is at 100%. Every model is at 100%. The repository layer is at 98%.

## 4.10.2 The tools, and what each one does

| Tool | Its job |
|---|---|
| **Jest** | The test runner — finds test files, runs them, reports pass/fail, measures coverage |
| **ts-jest** | Lets Jest run TypeScript test files directly, with no separate build step |
| **supertest** | Sends fake HTTP requests to the Express app **without starting a real server** |
| **mongodb-memory-server** | Spins up a real MongoDB, in memory, just for the tests |

**The two that deserve the most explanation:**

**supertest** — you pass it your Express `app` object and it makes a request against it in-process. No port is opened, nothing has to be running. That's why the tests are fast and can't collide with a dev server you already have running.

```ts
const response = await request(app).post('/users').send(payload);   // tests/helpers/factories.ts:26
```

**mongodb-memory-server** — downloads and runs a genuine MongoDB binary that keeps its data in memory. This is the important distinction: it is **not a mock**. Mongoose talks to a real MongoDB, so real indexes, real `unique` constraints and real `populate` behaviour are all exercised. When the test finishes, the server stops and everything vanishes.

**Why not just mock the database?** A mock would let bugs through. The `409` on a duplicate username depends on MongoDB's unique index throwing error `11000` — a mocked repository would never produce that. The in-memory server does.

## 4.10.3 Two kinds of tests

### Unit tests — `tests/unit/`

Test one function in isolation, no database, no HTTP.

- `password.test.ts` (11 tests) — the strength regex, each rule failing separately, plus a real hash-then-compare round trip.
- `jwt.test.ts` (7 tests) — sign and verify, wrong secret rejected, expired token rejected, every `jti` unique.

A good example of testing a *security property*, not just a happy path (`tests/unit/jwt.test.ts:55`):

> `it('rejects a refresh token signed with the access secret (wrong secret)')`

That test proves the two-secret design actually works — a refresh token cannot be verified with the access secret. That's the kind of test worth pointing at in an interview.

### Integration tests — `tests/integration/`

Send a real HTTP request through the **entire stack** — routes, middleware, validation, controller, service, repository, real MongoDB — and check the response.

| File | Tests | Covers |
|---|---|---|
| `hello.test.ts` | 1 | the healthcheck route |
| `users.test.ts` | 14 | create, duplicates → 409, weak password, auth required, soft delete hidden from list, admin-only update/delete |
| `auth.test.ts` | 7 | login, generic 401s, **refresh rotation and replay rejection** |
| `tasks.test.ts` | 11 | admin-only create, default Backlog, role-scoped listing, ownership rules, 404 |
| `upload.test.ts` | 5 | auth required, valid image accepted, wrong type rejected, over-5MB rejected, no file → 400 |
| `websocket.test.ts` | 3 | no token rejected, non-admin rejected, admin receives a live `user_created` broadcast |

## 4.10.4 The test infrastructure — three files worth knowing

### `tests/setupEnv.ts` — and why it mirrors `dotenv`

```ts
// Jest's `setupFiles` run before any test file (and therefore before the
// app itself) is imported, which is exactly when these need to be set —
// src/utils/jwt.ts reads them as soon as it's imported, the same ordering
// requirement as dotenv.config() in src/server.ts.
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
```

**This is the same module-caching lesson from Part 2.9, showing up again in a different context.** `src/utils/jwt.ts` reads the secrets when it is first imported. So the test environment has to be set before *anything* imports the app — which is exactly what Jest's `setupFiles` hook is for. If these lines lived inside a `beforeAll`, they'd run too late and every token would be signed with `undefined`.

Being able to explain *why that file exists* is a strong signal that you understand Node's module system.

### `tests/helpers/db.ts` — the lifecycle

```ts
export const connectTestDB = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Mirrors what src/config/database.ts does on real startup, so tests
  // that create tasks have the 4 fixed statuses available to reference.
  await seedDefaultStatuses();
};
```

And the cleanup between tests (`tests/helpers/db.ts:24-31`):

```ts
export const clearTestDB = async (): Promise<void> => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.entries(collections)
      .filter(([name]) => name !== 'todo')
      .map(([, collection]) => collection.deleteMany({})),
  );
};
```

Used as: `beforeAll(connectTestDB)`, `afterEach(clearTestDB)`, `afterAll(closeTestDB)`.

**Three decisions worth explaining:**

1. **Connect once per file, clear after every test.** Starting a fresh MongoDB for every single test would be very slow. Wiping the collections between tests is fast and gives the same isolation.
2. **`todo` is skipped when clearing.** That collection only holds the four seeded statuses, which never change. Wiping it would break every task test that follows, because tasks reference a status.
3. **Test isolation matters.** If one test's data leaked into the next, tests would pass or fail depending on the order they ran in — the classic flaky test. `afterEach(clearTestDB)` prevents that.

### `tests/helpers/factories.ts` — no copy-paste setup

```ts
// Hits the real POST /users endpoint (not the repository directly), so
// tests exercise the same validation/hashing path a real client would.
export const createUser = async (options: CreateUserOptions = {}) => { ... }

export const createAdminAndLogin = async () => { ... }
export const createUserAndLogin = async () => { ... }
```

**The decision to defend:** the factory creates users through the **real API endpoint**, not by inserting into the database directly. Inserting directly would be faster, but it would skip validation and password hashing — so a test user wouldn't be built the same way a real one is, and login tests could pass against data that could never exist in production.

Also note the unique username generation at `tests/helpers/factories.ts:18` — a timestamp plus random suffix, so tests running in the same file never collide on the `unique` index.

## 4.10.5 The tests that prove the hard parts work

These are the four to quote if asked "what's the most valuable test you wrote?"

**1. Refresh rotation and replay detection** (`tests/integration/auth.test.ts:48`). This tests the most sophisticated logic in the project end to end:

```ts
const rotated = await request(app).post('/refresh-token').send({ refreshToken: oldRefreshToken });

expect(rotated.status).toBe(200);
expect(rotated.body.refreshToken).not.toBe(oldRefreshToken);   // it really rotated

// Replaying the already-rotated token must now be rejected.
const replay = await request(app).post('/refresh-token').send({ refreshToken: oldRefreshToken });
expect(replay.status).toBe(401);
```

**2. Role-scoped listing** (`tests/integration/tasks.test.ts:62`) — "lets an admin see every task, but a regular user only their own". One test, both sides of the rule.

**3. The password never leaks** (`tests/integration/users.test.ts:11`) — "creates a user and never returns the password". This guards `toSafeUser` forever.

**4. Live WebSocket delivery** (`tests/integration/websocket.test.ts:59`) — connects as an admin, creates a user over HTTP, and asserts the `user_created` message actually arrives. That's a genuinely hard thing to test, and it's tested.

## 4.10.6 A real testing subtlety, documented in the code

`tests/integration/websocket.test.ts:28-32` — worth reading out if WebSocket testing comes up:

```ts
// The underlying WebSocket handshake (HTTP Upgrade) completes — and the
// client's "open" event fires — before our app-level connection handler
// runs, even for connections the app immediately rejects. So the only
// reliable signal for "was this connection rejected?" is whether a "close"
// event follows shortly after — not whether "open" fired at all.
```

**In plain English:** the protocol-level handshake succeeds before your application code gets a say. So a rejected connection still fires `open` first, then `close`. Testing for "did `open` fire?" would give a false pass. The test waits for a `close` event instead.

Note also that this test file builds its own server with `http.createServer(app)` and `server.listen(0)` — port `0` means "let the OS pick a free port", so the test can never clash with anything already running. WebSockets need a real listening server; supertest's in-process approach isn't enough for them.

## 4.10.7 The coverage gate

`jest.config.js:20-27` sets minimum coverage thresholds. If coverage falls below them, `npm test` **fails**. That turns coverage from a number nobody looks at into an actual rule — you can't merge a change that guts the tests.

The config also deliberately excludes three files from coverage (`jest.config.js:13-18`), with the reason written down:

```js
// Bootstrap/static-config files: no real branch logic to unit test,
// and server.ts/database.ts need a real listening server / real DB
// driver behavior rather than anything worth mocking.
'!src/server.ts',
'!src/config/database.ts',
'!src/config/swagger.ts',
```

**Be ready to defend that.** These are wiring files — `server.ts` starts a listener, `swagger.ts` is a static object. Testing them would mostly test Express and swagger-jsdoc, not your logic. Excluding them keeps the coverage number honest rather than diluted. (An evaluator may push back that `server.ts`'s failure path — exit code 1 when the DB is down — is worth testing. That's a fair point and a good thing to concede.)

## 4.10.8 What the tests don't cover — say this before you're asked

- **Branch coverage is 75%**, lower than the others. Some error paths are never triggered — for example `src/utils/jwt.ts:23`, the "invalid duration format" throw, and a few `catch` blocks in controllers.
- **No load or performance testing.** Nothing checks behaviour under many concurrent requests.
- **No tests for the layers in true isolation.** The service layer is tested *through* HTTP rather than with mocked repositories. That's a legitimate choice — it tests real behaviour rather than your mocks — but it does mean a service bug and a controller bug look the same when a test fails.
- **No CI.** The tests exist but nothing runs them automatically on push. A GitHub Actions workflow running `npm ci && npm test` would be a ten-line addition and the obvious next step.

---
---

# Part 5 — Core Node.js concepts, taught through this code

This is the section evaluators use to check you understand Node itself, not just how to wire libraries together. Every concept below is tied to a real line in this project.

## 5.1 What Node.js actually is

**One sentence:** Node.js lets you run JavaScript outside the browser, on a server.

It's built on V8 (Chrome's JavaScript engine) plus a C++ library called **libuv** that handles files, networking and timers. JavaScript by itself can't read a file or open a socket — libuv provides that, and Node exposes it to JavaScript.

**Why people use it for APIs:** one language on the front end and back end, a huge package ecosystem in npm, and a concurrency model that suits APIs very well — which is the next point.

## 5.2 Single-threaded, non-blocking, and the event loop

**The claim:** Node runs your JavaScript on **one thread**, yet handles thousands of simultaneous requests.

**How that's possible.** Almost everything an API does is *waiting* — waiting for MongoDB, waiting for the disk, waiting for the network. Node never sits and waits. It hands the slow job off, moves on to the next piece of work, and comes back when the result is ready. That "come back when ready" mechanism is the **event loop**.

**The analogy that works best:** one waiter in a restaurant. He takes your order, hands it to the kitchen, and immediately goes to the next table — he doesn't stand and watch the food cook. One waiter, many tables. A **blocking** waiter would stand in the kitchen until your dish was done, serving nobody else.

**In this project.** Every database call is awaited:

```ts
const user = await userRepository.findActiveUserByUsername(username);  // auth.service.ts:38
```

While that query is in flight, Node is free to start handling other requests. Nothing is blocked.

**The catch, and a great thing to mention:** if you write a genuinely CPU-heavy loop in JavaScript, you *do* block that one thread, and every other request waits. Node is excellent at I/O-heavy work and poor at CPU-heavy work.

## 5.3 The libuv thread pool — and why bcrypt is the perfect example

Here's a subtlety worth knowing, because it makes you sound like you actually understand Node rather than reciting "Node is single-threaded".

Node's *JavaScript* runs on one thread. But libuv keeps a small pool of background threads (4 by default) for work that can't be done asynchronously by the operating system. **bcrypt is one of those.**

`bcrypt.hash()` in `src/utils/password.ts:26` is deliberately CPU-heavy — that's its whole security value. If it ran on the main thread, every login would freeze the entire server for the duration. The native bcrypt module runs it on the thread pool instead, so the main thread keeps serving other requests.

**Two follow-ups worth having ready:**
- *"What if you used `bcrypt.hashSync`?"* It would run on the main thread and block everything. Never use the sync version in a server.
- *"What happens with 100 simultaneous logins?"* Only 4 hashes run at a time; the rest queue on the thread pool. This is why very high salt rounds are a denial-of-service risk, and why 10 is a sensible balance.

## 5.4 Callbacks → Promises → async/await

Three generations of handling "do this when the slow thing finishes".

**Callbacks** — pass a function to be called later. Still used where a library's API expects it, like multer's storage config (`src/middlewares/upload.ts:24-26`):

```ts
destination: (_req, _file, callback) => {
  callback(null, UPLOADS_DIR);
},
```

Note the Node convention: the **first argument is the error**. `callback(null, value)` means success. `callback(new Error(...))` means failure (`src/middlewares/upload.ts:41`).

The problem with callbacks was nesting — "callback hell", where each step is indented inside the previous one.

**Promises** — an object representing a value that isn't ready yet. It's either pending, fulfilled or rejected. Every repository function in this project returns one:

```ts
export const findAllActiveUsers = (): Promise<IUser[]> => {
  return User.find({ isDeleted: false });   // user.repository.ts:29-31
};
```

**async/await** — syntax that lets you *write* promise code as if it were sequential. This is what the whole project uses:

```ts
export const getAllUsers = async () => {              // user.service.ts:62-65
  const users = await userRepository.findAllActiveUsers();
  return users.map(toSafeUser);
};
```

Two facts to state confidently:
- `async` on a function means it **always** returns a Promise, even if you return a plain value.
- `await` pauses only *that function*, not the whole server. Node goes off and does other work meanwhile.

## 5.5 Running things in parallel — `Promise.all`

Sequential awaits run one after another. `Promise.all` starts everything at once and waits for all of them.

`src/repositories/todoStatus.repository.ts:17-23`:

```ts
await Promise.all(
  STATUS_NAMES.map((name) =>
    TodoStatus.findOneAndUpdate({ name }, { name }, { upsert: true, new: true }),
  ),
);
```

Four upserts, all in flight together. Sequential awaits would take roughly four times as long for no reason — the four operations don't depend on each other.

**The rule of thumb:** if operation B needs the result of A, await them in order. If they're independent, use `Promise.all`. Note also that `Promise.all` rejects as soon as *any* one fails; `Promise.allSettled` waits for all and reports each outcome.

**Where this project correctly does *not* use it:** in `createTask`, the assignee lookup must succeed before the status lookup matters, and both must finish before the insert.

## 5.6 Error handling and how errors travel

**How errors propagate here:** a repository or Mongoose throws → the service either lets it bubble or replaces it with a `ServiceError` → the controller's `try/catch` catches it → `handleError` turns it into a status code and JSON.

**Why `try/catch` in every controller?** This is Express **4**. If an async route handler rejects and nobody catches it, Express 4 does not notice — the request hangs, and in older Node the process could crash on an unhandled rejection. Express 5 fixed this by forwarding rejected promises automatically. Since this is Express 4, each controller wraps its own body.

**The custom error class** carries the HTTP status alongside the message (`src/services/user.service.ts:16-22`), so the service can say "this is a 404" without importing Express:

```ts
export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

`extends Error` means it still works with `instanceof`, still has a stack trace, and `super(message)` sets the standard message property.

**Translating a database error into an HTTP one** (`src/controllers/user.controller.ts:9-13`):

```ts
// Mongo throws an error with code 11000 when a unique field (username/email)
// already exists. We turn that into a friendly 409 Conflict instead of a
// raw database error leaking to the client.
const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
```

**Two principles worth naming:** never leak internal error details to a client (the generic `'Something went wrong'` with a 500 does this), but always log the full error server-side so you can debug it (`logger.error('Unhandled error in user controller', { error })`).

## 5.7 Modules and module caching

This project compiles to **CommonJS**, so `import` becomes `require()` in the output.

**The concept that actually gets asked: module caching.** Node runs a module's top-level code **once**, the first time it's required. Every later `require` of the same file gets the cached result.

**Where you can see it here.** `src/utils/jwt.ts:7-8` reads the environment at the top level:

```ts
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
```

That runs once, ever. It's why `dotenv.config()` must run before anything imports this file (Part 2.9) — there is no second chance.

The same caching is what makes `src/utils/logger.ts` a genuine singleton: every file that imports `logger` gets the *same* object, not a new one.

**CommonJS vs ES Modules, if asked:** CommonJS uses `require`/`module.exports`, loads synchronously, and gives you `__dirname` and `__filename`. ES Modules use `import`/`export`, load asynchronously, and support top-level `await` — but have no `__dirname`. This project uses CommonJS, which is why `path.join(__dirname, '..', '..', 'uploads')` works at `src/middlewares/upload.ts:9`.

## 5.8 EventEmitter — the pattern behind half of Node

**The idea:** an object announces that something happened; anyone interested has registered a listener; all listeners run.

Three examples in this project:

```ts
res.on('finish', () => { ... });        // requestLogger.ts:14 — response fully sent
wss.on('connection', (socket, req) => { ... });  // socket.ts:27 — new WebSocket client
socket.on('close', () => { ... });      // socket.ts:49 — that client disconnected
```

**Why it matters here:** `res.on('finish')` is the only clean way to log a request's final status and duration. You can't log it before the response is sent — you don't know the status yet. The EventEmitter pattern gives you a hook at exactly the right moment, without the logger needing to be involved in sending the response at all.

Node is full of this: HTTP servers, streams, sockets and processes are all EventEmitters.

## 5.9 Streams and buffers

**A buffer** is a chunk of raw binary data — Node's way of holding bytes, since JavaScript strings are text only.

**A stream** is data that arrives in pieces over time, so you can start processing before it's all there.

**Why it matters for uploads.** A naive implementation would read the entire uploaded file into memory, then write it to disk. A 5 MB file × 100 simultaneous uploads = 500 MB of memory. Multer **streams** the file to disk in chunks instead, so memory use stays flat regardless of file size. It's also what lets the `fileSize` limit abort mid-upload rather than after receiving everything.

`express.static` (`src/app.ts:23`) does the same in the other direction — it streams the file from disk to the response rather than loading it all first.

## 5.10 The `process` object

Node's global handle on the running program. Three uses here:

```ts
process.env.MONGODB_URI                 // database.ts:11 — environment variables
process.exit(1)                         // server.ts:34 — exit with a failure code
process.hrtime.bigint()                 // requestLogger.ts:10 — nanosecond timer
```

**Why exit code 1?** Zero means success; anything else means failure. Docker, CI systems and process managers read that number to decide whether to restart or alert. Exiting 0 after a failed startup would tell them everything was fine.

## 5.11 Built-in modules used

| Module | Used for | Where |
|---|---|---|
| `path` | building file paths that work on any OS | `src/middlewares/upload.ts:9`, `src/utils/logger.ts:10` |
| `fs` | checking and creating the uploads/logs folders | `src/middlewares/upload.ts:13-15` |
| `crypto` | `randomUUID()` for the refresh token `jti` | `src/utils/jwt.ts:2, 55` |
| `http` | the `Server` type the WebSocket attaches to | `src/websocket/socket.ts:2` |
| `url` | parsing the WebSocket query string | `src/websocket/socket.ts:30` |

**Why `path.join` instead of string concatenation?** Windows uses `\` and Unix uses `/`. `path.join` produces the right one, and also normalises away things like doubled slashes.

**Why `crypto.randomUUID` and not `Math.random()`?** `Math.random()` is *pseudo*-random and predictable — an attacker who saw a few values could guess the next. `crypto.randomUUID()` uses a cryptographically secure source. For anything security-related, that distinction matters.

## 5.12 Middleware, properly explained

**One line:** middleware is a function that runs between the request arriving and the response being sent. It can inspect the request, change it, or stop it.

Its signature is `(req, res, next)`. It ends in one of two ways:
- calls `next()` — pass control to the next function in the chain, or
- sends a response — the chain stops here.

Look at `authenticate` (`src/middlewares/authenticate.ts:20-39`): on failure it calls `res.status(401).json(...)` and **returns** — no `next()`, so the controller never runs. On success it sets `req.user` and calls `next()`.

**The `next(err)` variant.** Passing an argument to `next` skips all remaining normal middleware and jumps to error-handling middleware. Multer does this, which is why the wrapper at `src/middlewares/upload.ts:59-67` exists to intercept it.

**Error-handling middleware has four parameters** — `(err, req, res, next)`. Express detects error handlers purely by the parameter count. This project doesn't have one; see Part 7.

## 5.13 HTTP concepts this project relies on

### Status codes used here

| Code | Meaning | Where it's returned |
|---|---|---|
| 200 OK | success | most GET/PUT/PATCH responses |
| 201 Created | a new resource was made | `POST /users`, `POST /tasks` |
| 400 Bad Request | the input was wrong | validation failures, bad file upload |
| 401 Unauthorized | I don't know who you are | missing/invalid token, failed login |
| 403 Forbidden | I know who you are, you're not allowed | non-admin on an admin route, moving someone else's task |
| 404 Not Found | that resource doesn't exist | `ServiceError('User not found', 404)` |
| 409 Conflict | clashes with existing data | duplicate username or email |
| 500 Internal Server Error | we broke | the catch-all in `handleError` |

### PUT vs PATCH

`PUT /users/:id` replaces the resource; `PATCH /tasks/:id/status` changes one field. This project uses PATCH for the status change precisely because only one field is being modified — which is the correct semantic choice, and a common question.

*(Small honest note: the update-user implementation actually behaves like a PATCH — `src/services/user.service.ts:87-91` only sets the fields you sent. Strictly, PUT should replace the whole resource. Worth acknowledging if pressed.)*

### Idempotency

An operation is idempotent if doing it twice has the same effect as doing it once. GET, PUT, PATCH and DELETE are idempotent; POST usually isn't. Here, `softDeleteUser` is idempotent — the second call finds no matching active user and returns 404, and the data doesn't change further.

### REST

REST means treating URLs as **resources** (nouns) and HTTP methods as the **actions** (verbs). This project follows that: `/users`, `/tasks`, `/tasks/:id/status`. It doesn't use verbs in URLs like `/getAllUsers`.

**Where it deliberately deviates:** `POST /login`, `POST /refresh-token` and `POST /upload` are actions, not resources. That's normal and accepted — authentication doesn't map cleanly onto CRUD.

## 5.14 Security concepts demonstrated

| Concept | How this project shows it |
|---|---|
| Hashing vs encryption | bcrypt is one-way; passwords can never be read back |
| Salting | bcrypt salts automatically, so identical passwords get different hashes |
| Stateless auth | JWTs verify without a database lookup — fast, but can't be cancelled early |
| Short-lived tokens | 15-minute access token limits the damage from theft |
| Token rotation | each refresh token works once (`src/services/auth.service.ts:100`) |
| Reuse detection | a replayed token revokes everything for that user (`:80-91`) |
| Not storing secrets | only the `jti` is stored, never the raw refresh token |
| User enumeration | identical login errors hide which usernames exist |
| Least privilege | Docker runs as the non-root `node` user |
| Path traversal | server-generated upload filenames |
| Denial of service | 5 MB upload limit |
| Data exposure | `toSafeUser` and `select: 'username email role'` keep hashes out of responses |
| Secrets management | `.env` gitignored, `.env.example` committed |
| Not trusting the client | the uploader's id comes from the token, never the body |

---
---
---

# Part 6 — Likely questions, with model answers

Each answer starts with a **bold one-line version** you can say immediately, followed by the detail if they want more. Stop after the bold line if that's enough — over-answering is how people talk themselves into trouble.

## 6.1 Project overview

**Q1. Tell me about your project.**
**A: A REST API for managing users and their tasks, built in Node.js, Express and TypeScript with MongoDB.**
It handles sign-up and login with JWT tokens, has admin and regular user roles, a task board where admins assign work, profile-picture uploads, and a live WebSocket feed for admins. It's organised in six layers, documented with Swagger, tested with Jest, and runs in Docker.

**Q2. Why did you build it this way?**
**A: Because I wanted each file to have exactly one job.**
The alternative — putting database queries inside route handlers — works for a small app and then becomes unmaintainable. Splitting into route, controller, service and repository means when something breaks, I know which layer to look in, and I can change the database without touching business logic.

**Q3. What was the hardest part?**
**A: Refresh token rotation with reuse detection.**
Getting the basic flow working was easy. The hard part was thinking through what *should* happen when an already-used token shows up again. I settled on revoking every token for that user, because I can't tell whether the attacker or the real user is holding the replayed copy — so the safe move is to log everyone out and make them re-authenticate.

**Q4. What are you most proud of?**
**A: That the security decisions have reasons behind them, not just copied patterns.**
Two separate JWT secrets, identical login error messages to stop user enumeration, storing only the token's `jti` rather than the token, generating upload filenames server-side. Each one is a deliberate decision I can explain, and most of them are covered by a test.

**Q5. How long did it take, and how did you organise the work?**
**A: Six increments, each on its own branch with a pull request.**
Bootstrap → auth → tasks and uploads → WebSocket → Docker → Swagger, then tests. You can see it in the git history. I kept each branch to one feature so each PR was reviewable.

**Q6. If you started again, what would you change?**
**A: Three things: a global error handler, a proper config module, and CI from day one.**
Right now each controller repeats its own error handling — one centralised handler would remove that duplication. Environment variables are read straight from `process.env` at import time, which makes ordering fragile; a validated config module would fix it. And I'd wire up GitHub Actions at the start so tests run on every push instead of only when I remember.

**Q7. Who is this API for?**
**A: A front-end client — a web or mobile app.**
It's JSON only, has no views or templates, and uses bearer tokens rather than cookies, which is the normal choice when the client might not be a browser.

**Q8. What would it take to make this production-ready?**
**A: Six things, roughly in priority order.**
Fix the public sign-up accepting `role: admin`; add rate limiting on login; add `helmet` and a CORS policy; add a global error handler and 404 route; add graceful shutdown; and move uploads off local disk to object storage. None are large — they were scope decisions, not oversights.

## 6.2 Architecture and layering

**Q9. Walk me through what happens when a request comes in.**
**A: Logger → JSON parser → route match → validators → auth middleware → controller → service → repository → MongoDB, and back.**
Then use the `POST /users` trace from Part 2.6. Naming the layers in order, confidently, is what they're checking.

**Q10. What's the difference between a controller and a service?**
**A: The controller speaks HTTP. The service speaks business rules.**
The controller reads `req.body`, calls the service, and picks a status code. The service hashes the password, decides what counts as "not found", and checks ownership. The service never touches `req` or `res` — which is exactly why it could be reused from a CLI or a scheduled job without changing a line.

**Q11. Why have a repository layer at all? Isn't it just a wrapper?**
**A: It's the only place that knows we use MongoDB.**
If I switched to PostgreSQL, I'd rewrite four files in `src/repositories/` and nothing else. It also means query details like the soft-delete filter live in one place instead of being scattered through the services.

**Q12. Isn't six layers overkill for a project this size?**
**A: For this size, honestly, yes — a bit.**
I built it this way to show I understand the separation and can maintain it consistently. For a genuinely small service I'd merge service and repository. The layering pays off when the team or the codebase grows — and it made the tests much easier to write, because each layer has a clear boundary.

**Q13. What happens if I put a database query in a controller?**
**A: Nothing breaks immediately — that's the problem.**
It works, so the next person does it too, and within a few months database queries are scattered across the codebase. Then a schema change means hunting through controllers. The rule only has value if it's never broken.

**Q14. How do the layers communicate?**
**A: Downwards by function calls, upwards by return values or a thrown `ServiceError`.**
`ServiceError` carries an HTTP status code alongside the message (`src/services/user.service.ts:16-22`), so the service can say "this is a 404" without importing Express. The controller catches it and turns it into a response.

**Q15. Why doesn't the service layer send the response itself?**
**A: Because then it would depend on Express, and I couldn't reuse or test it independently.**
Right now the service is plain TypeScript. It could be called from a background job or a CLI tool unchanged.

**Q16. Where does validation happen, and why in more than one place?**
**A: Three places, because each catches something the others can't.**
express-validator checks the shape before anything runs. The service checks rules that need the database, like "does this assignee exist?". Mongoose enforces `required` and `unique` at the database level — which is the only layer that can catch two people registering the same username at the same instant.

**Q17. Why is the ownership check in the service and not in middleware?**
**A: Because you have to load the task from the database before you know who owns it.**
Middleware runs before any data is fetched. Simple role checks like "are you an admin?" can be middleware because the answer is in the token. "Is this task yours?" can't. The code says exactly this at `src/routes/task.routes.ts:123-125`.

**Q18. What does `src/app.ts` do that `src/server.ts` doesn't?**
**A: `app.ts` builds the Express app; `server.ts` starts it.**
Splitting them means the tests can import `app` and send requests to it with supertest without ever opening a port — which is precisely what `tests/integration/` does. If they were one file, importing it would start a server.

**Q19. Why does middleware order matter?**
**A: Express runs middleware top to bottom, and any one of them can end the request.**
`express.json()` has to come before routes or `req.body` is undefined. `requestLogger` is registered first so it captures even requests that get rejected by validation. `authenticate` has to come before `requireAdminRole`, because the second one reads what the first one sets.

**Q20. What are `src/utils/` and `src/config/` for?**
**A: `utils/` holds small reusable helpers with no layer of their own — JWT, password, logger. `config/` holds setup that runs once — the database connection and the Swagger spec.**

**Q21. Where would you add a "comments on a task" feature?**
**A: One file per layer, following the existing pattern.**
A `Comment` model, a `comment.repository.ts`, a `comment.service.ts`, a `comment.controller.ts`, `comment.routes.ts`, `comment.validator.ts`, then mount the router in `app.ts` and add tests. The fact that the answer is mechanical is the point — the structure tells you where everything goes.

**Q22. What design patterns did you use?**
**A: Repository, Service Layer, Middleware chain, Singleton, and Factory in the tests.**
Repository isolates data access. Service Layer holds business rules. The middleware chain is Express's version of the chain-of-responsibility pattern. The logger is a singleton via Node's module cache. And `tests/helpers/factories.ts` is a factory for test data.

## 6.3 Node.js fundamentals

**Q23. What is Node.js?**
**A: A runtime that lets JavaScript run outside the browser, built on Chrome's V8 engine plus a C++ library called libuv for file, network and timer work.**

**Q24. Is Node single-threaded?**
**A: Your JavaScript runs on one thread, but Node itself uses more.**
libuv keeps a pool of background threads — 4 by default — for work that can't be done asynchronously by the OS. bcrypt in this project is a perfect example: it's CPU-heavy, and it runs on that pool rather than blocking the main thread.

**Q25. Explain the event loop.**
**A: It's how one thread handles many requests — it hands off slow work and comes back when the result is ready, instead of waiting.**
Analogy: one waiter who takes your order to the kitchen and immediately serves the next table, rather than standing and watching your food cook.

**Q26. If it's one thread, how does it handle a thousand users?**
**A: Because almost all the time is spent waiting, not computing.**
Waiting for MongoDB, waiting for disk. Node starts the wait and moves on. A thousand requests waiting on the database cost almost nothing.

**Q27. When is Node a bad choice?**
**A: For CPU-heavy work — video encoding, large image processing, heavy computation.**
That work blocks the single JavaScript thread, and every other request stalls behind it. Node is built for I/O-heavy workloads, which an API like this is.

**Q28. What's blocking vs non-blocking?**
**A: Blocking means the thread stops until the operation finishes. Non-blocking means it starts the operation and carries on.**
`fs.readFileSync` blocks; `fs.readFile` doesn't. Everything in this project's request path is non-blocking. The one blocking call is `fs.existsSync` at `src/middlewares/upload.ts:13` — and that's fine, because it runs once at startup, not per request. That nuance is worth adding.

**Q29. Callbacks, promises, async/await — what's the difference?**
**A: Three generations of the same idea, each easier to read than the last.**
A callback is a function you pass in to be called later. A promise is an object representing a value that isn't ready yet. async/await is syntax that lets you write promise code as if it were sequential. This project uses async/await everywhere except where a library expects callbacks, like multer's storage config.

**Q30. What does `async` actually do to a function?**
**A: It makes the function always return a promise, and it allows `await` inside it.**
Even `async function f() { return 1; }` returns a promise resolving to 1.

**Q31. Does `await` block the server?**
**A: No — it pauses only that one function.**
Node goes off and handles other requests while it's waiting. That's the whole point.

**Q32. What is `Promise.all` and where did you use it?**
**A: It runs several promises at once instead of one after another. I used it to seed the four task statuses at startup.**
`src/repositories/todoStatus.repository.ts:18-22`. The four upserts don't depend on each other, so running them sequentially would take four times as long for no benefit. Note it rejects as soon as any one fails — `Promise.allSettled` is the variant that waits for all outcomes.

**Q33. What's an EventEmitter? Show me one.**
**A: An object that announces events, with listeners that react. Three in this project.**
`res.on('finish')` in the request logger, `wss.on('connection')` and `socket.on('close')` in the WebSocket file. `finish` is the only clean way to know a response's final status code and duration.

**Q34. What are streams, and where do they matter here?**
**A: Data that arrives in pieces, so you can process it before it's all there. They matter for file uploads.**
Multer streams the upload to disk in chunks. Reading a whole 5 MB file into memory first would mean 100 simultaneous uploads costs 500 MB of RAM. Streaming keeps memory flat — and it's what lets the size limit abort mid-upload.

**Q35. What is a Buffer?**
**A: Node's way of holding raw binary data, since JavaScript strings only handle text.**
Image bytes during an upload are buffers.

**Q36. CommonJS or ES Modules? What's the difference?**
**A: This project compiles to CommonJS — `require` and `module.exports`.**
CommonJS loads synchronously and gives you `__dirname`, which this project uses at `src/middlewares/upload.ts:9`. ES Modules use `import`/`export`, load asynchronously, support top-level `await`, but have no `__dirname`.

**Q37. What is module caching, and does it matter here?**
**A: Node runs a module's top-level code once and caches the result. And yes — it's why `dotenv.config()` has to run first.**
`src/utils/jwt.ts:7-8` reads the JWT secrets at import time. That happens once, ever. If `.env` hasn't been loaded by then, the secrets are `undefined` forever. The same caching is what makes the logger a genuine singleton.

**Q38. What's on the `process` object that you used?**
**A: `process.env` for configuration, `process.exit(1)` when startup fails, and `process.hrtime.bigint()` for request timing.**

**Q39. Why exit with code 1?**
**A: Zero means success, anything else means failure.**
Docker, CI and process managers read that number to decide whether to restart or alert. Exiting 0 after a failed startup would tell them everything was fine.

**Q40. Which built-in Node modules did you use?**
**A: `path`, `fs`, `crypto`, `http` and `url`.**
`crypto.randomUUID()` generates the refresh token's `jti` — I used that rather than `Math.random()` because `Math.random()` is predictable, and this value is security-relevant.

**Q41. Why `path.join` instead of just adding strings?**
**A: Windows uses backslashes, Unix uses forward slashes. `path.join` produces the right one and normalises the result.**

**Q42. What's the difference between `npm install` and `npm ci`?**
**A: `ci` installs exactly what the lock file says and fails if it disagrees with `package.json`. `install` may update the lock file.**
The Dockerfile uses `ci` because builds need to be reproducible.

**Q43. What's `package-lock.json` for?**
**A: It pins the exact version of every dependency, including nested ones.**
`package.json` says `^4.19.2`, which means "4.19.2 or any compatible newer version". The lock file records exactly which one was actually installed, so every machine gets identical dependencies.

**Q44. What does the caret in `^4.19.2` mean?**
**A: Allow any version up to but not including 5.0.0.**
So patch and minor updates are allowed, major ones aren't — because major versions may contain breaking changes.

## 6.4 TypeScript

**Q45. Why TypeScript instead of plain JavaScript?**
**A: It catches mistakes before the code runs.**
A typo in a property name, a function called with the wrong arguments, forgetting that a value might be null — TypeScript catches all of those at compile time instead of at 3am in production. It also makes the code self-documenting: `Promise<IUser | null>` tells you the function might not find anything.

**Q46. What does `strict: true` actually do?**
**A: Mainly, it stops you using a value that might be null or undefined without checking first.**
That's why this codebase is full of `if (!user) throw new ServiceError('User not found', 404)`. TypeScript won't let you skip the check.

**Q47. How does Node run TypeScript?**
**A: It doesn't. TypeScript is always turned into JavaScript first.**
In development, `ts-node-dev` does that on the fly. In production, `tsc` compiles `src/` into `dist/` ahead of time and Node runs the JavaScript.

**Q48. What's an interface, and how did you use it?**
**A: A description of an object's shape. I used them for Mongoose document types and JWT payloads.**
`IUser` (`src/models/user.model.ts:5-12`) describes a user document. `AccessTokenPayload` (`src/utils/jwt.ts:35-38`) describes what's inside a token.

**Q49. How does TypeScript know that `req.user` exists? Express doesn't have that.**
**A: I added it to Express's own `Request` interface using declaration merging.**
`src/middlewares/authenticate.ts:7-14`. TypeScript merges declarations of the same interface, so you can extend a type from another package. It's optional (`user?`) because the property only exists after `authenticate` has run.

**Q50. What's the `!` in `req.user!.sub`?**
**A: The non-null assertion — it tells TypeScript "I know this isn't undefined".**
It's safe here because the route always runs `authenticate` first (`src/controllers/task.controller.ts:27`). It's also a promise the compiler can't verify, so it's only safe as long as the middleware chain stays correct.

**Q51. There's an odd cast at `task.service.ts:73` — explain it.**
**A: `task.assigned_to` is typed as an ObjectId, but at runtime it's been populated into a full user document.**
```ts
const assignedToUser = task.assigned_to as unknown as IUser;
```
Mongoose's `populate()` swaps the id for the document, but the TypeScript type doesn't change. The cast tells the compiler what's actually there. The cleaner fix is a union type on the model — `Types.ObjectId | IUser` — and a type guard. The code acknowledges the compromise in a comment.

**Q52. What's `as unknown as X` and why the double cast?**
**A: TypeScript refuses to cast directly between two unrelated types. Going through `unknown` forces it.**
It's a deliberate escape hatch. Worth flagging that any cast is a place where you've told the compiler to stop checking — so it's exactly where bugs hide.

**Q53. What's `esModuleInterop`?**
**A: It lets you write `import express from 'express'` even though Express is a CommonJS module with no default export.**

**Q54. What are the `@types/` packages?**
**A: Type definitions for libraries that were written in plain JavaScript.**
Express itself has no types, so `@types/express` supplies them. They're devDependencies because they only exist at compile time — they vanish from the compiled output.

**Q55. Does TypeScript make the code slower?**
**A: No. Types are erased entirely at compile time.**
The JavaScript in `dist/` has no type checking in it at all. The cost is at build time, not runtime.

## 6.5 Express and middleware

**Q56. What is middleware, in your own words?**
**A: A function that runs between the request arriving and the response being sent. It can inspect, change, or stop the request.**
Its signature is `(req, res, next)`. It either calls `next()` to continue, or sends a response and stops the chain.

**Q57. What happens if middleware doesn't call `next()` and doesn't respond?**
**A: The request hangs forever.**
The client waits until it times out. It's a real bug class — that's why `authenticate` always either responds or calls `next()`, never neither.

**Q58. What's the difference between `app.use` and `app.get`?**
**A: `app.use` registers middleware for all methods; `app.get` matches only GET requests to a specific path.**

**Q59. What does `express.json()` do?**
**A: It reads the raw request body, parses it as JSON, and puts the result on `req.body`.**
Without it, `req.body` is undefined and every POST breaks.

**Q60. What is `express.static` doing here?**
**A: Serving the uploaded images. `src/app.ts:23` maps the `uploads/` folder to the `/uploads` URL path.**
So a file saved as `uploads/abc.jpg` is reachable at `GET /uploads/abc.jpg`.

**Q61. What's a Router?**
**A: A mini Express app you can mount at a path.**
Each file in `src/routes/` exports one. `app.use('/users', userRoutes)` mounts it, so a route declared as `/:id` inside becomes `/users/:id`. It keeps related routes together instead of one enormous `app.ts`.

**Q62. How do you get data out of a request?**
**A: Three places — `req.params` for URL segments, `req.query` for the query string, `req.body` for the payload.**
This project uses `req.params.id` for `/users/:id` and `req.body` for JSON payloads. It doesn't use `req.query` at all — which is related to it having no pagination.

**Q63. Your app has no global error handler. Why not, and what would one look like?**
**A: Each controller handles its own errors instead, which works but duplicates code. A global handler would be better.**
An Express error handler is middleware with four parameters, registered last:
```ts
app.use((err, req, res, next) => {
  if (err instanceof ServiceError) return res.status(err.statusCode).json({ message: err.message });
  logger.error('Unhandled error', { err });
  res.status(500).json({ message: 'Something went wrong' });
});
```
Then controllers would just `catch (e) { next(e) }`, or drop the try/catch entirely with an async wrapper. Express detects error handlers by the four-parameter signature.

**Q64. What happens if I request a URL that doesn't exist?**
**A: Express's default HTML 404 page — which is wrong for a JSON API.**
There's no catch-all route. A client expecting JSON gets HTML. The fix is one middleware registered after all routes, returning `404` with a JSON body.

**Q65. Why does every controller have a try/catch?**
**A: Because this is Express 4, which doesn't catch rejected promises from async handlers.**
If an async handler throws and nobody catches it, the request just hangs. Express 5 fixed this. Given Express 4, each controller wraps its own body.

**Q66. Do you have CORS configured?**
**A: No, and that's a real gap.**
Without CORS headers, a browser front-end on a different origin can't call this API. For a mobile client or Postman it doesn't matter, since the same-origin policy is a browser rule. The fix is the `cors` package with an explicit allowed-origins list — never `*` on an authenticated API.

**Q67. What is `helmet` and why isn't it there?**
**A: It sets a batch of security-related HTTP headers. It should be there — it's a one-line addition I didn't get to.**
It sets things like `X-Content-Type-Options: nosniff` and removes `X-Powered-By`, which otherwise advertises that you're running Express.

## 6.6 MongoDB and Mongoose

**Q68. Why MongoDB and not SQL?**
**A: The data is document-shaped and the relationships are simple.**
A user is one document; a task points at a user and a status. No complex joins. If the project needed heavy reporting across many related tables, I'd choose PostgreSQL — that's a genuine trade-off, not a dodge.

**Q69. What is Mongoose and why use it?**
**A: An ODM — it adds a schema layer on top of MongoDB, which has none of its own.**
Without it you'd validate by hand on every write. With it, `required`, `unique`, `enum`, `trim` and `lowercase` are declared once on the model and enforced automatically.

**Q70. What's the difference between a schema and a model?**
**A: The schema describes the shape and rules. The model is the object you actually query with.**
`new Schema({...})` then `mongoose.model('User', userSchema)`.

**Q71. How does Mongoose decide the collection name?**
**A: It lowercases and pluralises the model name. `User` becomes `users`.**
Two models here override that with a third argument — `TodoStatus` is stored in `todo`, because Mongoose's guess would have been `todostatuses`.

**Q72. What's `populate` and how does it work?**
**A: It replaces a stored id with the document that id points to.**
MongoDB has no joins, so Mongoose runs a second query and stitches the results together. That's an important detail — it is *not* a database-level join, so `GET /tasks` is several queries, not one.

**Q73. In your populate, what does `select: 'username email role'` do, and why?**
**A: It limits which fields come back — and it's a security control.**
Without it, populating `assigned_to` would embed the entire user document, including the password hash, in every task response.

**Q74. What's an ObjectId?**
**A: MongoDB's 12-byte unique document id. It also encodes a creation timestamp.**
It's not a plain string, which is why the code calls `.toString()` before comparing ids, and why validators use `isMongoId()`.

**Q75. Why validate `isMongoId()` on route params?**
**A: To stop a malformed id reaching Mongoose and throwing a CastError.**
Without it, `/users/abc` produces an unhandled database error and a 500. With it, the client gets a clean 400. There's a test for exactly this (`tests/integration/users.test.ts:89`).

**Q76. Explain soft delete. Why not just delete?**
**A: I flip an `isDeleted` flag instead of removing the document.**
Three reasons: you can undo a mistake, you keep the audit trail, and hard-deleting a user would leave tasks pointing at a user that no longer exists.

**Q77. What's the risk with soft delete?**
**A: Every single read has to remember to filter it out.**
Every function in `src/repositories/user.repository.ts` includes `isDeleted: false`. Miss one, and deleted users reappear. A Mongoose query middleware — `schema.pre('find', ...)` — would apply it automatically and remove the risk. There's a test guarding the list endpoint (`tests/integration/users.test.ts:62`).

**Q78. What indexes do you have?**
**A: Only the ones created automatically by `unique: true` — on username, email, `jti` and status name.**
And a gap I'd fix: `Task.assigned_to` isn't indexed, but every non-admin `GET /tasks` queries by it. With many tasks that becomes a full collection scan. One line — `taskSchema.index({ assigned_to: 1 })` — fixes it.

**Q79. What is an index, simply?**
**A: The index at the back of a book. Without it you read every page; with it you jump straight to the topic.**

**Q80. What does `timestamps: true` do?**
**A: Mongoose adds and maintains `createdAt` and `updatedAt` automatically.**

**Q81. What does `{ new: true }` mean in `findOneAndUpdate`?**
**A: Return the document after the update rather than before it.**
The default is the old version, which is almost never what you want.

**Q82. What's an upsert?**
**A: Update if it exists, insert if it doesn't — one atomic operation.**
Used to seed the four statuses on every startup, which makes that safe to run repeatedly.

**Q83. What does "idempotent" mean?**
**A: Running it once and running it many times give the same result.**
The status seeding is idempotent, which is why it can run on every restart without creating duplicates.

**Q84. Where do you connect to the database, and why there?**
**A: `src/config/database.ts`, called from `server.ts` before the server starts listening.**
There's no point accepting requests you know will fail. If the connection fails, the process exits 1 so Docker or a process manager knows.

**Q85. What happens if MongoDB goes down while the app is running?**
**A: Requests would start failing with 500s, and there's no reconnection handling — that's a gap.**
Mongoose does buffer and retry to an extent, but I don't listen for `disconnected` or `error` events on the connection. A production version would log those and expose the connection state on a health endpoint.

**Q86. Are you worried about NoSQL injection?**
**A: It's largely mitigated, but not by design.**
The classic attack sends an object like `{ "$gt": "" }` where a string is expected. Here, express-validator's `notEmpty()` and `isMongoId()` reject non-strings before they reach a query, and Mongoose casts values to the schema type. But I don't sanitise `$` keys explicitly — `express-mongo-sanitize` would make that deliberate rather than incidental. That's an honest and strong answer.

## 6.7 Authentication and security — the deepest section

**Q87. Explain your authentication flow.**
**A: Sign up hashes the password with bcrypt. Login checks it and returns two tokens. Every protected request sends the access token in the Authorization header.**
Then add: the access token lasts 15 minutes, the refresh token 15 days, and refresh tokens rotate so each one works only once.

**Q88. What is a JWT?**
**A: A signed token with three parts — header, payload, signature — that proves who you are without the server storing a session.**

**Q89. Is a JWT encrypted?**
**A: No — it's encoded. Anyone can read the payload.**
That's why there's nothing sensitive in it, only a user id and a role. What they *can't* do is change it, because they don't have the secret to produce a matching signature. This is the question people most often get wrong.

**Q90. What's in your token payload, and why so little?**
**A: `{ sub, role }` for access, `{ sub, jti }` for refresh. Nothing more, because the payload is publicly readable.**

**Q91. Why two tokens instead of one?**
**A: Because you want the token you send everywhere to be short-lived, but you don't want users logging in every 15 minutes.**
The access token goes with every request, so it's the one most likely to leak — it expires fast. The refresh token is sent to exactly one endpoint, rarely, so it can live longer.

**Q92. Why two different secrets?**
**A: So that if one leaks, the other token type is still safe.**
With one shared secret, leaking it lets an attacker forge both — including long-lived refresh tokens. With two, the damage is contained. There's a test proving a refresh token signed with the access secret is rejected (`tests/unit/jwt.test.ts:55`).

**Q93. What is refresh token rotation?**
**A: Every time a refresh token is used, it's revoked and a new one is issued. Each one works exactly once.**
Analogy: a cinema ticket that gets swapped for a new one each time you re-enter, so a photocopy of the old one is worthless.

**Q94. What is reuse detection, and what does your code do?**
**A: If an already-used refresh token shows up again, I revoke every token that user has.**
```ts
if (storedToken.revoked) {
  await refreshTokenRepository.revokeAllForUser(payload.sub);
  throw new ServiceError('Invalid or expired refresh token', 401);
}
```
The reasoning: seeing a used token again means two parties hold it — the real user and someone else. I can't tell which one is asking, so the safe response is to log everyone out and force a fresh login. It's tested end to end at `tests/integration/auth.test.ts:48`.

**Q95. What do you store in the database for refresh tokens?**
**A: Only the `jti`, the owner, the expiry and a revoked flag. Never the token itself.**
The token is a signed JWT — its signature already proves it's genuine. All the server needs is enough metadata to revoke it. So if the database leaks, an attacker gets a list of UUIDs they can't turn into working tokens.

**Q96. What is a `jti`?**
**A: "JWT ID" — a unique random identifier embedded in the token, generated with `crypto.randomUUID()`.**
It's the handle used to find and revoke that specific token.

**Q97. Can you revoke a JWT?**
**A: Not an access token — that's the trade-off of stateless auth. Refresh tokens can be revoked, because those I do track.**
An access token stays valid until it expires, which is why 15 minutes matters. If instant revocation were a requirement, you'd need a denylist checked on every request — which gives up most of the benefit of being stateless.

**Q98. Why bcrypt and not SHA-256?**
**A: Because SHA-256 is fast, and for passwords you want slow.**
A fast hash lets an attacker with a stolen database try billions of guesses per second. bcrypt is deliberately expensive per guess. It also salts automatically.

**Q99. What is a salt and why does it matter?**
**A: Random data mixed in before hashing, so two users with the same password get different hashes.**
Without it, identical passwords produce identical hashes, and an attacker can crack them all at once with a precomputed rainbow table.

**Q100. What are salt rounds, and why 10?**
**A: The work factor. 10 means 2^10 iterations. Each extra round doubles the time.**
10 is the common default — slow enough to make brute force expensive, fast enough that login still feels instant. Going much higher becomes a denial-of-service risk on your own server, since bcrypt occupies a thread-pool thread.

**Q101. Why hashing and not encryption for passwords?**
**A: Encryption can be reversed. If someone steals the key, they get every password in plaintext.**
Hashing is one-way. Even I can't read a user's password. Login works by re-hashing what they typed and comparing.

**Q102. Why is your login error message the same for a wrong username and a wrong password?**
**A: To prevent user enumeration.**
If "no such user" and "wrong password" gave different responses, an attacker could discover which usernames exist just by trying logins. The logs still record which case it was, so debugging isn't affected. Both cases are tested (`tests/integration/auth.test.ts:23,32`).

**Q103. How do you stop brute-force login attempts?**
**A: I don't, and that's the most serious gap in the auth flow.**
There's no rate limiting, so someone can try passwords as fast as the server responds. The fix is `express-rate-limit` on `/login` — say 5 attempts per IP per 15 minutes — plus account-level lockout after repeated failures. bcrypt's slowness helps a little, but it's not a substitute.

**Q104. Where should the client store these tokens?**
**A: That's a real trade-off. `localStorage` is vulnerable to XSS; an httpOnly cookie is vulnerable to CSRF.**
The common recommendation is the access token in memory and the refresh token in an httpOnly, Secure, SameSite cookie with CSRF protection. This API returns both in the JSON body, so it leaves that decision to the client — fine for a mobile app, worth reconsidering for a browser.

**Q105. What's the difference between 401 and 403?**
**A: 401 means I don't know who you are. 403 means I know exactly who you are and you're still not allowed.**
This project uses both correctly — 401 for a missing or invalid token, 403 for a non-admin hitting an admin route.

**Q106. How does role-based access work here?**
**A: The role is inside the verified token, so I don't need a database lookup to check it.**
`requireAdminRole` middleware for simple checks; the service layer for checks that need data, like task ownership.

**Q107. Can a user change their own role by editing the token?**
**A: No — changing the payload breaks the signature, and verification fails.**
That's the whole point of signing.

**Q108. Is there any way a user could become an admin?**
**A: Yes, and it's the most serious bug in the project — sign-up is public and accepts a role.**
`POST /users` requires no authentication, and `createUserValidation` checks that `role` is one of `user` or `admin` but not *who* is allowed to set it. So anyone can register with `"role": "admin"`. The fix is small: strip `role` from the body unless an authenticated admin is making the call, defaulting everyone else to `user`. See Part 7.

**Volunteer this one before they find it.** Finding your own security bug reads far better than having it found for you.

**Q109. How are secrets managed?**
**A: Environment variables, loaded from a gitignored `.env`. `.env.example` is committed with placeholders so the shape is documented.**
In production you'd use the platform's secret store — `heroku config:set`, AWS Secrets Manager, Kubernetes secrets — not a file at all.

**Q110. What if `JWT_ACCESS_SECRET` is missing at startup?**
**A: It's read as `undefined` and cast with `as string`, so TypeScript stops complaining and it fails later, confusingly.**
A startup check that throws on any missing required variable would be much better — fail loudly at boot rather than mysteriously at the first login.

**Q111. How do you stop a password hash ending up in a response?**
**A: Two mechanisms. `toSafeUser` strips it, and populate queries use `select` to limit fields.**
There's a test asserting the password is never in the create-user response (`tests/integration/users.test.ts:11`).

**Q112. What security issues remain?**
**A: Five, and I know all of them.**
No rate limiting; public sign-up accepting an admin role; no helmet or CORS; the WebSocket token in a query string where proxies log it; and uploaded files served without authentication once the filename is known. All are small fixes — they were scope decisions.

## 6.8 File uploads

**Q113. Why do you need multer? Why doesn't `express.json()` work?**
**A: Because a file upload isn't JSON — it's `multipart/form-data`, with binary parts and boundary markers.**
Multer parses that format, streams the file to disk, and puts the details on `req.file`.

**Q114. How do you stop someone uploading a huge file?**
**A: A 5 MB limit, enforced while streaming so it aborts early.**
Without it, someone could fill the disk — a denial of service. Tested at `tests/integration/upload.test.ts:69`.

**Q115. How do you stop someone uploading an executable?**
**A: A MIME type allowlist checked in `fileFilter`, before the file is written.**
An allowlist, not a blocklist — with a blocklist you're guessing at everything dangerous, and you'll miss something.

**Q116. Why do you rename uploaded files?**
**A: To stop overwrites and path traversal.**
Two users both uploading `photo.jpg` would clobber each other. And a crafted name like `../../etc/passwd` could write outside the uploads folder. Never using the client's filename removes both risks. The generated name is `<userId>-<timestamp><ext>`.

**Q117. Is there still a weakness in that?**
**A: Yes — the extension still comes from the client's filename.**
Only the MIME type is validated. Since `/uploads` is served statically, a file could arrive claiming `image/png` but with an `.html` extension, which would be a stored-XSS risk. The fix is to derive the extension from the verified MIME type. Good to volunteer.

**Q118. Where does the user id in the filename come from?**
**A: The verified token, never the request body.**
If it came from the body, anyone could overwrite anyone else's profile picture. It's also why `authenticate` must run before multer in the route chain.

**Q119. What happens to uploaded files when the container restarts?**
**A: In Compose they survive, because `uploads_data` is a named volume. On a platform like Heroku they'd be lost, because the filesystem is ephemeral.**
The real fix is object storage — S3 or Cloudinary — with the database holding the URL. The database already stores a URL rather than the bytes, so that change would be contained.

**Q120. Can anyone view an uploaded picture?**
**A: Yes, if they know the filename — `/uploads` is served with no authentication.**
Filenames are guessable-ish, since they're a user id plus a timestamp. For profile pictures that's usually acceptable; for anything private you'd serve them through an authenticated route or use signed URLs.

## 6.9 WebSockets

**Q121. Why WebSockets? Why not just poll?**
**A: Polling wastes requests and is always a little stale. A WebSocket pushes the moment something happens.**
Here it's so admins see a new signup instantly rather than refreshing.

**Q122. How can HTTP and WebSocket share one port?**
**A: A WebSocket connection starts as an ordinary HTTP request with an `Upgrade: websocket` header.**
The server replies `101 Switching Protocols` and the same TCP connection then carries WebSocket frames. `app.listen()` returns Node's http.Server, and the `ws` library hooks its `upgrade` event for the `/ws` path only.

**Q123. Why `ws` and not Socket.IO?**
**A: Because I needed one feature — push a message to admins.**
Socket.IO adds rooms, reconnection and polling fallback, none of which this needs, and it forces clients to use its own library. With `ws`, any standard WebSocket client works.

**Q124. How do you authenticate a WebSocket connection?**
**A: The access token comes as a query parameter, and it's verified with the same function the REST middleware uses.**
Non-admins are closed with code 4003.

**Q125. Why a query parameter and not a header?**
**A: The browser's WebSocket API doesn't let you set custom headers, so `Authorization: Bearer` isn't available.**
And I know it's not ideal — query strings get written to proxy and access logs, so the token can leak. Better options are the `Sec-WebSocket-Protocol` header, or authenticating with the first message after connecting.

**Q126. What are close codes 4001 and 4003?**
**A: Application-defined codes — 4000–4999 is reserved for that. I chose them to mirror HTTP 401 and 403.**

**Q127. What happens if you run two instances of this app?**
**A: The live feed breaks, and the code says so.**
The set of connected admins is in one process's memory. An admin connected to instance A never hears about a user created on instance B. The fix is Redis pub/sub — each instance publishes events, all instances subscribe and forward to their own sockets.

**Q128. What happens when a client disconnects?**
**A: The `close` listener removes the socket from the set.**
Without that, the set would grow forever — a memory leak.

**Q129. What if a client's network dies without closing properly?**
**A: The server may hold a dead socket. There's no heartbeat, which is a gap.**
The standard fix is a ping/pong interval that terminates sockets that don't respond.

**Q130. Does the WebSocket connection re-check the token?**
**A: No — it's verified once at connect, so an admin stays connected past the 15-minute expiry.**
Periodic re-verification would fix it.

**Q131. How did you test a WebSocket?**
**A: The test starts a real server on a random port, connects a real client, creates a user over HTTP, and asserts the message arrives.**
The subtle part is that the handshake completes before the app's connection handler runs, so a rejected connection still fires `open` first. The test waits for a `close` event instead — that's documented at `tests/integration/websocket.test.ts:28-32`.

## 6.10 Testing

**Q132. What did you test, and how much?**
**A: 58 tests — unit tests for password and JWT logic, integration tests for every endpoint. About 94% statement coverage.**
The threshold in `jest.config.js` fails the build if coverage drops below 60%.

**Q133. What's the difference between your unit and integration tests?**
**A: Unit tests check one function with no database. Integration tests send a real HTTP request through the whole stack.**
`tests/unit/password.test.ts` calls `isPasswordStrong` directly. `tests/integration/users.test.ts` does `POST /users` through routes, validators, controller, service, repository and a real MongoDB.

**Q134. How do you test without a real database?**
**A: `mongodb-memory-server` — it runs a genuine MongoDB in memory, just for the tests.**
Important distinction: it's not a mock. Real indexes, real unique constraints, real populate. That matters, because the 409-on-duplicate behaviour depends on MongoDB actually throwing error 11000 — a mock would never produce that.

**Q135. Why not just mock the database?**
**A: Because mocks test your assumptions, not the real behaviour.**
Mocks are still useful for isolating a single unit, but for an API where most of the interesting behaviour is at the database boundary, a real in-memory database catches more.

**Q136. What's supertest?**
**A: It sends HTTP requests directly to the Express app object, in-process, without starting a server.**
That's why `app.ts` and `server.ts` are separate files — you can import the app without starting a listener.

**Q137. How do you keep tests from interfering with each other?**
**A: `afterEach(clearTestDB)` wipes every collection between tests.**
Without it, tests would pass or fail depending on what ran before them — the classic flaky test.

**Q138. Why does `clearTestDB` skip the `todo` collection?**
**A: Because it only holds the four seeded statuses, which never change.**
Wiping it would break every task test that follows, since a task must reference a status.

**Q139. What's `tests/setupEnv.ts` for?**
**A: It sets the JWT secrets before anything imports the app.**
Same reason `dotenv.config()` runs first in `server.ts` — `src/utils/jwt.ts` reads those variables at import time. If they were set in a `beforeAll`, it'd be too late. Jest's `setupFiles` hook runs early enough.

**Q140. Why do your test factories go through the API instead of inserting into the database?**
**A: So test users are created the same way real ones are — through validation and hashing.**
Inserting directly would be faster but would skip both, so a login test could pass against data that couldn't exist in production.

**Q141. What's the most valuable test you wrote?**
**A: The refresh rotation test.**
It logs in, refreshes, checks the new token differs, then replays the old one and asserts a 401. That's the most complex logic in the project, verified end to end in about ten lines.

**Q142. Your branch coverage is 75%, lower than the rest. Why?**
**A: Some error paths are never triggered — the invalid duration format throw in `jwt.ts`, a few controller catch blocks.**
Those are defensive branches for cases that shouldn't happen. I could force them with mocks, but there's a judgement call about whether that's testing behaviour or testing coverage numbers.

**Q143. Why exclude `server.ts` and `database.ts` from coverage?**
**A: They're wiring, not logic — starting a listener and opening a connection.**
Testing them would mostly test Express and Mongoose. That said, `server.ts`'s failure path — exiting 1 when the database is down — is genuinely worth testing, so that exclusion is arguable.

**Q144. Do the tests run automatically?**
**A: No — there's no CI, and that's the clearest next step.**
A GitHub Actions workflow running `npm ci && npm test` on every push is about ten lines. Tests nobody runs eventually stop passing.

**Q145. What's TDD, and did you use it?**
**A: Test-driven development — write the failing test first, then the code. No, I wrote tests after the features.**
Honest answer. What I'd add: the layered structure made them straightforward to add afterwards, but writing them first would probably have caught the public-admin-signup bug earlier.

## 6.11 Docker and deployment

**Q146. Why Docker?**
**A: So the app runs identically on any machine, with no "works on my computer" problems.**
A teammate doesn't need Node 20 or MongoDB installed — one command and it runs. This matters especially for `bcrypt`, which is a native module compiled per platform.

**Q147. What's a multi-stage build and why use one?**
**A: Two stages — one compiles TypeScript, the other only takes the compiled output.**
The final image has no TypeScript compiler, no dev dependencies and no source code. Smaller, faster to deploy, less to attack.

**Q148. Why copy `package.json` before the source code?**
**A: Docker layer caching. Dependencies only get reinstalled when they actually change.**
If you copied source first, editing one line would invalidate the cache and re-run `npm ci` — turning a 5-second rebuild into two minutes.

**Q149. Why `USER node`?**
**A: Least privilege. Containers run as root by default, which is unnecessary risk.**
If the app were compromised, a non-root process can do far less.

**Q150. What does HEALTHCHECK do?**
**A: It calls `/hello` every 30 seconds so Docker knows the app is actually responding, not just that the process is alive.**
A hung Node process is still "running". The healthcheck catches that. It's also the real reason the `/hello` route exists.

**Q151. What does `depends_on: condition: service_healthy` do?**
**A: It waits for MongoDB's own healthcheck to pass before starting the API.**
Plain `depends_on` only waits for the container to start, not for the database to accept connections. Since this app exits if it can't connect, that race would break startup.

**Q152. Why override `MONGODB_URI` in the compose file?**
**A: So it always points at the `mongo` container, whatever a developer has in their own `.env`.**
In Compose, an explicit `environment:` entry beats the same key from `env_file:`. The JWT secrets still come from `.env`; only the connection string is forced.

**Q153. How does the API container find MongoDB?**
**A: Compose creates a network and registers every service by name as DNS. So the hostname is just `mongo`.**

**Q154. Why volumes?**
**A: Because a container's filesystem disappears when the container is removed.**
`mongo_data` keeps the database, `uploads_data` keeps pictures, `logs_data` keeps logs. `docker compose down` keeps them; `down -v` deletes them.

**Q155. If you add a new endpoint, do you need to rebuild the image?**
**A: Yes — `dist/` is baked in at build time. `docker compose up --build -d`.**
Changing an environment variable doesn't need a rebuild, since those are injected at runtime.

**Q156. How would you deploy this?**
**A: Deploy only the Node container and use a managed database like MongoDB Atlas.**
Running MongoDB in a container on a platform like Heroku would lose all data on every restart, since the filesystem is ephemeral. `DOCKER-FAQ.md` covers both Heroku approaches in detail.

**Q157. How would you handle multiple instances?**
**A: The REST API scales horizontally already, because JWT auth is stateless — any instance can verify any token.**
Two things would need work: the WebSocket admin set needs Redis pub/sub, and local file uploads need to move to object storage. Both are known and documented.

## 6.12 Curveballs — "how would you add…"

These test whether you actually understand your own architecture. The good answer always names the layers.

**Q158. How would you add pagination to `GET /users`?**
**A: Query parameters in the validator, `skip` and `limit` in the repository, and a response envelope with the total.**
- Validator: `query('page').optional().isInt({ min: 1 })`, same for `limit` with a maximum so nobody asks for 10,000.
- Repository: `User.find({ isDeleted: false }).skip((page - 1) * limit).limit(limit)` plus a `countDocuments` for the total.
- Service: pass them through, return `{ data, page, limit, total }`.
- Note the trade-off: `skip` gets slow on large collections because MongoDB still walks the skipped documents. Cursor-based pagination using the last seen `_id` scales better.

**Q159. How would you add logout?**
**A: A `POST /logout` that revokes the refresh token — `revokeByJti` already exists.**
The access token can't be revoked; it just expires within 15 minutes. If instant revocation were required, you'd need a denylist checked on every request, which costs you the statelessness.

**Q160. How would you add password reset?**
**A: Two endpoints and a short-lived single-use token.**
`POST /forgot-password` generates a random token, stores its hash with a 15-minute expiry, and emails a link — always returning the same response whether the email exists or not, to avoid enumeration. `POST /reset-password` verifies the token, hashes the new password, and revokes all the user's refresh tokens so any attacker's session dies too.

**Q161. How would you add email verification?**
**A: An `isVerified` flag on the user, a token emailed on sign-up, and a check in the login service.**
Nodemailer for sending, or a service like SendGrid in production.

**Q162. How would you let users delete their own account?**
**A: Reuse `softDeleteUser`, but in the service compare `req.user.sub` with the target id.**
Same shape as the task ownership check — it's a data-dependent rule, so it belongs in the service, not middleware.

**Q163. How would you add task comments?**
**A: One file per layer: model, repository, service, controller, routes, validator, plus tests.**
The fact that this answer is mechanical is the point — a good structure tells you where new code goes.

**Q164. How would you add caching?**
**A: Redis in front of the read-heavy endpoints, with invalidation on write.**
`GET /users` is the obvious candidate. The hard part is invalidation — the cache must be cleared whenever a user is created, updated or deleted. I'd start with a short TTL, because a stale-for-30-seconds list is usually fine and much simpler than perfect invalidation.

**Q165. This API is slow under load. How do you find out why?**
**A: Measure first, don't guess.**
The request logger already records duration per request, so start there and find which endpoint is slow. Then check the database — `.explain()` on the query to see whether it's using an index. My first suspicion would be `GET /tasks` for a non-admin, since `assigned_to` isn't indexed. After that: is it the database, or bcrypt saturating the thread pool at login?

**Q166. A user says they can see someone else's tasks. How do you debug it?**
**A: Reproduce, then trace one layer at a time.**
Confirm with two real accounts. Check the token payload — is the role right? Then `getTasks` in the service, which is where the admin/user branch lives. Then the repository query. Then write a failing test before fixing it, so it can't come back — there's already a test at `tests/integration/tasks.test.ts:62` covering exactly this, so I'd start by checking whether it still passes.

**Q167. How would you add a "manager" role that sees their team's tasks?**
**A: Add it to the enum, and change one function.**
`role` becomes `['user','manager','admin']` in the model and validator, users get a `manager` reference, and `getTasks` gains a branch. The clean version replaces the if/else with a permission check, because a growing role list eventually turns that function into a mess.

**Q168. How would you version this API?**
**A: URL prefixes — mount the routers under `/v1` in `app.ts`.**
One line, since everything is already in routers. Header-based versioning is the alternative; URL versioning is more obvious to consumers.

**Q169. What if you had to support 10,000 requests per second?**
**A: Honestly, this design would need real work, and I'd measure before changing anything.**
Roughly: multiple instances behind a load balancer (already fine, since auth is stateless), Redis for the WebSocket fan-out, indexes on every queried field, caching for reads, object storage for uploads, and a connection-pool review. But the honest answer is that I'd profile first — guessing at bottlenecks is how you optimise the wrong thing.

**Q170. How would you add a health endpoint that checks the database too?**
**A: A `/health` route returning the Mongoose connection state.**
`mongoose.connection.readyState === 1` means connected. Return 200 when healthy and 503 when not, then point the Docker HEALTHCHECK at that instead of `/hello` — so the container is reported unhealthy when it can't reach the database, not just when the process dies.

**Q171. What would you do first if this went to production tomorrow?**
**A: Fix the public admin sign-up, then add rate limiting.**
Everything else on the list is important but not exploitable in one HTTP request.

## 6.13 Behavioural questions

**Q172. What did you learn from this project?**
**A: That the security decisions are the ones that need reasons, not just implementations.**
Getting JWTs working took an afternoon. Understanding why refresh tokens rotate, why login errors should be vague, and why you never store the raw token — that took much longer and is the part I actually value.

**Q173. What would you tell someone starting this project?**
**A: Decide the layering on day one and never break it, and write tests as you go.**
Both are painful to retrofit. I got the first right and the second late.

**Q174. What's the weakest part of your project?**
**A: That sign-up lets anyone request the admin role.**
It's a genuine security bug, it's a two-line fix, and it comes from validating the shape of `role` without validating who's allowed to set it. Answering this directly and specifically is much better than "um, maybe the tests".

**Q175. How do you know your code works?**
**A: 58 tests covering about 94% of the source, plus manual verification with curl and Swagger.**
The tests cover the paths that matter most: token rotation, role scoping, the password never leaking, and the WebSocket broadcast actually arriving.

---
---

# Part 7 — Known gaps, and how to defend them

**The strategy: name these yourself before you're asked.** An evaluator who finds a flaw you didn't mention concludes you don't know your own code. An evaluator you *tell* about a flaw — with the reason it's there and the fix — concludes you have judgement. Same flaw, opposite impression.

Format for each: what it is → why it's like that → the fix.

## 7.1 CRITICAL — anyone can sign up as an admin

**What.** `POST /users` requires no authentication and accepts a `role` field. `createUserValidation` checks that `role` is either `user` or `admin` (`src/validators/user.validator.ts:16-18`), but nothing checks **who** is allowed to set it. So this request makes you an admin:

```bash
curl -X POST localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"username":"attacker","email":"a@b.com","password":"Str0ng!Pass","role":"admin"}'
```

**Why it happened.** The same endpoint serves two purposes — public sign-up, and admin-creates-a-user. Validation confirmed the value was *valid* without confirming it was *permitted*. It's a textbook case of validating shape instead of authority.

**The fix.** In the controller or service, ignore `role` unless the caller is an authenticated admin:

```ts
const requestedRole = req.user?.role === 'admin' ? req.body.role : undefined;
const user = await userService.createUser({ ...req.body, role: requestedRole });
```

Then the model's `default: 'user'` takes over for everyone else. A cleaner version splits the endpoints entirely: a public `POST /register` that never accepts a role, and an admin-only `POST /users` that does.

**How to say it:** *"The most serious issue is that sign-up accepts a role, so anyone can register as an admin. It's validation checking the shape of the field without checking authority. The fix is to strip the role unless an authenticated admin is calling — the model already defaults to `user`."*

## 7.2 No rate limiting

**What.** Nothing limits how fast someone can hit `/login`. An attacker can try passwords as fast as the server responds.

**Why.** It wasn't in the assignment scope, and bcrypt's slowness provides a small amount of natural throttling.

**The fix.** `express-rate-limit` on the auth routes:

```ts
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
router.post('/login', loginLimiter, loginValidation, validate, authController.login);
```

Plus account-level lockout after repeated failures, since IP-based limits alone are weak against a distributed attempt.

## 7.3 No global error handler, no 404 route

**What.** Every controller has its own `handleError`, and the same 15 lines repeat in four files. And an unknown URL returns Express's default **HTML** 404 page, which is wrong for a JSON API.

**Why.** The per-controller approach was written first and worked. It also has one genuine advantage — the user controller's duplicate-key-to-409 translation is specific to users, and would need a little more care in a shared handler.

**The fix.** One error handler registered after all routes:

```ts
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  logger.error('Unhandled error', { err });
  res.status(500).json({ message: 'Something went wrong' });
});
```

Controllers then become `catch (e) { next(e) }`, or lose their try/catch entirely behind an async wrapper.

**Be ready for:** *"Why do error handlers need four parameters?"* Because that's how Express distinguishes them from normal middleware — it counts the function's arity.

## 7.4 No graceful shutdown

**What.** No `SIGTERM` or `SIGINT` handler. When Docker stops the container, the process dies immediately — in-flight requests are dropped and the MongoDB connection isn't closed cleanly.

**Why.** It never came up in local development, where you stop the server with Ctrl-C and nothing is in flight.

**The fix.**

```ts
const shutdown = async () => {
  logger.info('Shutting down');
  server.close(async () => {          // stop accepting new connections
    await mongoose.connection.close(); // close the DB connection
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();  // don't hang forever
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

**Why it matters:** Docker sends SIGTERM and waits 10 seconds before SIGKILL. Handling it means a deploy or restart finishes in-flight requests instead of dropping them.

## 7.5 No helmet, no CORS

**What.** No security headers, and no CORS policy.

**Why.** All testing was done with curl, Postman and Swagger UI — none of which are subject to the browser's same-origin policy. The gap simply never showed up.

**The fix.**

```ts
app.use(helmet());
app.use(cors({ origin: ['https://myapp.com'], credentials: true }));
```

**Be ready for:** *"Why not `origin: '*'`?"* Because on an authenticated API that lets any website make requests on behalf of a logged-in user. Always an explicit list.

## 7.6 No pagination

**What.** `GET /users` and `GET /tasks` return every matching record. With 100,000 users, that's one enormous response.

**Why.** Scope. The dataset in development was tiny, so it never hurt.

**The fix.** See Q158.

## 7.7 No index on `Task.assigned_to`

**What.** `findTasksAssignedTo` queries by `assigned_to` on every non-admin `GET /tasks`, and that field has no index. MongoDB scans the whole collection.

**Why.** Only the implicit `unique` indexes exist; none were added deliberately.

**The fix.** One line in the schema: `taskSchema.index({ assigned_to: 1 });`

This one is worth volunteering — it shows you think about queries, not just correctness.

## 7.8 Refresh tokens accumulate forever

**What.** `RefreshToken.expiresAt` has no TTL index, so expired and revoked token records stay in the collection indefinitely.

**Why.** It doesn't affect correctness — expired tokens fail verification regardless — so it never surfaced.

**The fix.** A TTL index lets MongoDB delete them automatically:

```ts
expiresAt: { type: Date, required: true, expires: 0 },
```

**A TTL index** is one where MongoDB removes documents once the indexed date passes. `expires: 0` means "delete at exactly `expiresAt`". Knowing that TTL indexes exist is a good MongoDB signal.

## 7.9 No logout endpoint

**What.** There's no way to deliberately end a session. `revokeByJti` exists in the repository but nothing calls it from a route.

**The fix.** See Q159. It's a small addition — the repository function is already written.

## 7.10 WebSocket weaknesses

Three, all covered in Part 4.6:
- **Token in the query string** — logged by proxies. Better: the `Sec-WebSocket-Protocol` header, or a first-message auth handshake.
- **No heartbeat** — dead sockets may linger. Fix: a ping/pong interval.
- **Token never re-checked** — an admin stays connected past expiry. Fix: periodic re-verification.

Plus the documented one: **in-memory state doesn't survive horizontal scaling** — that needs Redis pub/sub.

## 7.11 Upload weaknesses

- **Extension taken from the client's filename** while only the MIME type is validated (`src/middlewares/upload.ts:33`). Combined with static serving, that's a stored-XSS path. Fix: derive the extension from the verified MIME type.
- **`/uploads` is unauthenticated** — anyone with the filename can fetch the file.
- **Local disk doesn't survive most deployments.** Fix: object storage.
- **Replaced pictures are never deleted**, so orphaned files build up. Fix: delete the old file when setting a new one.

## 7.12 Configuration is fragile

**What.** `src/utils/jwt.ts:7-8` reads secrets at import time and casts them with `as string`. If a variable is missing, it's `undefined`, TypeScript is silenced by the cast, and the failure appears later as a confusing error rather than at startup.

**The fix.** A config module that validates everything once at boot and throws on anything missing:

```ts
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};
export const config = {
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  // ...
};
```

Also: `LOG_LEVEL` is read at `src/utils/logger.ts:22` but isn't documented in `.env.example`.

## 7.13 No CI

**What.** 58 tests exist, but nothing runs them automatically. They only run when someone types `npm test`.

**Why.** Tests were added late, and CI wasn't part of the scope.

**The fix.** A GitHub Actions workflow — roughly ten lines — running `npm ci` then `npm test` on every push and pull request, with the branch protected so failing tests block a merge.

**This is the single best "what's next" answer**, because the tests already exist and the coverage gate is already configured. All that's missing is the trigger.

## 7.14 Smaller things

| Issue | Fix |
|---|---|
| `uuid` is a dependency but unused — `crypto.randomUUID` is used instead | `npm uninstall uuid @types/uuid` |
| The shared express-validator chain mutated by `.optional()` (Part 4.4.3) | Make each rule a function returning a fresh chain |
| `PUT /users/:id` behaves like PATCH — it only updates the fields you send | Either rename to PATCH, or make PUT replace fully |
| No response envelope — success returns the bare resource, errors return `{ message }` or `{ errors }` | Pick one shape, e.g. `{ success, data, error }`, and apply it everywhere |
| Password hashing lives in the service, not a Mongoose hook | A `pre('save')` hook makes it impossible to forget |
| Soft-delete filter is repeated by hand in every repository read | A Mongoose query middleware applies it automatically |
| `dist/` on disk contains a stale `requireAdmin.js` with no `src` counterpart | Delete `dist/` and rebuild; it's gitignored anyway |
| README documents only `GET /hello` in its endpoint list | It delegates to Swagger, which is defensible — but say so |
| Swagger docs are publicly accessible | Guard behind auth, or disable when `NODE_ENV === 'production'` |

## 7.15 Two things to check before you present

1. **`.claude/settings.json` contains a live MongoDB Atlas connection string, with username and password.** That directory is untracked but **not** gitignored, so it would be committed by a `git add .`. Rotate that database password and remove those entries before pushing this repo or sharing your screen.
2. **`.DS_Store` and `coverage/` are in the working tree.** `coverage/` is now gitignored; `.DS_Store` isn't. Add it before committing.

---
---

# Part 8 — Appendices

## 8.1 Complete endpoint reference

| Method | Path | Middleware chain | Auth | Success | Errors |
|---|---|---|---|---|---|
| GET | `/hello` | — | public | 200 | — |
| POST | `/users` | `createUserValidation` → `validate` | **public** | 201 | 400, 409 |
| GET | `/users` | `authenticate` | any user | 200 | 401 |
| GET | `/users/:id` | `authenticate` → `userIdValidation` → `validate` | any user | 200 | 400, 401, 404 |
| PUT | `/users/:id` | `authenticate` → `requireAdminRole` → `updateUserValidation` → `validate` | **admin** | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/users/:id` | `authenticate` → `requireAdminRole` → `userIdValidation` → `validate` | **admin** | 200 | 400, 401, 403, 404 |
| POST | `/login` | `loginValidation` → `validate` | public | 200 | 400, 401 |
| POST | `/refresh-token` | `refreshTokenValidation` → `validate` | public | 200 | 400, 401 |
| POST | `/upload` | `authenticate` → `uploadProfilePicture` (multer) | any user | 200 | 400, 401, 404 |
| POST | `/tasks` | `authenticate` → `requireAdminRole` → `createTaskValidation` → `validate` | **admin** | 201 | 400, 401, 403 |
| GET | `/tasks` | `authenticate` | any user (scoped by role) | 200 | 401 |
| PATCH | `/tasks/:id/status` | `authenticate` → `updateTaskStatusValidation` → `validate` | owner **or** admin | 200 | 400, 401, 403, 404 |
| GET | `/api-docs` | — | public | Swagger UI | — |
| GET | `/api-docs.json` | — | public | raw OpenAPI spec | — |
| GET | `/uploads/<file>` | — | **public** | the image | 404 |
| WS | `/ws?token=<accessToken>` | in-handler JWT check | **admin only** | connection | close 4001 / 4003 |

**Response shapes:**
- Success → the resource itself, e.g. `{ "_id": "...", "username": "..." }`
- Controller error → `{ "message": "User not found" }`
- Validation error → `{ "errors": ["email must be a valid email address"] }`
- Login → `{ "accessToken": "...", "refreshToken": "...", "user": { ... } }`
- Refresh → `{ "accessToken": "...", "refreshToken": "..." }`
- WebSocket → `{ "event": "user_created", "data": { ...user } }`

## 8.2 File index

| File | What it does |
|---|---|
| `src/server.ts` | Entry point: loads `.env`, connects the DB, starts the server, attaches the WebSocket |
| `src/app.ts` | Builds the Express app: middleware order, static files, Swagger, routers |
| `src/config/database.ts` | Connects Mongoose; seeds the four statuses |
| `src/config/swagger.ts` | OpenAPI base spec, security scheme, 11 reusable schemas |
| `src/models/user.model.ts` | User schema — unique username/email, role enum, soft-delete flag |
| `src/models/task.model.ts` | Task schema — refs to `TodoStatus` and `User` |
| `src/models/todoStatus.model.ts` | The four status names; collection explicitly `todo` |
| `src/models/refreshToken.model.ts` | `jti`, owner, expiry, revoked — never the token itself |
| `src/repositories/user.repository.ts` | All user queries; every read filters `isDeleted: false` |
| `src/repositories/task.repository.ts` | Task queries with populate + field selection |
| `src/repositories/refreshToken.repository.ts` | Create, find, revoke by `jti`, revoke all for a user |
| `src/repositories/todoStatus.repository.ts` | Status lookups + idempotent seeding |
| `src/services/user.service.ts` | `ServiceError`, `toSafeUser`, user business rules |
| `src/services/auth.service.ts` | Login, token pair issuing, rotation with reuse detection |
| `src/services/task.service.ts` | Assignee validation, status resolution, role scoping, ownership |
| `src/controllers/*.controller.ts` | HTTP only — read request, call service, send response |
| `src/routes/*.routes.ts` | Route definitions + `@openapi` documentation blocks |
| `src/validators/*.validator.ts` | express-validator chains |
| `src/middlewares/authenticate.ts` | JWT verification + `requireAdminRole` + `Request` type extension |
| `src/middlewares/validate.ts` | Turns validation failures into one 400 |
| `src/middlewares/upload.ts` | Multer config, MIME allowlist, 5MB limit, generated filenames |
| `src/middlewares/requestLogger.ts` | Logs method, path, status and duration for every request |
| `src/utils/jwt.ts` | Sign and verify both token types; duration parsing |
| `src/utils/password.ts` | Strength regex, bcrypt hash and compare |
| `src/utils/logger.ts` | Winston logger — console + `error.log` + `combined.log` |
| `src/websocket/socket.ts` | `ws` server on `/ws`, admin-only, `user_created` broadcast |
| `tests/setupEnv.ts` | Sets JWT env vars before anything imports the app |
| `tests/helpers/db.ts` | In-memory MongoDB lifecycle: connect, clear, close |
| `tests/helpers/factories.ts` | Test data builders that go through the real API |
| `tests/unit/*.test.ts` | Password and JWT logic in isolation |
| `tests/integration/*.test.ts` | Full-stack HTTP tests for every endpoint |
| `jest.config.js` | ts-jest preset, coverage thresholds, 30s timeout |
| `Dockerfile` | Two-stage build; non-root user; healthcheck |
| `docker-compose.yml` | API + MongoDB, healthcheck gating, named volumes |
| `DOCKER-FAQ.md` | 11 Docker questions answered in depth |

## 8.3 Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `3000` | Port to listen on. Defaults to 3000 |
| `MONGODB_URI` | `mongodb://localhost:27017/user-management-api` | Connection string. Compose overrides this to `mongodb://mongo:27017/...` |
| `JWT_ACCESS_SECRET` | a long random string | Signs access tokens |
| `JWT_REFRESH_SECRET` | a **different** long random string | Signs refresh tokens |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY` | `15d` | Refresh token lifetime |
| `LOG_LEVEL` | `info` | Winston verbosity. **Read by the code but missing from `.env.example`** |

## 8.4 Live demo script

Run this in front of an evaluator. Every step demonstrates a different feature.

```bash
# 0. Start it
docker compose up --build -d
docker compose ps                    # both services healthy

# 1. Health check (also the Docker HEALTHCHECK target)
curl localhost:3000/hello

# 2. Validation rejects a weak password
curl -X POST localhost:3000/users -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"demo@x.com","password":"weak"}'
# → 400 with the password rule message

# 3. Create an admin
curl -X POST localhost:3000/users -H 'Content-Type: application/json' \
  -d '{"username":"admin1","email":"admin@x.com","password":"Str0ng!Pass","role":"admin"}'
# → 201, and note: NO password field in the response

# 4. Duplicate username → 409
curl -X POST localhost:3000/users -H 'Content-Type: application/json' \
  -d '{"username":"admin1","email":"other@x.com","password":"Str0ng!Pass"}'

# 5. Log in
curl -X POST localhost:3000/login -H 'Content-Type: application/json' \
  -d '{"username":"admin1","password":"Str0ng!Pass"}'
# → copy accessToken and refreshToken

# 6. Wrong password → the SAME generic 401 as an unknown username
curl -X POST localhost:3000/login -H 'Content-Type: application/json' \
  -d '{"username":"admin1","password":"WrongPass1!"}'
curl -X POST localhost:3000/login -H 'Content-Type: application/json' \
  -d '{"username":"nobody","password":"WrongPass1!"}'

# 7. Protected route without a token → 401
curl localhost:3000/users

# 8. With a token → 200
export TOKEN='<paste accessToken>'
curl localhost:3000/users -H "Authorization: Bearer $TOKEN"

# 9. Refresh token rotation — THE SHOWPIECE
export RT='<paste refreshToken>'
curl -X POST localhost:3000/refresh-token -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}"          # → 200, brand new pair
curl -X POST localhost:3000/refresh-token -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}"          # → 401, the old one is dead
# Say: "and that replay just revoked every token this user had."

# 10. Upload a profile picture
curl -X POST localhost:3000/upload -H "Authorization: Bearer $TOKEN" -F 'image=@photo.jpg'
# then open the returned /uploads/... path in a browser

# 11. Wrong file type is rejected
curl -X POST localhost:3000/upload -H "Authorization: Bearer $TOKEN" -F 'image=@notes.txt'

# 12. Create a task (admin only) — defaults to Backlog
curl -X POST localhost:3000/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Demo task","assigned_to":"<a user id>"}'

# 13. Move it
curl -X PATCH localhost:3000/tasks/<taskId>/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"InProgress"}'

# 14. As a NON-admin, try to move someone else's task → 403

# 15. Swagger
open http://localhost:3000/api-docs      # click Authorize, paste the token, try an endpoint

# 16. WebSocket — connect as admin, then create a user in another terminal
npx wscat -c "ws://localhost:3000/ws?token=$TOKEN"
# the user_created message appears live

# 17. The tests
npm test                                  # 58 passing, ~94% coverage

# 18. Data persists across a restart
docker compose down && docker compose up -d
curl localhost:3000/users -H "Authorization: Bearer $TOKEN"   # still there
```

**If time is short, demo steps 5, 9, 16 and 17.** Rotation, the live WebSocket, and the test suite are the most impressive parts.

## 8.5 Cram sheet — read this last

**Numbers**
- 6 layers · 12 REST endpoints + 1 WebSocket · 4 models · 58 tests · ~94% coverage
- Access token 15 minutes · refresh token 15 days · bcrypt 10 salt rounds · uploads capped at 5 MB
- 4 statuses: Backlog, Todo, InProgress, Completed

**The 12 sentences that matter most**

1. Layers: route → validator → middleware → controller → service → repository → model.
2. Only repositories touch Mongoose. That's why swapping the database means changing four files.
3. Controllers speak HTTP. Services hold business rules and never see `req` or `res`.
4. A JWT is **encoded, not encrypted** — anyone can read the payload, nobody can change it.
5. Two secrets, so leaking one doesn't compromise both token types.
6. Refresh tokens rotate — each works once. Replaying one revokes every token that user has.
7. Only the `jti` is stored, never the raw refresh token. A database leak yields useless UUIDs.
8. Login returns the same error for a wrong username and a wrong password, to stop user enumeration.
9. Role checks live in middleware; ownership checks live in the service, because you must load the data first.
10. Node's JavaScript is single-threaded, but bcrypt runs on libuv's thread pool so it doesn't block.
11. `dotenv.config()` runs before every import because `jwt.ts` reads secrets at import time — module caching means there's no second chance.
12. Integration tests use a real in-memory MongoDB, not a mock, so unique indexes and populate behave for real.

**The three flaws to volunteer before you're asked**
1. `POST /users` accepts `role: "admin"` with no authentication — anyone can make themselves an admin.
2. No rate limiting on login.
3. No CI — the tests exist, but nothing runs them automatically.

**If you don't know an answer:** *"I'm not certain — my instinct is X, but I'd check the docs before saying that definitively."* That answer is respected. Guessing confidently and being wrong is not.

---

*Generated for the `user-management-api` project. Every code reference in this document was verified against the source.*
