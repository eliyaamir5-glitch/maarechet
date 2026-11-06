import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
// רובוט לעונה 4 של "הרובוט שלי": לשונית כיף, גלגל מזל, מסע, מעבדה, סטים, שוק (עם השרת האמיתי בזיכרון), משחק "ברגים נופלים" ונעילה בזמן שיעור
import puppeteer from "puppeteer-core";
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
const res = []; const log = (ok, n, x = "") => { res.push(!!ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(s); }).listen(8798, "127.0.0.1");
// השרת האמיתי (staff.mjs) עם אחסון בזיכרון
const mod = await import("../../netlify/functions/staff.mjs"); mod.__useMemoryStore(); mod.__setRoboReset(0);
let ipN = 0;
const call = async (body) => { const r = await mod.default(new Request("http://localhost/api/feed", { method: "POST", headers: { "Content-Type": "application/json", origin: "http://localhost:8798" }, body: JSON.stringify(body) }), { ip: "9.9.9." + (++ipN % 250) }); return r.json(); };
const ME = "device-robo4-0001", FRIEND = "device-robo4-0002";
await call({ action: "hello", device: ME, name: "דני לוי", cls: "y1", ver: "x" });
await call({ action: "hello", device: FRIEND, name: "יוסי כהן", cls: "y2", ver: "x" });
await call({ action: "robo", device: FRIEND, op: "goalAdd", n: 900 }); // 🤝 מטרת השכבה – חבר מאותה שכבה כבר תרם
const listed = await call({ action: "robo", device: FRIEND, op: "marketSell", item: "hat:tiara", r: "e", price: 150 });

const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.evaluateOnNewDocument((me) => { if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", "1"); localStorage.setItem("profile", JSON.stringify({ first: "דני", last: "לוי", cls: "y1", dorm: "yes", eng: "hadad", math: "adir", major: "cs", since: "2026-09-01" }));
  localStorage.setItem("deviceId", me); localStorage.setItem("introSeen", "1"); localStorage.setItem("seenVersion", "9999"); localStorage.setItem("asstGreeted", "1"); localStorage.setItem("updatesSeen", "[]"); localStorage.setItem("roboTest", "1"); localStorage.setItem("roboRunTut", "1"); localStorage.setItem("roboIntro", "1");
  localStorage.setItem("robo", JSON.stringify({ st: { n: 1, last: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()), best: 1 }, g1000: 1, bolts: 2000 }));
  localStorage.setItem("tef", JSON.stringify({ d: new Date().toISOString().slice(0, 10), a: "yes" })); }, ME);
