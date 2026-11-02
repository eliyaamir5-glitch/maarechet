import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לעוזר "מערכתי": כפתור בכל דף, תשובות על המערכת, ניווט ו"לחיצות" בין דפים, חישוב, מוח חכם מדומה (פעולה + מכסה), דיבור מוסתר כשאין
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = []; let ai = { ok: false, error: "no_ai" }, aiCalls = [];
const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
p.on("pageerror", e => errs.push(e.message));
await p.setRequestInterception(true);
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
p.on("request", q => {
  const u = q.url();
  if (/\/api\/assist/.test(u)) { if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H }); aiCalls.push(JSON.parse(q.postData() || "{}")); return q.respond({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify(ai) }); }
  if (/\/api\//.test(u)) { if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H }); return q.respond({ status: 200, contentType: "application/json", headers: H, body: '{"ok":true}' }); }
  if (/^http:\/\/localhost/.test(u)) return q.continue();
  return q.abort();
});
await p.evaluateOnNewDocument(() => {
  const R = Date, off = new R("2026-11-02T10:20:00").getTime() - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D;
  if (window.name === "seeded") return; window.name = "seeded";
  localStorage.setItem("profile", JSON.stringify({ first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" }));
  localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("feedOk", "1"); localStorage.setItem("push", JSON.stringify({ askLater: 9e15 }));
  localStorage.setItem("tef", JSON.stringify({ d: "2026-11-02", a: "yes" })); localStorage.setItem("bday", JSON.stringify({ d: 12, m: 3, share: true }));
});
const go = async u => { await p.goto("http://localhost:8787/" + u, { waitUntil: "domcontentloaded" }); await sleep(1800); };
// הרובוט מתחבא חצי כשגוללים וחוזר אחרי שנייה – מחכים שיחזור לפני שלוחצים
const open = async () => { if (await p.$eval("#asstP", e => e.hidden)) { await p.waitForFunction(() => { const b = document.getElementById("asstBtn"); return b && !/tuck|away/.test(b.className); }, { timeout: 4000 }).catch(() => {}); await sleep(500); await p.click("#asstBtn"); } await sleep(250); };
const send = async (t, w = 1300) => { await open(); await p.type("#asstP input", t); await p.keyboard.press("Enter"); await sleep(w); };
const lastBot = () => p.$$eval("#asstP .am.bot", l => (l[l.length - 1] || {}).innerText || "");

await go("index.html");
log(await p.$("#asstBtn"), "🤖 button on the home screen");
await p.click("#asstBtn"); await sleep(300);
log(/מערכתי/.test(await p.$eval("#asstP", e => e.innerText)) && /מה יש לי עכשיו/.test(await lastBot()), "panel opens with examples");
await send("מה יש לי עכשיו?");
log(/תנ"ך|עכשיו/.test(await lastBot()), "answers 'what now' from the timetable", await lastBot());
await send("מה להביא מחר");
log(/להביא/.test(await lastBot()), "answers 'what to bring tomorrow'", await lastBot());
await send("כמה זה 15% מ-200");
log(/= 30/.test(await lastBot()), "computes 15% of 200 = 30", await lastBot());
await send("תשנה צבע לירוק", 1800);
log(await p.evaluate(() => Theme.current()) === "forest", "changes the app colour");
await send("אני רוצה לשנות תאריך יום הולדת", 4000);
log(await p.evaluate(() => document.getElementById("profDlg").open && document.querySelector('#profBody [data-sec="bday"]').open), "opens the profile with the birthday section open");
await p.evaluate(() => document.getElementById("profDlg").close());
log(aiCalls.length === 0, "clear commands don't use the AI quota", String(aiCalls.length));
// בין דפים
await send("תיקח אותי למחשבון אני רוצה ללמוד על נגזרת", 3500);
log(/calc\.html#t-deriv/.test(p.url()), "goes to the calculator → derivative explanation", p.url());
log(await p.$("#asstBtn"), "button on the calculator too");
await send("תרגול בשברים ברמה קלה", 4500);
log(/#t-fractions/.test(p.url()) && await p.evaluate(() => PR.L) === 1, "fractions practice at 🌱 level", p.url());
await send("תפתור 2x+3=11", 4500);
log(/#solve/.test(p.url()) && /x\s*=\s*4/.test(await p.$eval("#sOut", e => e.innerText).catch(() => "")), "solves 2x+3=11 in the solver", await p.$eval("#sOut", e => e.innerText.slice(0, 80)).catch(() => ""));
await send("מה להביא מחר", 4500);
log(/index\.html/.test(p.url()) && /להביא/.test(await lastBot()), "personal question from another page → back home and answers there");
await send("ספר טלפונים", 3500);
log(/phones\.html/.test(p.url()), "opens the phone book");
await go("index.html");
// מוח חכם מדומה
ai = { ok: true, reply: "נגזרת היא קצב השינוי של פונקציה 📈 בוא נתרגל!", action: { id: "practice", arg: { t: "deriv", L: 2 } }, left: 19 };
await send("למה בכלל צריך ללמוד את זה?", 5000);
log(aiCalls.length === 1 && aiCalls[0].q === "למה בכלל צריך ללמוד את זה?", "open question → goes to the smart brain");
log(!JSON.stringify(aiCalls[0]).includes("דני") && !JSON.stringify(aiCalls[0]).includes("y1"), "no name / class sent to the AI", JSON.stringify(aiCalls[0]).slice(0, 200));
log(/#t-deriv/.test(p.url()), "AI action runs (opens derivative practice)", p.url());
await go("index.html");
ai = { ok: true, reply: "כי הנגזרת של x^n היא n·x^(n-1) – אז 2·x 🙂", action: null, left: 19 };
await send("תסביר לי למה נגזרת של x בריבוע היא 2x", 3000);
const btns = await p.$$eval("#asstP .am.bot.ai", l => [...l[l.length - 1].querySelectorAll("button.go")].map(b => b.textContent));
log(btns.some(t => /הסבר/.test(t)) && btns.some(t => /לתרגל/.test(t)), "AI answer + fast-brain buttons (explanation, practice) together", JSON.stringify(btns));
await go("index.html"); await open();
log(/נשארו לך היום 19/.test(await p.$eval("#asstQ", e => e.innerText)), "shows questions left today");
ai = { ok: false, error: "quota", left: 0 };
await send("משהו ממש פתוח ומוזר על החיים", 2000);
log(/20 השאלות|לא בטוח/.test(await p.$eval("#asstP .alog", e => e.innerText)), "after the quota → fast brain keeps helping");
// גרירה לצד השני, נשמר; מסתתר בזמן הקלדה; "הסתר" להיום ומחזירים מהפרופיל
await go("index.html"); await p.evaluate(() => document.getElementById("asstP").hidden = true);
let bb = await (await p.$("#asstBtn")).boundingBox();
await p.mouse.move(bb.x + 30, bb.y + 30); await p.mouse.down(); await p.mouse.move(330, 300, { steps: 8 }); await p.mouse.up(); await sleep(700);
bb = await (await p.$("#asstBtn")).boundingBox();
log(bb.x > 250 && JSON.parse(await p.evaluate(() => localStorage.getItem("asstPos"))).side === "r", "drag the robot → snaps to the right side and remembers", JSON.stringify(bb));
log(await p.$eval("#asstP", e => e.hidden), "dragging doesn't open the chat");
await p.evaluate(() => { const i = document.createElement("input"); i.id = "tmpIn"; document.body.prepend(i); i.focus(); }); await sleep(300);
log(await p.$eval("#asstBtn", e => e.classList.contains("away")), "typing in a field → robot moves out of the way");
await p.evaluate(() => { document.getElementById("tmpIn").blur(); document.getElementById("tmpIn").remove(); }); await sleep(500);
log(!(await p.$eval("#asstBtn", e => e.classList.contains("away"))), "…and comes back");
await open(); await p.click("#asstP .hide"); await sleep(400);
log(!(await p.$("#asstBtn")), "'👋 הסתר' hides it for today");
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(1800);
log(!(await p.$("#asstBtn")), "…still hidden after reopening");
await p.evaluate(() => openProfile()); await sleep(300); await p.evaluate(() => { document.querySelector('[data-sec="theme"]').open = true; }); await p.click("#pfAsst"); await sleep(500);
log(await p.$("#asstBtn"), "profile → 'להציג את העוזר' brings it back");
await p.evaluate(() => document.getElementById("profDlg").close());
// אחרי הרשמה בלבד
const p2 = await ctx.newPage(); await p2.evaluateOnNewDocument(() => { window.name = "seeded"; localStorage.clear(); });
await p2.setRequestInterception(true); p2.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
await p2.goto("http://localhost:8787/index.html", { waitUntil: "domcontentloaded" }); await sleep(1500);
log(await p2.evaluate(() => { const b = document.getElementById("asstBtn"); return !b || getComputedStyle(b).display === "none"; }), "button hidden during signup/intro");
const of = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
log(!of, "no sideways scrolling");
console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
