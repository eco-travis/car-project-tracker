# Decisions

Log of plan/spec conflicts, internal choices, and milestone notes. The spec (`docs/spec.md`) wins over the plan (`docs/plan.md`) on behavior.

## Pre-M0 — plan vs. spec reconciliation (2026-10-09)

| #   | Topic                                  | Plan says                                            | Spec says                                                                       | Resolution                                                                                                                                                                            |
| --- | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Expense linked only to a part          | Attribution uses `e.job_id` / `e.phase_id` only      | Counts toward the part's job and that job's phase                               | Views resolve the job as `coalesce(e.job_id, p.job_id)` via a join to `parts`; job/phase costs and buckets use that effective job                                                     |
| 2   | Watch item overdue                     | Date more than 7 days past                           | Also more than 500 miles past the follow-up reading                             | `is_overdue` = date > 7 days past OR `current_odometer - next_followup_odometer > 500`; rule 15 updated in `lib/domain/`                                                              |
| 3   | Photo dates                            | `taken_at timestamptz`, no zone stated               | EXIF times interpreted in Pacific; Gallery months grouped in Pacific            | Zone-less EXIF read as `America/Los_Angeles`; month grouping uses `taken_at at time zone 'America/Los_Angeles'`                                                                       |
| 4   | Audio clips                            | Upload accepts `image/*,video/*,application/pdf`     | Kind "Audio/video clip"; capture includes audio                                 | Accept `audio/*` too; audio stored as kind `clip` with an audio tile; lightbox plays it                                                                                               |
| 5   | Parts on Done job                      | Rule 4: UI _offers_ to mark received parts installed | Part section: "a Done job marks its parts Installed"; Flow 2: "Offers to mark…" | Follow the flow (more specific): offer, don't force. Only `received` parts are offered                                                                                                |
| 6   | Supabase plan                          | Human step 7: undecided                              | Pro                                                                             | Pro. Bucket file limit set high enough for phone clips (human step 6)                                                                                                                 |
| 7   | Large uploads                          | Single `uploadToSignedUrl`                           | — (internal)                                                                    | Resumable (TUS) uploads for clips over ~6 MB; standard signed upload for photos/thumbnails. Adds `tus-js-client` against Supabase's resumable endpoint. Approved by Travis 2026-10-09 |
| 8   | `middleware.ts`                        | Session refresh in `middleware.ts`                   | — (internal)                                                                    | Next.js 16 renamed it `proxy.ts`; use whichever the installed Next version requires                                                                                                   |
| 9   | "Build cost" wording                   | Phase-only expenses (no job) → build                 | "Modification jobs and unphased build expenses"                                 | Read as plan does: expenses with a phase but no job count as build                                                                                                                    |
| 10  | Phase "what's missing" header (Flow 5) | M2 Plan screen shows blockers only                   | Header lists parts not ordered, tools Need to buy, open blocking tasks          | Built incrementally: blocking jobs in M2, parts/tools in M3, tasks in M5                                                                                                              |

## Internal choices

- View sums cast to `bigint` so generated types stay `number`.
- E2E auth uses the local Supabase admin API to generate magic links (local only, never in app code or Vercel).
- Server actions verify an attachment's parent belongs to the same `vehicle_id`.

## M0 — Scaffold (2026-10-09)

**Shipped:** Next.js 16.4 (App Router, TS strict, Turbopack, `cacheComponents` on as scaffolded), Tailwind 4, shadcn/ui (Radix, Nova preset), ESLint + Prettier, Vitest, Playwright (desktop + phone projects), Supabase CLI config (`supabase/`), GitHub Actions CI (typecheck, lint, format check, unit tests), `CLAUDE.md`.

**Decisions**

- Node 22 LTS, pinned via `.nvmrc` and `engines`. All dependency versions pinned exactly.
- `typecheck` runs `next typegen` first so route types (`LayoutProps`, etc.) exist in CI without a build.
- Phone e2e runs on Chromium with mobile emulation (390×844, touch, iPhone UA). Playwright's WebKit build fails on macOS 14 (`Unknown setting: PushAPIEnabled`). Real iOS Safari gets a manual smoke check.
- `npm audit` reports 5 high-severity advisories, all in the dev-only lint chain (`eslint-config-next` → `fast-glob` → `micromatch`). Not shipped to the browser; revisit when `eslint-config-next` updates.
- `lib/domain/money.ts` (`formatCents`) added early as the unit-test smoke check; `components/money.tsx` will wrap it.

**Pending (human):** GitHub repo + `gh auth login` (step 1), Supabase + Vercel projects (step 2), Vercel env vars (step 3). Until then CI and the Vercel deploy criteria are unchecked.
