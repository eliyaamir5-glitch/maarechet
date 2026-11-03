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
- `assistant.js` – 🤖 "מערכתי" assistant on every student page: local "fast brain" (intents in Hebrew, answers from timetable/Mashov on the phone, actions that "click" across pages) + "smart brain" `/api/assist` in staff.mjs (Gemini free tier, key in Netlify env `GEMINI_API_KEY`, optional `GEMINI_MODEL`; 20 questions/day per device, 900/day total; only the question text is sent – never name/class/grades). Tests: `scripts/test-assistant.js` (200 sentences), `scripts/test-assist.mjs`, robot `assistant-e2e`.
- `calc-practice.js` (practice per topic, 4 levels), `calc-sci.js` (scientific calculator), `calc-tools.js` (derivative/sequences/binomial).
- `holidays-core.js` (Hebrew-calendar holiday dates via Intl, shared with the server – changes to it trigger a Netlify build via `netlify.toml` ignore) + `holidays.js` (per-holiday theme on every student page, loaded by theme.js; home-page holiday card / countdown; preview `index.html?hol=purim`, `?hol=off`). Greetings: `holidayTick` in staff.mjs + `netlify/functions/holiday-tick.mjs` (erev chag 12:00, never Shabbat/Yom Tov/memorial days); owner card "🎉 חגים" (`holGet`/`holSet`). Test: `scripts/test-holidays.mjs`.
- `robo-core.js` (logic: 80 items, 7 rarities c/r/s/e/m/l/u, boxes box/big/mega with published odds, daily login streak – Shabbat/Yom Tov don't break it – gift ladder, streak saver, subject-streak gifts, shop with bolts 🔩, daily deals) + `robo.js` (UI: `Robo.svg` draws the assistant robot with the outfit, closet/boxes/shop/streak dialog, box-opening animation, daily popup, share image; profile section "🤖 הרובוט שלי"). State only in localStorage `robo`; ultra-legendary (gold 3 / diamond 5 – `ROBO_CAPS` in staff.mjs must match the catalog) claimed via `/api/feed` action `robo` (hashed device only). Locked app themes in theme.js (`lock`), page designs via localStorage `roboPage`. Boxes upgrade on each of 4 taps (`START`/`UP`/`finalOdds` in robo-core; main prize = final tier). Promo codes: `/api/feed` action `robo` op `code` (each device once, per-code `max`), owner card "🎟️ קודים" (`codeList/codeCreate/codeSet`, 32 random seed codes created on first open, QR via vendored `qrcode.js` (MIT) in owner.html), links `?code=`. Owner phone: owner card "👑 הטלפון שלי" → one-time `OWN-…` code (`ownLink`, typed to the assistant or `?own=`) binds the device; `ownPowers` {inf, all} → op `me`. Streak reminder: op `day` stores {d,n} per hashed device; `streakTick` + `netlify/functions/streak-tick.mjs` (20:00, Fri/erev chag 12:00), pref `streak`. Test: `scripts/test-robo-codes.mjs`. Season 2: 155 items incl. categories `trail` (emoji trail while dragging the robot) and `quote` (bubble on tap); 3 ultras (gold 3, diamond 5, phoenix 2). Sounds: `SFX` in robo.js (WebAudio, no files; only boxes/prizes/daily gift/shop; mute `roboMute`). Season 3 (social): 263 items incl. 13 hero items (`hero:1`, only from giant box + 2% mega), `giant` box (1200 bolts), 5 ultras (gold 3, diamond 5, phoenix 2, cosmic 2, crystal 3 – keep `ROBO_CAPS` in sync; test checks). `/api/feed` action `robo` social ops in `roboSocial` (staff.mjs): `pub` (public profile per hashed device; kid name/class from presence), `class` (grade only; battle score), `like` (1/day per robot), `gift` (≤50 bolts/day), `inbox`, `tradeNew/Get/Set/Ok/Cancel/Done` (offer change resets OKs; both OK → lock 3 s, cancel allowed during it; items trusted from phone), `roboBattle` (+1 per daily visit and per like; winner class gets a big box client-side), `roboNews` (ultra wins → announcement to the grade). UI in robo.js: closet tab "👥 חברים", friend card, trade dialog with scales + countdown + swap animation, robot name (`cleanName` filter), `Robo.mini()` next to names on birthdays. Test: `scripts/test-robo-social.mjs`. Practice bonus `Robo.earn(n)` from calc practice (first-try correct) and cards `mark()` – max 60 bolts/day (`EARN_CAP`). Tests: `scripts/test-robo.js`, `scripts/test-robo-server.mjs`. Demo panel has robot buttons.
- `updates.js` – staff updates + emoji reactions + feed cache. `data.js` – timetable (`forProfile` with `only`/`alt`), SCHOOL_YEAR, SERVER_BASE.
- `staff.html` – staff/principal page. `owner.html` – **system-owner dashboard** (students online/today/week with names & profiles, update mode, messages, suspensions, live errors, action log).
- `netlify/functions/staff.mjs` – the whole server on Netlify Blobs (`/api/staff`, `/api/feed`, `/api/owner`, `/api/contacts`, `/api/sets`, `/api/updates`, `/api/feedback`). `mashov.mjs` – Mashov bridge (passwords never stored).
- Other pages: `cards.html` (flashcards), `calc.html` (+`calc-engine.js`), `phones.html`, `shichrur.html` (exit permit; parent signs), `parent.html`, `absences.html`, `about.html` (privacy text must match what's collected), `demo.html` + `demo-shim.js` (fake server for demos).
- Local preview with a fake server and 46 sample students: `npm run dev` → http://localhost:8790 (owner code there: `DEV0-DEV0-DEV0-DEV0`). Listens on localhost only – stop it when done.

## Privacy rules
Presence sends name, class, groups, device type, version, last seen. Never collect grades, absences, passwords, IP/location, who asked an anonymous question, or poll votes. The assistant's AI questions go to Google Gemini without name/class – keep it that way (counts only on the server, no content). Keep `about.html` in sync with any change.
