// מנוע המחשבון החכם: קורא תרגיל כמו שתלמיד כותב אותו ("3(x-2)=2x+5", "x²-5x+6=0", "2x-7<3"),
// פותר, ומחזיר את השלבים בעברית. החשבון מדויק בשברים (BigInt), כך ש-1/3+1/6 יוצא 1/2 ולא 0.4999.
// הפלט הוא HTML קטן (שברים אחד מעל השני, חזקות, שורשים) שהדף מציג.
(function (root) {
"use strict";
class MathErr extends Error { constructor(m) { super(m); this.user = true; } }
class NotPoly extends Error {}
const MINUS = "−";

// ---------- שברים מדויקים ----------
const babs = a => a < 0n ? -a : a;
const bgcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
class Q {
  constructor(n, d = 1n) {
    if (d === 0n) throw new MathErr("אי אפשר לחלק באפס");
    if (d < 0n) { n = -n; d = -d; }
    const g = bgcd(n, d);
    this.n = g > 1n ? n / g : n; this.d = g > 1n ? d / g : d;
  }
  static int(k) { return new Q(BigInt(k)); }
  static dec(s) { const [i, f = ""] = s.split("."); return new Q(BigInt((i || "0") + f), 10n ** BigInt(f.length)); }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { if (o.n === 0n) throw new MathErr("אי אפשר לחלק באפס"); return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  abs() { return new Q(babs(this.n), this.d); }
  get zero() { return this.n === 0n; }
  get sign() { return this.n > 0n ? 1 : this.n < 0n ? -1 : 0; }
  get isInt() { return this.d === 1n; }
  eq(o) { return this.n === o.n && this.d === o.d; }
  num() { return Number(this.n) / Number(this.d); }
}
const ZERO = Q.int(0), ONE = Q.int(1);

// שורש שלם: n = k²·m (למשל 50 = 5²·2 → 5√2)
function isqrt(n) { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }
function sqParts(n) {
  const r = isqrt(n); if (r * r === n) return { k: r, m: 1n };
  let k = 1n, m = n;
  for (let p = 2n; p * p <= m && p < 200000n; p++) while (m % (p * p) === 0n) { m /= p * p; k *= p; }
  return { k, m };
}
// √q = c·√m (c שבר, m שלם בלי ריבועים)
function sqrtQ(q) { if (q.sign < 0) throw new MathErr("אין שורש למספר שלילי"); const { k, m } = sqParts(q.n * q.d); return { c: new Q(k, q.d), m }; }

// ---------- קריאת התרגיל ----------
const REL = ["=", "<", ">", "≤", "≥", "≠"];
function normalize(s) {
  return String(s || "").toLowerCase()
    .replace(/[×·∙⋅]/g, "*").replace(/[÷:]/g, "/").replace(/[−–—]/g, "-")
    .replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/<=|=</g, "≤").replace(/>=|=>/g, "≥").replace(/!=|=\/=/g, "≠")
    .replace(/(\d),(\d)/g, "$1.$2").replace(/sqrt|שורש/g, "√")
    .replace(/[{\[]/g, "(").replace(/[}\]]/g, ")");
}
function tokenize(src) {
  const s = normalize(src), out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (num) { let raw = num[1]; if (raw.endsWith(".")) raw = raw.slice(0, -1); out.push({ t: "n", raw, q: Q.dec(raw) }); i += num[1].length; continue; }
    const fn = s.slice(i).match(/^(sin|cos|tan|abs)/);
    if (fn) { out.push({ t: "f", f: fn[1] }); i += fn[1].length; continue; }
    if (ch === "x" || ch === "y") { out.push({ t: "v", v: ch }); i++; continue; }
    if (ch === "√") { out.push({ t: "f", f: "√" }); i++; continue; }
    if ("+-*/^()".includes(ch)) { out.push({ t: ch }); i++; continue; }
    if (REL.includes(ch)) { out.push({ t: "rel", r: ch }); i++; continue; }
    if (/[a-z]/.test(ch)) throw new MathErr(`האות "${ch}" לא מוכרת לי. משתמשים ב-x (ואם צריך גם ב-y).`);
    if (/[א-ת]/.test(ch)) throw new MathErr("כותבים רק את התרגיל עצמו, בלי מילים. למשל: 2x+3=11");
    throw new MathErr(`הסימן "${ch}" לא מוכר לי.`);
  }
  return out;
}
function parseTokens(toks) {
  let p = 0;
  const peek = () => toks[p], take = () => toks[p++];
  const startsAtom = t => t && (t.t === "n" || t.t === "v" || t.t === "(" || t.t === "f");
  function expr() {
    let a = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) { const op = take().t; a = { t: op, a, b: term() }; }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      const t = peek();
      if (t && (t.t === "*" || t.t === "/")) { take(); a = { t: t.t, a, b: unary() }; }
      else if (startsAtom(t)) a = { t: "*", a, b: power(), imp: true };
      else return a;
    }
  }
  function unary() {
    const t = peek();
    if (t && t.t === "-") { take(); return { t: "neg", a: unary() }; }
    if (t && t.t === "+") { take(); return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (peek() && peek().t === "^") { take(); if (!peek()) throw new MathErr("חסר מספר אחרי ^ (החזקה)."); return { t: "^", a: base, b: unary() }; }
    return base;
  }
  function atom() {
    const t = take();
    if (!t) throw new MathErr("התרגיל נגמר באמצע. חסר משהו בסוף?");
    if (t.t === "n") return { t: "n", q: t.q, raw: t.raw };
    if (t.t === "v") return { t: "v", v: t.v };
    if (t.t === "(") {
      if (peek() && peek().t === ")") throw new MathErr("יש סוגריים ריקים ().");
      const e = expr();
      if (!peek() || peek().t !== ")") throw new MathErr("חסר סוגר ) – כל ( צריך להיסגר.");
      take(); return { t: "()", a: e };
    }
    if (t.t === "f") {
      if (t.f === "√") return { t: "f", f: "√", a: peek() && peek().t === "(" ? atom() : power() };
      if (!peek() || peek().t !== "(") throw new MathErr(`אחרי ${t.f} צריך סוגריים, למשל ${t.f}(30).`);
      return { t: "f", f: t.f, a: atom() };
    }
    if (t.t === ")") throw new MathErr("יש סוגר ) מיותר.");
    if (t.t === "rel") throw new MathErr("חסר משהו לפני או אחרי הסימן " + t.r);
    throw new MathErr(`הסימן ${t.t} לא במקום. אולי חסר מספר לפניו?`);
  }
  const e = expr();
  if (p < toks.length) { const t = toks[p]; throw new MathErr(t.t === ")" ? "יש סוגר ) מיותר." : "לא הבנתי את סוף התרגיל."); }
  return e;
}
// מפרק "צד = צד" (או אי-שוויון) לשני ביטויים
function parse(src) {
  const toks = tokenize(src);
  if (!toks.length) throw new MathErr("עוד לא כתבת תרגיל.");
  const rels = toks.map((t, i) => t.t === "rel" ? i : -1).filter(i => i >= 0);
  if (rels.length > 1) throw new MathErr("אפשר רק סימן אחד של = (או <, >) בתרגיל.");
  if (!rels.length) return { L: parseTokens(toks), rel: null };
  const i = rels[0], rel = toks[i].r;
  if (rel === "≠") throw new MathErr("את הסימן ≠ אני עוד לא יודע לפתור.");
  if (i === 0) throw new MathErr(`חסר משהו לפני הסימן ${rel}`);
  if (i === toks.length - 1) throw new MathErr(`חסר משהו אחרי הסימן ${rel}`);
  return { L: parseTokens(toks.slice(0, i)), rel, R: parseTokens(toks.slice(i + 1)) };
}
const varsOf = (n, s = new Set()) => { if (!n) return s; if (n.t === "v") s.add(n.v); varsOf(n.a, s); varsOf(n.b, s); return s; };
const hasFunc = n => !!n && (n.t === "f" && n.f !== "√" || hasFunc(n.a) || hasFunc(n.b));

