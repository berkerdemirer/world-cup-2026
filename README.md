# World Cup 2026 Prediction Game ⚽🏆

A small webapp to run a World Cup 2026 prediction pool with colleagues. Players
predict **match scores** and a **knockout bracket**; a live leaderboard updates as
real results come in from [football-data.org](https://www.football-data.org/).

## Features

- **Lightweight login** — just a display name, with an optional PIN to protect it. No OAuth.
- **Score predictions** for every match (Kicktipp-style: exact 4 / goal difference 3 / correct result 2). Each match locks at kickoff.
- **Bracket predictions** — pick which teams reach each knockout round (R16 → Champion), with escalating points. Locks when the knockout stage begins.
- **Automatic results** synced from football-data.org via a scheduled job, with an **admin manual override** that the sync never overwrites.
- **Leaderboard** ranked by total points, then exact scores, then join order.
- **Admin panel** — sync data, enter/override results, tune scoring, manage players.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Drizzle ORM · Neon serverless
Postgres · iron-session · Zod. Deploys to Vercel.

## Local setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Create a Postgres database** (e.g. a free [Neon](https://neon.tech) project) and copy the connection string.

3. **Get a football-data.org token** (free) at https://www.football-data.org/client/register.

4. **Configure environment** — copy `.env.example` to `.env.local` and fill in:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` — Neon connection string
   - `FOOTBALL_DATA_TOKEN` — your API token
   - `SESSION_PASSWORD` — ≥32 random chars (`openssl rand -base64 32`)
   - `CRON_SECRET` — protects the sync endpoint (`openssl rand -hex 16`)
   - `ADMIN_NAMES` — comma-separated display names to seed as admins

5. **Create the schema and seed**
   ```bash
   pnpm db:push      # apply the schema to your database
   pnpm seed         # create the settings row + admin user(s)
   ```

6. **Run**
   ```bash
   pnpm dev
   ```
   Log in with one of your `ADMIN_NAMES`, open **Admin → Sync now** to load fixtures, then start predicting.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests for the scoring logic |
| `pnpm db:generate` | Generate a SQL migration from the schema |
| `pnpm db:push` | Push the schema directly to the DB (good for dev) |
| `pnpm db:migrate` | Apply generated migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm seed` | Seed settings + admin users |

## Deploying to Vercel

1. Import the repo into Vercel and set the four env vars (`DATABASE_URL`, `FOOTBALL_DATA_TOKEN`, `SESSION_PASSWORD`, `CRON_SECRET`). Enable them for **Production** and **Preview** if you use PR previews.
2. Deploys run `drizzle-kit push` before `next build` (`vercel-build`), syncing `db/schema.ts` to the live database (works whether you originally used push or migrate).
3. Run `pnpm seed` once against production if this is a fresh database.
3. `vercel.json` registers a **daily cron** that calls `/api/cron/sync`. On the Hobby
   plan crons run once per day — during the tournament you can either hit
   **Admin → Sync now** manually on match days, or point a free external scheduler
   (cron-job.org / a GitHub Actions cron) at
   `https://<your-app>/api/cron/sync?secret=<CRON_SECRET>` every ~10 minutes.

## Live updates

The dashboard and leaderboard refresh themselves while open and pull live scores
without anyone clicking anything. Crucially, the football-data.org call is
**throttled globally in the database**, not per browser: every open client polls
`/api/live`, but the upstream API is hit **at most once per `liveSyncSeconds`**
(default 30s, set in Admin → Scoring settings) thanks to an atomic
compare-and-swap on a shared `lastSyncedAt` timestamp. So 1 player or 50 players
with the app open produces the same ~2 calls/minute — well within the paid tier's
20 calls/min. In-play scores are stored as they update, but points are only
awarded once a match is `FINISHED`.

## How scoring works

**Match (per finished game)** — the single highest matching tier is awarded:
exact score (4), correct goal difference (3), correct result (2), otherwise 0.
Knockout games are scored on the post-extra-time result; penalties decide bracket
advancement only.

**Bracket** — for each round you pick the teams you think will reach it. You score
the round's points for every pick that actually got there: Round of 16 (2),
quarter-finalist (4), semi-finalist (6), finalist (8), champion (12). All point
values are editable in **Admin → Scoring settings**, which recomputes the
leaderboard.

## Project layout

```
app/                     Pages, server actions, and the cron route
  actions/               auth, predictions, admin server actions
  predict/matches        score prediction UI
  predict/bracket        bracket prediction UI
  admin/                 sync, results, settings, users
  api/cron/sync          scheduled result sync endpoint
components/              Nav, app shell, shared UI
db/                      Drizzle schema, client, migrations
lib/                     session, football-api client, scoring, queries
scripts/seed.ts          settings + admin seeding
```
