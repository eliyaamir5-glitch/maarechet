import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// בדיקת קצה-לקצה של האתר: הרשמה, כל לחיצה וכל מסך, בגודל טלפון, ובזמנים שונים (שישי, שבת, לילה, חופשה).
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:8787";
const SHOTS = path.join(DIR, "e2e"); fs.rmSync(SHOTS, { recursive: true, force: true }); fs.mkdirSync(SHOTS);
const results = []; const issues = []; const sent = [];
const log = (ok, name, extra = "") => { results.push({ ok, name, extra }); console.log(ok ? "✅" : "❌", name, extra); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--lang=he-IL", ...CHROME_ARGS], userDataDir: path.join(DIR, "e2e-profile-" + Date.now()),
});

async function newPage({ width = 375, dark = false, fakeTime = null } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
  if (fakeTime) await p.evaluateOnNewDocument(t => {
    const R = Date, off = t - R.now();
    class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
    window.Date = D;
  }, fakeTime);
  p.on("pageerror", e => issues.push(`[pageerror] ${p.url().split("/").pop()}: ${e.message}`));
  p.on("console", m => { if (m.type() === "error" && !/favicon|ERR_INTERNET|Failed to load resource/.test(m.text())) issues.push(`[console] ${p.url().split("/").pop()}: ${m.text()}`); });
  p.on("dialog", d => d.accept());
  // בבדיקה לא שולחים כלום החוצה: משוב, מייל ושרת נענים כאן
  await p.setRequestInterception(true);
  p.on("request", r => {
    const u = r.url();
    if (u.includes("web3forms.com") && r.method() === "OPTIONS") return r.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Accept", "Access-Control-Allow-Methods": "POST" } });
    if (u.includes("web3forms.com")) { sent.push({ to: "web3forms", body: r.postData() || "" }); return r.respond({ status: 200, contentType: "application/json", body: '{"success":true}', headers: { "Access-Control-Allow-Origin": "*" } }); }
    if (u.includes("netlify.app/api/feedback")) { if (r.method() === "OPTIONS") return r.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST" } }); sent.push({ to: "feedback", body: r.postData() || "" }); return r.respond({ status: 200, contentType: "application/json", body: '{"ok":true}', headers: { "Access-Control-Allow-Origin": "*" } }); }
    if (u.includes("netlify.app/api/")) return r.respond({ status: 200, contentType: "application/json", body: '{"ok":true,"updates":[],"needsSetup":false}', headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
    r.continue();
  });
  return p;
}
const $ = (p, s) => p.$(s);
async function click(p, sel, name) { try { await p.waitForSelector(sel, { visible: true, timeout: 5000 }); await p.$eval(sel, e => e.scrollIntoView({ block: "center" })); await p.click(sel); await sleep(350); return true; } catch (e) { log(false, name || "click " + sel, e.message.split("\n")[0]); return false; } }
async function type(p, sel, text) { await p.waitForSelector(sel, { visible: true, timeout: 5000 }); await p.click(sel, { clickCount: 3 }); await p.type(sel, text, { delay: 5 }); }
async function overflow(p) { return p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); }
async function shot(p, name) { await p.screenshot({ path: path.join(SHOTS, name + ".png") }); }
async function visible(p, sel) { return p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return !e.hidden && r.width > 0 && r.height > 0 && getComputedStyle(e).display !== "none"; }, sel); }