// ---------- פולינומים: מפה "חזקת x,חזקת y" → מקדם ----------
const MAXDEG = 8;
const P = {
  c: q => new Map(q.zero ? [] : [["0,0", q]]),
  v: name => new Map([[name === "x" ? "1,0" : "0,1", ONE]]),
  add(a, b) { const r = new Map(a); for (const [k, q] of b) { const s = (r.get(k) || ZERO).add(q); s.zero ? r.delete(k) : r.set(k, s); } return r; },
  neg: a => new Map([...a].map(([k, q]) => [k, q.neg()])),
  sub: (a, b) => P.add(a, P.neg(b)),
  scale: (a, q) => q.zero ? new Map() : new Map([...a].map(([k, v]) => [k, v.mul(q)])),
  mul(a, b) {
    let r = new Map();
    for (const [k1, q1] of a) for (const [k2, q2] of b) {
      const [x1, y1] = k1.split(",").map(Number), [x2, y2] = k2.split(",").map(Number);
      r = P.add(r, new Map([[`${x1 + x2},${y1 + y2}`, q1.mul(q2)]]));
    }
    return r;
  },
  deg: a => Math.max(0, ...[...a.keys()].map(k => k.split(",").map(Number).reduce((s, x) => s + x, 0))),
  degIn: (a, v) => Math.max(0, ...[...a.keys()].map(k => +k.split(",")[v === "x" ? 0 : 1])),
  isConst: a => [...a.keys()].every(k => k === "0,0"),
  val: a => a.get("0,0") || ZERO,
  co: (a, ex, ey = 0) => a.get(`${ex},${ey}`) || ZERO,
  eq: (a, b) => P.sub(a, b).size === 0,
};
function toPoly(n) {
  switch (n.t) {
    case "n": return P.c(n.q);
    case "v": return P.v(n.v);
    case "()": return toPoly(n.a);
    case "+": return P.add(toPoly(n.a), toPoly(n.b));
    case "-": return P.sub(toPoly(n.a), toPoly(n.b));
    case "neg": return P.neg(toPoly(n.a));
    case "*": { const r = P.mul(toPoly(n.a), toPoly(n.b)); if (P.deg(r) > MAXDEG) throw new MathErr("החזקה גבוהה מדי."); return r; }
    case "/": {
      const d = toPoly(n.b);
      if (!P.isConst(d)) throw new NotPoly("varden");
      return P.scale(toPoly(n.a), ONE.div(P.val(d)));
    }
    case "^": {
      const e = toPoly(n.b), b = toPoly(n.a);
      if (!P.isConst(e)) throw new NotPoly("varexp");
      const k = P.val(e);
      if (!k.isInt) throw new NotPoly("fracexp");
      const kk = Number(k.n);
      if (kk < 0) { if (!P.isConst(b)) throw new NotPoly("negexp"); let r = ONE; for (let i = 0; i < -kk; i++) r = r.div(P.val(b)); return P.c(r); }
      if (kk > MAXDEG) throw new MathErr("החזקה גבוהה מדי.");
      let r = P.c(ONE); for (let i = 0; i < kk; i++) r = P.mul(r, b);
      if (P.deg(r) > MAXDEG) throw new MathErr("החזקה גבוהה מדי.");
      return r;
    }
    case "f": {
      const a = toPoly(n.a);
      if (!P.isConst(a)) throw new NotPoly("func");
      const v = P.val(a);
      if (n.f === "√") { const s = sqrtQ(v); if (s.m !== 1n) throw new NotPoly("irr"); return P.c(s.c); }
      if (n.f === "abs") return P.c(v.abs());
      throw new NotPoly("trig");
    }
  }
  throw new NotPoly("?");
}
// חישוב עשרוני (לגרפים, לסינוס וכו'). זוויות במעלות, כמו בכיתה
const RAD = Math.PI / 180;
function evalF(n, env) {
  switch (n.t) {
    case "n": return n.q.num();
    case "v": return env[n.v];
    case "()": return evalF(n.a, env);
    case "+": return evalF(n.a, env) + evalF(n.b, env);
    case "-": return evalF(n.a, env) - evalF(n.b, env);
    case "neg": return -evalF(n.a, env);
    case "*": return evalF(n.a, env) * evalF(n.b, env);
    case "/": return evalF(n.a, env) / evalF(n.b, env);
    case "^": return Math.pow(evalF(n.a, env), evalF(n.b, env));
    case "f": { const a = evalF(n.a, env); return n.f === "√" ? Math.sqrt(a) : n.f === "abs" ? Math.abs(a) : n.f === "sin" ? Math.sin(a * RAD) : n.f === "cos" ? Math.cos(a * RAD) : Math.tan(a * RAD); }
  }
  return NaN;
}

// ---------- תצוגה ----------
const V = v => `<var>${v}</var>`;
const frac = (a, b) => `<span class="fr"><i>${a}</i><i>${b}</i></span>`;
const sq = m => `√<span class="sq">${m}</span>`;
function qHTML(q, paren) {
  const a = q.abs(), s = a.isInt ? String(a.n) : frac(a.n, a.d);
  return q.sign < 0 ? (paren ? `(${MINUS}${s})` : MINUS + s) : s;
}
function dec(x) {
  if (!isFinite(x)) return "?";
  let r = Math.round(x * 1e4) / 1e4; if (Object.is(r, -0)) r = 0;
  return String(r).replace("-", MINUS);
}
const approx = q => q.isInt ? "" : ` <span class="ap">(≈ ${dec(q.num())})</span>`;
function mono(ex, ey) { const f = (v, e) => e === 0 ? "" : e === 1 ? V(v) : V(v) + `<sup>${e}</sup>`; return f("x", ex) + f("y", ey); }
function polyHTML(p) {
  const terms = [...p].map(([k, q]) => { const [ex, ey] = k.split(",").map(Number); return { ex, ey, q }; })
    .sort((a, b) => (b.ex + b.ey) - (a.ex + a.ey) || b.ex - a.ex);
  if (!terms.length) return "0";
  return terms.map((t, i) => {
    const m = mono(t.ex, t.ey), a = t.q.abs();
    const body = m ? (a.eq(ONE) ? "" : qHTML(a)) + m : qHTML(a);
    return i === 0 ? (t.q.sign < 0 ? MINUS : "") + body : (t.q.sign < 0 ? ` ${MINUS} ` : " + ") + body;
  }).join("");
}
// ערך מהצורה c·√m
function radHTML(c, m) {
  if (m === 1n) return qHTML(c);
  const a = c.abs(), s = c.sign < 0 ? MINUS : "", root = (a.n === 1n ? "" : String(a.n)) + sq(m);
  return s + (a.d === 1n ? root : frac(root, a.d));
}
const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
function astHTML(n, parent = 0) {
  let s, p = PREC[n.t] || 9;
  switch (n.t) {
    case "n": s = n.raw; break;
    case "v": s = V(n.v); break;
    case "()": s = `(${astHTML(n.a)})`; break;
    case "+": s = `${astHTML(n.a, 1)} + ${astHTML(n.b, 1)}`; break;
    case "-": s = `${astHTML(n.a, 1)} ${MINUS} ${astHTML(n.b, 2)}`; break;
    case "*": s = n.imp ? astHTML(n.a, 2) + astHTML(n.b, 2) : `${astHTML(n.a, 2)}·${astHTML(n.b, 3)}`; break;
    case "/": s = frac(astHTML(n.a), astHTML(n.b)); p = 9; break;
    case "neg": s = MINUS + astHTML(n.a, 3); break;
    case "^": s = astHTML(n.a, 5) + `<sup>${astHTML(n.b)}</sup>`; break;
    case "f": s = n.f === "√" ? sq(astHTML(n.a)) : `${n.f}(${astHTML(n.a.t === "()" ? n.a.a : n.a)})`; break;
  }
  return p < parent ? `(${s})` : s;
}
const OPS = { "=": "=", "<": "&lt;", ">": "&gt;", "≤": "≤", "≥": "≥" };
const rel = (a, op, b) => `${a} ${OPS[op]} ${b}`;
const step = (h, m) => ({ h, m });
const txt = h => String(h).replace(/<[^>]+>/g, "").replace(/\s+/g, "");

