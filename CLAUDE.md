# CLAUDE.md – "המערכת" (maarechet)

Hebrew RTL school-timetable PWA for ישיבת בני עקיבא בית יהודה (classes י'1 / י'2). Owner: **אליה עמיר**, a 10th-grade student (not a programmer).
He works from several computers and from the cloud – this file is the shared memory. Read it fully before doing anything.

## How to work with the owner
- **Always reply in Hebrew**, simply and clearly (he is not technical).
- **Explain before acting.** Before starting anything new or changing anything outside the code (accounts, settings, deploys of big features), say in plain words what you'll do and wait for a yes. He was upset when things were started without explanation.
- For a new feature with open choices: ask 2–4 short questions (with a recommended option), then build.
- After work: a short Hebrew summary – what changed, what he needs to do, and what was NOT done.
- Mark estimates as estimates (prices, numbers you didn't verify).
- He decided **not** to integrate with the dorm app (pnimiya), **not** to pay for Azure, and **not** to build real student accounts (email/SMS). Don't re-propose unless he raises it.

## Start of every session
1. `git fetch && git pull --ff-only` (he also edits from another computer).
2. Skim `README.md` and `git log -10 --oneline`.

## Before EVERY push (his rule)
```
npm test                 # server + Mashov + absences unit tests – must be 0 ❌
node gen-cal.js --check  # calendar files in sync with data.js
node scripts/test-calc.js
npm run test:browser     # 25 browser robots – ONLY when he asks (his rule since 29.10; they take ~20 min)
```
Run only the robots directly related to the change (e.g. `node tests/browser/run-all.mjs dorm-e2e e2e`), and say in the summary that the full set was not run.
If Chrome isn't available (e.g. cloud), say so explicitly in the summary – don't claim the robots passed.

## Deploy
- `git push origin main` → **GitHub Pages** (the app students use: https://eliyaamir5-glitch.github.io/maarechet/) via `.github/workflows/deploy.yml`.
- **Netlify** (`lucent-crepe-6db22c`, Personal plan, 1000 credits/month, cycle on the 24th) runs only the server functions. `netlify.toml` `ignore` rebuilds only when `netlify/functions/` or `package.json` change (~15 credits per build). If a deploy doesn't show up, ask him to press "Trigger deploy" in the Netlify dashboard.
- New files the site needs → add to `FILES` in `scripts/build.js` and to `PRECACHE` in `sw.js`. Bump `CACHE` in `sw.js` on every release.
- `node scripts/build.js` regenerates `cal/` – afterwards run `git checkout -- cal/` unless data.js changed.
- What's-new popup: `APP_VERSION` + `WHATS_NEW` in `data.js`.

## Pending: clean staff/admin entry for the principal
Since 29.10.2026 the owner (אליה) uses the staff admin login (staff.html) himself, for testing, until the real principal joins.
When he asks to "reset" / give the principal a clean entry: remove only what he created there (admin account, users, his test updates/sets/polls/events/changes)
and issue a new invite (scripts/make-invite.mjs → new INVITE_HASH; the old link stops working). Do NOT wipe push subscriptions, presence,
birthdays or the owner dashboard data. Explain the plan and get a yes first.

## Secrets – never in git, never in chat
Gitignored local files (exist only on his main computer): `קוד-מנהל-מערכת.txt` (owner page code), `קוד-ספר-טלפונים.txt`, `קישור-למנהל.txt`, `סיכום-להצגה.txt`. Don't open, print or commit them unless he explicitly asks.
In source only hashes: `OWNER` (salt+scrypt) and legacy `PHONE_HASH`/`INVITE_HASH` in `netlify/functions/staff.mjs`. New owner code: `node scripts/make-owner-code.mjs` (writes the txt locally + prints salt/hash to paste into `OWNER`).

## Map
- `index.html` – the student app (wizard, now/next, lessons + lesson changes, updates, reactions, birthdays, folded "שאלה לצוות", owner messages, update-mode bar, suspension wall). `theme.js` (in every page head): colours, big text, **no-zoom**, **client error reporter**.
- `updates.js` – staff updates + emoji reactions + feed cache. `data.js` – timetable (`forProfile` with `only`/`alt`), SCHOOL_YEAR, SERVER_BASE.
- `staff.html` – staff/principal page. `owner.html` – **system-owner dashboard** (students online/today/week with names & profiles, update mode, messages, suspensions, live errors, action log).
- `netlify/functions/staff.mjs` – the whole server on Netlify Blobs (`/api/staff`, `/api/feed`, `/api/owner`, `/api/contacts`, `/api/sets`, `/api/updates`, `/api/feedback`). `mashov.mjs` – Mashov bridge (passwords never stored).
- Other pages: `cards.html` (flashcards), `calc.html` (+`calc-engine.js`), `phones.html`, `shichrur.html` (exit permit; parent signs), `parent.html`, `absences.html`, `about.html` (privacy text must match what's collected), `demo.html` + `demo-shim.js` (fake server for demos).
- Local preview with a fake server and 46 sample students: `npm run dev` → http://localhost:8790 (owner code there: `DEV0-DEV0-DEV0-DEV0`). Listens on localhost only – stop it when done.

## Privacy rules
Presence sends name, class, groups, device type, version, last seen. Never collect grades, absences, passwords, IP/location, who asked an anonymous question, or poll votes. Keep `about.html` in sync with any change.
