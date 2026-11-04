// 🎮 הרובוט שלי – עונה 4: גלגל מזל יומי, משחק "ברגים נופלים" (רק בהפסקות), מסע על מפה, מעבדה, שוק, סטים, ובונוסים על ציון טוב / שבוע בלי איחורים.
// נטען אחרי robo.js (theme.js). כל המצב נשמר בטלפון (localStorage "robo"). ציונים וחיסורים לא יוצאים מהטלפון – רק בודקים אותם כאן.
(function () {
  const R = window.RoboCore, RB = window.Robo; if (!R || !RB || !RB._) return;
  const X = RB._, esc = X.esc, RC = X.RC, LS = X.LS;
  const tm = t => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
  const back = `<button type="button" class="rp-back">→ חזרה</button>`;

  const CSS = `
.rp-msb{border-radius:18px;padding:10px 12px 4px;margin-bottom:10px;background:linear-gradient(135deg,#1e3a8a,#1a1040);border:1.5px solid rgba(147,197,253,.4)}
.rp-msh{font-weight:900;font-size:15px;margin-bottom:6px}.rp-msh small{font-weight:700;color:#c7c3ff;font-size:12px;margin-inline-start:6px}
.rp-ms{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(255,255,255,.08)}.rp-ms .e{font-size:22px}.rp-ms .t{flex:1;min-width:0;font-size:13px}.rp-ms small{font-weight:800;color:#c7c3ff}
.rp-ms.done{background:rgba(250,204,21,.08);border-radius:10px}.rp-ms.got{opacity:.6}
.rp-legend{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:10px;padding:10px 12px;border-radius:18px;border:1.5px solid #facc15;cursor:pointer;font:inherit;color:#fff;text-align:start;background:radial-gradient(120% 140% at 0% 50%,#7f1d1d,#1c0a0a 60%,#000);box-shadow:0 0 22px rgba(250,204,21,.25)}
.rp-legend .lg-bot{width:66px;height:66px;flex:0 0 66px}.rp-legend .t{flex:1;min-width:0}.rp-legend b{display:block;font-size:17px;color:#fde047}.rp-legend small{display:block;font-size:12px;color:#fde68a}
.rp-lghero{text-align:center;border-radius:20px;padding:12px;background:radial-gradient(120% 90% at 50% 0%,#7f1d1d,#1c0a0a 60%,#0b0820)}.rp-lghero .lg-big{width:150px;height:150px;margin:0 auto}.rp-lghero .rbx{text-align:start}
.rp-menu{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rp-t{position:relative;border:0;border-radius:18px;padding:14px 10px;font:inherit;color:#fff;cursor:pointer;text-align:center;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 75%,#000),#1a1040);border:1.5px solid color-mix(in srgb,var(--c) 70%,#fff 10%);box-shadow:0 6px 16px rgba(0,0,0,.3)}
.rp-t .e{font-size:34px;line-height:1.1}.rp-t b{display:block;font-size:15px;margin-top:4px}.rp-t small{display:block;font-size:11.5px;color:#d9d5ff;margin-top:2px}
.rp-t .dot{position:absolute;top:8px;left:8px;background:#ef4444;border-radius:99px;font-size:11px;font-weight:900;padding:2px 7px;animation:rBeat 1.2s infinite}
.rp-t.wide{grid-column:1/-1}
.rp-back{border:0;background:rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:7px 12px;font:inherit;font-weight:800;cursor:pointer;margin-bottom:10px}
.rp-h{font-size:20px;font-weight:900;margin:2px 0 4px}.rp-s{font-size:13px;color:#c7c3ff;margin-bottom:12px}
/* 🎰 גלגל */
.rp-wheel{position:relative;width:min(300px,80vw);aspect-ratio:1;margin:8px auto 16px}
.rp-wheel svg.w{width:100%;height:100%;transition:transform 4.2s cubic-bezier(.12,.75,.15,1);filter:drop-shadow(0 10px 24px rgba(0,0,0,.5))}
.rp-pin{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:34px;z-index:2;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))}
.rp-hub{position:absolute;inset:38%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c2,#facc15 55%,#a16207);display:grid;place-items:center;font-size:26px;box-shadow:0 0 0 4px #1a1040}
/* 🗺️ מפה */
.rp-map{position:relative;border-radius:20px;overflow:hidden;height:min(62vh,520px);overflow-y:auto;background:#0e1a2e}
.rp-map-in{position:relative}
.rp-world{position:absolute;left:0;right:0;display:flex;align-items:flex-start;justify-content:flex-start;padding:8px 12px;font-weight:900;font-size:14px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.6)}
.rp-st{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;display:grid;place-items:center;font-size:20px;border:3px solid rgba(255,255,255,.6);background:#334155;box-shadow:0 4px 10px rgba(0,0,0,.4);z-index:1}
.rp-st.done{background:#16a34a;border-color:#bbf7d0}.rp-st.ready{background:linear-gradient(135deg,#fde047,#f97316);border-color:#fff;animation:rBeat .9s infinite;cursor:pointer}
.rp-st small{position:absolute;bottom:-17px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap}
.rp-me{position:absolute;width:52px;height:52px;margin:-56px 0 0 -26px;z-index:3;transition:top .6s,left .6s;filter:drop-shadow(0 4px 6px rgba(0,0,0,.6))}
.rp-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0 12px}.rp-bar i{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#facc15);border-radius:99px}
/* 🔨 מעבדה */
.rp-rar{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.rp-rar button{border:0;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;color:#fff;background:rgba(255,255,255,.1);cursor:pointer;white-space:nowrap}.rp-rar button.on{background:var(--c);color:#1a1040}.rp-rar button.few{opacity:.5}
.rc.pick{outline:3px solid #fde047;outline-offset:-3px;transform:scale(.95)}.lb-badge{position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:50%;background:#fde047;color:#1a1040;font-weight:900;font-size:13px;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.lb-steps{display:flex;gap:5px;margin:2px 0 10px}.lb-steps span{flex:1;text-align:center;font-size:12px;font-weight:800;padding:6px 2px;border-radius:10px;background:rgba(255,255,255,.07);color:#a5a1d6}.lb-steps span.on{background:linear-gradient(135deg,#5b6cff,#a259ff);color:#fff}
.lb-mach{border-radius:22px;padding:10px 10px 12px;margin-bottom:10px;background:radial-gradient(90% 70% at 50% 35%,color-mix(in srgb,var(--c) 35%,#1a1040),#0b0820);border:1.5px solid color-mix(in srgb,var(--c) 60%,#fff 10%)}
.lb-ring{position:relative;width:min(300px,82vw);aspect-ratio:1;margin:0 auto}
.lb-slot{position:absolute;width:23%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:18px;border:2.5px dashed rgba(255,255,255,.35);background:rgba(255,255,255,.05);cursor:pointer;padding:0;color:#fff;font:inherit}
.lb-slot .num{font-size:22px;font-weight:900;opacity:.45}.lb-slot.f{border:2.5px solid var(--c);background:color-mix(in srgb,var(--c) 30%,#1a1040);box-shadow:0 0 14px color-mix(in srgb,var(--c) 60%,transparent);animation:lbPop .3s cubic-bezier(.2,1.6,.4,1)}
.lb-slot .pv{position:absolute;inset:4px 4px 14px}.lb-slot .nm{position:absolute;bottom:2px;left:2px;right:2px;font-size:9.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lb-slot .x{position:absolute;top:-7px;left:-7px;width:20px;height:20px;border-radius:50%;background:#ef4444;font-size:10px;display:grid;place-items:center}
@keyframes lbPop{from{transform:translate(-50%,-50%) scale(.4)}}
.lb-pot{position:absolute;left:50%;top:50%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;background:#0b0820;border:3px solid color-mix(in srgb,var(--c) 70%,#fff 20%);box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 0 22px color-mix(in srgb,var(--c) 50%,transparent);display:grid;place-items:center}
.lb-pot .liq{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 70%,#fff 20%),var(--c));transition:height .4s}.lb-pot b{position:relative;font-size:20px;font-weight:900;text-shadow:0 2px 4px rgba(0,0,0,.6)}
.lb-pot.ready{animation:lbReady 1s ease-in-out infinite}@keyframes lbReady{50%{box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 0 40px var(--n)}}
.bub{position:absolute;inset:0}.bub i{position:absolute;bottom:-8px;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.7);animation:lbBub 1.6s ease-in infinite}.bub i:nth-child(1){left:25%}.bub i:nth-child(2){left:55%;animation-delay:.5s}.bub i:nth-child(3){left:75%;animation-delay:1s}.bub i:nth-child(4){left:40%;animation-delay:.8s}
@keyframes lbBub{to{transform:translateY(-120px);opacity:0}}
.lb-arrow{text-align:center;font-weight:900;font-size:14px;margin:6px 0}
.lb-out{display:flex;align-items:center;gap:12px;justify-content:center}.lb-out .q{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:30px;font-weight:900;background:color-mix(in srgb,var(--n) 30%,#1a1040);border:2.5px solid var(--n);box-shadow:0 0 18px var(--n);animation:rBeat 1.4s infinite}.lb-out small{display:block;font-size:12px;color:#c7c3ff}
.lb-tools{display:flex;gap:8px;margin-bottom:8px}.lb-tools .rbtn{flex:1}
.rp-lab{position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--c) 30%,#05020f),#05020f 70%);overflow:hidden;color:#fff;font-family:inherit;direction:rtl}
.lx-t{font-size:24px;font-weight:900;margin-bottom:18px;animation:rBeat .6s infinite}
.lx-stage{position:relative;width:300px;height:300px;--mix:var(--c)}
.lx-glow{position:absolute;inset:20%;border-radius:50%;background:radial-gradient(circle,var(--mix),transparent 70%);filter:blur(10px);opacity:.8;transition:background .15s}
.lx-pot{position:absolute;left:50%;top:50%;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;overflow:hidden;border:4px solid #fff;box-shadow:0 0 30px var(--mix),inset 0 0 20px rgba(0,0,0,.5);background:#0b0820}
.lx-liq{position:absolute;inset:0;background:conic-gradient(from 0deg,var(--mix),var(--n),var(--c),var(--mix));animation:lxSpin 1s linear infinite;opacity:.85}@keyframes lxSpin{to{transform:rotate(360deg)}}
.lx-it{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;opacity:0;border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 0 16px var(--mix);transition:opacity .4s}
.rp-lab.in .lx-it{opacity:1}
.lx-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.rp-lab.boom .lx-flash{animation:lxFlash .65s ease-out}.rp-lab.boom .lx-stage{animation:gmShake .5s}@keyframes lxFlash{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
.rp-lab.res{justify-content:flex-start;overflow-y:auto;padding:calc(20px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--n) 45%,#05020f),#05020f 70%)}
.lx-rays{position:fixed;left:50%;top:32%;width:900px;height:900px;margin:-450px 0 0 -450px;background:repeating-conic-gradient(color-mix(in srgb,var(--n) 35%,transparent) 0 10deg,transparent 10deg 20deg);animation:lxSpin 14s linear infinite;opacity:.6;pointer-events:none}
.lx-res{position:relative;width:100%;max-width:360px;text-align:center}
.lx-up{font-size:20px;font-weight:900;margin:6px 0 10px;animation:lbPop2 .5s cubic-bezier(.2,1.6,.4,1)}@keyframes lbPop2{from{transform:scale(.3);opacity:0}}
.lx-card{border-radius:24px;padding:14px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 55%,#1a1040),#1a1040);border:3px solid var(--c);box-shadow:0 0 40px var(--c);animation:lxIn .7s cubic-bezier(.2,1.5,.4,1)}@keyframes lxIn{from{transform:scale(.1) rotate(-200deg);opacity:0}}
.lx-card .pv{width:150px;height:150px;margin:0 auto}.lx-card .nm{font-size:22px;font-weight:900;margin:6px 0}.lx-card .sub{margin-top:8px;color:#fde68a;font-weight:800}
.rp-lab.big .lx-card{animation:lxIn .9s cubic-bezier(.2,1.5,.4,1),rBeat 1.6s 1s infinite}
.lx-sum{margin:14px 0;padding:10px;border-radius:18px;background:rgba(255,255,255,.06)}.lx-sum .lbl{font-size:12px;font-weight:800;color:#c7c3ff}.lx-sum .lx-row{display:flex;gap:6px;justify-content:center;margin:4px 0;background:none}.lx-i{display:block;width:44px;height:44px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.08);opacity:.75;filter:grayscale(.3)}.lx-i.got{width:62px;height:62px;opacity:1;filter:none;box-shadow:0 0 16px var(--n);background:rgba(255,255,255,.12)}.lx-sum .eq{font-size:18px}
.rp-lab .rd-btns{margin:0 auto}
/* 🎁 קיבלת */
.rw-chest{font-size:110px;line-height:1;margin:10px 0;animation:rwBounce .8s ease-in-out infinite;cursor:pointer;filter:drop-shadow(0 0 24px #facc15)}@keyframes rwBounce{50%{transform:translateY(-14px) rotate(-6deg) scale(1.05)}}
.rw-chest.pop{animation:rwPop .5s ease-out forwards}@keyframes rwPop{to{transform:scale(2.2);opacity:0}}
.rw-hint{font-weight:900;font-size:18px;color:#fde047;animation:rBeat .8s infinite}
.rw-sub{color:#fde68a;font-weight:800;margin:-4px 0 10px}
.rw-cards{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:6px 0 14px}
.rw-card{width:132px;padding:12px 8px;border-radius:20px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 45%,#1a1040),#1a1040);border:3px solid var(--c);box-shadow:0 0 26px color-mix(in srgb,var(--c) 70%,transparent);animation:lxIn .6s cubic-bezier(.2,1.5,.4,1) both}
.rw-card:nth-child(2){animation-delay:.15s}.rw-card:nth-child(3){animation-delay:.3s}.rw-card:nth-child(4){animation-delay:.45s}
.rw-card .ic{font-size:50px;line-height:1.1}.rw-card .ic.pv{width:80px;height:80px;margin:0 auto}.rw-card b{display:block;font-size:19px;font-weight:900;margin-top:4px}.rw-card small{display:block;font-size:12px;color:#d9d5ff;margin-top:2px}
.rw-count{font-size:22px;font-weight:900;margin:0 0 14px;padding:8px 14px;border-radius:99px;background:rgba(255,255,255,.08);display:inline-block;font-variant-numeric:tabular-nums}.rw-count.done{animation:rBeat .5s 2;background:rgba(250,204,21,.25)}
/* 🕵️ שוק */
.rp-mk{display:flex;align-items:center;gap:10px;border-radius:16px;padding:9px;margin-bottom:8px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 45%,#000),#1a1040);border:1.5px solid color-mix(in srgb,var(--c) 60%,#fff 10%)}
.rp-mk .pv{width:60px;height:60px;flex:0 0 60px}.rp-mk .t{flex:1;min-width:0}.rp-mk .t b{display:block;font-size:14px}.rp-mk .t small{font-size:12px;color:#d9d5ff}
.rp-seg{display:flex;gap:6px;margin-bottom:12px}.rp-seg button{flex:1;border:0;border-radius:12px;padding:9px;font:inherit;font-weight:800;color:#c7c3ff;background:rgba(255,255,255,.08);cursor:pointer}.rp-seg button.on{background:linear-gradient(135deg,#5b6cff,#a259ff);color:#fff}
.rp-price{width:100%;margin:12px 0 4px}.rp-pbig{font-size:30px;font-weight:900;text-align:center}
/* 🎭 סטים */
.rp-set{border-radius:18px;padding:12px;margin-bottom:10px;background:#1a1040;border:1.5px solid rgba(255,255,255,.12)}.rp-set.done{border-color:#22c55e;background:linear-gradient(135deg,#14532d,#1a1040)}
.rp-set .its{display:flex;gap:4px;flex-wrap:wrap;margin:8px 0}.rp-set .its span{width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.06);overflow:hidden}.rp-set .its span.no{filter:grayscale(1) brightness(.35)}
/* 🎮 משחק */
dialog.robo.game{background:#070418}
.gm{position:relative;height:100%;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none}
.gm-top{display:flex;align-items:center;gap:6px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:#120c2e;font-weight:900;font-size:14px}
.gm-top .x{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:10px;width:34px;height:34px;font-size:16px;cursor:pointer}
.gm-top span{background:rgba(255,255,255,.08);border-radius:99px;padding:5px 10px;white-space:nowrap}.gm-top span:empty{display:none}
dialog.robo.game{height:100vh;height:100dvh;max-height:100dvh}
.gm-cv{flex:1;position:relative;min-height:300px;overflow:hidden}
.gm-rules{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 10px}.gm-rules span{background:rgba(255,255,255,.1);border-radius:99px;padding:4px 9px;font-size:12.5px;font-weight:800}.gm-rules span.bad{background:rgba(239,68,68,.25);color:#fecaca}.gm-cv canvas{position:absolute;inset:0;width:100%;height:100%}
.gm-cash.lock,.gm-exit.lock,.gm-top .x.lock{background:linear-gradient(180deg,#fca5a5,#dc2626)!important;color:#fff!important;box-shadow:0 4px 0 #7f1d1d!important;animation:rBeat .8s infinite}
.gm-foot{display:flex;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom))}
.gm-cash{flex:1;font-size:17px!important;padding:14px 8px!important}
.gm-exit{flex:0 0 auto;font-size:16px!important;padding:14px 14px!important}
.gm-ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,2,15,.82);z-index:3;text-align:center;padding:20px}
.gm-ov .big{font-size:64px}.gm-ov h3{font-size:24px;margin:6px 0}.gm-ov p{color:#d9d5ff;margin:4px 0 16px}
.gm-ov .rd-btns{margin:0 auto}
.gm.boom{animation:gmShake .5s}@keyframes gmShake{20%{transform:translate(-8px,4px)}40%{transform:translate(8px,-4px)}60%{transform:translate(-6px,2px)}80%{transform:translate(4px,0)}}
`;
  if (!document.getElementById("roboPlusCss")) { const s = document.createElement("style"); s.id = "roboPlusCss"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  // ================= ⏰ הפסקה? (לפי המערכת של הילד) =================
  function bells(now) {
    const d = R.ymd(now); let L = null;
    try { if (window.Asst && Asst.todayLessons) { const t = Asst.todayLessons(new Date(now)); if (t) { L = (t.L || []).map(l => [tm(l.s), tm(l.e)]).filter(x => x[0] < x[1]); LS.set("roboBells", JSON.stringify({ d, L })); } } } catch (e) {}
    if (!L) { try { const c = JSON.parse(LS.get("roboBells", "null")); if (c && c.d === d && Array.isArray(c.L)) L = c.L; } catch (e) {} }
    return L;
  }
  const END = 16 * 60 + 15;
  // open: אפשר לשחק עכשיו · until: מתי ההפסקה נגמרת / השיעור נגמר (דקות מחצות)
  function breakState(now = Date.now()) {
    if (navigator.webdriver && LS.get("roboGameOpen", "")) return { open: true, free: true };
    const dt = new Date(now), m = dt.getHours() * 60 + dt.getMinutes();
    if (m >= END || dt.getDay() === 5 || dt.getDay() === 6) return { open: true, free: true };
    try { if (typeof vacationOf === "function" && vacationOf(dt)) return { open: true, free: true }; } catch (e) {}
    const L = bells(now); if (!L || !L.length) return { open: true, free: true };
    const cur = L.find(([s, e]) => m >= s && m < e && s < END);
    if (cur) return { open: false, until: Math.min(cur[1], END) };
    const nx = L.map(x => x[0]).filter(s => s > m && s < END).sort((a, b) => a - b)[0];
    return { open: true, until: nx == null ? null : nx };
  }

  // ================= הלשונית "🎮 כיף" =================
  let host = null;
  function tab(body, sub) {
    host = body; const S = X.S;
    if (sub && PANELS[sub]) return PANELS[sub](body);
    const wheelOk = S.wheel !== R.ymd(Date.now()), bs = breakState(), g = S.game && S.game.d === R.ymd(Date.now()) ? S.game : { n: 0, it: 0 };
    const mp = S.map || { p: 0, c: 0 }, ready = Math.min(R.MAP_N, Math.floor(mp.p / R.MAP_STEP)) - mp.c, sets = R.SETS.filter(x => (S.sets || {})[x.id]).length;
    const tile = (k, e, c, t, s, dot, wide) => `<button type="button" class="rp-t${wide ? " wide" : ""}" data-p="${k}" style="--c:${c}">${dot ? `<span class="dot">${dot}</span>` : ""}<div class="e">${e}</div><b>${t}</b><small>${s}</small></button>`;
    const ms = R.missions(S), heroes = R.SETS.find(x => x.id === "heroes"), hHave = heroes.ids.filter(id => S.own[id] && S.own[id] !== -1).length, legendTaken = ((JSON.parse(LS.get("roboRare", "{}") || "{}") || {})["skin:legend"] || {}).n >= 1;
    const mRow = id => { const M = R.MISSIONS[id], p = ms.p[id] || 0, done = p >= M.need, got = ms.got[id]; return `<div class="rp-ms${got ? " got" : done ? " done" : ""}"><span class="e">${M.em}</span><div class="t"><b>${esc(M.n)}</b><div class="rp-bar" style="margin:4px 0 0;height:7px"><i style="width:${p / M.need * 100}%"></i></div></div>${got ? "✅" : done ? `<button class="rbtn sm" type="button" data-mc="${id}">🔩 ${M.b}</button>` : `<small>${p}/${M.need}</small>`}</div>`; };
    body.innerHTML = (R.eventNow() ? `<div class="rev"><b>${R.eventNow().n}</b> פי ${R.eventNow().up} סיכוי שהתיבות ישתדרגו!</div>` : "")
      + `<div class="rp-msb"><div class="rp-msh">📋 משימות היום <small>${ms.all ? "✅ השלמת הכל! קיבלת 🎁" : "כל ה-3 = 🎁 תיבה גדולה"}</small></div>${ms.ids.map(mRow).join("")}</div>`
      + `<button type="button" class="rp-legend" data-p="legend"><div class="lg-bot">${X.svg("", { skin: "skin:legend" }, { still: false, noHoli: true })}</div><div class="t"><b>👑 האגדה</b><small>${legendTaken ? "נלקחה! מישהו אסף את כל הגיבורים 🔒" : "הראשון שאוסף את כל הגיבורים מקבל – רק אחד בכל הישיבה!"}</small><div class="rp-bar" style="margin:6px 0 0"><i style="width:${hHave / heroes.ids.length * 100}%"></i></div><small>🦸 ${hHave}/${heroes.ids.length} גיבורים</small></div></button>`
      + `<div class="rp-menu">
      ${tile("game", "🔩", "#f59e0b", "ברגים נופלים", bs.open ? (g.n >= R.GAME_CAP ? "סיימת להיום 💪" : `משחק להפסקה · עוד ${R.GAME_CAP - g.n} 🔩 היום`) : `🔒 נפתח ב-${hhmm(bs.until)}`, bs.open && g.n < R.GAME_CAP ? "!" : "", true)}
      ${tile("wheel", "🎰", "#ec4899", "גלגל מזל", wheelOk ? "סיבוב חינם היום!" : "חוזר מחר 🌙", wheelOk ? "1" : "")}
      ${tile("map", "🗺️", "#22c55e", "המסע", ready > 0 ? "יש אוצר שמחכה! 💰" : `תחנה ${mp.c}/${R.MAP_N}`, ready > 0 ? ready : "")}
      ${tile("lab", "🔨", "#38bdf8", "מעבדה", "5 אביזרים → 1 נדיר יותר")}
      ${tile("market", "🕵️", "#a855f7", "שוק", "קונים ומוכרים בברגים")}
      ${tile("sets", "🎭", "#f97316", "סטים", `השלמת ${sets}/${R.SETS.length}`)}
      ${tile("bonus", "📚", "#14b8a6", "בונוסים", "ציון טוב · שבוע בלי איחורים")}</div>`;
    body.querySelectorAll("[data-p]").forEach(b => b.onclick = () => PANELS[b.dataset.p](body));
    body.querySelectorAll("[data-mc]").forEach(b => b.onclick = async () => { const before = X.S.bolts, M = R.MISSIONS[b.dataset.mc], r = R.claimMission(X.S, b.dataset.mc); if (!r.ok) return; X.save();
      const open = await rewardShow({ title: "📋 משימה הושלמה!", sub: `${M.em} ${M.n}${r.box ? " · וגם בונוס על כל 3 המשימות!" : ""}`, got: [{ t: "bolts", n: r.bolts }, ...(r.box ? [{ t: "box", box: r.box }] : [])], before });
      tab(body); X.hubRefresh(); if (open && r.box) X.openBoxes([r.box]); });
  }
  // ================= 👑 האגדה: אוסף הגיבורים =================
  function legendPanel(body) {
    const S = X.S, st = R.SETS.find(x => x.id === "heroes"), have = st.ids.filter(id => S.own[id] && S.own[id] !== -1), mine = !!S.own["skin:legend"];
    const taken = ((JSON.parse(LS.get("roboRare", "{}") || "{}") || {})["skin:legend"] || {}).n >= 1;
    body.innerHTML = `${back}<div class="rp-lghero"><div class="lg-big">${X.svg("", { skin: "skin:legend" }, { noHoli: true })}</div><div class="rp-h">👑 האגדה</div>
      <div class="rp-s">הסקין הכי נדיר במשחק – <b>רק אחד בכל הישיבה!</b> מי שאוסף ראשון את כל ${st.ids.length} הגיבורים 🦸 מקבל אותו אוטומטית, וכל הישיבה מקבלת הכרזה.</div>
      <div class="rbx" style="--c:#facc15"><div class="em">${mine ? "👑" : taken ? "🔒" : "⏳"}</div><div class="t"><b>${mine ? "היא שלך! אתה האגדה 👑" : taken ? "כבר נלקחה – מישהו הגיע ראשון" : "עוד לא נלקחה – המירוץ פתוח!"}</b><small>יש לך ${have.length} מתוך ${st.ids.length} גיבורים</small></div></div></div>
      <div class="rw-sec">🦸 הגיבורים <small>מתיבת ענק 💎 (ולפעמים ממגה), מטרייד ומהשוק</small></div>
      <div class="rw-grid">${st.ids.map(id => X.card(R.ITEMS[id])).join("")}</div>`;
    wireBack(body);
    body.querySelectorAll(".rc[data-id]").forEach(b => b.onclick = () => { const it = R.ITEMS[b.dataset.id]; X.toast(`${esc(it.n)} ${X.rarTag(it.r)} – ${S.own[it.id] ? "יש לך ✅" : "עוד אין לך"}`, null, 2500); });
  }
  const wireBack = body => { const b = body.querySelector(".rp-back"); if (b) b.onclick = () => tab(body); };

  // ================= 🎰 גלגל מזל =================
  const SLICE_C = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#a855f7", "#ef4444", "#0ea5e9", "#facc15"];
  const wLabel = w => w.t === "box" ? R.BOX[w.box].em : `🔩${w.n}`;
  function wheelSvg() {
    const n = R.WHEEL.length, a = 2 * Math.PI / n, P = (r, t) => [100 + r * Math.sin(t), 100 - r * Math.cos(t)];
    return `<svg class="w" viewBox="0 0 200 200">${R.WHEEL.map((w, i) => { const [x1, y1] = P(96, i * a), [x2, y2] = P(96, (i + 1) * a), [tx, ty] = P(64, (i + .5) * a);
      return `<path d="M100 100L${x1} ${y1}A96 96 0 0 1 ${x2} ${y2}Z" fill="${SLICE_C[i % SLICE_C.length]}" stroke="#1a1040" stroke-width="2"/><text x="${tx}" y="${ty}" font-size="${w.t === "box" ? 22 : 13}" font-weight="900" fill="#fff" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(i + .5) * 360 / n} ${tx} ${ty})">${wLabel(w)}</text>`; }).join("")}<circle cx="100" cy="100" r="97" fill="none" stroke="#facc15" stroke-width="4"/></svg>`;
  }
  let spinning = false;
  function wheelPanel(body) {
    const S = X.S, ok = S.wheel !== R.ymd(Date.now());
    body.innerHTML = `${back}<div class="rp-h">🎰 גלגל מזל</div><div class="rp-s">סיבוב חינם אחד כל יום! אפשר לזכות בברגים או בתיבות – עד 💎 תיבת ענק</div>
      <div class="rp-wheel"><div class="rp-pin">🔻</div>${wheelSvg()}<div class="rp-hub">🤖</div></div>
      <button class="rbtn" type="button" id="rpSpin" style="width:100%;font-size:18px;padding:14px" ${ok ? "" : "disabled"}>${ok ? "🎰 לסובב!" : "כבר סובבת היום – נתראה מחר 🌙"}</button>
      <table class="rodds" style="margin-top:14px">${R.WHEEL.map(w => `<tr><td>${wLabel(w)} ${w.t === "box" ? R.BOX[w.box].n : "ברגים"}</td><td style="text-align:center">${Math.round(w.w / R.WHEEL.reduce((a, x) => a + x.w, 0) * 100)}%</td></tr>`).join("")}</table>`;
    wireBack(body);
    body.querySelector("#rpSpin").onclick = async () => {
      if (spinning) return; const r = R.spinWheel(X.S); if (!r) return; spinning = true; X.trk("wheel"); X.step(1); X.save();
      const b = body.querySelector("#rpSpin"); b.disabled = true; b.textContent = "מסתובב… 🌀";
      const n = R.WHEEL.length, deg = 360 * 6 + (360 - (r.i + .5) * 360 / n) + (Math.random() - .5) * (300 / n), w = body.querySelector("svg.w");
      if (X.REDUCED) w.style.transition = "none"; w.style.transform = `rotate(${deg}deg)`;
      let k = 0; const tick = setInterval(() => { if (++k > 26) return clearInterval(tick); X.SFX.tap(); }, 80 + k * 6);
      await X.sleep(X.REDUCED ? 200 : 4300); clearInterval(tick);
      const g = R.grant(X.S, r.prize); X.save(); spinning = false; X.vib([40, 30, 90]);
      X.particles(body.querySelector(".rp-wheel"), SLICE_C[r.i % SLICE_C.length], 40, r.prize.t === "box" ? [R.BOX[r.prize.box].em, "✨"] : ["🔩", "✨"]);
      if (g.t === "box") { X.SFX.gift(); X.toast(`🎰 זכית ב${R.BOX[g.box].n}! ${R.BOX[g.box].em}`, ["לפתוח", () => X.openBoxes([g.box])], 9000); } else { X.SFX.coin(); X.toast(`🎰 זכית ב-${g.n} ברגים! 🔩`, null, 4000); }
      b.textContent = "כבר סובבת היום – נתראה מחר 🌙"; X.hubRefresh();
    };
  }

  // ================= 🎁 מסך "קיבלת!" – תיבת אוצר שנפתחת, כרטיס לכל פרס, ומונה ברגים שעולה =================
  function rewardShow({ title, sub, got, before }) {
    return new Promise(async res => {
      const bolts = got.filter(g => g.t === "bolts").reduce((a, g) => a + g.n, 0), boxes = got.filter(g => g.t === "box"), items = got.filter(g => g.t === "item");
      const ov = document.createElement("div"); ov.className = "rp-lab rw-reward"; ov.style.setProperty("--c", "#facc15"); ov.style.setProperty("--n", "#facc15");
      (document.querySelector("#roboUI[open]") || document.body).appendChild(ov);
      ov.innerHTML = `<div class="lx-t">${title}</div><div class="rw-chest">💰</div><div class="rw-hint">לחץ לפתוח!</div>`;
      X.SFX.gift(); X.vib(40);
      await new Promise(r => { const go = () => { ov.removeEventListener("click", go); r(); }; ov.addEventListener("click", go); setTimeout(go, 2600); });
      ov.querySelector(".rw-chest").classList.add("pop"); X.SFX.open(); X.vib([40, 30, 100]); X.particles(ov, "#facc15", 50, ["🪙", "✨", "⭐", "🔩"]); await X.sleep(500);
      const card = g => g.t === "bolts" ? `<div class="rw-card" style="--c:#facc15"><div class="ic">🔩</div><b>+${g.n}</b><small>ברגים</small></div>`
        : g.t === "box" ? `<div class="rw-card" style="--c:${R.BOX[g.box].col}"><div class="ic">${R.BOX[g.box].em}</div><b>${esc(R.BOX[g.box].n)}</b><small>נכנסה לתיבות שלך</small></div>`
        : `<div class="rw-card" style="--c:${RC(g.r)}"><div class="ic pv">${X.preview(g.id)}</div><b>${esc(R.ITEMS[g.id].n)}</b><small>${g.dup ? `כפול → +${g.dup} 🔩` : "חדש באוסף! ✨"}</small></div>`;
      ov.className = "rp-lab res rw-reward"; ov.innerHTML = `<div class="lx-rays"></div><div class="lx-res"><div class="lx-up">🎉 קיבלת!</div>${sub ? `<div class="rw-sub">${esc(sub)}</div>` : ""}
        <div class="rw-cards">${got.map(card).join("")}</div>
        ${bolts || items.some(g => g.dup) ? `<div class="rw-count">🔩 <span id="rwCnt">${before}</span> ברגים</div>` : ""}
        <div class="rd-btns">${boxes.length ? `<button class="rbtn" type="button" data-a="open">🎁 לפתוח ${boxes.length > 1 ? `את ${boxes.length} התיבות` : "את התיבה"} עכשיו!</button><button class="rbtn alt" type="button" data-a="later">אחר כך</button>` : `<button class="rbtn" type="button" data-a="ok">יש! 🤩</button>`}</div></div>`;
      X.SFX.reveal(3); X.particles(ov, "#facc15", 40, ["🪙", "✨", "💛"]);
      const cnt = ov.querySelector("#rwCnt");
      if (cnt) { const to = X.S.bolts, t0 = performance.now(); const f = now => { const t = Math.min(1, (now - t0) / 1200); cnt.textContent = Math.round(before + (to - before) * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(f); else { cnt.parentElement.classList.add("done"); X.SFX.coin(); } }; setTimeout(() => requestAnimationFrame(f), 400); }
      ov.querySelectorAll("[data-a]").forEach(b => b.onclick = e => { e.stopPropagation(); ov.remove(); res(b.dataset.a === "open"); });
    });
  }
  // ================= 🗺️ המסע =================
  const ROW = 78;
  function mapPanel(body) {
    const S = X.S, mp = S.map || { p: 0, c: 0 }, reach = Math.min(R.MAP_N, Math.floor(mp.p / R.MAP_STEP)), N = R.MAP_N, H = (N + 1) * ROW + 30;
    const pos = i => ({ x: 50 + 30 * Math.sin(i * 0.85), y: H - 40 - i * ROW }); // מלמטה למעלה
    const per = N / R.WORLDS.length;
    const worlds = R.WORLDS.map((w, k) => { const top = pos((k + 1) * per).y - ROW / 2, bot = k === 0 ? H : pos(k * per).y - ROW / 2; return `<div class="rp-world" style="top:${top}px;height:${bot - top}px;background:linear-gradient(180deg,color-mix(in srgb,${w.c} 45%,#0e1a2e),color-mix(in srgb,${w.c} 20%,#0e1a2e))">${w.n}</div>`; }).join("");
    const pts = [pos(0)].concat(Array.from({ length: N }, (_, i) => pos(i + 1)));
    const path = `<svg style="position:absolute;inset:0;width:100%;height:${H}px" viewBox="0 0 100 ${H}" preserveAspectRatio="none"><polyline points="${pts.map(p => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" style="stroke-width:4px"/></svg>`;
    const st = Array.from({ length: N }, (_, j) => { const i = j + 1, p = pos(i), pr = R.mapPrize(i), cls = i <= mp.c ? "done" : i <= reach ? "ready" : "";
      return `<div class="rp-st ${cls}" data-i="${i}" style="left:${p.x}%;top:${p.y}px">${i <= mp.c ? "✅" : pr.some(x => x.box === "giant") ? "💎" : pr.some(x => x.box === "mega") ? "💠" : pr[0].t === "box" ? "🎁" : "💰"}<small>${i}</small></div>`; }).join("");
    const meAt = pos(Math.min(N, mp.p / R.MAP_STEP));
    const next = reach >= N ? null : (reach + 1) * R.MAP_STEP - mp.p;
    body.innerHTML = `${back}<div class="rp-h">🗺️ המסע של הרובוט</div><div class="rp-s">כל דבר שאתה עושה = צעדים: כניסה יומית 3 👣, כל תיבה 1, גלגל 1, משחק 1, מעבדה ושוק 1. כל 10 צעדים = תחנה עם אוצר!</div>
      <div class="rp-bar"><i style="width:${(mp.p % R.MAP_STEP) / R.MAP_STEP * 100}%"></i></div><div class="rw-prog">${next == null ? "🏁 הגעת לסוף המסע! אלוף!" : `👣 ${mp.p} צעדים · עוד ${next} לתחנה הבאה`}</div>
      ${reach > mp.c ? `<button class="rbtn" type="button" id="rpClaim" style="width:100%;margin-bottom:10px">💰 לפתוח את האוצר (${reach - mp.c})</button>` : ""}
      <div class="rp-map" id="rpMap"><div class="rp-map-in" style="height:${H}px">${worlds}${path}${st}<div class="rp-me" style="left:${meAt.x}%;top:${meAt.y}px">${X.svg("", null, { still: true })}</div></div></div>`;
    wireBack(body);
    const m = body.querySelector("#rpMap"); requestAnimationFrame(() => { m.scrollTop = Math.max(0, meAt.y - m.clientHeight / 2); });
    const claim = async () => {
      const before = X.S.bolts, got = [], st = []; let c; while ((c = R.mapClaim(X.S))) { st.push(c.i); got.push(...c.prize.map(p => R.grant(X.S, p))); }
      if (!got.length) return; X.save();
      const boxes = got.filter(g => g.t === "box").map(g => g.box);
      const open = await rewardShow({ title: "🗺️ מצאת אוצר!", sub: st.length > 1 ? `תחנות ${st.join(", ")} במסע` : `תחנה ${st[0]} במסע`, got, before });
      mapPanel(body); X.hubRefresh(); if (open && boxes.length) X.openBoxes(boxes);
    };
    const cb = body.querySelector("#rpClaim"); if (cb) cb.onclick = claim;
    body.querySelectorAll(".rp-st.ready").forEach(e => e.onclick = claim);
    body.querySelectorAll(".rp-st:not(.ready)").forEach(e => e.onclick = () => { const i = +e.dataset.i; X.toast(`תחנה ${i}: ${esc(R.mapPrize(i).map(X.giftText).join(" + "))}`, null, 2500); });
  }

  // ================= 🔨 מעבדה =================
  // 1) בוחרים דרגה · 2) שמים 5 אביזרים במכונה · 3) מערבבים → כולם מסתחררים ומתמזגים → יוצא אביזר אחד מהדרגה הבאה
  let labR = "c", labSel = [];
  const labOk = it => X.S.own[it.id] && X.S.own[it.id] !== -1 && !it.free && it.cat !== "theme" && it.cat !== "page" && !(X.S.shiny && X.S.shiny[it.id]);
  const LAB_RS = ["c", "r", "s", "e", "m"];
  function labPanel(body) {
    const items = R.LIST.filter(x => x.r === labR && labOk(x));
    labSel = labSel.filter(id => items.some(x => x.id === id));
    const nr = R.RK[R.RK.indexOf(labR) + 1], n = labSel.length, full = n === 5;
    const slot = i => { const id = labSel[i], a = -90 + i * 72, x = 50 + 39 * Math.cos(a * Math.PI / 180), y = 50 + 39 * Math.sin(a * Math.PI / 180);
      return `<button type="button" class="lb-slot${id ? " f" : ""}" data-slot="${i}" style="left:${x}%;top:${y}%;--c:${RC(labR)}">${id ? `<div class="pv">${X.preview(id)}</div><span class="nm">${esc(R.ITEMS[id].n)}</span><span class="x">✕</span>` : `<span class="num">${i + 1}</span>`}</button>`; };
    body.innerHTML = `${back}<div class="rp-h">🔨 המעבדה</div>
      <div class="lb-steps"><span class="${"on"}">1️⃣ בוחרים דרגה</span><span class="${n ? "on" : ""}">2️⃣ שמים 5 אביזרים</span><span class="${full ? "on" : ""}">3️⃣ מערבבים!</span></div>
      <div class="rp-rar">${LAB_RS.map(r => { const c = R.LIST.filter(x => x.r === r && labOk(x)).length; return `<button type="button" data-r="${r}" class="${labR === r ? "on" : ""}${c < 5 ? " few" : ""}" style="--c:${RC(r)}">${R.RAR[r].n} · ${c}</button>`; }).join("")}</div>
      <div class="lb-mach" style="--c:${RC(labR)};--n:${RC(nr)}">
        <div class="lb-ring">${Array.from({ length: 5 }, (_, i) => slot(i)).join("")}
          <div class="lb-pot${full ? " ready" : ""}"><div class="liq" style="height:${18 + n * 14}%"></div><div class="bub"><i></i><i></i><i></i></div><b>${n}/5</b></div></div>
        <div class="lb-arrow">⬇️ יוצא:</div>
        <div class="lb-out"><div class="q">?</div><div class="t"><b style="color:${RC(nr)}">אביזר ${R.RAR[nr].n} אקראי</b><small>מ-5 אביזרים ${R.RAR[labR].n}ים</small></div></div>
      </div>
      <div class="lb-tools"><button class="rbtn sm alt" type="button" id="lbAuto" ${items.length < 5 ? "disabled" : ""}>🎲 תבחר לי</button><button class="rbtn sm alt" type="button" id="lbClear" ${n ? "" : "disabled"}>🧹 לנקות</button></div>
      <button class="rbtn" type="button" id="rpLab" style="width:100%;font-size:18px;padding:14px" ${full ? "" : "disabled"}>${full ? "⚗️ לערבב!" : `עוד ${5 - n} אביזרים ושאפשר לערבב`}</button>
      <div class="rw-prog" style="text-align:center;margin-top:6px">⚠️ 5 האביזרים נעלמים, ובמקומם יוצא אביזר אחד נדיר יותר · אביזרים נוצצים ✨ לא נכנסים</div>
      <div class="rw-sec">👇 האביזרים ה${R.RAR[labR].n}ים שלך <small>לחיצה = לשים במכונה / להוציא</small></div>
      ${items.length ? `<div class="rw-grid">${items.map(it => X.card(it)).join("")}</div>` : `<div class="rw-prog" style="text-align:center;padding:20px 0">אין לך אביזרים ${R.RAR[labR].n}ים שאפשר לחבר – תנסה דרגה אחרת</div>`}`;
    wireBack(body);
    body.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { labR = b.dataset.r; labSel = []; labPanel(body); });
    body.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => { const id = labSel[+b.dataset.slot]; if (!id) return; labSel = labSel.filter(x => x !== id); X.SFX.tap(); labPanel(body); });
    body.querySelectorAll(".rc[data-id]").forEach(b => { const k = labSel.indexOf(b.dataset.id); if (k >= 0) { b.classList.add("pick"); b.insertAdjacentHTML("beforeend", `<span class="lb-badge">${k + 1}</span>`); }
      b.onclick = () => { const id = b.dataset.id; if (labSel.includes(id)) labSel = labSel.filter(x => x !== id); else if (labSel.length < 5) { labSel = [...labSel, id]; X.SFX.tap(); X.vib(12); } else { X.toast("המכונה מלאה – 5 זה המקסימום 🙂 לחץ על אביזר במכונה כדי להוציא", null, 2500); return; } const y = body.scrollTop; labPanel(body); body.scrollTop = y; }; });
    body.querySelector("#lbAuto").onclick = () => { const pool = items.filter(x => !labSel.includes(x.id)).sort(() => Math.random() - .5); while (labSel.length < 5 && pool.length) labSel.push(pool.pop().id); X.SFX.tap(); labPanel(body); };
    body.querySelector("#lbClear").onclick = () => { labSel = []; labPanel(body); };
    body.querySelector("#rpLab").onclick = () => { if (labSel.length === 5) labMix(body); };
  }
  async function labMix(body) {
    const sel = labSel.slice(), from = labR, r = R.labCombine(X.S, sel); if (!r.ok) { X.toast("משהו לא הסתדר 🤔", null, 3000); return; }
    labSel = []; X.trk("lab"); X.step(1); X.save();
    const PAL = ["#f472b6", "#38bdf8", "#facc15", "#4ade80", "#a78bfa"], it = R.ITEMS[r.got.id], cols = sel.map((id, i) => (R.ITEMS[id].sk || [])[1] || PAL[i]), out = RC(it.r);
    const ov = document.createElement("div"); ov.className = "rp-lab"; ov.style.setProperty("--c", RC(from)); ov.style.setProperty("--n", out); (document.querySelector("#roboUI[open]") || document.body).appendChild(ov); // בתוך החלון של הרובוט – אחרת הוא מוסתר מאחוריו
    ov.innerHTML = `<div class="lx-t">⚗️ מערבבים…</div><div class="lx-stage"><div class="lx-glow"></div><div class="lx-pot"><div class="lx-liq" style="background:conic-gradient(${cols.join(",")},${cols[0]})"></div><div class="bub"><i></i><i></i><i></i><i></i></div></div>
      ${sel.map(id => `<div class="lx-it">${X.preview(id)}</div>`).join("")}</div><div class="lx-flash"></div>`;
    const els = [...ov.querySelectorAll(".lx-it")], stage = ov.querySelector(".lx-stage"), pot = ov.querySelector(".lx-pot");
    // 1) האביזרים נכנסים למעגל
    const place = (t, rad, sc, spin) => els.forEach((e, i) => { const a = (i / 5) * Math.PI * 2 + spin - Math.PI / 2; e.style.transform = `translate(${Math.cos(a) * rad}px,${Math.sin(a) * rad}px) scale(${sc})`; e.style.opacity = String(Math.min(1, .25 + sc)); });
    place(0, 130, 1, 0); await X.sleep(60); ov.classList.add("in"); X.SFX.up(1); await X.sleep(700);
    // 2) מסתחררים מהר יותר ויותר, נשאבים פנימה, הצבעים מתערבבים
    const T = X.REDUCED ? 300 : 2300, t0 = performance.now(); let lastTick = 0;
    await new Promise(res => { const f = now => { const t = Math.min(1, (now - t0) / T), e = t * t * (3 - 2 * t), spin = e * Math.PI * 7, rad = 130 * (1 - e) + 6, sc = 1 - e * .8;
      place(t, rad, sc, spin); pot.style.transform = `scale(${1 + Math.sin(now / 60) * .04 * t + t * .15}) rotate(${Math.sin(now / 40) * 6 * t}deg)`;
      stage.style.setProperty("--mix", cols[Math.floor(now / 160) % cols.length]);
      if (now - lastTick > 260 - t * 200) { lastTick = now; X.SFX.tap(); if (t > .4) X.vib(10); if (!X.REDUCED && Math.random() < .5) X.particles(stage, cols[Math.floor(Math.random() * 5)], 3); }
      if (t < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    // 3) בום!
    els.forEach(e => e.remove()); ov.classList.add("boom"); X.SFX.open(); X.vib([40, 30, 120]); X.particles(stage, out, 60, ["✨", "⭐", "💫"]);
    await X.sleep(650);
    // 4) מה יצא
    const wear = ["skin", "hat", "eyes", "held", "aura", "trail", "quote"].includes(it.cat);
    ov.className = "rp-lab res" + (R.RAR[it.r].o >= 4 ? " big" : ""); ov.innerHTML = `<div class="lx-rays"></div><div class="lx-res">
      <div class="lx-up">⬆️ שודרג מ${R.RAR[from].n} ל${R.RAR[it.r].n}!</div>
      <div class="lx-card" style="--c:${out}"><div class="pv">${X.preview(it.id, false)}</div><div class="nm">${esc(it.n)}</div>${X.rarTag(it.r)}<div class="sub">${r.got.shinyNew ? "✨ גרסה נוצצת!" : r.got.dup ? `כבר היה לך → +${r.got.dup} 🔩` : "✨ חדש באוסף!"}</div></div>
      <div class="lx-sum"><div class="lbl">שמת במכונה</div><div class="lx-row">${sel.map(id => `<i class="lx-i">${X.preview(id)}</i>`).join("")}</div><div class="eq">⬇️</div><div class="lbl">קיבלת</div><div class="lx-row"><i class="lx-i got">${X.preview(it.id)}</i></div></div>
      <div class="rd-btns">${wear && !r.got.dup ? `<button class="rbtn" type="button" data-a="wear">👕 ללבוש עכשיו</button>` : ""}<button class="rbtn alt" type="button" data-a="again">🔨 עוד פעם</button><button class="rbtn alt" type="button" data-a="close">סגור</button></div></div>`;
    X.SFX.reveal(R.RAR[it.r].o); X.particles(ov, out, R.RAR[it.r].o >= 4 ? 70 : 40, R.RAR[it.r].o >= 4 ? ["⭐", "✨", "💛"] : null);
    const a = await new Promise(res => ov.querySelectorAll("[data-a]").forEach(b => b.onclick = () => res(b.dataset.a)));
    if (a === "wear") { R.equip(X.S, it.id); X.trk("wear"); X.save(); X.toast(`👕 הרובוט לובש עכשיו ${esc(it.n)}!`, null, 2500); }
    ov.remove(); labR = a === "again" ? from : labR; labPanel(body); X.hubRefresh(); try { X.draw(); } catch (e) {}
  }

  // ================= 🎭 סטים =================
  function setsPanel(body) {
    const S = X.S;
    body.innerHTML = `${back}<div class="rp-h">🎭 סטים</div><div class="rp-s">אוספים סדרה שלמה → פרס גדול (פעם אחת לכל סט). אביזרים ששמת בשוק לא נספרים עד שהם חוזרים</div>` + R.SETS.map(st => {
      const have = st.ids.filter(id => S.own[id] && S.own[id] !== -1).length, done = !!(S.sets || {})[st.id];
      return `<div class="rp-set ${done ? "done" : ""}"><b>${esc(st.n)}</b> <small style="color:#c7c3ff">${have}/${st.ids.length}${done ? " · ✅ הושלם!" : ""}</small><div class="rp-bar" style="margin:6px 0"><i style="width:${have / st.ids.length * 100}%"></i></div>
        <div class="its">${st.ids.map(id => `<span class="${S.own[id] && S.own[id] !== -1 ? "" : "no"}" title="${esc(R.ITEMS[id].n)}">${X.preview(id)}</span>`).join("")}</div><small style="color:#fde68a">🎁 ${esc(st.prize.map(X.giftText).join(" + "))}</small></div>`;
    }).join("");
    wireBack(body);
  }

  // ================= 🕵️ שוק =================
  let mkSeg = "buy", mkData = null;
  const mkOk = it => X.S.own[it.id] && X.S.own[it.id] !== -1 && !it.free;
  async function marketPanel(body, fresh = true) {
    if (fresh) { X.trk("market"); X.save(); }
    body.innerHTML = `${back}<div class="rp-h">🕵️ השוק</div><div class="rw-prog" style="text-align:center;padding:24px 0">⏳ טוען…</div>`; wireBack(body);
    if (!X.online()) { body.querySelector(".rw-prog").textContent = window.__DEMO ? "בדמו אין שוק 🙂" : "צריך להירשם קודם"; return; }
    if (fresh || !mkData) { try { mkData = await X.api({ op: "marketList" }); } catch (e) { mkData = null; } }
    if (!mkData || !mkData.ok || !Array.isArray(mkData.list)) { body.querySelector(".rw-prog").textContent = mkData && mkData.error === "not_registered" ? "עוד רגע… האפליקציה נרשמת בשרת. נסה שוב בעוד דקה 🙂" : "אין חיבור כרגע 📶 נסה שוב"; return; }
    drawMarket(body);
  }
  function drawMarket(body) {
    const S = X.S, j = mkData, mine = Array.isArray(j.mine) ? j.mine : [], open = mine.filter(x => x.st === "open");
    const row = (x, btn, sub) => { const it = R.ITEMS[x.item]; if (!it) return ""; return `<div class="rp-mk" style="--c:${RC(it.r)}"><div class="pv">${X.preview(it.id)}</div><div class="t"><b>${esc(it.n)}</b> ${X.rarTag(it.r)}<br><small>${sub}</small></div>${btn}</div>`; };
    body.innerHTML = `${back}<div class="rp-h">🕵️ השוק</div><div class="rp-s">מוכרים אביזר במחיר קבוע (בטווח של הדרגה), וכל מי בשכבה יכול לקנות. עד ${j.max || 5} אביזרים בשוק בבת אחת. 🔩 יש לך ${X.bl()}</div>
      <div class="rp-seg"><button type="button" data-s="buy" class="${mkSeg === "buy" ? "on" : ""}">🛍️ לקנות (${j.list.length})</button><button type="button" data-s="sell" class="${mkSeg === "sell" ? "on" : ""}">💰 למכור (${open.length}/${j.max || 5})</button></div>
      <div id="rpMk"></div>`;
    wireBack(body);
    body.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { mkSeg = b.dataset.s; drawMarket(body); });
    const el = body.querySelector("#rpMk");
    if (mkSeg === "buy") {
      el.innerHTML = j.list.length ? j.list.map(x => { const own = S.own[x.item], poor = S.bolts < x.price;
        return row(x, `<button class="rbtn sm" type="button" data-buy="${x.id}" ${own || poor ? "disabled" : ""}>${own ? "יש לך" : `🔩 ${x.price}`}</button>`, `${esc(x.kid)}${x.cls ? " · " + esc(X.CLS_L(x.cls)) : ""}${x.rn ? ` · 🤖 ${esc(x.rn)}` : ""}`); }).join("")
        : `<div class="rw-prog" style="text-align:center;padding:20px 0">השוק ריק כרגע 🕸️ תהיה הראשון למכור!</div>`;
      el.querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => {
        const x = j.list.find(z => z.id === b.dataset.buy), it = x && R.ITEMS[x.item]; if (!it) return;
        if (X.S.bolts < x.price) { X.toast(`חסרים לך ${x.price - X.S.bolts} ברגים 🔩`, null, 3000); return; }
        if (!confirm(`לקנות "${it.n}" מ${x.kid} ב-${x.price} ברגים?`)) return;
        b.disabled = true; let r; try { r = await X.api({ op: "marketBuy", id: x.id }); } catch (e) { r = { ok: false, error: "net" }; }
        if (!r || !r.ok) { X.toast(r && r.error === "gone" ? "אוי, מישהו קנה את זה לפניך 😅" : "לא הצלחתי – נסה שוב 📶", null, 3500); marketPanel(body); return; }
        X.S.bolts -= x.price; R.grant(X.S, { t: "item", id: x.item, r: it.r }); X.step(1); X.save(); X.SFX.coin(); X.celebrateItem(x.item); marketPanel(body);
      });
    } else {
      const canSell = R.LIST.filter(mkOk);
      el.innerHTML = (open.length < (j.max || 5) ? `<button class="rbtn" type="button" id="rpSell" style="width:100%;margin-bottom:12px" ${canSell.length ? "" : "disabled"}>➕ למכור אביזר</button>` : `<div class="rw-prog">יש לך ${open.length} אביזרים בשוק – המקסימום. בטל אחד או חכה שיימכר</div>`)
        + (mine.length ? mine.map(x => row(x, x.st === "open" ? `<button class="rbtn sm alt" type="button" data-cancel="${x.id}">לבטל</button>` : "", x.st === "open" ? `🔩 ${x.price} · מחכה לקונה ⏳` : x.st === "sold" ? `✅ נמכר ב-${x.price} 🔩` : "בוטל – חזר לארון")).join("") : `<div class="rw-prog" style="text-align:center;padding:14px 0">עוד לא מכרת כלום</div>`);
      el.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => {
        b.disabled = true; let r; try { r = await X.api({ op: "marketCancel", id: b.dataset.cancel }); } catch (e) { r = null; }
        if (r && r.ok && R.ITEMS[r.item]) { if (!X.S.own[r.item]) X.S.own[r.item] = Date.now(); if (X.S.mkt) delete X.S.mkt[b.dataset.cancel]; X.save(); X.toast(`↩️ ${esc(R.ITEMS[r.item].n)} חזר לארון שלך`, null, 3000); }
        else X.toast(r && r.error === "gone" ? "כבר נמכר! 🎉 הברגים בדרך אליך" : "לא הצלחתי – נסה שוב 📶", null, 3500);
        marketPanel(body);
      });
      const sb = el.querySelector("#rpSell"); if (sb) sb.onclick = () => sellPick(body);
    }
  }
  function sellPick(body) {
    const S = X.S; let cat = "skin";
    const draw = () => {
      const its = R.LIST.filter(x => x.cat === cat && mkOk(x)).sort((a, b) => R.RAR[b.r].o - R.RAR[a.r].o);
      body.innerHTML = `<button type="button" class="rp-back">→ חזרה לשוק</button><div class="rp-h">💰 מה למכור?</div><div class="rp-s">האביזר יוצא מהארון שלך עד שמישהו קונה (או שאתה מבטל)</div>
        <div class="rw-cats">${Object.entries(R.CATS).map(([k, l]) => `<button type="button" data-c="${k}" class="${cat === k ? "on" : ""}">${l}</button>`).join("")}</div>
        ${its.length ? `<div class="rw-grid">${its.map(it => X.card(it)).join("")}</div>` : `<div class="rw-prog" style="text-align:center;padding:20px 0">אין לך פה מה למכור</div>`}`;
      body.querySelector(".rp-back").onclick = () => drawMarket(body);
      body.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { cat = b.dataset.c; draw(); });
      body.querySelectorAll(".rc[data-id]").forEach(b => b.onclick = () => sellPrice(body, b.dataset.id));
    };
    draw();
  }
  function sellPrice(body, id) {
    const it = R.ITEMS[id], [lo, hi] = R.PRICE[it.r], sug = Math.min(hi, lo * 2);
    body.innerHTML = `<button type="button" class="rp-back">→ חזרה</button><div class="rp-h">💰 כמה זה עולה?</div>
      <div class="rp-mk" style="--c:${RC(it.r)}"><div class="pv">${X.preview(id)}</div><div class="t"><b>${esc(it.n)}</b> ${X.rarTag(it.r)}<br><small>מחיר ל${R.RAR[it.r].n}: בין ${lo} ל-${hi} ברגים</small></div></div>
      <div class="rp-pbig">🔩 <span id="rpPv">${sug}</span></div><input class="rp-price" type="range" id="rpP" min="${lo}" max="${hi}" step="${hi > 1000 ? 50 : hi > 300 ? 10 : 5}" value="${sug}">
      ${X.S.shiny && X.S.shiny[id] ? `<div class="rw-prog">⚠️ זה אביזר נוצץ ✨ – בשוק הוא נמכר כרגיל (הנצנוץ לא עובר)</div>` : ""}
      <button class="rbtn" type="button" id="rpGo" style="width:100%;margin-top:10px">🕵️ לשים בשוק</button>`;
    body.querySelector(".rp-back").onclick = () => sellPick(body);
    const rg = body.querySelector("#rpP"), pv = body.querySelector("#rpPv"); rg.oninput = () => { pv.textContent = rg.value; };
    body.querySelector("#rpGo").onclick = async e => {
      const price = +rg.value; e.target.disabled = true; let r; try { r = await X.api({ op: "marketSell", item: id, r: it.r, price }); } catch (er) { r = null; }
      if (!r || !r.ok) { X.toast(r && r.error === "max" ? "כבר יש לך 5 אביזרים בשוק" : "לא הצלחתי – נסה שוב 📶", null, 3500); e.target.disabled = false; return; }
      const S = X.S; delete S.own[id]; for (const k of Object.keys(S.eq)) if (S.eq[k] === id) delete S.eq[k]; if (!S.eq.skin) S.eq.skin = "skin:classic"; if (S.shiny) delete S.shiny[id];
      S.mkt = S.mkt || {}; S.mkt[r.id] = id; X.step(1); X.save(); X.SFX.coin(); X.toast(`🕵️ ${esc(it.n)} בשוק ב-${price} ברגים! נודיע לך כשמישהו קונה`, null, 5000);
      mkSeg = "sell"; marketPanel(body);
    };
  }

  // ================= 📚 בונוסים: ציון טוב / שבוע בלי איחורים (נבדק רק בטלפון) =================
  function bonusPanel(body) {
    const S = X.S, M = window.Mashov, conn = !!(M && M.data && M.data());
    body.innerHTML = `${back}<div class="rp-h">📚 בונוסים על לימודים</div><div class="rp-s">הבדיקה נעשית רק בטלפון שלך – הציונים והחיסורים לא נשלחים לשום מקום 🔒</div>
      <div class="rbx" style="--c:#14b8a6"><div class="em">💠</div><div class="t"><b>ציון 90 ומעלה = תיבת מגה</b><small>ציון 100 = 💎 תיבת ענק! (על כל ציון חדש שמגיע ממשוב)</small></div></div>
      <div class="rbx" style="--c:#f59e0b"><div class="em">⏰</div><div class="t"><b>שבוע בלי איחורים וחיסורים = 🎁 תיבה גדולה</b><small>נבדק אחרי שהשבוע נגמר (ראשון–חמישי), כשמשוב מתעדכן</small></div></div>
      ${conn ? `<div class="rw-prog">✅ משוב מחובר${S.gBox ? ` · קיבלת כבר ${S.gBox} תיבות על ציונים` : ""}${S.wBox ? ` · ${S.wBox} שבועות מושלמים` : ""}</div>` : `<div class="rw-prog">כדי לקבל את הבונוסים צריך לחבר את משוב (בדף הבית → נוכחות וציונים)</div>`}`;
    wireBack(body);
  }
  function gradeBoxes() {
    const M = window.Mashov; if (!M || !M.data || !X.profile()) return; const D = M.data(); if (!D || !Array.isArray(D.grades)) return;
    const S = X.S, key = g => hash([g.date, g.subject, g.event, g.grade].join("|"));
    if (!Array.isArray(S.gSeen)) { S.gSeen = D.grades.map(key).slice(-600); X.save(); return; } // פעם ראשונה: לא מציפים על ציונים ישנים
    const seen = new Set(S.gSeen), got = [];
    for (const g of D.grades) { const k = key(g); if (seen.has(k)) continue; seen.add(k); S.gSeen.push(k); const n = parseFloat(String(g.grade).replace(/[^\d.]/g, "")); if (n >= 100) got.push("giant"); else if (n >= 90) got.push("mega"); }
    S.gSeen = S.gSeen.slice(-600);
    const give = got.slice(0, 3); for (const b of give) S.boxes.push(b); S.gBox = (S.gBox || 0) + give.length; X.save();
    if (give.length) setTimeout(() => { X.SFX.gift(); X.toast(`📚 ציון מעולה! קיבלת ${give.map(b => R.BOX[b].em + " " + R.BOX[b].n).join(" + ")}`, ["לפתוח", () => X.openBoxes(give)], 10000); }, 2500);
  }
  function weekBox() {
    const M = window.Mashov, A = window.Absences; if (!M || !M.data || !A || !A.behaviorKind || !X.profile()) return;
    const D = M.data(); if (!D || !D.at || D.partial || !Array.isArray(D.behave)) return;
    const S = X.S, today = R.ymd(Date.now()), sun = R.add(today, -R.dow(today) - 7), thu = R.add(sun, 4);
    if (S.weekOk === sun) return;
    const at = Date.parse(D.at); if (!(at > 0) || R.ymd(at) <= thu) return; // צריך נתונים מאחרי שהשבוע נגמר
    let days = 0; for (let i = 0; i < 5; i++) { const dt = new Date(R.add(sun, i) + "T12:00:00"); try { if (typeof vacationOf === "function" && vacationOf(dt)) continue; } catch (e) {} days++; }
    S.weekOk = sun;
    const bad = D.behave.some(e => e && e.date >= sun && e.date <= thu && ["late", "absence"].includes(A.behaviorKind(e)));
    if (days >= 3 && !bad) { S.boxes.push("big"); S.wBox = (S.wBox || 0) + 1; X.save(); setTimeout(() => { X.SFX.gift(); X.toast("⏰ <b>שבוע שלם בלי איחורים וחיסורים!</b> קיבלת 🎁 תיבה גדולה", ["לפתוח", () => X.openBoxes(["big"])], 10000); }, 4000); }
    else X.save();
  }
  function mashovRewards() { if (X.locked()) return; try { gradeBoxes(); weekBox(); } catch (e) {} }

  // ================= 🎮 ברגים נופלים =================
  // 🔩 בורג = 1 · 🌟 זהב = 5 · 🎁 אביזר · 💣 פצצה = כל הסיבוב נעלם · 🦹 גנב = לוקח חצי מהסיבוב
  // כוחות: 🧲 מגנט · 🛡️ מגן (מציל מפצצה/גנב אחד) · 🐢 הילוך איטי · ⚡ כפול. קומבו כל 10 תפיסות ברצף = בונוס. ככל שהזמן עובר – יותר מהר ויותר מסוכן
  const ITEM_R = [["r", 60], ["s", 30], ["e", 10]];
  const POW = { magnet: { em: "🧲", n: "מגנט", c: "#f43f5e", t: 6 }, shield: { em: "🛡️", n: "מגן", c: "#38bdf8", t: 0 }, slow: { em: "🐢", n: "איטי", c: "#22c55e", t: 5 }, double: { em: "⚡", n: "כפול", c: "#facc15", t: 6 } };
  // 🔊 צלילים של המשחק (מכבדים את כפתור ההשתקה)
  const AU = (() => {
    let ac; const ctx = () => { if (X.SFX.muted && X.SFX.muted()) return null; try { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; } };
    const tone = (f, t, dur, type = "sine", vol = .14, to = 0) => { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t; o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + .05); };
    const noise = (t, dur, vol = .3) => { const c = ctx(); if (!c) return; const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g).connect(c.destination); s.start(c.currentTime + t); };
    return {
      pick(k) { tone(700 + Math.min(k, 40) * 22, 0, .08, "triangle", .11); },
      gold() { [0, .06, .12].forEach((t, i) => tone(1046 + i * 260, t, .14, "triangle", .12)); },
      boom() { noise(0, .8, .55); tone(140, 0, .7, "sawtooth", .25, 30); },
      thief() { [0, .09, .18, .27].forEach((t, i) => tone(620 - i * 110, t, .1, "square", .07)); },
      power() { [0, .05, .1, .15].forEach((t, i) => tone(660 * Math.pow(1.26, i), t, .12, "sine", .14)); },
      combo(n) { [0, .07, .14, .21].forEach((t, i) => tone(523 * Math.pow(1.19, i + Math.min(6, n / 10)), t, .2, "triangle", .14)); noise(0, .3, .08); },
      shield() { tone(300, 0, .35, "sine", .2, 1000); },
      item() { [0, .08, .16].forEach((t, i) => tone(880 * Math.pow(1.33, i), t, .2, "sine", .15)); },
    };
  })();
  // 🎨 ציורים מוכנים מראש (בהירים וזוהרים – רואים אותם טוב על כל טלפון)
  const SPR = {};
  function sprite(key, s, fn) { const k = key + "|" + s; if (SPR[k]) return SPR[k]; const dp = Math.min(2, window.devicePixelRatio || 1), P = s * 2, c = document.createElement("canvas"); c.width = c.height = Math.ceil(P * dp); const x = c.getContext("2d"); x.scale(dp, dp); x.translate(P / 2, P / 2); fn(x, s); return (SPR[k] = c); }
  const halo = (x, s, col) => { const g = x.createRadialGradient(0, 0, s * .15, 0, 0, s); g.addColorStop(0, col); g.addColorStop(.55, col.replace(/[\d.]+\)$/, m => (parseFloat(m) * .45) + ")")); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); };
  const emo = (x, e, s) => { x.font = `${Math.round(s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(e, 0, s * .08); };
  const txt = (x, t, s, col = "#fff") => { x.font = `900 ${Math.round(s)}px system-ui,sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = col; x.fillText(t, 0, 1); };
  function nut(x, s, gold) {
    halo(x, s, gold ? "rgba(253,224,71,.85)" : "rgba(125,211,252,.7)");
    x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; x.lineTo(Math.cos(a) * s * .6, Math.sin(a) * s * .6); } x.closePath();
    const g = x.createLinearGradient(-s * .5, -s * .5, s * .5, s * .5); g.addColorStop(0, gold ? "#fffbe0" : "#ffffff"); g.addColorStop(1, gold ? "#f59e0b" : "#94a3b8"); x.fillStyle = g; x.fill(); x.lineWidth = 2.5; x.strokeStyle = gold ? "#fff7c2" : "#e0f2fe"; x.stroke();
    x.beginPath(); x.arc(0, 0, s * .2, 0, 7); x.fillStyle = gold ? "#92400e" : "#334155"; x.fill();
    if (gold) txt(x, "5", s * .34, "#fff");
  }
  function bombDraw(x, s) {
    halo(x, s, "rgba(239,68,68,.9)");
    x.beginPath(); x.arc(0, s * .08, s * .44, 0, 7); const g = x.createRadialGradient(-s * .15, -s * .08, 2, 0, 0, s * .46); g.addColorStop(0, "#94a3b8"); g.addColorStop(1, "#020617"); x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = "#f87171"; x.stroke();
    x.strokeStyle = "#fbbf24"; x.lineWidth = 3.5; x.beginPath(); x.moveTo(s * .14, -s * .3); x.quadraticCurveTo(s * .3, -s * .62, s * .5, -s * .55); x.stroke();
    x.fillStyle = "#fde047"; x.beginPath(); x.arc(s * .52, -s * .56, s * .12, 0, 7); x.fill(); txt(x, "!", s * .45, "#f87171");
  }
  // 🦹 גנב: ראש עם מסכה שחורה וכובע גרב + שק כסף (מצויר – לא תלוי באימוג'י)
  const thiefDraw = (x, s) => {
    halo(x, s, "rgba(217,70,239,.95)");
    x.fillStyle = "#fcd9b6"; x.beginPath(); x.arc(0, s * .05, s * .42, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = "#f0abfc"; x.stroke();
    x.fillStyle = "#1f2937"; x.beginPath(); x.arc(0, -s * .05, s * .43, Math.PI * 1.05, Math.PI * 1.95); x.fill(); x.fillRect(-s * .43, -s * .22, s * .86, s * .08);
    x.fillStyle = "#ef4444"; x.beginPath(); x.arc(0, -s * .5, s * .09, 0, 7); x.fill();
    x.fillStyle = "#0b0b12"; x.fillRect(-s * .44, -s * .04, s * .88, s * .2); x.fillStyle = "#fff"; x.beginPath(); x.arc(-s * .17, s * .06, s * .07, 0, 7); x.arc(s * .17, s * .06, s * .07, 0, 7); x.fill();
    x.strokeStyle = "#7c2d12"; x.lineWidth = 2.5; x.beginPath(); x.arc(0, s * .3, s * .12, .2, Math.PI - .2); x.stroke();
    x.fillStyle = "#a16207"; x.beginPath(); x.arc(s * .55, s * .35, s * .22, 0, 7); x.fill(); x.save(); x.translate(s * .55, s * .37); txt(x, "$", s * .26, "#fde047"); x.restore();
  };
  // 🎁 מתנה מצוירת בצבע של הדרגה
  const itemDraw = r => (x, s) => {
    halo(x, s, RC(r)); const c = RC(r), w = s * .78;
    x.fillStyle = c; x.fillRect(-w / 2, -w / 2 + s * .1, w, w * .85); x.lineWidth = 2.5; x.strokeStyle = "#fff"; x.strokeRect(-w / 2, -w / 2 + s * .1, w, w * .85);
    x.fillStyle = "#fff"; x.fillRect(-s * .07, -w / 2 + s * .1, s * .14, w * .85); x.fillRect(-w / 2, -s * .02, w, s * .12);
    x.strokeStyle = "#fff"; x.lineWidth = 3; x.beginPath(); x.ellipse(-s * .14, -s * .38, s * .14, s * .09, -.5, 0, 7); x.ellipse(s * .14, -s * .38, s * .14, s * .09, .5, 0, 7); x.stroke();
  };
  // כוחות: עיגול בצבע + סימן מצויר + אימוג'י מעל
  const POW_ICON = { magnet: (x, s) => { x.strokeStyle = "#f43f5e"; x.lineWidth = s * .16; x.beginPath(); x.arc(0, -s * .02, s * .2, Math.PI, 0); x.stroke(); x.fillStyle = "#e5e7eb"; x.fillRect(-s * .28, -s * .04, s * .16, s * .18); x.fillRect(s * .12, -s * .04, s * .16, s * .18); },
    shield: (x, s) => { x.fillStyle = "#38bdf8"; x.beginPath(); x.moveTo(0, -s * .3); x.lineTo(s * .26, -s * .18); x.quadraticCurveTo(s * .24, s * .2, 0, s * .32); x.quadraticCurveTo(-s * .24, s * .2, -s * .26, -s * .18); x.closePath(); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke(); },
    slow: (x, s) => { x.fillStyle = "#22c55e"; x.beginPath(); x.ellipse(0, s * .04, s * .28, s * .2, 0, Math.PI, 0); x.fill(); x.fillRect(-s * .3, s * .04, s * .6, s * .06); x.beginPath(); x.arc(s * .32, s * .02, s * .08, 0, 7); x.fill(); },
    double: (x, s) => { x.fillStyle = "#facc15"; x.beginPath(); x.moveTo(s * .06, -s * .34); x.lineTo(-s * .18, s * .04); x.lineTo(0, s * .04); x.lineTo(-s * .06, s * .34); x.lineTo(s * .2, -s * .06); x.lineTo(s * .02, -s * .06); x.closePath(); x.fill(); } };
  const powDraw = (p, k) => (x, s) => { halo(x, s, p.c); x.beginPath(); x.arc(0, 0, s * .5, 0, 7); x.fillStyle = "#0f172a"; x.fill(); x.lineWidth = 3.5; x.strokeStyle = p.c; x.stroke(); POW_ICON[k](x, s); };

  function gamePanel(body) {
    const S = X.S, bs = breakState(), g = S.game && S.game.d === R.ymd(Date.now()) ? S.game : { n: 0, it: 0 }, left = R.GAME_CAP - g.n, best = S.gameBest || 0;
    body.innerHTML = `${back}<div class="rp-h">🔩 ברגים נופלים</div>
      <div class="gm-rules"><span>🔩 = 1</span><span>🌟 = 5</span><span>🎁 = אביזר (מהיר!)</span><span class="bad">💣 = כל הסיבוב נעלם!</span><span class="bad">🦹 גנב = לוקח חצי!</span><span class="bad">🔒 מעל 250 – אין יציאה עד 300 או פצצה!</span><span>🧲 מגנט</span><span>🛡️ מגן</span><span>🐢 איטי</span><span>⚡ כפול</span><span>🔥 קומבו = בונוס</span></div>
      <div class="rp-s">ככל שהזמן עובר – הכל נופל יותר מהר ויש יותר פצצות וגנבים 😈 אפשר לצאת עם הכסף מתי שרוצים ולהתחיל סיבוב חדש.</div>
      <div class="rbx" style="--c:#f59e0b"><div class="em">📊</div><div class="t"><b>היום: ${g.n}/${R.GAME_CAP} 🔩 · ${g.it}/${R.GAME_ITEMS} 🎁${best ? ` · 🏆 שיא: ${best}` : ""}</b><small>${bs.free ? "אפשר לשחק עכשיו 🎉" : bs.open ? (bs.until != null ? `הפסקה! עד ${hhmm(bs.until)}` : "אפשר לשחק עכשיו 🎉") : `🔒 עכשיו שיעור – נפתח בהפסקה (${hhmm(bs.until)})`}</small></div></div>
      <button class="rbtn" type="button" id="rpPlay" style="width:100%;font-size:18px;padding:14px" ${bs.open && left > 0 ? "" : "disabled"}>${left <= 0 ? "סיימת להיום 💪 נתראה מחר" : bs.open ? "▶️ לשחק!" : "🔒 רק בהפסקות"}</button>
      <p class="rw-prog" style="margin-top:12px">⏰ המשחק פתוח רק בהפסקות לפי המערכת שלך (עד 16:15). אחרי 16:15, בשישי ובחופשות – פתוח תמיד.</p>`;
    wireBack(body);
    const p = body.querySelector("#rpPlay"); if (p) p.onclick = () => play();
  }
  let game = null;
  async function play() {
    const d = X.dlg("roboGame", "game"); d.dataset.lock = "1";
    d.innerHTML = `<div class="gm"><div class="gm-top"><button class="x" type="button" aria-label="סגור">✕</button><span id="gmR">🔩 0</span><span id="gmI">🎁 0</span><span id="gmL"></span><span style="flex:1"></span><span id="gmT"></span></div>
      <div class="gm-cv"><canvas></canvas></div><div class="gm-foot"><button class="rbtn gm-cash" type="button" id="gmCash">💰 לצאת עם הכסף</button><button class="rbtn alt gm-exit" type="button" id="gmExit">🚪 יציאה</button></div></div>`;
    X.show(d);
    const cv = d.querySelector("canvas"), box = d.querySelector(".gm-cv"), cx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    // גודל המשחק: נמדד כל הזמן (טלפונים שהמסך שלהם משתנה / נפתח לאט) – אם משהו לא נמדד, משתמשים בגודל החלון
    let W = 0, H = 0;
    const fit = () => { let w = box.clientWidth, h = box.clientHeight; if (w < 100) w = Math.min(560, innerWidth); if (h < 150) h = Math.max(300, innerHeight - 150); if (w === W && h === H) return; W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); let ro = null; try { ro = new ResizeObserver(fit); ro.observe(box); } catch (e) {} addEventListener("resize", fit);
    const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(X.svg("", null, { still: true }).replace('class="abot', 'width="160" height="160" class="abot'));
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + .4, v: Math.random() * .5 + .2 }));
    const G = game = { run: true, px: W / 2, tx: W / 2, obj: [], fx: [], parts: [], bolts: 0, items: [], t: 0, over: false, dead: false, combo: 0, bestCombo: 0, pw: {}, shield: false, shake: 0, stolen: 0 };
    const S = X.S, today = () => (S.game && S.game.d === R.ymd(Date.now()) ? S.game : { n: 0, it: 0 });
    const left = () => R.GAME_CAP - today().n, itemsLeft = () => R.GAME_ITEMS - today().it - G.items.length;
    // 🔒 מעל 250 בסיבוב: אין יציאה – חייבים להמשיך עד 300 (נשמר לבד) או עד פצצה
    const LOCK = 250, locked = () => G.bolts > LOCK && !G.over && !G.dead;
    const hud = () => {
      d.querySelector("#gmR").textContent = `🔩 ${G.bolts}`; d.querySelector("#gmI").textContent = `🎁 ${G.items.length}`; d.querySelector("#gmL").textContent = `נשאר היום: ${Math.max(0, left() - G.bolts)}`;
      const L = locked(), cb = d.querySelector("#gmCash"), xb = d.querySelector(".x");
      cb.textContent = L ? `🔒 אין יציאה! עד ${left()} או פצצה 😈 (${G.bolts})` : `💰 לצאת עם הכסף (${G.bolts}${G.items.length ? " + " + G.items.length + " 🎁" : ""})`; cb.classList.toggle("lock", L); xb.classList.toggle("lock", L); xb.textContent = L ? "🔒" : "✕"; const eb = d.querySelector("#gmExit"); eb.classList.toggle("lock", L); eb.textContent = L ? "🔒" : "🚪 יציאה";
      if (L && !G.lockShown) { G.lockShown = 1; AU.thief(); X.vib([60, 40, 60]); G.shake = .4; fxText(W / 2, H * .35, "🔒 עברת 250! אין יציאה – עד 300 או פצצה!", "#f87171", 2.6, 19); }
      if (!L) G.lockShown = 0;
    };
    const lockedMsg = () => { fxText(W / 2, H * .45, "🔒 אי אפשר לצאת! רק 300 או פצצה 😈", "#f87171", 1.4, 18); X.vib(40); };
    const move = e => { const r = box.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; G.tx = Math.max(30, Math.min(W - 30, p.clientX - r.left)); };
    box.addEventListener("pointerdown", move); box.addEventListener("pointermove", move); box.addEventListener("touchmove", e => { move(e); e.preventDefault(); }, { passive: false });
    const key = e => { if (e.key === "ArrowLeft") G.tx = Math.max(30, G.tx - 45); if (e.key === "ArrowRight") G.tx = Math.min(W - 30, G.tx + 45); }; addEventListener("keydown", key);
    const overlay = (html, btns) => new Promise(res => { const o = document.createElement("div"); o.className = "gm-ov"; o.innerHTML = `<div>${html}<div class="rd-btns">${btns.map((b, i) => `<button class="rbtn${i ? " alt" : ""}" type="button" data-i="${i}">${b}</button>`).join("")}</div></div>`; box.appendChild(o); o.querySelectorAll("button").forEach(b => b.onclick = () => { o.remove(); res(+b.dataset.i); }); });
    const finish = () => { G.run = false; game = null; removeEventListener("keydown", key); removeEventListener("resize", fit); try { ro && ro.disconnect(); } catch (e) {} delete d.dataset.lock; d.close(); X.hubRefresh(); if (host && host.isConnected) gamePanel(host); };
    const newRound = () => { Object.assign(G, { obj: [], parts: [], fx: [], bolts: 0, items: [], t: 0, nb: .35, nbomb: 1.6 + Math.random(), nthief: 7 + Math.random() * 4, npow: 6 + Math.random() * 5, nitem: 10 + Math.random() * 10, over: false, dead: false, fullShown: 0, combo: 0, bestCombo: 0, pw: {}, shield: false, shake: 0, stolen: 0 }); hud(); fit(); last = performance.now(); requestAnimationFrame(loop); };
    const bank = async (why) => {
      G.over = true; const caught = G.bolts, items = G.items.slice(), r = R.gameBank(X.S, G.bolts, items); if (r.bolts) X.trk("game"); if (caught >= 40) X.trk("game40");
      if (caught > (X.S.gameBest || 0)) X.S.gameBest = caught;
      if (r.bolts || r.items.length) X.step(1); X.save(); X.SFX.coin(); X.vib(40);
      const it = r.items.map(g => `<div style="margin:4px 0">${R.ITEMS[g.id] ? `✨ ${esc(R.ITEMS[g.id].n)} ${X.rarTag(g.r)}${g.dup ? ` (כפול → +${g.dup} 🔩)` : ""}` : ""}</div>`).join("");
      const more = breakState().open && r.left > 0;
      const i = await overlay(`<div class="big">${why === "bell" ? "🔔" : why === "win" ? "🏆" : "💰"}</div><h3>${why === "bell" ? "ההפסקה נגמרה!" : why === "win" ? "ניצחת!!! שרדת עד הסוף!" : "שמרת!"}</h3><p>+${r.bolts} ברגים 🔩${r.bolts < caught ? ` (הגעת למקסימום של היום)` : ""}</p>${it}<p>⏱️ שרדת ${Math.floor(G.t)} שניות · 🔥 קומבו הכי גדול: ${G.bestCombo}${G.stolen ? ` · 🦹 נגנבו ${G.stolen}` : ""}</p><p>היום: ${R.GAME_CAP - r.left}/${R.GAME_CAP}</p>`, more && why !== "bell" ? ["🔄 עוד סיבוב", "סיום"] : ["סיום"]);
      if (more && why !== "bell" && i === 0) newRound(); else finish();
    };
    // ✕ / כפתור "חזור" בטלפון: יוצאים תמיד. אם תפסת משהו בסיבוב – נשמר אוטומטית
    const exitGame = () => {
      if (!G.run) return;
      if (locked()) { lockedMsg(); return; }
      if (!G.over && !G.dead && (G.bolts || G.items.length)) { const caught = G.bolts, r = R.gameBank(X.S, G.bolts, G.items.slice()); if (caught > (X.S.gameBest || 0)) X.S.gameBest = caught; if (r.bolts || r.items.length) X.step(1); X.save(); X.SFX.coin(); if (r.bolts || r.items.length) X.toast(`💰 שמרת ${r.bolts} ברגים${r.items.length ? ` + ${r.items.length} 🎁` : ""} מהמשחק`, null, 3500); }
      finish();
    };
    d.querySelector(".x").onclick = exitGame; d.querySelector("#gmExit").onclick = exitGame; d.oncancel = e => { e.preventDefault(); exitGame(); };
    d.querySelector("#gmCash").onclick = () => { if (locked()) return lockedMsg(); if (!G.over && !G.dead && G.run) bank("cash"); };
    let last = performance.now(), secT = 0;
    // ⚙️ קושי: הולך ועולה כל הזמן
    const speedF = () => 1 + G.t / 22, slowF = () => (G.pw.slow > 0 ? .45 : 1), base = () => Math.max(.75, H / 640) * 175;
    const spawn = (k, x0) => {
      const x = x0 != null ? x0 : 30 + Math.random() * (W - 60), sp = base() * speedF();
      if (k === "bomb") G.obj.push({ k, x, y: -40, v: sp * (1.45 + Math.random() * .25), vx: G.t > 30 && Math.random() < .4 ? (Math.random() - .5) * 120 : 0, s: 30 });
      else if (k === "thief") G.obj.push({ k, x, x0: x, y: -40, v: sp * 1.35, ph: Math.random() * 6, amp: Math.min(110, 40 + G.t * 1.5), s: 32 });
      else if (k === "item") { let r = "r", x2 = Math.random() * 100; for (const [rr, w] of ITEM_R) { if ((x2 -= w) < 0) { r = rr; break; } } G.obj.push({ k, x, y: -40, v: sp * 2.3, s: 30, r }); }
      else if (k === "pow") { const ks = Object.keys(POW), p = ks[Math.floor(Math.random() * ks.length)]; G.obj.push({ k, p, x, y: -40, v: sp * 1.05, s: 30 }); }
      else if (Math.random() < .08) G.obj.push({ k: "gold", x, y: -40, v: sp * 1.2, s: 28 });
      else G.obj.push({ k: "bolt", x, y: -40, v: sp, s: 25 });
    };
    const burst = (x, y, col, n = 10, sp = 160) => { n = Math.ceil(n * .5); if (G.parts.length > 120) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (.4 + Math.random()); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: .6 + Math.random() * .4, a: 1, c: col, s: 2 + Math.random() * 3 }); } };
    const fxText = (x, y, t, c, life = 1, size = 20) => { G.fx = G.fx.filter(f => f.thief); G.fx.push({ x, y, t, c, a: life, life, size }); };
    const comboUp = () => {
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
      if (G.combo % 10 === 0) { const bonus = Math.min(Math.max(0, left() - G.bolts), 1 + G.combo / 5); G.bolts += bonus; AU.combo(G.combo); X.vib([30, 20, 60]); G.shake = .35; fxText(W / 2, H * .38, `🔥 קומבו ${G.combo}! +${bonus}`, "#fb923c", 1.6, 30); burst(G.px, H - 70, "#fb923c", 30, 260); burst(G.px, H - 70, "#fde047", 20, 200); }
    };
    const loseCombo = () => { G.combo = 0; };
    function hit(o) {
      const py = H - 60;
      if (o.k === "bomb" || o.k === "thief") {
        if (G.shield) { G.shield = false; AU.shield(); X.vib(40); burst(o.x, py - 20, "#38bdf8", 24, 220); fxText(G.px, py - 70, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); return; }
        if (o.k === "thief") {
          const take = Math.ceil(G.bolts / 2); G.bolts -= take; G.stolen += take; loseCombo(); AU.thief(); X.vib([40, 30, 40, 30, 40]); G.shake = .3;
          fxText(G.px, py - 70, take ? `🦹 הגנב לקח ${take}!` : "🦹 הגנב לא מצא כלום 😅", "#e879f9", 1.4, 22); burst(o.x, py - 20, "#a855f7", 26, 240);
          G.fx.push({ thief: 1, x: o.x, y: py - 20, a: 1.2, life: 1.2 }); hud(); return;
        }
        boom(o); return;
      }
      if (o.k === "pow") { const P = POW[o.p]; if (o.p === "shield") G.shield = true; else G.pw[o.p] = P.t; AU.power(); X.vib(30); burst(o.x, py - 20, P.c, 22, 220); fxText(G.px, py - 70, `${P.em} ${P.n}!`, P.c, 1.2, 22); comboUp(); return; }
      if (o.k === "item") { G.items.push(o.r); AU.item(); X.vib(50); burst(o.x, py - 20, RC(o.r), 30, 240); fxText(o.x, py - 60, "✨ " + R.RAR[o.r].n + "!", RC(o.r), 1.3, 22); comboUp(); hud(); return; }
      const mult = G.pw.double > 0 ? 2 : 1, n = Math.min((o.k === "gold" ? 5 : 1) * mult, Math.max(0, left() - G.bolts)); G.bolts += n;
      if (n) { o.k === "gold" ? AU.gold() : AU.pick(G.combo); burst(o.x, py - 20, o.k === "gold" ? "#fde047" : "#bae6fd", o.k === "gold" ? 8 : 3, 120); if (o.k === "gold" || n > 1) fxText(o.x, py - 50, "+" + n, "#fde047", .8, 22); }
      comboUp(); hud();
      if (G.bolts >= left() && G.bolts > LOCK) { G.over = true; AU.combo(50); X.vib([60, 40, 60, 40, 160]); setTimeout(() => bank("win"), 50); return; } // 🏆 שרד עד המקסימום
      if (G.bolts >= left() && !G.fullShown) { G.fullShown = 1; fxText(W / 2, H / 3, "הגעת למקסימום של היום! צא עם הכסף 💰", "#fde047", 3, 18); }
    }
    function loop(now) {
      if (!G.run || G.over) return;
      if (!d.open) { finish(); return; }
      if (W < 50 || H < 50) fit();
      const rdt = Math.min(.05, (now - last) / 1000); last = now; const dt = rdt * slowF();
      if (!G.dead) G.t += rdt;
      for (const k of Object.keys(G.pw)) { G.pw[k] -= rdt; if (G.pw[k] <= 0) delete G.pw[k]; }
      // ⏰ ההפסקה נגמרה? שומרים אוטומטית
      if ((secT += rdt) > 1 && !G.dead) { secT = 0; const bs = breakState(); if (!bs.open && !locked()) { bank("bell"); return; } const tl = d.querySelector("#gmT"); if (bs.until != null) { const n = new Date(), s = bs.until * 60 - (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()); tl.textContent = s > 0 ? `⏰ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""; } else tl.textContent = ""; }
      if (!G.dead) {
        const full = G.bolts >= left(), t = G.t;
        if ((G.nb -= rdt) <= 0) { G.nb = Math.max(.32, .55 - t * .004); if (!full && G.obj.length < 12) spawn("bolt"); }
        if ((G.nbomb -= rdt) <= 0) { G.nbomb = Math.max(.7, 2 - t * .025) + Math.random() * .6; spawn("bomb"); }
        if ((G.nthief -= rdt) <= 0) { G.nthief = Math.max(2.2, 8 - t * .09) + Math.random() * 2; spawn("thief"); }
        if ((G.npow -= rdt) <= 0) { G.npow = 14 + Math.random() * 8; spawn("pow"); }
        if ((G.nitem -= rdt) <= 0) { G.nitem = 14 + Math.random() * 12; if (itemsLeft() > 0) spawn("item"); }
      }
      G.px += (G.tx - G.px) * Math.min(1, rdt * 16);
      const py = H - 60, mag = G.pw.magnet > 0;
      for (const o of G.obj) {
        o.y += o.v * dt;
        if (o.k === "thief") o.x = Math.max(25, Math.min(W - 25, o.x0 + Math.sin(o.y / 55 + o.ph) * o.amp));
        if (o.vx) { o.x += o.vx * dt; if (o.x < 25 || o.x > W - 25) o.vx = -o.vx; }
        if (mag && (o.k === "bolt" || o.k === "gold" || o.k === "item") && o.y > H * .3) o.x += (G.px - o.x) * Math.min(1, dt * 5);
        if (!G.dead && !o.hit && o.y > py - 40 && o.y < py + 22 && Math.abs(o.x - G.px) < (o.k === "bomb" || o.k === "thief" ? 36 : 44)) { o.hit = true; hit(o); if (G.dead || G.over) break; }
        if (!o.hit && o.y >= H + 30 && (o.k === "bolt" || o.k === "gold")) { o.hit = true; loseCombo(); }
      }
      G.obj = G.obj.filter(o => !o.hit && o.y < H + 40);
      for (const p of G.parts) { p.x += p.vx * rdt; p.y += p.vy * rdt; p.vy += 420 * rdt; p.a -= rdt / p.life; }
      G.parts = G.parts.filter(p => p.a > 0);
      G.shake = Math.max(0, G.shake - rdt);
      draw(rdt); requestAnimationFrame(loop);
    }
    function draw(rdt) {
      cx.save(); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (G.shake > 0) cx.translate((Math.random() - .5) * G.shake * 30, (Math.random() - .5) * G.shake * 30);
      // רקע בהיר יחסית עם כוכבים זזים – כדי שהכל יבלוט
      const dz = Math.min(1, G.t / 60), g = cx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, dz > .5 ? "#4c1d95" : "#3730a3"); g.addColorStop(.6, "#1e1b4b"); g.addColorStop(1, dz > .5 ? "#450a0a" : "#172554"); cx.fillStyle = g; cx.fillRect(-20, -20, W + 40, H + 40);
      cx.fillStyle = "rgba(255,255,255,.5)"; for (const s of stars.slice(0, 18)) { s.y += s.v * rdt * .15 * speedF(); if (s.y > 1) s.y = 0; cx.globalAlpha = .35 + s.s / 4; cx.fillRect(s.x * W, s.y * H, s.s, s.s); } cx.globalAlpha = 1;
      // רצפה זוהרת
      const fl = cx.createLinearGradient(0, H - 40, 0, H); fl.addColorStop(0, "rgba(124,245,255,0)"); fl.addColorStop(1, "rgba(124,245,255,.25)"); cx.fillStyle = fl; cx.fillRect(0, H - 40, W, 40);
      for (const o of G.obj) {
        const spr = o.k === "bolt" ? sprite("bolt", o.s, (x, s) => nut(x, s, false)) : o.k === "gold" ? sprite("gold", o.s, (x, s) => nut(x, s, true)) : o.k === "bomb" ? sprite("bomb", o.s, bombDraw) : o.k === "thief" ? sprite("thief", o.s, thiefDraw) : o.k === "item" ? sprite("item" + o.r, o.s, itemDraw(o.r)) : sprite("pow" + o.p, o.s, powDraw(POW[o.p], o.p));
        const sz = o.s * 2; cx.drawImage(spr, o.x - sz / 2, o.y - sz / 2, sz, sz);
        if (o.k === "thief" || o.k === "pow" || o.k === "bomb") { cx.font = "900 12px system-ui,sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.lineWidth = 3; cx.strokeStyle = "rgba(0,0,0,.7)"; const l = o.k === "thief" ? "גנב!" : o.k === "bomb" ? "פצצה!" : POW[o.p].n; cx.strokeText(l, o.x, o.y + o.s * .95); cx.fillStyle = o.k === "pow" ? POW[o.p].c : o.k === "bomb" ? "#fca5a5" : "#f5d0fe"; cx.fillText(l, o.x, o.y + o.s * .95); }
      }
      // הרובוט (ואם התמונה לא נטענה – עיגול עם 🤖)
      const py = H - 60, rs = 82;
      if (G.combo >= 5) { const fg = cx.createRadialGradient(G.px, py + 10, 5, G.px, py + 10, 70); fg.addColorStop(0, "rgba(251,146,60,.8)"); fg.addColorStop(1, "rgba(251,146,60,0)"); cx.fillStyle = fg; cx.beginPath(); cx.arc(G.px, py + 10, 70, 0, 7); cx.fill(); }
      if (G.pw.magnet > 0) { cx.strokeStyle = "rgba(244,63,94,.6)"; cx.lineWidth = 2; cx.setLineDash([6, 6]); cx.beginPath(); cx.arc(G.px, py, 70 + Math.sin(G.t * 8) * 6, 0, 7); cx.stroke(); cx.setLineDash([]); }
      if (imgOk) cx.drawImage(img, G.px - rs / 2, py - rs / 2 - 4, rs, rs); else { cx.fillStyle = "#e0e7ff"; cx.beginPath(); cx.arc(G.px, py, 30, 0, 7); cx.fill(); cx.font = "36px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText("🤖", G.px, py); }
      if (G.shield) { cx.strokeStyle = "#7dd3fc"; cx.lineWidth = 4; cx.globalAlpha = .6 + Math.sin(G.t * 6) * .2; cx.beginPath(); cx.arc(G.px, py - 4, 50, 0, 7); cx.stroke(); cx.fillStyle = "rgba(56,189,248,.15)"; cx.fill(); cx.globalAlpha = 1; }
      for (const p of G.parts) { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); } cx.globalAlpha = 1;
      cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const f of G.fx) {
        f.a -= rdt; const al = Math.max(0, f.a / f.life);
        if (f.thief) { f.y -= 160 * rdt; f.x += 90 * rdt; cx.globalAlpha = al; cx.font = "34px sans-serif"; cx.fillText("🦹💰", f.x, f.y); cx.globalAlpha = 1; continue; }
        f.y -= 40 * rdt; cx.globalAlpha = al; cx.font = `900 ${f.size}px system-ui,sans-serif`; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText(f.t, f.x, f.y); cx.fillStyle = f.c; cx.fillText(f.t, f.x, f.y); cx.globalAlpha = 1;
      }
      G.fx = G.fx.filter(f => f.a > 0);
      // למעלה: קומבו, מהירות, כוחות פעילים
      cx.font = "900 15px system-ui,sans-serif"; cx.textAlign = "right"; cx.fillStyle = "#fff"; cx.fillText(`⏱️ ${Math.floor(G.t)} · מהירות ×${speedF().toFixed(1)}`, W - 10, 18);
      if (G.combo >= 3) { cx.textAlign = "center"; cx.font = `900 ${Math.min(34, 18 + G.combo / 2)}px system-ui,sans-serif`; cx.fillStyle = G.combo >= 10 ? "#fb923c" : "#fde047"; cx.fillText(`🔥 ×${G.combo}`, W / 2, 22); }
      let px = 10; cx.textAlign = "left"; cx.font = "800 13px system-ui,sans-serif";
      for (const [k, v] of Object.entries(G.pw)) { const P = POW[k]; cx.fillStyle = P.c; cx.fillText(`${P.em} ${Math.ceil(v)}`, px, 18); px += 52; }
      if (G.shield) { cx.fillStyle = "#7dd3fc"; cx.fillText("🛡️", px, 18); }
      cx.restore();
    }
    async function boom(o) {
      G.dead = true; const lost = G.bolts, li = G.items.length; G.bolts = 0; G.items = []; G.combo = 0; hud(); X.vib([80, 40, 160]); AU.boom(); G.shake = .7;
      burst(o.x, H - 70, "#ef4444", 50, 320); burst(o.x, H - 70, "#f97316", 40, 260); burst(o.x, H - 70, "#fde047", 25, 200);
      fxText(W / 2, H * .4, "💥 בום!", "#f87171", 1, 44);
      await X.sleep(900); G.over = true;
      const more = breakState().open && left() > 0;
      const i = await overlay(`<div class="big">💥</div><h3>בום!</h3><p>${lost || li ? `הפסדת ${lost} ברגים${li ? ` ו-${li} 🎁` : ""} מהסיבוב 😭` : "פצצה! לא הפסדת כלום כי עוד לא תפסת 😅"}</p><p>⏱️ שרדת ${Math.floor(G.t)} שניות · 🔥 קומבו: ${G.bestCombo}</p><p>טיפ: צא עם הכסף לפני שזה נהיה מהיר מדי!</p>`, more ? ["🔄 סיבוב חדש", "סיום"] : ["סיום"]);
      if (more && i === 0) newRound(); else finish();
    }
    G.spawnAt = (k, x, y, extra) => { spawn(k, x); const o = G.obj[G.obj.length - 1]; if (y != null) o.y = y; Object.assign(o, extra || {}); return o; }; // לבדיקות
    hud();
    await overlay(`<div class="big">🔩</div><h3>מוכן?</h3><p>תזיז את האצבע כדי להזיז את הרובוט.</p><div class="gm-rules" style="justify-content:center"><span>🔩 = 1</span><span>🌟 = 5</span><span>🎁 אביזר</span><span class="bad">💣 הכל נעלם</span><span class="bad">🦹 לוקח חצי</span><span class="bad">🔒 מעל 250 אין יציאה!</span><span>🧲🛡️🐢⚡ כוחות</span></div><p>ככל שהזמן עובר – יותר מהר! 😈</p>`, ["▶️ יאללה!", "יציאה"]).then(i => { if (i === 1) finish(); });
    if (!G.run) return;
    fit(); G.px = G.tx = W / 2; newRound();
  }

  const PANELS = { legend: legendPanel, wheel: wheelPanel, map: mapPanel, lab: labPanel, sets: setsPanel, market: marketPanel, bonus: bonusPanel, game: gamePanel };

  // ================= הפעלה =================
  window.RoboPlus = { tab, breakState, mashovRewards, play: () => play(), panels: PANELS, _game: () => game };
  // ⚡ תיבת בזק: הודעה קטנה כשנפתח חלון (פעם אחת לחלון)
  function flashCheck() {
    if (X.locked() || document.hidden || !X.profile() || document.querySelector("dialog[open]")) return;
    const f = R.flashNow(X.S, X.dev()); if (!f || f.bought || LS.get("roboFlashSeen", "") === f.id) return;
    LS.set("roboFlashSeen", f.id); X.SFX.gift();
    X.toast(`⚡ <b>תיבת בזק!</b> ${R.BOX[f.box].em} ${R.BOX[f.box].n} ב-${f.price} ברגים בלבד – רק עוד ${f.left} דק'`, ["לחנות", () => X.open("shop")], 12000);
  }
  const boot = () => {
    if (navigator.webdriver && !LS.get("roboTest", "")) return;
    setTimeout(flashCheck, 12000); setInterval(flashCheck, 60000);
    if (X.page === "index") { bells(Date.now()); setTimeout(mashovRewards, 6000); document.addEventListener("mashov-updated", () => setTimeout(mashovRewards, 1500)); }
    // אם הלשונית "כיף" פתוחה – לצייר אותה עכשיו שהקובץ נטען
    const b = document.getElementById("rwBody"); if (b && document.querySelector('#roboUI .rw-tabs [data-t="fun"].on')) tab(b);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
