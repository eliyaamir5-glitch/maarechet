import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// Throwaway UI audit: staff.html at 360px, all API calls routed to the in-memory handler. No network to netlify.
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href);
mod.__useMemoryStore();
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (body, token, path = "/api/staff") => { const res = await H(new Request("http://localhost" + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), { ip: "1.2.3.4" }); return res.json(); };
let r = await api({ action: "login", code: "TEST-CODE-1234" }); const tok = r.token;
await api({ action: "addUser", name: "מורה עם שם ארוך מאוד מאוד מאוד מאוד מאוד מאוד" }, tok);
await api({ action: "post", text: "x".repeat(300), minutes: 60, video: "https://youtu.be/abcdefghijk" }, tok);
await api({ action: "release", name: "שם", cls: "y1", date: "__proto__", reason: "r" }, null, "/api/feed");
await api({ action: "ask", text: "שאלה?" }, null, "/api/feed");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await browser.newPage();
await p.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
await p.evaluateOnNewDocument(t => localStorage.setItem("staffToken", t), tok);
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.setRequestInterception(true);
p.on("request", async q => {
  const u = q.url();
  if (/netlify\.app\/api\//.test(u)) {
    if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
    const res = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(q.headers().authorization ? { authorization: q.headers().authorization } : {}) }, body: q.postData() || undefined }), { ip: "5.5.5.5" });
    return q.respond({ status: res.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await res.text() });
  }
  if (/netlify\.app/.test(u)) return q.abort();
  q.continue();
});
await p.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(800);
const res = []; const ok = (n, c) => { res.push([n, !!c]); console.log(c ? "✅" : "❌", n); };
let dlg = []; p.on("dialog", d => { dlg.push(d.message()); d.accept(); });
await api({ action: "birthday", device: "device-zzzz-9999", name: "יוסי בדיקה", cls: "y1", md: "03-05" }, null, "/api/feed");
const tabs = await p.$$eval("#tabs button", b => b.map(x => x.dataset.t)); console.log("tabs", tabs.join(","));
ok("schedule field visible (server caps)", await p.evaluate(() => !document.getElementById("when").hidden));
// questions: hide → hidden filter → restore
await p.click('#tabs button[data-t="q"]').catch(() => {}); await sleep(700);
const qt = tabs.find(t => /q/.test(t)); if (qt) { await p.click(`#tabs button[data-t="${qt}"]`); await sleep(700); }
dlg = []; await p.click("[data-qhide]"); await sleep(700);
ok("hide asks first", dlg.some(m => m.includes("להסתיר")));
await p.click('#qF button[data-v="hidden"]'); await sleep(700);
ok("hidden filter lists it", await p.$("[data-qrest]"));
await p.click("[data-qrest]"); await sleep(700);
await p.click('#qF button[data-v="new"]'); await sleep(700);
ok("restored back to new", await p.$("[data-qhide]"));
// stats → birthdays
const st = tabs.find(t => /stat/.test(t)); await p.click(`#tabs button[data-t="${st}"]`); await sleep(900);
ok("birthday listed", await p.$eval("#bdBox", e => e.innerText.includes("יוסי בדיקה")));
dlg = []; await p.click("[data-bdel]"); await sleep(800);
ok("birthday removed after confirm", dlg.length && await p.$eval("#bdBox", e => !e.innerText.includes("יוסי בדיקה")));
// updates list: delete asks; failure keeps button usable
const lt = tabs.find(t => /list|upd/.test(t)); await p.click(`#tabs button[data-t="${lt}"]`); await sleep(800);
p.removeAllListeners("dialog"); p.on("dialog", d => { dlg.push(d.message()); d.dismiss(); });
dlg = []; await p.click("[data-del]"); await sleep(500);
ok("delete cancel keeps update", dlg.length && await p.$("[data-del]"));
const rt = tabs.find(t => /rel/.test(t)); await p.click(`#tabs button[data-t="${rt}"]`); await sleep(800);
ok("releases show verify note", await p.evaluate(() => document.querySelector("main").innerText.includes("לוודא מול ההורה")));
console.log("errors:", errs.slice(0, 5)); console.log(`${res.filter(x => x[1]).length}/${res.length}`);
await browser.close();