// ---------- פתרון ----------
const KIND = { calc: "חישוב", simplify: "פישוט ביטוי", linear: "משוואה ממעלה ראשונה", quad: "משוואה ריבועית", ident: "משוואה", ineq1: "אי-שוויון", ineq2: "אי-שוויון ריבועי", isolate: "בידוד y" };
// מה הבנו מהתרגיל (לתצוגה חיה בזמן ההקלדה)
function preview(src) {
  const e = parse(src);
  const html = e.rel ? rel(astHTML(e.L), e.rel, astHTML(e.R)) : astHTML(e.L);
  const vs = new Set([...varsOf(e.L), ...varsOf(e.R)]);
  let kind = "calc";
  try {
    if (!e.rel) kind = vs.size ? "simplify" : "calc";
    else if (vs.size === 2) kind = "isolate";
    else {
      const p = P.sub(toPoly(e.L), toPoly(e.R)), d = P.deg(p);
      kind = e.rel === "=" ? (d === 2 ? "quad" : d === 1 ? "linear" : "ident") : d === 2 ? "ineq2" : "ineq1";
    }
  } catch (err) { if (!(err instanceof NotPoly)) throw err; }
  return { html, kind: KIND[kind] };
}

function solve(src) {
  const e = parse(src);
  const vs = new Set([...varsOf(e.L), ...varsOf(e.R)]);
  if (!e.rel) return vs.size ? simplify(e.L) : calc(e.L);
  if (vs.size === 0) return checkClaim(e);
  if (vs.size === 2) { if (e.rel !== "=") throw new MathErr("אי-שוויון עם x וגם y אני לא פותר. נסו עם x בלבד."); return isolateY(e); }
  const v = [...vs][0];
  let Lp, Rp;
  try { Lp = toPoly(e.L); Rp = toPoly(e.R); }
  catch (err) { if (err instanceof NotPoly) throw new MathErr(notPolyMsg(err.message, v)); throw err; }
  return e.rel === "=" ? equation(e, Lp, Rp, v) : inequality(e, Lp, Rp, v);
}
function notPolyMsg(why, v) {
  if (why === "varden") return `יש ${v} במכנה (מתחת לקו השבר). את זה אני עוד לא יודע לפתור – נסו לכפול במכנה בעצמכם ולהקליד שוב.`;
  if (why === "irr" || why === "func") return "יש כאן שורש או פונקציה של המשתנה. אני פותר משוואות עם " + v + ", " + v + "² וסוגריים.";
  return "את סוג התרגיל הזה אני עוד לא יודע לפתור. אני פותר משוואות ואי-שוויונים עם " + v + " ו-" + v + "².";
}

function calc(L) {
  const steps = [step("התרגיל", astHTML(L))];
  try {
    const q = P.val(toPoly(L));
    let extra = "";
    if (!q.isInt && babs(q.n) > q.d) { const w = q.n / q.d, r = babs(q.n % q.d); extra = ` <span class="ap">= ${w < 0n ? MINUS : ""}${babs(w)} ו-${frac(r, q.d)}</span>`; }
    return { kind: KIND.calc, steps, answer: qHTML(q) + approx(q) + extra };
  } catch (err) {
    if (!(err instanceof NotPoly)) throw err;
    // שורש שלא יוצא שלם: מראים גם בצורה מפושטת (√50 = 5√2)
    if (L.t === "f" && L.f === "√") {
      try { const q = P.val(toPoly(L.a)), s = sqrtQ(q); return { kind: KIND.calc, steps, answer: `${radHTML(s.c, s.m)} <span class="ap">(≈ ${dec(Math.sqrt(q.num()))})</span>`, note: s.c.eq(ONE) ? "" : "הוצאנו מהשורש את הריבוע השלם." }; } catch (e2) { if (!(e2 instanceof NotPoly)) throw e2; }
    }
    const x = evalF(L, {});
    if (!isFinite(x)) throw new MathErr("התוצאה לא מוגדרת (אולי שורש של מספר שלילי או חילוק באפס).");
    return { kind: KIND.calc, steps, answer: `≈ ${dec(x)}`, note: hasFunc(L) ? "sin, cos ו-tan מחושבים במעלות." : "" };
  }
}
function simplify(L) {
  let p;
  try { p = toPoly(L); } catch (err) { if (err instanceof NotPoly) throw new MathErr("את הביטוי הזה אני לא יודע לפשט. נסו ביטוי עם x, חזקות וסוגריים."); throw err; }
  const steps = [step("הביטוי", astHTML(L))];
  steps.push(step("פותחים סוגריים ומכנסים איברים דומים (x עם x, מספרים עם מספרים)", polyHTML(p)));
  return { kind: KIND.simplify, steps, answer: polyHTML(p), note: "רוצים לפתור? מוסיפים = ומה שבצד השני, למשל: = 0" };
}
function checkClaim(e) {
  const a = toPoly(e.L), b = toPoly(e.R), x = P.val(a), y = P.val(b), c = x.sub(y).sign;
  const ok = { "=": c === 0, "<": c < 0, ">": c > 0, "≤": c <= 0, "≥": c >= 0 }[e.rel];
  return { kind: "בדיקה", steps: [step("מחשבים כל צד", rel(qHTML(x), e.rel, qHTML(y)))], answer: ok ? "✓ נכון" : "✗ לא נכון" };
}
// מקדמים לפי חזקה: [c0, c1, c2]
const coefs = (p, v) => { const r = []; for (let i = 0; i <= P.degIn(p, v); i++) r.push(v === "x" ? P.co(p, i, 0) : P.co(p, 0, i)); return r; };
const polyOf = (cs, v) => { let p = new Map(); cs.forEach((q, i) => { if (!q.zero) p = P.add(p, P.scale(i ? new Map([[v === "x" ? `${i},0` : `0,${i}`, ONE]]) : P.c(ONE), q)); }); return p; };
const evalQ = (p, v, val) => coefs(p, v).reduce((s, c, i) => { let t = c; for (let k = 0; k < i; k++) t = t.mul(val); return s.add(t); }, ZERO);
const flip = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };

