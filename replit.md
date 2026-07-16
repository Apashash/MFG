# Market Flow Group

A multi-user investment platform with dashboards, deposits, withdrawals, team management, and admin controls. Built with Express + EJS server-side rendering backed by PostgreSQL (Supabase).

## Run & Operate

- `node server.js` — start the server (port from `$PORT`, defaults to 5000)
- **Install dependencies first:** `pnpm install`

## Required Secrets

- `SESSION_SECRET` — Express session secret (already set)
- `SUPABASE_DATABASE_URL` — Supabase PostgreSQL connection string (takes precedence over `DATABASE_URL`)
- `DATABASE_URL` — fallback PostgreSQL connection string

## Stack

- Node.js, Express 5, EJS templating
- PostgreSQL via `pg` (Supabase-hosted), mysql2-compatible wrapper in `config/db.js`
- Sessions via `express-session`
- File uploads via `multer`
- Email via `nodemailer`

## Where things live

- `server.js` — app entry point, route mounts
- `config/db.js` — PostgreSQL pool with mysql2-compatible API shim
- `routes/` — Express routers (auth, dashboard, investissement, depot, retrait, compte, equipe, roue, salaire, cadeau, faq, admin)
- `views/` — EJS templates
- `services/` — `params.js` (cached app_parametres from DB), `autoPayout.js` (scheduled payouts)
- `middleware/` — `auth.js` (session guard), `paramLoader.js` (injects appParams into every view)
- `assets/`, `public/`, `uploads/` — static files

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `config/db.js` auto-converts MySQL `?` placeholders to PostgreSQL `$1, $2, ...` and appends `RETURNING id` to plain INSERTs — no need to write PostgreSQL-style placeholders in route queries.
- App parameters (site name, rates, etc.) are stored in the `app_parametres` table and cached with a 5-second TTL via `services/params.js`.