await p.setRequestInterception(true);
p.on("request", async q => {
  const u = q.url();
  if (/^http:\/\/localhost:8798/.test(u)) return q.continue();
  if (/lucent-crepe-6db22c\.netlify\.app\/api\/feed/.test(u) && q.method() === "POST") { try { const j = await call(JSON.parse(q.postData() || "{}")); return q.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(j) }); } catch (e) { return q.abort(); } }
  if (q.method() === "OPTIONS") return q.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,GET" } });
  q.abort();
});
await p.goto("http://localhost:8798/index.html", { waitUntil: "domcontentloaded" }); await sleep(2500);
await p.evaluate(() => document.querySelectorAll(".upd-pop").forEach(x => x.remove()));
log(await p.evaluate(() => !!window.RoboPlus && typeof Asst.todayLessons === "function"), "robo-plus.js loaded + assistant shares today's lessons");
// לשונית כיף
await p.evaluate(() => Robo.open("fun")); await sleep(500);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/1-fun.png" });
log(await p.evaluate(() => document.querySelectorAll("#roboUI .rp-t").length === 12), "fun tab: 12 tiles (game, run, wheel, map, lab, market, leaderboard, upgrades, sets, bonuses, titles, photo booth)");
// 🎰 גלגל
await p.evaluate(() => document.querySelector('#roboUI [data-p="wheel"]').click()); await sleep(300);
const s0 = await p.evaluate(() => { const s = Robo.state(); return { b: s.bolts, x: s.boxes.length }; });
await p.evaluate(() => document.querySelector("#rpSpin").click()); await sleep(4800);
const s1 = await p.evaluate(() => { const s = Robo.state(); return { b: s.bolts, x: s.boxes.length, w: s.wheel, m: (s.map || {}).p }; });
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/2-wheel.png" });
log((s1.b > s0.b || s1.x > s0.x) && s1.w && s1.m >= 1, "wheel: spin → prize (bolts or box) + a map step", JSON.stringify([s0, s1]));
log(await p.evaluate(() => document.querySelector("#rpSpin").disabled), "wheel: only once a day");
// 🗺️ מסע
await p.evaluate(() => { const s = Robo.state(); s.map = { p: 25, c: 0 }; Robo.open("fun", "map"); }); await sleep(500);
log(await p.evaluate(() => document.querySelectorAll("#roboUI .rp-st").length === 40 && document.querySelectorAll("#roboUI .rp-st.ready").length === 2), "map: 40 stations, 2 treasures ready");
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/3-map.png" });
const mb = await p.evaluate(() => Robo.state().bolts);
await p.evaluate(() => document.querySelector("#rpClaim").click()); await sleep(500);
log(await p.evaluate(() => { const o = document.querySelector("#roboUI .rw-reward"); if (!o) return false; const r = o.getBoundingClientRect(); return o.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) && !!o.querySelector(".rw-chest"); }), "map: treasure screen pops up on top with a chest");
await p.evaluate(() => document.querySelector("#roboUI .rw-reward").click()); await sleep(1900);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/3b-map-reward.png" });
log(await p.evaluate(b0 => { const o = document.querySelector("#roboUI .rw-reward"); return !!o && o.querySelectorAll(".rw-card").length === 2 && /110/.test(o.innerText) && +o.querySelector("#rwCnt").textContent === Robo.state().bolts && Robo.state().bolts === b0 + 110; }, mb), "map: shows what you got (110 bolts + a box) and the bolt counter climbs");
await p.evaluate(() => document.querySelector('#roboUI .rw-reward [data-a="later"]').click()); await sleep(300);
log(await p.evaluate(() => { const s = Robo.state(); return s.map.c === 2 && s.boxes.includes("box") && !document.querySelector(".rw-reward"); }), "map: treasures saved, screen closed");
// 🔨 מעבדה
await p.evaluate(() => { const ids = RoboCore.LIST.filter(x => x.r === "c" && !x.free && x.cat !== "theme" && x.cat !== "page").slice(0, 5).map(x => x.id); ids.forEach(id => Robo.give({ t: "item", id, r: "c" })); window.__lab = ids; Robo.open("fun", "lab"); }); await sleep(400);
for (let i = 0; i < 5; i++) { await p.evaluate(i => document.querySelector(`#roboUI .rc[data-id="${window.__lab[i]}"]`).click(), i); await sleep(120); }
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/4-lab.png" });
log(await p.evaluate(() => !document.querySelector("#rpLab").disabled && document.querySelectorAll("#roboUI .lb-slot.f").length === 5 && document.querySelectorAll("#roboUI .lb-badge").length === 5), "lab: 5 items shown in the machine slots, button ready");
await p.evaluate(() => document.querySelector("#roboUI .lb-slot.f").click()); await sleep(200);
log(await p.evaluate(() => document.querySelectorAll("#roboUI .lb-slot.f").length === 4 && document.querySelector("#rpLab").disabled), "lab: tap an item in the machine → it comes out");
await p.evaluate(() => document.querySelector(`#roboUI .rc[data-id="${window.__lab[0]}"]`).click()); await sleep(200);
await p.evaluate(() => document.querySelector("#rpLab").click()); await sleep(1500);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/5-labmix.png" });
log(await p.evaluate(() => { const o = document.querySelector("#roboUI .rp-lab"); if (!o) return false; const r = o.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + 40); return o.contains(el) && document.querySelectorAll(".lx-it").length === 5; }), "lab: mixing animation is visible on top (5 items swirling)");
await sleep(3000);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/5-labresult.png" });
log(await p.evaluate(() => !!document.querySelector(".rp-lab .lx-card") && document.querySelectorAll(".lx-sum .lx-i").length === 6 && window.__lab.every(id => !Robo.state().own[id])), "lab: result screen shows what you put in (5) and what you got");
await p.evaluate(() => document.querySelector('.rp-lab [data-a="close"]').click()); await sleep(300);
// 🎭 סטים
await p.evaluate(() => { const st = RoboCore.SETS.find(x => x.id === "gems"); window.__gb = Robo.state().bolts; st.ids.forEach(id => Robo.give({ t: "item", id })); }); await sleep(1500);
log(await p.evaluate(() => Robo.state().sets && Robo.state().sets.gems && Robo.state().bolts >= window.__gb + 800), "full set (gems) → prize once (mega box + 800 bolts)");
await p.evaluate(() => Robo.open("fun", "sets")); await sleep(300);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/6-sets.png" });
log(await p.evaluate(() => document.querySelectorAll("#roboUI .rp-set").length === RoboCore.SETS.length && !!document.querySelector("#roboUI .rp-set.done")), "sets panel shows progress");
// 📋 משימות יומיות
await p.evaluate(() => { const m = RoboCore.missions(Robo.state()); for (const id of m.ids) Robo._.trk(RoboCore.MISSIONS[id].ev, 999); Robo.open("fun"); }); await sleep(500);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/s5-fun.png" });
const mb0 = await p.evaluate(() => Robo.state().bolts);
for (let i = 0; i < 3; i++) { await p.evaluate(() => { const b = document.querySelector("#roboUI [data-mc]"); b && b.click(); }); await sleep(300); await p.evaluate(() => { const o = document.querySelector(".rw-reward"); o && o.click(); }); await sleep(900); await p.evaluate(() => { const b = document.querySelector('.rw-reward [data-a="later"], .rw-reward [data-a="ok"]'); b && b.click(); }); await sleep(300); }
log(await p.evaluate(b0 => { const s = Robo.state(); return s.ms.all === 1 && s.bolts > b0 && s.boxes.includes("big"); }, mb0), "daily missions: 3 claimed → bolts + a big box");
// 👑 האגדה: אוספים את כל הגיבורים → השרת נותן את האגדה לראשון
await p.evaluate(() => { const st = RoboCore.SETS.find(x => x.id === "heroes"); for (const id of st.ids) Robo.give({ t: "item", id }); }); await sleep(4500);
log(await p.evaluate(() => !!Robo.state().own["skin:legend"] && /האגדה/.test((document.querySelector("#roboAnn[open]") || {}).innerText || "")), "collect all heroes → first one gets 'the legend' 👑");
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/s5-legend-win.png" });
await p.evaluate(() => document.querySelector("#roboAnn #annOk").click()); await sleep(400);
log(await p.evaluate(() => Robo.state().eq.skin === "skin:legend"), "wearing the legend");
await p.evaluate(() => Robo.open("fun", "legend")); await sleep(500);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/s5-legend-panel.png" });
const leg2 = await call({ action: "robo", device: FRIEND, op: "claim", item: "skin:legend" });
log(leg2.ok && leg2.granted === false, "a second kid can't get the legend (only one in the school)", JSON.stringify(leg2));
await p.evaluate(() => { const s = Robo.state(); s.eq.skin = "skin:classic"; });
// 🕵️ שוק
await p.evaluate(() => Robo.open("fun", "market")); await sleep(1500);
log(await p.evaluate(() => /יוסי כהן/.test(document.getElementById("rpMk").innerText) && !!document.querySelector('#rpMk [data-buy]')), "market: friend's listing shows (name + price)", JSON.stringify(listed));
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/7-market.png" });
const bb = await p.evaluate(() => Robo.state().bolts);
await p.evaluate(() => { window.confirm = () => true; document.querySelector('#rpMk [data-buy]').click(); }); await sleep(1500);
log(await p.evaluate(b0 => Robo.state().own["hat:tiara"] && Robo.state().bolts === b0 - 150, bb), "market: buy → item in my closet, 150 bolts paid");
const fin = await call({ action: "robo", device: FRIEND, op: "inbox" });
log(fin.inbox.some(x => x.t === "sold" && x.price === 150 && x.from === "דני לוי"), "seller gets a 'sold' message");
// מוכרים אביזר
await p.evaluate(() => { document.querySelector('#roboUI [data-s="sell"]').click(); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rpSell").click()); await sleep(300);
await p.evaluate(() => { document.querySelector('#roboUI [data-c="hat"]').click(); }); await sleep(200);
await p.evaluate(() => document.querySelector('#roboUI .rc[data-id="hat:tiara"]').click()); await sleep(300);
log(await p.evaluate(() => { const r = document.querySelector("#rpP"); return r && +r.min === 100 && +r.max === 800; }), "sell: price slider limited to the rarity range (epic 100–800)");
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/8-sell.png" });
await p.evaluate(() => document.querySelector("#rpGo").click()); await sleep(1500);
log(await p.evaluate(() => !Robo.state().own["hat:tiara"] && /מחכה לקונה/.test(document.getElementById("rpMk").innerText)), "sell: item leaves the closet and waits in the market");
await p.evaluate(() => document.querySelector("#rpMk [data-cancel]").click()); await sleep(1500);
log(await p.evaluate(() => !!Robo.state().own["hat:tiara"]), "cancel → item back in the closet");
// 🎮 ברגים נופלים: נעילה בשיעור
const lock = await p.evaluate(() => { const d = new Date("2026-11-09T12:00:00"); const t = Asst.todayLessons(d); if (!t || !t.L.length) return "no lessons"; const [h, m] = t.L[0].s.split(":").map(Number); d.setHours(h, m + 5, 0, 0); const a = RoboPlus.breakState(d.getTime()); const e = new Date(d); e.setHours(17, 0); const c = RoboPlus.breakState(e.getTime()); const f = new Date("2026-11-13T10:00:00"); return [a.open, c.open, RoboPlus.breakState(f.getTime()).open]; });
log(JSON.stringify(lock) === "[false,true,true]", "game: locked during a lesson, open after 16:15 and on Friday", JSON.stringify(lock));
// משחק (פותחים בכוח לבדיקה)
await p.evaluate(() => { localStorage.setItem("roboGameOpen", "1"); Robo.open("fun", "game"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(2500);
log(await p.evaluate(() => !!document.querySelector("#roboGame[open] canvas")), "game: canvas running");
log(await p.evaluate(() => { const c = document.querySelector("#roboGame canvas"); return c.width > 200 && c.height > 250; }), "game: canvas has a real size (things are visible)");
log(await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight, t0 = G.t; G.t = 0; const v1 = G.spawnAt("bomb", 50, -40).v; G.bolts = 300; const v7 = G.spawnAt("bomb", 50, -40).v; G.bolts = 0; G.obj = []; G.t = t0; return v7 > v1 * 1.5; }), "levels: every 50 bolts the game gets faster (level 7 ≫ level 1)");
// 🦹 גנב לוקח חצי · 🛡️ מגן מציל · ⚡ מהירות עולה
const th = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.obj = []; G.nthief = G.nbomb = 99; G.bolts = 20; G.spawnAt("thief", G.px, H - 75, { v: 30, amp: 0 }); await new Promise(r => setTimeout(r, 900)); return { b: G.bolts, st: G.stolen }; });
log(th.b === 10 && th.st === 10, "thief caught → takes half of the round (20 → 10)", JSON.stringify(th));
const sh = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.obj = []; G.nthief = G.nbomb = 99; G.spawnAt("pow", G.px, H - 75, { v: 30, p: "shield" }); await new Promise(r => setTimeout(r, 700)); const had = G.shield; G.spawnAt("bomb", G.px, H - 75, { v: 30, vx: 0 }); await new Promise(r => setTimeout(r, 700)); return { had, now: G.shield, dead: G.dead, b: G.bolts }; });
log(sh.had && !sh.now && !sh.dead && sh.b === 10, "shield power-up saves you from one bomb", JSON.stringify(sh));
log(await p.evaluate(() => { const G = RoboPlus._game(), t0 = G.t; G.t = 0; const a = G.spawnAt("bomb", 50, -40).v; G.t = 44; const b = G.spawnAt("bomb", 50, -40).v; G.obj = []; G.t = t0; return b > a * 1.5; }), "difficulty also grows with time (bombs faster after 44 s)");
if (process.env.SHOTS) { await p.evaluate(() => { const G = RoboPlus._game(), W = document.querySelector(".gm-cv").clientWidth, H = document.querySelector(".gm-cv").clientHeight; G.nb = G.nbomb = G.nthief = G.npow = 99; G.obj = []; G.combo = 12; G.shield = true; G.pw.magnet = 5; [["bolt", .2, .3], ["gold", .5, .25], ["bomb", .75, .4], ["thief", .3, .55], ["item", .65, .15], ["pow", .15, .7], ["bolt", .85, .6], ["bolt", .45, .5]].forEach(([k, x, y], i) => G.spawnAt(k, W * x, H * y, { v: 1, vx: 0, amp: 0, ...(k === "pow" ? { p: "double" } : {}) })); }); await sleep(200); await p.screenshot({ path: process.env.SHOTS + "/9b-game-new.png" }); }
const sb = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.obj = []; G.shield = false; G.bolts = 6; G.spawnAt("bomb", G.px, H - 75, { v: 30, vx: 0 }); await new Promise(r => setTimeout(r, 600)); return { dead: G.dead, b: G.bolts }; });
log(sb.dead && sb.b === 0, "bomb without shield → round lost", JSON.stringify(sb));
await sleep(900);
// מזיזים את הרובוט מצד לצד כדי לתפוס
for (let i = 0; i < 10; i++) { await p.evaluate(i => { const c = document.querySelector(".gm-cv"), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + (i % 2 ? r.width * .25 : r.width * .75), clientY: r.bottom - 40 })); }, i); await sleep(300); }
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/9-game.png" });
const gb = await p.evaluate(() => Robo.state().bolts);
await p.evaluate(() => { const ov = document.querySelector(".gm-ov button"); if (ov) ov.click(); }); await sleep(200);
await p.evaluate(() => { if (!document.querySelector(".gm-ov")) document.querySelector("#gmCash").click(); }); await sleep(600);
log(await p.evaluate(() => !!document.querySelector(".gm-ov h3")), "game: cash out / bomb → result screen");
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + "/10-result.png" });
const gs = await p.evaluate(() => Robo.state().game || { n: 0 });
log(gs.n <= 300 && (await p.evaluate(() => Robo.state().bolts)) >= gb, "game: bolts banked (≤ 300 a day)", JSON.stringify(gs));
await p.evaluate(() => { const bs = [...document.querySelectorAll(".gm-ov button")]; (bs.find(x => /סיום/.test(x.textContent)) || bs[0]).click(); }); await sleep(500);
// ✕ ויציאה: תמיד אפשר לצאת (גם במסך "מוכן?", גם באמצע משחק – ואז הברגים נשמרים)
await p.evaluate(() => { Robo.open("fun", "game"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
log(await p.evaluate(() => [...document.querySelectorAll(".gm-ov button")].some(b => /יציאה/.test(b.textContent))), "start screen has an exit button");
await p.evaluate(() => document.querySelector("#roboGame .x").click()); await sleep(400);
log(await p.evaluate(() => !document.querySelector("#roboGame[open]")), "✕ on the start screen closes the game");
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(800);
const xb = await p.evaluate(async () => { const G = RoboPlus._game(), b0 = Robo.state().bolts; G.bolts = 3; document.querySelector("#roboGame .x").click(); await new Promise(r => setTimeout(r, 400)); return { open: !!document.querySelector("#roboGame[open]"), d: Robo.state().bolts - b0 }; });
log(!xb.open && xb.d === 3, "✕ in the middle of a round closes and saves the bolts", JSON.stringify(xb));
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(600);
log(await p.evaluate(async () => { const e = document.querySelector("#gmExit"), r = e.getBoundingClientRect(); const vis = r.width > 40 && r.bottom <= innerHeight; e.click(); await new Promise(r => setTimeout(r, 300)); return vis && !document.querySelector("#roboGame[open]"); }), "big '🚪 יציאה' button at the bottom closes the game");
// 🔒 מעל 250 בסיבוב: אין יציאה – עד 300 (ניצחון, נשמר) או פצצה
await p.evaluate(() => { const s = Robo.state(); s.game = { d: RoboCore.ymd(Date.now()), n: 0, it: 0 }; Robo.open("fun", "game"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(600);
const lk = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.nb = G.nbomb = G.nthief = G.npow = G.nitem = 99; G.obj = []; G.shield = false; G.pw = {}; G.bolts = 401; G.spawnAt("bolt", G.px, H - 75, { v: 30 }); await new Promise(r => setTimeout(r, 700));
  const cash = document.querySelector("#gmCash"), txt = cash.textContent; cash.click(); document.querySelector("#roboGame .x").click(); document.querySelector("#gmExit").click(); await new Promise(r => setTimeout(r, 300));
  return { b: G.bolts, open: !!document.querySelector("#roboGame[open]"), txt, ov: !!document.querySelector(".gm-ov") }; });
log(lk.b === 402 && lk.open && !lk.ov && /אין יציאה/.test(lk.txt), "over 400 in a round: cash-out and ✕ are locked", JSON.stringify(lk));
const b300 = await p.evaluate(() => Robo.state().bolts);
const win = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.bolts = 499; G.spawnAt("bolt", G.px, H - 75, { v: 30 }); await new Promise(r => setTimeout(r, 2200)); const h = document.querySelector(".gm-ov h3"); return h ? h.textContent : ""; });
log(/כפול או כלום/.test(win), "reach 500 → slow-mo, then 'double or nothing?'", win);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(600);
const win2 = await p.evaluate(() => (document.querySelector(".gm-ov h3") || {}).textContent || "");
log(/ניצחת/.test(win2) && await p.evaluate(b0 => Robo.state().bolts === b0 + 500 && Robo.state().game.n === 500, b300), "keep → win screen, all 500 saved", win2);
await p.evaluate(() => { const bs = [...document.querySelectorAll(".gm-ov button")]; (bs.find(x => /סיום/.test(x.textContent)) || bs[0]).click(); }); await sleep(500);
await p.evaluate(() => { const s = Robo.state(); s.game = { d: RoboCore.ymd(Date.now()), n: 0, it: 0 }; Robo.open("fun", "game"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(600);
const lb = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight, b0 = Robo.state().bolts; G.nb = G.nbomb = G.nthief = G.npow = G.nitem = 99; G.obj = []; G.shield = false; G.bolts = 410; G.spawnAt("bomb", G.px, H - 75, { v: 30, vx: 0 }); await new Promise(r => setTimeout(r, 1800)); return { dead: G.dead, saved: Robo.state().bolts - b0, ov: (document.querySelector(".gm-ov h3") || {}).textContent }; });
log(lb.dead && lb.saved === 0 && /בום/.test(lb.ov || ""), "over 400 and a bomb → everything lost", JSON.stringify(lb));
await p.evaluate(() => { const bs = [...document.querySelectorAll(".gm-ov button")]; (bs.find(x => /סיום/.test(x.textContent)) || bs[0]).click(); }); await sleep(500);
// 🎲 כפול או כלום: מכפילים ושורדים → 1000 · מכפילים ונופלים → כלום
for (const [winIt, label] of [[true, "double → survive 30 s → 1000 bolts"], [false, "double → bomb → lose everything"]]) {
  await p.evaluate(() => { const s = Robo.state(); s.game = { d: RoboCore.ymd(Date.now()), n: 0, it: 0 }; Robo.open("fun", "game"); }); await sleep(300);
  await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
  await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(500);
  const d0 = await p.evaluate(() => Robo.state().bolts);
  await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.nb = G.nbomb = G.nthief = G.npow = G.nitem = 99; G.obj = []; G.shield = false; G.bolts = 499; G.spawnAt("bolt", G.px, H - 75, { v: 30 }); await new Promise(r => setTimeout(r, 2200)); });
  await p.evaluate(() => { const bs = [...document.querySelectorAll(".gm-ov button")]; bs.find(x => /להכפיל/.test(x.textContent)).click(); }); await sleep(500);
  const hard = await p.evaluate(() => { const G = RoboPlus._game(); return G && G.hard > 20 && G.hardBase === 500; });
  if (winIt) await p.evaluate(() => { const G = RoboPlus._game(); G.obj = []; G.nb = G.nbomb = G.nthief = 99; G.hard = .3; });
  else await p.evaluate(() => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.obj = []; G.nb = G.nbomb = G.nthief = 99; G.spawnAt("bomb", G.px, H - 75, { v: 30, vx: 0 }); });
  await sleep(1800);
  const res = await p.evaluate(d0 => ({ h: (document.querySelector(".gm-ov h3") || {}).textContent || "", d: Robo.state().bolts - d0, n: Robo.state().game.n }), d0);
  log(hard && (winIt ? /הכפלת/.test(res.h) && res.d === 1000 : /הפסדת/.test(res.h) && res.d === 0) && res.n === 500, label, JSON.stringify(res));
  await p.evaluate(() => { const b = document.querySelector(".gm-ov button"); b && b.click(); }); await sleep(500);
}
await p.evaluate(() => { const s = Robo.state(); s.game = { d: RoboCore.ymd(Date.now()), n: 500, it: 2 }; Robo.open("fun", "game"); }); await sleep(300);
log(await p.evaluate(() => !document.querySelector("#rpPlay").disabled && /אימון/.test(document.querySelector("#rpPlay").textContent)), "game: after 500 bolts – practice mode button (no prizes)");
// 🏋️ אימון: משחקים, אין נעילה, לא מקבלים ברגים, נשמר שיא
const pr0 = await p.evaluate(() => Robo.state().bolts);
await p.evaluate(() => document.querySelector("#rpPlay").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".gm-ov button").click()); await sleep(600);
const pr = await p.evaluate(async () => { const G = RoboPlus._game(), H = document.querySelector(".gm-cv").clientHeight; G.nb = G.nbomb = G.nthief = G.npow = G.nitem = 99; G.obj = []; G.shield = false; G.bolts = 449; G.spawnAt("bolt", G.px, H - 75, { v: 30 }); await new Promise(r => setTimeout(r, 700));
  const txt = document.querySelector("#gmCash").textContent; document.querySelector("#gmCash").click(); await new Promise(r => setTimeout(r, 500)); return { practice: G.practice, b: G.bolts, txt, h: (document.querySelector(".gm-ov h3") || {}).textContent }; });
