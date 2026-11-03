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
.rp-rar{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.rp-rar button{border:0;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;color:#fff;background:rgba(255,255,255,.1);cursor:pointer;white-space:nowrap}.rp-rar button.on{background:var(--c);color:#1a1040}
.rc.pick{outline:3px solid #fde047;outline-offset:-3px;transform:scale(.96)}
.rp-slots{display:flex;gap:6px;justify-content:center;margin:8px 0 12px}.rp-slots i{width:44px;height:44px;border-radius:12px;border:2px dashed rgba(255,255,255,.3);display:grid;place-items:center;font-style:normal;overflow:hidden}.rp-slots i.f{border-style:solid;border-color:#fde047;background:rgba(253,224,71,.12)}
.rp-lab{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:rgba(5,2,15,.92)}
.rp-lab .it{position:absolute;width:70px;height:70px;transition:all .9s cubic-bezier(.5,0,.2,1)}
.rp-lab .core{font-size:80px;animation:rBeat .4s infinite}
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
.gm-top{display:flex;align-items:center;gap:6px;padding:10px 12px;background:#120c2e;font-weight:900;font-size:14px}
.gm-top .x{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:10px;width:34px;height:34px;font-size:16px;cursor:pointer}
.gm-top span{background:rgba(255,255,255,.08);border-radius:99px;padding:5px 10px;white-space:nowrap}.gm-top span:empty{display:none}
.gm-cv{flex:1;position:relative}.gm-cv canvas{position:absolute;inset:0;width:100%;height:100%}
.gm-cash{margin:10px 12px calc(12px + env(safe-area-inset-bottom));font-size:18px!important;padding:14px!important}
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
    body.innerHTML = (R.eventNow() ? `<div class="rev"><b>${R.eventNow().n}</b> פי ${R.eventNow().up} סיכוי שהתיבות ישתדרגו!</div>` : "") + `<div class="rp-menu">
      ${tile("game", "🔩", "#f59e0b", "ברגים נופלים", bs.open ? (g.n >= R.GAME_CAP ? "סיימת להיום 💪" : `משחק להפסקה · עוד ${R.GAME_CAP - g.n} 🔩 היום`) : `🔒 נפתח ב-${hhmm(bs.until)}`, bs.open && g.n < R.GAME_CAP ? "!" : "", true)}
      ${tile("wheel", "🎰", "#ec4899", "גלגל מזל", wheelOk ? "סיבוב חינם היום!" : "חוזר מחר 🌙", wheelOk ? "1" : "")}
      ${tile("map", "🗺️", "#22c55e", "המסע", ready > 0 ? "יש אוצר שמחכה! 💰" : `תחנה ${mp.c}/${R.MAP_N}`, ready > 0 ? ready : "")}
      ${tile("lab", "🔨", "#38bdf8", "מעבדה", "5 אביזרים → 1 נדיר יותר")}
      ${tile("market", "🕵️", "#a855f7", "שוק", "קונים ומוכרים בברגים")}
      ${tile("sets", "🎭", "#f97316", "סטים", `השלמת ${sets}/${R.SETS.length}`)}
      ${tile("bonus", "📚", "#14b8a6", "בונוסים", "ציון טוב · שבוע בלי איחורים")}</div>`;
    body.querySelectorAll("[data-p]").forEach(b => b.onclick = () => PANELS[b.dataset.p](body));
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
      if (spinning) return; const r = R.spinWheel(X.S); if (!r) return; spinning = true; X.step(1); X.save();
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
    const claim = () => {
      const got = []; let c; while ((c = R.mapClaim(X.S))) got.push(...c.prize.map(p => R.grant(X.S, p)));
      if (!got.length) return; X.save(); X.vib([40, 30, 90]); X.SFX.gift();
      const boxes = got.filter(g => g.t === "box").map(g => g.box), bolts = got.filter(g => g.t === "bolts").reduce((a, g) => a + g.n, 0);
      X.toast(`🗺️ אוצר! ${[bolts ? `${bolts} ברגים 🔩` : "", ...boxes.map(b => R.BOX[b].em + " " + R.BOX[b].n)].filter(Boolean).join(" + ")}`, boxes.length ? ["לפתוח", () => X.openBoxes(boxes)] : null, 9000);
      mapPanel(body); X.hubRefresh();
    };
    const cb = body.querySelector("#rpClaim"); if (cb) cb.onclick = claim;
    body.querySelectorAll(".rp-st.ready").forEach(e => e.onclick = claim);
    body.querySelectorAll(".rp-st:not(.ready)").forEach(e => e.onclick = () => { const i = +e.dataset.i; X.toast(`תחנה ${i}: ${esc(R.mapPrize(i).map(X.giftText).join(" + "))}`, null, 2500); });
  }

  // ================= 🔨 מעבדה =================
  let labR = "c", labSel = [];
  const labOk = it => X.S.own[it.id] && X.S.own[it.id] !== -1 && !it.free && it.cat !== "theme" && it.cat !== "page" && !(X.S.shiny && X.S.shiny[it.id]);
  function labPanel(body) {
    const S = X.S, rs = ["c", "r", "s", "e", "m"], items = R.LIST.filter(x => x.r === labR && labOk(x));
    labSel = labSel.filter(id => items.some(x => x.id === id));
    const nr = R.RK[R.RK.indexOf(labR) + 1];
    body.innerHTML = `${back}<div class="rp-h">🔨 המעבדה</div><div class="rp-s">בוחרים 5 אביזרים מאותה דרגה → הם מתחברים לאביזר אחד מהדרגה הבאה! (אביזרים נוצצים ✨ לא נכנסים למעבדה)</div>
      <div class="rp-rar">${rs.map(r => `<button type="button" data-r="${r}" class="${labR === r ? "on" : ""}" style="--c:${RC(r)}">${R.RAR[r].n} (${R.LIST.filter(x => x.r === r && labOk(x)).length})</button>`).join("")}</div>
      <div class="rp-slots">${Array.from({ length: 5 }, (_, i) => labSel[i] ? `<i class="f">${X.preview(labSel[i])}</i>` : "<i></i>").join("")}</div>
      <button class="rbtn" type="button" id="rpLab" style="width:100%;margin-bottom:12px" ${labSel.length === 5 ? "" : "disabled"}>🔨 לחבר 5 → 1 ${R.RAR[nr].n}</button>
      ${items.length ? `<div class="rw-grid">${items.map(it => X.card(it)).join("")}</div>` : `<div class="rw-prog" style="text-align:center;padding:20px 0">אין לך אביזרים ${R.RAR[labR].n}ים שאפשר לחבר</div>`}`;
    wireBack(body);
    body.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { labR = b.dataset.r; labSel = []; labPanel(body); });
    body.querySelectorAll(".rc[data-id]").forEach(b => { if (labSel.includes(b.dataset.id)) b.classList.add("pick"); b.onclick = () => { const id = b.dataset.id; labSel = labSel.includes(id) ? labSel.filter(x => x !== id) : labSel.length < 5 ? [...labSel, id] : labSel; labPanel(body); }; });
    body.querySelector("#rpLab").onclick = async () => {
      if (labSel.length !== 5 || !confirm(`לחבר את 5 האביזרים? הם ייעלמו, ובמקומם תקבל אביזר ${R.RAR[nr].n} אחד`)) return;
      const sel = labSel.slice(), r = R.labCombine(X.S, sel); if (!r.ok) { X.toast("משהו לא הסתדר 🤔", null, 3000); return; }
      labSel = []; X.step(1); X.save();
      const ov = document.createElement("div"); ov.className = "rp-lab"; document.body.appendChild(ov);
      ov.innerHTML = sel.map((id, i) => { const a = i / 5 * Math.PI * 2; return `<div class="it" style="left:calc(50% + ${Math.cos(a) * 120}px - 35px);top:calc(50% + ${Math.sin(a) * 120}px - 35px)">${X.preview(id)}</div>`; }).join("") + `<div class="core">⚗️</div>`;
      X.SFX.up(1); await X.sleep(300); ov.querySelectorAll(".it").forEach(e => { e.style.left = "calc(50% - 35px)"; e.style.top = "calc(50% - 35px)"; e.style.opacity = ".2"; e.style.transform = "scale(.3) rotate(360deg)"; });
      await X.sleep(1000); X.SFX.open(); X.vib([40, 30, 100]);
      const it = R.ITEMS[r.got.id];
      ov.innerHTML = `<div style="text-align:center"><div style="font-weight:900;font-size:16px;color:${RC(it.r)}">${R.RAR[it.r].n}!</div><div style="width:160px;height:160px;margin:8px auto">${X.preview(it.id, false)}</div><div style="font-size:22px;font-weight:900">${esc(it.n)}</div><div style="color:#d9d5ff;margin:6px 0 16px">${r.got.dup ? `כבר היה לך → +${r.got.dup} 🔩` : "✨ חדש באוסף!"}</div><button class="rbtn" type="button">יש! 🤩</button></div>`;
      X.particles(ov, RC(it.r), 46); X.SFX.reveal(R.RAR[it.r].o);
      await new Promise(res => { ov.querySelector("button").onclick = res; }); ov.remove(); labPanel(body); X.hubRefresh();
    };
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
    const it = R.ITEMS[id], [lo, hi] = R.PRICE[it.r], sug = Math.max(lo, Math.min(hi, R.RAR[it.r].dup * 2));
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
  function mashovRewards() { try { gradeBoxes(); weekBox(); } catch (e) {} }

  // ================= 🎮 ברגים נופלים =================
  const ITEM_R = [["r", 60], ["s", 30], ["e", 10]];
  function gamePanel(body) {
    const S = X.S, bs = breakState(), g = S.game && S.game.d === R.ymd(Date.now()) ? S.game : { n: 0, it: 0 }, left = R.GAME_CAP - g.n;
    body.innerHTML = `${back}<div class="rp-h">🔩 ברגים נופלים</div><div class="rp-s">תזיז את הרובוט ותתפוס ברגים! 🔩 = 1 · 🌟 = 5 · 🎁 = אביזר (נופל מהר!). <b>💣 פצצה = כל מה שתפסת בסיבוב נעלם!</b> אפשר לצאת עם הכסף מתי שרוצים ולהתחיל סיבוב חדש.</div>
      <div class="rbx" style="--c:#f59e0b"><div class="em">📊</div><div class="t"><b>היום: ${g.n}/${R.GAME_CAP} 🔩 · ${g.it}/${R.GAME_ITEMS} 🎁</b><small>${bs.free ? "אפשר לשחק עכשיו 🎉" : bs.open ? (bs.until != null ? `הפסקה! עד ${hhmm(bs.until)}` : "אפשר לשחק עכשיו 🎉") : `🔒 עכשיו שיעור – נפתח בהפסקה (${hhmm(bs.until)})`}</small></div></div>
      <button class="rbtn" type="button" id="rpPlay" style="width:100%;font-size:18px;padding:14px" ${bs.open && left > 0 ? "" : "disabled"}>${left <= 0 ? "סיימת להיום 💪 נתראה מחר" : bs.open ? "▶️ לשחק!" : "🔒 רק בהפסקות"}</button>
      <p class="rw-prog" style="margin-top:12px">⏰ המשחק פתוח רק בהפסקות לפי המערכת שלך (עד 16:15). אחרי 16:15, בשישי ובחופשות – פתוח תמיד.</p>`;
    wireBack(body);
    const p = body.querySelector("#rpPlay"); if (p) p.onclick = () => play();
  }
  let game = null;
  async function play() {
    const d = X.dlg("roboGame", "game"); d.dataset.lock = "1";
    d.innerHTML = `<div class="gm"><div class="gm-top"><button class="x" type="button" aria-label="סגור">✕</button><span id="gmR">🔩 0</span><span id="gmI">🎁 0</span><span id="gmL"></span><span style="flex:1"></span><span id="gmT"></span></div>
      <div class="gm-cv"><canvas></canvas></div><button class="rbtn gm-cash" type="button" id="gmCash">💰 לצאת עם הכסף</button></div>`;
    X.show(d);
    const cv = d.querySelector("canvas"), box = d.querySelector(".gm-cv"), cx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0; const fit = () => { W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }; fit();
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(X.svg("", null, { still: true }).replace('class="abot', 'width="128" height="128" class="abot'));
    const G = game = { run: true, px: W / 2, tx: W / 2, obj: [], fx: [], bolts: 0, items: [], t: 0, nb: 0.4, nbomb: 2.5, nitem: 14 + Math.random() * 10, over: false };
    const S = X.S, today = () => (S.game && S.game.d === R.ymd(Date.now()) ? S.game : { n: 0, it: 0 });
    const left = () => R.GAME_CAP - today().n, itemsLeft = () => R.GAME_ITEMS - today().it - G.items.length;
    const hud = () => { d.querySelector("#gmR").textContent = `🔩 ${G.bolts}`; d.querySelector("#gmI").textContent = `🎁 ${G.items.length}`; d.querySelector("#gmL").textContent = `היום: ${Math.max(0, left() - G.bolts)} נשאר`; d.querySelector("#gmCash").textContent = `💰 לצאת עם הכסף (${G.bolts}${G.items.length ? " + " + G.items.length + " 🎁" : ""})`; };
    const move = e => { const r = box.getBoundingClientRect(); G.tx = Math.max(28, Math.min(W - 28, (e.touches ? e.touches[0].clientX : e.clientX) - r.left)); };
    box.addEventListener("pointerdown", move); box.addEventListener("pointermove", move); box.addEventListener("touchmove", e => { move(e); e.preventDefault(); }, { passive: false });
    const key = e => { if (e.key === "ArrowLeft") G.tx = Math.max(28, G.tx - 40); if (e.key === "ArrowRight") G.tx = Math.min(W - 28, G.tx + 40); }; addEventListener("keydown", key);
    const overlay = (html, btns) => new Promise(res => { const o = document.createElement("div"); o.className = "gm-ov"; o.innerHTML = `<div>${html}<div class="rd-btns">${btns.map((b, i) => `<button class="rbtn${i ? " alt" : ""}" type="button" data-i="${i}">${b}</button>`).join("")}</div></div>`; d.querySelector(".gm").appendChild(o); o.querySelectorAll("button").forEach(b => b.onclick = () => { o.remove(); res(+b.dataset.i); }); });
    const finish = () => { G.run = false; game = null; removeEventListener("keydown", key); delete d.dataset.lock; d.close(); X.hubRefresh(); if (host && host.isConnected) gamePanel(host); };
    const newRound = () => { G.obj = []; G.bolts = 0; G.items = []; G.t = 0; G.nb = .4; G.nbomb = 2.2 + Math.random() * 1.5; G.nitem = 12 + Math.random() * 12; G.over = false; G.fullShown = 0; hud(); last = performance.now(); requestAnimationFrame(loop); };
    const bank = async (why) => {
      G.over = true; const items = G.items.slice(), r = R.gameBank(X.S, G.bolts, items); if (r.bolts || r.items.length) X.step(1); X.save(); X.SFX.coin(); X.vib(40);
      const it = r.items.map(g => `<div style="margin:4px 0">${R.ITEMS[g.id] ? `✨ ${esc(R.ITEMS[g.id].n)} ${X.rarTag(g.r)}${g.dup ? ` (כפול → +${g.dup} 🔩)` : ""}` : ""}</div>`).join("");
      const more = breakState().open && r.left > 0;
      const i = await overlay(`<div class="big">${why === "bell" ? "🔔" : "💰"}</div><h3>${why === "bell" ? "ההפסקה נגמרה!" : "שמרת!"}</h3><p>+${r.bolts} ברגים 🔩${r.bolts < G.bolts ? ` (הגעת למקסימום של היום)` : ""}</p>${it}<p>היום: ${R.GAME_CAP - r.left}/${R.GAME_CAP}</p>`, more && why !== "bell" ? ["🔄 עוד סיבוב", "סיום"] : ["סיום"]);
      if (more && why !== "bell" && i === 0) newRound(); else finish();
    };
    d.querySelector(".x").onclick = () => { if (G.over) return finish(); if (G.bolts || G.items.length) bank("x"); else finish(); };
    d.querySelector("#gmCash").onclick = () => { if (!G.over && G.run) bank("cash"); };
    let last = performance.now(), secT = 0;
    const spawn = (k) => {
      const x = 24 + Math.random() * (W - 48), sp = 150 + G.t * 5;
      if (k === "bomb") G.obj.push({ k, x, y: -30, v: sp * 1.1, em: "💣", s: 34 });
      else if (k === "item") { let r = "r", x2 = Math.random() * 100; for (const [rr, w] of ITEM_R) { if ((x2 -= w) < 0) { r = rr; break; } } G.obj.push({ k, x, y: -30, v: sp * 2.4, em: "🎁", s: 34, r }); }
      else if (Math.random() < .07) G.obj.push({ k: "gold", x, y: -30, v: sp * 1.2, em: "🌟", s: 30 });
      else G.obj.push({ k: "bolt", x, y: -30, v: sp, em: "🔩", s: 26 });
    };
    function loop(now) {
      if (!G.run || G.over) return;
      if (!d.open) { finish(); return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now; G.t += dt;
      // ⏰ ההפסקה נגמרה? שומרים אוטומטית
      if ((secT += dt) > 1) { secT = 0; const bs = breakState(); if (!bs.open) { bank("bell"); return; } const tl = d.querySelector("#gmT"); if (bs.until != null) { const n = new Date(), s = bs.until * 60 - (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()); tl.textContent = s > 0 ? `⏰ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""; } else tl.textContent = ""; }
      const full = G.bolts >= left();
      if ((G.nb -= dt) <= 0) { G.nb = Math.max(.22, .45 - G.t * .006); if (!full) spawn("bolt"); }
      if ((G.nbomb -= dt) <= 0) { G.nbomb = Math.max(1.4, 3.6 - G.t * .03) + Math.random() * 1.6; spawn("bomb"); }
      if ((G.nitem -= dt) <= 0) { G.nitem = 16 + Math.random() * 14; if (itemsLeft() > 0) spawn("item"); }
      G.px += (G.tx - G.px) * Math.min(1, dt * 14);
      const py = H - 50;
      for (const o of G.obj) {
        o.y += o.v * dt;
        if (!o.hit && o.y > py - 34 && o.y < py + 20 && Math.abs(o.x - G.px) < 40) {
          o.hit = true;
          if (o.k === "bomb") { boom(); return; }
          if (o.k === "item") { G.items.push(o.r); X.SFX.reveal(R.RAR[o.r].o); X.vib(50); fxText(o.x, py - 40, "✨ " + R.RAR[o.r].n + "!", RC(o.r)); }
          else { const n = Math.min(o.k === "gold" ? 5 : 1, Math.max(0, left() - G.bolts)); G.bolts += n; if (n) { X.SFX.tap(); fxText(o.x, py - 40, "+" + n, o.k === "gold" ? "#fde047" : "#fff"); } }
          hud(); if (G.bolts >= left() && !G.fullShown) { G.fullShown = 1; fxText(W / 2, H / 3, "הגעת ל-300 להיום! צא עם הכסף 💰", "#fde047", 3); }
        }
      }
      G.obj = G.obj.filter(o => !o.hit && o.y < H + 40);
      draw(); requestAnimationFrame(loop);
    }
    const fxText = (x, y, t, c, life = 1) => G.fx.push({ x, y, t, c, a: life, life });
    function draw() {
      cx.clearRect(0, 0, W, H);
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1e1b4b"); g.addColorStop(1, "#0b0820"); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const o of G.obj) { cx.font = `${o.s}px system-ui,"Apple Color Emoji","Segoe UI Emoji"`; if (o.k === "item") { cx.shadowColor = RC(o.r); cx.shadowBlur = 18; } else if (o.k === "bomb") { cx.shadowColor = "#ef4444"; cx.shadowBlur = 10; } cx.fillText(o.em, o.x, o.y); cx.shadowBlur = 0; }
      const py = H - 50; try { cx.drawImage(img, G.px - 34, py - 40, 68, 68); } catch (e) {}
      for (const f of G.fx) { f.a -= 1 / 60; f.y -= .6; cx.globalAlpha = Math.max(0, f.a / f.life); cx.font = "900 18px system-ui"; cx.fillStyle = f.c; cx.fillText(f.t, f.x, f.y); cx.globalAlpha = 1; }
      G.fx = G.fx.filter(f => f.a > 0);
    }
    async function boom() {
      G.over = true; const lost = G.bolts, li = G.items.length; G.bolts = 0; G.items = []; hud(); X.vib([80, 40, 160]); X.SFX.up(0);
      const gm = d.querySelector(".gm"); gm.classList.remove("boom"); void gm.offsetWidth; gm.classList.add("boom"); X.particles(gm, "#ef4444", 40, ["💥", "🔥", "💨"]);
      const more = breakState().open && left() > 0;
      const i = await overlay(`<div class="big">💥</div><h3>בום!</h3><p>${lost || li ? `הפסדת ${lost} ברגים${li ? ` ו-${li} 🎁` : ""} מהסיבוב 😭` : "פצצה! לא הפסדת כלום כי עוד לא תפסת 😅"}</p><p>טיפ: צא עם הכסף לפני שזה מסוכן!</p>`, more ? ["🔄 סיבוב חדש", "סיום"] : ["סיום"]);
      if (more && i === 0) newRound(); else finish();
    }
    hud();
    await overlay(`<div class="big">🔩</div><h3>מוכן?</h3><p>תזיז את האצבע כדי להזיז את הרובוט.<br>🔩 = 1 · 🌟 = 5 · 🎁 = אביזר · 💣 = הכל נעלם!</p>`, ["▶️ יאללה!"]);
    fit(); G.px = G.tx = W / 2; newRound();
  }

  const PANELS = { wheel: wheelPanel, map: mapPanel, lab: labPanel, sets: setsPanel, market: marketPanel, bonus: bonusPanel, game: gamePanel };

  // ================= הפעלה =================
  window.RoboPlus = { tab, breakState, mashovRewards, play: () => play(), panels: PANELS };
  // ⚡ תיבת בזק: הודעה קטנה כשנפתח חלון (פעם אחת לחלון)
  function flashCheck() {
    if (document.hidden || !X.profile() || document.querySelector("dialog[open]")) return;
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
