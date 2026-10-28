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
const stud = cls => () => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "__CLS__", eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); };
const S2 = s => new Function(`(${s().toString().replace("__CLS__", "y2")})()`);
const S1 = s => new Function(`(${s().toString().replace("__CLS__", "y1")})()`);

// ---- הצוות ----
const T = await page(null, 1100);
await T.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(400);
await T.type("#lCode", "TEST-CODE-1234"); await T.click("#lGo"); await sleep(900);
const tabs = await T.$$eval("#tabs button", l => l.map(b => b.textContent));
log(["❓ שאלות", "📊 סקרים", "📅 אירועים", "🏃 שחרורים", "📈 נתונים"].every(t => tabs.includes(t)), "staff: 5 new tabs", tabs.join(","));
// סקר
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("סקרים")).click()); await sleep(500);
await T.type("#pQ", "לאן הטיול השנתי?");
const pin = await T.$$("#pOpts input"); await pin[0].type("צפון"); await pin[1].type("דרום"); await pin[2].type("ירושלים");
await T.click("#pGo"); await sleep(600);
log((await T.$eval("#pList", e => e.innerText)).includes("לאן הטיול השנתי?"), "staff creates a poll");
// אירוע
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("אירועים")).click()); await sleep(500);
const ed = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
await T.type("#eT", "שבת אחים"); await T.$eval("#eD", (e, v) => e.value = v, ed); await T.type("#eP", "בית המדרש"); await T.click("#eGo"); await sleep(600);
log((await T.$eval("#eList", e => e.innerText)).includes("שבת אחים"), "staff adds an event");
// עדכון מתוזמן
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("עדכון חדש")).click()); await sleep(500);
await T.type("#text", "תזכורת מתוזמנת לבוקר");
await T.click('#when [data-v="later"]'); await sleep(100);
log(!(await T.$eval("#whenAt", e => e.hidden)) && (await T.$eval("#whenAt", e => e.value)).endsWith("T07:00"), "schedule: 'בזמן אחר' suggests tomorrow 07:00");
await T.click("#post"); await sleep(600);
log((await T.$eval("#pMsg", e => e.textContent)).includes("מתוזמן"), "scheduled message saved", await T.$eval("#pMsg", e => e.textContent));
await T.screenshot({ path: "p2-staff-write.png", fullPage: true });

// ---- תלמיד י'2 ----
const P = await page(S2(stud));
await P.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
const ex = await P.$eval("#extras", e => e.innerText.replace(/\s+/g, " ")).catch(() => "");
log(ex.includes("לאן הטיול השנתי?") && ex.includes("שבת אחים"), "student sees the poll + upcoming event", ex.slice(0, 200));
log(!(await P.$eval("#updates", e => e.innerText)).includes("תזכורת מתוזמנת"), "scheduled message not shown yet");
await P.click(".poll .popt[data-i='1']"); await sleep(800);
log((await P.$$eval(".poll .pres", l => l.length)) === 3 && (await P.$eval(".poll .pres.mine", e => e.textContent)).includes("דרום"), "vote → results bars, my choice marked");
await P.reload({ waitUntil: "networkidle2" }); await sleep(2000);
log((await P.$$eval(".poll .popt", l => l.length)) === 0, "after reload still shows results (can't vote twice)");
// שאלה אנונימית
await P.evaluate(() => document.querySelector("#qaBox details").open = true); await sleep(200);
await P.click("#askBtn"); await sleep(300);
await P.select("#askTo", "אנגלית"); await P.type("#askText", "מה החומר למבחן באנגלית?"); await P.click("#askSend"); await sleep(700);
log(!(await P.$eval("#askDlg", d => d.open)), "question sent (dialog closed)");
// יום הולדת היום
await P.evaluate(() => window.scrollTo(0, 0)); await P.click("#hAvatar"); await sleep(400);
const td = new Date(Date.now() + 3 * 3600e3);
await P.select("#pfBdD", String(td.getUTCDate())); await P.select("#pfBdM", String(td.getUTCMonth() + 1)); await sleep(700);
log((await P.$eval("#pfBdMsg", e => e.textContent)).includes("✓"), "birthday saved (opt-in)", await P.$eval("#pfBdMsg", e => e.textContent));
await P.evaluate(() => document.getElementById("profDlg").close());
await P.screenshot({ path: "p2-student.png", fullPage: true });