log(pr.practice && pr.b === 450 && /אימון/.test(pr.txt) && /שיא/.test(pr.h || ""), "practice: plays with no lock, reaches level 10, new practice record", JSON.stringify(pr));
log(await p.evaluate(b0 => Robo.state().bolts === b0 && Robo.state().gamePract === 450, pr0), "practice: no bolts given, record saved");
await p.evaluate(() => { const bs = [...document.querySelectorAll(".gm-ov button")]; (bs.find(x => /סיום/.test(x.textContent)) || bs[0]).click(); }); await sleep(400);
// 🏃 ריצת הרובוט
await p.evaluate(() => { const s = Robo.state(); s.run = null; Robo.open("fun"); }); await sleep(400);
log(await p.evaluate(() => !!document.querySelector('#roboUI [data-p="run"]')), "run: tile in the fun tab");
await p.evaluate(() => document.querySelector('#roboUI [data-p="run"]').click()); await sleep(300);
await p.evaluate(() => document.querySelector("#rnPlay").click());
await p.waitForSelector("#roboRun .gm-ov button", { timeout: 8000 }); await sleep(200);
await p.evaluate(() => document.querySelector("#roboRun .gm-ov button").click());
await p.waitForFunction(() => window.RoboRun && RoboRun._game() && RoboRun._game().dist > 5, { timeout: 8000 }).catch(() => {});
log(await p.evaluate(() => { const c = document.querySelector("#roboRun[open] canvas"); return !!c && c.width > 200 && RoboRun._game().dist > 5; }), "run: running (canvas + distance grows)");
const rn = await p.evaluate(async () => { const G = RoboRun._game(), w = ms => new Promise(r => setTimeout(r, ms)); G.obj = []; G.next = 999; const out = {};
  G.spawnAt("bolt", 0, 4); G.spawnAt("bolt", 0, 6); await w(800); out.bolts = G.bolts;
  G.act("R"); await w(300); out.lane = G.lane;
  G.act("U"); G.spawnAt("bench", 1, 3); await w(700); out.jumped = !G.dead;
  G.shield = true; G.spawnAt("locker", 1, 3); await w(600); out.shield = !G.dead && !G.shield;
  G.act("D"); G.spawnAt("beam", 1, 2.5); await w(600); out.ducked = !G.dead;
  return out; });
