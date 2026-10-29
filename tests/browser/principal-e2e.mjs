import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לכלי המנהל בדף הצוות: לשוניות לפי נושא, מבט על, רשימת תלמידים, השעיה והחזרה, הודעה אישית ולכיתה, גרפים.
// השרת האמיתי רץ כאן בזיכרון (staff.mjs), בלי נטליפיי.
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore(); mod.__setPushSender(async () => {});
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const call = async (path, b, tok) => (await H(new Request("http://localhost" + path, { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(b) }), { ip: "9.9.9.9" })).json();
// הכנה: מנהל, מורה, תלמידים
const admin = await call("/api/staff", { action: "setup", name: "הרב המנהל", code: "admin-secret-1", invite: "TEST-CODE-1234" });
const tcode = (await call("/api/staff", { action: "addUser", name: "המורה דוד" }, admin.token)).code;
for (const [i, n, c] of [[1, "נועה כהן", "ya1"], [2, "יוסי לוי", "y2"], [3, "דני אבן", "ya2"]]) await call("/api/feed", { action: "hello", device: "device-aaaa-000" + i, name: n, cls: c, eng: c.startsWith("ya") ? "anijar" : "hadad", math: "adir", major: "cs", ver: "x", plat: "iPhone" });
await call("/api/feed", { action: "ping", device: "device-aaaa-0001", cls: "ya1", mashov: true, risk: ["היסטוריה"], warn: ["לשון"] });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function page(code, w = 390) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, isMobile: w < 700, hasTouch: w < 700 });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body: q.postData() || undefined }), { ip: "9.9.9.9" });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    if (/^http:\/\/localhost/.test(u)) return q.continue();
    return q.abort();
  });
  await p.goto("http://localhost:8787/staff.html", { waitUntil: "domcontentloaded" }); await sleep(700);
  await p.type("#lCode", code); await p.click("#lGo"); await sleep(1200);
  return p;
}
const txt = (p, s = "#main") => p.$eval(s, e => e.innerText.replace(/\s+/g, " "));

