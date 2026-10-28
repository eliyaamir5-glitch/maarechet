import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// מקצה לקצה: מורה מפרסם סט מ-staff.html → תלמיד י'1 רואה ולומד (חזרה חכמה, כתיבה, כוכבים) → תלמיד י'2 לא רואה
import puppeteer from "puppeteer-core";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(ROOT + "/netlify/functions/staff.mjs").href + "?v=" + Date.now());
mod.__useMemoryStore();
mod.__setInviteHash(crypto.createHash("sha256").update("TESTCODE1234").digest("hex"));
const H = mod.default;
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (body, token) => (await H(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }), { ip: "1.2.3.4" })).json();
let r = await api({ action: "login", code: "TEST-CODE-1234" }); const adminTok = r.token;
r = await api({ action: "addUser", name: "המורה לאנגלית" }, adminTok); const tCode = r.code;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
async function page(setup) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  if (setup) await p.evaluateOnNewDocument(setup.fn, ...setup.args);
  await p.setRequestInterception(true);
  p.on("request", async q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
      const h = q.headers();
      const rr = await H(new Request(u.replace(/^https:\/\/[^/]+/, "http://localhost"), { method: q.method(), headers: { "Content-Type": "application/json", ...(h.authorization ? { authorization: h.authorization } : {}) }, body: q.postData() || undefined }), { ip: "5.5.5.5" });
      return q.respond({ status: rr.status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: await rr.text() });
    }
    q.continue();
  });
  return p;
}
const tap = async (p, sel) => { await p.$eval(sel, e => e.scrollIntoView({ block: "center" })); await p.click(sel); };
const typeCard = async (p, words) => { for (const w of words) { await p.keyboard.type(w); await p.keyboard.press("Enter"); } };

// ---- 1. המורה מפרסם ----
const T = await page();
await T.goto("http://localhost:8787/staff.html", { waitUntil: "networkidle2" }); await sleep(500);
await T.type("#lCode", tCode); await tap(T, "#lGo"); await sleep(800);
await T.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.textContent.includes("כרטיסיות")).click()); await sleep(600);
log(await T.$eval("#setList", e => e.textContent.includes("עוד לא פורסמו")), "teacher sees the flashcards tab (empty)");
await tap(T, "#sNew"); await sleep(300);
await T.type("#sTitle", "אנגלית – יחידה 4"); await T.type("#sSubj", "אנגלית");
await T.evaluate(() => [...document.querySelectorAll("#sAud button")].find(b => b.dataset.v === "y1").click());
await T.click("#sCards .ec-t"); await typeCard(T, ["environment", "סביבה", "pollution", "זיהום"]);
// הדבקה מטבלה (טאב) לתוך השדה הריק
await T.evaluate(() => { const t = [...document.querySelectorAll("#sCards .ec-t")].at(-1); const dt = new DataTransfer(); dt.setData("text", "protect\tלהגן\nincrease\tלהגדיל, לעלות\nsolution\tפתרון"); t.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); });
log((await T.$eval("#sCount", e => e.textContent)).includes("5"), "editor: typed 2 + pasted a 3-row table = 5 cards", await T.$eval("#sCount", e => e.textContent));
await T.screenshot({ path: "staff-sets-edit.png", fullPage: true });
await tap(T, "#sSave"); await sleep(800);
const okMsg = await T.$eval("main", e => e.textContent);
log(okMsg.includes("פורסם") && okMsg.includes("אנגלית – יחידה 4") && okMsg.includes("י'1"), "published, and it's listed");
await T.screenshot({ path: "staff-sets-list.png" });