function simplifiedStep(e, Lp, Rp, op) {
  const before = rel(astHTML(e.L), op, astHTML(e.R)), after = rel(polyHTML(Lp), op, polyHTML(Rp));
  return txt(before) !== txt(after) ? step("פותחים סוגריים ומכנסים איברים דומים בכל צד", after) : null;
}

function equation(e, Lp, Rp, v) {
  const steps = [step("המשוואה", rel(astHTML(e.L), "=", astHTML(e.R)))];
  const s1 = simplifiedStep(e, Lp, Rp, "="); if (s1) steps.push(s1);
  const p = P.sub(Lp, Rp), d = P.degIn(p, v);
  if (d === 0) {
    const c = P.val(p);
    if (c.zero) return { kind: KIND.ident, steps: [...steps, step("שני הצדדים שווים תמיד – זו זהות", rel(polyHTML(Lp), "=", polyHTML(Rp)))], answer: `כל מספר הוא פתרון (כל ${V(v)})` };
    const L0 = P.val(Lp).sub(P.val(Rp));
    return { kind: KIND.ident, steps: [...steps, step(`ה-${V(v)} מתבטל, ונשארה טענה לא נכונה`, rel(qHTML(L0), "=", "0"))], answer: "אין פתרון" };
  }
  if (d === 1) return linear(steps, Lp, Rp, v, e);
  if (d === 2) return quadratic(steps, Lp, Rp, v);
  throw new MathErr(`זו משוואה ממעלה ${d}. אני פותר עד ${V(v)}² (משוואה ריבועית), כמו בכיתה י'.`);
}
// a·v = c → v = c/a
function linear(steps, Lp, Rp, v, e) {
  const L = coefs(Lp, v), R = coefs(Rp, v);
  const a = (L[1] || ZERO).sub(R[1] || ZERO), c = (R[0] || ZERO).sub(L[0] || ZERO);
  const moved = !(R[1] || ZERO).zero || !(L[0] || ZERO).zero;
  if (moved) steps.push(step(`מעבירים את ה-${V(v)} לצד אחד ואת המספרים לצד השני (מי שעובר צד – מחליף סימן)`, rel(polyHTML(polyOf([ZERO, a], v)), "=", qHTML(c))));
  const x = c.div(a);
  if (!a.eq(ONE)) steps.push(step(`מחלקים את שני הצדדים ב-${qHTML(a, true)}`, `${V(v)} = ${frac(qHTML(c), qHTML(a))}${c.abs().eq(x.abs()) && a.abs().eq(ONE) ? "" : " = " + qHTML(x)}`));
  const lv = evalQ(Lp, v, x), rv = evalQ(Rp, v, x);
  return {
    kind: KIND.linear, steps,
    answer: `${V(v)} = ${qHTML(x)}${approx(x)}`,
    check: `מציבים ${V(v)} = ${qHTML(x)}: צד שמאל = ${qHTML(lv)}, צד ימין = ${qHTML(rv)} ${lv.eq(rv) ? "✓" : "✗"}`,
  };
}
// מסדרים לצורה ax²+bx+c=0 עם מקדמים שלמים ופשוטים
function normalizeQuad(steps, p, v, op = "=") {
  let [c, b, a] = coefs(p, v);
  const show = (A, B, C) => rel(polyHTML(polyOf([C, B, A], v)), op, "0");
  // מכנים → כופלים במכנה המשותף
  const lcm = [a, b, c].reduce((m, q) => m * q.d / bgcd(m, q.d), 1n);
  if (lcm > 1n) { const L = new Q(lcm); [a, b, c] = [a, b, c].map(q => q.mul(L)); steps.push(step(`כופלים את כל המשוואה ב-${lcm} כדי להיפטר מהשברים`, show(a, b, c))); }
  // a שלילי → כופלים ב-(−1)
  if (a.sign < 0) { [a, b, c] = [a, b, c].map(q => q.neg()); if (op !== "=") op = flip[op]; steps.push(step(`כופלים ב-(${MINUS}1) כדי ש-a יהיה חיובי${op === "=" ? "" : " (ובאי-שוויון – הופכים את הסימן!)"}`, show(a, b, c))); }
  // גורם משותף → מחלקים
  const g = [a, b, c].reduce((m, q) => bgcd(m, q.n), 0n);
  if (g > 1n) { const G = new Q(g); [a, b, c] = [a, b, c].map(q => q.div(G)); steps.push(step(`מחלקים את כל המשוואה ב-${g} כדי לפשט`, show(a, b, c))); }
  return { a, b, c, op };
}
// השורשים של ax²+bx+c=0 (מקדמים שלמים): [{html, val}] ממוינים
function quadRoots(a, b, c) {
  const D = b.mul(b).sub(Q.int(4).mul(a).mul(c));
  if (D.sign < 0) return { D, roots: [] };
  const A2 = Q.int(2).mul(a);
  if (D.zero) { const r = b.neg().div(A2); return { D, roots: [{ html: qHTML(r), val: r.num(), q: r }] }; }
  const { c: k, m } = sqrtQ(D);
  if (m === 1n) {
    const r1 = b.neg().sub(k).div(A2), r2 = b.neg().add(k).div(A2);
    return { D, roots: [r1, r2].sort((x, y) => x.num() - y.num()).map(r => ({ html: qHTML(r), val: r.num(), q: r })) };
  }
  // (−b ± k√m) / 2a, מצמצמים בגורם משותף
  let B = b.neg().n, K = k.n, A = A2.n;
  const g = bgcd(bgcd(B, K), A); B /= g; K /= g; A /= g;
  const sd = Math.sqrt(Number(m)) * Number(K);
  const one = sgn => {
    const root = (K === 1n ? "" : String(K)) + sq(m);
    const num = B === 0n ? (sgn < 0 ? MINUS : "") + root : `${String(B).replace("-", MINUS)} ${sgn < 0 ? MINUS : "+"} ${root}`;
    return { html: A === 1n ? num : frac(num, A), val: (Number(B) + sgn * sd) / Number(A) };
  };
  return { D, roots: [one(-1), one(1)].sort((x, y) => x.val - y.val), radical: { B, K, m, A } };
}
function quadratic(steps, Lp, Rp, v) {
  const p = P.sub(Lp, Rp);
  if (Rp.size !== 0) steps.push(step("מעבירים הכל לצד אחד, כדי שבצד השני יהיה 0", rel(polyHTML(p), "=", "0")));
  const { a, b, c } = normalizeQuad(steps, p, v);
  const X = V(v), X2 = X + "<sup>2</sup>";
  let roots;
  if (c.zero) {
    // x(ax + b) = 0
    const r = b.neg().div(a);
    steps.push(step(`אין מספר חופשי, אז מוציאים ${X} כגורם משותף`, `${X}(${polyOf([b, a], v).size ? polyHTML(polyOf([b, a], v)) : ""}) = 0`));
    steps.push(step("מכפלה שווה 0 כשאחד הגורמים שווה 0", `${X} = 0 &nbsp;או&nbsp; ${rel(polyHTML(polyOf([b, a], v)), "=", "0")} → ${X} = ${qHTML(r)}`));
    roots = [ZERO, r].sort((x, y) => x.num() - y.num()).map(q => ({ html: qHTML(q), val: q.num(), q }));
  } else if (b.zero) {
    const r = c.neg().div(a);
    steps.push(step(`אין איבר עם ${X} בלבד, אז מבודדים את ${X2}`, `${X2} = ${qHTML(r)}`));
    if (r.sign < 0) return { kind: KIND.quad, steps: [...steps, step("ריבוע של מספר לא יכול לצאת שלילי", "")], answer: "אין פתרון" };
    const s = sqrtQ(r), h = radHTML(s.c, s.m);
    steps.push(step("מוציאים שורש – ויש שתי אפשרויות: חיובי ושלילי", `${X} = ±${h}`));
    const val = Math.sqrt(r.num());
    roots = [{ html: MINUS + h, val: -val, q: s.m === 1n ? s.c.neg() : null }, { html: h, val, q: s.m === 1n ? s.c : null }];
  } else {
    steps.push(step("מזהים את המקדמים", `a = ${qHTML(a)}, &nbsp;b = ${qHTML(b)}, &nbsp;c = ${qHTML(c)}`));
    const R = quadRoots(a, b, c);
    steps.push(step("מחשבים את הדיסקרימיננטה (מה שבתוך השורש)", `Δ = b<sup>2</sup> ${MINUS} 4ac = ${qHTML(b, true)}<sup>2</sup> ${MINUS} 4·${qHTML(a, true)}·${qHTML(c, true)} = ${qHTML(R.D)}`));
    if (R.D.sign < 0) return { kind: KIND.quad, steps: [...steps, step("Δ שלילי – אין שורש למספר שלילי", `Δ = ${qHTML(R.D)} &lt; 0`)], answer: "אין פתרון" };
    if (R.D.zero) {
      steps.push(step("Δ = 0, אז יש פתרון אחד בלבד", `${X} = ${frac(`${MINUS}b`, "2a")} = ${frac(qHTML(b.neg()), qHTML(Q.int(2).mul(a)))} = ${R.roots[0].html}`));
    } else {
      const sd = sqrtQ(R.D);
      steps.push(step("מציבים בנוסחת השורשים", `${X}<sub>1,2</sub> = ${frac(`${MINUS}b ± √Δ`, "2a")} = ${frac(`${qHTML(b.neg())} ± ${sq(qHTML(R.D))}`, qHTML(Q.int(2).mul(a)))}`));
      if (sd.m === 1n) steps.push(step("השורש יוצא שלם", `${sq(qHTML(R.D))} = ${qHTML(sd.c)}`));
      else if (!sd.c.eq(ONE)) steps.push(step("מפשטים את השורש (מוציאים ריבוע שלם)", `${sq(qHTML(R.D))} = ${radHTML(sd.c, sd.m)}`));
    }
    roots = R.roots;
  }
  const ans = roots.length === 1 ? `${V(v)} = ${roots[0].html}` : `${V(v)}<sub>1</sub> = ${roots[0].html} &nbsp;&nbsp; ${V(v)}<sub>2</sub> = ${roots[1].html}`;
  const irr = roots.some(r => !r.q);
  const res = { kind: KIND.quad, steps, answer: ans + (irr || roots.some(r => !r.q.isInt) ? ` <span class="ap">(≈ ${roots.map(r => dec(r.val)).join(", ")})</span>` : "") };
  if (!irr) res.check = roots.map(r => { const lv = evalQ(Lp, v, r.q), rv = evalQ(Rp, v, r.q); return `${V(v)} = ${qHTML(r.q)}: ${qHTML(lv)} = ${qHTML(rv)} ${lv.eq(rv) ? "✓" : "✗"}`; }).join(" &nbsp;|&nbsp; ");
  res.roots = roots.map(r => r.val);
  return res;
}

