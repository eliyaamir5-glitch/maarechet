// בדיקות למחשבון המדעי:  node scripts/test-sci.js
const S = require("../calc-sci.js");
let bad = 0; const eq = (e, want, o) => { let v; try { v = S.evaluate(e, o); } catch (x) { v = "ERR " + x.message; } const ok = typeof want === "number" ? Math.abs(v - want) < 1e-9 : String(v).startsWith(want); if (!ok) { bad++; console.log("❌", e, "→", v, "want", want); } };
eq("2+3*4", 14); eq("(2+3)*4", 20); eq("2^3^2", 512); eq("-2^2", -4); eq("2(3+1)", 8); eq("2π", 2 * Math.PI); eq("sin(30)", 0.5); eq("sin(180)", 0); eq("cos(60)", 0.5);
eq("sin(π/6)", 0.5, { deg: false }); eq("sin⁻¹(0.5)", 30); eq("tan(45)", 1); eq("tan(90)", "ERR"); eq("log(1000)", 3); eq("ln(e)", 1); eq("√16", 4); eq("√(9)+1", 4); eq("5!", 120); eq("50%", 0.5);
eq("200*15%", 30); eq("Ans+1", 6, { ans: 5 }); eq("1/0", "ERR"); eq("√-4", "ERR"); eq("(1+2", 3); eq("3²", 9); eq("10÷4", 2.5); eq("2×3−1", 5); eq("abs(-3)", 3); eq("1.5E3", 1500); eq("", "ERR"); eq("2+", "ERR"); eq("3)", "ERR"); eq("$", "ERR");
if (S.fmt(0.1 + 0.2) !== "0.3") { bad++; console.log("❌ fmt 0.1+0.2", S.fmt(0.1 + 0.2)); }
if (S.fmt(1 / 3) !== "0.333333333333") { bad++; console.log("❌ fmt 1/3", S.fmt(1 / 3)); }
console.log(bad ? `❌ ${bad} problems` : "✅ scientific calculator: all checks passed"); process.exitCode = bad ? 1 : 0;
