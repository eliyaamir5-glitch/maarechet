import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, x); };
const tap = async sel => { await p.$eval(sel, e => e.scrollIntoView({ block: "center" })); await p.click(sel); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto("http://localhost:8787/cards.html", { waitUntil: "networkidle2" });
await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle2" });
const nRows = () => p.$$eval("#eList .ec", e => e.length);
const vals = () => p.$$eval("#eList .ec", e => e.map(r => r.querySelector(".ec-t").value + "|" + r.querySelector(".ec-d").value));

// 1. new set: starts with 2 empty cards
await tap("#btnNew"); await sleep(200);
log(await nRows() === 2, "new set opens with 2 empty cards");
await p.type("#eName", "אנגלית יחידה 3"); await p.type("#eSubj", "אנגלית");
// 2. type card, Enter moves term → definition → next card
await p.click("#eList .ec .ec-t"); await p.keyboard.type("apple"); await p.keyboard.press("Enter");
log(await p.evaluate(() => document.activeElement.classList.contains("ec-d")), "Enter in term moves to definition");
await p.keyboard.type("תפוח"); await p.keyboard.press("Enter");
log(await p.evaluate(() => document.activeElement.classList.contains("ec-t") && document.activeElement.closest(".ec") === document.querySelectorAll("#eList .ec")[1]), "Enter in definition moves to next card");
await p.keyboard.type("dog"); await p.keyboard.press("Enter"); await p.keyboard.type("כלב"); await p.keyboard.press("Enter");
await p.keyboard.type("cat"); await p.keyboard.press("Enter"); await p.keyboard.type("חתול");
log(await nRows() === 4, "always one empty card waiting at the end", "rows=" + await nRows());
log((await p.$eval("#eCount", e => e.textContent)).includes("3"), "counter shows 3 ready", await p.$eval("#eCount", e => e.textContent));
// 3. draft survives leaving
await p.reload({ waitUntil: "networkidle2" }); await tap("#btnNew"); await sleep(200);
log(!(await p.$eval("#eDraft", e => e.hidden)) && (await vals()).slice(0, 3).join(",") === "apple|תפוח,dog|כלב,cat|חתול" && await p.$eval("#eName", e => e.value) === "אנגלית יחידה 3", "draft restored after leaving the page");
// 4. paste a multi-line list into an empty card's field
await p.evaluate(() => { const t = [...document.querySelectorAll("#eList .ec-t")].at(-1); const dt = new DataTransfer(); dt.setData("text", "house - בית\nbook: ספר\ncar\tמכונית"); t.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); });
const v1 = await vals();
log(v1.slice(0, 6).join(",") === "apple|תפוח,dog|כלב,cat|חתול,house|בית,book|ספר,car|מכונית" && v1.length === 7, "pasting a list into a field spreads it into cards", JSON.stringify(v1));
// 5. quick-paste box
await tap("#ePaste summary"); await p.$eval("#eCards", e => e.value = "red - אדום\nblue - כחול");
await tap("#btnPaste"); await sleep(100);
const v2 = await vals();
log(v2.includes("red|אדום") && v2.includes("blue|כחול") && v2.length === 9 && v2.at(-1) === "|", "quick-paste box adds cards at the end", v2.length);
// 6. delete a card
await p.evaluate(() => document.querySelectorAll("#eList .ec")[1].querySelector(".ec-x").click());
log(!(await vals()).includes("dog|כלב") && (await p.$eval("#eList .ec .ec-n", e => e.textContent)) === "כרטיס 1", "✕ deletes a card and renumbers");
// 7. half-filled card blocks save with a clear message
const last = (await p.$$("#eList .ec-t")).at(-1); await last.type("green");
await tap("#btnSave"); await sleep(200);
const err = await p.$eval("#eErr", e => e.textContent);
log(/חסרה התשובה/.test(err) && await p.$$eval("#eList .ec.bad", e => e.length) === 1, "card with only a term is marked red with a message", err);
await p.$$eval("#eList .ec.bad .ec-d", e => e[0].focus()); await p.keyboard.type("ירוק");
// 8. save
await tap("#btnSave"); await sleep(300);
log(!(await p.$eval("#vSet", e => e.hidden)) && (await p.$eval("#sInfo", e => e.textContent)).includes("8 כרטיסים"), "set saved with 8 cards", await p.$eval("#sInfo", e => e.textContent));
log(await p.evaluate(() => localStorage.getItem("cardDraft")) === null, "draft cleared after save");
// 9. edit existing: cards are loaded into fields
await tap("#mEdit"); await sleep(200);
const v3 = await vals();
log(v3[0] === "apple|תפוח" && v3.length === 9 && await p.$eval("#eDraft", e => e.hidden), "editing shows the existing cards (no draft banner)");
await p.screenshot({ path: "cards-edit.png" });
await p.evaluate(() => document.querySelector("#eList .ec:nth-child(2)").scrollIntoView({ block: "start" }));
await tap("#btnCancel"); await sleep(200);
// 10. new set → back into a new empty set (no draft left)
await tap("#back"); await sleep(200); await tap("#btnNew"); await sleep(200);
log(await nRows() === 2 && (await vals()).every(x => x === "|") && await p.$eval("#eDraft", e => e.hidden), "next new set starts clean");
await p.screenshot({ path: "cards-new.png" });
// dark + 360 overflow
for (const scheme of ["light", "dark"]) { await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]); await p.setViewport({ width: 360, height: 760, isMobile: true, hasTouch: true });
  log(await p.evaluate(() => document.documentElement.scrollWidth <= 360), `no overflow at 360px (${scheme})`); }
log(!errs.length, "no page errors", errs.join(" | "));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