// ---------- אי-שוויונים ----------
// התשובה כקטעים על ציר המספרים: [{a, b, ia, ib}] (a/b = ∓Infinity לאינסוף)
function inequality(e, Lp, Rp, v) {
  let op = e.rel;
  const steps = [step("אי-השוויון", rel(astHTML(e.L), op, astHTML(e.R)))];
  const s1 = simplifiedStep(e, Lp, Rp, op); if (s1) steps.push(s1);
  const p = P.sub(Lp, Rp), d = P.degIn(p, v), X = V(v);
  const incl = o => o === "≤" || o === "≥";
  if (d === 0) {
    const c = P.val(p).sign, ok = { "<": c < 0, ">": c > 0, "≤": c <= 0, "≥": c >= 0 }[op];
    steps.push(step(`ה-${X} מתבטל, ונשארת טענה ${ok ? "נכונה תמיד" : "שאף פעם לא נכונה"}`, rel(qHTML(P.val(Lp)), op, qHTML(P.val(Rp)))));
    return { kind: KIND.ineq1, steps, answer: ok ? `כל ${X} מתאים` : "אין פתרון", line: { segs: ok ? [{ a: -Infinity, b: Infinity }] : [], pts: [] } };
  }
  if (d === 1) {
    const L = coefs(Lp, v), R = coefs(Rp, v);
    const a = (L[1] || ZERO).sub(R[1] || ZERO), c = (R[0] || ZERO).sub(L[0] || ZERO);
    if (!(R[1] || ZERO).zero || !(L[0] || ZERO).zero) steps.push(step(`מעבירים את ה-${X} לצד אחד ואת המספרים לצד השני (מי שעובר צד – מחליף סימן)`, rel(polyHTML(polyOf([ZERO, a], v)), op, qHTML(c))));
    const x = c.div(a);
    if (a.sign < 0) { op = flip[op]; steps.push(step(`⚠️ מחלקים ב-${qHTML(a, true)} – מספר שלילי, ולכן הופכים את כיוון הסימן!`, rel(X, op, qHTML(x)))); }
    else if (!a.eq(ONE)) steps.push(step(`מחלקים את שני הצדדים ב-${qHTML(a)} (מספר חיובי – הסימן לא משתנה)`, rel(X, op, qHTML(x))));
    const big = op === ">" || op === "≥", xv = x.num();
    return {
      kind: KIND.ineq1, steps, answer: rel(X, op, qHTML(x)) + approx(x),
      line: { segs: [big ? { a: xv, b: Infinity, ia: incl(op) } : { a: -Infinity, b: xv, ib: incl(op) }], pts: [{ x: xv, html: qHTML(x), fill: incl(op) }] },
    };
  }
  if (d !== 2) throw new MathErr(`זה אי-שוויון ממעלה ${d}. אני פותר עד ${X}².`);
  if (Rp.size !== 0) steps.push(step("מעבירים הכל לצד אחד", rel(polyHTML(p), op, "0")));
  const n = normalizeQuad(steps, p, v, op); op = n.op;
  const { a, b, c } = n, R = quadRoots(a, b, c), rs = R.roots;
  steps.push(step(`מוצאים איפה הביטוי שווה 0 (פותרים את המשוואה)`, rs.length ? rs.map((r, i) => `${X}${rs.length > 1 ? `<sub>${i + 1}</sub>` : ""} = ${r.html}`).join(" &nbsp; ") + (rs.some(r => !r.q || !r.q.isInt) ? ` <span class="ap">(≈ ${rs.map(r => dec(r.val)).join(", ")})</span>` : "") : `Δ = ${qHTML(R.D)} &lt; 0 → אין נקודות אפס`));
  steps.push(step("a חיובי – הפרבולה \"מחייכת\" (פתוחה למעלה): שלילית בין השורשים וחיובית מחוצה להם", ""));
  const want = op === ">" || op === "≥" ? "pos" : "neg", inc = incl(op);
  let answer, segs = [], pts = rs.map(r => ({ x: r.val, html: r.html, fill: inc }));
  if (!rs.length) { const all = want === "pos"; answer = all ? `כל ${X} מתאים` : "אין פתרון"; if (all) segs = [{ a: -Infinity, b: Infinity }]; }
  else if (rs.length === 1) {
    const r = rs[0];
    if (want === "pos") { if (inc) { answer = `כל ${X} מתאים`; segs = [{ a: -Infinity, b: Infinity }]; } else { answer = `כל ${X} חוץ מ-${X} = ${r.html}`; segs = [{ a: -Infinity, b: r.val }, { a: r.val, b: Infinity }]; pts[0].fill = false; } }
    else if (inc) { answer = `${X} = ${r.html}`; segs = []; pts[0].fill = true; }
    else { answer = "אין פתרון"; pts = []; }
  } else {
    const [r1, r2] = rs, lt = inc ? "≤" : "<";
    if (want === "neg") { answer = `${r1.html} ${OPS[lt]} ${X} ${OPS[lt]} ${r2.html}`; segs = [{ a: r1.val, b: r2.val, ia: inc, ib: inc }]; }
    else { answer = `${X} ${OPS[lt]} ${r1.html} &nbsp;או&nbsp; ${X} ${OPS[flip[lt]]} ${r2.html}`; segs = [{ a: -Infinity, b: r1.val, ib: inc }, { a: r2.val, b: Infinity, ia: inc }]; }
  }
  return { kind: KIND.ineq2, steps, answer, line: { segs, pts } };
}

