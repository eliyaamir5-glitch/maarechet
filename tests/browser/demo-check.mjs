import { ROOT, CHROME, CHROME_ARGS } from "./_env.mjs";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:8787/demo.html", { waitUntil: "networkidle2" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);
const out = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const f = () => document.getElementById("frame").contentDocument;
  const r = {};
  // תלמיד שולח רעיון
  await sleep(500);
  f().querySelectorAll("dialog[open]").forEach(d => d.close()); f().querySelector(".upd-ok") && f().querySelector(".upd-ok").click(); await sleep(1500);
  f().querySelector(".upd-ok") && f().querySelector(".upd-ok").click(); await sleep(1500);
  f().getElementById("fbOpen").click(); await sleep(300);
  f().getElementById("fbText").value = "רעיון מהדמו: לוח מבחנים חודשי"; f().getElementById("fbSend").click(); await sleep(800);
  r.thanks = !!f().querySelector(".fb-done");
  r.hostCount = window.__DEMO_HOST.fb.length;
  // מנהל רואה בלשונית פניות
  document.getElementById("goStaff").click(); await sleep(2500);
  if (f().getElementById("lCode")) { f().getElementById("lCode").value = "demo"; f().getElementById("lGo").click(); await sleep(1500); }
  f().querySelector('#tabs [data-t="fb"]').click(); await sleep(800);
  r.fbItems = f().querySelectorAll("#fbList .item").length;
  r.first = f().querySelector("#fbList .item .t")?.textContent;
  f().querySelector("[data-done]").click(); await sleep(800);
  r.afterDone = f().querySelectorAll("#fbList .item").length;
  f().querySelector('#tabs [data-t="me"]').click(); await sleep(400);
  f().getElementById("mCode").value = "abcdef"; f().getElementById("mCode2").value = "abcdef"; f().getElementById("mCodeGo").click(); await sleep(600);
  r.codeMsg = f().getElementById("mCodeMsg").textContent;
  return r;
});
console.log(JSON.stringify(out, null, 1), "errors:", errs);
await b.close();
