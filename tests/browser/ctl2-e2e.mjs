import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט 2 למצב מהשרת (השעיה / מצב עדכון / הודעות) + בלי זום + מדווח התקלות
// שרת מדומה: GET /api/feed, POST hello/err/react – לפי state
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const BASE = "http://localhost:8787/";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
let state = {}; let posts = []; let feedStatus = 200; let failErr = 0;
const reset = () => { state = { maint: null, susp: null, msgs: [], feedMaint: null, reactSusp: false }; posts = []; feedStatus = 200; failErr = 0; };
const PROF = { first: "רון", last: "בדיקה", cls: "y1", eng: "hadad", math: "adir", major: "cs", dorm: "yes", since: "2026-09-01" };
async function page({ w = 390, h = 844, scheme = "dark", ua, ls = {} } = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  if (ua) await p.setUserAgent(ua);
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.evaluateOnNewDocument((prof, ls) => {
    if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1");
    localStorage.setItem("profile", JSON.stringify(prof)); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); localStorage.setItem("feedOk", "1");
    localStorage.setItem("bday", JSON.stringify({ optOut: true }));
    for (const [k, v] of Object.entries(ls)) v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  }, PROF, ls);
  await p.setRequestInterception(true);
  p.on("request", q => {
    const u = q.url();
    if (/netlify\.app\/api\//.test(u)) {
      const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: H });
      const J = (o, s = 200) => q.respond({ status: s, contentType: "application/json", headers: H, body: JSON.stringify(o) });
      if (q.method() === "GET" && /\/api\/feed/.test(u)) return feedStatus !== 200 ? J({ ok: false }, feedStatus) : J({ ok: true, updates: [], polls: [], events: [], answers: [], birthdays: [], changes: [], maint: state.feedMaint });
      if (q.method() === "GET") return J({ ok: true, updates: [] });
      let body = {}; try { body = JSON.parse(q.postData() || "{}"); } catch (e) {}
      posts.push(body);
      if (body.action === "hello") return J({ ok: true, maint: state.maint, susp: state.susp, msgs: state.msgs });
      if (body.action === "err") { if (failErr > 0) { failErr--; return q.abort("failed"); } return J({ ok: true }); }
      if (body.action === "react" && state.reactSusp) return J({ ok: false, error: "suspended" }, 403);
      return J({ ok: true });
    }
    q.continue();
  });
  return p;
}
const now = () => Date.now();
const errsOf = p => p.errs.filter(e => !/favicon/.test(e));

// ===== ⛔ השעיה =====
reset(); state.susp = { until: null, reason: "<img src=x onerror=window.__x=1>הפרה" };
let p = await page({ ls: { appCtl: JSON.stringify({ susp: state.susp, at: now() }) } });
await p.goto(BASE + "index.html", { waitUntil: "domcontentloaded" });
log(await p.evaluate(() => !!document.getElementById("suspWall") && document.documentElement.classList.contains("susp-lock") && !document.documentElement.classList.contains("susp-pre")), "wall is up at DOMContentLoaded (from cache), pre-hide class cleared");
await sleep(2200);
log(await p.evaluate(() => { const w = document.getElementById("suspWall"); return w.innerText.includes("<img src=x") && !window.__x && !w.querySelector("img"); }), "suspension reason shown as text (no XSS)");
await p.keyboard.press("Escape"); await sleep(150);
log(await p.evaluate(() => !!document.getElementById("suspWall")), "Esc doesn't remove the wall");
await p.evaluate(() => { try { openProfile(); } catch (e) {} try { document.getElementById("askDlg").showModal(); } catch (e) {} try { document.getElementById("calBtn").click(); } catch (e) {} });
await sleep(400);
log(await p.evaluate(() => !document.querySelector("dialog[open]")), "no dialog can open over the wall");
for (let i = 0; i < 8; i++) await p.keyboard.press("Tab");
log(await p.evaluate(() => { const a = document.activeElement; return !a || a === document.body || document.getElementById("suspWall").contains(a); }), "Tab can't reach the app behind the wall (inert)");
log(await p.evaluate(() => document.querySelector("main").inert && document.querySelector(".top").inert), "app behind the wall is inert");
await p.goto(BASE + "cards.html", { waitUntil: "networkidle2" }); await sleep(600);
log(await p.evaluate(() => !!document.getElementById("suspWall") && !/cards/.test(location.pathname)), "opening another page while suspended → back to the wall", p.url());
await p.goto(BASE + "shichrur.html#p=abc", { waitUntil: "networkidle2" }); await sleep(500);
log(await p.evaluate(() => /shichrur/.test(location.pathname) && !document.getElementById("suspWall")), "parent signing link (shichrur #p=) still opens on a suspended phone", p.url());
await p.goto(BASE + "parent.html", { waitUntil: "networkidle2" }); await sleep(500);
log(await p.evaluate(() => /parent/.test(location.pathname)), "parent.html still opens on a suspended phone", p.url());
await p.goto(BASE + "shichrur.html", { waitUntil: "networkidle2" }); await sleep(500);
log(await p.evaluate(() => !/shichrur/.test(location.pathname)), "plain shichrur (student use) is blocked", p.url());
await p.goto(BASE + "cards.html", { waitUntil: "networkidle2" }); await sleep(600);
await p.goBack().catch(() => {}); await sleep(800);
log(await p.evaluate(() => !!document.getElementById("suspWall") || /cards/.test(location.pathname) === false), "back button doesn't get around the wall");
log(errsOf(p).length === 0, "no page errors (suspension)", errsOf(p).join(" | "));
await p.browserContext().close();

