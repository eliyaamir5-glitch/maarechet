import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// כל 54 הצירופים (כיתה × אנגלית × מתמטיקה × מגמה): כל יום, כל 5 דקות – אין חפיפות, "עכשיו/הבא" נכונים, אין שגיאות.
// ועוד: שינויים במערכת מהצוות (בוטל / הוזז / מחליף / הערה / כיתה אחרת / הקבצה אחרת / זבל מהשרת), מטמון פגום, והיומן (cal/*.ics) תואם למסך.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require(ROOT + "/data.js");
const BASE = "http://localhost:8787/index.html";
const results = []; const log = (ok, n, x = "") => { results.push(ok); if (!ok || process.env.V) console.log(ok ? "✅" : "❌", n, x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const SUN = new Date("2026-10-25T00:00:00"); // ראשון רגיל (לא חופשה)
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function open(profile, { feed = null, width = 375, t0 = SUN.getTime() + 10 * 3600e3, extra = {} } = {}) {
  // כרום לפעמים מחזיר "Session with given id not found" כשפותחים טאב מיד אחרי סגירה – מנסים שוב
  let p; for (let i = 0; ; i++) { try { p = await browser.newPage(); break; } catch (e) { if (i >= 4) throw e; console.log("   (newPage retry:", e.message.slice(0, 60) + ")"); await sleep(800); } }
  await p.setViewport({ width, height: 800, isMobile: width < 700, hasTouch: width < 700 });
  const errs = [];
  p.on("pageerror", e => errs.push("[pageerror] " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/favicon|ERR_|Failed to load/.test(m.text())) errs.push("[console] " + m.text()); });
  await p.evaluateOnNewDocument((profile, t0, extra) => {
    const R = Date; window.__R = R; window.__T = t0; window.__base = R.now();
    class X extends R { constructor(...a) { if (a.length) super(...a); else super(window.__T + (R.now() - window.__base)); } static now() { return window.__T + (R.now() - window.__base); } }
    window.Date = X;
    localStorage.setItem("profile", JSON.stringify(profile)); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("feedOk", "1");
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, profile, t0, extra);
  await p.setRequestInterception(true);
  p.on("request", r => {
    const u = r.url();
    // הקדם-בקשה (CORS) של POST עם JSON – כמו השרת האמיתי
    if (/netlify\.app/.test(u) && r.method() === "OPTIONS") return r.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
    if (/netlify\.app\/api\/feed/.test(u) && r.method() === "GET") return r.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(feed || { ok: true, updates: [], polls: [], events: [], answers: [], birthdays: [], changes: [] }) });
    if (/netlify\.app|web3forms/.test(u)) return r.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: '{"ok":true,"updates":[]}' });
    r.continue();
  });
  await p.goto(BASE, { waitUntil: "networkidle2" }); await sleep(600);
  return { p, errs };
}
// בודק את המסך בכל 5 דקות, לכל יום א'–ה'
async function sweep(p) {
  return p.evaluate(async (sun) => {
    const out = [], toMin = t => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
    for (let day = 0; day < 5; day++) for (let m = 6 * 60; m < 22 * 60; m += 5) {
      window.__base = window.__R.now(); window.__T = new window.__R(2026, 9, 25 + day, 0, m).getTime();
      sel = day; render();
      const rows = [...document.querySelectorAll("#content .row")].map(r => ({ s: r.querySelector(".t b").textContent, e: r.querySelector(".t").childNodes[1].textContent, n: r.querySelector(".n").textContent, now: r.classList.contains("now"), next: r.classList.contains("next"), cancel: r.classList.contains("cancel") }));
      const where = `day ${day} ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (!rows.length) { out.push(where + " no rows"); continue; }
      for (let i = 1; i < rows.length; i++) if (toMin(rows[i].s) < toMin(rows[i - 1].e) && !rows[i].cancel && !rows[i - 1].cancel) out.push(`${where} overlap ${rows[i - 1].n} ${rows[i - 1].e} / ${rows[i].n} ${rows[i].s}`);
      rows.forEach(r => { if (toMin(r.e) <= toMin(r.s)) out.push(`${where} bad range ${r.n}`); });
      const nows = rows.filter(r => r.now), cur = rows.filter(r => !r.cancel && toMin(r.s) <= m && m < toMin(r.e));
      if (nows.length > 1) out.push(where + " two 'now' rows");
      if (cur.length && !nows.length) out.push(where + " lesson running but no 'now' row: " + cur[0].n);
      if (nows.length && !cur.includes(nows[0])) out.push(where + " wrong 'now' row " + nows[0].n);
      const hero = document.querySelector("#hero .hero");
      const lbl = hero && hero.querySelector(".lbl").textContent;
      if (cur.length && lbl !== "עכשיו") out.push(where + " hero not 'now': " + lbl);
      const nx = rows.find(r => !r.cancel && toMin(r.s) > m);
      if (!cur.length && nx && !/הפסקה|עוד לא התחלנו/.test(lbl)) out.push(where + " hero should be break/before: " + lbl);
      if (!cur.length && !nx && !/סיימנו/.test(hero.textContent)) out.push(where + " hero should be done: " + lbl);
      if (nx && !rows.find(r => r.next)) out.push(where + " no 'next' row");
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(where + " horizontal overflow");
    }
    return out;
  }, SUN.getTime());
}

// ===== 1. כל 54 הצירופים =====
let combos = 0;
for (const cls of ["y1", "y2"]) for (const eng of Object.keys(D.ENG)) for (const math of Object.keys(D.MATH)) for (const major of Object.keys(D.MAJORS)) {
  const prof = { first: "בדיקה", last: "צירוף", cls, eng, math, major, since: "2026-09-01" };
  const { p, errs } = await open(prof, { width: [320, 360, 375][combos % 3] });
  const bad = await sweep(p);
  log(!bad.length && !errs.length, `${cls}-${eng}-${math}-${major}: every 5 minutes Sun–Thu`, [...bad.slice(0, 4), ...errs.slice(0, 3)].join(" | "));
  // היומן: כל אירוע שבועי בקובץ = שיעור במסך באותו יום ושעה
  const app = await p.evaluate(() => [0, 1, 2, 3, 4].map(i => lessonsOf(DAYS[i]).map(l => `${l.s}-${l.e} ${l.n}`)));
  const ics = fs.readFileSync(`${ROOT}/cal/${cls}-${eng}-${math}-${major}.ics`, "utf8").replace(/\r\n /g, "");
  const ev = ics.split("BEGIN:VEVENT").slice(1).map(b => ({ s: (b.match(/DTSTART;TZID=Asia\/Jerusalem:\d{8}T(\d\d)(\d\d)/) || []).slice(1).join(":"), e: (b.match(/DTEND;TZID=Asia\/Jerusalem:\d{8}T(\d\d)(\d\d)/) || []).slice(1).join(":"), day: (b.match(/BYDAY=(\w\w)/) || [])[1], n: ((b.match(/SUMMARY:(.*)/) || [])[1] || "").replace(/\\(.)/g, "$1").trim() })).filter(x => x.day && !/^🎒/.test(x.n));
  const BY = ["SU", "MO", "TU", "WE", "TH"]; let calBad = [];
  BY.forEach((bd, i) => { const c = ev.filter(x => x.day === bd).map(x => `${x.s}-${x.e} ${x.n}`).sort(), a = app[i].slice().sort(); if (JSON.stringify(c) !== JSON.stringify(a)) calBad.push(`${bd}: cal ${c.length} vs app ${a.length} ${c.filter(x => !a.includes(x)).concat(a.filter(x => !c.includes(x))).join(",")}`); });
  log(!calBad.length, `${cls}-${eng}-${math}-${major}: calendar file = app`, calBad.join(" | "));
  await p.close(); combos++;
}
console.log(`combos checked: ${combos}`);

// ===== 2. שינויים במערכת =====
const TUE = new Date(2026, 9, 27), TODAY = ymd(TUE), TMRW = ymd(new Date(2026, 9, 28));
const changes = [
  { id: "c1", date: TODAY, cls: "y2", s: "08:55", n: "גמרא", w: "הרב אלישיב יהב יפרח", kind: "cancel", note: "" },                    // בוטל
  { id: "c2", date: TODAY, cls: "y2", s: "10:30", n: "מחשבת ישראל", w: "הרב אלישיב יהב יפרח", kind: "move", to: "12:50-13:25", note: "" }, // הוזז
  { id: "c3", date: TODAY, cls: "y2", s: "13:45", n: "חינוך תעבורתי (זהב)", w: "הרב מסעוד עטר", kind: "sub", sub: "<img src=x onerror=alert(1)>", note: "<b>xss</b>" },
  { id: "c4", date: TODAY, cls: "all", s: "15:30", n: "אנגלית", w: "יהודית מינרבי", kind: "cancel", note: "" },                     // הקבצה אחרת (התלמיד אצל חדד)
  { id: "c5", date: TODAY, cls: "all", s: "15:30", n: "אנגלית", w: "אתי חדד", kind: "note", note: "בחדר 12" },                       // ההקבצה שלו
  { id: "c6", date: TODAY, cls: "y1", s: "14:30", n: "השכלה כללית – חברה", w: "הרב אייל אריאל", kind: "cancel", note: "" },          // כיתה אחרת
  { id: "c8", date: "2026-11-01", cls: "y2", s: "10:30", n: "מבוא למדעים", w: "אהרון אדרי", kind: "cancel", note: "" },
  { id: "c7", date: TMRW, cls: "y2", s: "12:00", n: "היסטוריה", w: "הרב הראל עובדיה", kind: "cancel", note: "" },                    // מחר
  null, 5, "x", { id: "g1" }, { id: "g2", date: TODAY, cls: "y2", s: "11:15", n: "חינוך", kind: "move" }, { id: "g3", date: TODAY, cls: "y2", s: "11:15", n: "חינוך", kind: "move", to: "zz" },
  { id: "g4", date: TODAY, cls: "y2", s: "11:15", n: "חינוך", kind: "weird" }, { id: "g5", date: TODAY, cls: "y2", s: "<b>", n: "חינוך", kind: "cancel" }, { id: "g6", date: TODAY, cls: "y2", s: 1115, n: {}, kind: "sub" },
];
const feed = { ok: true, updates: [{ id: "u1", text: "שלום", author: "<b>מנהל</b>", role: "constructor", audience: "toString", urgent: false, createdAt: Date.now(), expiresAt: Date.now() + 9e12, reacts: {} }], polls: [null, { id: "p1", q: "?", options: "x" }, { id: "p2", q: "שאלה", options: ["א", "ב"], counts: null, total: "<b>3</b>", endsAt: "garbage", audience: "all" }], events: [null, { title: "אירוע", date: TODAY, time: "<i>10:00</i>", audience: "all" }, { title: 5 }], answers: [null, { id: "a1", q: "q", a: "a" }], birthdays: [null, { name: "<b>x</b>", cls: "__proto__", inDays: "<img>" }, { name: "דני", cls: "y1", inDays: 0 }], changes };
{
  const prof = { first: "שינוי", last: "", cls: "y2", eng: "hadad", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" };
  const { p, errs } = await open(prof, { feed, t0: TUE.getTime() + 9 * 3600e3 }); // שלישי 09:00 – באמצע הגמרא שבוטלה
  await sleep(1500);
  const r = await p.evaluate(() => {
    const rows = [...document.querySelectorAll("#content .row")].map(r => ({ t: r.querySelector(".t b").textContent, n: r.querySelector(".n").textContent, who: (r.querySelector(".who") || {}).textContent || "", cls: r.className, txt: r.textContent }));
    return { rows, hero: document.querySelector("#hero").textContent, sum: (document.querySelector(".chg-sum") || {}).textContent || "", xss: !!document.querySelector("#content img, #extras img, #updates img, #extras i:not(.pres i), b b, .who b"), extras: document.querySelector("#extras").textContent, upd: document.querySelector("#updates").textContent, tmrwTab: null };
  });
  const row = n => r.rows.find(x => x.n.startsWith(n));
  log(row("גמרא") && /cancel/.test(row("גמרא").cls) && !/\bnow\b/.test(row("גמרא").cls), "cancelled lesson is struck and is not 'now'", JSON.stringify(row("גמרא")));
  log(!/עכשיו/.test(r.hero.slice(0, 8)) && /עוד לא התחלנו|הפסקה/.test(r.hero), "hero during a cancelled lesson = break / not started", r.hero.slice(0, 60));
  log(/הפסקה/.test(r.hero), "after shacharit, with the next lesson cancelled → break", r.hero.slice(0, 40));
  log(row("מחשבת ישראל") && row("מחשבת ישראל").t === "12:50" && /במקור 10:30/.test(row("מחשבת ישראל").n), "moved lesson shows at the new time with the original time", JSON.stringify(row("מחשבת ישראל")));
  const ti = r.rows.map(x => x.t); log(JSON.stringify(ti) === JSON.stringify(ti.slice().sort()), "rows stay sorted after a move", ti.join(","));
  log(row("חינוך תעבורתי") && /מורה מחליף/.test(row("חינוך תעבורתי").n) && row("חינוך תעבורתי").who.includes("<img") && row("חינוך תעבורתי").txt.includes("<b>xss</b>"), "substitute + note shown as escaped text", JSON.stringify(row("חינוך תעבורתי")));
  log(!r.xss, "no HTML from the server got into the page");
  const eng = r.rows.filter(x => x.n.startsWith("אנגלית"));
  log(eng.length && eng.every(x => !/cancel/.test(x.cls)) && eng.some(x => x.txt.includes("בחדר 12")), "other English group's cancel ignored; my group's note shown", JSON.stringify(eng));
  log(row("השכלה כללית") && !/cancel/.test(row("השכלה כללית").cls), "other class's change ignored");
  { const h = r.rows.find(x => x.n === "חינוך"); log(h && !/cancel/.test(h.cls) && h.t === "11:15", "garbled change objects ignored", JSON.stringify(h)); }
  log(/4 שינויים/.test(r.sum), "change summary counts only my valid changes", r.sum);
  log(!errs.length, "no errors with a garbled feed", errs.join(" | "));
  log(/סקר|שאלה/.test(r.extras) && !/undefined|NaN/.test(r.extras + r.upd), "garbled polls/events/birthdays render without undefined/NaN", (r.extras + r.upd).slice(0, 200));
  // מחר (רביעי): ההיסטוריה שבוטלה לא בציוד של "מחר"; טאב רביעי מראה ביטול
  const w = await p.evaluate(() => { sel = 3; render(); const h = [...document.querySelectorAll("#content .row")].find(r => r.querySelector(".n").textContent.startsWith("היסטוריה")); return { cancel: h && h.classList.contains("cancel"), hero: document.querySelector("#hero").textContent }; });
  log(w.cancel, "tomorrow's tab shows tomorrow's change");
  log(/\b\d+ שיעורים/.test(w.hero), "other-day hero counts lessons", w.hero);
  // אחרי הסוף: ציוד למחר בלי השיעור שבוטל (היסטוריה = "מחברת" גם מלשון... בודקים שאין קריסה)
  const late = await p.evaluate(() => { window.__base = window.__R.now(); window.__T = new Date(2026, 9, 27, 21, 30).getTime(); sel = 2; render(); return document.querySelector("#hero").textContent; });
  log(/סיימנו/.test(late) && /להביא/.test(late), "after the day: done + tomorrow's gear", late.slice(0, 120));
  // השיעור הראשון של היום בוטל → "עוד לא התחלנו" (ולא "הפסקה")
  const st = await p.evaluate(() => { window.__base = window.__R.now(); window.__T = new Date(2026, 10, 1, 9, 0).getTime(); sel = 0; render(); return document.querySelector("#hero").textContent; });
  log(/עוד לא התחלנו/.test(st) && /11:15/.test(st), "first lesson cancelled → 'not started yet', starts at the next one", st.slice(0, 60));
  // חצות: הטאב עובר לבד ליום החדש
  const mid = await p.evaluate(async () => { window.__base = window.__R.now(); window.__T = new Date(2026, 9, 27, 23, 59, 50).getTime(); sel = 2; tick(); window.__base = window.__R.now(); window.__T = new Date(2026, 9, 28, 0, 0, 20).getTime(); tick(); return { sel, on: document.querySelector(".tab.on").textContent }; });
  log(mid.sel === 3 && mid.on === "רביעי", "after midnight the selected tab moves to the new day", JSON.stringify(mid));
  await p.close();
}
// ===== 3. מטמון פגום בטלפון =====
{
  const bads = { feedCache: "{bad json", updatesCache: '{"list":[null,5,{"id":"z","text":"t","expiresAt":"9999999999999","role":"__proto__","audience":"constructor"}]}', updatesSeen: '{"a":1}', myReacts: "[1,2]", pollVotes: "null", readQs: '"x"', myQs: "{}", bday: "[]", gear: "5" };
  const { p, errs } = await open({ first: "פגום", last: "", cls: "y1", eng: "bokobza", math: "harel", major: "cs", dorm: "yes", since: "2026-09-01" }, { extra: bads });
  await sleep(1500);
  const ok = await p.evaluate(() => document.querySelectorAll("#content .row").length > 3);
  log(ok && !errs.length, "corrupted localStorage → app still works", errs.join(" | "));
  await p.close();
  for (const prof of ['"hello"', "[1,2]", "5", '{"cls":"__proto__","eng":"constructor","math":"toni","major":"phys","first":"x"}', '{"cls":"y3","first":"x","eng":"hadad","math":"toni","major":"bio"}']) {
    const pg = await browser.newPage(); const e2 = []; pg.on("pageerror", e => e2.push(e.message));
    await pg.evaluateOnNewDocument(v => { localStorage.setItem("profile", v); localStorage.setItem("introSeen", "1"); }, prof);
    await pg.setRequestInterception(true); pg.on("request", r => /netlify|web3forms/.test(r.url()) ? r.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: '{"ok":true,"updates":[]}' }) : r.continue());
    await pg.goto(BASE, { waitUntil: "networkidle2" }); await sleep(700);
    const wiz = await pg.evaluate(() => !document.getElementById("wiz").hidden);
    log(wiz && !e2.length, `corrupted profile ${prof.slice(0, 30)} → wizard, no crash`, e2.join(" | "));
    await pg.close();
  }
}
// ===== 4. הגבה: אימוג'י אחד בלבד =====
{
  const { p } = await open({ first: "א", last: "", cls: "y2", eng: "hadad", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" });
  const r = await p.evaluate(() => { const out = {}; for (const v of ["👍", "😀😀", "1😀", "abc", "👍🏽", "🇮🇱", "👨‍👩‍👦", "1", "1️⃣"]) { Updates.picker("x", ""); const inp = document.querySelector(".upd-prow input"); inp.value = v; let sent = null; const orig = Updates.react; Updates.react = (id, e) => { sent = e; }; document.querySelector(".upd-pgo").click(); Updates.react = orig; out[v] = sent; document.querySelector(".upd-pick")?.remove(); } return out; });
  log(r["👍"] === "👍" && r["👍🏽"] && r["🇮🇱"] && r["👨‍👩‍👦"] && r["1️⃣"], "single emoji (incl. skin tone, flag, family, keycap) accepted", JSON.stringify(r));
  log(!r["😀😀"] && !r["1😀"] && !r["abc"] && !r["1"], "two emojis / digits / letters refused", JSON.stringify(r));
  await p.close();
}
await browser.close();
const f = results.filter(x => !x).length;
console.log(`\n${results.length - f}/${results.length} passed`);
process.exit(f ? 1 : 0);