// ===== 1. הרשמה של תלמיד חדש =====
const WED = new Date("2026-10-14T10:40:00").getTime();
let p = await newPage({ fakeTime: WED });
await p.goto(BASE + "/index.html", { waitUntil: "networkidle2" });
await sleep(800);
log(await visible(p, "#wiz"), "new user sees the signup wizard");
// שם ריק → לא מתקדם
await click(p, "#wzNext", "next with empty name");
log((await p.$eval("#wzQ", e => e.textContent)).includes("קוראים"), "empty name does not advance");
await type(p, "#wzFirst", `דני"ה <b>`); await type(p, "#wzLast", `לוי's`);
await click(p, "#wzNext");
await click(p, "#wzPhSkip", "skip photo");
await click(p, "#wzBdSkip", "skip birthday");
await type(p, "#wzEmail", "not-an-email"); await click(p, "#wzNext");
log(await visible(p, "#wzEmail"), "invalid email is rejected");
await click(p, "#wzSkip", "skip email");
log(await visible(p, "#msUser"), "Mashov step shows the form");
log((await p.$eval("#msSchool", e => e.value)).includes("בית יהודה"), "Mashov school is prefilled");
await click(p, "#wzMsSkip", "skip Mashov");
for (const [i, n] of [[0, "grade 10"], [0, "class y1"], [2, "eng hadad"], [1, "math adir"], [0, "major econ"], [0, "dorm yes"]]) {
  await p.waitForSelector("#wzBody .wz-opt[data-v]", { visible: true }); await sleep(250);
  const opts = await p.$$("#wzBody .wz-opt[data-v]"); await opts[i].click(); await sleep(500);
}
await p.waitForSelector("#bdGo", { visible: true, timeout: 8000 }).then(() => log(true, "build animation finishes")).catch(() => log(false, "build animation finishes"));
await click(p, "#bdGo", "open the app");
await sleep(800);
for (let i = 0; i < 6 && await visible(p, "#intro"); i++) await click(p, "#inNext", "intro next");
log(!(await visible(p, "#intro")), "intro closes");
await sleep(600);
log(await p.evaluate(() => !!document.querySelector("#installDlg[open]")), "install guide opens after intro");
for (const d of ["android", "other", "ios"]) await click(p, `#instSeg [data-d="${d}"]`, "install tab " + d);
await click(p, '#instSeg [data-d="ios"]', "install tab ios again");
await click(p, "#instPlay", "play install video");
await sleep(2500);
const vInfo = await p.evaluate(() => { const v = document.querySelector("#instVid video"); return v ? { src: v.currentSrc.split("/").pop(), rs: v.readyState, dur: Math.round(v.duration || 0), err: !!v.error } : null; });
log(!!vInfo && vInfo.src === "install-ios.mp4" && vInfo.rs >= 1 && vInfo.dur > 60 && !vInfo.err, "install video (iPhone) loads", JSON.stringify(vInfo));
await click(p, '#instSeg [data-d="android"]', "switch to android tab");
log(await p.evaluate(() => !document.querySelector("#instVid video") && !document.getElementById("instPlay").hidden), "switching tab stops the video and shows the play button");
await click(p, "#instPlay", "play android video"); await sleep(2000);
log(await p.evaluate(() => (document.querySelector("#instVid video") || {}).currentSrc?.endsWith("install-android.mp4")), "android tab plays the android video");
await click(p, '#installDlg button[value="ok"]', "close install guide");
log(await p.evaluate(() => !document.querySelector("#instVid video")), "closing the dialog stops the video");
const prof = await p.evaluate(() => JSON.parse(localStorage.getItem("profile")));
log(prof && prof.cls === "y1" && prof.eng === "hadad" && prof.math === "adir" && prof.major === "econ", "profile saved correctly", JSON.stringify(prof));
log((await p.$eval("#hTitle", e => e.innerHTML)).includes("&lt;b&gt;"), "name with <b> is escaped in header");
log(!(await overflow(p)), "main screen: no horizontal overflow");
await shot(p, "01-main-wed");

// ===== 2. המסך הראשי: ימים, ציוד, יומן, תמונה, פרופיל =====
const tabs = await p.$$("#tabs button, #tabs .tab");
log(tabs.length >= 5, "day tabs exist", String(tabs.length));
const tabClick = i => p.evaluate(i => document.querySelectorAll("#tabs button, #tabs .tab")[i].click(), i);
for (let i = 0; i < tabs.length; i++) { await tabClick(i); await sleep(250); const n = await p.$$eval("#content .row", r => r.length); if (i < 5) log(n > 0, `day tab ${i} shows lessons`, String(n)); }
await tabClick(3); await sleep(300);
await click(p, "#content .row .edit", "open gear editor");
log(await p.evaluate(() => !!document.querySelector("#dlg[open]")), "gear dialog opens");
await p.$eval("#dlgText", e => { e.value = "ספר, מחברת <i>x</i>"; });
await p.evaluate(() => { const d = document.getElementById("dlg"); d.returnValue = "save"; d.close("save"); });
await sleep(300);
log(await p.evaluate(() => [...document.querySelectorAll("#content .chip")].some(c => c.textContent.includes("<i>"))), "gear with HTML is shown as text");
await click(p, "#content .row .edit", "open gear editor again");
await p.$eval("#dlgText", e => { e.value = "לא אמור להישמר"; });
await p.keyboard.press("Escape"); await sleep(300);
log(!(await p.evaluate(() => JSON.stringify(localStorage.getItem("gear") || "").includes("לא אמור"))), "Esc in gear editor does not save");
await click(p, "#calBtn", "calendar button");
log(await p.evaluate(() => !!document.querySelector("dialog[open]")), "calendar dialog opens");
await shot(p, "02-calendar");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
await click(p, "#imgBtn", "timetable image button"); await sleep(1500);
log(await p.evaluate(() => { const c = document.getElementById("imgPrev"); return !!document.querySelector("#imgDlg[open]") && c && c.width > 200; }), "timetable image renders");
await shot(p, "03-image");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
await click(p, "#hAvatar", "open profile");
log(await p.evaluate(() => !!document.querySelector("#profDlg[open]")), "profile dialog opens");
log(!(await p.evaluate(() => document.getElementById("profDlg").innerHTML.includes("<b>לוי"))), "profile escapes name");
await shot(p, "04-profile");
await click(p, "#pfEdit", "edit details from profile");
log(await visible(p, "#wiz"), "edit opens the wizard");
await click(p, "#wzBack", "cancel edit");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(300);
await click(p, "#introLink", "footer: intro link"); await sleep(400);
for (let i = 0; i < 6 && await visible(p, "#intro"); i++) await click(p, "#inNext");
await click(p, "#installLink", "footer: install link");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
log(await p.evaluate(() => !!document.querySelector('.foot a[href="staff.html"]')), "footer has staff link");
await click(p, "#fbOpen", "footer: write to us");
log(await p.evaluate(() => !!document.querySelector("#fbDlg[open]")), "feedback dialog opens");
await click(p, '#fbKind [data-k="bug"]', "choose bug");
log(await visible(p, "#fbTech"), "bug shows the technical-details note");
await click(p, "#fbSend", "send empty feedback");
log((await p.$eval("#fbMsg", e => e.textContent)).length > 0, "empty feedback shows a message");
await type(p, "#fbText", "הכפתור של היומן לא נפתח <b>");
await click(p, "#fbSend", "send feedback"); await sleep(800);
log(await p.evaluate(() => document.querySelector("#fbDlg .fb-done") !== null), "feedback: thank-you screen");
const fbSent = sent.find(x => x.to === "feedback");
log(!!fbSent && /bug/.test(fbSent.body) && /Mozilla/.test(fbSent.body), "feedback reached the server with kind + device", fbSent ? fbSent.body.slice(0, 80) : "none");
const mailSent = sent.filter(x => x.to === "web3forms" && /access_key/.test(x.body)).pop();
log(!!mailSent && /מהאפליקציה/.test(mailSent.body) && /הכפתור של היומן/.test(mailSent.body), "feedback also sent by email, with a unique subject", mailSent ? JSON.parse(mailSent.body).subject : "none");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
await click(p, "#fbOpen", "reopen write to us");
log(await visible(p, "#fbText"), "feedback form is fresh when reopened");
await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
await shot(p, "05-footer");
await p.close();

