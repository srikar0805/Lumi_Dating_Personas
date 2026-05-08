# Lumi (Parallel Selves)

A persona-to-persona social matching platform built on the **MEAN stack** (MongoDB, Express, Angular, Node) with AI-powered compatibility narratives via the Hugging Face Inference API. Users create up to 5 distinct **selves** (career self, weekend self, creative self…) and match against other people's selves rather than as a single flat profile.

> **Course:** Web Development II · **Team size:** 3 · **Final due:** May 9, 2026

## Live demo

| | URL |
|---|---|
| Frontend | _to be added after deployment_ |
| Backend API | _to be added after deployment_ |
| Walkthrough video | _to be added_ |

## Team & roles

| Member | Role | Primary deliverables |
|---|---|---|
| Graduate Student (Lead) | Architect & Backend Lead | Express server, REST routes, JWT auth middleware, matching algorithm, Hugging Face integration, MongoDB schemas, persona versioning, seed script, deployment |
| Undergrad Student 1 | Frontend Developer | Angular components (PersonaForm, PersonaCard, PersonaList, Dashboard, MatchDashboard, Connect), reactive forms, routing, route guards, HttpInterceptor, styling |
| Undergrad Student 2 | Frontend + Data Layer | D3 GraphComponent, ReportPanelComponent, DriftTimelineComponent, all Angular services and BehaviorSubjects, AiService integration, seed data QA |

## Repo layout

```
.
├── server/                  Express + MongoDB API
│   ├── bin/www              Native HTTP server entrypoint with port normalization + listeners
│   ├── server.js            Express app (exports `app`, no listen call)
│   ├── controllers/         Request handlers (auth, personas, matches, ai)
│   ├── routes/              Thin route → controller wiring
│   ├── models/              Mongoose schemas (User, Persona, PersonaVersion, Match, Swipe)
│   ├── middleware/          JWT auth middleware
│   ├── utils/               matching.js, huggingFace.js
│   ├── config/              MongoDB connection
│   └── seed.js              100-user demo seed
├── client/                  Angular 17 frontend (standalone components)
│   └── src/app/
│       ├── components/      Login, register, dashboard, persona-list, persona-card, persona-form,
│       │                    match-dashboard, connect, graph, report-panel, drift-timeline,
│       │                    profile, navbar, about, why
│       ├── services/        Auth, Persona, Match, Graph, Ai, Drift
│       ├── guards/          authGuard
│       ├── interceptors/    JWT auth interceptor
│       ├── models/          TypeScript interfaces
│       └── shared/          Icon, persona-orb, toast, theme service
├── prototype/               Original static React prototype (UI reference, not part of the deliverable)
└── uploads/                 Source proposal (.docx)
```

## Tech stack

| Layer | Technology |
|---|---|
| Database | MongoDB 7 (Atlas in production, local in dev) via Mongoose 8 |
| API | Express 4 on Node 18+ |
| Auth | JWT signed with HS256 (`jsonwebtoken`), passwords hashed with bcrypt |
| AI | Hugging Face Inference Providers router → `meta-llama/Llama-3.1-8B-Instruct` (chat completions) |
| Frontend | Angular 17, standalone components, reactive forms, async pipe |
| Graph | D3 v7 force simulation (no chart library) |
| Build | Angular CLI, esbuild |

## Prerequisites

- Node.js 18+ and npm
- A MongoDB instance — local install **or** a free MongoDB Atlas cluster
- A Hugging Face account + access token (with the *"Make calls to Inference Providers"* permission). Without it, the cached/seeded AI reports still work but new live reports will fail gracefully.

## First-time setup

```bash
# 1. Install dependencies for both server and client
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cd ../server
cp .env.example .env       # if .env.example exists, otherwise create .env from the template below
# Edit .env: fill in MONGO_URI, JWT_SECRET, HF_API_TOKEN, HF_MODEL
```

### `server/.env` template

```dotenv
PORT=5001
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/parallelselves?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_string
HF_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

## Seed demo data

```bash
cd server
npm run seed
```

Populates MongoDB with **100 users**, **~200 personas across 30+ U.S. cities**, ~15K pre-computed matches, and **6 sample AI compatibility reports** seeded onto the top matches so the report panel works without a live HF call.

Re-run any time to reset.

### Demo accounts

All 100 seeded users share the password **`demo1234`**. Featured demo emails:

| Email | Name | City |
|---|---|---|
| `maya@parallel.app` | Maya L. | Boston, MA |
| `dev@parallel.app` | Dev S. | Cambridge, MA |
| `kenji@parallel.app` | Kenji T. | Seattle, WA |
| `priya@parallel.app` | Priya R. | Austin, TX |

## Run in development

Two terminals:

```bash
# Terminal 1 — API on http://localhost:5001
cd server && npm start

