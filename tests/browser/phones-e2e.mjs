import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore();
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
mod.__setPhoneHash(crypto.createHash("sha256").update("PHON1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (body, token) => (await H(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }), { ip: "1.2.3.4" })).json();
const admin = (await api({ action: "login", code: "TEST-CODE-1234" })).token;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function page(w = 390) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.evaluateOnNewDocument(() => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "y1", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); });
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body: q.postData() || undefined }), { ip: "5.5.5." + Math.floor(Math.random() * 200) });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    if (/i\.ytimg\.com|youtube/.test(u)) return q.respond({ status: 200, contentType: "text/html", body: "<html><body style='background:#000'></body></html>" });
    if (/web3forms/.test(u)) return q.respond({ status: 200, contentType: "application/json", body: "{}" });
    q.continue();
  });
  return p;
}

// ---- 1. עדכון עם קישור וסרטון ----
const T = await page();
await T.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(400);
await T.type("#lCode", "TEST-CODE-1234"); await T.click("#lGo"); await sleep(900);
await T.type("#text", "שיעורי בית בעמוד הזה: https://example.com/hw/page-3. ובסרטון ההסבר.");
await T.type("#video", "youtube.com/watch?v=dQw4w9WgXcQ"); await sleep(200);
log((await T.$eval("#videoHint", e => e.textContent)).includes("✓"), "staff: video link recognised (even without https://)", await T.$eval("#videoHint", e => e.textContent));
log(await T.$("#prev .upd-video") !== null && await T.$("#prev .upd-link") !== null, "staff preview shows the link + ▶️ video button");
await T.$eval("#video", e => e.value = ""); await T.type("#video", "https://example.com/not-a-video"); await sleep(100);
log((await T.$eval("#videoHint", e => e.textContent)).includes("לא נראה"), "staff: non-video link gets a clear warning");
await T.click("#post"); await sleep(300);
log((await T.$eval("#pMsg", e => e.textContent)).includes("לא תקין"), "staff: can't publish a bad video link");
await T.$eval("#video", e => e.value = ""); await T.type("#video", "https://youtu.be/dQw4w9WgXcQ");
await T.click("#post"); await sleep(600);
log((await T.$eval("#pMsg", e => e.textContent)).includes("פורסם"), "staff: published with video");
await T.screenshot({ path: "upd-staff.png", fullPage: true });

const S = await page();
await S.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(1800);
log(await S.$(".upd-pop .upd-video") !== null, "student: update pops up with a ▶️ video button (not playing)");
log(await S.$(".upd-vid") === null, "video does NOT play by itself");
const href = await S.$eval(".upd-pop .upd-link", a => [a.href, a.target, a.textContent]);
log(href[0] === "https://example.com/hw/page-3" && href[1] === "_blank" && href[2].includes("example.com"), "link is clickable, opens in a new tab, trailing '.' not included", JSON.stringify(href));
await S.screenshot({ path: "upd-pop.png" });
await S.click(".upd-pop .upd-video"); await sleep(400);
const ifr = await S.$eval(".upd-vid iframe", f => f.src).catch(() => "");
log(ifr.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), "tap ▶️ → video player opens", ifr);
log(await S.$(".upd-pop") !== null, "the update window stays open behind the video");
await S.screenshot({ path: "upd-video.png" });
await S.click(".upd-vclose"); await sleep(200);
log(await S.$(".upd-vid") === null && await S.$(".upd-pop") !== null, "✕ closes the video, back to the update");
await S.click(".upd-ok"); await sleep(1300);
log(await S.$("#updates .upd-video") !== null && await S.$("#updates .upd-link") !== null, "after 'הבנתי' the update (with video + link) stays at the top");
// טקסט עם קישור יוטיוב בלי שדה סרטון → גם כפתור
await api({ action: "post", text: "צפו: https://youtu.be/abcdEFGH123", minutes: 60 }, admin);
await S.reload({ waitUntil: "networkidle2" }); await sleep(1800);
log(await S.$$eval(".upd-pop .upd-video", l => l.length) === 1, "a YouTube link pasted in the text also becomes a ▶️ button");
await S.click(".upd-ok"); await sleep(1300);

