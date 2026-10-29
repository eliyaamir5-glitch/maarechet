import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לעזרה בנושאים במחשבון: חיפוש (גם עם שגיאות כתיב), תרגיל → פותר, דף נושא, "פתור לי", כל הנושאים נפתחים בלי שגיאות
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.setRequestInterception(true); p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
await p.goto("http://localhost:8787/calc.html", { waitUntil: "domcontentloaded" }); await sleep(800);
const sug = () => p.$eval("#tSug", e => e.innerText.replace(/\s+/g, " "));
async function type(t) { await p.click("#tq", { clickCount: 3 }); await p.keyboard.press("Backspace"); await p.type("#tq", t); await sleep(250); }

log(await p.$("#tq") && (await p.$$("#tPop .chip")).length >= 6, "home has the search bar with popular topics");
for (const [q, want] of [["פיתגורס", "פיתגורס"], ["פיטגורס", "פיתגורס"], ["נגזרת", "נגזרת"], ["משואה ריבועית", "משוואה ריבועית"], ["לוגרתם", "לוגריתמים"], ["שטח טרפז", "שטחים"], ["סינוס", "סינוס"], ["בינומית", "בינומית"]]) {
  await type(q); const s = await sug();
  log(s.includes(want), `search "${q}" finds ${want}`, s.slice(0, 100));
}
await type("קקקקק");
log(/לא מצאתי/.test(await sug()), "nonsense search: friendly 'not found'");
await type("x^2-5x+6=0");
log(/לפתור את התרגיל/.test(await sug()), "an exercise in the search → offers to solve it");
await p.keyboard.press("Enter"); await sleep(900);
log((await p.evaluate(() => location.hash)) === "#solve" && /x1\s*=\s*2|x2\s*=\s*3/.test(await p.$eval("#sOut", e => e.innerText.replace(/\s+/g, " "))), "Enter on exercise → solver shows the answer");
await p.goto("http://localhost:8787/calc.html", { waitUntil: "domcontentloaded" }); await sleep(600);
await type("משוואה ריבועית"); await p.keyboard.press("Enter"); await sleep(500);
log((await p.evaluate(() => location.hash)) === "#t-quad", "Enter on topic → topic page");
const page = await p.$eval("#tOne", e => e.innerText);
log(/מה זה/.test(page) && /נוסחאות/.test(page) && /שלב אחרי שלב/.test(page) && /דוגמה פתורה/.test(page) && /טעויות נפוצות/.test(page), "topic page has all sections");
log(await p.$eval("#tSol", e => e.hidden), "solution hidden until asked");
await p.click("#tRev"); await sleep(200);
log(!(await p.$eval("#tSol", e => e.hidden)) && /x=2|x=3/.test(await p.$eval("#tSol", e => e.innerText.replace(/\s+/g, ""))), "reveal shows steps and answer");
await p.click("#tTool"); await sleep(900);
log((await p.evaluate(() => location.hash)) === "#solve" && (await p.$eval("#sIn", e => e.value)) === "x^2-5x+6=0", "'פתור במחשבון' opens the solver with the example");
// כל הנושאים
await p.evaluate(() => location.hash = "topics"); await sleep(300);
const n = await p.$$eval("#tAll a.tlb", a => a.length), total = await p.evaluate(() => Topics.TOPICS.length);
log(n === total && total >= 50, `all topics listed (${n})`);
const bad = [];
for (const id of await p.evaluate(() => Topics.TOPICS.map(t => t.id))) {
  await p.evaluate(i => location.hash = "t-" + i, id); await sleep(40);
  if (!(await p.evaluate(() => !document.getElementById("vTopic").hidden && document.getElementById("tOne").innerText.length > 80 && !/\$|undefined|NaN/.test(document.getElementById("tOne").innerText)))) bad.push(id);
}
log(!bad.length, "every topic page renders cleanly (no raw $, undefined)", bad.join(", "));
const of = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
log(!of, "no sideways scrolling on a phone");
console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
