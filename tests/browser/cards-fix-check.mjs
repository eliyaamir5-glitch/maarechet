import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const B = "http://localhost:8787/cards.html";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const res = []; const log = (ok, n, x = "") => { res.push(ok); console.log(ok ? "✅" : "❌", n, x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = []; let dialogs = []; let answer = true;
const p = await b.newPage(); await p.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => { dialogs.push(d.message()); answer ? d.accept() : d.dismiss(); });
const view = () => p.evaluate(() => VIEWS.find(x => !document.getElementById(x).hidden));
const enc = o => "j" + Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
await p.goto(B, { waitUntil: "networkidle2" }); await p.evaluate(() => localStorage.clear());

// 1. bad share link
await p.goto("about:blank"); await p.goto(B + "#s=" + enc({ title: "x", cards: "abc" }), { waitUntil: "networkidle2" }); await sleep(500);
log(await view() === "vHome" && dialogs.some(d => d.includes("לא הצלחנו")) && (await p.evaluate(() => JSON.parse(localStorage.sets || "[]").length)) === 0, "bad share link: message, nothing saved");
await p.reload({ waitUntil: "networkidle2" }); await sleep(300);
log(!errs.length && await view() === "vHome", "reload after bad link: no errors", errs.join("|"));
// 1b. share with mixed junk cards
dialogs = [];
await p.goto("about:blank"); await p.goto(B + "#s=" + enc({ title: "T".repeat(500), cards: [{ t: "a", d: "1" }, { t: "", d: "z" }, null, 5, { t: { x: 1 }, d: "q" }, { t: 7, d: " b " }, { t: "a", d: "1" }] }), { waitUntil: "networkidle2" }); await sleep(500);
const imp = await p.evaluate(() => JSON.parse(localStorage.sets).at(-1));
log(await view() === "vSet" && JSON.stringify(imp.cards) === '[{"t":"a","d":"1"},{"t":"7","d":"b"}]' && imp.title.length === 120, "share link: junk cards dropped, dups removed, title capped", JSON.stringify(imp.cards));
// 1c. already-corrupted stored sets recover
await p.evaluate(() => localStorage.sets = JSON.stringify([{ id: "bad1", title: "b", cards: "abc" }, null, { id: "ok1", title: "ok", cards: [{ t: "x", d: "y" }, { t: "z" }, { t: "w", d: "v" }] }, { id: "mywords", title: "m", cards: {} }]));
await p.reload({ waitUntil: "networkidle2" }); await sleep(300);
const fixed = await p.evaluate(() => JSON.parse(localStorage.sets));
log(!errs.length && fixed.length === 2 && fixed[0].id === "ok1" && fixed[0].cards.length === 2 && fixed[1].id === "mywords", "corrupted stored sets are repaired on load", JSON.stringify(fixed.map(s => [s.id, s.cards.length])));

// 4. history: hardware back
await p.evaluate(() => document.querySelector('.set[data-id="ok1"]').click()); await sleep(200);
await p.click("#mFlash"); await sleep(200);
await p.goBack(); await sleep(300);
log(await view() === "vSet", "back from flashcards → set menu", await view());
await p.goBack(); await sleep(300);
log(await view() === "vHome" && p.url().includes("cards"), "back from set menu → home (still on page)", await view());
await p.evaluate(() => document.querySelector('.set[data-id="ok1"]').click()); await sleep(200);
await p.click("#mQuiz"); await sleep(200); await p.click("#qQuit"); await sleep(300);
await p.goBack(); await sleep(300);
log(await view() === "vHome", "in-page 'סיום' then phone back → home (no stale quiz entry)", await view());
await p.click("#btnDict"); await sleep(200); await p.goBack(); await sleep(300);
log(await view() === "vHome", "back from dictionary → home");
await p.evaluate(() => document.querySelector('.set[data-id="ok1"]').click()); await sleep(200);
await p.click("#mMatch"); await sleep(200); await p.click("#back"); await sleep(300);
log(await view() === "vSet", "in-page → חזרה still works (match → set)");
await p.click("#back"); await sleep(300);
log(await view() === "vHome", "in-page → חזרה set → home");

// 3. dirty editor
await p.evaluate(() => document.querySelector('.set[data-id="ok1"]').click()); await sleep(200);
await p.click("#mEdit"); await sleep(200); dialogs = [];
await p.click("#btnCancel"); await sleep(300);
log(await view() === "vSet" && !dialogs.length, "cancel without changes: no question");
await p.click("#mEdit"); await sleep(200); await p.type("#eName", "!"); answer = false; dialogs = [];
await p.click("#btnCancel"); await sleep(200);
log(await view() === "vEdit" && dialogs[0] === "לצאת בלי לשמור?", "cancel with changes asks; 'no' stays");
await p.click("#back"); await sleep(200);
log(await view() === "vEdit", "→ חזרה with changes asks too");
await p.goBack(); await sleep(400);
log(await view() === "vEdit", "phone back with changes + 'no' stays in editor");
answer = true; await p.goBack(); await sleep(400);
log(await view() === "vSet" && (await p.$eval("#sName", e => e.textContent)) === "ok", "phone back + 'yes' leaves without saving", await view());
// copy of builtin
await p.goBack(); await sleep(300);
await p.evaluate(() => document.querySelector('#classSets .set').click()); await sleep(200);
await p.click("#mEdit"); await sleep(200); await p.type("#eName", "!"); dialogs = [];
await p.click("#btnCancel"); await sleep(300);
log(dialogs[0] === "לצאת בלי לשמור?" && await view() === "vSet", "copy-to-edit: leaving with changes asks, returns to the class set");
await p.click("#back"); await sleep(300);

// 2. saving an existing set keeps the new-set draft
await p.click("#btnNew"); await sleep(200); await p.type("#eName", "טיוטה"); await sleep(100);
await p.click("#back"); await sleep(300);
await p.evaluate(() => document.querySelector('.set[data-id="ok1"]').click()); await sleep(200);
await p.click("#mEdit"); await sleep(200); await p.click("#btnSave"); await sleep(300);
log(await p.evaluate(() => JSON.parse(localStorage.cardDraft || "null")?.title) === "טיוטה", "saving an existing set keeps the new-set draft");
// draft clear asks
await p.click("#back"); await sleep(300); await p.click("#btnNew"); await sleep(200);
answer = false; dialogs = []; await p.click("#btnDraftClear"); await sleep(100);
log(dialogs.length === 1 && await p.$eval("#eName", e => e.value) === "טיוטה", "'להתחיל מחדש' asks first; 'no' keeps it");
answer = true;
// 6. paste box: skipped lines
await p.click("#ePaste summary"); await p.$eval("#eCards", e => e.value = "well-known - מוכר היטב\nבלי מפריד\nred - אדום");
await p.click("#btnPaste"); await sleep(100);
const v = await p.$$eval("#eList .ec", e => e.map(r => r.querySelector(".ec-t").value + "|" + r.querySelector(".ec-d").value));
log(v.includes("well-known|מוכר היטב") && (await p.$eval("#eErr", e => e.textContent)).includes("שורה אחת לא נוספה") && await p.$eval("#eCards", e => e.value) === "בלי מפריד", "paste box: hyphenated term kept, skipped line reported + left in the box", await p.$eval("#eErr", e => e.textContent));
// dup save note
await p.$eval("#eCards", e => e.value = ""); await p.evaluate(() => ED.insert([{ t: "red", d: "אדום" }])); dialogs = [];
await p.click("#btnSave"); await sleep(300);
const saved = await p.evaluate(() => JSON.parse(localStorage.sets).at(-1));
log(saved.cards.length === 2 && dialogs.some(d => d.includes("פעמיים")), "duplicate card saved once, with a note", JSON.stringify(saved.cards));
// 5. judge
const j = await p.evaluate(() => [judge("1918", "1917"), judge("1917", "1917"), judge("%", "%"), judge("+", "+"), judge("-", "+"), judge("כלב", "כלה"), judge("סביבא", "סביבה"), judge("enviromnent", "environment"), judge("dogg", "dog")]);
log(JSON.stringify(j) === '["no","ok","ok","ok","no","no","almost","almost","no"]', "answer check: numbers strict, short words strict, symbols compared raw", JSON.stringify(j));
// 8. quiz options unique
await p.evaluate(() => { mySets.push({ id: "dq", title: "dq", cards: [{ t: "a", d: "X" }, { t: "b", d: "Y" }, { t: "c", d: "Y" }, { t: "d", d: "Y" }, { t: "e", d: "Z" }] }); openSet("dq"); startQuiz(); });
let uniq = true; for (let k = 0; k < 5; k++) { const o = await p.$$eval("#qOpts .opt", e => e.map(x => x.textContent)); if (new Set(o).size !== o.length) uniq = false; await p.evaluate(() => { qi++; drawQuiz() }); }
log(uniq, "quiz: no two identical options");
// match time
await p.evaluate(() => { openSet("ok1"); startMatch(); }); await sleep(300);
await p.evaluate(() => { const t = [...document.querySelectorAll("#mGrid .tile")]; for (const i of ["0", "1"]) { t.find(x => x.dataset.i === i && x.dataset.side === "t").click(); t.find(x => x.dataset.i === i && x.dataset.side === "d").click(); } });
const shown = await p.$eval("#mTime", e => e.textContent); await sleep(600);
log(await p.$eval("#dTitle", e => e.textContent) === shown + " שניות", "match time stops at the last match", shown + " vs " + await p.$eval("#dTitle", e => e.textContent));
// hashchange share
await p.evaluate(() => openSet("ok1")); await sleep(100);
const n0 = await p.evaluate(() => mySets.length);
await p.evaluate(h => location.hash = h, "#s=" + enc({ title: "חדש מקישור", cards: [{ t: "q", d: "w" }, { t: "e", d: "r" }] })); await sleep(600);
log(await p.evaluate(() => mySets.length) === n0 + 1 && (await p.$eval("#sName", e => e.textContent)) === "חדש מקישור" && !p.url().includes("#s="), "share link opened while page is open (hash change) is imported");
await p.goBack(); await sleep(400);
log(await view() === "vHome", "back from shared set → home");
// 7. dictionary race
await p.evaluate(() => { const real = window.fetch; window.fetch = (u, o) => { const s = String(u); const slow = /slowword/.test(s); return new Promise(r => setTimeout(() => r(new Response(JSON.stringify(/mymemory/.test(s) ? { responseData: { translatedText: slow ? "ישן" : "חדש" }, matches: [] } : []), { status: 200 })), slow ? 800 : 50)); }; });
await p.click("#btnDict"); await sleep(200);
await p.$eval("#dIn", e => e.value = "slowword"); await p.evaluate(() => lookup());
await p.$eval("#dIn", e => e.value = "fastword"); await p.evaluate(() => lookup());
await sleep(1500);
const out = await p.$eval("#dOut", e => e.innerText);
log(out.includes("fastword") && out.includes("חדש") && !out.includes("ישן"), "dictionary: slow older lookup doesn't overwrite the newer one");
log(!errs.length, "no page errors", errs.join(" | "));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} passed`);
