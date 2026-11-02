// מחשבון מדעי: מפרש ביטוי בטוח (בלי eval) – + − × ÷ ^ ! %, סוגריים, π, e, Ans,
// sin cos tan (ומהופכות), log (בסיס 10), ln, √, abs. כפל "שקוף": 2π, 3(4), (1+2)(3).
// מעלות/רדיאנים לפי deg.
(function (root) {
const FN = ["asin", "acos", "atan", "sin", "cos", "tan", "log", "ln", "abs", "√"];
function tokens(s) {
  s = String(s).replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/sin⁻¹/g, "asin").replace(/cos⁻¹/g, "acos").replace(/tan⁻¹/g, "atan").replace(/sqrt/g, "√").replace(/pi/g, "π");
  const out = []; let i = 0;
  while (i < s.length) {
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/);
    if (num) { out.push({ t: "n", v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const f = FN.find(n => s.startsWith(n, i)); if (f) { out.push({ t: "f", f }); i += f.length; continue; }
    if (s.startsWith("Ans", i)) { out.push({ t: "ans" }); i += 3; continue; }
    const c = s[i];
    if (c === "π") out.push({ t: "n", v: Math.PI }); else if (c === "e") out.push({ t: "n", v: Math.E });
    else if ("+-*/^()!%".includes(c)) out.push({ t: c });
    else throw new Error(`לא מכיר את "${c}"`);
    i++;
  }
  // כפל שקוף: בין מספר/סוגר-סוגר/! לבין מספר/סוגר-פותח/פונקציה
  const r = [];
  for (const t of out) { const p = r[r.length - 1]; if (p && (p.t === "n" || p.t === "ans" || p.t === ")" || p.t === "!" || p.t === "%") && (t.t === "n" || t.t === "ans" || t.t === "(" || t.t === "f")) r.push({ t: "*" }); r.push(t); }
  return r;
}
function evaluate(expr, { deg = true, ans = 0 } = {}) {
  const T = tokens(expr); let i = 0;
  if (!T.length) throw new Error("ריק");
  const peek = () => T[i], take = () => T[i++];
  const toR = x => (deg ? x * Math.PI / 180 : x), fromR = x => (deg ? x * 180 / Math.PI : x);
  const fact = n => { if (n < 0 || !Number.isInteger(n)) throw new Error("עצרת רק למספר שלם אי-שלילי"); if (n > 170) return Infinity; let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
  const clean = v => (Math.abs(v) < 1e-12 ? 0 : v); // sin(180) = 0 ולא 1.2e-16
  function expr0() { let v = term(); while (peek() && (peek().t === "+" || peek().t === "-")) { const o = take().t, b = term(); v = o === "+" ? v + b : v - b; } return v; }
  function term() { let v = unary(); while (peek() && (peek().t === "*" || peek().t === "/")) { const o = take().t, b = unary(); if (o === "/" && b === 0) throw new Error("אי אפשר לחלק ב-0"); v = o === "*" ? v * b : v / b; } return v; }
  function unary() { if (peek() && peek().t === "-") { take(); return -unary(); } if (peek() && peek().t === "+") { take(); return unary(); } return power(); }
  function power() { const b = postfix(); if (peek() && peek().t === "^") { take(); const e = unary(); return Math.pow(b, e); } return b; }
  function postfix() { let v = atom(); while (peek() && (peek().t === "!" || peek().t === "%")) { const o = take().t; v = o === "!" ? fact(v) : v / 100; } return v; }
  function atom() {
    const t = take(); if (!t) throw new Error("חסר מספר בסוף");
    if (t.t === "n") return t.v; if (t.t === "ans") return ans;
    if (t.t === "(") { const v = expr0(); if (peek() && peek().t === ")") take(); return v; } // סוגר חסר בסוף – סוגרים לבד
    if (t.t === "f") {
      const a = peek() && peek().t === "(" ? atom() : power();
      switch (t.f) {
        case "sin": return clean(Math.sin(toR(a))); case "cos": return clean(Math.cos(toR(a)));
        case "tan": { if (deg && Math.abs(((a % 180) + 180) % 180 - 90) < 1e-9) throw new Error("tan לא מוגדר ב-90°"); return clean(Math.tan(toR(a))); }
        case "asin": if (Math.abs(a) > 1) throw new Error("sin⁻¹ רק בין 1- ל-1"); return fromR(Math.asin(a));
        case "acos": if (Math.abs(a) > 1) throw new Error("cos⁻¹ רק בין 1- ל-1"); return fromR(Math.acos(a));
        case "atan": return fromR(Math.atan(a));
        case "log": if (a <= 0) throw new Error("log רק למספר חיובי"); return Math.log10(a);
        case "ln": if (a <= 0) throw new Error("ln רק למספר חיובי"); return Math.log(a);
        case "√": if (a < 0) throw new Error("אין שורש למספר שלילי"); return Math.sqrt(a);
        case "abs": return Math.abs(a);
      }
    }
    throw new Error(t.t === ")" ? "סוגר בלי פותח" : "חסר מספר לפני \"" + t.t + "\"");
  }
  const v = expr0(); if (i < T.length) throw new Error(T[i].t === ")" ? "סוגר בלי פותח" : "משהו לא ברור בתרגיל");
  if (Number.isNaN(v)) throw new Error("התוצאה לא מוגדרת");
  return v;
}
function fmt(v) {
  if (!isFinite(v)) return v > 0 ? "∞" : v < 0 ? "-∞" : "לא מוגדר";
  if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(6).replace(/\.?0+e/, "e").replace("e+", "×10^").replace("e-", "×10^-");
  return String(Number(v.toPrecision(12)));
}
const api = { evaluate, fmt };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Sci = api;
})(typeof window !== "undefined" ? window : globalThis);
