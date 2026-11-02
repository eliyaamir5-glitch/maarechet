// בדיקה ל"יש לי תרגיל" (תבניות): בכל נושא, כמה סטים של מספרים → פתרון בלי שגיאות,
// ומה שנשלח למחשבון ("פתרון תרגיל" / מערכת / גרף) באמת נפתר שם.   node scripts/test-templates.js
global.Sci = require("../calc-sci.js");
const Tools = require("../calc-tools.js"), Calc = require("../calc-engine.js"), T = require("../calc-topics.js");
let bad = 0, n = 0; const fail = m => { if (bad++ < 30) console.log("❌", m); };
const SETS = [[2, -3, 1, 4, 5, -2], [1, 5, 6, -1, 2, 3], [-1, 2, 8, 3, -4, 7], [3, 4, 5, 2, 1, 6], [0.5, 2, 3, 1, 1, 1]];
for (const [id, tp] of Object.entries(Tools.TPL)) {
  if (!T.byId(id)) fail("template for unknown topic " + id);
  const fields = [...tp.view.matchAll(/\{(\w+)(?::([^}]*))?\}/g)].map(m => ({ k: m[1], o: m[2] }));
  for (const set of SETS) for (const pick of [0, 1]) {
    const v = {}; let i = 0;
    for (const f of fields) {
      if (f.o && f.o.includes("|")) v[f.k] = f.o.split("|")[Math.min(pick, f.o.split("|").length - 1)];
      else if (f.o === "poly") v[f.k] = "x^3-3x+2"; else if (f.o === "expr") v[f.k] = "2+3*4"; else if (f.o === "list") v[f.k] = "5, 8, 3, 9, 8";
      else if (f.o === "opt") v[f.k] = pick ? "" : 2;
      else { let x = set[i++ % set.length]; if (/^(n|t)$/.test(f.k)) x = Math.abs(Math.round(x)) + 3; if (["A", "B", "C", "a"].includes(f.k) && /°/.test(tp.view)) x = Math.abs(x) * 10 + 20; if (id === "binom") x = f.k === "p" ? 0.3 : f.k === "k" ? 2 : 6; if (id === "prob" && f.k === "n") x = 10; if (["tree"].includes(id)) x = Math.abs(x) + 2; if (id === "normal" && f.k === "s") x = 3; v[f.k] = x; }
    }
    n++;
    let r; try { r = tp.run(v); } catch (e) { if (!/בין|שלם|מספר|חסר/.test(e.message)) fail(`${id} ${JSON.stringify(v)} throws: ${e.message}`); continue; }
    const txt = JSON.stringify(r);
    if (/NaN|undefined|Infinity/.test(txt)) { fail(`${id} ${JSON.stringify(v)} → ${txt.slice(0, 140)}`); continue; }
    if (r.solve) { try { const s = Calc.solve(r.solve); if (!s || !s.answer) fail(`${id}: solver gave no answer for ${r.solve}`); } catch (e) { if (!/שורש למספר שלילי|לחלק ב-0/.test(e.message)) fail(`${id}: solver can't do "${r.solve}": ${e.message}`); } }
    else if (r.sys) { try { Calc.system(r.sys[0], r.sys[1]); } catch (e) { if (!/אינסוף|אין פתרון|מקבילים|תלויות/.test(e.message)) fail(`${id}: system "${r.sys}" → ${e.message}`); } }
    else if (r.func) { try { Calc.func(r.func); } catch (e) { fail(`${id}: func "${r.func}" → ${e.message}`); } }
    else if (!r.ans) fail(`${id}: no answer`);
  }
}
// בדיקות נכונות של כמה תבניות
const eq = (id, v, re) => { const r = Tools.TPL[id].run(v); if (!re.test(r.ans || JSON.stringify(r))) fail(`${id} ${JSON.stringify(v)} → ${r.ans || JSON.stringify(r)} (want ${re})`); };
eq("pyth", { mode: "שני ניצבים", a: 3, b: 4 }, /יתר = 5$/); eq("pyth", { mode: "יתר וניצב", a: 13, b: 5 }, /ניצב = 12$/);
eq("percent", { p: 15, n: 200 }, /^30$/); eq("ratio", { n: 35, a: 3, b: 4 }, /15 ו-20/); eq("angles", { n: 6 }, /סכום 720° · זווית 120°/);
eq("coslaw", { a: 3, b: 4, C: 90 }, /c ≈ 5$/); eq("trigid", { f: "sin", v: 0.5 }, /30°, 150°/); eq("log", { a: 8, b: 2 }, /^3$/); eq("expeq", { b: 2, c: 32 }, /x ≈ 5$/);
eq("integral", { a: 0, b: 2, e: "3x^2" }, /^8$/); eq("factor", { a: 1, b: -5, c: 6 }, /\(x-3\)\(x-2\)|\(x-2\)\(x-3\)/); eq("biquad", { b: -5, c: 4 }, /x = 2, -2, 1, -1/);
eq("stats", { e: "1, 2, 2, 5" }, /ממוצע 2.5 · חציון 2 · שכיח 2/); eq("normal", { x: 70, m: 60, s: 10 }, /z = 1 · מתחת ל-x: ≈ 84.1/); eq("linefn", { x1: 0, y1: 1, x2: 2, y2: 5 }, /שיפוע 2 · y = 2x \+ 1/);
const qd = Tools.TPL.quad.run({ a: 1, b: -5, c: 6 }); if (Calc.solve(qd.solve).answer.replace(/<[^>]+>/g, "").match(/[23]/g).length < 2) fail("quad template → solver answer " + Calc.solve(qd.solve).answer);
const missing = T.TOPICS.filter(t => !Tools.TPL[t.id]).map(t => t.id);
console.log(bad ? `❌ ${bad} problems` : `✅ templates: ${Object.keys(Tools.TPL).length} topics, ${n} fill-ins solved` + (missing.length ? ` (no template: ${missing.join(", ")})` : ""));
process.exitCode = bad ? 1 : 0;
