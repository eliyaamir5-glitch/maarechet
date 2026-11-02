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
// ===================== 📝 תבניות: "יש לי תרגיל כזה" – ממלאים מספרים ומקבלים פתרון =====================
// view: התבנית, {k} = שדה מספר, {k:op1|op2} = בחירה. run(v) מחזיר {solve:"…"} / {sys:[…]} / {func:"…"} (למחשבון שכבר יודע לפתור עם שלבים) או {steps, ans}
const R2 = v => Math.round(v * 1e4) / 1e4, D = Math.PI / 180;
const sx = (a, v = "x") => (a === 1 ? v : a === -1 ? "-" + v : fmt(a) + v);
const sgn = a => (a < 0 ? "-" + fmt(-a) : "+" + fmt(a));
const TPL = {
  order: { view: "חשב: {e:expr}", run: v => ({ solve: v.e }) },
  fractions: { view: "{a}/{b} {op:+|−|×|÷} {c}/{d}", run: v => ({ solve: `(${fmt(v.a)}/${fmt(v.b)})${{ "+": "+", "−": "-", "×": "*", "÷": "/" }[v.op]}(${fmt(v.c)}/${fmt(v.d)})` }) },
  powers: { view: "פשט/חשב: {e:expr}", run: v => ({ solve: v.e }) },
  roots: { view: "√{a}", run: v => ({ solve: `sqrt(${v.a})` }) },
  expand: { view: "({a}x + {b})({c}x + {d})", run: v => ({ solve: `(${sx(v.a)}${sgn(v.b)})(${sx(v.c)}${sgn(v.d)})` }) },
  special: { view: "({a}x + {b})²", run: v => ({ solve: `(${sx(v.a)}${sgn(v.b)})^2` }) },
  algfrac: { view: "פשט: {e:expr}", run: v => ({ solve: v.e }) },
  linear: { view: "{a}x + {b} = {c}x + {d}", run: v => ({ solve: `${sx(v.a)}${sgn(v.b)}=${sx(v.c)}${sgn(v.d)}` }) },
  fraceq: { view: "x/{a} + {b} = {c}", run: v => ({ solve: `x/${v.a}${sgn(v.b)}=${fmt(v.c)}` }) },
  lineq: { view: "{a}x + {b} {op:<|>|≤|≥} {c}", run: v => ({ solve: `${sx(v.a)}${sgn(v.b)}${v.op}${fmt(v.c)}` }) },
  system: { view: "{a}x + {b}y = {c} | {d}x + {e}y = {f}", run: v => ({ sys: [`${sx(v.a)}${v.b < 0 ? "-" : "+"}${sx(Math.abs(v.b), "y")}=${fmt(v.c)}`, `${sx(v.d)}${v.e < 0 ? "-" : "+"}${sx(Math.abs(v.e), "y")}=${fmt(v.f)}`] }) },
  quad: { view: "{a}x² + {b}x + {c} = 0", run: v => ({ solve: `${sx(v.a, "x^2")}${sgn(v.b)}x${sgn(v.c)}=0` }) },
  quadineq: { view: "{a}x² + {b}x + {c} {op:<|>|≤|≥} 0", run: v => ({ solve: `${sx(v.a, "x^2")}${sgn(v.b)}x${sgn(v.c)}${v.op}0` }) },
  factor: { view: "{a}x² + {b}x + {c}", run: v => {
    const D2 = v.b * v.b - 4 * v.a * v.c; const st = [`מחפשים שורשים של $${sx(v.a, "x^2")}${sgn(v.b)}x${sgn(v.c)}=0$`, `$Delta=b^2-4ac=${fmt(D2)}$`];
    if (D2 < 0) return { steps: [...st, "$Delta<0$ – אין שורשים, אי אפשר לפרק לגורמים ממשיים"], ans: "אין פירוק" };
    const r1 = (-v.b + Math.sqrt(D2)) / (2 * v.a), r2 = (-v.b - Math.sqrt(D2)) / (2 * v.a), f = r => `(x${sgn(-R2(r))})`;
    return { steps: [...st, `$x_1=${fmt(R2(r1))}$, $x_2=${fmt(R2(r2))}$`, `$a(x-x_1)(x-x_2)$:`, `$${v.a === 1 ? "" : fmt(v.a)}${f(r1)}${f(r2)}$`], ans: `${v.a === 1 ? "" : fmt(v.a)}${f(r1)}${f(r2)}` }; } },
  biquad: { view: "x⁴ + {b}x² + {c} = 0", run: v => { const D2 = v.b * v.b - 4 * v.c, st = ["הצבה $t=x^2$: $t^2" + sgn(v.b) + "t" + sgn(v.c) + "=0$"]; if (D2 < 0) return { steps: [...st, "$Delta<0$ – אין פתרון"], ans: "אין פתרון" };
    const ts = [...new Set([(-v.b + Math.sqrt(D2)) / 2, (-v.b - Math.sqrt(D2)) / 2].map(R2))], xs = []; for (const t of ts) if (t > 0) xs.push(R2(Math.sqrt(t)), R2(-Math.sqrt(t))); else if (t === 0) xs.push(0);
    return { steps: [...st, `$t=${ts.map(fmt).join(", ")}$`, "$x=+-sqrt(t)$ (רק ל-t שאינו שלילי)"], ans: xs.length ? "x = " + [...new Set(xs)].map(fmt).join(", ") : "אין פתרון" }; } },
  radeq: { view: "√(x + {a}) = {b}", run: v => v.b < 0 ? { steps: ["שורש לא יכול להיות שלילי"], ans: "אין פתרון" } : { steps: [`מעלים בריבוע: $x${sgn(v.a)}=${fmt(v.b * v.b)}$`, `$x=${fmt(v.b * v.b - v.a)}$`, "בדיקה: מציבים – מתאים ✓"], ans: `x = ${fmt(v.b * v.b - v.a)}` } },
  percent: { view: "{p}% מתוך {n}", run: v => ({ steps: [`$frac{${fmt(v.p)}}{100}*${fmt(v.n)}$`], ans: fmt(R2(v.p * v.n / 100)) }) },
  ratio: { view: "מחלקים {n} ביחס {a} : {b}", run: v => { const k = v.n / (v.a + v.b); return { steps: [`סך החלקים: ${fmt(v.a + v.b)}`, `חלק אחד: $${fmt(v.n)}:${fmt(v.a + v.b)}=${fmt(R2(k))}$`, `$${fmt(v.a)}*${fmt(R2(k))}=${fmt(R2(v.a * k))}$, $${fmt(v.b)}*${fmt(R2(k))}=${fmt(R2(v.b * k))}$`], ans: `${fmt(R2(v.a * k))} ו-${fmt(R2(v.b * k))}` }; } },
  linefn: { view: "A({x1},{y1})  B({x2},{y2})", run: v => { if (v.x1 === v.x2) return { steps: ["ה-x שווה – ישר אנכי"], ans: `x = ${fmt(v.x1)}` }; const m = (v.y2 - v.y1) / (v.x2 - v.x1), b = v.y1 - m * v.x1;
    return { steps: [`$m=frac{${fmt(v.y2)}-${fmt(v.y1)}}{${fmt(v.x2)}-${fmt(v.x1)}}=${fmt(R2(m))}$`, `$b=y-mx=${fmt(v.y1)}-${fmt(R2(m))}*${fmt(v.x1)}=${fmt(R2(b))}$`], ans: `שיפוע ${fmt(R2(m))} · y = ${fmt(R2(m))}x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(R2(b)))}` }; } },
  parabola: { view: "y = {a}x² + {b}x + {c}", run: v => ({ func: `${sx(v.a, "x^2")}${sgn(v.b)}x${sgn(v.c)}` }) },
  pyth: { view: "{mode:שני ניצבים|יתר וניצב}: {a} , {b}", run: v => v.mode === "שני ניצבים" ? { steps: [`$c^2=${fmt(v.a)}^2+${fmt(v.b)}^2=${fmt(v.a * v.a + v.b * v.b)}$`], ans: `יתר = ${fmt(R2(Math.hypot(v.a, v.b)))}` }
    : (Math.max(v.a, v.b) ** 2 - Math.min(v.a, v.b) ** 2 >= 0 ? { steps: [`היתר הוא הארוך: ${fmt(Math.max(v.a, v.b))}`, `$b^2=${fmt(Math.max(v.a, v.b))}^2-${fmt(Math.min(v.a, v.b))}^2=${fmt(Math.max(v.a, v.b) ** 2 - Math.min(v.a, v.b) ** 2)}$`], ans: `ניצב = ${fmt(R2(Math.sqrt(Math.max(v.a, v.b) ** 2 - Math.min(v.a, v.b) ** 2)))}` } : { steps: [], ans: "?" }) },
  areas: { view: "{s:מלבן|משולש|טרפז|עיגול}: {a} , {b} , {h}", hint: "מלבן: אורך, רוחב · משולש: בסיס, גובה · טרפז: בסיס, בסיס, גובה · עיגול: רדיוס", run: v => {
    if (v.s === "מלבן") return { steps: [`$${fmt(v.a)}*${fmt(v.b)}$`, `היקף: $2(${fmt(v.a)}+${fmt(v.b)})=${fmt(2 * (v.a + v.b))}$`], ans: `שטח ${fmt(R2(v.a * v.b))}` };
    if (v.s === "משולש") return { steps: [`$frac{${fmt(v.a)}*${fmt(v.b)}}{2}$`], ans: `שטח ${fmt(R2(v.a * v.b / 2))}` };
    if (v.s === "טרפז") return { steps: [`$frac{(${fmt(v.a)}+${fmt(v.b)})*${fmt(v.h)}}{2}$`], ans: `שטח ${fmt(R2((v.a + v.b) * v.h / 2))}` };
    return { steps: [`$S=pi r^2=pi*${fmt(v.a)}^2$`, `היקף: $2pi r=${fmt(R2(2 * Math.PI * v.a))}$`], ans: `שטח ≈ ${fmt(R2(Math.PI * v.a * v.a))}` }; } },
  angles: { view: "מצולע עם {n} צלעות", run: v => ({ steps: [`סכום הזוויות: $(${fmt(v.n)}-2)*180=${fmt((v.n - 2) * 180)}$`, `במצולע משוכלל כל זווית: $frac{${fmt((v.n - 2) * 180)}}{${fmt(v.n)}}$`], ans: `סכום ${fmt((v.n - 2) * 180)}° · זווית ${fmt(R2((v.n - 2) * 180 / v.n))}°` }) },
  similar: { view: "יחס דמיון {k} · צלע/שטח בקטן: {x} · {w:צלע|שטח}", run: v => v.w === "צלע" ? { steps: [`$${fmt(v.x)}*${fmt(v.k)}$`], ans: `צלע בגדול = ${fmt(R2(v.x * v.k))}` } : { steps: [`יחס שטחים = $${fmt(v.k)}^2=${fmt(v.k * v.k)}$`, `$${fmt(v.x)}*${fmt(v.k * v.k)}$`], ans: `שטח בגדול = ${fmt(R2(v.x * v.k * v.k))}` } },
  circle: { view: "זווית מרכזית {a}°", run: v => ({ steps: ["זווית היקפית = חצי מהמרכזית שנשענת על אותה קשת"], ans: `זווית היקפית = ${fmt(R2(v.a / 2))}°` }) },
  analytic: { view: "A({x1},{y1})  B({x2},{y2})", run: v => { const d = Math.hypot(v.x2 - v.x1, v.y2 - v.y1); return { steps: [`$d=sqrt((${fmt(v.x2)}-${fmt(v.x1)})^2+(${fmt(v.y2)}-${fmt(v.y1)})^2)=sqrt(${fmt(R2(d * d))})$`, `אמצע: $(frac{${fmt(v.x1)}+${fmt(v.x2)}}{2}, frac{${fmt(v.y1)}+${fmt(v.y2)}}{2})$`], ans: `מרחק ${fmt(R2(d))} · אמצע (${fmt((v.x1 + v.x2) / 2)}, ${fmt((v.y1 + v.y2) / 2)})` }; } },
  trigright: { view: "זווית {a}° , יתר {c}", run: v => ({ steps: [`ניצב מול: $${fmt(v.c)}*sin ${fmt(v.a)}$`, `ניצב ליד: $${fmt(v.c)}*cos ${fmt(v.a)}$`], ans: `מול ≈ ${fmt(R2(v.c * Math.sin(v.a * D)))} · ליד ≈ ${fmt(R2(v.c * Math.cos(v.a * D)))}` }) },
  sinlaw: { view: "a = {a} , α = {A}° , β = {B}°", run: v => ({ steps: [`$frac{a}{sin alpha}=frac{b}{sin beta}$`, `$b=frac{${fmt(v.a)}*sin ${fmt(v.B)}}{sin ${fmt(v.A)}}$`, `γ = 180 − α − β = ${fmt(180 - v.A - v.B)}°`], ans: `b ≈ ${fmt(R2(v.a * Math.sin(v.B * D) / Math.sin(v.A * D)))}` }) },
  coslaw: { view: "a = {a} , b = {b} , γ = {C}°", run: v => { const c = Math.sqrt(v.a * v.a + v.b * v.b - 2 * v.a * v.b * Math.cos(v.C * D)); return { steps: [`$c^2=${fmt(v.a)}^2+${fmt(v.b)}^2-2*${fmt(v.a)}*${fmt(v.b)}*cos ${fmt(v.C)}=${fmt(R2(c * c))}$`], ans: `c ≈ ${fmt(R2(c))}` }; } },
  trigarea: { view: "a = {a} , b = {b} , γ = {C}°", run: v => ({ steps: [`$S=frac{1}{2}ab sin gamma=frac{1}{2}*${fmt(v.a)}*${fmt(v.b)}*sin ${fmt(v.C)}$`], ans: `S ≈ ${fmt(R2(v.a * v.b * Math.sin(v.C * D) / 2))}` }) },
  trigid: { view: "{f:sin|cos} x = {v}  (0°–360°)", run: v => { if (Math.abs(v.v) > 1) return { steps: ["sin ו-cos תמיד בין 1- ל-1"], ans: "אין פתרון" };
    const b = v.f === "sin" ? Math.asin(v.v) / D : Math.acos(v.v) / D, xs = v.f === "sin" ? [b, 180 - b] : [b, 360 - b], n = [...new Set(xs.map(x => R2(((x % 360) + 360) % 360)))];
    return { steps: [`$x=${v.f}^(-1)(${fmt(v.v)})=${fmt(R2(b))}$°`, v.f === "sin" ? "$sin x=sin(180-x)$" : "$cos x=cos(360-x)$"], ans: "x = " + n.map(x => fmt(x) + "°").join(", ") }; } },
  arith: { view: "a₁ = {a} , d = {d} , n = {n}", run: v => sequence("a", v.a, v.d, v.n) },
  geom: { view: "a₁ = {a} , q = {q} , n = {n}", run: v => sequence("g", v.a, v.q, v.n) },
  expeq: { view: "{b}^x = {c}", run: v => (v.b > 0 && v.b !== 1 && v.c > 0 ? { steps: [`$x=log_${fmt(v.b)}(${fmt(v.c)})=frac{log ${fmt(v.c)}}{log ${fmt(v.b)}}$`], ans: `x ≈ ${fmt(R2(Math.log(v.c) / Math.log(v.b)))}` } : { steps: ["בסיס חיובי ושונה מ-1, ואגף ימין חיובי"], ans: "אין פתרון" }) },
  log: { view: "log של {a} בבסיס {b}", run: v => (v.a > 0 && v.b > 0 && v.b !== 1 ? { steps: [`$log_${fmt(v.b)}(${fmt(v.a)})=frac{ln ${fmt(v.a)}}{ln ${fmt(v.b)}}$`], ans: fmt(R2(Math.log(v.a) / Math.log(v.b))) } : { steps: ["לוגריתם רק למספר חיובי, בבסיס חיובי ≠ 1"], ans: "לא מוגדר" }) },
  growth: { view: "{P} {d:גדל|יורד} ב-{p}% כל תקופה, אחרי {t} תקופות", run: v => { const f = 1 + (v.d === "גדל" ? 1 : -1) * v.p / 100; return { steps: [`$${fmt(v.P)}*${fmt(f)}^${fmt(v.t)}$`], ans: `≈ ${fmt(R2(v.P * f ** v.t))}` }; } },
  deriv: { view: "f(x) = {e:poly}  ·  בנקודה x = {x0:opt}", run: v => derivative(v.e, v.x0) },
  tangent: { view: "f(x) = {e:poly}  ·  בנקודה x = {x0}", run: v => derivative(v.e, v.x0) },
  study: { view: "f(x) = {e:poly}", run: v => derivative(v.e, "") },
  extreme: { view: "f(x) = {e:poly}", run: v => derivative(v.e, "") },
  integral: { view: "∫ מ-{a} עד {b} של {e:poly}", run: v => { const c = parsePoly(v.e), F = {}; for (const [d, k] of Object.entries(c)) F[+d + 1] = k / (+d + 1); const Fv = x => val(F, x), r = Fv(v.b) - Fv(v.a);
    return { steps: [`פונקציה קדומה: $F(x)=${polyStr(F)}$`, `$F(${fmt(v.b)})-F(${fmt(v.a)})=${fmt(R2(Fv(v.b)))}-${fmt(R2(Fv(v.a)))}$`], ans: fmt(R2(r)) }; } },
  prob: { view: "{k} מקרים מתאימים מתוך {n}", run: v => ({ steps: [`$P=frac{${fmt(v.k)}}{${fmt(v.n)}}$`], ans: `${fmt(R2(v.k / v.n))} (${fmt(R2(100 * v.k / v.n))}%)` }) },
  tree: { view: "{r} אדומים , {b} כחולים · מוציאים 2 {w:בלי החזרה|עם החזרה}", run: v => { const n = v.r + v.b, wr = v.w === "בלי החזרה", rr = wr ? v.r * (v.r - 1) / (n * (n - 1)) : (v.r / n) ** 2, diff = wr ? 2 * v.r * v.b / (n * (n - 1)) : 2 * v.r * v.b / (n * n);
    return { steps: [`שניהם אדומים: $frac{${fmt(v.r)}}{${fmt(n)}}*frac{${fmt(wr ? v.r - 1 : v.r)}}{${fmt(wr ? n - 1 : n)}}$`, "צבעים שונים: שני ענפים (אדום-כחול + כחול-אדום)"], ans: `שניהם אדומים ≈ ${fmt(R2(rr))} · שונים ≈ ${fmt(R2(diff))}` }; } },
  binom: { view: "n = {n} , p = {p} , {m:בדיוק|לפחות|לכל היותר} k = {k}", run: v => binomial(v.n, v.k, v.p, { "בדיוק": "eq", "לפחות": "ge", "לכל היותר": "le" }[v.m]) },
  stats: { view: "המספרים: {e:list}", run: v => { const a = String(v.e).split(/[,\s]+/).map(Number).filter(x => isFinite(x)); if (!a.length) throw new Error("כתוב מספרים מופרדים בפסיק");
    const s2 = a.slice().sort((x, y) => x - y), n = a.length, mean = a.reduce((x, y) => x + y, 0) / n, med = n % 2 ? s2[(n - 1) / 2] : (s2[n / 2 - 1] + s2[n / 2]) / 2;
    const cnt = {}; for (const x of a) cnt[x] = (cnt[x] || 0) + 1; const mx = Math.max(...Object.values(cnt)), modes = Object.keys(cnt).filter(k => cnt[k] === mx), sd = Math.sqrt(a.reduce((t, x) => t + (x - mean) ** 2, 0) / n);
    return { steps: [`מסודר: ${s2.join(", ")}`, `ממוצע: $frac{${fmt(a.reduce((x, y) => x + y, 0))}}{${n}}$`], ans: `ממוצע ${fmt(R2(mean))} · חציון ${fmt(med)} · שכיח ${mx > 1 ? modes.join(", ") : "אין"} · ס"ת ${fmt(R2(sd))}` }; } },
  normal: { view: "x = {x} , ממוצע μ = {m} , סטיית תקן σ = {s}", run: v => { const z = (v.x - v.m) / v.s, Phi = t => { const k = 1 / (1 + 0.2316419 * Math.abs(t)), d = 0.3989423 * Math.exp(-t * t / 2), p = d * k * (0.3193815 + k * (-0.3565638 + k * (1.781478 + k * (-1.821256 + k * 1.330274)))); return t >= 0 ? 1 - p : p; };
    return { steps: [`$z=frac{x-mu}{sigma}=frac{${fmt(v.x)}-${fmt(v.m)}}{${fmt(v.s)}}$`], ans: `z = ${fmt(R2(z))} · מתחת ל-x: ≈ ${fmt(R2(100 * Phi(z)))}%` }; } },
};
const api = { derivative, sequence, binomial, parsePoly, polyStr, TPL };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Tools = api;
})(typeof window !== "undefined" ? window : globalThis);
