import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message));
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.evaluateOnNewDocument(() => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "y1", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); });
await p.setRequestInterception(true); p.on("request", r => /netlify\.app|web3forms/.test(r.url()) ? r.respond({ status: 200, contentType: "application/json", body: '{"ok":true,"updates":[]}', headers: { "Access-Control-Allow-Origin": "*" } }) : r.continue());
await p.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(600);
log(await p.$(".foot .contact") === null && await p.$("#fbOpen") !== null, "footer: only the 'כתבו לנו' button, no phone/email");
// לחיצה על "כתבו לנו" → רעיון/תקלה + אפשרות לשלוח ישירות
await p.click("#fbOpen"); await sleep(300);
const links = await p.$$eval("#fbDlg .contact a", l => l.map(a => [a.className, a.getAttribute("href"), a.innerText.replace(/\s+/g, " ").trim()]));
log(links.length === 3, "feedback window: WhatsApp + SMS + email", JSON.stringify(links));
log(links[0][1].startsWith("https://wa.me/972535742343?text="), "WhatsApp to 972535742343");
log(links[1][0] === "sms" && links[1][1].startsWith("sms:+972535742343?&body=") && links[1][2].includes("SMS"), "SMS link (works on iPhone + Android)", JSON.stringify(links[1]));
log(links[2][1].startsWith("mailto:eliya.amir5@gmail.com"), "email link");
log((await p.$eval("#fbDlg .contact", e => e.innerText)).includes("053-574-2343") && (await p.$eval("#fbDlg .contact", e => e.innerText)).includes("אליה עמיר"), "shows name + number");
// גם כשבוחרים "תקלה"
await p.click('#fbKind [data-k="bug"]'); await sleep(100);
log(await p.$$eval("#fbDlg .contact a", l => l.length) === 3, "still there after choosing 'תקלה'");
await p.screenshot({ path: "contact-dlg.png" });
// אחרי שליחה ופתיחה מחדש – עדיין שם
await p.type("#fbText", "בדיקה"); await p.click("#fbSend"); await sleep(1200);
await p.evaluate(() => document.getElementById("fbDlg").close()); await sleep(200);
await p.click("#fbOpen"); await sleep(300);
log(await p.$$eval("#fbDlg .contact a", l => l.length) === 3, "still there when reopening after sending");
log(await p.evaluate(() => document.documentElement.scrollWidth <= 390), "no overflow");
log(!errs.length, "no page errors", errs.join(" | "));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
