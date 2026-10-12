# Project status

What's built versus what's left, against `docs/spec.md` and `docs/plan.md`. **Update this file at the end of every milestone** (see `CLAUDE.md`). Details and rationale live in `DECISIONS.md`.

_Last updated: 2026-10-11, after M7._

## Milestones

| Milestone | Status | Commit |
| --- | --- | --- |
| M0 Scaffold and deploy | ✅ Done locally (Vercel deploy deferred, see Outstanding) | `a0316ea`, `f21cce1` |
| M1 Schema, auth, shell | ✅ Done | `24acc45` |
| M2 Plan and Work Log | ✅ Done | `cedc867` |
| M3 Parts, tools, money | ✅ Done | `15b97a5` |
| M4 Media, quick-add, Gallery | ✅ Done | `48415f3` |
| M5 Watch list and tasks | ✅ Done | `607f893` |
| M6 Inspiration | ✅ Done | `3d04945` |
| M7 Dashboard | ✅ Done | see git log (`M7:`) |
| M8 Exports | ⏳ Next | |
| M9 Hardening | ⬜ Not started | |

## Spec key flows (e2e at phone and desktop)

| # | Flow | Status | Test |
| --- | --- | --- | --- |
| 1 | Quick add from phone | ✅ | `tests/e2e/media.spec.ts` |
| 2 | Mark job done | ✅ | `tests/e2e/mark-job-done.spec.ts` |
| 3 | Order a part | ✅ | `tests/e2e/order-a-part.spec.ts` |
| 4 | Promote inspiration | ✅ | `tests/e2e/inspiration.spec.ts` |
| 5 | Plan a phase | ✅ | `tests/e2e/plan-a-phase.spec.ts`, `order-a-part.spec.ts` (missing parts/tools) |
| 6 | Sell a removed part | ✅ | `tests/e2e/sell-a-part.spec.ts` |
| 7 | Add a watch item | ✅ | `tests/e2e/watch-and-tasks.spec.ts` |
| 8 | Check in on a watch item | ✅ | `tests/e2e/watch-and-tasks.spec.ts` |
| 9 | Add a task | ✅ | `tests/e2e/watch-and-tasks.spec.ts` |
| 10 | Review progress | ✅ | `tests/e2e/media.spec.ts` |
| 11 | Scoped carousel | ✅ job, phase, part, watch item | `tests/e2e/media.spec.ts` |

## Plan domain rules (unit tests in `tests/unit/`)

| Rules | Area | Status |
| --- | --- | --- |
| 1–5 | Jobs: blockers, guards, completion, follow-ups, cycles | ✅ |
| 6–8 | Parts: auto-Ordered, Record sale, manual status | ✅ |
| 9–13 | Money: committed/paid/remaining, rollups, buckets, overage, DIY hours | ✅ |
| 14 | Odometer (done jobs and check-ins) | ✅ |
| 15–18 | Watch items: due/overdue, relative follow-ups, promote, resolve/dismiss | ✅ |
| 19 | Inspiration promote | ✅ |
| 20 | Tasks never change other records | ✅ |
| 21–22 | Phases: seeding, delete keeps jobs | ✅ |

## Screens

| Screen | Status | Notes |
| --- | --- | --- |
| Dashboard | ✅ | All cards per spec; e2e asserts values with the demo seed |
| Plan | ✅ | Phase headers need a tidier action menu (M9) |
| Job detail | ✅ | |
| Work Log | ✅ | |
| Gallery | ✅ | |
| Watch list (+ item page) | ✅ | |
| Tasks | ✅ | |
| Parts (+ part page) | ✅ | |
| Tools | ✅ | |
| Inspiration | ✅ | Cards, tag filter, images, promote to part or job |
| Vehicle | ✅ | Money summary, ledger, notes, odometer, files |
| Global quick-add | ✅ | Photo / Watch item / Task |

## Exports (M8)

| Export | Status |
| --- | --- |
| Service history PDF | ⬜ |
| Build sheet PDF | ⬜ |
| Full data .xlsx | ⬜ |
| Per-table CSV | ⬜ |

## Deferred / known follow-ups

- Confirm the dashboard loads in under 1 s on the warm Vercel deployment (local production build: ~60 ms warm).

- Phase header has seven actions; fold secondary ones into a menu (M9).
- Empty, loading, and error states for every screen (M9).
- PWA manifest and icons (M9).
- Lighthouse accessibility ≥ 90 on dashboard, plan, gallery (M9).
- `README.md` with setup, deploy, and backup instructions (M9).
- `npm audit` advisories in the dev-only lint chain (revisit when `eslint-config-next` updates).

## Outstanding human setup (needed to deploy)

| Step | What | Status |
| --- | --- | --- |
| 1 | GitHub repo + Docker | ✅ (`gh auth login` still not run; CI is read via the public API because the repo is public) |
| 2 | Supabase cloud project (Pro, US West) + Vercel project | ⬜ |
| 3 | Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAIL`, `NEXT_PUBLIC_MAX_UPLOAD_MB` | ⬜ |
| 4 | Supabase Auth: create the user, then disable sign-ups; magic-link template with `token_hash`; redirect URLs | ⬜ |
| 5 | `supabase link` + approve first `supabase db push` | ⬜ |
| 6 | Storage upload size limit for phone clips | ⬜ |
| 7 | Supabase plan | ✅ Pro (spec decision) |

## Test totals (last full run)

- Unit + database (Vitest): 203
- End-to-end (Playwright, desktop + phone): 73, passing on dev and on a production build