log(rn.bolts === 2 && rn.lane === 1, "run: collect bolts + swipe to change lane", JSON.stringify(rn));
log(rn.jumped && rn.ducked, "run: jump over a bench, duck under a bar", JSON.stringify(rn));
log(rn.shield, "run: shield saves you from a locker", JSON.stringify(rn));
const ex = await p.evaluate(async () => { const G = RoboRun._game(), w = ms => new Promise(r => setTimeout(r, ms)), clr = () => { G.obj = []; G.next = 999; G.shield = false; G.jt = -1; G.st = -1; }; const o = {};
  // 💩 קקי → עפים; רחפן גונב חצי; קשת ×2; ציפור מפילה
  clr(); G.bolts = 40; G.spawnAt("poop", G.lane, 2.5); await w(500); o.fly = G.fly > 5 && G.stats.flights === 1; await w(500); o.alt = G.alt > .8;
  clr(); G.spawnAt("drone", G.lane, 2.5); await w(500); o.drone = G.bolts === 20;
  clr(); G.spawnAt("rainbow", G.lane, 2.5); await w(500); o.rainbow = G.rainbowT > 3;
  clr(); G.spawnAt("bird", G.lane, 2.5); await w(500); o.bird = G.fly === 0 && !G.dead;
  await w(900);
  // 🤸 טרמפולינה מעל ארון
  clr(); G.spawnAt("tramp", G.lane, 2); await w(250); G.spawnAt("locker", G.lane, 4); await w(500); o.tramp = !G.dead;
  await w(900);
  // 🧊 קרח: אי אפשר לפנות
  clr(); G.spawnAt("ice", G.lane, 2); await w(400); const l0 = G.lane; G.act(l0 === 1 ? "L" : "R"); o.ice = G.ice > 0 && G.lane === l0; await w(1500);
  // 😠 ביריון: גוף/יד = לוקח 20%, מסלול שלישי = עוברים
  clr(); G.bolts = 50; const b = G.lane; G.spawnAt("bully", b, 2.5, { base: b, arm: b === 1 ? -1 : 1 }); await w(500); o.bully = G.bolts === 40;
  clr(); const safe = [-1, 0, 1].find(l => l !== G.lane && l !== G.lane + (G.lane === 1 ? -1 : 1)); G.spawnAt("bully", G.lane === 1 ? 0 : G.lane === -1 ? 0 : 1, 2.5, { base: G.lane === 0 ? 1 : 0, arm: G.lane === 0 ? 1 : -G.lane }); const pass0 = G.stats.bullyPass; await w(500); o.bullyPass = G.stats.bullyPass === pass0 + 1 || G.bolts < 40;
  // 🤖 מעידה → רודף; מעידה שנייה → נתפס
  clr(); G.spawnAt("bench", G.lane, 2.5); await w(500); o.chase = G.chase > 4 && !G.dead;
  if (window.__shot) await window.__shot();
  clr(); G.spawnAt("beam", G.lane, 2.5); await w(1600); o.caught = G.dead;
  o.h = (document.querySelector("#roboRun .gm-ov h3") || {}).textContent || ""; return o; });
