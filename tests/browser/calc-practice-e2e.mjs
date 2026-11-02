import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט למחשבון: תרגול לפי רמה (תשובה נכונה, טעות עם הסבר, רמז, פתרון, החלפת רמה, הצעה לעלות רמה),
// מחשבון מדעי (חישוב, Ans, היסטוריה), נגזרת/סדרות/בינומית, מקשי הפונקציות
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
p.on("pageerror", e => errs.push(e.message));
await p.setRequestInterception(true); p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
const txt = s => p.$eval(s, e => e.innerText.replace(/\s+/g, " ")).catch(() => "");

// 1. בית: האריחים החדשים
await p.goto("http://localhost:8787/calc.html", { waitUntil: "domcontentloaded" }); await sleep(900);
const tiles = await txt("#vHome .tiles");
log(/תרגול לפי רמה/.test(tiles) && /מחשבון מדעי/.test(tiles) && /נגזרת ומשיק/.test(tiles) && /סדרות/.test(tiles) && /בינומית/.test(tiles), "home: new tiles (practice, scientific, derivative, sequences, binomial)", tiles.slice(0, 200));

// 2. תרגול
await p.goto("http://localhost:8787/calc.html#t-linear", { waitUntil: "domcontentloaded" }); await sleep(900);
log(await p.$("#toPrac") && await p.$("#prac .pcard"), "topic page has a practice section");
log(/מתאמן/.test(await txt("#prac .lvh")), "default level: 🌿 מתאמן");
await p.click('#prac .lvn [data-l="1"]'); await sleep(200);
log(/מתחיל/.test(await txt("#prac .lvh")), "level slider → 🌱 מתחיל");
let it = await p.evaluate(() => PR.it);
await p.type("#pIn0", String(it.ans + 1000)); await p.click("#pChk"); await sleep(200);
log(/לא בדיוק|❌/.test(await txt("#pFb")) && await p.$("#pIn0"), "wrong answer → explanation + try again");
await p.click("#pIn0", { clickCount: 3 }); await p.type("#pIn0", String(it.ans)); await p.click("#pChk"); await sleep(200);
log(/✅/.test(await txt("#pFb")) && /ככה פותרים/.test(await txt("#pFb")), "right answer on 2nd try → praise + how to solve (level 1 shows steps)");
// טעות נפוצה עם הסבר מותאם
await p.click("#pNext"); await sleep(200); it = await p.evaluate(() => PR.it);
const miss = (it.miss || []).find(m => typeof m.v === "number" && Math.abs(m.v - it.ans) > 1e-6);
if (miss) { await p.type("#pIn0", String(miss.v)); await p.click("#pChk"); await sleep(200);
  log((await txt("#pFb")).includes(miss.why.replace(/\$[^$]*\$/g, "").trim().slice(0, 12)), "a common mistake gets its own explanation", await txt("#pFb")); }
else log(true, "a common mistake gets its own explanation (none in this exercise)");
await p.click("#pShow"); await sleep(200);
log(/הפתרון/.test(await txt("#pFb")) && /התשובה/.test(await txt("#pFb")) && await p.$("#pNext"), "'תראה פתרון' → full solution + next");
// רצף של 3 → הצעה לעלות רמה
for (let i = 0; i < 3; i++) { await p.click("#pNext"); await sleep(150); it = await p.evaluate(() => PR.it); await p.type("#pIn0", String(it.ans)); await p.click("#pChk"); await sleep(150); }
log(await p.$("#pUp"), "3 in a row → offer to level up");
await p.click("#pUp"); await sleep(200);
log(/מתאמן/.test(await txt("#prac .lvh")), "…and it levels up");
// שאלה אמריקאית + רמז
await p.goto("http://localhost:8787/calc.html#t-special", { waitUntil: "domcontentloaded" }); await sleep(800);
await p.click("#pHint"); await sleep(150);
log(/💡/.test(await txt("#pFb")), "hint button shows a hint");
it = await p.evaluate(() => PR.it);
const wrongI = it.opts.findIndex(o => !o.ok); await p.click(`.popt[data-i="${wrongI}"]`); await sleep(200);
log(/❌/.test(await txt("#pFb")) && (it.opts[wrongI].why ? (await txt("#pFb")).length > 10 : true), "multiple choice: wrong option explains why");
const rightI = it.opts.findIndex(o => o.ok); await p.click(`.popt[data-i="${rightI}"]`); await sleep(200);
log(/✅/.test(await txt("#pFb")), "…right option → correct");
// התקדמות נשמרת
await p.goto("http://localhost:8787/calc.html#topics", { waitUntil: "domcontentloaded" }); await sleep(700);
log(/🎯 \d+/.test(await txt("#tAll")), "topics list shows practice progress 🎯");