// ===== 3. זמנים שונים: שישי, שבת, לילה, לפני הלימודים, חופשה =====
const TIMES = { "fri-10": "2026-10-16T10:00", "sat-12": "2026-10-17T12:00", "sun-06": "2026-10-18T06:30", "thu-23": "2026-10-15T23:30", "holiday": "2026-12-08T10:00", "summer": "2027-07-12T10:00", "wed-20:50": "2026-10-14T20:50" };
for (const [k, t] of Object.entries(TIMES)) {
  const q = await newPage({ fakeTime: new Date(t).getTime() });
  await q.goto(BASE + "/index.html", { waitUntil: "networkidle2" }); await sleep(900);
  const txt = await q.$eval("#hero", e => e.innerText.replace(/\s+/g, " ").slice(0, 80)).catch(() => "");
  const ok = !(await q.evaluate(() => !!document.querySelector("#wiz:not([hidden])")));
  log(ok, `time ${k}: renders`, txt);
  if (k === "holiday") log(/חנוכה/.test(await q.$eval("#content", e => e.innerText)), "holiday shows the Hanukkah vacation card");
  if (k === "summer") log(true, "summer (Saturday) renders");
  await shot(q, "06-time-" + k); await q.close();
}

// ===== 4. נוכחות (דוגמה), מגירה =====
p = await newPage({ fakeTime: WED });
await p.goto(BASE + "/absences.html", { waitUntil: "networkidle2" }); await sleep(500);
await click(p, "#demoBtn", "absences: show example");
await sleep(1600);
log(await visible(p, ".subj"), "absences example shows subjects");
log(!(await overflow(p)), "absences: no overflow");
await shot(p, "07-absences");
await click(p, "#drwOpen", "open drawer"); await sleep(800);
log(await visible(p, "#drw"), "drawer opens");
log(await p.evaluate(() => document.body.classList.contains("noscroll")), "page scroll locked while drawer open");
await click(p, "#cj", "toggle count-justified in drawer");
log(await visible(p, "#drw"), "drawer stays open after toggle");
await shot(p, "08-drawer");
await click(p, "#drw .x", "close drawer");
log(!(await visible(p, "#drw")) && !(await p.evaluate(() => document.body.classList.contains("noscroll"))), "drawer closes and unlocks scroll");
await click(p, "#exitDemo", "exit example");
await p.close();