// ---- 2. תלמיד י'1 ----
const prof = cls => ({ fn: (c) => { localStorage.setItem("profile", JSON.stringify({ first: "תלמיד", last: "", cls: c, eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" })); }, args: [cls] });
const S1 = await page(prof("y1"));
await S1.goto("http://localhost:8787/cards.html", { waitUntil: "networkidle2" }); await sleep(800);
const cls1 = await S1.$eval("#classSets", e => e.innerText);
log(cls1.includes("אנגלית – יחידה 4") && cls1.includes("חדש") && cls1.includes("המורה לאנגלית"), "י'1 student sees the teacher's set marked 'new'", cls1.replace(/\s+/g, " ").slice(0, 120));
await S1.screenshot({ path: "cards-home.png" });
const tid = await S1.$eval("#classSets .set", e => e.dataset.id);
await S1.evaluate(id => document.querySelector(`.set[data-id="${id}"]`).click(), tid); await sleep(300);
log((await S1.$eval("#mDue", e => e.textContent)).includes("5"), "smart review: 5 to practice today", await S1.$eval("#mDue", e => e.textContent));
log((await S1.$eval("#sInfo", e => e.textContent)).includes("מאת המורה לאנגלית"), "set shows the teacher's name");
// כוכב על שני כרטיסים
await S1.evaluate(() => { const b = document.querySelectorAll("#sList .st"); b[0].click(); b[2].click(); });
log(!(await S1.$eval("#starTog", e => e.hidden)) && (await S1.$eval("#starN", e => e.textContent)) === "(2)", "starring 2 cards shows the 'only starred' toggle");
await S1.screenshot({ path: "cards-set.png", fullPage: true });
// חזרה חכמה: יודע 4, לא יודע 1 → הכרטיס שלא ידע חוזר באותו סיבוב
await tap(S1, "#mSmart"); await sleep(200);
const seen = [];
for (let k = 0; k < 12 && await S1.$eval("#vFlash", e => !e.hidden); k++) {
  const term = await S1.$eval("#fFront", e => e.lastChild.textContent); seen.push(term);
  const miss = term === "pollution" && seen.filter(x => x === "pollution").length === 1;
  await S1.click(miss ? "#fNo" : "#fYes"); await sleep(80);
}
log(seen.filter(x => x === "pollution").length === 2 && seen.length === 6, "missed card comes back in the same round", seen.join(","));
log((await S1.$eval("#dTitle", e => e.textContent)).includes("סיימת את החזרה") && (await S1.$eval("#dMsg", e => e.textContent)).includes("מחר"), "end of round: next round tomorrow", await S1.$eval("#dMsg", e => e.textContent));
await tap(S1, "#dBack"); await sleep(200);
log((await S1.$eval("#mDue", e => e.textContent)).includes("הכל חזור"), "nothing left for today after the round");
// מחר: רק מה שהגיע זמנו (כל ה-5 בקופסה 1 → חוזרים מחר)
await S1.evaluate(() => { const p = JSON.parse(localStorage.cardsProg); for (const s of Object.values(p)) for (const r of Object.values(s.c)) if (r.due) r.due -= 864e5; localStorage.cardsProg = JSON.stringify(p); });
await S1.reload({ waitUntil: "networkidle2" }); await sleep(500);
log((await S1.$eval("#classSets", e => e.innerText)).includes("5 לחזרה"), "next day: the home list shows '5 לחזרה'");
await S1.evaluate(id => document.querySelector(`.set[data-id="${id}"]`).click(), tid); await sleep(200);
// רק מסומנים + כתיבת תשובה
await S1.click("#starOnly"); await sleep(100);
await tap(S1, "#mWrite"); await sleep(200);
log(await S1.$eval("#wPos", e => e.textContent) === "1 / 2", "only-starred: writing mode has just the 2 starred cards");
const answers = { environment: "סביבה", protect: "להגן", pollution: "זיהום", increase: "להגדיל", solution: "פתרון" };
// "סביבה" (5 אותיות): טעות כתיב קטנה ובלי אות סופית → "כמעט". "להגן" (4 אותיות – קצר מדי לסלחנות): תשובה אחרת → "בעצם צדקתי"
for (let k = 0; k < 2; k++) {
  const q = await S1.$eval("#wQ", e => e.textContent);
  if (q === "environment") {
    await S1.type("#wIn", "סביבא"); await S1.keyboard.press("Enter"); await sleep(150);
    log(await S1.$eval("#wFb", e => e.className.includes("almost") && e.textContent.includes("כמעט")), "small typo counts as 'almost' (correct)", q + " → סביבא");
    await S1.keyboard.press("Enter"); await sleep(150);
  } else {
    await S1.type("#wIn", "משהו אחר"); await S1.keyboard.press("Enter"); await sleep(150);
    log(await S1.$eval("#wFb", (e, a) => e.className.includes("no") && e.textContent.includes(a), answers[q]) && !(await S1.$eval("#wOver", e => e.hidden)), "wrong answer shows the right one + 'בעצם צדקתי'", q);
    await S1.click("#wOver"); await sleep(200);
  }
}
log((await S1.$eval("#dTitle", e => e.textContent)).startsWith("2 מתוך 2"), "'בעצם צדקתי' counts it as correct", await S1.$eval("#dTitle", e => e.textContent));
// תשובה עם כמה אפשרויות: "להגדיל, לעלות" – גם "לעלות" לבד מתקבל
await tap(S1, "#dBack"); await S1.click("#starOnly"); await sleep(100);
const judged = await S1.evaluate(() => [judge("לעלות", "להגדיל, לעלות"), judge("photosynthesis", "Photosynthesis"), judge("סביבה", "סְבִיבָה"), judge("x", "y"), judge("Paris", "פריז (Paris)")]);
log(JSON.stringify(judged) === '["ok","ok","ok","no","ok"]', "answer checking: options, case, nikud", JSON.stringify(judged));
await S1.screenshot({ path: "cards-set2.png" });

// ---- 3. תלמיד י'2 לא רואה ----
const S2 = await page(prof("y2"));
await S2.goto("http://localhost:8787/cards.html", { waitUntil: "networkidle2" }); await sleep(800);
log(!(await S2.$eval("#classSets", e => e.innerText)).includes("יחידה 4"), "י'2 student does not see the י'1 set");

// ---- 4. המורה מתקן כרטיס – ההתקדמות של השאר נשמרת ----
const list = (await api({ action: "setsList" }, (await api({ action: "login", code: tCode })).token)).sets;
const tok = (await api({ action: "login", code: tCode })).token;
await api({ action: "setSave", id: list[0].id, title: list[0].title, subject: "אנגלית", audience: "all", cards: [...list[0].cards.slice(0, 4), { t: "solution", d: "פתרון, תשובה" }] }, tok);
await S2.reload({ waitUntil: "networkidle2" }); await sleep(800);
log((await S2.$eval("#classSets", e => e.innerText)).includes("יחידה 4"), "after changing audience to all, י'2 sees it too");
await S1.reload({ waitUntil: "networkidle2" }); await sleep(800);
await S1.evaluate(id => document.querySelector(`.set[data-id="${id}"]`).click(), tid); await sleep(200);
const info = await S1.$eval("#sInfo", e => e.textContent);
log(info.includes("ידעת 4 מתוך 5"), "teacher edited one card: progress on the other 4 is kept", info);
await browser.close();
log(!errs.length, "no page errors", errs.join(" | "));
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
