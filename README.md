# Cayenne Project Tracker

A single-user web app for planning, tracking, and documenting a 2004 Porsche Cayenne Turbo (955) overland build: phases, jobs, parts, tools, costs, watch items, tasks, photos, and inspiration in one connected system.

- **What it does:** `docs/spec.md` (product spec, source of truth for behavior)
- **How it's built:** `docs/plan.md` (technical plan) and `DECISIONS.md` (choices and deviations)
- **What's done:** `docs/STATUS.md`

Stack: Next.js (App Router, TypeScript), Supabase (Postgres, Auth, Storage, row-level security), Tailwind + shadcn/ui, Vitest, Playwright. Hosted on Vercel.

## Local setup

Prerequisites: **Node 22** (`nvm use`), **Docker Desktop** running, and the **Supabase CLI** (installed as a dev dependency; `npx supabase` works).

```bash
npm install
npx playwright install chromium        # browsers for the end-to-end tests
npm run db:start                       # starts local Supabase in Docker (first run downloads images)
cp .env.example .env.local             # then fill it in (see below)
npm run db:reset                       # first time only: applies migrations, loads demo data, sets the dev password
npm run dev                            # http://localhost:3000
```

### `.env.local`

| Variable                                | Local value                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | `http://127.0.0.1:54321`                                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | `PUBLISHABLE_KEY` from `npx supabase status -o json`                                                                                           |
| `ALLOWED_EMAIL`                         | The one email that may sign in (the demo data is owned by it)                                                                                  |
| `NEXT_PUBLIC_MAX_UPLOAD_MB`             | Optional per-file upload cap; default 500                                                                                                      |
| `DEV_AUTO_LOGIN` / `DEV_LOGIN_PASSWORD` | Optional, local only: set `DEV_AUTO_LOGIN=1` and any random password to skip the magic link under `npm run dev`. Ignored by production builds. |

### Testing on your phone (same Wi-Fi)

```bash
npm run dev:lan          # prints http://<your-mac-ip>:3000 — open it on the phone and the Mac
```

It points the app at local Supabase through your Mac's Wi-Fi address (so uploads and photos work from the phone), allows that address as a Next.js dev origin, and keeps auto sign-in working. Stop `npm run dev` first (both use port 3000). If macOS asks to allow incoming connections for `node`, allow it. The full hands-on checklist is in `docs/MANUAL-TEST.md`.

Want to enter your real car instead of the demo build? `npm run db:fresh` gives you an empty database with just your user, and onboarding starts from there.

Without auto sign-in, request a magic link at `/login` and open it from the local mail catcher at http://127.0.0.1:54324. Supabase Studio is at http://127.0.0.1:54323.

## Everyday commands

```bash
npm run dev              # dev server
npm run preview          # production build + next start on :3000
npm run typecheck
npm run lint
npm run format           # prettier --write (CI runs format:check)
npm run test             # unit + database tests (needs local Supabase)
npm run test:e2e         # Playwright, desktop 1280x800 + phone 390x844; can run while `npm run dev` is up
npm run test:e2e:preview # the same suite against a production build
npm run db:migrate       # apply new migrations safely: backs up first, keeps your data
npm run db:backup        # back up local data and photos to backups/<timestamp>/ (gitignored)
npm run db:restore -- backups/<timestamp>  # put a backup back (replaces current local data)
npm run db:reset         # wipe and re-seed demo data (refuses while you have data)
npm run db:seed          # demo data only (refuses while you have data)
npm run db:fresh         # empty database + your user (refuses while you have data)
npm run dev:lan          # dev server reachable from your phone on the same Wi-Fi
npm run db:types         # regenerate lib/db/types.ts after a migration
```

Schema changes are new files in `supabase/migrations/`; never edit one that has been applied. Apply them locally with `npm run db:migrate` (it backs up, applies, and regenerates `lib/db/types.ts`); commit the types.

### Your local data is safe by default

`db:reset`, `db:fresh`, and `db:seed` refuse to run while your account has any data, and tell you to use `db:migrate` instead. To wipe on purpose: `WIPE_MY_DATA=1 npm run db:reset` (a backup is taken first). Tests create throwaway accounts and never touch yours. Back up before anything risky with `npm run db:backup`; backups include photos and files.

## Deploy (Vercel + Supabase)

One-time setup (plan "Human setup", steps 2–6):

1. **Supabase project** (Pro plan, US West). In **Authentication**:
   - Add the user: _Add user_ with `ALLOWED_EMAIL` (do this **before** disabling sign-ups).
   - Disable public sign-ups; keep email magic links enabled.
   - Set **Site URL** to the production URL and add `https://<prod-domain>/**` and the Vercel preview pattern to redirect URLs.
   - Set the **Magic Link** and **Confirm signup** email templates to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (copy `supabase/templates/magic_link.html`), so links work on any device.
2. **Storage:** set the project's upload size limit high enough for phone clips. The `attachments` bucket is created by the migrations.
3. **Migrations:** `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. **Vercel project** linked to this repo, with environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon or publishable key), `ALLOWED_EMAIL`, and `NEXT_PUBLIC_MAX_UPLOAD_MB` (match the Storage limit). **Do not** add the service-role key, `DEV_AUTO_LOGIN`, or `DEV_LOGIN_PASSWORD`.
5. Deploy, sign in, and smoke-check each screen. Add it to your phone's home screen from the browser's share menu.

Later schema changes: `npx supabase db push` after the migration has passed locally and in CI.

## Backups

The **Full data (.xlsx)** export doubles as the backup: **Vehicle → Exports → Download Excel**. It contains one sheet per table with ids (so rows join), money in dollars, and every record you've entered. Download it periodically and keep it somewhere safe. Single tables are also available as CSV.

Photos and files live in Supabase Storage (the `attachments` bucket) and are not inside the spreadsheet; the `attachments` sheet lists their storage paths. Supabase Pro includes daily database backups.

## Project layout

```
app/                  routes (screens under app/(app)/(shell), exports under app/api/exports)
components/           UI (shadcn primitives in components/ui)
lib/domain/           business rules as pure functions, with unit tests
lib/actions/          server actions (one file per entity)
lib/db/               Supabase clients, generated types, read queries
lib/exports/          PDF documents and spreadsheet builders
supabase/migrations/  SQL migrations (schema, RLS, views, RPCs)
scripts/              seed, dev password, icon generator
tests/                unit/, db/, e2e/, support/ (fixtures and demo data)
```
