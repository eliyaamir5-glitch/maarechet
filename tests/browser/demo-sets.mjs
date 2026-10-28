import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 1300, height: 900 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:8787/demo.html", { waitUntil: "networkidle2" }); await new Promise(r => setTimeout(r, 1200));
const btn = await p.$("#goStaff");
await btn.click(); await new Promise(r => setTimeout(r, 3000)); console.log(p.frames().map(f => f.url()).join(" | "));
const fr = p.frames().find(f => f !== p.mainFrame() && /staff/.test(f.url()));
if (!fr) { console.log("no staff frame"); process.exit(1); }
if (await fr.$("#lCode")) { await fr.type("#lCode", "ANY"); await fr.click("#lGo"); await new Promise(r => setTimeout(r, 1000)); }
await fr.evaluate(() => [...document.querySelectorAll("#tabs button")].find(x => x.textContent.includes("כרטיסיות")).click()); await new Promise(r => setTimeout(r, 1000));
console.log("demo staff sets tab:", (await fr.$eval("main", e => e.innerText)).replace(/\s+/g, " ").slice(0, 200));
await b.close(); console.log("errors:", errs.length ? errs : "none");