# Terminal 2 — Angular dev server on http://localhost:4200
cd client && npm start
```

The client's `src/environments/environment.ts` points to `http://localhost:5001/api`. Update there if your API runs elsewhere.

> **macOS note:** API defaults to **5001** because macOS AirPlay Receiver occupies port 5000. If you need 5000, disable AirPlay Receiver in System Settings → General → AirDrop & Handoff.

## REST API

All routes under `/api`. All except `auth/register` and `auth/login` require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /auth/register | Register user (optional `city`, `state`); returns JWT |
| POST | /auth/login | Login; returns JWT |
| GET | /auth/me | Current user |
| PUT | /auth/me | Update name / city / state / password |
| GET | /personas | List current user's personas |
| POST | /personas | Create persona (max 5/user) + snapshot v1 + re-score |
| PUT | /personas/:id | Update + bump version + snapshot + re-score |
| DELETE | /personas/:id | Delete + cascade matches + history |
| GET | /personas/:id/history | All versions newest-first |
| GET | /matches | Matches touching current user's personas, sorted, populated |
| POST | /matches/score | Recompute every pair |
| GET | /matches/connect?personaId= | Ranked candidate stack (proximity tier → score) |
| POST | /matches/swipe | Record `right`/`left` (returns `mutual: true` if reciprocated) |
| DELETE | /matches/swipe | Undo a swipe |
| GET | /matches/:id/report | Cached AI report |
| POST | /ai/report | Generate (or return cached) Llama-3.1 compatibility narrative |
| GET | /health | `{ ok: true }` |

## Scoring algorithm

Defined in [server/utils/matching.js](server/utils/matching.js):

```
score = 0.35 × traitJaccard      (as 0–100, case-insensitive)
      + 0.35 × interestJaccard   (as 0–100)
      + 0.15 × goalAlignment     (100 if connectionGoal matches, else 30)
      + 0.15 × moodAlignment     (100 if moodTag matches, else 30)
```

Re-runs automatically on any persona create/update. Bulk recompute via `POST /api/matches/score`.

## Server architecture

- **Native HTTP server entrypoint** at [server/bin/www](server/bin/www): `http.createServer(app)`, `normalizePort()` helper, and `error` + `listening` event handlers (handles `EACCES` and `EADDRINUSE` explicitly).
- **MVC separation**: `models/` (Mongoose schemas) → `controllers/` (request handlers) → `routes/` (thin `router.method('/path', controller.fn)` wiring).
- **JWT middleware** at [server/middleware/auth.js](server/middleware/auth.js) verifies the `Authorization: Bearer …` header, sets `req.userId`, and gates all protected routes.
- **AI integration** uses the **Hugging Face Inference Providers router** (`https://router.huggingface.co/v1/chat/completions`) with OpenAI-compatible chat completions. Reports are cached in MongoDB so subsequent loads are instant.

## Angular architecture

- **Standalone components** — no NgModule glue. Each routed page is lazy-loaded via `loadComponent` in [app.routes.ts](client/src/app/app.routes.ts).
- **Services** expose `BehaviorSubject` / `Subject` streams so components subscribe via the `async` pipe — no manual DOM manipulation.
- **JWT flow** — `AuthService` persists to `localStorage`; `authInterceptor` attaches `Authorization` to every outbound request; `authGuard` redirects unauthenticated traffic to `/login`.
- **Theme** — [theme.service.ts](client/src/app/shared/theme.service.ts) flips body classes for light/dark + accent variants, persisted to `localStorage`.
- **Graph** — `d3.forceSimulation` with `forceLink` (distance inverse to match score), `forceManyBody` repulsion, and `forceCollide`. Edge click opens the shared `ReportPanel` drawer.
- **Connect** — Tinder-style swipe stack with drag-to-swipe, animated LIKE/NOPE stamps, undo, and ranked candidate generation (proximity tier → compatibility score).

## Mongoose models

| Model | Key fields |
|---|---|
| User | name, email, passwordHash, city, state |
| Persona | userId, name, traits[], interests[], connectionGoal, moodTag, bio, currentVersion |
| PersonaVersion | personaId, versionNumber, snapshot |
| Match | personaAId, personaBId, score, traitOverlap, interestSimilarity, goalAlignment, moodAlignment, aiReport |
| Swipe | userId, fromPersonaId, toPersonaId, toUserId, direction (`right`/`left`) |

## Deployment

_Pending — frontend and backend will be deployed before the May 9 deadline. Live URLs and demo video link will be added to the table at the top of this file._

Planned hosts:
- **Backend** → Render.com (Node web service). Env vars: `MONGO_URI`, `JWT_SECRET`, `HF_API_TOKEN`, `HF_MODEL`, `PORT`.
- **Frontend** → Vercel / Netlify (static build of `client/dist/client/browser/`). Before building production, set `client/src/environments/environment.prod.ts` to the deployed API URL.

## License

Coursework — University of New Haven, Spring 2026.