// ---------- y = ... (משוואה עם x ו-y) ----------
function isolateY(e) {
  let Lp, Rp;
  try { Lp = toPoly(e.L); Rp = toPoly(e.R); } catch (err) { if (err instanceof NotPoly) throw new MathErr(notPolyMsg(err.message, "x")); throw err; }
  const p = P.sub(Lp, Rp), steps = [step("המשוואה", rel(astHTML(e.L), "=", astHTML(e.R)))];
  if (P.degIn(p, "y") !== 1 || [...p.keys()].some(k => { const [ex, ey] = k.split(",").map(Number); return ey === 1 && ex > 0; }))
    throw new MathErr("יש כאן x וגם y. לשתי משוואות עם x ו-y – בחרו \"מערכת משוואות\". למשוואה אחת אני יודע רק לבודד את y.");
  const cy = P.co(p, 0, 1), rest = P.sub(p, P.scale(P.v("y"), cy));
  const yExpr = P.scale(rest, ONE.div(cy).neg());
  steps.push(step("משאירים את y לבד בצד אחד, ומעבירים את כל השאר לצד השני", rel(polyHTML(P.scale(P.v("y"), cy)), "=", polyHTML(P.neg(rest)))));
  if (!cy.eq(ONE)) steps.push(step(`מחלקים ב-${qHTML(cy, true)}`, `${V("y")} = ${polyHTML(yExpr)}`));
  const res = { kind: KIND.isolate, steps, answer: `${V("y")} = ${polyHTML(yExpr)}` };
  if (P.deg(yExpr) <= 1) { const m = P.co(yExpr, 1), n = P.val(yExpr); res.note = `זה ישר: שיפוע m = ${qHTML(m)}, ונחתך עם ציר y ב-(0, ${qHTML(n)}).`; }
  return res;
}

// ---------- מערכת של שתי משוואות (x ו-y) ----------
function system(s1, s2) {
  const eqs = [s1, s2].map((s, i) => {
    const e = parse(s);
    if (e.rel !== "=") throw new MathErr(`במשוואה ${i ? "השנייה" : "הראשונה"} חסר =`);
    let p; try { p = P.sub(toPoly(e.L), toPoly(e.R)); } catch (err) { if (err instanceof NotPoly) throw new MathErr("כל משוואה צריכה להיות עם x, y ומספרים בלבד."); throw err; }
    if (P.deg(p) > 1) throw new MathErr(`במשוואה ${i ? "השנייה" : "הראשונה"} יש חזקה או מכפלה של משתנים. אני פותר מערכת של ישרים (x ו-y בלי חזקות).`);
    return { e, a: P.co(p, 1, 0), b: P.co(p, 0, 1), c: P.val(p).neg() }; // ax + by = c
  });
  const steps = [step("המערכת", eqs.map(q => rel(astHTML(q.e.L), "=", astHTML(q.e.R))).join("<br>"))];
  const form = q => rel(polyHTML(P.add(P.scale(P.v("x"), q.a), P.scale(P.v("y"), q.b))), "=", qHTML(q.c));
  steps.push(step("מסדרים כל משוואה בצורה ax + by = c", eqs.map(form).join("<br>")));
  if (eqs.some(q => q.a.zero && q.b.zero)) throw new MathErr("באחת המשוואות x ו-y מתבטלים. בדקו שהקלדתם נכון.");
  // בוחרים מה לבודד: עדיף משתנה עם מקדם 1 או −1
  const opts = [];
  eqs.forEach((q, i) => [["y", q.b], ["x", q.a]].forEach(([u, co]) => { if (!co.zero) opts.push({ i, u, co, score: co.abs().eq(ONE) ? 0 : 1 }); }));
  opts.sort((x, y) => x.score - y.score);
  const { i, u } = opts[0], w = u === "y" ? "x" : "y", q = eqs[i], o = eqs[1 - i];
  const au = u === "y" ? q.b : q.a, aw = u === "y" ? q.a : q.b;
  // u = c/au − (aw/au)·w
  const k0 = q.c.div(au), k1 = aw.div(au).neg();
  const expr = P.add(P.c(k0), P.scale(P.v(w), k1));
  steps.push(step(`מבודדים את ${V(u)} מהמשוואה ה${i ? "שנייה" : "ראשונה"}`, `${V(u)} = ${polyHTML(expr)}`));
  const ou = u === "y" ? o.b : o.a, ow = u === "y" ? o.a : o.b;
  // המשוואה השנייה כמו שהיא (x קודם, אחר כך y), ובמקום המשתנה שבודד – הביטוי בסוגריים
  const sub = [["x", o.a], ["y", o.b]].filter(([, co]) => !co.zero).map(([vn, co], k) => {
    const sign = co.sign < 0 ? (k ? ` ${MINUS} ` : MINUS) : (k ? " + " : ""), num = co.abs().eq(ONE) ? "" : qHTML(co.abs());
    return sign + num + (vn === u ? `(${polyHTML(expr)})` : V(vn));
  }).join("");
  steps.push(step(`מציבים את ${V(u)} במשוואה ה${i ? "ראשונה" : "שנייה"}`, rel(sub, "=", qHTML(o.c))));
  const A = ou.mul(k1).add(ow), C = o.c.sub(ou.mul(k0));
  if (A.zero) {
    const same = C.zero;
    return { kind: "מערכת משוואות", steps: [...steps, step(`ה-${V(w)} מתבטל`, rel("0", "=", qHTML(C)))], answer: same ? "אינסוף פתרונות – שתי המשוואות הן אותו ישר" : "אין פתרון – הישרים מקבילים ולא נפגשים", lines: eqs };
  }
  steps.push(step("פותחים סוגריים ופותרים משוואה עם נעלם אחד", `${rel(polyHTML(P.scale(P.v(w), A)), "=", qHTML(C))} → ${V(w)} = ${qHTML(C.div(A))}`));
  const wv = C.div(A), uv = k0.add(k1.mul(wv));
  steps.push(step(`מציבים ${V(w)} = ${qHTML(wv)} בחזרה כדי למצוא את ${V(u)}`, `${V(u)} = ${polyHTML(expr).replace(new RegExp(`(\\d|</span>)<var>${w}</var>`), `$1·(${qHTML(wv)})`).replace(`<var>${w}</var>`, `(${qHTML(wv)})`)} = ${qHTML(uv)}`));
  const xv = u === "x" ? uv : wv, yv = u === "y" ? uv : wv;
  const chk = eqs.map(t => { const l = t.a.mul(xv).add(t.b.mul(yv)); return `${qHTML(l)} = ${qHTML(t.c)} ${l.eq(t.c) ? "✓" : "✗"}`; }).join(" &nbsp;|&nbsp; ");
  return { kind: "מערכת משוואות", steps, answer: `${V("x")} = ${qHTML(xv)}, &nbsp; ${V("y")} = ${qHTML(yv)}${approx(xv)}`, check: `מציבים בשתי המשוואות: ${chk}`, point: { x: xv.num(), y: yv.num() }, lines: eqs };
}

