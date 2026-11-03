import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט ל"הרובוט שלי": מתנת רצף יומית, פתיחת תיבה, ארון (ללבוש), חנות, עיצוב שנפתח, ואביזר חג
import puppeteer from "puppeteer-core";
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(s); }).listen(8797, "127.0.0.1");
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", "1"); localStorage.setItem("profile", JSON.stringify({ first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" }));
  localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("asstGreeted", "1"); localStorage.setItem("updatesSeen", "[]"); localStorage.setItem("roboTest", "1");
  localStorage.setItem("tef", JSON.stringify({ d: new Date().toISOString().slice(0, 10), a: "yes" })); });
await p.setRequestInterception(true); p.on("request", q => /^http:\/\/localhost:8797/.test(q.url()) ? q.continue() : q.abort());
await p.goto("http://localhost:8797/index.html", { waitUntil: "domcontentloaded" });
await p.evaluate(() => document.querySelectorAll(".upd-pop").forEach(x => x.remove()));
let day = false; for (let i = 0; i < 20 && !day; i++) { await sleep(600); day = await p.evaluate(() => !!document.querySelector("#roboDay[open] #rdGo")); }
log(day, "first open of the day: streak popup with a gift");
log(await p.evaluate(() => /יום 1/.test(document.getElementById("roboDay").innerText)), "streak = 1");
await p.click("#rdGo"); await sleep(900);
log(await p.evaluate(() => !!document.querySelector("#roboOpen[open] .ro-chest")), "gift box opens (tap the box)");
for (let i = 0; i < 4; i++) { await p.click("#roboOpen .ro"); await sleep(450); }
log(await p.evaluate(() => /לחץ לפתוח/.test(document.querySelector("#roboOpen .ro-hint").textContent)), "after the upgrade taps: the kid opens it himself");
await p.click("#roboOpen .ro"); await sleep(400);
log(await p.evaluate(() => !!document.querySelector("#roboOpen .ro-chest.open")), "4 taps (it can upgrade on each) → the chest opens");
await sleep(1300);
log(await p.evaluate(() => !!document.querySelector("#roboOpen .ro-card .ro-in .ro-nm")), "prize card appears");
for (let i = 0; i < 25 && !(await p.evaluate(() => !!document.querySelector("#roboOpen #roDone"))); i++) { await p.evaluate(() => { const r = document.querySelector("#roboOpen .ro"); r && r.click(); }); await sleep(700); } // כולל מסך "משהו נדיר מגיע" ותיבות נוספות
log(await p.evaluate(() => !!document.querySelector("#roboOpen #roDone")), "summary of what you got");
await p.click("#roboOpen #roDone"); await sleep(600);
const st = await p.evaluate(() => Robo.state());
log(st.st.n === 1 && st.boxes.length === 0 && (Object.keys(st.own).length > 1 || st.bolts > 0), "the prize is saved on the phone", JSON.stringify(st).slice(0, 200));
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(6000);
log(!(await p.evaluate(() => !!document.querySelector("#roboDay[open]"))), "second open the same day: no popup again");
// ארון: לובשים כתר → הרובוט של העוזר מתעדכן
await p.evaluate(() => { Robo.give({ t: "item", id: "hat:crown" }); Robo.open("wear"); });
await sleep(500); await p.evaluate(() => document.querySelector('#roboUI [data-c="hat"]').click()); await sleep(300);
await p.evaluate(() => document.querySelector('#roboUI .rc[data-id="hat:crown"]').click()); await sleep(500);
log(await p.evaluate(() => Robo.state().eq.hat === "hat:crown"), "tap an owned item → wearing it");
log(await p.evaluate(() => { const b = document.getElementById("asstBtn"); return !!b && b.innerHTML.includes("cr\""); }), "the assistant robot on the screen wears it too");
await p.evaluate(() => document.querySelector('#roboUI .rc[data-id="hat:wizard"]').click()); await sleep(300);
log(await p.evaluate(() => Robo.state().eq.hat === "hat:crown" && !!document.querySelector(".rtoast")), "locked item → explains how to get it (not worn)");
// חנות: קונים תיבה גדולה בברגים
await p.evaluate(() => { Robo.give({ t: "bolts", n: 300 }); document.querySelector('#roboUI [data-t="shop"]').click(); }); await sleep(400);
const before = await p.evaluate(() => Robo.state().bolts);
await p.evaluate(() => document.querySelector('#roboUI [data-buy="big"]').click()); await sleep(400);
log(await p.evaluate(b0 => Robo.state().bolts === b0 - 130 && Robo.state().boxes.includes("big"), before), "shop: buy a big box with bolts");
await p.evaluate(() => document.getElementById("roboUI").close());
// עיצוב לאפליקציה: מופיע בבחירת הצבע רק אחרי שזכו בו
await p.evaluate(() => openProfile()); await sleep(400);
log(!(await p.evaluate(() => !!document.querySelector('#profBody [data-th="neon"]'))), "locked app theme is hidden in the profile");
await p.evaluate(() => { document.getElementById("profDlg").close(); Robo.give({ t: "item", id: "theme:neon" }); openProfile(); }); await sleep(400);
log(await p.evaluate(() => !!document.querySelector('#profBody [data-th="neon"]')), "won theme appears in the profile colors");
log(await p.evaluate(() => !!document.querySelector('#profBody [data-sec="robo"] #pfRobo button')), "profile: 'my robot' section with buttons");
log(await p.evaluate(() => { const d = document.querySelector('#profBody [data-sec="push"]'); return !!d && !d.open; }), "profile: notifications are inside a closed drawer");
// 💬 קריאה כשלוחצים על הרובוט · 🔩 בונוס תרגול · 🔊 צלילים לא שוברים כלום
await p.evaluate(() => { Robo.give({ t: "item", id: "quote:boom" }); const s = Robo.state(); s.eq.quote = "quote:boom"; Robo.give({ t: "bolts", n: 0 }); });
await sleep(300);
await p.evaluate(() => { const b = document.getElementById("asstBtn"), r = b.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerId: 1 }; b.dispatchEvent(new PointerEvent("pointerdown", o)); b.dispatchEvent(new PointerEvent("pointerup", o)); });
await sleep(400);
log(await p.evaluate(() => { const q = document.querySelector(".robo-say"); return !!q && /בום/.test(q.textContent); }), "tap the robot → it says its quote");
await p.evaluate(() => { const x = document.getElementById("asstP"); if (x && !x.hidden) { const c = x.querySelector(".ax"); c && c.click(); } });
const e0 = await p.evaluate(() => Robo.state().bolts);
const got = await p.evaluate(() => { let g = 0; for (let i = 0; i < 60; i++) g += Robo.earn(6); return g; });
log(got === 150 && await p.evaluate(b0 => Robo.state().bolts === b0 + 150, e0), "practice bonus: +bolts, capped at 150 a day", got);
log(await p.evaluate(() => { try { Robo.sfx.tap(); Robo.sfx.up(3); Robo.sfx.reveal(5); Robo.sfx.coin(); return true; } catch (e) { return String(e); } }) === true, "sounds play without errors");
await p.evaluate(() => { localStorage.setItem("roboMute", "1"); });
log(await p.evaluate(() => Robo.sfx.muted()), "mute is remembered");
// כפתור במסך הראשי + העוזר מכיר את הרובוט
log(await p.evaluate(() => { const b = document.getElementById("roboBtn"); return !!b && /הרובוט שלי/.test(b.textContent); }), "home screen: '🤖 הרובוט שלי' button");
await p.evaluate(() => document.getElementById("roboBtn").click()); await sleep(500);
log(await p.evaluate(() => !!document.querySelector("#roboUI[open]")), "home button opens the closet");
await p.evaluate(() => document.getElementById("roboUI").close());
// חג: הרובוט מחזיק משהו של החג
await p.goto("http://localhost:8797/index.html?hol=hanukkah", { waitUntil: "domcontentloaded" }); await sleep(3000);
log(await p.evaluate(() => (document.getElementById("asstBtn") || {}).innerHTML.includes("🍩")), "Hanukkah: the robot holds a sufganiya 🍩");
await p.goto("http://localhost:8797/index.html?hol=off", { waitUntil: "domcontentloaded" }); await sleep(1500);
log(!errs.length, "no errors", errs.join(" | "));
console.log(`errors: ${JSON.stringify(errs)} ${res.filter(Boolean).length}/${res.length} passed`);
await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