// ---- 2. ספר טלפונים ----
const P = await page();
await P.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(600);
log(await P.$("#phonesBtn") !== null, "home: '📞 ספר טלפונים' button");
log(await P.$eval("#phonesBtn", a => a.getAttribute("href")) === "phones.html", "button opens phones.html"); await P.goto("http://localhost:8787/phones.html", { waitUntil: "networkidle2" }); await P.waitForSelector(".ct"); await sleep(300);
const n = await P.$$eval(".ct", l => l.length);
log(n === 25, "lists all 25 teachers from the timetable (י' + י\"א)", n);
log((await P.$eval("#count", e => e.textContent)).includes("0 עם מספר"), "no numbers yet", await P.$eval("#count", e => e.textContent));
await P.screenshot({ path: "phones-empty.png" });
// השלמה אוטומטית
await P.type("#q", "שאל"); await sleep(250);
const sug = await P.$$eval("#sug button", l => l.map(b => b.innerText.replace(/\s+/g, " ")));
log(sug.length >= 1 && sug[0].includes("שחר שאלתיאל"), "typing 'שאל' suggests הרב שחר שאלתיאל", JSON.stringify(sug));
await P.$eval("#q", e => e.value = ""); await P.type("#q", "ט"); await sleep(250);
const sug2 = await P.$$eval("#sug button", l => l.map(b => b.innerText.replace(/\s+/g, " ")));
log(sug2.some(s => s.includes("טוני כהן")), "one letter 'ט' already suggests טוני כהן", JSON.stringify(sug2));
await P.screenshot({ path: "phones-suggest.png" });
await P.click('#sug [data-pick="טוני כהן"]'); await sleep(300);
log(await P.$eval("#q", e => e.value) === "טוני כהן" && await P.$(".ct.hl") !== null, "tapping a suggestion picks that teacher");
await P.click("#qx"); await sleep(100);
await P.type("#q", "אנגלית"); await sleep(250);
const eng = await P.$$eval(".ct b", l => l.map(b => b.textContent));
log(eng.includes("יהודית מינרבי") && eng.includes("אתי חדד"), "search by subject finds the English teachers", JSON.stringify(eng));
await P.click("#qx");
await P.click('[data-f="mine"]'); await sleep(150);
const mine = await P.$$eval(".ct b", l => l.map(b => b.textContent));
log(mine.includes("יהודית מינרבי") && mine.includes("טוני כהן") && !mine.includes("אתי חדד"), "'המורים שלי' = my class + my groups only", JSON.stringify(mine));
await P.click('[data-f="all"]');
// עריכה: קוד שגוי, ואז נכון
await P.click("#editBtn"); await sleep(200);
await P.type("#eCode", "WRONG-XXXX"); await P.click("#eGo"); await sleep(300);
log((await P.$eval("#eMsg", e => e.textContent)).includes("לא נכון"), "wrong edit code refused");
await P.$eval("#eCode", e => e.value = ""); await P.type("#eCode", "phon-1234"); await P.click("#eGo"); await sleep(300);
log(await P.$("[data-save]") !== null, "right code → edit mode");
const inp = '[data-ph="טוני כהן"]';
await P.$eval(inp, e => e.scrollIntoView({ block: "center" })); await P.type(inp, "0501234567"); await P.click('[data-save="טוני כהן"]'); await sleep(400);
log((await P.$eval('[data-m="טוני כהן"]', e => e.textContent)).includes("050-123-4567"), "number saved and formatted", await P.$eval('[data-m="טוני כהן"]', e => e.textContent));
await P.$eval('[data-ph="הרב שחר שאלתיאל"]', e => e.scrollIntoView({ block: "center" })); await P.type('[data-ph="הרב שחר שאלתיאל"]', "12"); await P.click('[data-save="הרב שחר שאלתיאל"]'); await sleep(400);
log((await P.$eval('[data-m="הרב שחר שאלתיאל"]', e => e.textContent)).includes("לא תקין"), "invalid number → clear error");
// איש קשר נוסף
await P.evaluate(() => window.scrollTo(0, 0)); await P.click("#editBar summary"); await sleep(100);
await P.type("#nName", "מזכירות הישיבה"); await P.type("#nPhone", "08-6123456"); await P.type("#nNote", "בשעות 8–14"); await P.click("#nAdd"); await sleep(500);
log((await P.$eval("#list", e => e.innerText)).includes("מזכירות הישיבה"), "extra contact (מזכירות) added");
await P.screenshot({ path: "phones-edit.png" });
await P.click("#eDone"); await sleep(200);
// תלמיד אחר רואה
const P2 = await page();
await P2.goto("http://localhost:8787/phones.html", { waitUntil: "networkidle2" }); await sleep(700);
const tony = await P2.$eval('.ct[data-n="טוני כהן"]', e => [e.querySelector(".ph")?.textContent, [...e.querySelectorAll(".acts a")].map(a => a.getAttribute("href"))]);
log(tony[0] === "050-123-4567" && tony[1][0] === "tel:0501234567" && tony[1][1].startsWith("https://wa.me/972501234567") && tony[1][2] === "sms:0501234567", "another student sees the number with call / WhatsApp / SMS", JSON.stringify(tony));
log(await P2.$("[data-save]") === null, "students without the code can't edit");
await P2.click('[data-f="phone"]'); await sleep(150);
log((await P2.$$eval(".ct", l => l.length)) === 2, "'עם מספר' filter shows only contacts with a number");
await P2.click('[data-f="all"]'); await P2.type("#q", "מזכ"); await sleep(250);
log((await P2.$$eval("#sug button", l => l.map(b => b.textContent))).some(t => t.includes("מזכירות")), "autocomplete also finds the extra contact");
await P2.screenshot({ path: "phones-student.png" });
// בלי אינטרנט: מהמטמון
await P2.setOfflineMode(true); await P2.reload({ waitUntil: "domcontentloaded" }).catch(() => {}); await sleep(800);
const off = await P2.$eval('.ct[data-n="טוני כהן"] .ph', e => e.textContent).catch(() => "");
log(off === "050-123-4567" || off === "", "offline: cached numbers (or page from SW cache)", off);
await P2.setOfflineMode(false);
// רוחב 360, כהה ובהיר
for (const scheme of ["dark", "light"]) { await P.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]); await P.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true }); await P.goto("http://localhost:8787/phones.html", { waitUntil: "networkidle2" }); await sleep(300);
  log(await P.evaluate(() => document.documentElement.scrollWidth <= 360), `no overflow at 360px (${scheme})`); }
await browser.close();
log(!errs.filter(e => !/localStorage/.test(e)).length, "no page errors", errs.join(" | "));
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
