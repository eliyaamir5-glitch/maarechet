import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// בדיקה מקצה לקצה: מנהל/מורה שולחים עדכון → מגיע לתלמידים הנכונים באפליקציה (קוד השרת האמיתי, אחסון בזיכרון)
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href);
mod.__useMemoryStore();
const CODE = "TEST-CODE-1234";
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const results = []; const log = (ok, n, x = "") => { results.push(ok); console.log(ok ? "✅" : "❌", n, x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (body, token, path = "/api/staff") => { const res = await H(new Request("http://localhost" + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), { ip: "1.2.3.4" }); return res.json(); };

// צוות: מנהל + מורה
let r = await api({ action: "login", code: CODE }); const adminTok = r.token;
log(r.ok && r.user.role === "admin", "principal signs in with the personal code");
r = await api({ action: "addUser", name: "אורי זרביב" }, adminTok); const tCode = r.code;
r = await api({ action: "login", code: tCode }); const teacherTok = r.token;
log(r.ok && r.user.role === "teacher", "teacher signs in with his code");

// שני תלמידים: י'1 וי'2, האפליקציה פתוחה
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
async function student(cls, name) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument((cls, name) => { localStorage.setItem("profile", JSON.stringify({ first: name, last: "", email: "", cls, eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); }, cls, name);
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" } });
      const res = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json" }, body: q.postData() || undefined }), { ip: "5.5.5.5" });
      return q.respond({ status: res.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await res.text() });
    }
    if (/web3forms/.test(u)) return q.respond({ status: 200, contentType: "application/json", body: "{}", headers: { "Access-Control-Allow-Origin": "*" } });
    q.continue();
  });
  await p.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(800);
  return p;
}
const s1 = await student("y1", "תלמיד-יא"), s2 = await student("y2", "תלמיד-יב");
const popupText = p => p.evaluate(() => [...document.querySelectorAll(".upd-pop .upd.big .upd-text")].map(e => e.textContent).join(" | "));
const listTexts = p => p.evaluate(() => [...document.querySelectorAll("#updates .upd .upd-text")].map(e => e.textContent));
const dismissAll = async p => { for (let i = 0; i < 6; i++) { const b = await p.$(".upd-ok"); if (!b) break; await b.click(); await sleep(1300); } };
// האפליקציה פתוחה ולא נוגעים בה: כמה זמן עד שההודעה קופצת?
async function waitPopup(p, text, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await popupText(p)).includes(text)) return Date.now() - t0; await sleep(500); } return -1; }

// 1. המנהל שולח לכולם – שני התלמידים מקבלים, בלי לרענן (האפליקציה בודקת לבד כל דקה)
await api({ action: "post", text: "הודעה לכולם מהמנהל", minutes: 60, audience: "all" }, adminTok);
const [w1, w2] = await Promise.all([waitPopup(s1, "הודעה לכולם", 70000), waitPopup(s2, "הודעה לכולם", 70000)]);
log(w1 >= 0 && w2 >= 0, "update to everyone pops up for both classes, app left open", `י'1 תוך ${(w1 / 1000).toFixed(0)} שנ', י'2 תוך ${(w2 / 1000).toFixed(0)} שנ'`);
await dismissAll(s1); await dismissAll(s2);
log((await listTexts(s1)).includes("הודעה לכולם מהמנהל") && (await listTexts(s2)).includes("הודעה לכולם מהמנהל"), "after 'הבנתי' it stays at the top of the screen for both");

// 2. המורה שולח רק לי'1 – רק י'1 מקבל
await api({ action: "post", text: "רק לי'1: להביא חוברת", minutes: 30, audience: "y1" }, teacherTok);
for (const p of [s1, s2]) await p.reload({ waitUntil: "networkidle2" }); await sleep(2500);
const p1 = await popupText(s1), p2 = await popupText(s2);
log(p1.includes("רק לי'1") && !p2.includes("רק לי'1"), "teacher's update to י'1 reaches only י'1");
log(await s1.evaluate(() => [...document.querySelectorAll(".upd-pop .upd-who b")].some(b => b.textContent === "אורי זרביב")), "the student sees the teacher's name on it");
await dismissAll(s1); await dismissAll(s2);

// 3. דחוף מגיע ראשון, ושני עדכונים באותו זמן מוצגים שניהם
await api({ action: "post", text: "דחוף: הלימודים מסתיימים ב-12:00", minutes: 60, audience: "all", urgent: true }, adminTok);
await api({ action: "post", text: "עוד הודעה רגילה לכולם", minutes: 60, audience: "all" }, teacherTok);
await s2.reload({ waitUntil: "networkidle2" }); await sleep(2500);
const first = await popupText(s2);
log(first.startsWith("דחוף"), "with two new updates, the urgent one pops first");
await dismissAll(s2);
const l2 = await listTexts(s2);
log(l2[0] && l2[0].startsWith("דחוף") && l2.includes("עוד הודעה רגילה לכולם") && l2.includes("הודעה לכולם מהמנהל"), "all active updates are listed, urgent on top", JSON.stringify(l2));
log(!l2.some(t => t.includes("רק לי'1")), "י'2 never sees the י'1-only update");

// 4. מנהל מסיים עדכון – נעלם אצל התלמידים
r = await api({ action: "list" }, adminTok);
const toEnd = r.updates.find(u => u.text.startsWith("עוד הודעה רגילה"));
await api({ action: "end", id: toEnd.id }, adminTok);
await s2.reload({ waitUntil: "networkidle2" }); await sleep(2000);
log(!(await listTexts(s2)).includes("עוד הודעה רגילה לכולם"), "an update ended by the principal disappears for students");

// 5. ספירת צפיות אצל המנהל
r = await api({ action: "list" }, adminTok);
const v = r.updates.find(u => u.text === "הודעה לכולם מהמנהל").views;
log(v >= 2, "the principal sees how many students opened it", "👁 " + v);

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
