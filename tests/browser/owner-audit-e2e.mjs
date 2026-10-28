import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// דף מנהל המערכת – בדיקות לתיקוני הביקורת (טיוטות, כפתורים אחרי שגיאה, "בלי שם", השעיה כקבוצה, שעון ישראל, ניתוק הכל, 360px, XSS)
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore(); mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [], dialogs = [];
let failAction = null;
async function page(setup, w = 390, tz) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
  if (tz) await p.emulateTimezone(tz);
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => { dialogs.push(d.message()); d.accept(); });
  if (setup) await p.evaluateOnNewDocument(setup);
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const body = q.postData() || undefined;
      if (failAction && body && JSON.parse(body).action === failAction) return q.respond({ status: 500, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: false, error: "server" }) });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body }), { ip: "6.6.6." + Math.floor(Math.random() * 250) });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    q.continue();
  });
  return p;
}
const feed = async (b, ip = "5.5.5.5") => (await H(new Request("http://localhost/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }), { ip })).json();
const own = async (b, tok) => (await H(new Request("http://localhost/api/owner", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(b) }), { ip: "7.7.7.7" })).json();
await feed({ action: "hello", device: "device-gil-0001", name: "גיל רז", cls: "y1", plat: "iPhone · Safari", ver: "v" });
await feed({ action: "hello", device: "device-gil-0002", name: "  גיל   רז ", cls: "y1", plat: "Windows · Chrome", ver: "v" });
await feed({ action: "hello", device: "device-anon-0001", name: "", cls: "y2", plat: "Android · Chrome", ver: "v" });
await feed({ action: "hello", device: "device-anon-0002", name: "", cls: "y2", plat: "iPhone · Safari", ver: "v" });
await feed({ action: "err", device: "device-gil-0001", name: "<img src=x onerror=window.__xss=1>", cls: "y1", msg: "TypeError: " + "x".repeat(280), src: "https://example.com/" + "y".repeat(150) + ".js:1:1", page: "<b>index</b>", plat: "iPhone" });
const T = (await own({ action: "login", code: "OWNERTEST1234567" })).token;
await own({ action: "msgSend", to: "all", text: "<img src=x onerror=window.__xss=1>" + "ז".repeat(70) }, T);

const O = await page(t => localStorage.setItem("ownerToken", t), 1300, "Pacific/Kiritimati"); // UTC+14: בדיקה ששעון ישראל קובע
await O.evaluateOnNewDocument(t => localStorage.setItem("ownerToken", t), T);
await O.goto("http://localhost:8787/owner.html", { waitUntil: "networkidle2" }); await sleep(1200);
const rows = await O.$$eval("#tb tr", l => l.map(x => x.innerText.replace(/\s+/g, " ")));
log(rows.filter(r => r.includes("גיל רז")).length === 1 && rows.some(r => r.includes("גיל רז") && r.includes("2 מכשירים")), "same name with different spaces = one student", rows.join(" | "));
log(rows.filter(r => r.includes("(בלי שם)")).length === 2, "students without a name are separate rows (not merged)", rows.join(" | "));
log(!(await O.evaluate(() => window.__xss)), "no script runs from error reports / log / names");
// שעון ישראל
const ilToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
const lbl = await O.$eval(".chart .c.today small", e => e.textContent);
log(lbl === `${+ilToday.slice(8)}.${+ilToday.slice(5, 7)}`, "chart 'today' is Israel's date even on a far-away clock", lbl + " vs " + ilToday);
const upd = await O.$eval("#upd", e => e.textContent), ilTime = new Date().toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" });
log(upd.includes(ilTime), "'updated at' shows Israel time", upd + " vs " + ilTime);
const gilStatus = await O.$$eval("#tb tr", l => (l.find(x => x.innerText.includes("גיל רז")) || {}).innerHTML || "");
log(gilStatus.includes("d-now"), "student who just said hello shows as online now");
// טיוטה לא נמחקת ברענון
await O.type("#oText", "טיוטה חשובה"); await O.select("#oHrs", "168"); await O.type("#mMsg", "עדכון קטן");
await O.click("#ref"); await sleep(900);
log(await O.$eval("#oText", e => e.value) === "טיוטה חשובה" && await O.$eval("#oHrs", e => e.value) === "168" && await O.$eval("#mMsg", e => e.value) === "עדכון קטן", "refresh keeps what you were typing (message, duration, update-mode text)");
await O.focus("#oText"); await O.evaluate(() => load()); await sleep(600);
log(await O.evaluate(() => document.activeElement && document.activeElement.id === "oText"), "…and keeps the cursor in the box");
// כפתור שנכשל לא נשאר כבוי
failAction = "msgDelete";
const nd = dialogs.length;
await O.click("[data-mdel]"); await sleep(600);
log(!(await O.$eval("[data-mdel]", b => b.disabled)) && dialogs.slice(nd).some(m => m.includes("שגיאה בשרת")), "failed delete: button usable again + message", dialogs.slice(nd).join(" / "));
failAction = "errClear";
await O.click("#errAll"); await sleep(600);
log(!(await O.$eval("#errAll", b => b.disabled)), "failed 'clear all errors': button usable again");
failAction = null;
// השעיה של "בלי שם" אחד בלבד
const anonRow = await O.$$("#tb tr");
let idx = -1; for (let i = 0; i < anonRow.length; i++) if ((await anonRow[i].evaluate(x => x.innerText)).includes("בלי שם")) { idx = i; break; }
await anonRow[idx].$eval("input[type=checkbox]", c => c.click()); await sleep(200);
await O.click("#selSus"); await sleep(300); await O.click("#sGo"); await sleep(1200);
const a1 = await feed({ action: "hello", device: "device-anon-0001", name: "", cls: "y2" }), a2 = await feed({ action: "hello", device: "device-anon-0002", name: "", cls: "y2" });
log((!!a1.susp) !== (!!a2.susp), "suspending one nameless student doesn't suspend the other one", JSON.stringify([a1.susp, a2.susp]));
// השעיה של תלמיד עם 2 מכשירים = שורה אחת, והחזרה מחזירה הכל
const gRow = (await O.$$("#tb tr"));
for (const r of gRow) if ((await r.evaluate(x => x.innerText)).includes("גיל רז")) { await r.click(); break; }
await sleep(400); await O.click("#pSus"); await sleep(300); await O.click("#sGo"); await sleep(1200);
const susTitle = await O.$$eval(".card h2", l => (l.find(x => x.textContent.includes("מושעים")) || {}).textContent || "");
log(susTitle.includes("(2)"), "suspended list: one row per suspension (2), not per device", susTitle);
const g1 = await feed({ action: "hello", device: "device-gil-0002", name: "גיל רז", cls: "y1" }), g9 = await feed({ action: "hello", device: "device-gil-0009", name: "גיל רז", cls: "y1" });
log(!!g1.susp && !!g9.susp, "student is suspended on both devices and by name");
const unsBtns = await O.$$("[data-unsus]");
for (const b of unsBtns) if ((await b.evaluate(x => x.closest(".sus").innerText)).includes("גיל רז")) { await b.click(); break; }
await sleep(1200);
const g1b = await feed({ action: "hello", device: "device-gil-0001", name: "גיל רז", cls: "y1" }), g2b = await feed({ action: "hello", device: "device-gil-0002", name: "גיל רז", cls: "y1" }), g9b = await feed({ action: "hello", device: "device-gil-0009", name: "גיל רז", cls: "y1" });
log(!g1b.susp && !g2b.susp && !g9b.susp, "'restore' from the list clears both devices and the name", JSON.stringify([g1b.susp, g2b.susp, g9b.susp]));
// טלפון 360px: בלי גלילה הצידה, גם עם תקלה ארוכה, יומן ארוך וחלון פרטים
const M = await page(null, 360);
await M.evaluateOnNewDocument(t => localStorage.setItem("ownerToken", t), T);
await M.goto("http://localhost:8787/owner.html", { waitUntil: "networkidle2" }); await sleep(1200);
log(await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "360px: no sideways scroll with long error/log lines", await M.evaluate(() => document.documentElement.scrollWidth + " > " + innerWidth));
await M.click("#tb tr"); await sleep(400);
log(await M.evaluate(() => { const d = document.getElementById("dlgBody"); return d.scrollWidth <= d.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), "360px: student detail fits");
await M.screenshot({ path: "owner-audit-360.png", fullPage: true });
// ניתוק כל המכשירים
await O.goto("http://localhost:8787/owner.html", { waitUntil: "networkidle2" }); await sleep(1000);
await O.click("#outAll"); await sleep(800);
log(!!(await O.$("#code")) && (await O.$eval("#err", e => e.textContent)).includes("נותקת"), "'sign out everywhere' returns to the login screen");
const after = await own({ action: "overview" }, T);
log(after.ok === false && after.error === "auth", "…and the old session no longer works on the server");
await M.reload({ waitUntil: "networkidle2" }); await sleep(800);
log(!!(await M.$("#code")), "…also on the other device (phone)");
console.log("errors:", errs.slice(0, 5)); console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await browser.close();
