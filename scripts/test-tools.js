// בדיקות לכלים החדשים במחשבון (נגזרת, סדרות, בינומית):  node scripts/test-tools.js
const T = require("../calc-tools.js");
let bad = 0; const ok = (n, c, x = "") => { if (!c) { bad++; console.log("❌", n, x); } };
let r = T.derivative("x³-3x+2", "2");
ok("derivative", /f'\(x\) = 3x\^2-3/.test(r.ans), r.ans);
ok("value at point", /f'\(2\) = 9/.test(r.ans), r.ans);
ok("tangent", /y = 9x-14/.test(r.ans), r.ans); // f(2)=4, 4-18=-14
ok("extremes", /מקסימום ב-\(-1, 4\)/.test(r.ans) && /מינימום ב-\(1, 0\)/.test(r.ans), r.ans);
r = T.derivative("5", ""); ok("constant", /f'\(x\) = 0/.test(r.ans), r.ans);
r = T.derivative("2x^2+4x", ""); ok("parabola min", /מינימום ב-\(-1, -2\)/.test(r.ans), r.ans);
r = T.derivative("x^3", ""); ok("inflection, not extreme", /פיתול/.test(r.ans), r.ans);
for (const badIn of ["sin(x)", "", "x^^2", "2y"]) { let e = null; try { T.derivative(badIn); } catch (x) { e = x.message; } ok("rejects " + badIn, !!e); }
r = T.sequence("a", "3", "2", "10"); ok("arith", r.ans === "a10 = 21 · S10 = 120", r.ans);
r = T.sequence("g", "2", "3", "5"); ok("geom", r.ans === "a5 = 162 · S5 = 242", r.ans);
r = T.sequence("g", "8", "1/2", "3"); ok("geom fraction + infinite sum", r.ans === "a3 = 2 · S3 = 14" && r.steps.some(s => /16/.test(s)), r.ans);
r = T.binomial("5", "2", "0.5"); ok("binom eq", Math.abs(r.value - 0.3125) < 1e-9, r.value);
r = T.binomial("10", "1", "0.2", "ge"); ok("binom ge (complement)", Math.abs(r.value - (1 - 0.8 ** 10)) < 1e-9 && r.steps.some(s => /המשלים/.test(s)), r.value);
r = T.binomial("4", "2", "1/6", "le"); const p = 1 / 6, want = [0, 1, 2].reduce((s, j) => s + [1, 4, 6][j] * p ** j * (1 - p) ** (4 - j), 0); ok("binom le", Math.abs(r.value - want) < 1e-9, r.value);
let e = null; try { T.binomial("5", "7", "0.5"); } catch (x) { e = x.message; } ok("k>n rejected", !!e);
for (const s of [...T.derivative("x³-3x+2", "2").steps, ...T.binomial("10", "3", "0.3", "ge").steps]) ok("no NaN/undefined", !/NaN|undefined/.test(s), s);
console.log(bad ? `❌ ${bad} problems` : "✅ calc tools: all checks passed"); process.exitCode = bad ? 1 : 0;