log(ex.fly && ex.alt, "run: 💩 magic poop → the robot flies up", JSON.stringify(ex));
log(ex.drone && ex.rainbow && ex.bird, "run: sky – drone steals half, rainbow ×2, bird knocks you down", JSON.stringify(ex));
log(ex.tramp && ex.ice, "run: trampoline jumps over a locker, ice blocks turning", JSON.stringify(ex));
log(ex.bully && ex.bullyPass, "run: bully takes 20% (body/hand), safe lane passes", JSON.stringify(ex));
log(ex.chase && ex.caught && /תפס/.test(ex.h), "run: stumble → giant robot chases → second stumble = caught", JSON.stringify(ex));
await p.evaluate(() => { const bs = [...document.querySelectorAll("#roboRun .gm-ov button")]; (bs.find(x => /עוד ריצה/.test(x.textContent)) || bs[0]).click(); });
await p.waitForFunction(() => { const G = RoboRun._game(); return G && G.cd <= 0 && G.dist > 3; }, { timeout: 9000 }).catch(() => {});
if (process.env.SHOTS) { await p.evaluate(() => { const G = RoboRun._game(); G.dist = 520; G.wIdx = 1; G.obj = []; G.next = 999; G.spawnAt("bully", 0, 14, { base: 0, arm: 1 }); G.spawnAt("poop", -1, 9); G.spawnAt("tramp", 1, 30); }); await sleep(150); await p.screenshot({ path: process.env.SHOTS + "/run-world2.png" });
  await p.evaluate(() => { const G = RoboRun._game(); G.obj = []; G.fly = 8; G.alt = 1; [["bird", -1, 10], ["drone", 1, 16], ["sbolt", 0, 7], ["sbolt", 0, 9.5], ["sbolt", 0, 12], ["rainbow", 0, 22]].forEach(([k, l, z]) => G.spawnAt(k, l, z)); G.v = .01; G.puffs.push({ x: 200, y: 600, r: 18, a: 1, txt: true }); }); await sleep(150); await p.screenshot({ path: process.env.SHOTS + "/run-sky.png" });
  await p.evaluate(() => { const G = RoboRun._game(); G.fly = 0; G.alt = 0; G.obj = []; G.dist = 60; G.wIdx = 0; }); await sleep(400); }
