// 🏃 "ריצת הרובוט" – ריצה אינסופית ב-3 מסלולים במסדרון הישיבה, עם הרובוט והבגדים של הילד.
// מחליקים ימינה/שמאלה להחליף מסלול, למעלה לקפוץ (מעל ספסלים), למטה להתכופף (מתחת למוטות). ארונות – רק לעקוף.
// עד 250 ברגים ביום (R.RUN_CAP), אחרי זה – אימון בלי פרסים. פתוח רק בהפסקות (כמו "ברגים נופלים").
(function () {
  const R = window.RoboCore, RP = window.RoboPlus, X = window.Robo && Robo._; if (!R || !RP || !X || !R.runBank) return;
  const esc = X.esc, LS = X.LS;
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const CSS = `
.rn-ctl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 10px}.rn-ctl div{text-align:center;padding:8px 2px;border-radius:12px;background:rgba(255,255,255,.07);font-size:12px;font-weight:800}.rn-ctl b{display:block;font-size:22px}
.rn-hero{position:relative;height:120px;border-radius:20px;overflow:hidden;margin-bottom:10px;background:linear-gradient(180deg,#1e3a8a,#312e81 55%,#0f172a)}
.rn-hero .rd{position:absolute;left:50%;bottom:0;width:240%;height:70%;transform:translateX(-50%) perspective(160px) rotateX(55deg);transform-origin:bottom;background:repeating-linear-gradient(90deg,transparent 0 32.6%,rgba(255,255,255,.35) 32.6% 33.4%),repeating-linear-gradient(0deg,#475569 0 18px,#334155 18px 36px);animation:rnRoad .5s linear infinite}
@keyframes rnRoad{to{background-position:0 0,0 36px}}
.rn-hero .bot{position:absolute;left:50%;bottom:6px;width:64px;height:64px;margin-left:-32px;animation:rnBob .35s ease-in-out infinite alternate}@keyframes rnBob{to{transform:translateY(-6px)}}
`;
  if (!document.getElementById("roboRunCss")) { const s = document.createElement("style"); s.id = "roboRunCss"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  const today = () => { const S = X.S; return S.run && S.run.d === R.ymd(Date.now()) ? S.run : { n: 0 }; };
  let host = null;
  function panel(body) {
    host = body; const S = X.S, bs = RP.breakState(), left = R.RUN_CAP - today().n;
    body.innerHTML = `<button type="button" class="rp-back">→ חזרה</button><div class="rp-h">🏃 ריצת הרובוט</div>
      <div class="rn-hero"><div class="rd"></div><div class="bot">${X.svg("", null, { still: true })}</div></div>
      <div class="rn-ctl"><div><b>⬅️➡️</b>החלקה = מסלול</div><div><b>⬆️</b>קפיצה מעל ספסל</div><div><b>⬇️</b>התכופפות מתחת למוט</div><div><b>🚪</b>ארון = לעקוף!</div></div>
      <div class="gm-rules"><span>🔩 = 1</span><span>🌟 = 5</span><span>🧲 מגנט</span><span>🛡️ מגן</span><span>✖️2 כפול</span><span>🚀 טורבו</span><span class="bad">💥 נתקעת = הריצה נגמרת (הברגים נשארים!)</span></div>
      <div class="rbx" style="--c:#0ea5e9"><div class="em">📊</div><div class="t"><b>היום: ${today().n}/${R.RUN_CAP} 🔩${S.runBest ? ` · 🏆 שיא: ${S.runBest} מ'` : ""}</b><small>${bs.free ? "אפשר לרוץ עכשיו 🎉" : bs.open ? (bs.until != null ? `הפסקה! עד ${hhmm(bs.until)}` : "אפשר לרוץ עכשיו 🎉") : `🔒 עכשיו שיעור – נפתח בהפסקה (${hhmm(bs.until)})`}</small></div></div>
      <button class="rbtn" type="button" id="rnPlay" style="width:100%;font-size:18px;padding:14px" ${bs.open ? "" : "disabled"}>${!bs.open ? "🔒 רק בהפסקות" : left <= 0 ? "🏋️ אימון (בלי פרסים) – לשבור שיא!" : "▶️ לרוץ!"}</button>
      ${left <= 0 ? `<div class="rw-prog" style="text-align:center;margin-top:6px">💪 אספת את כל ה-${R.RUN_CAP} של היום! מחר אפשר שוב לאסוף ברגים</div>` : ""}
      <p class="rw-prog" style="margin-top:12px">⏰ פתוח רק בהפסקות לפי המערכת שלך (עד 16:15). אחרי 16:15, בשישי ובחופשות – פתוח תמיד.</p>`;
    body.querySelector(".rp-back").onclick = () => RP.tab(body);
    const b = body.querySelector("#rnPlay"); if (b) b.onclick = () => play();
  }

  // 🔊 צלילים קטנים
  const AU = (() => {
    let ac; const ctx = () => { if (X.SFX.muted && X.SFX.muted()) return null; try { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; } };
    const tone = (f, t, dur, type = "sine", vol = .12, to = 0) => { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t; o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + .05); };
    const noise = (t, dur, vol = .3) => { const c = ctx(); if (!c) return; const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g).connect(c.destination); s.start(c.currentTime + t); };
    return {
      coin(k) { tone(880 + (k % 8) * 60, 0, .07, "triangle", .1); }, gold() { [0, .05, .1].forEach((t, i) => tone(1046 + i * 260, t, .12, "triangle", .12)); },
      jump() { tone(300, 0, .18, "square", .05, 700); }, slide() { noise(0, .18, .08); }, lane() { tone(500, 0, .05, "sine", .05, 650); },
      crash() { noise(0, .7, .5); tone(160, 0, .6, "sawtooth", .22, 40); }, power() { [0, .05, .1, .15].forEach((t, i) => tone(660 * Math.pow(1.26, i), t, .12, "sine", .13)); },
      level(n) { [0, .07, .14, .21].forEach((t, i) => tone(523 * Math.pow(1.19, i + Math.min(6, n)), t, .18, "triangle", .13)); }, shield() { tone(300, 0, .35, "sine", .2, 1000); },
    };
  })();

  // ===== המשחק =====
  const POW = { magnet: { c: "#f43f5e", n: "מגנט", t: 8, em: "🧲" }, shield: { c: "#38bdf8", n: "מגן", t: 0, em: "🛡️" }, double: { c: "#facc15", n: "כפול", t: 8, em: "✖️2" }, turbo: { c: "#a855f7", n: "טורבו", t: 4.5, em: "🚀" } };
  let game = null;
  async function play() {
    const d = X.dlg("roboRun", "game"); d.dataset.lock = "1";
    d.innerHTML = `<div class="gm"><div class="gm-top"><button class="x" type="button" aria-label="סגור">✕</button><span id="rnB">🔩 0</span><span id="rnD">📏 0 מ'</span><span id="rnL"></span><span style="flex:1"></span><span id="rnT"></span></div>
      <div class="gm-cv"><canvas></canvas></div><div class="gm-foot"><button class="rbtn alt gm-exit" type="button" id="rnExit" style="flex:1">🚪 יציאה (הברגים נשמרים)</button></div></div>`;
    X.show(d);
    const cv = d.querySelector("canvas"), box = d.querySelector(".gm-cv"), cx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const fit = () => { let w = box.clientWidth, h = box.clientHeight; if (w < 100) w = Math.min(560, innerWidth); if (h < 150) h = Math.max(300, innerHeight - 150); if (w === W && h === H) return; W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; };
    fit(); let ro = null; try { ro = new ResizeObserver(fit); ro.observe(box); } catch (e) {} addEventListener("resize", fit);
    const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(X.svg("", null, { still: true }).replace('class="abot', 'width="160" height="160" class="abot'));
    const G = game = { run: true };
    const left = () => R.RUN_CAP - today().n;
    // ---- פרספקטיבה: z = מטרים קדימה. מסלולים -1 / 0 / 1 ----
    const HOR = () => H * .26, GY = () => H * .9, f = z => 1 / (1 + Math.max(-.9, z) / 11);
    const sy = z => HOR() + (GY() - HOR()) * f(z), sx = (lane, z) => W / 2 + lane * W * .3 * f(z), sc = z => f(z);
    const LV_COL = ["#38bdf8", "#22c55e", "#a3e635", "#facc15", "#fb923c", "#f97316", "#ef4444", "#e11d48", "#a855f7", "#fde047"];
    const hud = () => { d.querySelector("#rnB").textContent = `🔩 ${G.bolts}`; d.querySelector("#rnD").textContent = `📏 ${Math.floor(G.dist)} מ'`; d.querySelector("#rnL").textContent = G.practice ? `🏋️ אימון · שיא ${Math.max(X.S.runBest || 0, Math.floor(G.dist))} מ'` : `נשאר היום: ${Math.max(0, left() - G.bolts)}`; };
    const newRun = () => {
      Object.assign(G, { practice: left() <= 0, over: false, dead: false, t: 0, dist: 0, v: 13, lane: 0, pl: 0, jt: -1, st: -1, obj: [], parts: [], fx: [], next: 30, rows: 0, bolts: 0, pw: {}, shield: false, shake: 0, lv: 1, lvT: 0, combo: 0, run500: false });
      hud(); last = performance.now(); requestAnimationFrame(loop);
    };
    const finish = () => { G.run = false; game = null; removeEventListener("keydown", key); removeEventListener("resize", fit); try { ro && ro.disconnect(); } catch (e) {} delete d.dataset.lock; d.close(); X.hubRefresh(); if (host && host.isConnected) panel(host); };
    const overlay = (html, btns) => new Promise(res => { const o = document.createElement("div"); o.className = "gm-ov"; o.innerHTML = `<div>${html}<div class="rd-btns">${btns.map((b, i) => `<button class="rbtn${i ? " alt" : ""}" type="button" data-i="${i}">${b}</button>`).join("")}</div></div>`; box.appendChild(o); o.querySelectorAll("button").forEach(b => b.onclick = () => { o.remove(); res(+b.dataset.i); }); });
    // ---- סוף ריצה: שומרים את הברגים (או שיא באימון) ----
    const end = async why => {
      if (G.over) return; G.over = true;
      const m = Math.floor(G.dist), rec = m > (X.S.runBest || 0); if (rec) X.S.runBest = m;
      let got = 0; if (!G.practice && G.bolts) { const r = R.runBank(X.S, G.bolts); got = r.bolts; if (got) X.step(1); }
      if (G.run500) X.trk("run500"); X.save(); X.SFX.coin();
      if (why === "x") { if (got) X.toast(`🏃 שמרת ${got} ברגים מהריצה`, null, 3000); return finish(); }
      const more = RP.breakState().open && why !== "bell";
      const i = await overlay(`<div class="big">${why === "bell" ? "🔔" : rec ? "🏆" : "💥"}</div><h3>${why === "bell" ? "ההפסקה נגמרה!" : rec ? "שיא חדש!" : "נתקעת!"}</h3><p>📏 ${m} מטר · ⬆️ קצב ${G.lv}</p><p>${G.practice ? "🏋️ אימון – בלי פרסים" : `+${got} ברגים 🔩${got < G.bolts ? " (הגעת למקסימום של היום)" : ""}`}</p>${X.S.runBest ? `<p>🏆 השיא שלך: ${X.S.runBest} מ'</p>` : ""}`, more ? ["🔄 עוד ריצה", "סיום"] : ["סיום"]);
      if (more && i === 0) newRun(); else finish();
    };
    const exitRun = () => { if (!G.run) return; if (G.over || G.dead) return G.over ? finish() : null; end("x"); };
    d.querySelector(".x").onclick = exitRun; d.querySelector("#rnExit").onclick = exitRun; d.oncancel = e => { e.preventDefault(); exitRun(); };
    // ---- שליטה: החלקות (וגם לחיצה על צד המסך) + מקלדת ----
    const act = a => { if (G.over || G.dead) return;
      if (a === "L" || a === "R") { const nl = Math.max(-1, Math.min(1, G.lane + (a === "R" ? 1 : -1))); if (nl !== G.lane) { G.lane = nl; AU.lane(); } }
      else if (a === "U" && G.jt < 0) { G.jt = 0; G.st = -1; AU.jump(); }
      else if (a === "D") { if (G.jt >= 0) G.jt = Math.max(G.jt, .5); G.st = 0; AU.slide(); } };
    let sx0 = 0, sy0 = 0, sw = false;
    box.addEventListener("pointerdown", e => { sx0 = e.clientX; sy0 = e.clientY; sw = true; });
    box.addEventListener("pointermove", e => { if (!sw) return; const dx = e.clientX - sx0, dy = e.clientY - sy0; if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) { sw = false; act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy < 0 ? "U" : "D")); } });
    box.addEventListener("pointerup", e => { if (!sw) return; sw = false; const r = box.getBoundingClientRect(); act(e.clientX - r.left < W / 2 ? "L" : "R"); });
    box.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    const key = e => { const k = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", " ": "U", ArrowDown: "D" }[e.key]; if (k) { e.preventDefault(); act(k); } }; addEventListener("keydown", key);
    // ---- יצירת שורות: תמיד נשאר לפחות מסלול אחד פנוי ----
    const OB = ["bench", "beam", "locker"];
    const add = o => G.obj.push(Object.assign({ z: 90, h: 0 }, o));
    function row() {
      G.rows++; const L = G.lv, free = Math.floor(Math.random() * 3) - 1, lanes = [-1, 0, 1].filter(x => x !== free);
      const nOb = L >= 3 && Math.random() < .35 + L * .04 ? 2 : 1;
      const used = lanes.sort(() => Math.random() - .5).slice(0, nOb);
      for (const ln of used) { const t = OB[Math.floor(Math.random() * (L >= 2 ? 3 : 2))]; add({ k: t, lane: ln }); if (t === "bench" && Math.random() < .4) for (let i = -1; i <= 1; i++) add({ k: "bolt", lane: ln, z: 90 + i * 2.2, h: 1.1 - Math.abs(i) * .3 }); }
      // ברגים במסלול הפנוי (קו של 6) – לפעמים זהב
      const cnt = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < cnt; i++) add({ k: Math.random() < .05 + L * .006 ? "gold" : "bolt", lane: free, z: 92 + i * 2.6 });
      if (G.rows % 14 === 0) { const ks = Object.keys(POW); add({ k: "pow", p: ks[Math.floor(Math.random() * ks.length)], lane: free, z: 92 + cnt * 2.6 + 3 }); }
    }
    const fxText = (x, y, t, c, life = 1, size = 20) => { G.fx = G.fx.filter(q => q.big); G.fx.push({ x, y, t, c, a: life, life, size }); };
    const burst = (x, y, col, n = 10, sp = 160) => { if (G.parts.length > 140) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (.4 + Math.random()); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: .5 + Math.random() * .4, a: 1, c: col, s: 2 + Math.random() * 3 }); } };
    const jumpH = () => G.jt < 0 ? 0 : Math.sin(Math.PI * Math.min(1, G.jt / .62)) * 1.25, sliding = () => G.st >= 0 && G.st < .62;
    let last = performance.now(), secT = 0;
    function crash(o) {
      if (G.pw.turbo > 0) return;
      if (G.shield) { G.shield = false; AU.shield(); X.vib(40); burst(W / 2, GY() - 40, "#38bdf8", 26, 220); fxText(W / 2, H * .45, "🛡️ המגן הציל אותך!", "#7dd3fc", 1.3, 20); o.gone = 1; return; }
      G.dead = true; G.shake = .7; AU.crash(); X.vib([80, 40, 160]); burst(sx(G.pl, 0), GY() - 40, "#ef4444", 40, 300); burst(sx(G.pl, 0), GY() - 40, "#fde047", 25, 220);
      setTimeout(() => end("crash"), 900);
    }
    function loop(now) {
      if (!G.run || G.over) return; if (!d.open) { finish(); return; }
      if (W < 50 || H < 50) fit();
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!G.dead) {
        G.t += dt;
        if ((secT += dt) > 1) { secT = 0; const bs = RP.breakState(); if (!bs.open) { end("bell"); return; } const tl = d.querySelector("#rnT"); if (bs.until != null) { const n = new Date(), s = bs.until * 60 - (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()); tl.textContent = s > 0 ? `⏰ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""; } else tl.textContent = ""; }
        // ⚙️ מהירות: עולה עם המרחק, ובטורבו – מהר מאוד
        const lv = Math.min(10, 1 + Math.floor(G.dist / 250)); if (lv > G.lv) { G.lv = lv; G.lvT = 1.6; AU.level(lv); X.vib([30, 20, 60]); burst(W / 2, H * .35, LV_COL[lv - 1], 30, 260); }
        G.v = Math.min(36, 13 + G.dist * .012) * (G.pw.turbo > 0 ? 1.7 : 1);
        const dz = G.v * dt; G.dist += dz; if (G.dist >= 500) G.run500 = true;
        for (const k of Object.keys(G.pw)) { G.pw[k] -= dt; if (G.pw[k] <= 0) delete G.pw[k]; }
        if (G.jt >= 0) { G.jt += dt; if (G.jt > .62) G.jt = -1; }
        if (G.st >= 0) { G.st += dt; if (G.st > .62) G.st = -1; }
        G.pl += (G.lane - G.pl) * Math.min(1, dt * 14);
        if ((G.next -= dz) <= 0) { row(); G.next = Math.max(10, 19 - G.lv * .9) + Math.random() * 6; }
        const jh = jumpH(), mag = G.pw.magnet > 0, turbo = G.pw.turbo > 0;
        for (const o of G.obj) {
          const pz = o.z; o.z -= dz;
          if ((mag || turbo) && (o.k === "bolt" || o.k === "gold") && o.z < 22 && o.z > 0) { o.lane += (G.pl - o.lane) * Math.min(1, dt * 6); o.h += (jh - o.h) * Math.min(1, dt * 6); }
          if (o.gone || !(pz > 0 && o.z <= .6)) continue;
          const same = Math.abs(o.lane - G.pl) < .5;
          if (o.k === "bolt" || o.k === "gold") {
            if (same && (turbo || Math.abs(o.h - jh) < .75)) { o.gone = 1; const cap = G.practice ? Infinity : left(), mult = G.pw.double > 0 ? 2 : 1, n = Math.min((o.k === "gold" ? 5 : 1) * mult, Math.max(0, cap - G.bolts)); G.bolts += n; G.combo++; if (n) { o.k === "gold" ? AU.gold() : AU.coin(G.combo); burst(sx(G.pl, 0), GY() - 50, o.k === "gold" ? "#fde047" : "#bae6fd", o.k === "gold" ? 10 : 4, 140); if (o.k === "gold") fxText(sx(G.pl, 0), GY() - 110, "+" + n, "#fde047", .8, 24); } hud(); }
          } else if (o.k === "pow") { if (same) { o.gone = 1; const P = POW[o.p]; if (o.p === "shield") G.shield = true; else G.pw[o.p] = P.t; AU.power(); X.vib(30); burst(sx(G.pl, 0), GY() - 50, P.c, 24, 220); fxText(W / 2, H * .42, `${P.em} ${P.n}!`, P.c, 1.2, 26); } }
          else if (same) { if (o.k === "locker" || (o.k === "bench" && jh < .45) || (o.k === "beam" && !sliding())) crash(o); }
          if (G.dead) break;
        }
        G.obj = G.obj.filter(o => !o.gone && o.z > -6);
      }
      for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.a -= dt / p.life; } G.parts = G.parts.filter(p => p.a > 0);
      G.shake = Math.max(0, G.shake - dt); if (Math.floor(G.dist) % 5 === 0) hud();
      draw(dt); requestAnimationFrame(loop);
    }
    // ---- ציור ----
    function draw(dt) {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.save();
      if (G.shake > 0) cx.translate((Math.random() - .5) * G.shake * 30, (Math.random() - .5) * G.shake * 30);
      const hy = HOR(), gy = GY(), lc = LV_COL[G.lv - 1], turbo = G.pw.turbo > 0;
      // תקרה וקירות של מסדרון
      const bg = cx.createLinearGradient(0, 0, 0, hy); bg.addColorStop(0, "#1e1b4b"); bg.addColorStop(1, turbo ? "#7c3aed" : "#3730a3"); cx.fillStyle = bg; cx.fillRect(-20, -20, W + 40, hy + 22);
      cx.fillStyle = "#0f172a"; cx.beginPath(); cx.moveTo(-20, H + 20); cx.lineTo(sx(-1.5, 90), hy); cx.lineTo(-20, hy - 40); cx.fill(); cx.beginPath(); cx.moveTo(W + 20, H + 20); cx.lineTo(sx(1.5, 90), hy); cx.lineTo(W + 20, hy - 40); cx.fill();
      // ארונות על הקירות (זזים)
      for (let i = 0; i < 12; i++) { const z = ((i * 8 - G.dist) % 96 + 96) % 96; const s = sc(z), y = sy(z); for (const side of [-1, 1]) { const x = sx(side * 1.62, z), w = W * .09 * s, h = H * .5 * s; cx.fillStyle = i % 3 === 0 ? "#1d4ed8" : i % 3 === 1 ? "#0369a1" : "#4338ca"; cx.globalAlpha = .55 + s * .4; cx.fillRect(x - w / 2, y - h, w, h); cx.fillStyle = "rgba(255,255,255,.25)"; cx.fillRect(x - w * .3, y - h * .8, w * .6, Math.max(1, h * .03)); cx.fillRect(x - w * .3, y - h * .72, w * .6, Math.max(1, h * .03)); } } cx.globalAlpha = 1;
      // אורות בתקרה (זזים)
      for (let i = 0; i < 12; i++) { const z = ((i * 8 - G.dist) % 96 + 96) % 96, s = sc(z), y = hy - hy * .92 * s; cx.fillStyle = turbo ? "#f0abfc" : "#e0f2fe"; cx.globalAlpha = .25 + s * .6; cx.fillRect(W / 2 - W * .16 * s, y, W * .32 * s, Math.max(1, 6 * s)); } cx.globalAlpha = 1;
      // רצפה
      const fl = cx.createLinearGradient(0, hy, 0, H); fl.addColorStop(0, "#334155"); fl.addColorStop(1, "#64748b"); cx.fillStyle = fl;
      cx.beginPath(); cx.moveTo(sx(-1.5, 90), hy); cx.lineTo(sx(1.5, 90), hy); cx.lineTo(sx(1.5, -.8), H); cx.lineTo(sx(-1.5, -.8), H); cx.fill();
      // פסי רצפה זזים + קווי מסלולים
      cx.strokeStyle = "rgba(255,255,255,.12)"; cx.lineWidth = 1; for (let i = 0; i < 24; i++) { const z = ((i * 4 - G.dist) % 96 + 96) % 96; const y = sy(z); cx.beginPath(); cx.moveTo(sx(-1.5, z), y); cx.lineTo(sx(1.5, z), y); cx.stroke(); }
      cx.strokeStyle = turbo ? "rgba(216,180,254,.7)" : "rgba(255,255,255,.35)"; cx.lineWidth = 2; for (const ln of [-.5, .5]) { cx.beginPath(); cx.moveTo(sx(ln, 90), hy); cx.lineTo(sx(ln, -.8), H); cx.stroke(); }
      // אובייקטים מהרחוק לקרוב
      const objs = G.obj.filter(o => o.z > -1.5 && o.z < 92).sort((a, b) => b.z - a.z);
      for (const o of objs) drawObj(o);
      drawBot();
      for (const p of G.parts) { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); } cx.globalAlpha = 1;
      cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const q of G.fx) { q.a -= dt; q.y -= 40 * dt; cx.globalAlpha = Math.max(0, q.a / q.life); cx.font = `900 ${q.size}px system-ui,sans-serif`; cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText(q.t, q.x, q.y); cx.fillStyle = q.c; cx.fillText(q.t, q.x, q.y); } cx.globalAlpha = 1; G.fx = G.fx.filter(q => q.a > 0);
      // למעלה: קצב + כוחות פעילים
      cx.font = "900 15px system-ui,sans-serif"; cx.textAlign = "right"; cx.fillStyle = lc; cx.fillText(`⬆️ קצב ${G.lv}${G.practice ? " · 🏋️ אימון" : ""}`, W - 10, 18);
      if (G.lv < 10) { const pr = (G.dist % 250) / 250; cx.fillStyle = "rgba(255,255,255,.15)"; cx.fillRect(W - 110, 28, 100, 5); cx.fillStyle = lc; cx.fillRect(W - 10 - 100 * pr, 28, 100 * pr, 5); }
      let px = 10; cx.textAlign = "left"; cx.font = "800 13px system-ui,sans-serif"; for (const [k, v] of Object.entries(G.pw)) { cx.fillStyle = POW[k].c; cx.fillText(`${POW[k].n} ${Math.ceil(v)}`, px, 18); px += 70; } if (G.shield) { cx.fillStyle = "#7dd3fc"; cx.fillText("🛡️ מגן", px, 18); }
      if (G.lvT > 0) { G.lvT -= dt; const a = Math.min(1, G.lvT * 2); cx.save(); cx.globalAlpha = a; cx.translate(W / 2, H * .2); cx.textAlign = "center"; cx.font = "900 38px system-ui,sans-serif"; cx.lineWidth = 6; cx.strokeStyle = "rgba(0,0,0,.6)"; cx.strokeText(`קצב ${G.lv}!`, 0, 0); cx.fillStyle = lc; cx.fillText(`קצב ${G.lv}!`, 0, 0); cx.font = "800 14px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText(G.lv >= 7 ? "😈 מטורף!" : G.lv >= 4 ? "🔥 מהר יותר!" : "⚡ מאיץ", 0, 24); cx.restore(); }
      if (G.t < 3 && !G.dead) { cx.globalAlpha = Math.max(0, 1 - G.t / 3); cx.textAlign = "center"; cx.font = "800 15px system-ui,sans-serif"; cx.fillStyle = "#fff"; cx.fillText("⬅️ ➡️ להחליק · ⬆️ לקפוץ · ⬇️ להתכופף", W / 2, H * .55); cx.globalAlpha = 1; }
      cx.restore();
    }
    function drawObj(o) {
      const s = sc(o.z), x = sx(o.lane, o.z), y = sy(o.z), lw = W * .27 * s;
      if (o.k === "bench") { // 🪑 ספסל – לקפוץ
        const h = H * .1 * s; cx.fillStyle = "#c2410c"; cx.fillRect(x - lw * .47, y - h, lw * .94, h * .4); cx.fillStyle = "#fb923c"; cx.fillRect(x - lw * .47, y - h, lw * .94, h * .14);
        cx.fillStyle = "#431407"; cx.fillRect(x - lw * .42, y - h * .6, lw * .07, h * .6); cx.fillRect(x + lw * .35, y - h * .6, lw * .07, h * .6); cx.strokeStyle = "#fed7aa"; cx.lineWidth = Math.max(1, 2 * s); cx.strokeRect(x - lw * .47, y - h, lw * .94, h * .4);
        if (s > .35) { cx.fillStyle = "#fde68a"; cx.font = `900 ${Math.round(13 * s * 1.3)}px system-ui`; cx.textAlign = "center"; cx.fillText("⬆️", x, y - h * 1.5); }
      } else if (o.k === "beam") { // 🚧 מוט – להתכופף
        const top = H * .2 * s, bh = H * .035 * s; cx.fillStyle = "#475569"; cx.fillRect(x - lw * .46, y - top, lw * .05, top); cx.fillRect(x + lw * .41, y - top, lw * .05, top);
        for (let i = 0; i < 6; i++) { cx.fillStyle = i % 2 ? "#fff" : "#ef4444"; cx.fillRect(x - lw * .46 + i * lw * .153, y - top, lw * .153, bh); }
        if (s > .35) { cx.fillStyle = "#fecaca"; cx.font = `900 ${Math.round(13 * s * 1.3)}px system-ui`; cx.textAlign = "center"; cx.fillText("⬇️", x, y - top - bh); }
      } else if (o.k === "locker") { // 🚪 ארון – לעקוף
        const h = H * .36 * s, w = lw * .86; const g = cx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, "#1e3a8a"); g.addColorStop(.5, "#3b82f6"); g.addColorStop(1, "#1e3a8a"); cx.fillStyle = g; cx.fillRect(x - w / 2, y - h, w, h);
        cx.strokeStyle = "#0f172a"; cx.lineWidth = Math.max(1, 2 * s); cx.strokeRect(x - w / 2, y - h, w, h); cx.beginPath(); cx.moveTo(x, y - h); cx.lineTo(x, y); cx.stroke();
        cx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 3; i++) { cx.fillRect(x - w * .4, y - h * (.85 - i * .06), w * .3, Math.max(1, h * .02)); cx.fillRect(x + w * .1, y - h * (.85 - i * .06), w * .3, Math.max(1, h * .02)); }
        cx.fillStyle = "#facc15"; cx.fillRect(x - w * .08, y - h * .5, w * .04, h * .08); cx.fillRect(x + w * .04, y - h * .5, w * .04, h * .08);
      } else if (o.k === "bolt" || o.k === "gold") {
        const r = W * .048 * s * (o.k === "gold" ? 1.25 : 1), yy = y - r * 1.3 - o.h * H * .11 * s, rot = (G.t * 4 + o.z) % 6.28;
        cx.save(); cx.translate(x * 1 + (sx(o.lane, o.z) - x), yy); cx.shadowColor = o.k === "gold" ? "#facc15" : "#7dd3fc"; cx.shadowBlur = 12 * s;
        cx.scale(Math.abs(Math.cos(rot)) * .6 + .4, 1); cx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } cx.closePath();
        cx.fillStyle = o.k === "gold" ? "#fbbf24" : "#e2e8f0"; cx.fill(); cx.shadowBlur = 0; cx.lineWidth = Math.max(1, 2 * s); cx.strokeStyle = "#fff"; cx.stroke(); cx.beginPath(); cx.arc(0, 0, r * .35, 0, 7); cx.fillStyle = o.k === "gold" ? "#92400e" : "#334155"; cx.fill(); cx.restore();
      } else if (o.k === "pow") {
        const P = POW[o.p], r = W * .06 * s, yy = y - r * 1.6 + Math.sin(G.t * 5) * 4 * s;
        cx.save(); cx.shadowColor = P.c; cx.shadowBlur = 20 * s; cx.beginPath(); cx.arc(x, yy, r, 0, 7); cx.fillStyle = "#0f172a"; cx.fill(); cx.lineWidth = Math.max(2, 4 * s); cx.strokeStyle = P.c; cx.stroke(); cx.restore();
        cx.textAlign = "center"; cx.textBaseline = "middle"; cx.font = `900 ${Math.round(r * .9)}px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif`; cx.fillStyle = P.c; cx.fillText(o.p === "double" ? "×2" : P.em, x, yy);
        cx.font = `900 ${Math.round(r * .45)}px system-ui`; cx.fillText(P.n, x, yy + r * 1.5);
      }
    }
    function drawBot() {
      const x = sx(G.pl, 0), gy = GY(), jh = jumpH(), sl = sliding(), size = Math.min(W * .26, 110), bob = G.dead ? 0 : Math.abs(Math.sin(G.t * 12)) * 5;
      cx.fillStyle = "rgba(0,0,0,.35)"; cx.beginPath(); cx.ellipse(x, gy - 4, size * .38 * (1 - jh * .25), size * .1, 0, 0, 7); cx.fill();
      const y = gy - size * .95 - jh * H * .14 - bob, h = sl ? size * .55 : size, yy = sl ? gy - h - 4 : y;
      if (G.pw.turbo > 0) { for (let i = 0; i < 3; i++) { cx.fillStyle = ["#a855f7", "#f472b6", "#fde047"][i]; cx.globalAlpha = .6; cx.beginPath(); cx.moveTo(x - size * .18 + i * size * .18, yy + h * .9); cx.lineTo(x - size * .1 + i * size * .18, yy + h * .9 + 30 + Math.random() * 20); cx.lineTo(x - size * .02 + i * size * .18, yy + h * .9); cx.fill(); } cx.globalAlpha = 1; }
      if (imgOk) cx.drawImage(img, x - size / 2, yy, size, h); else { cx.fillStyle = "#e0e7ff"; cx.beginPath(); cx.arc(x, yy + h / 2, size * .35, 0, 7); cx.fill(); }
      if (G.shield) { cx.strokeStyle = "#7dd3fc"; cx.lineWidth = 4; cx.globalAlpha = .6 + Math.sin(G.t * 6) * .2; cx.beginPath(); cx.arc(x, yy + h / 2, size * .62, 0, 7); cx.stroke(); cx.globalAlpha = 1; }
      if (G.pw.magnet > 0) { cx.strokeStyle = "rgba(244,63,94,.6)"; cx.lineWidth = 2; cx.setLineDash([6, 6]); cx.beginPath(); cx.arc(x, yy + h / 2, size * .75 + Math.sin(G.t * 8) * 5, 0, 7); cx.stroke(); cx.setLineDash([]); }
    }
    G.spawnAt = (k, lane, z, extra) => { add(Object.assign({ k, lane, z }, extra || {})); return G.obj[G.obj.length - 1]; }; // לבדיקות
    G.act = act;
    hud();
    const st = await overlay(`<div class="big">🏃</div><h3>מוכן לרוץ?</h3><div class="rn-ctl" style="text-align:center"><div><b>⬅️➡️</b>מסלול</div><div><b>⬆️</b>קפיצה</div><div><b>⬇️</b>התכופפות</div><div><b>🚪</b>לעקוף</div></div><p>אוספים ברגים 🔩 ונזהרים מספסלים, מוטות וארונות!</p>`, ["▶️ יאללה!", "יציאה"]);
    if (st === 1) return finish();
    fit(); newRun();
  }

  RP.panels.run = panel;
  window.RoboRun = { play, panel, _game: () => game };
})();
