import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore(); mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async body => (await H(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { ip: "1.2.3.4" })).json();
await api({ action: "login", code: "TEST-CODE-1234" });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function page(setup, w = 390) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: w < 700 });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  if (setup) await p.evaluateOnNewDocument(setup);
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body: q.postData() || undefined }), { ip: "5.5.5." + Math.floor(Math.random() * 250) });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    if (/web3forms|hebcal|jsdelivr/.test(u) && /web3forms/.test(u)) return q.respond({ status: 200, contentType: "application/json", body: "{}" });
    q.continue();
  });
  return p;
}
const stud = cls => () => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "__CLS__", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); };
const S2 = s => new Function(`(${s().toString().replace("__CLS__", "y2")})()`);
const S1 = s => new Function(`(${s().toString().replace("__CLS__", "y1")})()`);

// ---- הצוות ----
const T = await page(null, 1100);
const studN = (first, cls, extra) => new Function(`localStorage.setItem("profile", JSON.stringify({ first: "${first}", last: "לוי", cls: "${cls}", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); ${extra || ""}`);
const tdy = new Date(); const D = tdy.getDate(), M = tdy.getMonth() + 1;
// 1. תלמיד חדש: האשף שואל על יום הולדת
const N = await page(() => { localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); });
await N.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(800);
await N.type("#wzFirst", "רון"); await N.type("#wzLast", "לוי"); await N.click("#wzNext"); await sleep(300);
await N.click("#wzPhSkip"); await sleep(300);
log((await N.$eval("#wzQ", e => e.textContent)).includes("יום ההולדת"), "wizard asks for birthday", await N.$eval("#wzQ", e => e.textContent));
await N.select("#wzBdD", "31"); await N.select("#wzBdM", "2"); await N.click("#wzNext"); await sleep(300);
log((await N.$eval("#wzQ", e => e.textContent)).includes("יום ההולדת"), "impossible date (31.2) is blocked");
await N.select("#wzBdD", String(D)); await N.select("#wzBdM", String(M)); await N.click("#wzNext"); await sleep(300);
await N.click("#wzSkip"); await sleep(300); await N.click("#wzMsSkip"); await sleep(300);
for (const i of [0, 0, 0, 1, 0, 0]) { await N.waitForSelector("#wzBody .wz-opt[data-v]", { visible: true }); await sleep(250); const o = await N.$$("#wzBody .wz-opt[data-v]"); await o[i].click(); await sleep(500); }
await N.waitForSelector("#bdGo", { visible: true, timeout: 9000 }); await N.click("#bdGo"); await sleep(2500);
const nb = await N.evaluate(() => JSON.parse(localStorage.getItem("bday") || "{}"));
log(nb.d === D && nb.m === M && nb.share && nb.synced, "birthday saved and sent to server", JSON.stringify(nb));
const ex = await N.$eval("#extras", e => e.innerText);
log(ex.includes("מזל טוב רון"), "personal happy-birthday card", ex.slice(0, 200));
log(await N.$(".bd-conf") !== null || await N.evaluate(() => localStorage.getItem("bdConf")) !== null, "confetti fired");
log(!ex.includes("מתי יום ההולדת"), "no reminder after entering it");
// 2. תלמיד קיים בלי יום הולדת: תזכורת, נשארת אחרי רענון, נשמרת
const E = await page(studN("דנה", "y1"));
await E.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2000);
let e1 = await E.$eval("#extras", e => e.innerText);
log(e1.includes("מתי יום ההולדת שלך"), "existing student sees birthday reminder");
log(e1.includes("היום יום ההולדת של רון לוי (י'1)"), "other class in grade sees Ron's birthday with class", e1.slice(0, 300));
await E.reload({ waitUntil: "networkidle2" }); await sleep(1500);
log((await E.$eval("#extras", e => e.innerText)).includes("מתי יום ההולדת שלך"), "reminder stays until entered");
await E.select("#xBdD", "5"); await E.select("#xBdM", "3"); await E.click("#xBdOk"); await sleep(900);
const eb = await E.evaluate(() => JSON.parse(localStorage.getItem("bday") || "{}"));
log(eb.d === 5 && eb.m === 3 && eb.synced && !(await E.$eval("#extras", e => e.innerText)).includes("מתי יום ההולדת שלך"), "reminder saves and disappears", JSON.stringify(eb));
// 3. "לא רוצה" – התזכורת נעלמת
const O = await page(studN("עוז", "y2"));
await O.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2000);
await O.click("#xBdNo"); await sleep(500);
log(!(await O.$eval("#extras", e => e.innerText)).includes("מתי יום ההולדת שלך"), "opt-out hides the reminder");
// 4. השאלות למטה ומקופלות
const qaY = await O.$eval("#qaBox", e => e.getBoundingClientRect().top), heroY = await O.$eval("#hero", e => e.getBoundingClientRect().top);
log(qaY > heroY && !(await O.$eval("#qaBox details", d => d.open)), "questions box is below the timetable and folded");
const r = await api({ action: "bdList" }); // (admin token not set here — just ensure no crash)
console.log("errors:", errs.slice(0, 5)); console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await browser.close();
