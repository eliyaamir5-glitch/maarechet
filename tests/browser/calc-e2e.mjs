import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/404/.test(m.text())) errs.push(m.text()); }); p.on("response", r => { if (r.status() === 404 && !/logo.png|favicon/.test(r.url())) errs.push("404 " + r.url()); });
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, ok ? "" : x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = sel => p.$eval(sel, e => e.innerText.replace(/\s+/g, " ").trim());
const key = async k => { await p.evaluate(k => [...document.querySelectorAll("#keys button")].find(x => x.dataset.k === k).click(), k); };
const keys = async seq => { for (const k of seq) await key(k); };

// מהמסך הראשי
await p.evaluateOnNewDocument(() => { localStorage.setItem("profile", JSON.stringify({ first: "יוסי", last: "כהן", cls: "y1", eng: "minervi", math: "toni", major: "phys", dorm: "yes", since: "2026-09-01" })); localStorage.setItem("introSeen", "1"); if (!localStorage.getItem("tef")) { const n = new Date(); localStorage.setItem("tef", JSON.stringify({ d: n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), a: "yes" })); } /* שתזכורת התפילין (בשעה שלפני השקיעה) לא תקפוץ באמצע הבדיקה */ localStorage.setItem("seenVersion", "9999"); });
await p.setRequestInterception(true); p.on("request", r => /netlify\.app|web3forms/.test(r.url()) ? r.respond({ status: 200, contentType: "application/json", body: '{"ok":true,"updates":[]}', headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } }) : r.continue());
await p.goto("http://localhost:8787/index.html", { waitUntil: "networkidle2" }); await sleep(600);
log(await p.$eval("#calcBtn", e => e.getBoundingClientRect().width > 70 && e.getBoundingClientRect().height > 20), "home: calculator button visible"); // בטלפון: שורת כפתורים שגוללים הצידה
await p.screenshot({ path: "calc-home-btn.png", clip: { x: 0, y: 0, width: 390, height: 420 } });
await p.click("#calcBtn"); await p.waitForSelector("#vHome .tile"); await sleep(300);
log((await text("#vHome")).includes("פתרון תרגיל"), "calculator opens with topics");
await p.screenshot({ path: "calc-topics.png" });

// פתרון תרגיל עם המקלדת
await p.click('[data-go="solve"]'); await sleep(200);
await keys(["3", "(", "x", "-", "2", ")", "=", "2", "x", "+", "5"]);
await sleep(250);
log(await p.$eval("#sIn", e => e.value) === "3(x-2)=2x+5", "keypad types the exercise", await p.$eval("#sIn", e => e.value));
log((await text("#sPv")).includes("משוואה ממעלה ראשונה"), "live preview recognises a linear equation", await text("#sPv"));
await p.click("#sGo"); await sleep(300);
log((await text("#sOut .ans")).includes("x = 11"), "solves 3(x−2)=2x+5 → x = 11", await text("#sOut .ans"));
log(await p.$$eval("#sOut .steps li", l => l.length) >= 3, "shows numbered steps");
log((await text("#sOut .chk")).includes("✓"), "shows a check");
// מחיקה וריבועית
await p.click('[data-clr="sIn"]');
await keys(["x", "²", "-", "5", "x", "+", "6", "=", "0"]); await sleep(200);
log((await text("#sPv")).includes("ריבועית"), "preview: quadratic");
await p.click("#sGo"); await sleep(300);
log((await text("#sOut .ans")).includes("2") && (await text("#sOut .ans")).includes("3"), "quadratic roots 2 and 3", await text("#sOut .ans"));
await p.screenshot({ path: "calc-quad.png", fullPage: true });
// ⌫ וחיצים
await p.click('[data-clr="sIn"]'); await keys(["2", "x", "+", "3", "BS", "4"]);
log(await p.$eval("#sIn", e => e.value) === "2x+4", "⌫ deletes the last character");
await keys(["L", "L", "L", "5"]);
log(await p.$eval("#sIn", e => e.value) === "25x+4", "◀ moves the cursor, insert in the middle", await p.$eval("#sIn", e => e.value));
// אי-שוויון עם ציר מספרים
await p.click('[data-clr="sIn"]'); await keys(["5", "-", "2", "x", ">", "1"]); await p.click("#sGo"); await sleep(300);
log((await text("#sOut .ans")).includes("x < 2") && await p.$("#sOut svg.nl") !== null, "inequality flips the sign and draws a number line", await text("#sOut .ans"));
log((await text("#sOut .steps")).includes("הופכים את כיוון הסימן"), "warns about flipping the sign");
await p.screenshot({ path: "calc-ineq.png", fullPage: true });
// שגיאה ברורה
await p.click('[data-clr="sIn"]'); await keys(["3", "(", "x", "+", "1", "=", "4"]); await sleep(200);
log((await text("#sPv")).includes("חסר סוגר"), "live error: missing bracket", await text("#sPv"));
// דוגמה בלחיצה + היסטוריה
await p.click('#sEx [data-x="1/3+1/6"]'); await sleep(300);
log((await text("#sOut .ans")).includes("1") && (await p.$eval("#sOut .ans .fr", e => e.innerText.replace(/\s/g, ""))) === "12", "example chip: 1/3+1/6 = ½ as a real fraction");
log(!(await p.$eval("#sHistWrap", e => e.hidden)) && (await text("#sHist")).includes("1/3+1/6"), "recent exercises remembered");