// כפתור "חזור" אחרי שההשעיה נכנסה: מכרטיסיות → הראשי (מחסום) → חזור לכרטיסיות → שוב מחסום
reset(); p = await page();
await p.goto(BASE + "cards.html", { waitUntil: "networkidle2" }); await sleep(500);
state.susp = { until: null, reason: "" };
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2300);
log(await p.evaluate(() => !!document.getElementById("suspWall")), "suspension arrives while using the app → wall");
await p.goBack({ waitUntil: "networkidle2" }).catch(() => {}); await sleep(900);
log(await p.evaluate(() => !!document.getElementById("suspWall") && !/cards/.test(location.pathname)), "back to the previous page → still the wall", p.url());
await p.browserContext().close();

// השעיה לזמן קצוב → נעלמת לבד
reset(); state.susp = { until: now() + 4500, reason: "" };
p = await page({ ls: { appCtl: JSON.stringify({ susp: state.susp, at: now() }) } });
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(500);
log(await p.evaluate(() => { const w = document.getElementById("suspWall"); return !!w && /בעוד \d+ דק'/.test(w.innerText); }), "timed suspension shows when access returns");
await sleep(5200);
log(await p.evaluate(() => !document.getElementById("suspWall") && !document.documentElement.classList.contains("susp-lock") && !document.querySelector("main").inert && !document.querySelector(".top").inert), "wall disappears by itself when the time passes; app usable again");
await p.evaluate(() => openProfile()); await sleep(300);
log(await p.evaluate(() => !!document.querySelector("dialog[open]")), "dialogs open again after the suspension ended");
await p.browserContext().close();

// שרת עונה "suspended" לפעולה → המחסום עולה מיד
reset(); p = await page();
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2000);
state.reactSusp = true; state.susp = { until: null, reason: "" };
await p.evaluate(() => feedPost({ action: "react", id: "x", emoji: "👍", device: deviceId() })); await sleep(1200);
log(await p.evaluate(() => !!document.getElementById("suspWall")), "server 'suspended' reply refreshes state at once (wall appears)");
await p.browserContext().close();

// ===== 🚧 מצב עדכון =====
reset(); state.maint = { until: now() + 5000, msg: "<b onclick=x>שדרוג</b>" };
p = await page();
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2200);
log(await p.evaluate(() => document.body.classList.contains("maint") && document.getElementById("maintBar").innerText.includes("<b onclick=x>שדרוג</b>") && !document.querySelector("#maintBar b[onclick]")), "update mode bar shows message as text");
log(await p.evaluate(() => { const m = document.getElementById("maintBar").getBoundingClientRect(), h = document.getElementById("hero").getBoundingClientRect(); return h.top >= m.bottom && h.top - m.bottom < 40; }), "on phones the timetable comes right after the bar");
log(await p.evaluate(() => document.querySelector(".actions").inert && document.getElementById("imgBtn").inert && !document.getElementById("hero").inert), "covered areas are inert, timetable is not");
await sleep(4000);
log(await p.evaluate(() => !document.body.classList.contains("maint") && !document.querySelector(".actions").inert && getComputedStyle(document.querySelector(".actions")).pointerEvents !== "none"), "update mode turns off by itself at 'until'");
log(errsOf(p).length === 0, "no page errors (update mode)", errsOf(p).join(" | "));
await p.browserContext().close();

// ===== 💥 זיכרון פגום =====
reset();
p = await page({ ls: { appCtl: "{bad", ownerMsgs: '[null,1,"x",{"id":{},"text":5},{"id":"a","text":"שלום מהמנהל","exp":9e15},{"id":"b","text":"פג","exp":1}]', ownerRead: '{"a":1}', ownerToast: "5", feedCache: '"str"', errSent: "{{" } });
await p.goto(BASE + "index.html", { waitUntil: "domcontentloaded" }); await sleep(700);
log(errsOf(p).length === 0 && await p.evaluate(() => document.getElementById("hero").innerText.length > 10), "corrupted appCtl/ownerMsgs/ownerRead/feedCache: no errors, app works", errsOf(p).join(" | "));
log(await p.evaluate(() => { const t = document.getElementById("ownBox").innerText; return t.includes("שלום מהמנהל") && !t.includes("פג"); }), "valid cached message shows, expired one doesn't");
await p.browserContext().close();
for (const bad of ['{"susp":"yes","maint":5}', '{"susp":{"until":"abc"},"maint":{"until":"zzz"}}', 'null', '[1,2]', '{"susp":{"until":1e300}}']) {
  reset(); p = await page({ ls: { appCtl: bad } });
  await p.goto(BASE + "index.html", { waitUntil: "domcontentloaded" }); await sleep(600);
  const r = await p.evaluate(() => ({ wall: !!document.getElementById("suspWall"), pre: document.documentElement.classList.contains("susp-pre"), txt: (document.getElementById("suspWall") || {}).innerText || "" }));
  log(errsOf(p).length === 0 && !r.pre && (bad.includes("1e300") ? r.wall && !/Invalid/.test(r.txt) : !r.wall), `odd appCtl ${bad} handled`, JSON.stringify(r) + errsOf(p).join("|"));
  await p.browserContext().close();
}

// ===== 📩 הודעות: XSS, טוסט פעם אחת, גם בלי פיד =====
reset(); state.msgs = [{ id: "m1", text: "<img src=x onerror=window.__y=1>שלום לכולם", at: now(), exp: now() + 864e5 }];
p = await page();
await p.evaluateOnNewDocument(() => { window.__toasts = 0; new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => { if (n.classList && n.classList.contains("toast") && /ממנהל המערכת/.test(n.textContent)) window.__toasts++; }))).observe(document, { childList: true, subtree: true }); });
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2300);
log(await p.evaluate(() => document.getElementById("ownBox").innerText.includes("<img src=x") && !window.__y), "owner message shown as text (no XSS)");
await p.evaluate(async () => { helloAt = 0; await hello(); helloAt = 0; await hello(); });
log(await p.evaluate(() => window.__toasts === 1), "toast for a new message shows once", String(await p.evaluate(() => window.__toasts)));
await p.reload({ waitUntil: "networkidle2" }); await sleep(2300);
log(await p.evaluate(() => window.__toasts === 0), "no toast again after reopening");
await p.click("[data-omread]"); await sleep(200);
log(await p.evaluate(() => document.getElementById("ownBox").hidden), "'קראתי' hides it");
await p.browserContext().close();
reset(); state.msgs = [{ id: "m2", text: "הודעה כשהפיד למטה", at: now(), exp: now() + 864e5 }]; feedStatus = 500;
p = await page({ ls: { feedOk: "0" } });
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2300);
log(await p.evaluate(() => document.getElementById("ownBox").innerText.includes("הודעה כשהפיד למטה")), "owner message shows even when the feed is unavailable");
await p.browserContext().close();