// ---------- גרף של פונקציה ----------
function func(src) {
  const s = String(src || "").replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, "");
  const e = parse(s);
  if (e.rel) throw new MathErr("כותבים רק את מה שאחרי y =, למשל: x² − 4x + 3");
  if (varsOf(e.L).has("y")) throw new MathErr("בפונקציה משתמשים רק ב-x.");
  const f = x => evalF(e.L, { x }), steps = [], pts = [];
  const res = { kind: "פונקציה", html: `${V("y")} = ${astHTML(e.L)}`, f, steps, pts };
  let p = null;
  try { p = toPoly(e.L); } catch (err) { if (!(err instanceof NotPoly)) throw err; }
  const d = p ? P.degIn(p, "x") : -1;
  if (d === 0) { const c = P.val(p); steps.push(step("פונקציה קבועה – ישר אופקי", `${V("y")} = ${qHTML(c)}`)); pts.push({ x: 0, y: c.num(), label: `(0, ${qHTML(c)})` }); }
  else if (d === 1) {
    const m = P.co(p, 1), n = P.val(p);
    res.kind = "פונקציה קווית";
    steps.push(step(`השיפוע (המספר שליד x). ${m.sign > 0 ? "חיובי – הפונקציה עולה ↗" : "שלילי – הפונקציה יורדת ↘"}`, `m = ${qHTML(m)}`));
    steps.push(step("חיתוך עם ציר y: מציבים x = 0", `(0, ${qHTML(n)})`));
    const x0 = n.neg().div(m);
    steps.push(step("חיתוך עם ציר x: מציבים y = 0", `${rel(polyHTML(p), "=", "0")} → ${V("x")} = ${qHTML(x0)} → (${qHTML(x0)}, 0)`));
    pts.push({ x: 0, y: n.num(), label: `(0, ${qHTML(n)})` }); if (!x0.zero) pts.push({ x: x0.num(), y: 0, label: `(${qHTML(x0)}, 0)` });
  } else if (d === 2) {
    const [c, b, a] = coefs(p, "x");
    res.kind = "פונקציה ריבועית (פרבולה)";
    steps.push(step(a.sign > 0 ? "a חיובי – פרבולה \"מחייכת\" ∪ עם נקודת מינימום" : "a שלילי – פרבולה \"עצובה\" ∩ עם נקודת מקסימום", `a = ${qHTML(a)}`));
    const xv = b.neg().div(Q.int(2).mul(a)), yv = evalQ(p, "x", xv);
    steps.push(step("הקודקוד: x של הקודקוד הוא −b חלקי 2a, ואז מציבים בפונקציה", `${V("x")} = ${frac(`${MINUS}b`, "2a")} = ${frac(qHTML(b.neg()), qHTML(Q.int(2).mul(a)))} = ${qHTML(xv)}, &nbsp; ${V("y")} = ${qHTML(yv)} → (${qHTML(xv)}, ${qHTML(yv)})`));
    steps.push(step("חיתוך עם ציר y: מציבים x = 0", `(0, ${qHTML(c)})`));
    const R = quadRoots(a, b, c);
    steps.push(step(R.roots.length ? "חיתוך עם ציר x: פותרים y = 0" : "חיתוך עם ציר x: אין – הפרבולה לא חותכת את ציר x", R.roots.length ? R.roots.map(r => `(${r.html}, 0)`).join(" &nbsp; ") + (R.roots.some(r => !r.q || !r.q.isInt) ? ` <span class="ap">(≈ ${R.roots.map(r => dec(r.val)).join(", ")})</span>` : "") : `Δ = ${qHTML(R.D)} &lt; 0`));
    steps.push(step(a.sign > 0 ? "תחומי עלייה וירידה: לפני הקודקוד יורדת ↘, אחריו עולה ↗" : "תחומי עלייה וירידה: לפני הקודקוד עולה ↗, אחריו יורדת ↘", a.sign > 0 ? `↘ ${V("x")} &lt; ${qHTML(xv)} &nbsp;&nbsp; ↗ ${V("x")} &gt; ${qHTML(xv)}` : `↗ ${V("x")} &lt; ${qHTML(xv)} &nbsp;&nbsp; ↘ ${V("x")} &gt; ${qHTML(xv)}`));
    pts.push({ x: xv.num(), y: yv.num(), label: `קודקוד (${qHTML(xv)}, ${qHTML(yv)})`, vertex: true }, { x: 0, y: c.num(), label: `(0, ${qHTML(c)})` });
    R.roots.forEach(r => pts.push({ x: r.val, y: 0, label: `(${r.q ? qHTML(r.q) : dec(r.val)}, 0)` }));
  } else res.note = d > 2 ? "ניתוח מלא יש לפונקציה קווית וריבועית. כאן מוצג רק הגרף." : "כאן מוצג רק הגרף.";
  return res;
}