// מערכת
await p.goto("http://localhost:8787/calc.html#sys", { waitUntil: "networkidle2" }); await sleep(300);
log(await p.evaluate(() => document.activeElement && document.activeElement.id) !== "x" && !!(await p.$("#vSys .kslot #kp")), "keypad moves into the system screen");
await p.click("#q1"); await keys(["2", "x", "+", "3", "y", "=", "1", "2"]);
await p.click("#q2"); await keys(["3", "x", "+", "2", "y", "=", "1", "3"]);
await p.click("#qGo"); await sleep(300);
log((await text("#qOut .ans")).replace(/\s/g, "") === "התשובהx=3,y=2", "system solved x=3, y=2", await text("#qOut .ans"));
log(await p.$$eval("#qOut svg.plot path", l => l.length) >= 2, "plots both lines");
await p.screenshot({ path: "calc-sys.png", fullPage: true });

// פונקציה
await p.goto("http://localhost:8787/calc.html#func", { waitUntil: "networkidle2" }); await sleep(300);
await p.click('[data-f="x²-4x+3"]'); await sleep(300);
log((await text("#fOut")).includes("קודקוד") && (await text("#fOut")).includes("(2, −1)") && (await p.$eval("#fOut svg", e => e.textContent)).includes("(2, −1)"), "parabola: vertex (2, −1)", (await text("#fOut")).slice(0, 300));
await p.screenshot({ path: "calc-func.png", fullPage: true });

// שתי נקודות
await p.goto("http://localhost:8787/calc.html#line", { waitUntil: "networkidle2" }); await sleep(300);
await p.click("#lx1"); await keys(["1"]); await p.click("#ly1"); await keys(["2"]); await p.click("#lx2"); await keys(["3"]); await p.click("#ly2"); await keys(["6"]);
await p.click("#lGo"); await sleep(300);
log((await text("#lOut .ans")).includes("y = 2x"), "line through (1,2),(3,6): y = 2x", await text("#lOut .ans"));
await p.screenshot({ path: "calc-line.png", fullPage: true });

// משולש
await p.goto("http://localhost:8787/calc.html#tri", { waitUntil: "networkidle2" }); await sleep(300);
await p.click("#tc"); await keys(["1", "0"]); await p.click("#tal"); await keys(["3", "0"]);
await p.click("#tGo"); await sleep(300);
log((await text("#tOut .vals")).includes("5") && (await text("#tOut .vals")).includes("8.66") && (await text("#tOut .vals")).includes("60°"), "triangle c=10, α=30° → a=5, b=8.66, β=60°", await text("#tOut .vals"));
await p.screenshot({ path: "calc-tri.png", fullPage: true });

// אחוזים
await p.goto("http://localhost:8787/calc.html#pct", { waitUntil: "networkidle2" }); await sleep(300);
log(await p.$eval("#p1r", e => e.textContent) === "= 30" && await p.$eval("#p2r", e => e.textContent) === "= 25%" && await p.$eval("#p3r", e => e.textContent) === "= 170" && (await p.$eval("#p4r", e => e.textContent)).includes("25%"), "percent: 20% of 150, 30 of 120, discount, change");
await p.click("#p1a", { clickCount: 3 }); await p.keyboard.type("50"); await sleep(100);
log(await p.$eval("#p1r", e => e.textContent) === "= 75", "percent updates live");
await p.screenshot({ path: "calc-pct.png", fullPage: true });

// מסכים צרים, כהה ובהיר
for (const scheme of ["dark", "light"]) {
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  for (const h of ["", "#solve", "#sys", "#func", "#line", "#tri", "#pct"]) {
    await p.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await p.goto("http://localhost:8787/calc.html" + h, { waitUntil: "networkidle2" });
    if (h === "#solve") { await p.click('#sEx [data-x="x²+3x-10=0"]'); await sleep(200); }
    if (h === "#func") { await p.click('[data-f="-x²+2x+3"]'); await sleep(200); }
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    if (w > 360) log(false, `overflow ${scheme} ${h || "home"}`, w);
  }
}
log(true, "no horizontal overflow at 360px (light + dark, all screens)");
await p.screenshot({ path: "calc-light-func.png", fullPage: true });
log(!errs.length, "no page errors", errs.join(" | "));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
