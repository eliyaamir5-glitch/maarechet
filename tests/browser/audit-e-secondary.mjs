import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// בדיקות לסבב הזה: חתימה באצבע, לחיצות מהירות במחשבון, כרטיסיות, הורים בלי עיצוב שמור, דמו (שלום/תקלה/הדמיות), ספר טלפונים, גופן חסום
import puppeteer from "puppeteer-core";
const B = "http://localhost:8787/";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64 = s => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const errs = [];
const Y1 = { first: "יוסי", last: "כהן", cls: "y1", eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" };
// handler(url, method, body) → {status, body} | null (ממשיך לרשת). גופן מגוגל: "hang" = לא עונה בכלל
async function page({ w = 390, profile = null, store = {}, handler = null, fonts = "block" } = {}) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(p.url().split("/").pop().slice(0, 40) + ": " + e.message)); p.on("dialog", d => d.accept());
  await p.evaluateOnNewDocument((profile, store) => { try { if (!sessionStorage.__init) { sessionStorage.__init = 1; if (profile) localStorage.setItem("profile", JSON.stringify(profile)); for (const k in store) localStorage.setItem(k, store[k]); } } catch (e) {} }, profile, store);
  await p.setRequestInterception(true);
  p.reqs = [];
  p.on("request", async q => {
    const u = q.url();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) { if (fonts === "hang") return; return q.respond({ status: 404, body: "" }); }
    if (/netlify\.app|web3forms|mymemory|dictionaryapi|wiktionary/.test(u)) {
      if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }, body: "" });
      let body = null; try { body = JSON.parse(q.postData() || "null"); } catch (e) {}
      p.reqs.push({ u, m: q.method(), body });
      const r = handler && handler(u, q.method(), body);
      if (r) return q.respond({ status: r.status || 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(r.body) });
      return q.respond({ status: 503, body: "" });
    }
    q.continue();
  });
  return p;
}
const cdpTouch = async (p, type, pts) => { p.cdp = p.cdp || await p.target().createCDPSession(); await p.cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((x, i) => ({ x: x[0], y: x[1], id: i })) }); };

