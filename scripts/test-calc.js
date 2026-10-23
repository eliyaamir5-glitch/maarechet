// בדיקות למנוע המחשבון: node scripts/test-calc.js
const C = require("../calc-engine.js");
let fail = 0;
const plain = h => String(h).replace(/<sup>(.*?)<\/sup>/g, "^$1").replace(/<span class="fr"><i>(.*?)<\/i><i>(.*?)<\/i><\/span>/g, "($1)/($2)").replace(/√<span class="sq">(.*?)<\/span>/g, "√$1").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
function ok(name, cond, extra = "") { console.log(cond ? "✅" : "❌", name, cond ? "" : extra); if (!cond) fail++; }
const ans = s => plain(C.solve(s).answer);
const err = (f) => { try { f(); return null; } catch (e) { return e.user ? e.message : "CRASH " + e.message; } };

// חישוב
ok("fractions exact", ans("1/3+1/6") === "(1)/(2) (≈ 0.5)", ans("1/3+1/6"));
ok("order of operations", ans("2+3*4") === "14");
ok("powers & parens", ans("(2+3)^2-2^3") === "17");
ok("Israeli division sign ':'", ans("12:4") === "3");
ok("sqrt perfect", ans("√49") === "7");
ok("sqrt simplified", ans("√50").startsWith("5√2"), ans("√50"));
ok("decimal comma", ans("2,5*2") === "5", ans("2,5*2"));
ok("sin degrees", ans("sin(30)") === "≈ 0.5", ans("sin(30)"));
ok("mixed number", ans("7/3").includes("2 ו-(1)/(3)"), ans("7/3"));
// פישוט
ok("expand", ans("3(x-2)+2x") === "5x − 6", ans("3(x-2)+2x"));
ok("square of sum", ans("(x+3)²") === "x^2 + 6x + 9", ans("(x+3)²"));
ok("product", ans("(x+2)(x-2)") === "x^2 − 4");
// משוואה ממעלה ראשונה
ok("linear basic", ans("2x+3=11") === "x = 4");
ok("linear both sides", ans("3(x-2)=2x+5") === "x = 11");
ok("linear fraction answer", ans("3x=2") === "x = (2)/(3) (≈ 0.6667)", ans("3x=2"));
ok("linear with fractions", ans("x/2+x/3=5") === "x = 6");
ok("linear negative coef", ans("5-2x=11") === "x = −3");
ok("linear check line", plain(C.solve("2x+3=11").check).includes("11 = 11") || plain(C.solve("2x+3=11").check).includes("צד שמאל = 11"));
ok("identity", ans("2(x+1)=2x+2").startsWith("כל מספר"));
ok("no solution", ans("x+1=x+2") === "אין פתרון");
ok("solve for y alone", ans("3y-1=8") === "y = 3");
// ריבועית
ok("quadratic integer roots", ans("x²-5x+6=0") === "x1 = 2 x2 = 3", ans("x²-5x+6=0"));
ok("quadratic moved", ans("x^2=5x-6") === "x1 = 2 x2 = 3");
ok("quadratic fraction roots", ans("2x^2-x-1=0") === "x1 = −(1)/(2) x2 = 1 (≈ -0.5, 1)" || ans("2x^2-x-1=0").startsWith("x1 = −(1)/(2) x2 = 1"), ans("2x^2-x-1=0"));
ok("quadratic irrational", ans("x^2-2x-1=0").startsWith("x1 = 1 − √2 x2 = 1 + √2"), ans("x^2-2x-1=0"));
ok("quadratic irrational w/ denominator", ans("2x^2-2x-1=0").startsWith("x1 = (1 − √3)/(2)"), ans("2x^2-2x-1=0"));
ok("quadratic no solution", ans("x^2+x+1=0") === "אין פתרון");
ok("quadratic double root", ans("x^2-6x+9=0") === "x = 3");
ok("quadratic c=0 factoring", ans("x^2-4x=0") === "x1 = 0 x2 = 4");
ok("quadratic b=0", ans("2x^2-18=0") === "x1 = −3 x2 = 3");
ok("quadratic b=0 irrational", ans("x^2=8").startsWith("x1 = −2√2 x2 = 2√2"), ans("x^2=8"));
ok("quadratic b=0 negative", ans("x^2+4=0") === "אין פתרון");
ok("quadratic negative a normalized", ans("-x^2+5x-6=0") === "x1 = 2 x2 = 3");
ok("quadratic fraction coefs", ans("x^2/2-x/2-1=0") === "x1 = −1 x2 = 2", ans("x^2/2-x/2-1=0"));
ok("quadratic from product", ans("(x-1)(x+4)=0") === "x1 = −4 x2 = 1");
ok("quadratic steps mention Δ", C.solve("x^2+3x-10=0").steps.some(s => plain(s.m).includes("Δ = b^2 − 4ac = 3^2 − 4·1·(−10) = 49")), C.solve("x^2+3x-10=0").steps.map(s => plain(s.m)).join(" | "));
// אי-שוויונים
ok("ineq linear", ans("2x-7<3") === "x < 5");
ok("ineq flip on negative", ans("-3x≥6") === "x ≤ −2");
ok("ineq flip warning step", C.solve("5-2x>1").steps.some(s => s.h.includes("הופכים")));
ok("ineq always", ans("x+1>x").startsWith("כל"));
ok("ineq quad between", ans("x^2-4<0") === "−2 < x < 2", ans("x^2-4<0"));
ok("ineq quad outside", ans("x^2-5x+6≥0") === "x ≤ 2 או x ≥ 3", ans("x^2-5x+6≥0"));
ok("ineq quad negative a", ans("-x^2+1>0") === "−1 < x < 1", ans("-x^2+1>0"));
ok("ineq quad no roots", ans("x^2+1>0").startsWith("כל") && ans("x^2+1<0") === "אין פתרון");
ok("ineq quad double root", ans("x^2-2x+1>0").startsWith("כל x חוץ") && ans("x^2-2x+1≤0") === "x = 1");
ok("ineq <= typed", ans("x+2<=5") === "x ≤ 3");
// y = ...
ok("isolate y", ans("2x+y=7") === "y = −2x + 7", ans("2x+y=7"));
ok("isolate y with coef", ans("3y-6x=9") === "y = 2x + 3", ans("3y-6x=9"));
// מערכת
const s = C.system("x+y=5", "x-y=1");
ok("system basic", plain(s.answer) === "x = 3, y = 2", plain(s.answer));
ok("system check ✓", plain(s.check).split("✓").length === 3);
ok("system no coef 1", plain(C.system("2x+3y=12", "3x+2y=13").answer) === "x = 3, y = 2", plain(C.system("2x+3y=12", "3x+2y=13").answer));
ok("system parallel", plain(C.system("x+y=1", "2x+2y=5").answer).includes("מקבילים"));
ok("system same line", plain(C.system("x+y=1", "2x+2y=2").answer).includes("אינסוף"));
ok("system fractional answer", plain(C.system("2x+y=3", "x-y=1").answer).startsWith("x = (4)/(3), y = (1)/(3)"), plain(C.system("2x+y=3", "x-y=1").answer));
ok("system y=… form", plain(C.system("y=2x+1", "y=-x+7").answer) === "x = 2, y = 5", plain(C.system("y=2x+1", "y=-x+7").answer));
// פונקציה
const fq = C.func("y = x^2-4x+3");
ok("parabola vertex", fq.steps.some(t => plain(t.m).includes("(2, −1)")), fq.steps.map(t => plain(t.m)).join(" | "));
ok("parabola roots", fq.pts.some(p => p.x === 1 && p.y === 0) && fq.pts.some(p => p.x === 3 && p.y === 0));
const fl = C.func("2x-4");
ok("line slope + intercepts", fl.steps.some(t => plain(t.m).includes("m = 2")) && fl.pts.some(p => p.x === 2 && p.y === 0));
ok("func plot value", Math.abs(C.func("sin(x)").f(90) - 1) < 1e-9);
// שתי נקודות
const l = C.line2("1", "2", "3", "6");
ok("line2 equation", plain(l.answer) === "y = 2x", plain(l.answer));
ok("line2 distance", l.extra.some(e => plain(e).includes("2√5")), l.extra.map(plain).join(" | "));
ok("line2 midpoint", l.extra.some(e => plain(e).includes("(2, 4)")));
ok("line2 vertical", plain(C.line2("2", "1", "2", "5").answer) === "x = 2");
ok("line2 fractions", plain(C.line2("1/2", "0", "0", "1").answer) === "y = −2x + 1", plain(C.line2("1/2", "0", "0", "1").answer));
// משולש
const t1 = C.triangle({ a: "3", b: "4" });
ok("triangle 3-4-5", t1.vals.c === 5 && Math.abs(t1.vals.alpha - 36.87) < 0.01 && t1.area === 6, JSON.stringify(t1.vals));
const t2 = C.triangle({ c: "10", alpha: "30" });
ok("triangle hyp + angle", t2.vals.a === 5 && Math.abs(t2.vals.b - 8.66) < 0.01 && t2.vals.beta === 60, JSON.stringify(t2.vals));
ok("triangle beta given", C.triangle({ a: "5", beta: "60" }).vals.alpha === 30);
// שגיאות ברורות
ok("err hebrew words", err(() => C.solve("פתור 2x=4")).includes("בלי מילים"));
ok("err letter", err(() => C.solve("2a+1=3")).includes("לא מוכרת"));
ok("err missing paren", err(() => C.solve("3(x+1=4")).includes("חסר סוגר"));
ok("err two equals", err(() => C.solve("x=1=2")).includes("סימן אחד"));
ok("err x in denominator", err(() => C.solve("1/x=2")).includes("במכנה"));
ok("err cubic", err(() => C.solve("x^3=8")).includes("ממעלה 3"));
ok("err empty", err(() => C.solve("")).includes("עוד לא"));
ok("err divide by zero", err(() => C.solve("5/0")).includes("לחלק באפס"));
ok("err triangle hyp", err(() => C.triangle({ a: "5", c: "3" })).includes("היתר"));
ok("err trailing op", err(() => C.solve("2x+=4")) !== null && !err(() => C.solve("2x+=4")).startsWith("CRASH"));
// תצוגה חיה
ok("preview kind", C.preview("x²-5x+6=0").kind === "משוואה ריבועית" && C.preview("2x+1<5").kind === "אי-שוויון");
console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exitCode = fail ? 1 : 0;
