# Hands-on test checklist

Use this before deploying (locally, phone + Mac) and again after deploying (on the real URL). The automated suite already covers these flows; this pass is about how it feels on your actual phone and data.

## Set up (local)

1. Docker Desktop running, then `npm run db:start`.
2. Your data: the local database holds your real build. It's never reset by updates; new migrations go in with `npm run db:migrate`, which backs up first. Back up any time with `npm run db:backup`.
3. `npm run dev:lan`, and open the printed `http://<your-mac-ip>:3000` on **both** your phone and the Mac (same Wi-Fi). You're signed in automatically.
   - First run: if macOS asks whether to allow incoming connections for `node`, choose **Allow**.
   - Plain `npm run dev` (localhost) still works for Mac-only testing.
4. Phone: in Safari, **Share → Add to Home Screen** to try the installed app.

## Phone (the garage)

- [ ] **Quick add photo (flow 1):** tap **+**, then **Photo**, then **Take Photo**. The most recent job is preselected; tap **Save**. Check the photo shows on that job and in the Gallery under the right month, and the taken time looks right (Pacific).
- [ ] **Quick add from the library**, including a photo from a few months ago (should land in that month).
- [ ] **A video clip** over 6 MB (resumable upload: watch the % progress). Then an **audio memo** (Voice Memos → share → save to Files, then pick it).
- [ ] **Quick add watch item (flow 7):** "in 3 months" + "in 3,000 miles", with a first observation and a clip.
- [ ] **Check in (flow 8)** on a due item: odometer, note, clip; then try each next step (follow-up, promote, resolve).
- [ ] **Quick add task (flow 9)** linked to a part; tick it done from Tasks.
- [ ] **Mark a job done (flow 2)** with date and odometer pre-filled; take an "after" photo from the follow-up step.
- [ ] **Gallery (flow 10):** Highlights only, swipe through, pinch-zoom, star or unstar from the carousel.
- [ ] Bottom nav and **More** sheet reach every screen; nothing hides behind the **+** button.

## Desktop (planning)

- [ ] **Plan a phase (flow 5):** add a phase with a budget, add jobs, set a blocker, and see "Blocked by …" and the Missing line. Drag phases to reorder (mouse and keyboard).
- [ ] **Phase More menu:** Add task, Add expense, Files, Edit, Delete (confirm the job count; jobs stay unphased).
- [ ] **Order a part (flow 3):** Add expense from the part, then see it Ordered and committed on the job and phase; Mark paid. Go over budget, and the overage shows.
- [ ] **Sell a removed part (flow 6):** Record sale; it offers to close the linked task; Vehicle shows Recovered.
- [ ] **Promote inspiration (flow 4)** to a part and to a job; promoting again asks before replacing the link.
- [ ] **Scoped carousel (flow 11):** "View photos" on a job, a phase (includes its jobs), a part, and a watch item.
- [ ] **Dashboard:** numbers match Vehicle → Money; every card's title opens its screen; the odometer update works.
- [ ] **Work Log:** Log work (then add photos), and the type, phase, and text filters.
- [ ] **Exports:** service history with and without costs and receipts, build sheet, Excel (open it), and one CSV.
- [ ] **Keyboard only:** Tab from the top (Skip to content), open a dialog, Escape closes it, and the carousel's arrows and Escape work.

## Edge cases worth a poke

- [ ] Correcting the odometer down by hand works; a done job or check-in with a lower reading doesn't lower it.
- [ ] A job blocked by a task can't go Ready until the task is done.
- [ ] A dependency loop is refused.
- [ ] Delete an expense, a part, a photo (the file disappears from Gallery), a watch item, a task.
- [ ] Sign out, then sign back in with the magic link from the mail catcher (http://127.0.0.1:54324, or `http://<mac-ip>:54324` from the phone).

Note anything odd (what you did, what you expected, what happened) and I'll fix it before we deploy.