if (process.env.SHOTS) { await p.evaluate(() => { const G = RoboRun._game(); G.obj = []; G.next = 999; [["bolt", -1, 8], ["bolt", -1, 11], ["bolt", -1, 14], ["bench", 0, 12], ["locker", 1, 22], ["beam", -1, 30], ["pow", 0, 26, { p: "magnet" }], ["gold", 1, 9]].forEach(([k, l, z, e]) => G.spawnAt(k, l, z, Object.assign({ v: 0 }, e || {}))); G.v = 0.01; }); await sleep(120); await p.screenshot({ path: process.env.SHOTS + "/run.png" }); }
const rb0 = await p.evaluate(() => Robo.state().bolts);
const cr = await p.evaluate(async () => { const G = RoboRun._game(), w = ms => new Promise(r => setTimeout(r, ms)); G.obj = []; G.next = 999; G.shield = false; G.pw = {}; G.jt = -1; G.st = -1; G.spawnAt("locker", G.lane, 3); await w(1600); return { dead: G.dead, h: (document.querySelector("#roboRun .gm-ov h3") || {}).textContent, b: G.bolts }; });
log(cr.dead && /נתקעת|שיא/.test(cr.h || "") && await p.evaluate((b0, n) => Robo.state().bolts === b0 + n && Robo.state().run.n >= n, rb0, cr.b), "run: crash ends the run, collected bolts are saved", JSON.stringify(cr));
await p.evaluate(() => { const bs = [...document.querySelectorAll("#roboRun .gm-ov button")]; (bs.find(x => /סיום/.test(x.textContent)) || bs[0]).click(); }); await sleep(400);
log(await p.evaluate(() => !document.querySelector("#roboRun[open]") && Robo.state().runBest > 0), "run: closed, best distance saved");
// 🎓 הדרכה בריצה הראשונה (ספסל → מוט → ארון), ובלי עונש כשטועים
await p.evaluate(() => { localStorage.removeItem("roboRunTut"); Robo.open("fun", "run"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rnPlay").click());
await p.waitForSelector("#roboRun .gm-ov button", { timeout: 8000 }); await sleep(200);
await p.evaluate(() => document.querySelector("#roboRun .gm-ov button").click()); await sleep(500);
const tut = await p.evaluate(async () => { const G = RoboRun._game(), w = ms => new Promise(r => setTimeout(r, ms)), o = { start: G.tut === 1, mistakeOk: false };
  let mist = false; for (let i = 0; i < 900 && G.tut; i++) { const T = G.tutO; if (T && T.z < 5 && T.z > 0) { if (!mist && T.k === "bench") { mist = true; await w(900); o.mistakeOk = !G.dead && G.tut === 1; continue; } if (T.k === "bench") G.act("U"); else if (T.k === "beam") G.act("D"); else G.act(G.lane === 1 ? "L" : "R"); await w(700); } await w(50); }
  o.done = !G.tut && localStorage.getItem("roboRunTut") === "1" && !G.dead; return o; });
log(tut.start && tut.mistakeOk && tut.done, "run: first-time tutorial (jump, duck, dodge), mistakes don't end the run", JSON.stringify(tut));
// ⏸️ יציאה מהאפליקציה באמצע: המשחק נעצר, וכשחוזרים – "להמשיך"
const pz = await p.evaluate(async () => { const G = RoboRun._game(), w = ms => new Promise(r => setTimeout(r, ms)); let hid = true; Object.defineProperty(document, "hidden", { configurable: true, get: () => hid });
  document.dispatchEvent(new Event("visibilitychange")); await w(100); const d0 = G.dist; await w(700); const frozen = G.paused && G.dist === d0;
  hid = false; document.dispatchEvent(new Event("visibilitychange")); await w(300); const ask = /המתנה/.test((document.querySelector("#roboRun .gm-ov h3") || {}).textContent || "");
  document.querySelector("#roboRun .gm-ov button").click(); await w(600); const resumed = !G.paused && G.dist > d0; delete document.hidden; return { frozen, ask, resumed }; });
log(pz.frozen && pz.ask && pz.resumed, "pause: leaving the app freezes the game, coming back shows 'continue'", JSON.stringify(pz));
await p.evaluate(() => { const d = document.getElementById("roboRun"); document.querySelector("#rnExit").click(); }); await sleep(500);
// ✨ נוצץ + 🌍 אירוע + ⚡ בזק – בלי שגיאות
await p.evaluate(() => { const id = RoboCore.LIST.find(x => x.r === "s" && x.cat === "hat").id; Robo.give({ t: "item", id, r: "s", shiny: 1 }); Robo.state().eq.hat = id; Robo.open("wear"); document.querySelector('#roboUI [data-c="hat"]').click(); }); await sleep(400);
log(await p.evaluate(() => !!document.querySelector("#roboUI .rc.shiny") && !!document.querySelector("#roboUI .rw-bot .rshiny")), "shiny item: gold card + sparkles on the robot", await p.evaluate(() => [!!document.querySelector("#roboUI .rc.shiny"), !!document.querySelector("#roboUI .rw-bot .rshiny"), JSON.stringify(Robo.state().shiny), JSON.stringify(Robo.state().eq)].join(" ")));
await p.screenshot({ path: path.join(ROOT, "tests/browser/robo4-shiny.png") });
await p.evaluate(() => Robo.open("shop")); await sleep(300);
// 💎 עיצוב זהב ויהלומים (אולטרה, 3 בישיבה)
log(await p.evaluate(() => { Robo.give({ t: "item", id: "theme:goldx" }); Theme.setTheme("goldx"); const on = !!document.getElementById("gxFx") && getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().length > 0 && /gxDiamond/.test(document.getElementById("themeStyle").textContent); Theme.setTheme("purple"); return on && !document.getElementById("gxFx"); }), "💎 gold & diamonds theme: turns on (gold + diamond buttons + sparkles) and off cleanly");
const gx = await call({ action: "robo", device: FRIEND, op: "claim", item: "theme:goldx" });
log(gx.ok && gx.granted && gx.cap === 3, "server: gold theme is capped at 3 in the school", JSON.stringify(gx));
// 🏁 מרדף בטבלה בזמן הריצה: רואים מי מעליך, עקיפה = אנימציה, מקום ראשון = כתר
for (const [i, nm, v] of [[11, "אבי בר", 5000], [12, "נועם שקד", 9000]]) { const dv = `device-robo4-00${i}`; await call({ action: "hello", device: dv, name: nm, cls: "y2", ver: "x" }); await call({ action: "robo", device: dv, op: "score", g: "run", v }); }
await p.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => { delete d.dataset.lock; d.close(); }); Robo.open("fun", "run"); }); await sleep(300);
await p.evaluate(() => document.querySelector("#rnPlay").click()); await sleep(500); await p.evaluate(() => { const b = document.querySelector("#roboRun .gm-ov button"); b && b.click(); }); await sleep(1500);
const ch = await p.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), G = RoboRun._game(), bar = () => (document.querySelector("#roboRun .ch-bar") || {}).innerText || "", o = { start: bar() };
  G.dist = 4990; await w(2000); G.dist = 5001; await w(600); o.pop = (document.querySelector("#roboRun .ch-pop") || {}).innerText || ""; o.after = bar(); G.dist = 9001; await w(700); o.crown = !!document.querySelector("#roboRun .ch-crown"); return o; });
