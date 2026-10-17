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

## M7 — Dashboard (2026-10-11)

**Shipped:** the dashboard as specified: money (total invested, build, ownership, tools, recovered, committed), the active phase's budget bar, jobs Ready or Waiting on parts, parts arriving (Ordered), watch items due or overdue, open tasks due within 7 days, quick odometer update, and the latest highlight photo (opens the carousel). Every card's heading links to its screen.

**Acceptance**

- ✅ With the seed data, each card shows the expected values, asserted in `tests/e2e/dashboard.spec.ts`. The test loads the same demo build as `npm run db:seed`; expected figures are worked out by hand from the seed in the test comments.
- ⏳ "Under 1 second on a warm Vercel deployment" can't be checked until we deploy. On a local production build (`next start`, local Supabase) warm loads were ~60 ms, with ~33 ms to first byte. Re-check after deploy; listed in `docs/STATUS.md`.

**Decisions**

- **The demo seed is now a function** (`tests/support/demo-data.ts`, `seedDemo(admin, ownerId)`) shared by `npm run db:seed` and the dashboard e2e. Time-sensitive dates (watch follow-ups, task due dates, the check-in) are relative to today, so the expected values don't drift with the calendar.
- **Active phase** = the first phase with status Active in plan order. With none, the card says so and links to the Plan.
- **Budget bar** (`lib/domain/dashboard.ts`, unit-tested): paid and committed segments against the budget. When over budget the bar scales to total spend and a red segment shows the overage. Its accessible name states the percent of budget used.
- **"Tasks due this week"** = open tasks due within the next 7 days, overdue ones included (shown in red); same rule as `dueWithin()`.
- **The parts card links** to `/parts?status=ordered`, and the highlight card to `/gallery?highlights=1`.

## M8 — Exports (2026-10-11)

**Shipped:** the four exports from the plan, generated on demand as authenticated route handlers (RLS applies; 401 without a session), plus an Exports section on the Vehicle page with options and downloads.

**Acceptance:** both criteria pass (`tests/e2e/exports.spec.ts`, against the demo seed).

- Each export downloads and opens: both PDFs are parsed (`unpdf`) and checked for the expected content, ordering, and embedded images; the .xlsx is reopened with `exceljs` (one sheet per table, ids, dollars); the CSV is parsed. The UI downloads all four.
- `costs=0` removes every dollar amount from both PDFs (asserted: no `$` anywhere in the extracted text).

**Decisions**

- **PDFs** use `@react-pdf/renderer` (already a Next server-external package) with built-in Helvetica/Courier: no font files to ship, nothing fetched at render time. Letter size, a vehicle header (name, VIN, odometer, generated date, applied filters), page numbers.
- **Images are downloaded server-side as the signed-in user** (`storage.download`, RLS applies) rather than through signed URLs. Only JPEG/PNG embed; anything else (e.g. HEIC) is skipped. Receipt thumbnails use the 480px thumbnail; the build sheet photo is the job's newest highlight, else its newest After photo.
- **Receipts in the service history** = Receipt attachments on the job or on any expense of the job. Above 200 entries they're omitted automatically and the footer says so (plan rule; unit-tested).
- **Costs in the PDFs** = committed + paid per job (what the work cost or will cost), with phase subtotals on the build sheet and a total. "Hide all dollar amounts" removes every figure, including totals.
- **Spreadsheets** drop `owner_id` (always you), rename money columns `*_cents` → `*_usd` with dollar values and a `0.00` number format, and join arrays with "; ". CSV cells starting with `= + - @` are prefixed with `'` so spreadsheets don't execute them.
- **Download forms are plain GET forms and links**, with no JavaScript needed; the routes answer with `Content-Disposition: attachment`, so the browser stays on the Vehicle page.
- **The demo seed adds** a done modification job ("Rear recovery points", Armor and recovery) with an installed part and a $320 expense so the build sheet has content. Dashboard expectations updated: build cost $345, total invested $13,889.

## M9 — Hardening (2026-10-13)

**Shipped:** installable web app (manifest, icons, iOS home-screen metadata; no service worker); loading skeleton, screen-level error boundary with retry, not-found pages, and a global error page; "Skip to content" link; empty states (including a Plan with no phases); the phase "More" menu (Add task, Add expense, Files, Edit, Delete), with Add job and Photos still visible; color-contrast fixes; axe accessibility tests; `README.md`.

