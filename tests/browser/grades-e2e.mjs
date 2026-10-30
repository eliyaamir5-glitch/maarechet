import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לציונים: לשונית "ציונים" בדף הנוכחות, ממוצעים לפי מקצוע, ציון חדש במסך הראשי, כיבוי ההודעה, מצב דוגמה
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const PROF = { first: "דני", last: "לוי", cls: "ya1", dorm: "yes", nitz: "no", eng: "anijar", math: "adir", major: "cs", since: "2026-09-01" };
const G = [
  { date: "2026-10-20", subject: "אנגלית", event: "מבחן", type: "", grade: 90, teacher: "רחלי אניג'ר" },
  { date: "2026-10-01", subject: "אנגלית", event: "בוחן", type: "", grade: 80, teacher: "רחלי אניג'ר" },
  { date: "2026-10-15", subject: "היסטוריה", event: "עבודה", type: "", grade: "55", teacher: "נוף מויאל" },
  { date: "2026-10-10", subject: "לשון", event: "מבחן", type: "", grade: "עבר", teacher: "פרץ דמרי" },
];
const errs = [];
async function open(url, { grades = G, seen, notice } = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
  await p.evaluateOnNewDocument((pr, grades, seen, notice) => {
    if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1);
    localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999");
    localStorage.setItem("mashovConn", JSON.stringify({ schoolId: 1, schoolName: "בית יהודה", user: "x", year: 2027, at: Date.now() }));
    localStorage.setItem("mashovData", JSON.stringify({ at: new Date().toISOString(), behave: [], grades, groups: [], lessonsCount: [] }));
    if (seen) localStorage.setItem("gradesSeen", JSON.stringify(seen));
    if (notice !== undefined) localStorage.setItem("gradeNotice", JSON.stringify(notice));
  }, PROF, grades, seen, notice);
  await p.goto("http://localhost:8787/" + url, { waitUntil: "domcontentloaded" }); await sleep(2500);
  return p;
}
const txt = (p, s = "#main") => p.$eval(s, e => e.innerText.replace(/\s+/g, " "));
const key = g => [g.date, g.subject, g.event, g.grade].join("|");

// 1. דף הציונים
let p = await open("absences.html#grades");
const connected = await p.evaluate(() => Mashov.connected() && (Mashov.data()?.grades || []).length);
log(connected === 4, "fake Mashov data is loaded", String(connected));
let t = await txt(p);
log(/הציונים שלי/.test(await txt(p, ".top")) && /ממוצע כללי/.test(t), "grades tab with summary", t.slice(0, 160));
log(/אנגלית/.test(t) && /היסטוריה/.test(t) && /לשון/.test(t), "subjects listed");
const avgEng = await p.$$eval(".gsub", l => { const e = l.find(x => /אנגלית/.test(x.innerText)); return e && e.querySelector(".gav").textContent; });
log(avgEng === "85", "English average = (90+80)/2 = 85", avgEng);
log(/↗️ עלייה/.test(t), "trend shown (80 → 90)");
log(/זה לא הציון בתעודה/.test(t), "explains it's a simple average");
log(/עבר/.test(await p.$$eval(".gsub", l => l.map(x => x.textContent).join(" "))), "non-number grade shown as-is");
await p.click('#vseg button[data-v="att"]'); await sleep(800);
log(/הנוכחות שלי/.test(await txt(p, ".top")) && !/ממוצע כללי/.test(await txt(p)), "switch back to attendance");
await p.browserContext().close();

// 2. מסך ראשי: פעם ראשונה – לא מציף; ציון חדש – מופיע
p = await open("index.html");
log(await p.$eval("#gradeBox", e => e.hidden), "first time: old grades don't flood the home screen");
await p.browserContext().close();
p = await open("index.html", { seen: G.slice(1).map(key) });
t = await p.$eval("#gradeBox", e => e.hidden ? "" : e.innerText.replace(/\s+/g, " "));
log(/ציון חדש/.test(t) && /אנגלית/.test(t) && /90/.test(t), "new grade card on the home screen", t);
await p.click("#gnOk"); await sleep(200);
log(await p.$eval("#gradeBox", e => e.hidden), "'הבנתי' hides it");
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(2500);
log(await p.$eval("#gradeBox", e => e.hidden), "…and it stays hidden");
await p.browserContext().close();
p = await open("index.html", { seen: G.slice(1).map(key), notice: false });
log(await p.$eval("#gradeBox", e => e.hidden), "notice turned off → no card");
await p.browserContext().close();

// 3. בלי משוב: דוגמה
const ctx = await b.createBrowserContext(); p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844 });
p.on("pageerror", e => errs.push(e.message));
await p.evaluateOnNewDocument(pr => { localStorage.setItem("profile", JSON.stringify(pr)); }, PROF);
await p.goto("http://localhost:8787/absences.html#grades", { waitUntil: "domcontentloaded" }); await sleep(1200);
log(/חבר משוב/.test(await txt(p)), "not connected: explains and offers to connect");
await p.click("#demoBtn"); await sleep(600);
log(/מצב דוגמה/.test(await txt(p)) && /ממוצע כללי/.test(await txt(p)), "demo grades");
const of = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
log(!of, "no sideways scrolling on a phone");
await ctx.close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
