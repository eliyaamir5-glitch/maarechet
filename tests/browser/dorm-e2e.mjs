import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לפנימייה: תלמיד קיים בלי תשובה נשאל פעם אחת; גר בבית – בלי ערבית ובלי ארוחת בוקר; בפנימייה – שניהם; בחמישי אין ערבית
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const OLD = { first: "דני", last: "לוי", cls: "y2", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" };
const errs = [];
async function open(prof) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
  await p.evaluateOnNewDocument(pr => { if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1);
    localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); }, prof);
  await p.goto("http://localhost:8787/index.html", { waitUntil: "domcontentloaded" }); await sleep(1200);
  return p;
}
const names = p => p.evaluate(() => DAYS.map(d => lessonsOf(d).map(l => l.n).join(",")).join("|"));

// 1. תלמיד קיים בלי תשובה: נשאל רק על הפנימייה, ואחרי התשובה האשף נסגר
let p = await open(OLD);
log(await p.$eval("#wiz", e => !e.hidden) && (await p.$eval("#wzQ", e => e.textContent)).includes("פנימייה"), "existing student is asked only about the dorm");
const o = await p.$$("#wzBody .wz-opt[data-v]"); await o[1].click(); await sleep(900);
log(await p.$eval("#wiz", e => e.hidden), "wizard closes after answering");
log((await p.evaluate(() => JSON.parse(localStorage.getItem("profile")))).dorm === "no", "answer saved");
let all = await names(p);
log(!all.includes("ערבית") && !all.includes("ארוחת") && all.includes("תפילת שחרית"), "home student: שחרית without breakfast, no ערבית", all.slice(0, 120));
log(/-home\.ics$/.test(await p.evaluate(() => webcalUrl())), "home student gets the -home calendar");
await p.browserContext().close();

// 2. בפנימייה: שחרית + ארוחת בוקר וערבית, אבל לא בחמישי
p = await open({ ...OLD, dorm: "yes" });
log(await p.$eval("#wiz", e => e.hidden), "dorm student with an answer is not asked again");
all = await names(p);
log(all.includes("תפילת שחרית + ארוחת בוקר") && all.includes("ערבית"), "dorm student: שחרית + ארוחת בוקר and ערבית");
log(!(await p.evaluate(() => lessonsOf(DAYS[4]).some(l => l.n === "ערבית"))), "no ערבית on Thursday");
log(!/-home\.ics$/.test(await p.evaluate(() => webcalUrl())), "dorm student keeps the regular calendar");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
