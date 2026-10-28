import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore(); mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") }); mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
const own = async b => (await H(new Request("http://localhost/api/owner", { method: "POST", headers: { "Content-Type": "application/json", ...(OT ? { authorization: "Bearer " + OT } : {}) }, body: JSON.stringify(b) }), { ip: "9.9.9.9" })).json();
let OT = null; OT = (await own({ action: "login", code: "OWNERTEST1234567" })).token;
const prof = new Function(`localStorage.setItem("profile", JSON.stringify({ first: "רון", last: "בדיקה", cls: "y1", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("bday", JSON.stringify({optOut:true}));`);
const S = await page(prof, 390);
await S.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
let ov = await own({ action: "overview" }); const ron = ov.students.find(s => s.name === "רון בדיקה");
log(!!ron && ron.plat && ron.cls === "y1", "student shows up on the owner page after opening the app");
// מצב עדכון
await own({ action: "maint", on: true, minutes: 30, msg: "שדרוג" });
await S.reload({ waitUntil: "networkidle2" }); await sleep(2500);
log(await S.evaluate(() => document.body.classList.contains("maint") && document.getElementById("maintBar").innerText.includes("בעדכון") && document.getElementById("maintBar").innerText.includes("שדרוג")), "maintenance bar shows with the message");
log(await S.evaluate(() => { const h = document.getElementById("hero").getBoundingClientRect(), u = document.getElementById("updates").getBoundingClientRect(); return h.height > 50 && getComputedStyle(document.querySelector(".actions")).pointerEvents === "none"; }), "timetable stays visible; other areas are locked");
await own({ action: "maint", on: false });
await S.reload({ waitUntil: "networkidle2" }); await sleep(2500);
log(await S.evaluate(() => !document.body.classList.contains("maint")), "maintenance off → back to normal");
// הודעה אישית
await own({ action: "msgSend", to: "some", keys: [ron.key], people: [{ name: "רון בדיקה", cls: "y1" }], names: ["רון בדיקה"], text: "<b>היי</b> רון", hours: 24 });
await S.reload({ waitUntil: "networkidle2" }); await sleep(2500);
const om = await S.$eval("#ownBox", e => e.innerText).catch(() => "");
log(om.includes("<b>היי</b> רון") && om.includes("ממנהל המערכת"), "personal message shows (as plain text)");
await S.click("[data-omread]"); await sleep(300);
log(!(await S.$eval("#ownBox", e => e.innerText)).includes("רון"), "'קראתי' hides the message");
// השעיה
await own({ action: "suspend", keys: [ron.key], people: [{ name: "רון בדיקה", cls: "y1" }], minutes: null, reason: "הפרה" });
await S.reload({ waitUntil: "networkidle2" }); await sleep(2500);
log(await S.evaluate(() => { const w = document.getElementById("suspWall"); return !!w && w.innerText.includes("הוריד לך את הזכות") && w.innerText.includes("הפרה") && w.innerText.includes("כשמנהל המערכת יחזיר"); }), "suspended student sees the block screen (reason, until restored)");
log(await S.evaluate(() => { const r = document.getElementById("suspWall").getBoundingClientRect(); const el = document.elementFromPoint(innerWidth / 2, innerHeight - 30); return r.width >= innerWidth && document.getElementById("suspWall").contains(el); }), "block screen covers everything (can't tap the app)");
await S.reload({ waitUntil: "domcontentloaded" }); await sleep(400);
log(await S.evaluate(() => !!document.getElementById("suspWall")), "block shows instantly on reopen (before the server answers)");
await own({ action: "unsuspend", keys: [ron.key], people: [{ name: "רון בדיקה", cls: "y1" }] });
await S.reload({ waitUntil: "networkidle2" }); await sleep(2500);
log(await S.evaluate(() => !document.getElementById("suspWall")), "restored student gets the app back");
console.log("errors:", errs.slice(0, 5)); console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await browser.close();