**Acceptance:** all three criteria pass.

- All 11 spec flows pass at phone and desktop (105 e2e tests on dev and on a production build; 210/210 over two repeated production runs).
- Lighthouse accessibility is 100 on dashboard, plan, and gallery (production build, signed in); best practices 96.
- `README.md` covers local setup, deploy, and downloading a full backup via the .xlsx export.

**Decisions and fixes**

- **Error boundaries use `retry`**: Next 16.4 passes `retry`, not `reset` (checked the bundled docs).
- **Icons** are drawn as SVG in `scripts/make-icons.mts` and rendered with Playwright's Chromium (no image tooling dependency). They replace the scaffold's Next.js favicon. The manifest is served without auth (browsers fetch it without cookies); `start_url` is `/dashboard`.
- **Contrast:** gray-on-gray badges (`text-muted-foreground` on `bg-muted`) were just under 4.5:1. Badge text is now `neutral-700`, and Due/Overdue use amber-700/red-700 with white.
- **axe in e2e** (`@axe-core/playwright`, WCAG 2.1 A/AA) scans every screen with demo data and fails on serious or critical violations, so regressions surface in the normal test run. It also covers the carousel and the skip link.
- **Page-ready marker:** screens render inside the new loading (Suspense) boundary, so the root hydration flag can fire before the screen is interactive (it showed up as "141000140000" in an odometer test on the production build). `PageReady` sits in `PageHeader` and the detail pages, and the e2e fixture waits for it on app screens.
- **Radix dialogs stay mounted:** opening a dialog from a menu and unmounting it the moment it closed left Radix focus guards in `<body>`; on phones the next menu then closed itself immediately. The phase menu, quick-add, Mark done, and task edit now keep their dialogs mounted (`open={…}`) with a key per opening for fresh state. Found through a flaky production e2e and confirmed with a focus-event trace.
- **The phase menu doesn't flip** (`avoidCollisions={false}`), so it can't oscillate near the viewport edge.

## Local phone testing before deploy (2026-10-13)

Travis asked to test everything locally, including on his phone, before deploying.

- **`npm run dev:lan`** (`scripts/dev-lan.mts`) finds the Mac's private Wi-Fi IP, sets `NEXT_PUBLIC_SUPABASE_URL=http://<ip>:54321` for that session (127.0.0.1 on a phone is the phone, so uploads and signed image URLs would fail), sets `LAN_HOST` for `allowedDevOrigins`, and binds `next dev` to that IP. Binding to `0.0.0.0` made redirects point at `0.0.0.0`, which a phone can't open.
- **Dev auto sign-in** also accepts a Supabase URL on a private LAN address (10/8, 172.16/12, 192.168/16). It's still dev-only (`NODE_ENV=development`) and unit-tested against public and lookalike hosts.
- **Local Supabase redirect URLs** allow private LAN hosts on :3000, so magic links work from the phone too. This is local `config.toml` only, not production.
- **`npm run db:fresh`** gives an empty database with just the owner user (onboarding), for entering the real car. `db:dev-password` now creates the user if needed.
- **`docs/MANUAL-TEST.md`**: a hands-on checklist for phone and desktop, reused after deploy.
- **Verified** with a scripted phone-sized browser using only the LAN address: auto sign-in, all 10 screens, quick-add upload, Gallery image served from Supabase on the LAN IP, PDF export.
- A file input opens the iPhone camera over plain http on the LAN; only in-page camera APIs (not used) need HTTPS.

## Delete parts from the Parts list (2026-10-14)

Travis asked to delete parts straight from the main list.