// 3. מחשבון מדעי
await p.goto("http://localhost:8787/calc.html#sci", { waitUntil: "domcontentloaded" }); await sleep(700);
const press = async (...vs) => { for (const v of vs) { await p.evaluate(v => [...document.querySelectorAll("#scK button")].find(x => x.dataset.v === v).click(), v); await sleep(30); } };
await press("2", "×", "sin(", "3", "0", ")", "+", "√(", "1", "6", ")", "=");
log((await txt("#scR")) === "5", "scientific: 2×sin(30)+√16 = 5", await txt("#scR"));
await press("×", "1", "0", "=");
log((await txt("#scR")) === "50", "continues from the result (Ans)", await txt("#scR"));
log(/5×10/.test(await txt("#scH")) && /= 50/.test(await txt("#scH")), "history shows the calculations", await txt("#scH"));
await press("AC", "1", "÷", "0", "=");
log(/אי אפשר לחלק ב-0/.test(await txt("#scR")), "divide by 0 → clear message");
await p.click("#scDeg"); await press("AC", "sin(", "π", "÷", "2", ")", "=");
log((await txt("#scR")) === "1", "radians mode: sin(π/2) = 1", await txt("#scR"));
await p.click("#scDeg");

// 4. נגזרת / סדרות / בינומית
await p.goto("http://localhost:8787/calc.html#der", { waitUntil: "domcontentloaded" }); await sleep(600);
await p.evaluate(() => { dIn.value = "x³-3x+2"; dX.value = "2"; }); await p.click("#dGo"); await sleep(300);
const d = await txt("#dOut");
log(/3x²-3/.test(d) && /9x-14/.test(d) && /מקסימום/.test(d) && /מינימום/.test(d), "derivative: f', tangent, max/min with steps", d.slice(0, 200));
await p.goto("http://localhost:8787/calc.html#seq", { waitUntil: "domcontentloaded" }); await sleep(600);
await p.click('#qT [data-t="g"]'); await p.evaluate(() => { qA.value = "2"; qD.value = "3"; qN.value = "5"; }); await p.click("#qGo2"); await sleep(300);
log(/a5 = 162/.test(await txt("#qOut2")) && /S5 = 242/.test(await txt("#qOut2")), "geometric sequence: a5 and S5", await txt("#qOut2"));
await p.goto("http://localhost:8787/calc.html#bin", { waitUntil: "domcontentloaded" }); await sleep(600);
await p.evaluate(() => { bN.value = "5"; bP.value = "1/2"; bK.value = "2"; }); await p.click("#bGo"); await sleep(300);
log(/0\.3125/.test(await txt("#bOut")), "binomial: P(X=2), n=5, p=1/2 = 0.3125", await txt("#bOut"));
await p.evaluate(() => { bK.value = "9"; }); await p.click("#bGo"); await sleep(300);
log(/בין 0 ל-5/.test(await txt("#bOut")), "bad input → clear message");

// 5. מקשי פונקציות במקלדת של "פתרון תרגיל"
await p.goto("http://localhost:8787/calc.html#solve", { waitUntil: "domcontentloaded" }); await sleep(600);
await p.click("#sIn"); for (const k of ["sin(", "3", "0", ")", "+", "1"]) { await p.evaluate(k => [...document.querySelectorAll("#keys button")].find(x => x.dataset.k === k).click(), k); await sleep(30); }
log((await p.$eval("#sIn", e => e.value)) === "sin(30)+1", "keypad: new sin key works", await p.$eval("#sIn", e => e.value));
await p.evaluate(() => [...document.querySelectorAll("#keys button")].find(x => x.dataset.k === "CLR").click());
log((await p.$eval("#sIn", e => e.value)) === "", "keypad: C clears");
const of = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
log(!of, "no sideways scrolling");
console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
