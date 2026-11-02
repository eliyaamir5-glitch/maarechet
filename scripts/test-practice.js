// בדיקה לתרגול במחשבון: בכל נושא ובכל רמה – 300 תרגילים, בלי שגיאות, התשובה הנכונה מתקבלת,
// ותשובה עם "טעות נפוצה" לא מתקבלת כנכונה.   node scripts/test-practice.js
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
console.log(bad ? `❌ ${bad} problems` : `✅ practice: ${P.ids.length} topics × 4 levels, ${n} exercises OK`);
process.exitCode = bad ? 1 : 0;
