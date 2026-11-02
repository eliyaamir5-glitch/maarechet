import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לעדכון אוטומטי: טלפון עם גרסה ישנה מקבל את החדשה לבד (בלי לנקות מטמון ידנית)
// מעתיקים את האפליקציה לתיקייה זמנית, פותחים, ואז "מעלים גרסה חדשה" ובודקים שהיא מגיעה
import puppeteer from "puppeteer-core";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import http from "node:http";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
for (const f of fs.readdirSync(ROOT)) if (/\.(html|js|json|png|webmanifest)$/.test(f)) fs.copyFileSync(path.join(ROOT, f), path.join(DIR, f));
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
// כמו GitHub Pages: מותר לשמור עותק 10 דקות
const srv = http.createServer((q, s) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(DIR, p);
  if (!f.startsWith(DIR) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "max-age=600" }); fs.createReadStream(f).pipe(s); }).listen(8796, "127.0.0.1");
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (window.name === "s") return; window.name = "s"; localStorage.setItem("profile", JSON.stringify({ first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("asstGreeted", "1"); });
await p.setRequestInterception(true); p.on("request", q => /^http:\/\/localhost:8796/.test(q.url()) ? q.continue() : q.abort());
await p.goto("http://localhost:8796/index.html", { waitUntil: "domcontentloaded" }); await sleep(3500);
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(2500);
const v1 = await p.evaluate(() => APP_VERSION), ctl = await p.evaluate(() => !!navigator.serviceWorker.controller);
log(ctl, "service worker is controlling the page (offline-ready)");
// "מעלים" גרסה חדשה לשרת
const NEWV = "2099-01-01.1";
fs.writeFileSync(path.join(DIR, "data.js"), fs.readFileSync(path.join(DIR, "data.js"), "utf8").replace(/APP_VERSION="[^"]+"/, `APP_VERSION="${NEWV}"`));
fs.writeFileSync(path.join(DIR, "sw.js"), fs.readFileSync(path.join(DIR, "sw.js"), "utf8").replace(/const CACHE = "[^"]+"/, 'const CACHE = "maarechet-test-new"'));
// האפליקציה פתוחה: מוצאת את הגרסה החדשה לבד – אבל לא מרעננת באמצע שימוש
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await sleep(6000);
const still = await p.evaluate(() => APP_VERSION);
log(still === v1 && !(await p.evaluate(() => /מעדכן/.test(document.body.innerText))), "while the student is using the app: no jump, no 'updating' message");
// התלמיד יוצא מהאפליקציה לרגע (למשל לוואטסאפ) – שם מתבצע העדכון
await p.evaluate(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
let v2 = v1; for (let i = 0; i < 30 && v2 !== NEWV; i++) { await sleep(1000); v2 = await p.evaluate(() => typeof APP_VERSION !== "undefined" ? APP_VERSION : "").catch(() => v2); }
log(v2 === NEWV, "new version gets in silently in the background (no manual refresh)", `${v1} → ${v2}`);
await sleep(2500);
const keys = await p.evaluate(async () => (await caches.keys()).join(","));
log(/maarechet-test-new/.test(keys), "new cache is in place", keys);
// אין לולאת רענונים
const t0 = await p.evaluate(() => performance.timeOrigin); await sleep(6000); const t1 = await p.evaluate(() => performance.timeOrigin);
log(t0 === t1, "no reload loop after updating");
// הודעה חדשה מהמנהל מופיעה תוך ~20 שניות, בלי לצאת מהאפליקציה
{ const p2 = await b.newPage(); await p2.setViewport({ width: 390, height: 844 }); p2.on("pageerror", e => errs.push(e.message));
  let msgs = []; const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  await p2.setRequestInterception(true);
  p2.on("request", q => { const u = q.url();
    if (/\/api\/feed/.test(u) && q.method() === "GET") return q.respond({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify({ ok: true, now: Date.now(), updates: [], polls: [], events: [], answers: [], birthdays: [], changes: [], msgs }) });
    if (/\/api\//.test(u)) { if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H }); return q.respond({ status: 200, contentType: "application/json", headers: H, body: '{"ok":true}' }); }
    return /^http:\/\/localhost:8796/.test(u) ? q.continue() : q.abort(); });
  await p2.evaluateOnNewDocument(() => { localStorage.setItem("feedOk", "1"); });
  await p2.goto("http://localhost:8796/index.html", { waitUntil: "domcontentloaded" }); await sleep(4000);
  msgs = [{ id: "m1", text: "מחר אין לימודים בשעה הראשונה", to: "y1", at: Date.now(), exp: Date.now() + 864e5, from: "principal" }, { id: "m2", text: "הודעה לכיתה אחרת", to: "y2", at: Date.now(), exp: Date.now() + 864e5 }];
  let shown = ""; for (let i = 0; i < 30 && !/אין לימודים/.test(shown); i++) { await sleep(1000); shown = await p2.$eval("#ownBox", e => e.innerText).catch(() => ""); }
  log(/אין לימודים בשעה הראשונה/.test(shown), "new message from the principal appears within ~20s without leaving the app", shown);
  log(!/לכיתה אחרת/.test(shown), "…only messages for my class");
  await p2.close(); }
console.log("errors:", errs.slice(0, 5)); log(errs.length === 0, "no page errors", errs.join(" | "));
console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close(); srv.close(); fs.rmSync(DIR, { recursive: true, force: true });
