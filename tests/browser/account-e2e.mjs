import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לפרופיל ולחשבון: חלקים מתקפלים, יום הולדת שכבר מולא, "✅ ביומן", ניתוק אימייל בשני אישורים,
// מחיקת המשתמש (2 אישורים + להחזיק 5 שניות), מזל טוב ביום הולדת, הפתעת יום הולדת, סיכום חודשי, שיעורים שעברו מתקפלים
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const PROF = { first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01", email: "dani@gmail.com" };
const errs = [];
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
async function open({ at, ls = {}, bdays = [], wishes = null } = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); p.posts = [];
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => {
    const u = q.url();
    if (/\/api\/(feed|push)/.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H });
      if (q.method() === "GET") return q.respond({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify({ ok: true, now: Date.now(), updates: [], polls: [], events: [], answers: [], birthdays: bdays, changes: [] }) });
      const body = JSON.parse(q.postData() || "{}"); p.posts.push(body);
      return q.respond({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify(body.action === "hello" && wishes ? { ok: true, wishes } : { ok: true, count: 1 }) });
    }
    if (/^http:\/\/localhost/.test(u)) return q.continue();
    return q.abort();
  });
  await p.evaluateOnNewDocument((pr, ls, at) => {
    if (at) { const R = Date, off = new R(at).getTime() - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }
    if (window.name === "seeded") return; window.name = "seeded"; // נשמר גם אחרי ריענון ומחיקת האחסון
    localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); localStorage.setItem("feedOk", "1");
    localStorage.setItem("push", JSON.stringify({ askLater: Date.now() + 9e9 }));
    for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, JSON.stringify(v));
  }, PROF, ls, at || null);
  await p.goto("http://localhost:8787/index.html", { waitUntil: "domcontentloaded" }); await sleep(3000);
  return p;
}
const md = d => String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

// 1. פרופיל: חלקים מתקפלים עם מצב
let p = await open({ at: "2026-11-02T18:30:00", ls: { bday: { d: 12, m: 3, share: true } } });
await p.evaluate(() => openProfile()); await sleep(400);
const secs = await p.$$eval("#profBody details.pf-sec", l => l.map(d => [d.dataset.sec, d.open, d.querySelector("summary").innerText.replace(/\s+/g, " ")]));
log(["theme", "cal", "parent", "bday", "mail", "mashov", "del"].every(k => secs.some(s => s[0] === k)), "profile is split into folded sections", JSON.stringify(secs));
const bd = secs.find(s => s[0] === "bday");
log(bd && !bd[1] && /12 במרץ ✓/.test(bd[2]), "birthday already filled → closed, shows '12 במרץ ✓'", JSON.stringify(bd));
log(/מחובר ✓/.test(secs.find(s => s[0] === "mail")[2]), "email section shows 'מחובר ✓'");
log(/נוכחות וציונים/.test(await p.$eval("#profBody", e => e.innerText)), "profile link renamed to 'נוכחות וציונים'");
// 2. ניתוק אימייל: שני אישורים, ו"לא" בשלב השני לא מנתק
await p.evaluate(() => { document.querySelector('[data-sec="mail"]').open = true; }); await p.click("#pfMailOff"); await sleep(300);
log(await p.$eval("#sureDlg", d => d.open) && /לנתק את האימייל/.test(await p.$eval("#sureT", e => e.textContent)), "disconnect email → asks");
await p.click("#sureYes"); await sleep(300);
log(/בטוח/.test(await p.$eval("#sureT", e => e.textContent)), "…and asks again");
await p.click("#sureNo"); await sleep(300);
log(JSON.parse(await p.evaluate(() => localStorage.getItem("profile"))).email === "dani@gmail.com", "'ביטול' in the second step keeps the email");
await p.click("#pfMailOff"); await sleep(250); await p.click("#sureYes"); await sleep(250); await p.click("#sureYes"); await sleep(300);
log(!JSON.parse(await p.evaluate(() => localStorage.getItem("profile"))).email, "two yes → email disconnected");
// 3. יומן
await p.evaluate(() => markCal()); await sleep(100);
log(/ביומן/.test(await p.$eval("#calBtn", e => e.textContent)) && await p.$eval("#calBtn", e => e.classList.contains("added")), "after adding to calendar: button shows '✅ ביומן'");
// 4. שיעורים שעברו מתקפלים
await p.evaluate(() => document.getElementById("profDlg").close());
const past = await p.$eval("#content", e => { const d = e.querySelector("details.past"); return d ? [d.open, d.querySelector("summary").innerText, d.querySelectorAll(".row").length] : null; });
log(past && !past[0] && /שיעורים שכבר עברו/.test(past[1]) && past[2] >= 5, "finished lessons are folded into one line", JSON.stringify(past));
await p.click("#content details.past summary"); await sleep(200);
log(await p.$eval("#content details.past", d => d.open), "…and open on tap");
// 5. סיכום חודשי (2 בנובמבר → אוקטובר)
const rc = await p.$eval("#recapBox", e => e.hidden ? "" : e.innerText);
log(/הסיכום של אוקטובר מוכן/.test(rc), "monthly recap card on the 2nd of the month", rc);
await p.click("#rcOpen"); await sleep(600);
log(await p.$("#recap") && /אוקטובר שלך/.test(await p.$eval("#recap", e => e.innerText)), "recap opens as stories");
for (let i = 0; i < 10 && await p.$("#rcNext"); i++) { await p.click("#rcNext"); await sleep(250); }
log(await p.$("#rcSave") && /בקיצור/.test(await p.$eval("#recap", e => e.innerText)), "last slide: summary + save as image");
await p.click("#rcEnd"); await sleep(300);
log(!(await p.$("#recap")) && /לראות שוב/.test(await p.$eval("#recapBox", e => e.innerText)), "closing marks it seen ('לראות שוב')");
await p.browserContext().close();

