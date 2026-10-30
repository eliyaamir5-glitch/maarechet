import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// "קוף": לוחץ על כל כפתור/קישור/צ'יפ בכל מסך, בטלפון ובמחשב, בכהה ובבהיר – ומחפש שגיאות, גלישה לרוחב, וחלונות שאי אפשר לסגור
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = "http://localhost:8787/";
const issues = []; let clicks = 0;
const note = (where, what) => { issues.push(`${where}: ${what}`); };
const T0 = new Date("2026-10-28T10:40:00").getTime(); // רביעי באמצע שיעור
const parentHash = Buffer.from(JSON.stringify({ f: "יוסי", l: "כהן", c: "y2", e: "minervi", m: "toni", j: "phys" })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const PAGES = ["index.html", "cards.html", "calc.html", "calc.html#solve", "calc.html#sys", "calc.html#func", "calc.html#line", "calc.html#tri", "calc.html#pct", "phones.html", "absences.html#demo", "shichrur.html", "about.html", "parent.html#p=" + parentHash, "staff.html", "demo.html"];
async function newPage(w, scheme) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w < 700 ? 844 : 900, isMobile: w < 700, hasTouch: w < 700 });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await p.evaluateOnNewDocument(t => {
    const R = Date, off = t - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D;
    if (!localStorage.getItem("profile")) { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "y2", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); localStorage.setItem("feedOk", "1");
      localStorage.setItem("sets", JSON.stringify([{ id: "s1", title: "בדיקה", subject: "היסטוריה", cards: [{ t: "1948", d: "מלחמת העצמאות" }, { t: "1967", d: "ששת הימים" }, { t: "1973", d: "יום כיפור" }, { t: "1982", d: "לבנון" }] }])); }
    window.open = () => null; // שלא ייפתחו חלונות חיצוניים
    try { navigator.share = undefined; } catch (e) {}
  }, T0);
  await p.setRequestInterception(true);
  p.on("request", r => { const u = r.url(); if (/netlify\.app|web3forms|mymemory|dictionaryapi|wiktionary/.test(u)) return r.respond({ status: 200, contentType: "application/json", body: '{"ok":true,"updates":[],"sets":[],"contacts":[],"needsSetup":false}', headers: { "Access-Control-Allow-Origin": "*" } }); r.continue(); });
  p.on("dialog", d => d.dismiss().catch(() => {}));
  return p;
}
for (const scheme of ["dark", "light"]) for (const w of [360, 1440]) {
  for (const url of PAGES) {
    const where = `${url.slice(0, 40)} @${w}px ${scheme}`;
    const p = await newPage(w, scheme);
    const errs = []; p.on("pageerror", e => errs.push(e.message));
    try { await p.goto(BASE + url, { waitUntil: "networkidle2", timeout: 20000 }); } catch (e) { note(where, "load failed " + e.message); await p.close(); continue; }
    await sleep(900);
    const startUrl = p.url();
    // כל מה שאפשר ללחוץ עליו ונראה
    const count = await p.evaluate(() => {
      const els = [...document.querySelectorAll("button, a[href], summary, [data-go], .set, .tile, .chip, [role=button], .ct, .popt, .dchip, .opt")]
        .filter(e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && !e.closest("[hidden]") && !e.disabled; });
      els.forEach((e, i) => e.setAttribute("data-mk", i)); return els.length;
    });
    for (let i = 0; i < Math.min(count, 120); i++) {
      if (p.url().split("#")[0] !== startUrl.split("#")[0]) { await p.goto(startUrl, { waitUntil: "networkidle2" }).catch(() => {}); await sleep(500);
        await p.evaluate(() => { const els = [...document.querySelectorAll("button, a[href], summary, [data-go], .set, .tile, .chip, [role=button], .ct, .popt, .dchip, .opt")].filter(e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && !e.closest("[hidden]") && !e.disabled; }); els.forEach((e, i) => e.setAttribute("data-mk", i)); }); }
      const info = await p.evaluate(i => { const e = document.querySelector(`[data-mk="${i}"]`); if (!e) return null; const r = e.getBoundingClientRect(); const href = e.getAttribute("href") || ""; return { tag: e.tagName, text: (e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 30), href, ext: /^(https?:|tel:|sms:|mailto:|webcal:)/.test(href) || e.target === "_blank" || /logout|יציאה/.test(e.id + e.textContent), visible: r.width > 0 && r.height > 0 && !e.closest("[hidden]") && getComputedStyle(e).visibility !== "hidden" }; }, i);
      if (!info || !info.visible) continue;
      if (info.ext) { if (/^https?:\/\/$|undefined|null/.test(info.href)) note(where, `bad link "${info.text}" → ${info.href}`); continue; }
      const before = errs.length;
      try { await p.$eval(`[data-mk="${i}"]`, e => e.scrollIntoView({ block: "center" })); await p.click(`[data-mk="${i}"]`, { delay: 10 }); clicks++; } catch (e) { continue; }
      await sleep(350);
      if (errs.length > before) note(where, `error after "${info.text}": ${errs.slice(before).join(" | ").slice(0, 160)}`);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth).catch(() => 0);
      if (sw > w + 2) note(where, `horizontal overflow ${sw}px after "${info.text}"`);
      // חלון פתוח? חייב להיסגר ב-Escape או בכפתור
      const open = await p.evaluate(() => !!document.querySelector("dialog[open]")).catch(() => false);
      if (open) {
        await p.keyboard.press("Escape"); await sleep(200);
        const still = await p.evaluate(() => { const d = document.querySelector("dialog[open]"); if (!d) return false; const c = d.querySelector('[value="cancel"],[value="ok"],.ghost,button'); if (c) c.click(); return !!document.querySelector("dialog[open]"); }).catch(() => false);
        if (still) note(where, `dialog after "${info.text}" could not be closed`);
      }
      // שכבות קופצות (עדכונים, סרטון) – סוגרים
      await p.evaluate(() => { document.querySelectorAll(".upd-vid .upd-vclose,.upd-ok").forEach(x => x.click()); }).catch(() => {});
    }
    if (errs.length) note(where, `page errors: ${[...new Set(errs)].join(" | ").slice(0, 200)}`);
    await p.close();
  }
  console.log(`done ${scheme} ${w}px – clicks so far ${clicks}, issues ${issues.length}`);
}
await b.close();
console.log(`\nTOTAL clicks: ${clicks}\nISSUES (${issues.length}):\n` + [...new Set(issues)].join("\n"));
