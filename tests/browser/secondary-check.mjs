import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// בדיקות לתיקונים בדפים המשניים: שחרורון (מערכת חדשה + שינויים), הורים, ספר טלפונים, דמו, כרטיסיות, תמונה, משוב
import puppeteer from "puppeteer-core";
import zlib from "node:zlib";
const B = "http://localhost:8787/";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64 = s => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const pad = n => String(n).padStart(2, "0"), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nextDow = w => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + ((w - d.getDay() + 7) % 7 || 7)); return iso(d); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function page({ w = 390, profile = null, store = {}, api = {} } = {}) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(p.url().split("/").pop() + ": " + e.message)); p.dialogs = []; p.on("dialog", d => { p.dialogs.push(d.message()); d.accept(); });
  await p.evaluateOnNewDocument((profile, store) => { try { if (!sessionStorage.__init) { sessionStorage.__init = 1; if (profile) localStorage.setItem("profile", JSON.stringify(profile)); for (const k in store) localStorage.setItem(k, store[k]); } } catch (e) {} }, profile, store);
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    for (const k in api) if (u.includes(k)) { const a = api[k]; if (a.delay) await sleep(a.delay); return q.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(a.body) }); }
    if (/netlify\.app|web3forms|mymemory|dictionaryapi|wiktionary/.test(u)) return q.respond({ status: 503, body: "" });
    q.continue();
  });
  return p;
}
const Y1 = { first: "יוסי", last: "כהן", cls: "y1", eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" };

// ---------- 1. שחרורון ----------
{
  const THU = nextDow(4), MON = nextDow(1);
  const feed = { at: Date.now(), changes: [
    { id: "c1", date: MON, cls: "y1", s: "08:55", n: "גמרא", w: "הרב שחר שאלתיאל", kind: "sub", sub: "<img src=x onerror=window.__x=1>מחליף", note: "" },
    { id: "c2", date: MON, cls: "y1", s: "10:30", n: "תנ\"ך", w: "הרב שחר שאלתיאל", kind: "cancel", note: "" },
    { id: "c3", date: MON, cls: "all", s: "15:30", n: "אנגלית", w: "יהודית מינרבי", kind: "cancel", note: "" },
    { id: "c4", date: MON, cls: "all", s: "16:15", n: "מתמטיקה", w: "טוני כהן", kind: "move", to: "16:30-18:00", note: "" }] };
  const p = await page({ profile: Y1, store: { feedCache: JSON.stringify(feed) } });
  await p.goto(B + "shichrur.html", { waitUntil: "networkidle2" }); await sleep(300);
  const at = async (d, t, cls = "y1") => p.evaluate((d, t, cls) => { const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input")); }; s("fCls", cls); s("fDate", d); s("fTime", t); return document.getElementById("lessonInfo").innerText; }, d, t, cls);
  let x = await at(THU, "13:35");
  log(/יציאה למגמת פיזיקה/.test(x) && /יבגני קלנר/.test(x), "Thu 13:35, physics student: exit-to-major lesson, written to the physics teacher", x);
  x = await at(MON, "07:45");
  log(/תפילת שחרית/.test(x) && /למורה: הרב שחר שאלתיאל/.test(x), "prayer has no teacher → permit goes to the class rav (not an empty name)", x);
  x = await at(MON, "09:00");
  log(/מחליף/.test(x) && /מורה מחליף/.test(x), "substitute teacher from the staff change gets the permit", x);
  log(await p.evaluate(() => !document.querySelector("#lessonInfo img") && !window.__x), "substitute name with HTML is shown as text (no XSS)");
  x = await at(MON, "10:40");
  log(!/תנ"ך/.test(x) && /לאורו נלך/.test(x), "cancelled lesson is skipped → next lesson", x);
  x = await at(MON, "15:35");
  log(/לפני/.test(x) && /מתמטיקה/.test(x) && /16:30/.test(x), "English group lesson cancelled (shared change) and math moved to 16:30", x);
  // ספר: התלמיד במגמת כלכלה – במנחה של חמישי נשאר למנחה, אצל המחנך
  await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem("profile")); pr.major = "econ"; localStorage.setItem("profile", JSON.stringify(pr)); });
  await p.reload({ waitUntil: "networkidle2" }); await sleep(200);
  x = await at(THU, "13:35");
  log(/תפילת מנחה/.test(x) && /הרב שחר שאלתיאל/.test(x), "econ student on Thu 13:35: mincha, with the rav", x);
  // קישורים פגומים להורה
  for (const [h, name] of [["#p=%%%garbage", "garbage"], ["#p=" + b64(JSON.stringify({ v: 1, n: "x", d: 20261026, t: "10:00" })), "date as number"], ["#p=" + b64(JSON.stringify({ v: 1, n: "x", d: "2026-13-45", t: "10:00" })), "impossible date"]]) {
    await p.goto(B + "shichrur.html?r=" + Math.random() + h, { waitUntil: "networkidle2" }); await sleep(300);
    log(await p.$eval("#stParent", e => e.hidden) && !(await p.$eval("#stStudent", e => e.hidden)) && /לא תקין/.test(await p.$eval("#stErr", e => e.textContent)), `broken parent link (${name}) → clear message, page works`);
  }
  const q = { v: 1, n: "<img src=x onerror=window.__x=2>דני", c: "י'1", d: MON, t: "10:00", r: "<b>רופא</b>", x: "", l: "גמרא", w: "הרב", ts: 1 };
  await p.goto(B + "shichrur.html?r=2#p=" + b64(JSON.stringify(q)), { waitUntil: "networkidle2" }); await sleep(400);
  log(!(await p.$eval("#stParent", e => e.hidden)) && await p.evaluate(() => !document.querySelector("#reqView img,#reqView b b") && !window.__x) && (await p.$eval("#reqView", e => e.textContent)).includes("<b>רופא</b>"), "parent view: HTML in the request is shown as text");
  log(await p.$eval("#fReason", e => e.maxLength) === 200 && await p.$eval("#fName", e => e.maxLength) === 40, "request fields have length limits");
}

// ---------- 2. עמוד הורים ----------
{
  const today = iso(new Date()), wd = new Date().getDay();
  const pp = b64(JSON.stringify({ c: "y1", f: "יוסי", l: "כהן", e: "minervi", m: "toni", j: "phys" }));
  // יום הלשונית: היום (בשישי/שבת – ראשון הבא)
  const dIso = wd >= 5 ? nextDow(0) : today, dDow = wd >= 5 ? 0 : wd;
  const D = require_data(); const day = D.DAYS_Y1[dDow].lessons.map(l => D.forProfile(l, { eng: "minervi", math: "toni", major: "phys" })).filter(Boolean).filter(l => !/תפילת|ערבית/.test(l.n) && !l.key && l.w);
  const [L1, L2, L3] = day;
  const changes = [{ id: "a", date: dIso, cls: "y1", s: L1.s, n: L1.n, w: L1.w, kind: "cancel", note: "" }, { id: "b", date: dIso, cls: "y1", s: L2.s, n: L2.n, w: L2.w, kind: "sub", sub: "המחליף", note: "<img src=x onerror=window.__x=3>בחדר 12" }, { id: "c", date: dIso, cls: "y2", s: L3.s, n: L3.n, w: L3.w, kind: "cancel", note: "" }];
  const p = await page({ api: { "/api/feed": { body: { ok: true, updates: [], changes } } } });
  await p.goto(B + "parent.html#p=" + pp, { waitUntil: "networkidle2" }); await sleep(800);
  const rows = await p.$$eval(".ls", l => l.map(r => [r.className, r.innerText.replace(/\s+/g, " ")]));
  const r1 = rows.find(r => r[1].includes(L1.n) && r[1].includes(L1.s)), r2 = rows.find(r => r[1].includes(L2.s) && r[1].includes(L2.n));
  log(r1 && /cx/.test(r1[0]) && r1[1].includes("בוטל"), "parent view: cancelled lesson marked ❌ בוטל", JSON.stringify(r1));
  log(r2 && r2[1].includes("מורה מחליף") && r2[1].includes("המחליף") && r2[1].includes("בחדר 12"), "parent view: substitute + note shown", JSON.stringify(r2));
  log(!rows.some(r => r[1].includes(L3.n) && r[1].includes(L3.s) && r[1].includes("בוטל")) || L3.n === L1.n, "a change for the other class is not shown");
  log(await p.evaluate(() => !document.querySelector("#body img") && !window.__x), "change note with HTML shown as text");
  const bad = b64(JSON.stringify({ c: "y1", f: "<b>x</b>", e: "__proto__", m: "constructor", j: "toString" }));
  await p.goto(B + "parent.html?x=1#p=" + bad, { waitUntil: "networkidle2" }); await sleep(400);
  log((await p.$eval("#title", e => e.textContent)).includes("<b>x</b>") && !(await p.$eval("#body", e => e.innerText)).includes("undefined"), "tampered parent link (prototype keys) → no crash, no 'undefined'");
}

// ---------- 3. ספר טלפונים ----------
{
  const D = require_data(); const names = new Set();
  const cl = t => String(t || "").replace(/\s*\(.*\)\s*$/, "").trim();
  for (const days of [D.DAYS_Y1, D.DAYS_Y2]) for (const d of days) for (const l of d.lessons || []) if (!l.key && l.w) names.add(cl(l.w));
  Object.values(D.ENG).forEach(v => names.add(cl(v))); Object.values(D.MATH).forEach(v => names.add(cl(v)));
  let i = 0; const contacts = [...names].map(n => ({ name: n, phone: `05${i % 9}-${100 + i}-${1000 + i++}`, note: "", extra: false }));
  contacts.push({ name: "<img src=x onerror=window.__x=4>", phone: "050-111-2222", note: "<script>window.__x=5</script>", extra: true });
  contacts.push({ name: "רחל אנג'ר", phone: "050-333-4444", note: "", extra: true });
  contacts.push({ name: "פרופסור אלכסנדרהאריךבשמושלאנגמרלעולםבכללבכלל ונגמרמתישהו", phone: "08-999-8888", note: "הערה ארוכה מאוד מאוד מאוד מאוד מאוד", extra: true });
  contacts.push({ name: "מישהו עם קישור", phone: "javascript:alert(1)", note: "", extra: true });
  contacts.push({ name: "פרמטרים", phone: "050-123-4567?text=hack&x=1", note: "", extra: true });
  contacts.push({ name: 12345, phone: 501234567, note: null, extra: true }, null, "junk");
  const p = await page({ w: 320, profile: Y1, api: { "/api/contacts": { body: { ok: true, contacts }, delay: 1200 } } });
  await p.goto(B + "phones.html", { waitUntil: "domcontentloaded" }); await sleep(400);
  log(await p.$eval("#wip", e => e.hidden), "while the numbers are still loading, no 🚧 banner flash");
  await sleep(1600);
  log(await p.$eval("#wip", e => e.hidden), "with contacts: 🚧 banner hidden");
  log(await p.evaluate(() => !document.querySelector("#list img,#list script") && !window.__x), "names/notes with HTML are escaped (no XSS)");
  const hrefs = await p.$$eval(".acts a", l => l.map(a => a.getAttribute("href")));
  log(hrefs.length > 20 && hrefs.every(h => /^tel:\+?\d{3,15}$|^sms:\+?\d{3,15}$|^https:\/\/wa\.me\/972\d{8,9}\?text=[%\w.-]*$/.test(h)), "every tel:/sms:/wa.me link is digits only (no javascript:, no injected params)", JSON.stringify(hrefs.filter(h => !/^tel:\+?\d{3,15}$|^sms:\+?\d{3,15}$|^https:\/\/wa\.me\/972\d{8,9}\?text=[%\w.-]*$/.test(h))));
  log(await p.$eval('.ct[data-n="מישהו עם קישור"]', e => !e.querySelector(".acts")), "a stored 'javascript:' number gets no call buttons");
  log(await p.evaluate(() => document.documentElement.scrollWidth <= 320), "320px: no horizontal overflow with very long names");
  const lw = await p.$eval('.ct[data-n^="פרופסור"] .info', e => e.getBoundingClientRect().width);
  log(lw > 150, "320px: the name column keeps a usable width (call buttons wrap below)", lw);
  await p.type("#q", "אנגר"); await sleep(250);
  log((await p.$eval("#sug mark", e => e.textContent).catch(() => "")) === "אנג'ר", "highlight matches the right letters in a name with a geresh", await p.$eval("#sug mark", e => e.textContent).catch(() => ""));
  await p.$eval("#q", e => e.value = ""); await p.type("#q", "((([*+?"); await sleep(200);
  log(await p.$eval("#list", e => e.innerText.includes("לא נמצא")), "regex-ish search text doesn't break the search");
  await p.click("#qx"); await p.click("#editBtn"); await sleep(200);
  log(await p.$eval("#eCode", e => e.type) === "password" && !(await p.$eval("#eRem", e => e.checked)), "edit code is hidden while typing, 'remember' off by default");
  log(!/code/i.test(p.url()), "no code in the URL");
  await p.screenshot({ path: "phones-320.png", fullPage: false });
  // בלי אף מספר → 🚧
  const p2 = await page({ api: { "/api/contacts": { body: { ok: true, contacts: [] } } } });
  await p2.goto(B + "phones.html", { waitUntil: "networkidle2" }); await sleep(300);
  log(!(await p2.$eval("#wip", e => e.hidden)), "with 0 contacts: 🚧 banner shown");
}

// ---------- 4. כרטיסיות: קישור "פצצה" ----------
{
  const bomb = zlib.gzipSync(Buffer.alloc(200e6, 32), { level: 9 });
  const p = await page();
  const t0 = Date.now();
  await p.goto(B + "cards.html#s=z" + b64(bomb), { waitUntil: "networkidle2", timeout: 60000 }); await sleep(800);
  log(Date.now() - t0 < 15000 && p.dialogs.some(m => m.includes("לא הצלחנו")) && !(await p.$eval("#vHome", e => e.hidden)), "gzip-bomb share link → refused quickly, home screen", Date.now() - t0);
}

// ---------- 5. תמונה ומשוב ----------
{
  const p = await page({ profile: Y1, store: { introSeen: "1" } });
  await p.goto(B + "index.html", { waitUntil: "networkidle2" }); await sleep(500);
  const h = await p.evaluate(async () => { const c = document.createElement("canvas"); await TimetableImage.draw(c, { weekLessons: [[], [], [], [], []], gearOf: () => [], title: "x", subtitle: "y" }); return c.height; });
  log(Number.isFinite(h) && h > 0, "timetable image with an empty week doesn't crash", h);
  const m = await p.evaluate(() => { const d = document.createElement("div"); d.innerHTML = Mashov.formHTML(); return [d.querySelector("#msRem").checked, d.innerText]; });
  log(m[0] === false && m[1].includes("רק בטלפון אישי שאף אחד אחר לא משתמש בו"), "Mashov 'remember password' is off by default, with a clear warning");
}

// ---------- 6. דמו: שינוי במערכת מהצוות מגיע לתלמיד ----------
{
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 900 });
  p.on("pageerror", e => errs.push("demo: " + e.message)); p.on("dialog", d => d.accept());
  await p.goto(B + "demo.html", { waitUntil: "networkidle2" }); await sleep(1500);
  const out = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), f = () => document.getElementById("frame").contentDocument, r = {};
    [...document.querySelectorAll("#day button")].find(b => b.textContent === "שני").click(); await sleep(1500);
    document.getElementById("goStaff").click(); await sleep(2000);
    if (f().getElementById("lCode")) { f().getElementById("lCode").value = "demo"; f().getElementById("lGo").click(); await sleep(1200); }
    f().querySelector('#tabs [data-t="chg"]').click(); await sleep(800);
    [...f().querySelectorAll("#cC button")].find(b => b.dataset.v === "y2").click(); await sleep(100);
    const sel = f().getElementById("cL"), opt = [...sel.options].find(o => o.textContent.startsWith("10:30"));
    r.opt = opt && opt.textContent; sel.value = opt.value; sel.dispatchEvent(new Event("change"));
    f().getElementById("cGo").click(); await sleep(900);
    r.msg = f().getElementById("cMsg").textContent; r.list = f().getElementById("cList").innerText;
    [...document.querySelectorAll("#nav button")].find(b => b.dataset.p === "index.html").click(); await sleep(3000);
    f().querySelectorAll(".upd-ok").forEach(b => b.click()); await sleep(1200);
    r.student = [...f().querySelectorAll(".chg")].map(x => x.closest("[class]").parentElement.innerText.replace(/\s+/g, " ").slice(0, 80));
    // מחיקה
    document.getElementById("goStaff").click(); await sleep(2000);
    f().querySelector('#tabs [data-t="chg"]').click(); await sleep(800);
    f().querySelector("[data-cdel]").click(); await sleep(900);
    r.after = f().getElementById("cList").innerText;
    return r;
  });
  log(/פורסם/.test(out.msg) && /בוטל/.test(out.list), "demo staff: publishing a timetable change works", JSON.stringify(out));
  log(out.student.some(s => s.includes("בוטל")), "demo student sees the cancelled lesson", JSON.stringify(out.student));
  log(/אין שינויים/.test(out.after), "demo staff: deleting the change works", out.after);
}

await browser.close();
log(!errs.length, "no page errors", errs.join(" | "));
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);

function require_data() {
  const src = (globalThis.__dataSrc ||= (await_read()));
  const m = { exports: {} }; new Function("module", src)(m); return m.exports;
}
function await_read() { return process.getBuiltinModule("node:fs").readFileSync(ROOT + "/data.js", "utf8"); }
