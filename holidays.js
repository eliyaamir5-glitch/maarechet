// 🎉 מצב חג: בכל חג ומועד האפליקציה מתלבשת – צבעים, קישוטים ואפקטים מיוחדים לכל חג, בכל העמודים.
// ימי זיכרון ואבל: עיצוב שקט ומכובד (אפור, נר זיכרון) – בלי אפקטים ובלי ספירה לאחור.
// בעמוד הראשי: כרטיס חג (ברכה, נרות חנוכה, מדורה…) או "עוד X ימים ל…" כשחג מתקרב.
// נטען מ-theme.js אחרי holidays-core.js. התאריכים מחושבים בטלפון עצמו (HolidaysCore).
// תצוגה מקדימה (למנהל המערכת): ?hol=purim (או hanukkah&holday=3), ?hol=off לחזרה לרגיל.
(function () {
  const C = window.HolidaysCore; if (!C) return;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const sget = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const sset = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };
  const page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

  // ---- העיצוב של כל חג ----
  // grad = צבע הכותרת בכל העמודים · fx = סוג האפקט · em = מה נופל/עף · deco = קישוט בכותרת · mark = סימן גדול ברקע הכותרת
  const T = {
    rosh: { grad: "linear-gradient(135deg,#7f1d1d 0%,#b91c1c 45%,#d97706 100%)", fx: "fall", em: ["🍎", "🍯", "🍎", "🍯", "✨"], extra: "bees", deco: "garland", hang: ["🍎", "🍯", "🐝", "📯", "🍎", "🍯", "🐝"], mark: "🍯", sub: () => "שתהיה שנה טובה, מתוקה ומוצלחת" },
    kippur: { grad: "linear-gradient(135deg,#1e293b 0%,#475569 55%,#94a3b8 100%)", fx: "glow", em: ["✨"], mark: "🤍", solemn: true, sub: () => "יום של סליחה ומחילה" },
    sukkot: { grad: "linear-gradient(135deg,#14532d 0%,#15803d 50%,#ca8a04 100%)", fx: "fall", em: ["🍂", "🌿", "🍋", "🍃", "🍂"], deco: "garland", hang: ["🍋", "🍇", "⭐", "🍎", "🌿", "🍐", "⭐", "🍇"], mark: "🌿", sub: h => h.day >= 1 ? `יום ${h.day} של סוכות · חג שמח בסוכה!` : "חג שמח בסוכה!" },
    simchat: { grad: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#eab308 100%)", fx: "confetti", em: ["📜", "🎉", "✨", "💃"], deco: "bunting", flags: ["#facc15", "#ffffff", "#60a5fa", "#f472b6", "#34d399"], mark: "📜", sub: () => "רוקדים עם התורה! 💃🕺" },
    hanukkah: { grad: "linear-gradient(135deg,#0c1e5b 0%,#1d4ed8 55%,#f59e0b 100%)", fx: "fall", em: ["🍩", "🪙", "✨", "🍩", "⭐"], deco: "dreidel", mark: "🕎", card: "menorah", sub: (h, n) => n ? `נר ${ORD[n]} · ${"🕯️".repeat(Math.min(n, 8))}` : "חג האורים" },
    tubishvat: { grad: "linear-gradient(135deg,#365314 0%,#4d7c0f 50%,#db2777 100%)", fx: "fall", em: ["🌸", "🌸", "🌳", "🌰", "🍇", "🫒"], deco: "garland", hang: ["🌸", "🍇", "🌰", "🫒", "🍊", "🌸", "🍎"], mark: "🌳", sub: () => "ראש השנה לאילנות 🌱" },
    purim: { grad: "linear-gradient(135deg,#7c3aed 0%,#db2777 35%,#f59e0b 70%,#10b981 100%)", fx: "confetti", em: ["🎭", "🤡", "🎉", "🎊", "🎈", "👑", "🍬"], deco: "bunting", flags: ["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#fb923c"], mark: "🎭", party: true, sub: () => "ונהפוכו! 🙃 משלוחי מנות, מגילה ומסיבה" },
    pesach: { grad: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0284c7 100%)", fx: "fall", em: ["🫓", "🍷", "🫓", "🌸"], extra: "frogs", deco: "garland", hang: ["🫓", "🍷", "🥚", "🌿", "🫓", "🍷"], mark: "🍷", sub: h => h.day >= 1 ? `יום ${h.day} של פסח · חג החירות` : "חג החירות" },
    shoah: { sad: true, mark: "🕯️", title: "יום הזיכרון לשואה ולגבורה", sub: () => "נזכור את ששת המיליונים. לא נשכח." },
    zikaron: { sad: true, mark: "🕯️", title: "יום הזיכרון לחללי מערכות ישראל ונפגעי פעולות האיבה", sub: () => "יהי זכרם ברוך 🇮🇱" },
    atzmaut: { grad: "linear-gradient(135deg,#172554 0%,#1d4ed8 50%,#3b82f6 100%)", fx: "fireworks", em: ["🇮🇱", "🎆", "✨"], deco: "bunting", flags: ["#ffffff", "#1d4ed8", "#ffffff", "#1d4ed8"], mark: "🇮🇱", sub: h => `${C.stateYears(h)} שנה למדינת ישראל 🎆` },
    lagbaomer: { grad: "linear-gradient(135deg,#1c1917 0%,#9a3412 50%,#f97316 100%)", fx: "rise", em: ["🔥", "✨"], mark: "🔥", card: "fire", sub: () => "מדורות, תפוחי אדמה וחברים 🔥🏹" },
    yerushalayim: { grad: "linear-gradient(135deg,#78350f 0%,#b45309 50%,#d97706 100%)", fx: "sparkle", em: ["✨", "⭐", "✨"], deco: "walls", mark: "✨", sub: () => "ירושלים של זהב 💛" },
    shavuot: { grad: "linear-gradient(135deg,#14532d 0%,#16a34a 50%,#ca8a04 100%)", fx: "fall", em: ["🌾", "🧀", "🥛", "🌸", "🌼"], deco: "garland", hang: ["🌸", "🌾", "🧺", "🌼", "🧀", "🌸", "🌾"], mark: "🌾", sub: () => "חג מתן תורה · ביכורים ומאכלי חלב 🧀" },
    tishabav: { sad: true, mark: "🕯️", title: "תשעה באב", sub: () => "מתאבלים על חורבן בית המקדש, ומתפללים לבניין ירושלים" },
  };
  const ORD = ["", "ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי", "שמיני"];

  // ---- מה פעיל עכשיו ----
  const q = new URLSearchParams(location.search);
  if (q.has("hol")) { const v = q.get("hol"); sset("holPreview", v === "off" ? null : JSON.stringify({ k: v, d: +q.get("holday") || 1, n: q.has("holnext") ? +q.get("holnext") : null })); }
  let ctl = {}; try { ctl = JSON.parse(get("holCtl") || "{}") || {}; } catch (e) {}
  let prev = null; try { prev = JSON.parse(sget("holPreview") || "null"); } catch (e) {}
  function current() {
    if (prev && C.BY[prev.k]) {
      const def = C.BY[prev.k], st = C.ilNow(Date.now()).ymd;
      const h = Object.assign({}, def, { start: st, end: C.add(st, def.len - 1), day: prev.d, eve: false, preview: true });
      return prev.n != null ? { next: Object.assign(h, { inDays: prev.n, start: C.add(st, prev.n), end: C.add(st, prev.n + def.len - 1) }) } : { now: h };
    }
    if (ctl.off) return {};
    const off = k => ctl.offKeys && ctl.offKeys[k];
    const a = C.active(); if (a && !off(a.key)) return { now: a };
    const n = C.next(); return n && !off(n.key) ? { next: n } : {};
  }
  const cur = current(), H = cur.now, th = H && T[H.key];
  const fxOff = () => !!H && get("holFxOff") === H.key + H.start;

  // ---- עיצוב ----
  const css = `
.hol-top{position:relative;isolation:isolate}
.hol-deco{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:-1}
.hol-mark{position:absolute;left:10px;bottom:-14px;font-size:96px;opacity:.16;transform:rotate(-12deg);line-height:1}
.hol-garland{position:absolute;top:calc(env(safe-area-inset-top) + 0px);left:0;right:0;display:flex;justify-content:space-around;padding:0 14px}
.hol-garland::before{content:"";position:absolute;left:0;right:0;top:4px;height:16px;border-top:2px dotted rgba(255,255,255,.55);border-radius:0 0 50% 50%/0 0 100% 100%}
.hol-garland span{display:block;font-size:17px;transform-origin:50% -10px;animation:holSwing 2.6s ease-in-out infinite alternate;margin-top:8px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
.hol-garland span:nth-child(odd){animation-delay:-1.3s;margin-top:14px}
@keyframes holSwing{from{transform:rotate(-9deg)}to{transform:rotate(9deg)}}
.hol-bunting{position:absolute;top:env(safe-area-inset-top);left:0;right:0;display:flex;justify-content:center;gap:2px;overflow:hidden}
.hol-bunting i{flex:0 0 22px;height:20px;clip-path:polygon(0 0,100% 0,50% 100%);opacity:.92;transform-origin:50% 0;animation:holSwing 2s ease-in-out infinite alternate}
.hol-bunting i:nth-child(even){animation-delay:-1s}
.hol-dreidel{position:absolute;left:18px;bottom:10px;width:46px;height:56px;opacity:.85;animation:holSpin 1.4s linear infinite;transform-origin:50% 80%}
@keyframes holSpin{0%{transform:rotateY(0) rotate(-8deg)}50%{transform:rotateY(180deg) rotate(8deg)}100%{transform:rotateY(360deg) rotate(-8deg)}}
.hol-walls{position:absolute;left:0;right:0;bottom:0;height:34px;opacity:.35}
#holFx{position:fixed;inset:0;pointer-events:none;z-index:35;overflow:hidden}
#holFx .p{position:absolute;top:0;will-change:transform;line-height:1;user-select:none}
#holFx .fall{animation:holFall var(--d) linear var(--w) infinite}
#holFx .once{animation-iteration-count:1;animation-fill-mode:forwards}
@keyframes holFall{0%{transform:translate3d(0,-12vh,0) rotate(0)}100%{transform:translate3d(var(--dx),112vh,0) rotate(var(--r))}}
#holFx .conf{width:8px;height:13px;border-radius:2px}
#holFx .rise{top:auto;bottom:-30px;animation:holRise var(--d) ease-out var(--w) infinite}
@keyframes holRise{0%{transform:translate3d(0,0,0) scale(1);opacity:0}10%{opacity:1}100%{transform:translate3d(var(--dx),-75vh,0) scale(.3);opacity:0}}
#holFx .spark{animation:holTw var(--d) ease-in-out var(--w) infinite}
@keyframes holTw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.9;transform:scale(1.1)}}
#holFx .boom{position:absolute;width:0;height:0}
#holFx .boom b{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);animation:holBoom 1.3s cubic-bezier(.1,.7,.3,1) forwards}
@keyframes holBoom{0%{transform:translate(0,0) scale(1.2);opacity:1}100%{transform:translate(var(--bx),var(--by)) scale(.3);opacity:0}}
#holFx .bee{top:var(--y);left:0;font-size:24px;animation:holBee var(--d) linear var(--w) infinite}
@keyframes holBee{0%{transform:translate(-12vw,0)}25%{transform:translate(25vw,-30px)}50%{transform:translate(50vw,20px)}75%{transform:translate(75vw,-25px)}100%{transform:translate(112vw,0)}}
#holFx .frog{top:auto;bottom:calc(8px + env(safe-area-inset-bottom));left:0;font-size:26px;animation:holHop 9s linear var(--w) infinite}
@keyframes holHop{0%{transform:translate(112vw,0)}5%{transform:translate(105vw,-40px)}10%{transform:translate(98vw,0)}15%{transform:translate(91vw,-40px)}20%{transform:translate(84vw,0)}25%{transform:translate(77vw,-40px)}30%{transform:translate(70vw,0)}35%{transform:translate(63vw,-40px)}40%{transform:translate(56vw,0)}45%{transform:translate(49vw,-40px)}50%{transform:translate(42vw,0)}55%{transform:translate(35vw,-40px)}60%{transform:translate(28vw,0)}65%{transform:translate(21vw,-40px)}70%{transform:translate(14vw,0)}75%{transform:translate(7vw,-40px)}80%{transform:translate(0,0)}85%{transform:translate(-7vw,-40px)}100%{transform:translate(-14vw,0)}}
#holFx .glow{position:absolute;inset:-20%;background:radial-gradient(circle at 50% 0%,rgba(255,255,255,.35),transparent 60%);animation:holBreath 6s ease-in-out infinite}
@keyframes holBreath{0%,100%{opacity:.4}50%{opacity:.9}}
/* 🚧 שבוע לפני חג שמח: רובוטים בונים את העיצוב */
#holCard.build{background:linear-gradient(135deg,#1e1b4b,#312e81 60%,#4c1d95);padding:14px 14px 12px;border:1.5px solid rgba(250,204,21,.55)}
#holCard.build .b-scene{position:relative;height:118px;margin:8px -4px 6px;border-radius:14px;background:linear-gradient(#0f172a00,#0f172a66),repeating-linear-gradient(135deg,rgba(250,204,21,.16) 0 12px,transparent 12px 24px);overflow:hidden}
#holCard.build .b-sign{position:absolute;inset:auto 0 0 0;height:22px;background:repeating-linear-gradient(45deg,#facc15 0 14px,#111827 14px 28px);opacity:.9}
#holCard.build .b-hang{position:absolute;top:6px;left:0;right:0;display:flex;justify-content:space-around;padding:0 16px}
#holCard.build .b-hang span{font-size:20px;transform-origin:50% -8px;animation:holSwing 2.4s ease-in-out infinite alternate;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
#holCard.build .b-hang span.no{opacity:.14;filter:grayscale(1);animation:none}
#holCard.build .b-crane{position:absolute;top:0;right:22%;width:3px;height:64px;background:#94a3b8;transform-origin:50% 0;animation:bCrane 3.2s ease-in-out infinite}
#holCard.build .b-crane::after{content:attr(data-e);position:absolute;top:60px;left:50%;transform:translateX(-50%);font-size:26px}
@keyframes bCrane{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(12deg)}}
#holCard.build .bot{position:absolute;bottom:20px;width:34px;height:46px}
#holCard.build .bot .hd{position:absolute;top:0;left:3px;width:28px;height:22px;border-radius:8px;background:linear-gradient(#e0e7ff,#a5b4fc);box-shadow:inset 0 -3px 0 rgba(0,0,0,.15)}
#holCard.build .bot .hd::before,#holCard.build .bot .hd::after{content:"";position:absolute;top:8px;width:6px;height:6px;border-radius:50%;background:#0f172a;animation:bBlink 3s infinite}
#holCard.build .bot .hd::before{left:6px}#holCard.build .bot .hd::after{right:6px}
#holCard.build .bot .bd{position:absolute;top:24px;left:7px;width:20px;height:16px;border-radius:5px;background:#6366f1}
#holCard.build .bot .lg{position:absolute;bottom:0;left:9px;width:16px;height:6px;border-left:4px solid #475569;border-right:4px solid #475569}
#holCard.build .bot .tool{position:absolute;top:18px;font-size:18px;transform-origin:20% 90%}
#holCard.build .b1{left:10%;animation:bWalk 6s ease-in-out infinite}#holCard.build .b1 .tool{right:-14px;animation:bHammer .5s ease-in-out infinite alternate}
#holCard.build .b2{left:44%;animation:bHop 1.4s ease-in-out infinite}#holCard.build .b2 .tool{left:-14px;animation:bHammer .7s ease-in-out infinite alternate-reverse}
#holCard.build .b3{right:8%;animation:bWalk 7s ease-in-out infinite reverse}#holCard.build .b3 .tool{right:-12px;animation:bPaint 1s ease-in-out infinite alternate}
#holCard.build .spk{position:absolute;bottom:56px;left:calc(10% + 44px);font-size:12px;animation:bSpark .5s steps(2) infinite}
@keyframes bWalk{0%,100%{transform:translateX(0)}50%{transform:translateX(42px)}}@keyframes bHop{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes bHammer{from{transform:rotate(-35deg)}to{transform:rotate(25deg)}}@keyframes bPaint{from{transform:rotate(-20deg) translateY(0)}to{transform:rotate(15deg) translateY(-6px)}}
@keyframes bSpark{0%{opacity:1}100%{opacity:0}}@keyframes bBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
#holCard.build .b-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:6px}#holCard.build .b-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#facc15,#fb923c,#f472b6);background-size:200% 100%;animation:bFlow 2s linear infinite}
@keyframes bFlow{to{background-position:-200% 0}}
#holCard.build .b-row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#e0e7ff;margin-top:4px}
/* 🎉 היום של החג: חשיפה גדולה פעם אחת */
#holReveal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:radial-gradient(circle,rgba(250,204,21,.35),rgba(10,6,30,.92) 65%);animation:hrFade 3.4s forwards;pointer-events:none}
#holReveal .in{text-align:center;color:#fff;animation:hrPop .8s cubic-bezier(.2,1.6,.4,1)}#holReveal .em{font-size:110px;line-height:1;filter:drop-shadow(0 0 30px #fde047)}#holReveal h2{margin:8px 0 0;font:900 34px system-ui,sans-serif;text-shadow:0 4px 0 #000}#holReveal p{margin:4px 0 0;font-weight:800;color:#fde68a}
@keyframes hrPop{from{transform:scale(.2) rotate(-20deg)}to{transform:none}}@keyframes hrFade{0%,78%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){#holCard.build *,#holReveal,#holReveal *{animation:none!important}}
html.hol-sad{filter:grayscale(.85)}
html.hol-sad .top{box-shadow:none}
#holCard{position:relative;overflow:hidden;border-radius:22px;padding:16px 16px 14px;margin:0 0 14px;color:#fff;background:var(--grad);box-shadow:0 10px 26px rgba(0,0,0,.25);animation:holIn .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes holIn{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}
#holCard .h-row{display:flex;align-items:center;gap:12px}
#holCard .h-em{font-size:44px;line-height:1;flex:0 0 auto;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3));animation:holBob 2.4s ease-in-out infinite}
@keyframes holBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}
#holCard .h-t{font-size:20px;font-weight:900;line-height:1.25}
#holCard .h-s{font-size:14px;opacity:.95;margin-top:3px;line-height:1.4}
#holCard .h-btns{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
#holCard .h-btns button{border:0;border-radius:99px;padding:8px 14px;font:inherit;font-size:14px;font-weight:800;background:rgba(255,255,255,.22);color:#fff;cursor:pointer;backdrop-filter:blur(4px)}
#holCard .h-btns button:active{transform:scale(.95)}
#holCard svg.menorah{display:block;width:100%;max-width:330px;height:auto;margin:8px auto 0}
#holCard svg.fire{display:block;width:120px;height:90px;margin:6px auto 0}
.hol-flame{transform-box:fill-box;transform-origin:50% 100%;animation:holFlick .9s ease-in-out infinite alternate}
.hol-flame:nth-of-type(3n){animation-duration:.7s}.hol-flame:nth-of-type(3n+1){animation-duration:1.1s}
@keyframes holFlick{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.92,1.08) skewX(3deg)}100%{transform:scale(1.04,.94) skewX(-3deg)}}
#holCard.sad{background:linear-gradient(135deg,#111827,#1f2937 60%,#374151);box-shadow:0 8px 20px rgba(0,0,0,.35);animation:none}
#holCard.sad .h-em{animation:none}
#holCard.soon{padding:12px 14px 12px 34px;background:var(--card,#1d2247);color:var(--ink,#f4f5ff);border:1.5px dashed var(--line,#2b3162);box-shadow:none}
#holCard.soon .h-em{font-size:30px}
#holCard.soon .h-t{font-size:16px}
#holCard.soon .h-s{color:var(--muted,#9aa0c7)}
#holCard .h-cnt{font-size:26px;font-weight:900;color:var(--accent,#7c8cff);margin-inline-start:auto;text-align:center;line-height:1}
#holCard .h-cnt small{display:block;font-size:11px;font-weight:700;color:var(--muted,#9aa0c7)}
#holCard .h-x{position:absolute;top:4px;left:6px;background:none;border:0;color:inherit;opacity:.7;font-size:15px;cursor:pointer;padding:4px}
body.hol-flip{transition:transform 1s cubic-bezier(.6,-.3,.4,1.3);transform:rotate(180deg)}
@media (prefers-reduced-motion: reduce){.hol-garland span,.hol-bunting i,.hol-dreidel,.hol-flame,#holCard,#holCard .h-em{animation:none!important}}
`;

  function addCss(extra) { const s = document.createElement("style"); s.id = "holStyle"; s.textContent = css + (extra || ""); (document.head || document.documentElement).appendChild(s); }

  // ---- אפקטים ----
  let fx = null;
  function layer() { if (!fx || !fx.isConnected) { fx = document.createElement("div"); fx.id = "holFx"; fx.setAttribute("aria-hidden", "true"); document.body.appendChild(fx); } return fx; }
  function particles(t, n, once) {
    if (REDUCED) return;
    const L = layer(), conf = t.fx === "confetti", cols = t.flags || ["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      if (t.fx === "rise") { s.className = "p rise"; s.textContent = Math.random() < .55 ? "" : pick(t.em); if (!s.textContent) { s.style.cssText = `width:${rnd(3, 6)}px;height:${rnd(3, 6)}px;border-radius:50%;background:${pick(["#fde047", "#fb923c", "#f97316", "#fef3c7"])};box-shadow:0 0 8px #f97316`; } }
      else if (t.fx === "sparkle" || t.fx === "glow") { s.className = "p spark"; s.textContent = pick(t.em); s.style.top = rnd(4, 90) + "vh"; }
      else if (conf && Math.random() < .55) { s.className = "p fall conf"; s.style.background = pick(cols); }
      else { s.className = "p fall"; s.textContent = pick(t.em); }
      if (once) s.classList.add("once");
      const d = once ? rnd(2.6, 4.8) : rnd(9, 16);
      s.style.left = rnd(0, 97) + "vw";
      s.style.fontSize = (once ? rnd(20, 34) : rnd(15, 24)) + "px";
      if (!once) s.style.opacity = t.fx === "rise" ? "" : ".75";
      s.style.setProperty("--d", d + "s");
      s.style.setProperty("--w", (once ? rnd(0, 1.6) : -rnd(0, d)) + "s");
      s.style.setProperty("--dx", rnd(-60, 60) + "px");
      s.style.setProperty("--r", rnd(-260, 260) + "deg");
      if (once) s.addEventListener("animationend", () => s.remove());
      L.appendChild(s);
    }
  }
  function boom(x, y) {
    if (REDUCED) return;
    const L = layer(), b = document.createElement("div"); b.className = "boom"; b.style.left = x + "px"; b.style.top = y + "px";
    const c = pick(["#ffffff", "#60a5fa", "#93c5fd", "#facc15", "#f472b6", "#34d399"]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = rnd(60, 95), e = document.createElement("b"); e.style.setProperty("--c", Math.random() < .3 ? "#fff" : c); e.style.setProperty("--bx", Math.cos(a) * r + "px"); e.style.setProperty("--by", Math.sin(a) * r + 20 + "px"); b.appendChild(e); }
    L.appendChild(b); setTimeout(() => b.remove(), 1500);
  }
  function fireworks(n, every) { for (let i = 0; i < n; i++) setTimeout(() => boom(rnd(30, innerWidth - 30), rnd(80, innerHeight * .55)), i * every); }
  function extras(t) {
    if (REDUCED) return;
    const L = layer();
    if (t.extra === "bees") for (let i = 0; i < 2; i++) { const s = document.createElement("span"); s.className = "p bee"; s.textContent = "🐝"; s.style.setProperty("--y", rnd(20, 70) + "vh"); s.style.setProperty("--d", rnd(11, 16) + "s"); s.style.setProperty("--w", -rnd(0, 10) + "s"); L.appendChild(s); }
    if (t.extra === "frogs") { const s = document.createElement("span"); s.className = "p frog"; s.textContent = "🐸"; s.style.setProperty("--w", "2s"); L.appendChild(s); }
    if (t.fx === "glow") { const g = document.createElement("div"); g.className = "glow"; L.appendChild(g); }
  }
  // פרץ גדול (פתיחה ראשונה ביום / לחיצה על "עוד!")
  function burst(t) {
    if (t.fx === "fireworks") { fireworks(10, 380); particles({ fx: "fall", em: t.em }, 14, true); return; }
    particles(t, t.fx === "confetti" ? 60 : 30, true);
  }
  function ambient(t) {
    if (t.fx === "fireworks") { particles({ fx: "fall", em: ["🇮🇱", "✨"] }, 6, false); setTimeout(() => fireworks(3, 900), 1500); return; }
    particles(t, t.fx === "sparkle" || t.fx === "glow" ? 10 : t.fx === "rise" ? 16 : 7, false);
  }

  // ---- קישוטים בכותרת ----
  function decorate(t) {
    const tops = document.querySelectorAll(".top"); if (!tops.length) return;
    tops.forEach(top => {
      if (top.querySelector(".hol-deco")) return;
      top.classList.add("hol-top");
      const d = document.createElement("div"); d.className = "hol-deco"; d.setAttribute("aria-hidden", "true");
      let h = `<div class="hol-mark">${t.mark || ""}</div>`;
      if (t.deco === "garland") h += `<div class="hol-garland">${t.hang.map(e => `<span>${e}</span>`).join("")}</div>`;
      if (t.deco === "bunting") { const n = Math.ceil((innerWidth || 400) / 24) + 2; h += `<div class="hol-bunting">${Array.from({ length: n }, (_, i) => `<i style="background:${t.flags[i % t.flags.length]}"></i>`).join("")}</div>`; }
      if (t.deco === "dreidel") h = `<div class="hol-mark" style="left:auto;right:12px">🕎</div>` + DREIDEL;
      if (t.deco === "walls") h += WALLS;
      d.innerHTML = h; top.prepend(d);
    });
  }
  const DREIDEL = `<svg class="hol-dreidel" viewBox="0 0 46 56"><rect x="20" y="0" width="6" height="12" rx="2" fill="#fde68a"/><path d="M6 12h34v22L23 54 6 34z" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/><path d="M6 12h17v42L6 34z" fill="#f59e0b"/><text x="23" y="30" text-anchor="middle" font-size="15" font-weight="900" fill="#7c2d12" font-family="Arial">פ</text></svg>`;
  const WALLS = `<svg class="hol-walls" viewBox="0 0 400 34" preserveAspectRatio="none"><path fill="#fff" d="M0 34V18h8v-5h6v5h8v-5h6v5h8v-5h6v5h10V8h10v4h6V8h10v10h8v-5h6v5h8v-5h6v5h14V4l6-4 6 4v14h10v-5h6v5h8v-5h6v5h8v-5h6v5h12V10h8v4h6v-4h8v8h10v-5h6v5h8v-5h6v5h8v-5h6v5h10V6h10v12h8v-5h6v5h8v-5h6v5h8v-5h6v5h10v-5h6v5h8v16z"/></svg>`;

  // ---- חנוכייה / מדורה / נר זיכרון (SVG) ----
  function menorah(n) {
    const xs = [20, 55, 90, 125, 205, 240, 275, 310]; let s = `<svg class="menorah" viewBox="0 0 330 150" role="img" aria-label="חנוכייה – ${n} נרות">`;
    s += `<defs><radialGradient id="hf" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fff7c2"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#f97316"/></radialGradient></defs>`;
    s += `<rect x="40" y="128" width="250" height="12" rx="6" fill="#fcd34d"/><rect x="158" y="70" width="14" height="60" fill="#fbbf24"/>`;
    s += `<path d="M20 72 Q20 118 165 118 Q310 118 310 72" fill="none" stroke="#fbbf24" stroke-width="7"/><rect x="18" y="72" width="294" height="6" rx="3" fill="#fbbf24"/>`;
    // הנרות נוספים מימין לשמאל: בלילה n דולקים n הנרות הימניים
    xs.forEach((x, i) => { const lit = i >= 8 - n; s += `<rect x="${x - 5}" y="${lit ? 46 : 46}" width="10" height="26" rx="2" fill="${["#93c5fd", "#fca5a5", "#86efac", "#fde68a", "#c4b5fd", "#f9a8d4", "#67e8f9", "#fdba74"][i]}"/>`; if (lit) s += `<ellipse class="hol-flame" cx="${x}" cy="36" rx="6" ry="11" fill="url(#hf)"/>`; });
    s += `<rect x="160" y="22" width="10" height="26" rx="2" fill="#fff"/><ellipse class="hol-flame" cx="165" cy="12" rx="6" ry="11" fill="url(#hf)"/><rect x="152" y="48" width="26" height="6" rx="3" fill="#fbbf24"/>`;
    return s + `</svg>`;
  }
  const FIRE = `<svg class="fire" viewBox="0 0 120 90" aria-hidden="true"><defs><linearGradient id="ff" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#dc2626"/><stop offset=".5" stop-color="#f97316"/><stop offset="1" stop-color="#fde047"/></linearGradient></defs>
<path class="hol-flame" d="M60 78C34 78 30 56 42 40c2 10 8 12 10 12-4-16 4-30 16-40-2 12 6 18 10 26 4-6 4-12 2-18 14 12 20 30 12 44-6 10-18 14-32 14z" fill="url(#ff)"/>
<path class="hol-flame" d="M60 78c-12 0-16-10-10-20 2 6 6 6 8 6-2-8 2-14 8-18 0 8 4 10 6 14 6 8 0 18-12 18z" fill="#fde68a"/>
<rect x="18" y="76" width="84" height="9" rx="4.5" fill="#78350f" transform="rotate(-8 60 80)"/><rect x="18" y="76" width="84" height="9" rx="4.5" fill="#92400e" transform="rotate(8 60 80)"/></svg>`;
  const CANDLE = `<svg viewBox="0 0 40 70" width="44" height="66" aria-hidden="true"><defs><radialGradient id="cf" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs><ellipse class="hol-flame" cx="20" cy="16" rx="6" ry="12" fill="url(#cf)"/><rect x="19" y="24" width="2" height="6" fill="#444"/><path d="M8 30h24l-2 38H10z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.5)"/><rect x="10" y="40" width="20" height="26" rx="2" fill="#f5f5f4"/></svg>`;

  // ---- כרטיס החג בעמוד הראשי ----
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function card() {
    if (page !== "index") return;
    const host = document.querySelector(".col-main") || document.querySelector("main"); if (!host) return;
    let el = document.getElementById("holCard"); if (!el) { el = document.createElement("div"); el.id = "holCard"; const hero = document.getElementById("hero"); host.insertBefore(el, hero || host.firstChild); }
    if (H && th && th.sad) {
      el.className = "sad"; el.setAttribute("role", "note");
      el.innerHTML = `<div class="h-row">${CANDLE}<div><div class="h-t">${esc(th.title)}</div><div class="h-s">${esc(th.sub(H))}</div></div></div>`;
      return;
    }
    if (H && th) {
      const n = H.key === "hanukkah" ? (H.preview ? Math.min(8, H.day) : C.candles()) : 0;
      const title = H.eve ? `הערב מתחיל ${H.name}! ${th.mark}` : (H.greet || H.name).replace(/ הערב מדליקים נר ראשון$/, "");
      el.className = ""; el.removeAttribute("role");
      el.innerHTML = `<div class="h-row"><div class="h-em">${th.mark}</div><div><div class="h-t">${esc(title)}</div><div class="h-s">${esc(th.sub(H, n))}</div></div></div>`
        + (th.card === "menorah" ? menorah(n) : th.card === "fire" ? FIRE : "")
        + (th.solemn ? "" : `<div class="h-btns"><button type="button" id="holMore">🎉 עוד אפקטים!</button>${th.party ? `<button type="button" id="holFlip">🙃 ונהפוכו</button>` : ""}<button type="button" id="holMute">${fxOff() ? "✨ להחזיר אפקטים" : "🔕 בלי אפקטים"}</button></div>`);
      const more = document.getElementById("holMore"); if (more) more.onclick = () => { if (fxOff()) { set("holFxOff", null); ambient(th); extras(th); card(); } burst(th); };
      const mute = document.getElementById("holMute"); if (mute) mute.onclick = () => { if (fxOff()) { set("holFxOff", null); ambient(th); extras(th); } else { set("holFxOff", H.key + H.start); if (fx) fx.innerHTML = ""; } card(); };
      const flip = document.getElementById("holFlip"); if (flip) flip.onclick = () => { if (REDUCED) return; document.body.classList.add("hol-flip"); setTimeout(() => document.body.classList.remove("hol-flip"), 2600); };
      return;
    }
    const N = cur.next;
    // 🚧 שבוע לפני חג שמח: "הרובוטים בונים את העיצוב" – כל יום עוד קישוט נדלק, עם ספירה לאחור
    if (N && T[N.key] && !T[N.key].sad && N.inDays <= 7 && N.inDays >= 1) {
      const t = T[N.key], ems = (t.hang || t.em || [t.mark]).slice(0, 7), pct = Math.round((8 - N.inDays) / 8 * 100), lit = Math.max(1, Math.round(ems.length * (8 - N.inDays) / 8));
      const txt = N.inDays === 1 ? `הערב מתחיל ${N.name}! כמעט מוכן 😍` : N.inDays === 2 ? `מחר בערב ${N.name}!` : `עוד ${N.inDays} ימים ${N.name}`;
      el.className = "build"; el.removeAttribute("role");
      el.innerHTML = `<div class="h-row"><div class="h-em">🚧</div><div><div class="h-t">הרובוטים בונים את ${esc(N.name)}! ${t.mark || "🎉"}</div><div class="h-s">${esc(txt)} · ${esc(dateTxt(N.start))}</div></div><div class="h-cnt">${N.inDays}<small>${N.inDays === 1 ? "יום" : "ימים"}</small></div></div>
        <div class="b-scene" aria-hidden="true"><div class="b-hang">${ems.map((e, i) => `<span class="${i < lit ? "" : "no"}">${e}</span>`).join("")}</div><div class="b-crane" data-e="${t.mark || "🎉"}"></div>
          ${["🔨", "🔧", "🖌️"].map((tool, i) => `<div class="bot b${i + 1}"><div class="hd"></div><div class="bd"></div><div class="lg"></div><div class="tool">${tool}</div></div>`).join("")}<div class="spk">✨</div><div class="b-sign"></div></div>
        <div class="b-bar"><i style="width:${pct}%"></i></div><div class="b-row"><span>🔧 העיצוב של החג מוכן ב-${pct}%</span><span>${N.inDays === 1 ? "ביום החג – חשיפה גדולה! 🎉" : "כל יום נבנה עוד חלק"}</span></div>`;
      return;
    }
    if (N) {
      const t = T[N.key] || {}, k = "holSoonX";
      if (get(k) === N.key + N.start) { el.remove(); return; }
      el.className = "soon"; el.removeAttribute("role");
      const txt = N.inDays === 1 ? `הערב מתחיל ${N.name}!` : N.inDays === 2 ? `מחר בערב מתחיל ${N.name}!` : `עוד ${N.inDays} ימים ${N.name}`;
      el.innerHTML = `<button type="button" class="h-x" aria-label="הסתר">✕</button><div class="h-row"><div class="h-em">${t.mark || "🎉"}</div><div><div class="h-t">${esc(txt)}</div><div class="h-s">${esc(dateTxt(N.start))}</div></div><div class="h-cnt">${N.inDays}<small>${N.inDays === 1 ? "יום" : "ימים"}</small></div></div>`;
      el.querySelector(".h-x").onclick = () => { set(k, N.key + N.start); el.remove(); };
      return;
    }
    el.remove();
  }
  function dateTxt(ymd) {
    const d = new Date(ymd + "T12:00:00Z"), days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const e = new Date(Date.parse(ymd + "T12:00:00Z") - 864e5);
    return `נכנס ביום ${days[e.getUTCDay()]} ${e.getUTCDate()}.${e.getUTCMonth() + 1} בערב`;
  }

  // ---- הפעלה ----
  window.Holidays = {
    current: () => cur, T,
    // index.html: הגדרות מנהל המערכת מגיעות עם הפיד (כיבוי כללי / חג מסוים)
    ctl(c) { if (!c || typeof c !== "object") return; const s = JSON.stringify({ off: !!c.off, offKeys: c.offKeys || {} }); if (s !== get("holCtl")) set("holCtl", s); },
  };
  if (!H && !cur.next) return;
  addCss(th && !th.sad && th.grad ? `:root:root{--grad:${th.grad}}` : th && th.sad ? `:root:root{--grad:linear-gradient(135deg,#111827 0%,#374151 60%,#4b5563 100%)}` : "");
  if (th && th.sad) document.documentElement.classList.add("hol-sad");
  if (th) document.documentElement.classList.add("hol-on", "hol-" + H.key);
  const go = () => {
    if (th && !th.sad) {
      decorate(th);
      if (!fxOff()) {
        ambient(th); extras(th);
        // פרץ גדול: פעם ביום בפתיחה של העמוד הראשי
        const k = H.key + C.ilNow(Date.now()).ymd;
        if (page === "index" && (get("holBurst") !== k || H.preview)) { set("holBurst", k); setTimeout(() => burst(th), 700); }
        // 🎉 החשיפה הגדולה: פעם אחת בתחילת החג (אחרי שבוע של "בנייה")
        const rk = "holReveal"; if (page === "index" && get(rk) !== H.key + H.start && !REDUCED && document.body) { set(rk, H.key + H.start); const r = document.createElement("div"); r.id = "holReveal"; r.innerHTML = `<div class="in"><div class="em">${th.mark || "🎉"}</div><h2>${esc(H.name)} הגיע!</h2><p>הרובוטים סיימו לבנות 🤖🔨 חג שמח!</p></div>`; document.body.appendChild(r); setTimeout(() => r.remove(), 3500); setTimeout(() => fireworks(6, 260), 300); }
      }
    } else if (th && th.sad) decorate({ mark: "🕯️" });
    card();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  // חג שמתחיל/נגמר בזמן שהאפליקציה פתוחה – בפעם הבאה שחוזרים אליה
  // (עדכון שקט – רק כשלא באמצע משהו, כמו עדכון גרסה)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || prev) return; const c2 = current(), a = c2.now ? c2.now.key + c2.now.eve : "", b = H ? H.key + H.eve : "";
    if (a !== b) { if (window.SoftUpdate) window.SoftUpdate.request(); else try { location.reload(); } catch (e) {} }
  });
})();