// 1. מנהל: מבט על
let p = await page("admin-secret-1");
const groups = await p.$$eval("#tabs button", b => b.map(x => x.textContent));
log(["ראשי", "תקשורת", "מערכת", "תלמידים", "נתונים", "עוד"].every(g => groups.some(x => x.includes(g))), "principal: tabs grouped by topic", groups.join(" | "));
let t = await txt(p);
log(/מבט על/.test(t) && /תלמידים רשומים/.test(t) && /י"א1/.test(t), "principal starts on the overview with class bars (incl. י\"א)", t.slice(0, 160));
log(await p.$eval(".kpis", e => /3\s*תלמידים רשומים/.test(e.innerText.replace(/\s+/g, " "))), "overview counts 3 students");
await p.click('.kpi[data-go="students"]'); await sleep(900);
log(/כל התלמידים/.test(await txt(p)) && await p.$eval("#subtabs", e => !e.hidden), "clicking a tile opens that screen (with sub-tabs)");

// 2. תלמידים: חיפוש, סינון, פרטים
t = await txt(p, "#sList");
log(/נועה כהן/.test(t) && /יוסי לוי/.test(t) && /דני אבן/.test(t) && /רחלי אניג'ר/.test(t), "student list with groups per grade", t.slice(0, 200));
await p.type("#sQ", "נועה"); await sleep(200);
log((await p.$$("#sList .stu")).length === 1, "search by name");
await p.click("#sQ", { clickCount: 3 }); await p.keyboard.press("Backspace"); await sleep(100);
await p.click('#sC button[data-v="y2"]'); await sleep(200);
log((await p.$$("#sList .stu")).length === 1 && /יוסי/.test(await txt(p, "#sList")), "filter by class");
await p.click('#sC button[data-v=""]'); await sleep(200);
const noaKey = await p.$$eval("#sList .stu", l => l.find(e => /נועה/.test(e.innerText)).dataset.k);
await p.click(`.stu[data-k="${noaKey}"]`); await sleep(300);
log(await p.$("#det") && /כניסה אחרונה/.test(await txt(p, "#det")), "click a student → details");
// הודעה אישית
await p.type("#dMsg", "בוא לחדר המנהל"); await p.click("#dSend"); await sleep(800);
log(/נשלח לנועה/.test(await txt(p, "#dRes")), "personal message sent");
let h = await call("/api/feed", { action: "hello", device: "device-aaaa-0001", name: "נועה כהן", cls: "ya1" });
log((h.msgs || []).some(m => m.text === "בוא לחדר המנהל" && m.from === "principal"), "student receives it (from the principal)");
// השעיה
await p.select("#dMin", "1440"); await p.type("#dWhy", "בדיקה"); await p.click("#dSus"); await sleep(1500);
h = await call("/api/feed", { action: "hello", device: "device-aaaa-0001", name: "נועה כהן", cls: "ya1" });
log(!!h.susp && h.susp.reason === "בדיקה", "suspension works for the student", JSON.stringify(h.susp));
log(/מושעה/.test(await txt(p, "#sList")), "list marks the student as suspended");
await p.evaluate(() => goTab("susp")); await sleep(900);
log(/נועה כהן/.test(await txt(p)), "suspensions screen lists her");
await p.click("[data-un]"); await sleep(1300);
h = await call("/api/feed", { action: "hello", device: "device-aaaa-0001", name: "נועה כהן", cls: "ya1" });
log(!h.susp && /אין כרגע תלמידים מושעים/.test(await txt(p)), "return to the app works");
// הודעה לכיתה
await p.evaluate(() => goTab("pmsg")); await sleep(500);
await p.click('#mTo button[data-v="y2"]'); await p.type("#mText", "מחר טיול"); await p.click("#mGo"); await sleep(1200);
log(/נשלח/.test(await txt(p, "#mRes")) && /מחר טיול/.test(await txt(p, "#mList")), "class message sent and listed");
h = await call("/api/feed", { action: "hello", device: "device-aaaa-0002", name: "יוסי לוי", cls: "y2" });
log((h.msgs || []).some(m => m.text === "מחר טיול"), "class gets it");
h = await call("/api/feed", { action: "hello", device: "device-aaaa-0003", name: "דני אבן", cls: "ya2" });
log(!(h.msgs || []).some(m => m.text === "מחר טיול"), "other class does not");
// גרפים
await p.evaluate(() => goTab("stats")); await sleep(1200);
t = await txt(p);
log(/היסטוריה/.test(t) && /לשון/.test(t) && /בלי שמות/.test(t) && !/נועה/.test(t), "charts per subject, anonymous", t.slice(0, 220));
log(await p.$("#stLine svg.line"), "30-day usage chart");
await p.click('#stC button[data-v="y2"]'); await sleep(200);
log(/עוד אין תלמידים שחיברו משוב|אין אף מקצוע/.test(await txt(p, "#stBody")), "per-class filter (y2 has no Mashov data)");
// יומן אצל מנהל המערכת
const ot = (await call("/api/owner", { action: "login", code: "OWNERTEST1234567" })).token;
const ov = await call("/api/owner", { action: "overview" }, ot);
log(ov.log.some(x => /👔 הרב המנהל/.test(x.detail) && x.action === "suspend") && ov.log.some(x => /👔 הרב המנהל/.test(x.detail) && x.action === "msgSend"), "owner log shows the principal's actions");
const of = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
log(!of, "no sideways scrolling on a phone");
await p.browserContext().close();

// 3. מורה: בלי כלי מנהל
p = await page(tcode);
const tg = await p.$$eval("#tabs button", b => b.map(x => x.textContent).join(" "));
log(!/תלמידים|נתונים|ראשי/.test(tg), "teacher does not see principal tabs", tg);
log(/עדכון חדש/.test(await txt(p)), "teacher starts on 'new update'");
await p.browserContext().close();

console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await browser.close();
