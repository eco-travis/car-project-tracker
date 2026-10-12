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

## Deployment deferred (2026-10-09)

Travis chose to build and preview locally and deploy later. Changes to the plan's definition of done:

- "Deployed to Vercel production and smoke-checked" is replaced by: `npm run preview` (production build + `next start`) against local Supabase, smoke-checked by signing in and opening each screen touched by the milestone.
- M0's "deploys to Vercel" criterion and human setup steps 2–5 move to a later deployment milestone, before real use from the phone.
- Risks that only show up on Vercel (function time limits for PDF exports, magic-link redirect URLs, env vars, CSP against the hosted Supabase origin) are checked at that point. Recommend deploying no later than the end of M4, since phone capture is the main reason to have it hosted.

**M0 status:** dev server, local Supabase, and CI (run 38025544573) pass. Vercel deploy deferred per above.

## M1 — Schema, auth, shell (2026-10-09)

**Shipped:** every table, enum, index, and owner-only RLS policy from the plan; private `attachments` bucket with path-prefix storage policies; generated types; magic-link sign-in gated to `ALLOWED_EMAIL`; session refresh, auth redirects, and security headers in `proxy.ts`; onboarding (vehicle + five seeded phases in one transaction); authenticated shell with every screen as a placeholder.

**Acceptance:** all four criteria pass. `tests/e2e/auth.spec.ts` (other emails get an error and no mail reaches Mailpit), `tests/e2e/onboarding.spec.ts` + `tests/db/onboarding.test.ts` (rule 21, `/` then goes to the dashboard), `tests/db/rls.test.ts` (second user can't read, update, delete, or forge rows in any of the 15 tables, or read, list, sign, overwrite, or delete storage objects; I confirmed it fails when RLS is turned off on one table), `tests/e2e/navigation.spec.ts` (sidebar at 1280px, bottom nav + More sheet at 390px). The e2e suite also passes against a production build (`npm run test:e2e:preview`).

**Decisions**

- **Cache Components off.** Every screen reads per-user data, and CSP nonces require dynamic rendering, so the root layout calls `connection()`. Revisit only if the dashboard misses its 1-second target.
- **Views deferred to the milestones that test them**: cost views in M3, `v_job_blockers` in M2, `v_watch_due` in M5. M1 created every table so generated types are complete.
- **One vehicle per owner** enforced by a unique index (MVP scope; it also makes onboarding idempotent against double submits). Multi-vehicle (post-MVP) drops it in a new migration.
- **Join tables carry `owner_id`** as well, so the one owner policy covers every table.
- **Magic links use `token_hash`**, not PKCE: the email template links to `/auth/callback?token_hash=…&type=email`, so a link requested on the desktop can be opened on the phone. The callback still accepts a PKCE `code`.
- **CSP:** per-request script nonces with `strict-dynamic`; `style-src 'unsafe-inline'` because Radix sets inline style attributes; Supabase origin allowed for img, media, and connect. Also sends `Referrer-Policy: same-origin` and `X-Content-Type-Options: nosniff`. `upgrade-insecure-requests` is omitted so the LAN preview works over http; Vercel serves https anyway.
- **Phone bottom nav:** Dashboard, Plan, Work Log, Gallery, plus "More" (a bottom sheet with the other six screens and Sign out). The global quick-add button joins it in M4.
- **Next dev indicator moved to top-right**: the default bottom-left covered the phone nav.
- **CI starts local Supabase** (minus unused services) so database tests run on every push.
- **Cross-owner foreign keys aren't blocked** at the database level: Postgres FK checks bypass RLS, so a second user could create their _own_ row pointing at the first user's id. They still can't read or change the first user's data. Acceptable for a single-user app with sign-ups disabled; server actions only use ids the user can read.

**For the deployment milestone (additions to human setup step 4):**

1. Create the one user in Supabase Auth (Dashboard → Authentication → Add user, with `ALLOWED_EMAIL`) _before_ disabling sign-ups. With sign-ups off, a magic link can't create the account.
2. Set the Magic Link and Confirm signup email templates to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (copy `supabase/templates/magic_link.html`).
3. Add `https://<prod-domain>/**` and the Vercel preview pattern to redirect URLs.

## M2 — Plan and Work Log (2026-10-10)

**Shipped:** phase CRUD with drag-to-reorder (pointer and keyboard); job CRUD within phases and unphased; blocked-by dependencies with cycle rejection; job detail page with a status control, Mark done dialog, completion editing, and dependency management; Work Log with type and phase filters and text search; vehicle page with notes and a manual odometer update; local seed data.

**Acceptance:** all three criteria pass.

- Rules 1–5, 14, 21, 22 are pure functions in `lib/domain/` (`jobs.ts`, `odometer.ts`, `phases.ts`) with unit tests, enforced in `lib/actions/`.
- The Plan shows blocked jobs with their blockers' names, linked to each blocking job ("Blocked by All-terrain tires"); the phase header shows "Missing: N jobs are blocked".
- Spec flow 2 (`tests/e2e/mark-job-done.spec.ts`) and flow 5 (`tests/e2e/plan-a-phase.spec.ts`) pass at both viewports, on dev and on a production build.

**Decisions**

- **Rule 14 runs as a database trigger** (`jobs_raise_vehicle_odometer`), not an RPC. Every path that saves a done job (Mark done, completion edits, future imports) raises the odometer in the same transaction, and it can only go up. `lib/domain/odometer.ts` stays the reference rule and the trigger is tested against it. M5's watch check-ins get the same treatment.
- **Rule 2 runs in the server action** from source rows through `openBlockers()` / `statusChangeError()`. The client runs the same check first for instant feedback, and the server re-checks.
- **Views:** `v_job_open_blockers` (one row per open blocker, used for the names on the Plan) and `v_job_blockers` (the count the plan asked for). A DB test checks the view against the domain function on the same data.
- **Rule 4:** after Mark done, a follow-up step offers to mark Received parts Installed ("Not now" leaves them). The "add after photos" half of the offer arrives with media in M4.
- **Reopening a done job** keeps its completion date and odometer, so nothing is lost if it's marked done again.
- **"Today" means Pacific time** (`lib/domain/dates.ts`), matching the spec's photo-date decision.
- **Native `<select>` everywhere** in forms: it opens the phone's own picker.
- **Odometer inputs are capped at 9,999,999 miles**, so absurd values get a validation message, not a database error.
- **Seed data is a script, not `seed.sql`.** `npm run db:reset` resets and then runs `scripts/seed.mts`, which creates demo data owned by `ALLOWED_EMAIL`. A SQL seed would need a hard-coded user id and email in the repo, and the repo is public. E2E tests don't use seed data; every test creates its own throwaway user.
- **The dnd-kit `DndContext` has a fixed `id`.** Its generated ids come from a module-level counter that drifts between server and client, which caused intermittent hydration mismatches. The e2e fixture now fails any test that logs a hydration error, and I confirmed it catches this one.
- **E2E waits for hydration** after every full page load (`html[data-hydrated]`), because typing into a not-yet-hydrated input lost keystrokes.
- **Next's dev indicator is off**: every corner collided with app chrome. The error overlay still appears.

## Dev auto sign-in (2026-10-10)

Travis asked to skip the magic link during local testing. `npm run dev` now signs in automatically as `ALLOWED_EMAIL` when **all** of these hold (`lib/dev-login.ts`, unit-tested): `NODE_ENV=development` (so never in a production build), `DEV_AUTO_LOGIN=1`, `DEV_LOGIN_PASSWORD` set, and a Supabase URL on localhost. Unauthenticated requests redirect to `/auth/dev-login?next=…`, which uses password sign-in with the anon key (no service key in the app) and returns 404 when disabled.

- `DEV_AUTO_LOGIN` and `DEV_LOGIN_PASSWORD` live only in the gitignored `.env.local`. `npm run db:dev-password` sets that password on the local user, and `npm run db:reset` runs it automatically.
- E2E sets `DEV_AUTO_LOGIN=0`, so tests still exercise the real sign-in gate.
- E2E builds into `.next-e2e` (`NEXT_DIST_DIR`) because Next 16 allows only one dev server per build dir; tests can now run while `npm run dev` is up on :3000.
- Never set these in Vercel. The production deploy ignores them anyway because `NODE_ENV` is `production`.

## M3 — Parts, tools, money (2026-10-10)

**Shipped:** Parts list (status filter and search across name, brand, vendor, and every part number including superseded, with or without dashes) and detail with every spec field; linking parts to jobs and replaced parts; Tools list (by status, then location) with job links; one expense ledger, added from a part, tool, job, phase, or the vehicle page, with Mark paid, edit, and delete; Record sale; budget, committed, paid, remaining, and overage on jobs, phases, and the vehicle; the cost views.

**Acceptance:** all three criteria pass.

- Rules 6–13 are pure functions in `lib/domain/parts.ts` and `lib/domain/costs.ts` with unit tests.
- Every new view (`v_expense_attribution`, `v_job_costs`, `v_phase_costs`, `v_vehicle_totals`, `v_part_costs`) has a DB test that compares it to the domain functions on the same fixture ledger and to hand-computed values.
- Job detail and Plan (phase headers and job rows) show budget, committed, paid, remaining, and the overage ("Over by $50.00").
- Flow 3 (`tests/e2e/order-a-part.spec.ts`) and flow 6 (`tests/e2e/sell-a-part.spec.ts`) pass at both viewports, on dev and on a production build.

**Decisions**

- **Vehicle buckets (build, ownership, tools, recovered, unassigned) count paid money only.** Committed spend is shown as its own line ("Committed, not yet paid"), and Total invested = purchase price + all paid (rule 11). The spec defines Total invested on Paid, so the buckets match it. Revisit if you'd rather see build cost including committed.
- **Part-only expenses** count toward the part's job and phase everywhere (views, job page, plan), per the spec decision. The job page lists them with the job's own expenses.
- **Rule 6 runs as a trigger** (`expenses_mark_part_ordered`) on expense insert, the same pattern as the odometer. It only advances Idea, Researching, and Wishlist parts.
- **Rule 7 runs in `record_part_sale`**, an RPC that writes the negative paid Sale expense and marks the part Sold in one transaction. It re-checks Removed under a row lock. The ledger form doesn't offer the Sale category, and Sale entries can't be edited, only deleted.
- **An expense added from a part defaults to Committed** (flow 3 says it "adds a Committed line"). Everywhere else it defaults to Paid.
- **The phase "Missing" line** now lists parts not ordered, tools to buy, and blocked jobs, counting only open jobs. Blocking tasks join it in M5 (they already count as blockers).
- **Build cost is shown with and without tools** (spec cost rule 4). Recovered is shown as a positive amount on its own line (spec cost rule 2).
- **Destructive actions on money records** (deleting an expense, part, or tool) go through a confirmation dialog.
- **Record sale stays mounted after the sale.** The part becomes Sold on refresh; unmounting the dialog had swallowed the "mark linked tasks done?" follow-up.
- **`formatCents` normalizes −0**, which had rendered as "-$0.00".
- **The demo seed now includes** 8 parts across the lifecycle, 3 tools (one Need to buy), and 8 expenses (two committed), so every money screen has data locally.

## M4 — Media, quick-add, Gallery (2026-10-11)

**Shipped:** the upload pipeline (EXIF taken date, client-side compression to 2560px plus a 480px thumbnail, signed direct-to-Storage uploads, resumable TUS uploads for clips over 6 MB, finalize-then-insert with cleanup on failure); attachment sections on job, part, and vehicle pages and attachment dialogs on phases, tools, and expense rows (receipts); Before/During/After tags, highlight star, caption, and editable taken date; delete removes the stored files; global quick-add (desktop sidebar button, phone camera button); the Gallery (month groups, filters, highlights only, receipts/documents toggle, oldest/newest order, keyset "Load more" at 60 per page); the carousel (swipe, pinch zoom, video and audio, captions with date, odometer, phase, job, and a link to the record, plus a star toggle); scoped "View photos" on job, phase (includes its jobs' media), and part; the "Add after photos" half of rule 4 after Mark done.

**Acceptance:** all three criteria pass.

- Phone e2e: quick-add uploads in two taps after choosing the file, and the photo lands on the job and in the Gallery under its taken month (`tests/e2e/media.spec.ts`).
- Inspiration media never appears in the Gallery, and receipts appear only with the toggle on.
- Flows 1, 10, and 11 pass at both viewports, on dev and on a production build (strict CSP).
- `v_attachment_details` has a DB test.

**Decisions**

- **Taken date:** EXIF `DateTimeOriginal`, else `CreateDate`, read as raw strings (exifr `reviveValues: false`) and interpreted as Pacific wall time unless the file records an offset; then the file's `lastModified`, then now. DST is handled (`wallTimeToUtc`, unit-tested). The edit form takes Pacific local time.
- **Gallery order:** oldest first by default, matching flow 10 ("swipe oldest to newest"), with a Newest first option. The carousel follows the grid's order.
- **Resumable uploads** (`tus-js-client`) authenticate with the signed-in user's access token, because Supabase's TUS endpoint takes a bearer token, not the signed-upload token. Storage RLS still limits writes to the user's own path prefix. Photos and thumbnails use signed upload URLs as planned.
- **Paths are recomputed server-side** at finalize from the server-generated id and the filename, and the object must exist before the row is written. The client never supplies a path.
- **Compression runs on the main thread** (`useWebWorker: false`): the library's worker loads a script from a CDN, which the CSP blocks. Fine for one photo at a time; revisit if batch uploads feel slow.
- **No `capture` attribute** on file inputs: on iOS it forces the camera and hides the photo library. Without it the picker offers camera, library, and files.
- **HEIC** that arrives undecoded is stored as-is with a generic tile (no thumbnail); the carousel can't show it.
- **Upload cap** comes from `NEXT_PUBLIC_MAX_UPLOAD_MB` (default 500, local bucket 1 GiB). Set it to the production bucket limit at deploy (human setup step 6).
- **After Mark done** the follow-up step always appears, with optional "Mark installed" (if any parts are Received) and "Add after photos" (tagged After), closed with Done.
- **The carousel's slides are memoized.** The lightbox resets to its starting index whenever `slides` changes identity, which had made Next and swipe snap back to the first slide.
- **The e2e console guard** now also fails tests on React duplicate-key errors (it caught one on the Gallery page).
- **Not in M4:** media on watch items, check-ins, tasks, and inspiration comes with M5 and M6. The attachments panel and parent plumbing already support them.

## M5 — Watch list and tasks (2026-10-11)

**Shipped:** watch items (create and edit with relative or absolute follow-ups; optional first check-in with clip; delete), check-ins with odometer and media, promote to a job, resolve, dismiss, reopen, and suspected parts; the Watch list (overdue first) and watch item page; tasks with multi-record links and the "blocks this job" toggle; the Tasks screen; the task checklist on job detail; "Add task" on job, part, phase, and watch item; quick-add menu (Photo / Watch item / Task); the "From watch item" link on promoted jobs; open blocking tasks in the phase "Missing" line (flow 5 now complete).

**Acceptance:** all three criteria pass.

- Rules 15–18 and 20 are pure functions in `lib/domain/watch.ts` and `lib/domain/tasks.ts` with unit tests.
- `v_watch_due`, the check-in odometer trigger, `promote_watch_item`, and the task-link RPCs have DB tests; the due view is compared to `watchDue()` across every boundary case.
- A task with `blocks_job` stops its job from reaching Ready until it's completed (e2e and DB).
- Flows 7, 8, and 9 pass at both viewports, on dev and on a production build.

**Decisions**

- **Quick-add is now a menu** (Photo / Watch item / Task) because flows 7 and 9 also start from quick-add. Photo opens the picker straight away, so flow 1 is still two taps after choosing the file.
- **Overdue** = more than 7 days past the follow-up date or more than 500 miles past the follow-up reading (spec decision). "Today" is Pacific, in the view and in the domain function.
- **Relative follow-ups** ("in 3 months", "in 3,000 miles") are converted on save; an exact date or reading wins if both are filled in. Months clamp to the end of shorter months.
- **The first check-in on create** uses today and the current odometer, and is created only when there's an observation; a clip needs one.
- **Rule 14 extends to check-ins** with the same trigger pattern as done jobs.
- **Promote** only allows Diagnosis (default) or Repair, enforced in the RPC too. It defaults the job title to the watch item's title, carries over suspected parts that have no job, and doesn't set `closed_on` (rule 18 is for resolve and dismiss). The app then opens the new job.
- **Reopen** undoes resolve or dismiss (not in the spec, but cheap insurance against a mis-tap).
- **Task links** are written by `create_task_with_links` / `set_task_links` (replace-all, one transaction). Dropped tasks keep `completed_on` null.
- **Task checkboxes are optimistic** (`useOptimistic`): they tick immediately and the refresh confirms.
- **`ClientTrigger`** wraps every dialog trigger. Triggers created in Server Components could reach Radix's Slot as unresolved lazy references while their chunk loaded under load, crashing with "failed to slot onto its children". The wrapper always hands Radix a valid element and resolves the child itself. 122 of 122 repeated e2e runs passed afterwards.
- **The e2e fixture now fails on any uncaught browser error**, in addition to hydration and duplicate-key errors.
- **The quick-add Task dialog** loads its link pickers whenever it's open. In controlled mode its open handler never fired, and the picker stayed on "Loading…".
- **Deferred to M9:** phase headers now have seven actions (Add job, Add task, Photos, Files, Add expense, Edit, Delete). Fold the secondary ones into a menu during M9's polish pass.
- **The demo seed adds** 3 watch items (overdue, due, later), a check-in, a suspected part, and 3 tasks (one blocking the lift install).

## M6 — Inspiration (2026-10-11)

**Shipped:** Inspiration board with cards (cover image, source host, tags, notes, links to promoted part and job), tag filter chips, image upload on create and via the card's images dialog, edit and delete (removes stored images), promote to part (Wishlist) or job (Not started, choosing phase and type), "From idea" links on the resulting part and job pages.

**Acceptance:** rule 19 has unit tests (`tests/unit/inspiration.test.ts`) and DB tests for the promote RPCs; flow 4 passes in e2e at both viewports (`tests/e2e/inspiration.spec.ts`), including the overwrite confirmation and the tag filter.

**Decisions**

- **Promote runs in one transaction** (`promote_inspiration_to_part` / `_to_job`). The field mapping is in `lib/domain/inspiration.ts`: part = title, product link, notes; job = title, description from notes, source link in the job's links. The RPC refuses to replace an existing link unless `p_overwrite` is set; the UI shows "Replace the linked part/job?" with "Keep the current link" or "Create new …". The old part or job is never deleted.
- **A promoted job defaults to Modification**, changeable in the dialog. The spec only fixes the status (Not started).
- **Tags** are stored lowercased and de-duplicated, from a comma-separated input. Card tags link to the filtered board.
- **Covers** come from one batch query and one URL-signing call for the whole board (no per-card queries).
- **Inspiration images stay out of the Gallery** (M4 query); the e2e for flow 4 re-checks it.
- **The demo seed adds** 3 ideas, one already promoted to the lift spacers part.