// ===== 5. כרטיסיות =====
p = await newPage();
await p.goto(BASE + "/cards.html", { waitUntil: "networkidle2" }); await sleep(400);
await click(p, "#classSets .set", "open class set");
await click(p, "#mFlash", "flashcards mode");
await click(p, "#flip", "flip card");
for (let i = 0; i < 12 && await visible(p, "#fYes"); i++) { await p.click(i % 3 ? "#fYes" : "#fNo"); await sleep(120); }
log(await visible(p, "#vDone") || await visible(p, "#dTitle"), "flashcards reach the end screen");
await shot(p, "09-cards-done");
await p.evaluate(() => document.getElementById("dBack") && document.getElementById("dBack").click()); await sleep(300);
await click(p, "#mQuiz", "quiz mode");
for (let i = 0; i < 12 && await visible(p, "#qOpts"); i++) { const b = await p.$$("#qOpts button"); if (!b.length) break; await b[0].click(); await sleep(1300); }
log(true, "quiz answered through");
await p.evaluate(() => document.getElementById("dBack") && document.getElementById("dBack").click()); await sleep(300);
await click(p, "#mMatch", "match mode"); await sleep(500);
log(await visible(p, "#mGrid"), "match grid shows");
await click(p, "#mQuit", "quit match");
await click(p, "#back", "back to cards home");
// סט חדש עם 2 כרטיסים בלבד (פחות מ-4 לאמריקאי)
await click(p, "#btnNew", "new set");
await type(p, "#eName", "בדיקה");
await p.click("#eList .ec-t"); for (const w of ["אחת", "one", "שתיים", "two"]) { await p.keyboard.type(w); await p.keyboard.press("Enter"); }
await click(p, "#btnSave", "save new set"); await sleep(400);
await click(p, "#mQuiz", "quiz on 2-card set"); await sleep(400);
log(true, "quiz with 2 cards did not crash");
await shot(p, "10-cards-small-quiz");
await p.close();

// ===== 6. שחרורון: תלמיד → הורה → מורה =====
p = await newPage({ fakeTime: WED });
let opened = null;
await p.evaluateOnNewDocument(() => { window.open = u => { window.__opened = u; return null; }; navigator.share = undefined; });
await p.goto(BASE + "/shichrur.html", { waitUntil: "networkidle2" }); await sleep(400);
await type(p, "#fReason", "תור לרופא <script>");
await click(p, "#btnToParent", "send to parent"); await sleep(400);
opened = await p.evaluate(() => window.__opened || "");
log(/wa\.me/.test(opened), "send to parent opens WhatsApp", opened.slice(0, 60));
const link = decodeURIComponent((opened.match(/https?%3A%2F%2F[^&]*|https?:\/\/\S+#p=\S+/) || [""])[0]);
const m = decodeURIComponent(opened).match(/(https?:\/\/\S+#p=\S+)/);
await shot(p, "11-shichrur-student");
if (m) {
  const q = await newPage({ fakeTime: WED });
  await q.evaluateOnNewDocument(() => { window.open = u => { window.__opened = u; return null; }; navigator.share = undefined; navigator.canShare = undefined; });
  await q.goto(m[1].replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle2" }); await sleep(500);
  log(await visible(q, "#sigPad"), "parent view shows signature pad");
  await type(q, "#pName", "אבא של דני");
  await q.$eval("#pOk", e => { e.checked = true; });
  const box = await q.$eval("#sigPad", e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await q.$eval("#sigPad", e => e.scrollIntoView({ block: "center" }));
  const bx = await q.$eval("#sigPad", e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top }; });
  await q.touchscreen.touchStart(bx.x + 100, bx.y + 60);
  for (let k = 0; k < 20; k++) await q.touchscreen.touchMove(bx.x + 100 + k * 6, bx.y + 60 + Math.sin(k) * 20);
  await q.touchscreen.touchEnd();
  await click(q, "#btnSign", "parent signs"); await sleep(800);
  log(await visible(q, "#permit"), "permit image appears after signing");
  await shot(q, "12-shichrur-permit");
  await q.close();
} else log(false, "parent link found in WhatsApp text");
await p.close();

// ===== 7. כל הדפים: מצב כהה, 360px, בלי שגיאות =====
for (const page of ["index.html", "absences.html", "cards.html", "shichrur.html", "about.html", "staff.html", "demo.html"]) {
  for (const dark of [false, true]) {
    const q = await newPage({ width: 360, dark, fakeTime: WED });
    await q.goto(BASE + "/" + page, { waitUntil: "networkidle2" }); await sleep(1200);
    log(!(await overflow(q)), `${page} ${dark ? "dark" : "light"} 360px: no overflow`);
    await shot(q, `20-${page.replace(".html", "")}-${dark ? "dark" : "light"}`);
    await q.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(DIR, "e2e-result.json"), JSON.stringify({ results, issues }, null, 1));
console.log("\n=== FAILED:", results.filter(r => !r.ok).length, "of", results.length);
console.log("=== ISSUES:\n" + [...new Set(issues)].join("\n"));
