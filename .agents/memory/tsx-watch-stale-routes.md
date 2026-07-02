---
name: tsx watch stale routes after edits
description: Newly added Express routes in this project sometimes don't take effect until the dev workflow is manually restarted, even though tsx watch is supposed to auto-reload.
---

Symptom: a brand-new `app.get`/`app.post` route added to `server/routes.ts` returns the Vite SPA's `index.html` (status 200, `Content-Type: text/html`) instead of the expected JSON, even though the route code looks correct and other nearby routes work fine. This happens because the request falls through Express's router (no match) all the way to Vite's `app.use("*", ...)` catch-all in `server/vite.ts`.

**Why:** the `tsx watch` process behind the `Start application` workflow does not always pick up newly added route registrations reliably in this project, leaving a stale version of `server/routes.ts` running in memory.

**How to apply:** if a newly added API route mysteriously returns HTML instead of JSON, don't assume a code/logic bug (e.g. middleware order, auth guard) first — restart the workflow and retest. Only dig into route-ordering/middleware logic if the issue persists after a clean restart.