// ---------- ישר דרך שתי נקודות ----------
function constOf(s, name) {
  if (!String(s).trim()) throw new MathErr(`חסר ${name}`);
  const e = parse(s);
  if (e.rel || varsOf(e.L).size) throw new MathErr(`ב-${name} כותבים מספר בלבד`);
  try { return P.val(toPoly(e.L)); } catch (err) { if (err instanceof NotPoly) throw new MathErr(`ב-${name} כותבים מספר או שבר`); throw err; }
}
function line2(x1s, y1s, x2s, y2s) {
  const x1 = constOf(x1s, "x של A"), y1 = constOf(y1s, "y של A"), x2 = constOf(x2s, "x של B"), y2 = constOf(y2s, "y של B");
  const A = `A(${qHTML(x1)}, ${qHTML(y1)})`, B = `B(${qHTML(x2)}, ${qHTML(y2)})`, steps = [step("הנקודות", `${A} &nbsp; ${B}`)];
  if (x1.eq(x2) && y1.eq(y2)) throw new MathErr("שתי הנקודות זהות – דרכן עוברים אינסוף ישרים.");
  const dx = x2.sub(x1), dy = y2.sub(y1);
  const res = { kind: "ישר דרך שתי נקודות", steps, A: { x: x1.num(), y: y1.num() }, B: { x: x2.num(), y: y2.num() } };
  if (dx.zero) {
    steps.push(step("ה-x של שתי הנקודות שווה – ישר אנכי (אין לו שיפוע)", `${V("x")} = ${qHTML(x1)}`));
    res.answer = `${V("x")} = ${qHTML(x1)}`; res.vertical = x1.num();
  } else {
    const m = dy.div(dx), n = y1.sub(m.mul(x1));
    steps.push(step("השיפוע: ההפרש ב-y חלקי ההפרש ב-x", `m = ${frac(`${V("y")}<sub>2</sub> ${MINUS} ${V("y")}<sub>1</sub>`, `${V("x")}<sub>2</sub> ${MINUS} ${V("x")}<sub>1</sub>`)} = ${frac(`${qHTML(y2)} ${MINUS} ${qHTML(y1, true)}`, `${qHTML(x2)} ${MINUS} ${qHTML(x1, true)}`)} = ${frac(qHTML(dy), qHTML(dx))} = ${qHTML(m)}`));
    steps.push(step("משוואת הישר: y − y₁ = m(x − x₁), ומסדרים", `${V("y")} ${MINUS} ${qHTML(y1, true)} = ${qHTML(m, true)}(${V("x")} ${MINUS} ${qHTML(x1, true)}) → ${V("y")} = ${polyHTML(P.add(P.scale(P.v("x"), m), P.c(n)))}`));
    res.answer = `${V("y")} = ${polyHTML(P.add(P.scale(P.v("x"), m), P.c(n)))}`; res.m = m.num(); res.n = n.num();
  }
  const d2 = dx.mul(dx).add(dy.mul(dy)), s = sqrtQ(d2);
  steps.push(step("המרחק בין הנקודות (פיתגורס)", `d = ${sq(`(${qHTML(dx)})<sup>2</sup> + (${qHTML(dy)})<sup>2</sup>`)} = ${sq(qHTML(d2))} = ${radHTML(s.c, s.m)}${s.m === 1n ? "" : ` ≈ ${dec(Math.sqrt(d2.num()))}`}`));
  const mx = x1.add(x2).div(Q.int(2)), my = y1.add(y2).div(Q.int(2));
  steps.push(step("אמצע הקטע: ממוצע של ה-x וממוצע של ה-y", `M(${frac(`${qHTML(x1)} + ${qHTML(x2, true)}`, 2)}, ${frac(`${qHTML(y1)} + ${qHTML(y2, true)}`, 2)}) = M(${qHTML(mx)}, ${qHTML(my)})`));
  res.extra = [`אורך הקטע: ${radHTML(s.c, s.m)}${s.m === 1n ? "" : ` ≈ ${dec(Math.sqrt(d2.num()))}`}`, `אמצע: (${qHTML(mx)}, ${qHTML(my)})`];
  res.M = { x: mx.num(), y: my.num() };
  return res;
}

// ---------- משולש ישר-זווית (זווית ישרה ב-C) ----------
// a = הניצב מול α, b = הניצב ליד α, c = היתר. זוויות במעלות
function triangle(inp) {
  const r2 = x => Math.round(x * 100) / 100, D = x => dec(r2(x));
  const val = k => { const s = String(inp[k] ?? "").trim(); if (!s) return null; const q = constOf(s, { a: "a", b: "b", c: "c", alpha: "α", beta: "β" }[k]).num(); if (!(q > 0)) throw new MathErr("כל הצלעות והזוויות צריכות להיות חיוביות."); return q; };
  let a = val("a"), b = val("b"), c = val("c"), al = val("alpha"), be = val("beta");
  const steps = [], sin = x => Math.sin(x * RAD), cos = x => Math.cos(x * RAD), tan = x => Math.tan(x * RAD), deg = x => x / RAD;
  if (al != null && al >= 90 || be != null && be >= 90) throw new MathErr("במשולש ישר-זווית שתי הזוויות האחרות קטנות מ-90°.");
  if (al != null && be != null && Math.abs(al + be - 90) > 0.01) throw new MathErr("α + β צריך לצאת 90°. מספיק למלא אחת מהן.");
  if (al == null && be != null) { al = 90 - be; steps.push(step("סכום הזוויות במשולש 180°, אז", `α = 90° ${MINUS} ${D(be)}° = ${D(al)}°`)); }
  const sides = [a, b, c].filter(x => x != null).length;
  if (!sides) throw new MathErr("צריך לפחות צלע אחת (ועוד צלע או זווית).");
  if (sides === 1 && al == null) throw new MathErr("צריך עוד נתון: צלע נוספת או זווית.");
  if (c != null && (a != null && a >= c || b != null && b >= c)) throw new MathErr("היתר (c) הוא הצלע הכי ארוכה – הוא צריך להיות גדול מכל ניצב.");
  if (sides === 1) {
    if (c != null) { a = c * sin(al); b = c * cos(al); steps.push(step("sin α = מול חלקי יתר", `a = c · sin α = ${D(c)} · sin ${D(al)}° = ${D(a)}`), step("cos α = ליד חלקי יתר", `b = c · cos α = ${D(c)} · cos ${D(al)}° = ${D(b)}`)); }
    else if (a != null) { c = a / sin(al); b = a / tan(al); steps.push(step("sin α = מול חלקי יתר", `c = ${frac("a", "sin α")} = ${frac(D(a), `sin ${D(al)}°`)} = ${D(c)}`), step("tan α = מול חלקי ליד", `b = ${frac("a", "tan α")} = ${frac(D(a), `tan ${D(al)}°`)} = ${D(b)}`)); }
    else { c = b / cos(al); a = b * tan(al); steps.push(step("cos α = ליד חלקי יתר", `c = ${frac("b", "cos α")} = ${frac(D(b), `cos ${D(al)}°`)} = ${D(c)}`), step("tan α = מול חלקי ליד", `a = b · tan α = ${D(b)} · tan ${D(al)}° = ${D(a)}`)); }
  } else {
    if (c == null) { c = Math.hypot(a, b); steps.push(step("פיתגורס: a² + b² = c²", `c = ${sq(`${D(a)}<sup>2</sup> + ${D(b)}<sup>2</sup>`)} = ${D(c)}`)); }
    else if (a == null) { a = Math.sqrt(c * c - b * b); steps.push(step("פיתגורס: a² = c² − b²", `a = ${sq(`${D(c)}<sup>2</sup> ${MINUS} ${D(b)}<sup>2</sup>`)} = ${D(a)}`)); }
    else if (b == null) { b = Math.sqrt(c * c - a * a); steps.push(step("פיתגורס: b² = c² − a²", `b = ${sq(`${D(c)}<sup>2</sup> ${MINUS} ${D(a)}<sup>2</sup>`)} = ${D(b)}`)); }
    else if (Math.abs(a * a + b * b - c * c) > 0.01 * c * c) throw new MathErr(`שלוש הצלעות לא מתאימות למשולש ישר-זווית: ${D(a)}² + ${D(b)}² ≠ ${D(c)}²`);
    if (al == null) { al = deg(Math.atan(a / b)); steps.push(step("tan α = מול חלקי ליד, ומחשבים את הזווית (tan⁻¹ במחשבון)", `tan α = ${frac(D(a), D(b))} → α = ${D(al)}°`)); }
  }
  be = 90 - al;
  steps.push(step("והזווית השנייה", `β = 90° ${MINUS} α = ${D(be)}°`));
  return { kind: "משולש ישר-זווית", steps, vals: { a: r2(a), b: r2(b), c: r2(c), alpha: r2(al), beta: r2(be) }, area: r2(a * b / 2), perim: r2(a + b + c) };
}

const api = { solve, preview, system, func, line2, triangle, parse, MathErr, dec, _: { Q, P, toPoly, sqParts } };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Calc = api;
})(this);
