// כלים חדשים במחשבון, עם כל השלבים: נגזרת של פולינום (כולל משיק וקיצון), סדרות, התפלגות בינומית.
// כל פונקציה מחזירה { steps: ["טקסט עם $מתמטיקה$", …], ans: "…" } או זורקת Error עם הסבר בעברית.
(function (root) {
const fmt = v => { if (Math.abs(v) < 1e-10) v = 0; const r = Math.round(v * 1e6) / 1e6; return String(r); };
const num = (s, name) => { const t = String(s ?? "").trim().replace(/[−–]/g, "-"); if (!t) throw new Error(`חסר ${name}`);
  const m = t.match(/^(-?\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/); if (!m) throw new Error(`${name} צריך להיות מספר (אפשר שבר כמו 1/2)`);
  return m[2] ? +m[1] / +m[2] : +m[1]; };
// ---- פולינום ----
function parsePoly(s) {
  let t = String(s || "").replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\*/g, "").replace(/^y=|^f\(x\)=/i, "").replace(/X/g, "x");
  if (!t) throw new Error("כתוב פונקציה, למשל x³-3x+2");
  if (!/^[-+\dx^.]+$/.test(t)) throw new Error("כרגע אני גוזר רק פולינומים (חזקות של x), למשל 2x³-5x+1");
  if (/^[+-]/.test(t) === false) t = "+" + t;
  const terms = t.match(/[+-][^+-]+/g); if (!terms || terms.join("") !== t) throw new Error("לא הצלחתי לקרוא את הפונקציה");
  const c = {};
  for (const term of terms) {
    const m = term.match(/^([+-])(\d*\.?\d*)(x(?:\^(\d+))?)?$/);
    if (!m || (!m[2] && !m[3])) throw new Error(`לא הבנתי את "${term}"`);
    const coef = (m[1] === "-" ? -1 : 1) * (m[2] ? +m[2] : 1), deg = m[3] ? (m[4] ? +m[4] : 1) : 0;
    if (deg > 12) throw new Error("החזקה גדולה מדי");
    c[deg] = (c[deg] || 0) + coef;
  }
  return c;
}
function polyStr(c) {
  const ds = Object.keys(c).map(Number).filter(d => Math.abs(c[d]) > 1e-12).sort((a, b) => b - a);
  if (!ds.length) return "0";
  return ds.map((d, i) => { const a = c[d], A = Math.abs(a), sgn = a < 0 ? "-" : i ? "+" : "";
    return sgn + (d === 0 ? fmt(A) : (A === 1 ? "" : fmt(A)) + "x" + (d > 1 ? "^" + d : "")); }).join("");
}
const val = (c, x) => Object.entries(c).reduce((s, [d, a]) => s + a * x ** +d, 0);
const der = c => { const r = {}; for (const [d, a] of Object.entries(c)) if (+d > 0) r[+d - 1] = (r[+d - 1] || 0) + a * +d; return r; };
const paren = v => (v < 0 ? `(${fmt(v)})` : fmt(v));
function derivative(fx, x0s) {
  const c = parsePoly(fx), d = der(c), dd = der(d), steps = [];
  steps.push(`הפונקציה: $f(x)=${polyStr(c)}$`);
  steps.push(`כלל הגזירה: $(a*x^n)'=n*a*x^(n-1)$, ומספר לבד נגזר ל-0. גוזרים כל איבר בנפרד:`);
  const parts = Object.keys(c).map(Number).filter(k => c[k]).sort((a, b) => b - a).map(k => `$(${polyStr({ [k]: c[k] })})'=${k ? polyStr({ [k - 1]: c[k] * k }) : "0"}$`);
  steps.push(parts.join(" , "));
  steps.push(`ביחד: $f'(x)=${polyStr(d)}$`);
  let ans = `f'(x) = ${polyStr(d)}`;
  if (x0s != null && String(x0s).trim() !== "") {
    const x0 = num(x0s, "הנקודה"), m = val(d, x0), y0 = val(c, x0), n = y0 - m * x0;
    steps.push(`מציבים $x=${fmt(x0)}$ בנגזרת: $f'(${fmt(x0)})=${fmt(m)}$ – זה שיפוע המשיק`);
    steps.push(`הנקודה על הגרף: $f(${fmt(x0)})=${fmt(y0)}$`);
    steps.push(`משוואת המשיק: $y-${paren(y0)}=${paren(m)}(x-${paren(x0)})$ ← $y=${polyStr({ 1: m, 0: n })}$`);
    ans += ` · f'(${fmt(x0)}) = ${fmt(m)} · משיק: y = ${polyStr({ 1: m, 0: n })}`;
  }
  // קיצון: כשהנגזרת ממעלה 1 או 2
  const dg = Math.max(-1, ...Object.keys(d).map(Number).filter(k => Math.abs(d[k]) > 1e-12));
  if (dg === 1 || dg === 2) {
    const A = d[2] || 0, B = d[1] || 0, C = d[0] || 0;
    let xs = [];
    if (dg === 1) xs = [-C / B];
    else { const D = B * B - 4 * A * C; if (D >= 0) xs = D === 0 ? [-B / (2 * A)] : [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)]; }
    steps.push(`נקודות קיצון: פותרים $f'(x)=0$: $${polyStr(d)}=0$` + (xs.length ? ` ← $x=${xs.map(fmt).join(", ")}$` : " – אין פתרון, אז אין נקודות קיצון"));
    const kinds = xs.map(x => { const s2 = val(dd, x); return s2 < 0 ? "מקסימום" : s2 > 0 ? "מינימום" : "פיתול (לא קיצון)"; });
    if (xs.length) steps.push(xs.map((x, i) => `$(${fmt(x)}, ${fmt(val(c, x))})$ – ${kinds[i]}`).join(" · ") + ` (לפי הסימן של $f''(x)=${polyStr(dd)}$)`);
    if (xs.length) ans += " · קיצון: " + xs.map((x, i) => `${kinds[i]} ב-(${fmt(x)}, ${fmt(val(c, x))})`).join(", ");
  }
  return { steps, ans };
}
// ---- סדרות ----
function sequence(type, a1s, ds, ns) {
  const a1 = num(a1s, "האיבר הראשון"), d = num(ds, type === "g" ? "המנה q" : "ההפרש d"), n = num(ns, "n");
  if (!Number.isInteger(n) || n < 1 || n > 10000) throw new Error("n צריך להיות מספר שלם חיובי");
  const steps = [];
  if (type === "a") {
    const an = a1 + (n - 1) * d, S = n * (a1 + an) / 2;
    steps.push(`סדרה חשבונית: כל איבר גדול מהקודם ב-$d=${fmt(d)}$`);
    steps.push(`האיבר ה-${n}: $a_n=a_1+(n-1)d=${fmt(a1)}+(${n}-1)*${paren(d)}=${fmt(an)}$`);
    steps.push(`הסכום: $S_n=frac{n(a_1+a_n)}{2}=frac{${n}(${fmt(a1)}+${paren(an)})}{2}=${fmt(S)}$`);
    steps.push(`האיברים הראשונים: ${Array.from({ length: Math.min(n, 6) }, (_, i) => fmt(a1 + i * d)).join(", ")}${n > 6 ? ", …" : ""}`);
    return { steps, ans: `a${n} = ${fmt(an)} · S${n} = ${fmt(S)}` };
  }
  const an = a1 * d ** (n - 1), S = d === 1 ? a1 * n : a1 * (d ** n - 1) / (d - 1);
  steps.push(`סדרה הנדסית: כל איבר כפול $q=${fmt(d)}$ מהקודם`);
  steps.push(`האיבר ה-${n}: $a_n=a_1*q^(n-1)=${fmt(a1)}*${paren(d)}^${n - 1}=${fmt(an)}$`);
  steps.push(d === 1 ? `כש-$q=1$ כל האיברים שווים: $S_n=n*a_1=${fmt(S)}$` : `הסכום: $S_n=frac{a_1(q^n-1)}{q-1}=frac{${fmt(a1)}(${paren(d)}^${n}-1)}{${paren(d)}-1}=${fmt(S)}$`);
  if (Math.abs(d) < 1 && d !== 0) steps.push(`$|q|<1$, אז יש גם סכום אינסופי: $S=frac{a_1}{1-q}=${fmt(a1 / (1 - d))}$`);
  steps.push(`האיברים הראשונים: ${Array.from({ length: Math.min(n, 6) }, (_, i) => fmt(a1 * d ** i)).join(", ")}${n > 6 ? ", …" : ""}`);
  return { steps, ans: `a${n} = ${fmt(an)} · S${n} = ${fmt(S)}` };
}
// ---- התפלגות בינומית ----
function C(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
function binomial(ns, ks, ps, mode = "eq") {
  const n = num(ns, "n"), k = num(ks, "k"), p = num(ps, "p");
  if (!Number.isInteger(n) || n < 1 || n > 200) throw new Error("n צריך להיות מספר שלם בין 1 ל-200");
  if (!Number.isInteger(k) || k < 0 || k > n) throw new Error(`k צריך להיות מספר שלם בין 0 ל-${n}`);
  if (!(p >= 0 && p <= 1)) throw new Error("p היא הסתברות – בין 0 ל-1 (למשל 0.3 או 1/6)");
  const P = j => C(n, j) * p ** j * (1 - p) ** (n - j), r4 = v => Math.round(v * 10000) / 10000;
  const steps = [`נוסחת ברנולי: $P(X=k)=C(n,k)*p^k*(1-p)^(n-k)$, עם $n=${n}$, $p=${fmt(p)}$`];
  const one = j => `$P(X=${j})=${C(n, j)}*${fmt(p)}^${j}*${fmt(1 - p)}^${n - j}~${r4(P(j))}$`;
  let tot, js;
  if (mode === "eq") { js = [k]; tot = P(k); steps.push(`$C(${n},${k})=frac{${n}!}{${k}!*${n - k}!}=${C(n, k)}$ – בכמה סדרים אפשר לקבל ${k} הצלחות`); steps.push(one(k)); }
  else {
    js = mode === "ge" ? Array.from({ length: n - k + 1 }, (_, i) => k + i) : Array.from({ length: k + 1 }, (_, i) => i);
    const comp = mode === "ge" ? Array.from({ length: k }, (_, i) => i) : Array.from({ length: n - k }, (_, i) => k + 1 + i);
    if (comp.length < js.length) { // דרך המשלים – פחות חישובים
      steps.push(`קל יותר דרך המשלים: $P(X${mode === "ge" ? ">=" : "<="}${k})=1-P(X${mode === "ge" ? "<" : ">"}${k})$`);
      comp.slice(0, 6).forEach(j => steps.push(one(j))); if (comp.length > 6) steps.push(`…ועוד ${comp.length - 6} איברים`);
      tot = 1 - comp.reduce((s, j) => s + P(j), 0); steps.push(`$1-${r4(1 - tot)}=${r4(tot)}$`);
    } else {
      steps.push(`מחברים את כל האפשרויות: ${js.map(j => `$P(X=${j})$`).join(" + ")}`);
      js.slice(0, 6).forEach(j => steps.push(one(j))); if (js.length > 6) steps.push(`…ועוד ${js.length - 6} איברים`);
      tot = js.reduce((s, j) => s + P(j), 0); steps.push(`ביחד: $~${r4(tot)}$`);
    }
  }
  const lbl = mode === "eq" ? `בדיוק ${k}` : mode === "ge" ? `לפחות ${k}` : `לכל היותר ${k}`;
  const sym = mode === "eq" ? "=" : mode === "ge" ? "≥" : "≤";
  return { steps, ans: `${lbl} הצלחות · P(X${sym}${k}) ≈ ${r4(tot)}`, value: tot };
}
const api = { derivative, sequence, binomial, parsePoly, polyStr };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Tools = api;
})(typeof window !== "undefined" ? window : globalThis);
