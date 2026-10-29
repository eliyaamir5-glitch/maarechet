import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לתפילין: שורה בתחתית עם השעה (שקיעה), שאלה בשעה האחרונה, כן/לא, שבת וחג בלי שורה
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const PROF = { first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" };
const errs = [];
async function open(iso, ls = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => /^http:\/\/localhost/.test(q.url()) ? q.continue() : q.abort());
  await p.evaluateOnNewDocument((t, pr, ls) => {
    const R = Date, off = t - R.now();
    class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
    window.Date = D;
    if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1);
    localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999");
    for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
  }, new Date(iso).getTime(), PROF, ls);
  await p.goto("http://localhost:8787/index.html", { waitUntil: "domcontentloaded" }); await sleep(3200);
  return p;
}
const line = p => p.$eval("#tefLine", e => e.hidden ? null : e.innerText.replace(/\s+/g, " "));
const dlgOpen = p => p.evaluate(() => !!document.querySelector("#tefDlg[open]"));
const dlgText = p => p.$eval("#tefDlg", e => e.innerText.replace(/\s+/g, " "));

// 1. בבוקר (חמישי 29.10.2026): שורה עם שעת השקיעה, בלי שאלה
let p = await open("2026-10-29T10:00:00+02:00");
let t = await line(p);
log(t && /עד 16:5\d/.test(t), "morning: tefillin line shows until sunset (~16:55)", t);
log(!(await dlgOpen(p)), "morning: no question yet");
await p.browserContext().close();

// 2. שעה לפני השקיעה: שאלה. "עוד לא" → עידוד וכמה זמן נשאר; "הנחתי" → כל הכבוד
p = await open("2026-10-29T16:10:00+02:00");
log(await dlgOpen(p) && /הנחת תפילין היום/.test(await dlgText(p)), "last hour: asks 'הנחת תפילין היום?'", await dlgText(p).catch(() => ""));
log(/נשאר|דקות/.test(await line(p)) && await p.$eval("#tefLine", e => e.classList.contains("urgent")), "last hour: line is highlighted with time left");
await p.click("#tefN"); await sleep(300);
t = await dlgText(p);
log(/עוד יש זמן/.test(t) && /\d+ דקות/.test(t), "answer no → encouragement and minutes left", t);
await p.click("#tefY2"); await sleep(300);
t = await dlgText(p);
log(/כל הכבוד|אלוף|יפה מאוד/.test(t), "then 'הנחתי' → well done", t);
await p.click('#tefDlg button[value="ok"]'); await sleep(200);
log(/הנחת תפילין היום/.test(await line(p)) && await p.$eval("#tefLine", e => e.classList.contains("done")), "line shows done");
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(3200);
log(!(await dlgOpen(p)), "after answering yes: not asked again today");
await p.browserContext().close();

// 3. כבר ענה "כן" בבוקר דרך הכפתור → לא שואלים
p = await open("2026-10-29T16:20:00+02:00", { tef: JSON.stringify({ d: "2026-10-29", a: "yes" }) });
log(!(await dlgOpen(p)), "answered yes earlier: no question");
await p.browserContext().close();

// 4. אחרי השקיעה: הזמן נגמר, בלי שאלה
p = await open("2026-10-29T18:00:00+02:00");
log(/נגמר/.test(await line(p)) && !(await dlgOpen(p)), "after sunset: time is over, no question", await line(p));
await p.browserContext().close();

// 5. שבת ופסח: אין שורת תפילין
p = await open("2026-10-31T11:00:00+02:00");
log((await line(p)) === null, "Shabbat: no tefillin line");
await p.browserContext().close();
p = await open("2027-04-25T11:00:00+03:00");
log((await line(p)) === null, "Chol HaMoed Pesach: no tefillin line");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