// ===== 🔍 בלי זום, וגלילה/הקשות עובדות =====
for (const ua of [undefined, IPHONE]) {
  const tag = ua ? "iPhone" : "Android";
  reset(); p = await page({ w: 360, ua });
  await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(1500);
  log(await p.evaluate(() => getComputedStyle(document.documentElement).touchAction === "manipulation"), `${tag}: double-tap zoom off (touch-action)`);
  const z = await p.evaluate(() => {
    const ge = new Event("gesturestart", { cancelable: true }); document.dispatchEvent(ge);
    const t = (n) => { const ts = [...Array(n)].map((_, i) => new Touch({ identifier: i, target: document.body, clientX: 50 + i * 40, clientY: 200 })); const e = new TouchEvent("touchmove", { touches: ts, cancelable: true, bubbles: true }); document.body.dispatchEvent(e); return e.defaultPrevented; };
    return { g: ge.defaultPrevented, two: t(2), one: t(1) };
  });
  log(z.g && !z.one && (ua ? z.two : true), `${tag}: pinch gestures blocked, one-finger move untouched`, JSON.stringify(z));
  // גלילה אמיתית במגע
  const drag = async (x0, y0, dx, dy) => { await p.touchscreen.touchStart(x0, y0); for (let i = 1; i <= 10; i++) await p.touchscreen.touchMove(x0 + dx * i / 10, y0 + dy * i / 10); await p.touchscreen.touchEnd(); await sleep(300); };
  await drag(180, 600, 0, -400);
  log(await p.evaluate(() => scrollY > 100), `${tag}: page scrolls with a finger`, String(await p.evaluate(() => scrollY)));
  await sleep(1200); await p.evaluate(() => scrollTo(0, 0)); await sleep(800);
  const tabs = await p.evaluate(() => { const t = document.getElementById("tabs"); const r = t.getBoundingClientRect(); return { sw: t.scrollWidth, cw: t.clientWidth, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (tabs.sw > tabs.cw + 5 || console.log("   (tabs fit, no side scroll)")) {
    const before = await p.evaluate(() => document.getElementById("tabs").scrollLeft);
    await drag(Math.round(tabs.x), Math.round(tabs.y), 150, 0);
    log(await p.evaluate(b => document.getElementById("tabs").scrollLeft !== b, before), `${tag}: day tabs scroll sideways`);
  }
  // הקשה כפולה מהירה – שתי ההקשות נקלטות
  await p.evaluate(() => { const d = document.createElement("label"); d.id = "tt"; d.style.cssText = "position:fixed;top:300px;left:40px;width:200px;height:60px;background:#888;z-index:99"; d.innerHTML = '<input type="checkbox" id="ttc"> בדיקה'; document.body.append(d); window.__cl = 0; d.addEventListener("click", e => { if (e.target === d) window.__cl++; }); });
  await p.touchscreen.tap(150, 330); await sleep(80); await p.touchscreen.tap(150, 330); await sleep(400);
  log(await p.evaluate(() => window.__cl === 2 && document.getElementById("ttc").checked === false), `${tag}: two fast taps both register`, String(await p.evaluate(() => window.__cl)));
  if (ua) {
    const f = await p.evaluate(() => { const a = document.createElement("input"); a.style.fontSize = "12px"; const c = document.createElement("input"); c.type = "checkbox"; c.style.fontSize = "12px"; document.body.append(a, c); a.focus(); c.focus(); return [a.style.fontSize, c.style.fontSize]; });
    log(f[0] === "16px" && f[1] === "12px", "iPhone: small text field bumped to 16px on focus (checkbox untouched)", f.join(","));
  }
  log(errsOf(p).length === 0, `${tag}: no page errors`, errsOf(p).join(" | "));
  await p.browserContext().close();
}

// ===== 🐞 מדווח התקלות =====
reset(); p = await page();
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(1200);
const errs = () => posts.filter(x => x.action === "err");
await p.evaluate(() => { reportError2("Boom1", "x.js:1:1"); reportError2("Boom1", "x.js:1:1"); }); await sleep(400);
log(errs().length === 1 && errs()[0].msg === "Boom1" && errs()[0].name === "רון בדיקה" && errs()[0].cls === "y1", "same error is sent once", JSON.stringify(errs()));
await p.evaluate(() => { for (const m of ["Script error.", "ResizeObserver loop limit exceeded", "TypeError: Failed to fetch", "Load failed", "AbortError: The user aborted a request.", "Uncaught TypeError: cancelled", "NotAllowedError: play() failed because the user didn't interact with the document first.", "Can't find variable: __gCrWeb"]) reportError2(m, "y.js:1:1"); reportError2("Ext", "chrome-extension://abc/x.js:1:1"); }); await sleep(400);
log(errs().length === 1, "noise is not reported", JSON.stringify(errs().slice(1).map(x => x.msg)));
await p.addScriptTag({ content: 'setTimeout(() => { throw new Error("RealBug"); }, 0); Promise.reject(new Error("RejBug")); Promise.reject(new DOMException("x", "AbortError"));' }); await sleep(600);
log(errs().some(x => /RealBug/.test(x.msg)) && errs().some(x => /RejBug/.test(x.msg)) && errs().length === 3, "real errors and rejections are reported (abort ignored)", JSON.stringify(errs().map(x => x.msg)));
await p.evaluate(() => { for (let i = 0; i < 8; i++) reportError2("Many" + i, "z.js:" + i); }); await sleep(400);
log(errs().length === 5, "max 5 reports per page", String(errs().length));
await p.reload({ waitUntil: "networkidle2" }); await sleep(800); posts = [];
await p.evaluate(() => reportError2("Boom1", "x.js:1:1")); await sleep(300);
log(errs().length === 0, "same error not resent after reopening (per day)");
await p.evaluate(() => localStorage.setItem("errSent", "{{garbage")); await p.evaluate(() => reportError2("AfterCorrupt", "q.js:1")); await sleep(300);
log(errs().some(x => x.msg === "AfterCorrupt"), "corrupted dedupe store doesn't kill the reporter");
failErr = 1; await p.evaluate(() => reportError2("Offline1", "o.js:1")); await sleep(400);
await p.evaluate(() => reportError2("Offline1", "o.js:1")); await sleep(400);
log(errs().filter(x => x.msg === "Offline1").length === 2, "a report that didn't reach the server can be sent again", String(errs().filter(x => x.msg === "Offline1").length));
const loop = await p.evaluate(async () => { const f = window.fetch; let n = 0; window.fetch = () => { n++; throw new Error("fetch broke"); }; try { reportError2("LoopTest", "l.js:1"); } catch (e) { return "threw"; } window.fetch = f; await new Promise(r => setTimeout(r, 200)); return n; });
log(loop === 1, "error inside the reporter doesn't loop or throw", String(loop));
await p.browserContext().close();
reset(); p = await page();
await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(800); posts = [];
await p.evaluate(() => { window.__DEMO = true; reportError2("DemoErr", "d.js:1"); }); await sleep(300);
log(errs().length === 0, "nothing reported on the demo");
await p.browserContext().close();

// ===== 📐 מסכים: 320/360/375/מחשב, כהה ובהיר =====
for (const scheme of ["dark", "light"]) for (const w of [320, 360, 375, 1280]) {
  reset(); state.maint = { until: null, msg: "שדרוג גדול של הכרטיסיות והמחשבון, עם הרבה טקסט כדי לבדוק שבירת שורות" }; state.msgs = [{ id: "w1", text: "הודעה ארוכה ".repeat(20), at: now(), exp: now() + 864e5 }];
  p = await page({ w, h: w < 700 ? 640 : 900, scheme });
  await p.goto(BASE + "index.html", { waitUntil: "networkidle2" }); await sleep(2200);
  const r = await p.evaluate(() => { const m = document.getElementById("maintBar").getBoundingClientRect(), h = document.getElementById("hero").getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, mh: m.height, mw: m.width, ok: h.top >= m.bottom - 1, own: !document.getElementById("ownBox").hidden }; });
  log(r.sw <= w + 1 && r.mh > 40 && r.ok && r.own, `update mode + message @${w}px ${scheme}: no overflow, bar above timetable`, JSON.stringify(r));
  if (w === 320 || w === 1280) await p.screenshot({ path: `ctl2-maint-${w}-${scheme}.png` });
  state.susp = { until: null, reason: "סיבה ארוכה ".repeat(30) };
  await p.evaluate(() => { helloAt = 0; return hello(); }); await sleep(400);
  const s = await p.evaluate(() => { const w = document.getElementById("suspWall"), r = w.getBoundingClientRect(); w.scrollTop = 9999; return { cover: r.width >= innerWidth && r.height >= innerHeight, scroll: w.scrollHeight <= w.clientHeight || w.scrollTop > 0, sw: document.documentElement.scrollWidth }; });
  log(s.cover && s.scroll && s.sw <= w + 1, `wall @${w}px ${scheme}: covers the screen, long text scrollable`, JSON.stringify(s));
  if (w === 320) await p.screenshot({ path: `ctl2-wall-${w}-${scheme}.png` });
  log(errsOf(p).length === 0, `no page errors @${w}px ${scheme}`, errsOf(p).join(" | "));
  await p.browserContext().close();
}

console.log(`${res.filter(Boolean).length}/${res.length} passed`);
await b.close();
