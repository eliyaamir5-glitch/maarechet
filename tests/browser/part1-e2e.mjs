import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function page(setup) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.evaluateOnNewDocument(setup || (() => {}));
  await p.setRequestInterception(true);
  p.on("request", r => /netlify\.app|web3forms/.test(r.url()) ? r.respond({ status: 200, contentType: "application/json", body: '{"ok":true,"updates":[]}', headers: { "Access-Control-Allow-Origin": "*" } }) : r.continue());
  return p;
}
const student = (extra = {}) => () => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "y2", eng: "minervi", math: "toni", major: "phys", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); for (const [k, v] of Object.entries(window.__extra || {})) localStorage.setItem(k, v); };

// 42 מה חדש: משתמש קיים בלי seenVersion רואה פעם אחת
let p = await page(student());
await p.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(4500);
log(await p.$eval("#newDlg", d => d.open).catch(() => false), "existing student sees 'מה חדש' once");
const items = await p.$$eval("#newList li", l => l.length);
log(items >= 8, "what's new lists the new features", items);
await p.screenshot({ path: "p1-new.png" });
await p.click("#newDlg .primary"); await sleep(300);
await p.reload({ waitUntil: "networkidle2" }); await sleep(4000);
log(!(await p.$eval("#newDlg", d => d.open)), "…and not again after closing");
// 16 זמני היום
await p.evaluate(() => { const d = document.querySelector("#zmanim details"); if (d) d.open = true; });
const zm = await p.$eval("#zmanim", e => [e.hidden, e.innerText.replace(/\s+/g, " ")]).catch(() => [true, ""]);
log(!zm[0] && /זריחה \d\d:\d\d/.test(zm[1]) && /שקיעה \d\d:\d\d/.test(zm[1]), "today's prayer times card (Kfar Maimon)", zm[1].slice(0, 160));
await p.evaluate(() => { document.querySelector("#zmanim details").open = true; document.getElementById("zmanim").scrollIntoView({ block: "center" }); }); await sleep(200);
await p.screenshot({ path: "p1-zmanim.png" });
// 38+39 צבע וטקסט גדול
await p.evaluate(() => window.scrollTo(0, 0)); await p.click("#hAvatar"); await sleep(400);
log(await p.$$eval("#profBody [data-th]", l => l.length) === 6 && await p.$("#pfBig") !== null && await p.$("#pfParent") !== null, "profile: 6 colours, big text, share-with-parents");
await p.click('#profBody [data-th="forest"]'); await sleep(150);
const grad = await p.evaluate(() => getComputedStyle(document.querySelector(".hdr, header, .top, #hdr") || document.body).backgroundImage + "|" + getComputedStyle(document.documentElement).getPropertyValue("--grad"));
log(/16, 185, 129|#10b981/i.test(grad), "choosing 'יער' recolours the app", grad.slice(0, 120));
await p.click("#pfBig"); await sleep(150);
log(await p.evaluate(() => getComputedStyle(document.documentElement).zoom) === "1.15", "big text zooms the app");
await p.screenshot({ path: "p1-profile.png" });
await p.goto("http://localhost:8787/cards.html", { waitUntil: "networkidle2" }); await sleep(300);
log(/16, 185, 129|#10b981/i.test(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--grad"))) && await p.evaluate(() => getComputedStyle(document.documentElement).zoom) === "1.15", "colour + big text carry over to other screens");
for (const w of [360]) { await p.setViewport({ width: w, height: 760, isMobile: true, hasTouch: true }); for (const u of ["index.html", "cards.html", "calc.html#solve", "phones.html", "absences.html#demo"]) { await p.goto("http://localhost:8787/" + u, { waitUntil: "networkidle2" }); await sleep(400); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > w + 1) log(false, "overflow with big text: " + u, sw); } }
log(true, "big text: no horizontal overflow at 360px");

// 40 שיתוף להורים
p = await page(student());
await p.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(800);
const link = await p.evaluate(() => parentLink());
log(/parent\.html#p=[\w-]+$/.test(link), "parent link built", link);
const P2 = await page();
await P2.goto(link.replace(/^https?:\/\/[^/]+/, "http://localhost:8787"), { waitUntil: "networkidle2" }); await sleep(800);
const pt = await P2.$eval("main", e => e.innerText.replace(/\s+/g, " "));
log((await P2.$eval("#title", e => e.textContent)) === "המערכת של יוסי כהן" && /כיתה י'2/.test(await P2.$eval("#sub", e => e.textContent)), "parent page: name and class");
log(/טוני כהן|יהודית מינרבי|הרב/.test(pt) || /אין לימודים|חופשה/.test(pt), "parent page: lessons with teachers (by the student's groups)", pt.slice(0, 200));
await P2.click('#tabs [data-d="3"]'); await sleep(200);
const wed = await P2.$eval("#body", e => e.innerText.replace(/\s+/g, " "));
log(/מתמטיקה/.test(wed) && /טוני כהן/.test(wed) && /מה להביא/.test(wed), "parent page: Wednesday shows maths with the student's teacher + what to bring", wed.slice(0, 160));
log(!/ציון|חיסור|%/.test(await P2.$eval("#body", e => e.innerText)), "parent page shows no grades/absences");
await P2.screenshot({ path: "p1-parent.png", fullPage: true });
const bad = await page(); await bad.goto("http://localhost:8787/parent.html#p=garbage", { waitUntil: "networkidle2" }); await sleep(300);
log((await bad.$eval("#title", e => e.textContent)).includes("לא תקין"), "broken parent link → clear message");

// 7 הקראה + 9 מילון
p = await page(student());
await p.goto("http://localhost:8787/cards.html", { waitUntil: "networkidle2" }); await sleep(300);
await p.evaluate(() => { window.__said = []; const o = window.speechSynthesis; if (o) { o.speak = u => window.__said.push([u.text, u.lang]); o.cancel = () => {}; } });
await p.click(".set"); await sleep(300); await p.click("#mFlash"); await sleep(300);
await p.click("#fSay"); await sleep(100);
await p.click("#flip"); await sleep(500); await p.click("#fSay"); await sleep(100);
const said = await p.evaluate(() => window.__said);
log(said.length === 2 && said[0][1] === "en-US" && said[1][1] === "he-IL" && !(await p.$eval("#flip", e => e.classList.contains("on") === false)), "🔊 reads the English word in English, the Hebrew side in Hebrew (and doesn't flip the card)", JSON.stringify(said));
await p.click("#fQuit"); await sleep(200); await p.click("#back"); await sleep(200);
await p.click("#btnDict"); await sleep(200);
await p.type("#dIn", "environment"); await p.keyboard.press("Enter");
await p.waitForSelector("#dOut .dword", { timeout: 15000 }).catch(() => {}); await sleep(500);
const dict = await p.$eval("#dOut", e => e.innerText.replace(/\s+/g, " ")).catch(() => "");
log(/environment/.test(dict) && /[\u0590-\u05FF]{3,}/.test(dict.replace(/מילון|בעברית|הגדרה|הוספה|המילים|שלי|מורפיקס/g, "")), "dictionary: environment → Hebrew translation", dict.slice(0, 200));
log(/noun|שם עצם/.test(dict), "dictionary: English definition + part of speech");
await p.screenshot({ path: "p1-dict.png", fullPage: true });
if (await p.$("#dAdd")) { await p.click("#dAdd"); await sleep(200); }
log((await p.evaluate(() => JSON.parse(localStorage.sets || "[]").find(s => s.id === "mywords")?.cards?.length)) === 1, "'＋ הוספה' creates the 'המילים שלי' set");
await p.$eval("#dIn", e => e.value = ""); await p.type("#dIn", "ספר"); await p.keyboard.press("Enter");
await p.waitForFunction(() => /book/i.test(document.getElementById("dOut").innerText), { timeout: 15000 }).catch(() => {});
log(/book/i.test(await p.$eval("#dOut", e => e.innerText)), "dictionary also works Hebrew → English");
// 12 מניפסט + קיצורי דרך
const man = await (await fetch("http://localhost:8787/manifest.webmanifest")).json().catch(() => null);
log(man && man.shortcuts && man.shortcuts.length === 4 && man.start_url === "./", "manifest with 4 shortcuts (long-press the icon)");
log(!errs.filter(e => !/speechSynthesis|NotAllowed/.test(e)).length, "no page errors", errs.join(" | "));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
