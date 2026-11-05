// 🎉 "הרובוט שלי" – חנוכה (נרות כל יום + "השמש" האגדי), 🤝 מטרה משותפת לשכבה, 🏅 תארים ליד השם, 📸 צלם רובוט.
// נטען אחרי robo-plus.js / robo-run.js (theme.js). מתחבר ללשונית "🎮 כיף" דרך RoboPlus.top / tiles / panels.
(function () {
  const R = window.RoboCore, RP = window.RoboPlus, X = window.Robo && Robo._; if (!R || !RP || !X || !R.lightCandle) return;
  const esc = X.esc, LS = X.LS, PANELS = RP.panels;
  const CSS = `
.hk-card{position:relative;border-radius:20px;padding:12px;margin-bottom:10px;color:#fff;background:radial-gradient(120% 120% at 50% 0%,#1e3a8a,#0b1033 70%);border:1.5px solid #facc15;box-shadow:0 0 24px rgba(250,204,21,.25);overflow:hidden}
.hk-card h4{margin:0 0 2px;font-size:17px;color:#fde68a}.hk-card small{color:#c7d2fe}
.hk-men{display:block;width:100%;max-width:330px;height:auto;margin:6px auto}
.hk-men .fl{transform-box:fill-box;transform-origin:50% 100%;animation:hkFl .35s ease-in-out infinite alternate}@keyframes hkFl{to{transform:scaleY(1.18) skewX(4deg)}}
.gl-card{border-radius:18px;padding:12px;margin-bottom:10px;background:linear-gradient(135deg,#064e3b,#1a1040);border:1.5px solid #34d399}
.gl-card b{font-size:15px}.gl-card small{display:block;color:#a7f3d0;font-size:12px;margin-top:2px}
.gl-bar{height:14px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:8px 0 4px}.gl-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399,#facc15);transition:width 1s}
.tt-row{display:flex;align-items:center;gap:10px;border-radius:14px;padding:10px;margin-bottom:8px;background:#1a1040;border:1.5px solid rgba(255,255,255,.12);cursor:pointer;width:100%;font:inherit;color:#fff;text-align:start}
.tt-row.on{border-color:#facc15;background:linear-gradient(135deg,#713f12,#1a1040)}.tt-row.lock{opacity:.5;cursor:default}.tt-row b{font-size:16px}.tt-row small{display:block;color:#c7c3ff;font-size:12px}
.pb-cv{display:block;width:100%;max-width:380px;margin:0 auto 10px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5);touch-action:none}
.pb-row{display:flex;gap:6px;overflow-x:auto;margin:4px 0 10px;scrollbar-width:none}.pb-row::-webkit-scrollbar{display:none}
.pb-row button{flex:0 0 auto;border:0;border-radius:12px;padding:8px 10px;font:inherit;font-size:13px;font-weight:800;color:#fff;background:rgba(255,255,255,.1);cursor:pointer}.pb-row button.on{background:linear-gradient(135deg,#5b6cff,#a259ff)}
.pb-row.st button{font-size:24px;padding:6px 8px}
.pb-lbl{font-weight:900;font-size:13px;margin-top:4px;color:#c7c3ff}
.dr-wrap{display:grid;place-items:center;height:220px;perspective:400px}
.dr{font-size:0;width:130px;height:170px;position:relative}
.dr svg{width:100%;height:100%;filter:drop-shadow(0 10px 18px rgba(0,0,0,.5))}
.dr.spin{animation:drSpin 3.2s cubic-bezier(.2,.6,.3,1) forwards}@keyframes drSpin{0%{transform:rotate(0) translateY(0)}20%{transform:rotate(-12deg) translateY(-30px)}40%{transform:rotate(14deg) translateY(-10px)}60%{transform:rotate(-10deg)}80%{transform:rotate(8deg)}100%{transform:rotate(0)}}
.dr.spin svg{animation:drFace .16s linear 18}@keyframes drFace{50%{transform:scaleX(.15)}}
.dr-res{font-size:64px;font-weight:900;text-align:center;color:#fde047;text-shadow:0 0 18px #facc15;animation:lbPop2 .5s cubic-bezier(.2,1.6,.4,1)}
`;
  if (!document.getElementById("roboFestCss")) { const s = document.createElement("style"); s.id = "roboFestCss"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  // ===================== 🕎 חנוכה =====================
  const hkDay = () => { try { const H = window.Holidays && Holidays.current && Holidays.current(); if (H && H.now && H.now.key === "hanukkah") return Math.max(1, H.now.day || 1); } catch (e) {} return R.hanukkahDay(); };
  function menorahSvg(lit, today) {
    const xs = [20, 50, 80, 110, 190, 220, 250, 280], cups = xs.map((x, i) => { const n = 8 - i, on = lit[n], tod = n === today && !on; // נר 1 בצד ימין
      return `<rect x="${x - 6}" y="52" width="12" height="38" rx="3" fill="${on ? "#fde68a" : tod ? "#93c5fd" : "#475569"}"/>` + (on ? `<g class="fl"><path d="M${x} 30c6 8 8 14 0 22c-8-8-6-14 0-22z" fill="#fb923c"/><path d="M${x} 38c3 4 4 8 0 12c-4-4-3-8 0-12z" fill="#fde047"/></g><circle cx="${x}" cy="44" r="16" fill="#fde047" opacity=".18"/>` : tod ? `<text x="${x}" y="44" font-size="14" text-anchor="middle">👆</text>` : "") + `<text x="${x}" y="104" font-size="11" text-anchor="middle" fill="#c7d2fe">${n}</text>`; }).join("");
    return `<svg class="hk-men" viewBox="0 0 300 150" aria-hidden="true"><path d="M30 92 Q150 150 270 92" stroke="#facc15" stroke-width="5" fill="none"/><path d="M80 92 Q150 128 220 92" stroke="#facc15" stroke-width="4" fill="none"/><rect x="146" y="40" width="8" height="98" fill="#facc15"/><rect x="118" y="134" width="64" height="8" rx="4" fill="#facc15"/>
      <rect x="144" y="34" width="12" height="20" rx="3" fill="#fde68a"/><g class="fl"><path d="M150 10c6 8 8 14 0 22c-8-8-6-14 0-22z" fill="#fb923c"/><path d="M150 18c3 4 4 8 0 12c-4-4-3-8 0-12z" fill="#fde047"/></g>${cups}</svg>`;
  }
  RP.top.push(() => {
    const day = hkDay(), S = X.S;
    if (day > 0) {
      const lit = (S.hk && S.hk.lit) || {}, n = Object.keys(lit).length, can = !lit[day];
      return `<div class="hk-card"><h4>🕎 חנוכה שמח! נר ${day}</h4><small>כל יום – נר ומתנה. כל 8 הנרות = <b style="color:#fde047">"השמש" 🕯️</b> סקין אגדי + תואר "שומר הנרות". ${n}/8 נרות דלוקים</small>${menorahSvg(lit, day)}
        ${can ? `<button class="rbtn" type="button" id="hkLight" style="width:100%">🕯️ להדליק את נר ${day}!</button>` : `<div class="rw-prog" style="text-align:center">✅ הדלקת היום! נתראה מחר בנר הבא 🕎</div>`}
        <div class="rw-prog" style="text-align:center;margin-top:6px">🍩 בחנוכה בלבד: סקינים מיוחדים בתיבות · 🌀 סביבון במקום הגלגל · 🕎 עולם חנוכה בריצה</div></div>`;
    }
    const inD = R.hanukkahIn(); if (inD > 0 && inD <= 21) return `<div class="hk-card"><h4>🕎 חנוכה בעוד ${inD} ימים!</h4><small>8 נרות, 8 מתנות, סקינים שיופיעו רק בחנוכה, ו"השמש" האגדי למי שמדליק את כולם 🕯️</small></div>`;
    return "";
  });
  RP.wireTop.push(body => {
    const b = body.querySelector("#hkLight"); if (!b) return;
    b.onclick = async () => { const before = X.S.bolts, r = R.lightCandle(X.S, Date.now()); if (!r.ok) return; X.save(); X.SFX.reveal(r.shamash ? 6 : 3); X.vib([30, 20, 60]);
      const boxes = r.got.filter(g => g.t === "box").map(g => g.box);
      const open = await RP.rewardShow({ title: r.shamash ? "🕯️ הדלקת את כל 8 הנרות!!!" : `🕎 נר ${r.day} דלוק!`, sub: r.shamash ? "קיבלת את \"השמש\" – סקין אגדי + תואר \"שומר הנרות\"" : "חג אורים שמח!", got: r.got, before });
      RP.tab(body); X.hubRefresh(); if (open && boxes.length) X.openBoxes(boxes); };
  });

  // ===================== 🤝 מטרה משותפת לשכבה =====================
  let goalCache = null;
  RP.top.push(() => `<div class="gl-card" id="glCard"><b>🤝 מטרת השכבה השבוע</b><small>⏳ טוען…</small></div>`);
  RP.wireTop.push(async body => {
    const el = body.querySelector("#glCard"); if (!el) return;
    if (!X.online()) { el.remove(); return; }
    let j = goalCache && Date.now() - goalCache.at < 30000 ? goalCache.j : null;
    if (!j) { try { j = await X.api({ op: "goal" }); } catch (e) {} if (j && j.ok) goalCache = { at: Date.now(), j }; }
    if (!el.isConnected) return; if (!j || !j.ok) { el.remove(); return; }
    const pct = Math.min(100, j.n / j.target * 100), S = X.S, claimed = S.goalClaim === j.week, can = j.done && j.mine >= 30 && !claimed;
    el.innerHTML = `<b>🤝 מטרת השכבה השבוע: ${j.n.toLocaleString()} / ${j.target.toLocaleString()} 🔩</b><div class="gl-bar"><i style="width:${pct}%"></i></div>
      <small>${j.done ? "🎉 השכבה הצליחה! " : `עוד ${(j.target - j.n).toLocaleString()} ברגים · `}${j.helpers} ילדים עזרו · אתה תרמת ${j.mine} 🔩${j.mine < 30 && !j.done ? " (צריך לפחות 30 כדי לקבל את הפרס)" : ""}</small>
      <small>כל ברג שאתם אוספים במשחקים נספר. מצליחים יחד → כל מי שעזר מקבל 🎁 תיבה גדולה</small>
      ${can ? `<button class="rbtn" type="button" id="glClaim" style="width:100%;margin-top:8px">🎁 לקבל את הפרס של השכבה!</button>` : claimed ? `<small>✅ קיבלת את הפרס של השבוע</small>` : ""}`;
    const c = el.querySelector("#glClaim"); if (c) c.onclick = async () => { const before = S.bolts; S.goalClaim = j.week; S.goalHelps = (S.goalHelps || 0) + 1; S.boxes.push("big"); X.save();
      const open = await RP.rewardShow({ title: "🤝 השכבה הצליחה!", sub: "כל הכבוד לכולם – והנה הפרס שלך", got: [{ t: "box", box: "big" }], before }); RP.tab(body); if (open) X.openBoxes(["big"]); };
  });

  // ===================== 🏅 תארים =====================
  RP.tiles.push(tile => tile("titles", "🏅", "#f59e0b", "תארים", R.titleText(X.S) || `פתחת ${R.titlesOf(X.S).length}/${R.TITLES.length}`));
  PANELS.titles = body => {
    const S = X.S, mine = new Set(R.titlesOf(S).map(x => x.id));
    body.innerHTML = `${RP.back}<div class="rp-h">🏅 תארים</div><div class="rp-s">התואר שתבחר מופיע ליד השם שלך – בחברים, בטבלאות ובארון. כל תואר נפתח על הישג.</div>
      <button type="button" class="tt-row ${!S.title ? "on" : ""}" data-tt=""><b>— בלי תואר</b></button>` + R.TITLES.map(x => `<button type="button" class="tt-row ${S.title === x.id && mine.has(x.id) ? "on" : ""} ${mine.has(x.id) ? "" : "lock"}" data-tt="${x.id}"><div style="flex:1"><b>${esc(x.t)}</b><small>${mine.has(x.id) ? "✅ פתוח – לחץ להציג" : "🔒 " + esc(x.how)}</small></div>${S.title === x.id && mine.has(x.id) ? "⭐" : ""}</button>`).join("");
    RP.wireBackTo(body, () => RP.tab(body));
    body.querySelectorAll("[data-tt]").forEach(b => b.onclick = () => { const id = b.dataset.tt; if (id && !mine.has(id)) { X.toast("🔒 " + esc(R.TITLES.find(x => x.id === id).how), null, 2500); return; } S.title = id || null; X.save(); X.SFX.coin(); X.vib(20); X.draw(); try { Robo.publish(); } catch (e) {} });
  };
  // 🏅 תואר חדש נפתח → הודעה (בודקים מדי פעם)
  function titleCheck() { const S = X.S; if (!S || X.locked()) return; const now = R.titlesOf(S).map(x => x.id), seen = (S.ttSeen || []); const fresh = now.filter(id => !seen.includes(id)); if (!fresh.length) return; S.ttSeen = now; X.save(); if (!seen.length && fresh.length > 1) return; for (const id of fresh) { const t = R.TITLES.find(x => x.id === id); setTimeout(() => X.toast(`🏅 <b>תואר חדש: ${esc(t.t)}!</b>`, ["להציג", () => { X.S.title = id; X.save(); X.open("fun", "titles"); }], 8000), 500); } }
  setInterval(titleCheck, 15000); setTimeout(titleCheck, 5000);

  // ===================== 📸 צלם רובוט =====================
  const BGS = [
    { n: "🌌 חלל", f: (c, W, H) => { const g = c.createRadialGradient(W * .5, H * .4, 50, W * .5, H * .5, H); g.addColorStop(0, "#4c1d95"); g.addColorStop(.6, "#1e1b4b"); g.addColorStop(1, "#020617"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; for (let i = 0; i < 120; i++) { c.globalAlpha = (i * 37 % 10) / 10; c.fillRect((i * 263) % W, (i * 151) % H, 2 + i % 3, 2 + i % 3); } c.globalAlpha = 1; c.fillStyle = "#f472b6"; c.beginPath(); c.arc(W * .8, H * .15, 70, 0, 7); c.fill(); c.strokeStyle = "#fde68a"; c.lineWidth = 10; c.beginPath(); c.ellipse(W * .8, H * .15, 120, 26, -.3, 0, 7); c.stroke(); } },
    { n: "🏖️ חוף", f: (c, W, H) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#38bdf8"); g.addColorStop(.55, "#bae6fd"); g.addColorStop(.56, "#0ea5e9"); g.addColorStop(.7, "#0284c7"); g.addColorStop(.71, "#fde68a"); g.addColorStop(1, "#f59e0b"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = "#fde047"; c.beginPath(); c.arc(W * .2, H * .15, 80, 0, 7); c.fill(); } },
    { n: "🎤 במה", f: (c, W, H) => { c.fillStyle = "#0b0820"; c.fillRect(0, 0, W, H); for (const [x, col] of [[.2, "rgba(244,114,182,.35)"], [.5, "rgba(250,204,21,.35)"], [.8, "rgba(56,189,248,.35)"]]) { c.fillStyle = col; c.beginPath(); c.moveTo(W * x - 30, 0); c.lineTo(W * x + 30, 0); c.lineTo(W * x + 260, H); c.lineTo(W * x - 260, H); c.fill(); } c.fillStyle = "#7f1d1d"; c.fillRect(0, H * .82, W, H * .18); } },
    { n: "🌳 יער", f: (c, W, H) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#86efac"); g.addColorStop(1, "#14532d"); c.fillStyle = g; c.fillRect(0, 0, W, H); for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? "#166534" : "#15803d"; c.beginPath(); c.moveTo(i * 170 - 40, H * .85); c.lineTo(i * 170 + 60, H * .25); c.lineTo(i * 170 + 160, H * .85); c.fill(); } } },
    { n: "🌃 עיר בלילה", f: (c, W, H) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1e1b4b"); g.addColorStop(1, "#7c3aed"); c.fillStyle = g; c.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) { const h = 300 + (i * 97) % 380; c.fillStyle = "#0f172a"; c.fillRect(i * 125, H - h, 110, h); c.fillStyle = "#fde047"; for (let y = H - h + 30; y < H - 40; y += 50) for (let x = 0; x < 3; x++) if ((i + x + y) % 3) c.fillRect(i * 125 + 15 + x * 32, y, 18, 22); } } },
    { n: "🏫 הישיבה", f: (c, W, H) => { c.fillStyle = "#334155"; c.fillRect(0, 0, W, H); for (let i = 0; i < 8; i++) { c.fillStyle = ["#1d4ed8", "#0369a1", "#4338ca"][i % 3]; c.fillRect(i * 140, H * .15, 120, H * .6); c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(i * 140 + 20, H * .2, 80, 8); c.fillRect(i * 140 + 20, H * .23, 80, 8); } c.fillStyle = "#64748b"; c.fillRect(0, H * .75, W, H * .25); } },
    { n: "💛 זהב", f: (c, W, H) => { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#78350f"); g.addColorStop(.4, "#d97706"); g.addColorStop(.6, "#fde68a"); g.addColorStop(1, "#a16207"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; for (let i = 0; i < 30; i++) { c.globalAlpha = .6; const x = (i * 233) % W, y = (i * 389) % H; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 4, y); c.lineTo(x, y + 14); c.lineTo(x - 4, y); c.fill(); } c.globalAlpha = 1; } },
    { n: "🌈 קשת", f: (c, W, H) => { c.fillStyle = "#e0f2fe"; c.fillRect(0, 0, W, H); ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 46; c.beginPath(); c.arc(W / 2, H * .95, W * .75 - i * 46, Math.PI, 0); c.stroke(); }); } },
  ];
  const FRAMES = [{ n: "בלי" }, { n: "🟨 זהב" }, { n: "💜 ניאון" }, { n: "📷 פולארויד" }];
  const POSES = [{ n: "👋 נפנוף" }, { n: "😎 מגניב" }, { n: "💪 שרירים" }, { n: "🦘 קפיצה" }];
  const STICK = ["👑", "🔥", "💯", "😎", "⭐", "💎", "🏆", "❤️", "⚡", "🎉", "🐐", "🍩", "🕎", "🚀"];
  let PB = { bg: 0, fr: 1, pose: 0, st: [], stats: true };
  PANELS.booth = body => {
    body.innerHTML = `${RP.back}<div class="rp-h">📸 צלם רובוט</div><div class="rp-s">בוחרים רקע, מסגרת ותנוחה, מוסיפים מדבקות (גוררים אותן!) – ומשתפים בסטטוס 🙂</div>
      <canvas class="pb-cv" id="pbCv" width="1080" height="1350"></canvas>
      <div class="pb-lbl">רקע</div><div class="pb-row" data-k="bg">${BGS.map((b, i) => `<button type="button" data-i="${i}" class="${PB.bg === i ? "on" : ""}">${b.n}</button>`).join("")}</div>
      <div class="pb-lbl">תנוחה</div><div class="pb-row" data-k="pose">${POSES.map((b, i) => `<button type="button" data-i="${i}" class="${PB.pose === i ? "on" : ""}">${b.n}</button>`).join("")}</div>
      <div class="pb-lbl">מסגרת</div><div class="pb-row" data-k="fr">${FRAMES.map((b, i) => `<button type="button" data-i="${i}" class="${PB.fr === i ? "on" : ""}">${b.n}</button>`).join("")}<button type="button" data-stats="1" class="${PB.stats ? "on" : ""}">📊 כרטיס שחקן</button></div>
      <div class="pb-lbl">מדבקות (לחיצה מוסיפה, גוררים להזיז)</div><div class="pb-row st">${STICK.map(e => `<button type="button" data-s="${e}">${e}</button>`).join("")}<button type="button" data-clear="1" style="font-size:13px">🗑️ לנקות</button></div>
      <div class="lb-tools"><button class="rbtn" type="button" id="pbShare">📤 לשתף</button><button class="rbtn alt" type="button" id="pbSave">💾 לשמור</button></div>`;
    RP.wireBackTo(body, () => RP.tab(body));
    const cv = body.querySelector("#pbCv"), c = cv.getContext("2d"), W = 1080, H = 1350;
    const img = new Image(); img.onload = () => render(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(X.svg("", null, { still: true }).replace('class="abot', 'width="600" height="600" class="abot'));
    const sk = R.ITEMS[(X.S.eq || {}).skin] || {}, BODY = (sk.sk && sk.sk[1]) || "#c7d2fe", BODY2 = (sk.sk && sk.sk[2]) || "#818cf8";
    const limb = (x1, y1, a1, l1, a2, l2, w) => { const kx = x1 + Math.sin(a1) * l1, ky = y1 + Math.cos(a1) * l1, fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2; c.strokeStyle = "#94a3b8"; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke(); c.fillStyle = "#475569"; c.beginPath(); c.arc(kx, ky, w * .45, 0, 7); c.fill(); return [fx, fy]; };
    function robot(x, gy, size, pose) {
      const lift = pose === 3 ? size * .35 : 0, legL = size * .26, hip = gy - legL - lift, torsoH = size * .3, tw = size * .42, ty = hip - torsoH, lw = size * .085;
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(x, gy, size * .34 * (pose === 3 ? .6 : 1), size * .08, 0, 0, 7); c.fill();
      const legs = pose === 3 ? [[.9, -1.4], [-.6, 1]] : pose === 1 ? [[.25, 0], [-.05, 0]] : [[.12, 0], [-.12, 0]];
      legs.forEach(([a, b], i) => { const [fx, fy] = limb(x + (i ? 1 : -1) * size * .08, hip, a, legL * .52, b, legL * .52, lw); c.fillStyle = "#1f2937"; c.beginPath(); c.ellipse(fx + 3, fy, size * .07, size * .035, 0, 0, 7); c.fill(); });
      const g = c.createLinearGradient(x - tw / 2, ty, x + tw / 2, hip); g.addColorStop(0, "#fff"); g.addColorStop(.35, BODY); g.addColorStop(1, BODY2); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(x - tw / 2, ty, tw, torsoH + 4, size * .1) : c.rect(x - tw / 2, ty, tw, torsoH + 4); c.fill();
      c.fillStyle = "#0f172a"; c.beginPath(); c.arc(x, ty + torsoH * .45, size * .055, 0, 7); c.fill(); c.fillStyle = "#7cf5ff"; c.beginPath(); c.arc(x, ty + torsoH * .45, size * .03, 0, 7); c.fill();
      const arms = pose === 0 ? [[.2, -.3], [-2.7, -.7]] : pose === 1 ? [[1.2, -1.8], [-1.2, 1.8]] : pose === 2 ? [[2.4, 1.5], [-2.4, -1.5]] : [[2.7, .3], [-2.7, -.3]];
      limb(x - tw / 2, ty + size * .05, arms[0][0], size * .16, arms[0][1], size * .15, lw * .85); limb(x + tw / 2, ty + size * .05, arms[1][0], size * .16, arms[1][1], size * .15, lw * .85);
      if (pose === 1) { c.fillStyle = "#0b0b12"; c.fillRect(x - size * .2, ty - size * .5, size * .4, size * .07); }
      const hs = size * .7; c.drawImage(img, x - hs / 2, ty - hs * .86, hs, hs);
      if (pose === 1) { c.fillStyle = "#0b0b12"; c.beginPath(); c.roundRect ? c.roundRect(x - hs * .3, ty - hs * .5, hs * .6, hs * .16, 12) : c.rect(x - hs * .3, ty - hs * .5, hs * .6, hs * .16); c.fill(); }
    }
    function render() {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); BGS[PB.bg].f(c, W, H);
      const S = X.S, p = X.profile() || {}, card = PB.stats;
      robot(W / 2, card ? H * .7 : H * .82, card ? 640 : 780, PB.pose);
      c.direction = "rtl"; c.textAlign = "center";
      const nm = S.name || `הרובוט של ${p.first || ""}`, tt = R.titleText(S);
      c.font = "900 78px system-ui,sans-serif"; c.lineWidth = 12; c.strokeStyle = "rgba(0,0,0,.55)"; c.strokeText(nm, W / 2, 130); c.fillStyle = "#fff"; c.fillText(nm, W / 2, 130);
      if (tt) { c.font = "900 46px system-ui,sans-serif"; c.lineWidth = 9; c.strokeText(tt, W / 2, 200); c.fillStyle = "#fde047"; c.fillText(tt, W / 2, 200); }
      if (card) { const y0 = PB.fr === 3 ? H * .67 : H * .735; c.fillStyle = "rgba(10,8,32,.82)"; c.beginPath(); c.roundRect ? c.roundRect(70, y0, W - 140, 250, 36) : c.rect(70, y0, W - 140, 250); c.fill(); c.strokeStyle = "#facc15"; c.lineWidth = 5; c.stroke();
        const b = R.best(S), rows = [`🔥 רצף ${(S.st || {}).n || 0}`, `🏃 ${S.runBest || 0} מ'`, `🔩 שיא ${S.gameBest || 0}`, `🏆 ${R.progress(S).have}/${R.progress(S).all}`];
        c.fillStyle = "#fff"; c.font = "900 52px system-ui,sans-serif"; rows.forEach((t, i) => c.fillText(t, W * (.8 - (i % 2) * .6 + (i % 2 ? 0 : 0)) , y0 + 75 + Math.floor(i / 2) * 78));
        if (b && R.RAR[b.r].o >= 2) { c.font = "800 36px system-ui,sans-serif"; c.fillStyle = "#fde68a"; c.fillText(`הכי נדיר: ${b.n}`, W / 2, y0 + 220); } }
      c.font = "800 34px system-ui,sans-serif"; c.fillStyle = "rgba(255,255,255,.85)"; if (PB.fr !== 3) c.fillText("המערכת · ישיבת בני עקיבא בית יהודה", W / 2, H - 60);
      for (const s2 of PB.st) { c.font = `${s2.s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textBaseline = "middle"; c.fillText(s2.e, s2.x, s2.y); c.textBaseline = "alphabetic"; }
      // מסגרת
      if (PB.fr === 1) { c.lineWidth = 34; const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#fde68a"); g.addColorStop(.5, "#b45309"); g.addColorStop(1, "#fde68a"); c.strokeStyle = g; c.strokeRect(17, 17, W - 34, H - 34); }
      else if (PB.fr === 2) { c.lineWidth = 16; c.shadowColor = "#e879f9"; c.shadowBlur = 40; c.strokeStyle = "#f0abfc"; c.strokeRect(30, 30, W - 60, H - 60); c.shadowBlur = 0; }
      else if (PB.fr === 3) { c.fillStyle = "#fff"; c.fillRect(0, 0, W, 40); c.fillRect(0, 0, 40, H); c.fillRect(W - 40, 0, 40, H); c.fillRect(0, H - 120, W, 120); c.fillStyle = "#334155"; c.font = "800 44px system-ui,sans-serif"; c.fillText(new Date().toLocaleDateString("he-IL"), W / 2, H - 45); }
    }
    body.querySelectorAll(".pb-row[data-k] [data-i]").forEach(b => b.onclick = () => { const k = b.parentElement.dataset.k; PB[k] = +b.dataset.i; b.parentElement.querySelectorAll("[data-i]").forEach(q => q.classList.toggle("on", q === b)); X.SFX.tap(); render(); });
    body.querySelector("[data-stats]").onclick = e => { PB.stats = !PB.stats; e.target.classList.toggle("on", PB.stats); render(); };
    body.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { if (PB.st.length >= 12) return; PB.st.push({ e: b.dataset.s, x: W * (.25 + Math.random() * .5), y: H * (.25 + Math.random() * .3), s: 120 }); X.SFX.coin(); render(); });
    body.querySelector("[data-clear]").onclick = () => { PB.st = []; render(); };
    // גרירת מדבקות
    let drag = null; const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener("pointerdown", e => { const [x, y] = pt(e); drag = [...PB.st].reverse().find(s2 => Math.hypot(s2.x - x, s2.y - y) < s2.s * .6) || null; if (drag) cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => { if (!drag) return; const [x, y] = pt(e); drag.x = x; drag.y = y; render(); });
    cv.addEventListener("pointerup", () => { drag = null; });
    const blob = () => new Promise(res => cv.toBlob(res, "image/png"));
    body.querySelector("#pbShare").onclick = async () => { const b = await blob(); if (!b) return; const f = new File([b], "my-robot.png", { type: "image/png" }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "הרובוט שלי", text: "תראו את הרובוט שלי במערכת! 🤖" }); return; } } catch (e) { if (e && e.name === "AbortError") return; } dl(b); };
    body.querySelector("#pbSave").onclick = async () => { const b = await blob(); if (b) dl(b); };
    const dl = b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "my-robot.png"; document.body.appendChild(a); a.click(); a.remove(); X.toast("📸 התמונה נשמרה!", null, 2500); };
    render();
  };
  RP.tiles.push(tile => tile("booth", "📸", "#ec4899", "צלם רובוט", "תמונה לסטטוס עם רקע ומדבקות"));
  window.RoboFest = { hkDay, menorahSvg };
})();
