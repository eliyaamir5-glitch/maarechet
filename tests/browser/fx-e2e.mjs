import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לאפקטים: חגיגת רצף (10…90), 100 ענק, כבאית כשרצף נשבר, חלון "חדש במשוב" פעם אחת, וכמה צריך במבחן (🎯)
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const PROF = { first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" };
const AT = "2026-10-29T18:00:00+02:00";
const errs = [];
async function open(url, { behave = [], grades = [], ls = {} } = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
  await p.evaluateOnNewDocument((pr, behave, grades, ls, at) => {
    const R = Date, off = new R(at).getTime() + 3600e3 - R.now();
    class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
    window.Date = D;
    if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1);
    localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999");
    localStorage.setItem("mashovConn", JSON.stringify({ schoolId: 1, schoolName: "בית יהודה", user: "x", year: 2027, at: Date.now() }));
    localStorage.setItem("mashovData", JSON.stringify({ at, behave, grades, groups: [], lessonsCount: [] }));
    localStorage.setItem("tef", JSON.stringify({ d: "2026-10-29", a: "yes" }));
    for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, JSON.stringify(v));
  }, PROF, behave, grades, ls, AT);
  await p.goto("http://localhost:8787/" + url, { waitUntil: "domcontentloaded" }); await sleep(4500);
  return p;
}
const fx = p => p.evaluate(() => { const o = document.getElementById("fx"); return o ? { cls: o.className, t: o.innerText.replace(/\s+/g, " ") } : null; });

// 1. פעם ראשונה: לא חוגגים היסטוריה
let p = await open("index.html");
log(!(await fx(p)) && !(await p.evaluate(() => !!document.querySelector("#evDlg[open]"))), "first run: no effects (old streaks are not celebrated)");
const st = await p.evaluate(() => JSON.parse(localStorage.getItem("fxStreak")));
log(st && st["גמרא"] && st["גמרא"].cur === 30 && st["גמרא"].ms === 30, "first run saves the current streaks", JSON.stringify(st && st["גמרא"]));
await p.browserContext().close();

// 2. הגיע לאבן דרך: אש, עד 2 אנימציות, והשאר ככרטיסים של היום
p = await open("index.html", { ls: { fxStreak: { "גמרא": { cur: 29, ms: 20, brk: "" }, "תפילת שחרית + ארוחת בוקר": { cur: 30, ms: 30, brk: "" }, "תפילת מנחה": { cur: 26, ms: 20, brk: "" }, "ערבית": { cur: 26, ms: 20, brk: "" } } } });
let f = await fx(p);
log(f && /רצף 30 בגמרא/.test(f.t) && /blue/.test(f.cls), "milestone 30 in Gemara → fire celebration (blue fire from 30)", JSON.stringify(f));
const fl = await p.$$eval("#fx .fl", l => l.length);
log(fl >= 30, `flames animation (${fl} flames)`);
await sleep(1400);
log(/30/.test(await p.$eval("#fx .num", e => e.textContent)), "number counts up to 30");
await p.click("#fx .go"); await sleep(600);
f = await fx(p);
log(!f || !/גמרא/.test(f.t), "next overlay is a different subject (or none)");
while (await fx(p)) { await p.click("#fx .go"); await sleep(500); }
const cards = await p.$eval("#fxBox", e => e.hidden ? "" : e.innerText.replace(/\s+/g, " "));
log(/רצף 30 בגמרא/.test(cards), "home card for the rest of the day", cards.slice(0, 160));
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(4500);
log(!(await fx(p)) && /רצף 30 בגמרא/.test(await p.$eval("#fxBox", e => e.innerText)), "reopen the same day: no animation again, card still there");
await p.browserContext().close();

// 3. רצף נשבר: כבאית
const ABS = [{ date: "2026-10-28", subject: "גמרא", type: "חיסור" }];
p = await open("index.html", { behave: ABS, ls: { fxStreak: { "גמרא": { cur: 29, ms: 20, brk: "" } }, evSeen: ["2026-10-28||גמרא|חיסור"] } });
f = await fx(p);
log(f && /truck/.test(f.cls) && await p.$("#fx .rig"), "streak broke → fire truck arrives", JSON.stringify(f));
await sleep(4300);
f = await fx(p);
log(/נכבה/.test(f.t) && /28 שיעורים/.test(f.t) && /בונים מחדש/.test(f.t), "…puts out the fire, then 'we build again'", f.t.slice(0, 160));
log(await p.$eval("#fx .flame", e => e.classList.contains("out")), "the flame is out");
await p.click("#fx .go"); await sleep(400);
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(4500);
log(!(await fx(p)), "only once");
await p.browserContext().close();

// 4. 100 = ענק
p = await open("index.html");
await p.evaluate(() => { celebrate("גמרא", 100); }); await sleep(800);
f = await fx(p);
log(f && /mega/.test(f.cls) && /מטורף/.test(f.t) && (await p.$$eval("#fx .fl", l => l.length)) >= 60, "100 → huge 'crazy' celebration", JSON.stringify(f).slice(0, 160));
await p.browserContext().close();

// 5. חיסור / צל"ש חדש: חלון פעם אחת
const EV = [{ date: "2026-10-28", subject: "אנגלית", type: "צל\"ש" }, { date: "2026-10-27", subject: "היסטוריה", type: "איחור" }];
p = await open("index.html", { behave: EV, ls: { evSeen: [] } });
while (await fx(p)) { await p.click("#fx .go"); await sleep(400); }
await sleep(500);
const ev = await p.evaluate(() => { const d = document.querySelector("#evDlg[open]"); return d ? d.innerText.replace(/\s+/g, " ") : ""; });
log(/צל"ש באנגלית/.test(ev) && /איחור בהיסטוריה/.test(ev), "new praise + late → shown once in a small window", ev.slice(0, 160));
await p.click('#evDlg button[value="ok"]'); await p.reload({ waitUntil: "domcontentloaded" }); await sleep(4500);
log(!(await p.evaluate(() => !!document.querySelector("#evDlg[open]"))), "…and not again");
await p.browserContext().close();

// 6. 🎯 כמה צריך במבחן
const G = [{ date: "2026-10-20", subject: "אנגלית", event: "מבחן", grade: 80 }, { date: "2026-10-01", subject: "אנגלית", event: "בוחן", grade: 70 }];
p = await open("absences.html#grades", { grades: G });
log(await p.$('[data-goal="אנגלית"]'), "small 🎯 button next to the average");
await p.click('[data-goal="אנגלית"]'); await sleep(300);
await p.$eval(".gpan input[type=range]", e => { e.value = 85; e.dispatchEvent(new Event("input")); }); await sleep(200);
let r = await p.$eval(".gpan .res", e => e.innerText);
log(/צריך\s*105/.test(r) === false && /גם עם 100/.test(r), "target 85 with 1 test: impossible (needs 105) → says so", r);
await p.click('.gpan [data-k="2"]'); await sleep(200);
r = await p.$eval(".gpan .res", e => e.innerText.replace(/\s+/g, " "));
log(/צריך 95 בממוצע ב-2 המבחנים/.test(r), "target 85 over 2 tests → 95 average", r);
log(/🎯 85/.test(await p.$eval('[data-goal="אנגלית"]', e => e.textContent)), "goal is remembered on the button");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
