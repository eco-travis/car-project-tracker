# Cayenne Project Tracker

Single-user web app for planning, tracking, and documenting a 2004 Cayenne Turbo overland build.

- **Spec (behavior, source of truth):** `docs/spec.md`
- **Technical plan (structure, order, milestones M0–M9):** `docs/plan.md`
- **What's done vs. outstanding:** `docs/STATUS.md`
- **Decisions, plan/spec conflicts, milestone notes:** `DECISIONS.md`
- **Next.js version notes:** @AGENTS.md (this Next.js has breaking changes; read `node_modules/next/dist/docs/` before writing Next code)

## Agent instructions

Build milestones M0 through M9 in order. A milestone is done only when every acceptance criterion passes and the definition of done is met; do not start the next one before that.

**Ground rules**

- The spec defines behavior. If the plan and the spec disagree, follow the spec and log the conflict in `DECISIONS.md`.
- Build only MVP scope. Anything in the spec's Post-MVP column is out of scope, even if it looks easy.
- Put business rules in pure functions under `lib/domain/` with unit tests. UI and server actions call them; they never re-implement them.
- Money is integer cents everywhere (`bigint` in Postgres, `number` in TypeScript). Format only at display time. Currency is USD, distance is miles.
- Every schema change is a new migration file. Never edit a migration that has already been applied.
- Never commit secrets. Read configuration only from environment variables listed in the plan's Human setup.
- Commit at least once per milestone with a message starting `M<n>:`.
- At the end of every milestone, update `docs/STATUS.md` (milestones, flows, rules, screens, deferred items, test totals) in the same commit.
- Production migrations (`supabase db push`) run only after the human approves in chat.
- Deployment is deferred (see `DECISIONS.md`): the definition-of-done smoke check runs against `npm run preview` with local Supabase instead of Vercel.

**Stop and ask the human when:**

1. A step needs an account, a dashboard setting, or a secret (see the plan's Human setup).
2. The spec is silent or ambiguous on user-visible behavior. Make a reasonable choice only for internal details, and record it in `DECISIONS.md`.
3. A dependency needs a paid tier, or a library choice in the plan doesn't work and a replacement is needed.
4. A milestone's acceptance criteria can't be met as written.

## Commands

```
npm run dev         # Next.js dev server
npm run preview     # production build + next start (stand-in for deploy smoke check)
npm run typecheck   # next typegen && tsc --noEmit
npm run lint
npm run format      # prettier --write (format:check in CI)
npm run test        # unit + database (Vitest)
npm run test:e2e    # Playwright, desktop 1280x800 + phone 390x844 (dev server)
npm run test:e2e:preview  # same suite against a production build
npm run db:start    # supabase start (needs Docker running)
npm run db:reset    # supabase db reset, then db:seed
npm run db:seed     # demo data owned by ALLOWED_EMAIL (local only)
npm run db:dev-password  # local password for DEV_AUTO_LOGIN (skips the magic link in `npm run dev`)
npm run db:types    # regenerate lib/db/types.ts
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/make-icons.mts  # re-render app icons
```

## Environment

- Node 22 (`.nvmrc`). Dependencies are pinned exactly (`.npmrc` has `save-exact=true`).
- Local env vars go in `.env.local` (see `.env.example`); values come from `npm run db:start` output.
- Database and e2e tests need local Supabase running (`npm run db:start`). E2E creates throwaway users through the local admin API; sign-in-gate tests use `ALLOWED_EMAIL` from `.env.local` and Mailpit.
- Phone e2e uses Chromium with mobile emulation; Playwright's WebKit build doesn't run on this Mac (macOS 14).
