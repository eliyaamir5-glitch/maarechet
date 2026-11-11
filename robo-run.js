// 🏃 "ריצת הרובוט" – ריצה אינסופית ב-3 מסלולים, עם הרובוט והבגדים של הילד.
// מחליקים ימינה/שמאלה = מסלול, למעלה = קפיצה (מעל ספסל), למטה = התכופפות (מתחת למוט). ארון = רק לעקוף.
// 💩 קקי קסם = הרובוט מפליץ ועף לשמיים (ציפורים מפילות, רחפנים גונבים חצי, קשת = ×2). 🌍 עולם חדש כל 500 מ'.
// 🤸 טרמפולינה = קפיצת ענק · 🧊 קרח = מחליקים בלי שליטה · 🤖 מעידה = רובוט ענק רודף (מעידה שנייה מהר = נתפסת) · 😠 ביריון = לוקח קצת ברגים.
// עד 400 ברגים ביום (R.RUN_CAP), אחרי זה – אימון בלי פרסים (בכל זמן). המשחק עצמו – רק בהפסקות.
(function () {
  const R = window.RoboCore, RP = window.RoboPlus, X = window.Robo && Robo._; if (!R || !RP || !X || !R.runBank) return;
  const esc = X.esc, LS = X.LS, AU = RP.snd;
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const CSS = `
.rn-ctl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 10px}.rn-ctl div{text-align:center;padding:8px 2px;border-radius:12px;background:rgba(255,255,255,.07);font-size:12px;font-weight:800}.rn-ctl b{display:block;font-size:22px}
.rn-hero{position:relative;height:120px;border-radius:20px;overflow:hidden;margin-bottom:10px;background:linear-gradient(180deg,#1e3a8a,#312e81 55%,#0f172a)}
.rn-hero .rd{position:absolute;left:50%;bottom:0;width:240%;height:70%;transform:translateX(-50%) perspective(160px) rotateX(55deg);transform-origin:bottom;background:repeating-linear-gradient(90deg,transparent 0 32.6%,rgba(255,255,255,.35) 32.6% 33.4%),repeating-linear-gradient(0deg,#475569 0 18px,#334155 18px 36px);animation:rnRoad .5s linear infinite}
@keyframes rnRoad{to{background-position:0 0,0 36px}}
.rn-hero .bot{position:absolute;left:50%;bottom:6px;width:64px;height:64px;margin-left:-32px;animation:rnBob .35s ease-in-out infinite alternate}@keyframes rnBob{to{transform:translateY(-6px)}}
.rn-hero .poo{position:absolute;left:18%;top:14px;font-size:30px;animation:rnFly 2.4s ease-in-out infinite}@keyframes rnFly{50%{transform:translate(20px,-8px) rotate(10deg)}}
`;
  if (!document.getElementById("roboRunCss")) { const s = document.createElement("style"); s.id = "roboRunCss"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  const today = () => { const S = X.S; return S.run && S.run.d === R.ymd(Date.now()) ? S.run : { n: 0 }; };
  let host = null;
  function panel(body) {
    host = body; const S = X.S, bs = RP.breakState(), left = R.RUN_CAP - today().n;
    body.innerHTML = `<button type="button" class="rp-back">→ חזרה</button><div class="rp-h">🏃 ריצת הרובוט</div>
      <div class="rn-hero"><div class="rd"></div><div class="poo">💩💨</div><div class="bot">${X.svg("", null, { still: true })}</div></div>
      <div class="rn-ctl"><div><b>⬅️➡️</b>החלקה = מסלול</div><div><b>⬆️</b>קפיצה מעל ספסל</div><div><b>⬇️</b>התכופפות מתחת למוט</div><div><b>🚪</b>ארון = לעקוף!</div></div>
      <div class="gm-rules"><span>💩 קקי קסם = עפים!</span><span class="bad">🐦 ציפור מפילה</span><span class="bad">🛸 רחפן גונב חצי</span><span>🌈 קשת = ×2</span><span>🤸 טרמפולינה</span><span>🧊 קרח מחליק</span><span class="bad">😠 ביריון לוקח ברגים</span><span class="bad">🤖 מעדת? רובוט ענק רודף!</span><span>🌍 עולם חדש כל 500 מ'</span><span>🧲🛡️×2🚀 כוחות</span></div>
      <div class="rbx" style="--c:#0ea5e9"><div class="em">📊</div><div class="t"><b>היום: ${today().n}/${R.RUN_CAP} 🔩${S.runBest ? ` · 🏆 שיא: ${S.runBest} מ'` : ""}</b><small>${bs.free ? "אפשר לרוץ עכשיו 🎉" : bs.open ? (bs.until != null ? `הפסקה! עד ${hhmm(bs.until)}` : "אפשר לרוץ עכשיו 🎉") : `📚 עכשיו שיעור – רצים בלי פרסים (השיא נכנס לטבלה!). ברגים – בהפסקה (${hhmm(bs.until)})`}</small></div></div>
      ${RP.chalBox("run")}
      <button class="rbtn" type="button" id="rnPlay" style="width:100%;font-size:18px;padding:14px" >${!bs.open ? "🏋️ עכשיו שיעור – לרוץ בלי פרסים, לשבור שיא!" : left <= 0 ? "🏋️ אימון (בלי פרסים) – לשבור שיא!" : "▶️ לרוץ!"}</button>
      ${left <= 0 ? `<div class="rw-prog" style="text-align:center;margin-top:6px">💪 אספת את כל ה-${R.RUN_CAP} של היום! מחר אפשר שוב לאסוף ברגים</div>` : ""}
      <div class="lb-tools" style="margin-top:10px"><button class="rbtn sm alt" type="button" data-go="lb">🏆 טבלת השיאים</button><button class="rbtn sm alt" type="button" data-go="upg">🛒 שדרוגים</button></div>
      <p class="rw-prog" style="margin-top:12px">⏰ פתוח בהפסקות לפי המערכת שלך (עד 16:15). אחרי 16:15, בשישי ובחופשות – פתוח תמיד.</p>`;
    body.querySelector(".rp-back").onclick = () => RP.tab(body);
    const b = body.querySelector("#rnPlay"); if (b) b.onclick = () => play();
    RP.wireGo(body, "run");
  }

  // ===== עולמות =====
  const WORLDS = [
    { n: "🏫 המסדרון", sky: ["#1e1b4b", "#3730a3"], wall: ["#1d4ed8", "#0369a1", "#4338ca"], floor: ["#334155", "#64748b"], decor: "lockers", ceil: 1 },
    { n: "🌳 החצר", sky: ["#0ea5e9", "#bae6fd"], wall: ["#15803d", "#16a34a", "#166534"], floor: ["#3f6212", "#65a30d"], decor: "trees", ceil: 0 },
    { n: "🍽️ חדר האוכל", sky: ["#7c2d12", "#ea580c"], wall: ["#b45309", "#92400e", "#d97706"], floor: ["#78350f", "#b45309"], decor: "tables", ceil: 1 },
    { n: "🛏️ הפנימייה", sky: ["#2e1065", "#6d28d9"], wall: ["#7c3aed", "#6d28d9", "#9333ea"], floor: ["#4c1d95", "#7e22ce"], decor: "doors", ceil: 1 },
    { n: "🌙 הגג בלילה", sky: ["#020617", "#1e1b4b"], wall: ["#0f172a", "#1e293b", "#334155"], floor: ["#1e293b", "#475569"], decor: "rail", ceil: 0 },
  ];
  const hexA = h => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},`; };
  const POW = { magnet: { c: "#f43f5e", n: "מגנט", t: 8, em: "🧲" }, shield: { c: "#38bdf8", n: "מגן", t: 0, em: "🛡️" }, double: { c: "#facc15", n: "כפול", t: 8, em: "×2" }, turbo: { c: "#a855f7", n: "טורבו", t: 4.5, em: "🚀" } };
  let game = null;
  async function play() {
    const d = X.dlg("roboRun", "game"); d.dataset.lock = "1";
    d.innerHTML = `<div class="gm"><div class="gm-top"><button class="x" type="button" aria-label="סגור">✕</button><span id="rnB">🔩 0</span><span id="rnD">📏 0 מ'</span><span id="rnL"></span><span style="flex:1"></span><span id="rnT"></span>${RP.sndBtns()}</div>
      <div class="gm-cv"><canvas></canvas></div><div class="gm-foot"><button class="rbtn alt gm-exit" type="button" id="rnExit" style="flex:1">🚪 יציאה (הברגים נשמרים)</button></div></div>`;
    X.show(d); RP.wireSnd(d, () => (game && game.fly > 0 ? "sky" : "run"));
    const cv = d.querySelector("canvas"), box = d.querySelector(".gm-cv"), cx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const fit = () => { let w = box.clientWidth, h = box.clientHeight; if (w < 100) w = Math.min(560, innerWidth); if (h < 150) h = Math.max(300, innerHeight - 150); if (w === W && h === H) return; W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; };
    fit(); let ro = null; try { ro = new ResizeObserver(fit); ro.observe(box); } catch (e) {} addEventListener("resize", fit);
    const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(X.svg("", null, { still: true }).replace('class="abot', 'width="160" height="160" class="abot'));
    const stars = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random() * .9, s: Math.random() * 1.6 + .5 }));
    const G = game = { run: true };
    const left = () => R.RUN_CAP - today().n;
    // ---- פרספקטיבה: z = מטרים קדימה. מסלולים -1 / 0 / 1 ----
    const HOR = () => H * .26, GY = () => H * .9, f = z => 1 / (1 + Math.max(-.9, z) / 11);
    const sy = z => HOR() + (GY() - HOR()) * f(z), sx = (lane, z) => W / 2 + lane * W * .3 * f(z), sc = z => f(z);
    const LV_COL = ["#38bdf8", "#22c55e", "#a3e635", "#facc15", "#fb923c", "#f97316", "#ef4444", "#e11d48", "#a855f7", "#fde047"];
    const HK_WORLD = { n: "🕎 ליל חנוכה", sky: ["#020617", "#1e3a8a"], wall: ["#1d4ed8", "#2563eb", "#1e40af"], floor: ["#1e293b", "#334155"], decor: "menorah", ceil: 0 };
    const world = () => { const i = Math.max(0, Math.floor(G.dist / 500)); if (i % 2 === 0 && window.RoboFest && RoboFest.hkDay() > 0) return HK_WORLD; return WORLDS[i % WORLDS.length]; };
    const hud = () => { d.querySelector("#rnB").textContent = `🔩 ${G.bolts}`; d.querySelector("#rnD").textContent = `📏 ${Math.floor(G.dist)} מ'`; d.querySelector("#rnL").textContent = G.practice ? `🏋️ אימון · שיא ${Math.max(X.S.runBest || 0, Math.floor(G.dist))} מ'` : `נשאר: ${Math.max(0, left() - G.bolts)}`; };
    const newRun = () => {
      Object.assign(G, { practice: left() <= 0 || !RP.breakState().open, over: false, dead: false, t: 0, dist: 0, v: 13, lane: 0, pl: 0, jt: -1, st: -1, obj: [], parts: [], fx: [], puffs: [], next: 30, rows: 0, bolts: 0, pw: {}, shield: Math.random() < [0, .35, .7, 1][R.upg(X.S, "shield")], shake: 0, lv: 1, lvT: 0, combo: 0, run500: false,
        fly: 0, alt: 0, big: -1, ice: 0, chase: 0, chaseX: 0, lastStumble: -99, wIdx: 0, wT: 0, nPuff: 0, stats: { dist: 0, flights: 0, bolts: 0, cleanDist: 0, world: 1, bullyPass: 0 }, cleanFrom: 0,
        cd: 3.2, slow: 0, deathT: -1, buf: null, laneT: -9, leanV: 0, flyers: [], landT: 0, lines: [], nearN: 0, hopT: -1, fromL: 0, trail: [], rings: [], hurtT: 0, camX: 0, zoom: 1, camB: 0, pwMax: {} });
      G.tut = LS.get("roboRunTut", "") ? 0 : 1; if (G.tut) { G.next = 9999; G.tutStep = 0; G.tutT = 1.5; }
      AU.music("run"); G.ch = RP.chase(d, "run"); hud(); last = performance.now(); requestAnimationFrame(loop);
    };
    // 🎓 הדרכה בריצה הראשונה: ספסל (לקפוץ) → מוט (להתכופף) → ארון (לעקוף), לאט ועם חיצים גדולים
    const TUT = [{ k: "bench", txt: "⬆️ החלק למעלה = קפיצה!", need: "U" }, { k: "beam", txt: "⬇️ החלק למטה = התכופפות!", need: "D" }, { k: "locker", txt: "⬅️ ➡️ החלק הצידה = לעקוף!", need: "LR" }];
    function tutTick(dt) {
      if (!G.tut) return; if (G.tutO && G.tutO.z < -1) { G.tutO = null; G.tutStep++; G.tutT = 1.2; AU.coin(5); fxText(W / 2, H * .45, "👍 מעולה!", "#86efac", 1, 26); if (G.tutStep >= TUT.length) { G.tut = 0; LS.set("roboRunTut", "1"); G.next = 25; fxText(W / 2, H * .4, "🎉 אתה מוכן! יאללה לרוץ", "#fde047", 1.8, 24); } return; }
      if (!G.tutO && (G.tutT -= dt) <= 0) { const T = TUT[G.tutStep]; G.tutO = { k: T.k, lane: G.lane, z: 40, h: 0, ph: 0, tut: 1 }; G.obj.push(G.tutO); }
    }
    const onVis = async () => { if (!G.run || G.over || G.dead) return; if (document.hidden) { if (!G.paused) { G.paused = true; AU.stopMusic(); } } else if (G.paused && !G.pauseAsk) { G.pauseAsk = 1; await overlay(`<div class="big">⏸️</div><h3>הריצה בהמתנה</h3><p>יצאת מהאפליקציה – עצרנו בשבילך 🙂</p>`, ["▶️ להמשיך"]); G.pauseAsk = 0; G.paused = false; last = performance.now(); AU.music(G.fly > 0 ? "sky" : "run"); } };
    document.addEventListener("visibilitychange", onVis);
    const finish = () => { document.removeEventListener("visibilitychange", onVis); AU.stopMusic(); G.run = false; game = null; removeEventListener("keydown", key); removeEventListener("resize", fit); try { ro && ro.disconnect(); } catch (e) {} delete d.dataset.lock; d.close(); X.hubRefresh(); if (host && host.isConnected) panel(host); };
    const overlay = (html, btns) => new Promise(res => { const o = document.createElement("div"); o.className = "gm-ov"; o.innerHTML = `<div>${html}<div class="rd-btns">${btns.map((b, i) => `<button class="rbtn${i ? " alt" : ""}" type="button" data-i="${i}">${b}</button>`).join("")}</div></div>`; box.appendChild(o); o.querySelectorAll("button").forEach(b => b.onclick = () => { o.remove(); res(+b.dataset.i); }); });
    // ---- סוף ריצה: שומרים את הברגים (או שיא באימון), אתגר יומי, טבלת שיאים ----
    const end = async (why, msg) => {
      if (G.over) return; G.over = true; AU.stopMusic();
      const m = Math.floor(G.dist), rec = m > (X.S.runBest || 0); if (rec) X.S.runBest = m; X.S.runTot = (X.S.runTot || 0) + m; /* 🛤️ לכל הריצות (מדליה) */
      let got = 0; if (!G.practice && G.bolts) { const r = R.runBank(X.S, G.bolts); got = r.bolts; if (got) { X.step(1); RP.goalAdd && RP.goalAdd(got); } }
      if (G.run500) X.trk("run500");
      const st = Object.assign(G.stats, { dist: m, bolts: G.bolts, cleanDist: Math.max(G.stats.cleanDist, G.dist - G.cleanFrom) });
      setTimeout(() => RP.rankLine(box, "run", m), 300);
      if (!G.practice) { const c = R.challengeCheck(X.S, "run", st); if (c) setTimeout(() => { X.SFX.gift(); X.toast(`🎯 <b>אתגר יומי הושלם!</b> ${esc(c.n)} – קיבלת 💠 תיבת מגה`, ["לפתוח", () => X.openBoxes(["mega"])], 9000); }, 600); }
      X.save(); X.SFX.coin();
      if (why === "x") { if (got) X.toast(`🏃 שמרת ${got} ברגים מהריצה`, null, 3000); return finish(); }
      const more = true;
      const i = await overlay(`<div class="big">${why === "bell" ? "🔔" : rec ? "🏆" : why === "caught" ? "🤖" : "💥"}</div><h3>${why === "bell" ? "ההפסקה נגמרה!" : msg || (rec ? "שיא חדש!" : "נתקעת!")}</h3>${rec && msg ? "<p><b>🏆 שיא חדש!</b></p>" : ""}<p>📏 ${m} מטר · ⬆️ קצב ${G.lv} · ${world().n}</p><p>${G.practice ? "🏋️ אימון – בלי פרסים" : `+${got} ברגים 🔩${got < G.bolts ? " (הגעת למקסימום של היום)" : ""}`}</p>${X.S.runBest ? `<p>🏆 השיא שלך: ${X.S.runBest} מ'</p>` : ""}<p class="rk"></p>`, more ? ["🔄 עוד ריצה", "סיום"] : ["סיום"]);
      if (more && i === 0) newRun(); else finish();
    };
    const exitRun = () => { if (!G.run) return; if (G.over || G.dead) return G.over ? finish() : null; end("x"); };
    d.querySelector(".x").onclick = exitRun; d.querySelector("#rnExit").onclick = exitRun; d.oncancel = e => { e.preventDefault(); exitRun(); };
    // ---- שליטה: החלקות (וגם לחיצה על צד המסך) + מקלדת ----
    const act = a => { if (G.over || G.dead) return;
      if (G.cd > 0) return;
      if (a === "L" || a === "R") { if (G.ice > 0) { fxText(W / 2, H * .5, "🧊 מחליק! אי אפשר לפנות", "#bae6fd", .7, 16); return; } const nl = Math.max(-1, Math.min(1, G.lane + (a === "R" ? 1 : -1))); if (nl !== G.lane) { G.leanV = nl - G.lane; G.fromL = G.pl; G.hopT = 0; G.lane = nl; G.laneT = G.t; burst(botX(), GY() - 6, "rgba(226,232,240,.9)", 7, 110); AU.lane(); } else { G.shake = Math.max(G.shake, .08); } }
      else if (G.fly > 0) return; // באוויר – רק ימינה ושמאלה
      else if (a === "U" && (G.jt >= 0 || G.big >= 0)) { G.buf = { a: "U", t: G.t }; } // 🕹️ זוכרים קפיצה שנלחצה מוקדם מדי
      else if (a === "U" && G.jt < 0 && G.big < 0) { G.jt = 0; G.st = -1; AU.jump(); }
      else if (a === "D") { if (G.jt >= 0) G.jt = Math.max(G.jt, .5); G.st = 0; AU.slide(); } };
    let sx0 = 0, sy0 = 0, sw = false;
    box.addEventListener("pointerdown", e => { sx0 = e.clientX; sy0 = e.clientY; sw = true; });
    box.addEventListener("pointermove", e => { if (!sw) return; const dx = e.clientX - sx0, dy = e.clientY - sy0; if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) { sw = false; act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy < 0 ? "U" : "D")); } });
    box.addEventListener("pointerup", e => { if (!sw) return; sw = false; const r = box.getBoundingClientRect(); act(e.clientX - r.left < W / 2 ? "L" : "R"); });
    box.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    const key = e => { const k = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", " ": "U", ArrowDown: "D" }[e.key]; if (k) { e.preventDefault(); act(k); } }; addEventListener("keydown", key);
    // ---- יצירת שורות: תמיד נשאר לפחות מסלול אחד פנוי ----
    const add = o => G.obj.push(Object.assign({ z: 90, h: 0, ph: Math.random() * 6 }, o));
    const SKY = k => ["bird", "drone", "rainbow", "sbolt"].includes(k);
    function row() {
      G.rows++; const L = G.lv, free = Math.floor(Math.random() * 3) - 1, lanes = [-1, 0, 1].filter(x => x !== free);
      // 😠 ביריון: מדי פעם (משלב 2) – תופס את המסלול שלו + צד אחד
      if (L >= 2 && G.rows % 23 === 11) { const ln = Math.floor(Math.random() * 3) - 1, arm = ln === -1 ? 1 : ln === 1 ? -1 : (Math.random() < .5 ? -1 : 1); add({ k: "bully", lane: ln, base: ln, arm, z: 92, ph: Math.random() * 6 }); const safe = [-1, 0, 1].find(l => l !== ln && l !== ln + arm); for (let i = 0; i < 3; i++) add({ k: "bolt", lane: safe, z: 96 + i * 2.6 }); return; }
      const nOb = L >= 3 && Math.random() < .3 + L * .04 ? 2 : 1;
      const used = lanes.sort(() => Math.random() - .5).slice(0, nOb), OB = L >= 2 ? ["bench", "beam", "locker"] : ["bench", "beam"];
      for (const ln of used) { const t = OB[Math.floor(Math.random() * OB.length)]; add({ k: t, lane: ln }); if (t === "bench" && Math.random() < .4) for (let i = -1; i <= 1; i++) add({ k: "bolt", lane: ln, z: 90 + i * 2.2, h: 1.1 - Math.abs(i) * .3 }); }
      const cnt = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < cnt; i++) add({ k: Math.random() < .05 + L * .006 ? "gold" : "bolt", lane: free, z: 92 + i * 2.6 });
      // מיוחדים במסלול הפנוי: 💩 / 🤸 / 🧊 / כוח
      const luck = R.upg(X.S, "luck"), zz = 92 + cnt * 2.6 + 3;
      if (G.rows % Math.max(9, 16 - luck * 2) === 6) add({ k: "poop", lane: free, z: zz });
      else if (G.rows % 11 === 3) add({ k: "tramp", lane: free, z: zz });
      else if (G.rows % 13 === 8 && L >= 2) add({ k: "ice", lane: free, z: zz });
      else if (G.rows % Math.max(7, 14 - luck * 2) === 0) { const ks = Object.keys(POW); add({ k: "pow", p: ks[Math.floor(Math.random() * ks.length)], lane: free, z: zz }); }
    }
    // שורה בשמיים (בזמן עפיפה)
    function skyRow() {
      G.rows++; const free = Math.floor(Math.random() * 3) - 1, lanes = [-1, 0, 1].filter(x => x !== free).sort(() => Math.random() - .5), n = G.lv >= 5 && Math.random() < .35 ? 2 : 1;
      for (const ln of lanes.slice(0, n)) add({ k: G.lv >= 3 && Math.random() < .18 ? "drone" : "bird", lane: ln, ph: Math.random() * 6 }); // 🛸 פחות רחפנים (11.11)
      for (let i = 0; i < 4; i++) add({ k: "sbolt", lane: free, z: 92 + i * 2.4 });
      if (G.rows % 5 === 0) add({ k: "rainbow", lane: free, z: 104 });
    }
    const fxText = (x, y, t, c, life = 1, size = 20) => { G.fx = G.fx.filter(q => q.big); G.fx.push({ x, y, t, c, a: life, life, size }); };
    const burst = (x, y, col, n = 10, sp = 160) => { if (G.parts.length > 160) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (.4 + Math.random()); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: .5 + Math.random() * .4, a: 1, c: col, s: 2 + Math.random() * 3 }); } };
    const BIGT = 1.3;
    const jumpH = () => G.big >= 0 ? Math.sin(Math.PI * Math.min(1, G.big / BIGT)) * 3 : G.jt < 0 ? 0 : Math.sin(Math.PI * Math.min(1, G.jt / .62)) * 1.25, sliding = () => G.st >= 0 && G.st < .62;
    const botX = () => sx(G.pl, 0), botY = () => GY() - Math.min(W * .27, 112) * .75 - G.alt * H * .32 - jumpH() * H * .14;
    let last = performance.now(), secT = 0;
    const addBolts = (n0, gold) => { const cap = G.practice ? Infinity : left(), mult = G.pw.double > 0 || G.rainbowT > 0 ? 2 : 1, n = Math.min(n0 * mult, Math.max(0, cap - G.bolts)); G.bolts += n; G.combo++; if (n) { if (G.flyers.length < 14) G.flyers.push({ x: botX(), y: botY() - 20, t: 0, gold }); if (G.rings.length < 10) G.rings.push({ x: botX(), y: botY() - 10, r: 8, a: .9, c: gold ? "rgba(250,204,21," : "rgba(186,230,253," }); gold ? AU.gold() : AU.coin(G.combo); burst(botX(), botY(), gold ? "#fde047" : "#bae6fd", gold ? 10 : 4, 140); if (gold || n > 1) fxText(botX(), botY() - 50, "+" + n, "#fde047", .8, 24); } hud(); };
    // ---- 💩 עפיפה ----
    function startFly() {
      G.fly = 10 + R.upg(X.S, "flight") * 2; G.stats.flights++; AU.fart(); setTimeout(() => AU.fart(), 250); X.vib([40, 30, 40, 30, 80]); G.shake = .3;
      G.obj = G.obj.filter(o => o.z < 0); G.next = 14; G.jt = -1; G.st = -1; G.big = -1;
      fxText(W / 2, H * .35, "💩 קקי קסם!!! עפים! 💨", "#a16207", 2, 30); AU.music("sky");
      for (let i = 0; i < 8; i++) G.puffs.push({ x: botX() + (Math.random() - .5) * 60, y: GY() - 20, r: 10 + Math.random() * 16, a: 1, txt: i === 0 });
    }
    function endFly(knocked) {
      G.fly = 0; G.obj = G.obj.filter(o => !SKY(o.k)); G.next = 22; AU.music("run");
      if (knocked) { AU.bird(); AU.stumble(); fxText(W / 2, H * .4, "🐦 ציפור הפילה אותך!", "#fca5a5", 1.4, 22); } else fxText(W / 2, H * .4, "🛬 נחיתה!", "#fde68a", 1, 22);
      setTimeout(() => { AU.land(); burst(botX(), GY() - 10, "#d6d3d1", 20, 160); }, 500);
    }
    // ---- מעידה / התנגשות ----
    function stumble(o, what) { G.hurtT = .5;
      if (G.pw.turbo > 0 || G.fly > 0) return;
      if (G.tut) { o.gone = 1; G.tutO = null; G.tutT = .8; AU.stumble(); fxText(W / 2, H * .45, "אופס! ננסה שוב 🙂", "#fde68a", 1.2, 22); return; }
      if (G.shield) { G.shield = false; AU.shield(); X.vib(40); burst(botX(), botY(), "#38bdf8", 26, 220); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); o.gone = 1; return; }
      o.gone = 1; G.stats.cleanDist = Math.max(G.stats.cleanDist, G.dist - G.cleanFrom); G.cleanFrom = G.dist;
      if (G.chase > 0) { G.dead = true; G.slow = .9; G.deathT = 0; G.shake = .8; AU.stomp(); AU.crash(); X.vib([80, 40, 160]); burst(botX(), botY(), "#ef4444", 40, 300); fxText(W / 2, H * .4, "🤖 הרובוט הענק תפס אותך!", "#f87171", 1.5, 22); setTimeout(() => end("caught", "הרובוט הענק תפס אותך!"), 1100); return; }
      G.chase = 7; G.chaseX = 0; G.v *= .7; AU.stumble(); setTimeout(() => AU.stomp(), 300); X.vib([40, 30, 60]); G.shake = .35; fxText(W / 2, H * .42, `😵 מעדת ב${what}! הרובוט הענק רודף אחריך!`, "#fdba74", 1.8, 17);
    }
    // 🤖 רובוט אוטומטי – רק בטלפון של מנהל המערכת (כפתור 🤖 למעלה). משחק לבד עד שלוחצים שוב
    const autoOn = () => LS.get("roboBot", "") === "1" && X.powers && X.powers().owner;
    function autoRun() {
      if (G.cd > 0 || G.dead || G.over) return;
      const near = (ln, z0, z1, ks) => G.obj.filter(o => !o.gone && o.z > z0 && o.z < z1 && Math.abs(o.lane - ln) < .5 && (!ks || ks.includes(o.k)));
      const bad = G.fly > 0 ? ["bird", "drone"] : ["locker", "bully"], score = ln => {
        if (ln < -1 || ln > 1) return -1e9; let v = 0;
        for (const o of G.obj) { if (o.gone || o.z <= 0 || o.z > 16) continue; const w = 16 - o.z;
          if (o.k === "bully") { if (Math.abs(o.base - ln) < .5) v -= w * 40; }
          else if (Math.abs(o.lane - ln) < .5) { if (bad.includes(o.k)) v -= w * 40; else if (["bench", "beam"].includes(o.k)) v -= w * 2; else if (["bolt", "gold", "sbolt", "pow", "rainbow"].includes(o.k)) v += w * (o.k === "gold" || o.k === "pow" ? 3 : 1); else if (o.k === "poop" && G.fly <= 0) v += w * 2; } }
        return v - Math.abs(ln - G.lane) * 3; };
      if (G.ice <= 0 && G.t - G.laneT > .18) { const cur = score(G.lane), l = score(G.lane - 1), r = score(G.lane + 1); if (l > cur + 5 && l >= r) act("L"); else if (r > cur + 5) act("R"); }
      if (G.fly > 0) return;
      const t = near(G.lane, 0, 4.2, ["bench", "beam"])[0], bl = G.obj.find(o => !o.gone && o.k === "bully" && o.z > 0 && o.z < 4 && Math.abs(o.base + o.arm - G.lane) < .5 && Math.abs(o.base - G.lane) >= .5);
      if (bl && !sliding()) act("D"); else if (t && t.k === "bench" && G.jt < 0 && G.big < 0) act("U"); else if (t && t.k === "beam" && !sliding()) act("D");
    }
    function crash() {
      if (G.pw.turbo > 0 || G.fly > 0) return false;
      if (G.tut) { if (G.tutO) G.tutO.gone = 1; G.tutO = null; G.tutT = .8; AU.stumble(); fxText(W / 2, H * .45, "אופס! עקוף אותו – ננסה שוב 🙂", "#fde68a", 1.2, 20); return false; }
      if (G.shield) { G.shield = false; AU.shield(); X.vib(40); burst(botX(), botY(), "#38bdf8", 26, 220); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); return false; }
      G.dead = true; G.slow = .9; G.deathT = 0; G.shake = .7; AU.crash(); X.vib([80, 40, 160]); burst(botX(), botY(), "#ef4444", 40, 300); burst(botX(), botY(), "#fde047", 25, 220);
      setTimeout(() => end("crash"), 1300); return true;
    }
    function loop(now) {
      if (!G.run || G.over) return; if (!d.open) { finish(); return; }
      if (G.paused) { last = now; requestAnimationFrame(loop); return; }
      if (W < 50 || H < 50) fit();
      const raw = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
      const dt = raw * (G.slow > 0 ? .3 : 1); if (G.slow > 0) G.slow -= raw; if (G.deathT >= 0) G.deathT += raw;
      // ⏱️ ספירה לאחור 3-2-1
      if (G.cd > 0) { const c0 = Math.ceil(G.cd); G.cd -= raw; const c1 = Math.ceil(G.cd); if (c1 !== c0) { c1 > 0 ? AU.coin(2) : AU.level(5); X.vib(c1 > 0 ? 15 : 40); } G.t += raw * .2; draw(raw); requestAnimationFrame(loop); return; }
      if (!G.dead) {
        G.t += dt;
        if ((secT += dt) > 1) { secT = 0; const bs = RP.breakState(); if (!bs.open && !G.practice) { end("bell"); return; } const tl = d.querySelector("#rnT"); if (bs.until != null && !G.practice) { const n = new Date(), s = bs.until * 60 - (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()); tl.textContent = s > 0 ? `⏰ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""; } else tl.textContent = ""; }
        const lv = Math.min(10, 1 + Math.floor(G.dist / 250)); if (lv > G.lv) { G.lv = lv; G.lvT = 1.6; AU.level(lv); X.vib([30, 20, 60]); burst(W / 2, H * .35, LV_COL[lv - 1], 30, 260); }
        const wi = Math.floor(G.dist / 500); if (wi > G.wIdx) { G.wIdx = wi; G.wT = 2.2; G.stats.world = Math.max(G.stats.world, wi + 1); AU.rainbow(); fxText(W / 2, H * .3, `🌍 עולם חדש: ${world().n}!`, "#fff", 2.2, 24); }
        tutTick(dt);
        G.v = G.tut ? 9 : Math.min(36, 13 + G.dist * .012) * (G.pw.turbo > 0 ? 1.7 : 1) * (G.ice > 0 ? 1.35 : 1) * (G.fly > 0 ? 1.15 : 1);
        const dz = G.v * dt; G.dist += dz; if (G.ch && !G.tut) G.ch.update(G.dist); if (G.dist >= 500) G.run500 = true;
        for (const k of Object.keys(G.pw)) { G.pw[k] -= dt; if (G.pw[k] <= 0) { delete G.pw[k]; AU.shield(); fxText(W / 2, H * .38, `${POW[k].em} ${POW[k].n} נגמר`, "#e2e8f0", .9, 17); } }
        if (G.hurtT > 0) G.hurtT -= dt; G.camB *= Math.pow(.004, dt);
        if (G.rainbowT > 0) G.rainbowT -= dt;
        if (G.jt >= 0) { G.jt += dt; if (G.jt > .62) { G.jt = -1; G.landT = .16; burst(botX(), GY() - 6, "#cbd5e1", 8, 90); G.rings.push({ x: botX(), y: GY() - 4, r: 8, a: .8, c: "rgba(226,232,240,", flat: 1 }); G.camB = 5; if (G.buf && G.t - G.buf.t < .25) { G.buf = null; G.jt = 0; AU.jump(); } } }
        if (G.st >= 0) { G.st += dt; if (G.st > .62) G.st = -1; }
        if (G.big >= 0) { G.big += dt; if (G.big > BIGT) { G.big = -1; G.landT = .22; AU.land(); G.rings.push({ x: botX(), y: GY() - 4, r: 10, a: 1, c: "rgba(187,247,208,", flat: 1 }); G.camB = 10; G.shake = Math.max(G.shake, .15); burst(botX(), GY() - 10, "#d6d3d1", 14, 140); if (G.buf && G.t - G.buf.t < .3) { G.buf = null; G.jt = 0; AU.jump(); } } }
        if (G.landT > 0) G.landT -= dt; G.leanV *= Math.pow(.02, dt);
        if (G.ice > 0) G.ice -= dt;
        if (G.chase > 0) { G.chase -= dt; if (Math.floor(G.chase * 2) !== Math.floor((G.chase + dt) * 2)) AU.stomp(); if (G.chase <= 0) fxText(W / 2, H * .45, "😅 ברחת מהרובוט הענק!", "#86efac", 1.2, 20); }
        // 💩 עפיפה: גובה, פלוצים
        if (G.fly > 0) { G.fly -= dt; G.alt = Math.min(1, G.alt + dt * 2.2); if ((G.nPuff -= dt) <= 0) { G.nPuff = .55 + Math.random() * .4; AU.fart(); G.puffs.push({ x: botX() + (Math.random() - .5) * 20, y: botY() + 40, r: 12 + Math.random() * 10, a: 1, txt: Math.random() < .35 }); } if (G.fly <= 0) endFly(false); }
        else G.alt = Math.max(0, G.alt - dt * 2.5);
        // ↔️ מעבר מסלול: קפיצונת קטנה עם האטה בסוף (במקום החלקה רכה) – מרגיש חד וקופצני
        if (G.hopT >= 0) { G.hopT += dt; const p0 = Math.min(1, G.hopT / .17), e = 1 - Math.pow(1 - p0, 3); G.pl = G.fromL + (G.lane - G.fromL) * e; if (p0 >= 1) { G.hopT = -1; G.pl = G.lane; } } else G.pl += (G.lane - G.pl) * Math.min(1, dt * 14);
        if (autoOn()) autoRun();
        if ((G.next -= dz) <= 0) { if (G.fly > 0) { skyRow(); G.next = Math.max(11, 18 - G.lv * .7) + Math.random() * 5; } else { row(); G.next = Math.max(10, 19 - G.lv * .9) + Math.random() * 6; } }
        const jh = jumpH(), mag = G.pw.magnet > 0, turbo = G.pw.turbo > 0, high = G.big >= 0 && jh > 1;
        for (const o of G.obj) {
          const pz = o.z; o.z -= dz;
          if (o.k === "bully") { o.lane = o.base + Math.sin(G.t * 2.2 + o.ph) * .12; if (!o.yell && o.z < 30) { o.yell = 1; AU.bully(); } }
          if (o.k === "drone" || o.k === "bird") o.lane += Math.sin(G.t * 3 + o.ph) * dt * .25;
          if ((mag || turbo) && (o.k === "bolt" || o.k === "gold" || o.k === "sbolt") && o.z < 22 && o.z > 0) { o.lane += (G.pl - o.lane) * Math.min(1, dt * 6); o.h += (jh - o.h) * Math.min(1, dt * 6); }
          if (o.gone || !(pz > 0 && o.z <= .6)) continue;
          const same = Math.abs(o.lane - G.pl) < .5;
          // 😎 כמעט! עקפת מכשול ממש ברגע האחרון
          if (!same && !o.near && ["locker", "bench", "beam"].includes(o.k) && G.t - G.laneT < .4 && Math.abs(o.lane - G.pl) < 1.3 && G.fly <= 0) { o.near = 1; G.nearN++; AU.whoosh(); addBolts(2, false); fxText(W / 2, H * .5, "😎 כמעט! +2", "#86efac", .9, 24); G.shake = Math.max(G.shake, .12); }
          if (o.k === "bolt" || o.k === "gold") { if (same && G.fly <= 0 && (turbo || Math.abs(o.h - jh) < .75 || (high && o.h > .5))) { o.gone = 1; addBolts(o.k === "gold" ? 5 : 1, o.k === "gold"); } }
          else if (o.k === "sbolt") { if (same && G.fly > 0) { o.gone = 1; addBolts(1, false); } }
          else if (o.k === "pow") { if (same && G.fly <= 0) { o.gone = 1; const P = POW[o.p]; if (o.p === "shield") G.shield = true; else { G.pw[o.p] = P.t + (o.p === "magnet" ? R.upg(X.S, "magnet") * 3 : 0); G.pwMax[o.p] = G.pw[o.p]; } G.rings.push({ x: botX(), y: botY(), r: 20, a: 1, c: hexA(P.c) }); AU.power(); X.vib(30); burst(botX(), botY(), P.c, 24, 220); fxText(W / 2, H * .42, `${P.em} ${P.n}!`, P.c, 1.2, 26); } }
          else if (o.k === "poop") { if (same && G.fly <= 0 && jh < .6) { o.gone = 1; startFly(); } }
          else if (o.k === "tramp") { if (same && G.fly <= 0 && jh < .6) { o.gone = 1; G.big = 0; G.jt = -1; G.st = -1; AU.boing(); X.vib(30); fxText(W / 2, H * .45, "🤸 בוינג!", "#86efac", 1, 26); } }
          else if (o.k === "ice") { if (same && G.fly <= 0 && jh < .6) { o.gone = 1; G.ice = 1.6; const reach = G.v * 1.35 * 1.8 + 6; for (const q of G.obj) if (q !== o && Math.abs(q.lane - G.lane) < .5 && q.z > 0 && q.z < reach && ["locker", "bench", "beam", "bully"].includes(q.k)) q.gone = 1; G.next = Math.max(G.next, reach); AU.whoosh(); fxText(W / 2, H * .45, "🧊 מחליקים!!!", "#bae6fd", 1.2, 24); } }
          else if (o.k === "rainbow") { if (same && G.fly > 0) { o.gone = 1; G.rainbowT = 6; AU.rainbow(); X.vib(30); fxText(W / 2, H * .4, "🌈 קשת! כל בורג ×2", "#f0abfc", 1.4, 24); burst(botX(), botY(), "#f0abfc", 30, 240); } }
          else if (o.k === "bird") { if (same && G.fly > 0) { o.gone = 1; if (G.shield) { G.shield = false; AU.shield(); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); } else { endFly(true); G.shake = .4; X.vib([50, 30, 50]); } } }
          else if (o.k === "drone") { if (same && G.fly > 0) { o.gone = 1; if (G.shield) { G.shield = false; AU.shield(); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); } else { const take = Math.ceil(G.bolts / 2); G.bolts -= take; G.hurtT = .5; AU.drone(); AU.thief(); G.shake = .3; X.vib([40, 30, 40]); fxText(W / 2, H * .42, take ? `🛸 הרחפן גנב ${take}!` : "🛸 הרחפן לא מצא כלום 😅", "#e879f9", 1.4, 22); G.fx.push({ big: 1, drone: 1, x: botX(), y: botY(), a: 1.2, life: 1.2 }); hud(); } } }
          else if (o.k === "bully") {
            if (G.fly > 0 || turbo || high) { o.gone = 1; continue; }
            const body = Math.abs(o.base - G.pl) < .5, grab0 = Math.abs(o.base + o.arm - G.pl) < .5, grab = grab0 && !sliding(); // 🛝 אפשר להחליק מתחת ליד של הביריון
            if (grab0 && !grab && !body) { o.gone = 1; G.stats.bullyPass++; AU.whoosh(); addBolts(3, false); fxText(W / 2, H * .45, "🛝 החלקת מתחת ליד! +3", "#86efac", 1.1, 22); continue; }
            o.gone = 1;
            if (body || grab) { if (G.shield) { G.shield = false; AU.shield(); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך מהביריון!", "#7dd3fc", 1.3, 18); } else { const take = Math.max(G.bolts ? 1 : 0, Math.floor(G.bolts * .2)); G.bolts -= take; G.hurtT = .5; AU.bully(); AU.thief(); G.shake = .4; X.vib([60, 40, 60]); fxText(W / 2, H * .42, take ? `😠 הביריון לקח לך ${take} ברגים!` : "😠 הביריון ניסה… אבל אין לך ברגים 😅", "#fca5a5", 1.6, 19); hud(); } }
            else { G.stats.bullyPass++; AU.coin(8); fxText(W / 2, H * .45, "😎 עקפת את הביריון!", "#86efac", 1, 20); }
          }
          else if (same && !high && G.fly <= 0) {
            if (o.k === "locker") { if (crash()) break; else o.gone = 1; }
            else if (o.k === "bench" && jh < .45) stumble(o, "ספסל");
            else if (o.k === "beam" && !sliding()) stumble(o, "מוט");
          }
          if (G.dead) break;
        }
        G.obj = G.obj.filter(o => !o.gone && o.z > -6);
      }
      for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.a -= dt / p.life; } G.parts = G.parts.filter(p => p.a > 0);
      for (const q of G.puffs) { q.a -= dt * .7; q.r += dt * 18; q.y += dt * 60; } G.puffs = G.puffs.filter(q => q.a > 0);
      for (const q of G.flyers) q.t += raw * 1.6; G.flyers = G.flyers.filter(q => q.t < 1);
      G.shake = Math.max(0, G.shake - dt); if (Math.floor(G.dist) % 5 === 0) hud();
      draw(dt); requestAnimationFrame(loop);
    }
    // ---- ציור ----
    function draw(dt) {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.save();
      if (G.shake > 0) cx.translate((Math.random() - .5) * G.shake * 30, (Math.random() - .5) * G.shake * 30);
      const hy = HOR(), lc = LV_COL[G.lv - 1], turbo = G.pw.turbo > 0, Wd = world(), sky = G.alt;
      // 🎥 מצלמה: נוטה לכיוון הפנייה וזזה קצת עם הרובוט (כמו במשחקי ריצה גדולים)
      G.camX += (G.pl - G.camX) * Math.min(1, dt * 6); G.zoom += ((turbo ? .93 : G.fly > 0 ? .96 : 1) + (G.lvT > 1.2 ? .03 : 0) - G.zoom) * Math.min(1, dt * 4);
      cx.save(); cx.translate(W / 2, H * .75 + G.camB); cx.rotate(-G.leanV * .05); cx.scale(G.zoom, G.zoom); cx.translate(-W / 2 - G.camX * W * .05, -H * .75);
      if (sky > .5) drawSky(dt); else drawGround(Wd, turbo);
      // 🌫️ ערפל באופק – הדברים מופיעים בהדרגה מהמרחק
      if (sky <= .5) { const fg = cx.createLinearGradient(0, hy - 10, 0, hy + H * .12); fg.addColorStop(0, Wd.sky[1]); fg.addColorStop(1, "rgba(0,0,0,0)"); cx.globalAlpha = .75; cx.fillStyle = fg; cx.fillRect(-40, hy - 10, W + 80, H * .12); cx.globalAlpha = 1; }
      // אובייקטים מהרחוק לקרוב
      const objs = G.obj.filter(o => o.z > -1.5 && o.z < 92 && (sky > .5 ? SKY(o.k) : !SKY(o.k))).sort((a, b) => b.z - a.z);
      for (const o of objs) { cx.globalAlpha = Math.max(0, Math.min(1, (94 - o.z) / 22)); if (sky <= .5 && ["locker", "bench", "beam", "bully", "poop", "tramp"].includes(o.k)) { const s2 = sc(o.z); cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(sx(o.lane, o.z), sy(o.z), W * .13 * s2, W * .025 * s2, 0, 0, 7); cx.fill(); } drawObj(o, sky > .5); } cx.globalAlpha = 1;
      drawChaser();
      cx.restore();
      // 💨 קווי מהירות
      if ((G.v > 24 || turbo || G.fly > 0) && !G.dead) { if (G.lines.length < 26 && Math.random() < .7) { const a = Math.random() * 6.28; G.lines.push({ a, r: 40 + Math.random() * 60, l: 30 + Math.random() * 50 }); } }
      cx.strokeStyle = turbo ? "rgba(233,213,255,.55)" : "rgba(255,255,255,.35)"; cx.lineWidth = 2; const vx0 = W / 2, vy0 = hy;
      for (const q of G.lines) { q.r += dt * (900 + G.v * 30); const x1 = vx0 + Math.cos(q.a) * q.r, y1 = vy0 + Math.sin(q.a) * q.r * .8, x2 = vx0 + Math.cos(q.a) * (q.r + q.l), y2 = vy0 + Math.sin(q.a) * (q.r + q.l) * .8; if (Math.hypot(x1 - vx0, y1 - vy0) > W * .25) { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); } }
      G.lines = G.lines.filter(q => q.r < W * 1.2);
      drawBot();
      for (const q of G.puffs) { cx.globalAlpha = Math.max(0, q.a) * .8; cx.fillStyle = "#a3a380"; cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, 7); cx.fill(); cx.fillStyle = "#c7c7a1"; cx.beginPath(); cx.arc(q.x - q.r * .3, q.y - q.r * .3, q.r * .6, 0, 7); cx.fill(); if (q.txt) { cx.fillStyle = "#713f12"; cx.font = "900 15px system-ui,sans-serif"; cx.textAlign = "center"; cx.fillText("פפפט!", q.x, q.y + 4); } } cx.globalAlpha = 1;
      for (const p of G.parts) { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.s * .6, 0, 7); cx.fill(); } cx.globalAlpha = 1;
      // ✨ טבעות: איסוף, נחיתה, כוח
      for (const q of G.rings) { q.r += dt * (q.flat ? 160 : 120); q.a -= dt * 2.2; if (q.a <= 0) continue; cx.strokeStyle = q.c + Math.max(0, q.a) + ")"; cx.lineWidth = 3; cx.beginPath(); if (q.flat) cx.ellipse(q.x, q.y, q.r * 1.6, q.r * .35, 0, 0, 7); else cx.arc(q.x, q.y, q.r, 0, 7); cx.stroke(); } G.rings = G.rings.filter(q => q.a > 0);
      if (G.hurtT > 0) { const vg = cx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); vg.addColorStop(0, "rgba(239,68,68,0)"); vg.addColorStop(1, `rgba(239,68,68,${Math.min(.5, G.hurtT)})`); cx.fillStyle = vg; cx.fillRect(0, 0, W, H); }
      cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const q of G.fx) { q.a -= dt; if (q.drone) { q.y -= 140 * dt; q.x += 80 * dt; cx.globalAlpha = Math.max(0, q.a / q.life); cx.font = "32px sans-serif"; cx.fillText("🛸💰", q.x, q.y); cx.globalAlpha = 1; continue; } q.y -= 40 * dt; cx.globalAlpha = Math.max(0, q.a / q.life); cx.font = `900 ${q.size}px system-ui,sans-serif`; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText(q.t, q.x, q.y); cx.fillStyle = q.c; cx.fillText(q.t, q.x, q.y); } cx.globalAlpha = 1; G.fx = G.fx.filter(q => q.a > 0);
      // למעלה: קצב, עולם, כוחות, זמן עפיפה
      cx.font = "900 15px system-ui,sans-serif"; cx.textAlign = "right"; cx.fillStyle = lc; cx.fillText(`⬆️ קצב ${G.lv}${G.practice ? " · 🏋️ אימון" : ""}`, W - 10, 18);
      if (G.lv < 10) { const pr = (G.dist % 250) / 250; cx.fillStyle = "rgba(255,255,255,.15)"; cx.fillRect(W - 110, 28, 100, 5); cx.fillStyle = lc; cx.fillRect(W - 10 - 100 * pr, 28, 100 * pr, 5); }
      cx.font = "800 12px system-ui,sans-serif"; cx.fillStyle = "rgba(255,255,255,.8)"; cx.fillText(Wd.n, W - 10, 44);
      // ⏱️ כמה זמן נשאר לכל כוח: עיגול שמתרוקן + שניות (למטה, שלא יסתיר את המשחק)
      { const chips = Object.entries(G.pw).map(([k, v]) => ({ em: POW[k].em, c: POW[k].c, v, max: G.pwMax[k] || POW[k].t || v, n: POW[k].n })); if (G.shield) chips.push({ em: "🛡️", c: "#7dd3fc", v: 1, max: 1, n: "מגן", inf: 1 }); if (G.rainbowT > 0) chips.push({ em: "🌈", c: "#f0abfc", v: G.rainbowT, max: 6, n: "×2" });
        const R0 = 21, gap = 58, x0 = W / 2 - (chips.length - 1) * gap / 2, yC = H - 34;
        chips.forEach((q, i) => { const x = x0 + i * gap, fr = Math.max(0, Math.min(1, q.v / q.max)), low = !q.inf && q.v < 1.6 && Math.floor(G.t * 8) % 2;
          cx.fillStyle = "rgba(10,6,30,.7)"; cx.beginPath(); cx.arc(x, yC, R0 + 4, 0, 7); cx.fill(); cx.strokeStyle = "rgba(255,255,255,.18)"; cx.lineWidth = 4; cx.beginPath(); cx.arc(x, yC, R0, 0, 7); cx.stroke();
          cx.strokeStyle = low ? "#ef4444" : q.c; cx.lineWidth = 4; cx.lineCap = "round"; cx.beginPath(); cx.arc(x, yC, R0, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); cx.stroke(); cx.lineCap = "butt";
          cx.textAlign = "center"; cx.textBaseline = "middle"; cx.font = `900 ${q.em.length > 2 ? 13 : 17}px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif`; cx.fillStyle = q.c; cx.fillText(q.em, x, yC - 3);
          cx.font = "900 10px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText(q.inf ? q.n : `${q.v.toFixed(1)}`, x, yC + 11); }); }
      if (G.fly > 0) { cx.textAlign = "center"; cx.font = "900 17px system-ui,sans-serif"; cx.fillStyle = "#fde68a"; cx.fillText(`💩💨 עפים! ${Math.ceil(G.fly)}`, W / 2, 62); cx.fillStyle = "rgba(255,255,255,.2)"; cx.fillRect(W / 2 - 60, 74, 120, 6); cx.fillStyle = "#a16207"; cx.fillRect(W / 2 - 60, 74, 120 * Math.min(1, G.fly / (10 + R.upg(X.S, "flight") * 2)), 6); }
      if (G.chase > 0) { cx.textAlign = "center"; cx.font = "900 15px system-ui,sans-serif"; cx.fillStyle = "#fca5a5"; cx.fillText(`🤖 רודף! עוד ${Math.ceil(G.chase)} – אל תמעד!`, W / 2, 62); }
      if (G.lvT > 0) { G.lvT -= dt; const a = Math.min(1, G.lvT * 2); cx.save(); cx.globalAlpha = a; cx.translate(W / 2, H * .2); cx.textAlign = "center"; cx.font = "900 38px system-ui,sans-serif"; cx.lineWidth = 6; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText(`קצב ${G.lv}!`, 0, 0); cx.fillStyle = lc; cx.fillText(`קצב ${G.lv}!`, 0, 0); cx.font = "800 14px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText(G.lv >= 7 ? "😈 מטורף!" : G.lv >= 4 ? "🔥 מהר יותר!" : "⚡ מאיץ", 0, 24); cx.restore(); }
      if (G.tut && G.tutO && G.tutO.z < 30) { const T = TUT[G.tutStep], pulse = 1 + Math.sin(G.t * 8) * .06; cx.save(); cx.translate(W / 2, H * .5); cx.scale(pulse, pulse); cx.textAlign = "center"; cx.font = "900 26px system-ui,sans-serif"; cx.lineWidth = 6; cx.strokeStyle = "rgba(0,0,0,.7)"; cx.strokeText(T.txt, 0, 0); cx.fillStyle = "#fde047"; cx.fillText(T.txt, 0, 0); cx.font = "800 14px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText(`הדרכה ${G.tutStep + 1}/3`, 0, 26); cx.restore(); }
      // 🔩 ברגים שעפים למונה למעלה
      for (const q of G.flyers) { const e = q.t * q.t, tx = W - 64, ty = -6, x = q.x + (tx - q.x) * e, y = q.y + (ty - q.y) * e - Math.sin(q.t * Math.PI) * 60, r = 9 * (1 - q.t * .5); cx.fillStyle = q.gold ? "#fbbf24" : "#e2e8f0"; cx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + q.t * 6; cx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } cx.fill(); }
      // ⏱️ 3-2-1-יאללה
      if (G.cd > 0) { const n = Math.ceil(G.cd), fr = G.cd - Math.floor(G.cd), sc2 = 1 + fr * .8; cx.save(); cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(0, 0, W, H); cx.translate(W / 2, H * .42); cx.scale(sc2, sc2); cx.globalAlpha = Math.min(1, fr * 2.5 + .2); cx.textAlign = "center"; cx.font = "900 90px system-ui,sans-serif"; cx.lineWidth = 10; cx.strokeStyle = "rgba(0,0,0,.6)"; const t = n > 3 ? "3" : n >= 1 ? String(n) : ""; cx.strokeText(t, 0, 0); cx.fillStyle = ["#22c55e", "#facc15", "#f97316"][Math.max(0, Math.min(2, n - 1))]; cx.fillText(t, 0, 0); cx.restore(); cx.globalAlpha = 1; }
      else if (G.t < 1.2 && !G.dead) { const a = 1 - G.t / 1.2; cx.save(); cx.globalAlpha = a; cx.translate(W / 2, H * .42); cx.scale(1 + G.t, 1 + G.t); cx.textAlign = "center"; cx.font = "900 64px system-ui,sans-serif"; cx.lineWidth = 8; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText("יאללה!", 0, 0); cx.fillStyle = "#fde047"; cx.fillText("יאללה!", 0, 0); cx.restore(); cx.globalAlpha = 1; }
      if (G.t < 3 && !G.dead && !G.tut && G.cd <= 0) { cx.globalAlpha = Math.max(0, 1 - G.t / 3); cx.textAlign = "center"; cx.font = "800 15px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText("⬅️ ➡️ להחליק · ⬆️ לקפוץ · ⬇️ להתכופף", W / 2, H * .55); cx.globalAlpha = 1; }
      cx.restore();
    }
    function drawGround(Wd, turbo) {
      const hy = HOR();
      const bg = cx.createLinearGradient(0, 0, 0, hy); bg.addColorStop(0, Wd.sky[0]); bg.addColorStop(1, turbo ? "#7c3aed" : Wd.sky[1]); cx.fillStyle = bg; cx.fillRect(-20, -20, W + 40, hy + 22);
      if (!Wd.ceil) { if (Wd.decor === "rail" || Wd.decor === "menorah") { cx.fillStyle = "#fff"; for (const st of stars) { cx.globalAlpha = .3 + Math.abs(Math.sin(G.t * 2 + st.x * 9)) * .6; cx.fillRect(st.x * W, st.y * hy, st.s, st.s); } cx.globalAlpha = 1; cx.fillStyle = "#fef3c7"; cx.beginPath(); cx.arc(W * .8, hy * .35, 18, 0, 7); cx.fill(); }
        else { cx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 4; i++) { const x = ((i * 130 - G.dist * .6) % (W + 200) + W + 200) % (W + 200) - 100; cx.beginPath(); cx.ellipse(x, hy * (.3 + (i % 2) * .25), 40, 13, 0, 0, 7); cx.ellipse(x + 22, hy * (.3 + (i % 2) * .25) - 8, 24, 12, 0, 0, 7); cx.fill(); } } }
      cx.fillStyle = Wd.ceil ? "#0f172a" : "rgba(0,0,0,.25)"; cx.beginPath(); cx.moveTo(-20, H + 20); cx.lineTo(sx(-1.5, 90), hy); cx.lineTo(-20, hy - 40); cx.fill(); cx.beginPath(); cx.moveTo(W + 20, H + 20); cx.lineTo(sx(1.5, 90), hy); cx.lineTo(W + 20, hy - 40); cx.fill();
      // קישוטים בצדדים לפי העולם
      for (let i = 0; i < 12; i++) { const z = ((i * 8 - G.dist) % 96 + 96) % 96, s = sc(z), y = sy(z); for (const side of [-1, 1]) { const x = sx(side * 1.62, z), w = W * .09 * s, h = H * .5 * s; cx.globalAlpha = .55 + s * .4; cx.fillStyle = Wd.wall[i % 3];
        if (Wd.decor === "trees") { cx.fillStyle = "#78350f"; cx.fillRect(x - w * .12, y - h * .5, w * .24, h * .5); cx.fillStyle = Wd.wall[i % 3]; cx.beginPath(); cx.arc(x, y - h * .62, w * .9, 0, 7); cx.fill(); }
        else if (Wd.decor === "tables") { cx.fillRect(x - w * .8, y - h * .35, w * 1.6, h * .08); cx.fillStyle = "#451a03"; cx.fillRect(x - w * .6, y - h * .27, w * .1, h * .27); cx.fillRect(x + w * .5, y - h * .27, w * .1, h * .27); cx.fillStyle = "#fde68a"; cx.beginPath(); cx.arc(x, y - h * .4, w * .18, 0, 7); cx.fill(); }
        else if (Wd.decor === "doors") { cx.fillRect(x - w / 2, y - h * .8, w, h * .8); cx.fillStyle = "rgba(255,255,255,.75)"; cx.font = `900 ${Math.max(6, Math.round(14 * s))}px system-ui`; cx.textAlign = "center"; cx.fillText(String(100 + i), x, y - h * .65); cx.fillStyle = "#facc15"; cx.fillRect(x + side * -w * .3, y - h * .4, w * .1, h * .05); }
        else if (Wd.decor === "menorah") { cx.fillStyle = "#facc15"; cx.fillRect(x - w * .04, y - h * .45, w * .08, h * .45); cx.fillRect(x - w * .7, y - h * .45, w * 1.4, h * .04); for (let k = -3; k <= 3; k++) { const fx = x + k * w * .2, fy = y - h * .5; cx.fillStyle = "#fde68a"; cx.fillRect(fx - w * .03, fy, w * .06, h * .06); cx.fillStyle = Math.sin(G.t * 12 + k + i) > 0 ? "#fb923c" : "#fde047"; cx.beginPath(); cx.ellipse(fx, fy - h * .03, w * .035, h * .035, 0, 0, 7); cx.fill(); } }
        else if (Wd.decor === "rail") { cx.fillStyle = "#64748b"; cx.fillRect(x - w * .05, y - h * .25, w * .1, h * .25); cx.fillRect(x - w * .8, y - h * .25, w * 1.6, h * .03); }
        else { cx.fillRect(x - w / 2, y - h, w, h); cx.fillStyle = "rgba(255,255,255,.25)"; cx.fillRect(x - w * .3, y - h * .8, w * .6, Math.max(1, h * .03)); cx.fillRect(x - w * .3, y - h * .72, w * .6, Math.max(1, h * .03)); } } } cx.globalAlpha = 1;
      if (Wd.ceil) for (let i = 0; i < 12; i++) { const z = ((i * 8 - G.dist) % 96 + 96) % 96, s = sc(z), y = hy - hy * .92 * s; cx.fillStyle = turbo ? "#f0abfc" : "#e0f2fe"; cx.globalAlpha = .25 + s * .6; cx.fillRect(W / 2 - W * .16 * s, y, W * .32 * s, Math.max(1, 6 * s)); } cx.globalAlpha = 1;
      const fl = cx.createLinearGradient(0, hy, 0, H); fl.addColorStop(0, Wd.floor[0]); fl.addColorStop(1, Wd.floor[1]); cx.fillStyle = fl;
      cx.beginPath(); cx.moveTo(sx(-1.5, 90), hy); cx.lineTo(sx(1.5, 90), hy); cx.lineTo(sx(1.5, -.8), H); cx.lineTo(sx(-1.5, -.8), H); cx.fill();
      cx.strokeStyle = "rgba(255,255,255,.12)"; cx.lineWidth = 1; for (let i = 0; i < 24; i++) { const z = ((i * 4 - G.dist) % 96 + 96) % 96; const y = sy(z); cx.beginPath(); cx.moveTo(sx(-1.5, z), y); cx.lineTo(sx(1.5, z), y); cx.stroke(); }
      cx.strokeStyle = turbo ? "rgba(216,180,254,.7)" : "rgba(255,255,255,.35)"; cx.lineWidth = 2; for (const ln of [-.5, .5]) { cx.beginPath(); cx.moveTo(sx(ln, 90), hy); cx.lineTo(sx(ln, -.8), H); cx.stroke(); }
      if (G.wT > 0) { G.wT -= .016; cx.fillStyle = `rgba(255,255,255,${Math.max(0, G.wT - 1.6) * .8})`; cx.fillRect(0, 0, W, H); }
    }
    // ☁️ השמיים (בזמן עפיפה)
    function drawSky(dt) {
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0284c7"); g.addColorStop(.6, "#7dd3fc"); g.addColorStop(1, "#e0f2fe"); cx.fillStyle = g; cx.fillRect(-20, -20, W + 40, H + 40);
      if (G.rainbowT > 0) { for (let i = 0; i < 6; i++) { cx.strokeStyle = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"][i]; cx.globalAlpha = .35; cx.lineWidth = 10; cx.beginPath(); cx.arc(W / 2, H * 1.05, W * .75 - i * 10, Math.PI, 0); cx.stroke(); } cx.globalAlpha = 1; }
      // עננים שבאים לקראתנו
      for (let i = 0; i < 14; i++) { const z = ((i * 7 - G.dist) % 98 + 98) % 98, s = sc(z), lane = ((i * 37) % 5) - 2, x = W / 2 + lane * W * .55 * s, y = H * .2 + (H * .75) * s * ((i % 3) * .3 + .4); cx.globalAlpha = Math.min(.85, .2 + s); cx.fillStyle = "#fff"; cx.beginPath(); cx.ellipse(x, y, 60 * s + 8, 20 * s + 3, 0, 0, 7); cx.ellipse(x + 30 * s, y - 12 * s, 36 * s + 5, 18 * s + 3, 0, 0, 7); cx.fill(); } cx.globalAlpha = 1;
      cx.strokeStyle = "rgba(255,255,255,.35)"; cx.lineWidth = 2; cx.setLineDash([8, 10]); for (const ln of [-.5, .5]) { cx.beginPath(); cx.moveTo(sx(ln, 90), HOR()); cx.lineTo(sx(ln, -.8), H); cx.stroke(); } cx.setLineDash([]);
    }
    function drawObj(o, skyMode) {
      const s = sc(o.z), x = sx(o.lane, o.z), y = skyMode ? sy(o.z) - (H * .32 + 50) * s : sy(o.z), lw = W * .27 * s;
      cx.textAlign = "center"; cx.textBaseline = "middle";
      if (o.k === "bench") {
        const h = H * .1 * s; cx.fillStyle = "#c2410c"; cx.fillRect(x - lw * .47, y - h, lw * .94, h * .4); cx.fillStyle = "#fb923c"; cx.fillRect(x - lw * .47, y - h, lw * .94, h * .14);
        cx.fillStyle = "#431407"; cx.fillRect(x - lw * .42, y - h * .6, lw * .07, h * .6); cx.fillRect(x + lw * .35, y - h * .6, lw * .07, h * .6); cx.strokeStyle = "#fed7aa"; cx.lineWidth = Math.max(1, 2 * s); cx.strokeRect(x - lw * .47, y - h, lw * .94, h * .4);
        if (s > .35) { cx.fillStyle = "#fde68a"; cx.font = `900 ${Math.round(13 * s * 1.3)}px system-ui`; cx.fillText("⬆️", x, y - h * 1.5); }
      } else if (o.k === "beam") {
        const top = H * .2 * s, bh = H * .035 * s; cx.fillStyle = "#475569"; cx.fillRect(x - lw * .46, y - top, lw * .05, top); cx.fillRect(x + lw * .41, y - top, lw * .05, top);
        for (let i = 0; i < 6; i++) { cx.fillStyle = i % 2 ? "#fff" : "#ef4444"; cx.fillRect(x - lw * .46 + i * lw * .153, y - top, lw * .153, bh); }
        if (s > .35) { cx.fillStyle = "#fecaca"; cx.font = `900 ${Math.round(13 * s * 1.3)}px system-ui`; cx.fillText("⬇️", x, y - top - bh); }
      } else if (o.k === "locker") {
        const h = H * .36 * s, w = lw * .86; const g = cx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, "#1e3a8a"); g.addColorStop(.5, "#3b82f6"); g.addColorStop(1, "#1e3a8a"); cx.fillStyle = g; cx.fillRect(x - w / 2, y - h, w, h);
        cx.strokeStyle = "#0f172a"; cx.lineWidth = Math.max(1, 2 * s); cx.strokeRect(x - w / 2, y - h, w, h); cx.beginPath(); cx.moveTo(x, y - h); cx.lineTo(x, y); cx.stroke();
        cx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 3; i++) { cx.fillRect(x - w * .4, y - h * (.85 - i * .06), w * .3, Math.max(1, h * .02)); cx.fillRect(x + w * .1, y - h * (.85 - i * .06), w * .3, Math.max(1, h * .02)); }
        cx.fillStyle = "#facc15"; cx.fillRect(x - w * .08, y - h * .5, w * .04, h * .08); cx.fillRect(x + w * .04, y - h * .5, w * .04, h * .08);
      } else if (o.k === "bolt" || o.k === "gold" || o.k === "sbolt") {
        const gold = o.k === "gold", r = W * (o.k === "sbolt" ? .06 : .048) * s * (gold ? 1.25 : 1), yy = y - r * 1.3 - (o.h || 0) * H * .11 * s, rot = (G.t * 4 + o.z) % 6.28;
        cx.save(); cx.translate(x, yy); cx.shadowColor = gold ? "#facc15" : "#7dd3fc"; cx.shadowBlur = 12 * s;
        cx.scale(Math.abs(Math.cos(rot)) * .6 + .4, 1); cx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } cx.closePath();
        cx.fillStyle = gold ? "#fbbf24" : "#e2e8f0"; cx.fill(); cx.shadowBlur = 0; cx.lineWidth = Math.max(1, 2 * s); cx.strokeStyle = "#fff"; cx.stroke(); cx.beginPath(); cx.arc(0, 0, r * .35, 0, 7); cx.fillStyle = gold ? "#92400e" : "#334155"; cx.fill(); cx.restore();
      } else if (o.k === "pow") {
        const P = POW[o.p], r = W * .06 * s, yy = y - r * 1.6 + Math.sin(G.t * 5) * 4 * s;
        cx.save(); cx.shadowColor = P.c; cx.shadowBlur = 20 * s; cx.beginPath(); cx.arc(x, yy, r, 0, 7); cx.fillStyle = "#0f172a"; cx.fill(); cx.lineWidth = Math.max(2, 4 * s); cx.strokeStyle = P.c; cx.stroke(); cx.restore();
        cx.font = `900 ${Math.round(r * .9)}px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif`; cx.fillStyle = P.c; cx.fillText(P.em, x, yy); cx.font = `900 ${Math.round(r * .45)}px system-ui`; cx.fillText(P.n, x, yy + r * 1.5);
      } else if (o.k === "poop") { // 💩 קקי קסם – מצויר: שלוש קומות חומות, עיניים, ניצוצות
        const r = W * .07 * s, yy = y - r * .8 + Math.sin(G.t * 6) * 2 * s; cx.save(); cx.shadowColor = "#fde047"; cx.shadowBlur = 18 * s;
        cx.fillStyle = "#92400e"; cx.beginPath(); cx.ellipse(x, yy + r * .45, r, r * .38, 0, 0, 7); cx.fill(); cx.fillStyle = "#a16207"; cx.beginPath(); cx.ellipse(x, yy, r * .75, r * .32, 0, 0, 7); cx.fill(); cx.fillStyle = "#b45309"; cx.beginPath(); cx.ellipse(x, yy - r * .38, r * .48, r * .26, 0, 0, 7); cx.fill(); cx.beginPath(); cx.moveTo(x - r * .1, yy - r * .55); cx.quadraticCurveTo(x + r * .1, yy - r * .95, x + r * .2, yy - r * .6); cx.fill(); cx.restore();
        cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(x - r * .22, yy - r * .02, r * .13, 0, 7); cx.arc(x + r * .22, yy - r * .02, r * .13, 0, 7); cx.fill(); cx.fillStyle = "#000"; cx.beginPath(); cx.arc(x - r * .2, yy, r * .06, 0, 7); cx.arc(x + r * .24, yy, r * .06, 0, 7); cx.fill();
        if (s > .3) { cx.fillStyle = "#fde047"; cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillText("✨ קקי קסם ✨", x, yy - r * 1.3); }
      } else if (o.k === "tramp") { const r = lw * .42; cx.fillStyle = "#334155"; cx.fillRect(x - r * .9, y - H * .02 * s, r * .1, H * .02 * s); cx.fillRect(x + r * .8, y - H * .02 * s, r * .1, H * .02 * s); cx.fillStyle = "#22c55e"; cx.beginPath(); cx.ellipse(x, y - H * .025 * s + Math.sin(G.t * 10) * 2 * s, r, r * .25, 0, 0, 7); cx.fill(); cx.strokeStyle = "#bbf7d0"; cx.lineWidth = Math.max(1, 3 * s); cx.stroke(); if (s > .3) { cx.fillStyle = "#bbf7d0"; cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillText("🤸", x, y - H * .07 * s); } }
      else if (o.k === "ice") { const r = lw * .48; cx.fillStyle = "rgba(186,230,253,.75)"; cx.beginPath(); cx.ellipse(x, y - 2, r, r * .2, 0, 0, 7); cx.fill(); cx.strokeStyle = "#fff"; cx.lineWidth = Math.max(1, 2 * s); cx.stroke(); cx.fillStyle = "rgba(255,255,255,.9)"; cx.fillRect(x - r * .5, y - 4 * s, r * .3, 2 * s); if (s > .3) { cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillStyle = "#e0f2fe"; cx.fillText("🧊 קרח", x, y - H * .05 * s); } }
      else if (o.k === "bully") { // 😠 ביריון ענק: קפוצ'ון אדום, גבות כועסות, יד מושטת לצד
        const bw = lw * .9, bh = H * .4 * s, by = y, rock = Math.sin(G.t * 6) * 4 * s, ax = sx(o.base + o.arm * .95, o.z);
        cx.save(); cx.strokeStyle = "#fcd9b6"; cx.lineWidth = Math.max(3, 14 * s); cx.lineCap = "round"; cx.beginPath(); cx.moveTo(x + o.arm * bw * .4, by - bh * .62); cx.lineTo(ax, by - bh * .5 + Math.sin(G.t * 8) * 8 * s); cx.stroke();
        cx.fillStyle = "#fcd9b6"; cx.beginPath(); cx.arc(ax, by - bh * .5 + Math.sin(G.t * 8) * 8 * s, 12 * s + 2, 0, 7); cx.fill(); cx.restore();
        cx.fillStyle = "#1e3a8a"; cx.fillRect(x - bw * .3, by - bh * .32, bw * .22, bh * .32); cx.fillRect(x + bw * .08, by - bh * .32, bw * .22, bh * .32);
        cx.fillStyle = "#b91c1c"; cx.beginPath(); cx.moveTo(x - bw * .36, by - bh * .3); cx.lineTo(x - bw * .5, by - bh * .66 + rock); cx.quadraticCurveTo(x, by - bh * .78 + rock, x + bw * .5, by - bh * .66 + rock); cx.lineTo(x + bw * .36, by - bh * .3); cx.fill();
        cx.fillStyle = "#fff"; cx.font = `900 ${Math.max(6, Math.round(16 * s))}px system-ui`; cx.fillText("B", x, by - bh * .5 + rock);
        cx.fillStyle = "#fcd9b6"; cx.beginPath(); cx.arc(x, by - bh * .82 + rock, bw * .26, 0, 7); cx.fill(); cx.fillStyle = "#7f1d1d"; cx.beginPath(); cx.arc(x, by - bh * .86 + rock, bw * .27, Math.PI, 0); cx.fill();
        cx.strokeStyle = "#000"; cx.lineWidth = Math.max(1, 3 * s); cx.beginPath(); cx.moveTo(x - bw * .16, by - bh * .86 + rock); cx.lineTo(x - bw * .04, by - bh * .82 + rock); cx.moveTo(x + bw * .16, by - bh * .86 + rock); cx.lineTo(x + bw * .04, by - bh * .82 + rock); cx.stroke();
        cx.fillStyle = "#000"; cx.beginPath(); cx.arc(x - bw * .09, by - bh * .79 + rock, 2.5 * s + .5, 0, 7); cx.arc(x + bw * .09, by - bh * .79 + rock, 2.5 * s + .5, 0, 7); cx.fill(); cx.beginPath(); cx.arc(x, by - bh * .7 + rock, bw * .08, Math.PI * 1.1, Math.PI * 1.9); cx.stroke();
        if (s > .25) { cx.fillStyle = "#fecaca"; cx.font = `900 ${Math.round(12 * s * 1.4)}px system-ui`; cx.fillText("😠 ביריון!", x, by - bh * 1.15 + rock); }
      } else if (o.k === "bird") { const r = W * .075 * s, fl = Math.sin(G.t * 18 + o.ph) * r * .6; cx.fillStyle = "#334155"; cx.beginPath(); cx.ellipse(x, y, r, r * .6, 0, 0, 7); cx.fill(); cx.fillStyle = "#475569"; cx.beginPath(); cx.moveTo(x - r * .2, y); cx.lineTo(x - r * 1.4, y - fl); cx.lineTo(x - r * .1, y - r * .2); cx.moveTo(x + r * .2, y); cx.lineTo(x + r * 1.4, y - fl); cx.lineTo(x + r * .1, y - r * .2); cx.fill(); cx.fillStyle = "#f59e0b"; cx.beginPath(); cx.moveTo(x - r * .1, y + r * .1); cx.lineTo(x, y + r * .5); cx.lineTo(x + r * .1, y + r * .1); cx.fill(); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(x - r * .3, y - r * .15, r * .15, 0, 7); cx.arc(x + r * .3, y - r * .15, r * .15, 0, 7); cx.fill(); if (s > .3) { cx.fillStyle = "#fecaca"; cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillText("🐦 ציפור!", x, y - r * 1.6); } }
      else if (o.k === "drone") { const r = W * .08 * s; cx.fillStyle = "#1f2937"; cx.fillRect(x - r, y - r * .25, r * 2, r * .5); for (const dx of [-1, 1]) { cx.fillStyle = "#94a3b8"; cx.fillRect(x + dx * r - r * .05, y - r * .6, r * .1, r * .35); cx.globalAlpha = .7; cx.fillStyle = "#e5e7eb"; cx.beginPath(); cx.ellipse(x + dx * r, y - r * .65, r * .55 * Math.abs(Math.sin(G.t * 40)), r * .08, 0, 0, 7); cx.fill(); cx.globalAlpha = 1; } cx.fillStyle = Math.floor(G.t * 6) % 2 ? "#ef4444" : "#22c55e"; cx.beginPath(); cx.arc(x, y, r * .15, 0, 7); cx.fill(); cx.strokeStyle = "#e879f9"; cx.lineWidth = Math.max(1, 2 * s); cx.beginPath(); cx.moveTo(x, y + r * .25); cx.lineTo(x, y + r * .8); cx.stroke(); cx.fillStyle = "#a16207"; cx.beginPath(); cx.arc(x, y + r * .95, r * .22, 0, 7); cx.fill(); if (s > .3) { cx.fillStyle = "#f5d0fe"; cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillText("🛸 גונב חצי!", x, y - r * 1.3); } }
      else if (o.k === "rainbow") { const r = W * .12 * s; for (let i = 0; i < 6; i++) { cx.strokeStyle = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"][i]; cx.lineWidth = Math.max(1, 4 * s); cx.beginPath(); cx.arc(x, y + r * .3, r - i * 4 * s, Math.PI, 0); cx.stroke(); } if (s > .3) { cx.fillStyle = "#fff"; cx.font = `900 ${Math.round(11 * s * 1.4)}px system-ui`; cx.fillText("🌈 ×2", x, y - r); } }
    }
    // 🤖 הרובוט הענק שרודף (אחרי מעידה)
    function drawChaser() {
      if (!(G.chase > 0) || G.alt > .5) return; const a = Math.min(1, G.chase, (7 - G.chase) * 3), x = W / 2 + (G.pl < 0 ? 1 : -1) * W * .26 + Math.sin(G.t * 3) * W * .04, y = H + Math.min(W * .5, 210) * .3, s = Math.min(W * .5, 210), bob = Math.abs(Math.sin(G.t * 8)) * 12;
      cx.save(); cx.globalAlpha = a * .95; cx.fillStyle = "#475569"; cx.beginPath(); cx.roundRect ? cx.roundRect(x - s / 2, y - s * .62 - bob, s, s * .6, 30) : cx.rect(x - s / 2, y - s * .62 - bob, s, s * .6); cx.fill();
      cx.fillStyle = "#0f172a"; cx.fillRect(x - s * .38, y - s * .55 - bob, s * .76, s * .3); cx.fillStyle = "#ef4444"; cx.shadowColor = "#ef4444"; cx.shadowBlur = 20; cx.beginPath(); cx.arc(x - s * .16, y - s * .42 - bob, s * .06, 0, 7); cx.arc(x + s * .16, y - s * .42 - bob, s * .06, 0, 7); cx.fill(); cx.shadowBlur = 0;
      cx.strokeStyle = "#ef4444"; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x - s * .26, y - s * .53 - bob); cx.lineTo(x - s * .08, y - s * .48 - bob); cx.moveTo(x + s * .26, y - s * .53 - bob); cx.lineTo(x + s * .08, y - s * .48 - bob); cx.stroke();
      cx.fillStyle = "#94a3b8"; cx.fillRect(x - s * .03, y - s * .78 - bob, s * .06, s * .16); cx.fillStyle = "#ef4444"; cx.beginPath(); cx.arc(x, y - s * .8 - bob, s * .05, 0, 7); cx.fill(); cx.restore();
    }
    // 🤖 הרובוט: ראש (עם הבגדים של הילד) + גוף עם ידיים ורגליים שזזים – ריצה, קפיצה, החלקה, תעופה ונפילה
    const skinIt = R.ITEMS[(X.S.eq || {}).skin] || {}, BODY = (skinIt.sk && skinIt.sk[1]) || "#c7d2fe", BODY2 = (skinIt.sk && skinIt.sk[2]) || "#818cf8";
    function limb(x1, y1, a1, l1, a2, l2, w, col, joint) { const kx = x1 + Math.sin(a1) * l1, ky = y1 + Math.cos(a1) * l1, fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2;
      cx.strokeStyle = col; cx.lineWidth = w; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(kx, ky); cx.lineTo(fx, fy); cx.stroke(); cx.fillStyle = joint; cx.beginPath(); cx.arc(kx, ky, w * .45, 0, 7); cx.fill(); return [fx, fy]; }
    function drawBot() {
      const gy = GY(), jh = jumpH(), sl = sliding(), size = Math.min(W * .27, 112), x = botX();
      const flying = G.alt > .05, air = jh > .05 && !flying, ph = G.t * (7 + G.v * .32), run = !G.dead && !air && !flying && !sl && G.cd <= 0;
      const hp = G.hopT >= 0 ? Math.min(1, G.hopT / .17) : -1, hopH = hp >= 0 && !flying ? Math.sin(Math.PI * hp) * size * .16 : 0;
      const lift = jh * H * .14 + G.alt * H * .32 + hopH;
      // 👻 צללים של מהירות: בטורבו ובמעבר מסלול
      if ((G.pw.turbo > 0 || hp >= 0) && !G.dead) { G.trail.push({ x, y: gy - lift }); if (G.trail.length > 6) G.trail.shift(); } else if (G.trail.length) G.trail.shift();
      if (imgOk) G.trail.forEach((q, i) => { cx.globalAlpha = .07 * (i + 1); cx.drawImage(img, q.x - size * .35, q.y - size * 1.25, size * .7, size * .7); }); cx.globalAlpha = 1;
      // צל על הרצפה – קטן יותר כשגבוה
      if (G.alt < .9) { const k = Math.max(.25, 1 - lift / (H * .35)); cx.fillStyle = `rgba(0,0,0,${.35 * k})`; cx.beginPath(); cx.ellipse(x, gy - 2, size * .34 * k, size * .09 * k, 0, 0, 7); cx.fill(); }
      const bob = run ? Math.abs(Math.sin(ph)) * size * .05 : flying ? Math.sin(G.t * 4) * 6 : 0;
      const legL = size * .26, torsoH = size * .3, headS = size * .7;
      // מתיחה/כיווץ: נחיתה = מתכווץ, עלייה בקפיצה = נמתח
      const sq = G.landT > 0 ? 1 - G.landT * 1.4 : G.jt >= 0 && G.jt < .06 ? .84 : air && G.jt >= 0 && G.jt < .3 ? 1.14 : G.big >= 0 && G.big < .08 ? .8 : 1, sqx = 1 / Math.sqrt(sq);
      const hip = gy - 4 - legL * (sl ? .25 : 1) - lift + (run ? -bob : -bob);
      cx.save(); cx.translate(x, gy - lift);
      // נטייה: קדימה בריצה, לצד בפנייה, סיבוב בנפילה
      let rot = (run ? .06 + Math.sin(ph) * .03 : 0) + G.leanV * -.32 + (G.ice > 0 ? Math.sin(G.t * 20) * .05 : 0);
      if (G.big >= 0) { const q = Math.min(1, G.big / BIGT), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; rot -= e * Math.PI * 2; } // 🤸 סלטה בטרמפולינה
      else if (G.jt >= 0) rot -= Math.sin(Math.PI * Math.min(1, G.jt / .62)) * .22; // קפיצה: נוטה קדימה
      if (hp >= 0) rot += Math.sin(Math.PI * hp) * .28 * Math.sign(G.lane - G.fromL || 0); // סיבוב קטן במעבר מסלול
      if (G.hurtT > 0 && Math.floor(G.hurtT * 16) % 2) cx.globalAlpha = .45; // נפגעת – מהבהב
      if (G.deathT >= 0) rot = -G.deathT * 7;
      const pv = G.big >= 0 ? size * .6 : 0; cx.translate(0, -pv); cx.rotate(rot); cx.translate(0, pv); cx.scale(sqx, sq); // הסלטה מסתובבת סביב האמצע של הגוף
      if (G.deathT >= 0) cx.translate(-G.deathT * 120, -Math.sin(Math.min(1, G.deathT * 1.3) * Math.PI) * 90);
      cx.translate(-x, -(gy - lift));
      // טורבו: להבות
      if (G.pw.turbo > 0) for (let i = 0; i < 3; i++) { cx.fillStyle = ["#a855f7", "#f472b6", "#fde047"][i]; cx.globalAlpha = .7; cx.beginPath(); cx.moveTo(x - size * .14 + i * size * .14, hip); cx.lineTo(x - size * .07 + i * size * .14, hip + 26 + Math.random() * 24); cx.lineTo(x + i * size * .14, hip); cx.fill(); } cx.globalAlpha = 1;
      const metal = "#94a3b8", joint = "#475569", lw = Math.max(5, size * .085);
      // רגליים
      let la, lb, ra, rb;
      if (sl) { la = -1.35; lb = .25; ra = -1.2; rb = .35; }                         // החלקה: רגליים קדימה
      else if (flying) { la = .25 + Math.sin(G.t * 6) * .15; lb = .5; ra = -.15 + Math.sin(G.t * 6 + 1) * .15; rb = .6; } // מרחף: רגליים מתנדנדות
      else if (air) { la = .9; lb = -1.4; ra = -.5; rb = .9; }                         // קפיצה: רגל מקופלת
      else if (run) { la = Math.sin(ph) * .75; lb = Math.max(0, -Math.cos(ph)) * 1.1; ra = -Math.sin(ph) * .75; rb = Math.max(0, Math.cos(ph)) * 1.1; }
      else { la = .05; lb = 0; ra = -.05; rb = 0; }
      const back = (a, b, off) => limb(x + off, hip, a, legL * .52, b, legL * .52, lw, metal, joint);
      const fL = back(la, lb, -size * .08), fR = back(ra, rb, size * .08);
      cx.fillStyle = "#1f2937"; for (const [fx, fy] of [fL, fR]) { cx.beginPath(); cx.ellipse(fx + 3, fy, size * .07, size * .035, 0, 0, 7); cx.fill(); }
      // גוף (בצבע החליפה)
      const ty = hip - torsoH * (sl ? .7 : 1), tw = size * .42;
      const tg = cx.createLinearGradient(x - tw / 2, ty, x + tw / 2, hip); tg.addColorStop(0, "#fff"); tg.addColorStop(.35, BODY); tg.addColorStop(1, BODY2); cx.fillStyle = tg;
      cx.beginPath(); cx.roundRect ? cx.roundRect(x - tw / 2, ty, tw, hip - ty + 4, size * .1) : cx.rect(x - tw / 2, ty, tw, hip - ty + 4); cx.fill(); cx.strokeStyle = "rgba(255,255,255,.6)"; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = "#0f172a"; cx.beginPath(); cx.arc(x, ty + (hip - ty) * .45, size * .055, 0, 7); cx.fill(); cx.fillStyle = G.pw.double > 0 || G.rainbowT > 0 ? "#fde047" : "#7cf5ff"; cx.beginPath(); cx.arc(x, ty + (hip - ty) * .45, size * .03 + Math.abs(Math.sin(G.t * 5)) * 2, 0, 7); cx.fill();
      // ידיים: מתנדנדות הפוך לרגליים
      let aa, ab;
      if (flying) { aa = 2.1; ab = .4; } else if (air) { aa = 2.6; ab = .3; } else if (sl) { aa = -1.9; ab = .2; } else if (run) { aa = -Math.sin(ph) * .9; ab = -.9; } else { aa = .2; ab = -.3; }
      limb(x - tw / 2, ty + size * .05, run ? aa : aa, size * .16, ab, size * .15, lw * .85, metal, joint);
      limb(x + tw / 2, ty + size * .05, run ? -aa : -aa, size * .16, -ab, size * .15, lw * .85, metal, joint);
      // ראש (התמונה עם הבגדים)
      const hx = x - headS / 2, hy2 = ty - headS * .86 + (run ? Math.sin(ph * 2) * 1.5 : 0);
      if (imgOk) cx.drawImage(img, hx, hy2, headS, headS); else { cx.fillStyle = "#e0e7ff"; cx.beginPath(); cx.arc(x, hy2 + headS / 2, headS * .4, 0, 7); cx.fill(); }
      cx.restore();
      if (G.ice > 0) { cx.fillStyle = "rgba(186,230,253,.55)"; for (let i = 0; i < 4; i++) cx.fillRect(x - size * .3 + i * size * .2, gy - 6, size * .06, 10 + Math.random() * 12); }
      cx.globalAlpha = 1;
      // ⚡ ניצוצות בהחלקה
      if (sl && !G.dead && G.parts.length < 140) for (let i = 0; i < 2; i++) G.parts.push({ x: x + (Math.random() - .5) * size * .4, y: gy - 3, vx: (Math.random() - .5) * 90, vy: -40 - Math.random() * 70, life: .35, a: 1, c: Math.random() < .5 ? "#fde047" : "#fb923c", s: 2 + Math.random() * 2 });
      // אבק מהרגליים בריצה
      if (run && Math.random() < .25 && G.parts.length < 120) G.parts.push({ x: x + (Math.random() - .5) * size * .3, y: gy - 4, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 30, life: .4, a: .7, c: "rgba(203,213,225,.8)", s: 3 + Math.random() * 3 });
      const cy = hip - torsoH * .5 - headS * .3;
      if (G.shield) { cx.strokeStyle = "#7dd3fc"; cx.lineWidth = 4; cx.globalAlpha = .6 + Math.sin(G.t * 6) * .2; cx.beginPath(); cx.arc(x, cy, size * .72, 0, 7); cx.stroke(); cx.fillStyle = "rgba(56,189,248,.08)"; cx.fill(); cx.globalAlpha = 1; }
      if (G.pw.magnet > 0) { cx.strokeStyle = "rgba(244,63,94,.6)"; cx.lineWidth = 2; cx.setLineDash([6, 6]); cx.beginPath(); cx.arc(x, cy, size * .85 + Math.sin(G.t * 8) * 5, 0, 7); cx.stroke(); cx.setLineDash([]); }
    }
    G.spawnAt = (k, lane, z, extra) => { add(Object.assign({ k, lane, z }, extra || {})); return G.obj[G.obj.length - 1]; }; // לבדיקות
    G.act = act;
    hud();
    const st = await overlay(`<div class="big">🏃</div><h3>מוכן לרוץ?</h3><div class="rn-ctl" style="text-align:center"><div><b>⬅️➡️</b>מסלול</div><div><b>⬆️</b>קפיצה</div><div><b>⬇️</b>התכופפות</div><div><b>🚪</b>לעקוף</div></div><p>💩 קקי קסם = עפים! · 🤸 טרמפולינה · 🧊 קרח · 😠 ביריון</p><p>מעדת? 🤖 רובוט ענק רודף – אל תמעד שוב!</p>`, ["▶️ יאללה!", "יציאה"]);
    if (st === 1) return finish();
    fit(); newRun();
  }

  RP.panels.run = panel;
  window.RoboRun = { play, panel, _game: () => game };
})();