log(/⬆️/.test(ch.start) && /עקפת את אבי בר/.test(ch.pop) && /נועם שקד/.test(ch.after) && ch.crown, "run: live grade chase – shows who's above, overtake pop, crown for 1st place", JSON.stringify(ch));
await p.evaluate(() => document.querySelector("#rnExit").click()); await sleep(500);
// 🕎 חנוכה + 🤝 מטרת שכבה + 🏅 תארים + 📸 צלם רובוט
await p.evaluate(() => { RoboCore.setHanukkahTest(3); document.querySelectorAll("dialog[open]").forEach(d => { delete d.dataset.lock; d.close(); }); Robo.open("fun"); }); await sleep(1500);
log(await p.evaluate(() => !!document.querySelector(".hk-card #hkLight")), "hanukkah: menorah card in the fun tab");
log(await p.evaluate(() => { const m = ((document.querySelector("#glCard") || {}).innerText || "").replace(/,/g, "").match(/השבוע: (\d+) \/ (\d+)/); return !!m && +m[1] >= 900 && +m[2] >= 3000; }), "grade goal: card shows the grade's total and target", await p.evaluate(() => (document.querySelector("#glCard") || {}).innerText));
await p.evaluate(() => document.querySelector("#hkLight").click()); await sleep(400);
await p.evaluate(() => document.querySelector(".rw-reward").click()); await sleep(1500);
log(await p.evaluate(() => (Robo.state().hk || {}).lit[3] === 1 && /קיבלת/.test(document.querySelector(".rw-reward").innerText)), "hanukkah: lighting candle 3 gives a reward once");
await p.evaluate(() => document.querySelector(".rw-reward [data-a]").click()); await sleep(500);
await p.evaluate(() => { Robo.state().wheel = null; Robo.open("fun", "wheel"); }); await sleep(400);
log(await p.evaluate(() => /סביבון/.test(document.querySelector("#roboUI").innerText)), "hanukkah: the wheel becomes a dreidel");
await p.evaluate(() => Robo.open("fun", "titles")); await sleep(400);
await p.evaluate(() => { Robo.state().runBest = 1300; Robo.open("fun", "titles"); }); await sleep(300);
await p.evaluate(() => document.querySelector('[data-tt="runner"]').click()); await sleep(400);
log(await p.evaluate(() => Robo.state().title === "runner" && /רץ למרחקים/.test(document.querySelector("#rwTtl").textContent)), "titles: pick a title, shown under the robot name");
await p.evaluate(() => Robo.open("fun", "booth")); await sleep(1200);
await p.evaluate(() => { document.querySelector('[data-k="pose"] [data-i="2"]').click(); document.querySelector('[data-s="👑"]').click(); }); await sleep(400);
log(await p.evaluate(() => { const c = document.querySelector("#pbCv"); return !!c && c.getContext("2d").getImageData(540, 700, 1, 1).data[3] > 0; }), "photo booth: draws the robot picture");
await p.screenshot({ path: path.join(ROOT, "tests/browser/robo4-booth.png") });
await p.evaluate(() => RoboCore.setHanukkahTest(0));
log(!errs.length, "no errors", errs.join(" | "));
await p.screenshot({ path: path.join(ROOT, "tests/browser/robo4-shop.png") });
console.log(`errors: ${JSON.stringify(errs)} ${res.filter(Boolean).length}/${res.length} passed`);
await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