// 6. מחיקת המשתמש
p = await open({ ls: { bday: { d: 12, m: 3, share: true } } });
await p.evaluate(() => openProfile()); await sleep(300);
await p.evaluate(() => { document.querySelector('[data-sec="del"]').open = true; }); await p.click("#pfDel"); await sleep(300);
await p.click("#sureYes"); await sleep(300);
log(/במאה אחוז/.test(await p.$eval("#sureT", e => e.textContent)), "delete: second question 'בטוח במאה אחוז?'");
await p.click("#sureYes"); await sleep(500);
log(await p.$eval("#delFx", e => !e.hidden) && await p.$("#dzHold"), "…then the hold-5-seconds screen");
const bx = await (await p.$("#dzHold")).boundingBox();
await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await sleep(1800);
log(await p.$eval("#delFx", e => e.classList.contains("hold")), "holding → shaking + warnings");
await p.mouse.up(); await sleep(300);
log(/שחררת/.test(await p.$eval("#dzWarn", e => e.innerText)) && await p.evaluate(() => !!localStorage.getItem("profile")), "letting go early → nothing deleted");
await p.mouse.down(); await sleep(5600); await p.mouse.up();
log(await p.$eval("#delFx", e => e.classList.contains("go")), "5 seconds → card flies to the bin");
await sleep(3500);
const end = await p.$eval("#delFx", e => e.innerText.replace(/\s+/g, " "));
log(/המשתמש נמחק/.test(end) && /תחזור אלינו בהקדם/.test(end), "goodbye screen with a message", end.slice(0, 160));
const lv = p.posts.find(x => x.action === "leave");
log(lv && lv.name === "דני לוי" && lv.cls === "y1", "server is told (so the principal sees it)", JSON.stringify(p.posts.map(x => x.action)));
log(await p.evaluate(() => localStorage.length === 0), "everything on the phone is wiped");
await p.click("#dzAgain"); await sleep(3000);
log(await p.evaluate(() => !document.getElementById("intro").hidden || !document.getElementById("wiz").hidden), "→ back to signup from the start");
await p.browserContext().close();

// 7. יום הולדת: הפתעה לחוגג, ומזל טוב מחבר
const now = new Date(Date.now() + 3 * 3600e3);
p = await open({ ls: { bday: { d: now.getUTCDate(), m: now.getUTCMonth() + 1, share: true }, tef: { d: "x", a: "yes" } }, wishes: ["יוסי כהן", "אבי מזרחי"],
  bdays: [{ name: "דני לוי", cls: "y1", md: md(now), inDays: 0 }, { name: "נועם בר", cls: "y2", md: md(now), inDays: 0 }] });
await sleep(1500);
log(await p.$("#fx.bday") && await p.$("#bdBlow"), "birthday: surprise with a cake opens by itself");
await p.click("#bdBlow"); await sleep(1300);
const bt = await p.$eval("#fx", e => e.innerText.replace(/\s+/g, " "));
log(/2 חברים כבר איחלו/.test(bt) && /יוסי כהן/.test(bt), "blow the candles → see who wished", bt.slice(0, 200));
await p.click("#fx .go"); await sleep(400);
const ex = await p.$eval("#extras", e => e.innerText.replace(/\s+/g, " "));
log(/איחלו לך מזל טוב: יוסי כהן, אבי מזרחי/.test(ex), "home card lists the wishes", ex.slice(0, 200));
await p.click(".wishbtn"); await sleep(800);
const w = p.posts.find(x => x.action === "wish");
log(w && w.toName === "נועם בר" && w.toCls === "y2" && w.name === "דני לוי", "wish a friend → sent to the server", JSON.stringify(w));
log(/איחלת לנועם/.test(await p.$eval("#extras", e => e.innerText)), "…and shows '✓ איחלת'");
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(4500);
log(!(await p.$("#fx.bday")), "surprise only once a day");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
