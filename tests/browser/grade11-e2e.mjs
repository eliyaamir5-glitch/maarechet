import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לשכבה י"א: הרשמה של תלמיד חדש לי"א1 (הקבצות של י"א, ניצנים, פנימייה), תלמיד קיים, דף הצוות וקישור להורים
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = "http://localhost:8787/";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function open(url, prof) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.setRequestInterception(true);
  p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
  await p.evaluateOnNewDocument(pr => { if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1);
    if (pr) localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); }, prof);
  await p.goto(BASE + url, { waitUntil: "domcontentloaded" }); await sleep(1200);
  return p;
}
const opts = p => p.$$eval("#wzBody .wz-opt[data-v]", bs => bs.map(x => x.dataset.v + ":" + x.innerText.replace(/\s+/g, " ")));
async function pick(p, v) { await p.waitForSelector(`#wzBody .wz-opt[data-v="${v}"]`, { visible: true }); await sleep(250); await p.click(`#wzBody .wz-opt[data-v="${v}"]`); await sleep(600); }
const q = p => p.$eval("#wzQ", e => e.textContent);
const week = p => p.evaluate(() => DAYS.slice(0, 5).map(d => lessonsOf(d).map(l => `${l.s} ${l.n}|${l.w || ""}`)));

// 1. תלמיד חדש בי"א1
let p = await open("index.html", null);
await p.type("#wzFirst", "נועם"); await p.type("#wzLast", "כץ"); await p.click("#wzNext"); await sleep(350);
for (const id of ["#wzPhSkip", "#wzBdSkip", "#wzSkip", "#wzMsSkip"]) { await p.waitForSelector(id, { visible: true }); await p.click(id); await sleep(350); }
const grOpts = await opts(p);
log(grOpts.length === 2 && grOpts[0].startsWith("10:") && grOpts[1].startsWith("11:") && grOpts[1].includes('י"א'), "first the grade question (י' / י\"א)", grOpts.join(" / "));
await pick(p, "11");
const clsOpts = await opts(p);
log(clsOpts.length === 2, "then only the classes of that grade", clsOpts.join(" / "));
log(clsOpts.some(o => o.startsWith("ya1:") && o.includes("הרב שי כהן")) && clsOpts.some(o => o.startsWith("ya2:") && o.includes("הרב גלעד סיטון")), "class list has י\"א1 and י\"א2 with their rav", clsOpts.join(" / "));
await pick(p, "ya1");
const eng = await opts(p);
log(eng.length === 3 && eng.some(o => o.startsWith("anijar:") && o.includes("5 יחידות")) && eng.some(o => o.startsWith("minervi:") && o.includes("5 יחידות")) && eng.some(o => o.startsWith("bokobza:") && o.includes("4 יחידות")), "English groups of י\"א", eng.join(" / "));
await pick(p, "anijar");
const math = await opts(p);
log(math.length === 3 && math.some(o => o.startsWith("sitton:") && o.includes("3 יחידות")) && !math.join().includes("ברזילי"), "math groups of י\"א (no Barzilai)", math.join(" / "));
await pick(p, "adir");
const maj = await opts(p);
log(maj.some(o => o.includes("אורי זרביב")) && maj.some(o => o.includes("אפי פיזיקה")), "majors of י\"א with their teachers", maj.join(" / "));
await pick(p, "phys");
log((await q(p)).includes("ניצנים"), "י\"א student is asked about ניצנים", await q(p));
await pick(p, "yes");
log((await q(p)).includes("פנימייה"), "then about the dorm", await q(p));
await pick(p, "no");
await p.waitForSelector("#bdGo", { visible: true, timeout: 9000 }).catch(() => {}); await p.click("#bdGo").catch(() => {}); await sleep(800);
const prof = await p.evaluate(() => JSON.parse(localStorage.getItem("profile")));
log(prof.cls === "ya1" && prof.eng === "anijar" && prof.math === "adir" && prof.major === "phys" && prof.nitz === "yes" && prof.dorm === "no", "profile saved", JSON.stringify(prof));
let w = await week(p);
log(!w[0].some(x => /שחרית/.test(x)) && w[1].some(x => /שחרית/.test(x)), "no shacharit on Sunday, shacharit on Monday");
log(w[0].some(x => x.startsWith("13:30 פיזיקה|אפי פיזיקה")), "Sunday 13:30: physics instead of mincha for the physics major", w[0].join(" ; "));
log(w[0].some(x => x.startsWith("17:15 מתמטיקה|אדיר חניה")) && !w[0].some(x => /חינוך גופני/.test(x)), "Sunday evening: Adir's math, no PE");
log(w[1].some(x => x.startsWith("17:15 ניצנים")), "Monday evening: ניצנים");
log(!w.flat().some(x => /ערבית|ארוחת/.test(x)), "home student: no arvit, no breakfast");
log(w[0].some(x => x.startsWith("12:00 אנגלית|רחלי אניג'ר")), "English with his teacher");
log(/ya1-anijar-adir-phys-home-nz\.ics$/.test(await p.evaluate(() => webcalUrl())), "calendar link for his exact combination", await p.evaluate(() => webcalUrl()));
const parent = await p.evaluate(() => parentLink());
await p.browserContext().close();

// 2. תלמיד קיים בי"א2: 3 יחידות מתמטיקה, כלכלה, לא בניצנים, בפנימייה
p = await open("index.html", { first: "אבי", last: "לוי", cls: "ya2", dorm: "yes", nitz: "no", eng: "bokobza", math: "sitton", major: "econ", since: "2026-09-01" });
log(await p.$eval("#wiz", e => e.hidden), "complete י\"א profile: no wizard");
w = await week(p);
log(w[0].some(x => x.startsWith("17:15 חינוך גופני")) && !w[0].some(x => x.startsWith("17:15 מתמטיקה")), "Sunday 17:15: PE (no math for 3 units)");
log(w[1].some(x => x.startsWith("17:15 מחשבת")) && !w[1].some(x => /ניצנים/.test(x)), "Monday 17:15: מחשבת, not ניצנים");
log(w[2].some(x => x.startsWith("19:30 סדר ערב")) && w[2].some(x => x.startsWith("20:15 ערבית")), "Tuesday: סדר ערב 19:30 then arvit");
log(!w[4].some(x => /ערבית/.test(x)) && w[4].some(x => x.startsWith("15:30 מתמטיקה") === false), "Thursday: no arvit, no 15:30 math for 3 units");
log(w[0].some(x => x.startsWith("16:15 מנהל וכלכלה|אורי זרביב")), "econ with Uri Zarviv");
await p.browserContext().close();

// 3. קישור להורים
p = await open(parent.replace(/^.*\/parent\.html/, "parent.html"), null);
const pt = await p.evaluate(() => document.body.innerText);
log(/י"א1/.test(pt) && !/הקישור לא תקין/.test(pt), "parent link works for י\"א", pt.slice(0, 120));
await p.browserContext().close();

// 4. דף הצוות: כיתות י"א במערכת ובשליחת עדכון
p = await open("staff.html", null);
const hasCls = await p.evaluate(() => typeof CLS !== "undefined" && !!CLS.ya1 && !!CLS.ya2 && SL.some(x => x.c === "ya2" && x.w === "אפי פיזיקה") && TEACHERS.includes("נוף מויאל"));
log(hasCls, "staff timetable knows י\"א classes and teachers");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
