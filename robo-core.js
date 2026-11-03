// 🤖 "הרובוט שלי" – הלוגיקה: אביזרים, נדירות, תיבות, רצף כניסות יומי, חנות וברגים.
// בלי ממשק (את זה עושה robo.js) – כדי שאפשר לבדוק הכל ב-Node (scripts/test-robo.js).
// הכל נשמר בטלפון בלבד (localStorage "robo"). רק אביזרי "אולטרה אגדי" נבדקים מול השרת (כמות מוגבלת לכל הישיבה).
(function (root) {
  // ---- דרגות נדירות (כמו בבראול סטארס) ----
  // dup = כמה ברגים מקבלים על אביזר שכבר יש לך · price = מחיר בחנות (רק עד אפי)
  const RAR = {
    c: { n: "רגיל", col: "#a3b1c2", dup: 5, price: 40, o: 0 },
    r: { n: "נדיר", col: "#2ecc71", dup: 12, price: 90, o: 1 },
    s: { n: "סופר נדיר", col: "#3b82f6", dup: 25, price: 200, o: 2 },
    e: { n: "אפי", col: "#a855f7", dup: 60, price: 450, o: 3 },
    m: { n: "מיתי", col: "#ef4444", dup: 150, o: 4 },
    l: { n: "אגדי", col: "#facc15", dup: 400, o: 5 },
    u: { n: "אולטרה אגדי", col: "#ffd700", dup: 1000, o: 6 },
  };
  const RK = ["c", "r", "s", "e", "m", "l", "u"];

  // ---- האביזרים ----
  // cat: skin חליפה/צבע · hat כובע · eyes משקפיים/עיניים · held ביד · aura הילה · theme עיצוב לאפליקציה · page עיצוב לעמוד
  // x = לא יוצא בתיבות (רק מרצף / מקצוע) · cap = כמה יש בכל הישיבה (נבדק בשרת)
  const CATS = { skin: "חליפות", hat: "כובעים", eyes: "משקפיים", held: "ביד", aura: "הילות", theme: "עיצובים לאפליקציה", page: "עיצובים לעמוד" };
  const I = [
    // חליפות
    ["skin:classic", "skin", "קלאסי", "c", { free: 1 }], ["skin:mint", "skin", "מנטה", "c"], ["skin:sky", "skin", "תכלת", "c"], ["skin:pink", "skin", "ורוד", "c"],
    ["skin:orange", "skin", "כתום", "c"], ["skin:lemon", "skin", "לימון", "c"], ["skin:coal", "skin", "פחם", "c"],
    ["skin:silver", "skin", "כסף מטאלי", "r"], ["skin:camo", "skin", "הסוואה", "r"], ["skin:candy", "skin", "סוכרייה", "r"],
    ["skin:neon", "skin", "ניאון", "s"], ["skin:ice", "skin", "קרח", "s"],
    ["skin:ninja", "skin", "נינג'ה", "e"], ["skin:lava", "skin", "לבה", "e"], ["skin:galaxy", "skin", "גלקסיה", "e"],
    ["skin:space", "skin", "חליפת חלל", "m"], ["skin:fire", "skin", "חליפת אש", "m"], ["skin:rainbow", "skin", "קשת בענן", "m"],
    ["skin:knight", "skin", "שריון אבירים", "l"], ["skin:holo", "skin", "הולוגרמה", "l"],
    ["skin:diamond", "skin", "חליפת יהלומים", "u", { cap: 5 }], ["skin:gold", "skin", "חליפת זהב טהור", "u", { cap: 3 }],
    // כובעים
    ["hat:cap", "hat", "מצחייה", "c"], ["hat:kippah", "hat", "כיפה סרוגה", "c"], ["hat:beanie", "hat", "כובע צמר", "c"], ["hat:party", "hat", "כובע מסיבה", "c"],
    ["hat:grad", "hat", "כובע סיום", "r"], ["hat:chef", "hat", "כובע שף", "r"], ["hat:pirate", "hat", "כובע פיראטים", "r"],
    ["hat:propeller", "hat", "כובע פרופלור", "s"], ["hat:viking", "hat", "קסדת ויקינג", "s"], ["hat:tophat", "hat", "מגבעת", "s"],
    ["hat:crown", "hat", "כתר", "e"], ["hat:wizard", "hat", "כובע קוסם", "e"],
    ["hat:flame", "hat", "שיער של אש", "m"], ["hat:halo", "hat", "הילת מלאך", "m"],
    ["hat:diamondcrown", "hat", "כתר יהלומים", "l"],
    ["hat:streak", "hat", "כתר הרצף 🔥", "e", { x: 1, how: "רצף של 30 ימים" }],
    // משקפיים ועיניים
    ["eyes:nerd", "eyes", "משקפי חנון", "c"], ["eyes:round", "eyes", "משקפיים עגולים", "c"],
    ["eyes:sun", "eyes", "משקפי שמש", "r"], ["eyes:heart", "eyes", "עיני לב", "r"], ["eyes:star", "eyes", "עיני כוכבים", "r"],
    ["eyes:3d", "eyes", "משקפי תלת-ממד", "s"], ["eyes:ski", "eyes", "משקפי סקי", "s"],
    ["eyes:laser", "eyes", "ויזור לייזר", "e"], ["eyes:vr", "eyes", "משקפי VR", "m"], ["eyes:rainbow", "eyes", "עיני קשת", "l"],
    // ביד
    ["held:ball", "held", "כדורגל ⚽", "c", { em: "⚽" }], ["held:basket", "held", "כדורסל 🏀", "c", { em: "🏀" }], ["held:pizza", "held", "פיצה 🍕", "c", { em: "🍕" }], ["held:book", "held", "ספרים 📚", "c", { em: "📚" }],
    ["held:guitar", "held", "גיטרה 🎸", "r", { em: "🎸" }], ["held:game", "held", "שלט 🎮", "r", { em: "🎮" }], ["held:icecream", "held", "גלידה 🍦", "r", { em: "🍦" }], ["held:balloon", "held", "בלון 🎈", "r", { em: "🎈" }],
    ["held:wand", "held", "שרביט קסמים 🪄", "s", { em: "🪄" }], ["held:bolt", "held", "ברק ⚡", "s", { em: "⚡" }],
    ["held:trophy", "held", "גביע 🏆", "e", { em: "🏆" }], ["held:planet", "held", "כוכב לכת 🪐", "m", { em: "🪐" }], ["held:gem", "held", "יהלום 💎", "l", { em: "💎" }],
    ["held:medal", "held", "מדליית מקצוע 🥇", "e", { em: "🥇", x: 1, how: "רצף של 100 שיעורים במקצוע" }],
    // הילות
    ["aura:bubbles", "aura", "בועות", "r"], ["aura:bolts", "aura", "ברקים", "s"], ["aura:flames", "aura", "להבות", "e"], ["aura:stars", "aura", "כוכבים מסתובבים", "m"], ["aura:rays", "aura", "קרני זהב", "l"],
    ["aura:streak", "aura", "הילת 100 הימים", "l", { x: 1, how: "רצף של 100 ימים" }],
    // עיצובים לכל האפליקציה (נכנסים לבחירת הצבע בפרופיל)
    ["theme:neon", "theme", "ניאון", "s", { grad: "linear-gradient(135deg,#0f172a 0%,#06b6d4 55%,#d946ef 100%)" }],
    ["theme:candy", "theme", "סוכרייה", "s", { grad: "linear-gradient(135deg,#f472b6 0%,#c084fc 50%,#38bdf8 100%)" }],
    ["theme:galaxy", "theme", "גלקסיה", "e", { grad: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 50%,#db2777 100%)" }],
    ["theme:lava", "theme", "לבה", "e", { grad: "linear-gradient(135deg,#1c1917 0%,#b91c1c 50%,#f97316 100%)" }],
    ["theme:aurora", "theme", "זוהר צפוני", "m", { grad: "linear-gradient(135deg,#022c22 0%,#059669 40%,#6366f1 75%,#ec4899 100%)" }],
    ["theme:gold", "theme", "זהב", "l", { grad: "linear-gradient(135deg,#78350f 0%,#d97706 40%,#facc15 70%,#a16207 100%)" }],
    // עיצוב לעמוד אחד (הכותרת של אותו עמוד)
    ["page:absences:ocean", "page", "נוכחות – אוקיינוס", "r", { pg: "absences", grad: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#22d3ee 100%)" }],
    ["page:phones:retro", "page", "ספר טלפונים – רטרו", "r", { pg: "phones", grad: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#facc15 100%)" }],
    ["page:cards:candy", "page", "כרטיסיות – ממתקים", "s", { pg: "cards", grad: "linear-gradient(135deg,#db2777 0%,#f472b6 45%,#a78bfa 100%)" }],
    ["page:calc:galaxy", "page", "מחשבון – גלקסיה", "e", { pg: "calc", grad: "linear-gradient(135deg,#0f0a2e 0%,#4c1d95 50%,#0ea5e9 100%)", x: 1, how: "רצף של 14 ימים" }],
    ["page:calc:matrix", "page", "מחשבון – מטריקס", "e", { pg: "calc", grad: "linear-gradient(135deg,#020617 0%,#14532d 50%,#22c55e 100%)" }],
    ["page:index:fire", "page", "עמוד הבית – בוער", "m", { pg: "index", grad: "linear-gradient(135deg,#450a0a 0%,#dc2626 45%,#f59e0b 100%)" }],
  ];
  const ITEMS = {}; I.forEach(([id, cat, n, r, o]) => { ITEMS[id] = Object.assign({ id, cat, n, r }, o || {}); });
  const LIST = Object.values(ITEMS);
  const DROP = r => LIST.filter(x => x.r === r && !x.x && !x.free);

  // ---- תיבות: כמה פרסים בכל תיבה, וסיכוי לכל דרגה (באחוזים, לכל פרס) ----
  const BOX = {
    box: { n: "תיבה", em: "📦", rolls: 1, kind: { item: 57, bolts: 40, box: 3 }, odds: { c: 58, r: 26, s: 11, e: 4, m: 0.85, l: 0.14, u: 0.01 }, bolts: [8, 20], price: 60, col: "#38bdf8" },
    big: { n: "תיבה גדולה", em: "🎁", rolls: 3, kind: { item: 65, bolts: 30, box: 5 }, odds: { c: 35, r: 32, s: 20, e: 9, m: 3.2, l: 0.7, u: 0.1 }, bolts: [15, 40], price: 180, col: "#a855f7" },
    mega: { n: "תיבת מגה", em: "💠", rolls: 6, kind: { item: 74, bolts: 20, box: 6 }, odds: { c: 10, r: 30, s: 30, e: 20, m: 7.5, l: 2.2, u: 0.3 }, bolts: [30, 80], price: 520, col: "#f43f5e" },
  };
  const EXTRA = { box: "box", big: "box", mega: "big" }; // תיבה בתוך תיבה

  // ---- תאריכים (שעון ישראל) ----
  const ymd = t => { const p = {}; for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t))) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}`; };
  const tOf = d => Date.parse(d + "T12:00:00Z"), add = (d, n) => new Date(tOf(d) + n * 864e5).toISOString().slice(0, 10), dow = d => new Date(tOf(d)).getUTCDay();
  // ימים שלא שוברים רצף: שבת ויום טוב (בישיבה אין טלפונים)
  function restDay(d) {
    if (dow(d) === 6) return true;
    const H = typeof HolidaysCore !== "undefined" ? HolidaysCore : root.HolidaysCore; if (!H) return false;
    return H.list(add(d, -8), 10).some(h => (h.key === "rosh" && (d === h.start || d === h.end)) || (h.key === "pesach" && (d === h.start || d === h.end)) || (["kippur", "sukkot", "simchat", "shavuot"].includes(h.key) && d === h.start));
  }
  // כמה ימי חול "חובה" עברו בלי כניסה בין שני תאריכים (לא כולל אותם)
  function missed(a, b) { let n = 0; for (let d = add(a, 1), i = 0; d < b && i < 400; d = add(d, 1), i++) if (!restDay(d)) n++; return n; }

  // ---- מצב ----
  const fresh = () => ({ v: 1, bolts: 0, own: { "skin:classic": 1 }, eq: { skin: "skin:classic" }, st: { n: 0, last: "", best: 0 }, brk: null, boxes: [], mile: {}, news: [], got: 0 });
  function norm(s) {
    const f = fresh(); if (!s || typeof s !== "object") return f;
    const o = Object.assign(f, s); o.own = Object.assign({ "skin:classic": 1 }, s.own || {}); o.eq = Object.assign({ skin: "skin:classic" }, s.eq || {});
    o.st = Object.assign({ n: 0, last: "", best: 0 }, s.st || {}); o.boxes = Array.isArray(s.boxes) ? s.boxes.filter(b => BOX[b]).slice(0, 99) : [];
    o.bolts = Math.max(0, Math.floor(+s.bolts || 0)); o.mile = s.mile && typeof s.mile === "object" ? s.mile : {}; o.news = Array.isArray(s.news) ? s.news.filter(id => ITEMS[id]) : [];
    for (const k of Object.keys(o.eq)) if (!ITEMS[o.eq[k]] || !o.own[o.eq[k]]) delete o.eq[k];
    if (!o.eq.skin) o.eq.skin = "skin:classic";
    return o;
  }

  // ---- הגרלות ----
  function pickW(w, rnd) { const tot = Object.values(w).reduce((a, b) => a + b, 0); let x = rnd() * tot; for (const [k, v] of Object.entries(w)) { if ((x -= v) < 0) return k; } return Object.keys(w)[0]; }
  // אביזר מדרגה מסוימת: 70% שיהיה חדש (אם יש כזה) – כמו בבראול
  function pickItem(S, r, rnd) {
    const all = DROP(r); if (!all.length) return null;
    const nw = all.filter(x => !S.own[x.id]);
    const pool = nw.length && rnd() < 0.7 ? nw : all;
    return pool[Math.floor(rnd() * pool.length)].id;
  }
  // פותחים תיבה: רשימת פרסים (עוד לא נכנסים למצב – grant עושה את זה). אולטרה אגדי מסומן need:"claim" (שרת)
  function roll(S, type, rnd = Math.random) {
    const B = BOX[type], out = [];
    for (let i = 0; i < B.rolls; i++) {
      const k = pickW(B.kind, rnd);
      if (k === "bolts") out.push({ t: "bolts", n: Math.round(B.bolts[0] + rnd() * (B.bolts[1] - B.bolts[0])) });
      else if (k === "box") out.push({ t: "box", box: EXTRA[type] });
      else {
        let r = pickW(B.odds, rnd), id = pickItem(S, r, rnd);
        while (!id && r !== "c") { r = RK[RK.indexOf(r) - 1]; id = pickItem(S, r, rnd); }
        out.push({ t: "item", id, r, ...(r === "u" ? { need: "claim" } : {}) });
      }
    }
    // הכי נדיר בסוף (מתח!)
    const rank = p => p.t === "item" ? RAR[p.r].o + 2 : p.t === "box" ? 1.5 : 0;
    return out.sort((a, b) => rank(a) - rank(b));
  }
  // הגרלה מדרגה מובטחת (פרסי רצף גדולים)
  const guaranteed = (S, r, rnd = Math.random) => ({ t: "item", id: pickItem(S, r, rnd), r });

  // מכניסים פרס למצב. מחזיר מה קרה בפועל (אביזר כפול → ברגים)
  function grant(S, p) {
    if (p.t === "bolts") { S.bolts += p.n; return p; }
    if (p.t === "box") { S.boxes.push(p.box); return p; }
    if (p.t === "item") {
      if (!ITEMS[p.id]) return { t: "bolts", n: 0 };
      if (S.own[p.id]) { const n = RAR[ITEMS[p.id].r].dup; S.bolts += n; return Object.assign({}, p, { dup: n }); }
      S.own[p.id] = Date.now(); S.news.push(p.id); S.got++; return p;
    }
    return p;
  }

  // ---- רצף כניסות: מתנה כל יום, ככל שהרצף ארוך יותר – יותר שווה ----
  const LADDER = {
    1: [{ t: "box", box: "box" }], 2: [{ t: "bolts", n: 30 }], 3: [{ t: "box", box: "box" }], 4: [{ t: "bolts", n: 40 }], 5: [{ t: "box", box: "big" }],
    7: [{ t: "box", box: "big" }, { t: "item", id: "theme:neon" }], 10: [{ t: "box", box: "mega" }], 14: [{ t: "box", box: "big" }, { t: "item", id: "page:calc:galaxy" }],
    21: [{ t: "box", box: "mega" }], 30: [{ t: "box", box: "mega" }, { t: "item", id: "hat:streak" }], 50: [{ t: "box", box: "mega" }, { t: "guar", r: "l" }],
    75: [{ t: "box", box: "mega" }, { t: "box", box: "mega" }], 100: [{ t: "item", id: "aura:streak" }, { t: "box", box: "mega" }, { t: "guar", r: "l" }],
    150: [{ t: "box", box: "mega" }, { t: "guar", r: "l" }], 200: [{ t: "box", box: "mega" }, { t: "box", box: "mega" }, { t: "guar", r: "l" }],
  };
  function dayGift(n) {
    if (LADDER[n]) return LADDER[n];
    if (n > 60 && n % 10 === 0) return [{ t: "box", box: "mega" }];
    if (n % 5 === 0) return [{ t: "box", box: "big" }];
    if (n % 2 === 1) return [{ t: "box", box: n > 30 ? "big" : "box" }];
    return [{ t: "bolts", n: Math.min(150, 20 + n * 3) }];
  }
  // מחיר שמירת רצף שנשבר (בברגים) – ככל שהרצף ארוך יותר, יקר יותר
  const saveCost = n => Math.min(400, 30 + n * 4);
  // נכנסים לאפליקציה: פעם ביום (הפתיחה הראשונה). מחזיר null אם כבר נספר היום
  function checkIn(S, now = Date.now()) {
    const today = ymd(now);
    if (S.st.last === today) return null;
    let broken = null;
    if (!S.st.last || S.st.n <= 0) S.st.n = 1;
    else if (S.st.last > today) return null; // שעון לא תקין
    else if (missed(S.st.last, today) === 0) S.st.n += 1;
    else { broken = { n: S.st.n, ymd: today }; S.brk = broken; S.st.n = 1; }
    S.st.last = today; S.st.best = Math.max(S.st.best || 0, S.st.n);
    return { n: S.st.n, gift: dayGift(S.st.n), broken };
  }
  // שמירת הרצף (רק ביום שבו נשבר): משלמים ברגים, הרצף חוזר ונמשך (+1)
  function saveStreak(S, now = Date.now()) {
    const b = S.brk; if (!b || b.ymd !== ymd(now)) return { ok: false, error: "none" };
    const cost = saveCost(b.n); if (S.bolts < cost) return { ok: false, error: "bolts", cost };
    S.bolts -= cost; S.st.n = b.n + 1; S.st.best = Math.max(S.st.best, S.st.n); S.brk = null;
    return { ok: true, n: S.st.n, cost, gift: dayGift(S.st.n) };
  }
  // ---- רצף במקצוע (שיעורים ברצף בלי חיסור) → תיבות ----
  function subjectGift(m) { return m >= 100 ? (m === 100 ? [{ t: "box", box: "mega" }, { t: "item", id: "held:medal" }] : m % 50 === 0 ? [{ t: "box", box: "mega" }] : []) : m >= 50 ? (m === 50 ? [{ t: "box", box: "mega" }] : []) : m >= 30 ? (m % 10 === 0 ? [{ t: "box", box: "big" }] : []) : m >= 10 && m % 10 === 0 ? [{ t: "box", box: "box" }] : []; }
  function subjectMile(S, subj, m) {
    const k = String(subj).slice(0, 40); if ((S.mile[k] || 0) >= m) return null;
    S.mile[k] = m; const g = subjectGift(m); return g.length ? g : null;
  }

  // ---- חנות ----
  // מבצע יומי: אביזר אחד שמתחלף כל יום (לפי התאריך והמכשיר), עד אפי
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function deals(S, dev, now = Date.now()) {
    const d = ymd(now), pool = LIST.filter(x => !x.x && !x.free && RAR[x.r].price && !S.own[x.id]);
    if (!pool.length) return [];
    const out = [], seen = new Set();
    for (let i = 0; i < 6 && out.length < 2; i++) { const it = pool[hash(d + "|" + dev + "|" + i) % pool.length]; if (!seen.has(it.id)) { seen.add(it.id); out.push({ id: it.id, price: RAR[it.r].price }); } }
    return out;
  }
  function buy(S, what, dev, now = Date.now()) {
    if (BOX[what]) { const p = BOX[what].price; if (S.bolts < p) return { ok: false, error: "bolts" }; S.bolts -= p; S.boxes.push(what); return { ok: true, box: what }; }
    const d = deals(S, dev, now).find(x => x.id === what); if (!d) return { ok: false, error: "gone" };
    if (S.bolts < d.price) return { ok: false, error: "bolts" };
    S.bolts -= d.price; grant(S, { t: "item", id: what }); return { ok: true, id: what };
  }
  function equip(S, id) {
    const it = ITEMS[id]; if (!it || !S.own[id]) return false;
    if (it.cat === "theme" || it.cat === "page") return true; // עיצובים – נבחרים במקום אחר
    if (S.eq[it.cat] === id && it.cat !== "skin") delete S.eq[it.cat]; else S.eq[it.cat] = id;
    return true;
  }
  // כמה אוספים: X מתוך Y (בלי עיצובים בלעדיים לרצף)
  const progress = S => ({ have: LIST.filter(x => S.own[x.id]).length, all: LIST.length });
  // האביזר הכי נדיר שיש לך
  const best = S => LIST.filter(x => S.own[x.id]).sort((a, b) => RAR[b.r].o - RAR[a.r].o)[0];

  const api = { RAR, RK, CATS, ITEMS, LIST, BOX, LADDER, ymd, add, dow, restDay, missed, fresh, norm, roll, guaranteed, grant, dayGift, saveCost, checkIn, saveStreak, subjectGift, subjectMile, deals, buy, equip, progress, best, pickW };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RoboCore = api;
})(typeof self !== "undefined" ? self : this);
