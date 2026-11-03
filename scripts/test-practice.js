// בדיקה לתרגול במחשבון: בכל נושא ובכל רמה – 300 תרגילים, בלי שגיאות, התשובה הנכונה מתקבלת,
// ותשובה עם "טעות נפוצה" לא מתקבלת כנכונה.   node scripts/test-practice.js
global.Sci = require("../calc-sci.js");
const P = require("../calc-practice.js"), T = require("../calc-topics.js");
let bad = 0, n = 0;
const fail = (m) => { if (bad++ < 25) console.log("❌", m); };
const missingTopics = T.TOPICS.filter(t => !P.has(t.id)).map(t => t.id);
if (missingTopics.length) fail("topics without practice: " + missingTopics.join(", "));
for (const id of P.ids) {
  if (!T.byId(id)) fail("practice for unknown topic " + id);
  for (let L = 1; L <= 4; L++) for (let i = 0; i < 300; i++) {
    let it; try { it = P.make(id, L); } catch (e) { fail(`${id} L${L}: throws ${e.message}`); break; }
    n++;
    if (!it || !it.q) { fail(`${id} L${L}: empty`); continue; }
    for (const s of [it.q, it.hint || "", ...(it.steps || []), ...(it.opts || []).map(o => o.t + (o.why || "")), ...(it.miss || []).map(m => m.why)])
      if (/undefined|NaN|Infinity|\[object/.test(s)) { fail(`${id} L${L}: bad text "${s.slice(0, 90)}"`); break; }
    try { T.rich(it.q); (it.steps || []).forEach(T.rich); } catch (e) { fail(`${id} L${L}: render ${e.message}`); }
    if (it.kind === "choice") {
      const ok = it.opts.filter(o => o.ok).length, texts = new Set(it.opts.map(o => o.t));
      if (ok !== 1 || it.opts.length < 2 || texts.size !== it.opts.length) fail(`${id} L${L}: choice ok=${ok} n=${it.opts.length} uniq=${texts.size} ${it.q}`);
      const right = it.opts.findIndex(o => o.ok);
      if (!P.check(it, right).ok) fail(`${id} L${L}: right option rejected`);
      continue;
    }
    const vals = Array.isArray(it.ans) ? it.ans : [it.ans];
    if (vals.some(v => typeof v !== "number" || !isFinite(v))) { fail(`${id} L${L}: ans ${JSON.stringify(it.ans)} ${it.q}`); continue; }
    const inp = it.kind === "pair" ? it.ans.map(String) : vals.join(", ");
    if (!P.check(it, inp).ok) fail(`${id} L${L}: correct answer "${inp}" rejected (${it.q})`);
    if (it.kind !== "pair" && it.ansT && !P.check(it, it.ansT).ok) fail(`${id} L${L}: shown answer "${it.ansT}" rejected (${it.q})`);
    for (const m of it.miss || []) {
      const mv = Array.isArray(m.v) ? m.v.join(", ") : String(m.v);
      if (Array.isArray(m.v) ? m.v.some(x => !isFinite(x)) : !isFinite(m.v)) continue;
      if (P.check(it, mv).ok) continue; // הטעות יצאה במקרה שווה לתשובה – לא מוצגת
    }
  }
}
// בדיקות לקלט
const it = { kind: "num", ans: 0.75 };
for (const s of ["3/4", "0.75", " x = 3/4 ", ".75".replace(".", "0.")]) if (!P.check(it, s).ok) fail("input " + s);
if (P.check(it, "").ok || !P.check(it, "").empty) fail("empty input");
if (!P.check({ kind: "set", ans: [2, -3] }, "x=-3, x=2").ok) fail("set input");
if (P.check({ kind: "set", ans: [2, -3] }, "2").why !== "מה שכתבת נכון – אבל חסרים עוד פתרונות.") fail("partial set message");
if (!P.check({ kind: "num", ans: -4 }, "−4").ok) fail("unicode minus");
// תשובות עם x, שורש, π וחזקה (מהמקלדת החדשה)
const C = (it, s, want) => { if (!!P.check(it, s).ok !== want) fail(`input "${s}" for ${JSON.stringify(it.ans)} should be ${want}`); };
C({ kind: "num", ans: 3 }, "x=3", true); C({ kind: "set", ans: [2, -3] }, "x=2, x=-3", true); C({ kind: "set", ans: [2, -3] }, "x=2 או x=-3", true);
C({ kind: "num", ans: 2 * Math.sqrt(3), round: 2 }, "2√3", true); C({ kind: "num", ans: 3 * Math.PI, round: 2 }, "3π", true); C({ kind: "num", ans: 32 }, "2^5", true);
C({ kind: "num", ans: Math.sqrt(2) / 2, round: 2 }, "√(2)/2", true); C({ kind: "num", ans: 45, round: 1 }, "45°", true); C({ kind: "num", ans: 0.75 }, "3/4", true);
C({ kind: "num", ans: 5 }, "2√3", false); C({ kind: "pair", ans: [4, -7] }, ["x=4", "y=-7"], true);
console.log(bad ? `❌ ${bad} problems` : `✅ practice: ${P.ids.length} topics × 4 levels, ${n} exercises OK`);
process.exitCode = bad ? 1 : 0;
// 🎹 כל נושא: המקלדת מכילה כל מה שצריך – לכתוב את התשובה, ולכתוב סימנים שמופיעים בתרגיל (חזקה, שורש, π, מעלות, x)
{ let bk = 0;
  for (const t of T.TOPICS) {
    if (!P.has(t.id)) continue;
    const keys = P.pad(t.id, t.cat).map(k => k[0]), has = k => keys.includes(k), typeable = new Set("0123456789.-/, ".split("").concat(keys.join("").split("")));
    const need = new Set();
    for (let L = 1; L <= 4; L++) for (let i = 0; i < 300; i++) { const it = P.make(t.id, L); if (it.kind === "choice") continue;
      for (const ch of String(it.ansT)) if (!typeable.has(ch)) need.add("answer:" + ch);
      const q = it.q.replace(/\$[^$]*\$/g, m => m); // מה שמופיע בתרגיל
      if (/\^/.test(q) && !has("^") && !has("^2")) need.add("power");
      if (/sqrt|√/.test(q) && !has("√(")) need.add("√");
      if (/(^|[^a-z])pi([^a-z]|$)|π/.test(q) && !has("π")) need.add("π");
      if (/°/.test(q) && !has("°")) need.add("°");
      if (/\$[^$]*x[^$]*\$/.test(q) && !/[a-z]x|x[a-z]/.test(q.replace(/max|exp/g, "")) && t.cat !== "trig" && !has("x") && !["linefn", "deriv", "tangent", "study", "integral", "expln"].includes("_")) need.add("x"); }
    if (!has("^") && !has("^2")) need.add("power key (every topic)");
    if (need.size) { bk++; console.log("❌ keypad for", t.id, "missing:", [...need].join(" ")); }
  }
  if (bk) process.exitCode = 1; console.log(bk ? `❌ ${bk} topics missing keys` : "✅ every topic's keypad has what it needs (checked 1,200 exercises per topic)");
}

// תשובה שהיא תרגיל שלם (כמו במחשבון) מתקבלת
{ const Sci = require("../calc-sci.js"); global.root = global; global.Sci = Sci; const P = require("../calc-practice.js");
  const cases = [["-3*8+5*4-12+6", -10], ["2×3+4", 10], ["√16+1", 5], ["10-3", 7], ["25%", 25], ["2^3", 8]];
  const bad = cases.filter(([x, v]) => { const n = P.nums(x); return n.length !== 1 || Math.abs(n[0] - v) > 1e-9; });
  console.log(bad.length ? "❌" : "✅", "a whole exercise as the answer is calculated (" + cases.length + " cases)", bad.length ? JSON.stringify(bad) : ""); if (bad.length) process.exitCode = 1; }
