<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js (App Router) app: a World Cup 2026 prediction game backed by Postgres via Drizzle. Standard scripts are in `package.json` / README (`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm db:push`, `pnpm seed`).

Non-obvious setup/run notes (the update script only runs `pnpm install`):

- **Database driver.** `db/index.ts` defaults to the Neon **HTTP** driver, which cannot talk to a plain Postgres. For local dev set `DB_DRIVER=pg` in the env file so it uses node-postgres against a local Postgres.
- **Env file is `.env`, not `.env.local`.** `drizzle.config.ts` and `scripts/seed.ts` use `dotenv/config`, which only reads `.env`. Next.js reads `.env` too, so a single `.env` covers dev + drizzle + seed. `.env*` is gitignored. A working `.env` already exists in the VM snapshot.
- **Local Postgres runs in Docker** (container `wc2026_dev_pg`, db `worldcup`, on `127.0.0.1:5432`). Docker has no init system here, so after a fresh boot you must start it manually: `sudo dockerd > /tmp/dockerd.log 2>&1 &` then `sudo docker start wc2026_dev_pg` (the container is created with `--restart unless-stopped`). `docker` needs the `docker` group or `sudo`; the `pnpm test:integration` harness calls `docker` directly, so run it via `sg docker -c "pnpm test:integration"` (or as a user with the group active). The integration harness spins up its own throwaway Postgres; unit tests (`pnpm test`) need no DB.
- **Login is always room-gated.** `lib/room.ts` `isRoomGated()` always returns `true`, so nobody can log in unless a room key is configured. Set `ROOM_PASSWORD` in `.env` (or set it in Admin → Settings). The current `.env` uses `ROOM_PASSWORD=worldcup`.
- **Admin account.** `pnpm seed` creates admins from `ADMIN_NAMES` with **no PIN**; the first login for that display name claims the account by setting its PIN. Current seed uses `ADMIN_NAMES=Admin`, so log in as `Admin` with any 4–8 digit PIN plus the room key.
- **Fixtures/sync** need a real `FOOTBALL_DATA_TOKEN` from football-data.org; without it the app runs but Admin → Sync and live scores won't load real matches.
- **Smoke test** (`pnpm test:smoke`) needs a separate live Neon `DATABASE_TEST_URL` and is not run in this environment.
- **Vercel deploys** run `drizzle-kit push` via the `vercel-build` script before `next build`. If production errors with `column … does not exist`, run `DATABASE_URL=<prod> pnpm db:push` locally or execute the `ALTER TABLE` from the latest file in `db/migrations/` in the Neon SQL console, then redeploy.