// ---------- 1. שחרורון: גופן חסום לא משאיר מסך ריק; חתימה באצבע; שתי אצבעות לא מגדילות; רישום אצל הצוות פעם אחת ----------
{
  const p = await page({ profile: Y1, fonts: "hang" });
  await p.goto(B + "shichrur.html", { waitUntil: "domcontentloaded" }); await sleep(700);
  log(await p.evaluate(() => !document.getElementById("stStudent").hidden && /יוצאים|אין שיעור/.test(document.getElementById("lessonInfo").innerText)), "permit: student form shows at once even when Google Fonts never answers");
  const q = { v: 1, n: "יוסי כהן", c: "י'1", d: "2026-11-02", t: "10:40", r: "רופא", x: "", l: "גמרא", w: "הרב", ts: 1730000000000 };
  let rel = 0;
  const pp = await page({ fonts: "hang", handler: (u, m, b) => { if (b && b.action === "release") { rel++; return { body: { ok: true } }; } return null; } });
  const url = B + "shichrur.html#p=" + b64(JSON.stringify(q));
  await pp.goto(url, { waitUntil: "domcontentloaded" }); await sleep(600);
  log(await pp.evaluate(() => !document.getElementById("stParent").hidden), "permit: parent screen shows at once with fonts blocked");
  const box = await pp.evaluate(() => { const r = document.getElementById("sigPad").getBoundingClientRect(); window.scrollTo(0, r.top + scrollY - 200); const r2 = document.getElementById("sigPad").getBoundingClientRect(); return { x: r2.left, y: r2.top, w: r2.width, h: r2.height }; });
  // אצבע אחת: מציירים קו
  const pts = Array.from({ length: 12 }, (_, i) => [box.x + 90 + i * 16, box.y + 70 + (i % 3) * 20]);
  await cdpTouch(pp, "touchStart", [pts[0]]);
  for (const pt of pts.slice(1)) { await cdpTouch(pp, "touchMove", [pt]); await sleep(10); }
  await cdpTouch(pp, "touchEnd", []); await sleep(100);
  const drawn = await pp.evaluate(() => { const c = document.getElementById("sigPad"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return { n, strokes: typeof strokes !== "undefined" ? strokes.length : -1, pts: typeof strokes !== "undefined" && strokes[0] ? strokes[0].length : 0, ph: document.getElementById("sigPh").hidden }; });
  log(drawn.n > 200 && drawn.strokes === 1 && drawn.pts >= 8 && drawn.ph, "signature: one finger draws a line", JSON.stringify(drawn));
  // שתי אצבעות: לא מגדיל, ולא שובר את הציור הבא
  const sc0 = await pp.evaluate(() => visualViewport.scale);
  await cdpTouch(pp, "touchStart", [[box.x + 120, box.y + 60], [box.x + 220, box.y + 90]]);
  for (let i = 1; i < 8; i++) { await cdpTouch(pp, "touchMove", [[box.x + 120 - i * 6, box.y + 60 - i * 3], [box.x + 220 + i * 6, box.y + 90 + i * 3]]); await sleep(10); }
  await cdpTouch(pp, "touchEnd", []); await sleep(200);
  log(await pp.evaluate(s => visualViewport.scale === s, sc0), "signature: two-finger pinch on the pad doesn't zoom");
  await cdpTouch(pp, "touchStart", [[box.x + 100, box.y + 120]]); for (let i = 1; i < 6; i++) await cdpTouch(pp, "touchMove", [[box.x + 100 + i * 20, box.y + 120]]); await cdpTouch(pp, "touchEnd", []); await sleep(100);
  const st = await pp.evaluate(() => ({ n: strokes.length, last: strokes[strokes.length - 1].length, drawing }));
  log(st.last >= 4 && st.drawing === false, "signature: a new one-finger line still draws after the pinch", JSON.stringify(st));
  // ניקוי וציור מחדש
  await pp.click("#sigClr"); await sleep(50);
  log(await pp.evaluate(() => strokes.length === 0 && !document.getElementById("sigPh").hidden), "signature: 'נקה' clears");
  await cdpTouch(pp, "touchStart", [pts[0]]); for (const pt of pts.slice(1)) await cdpTouch(pp, "touchMove", [pt]); await cdpTouch(pp, "touchEnd", []);
  await pp.type("#pName", "אמא כהן"); await pp.click("#pOk");
  const t0 = Date.now(); await pp.click("#btnSign"); await pp.click("#btnSign").catch(() => {}); // לחיצה כפולה
  await pp.waitForFunction(() => !document.getElementById("stDone").hidden, { timeout: 6000 }).catch(() => {});
  const took = Date.now() - t0;
  log(await pp.evaluate(() => !document.getElementById("stDone").hidden && document.getElementById("permit").height > 600), "permit is drawn even with the font blocked (waits ≤2.5s)", "took " + took);
  log(took < 4000, "permit: blocked font doesn't hang signing", took + "ms");
  await sleep(800);
  log(rel === 1, "release reported to staff once (double tap on sign)", "count " + rel);
  // ההורה מרענן ומאשר שוב – לא נרשם פעם שנייה
  await pp.goto(url + "&again", { waitUntil: "domcontentloaded" }); await pp.goto(url, { waitUntil: "domcontentloaded" }); await sleep(500);
  await pp.evaluate(() => { strokes.push([[.1, .1], [.2, .3], [.3, .5], [.5, .5]]); document.getElementById("pName").value = "אמא"; document.getElementById("pOk").checked = true; });
  await pp.click("#btnSign"); await pp.waitForFunction(() => !document.getElementById("stDone").hidden, { timeout: 6000 }).catch(() => {}); await sleep(800);
  log(rel === 1, "re-signing the same request after reload isn't reported again", "count " + rel);
}

// ---------- 2. מחשבון: לחיצות מהירות במקלדת נרשמות כולן ----------
{
  const p = await page({ profile: Y1 });
  await p.goto(B + "calc.html#solve", { waitUntil: "networkidle2" }); await sleep(300);
  const k = async v => p.evaluate(v => { const r = document.querySelector(`#keys [data-k="${v}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, v);
  await p.evaluate(() => document.getElementById("keys").scrollIntoView({ block: "center" })); await sleep(100);
  const seven = await k("7"), plus = await k("+");
  for (let i = 0; i < 8; i++) { await p.touchscreen.tap(...seven); }
  await p.touchscreen.tap(...plus); await p.touchscreen.tap(...seven); await p.touchscreen.tap(...seven);
  const v = await p.$eval("#sIn", e => e.value);
  log(v === "77777777+77", "calc: 11 rapid taps all register (no double-tap swallowing)", JSON.stringify(v));
  const bs = await k("BS"); for (let i = 0; i < 3; i++) await p.touchscreen.tap(...bs);
  log(await p.$eval("#sIn", e => e.value) === "77777777", "calc: rapid ⌫ taps", await p.$eval("#sIn", e => e.value));
  log(await p.evaluate(() => visualViewport.scale === 1), "calc: no zoom after rapid taps");
  // גרף: נגיעה וגלילה על הגרף לא שוברות כלום
  await p.goto(B + "calc.html#func", { waitUntil: "networkidle2" }); await sleep(200);
  await p.evaluate(() => { document.getElementById("fIn").value = "x²-4x+3"; document.getElementById("fGo").click(); }); await sleep(400);
  const g = await p.evaluate(() => { const r = document.querySelector("#fOut svg.plot").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.touchscreen.tap(...g); await p.touchscreen.tap(...g);
  log(await p.evaluate(() => !!document.querySelector("#fOut svg.plot path") && visualViewport.scale === 1), "calc: graph drawn; double tap on it doesn't zoom");
}

// ---------- 3. כרטיסיות: היפוך, לחיצות מהירות, התאמה ----------
{
  const p = await page({ profile: Y1 });
  await p.goto(B + "cards.html", { waitUntil: "networkidle2" }); await sleep(400);
  await p.evaluate(() => document.querySelector('.set[data-id="demo-eng-1"]').click()); await sleep(200);
  await p.evaluate(() => document.getElementById("mFlash").click()); await sleep(200);
  const f = await p.evaluate(() => { const r = document.getElementById("flip").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + 30]; });
  await p.touchscreen.tap(...f); await sleep(30);
  const on1 = await p.$eval("#flip", e => e.classList.contains("on"));
  await p.touchscreen.tap(...f); await sleep(30);
  const on2 = await p.$eval("#flip", e => e.classList.contains("on"));
  log(on1 && !on2, "cards: tap flips, a quick second tap flips back", `${on1} ${on2}`);
  // "ידעתי" מהר פעמיים = שני כרטיסים
  const pos0 = await p.$eval("#fPos", e => e.textContent);
  const yes = await p.evaluate(() => { const r = document.getElementById("fYes").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.touchscreen.tap(...yes); await p.touchscreen.tap(...yes);
  const pos1 = await p.$eval("#fPos", e => e.textContent);
  log(pos0.startsWith("1 /") && pos1.startsWith("3 /"), "cards: two quick taps on 'ידעתי' both count", `${pos0} → ${pos1}`);
  // התאמה עם נגיעות מהירות
  await p.evaluate(() => { document.getElementById("fQuit").click(); }); await sleep(100);
  await p.evaluate(() => document.getElementById("mMatch").click()); await sleep(200);
  const pairs = await p.evaluate(() => { const t = [...document.querySelectorAll("#mGrid .tile")]; const by = {}; t.forEach((e, i) => { (by[e.dataset.i] = by[e.dataset.i] || []).push(i); }); return Object.values(by).map(a => a.map(i => { const r = t[i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })); });
  for (const [a, b2] of pairs) { await p.evaluate((y) => window.scrollTo(0, 0), 0); await p.touchscreen.tap(...a); await p.touchscreen.tap(...b2); await sleep(20); }
  await sleep(700);
  log(await p.evaluate(() => !document.getElementById("vDone").hidden), "cards: match game finishes with fast taps", await p.$eval("#mLeft", e => e.textContent));
  log(await p.evaluate(() => document.documentElement.scrollWidth <= 390), "cards: no sideways overflow");
}

// ---------- 4. הורים: טלפון בלי עיצוב שמור ----------
{
  const p = await page({ handler: u => /api\/feed/.test(u) ? { body: { ok: true, now: Date.now(), updates: [{ id: "u1", text: "הודעה לכיתה", author: "המנהל", role: "admin", audience: "all", urgent: false, createdAt: Date.now() - 6e4, expiresAt: Date.now() + 36e5 }], polls: [], events: [], answers: [], birthdays: [], changes: [], maint: { until: null, msg: "x" } } } : null });
  const pp = b64(JSON.stringify({ c: "y1", f: "יוסי", l: "כהן", e: "minervi", m: "toni", j: "phys" }));
  await p.goto(B + "parent.html#p=" + pp, { waitUntil: "networkidle2" }); await sleep(800);
  const r = await p.evaluate(() => ({ title: document.getElementById("title").textContent, tabs: document.querySelectorAll("#tabs button").length, cards: document.querySelectorAll("#body .card").length, meta: document.querySelector('meta[name="theme-color"]').content,
    grad: getComputedStyle(document.querySelector(".top")).backgroundImage, ow: document.documentElement.scrollWidth, ta: getComputedStyle(document.documentElement).touchAction, upd: document.getElementById("updates").innerText, theme: localStorage.getItem("uiTheme") }));
  log(r.title.includes("יוסי") && r.tabs >= 5 && r.cards >= 1, "parent: renders the child's timetable", JSON.stringify(r));
  log(r.meta === "#5b6cff" && /linear-gradient/.test(r.grad) && r.theme === null, "parent: default purple theme, nothing stored", JSON.stringify([r.meta, r.theme]));
  log(r.ow <= 390, "parent: no sideways overflow", r.ow);
  log(r.ta === "manipulation", "parent: theme.js loaded (no double-tap zoom)", r.ta);
  log(/הודעה לכיתה/.test(r.upd), "parent: staff update shown", r.upd);
  const n0 = p.reqs.filter(x => /api\/feed/.test(x.u)).length;
  await p.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); }); await sleep(300);
  log(p.reqs.filter(x => /api\/feed/.test(x.u)).length === n0, "parent: coming back within a minute doesn't refetch", "");
  log(!p.reqs.some(x => x.body && (x.body.action === "hello" || x.body.action === "err")), "parent: sends no hello / error reports", JSON.stringify(p.reqs.map(x => x.body && x.body.action)));
}

// ---------- 5. ספר טלפונים: שמירה כשהשרת לא מחזיר את איש הקשר ----------
{
  const p = await page({ profile: Y1, store: { pbCode: JSON.stringify("ABCD-EFGH-JKLM") }, handler: (u, m, b) => {
    if (!/api\/contacts/.test(u)) return null;
    if (m === "GET") return { body: { ok: true, contacts: [{ name: "טוני כהן", phone: "050-1111111", note: "" }] } };
    if (b && b.action === "check") return { body: { ok: true } };
    if (b && b.action === "set") return { body: { ok: true } }; // בלי contact
    return { body: { ok: false } };
  } });
  await p.goto(B + "phones.html", { waitUntil: "networkidle2" }); await sleep(400);
  await p.click("#editBtn"); await sleep(400);
  const ok = await p.evaluate(async () => { const i = document.querySelector('[data-ph="טוני כהן"]'); if (!i) return "no input"; i.value = "050-2222222"; document.querySelector('[data-save="טוני כהן"]').click(); await new Promise(r => setTimeout(r, 400));
    document.getElementById("eDone").click(); await new Promise(r => setTimeout(r, 100)); return document.querySelector('.ct[data-n="טוני כהן"] .ph')?.textContent || "none"; });
  log(ok === "050-2222222", "phones: save works even when the server reply has no contact", ok);
  log(await p.evaluate(() => document.getElementById("list").children.length > 3), "phones: list still renders after that save");
}

// ---------- 6. דמו: שלום/תקלה, בלי השעיה/מצב עדכון כברירת מחדל, הדמיות מהלוח ----------
{
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1400, height: 900 });
  p.on("pageerror", e => errs.push("demo: " + e.message)); p.on("dialog", d => d.accept());
  const out = []; p.on("request", q => { if (/netlify\.app/.test(q.url())) out.push(q.url()); });
  await p.goto(B + "demo.html", { waitUntil: "networkidle2" }); await sleep(2500);
  const r = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)), W = () => document.getElementById("frame").contentWindow, D = () => W().document, o = {};
    D().querySelectorAll("dialog[open]").forEach(d => d.close());
    o.hello = await (await W().fetch(SERVER_BASE + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hello", device: "x", name: "a", cls: "y1" }) })).json();
    o.err = await (await W().fetch(SERVER_BASE + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "err", msg: "boom" }) })).json();
    o.feedMaint = (await (await W().fetch(SERVER_BASE + "/api/feed")).json()).maint;
    W().reportError2 && W().reportError2("demo test error", "x.js:1:1");
    o.def = { maint: D().body.classList.contains("maint"), wall: !!D().getElementById("suspWall"), own: D().getElementById("ownBox") ? D().getElementById("ownBox").hidden : "none", appCtl: "appCtl" in window.__DEMO_HOST.store };
    const wait = async (f, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
    document.getElementById("simMaint").click(); o.m1 = await wait(() => D().body.classList.contains("maint") && /בעדכון/.test(D().getElementById("maintBar").innerText));
    o.mBtn = document.getElementById("simMaint").className;
    await sleep(1500); o.mStay = D().body.classList.contains("maint"); // רענון הפיד לא מכבה
    document.getElementById("simMaint").click(); await sleep(400); o.m0 = await wait(() => D().readyState === "complete" && D().getElementById("maintBar") && !D().body.classList.contains("maint") && !D().getElementById("maintBar").innerText.trim());
    document.getElementById("simSusp").click(); o.s1 = await wait(() => !!D().getElementById("suspWall") && /הוריד לך/.test(D().getElementById("suspWall").innerText));
    document.getElementById("simSusp").click(); await sleep(400); o.s0 = await wait(() => D().readyState === "complete" && D().getElementById("maintBar") && !D().getElementById("suspWall"));
    document.getElementById("simMsg").click(); o.msg = await wait(() => D().getElementById("ownBox") && !D().getElementById("ownBox").hidden && /הודעה לדוגמה/.test(D().getElementById("ownBox").innerText));
    D().querySelector("[data-omread]") && D().querySelector("[data-omread]").click(); await sleep(200); o.msgRead = D().getElementById("ownBox").hidden;
    // מעבר למסכים אחרים עם ההודעה: אין השעיה/הפניה
    document.querySelector('#nav [data-p="calc.html"]').click(); o.calc = await wait(() => /calc/.test(W().location.pathname) && D().getElementById("keys"));
    document.querySelector('#nav [data-p="phones.html"]').click(); o.phones = await wait(() => /phones/.test(W().location.pathname) && D().getElementById("list") && D().getElementById("list").children.length > 0);
    return o;
  });
  log(r.hello && r.hello.ok && r.hello.maint === null && r.hello.susp === null && Array.isArray(r.hello.msgs) && !r.hello.msgs.length, "demo: hello answered harmlessly", JSON.stringify(r.hello));
  log(r.err && r.err.ok, "demo: error report answered", JSON.stringify(r.err));
  log(r.feedMaint === null, "demo: feed has maint:null", JSON.stringify(r.feedMaint));
  log(!r.def.maint && !r.def.wall && r.def.own === true && !r.def.appCtl, "demo: no update mode / suspension / owner message by default", JSON.stringify(r.def));
  log(r.m1 && r.mBtn === "on" && r.mStay, "demo panel: 'מצב עדכון' shows the update bar (and stays after feed refresh)", JSON.stringify(r));
  log(r.m0, "demo panel: second click turns update mode off");
  log(r.s1, "demo panel: 'השעיה' shows the suspension wall");
  log(r.s0, "demo panel: second click removes the wall");
  log(r.msg && r.msgRead, "demo panel: owner message appears and 'קראתי' hides it", JSON.stringify([r.msg, r.msgRead]));
  log(r.calc && r.phones, "demo: calculator and phone book open from the panel", JSON.stringify([r.calc, r.phones]));
  log(!out.length, "demo: nothing sent to the real server", out.join(" "));
}

log(!errs.length, "no page errors", errs.join(" | "));
await browser.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