// ---- הצוות עונה ----
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("שאלות")).click()); await sleep(600);
log((await T.$eval("#qList", e => e.innerText)).includes("מה החומר למבחן באנגלית?"), "staff sees the anonymous question");
await T.type("#qList textarea", "יחידות 3–4. בהצלחה!"); await T.click("[data-qans]"); await sleep(600);
await T.screenshot({ path: "p2-staff-q.png", fullPage: true });

// ---- תלמיד אחר בי'2 רואה תשובה ויום הולדת; תלמיד י'1 לא רואה את יום ההולדת ----
const Q = await page(S2(stud));
await Q.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
await Q.evaluate(() => document.querySelector("#qaBox details").open = true);
const ex2 = (await Q.$eval("#extras", e => e.innerText) + " " + await Q.$eval("#qaBox", e => e.innerText)).replace(/\s+/g, " ");
log(ex2.includes("יחידות 3–4") && ex2.includes("מה החומר למבחן באנגלית?"), "answer published to the class", ex2.slice(-300));
log(ex2.includes("יום ההולדת של יוסי כהן"), "classmates see the birthday");
await Q.screenshot({ path: "p2-classmate.png", fullPage: true });
const O = await page(S1(stud));
await O.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
const ex3 = await O.$eval("#extras", e => e.innerText.replace(/\s+/g, " "));
log(ex3.includes("יום ההולדת של יוסי") && !ex3.includes("יחידות 3–4"), "whole grade sees the birthday; other class doesn't see y2's answers");

// ---- שחרורון: ההורה חותם → מופיע אצל הצוות ----
const req = { v: 1, n: "יוסי כהן", c: "י'2", d: new Date().toISOString().slice(0, 10), t: "11:00", r: "תור לרופא", x: "", l: "היסטוריה", w: "הרב הראל עובדיה", ts: Date.now() };
const enc = Buffer.from(JSON.stringify(req)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const R = await page();
await R.goto("http://localhost:8787/shichrur.html", { waitUntil: "networkidle2" });
const link = await R.evaluate(q => typeof enc === "function" ? location.href.split("#")[0] + "#p=" + enc(q) : null, req);
if (link) {
  await R.goto(link, { waitUntil: "networkidle2" }); await sleep(800);
  await R.type("#pName", "אבא"); await R.click("#pOk");
  const box = await R.$eval("#sigPad", c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await R.mouse.move(box.x + 30, box.y + 40); await R.mouse.down(); for (let i = 0; i < 20; i++) await R.mouse.move(box.x + 30 + i * 8, box.y + 40 + (i % 2) * 15); await R.mouse.up();
  await R.click("#btnSign"); await sleep(1200);
  log((await R.$eval("#stDone", e => e.innerText)).includes("נרשם גם אצל צוות"), "parent signs → 'נרשם גם אצל צוות הישיבה'");
} else log(false, "could not build parent link");
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("שחרורים")).click()); await sleep(600);
log((await T.$eval("#rList", e => e.innerText)).includes("תור לרופא"), "staff sees the signed release");
// ---- נתונים (פינג יומי אחרי 5 שניות) ----
await sleep(4000);
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("נתונים")).click()); await sleep(600);
const st = await T.$eval("#stBody", e => e.innerText.replace(/\s+/g, " "));
log(/י'2 \d+ תלמידים השתמשו/.test(st) && !/יוסי/.test(st), "principal stats: usage per class, no names", st.slice(0, 160));
await T.screenshot({ path: "p2-stats.png", fullPage: true });
// ---- הזמן מגיע: העדכון המתוזמן מופיע ----
const r0 = await api({ action: "login", code: "TEST-CODE-1234" });
const lst = await (await H(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json", authorization: "Bearer " + r0.token }, body: JSON.stringify({ action: "list" }) }), { ip: "1.2.3.4" })).json();
log(lst.updates.some(u => u.scheduled), "staff list marks it ⏰ scheduled");
await browser.close();
log(!errs.length, "no page errors", errs.join(" | "));
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
