import { CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט להתראות: כרטיס "רוצה התראות?", הפעלה (הרשאה ורישום מדומים), העדפות בפרופיל, כיבוי, ואייפון בלי מסך בית
import puppeteer from "puppeteer-core";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const PROF = { first: "דני", last: "לוי", cls: "ya2", dorm: "yes", nitz: "no", eng: "anijar", math: "adir", major: "cs", since: "2026-09-01" };
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const errs = [];
async function open({ ua, perm = "granted" } = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); p.posts = [];
  if (ua) await p.setUserAgent(ua);
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on("request", q => {
    const u = q.url(), H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
    if (/\/api\/push/.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H });
      const body = JSON.parse(q.postData() || "{}"); p.posts.push(body);
      return q.respond({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify(body.action === "key" ? { ok: true, key: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" } : { ok: true, prefs: body.prefs }) });
    }
    if (/^http:\/\/localhost/.test(u)) return q.continue();
    return q.abort();
  });
  await p.evaluateOnNewDocument((pr, perm) => {
    if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.setItem("profile", JSON.stringify(pr)); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); }
    // הרשאה ורישום מדומים (בענן אין שירות התראות אמיתי)
    let state = "default", sub = null;
    window.Notification = { get permission() { return state; }, requestPermission: async () => (state = perm) };
    if (window.PushManager) {
      PushManager.prototype.getSubscription = async () => sub;
      PushManager.prototype.subscribe = async () => (sub = { endpoint: "https://fcm.googleapis.com/fcm/send/test", toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "x".repeat(87), auth: "y".repeat(22) } }; }, unsubscribe: async () => { sub = null; return true; } });
    }
  }, PROF, perm);
  await p.goto("http://localhost:8787/index.html", { waitUntil: "domcontentloaded" }); await sleep(4000);
  return p;
}
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; }, s);

// 1. אנדרואיד/מחשב: הכרטיס מופיע, הפעלה עובדת
let p = await open();
log(await vis(p, "#pushBox") && /רוצה התראות/.test(await p.$eval("#pushBox", e => e.innerText)), "opt-in card is shown");
await p.click("#pushOn"); await sleep(1200);
const sub = p.posts.find(x => x.action === "sub");
log(!!sub && sub.cls === "ya2" && sub.prefs.tef === true && sub.prefs.urgent === true && /^[A-Za-z0-9-]{8,}$/.test(sub.device) && !JSON.stringify(sub).includes("דני"), "enable → sends subscription with class and default prefs (no name)", JSON.stringify(sub));
log(/פועלות/.test(await p.$eval("#pushBox", e => e.innerText)), "card confirms notifications are on");
await sleep(4300);
log(!(await vis(p, "#pushBox")), "card disappears afterwards");
// פרופיל: העדפות
await p.evaluate(() => openProfile()); await sleep(400);
log(await p.$eval("#ppOn", e => e.checked) && await p.$eval("#ppTef", e => e.checked), "profile shows notifications on with tefillin on");
p.posts = [];
await p.click("#ppTef"); await sleep(800);
log(p.posts.some(x => x.action === "sub" && x.prefs.tef === false && x.prefs.urgent === true), "turning off tefillin reminder is saved to the server", JSON.stringify(p.posts));
p.posts = [];
await p.click("#ppOn"); await sleep(800);
log(p.posts.some(x => x.action === "unsub"), "turning notifications off unsubscribes");
log(!(await p.$eval("#ppOn", e => e.checked)), "profile shows notifications off");
await p.browserContext().close();

// 2. "לא עכשיו" – לא שואלים שוב השבוע
p = await open();
await p.click("#pushLater"); await sleep(300);
log(!(await vis(p, "#pushBox")), "'not now' hides the card");
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(4000);
log(!(await vis(p, "#pushBox")), "…and it stays hidden after reopening");
await p.browserContext().close();

// 3. סירוב להרשאה
p = await open({ perm: "denied" });
await p.click("#pushOn"); await sleep(800);
log(/לא אישרת/.test(await p.$eval("#pushBox", e => e.innerText)), "permission denied → clear message");
await p.browserContext().close();

// 4. אייפון בלי מסך הבית: הסבר איך להוסיף
p = await open({ ua: IPHONE });
const t = await p.$eval("#pushBox", e => e.innerText).catch(() => "");
log(/מסך הבית/.test(t) && await p.$("#pushHow"), "iPhone (not installed): explains adding to home screen", t);
await p.click("#pushHow"); await sleep(400);
log(await p.evaluate(() => !!document.querySelector("#installDlg[open]")), "…and opens the install guide");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