- **Each Parts row has a trash button** (`DeletePartButton`, shared with the part page's Delete). Both use the same confirmation, which states the effects: linked expenses stay in the ledger unlinked (money history is kept); the part's photos and files are deleted; links from tasks, watch items, and replaced parts are removed. Deleting from the part page returns to the list.
- **Fix:** deleting a part cascaded its attachment rows but left their files in Storage. `deletePart` now removes the stored files first, as attachment and inspiration deletes already did.
- **Tests:** `tests/e2e/delete-part.spec.ts` covers cancel, confirm, the expense kept with `part_id = null`, Storage emptied, and the task kept without its link.

## Simpler Add part form, receipts on parts (2026-10-14)

Travis asked for a much shorter part form and a way to attach a receipt or invoice.

- **Add part** now asks only for Name, Category, Status, Quantity, OEM part number, Web link (`product_url`), Notes, and an optional **receipt or invoice** (a photo or PDF, saved as a `receipt` attachment on the new part, so it's kept out of the Gallery). If the part saves but the receipt upload fails, the dialog says so instead of failing silently.
- **Removed from Add part:** brand, vendor, fitment notes, superseded numbers, aftermarket part number, job, replaces, order number, return by, warranty notes.
- **The columns stay.** The spec defines them, the demo and existing data use them, and exports include them. **Edit part** keeps them under a collapsed "More details", which opens on its own if one of its fields has an error. The part page lists them only when filled in.
- **Adding a part from a job's page** still links it to that job (as a hidden preset).
- **The part page** has an "Add receipt or invoice" button.
- **Tests:** `tests/e2e/part-form.spec.ts`.

## Cost on Add part; Vendor back (2026-10-14)

- **Optional "Cost" on Add part.** When filled in, `createPart` also inserts a **paid "part" expense dated today**, linked to the part, carrying the part's vendor. Money stays in the ledger (a part's cost is the sum of its expenses), so budgets, rollups, and exports need no changes. The ledger's insert trigger moves a planning-stage part to Ordered, as any expense does. If the expense fails, the part is removed and the error is shown, so a part is never added without the cost the user entered. Edit part has no Cost field: later costs are expenses from the part page. Valid cost amounts are the same as for expense amounts.
- **Vendor is back on Add part** at Travis's request, and always shown on the part page.

## Manual odometer corrections (2026-10-14)

Travis asked that a manual odometer entry be allowed to go below the current reading. Until now it was refused with "The odometer can't go down." Correcting a mistyped reading has to be possible.

- **Manual updates** (Dashboard and Vehicle) accept any whole number of miles. `manualOdometerError` checks only that it's a non-negative integer.
- **Automatic raises are unchanged** (spec: "updated whenever a job logs a higher reading"; check-ins likewise). A done job or check-in with a lower reading still never lowers the odometer.

## Log work from the Work Log (2026-10-14)

Travis asked why he couldn't log work from the Work Log. It only listed Done jobs; logging meant creating a job elsewhere and then marking it done.

- **"Log work" button** on the Work Log. It saves a new job straight as **Done** in one step. Fields: what was done (title), type (default Maintenance), phase (optional), completed on and odometer (pre-filled with today and the current odometer, as in Mark done), performed by (default DIY) plus a shop/garage name or DIY hours, and notes. A follow-up step offers photos (tagged After) and a link to the job.
- **Same rules as Mark done.** `logWorkSchema` reuses the completion fields and `completionErrors` (date and odometer required). A higher reading raises the vehicle odometer through the existing jobs trigger, in the same insert. A new job has no blockers, so no blocker check is needed.
- **Tests:** `tests/e2e/log-work.spec.ts`.

## Tools: bought for the project, cost; no storage location (2026-10-14)

Travis: "in tools we need to track if they were purchased for the project. cost is important, storage location is not." This overrides the spec's Tool fields and the "table by status and location" line.

- **New column `tools.bought_for_project`** (migration `20261014000001_tool_purchase.sql`, default false). It's backfilled to true for tools that already have a positive tool expense. Set it with a checkbox on Add and Edit tool.
- **Optional Cost on Add tool**, as on Add part: a paid **tool** expense dated today, linked to the tool. If the expense fails, the tool is removed. Rule 4 is unchanged: tool spend is its own category in the totals. The Tools table already shows each tool's cost from its expenses. Later costs use the row's Add expense button.
- **Tools page:** a "For project" column replaces Location. A "Bought for this project" filter (`?project=1`) and a summary line ("Bought for this project: N tools, $X") are added. Sorted by status, then name.
- **Storage location** is gone from the form, the Tools table, and the job's Tools panel. The column stays, so older data isn't lost and still appears in the full-data export.
- **Production:** this migration needs `supabase db push`, which runs only with Travis's approval at deploy time.
- **Tests:** `tests/e2e/tools.spec.ts`. The demo seed sets the flag on every row: bulk inserts send the union of keys.

## Part install date (2026-10-16)

Travis: "i need to be able to track when i installed something." The spec has no install date on Part, so this adds one.

- **New column `parts.installed_on`** (migration `20261016000001_part_installed_on.sql`). It's backfilled for installed parts from their done job's `completed_on`; other installed parts stay undated until edited.
- **Form:** an "Installed on" date appears on Add and Edit part when the status is Installed (or a date is already set). Left blank, it's saved as today (`installedOnFor` in `lib/domain/parts.ts`, with unit tests).
- **Automatic dates:**
  - Setting Installed with the part page's status control dates it today, unless it already has a date.
  - Mark done's "Mark installed" offer dates the parts with the **job's completion date**, not the day the offer was accepted.
- **Shown** on the part page (Details) and under the status badge in the Parts list.
- **Production:** this migration needs `supabase db push`, with Travis's approval at deploy.
- **Tests:** `tests/e2e/part-installed-on.spec.ts`.

## Local data is real: no more demo re-seeds (2026-10-16)

Travis is entering his actual build locally. Twice, after the tools and install-date migrations, I re-seeded demo data with `npm run db:seed`, which replaces ALLOWED_EMAIL's vehicle. That deleted whatever he had entered. The dev server log shows his saves to Parts and Tools, but there was no backup, so those entries couldn't be recovered.

- **Demo data cleared** from his account (vehicle and everything under it, including the 3 demo tools, which outlive the vehicle via `on delete set null`), after a backup and a check that every row came from the seed. He starts at onboarding.
- **Guards:** `db:reset`, `db:fresh`, and `db:seed` run `scripts/db-guard.mts` first. It refuses while the owner has any data, and points to `db:migrate`. `WIPE_MY_DATA=1` overrides, after an automatic backup.
- **`npm run db:migrate`** backs up, then runs `supabase migration up --local` (applies only new migrations, keeps data) and regenerates types. This is now the only way schema changes reach his local database.
- **`npm run db:backup` / `db:restore`:**
  - The backup is a data-only `pg_dump` of public plus auth (users and identities, so ids match; sessions and tokens skipped), plus every stored file belonging to an existing user, in `backups/<timestamp>/` (gitignored).
  - Restore runs a fresh `db reset` from the migrations, loads the rows with triggers disabled, and re-uploads the files.
  - Round-trip verified.
- **Test cleanup:** the e2e user fixture now deletes a test user's stored files as well as the user. About 3,750 orphaned test files were purged.
- **`CLAUDE.md`** now says local data is real and lists the commands never to run without Travis's go-ahead.
- **Install date editable in place (2026-10-16):** the part page shows an "Installed on" date input beside the status dropdown for Installed parts (or any part with a date). It saves on change through `setPartInstalledOn`. Setting the status to Installed still dates the part today, and the field re-keys to show that date. Edit part keeps its own Installed on field.

## Part cost required once bought, editable later (2026-10-16)

Travis: "for parts cost entry should be mandatory and i should be able to edit later." He chose: required once bought.

- **Rule** (`partCostError`, `COST_REQUIRED_STATUSES` in `lib/domain/parts.ts`, unit-tested): Cost is required, and must be more than $0, when the status is Ordered, Received, or Installed, or when the part already has a recorded cost. Idea, Researching, and Wishlist parts don't ask for it (a cost is money spent, and the ledger trigger would mark them Ordered), and neither do removed stock parts.
- **Recorded cost = the part's purchase expense.** New column `parts.purchase_expense_id` (migration `20261016000002_part_purchase_expense.sql`, `on delete set null`, backfilled with each part's earliest positive part expense). Add part creates that paid expense, dated today, with the part's vendor. **Edit part** shows Cost pre-filled and changes that expense's amount. If there's no purchase expense yet (an idea that became bought), it records one.
- **Extra costs** such as shipping or a second payment remain separate expenses from the part page. The part's total is still the sum of its expenses.
- **PostgREST:** the second foreign key between `expenses` and `parts` made `part:parts(...)` ambiguous from expenses. `EXPENSE_SELECT` now names `parts!expenses_part_id_fkey`.
- **Applied locally with `npm run db:migrate`** (backed up first). Travis's 4 parts kept their costs, all linked.
