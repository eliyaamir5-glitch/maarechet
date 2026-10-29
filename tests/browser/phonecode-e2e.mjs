import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// staff.html: קוד עריכה חדש לספר הטלפונים, גיבוי, והודעת "שינוי של מורה אחר". השרת = המטפל בזיכרון.
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
const raw = mod.__useMemoryStore();
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
mod.__setPhoneHash(crypto.createHash("sha256").update("PHON1234").digest("hex"));
const H = mod.default;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const call = async (p, body, token, ip = "1.2.3.4") => (await H(new Request("http://localhost" + p, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }), { ip })).json();
const res = []; const ok = (n, c, x = "") => { res.push(!!c); console.log(c ? "✅" : "❌", n, c ? "" : x); };

const admin = (await call("/api/staff", { action: "login", code: "TEST-CODE-1234" })).token;
let r = await call("/api/staff", { action: "addUser", name: "מורה א" }, admin); const tA = (await call("/api/staff", { action: "login", code: r.code })).token;
r = await call("/api/staff", { action: "addUser", name: "מורה ב" }, admin); const codeB = r.code;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [], bad = [];
async function page(token, w = 390) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (token) await p.evaluateOnNewDocument(t => localStorage.setItem("staffToken", t), token);
  p.on("pageerror", e => errs.push(e.message));
  p.on("response", x => { if (x.status() >= 400 && !/\/api\//.test(x.url())) bad.push(x.status() + " " + x.url()); });
  p.dialogs = []; p.on("dialog", d => { p.dialogs.push(d.message()); d.accept(); });
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body: q.postData() || undefined }), { ip: "5.5.5.5" });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    if (/netlify\.app/.test(u)) return q.abort();
    q.continue();
  });
  return p;
}

// ---- 1. מנהל: לשונית צוות → קוד חדש לספר הטלפונים ----
const A = await page(admin);
await A.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(500);
await A.click('#tabs button[data-t="team"]'); await sleep(700);
ok("principal sees the phone-code card", await A.$("#pcNew") !== null);
ok("…which says the old code is still in use", (await A.$eval("#pcInfo", e => e.textContent)).includes("הקוד הישן"));
ok("…button text", (await A.$eval("#pcNew", e => e.textContent)) === "צור קוד עריכה חדש לספר הטלפונים");
ok("old code works before", (await call("/api/contacts", { action: "check", code: "PHON-1234" }, null, "9.0.0.1")).ok);
await A.click("#pcNew"); await sleep(800);
ok("confirm dialog explains the old code stops working", A.dialogs.some(m => m.includes("הקוד הקודם יפסיק לעבוד") && m.includes("רק פעם אחת")), JSON.stringify(A.dialogs));
const shown = await A.$eval("#pcCode", e => e.textContent).catch(() => "");
ok("new code is shown once, 12 chars", /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(shown), shown);
ok("copy button is there", await A.$("#pcCpy") !== null);
ok("button is enabled again", await A.$eval("#pcNew", e => !e.disabled));
ok("status now shows the date and who", (await A.$eval("#pcInfo", e => e.textContent)).includes("נוצר ב-"));
ok("server: old code refused", (await call("/api/contacts", { action: "check", code: "PHON-1234" }, null, "9.0.0.2")).error === "bad_code");
ok("server: shown code works", (await call("/api/contacts", { action: "check", code: shown }, null, "9.0.0.3")).ok);
ok("plain code not stored", !raw.get("config").includes(shown.replace(/-/g, "")));
await A.screenshot({ path: path.join(HERE, "phonecode-team.png"), fullPage: true });
// ביטול בדיאלוג = לא נוצר קוד
A.removeAllListeners("dialog"); A.on("dialog", d => d.dismiss());
const before = raw.get("config");
await A.click("#pcNew"); await sleep(500);
ok("cancel in the dialog keeps the current code", raw.get("config") === before);

// ---- 2. גיבוי ----
const dl = path.join(HERE, "dl-backup"); fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl);
const cdp = await A.createCDPSession(); await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
await call("/api/feed", { action: "release", name: "תלמיד לגיבוי", cls: "y1", reason: "רופא" }, null, "9.0.0.9");
await A.click("#bkGo"); let file = null;
for (let i = 0; i < 30 && !file; i++) { await sleep(200); file = fs.readdirSync(dl).find(f => f.endsWith(".json")); }
ok("backup downloads a JSON file", !!file && /^maarechet-backup-\d{4}-\d{2}-\d{2}\.json$/.test(file), file);
if (file) {
  const txt = fs.readFileSync(path.join(dl, file), "utf8"), b = JSON.parse(txt);
  ok("backup contains users, releases, contacts", b.users.length === 3 && b.releases.some(x => x.name === "תלמיד לגיבוי") && Array.isArray(b.contacts));
  ok("backup has no hashes / salts / secrets", !/"(hash|salt|secret)"/.test(txt));
}
ok("success message shown", (await A.$eval("#bkMsg", e => e.textContent)).includes("הקובץ ירד"));

// ---- 3. מורה: אין כרטיסים של מנהל; שינוי של מורה אחר → הודעה ברורה ----
// יום בדיקה: בעוד יומיים, ואם זה שישי/שבת (אין שיעורים) – היום הבא שיש בו שיעורים
const ilDay = n => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(Date.now() + 864e5 * n);
let dAhead = 2; while ([5, 6].includes(new Date(ilDay(dAhead) + "T12:00:00Z").getUTCDay())) dAhead++;
const day = ilDay(dAhead);
const B = await page(null);
await B.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(400);
await B.type("#lCode", codeB); await B.click("#lGo"); await sleep(800);
ok("teacher has no team tab", !(await B.$('#tabs button[data-t="team"]')));
ok("teacher: backup action refused by server", (await call("/api/staff", { action: "backup" }, tA)).error === "forbidden");
await B.click('#tabs button[data-t="chg"]'); await sleep(500);
await B.$eval("#cD", (e, d) => { e.value = d; e.dispatchEvent(new Event("change")); }, day); await sleep(200);
const opt = await B.evaluate(() => { const x = chgOpts[+document.getElementById("cL").value]; return x ? { s: x.s, n: x.n, w: x.w || "", cls: x.shared ? "all" : chgCls } : null; });
ok("teacher sees lessons for the chosen day", !!opt, day);
if (opt) {
  await call("/api/staff", { action: "changeCreate", date: day, cls: opt.cls, s: opt.s, n: opt.n, w: opt.w, kind: "cancel" }, tA);
  await B.click("#cGo"); await sleep(600);
  const m = await B.$eval("#cMsg", e => e.textContent);
  ok("teacher B gets a clear message when A already changed that lesson", m.includes("מורה אחר פרסם"), m);
  ok("publish button enabled again after the error", await B.$eval("#cGo", e => !e.disabled));
  const today = await B.$eval("#cD", e => e.value);
  ok("date field in Israel time", today === day);
}
await B.click("#cToday"); await sleep(100);
ok("'today' button uses the Israel date", (await B.$eval("#cD", e => e.value)) === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(Date.now()));

console.log("page errors:", errs.slice(0, 5), "http errors:", [...new Set(bad)].slice(0, 5));
ok("no page errors", errs.length === 0);
await browser.close();
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
process.exit(res.every(Boolean) ? 0 : 1);
