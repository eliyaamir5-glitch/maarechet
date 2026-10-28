import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore(); mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (body, token) => (await H(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }), { ip: "1.2.3.4" })).json();
const tok = (await api({ action: "login", code: "TEST-CODE-1234" })).token;
await api({ action: "post", text: "מחר יום ספורט! להביא בגדי ספורט", minutes: 600, audience: "all" }, tok);
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
const stud = (first, cls) => new Function(`localStorage.setItem("profile", JSON.stringify({ first: "${first}", last: "כהן", cls: "${cls}", eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("bday", JSON.stringify({optOut:true})); localStorage.setItem("updSeen", "[]");`);
const P = await page(stud("יוסי", "y2"));
await P.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
// סוגרים חלון "עדכון חדש" אם קפץ
for (let i = 0; i < 3; i++) { const okb = await P.$(".upd-ok"); if (okb) { await okb.click(); await sleep(900); } }
log(!!(await P.$("#updates .upd-radd")), "update shows the react button");
await P.click("#updates .upd-radd"); await sleep(300);
log(!!(await P.$(".upd-pick")), "emoji picker opens");
await P.evaluate(() => [...document.querySelectorAll(".upd-pgrid button")].find(b => b.textContent === "🔥").click()); await sleep(900);
log((await P.$eval("#updates .upd-rc.mine", e => e.textContent)).includes("🔥 1"), "my reaction shows as 🔥 1");
await P.reload({ waitUntil: "networkidle2" }); await sleep(2200);
log((await P.$eval("#updates .upd-rc.mine", e => e.textContent).catch(() => "")).includes("🔥 1"), "reaction survives reload (from server)");
const Q = await page(stud("דנה", "y1"));
await Q.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(2500);
for (let i = 0; i < 3; i++) { const okb = await Q.$(".upd-ok"); if (okb) { await okb.click(); await sleep(900); } }
await Q.click("#updates .upd-radd"); await sleep(300);
await Q.screenshot({ path: "rx-picker.png" });
await Q.type(".upd-prow input", "abc"); await Q.click(".upd-pgo"); await sleep(200);
log((await Q.$eval(".upd-pmsg", e => e.textContent)).includes("רק אימוג'י"), "letters are refused in the picker");
await Q.evaluate(() => { document.querySelector(".upd-prow input").value = "🇮🇱"; }); await Q.click(".upd-pgo"); await sleep(900);
const qt = await Q.$eval("#updates .upd-react", e => e.innerText.replace(/\s+/g, " "));
log(qt.includes("🇮🇱 1") && qt.includes("🔥 1"), "any emoji from the keyboard works; sees others' counts", qt);
await Q.click("#updates .upd-rc.mine"); await sleep(900);
log(!(await Q.$eval("#updates .upd-react", e => e.innerText)).includes("🇮🇱"), "tapping my reaction removes it");
await Q.click("#updates .upd-radd"); await sleep(300);
await Q.evaluate(() => [...document.querySelectorAll(".upd-pgrid button")].find(b => b.textContent === "😂").click()); await sleep(900);
// הצוות רואה מי הגיב
const T = await page(t => localStorage.setItem("staffToken", t), 1100);
await T.evaluateOnNewDocument(t => localStorage.setItem("staffToken", t), tok);
await T.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(900);
await T.click('#tabs button[data-t="list"]'); await sleep(900);
await T.evaluate(() => document.querySelector(".rx").open = true);
await T.screenshot({ path: "rx-staff.png", clip: { x: 0, y: 0, width: 1100, height: 700 } });
const rx = await T.$eval(".rx", e => e.innerText.replace(/\s+/g, " "));
log(rx.includes("🔥 יוסי כהן") && rx.includes("😂 דנה כהן") && rx.includes("י'1"), "staff sees who reacted with what (name + class)", rx);
// שאלה → תשובה → הודעה אישית
await P.evaluate(() => document.querySelector("#qaBox details").open = true); await sleep(200);
await P.click("#askBtn"); await sleep(300); await P.type("#askText", "מתי המבחן בתנ\"ך?"); await P.click("#askSend"); await sleep(800);
const ql = await api({ action: "qList" }, tok); const qq = ql.questions.find(q => q.text.includes("תנ"));
await api({ action: "qAnswer", id: qq.id, answer: "ביום שלישי." }, tok);
await P.reload({ waitUntil: "networkidle2" }); await sleep(2500);
let ex = await P.$eval("#extras", e => e.innerText);
await P.screenshot({ path: "rx-student.png" });
log(ex.includes("הצוות ענה על השאלה שלך") && ex.includes("ביום שלישי"), "asker gets 'staff answered your question' at the top");
const exQ = await Q.$eval("#extras", e => e.innerText);
log(!exQ.includes("ענה על השאלה שלך"), "other students don't get the personal notice");
await P.click("[data-readq]"); await sleep(400);
log(!(await P.$eval("#extras", e => e.innerText)).includes("ענה על השאלה שלך"), "'קראתי' hides it");
console.log("errors:", errs.slice(0, 5)); console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await browser.close();
