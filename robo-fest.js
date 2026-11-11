// 🎉 "הרובוט שלי" – חנוכה (נרות כל יום + "השמש" האגדי), 🤝 מטרה משותפת לשכבה, 🏅 תארים ליד השם, 📸 צלם רובוט.
// נטען אחרי robo-plus.js / robo-run.js (theme.js). מתחבר ללשונית "🎮 כיף" דרך RoboPlus.top / tiles / panels.
(function () {
  const R = window.RoboCore, RP = window.RoboPlus, X = window.Robo && Robo._; if (!R || !RP || !X || !R.lightCandle) return;
  const esc = X.esc, LS = X.LS, PANELS = RP.panels;
  const CSS = `
.md-sum{display:flex;gap:10px;justify-content:center;align-items:baseline;flex-wrap:wrap;margin:6px 0 4px;font-size:22px}.md-sum b{font-size:24px}.md-sum small{flex-basis:100%;text-align:center;color:#c7c3ff;font-size:12.5px}
.md-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.md-c{position:relative;border-radius:16px;padding:10px 8px;text-align:center;background:linear-gradient(160deg,#241a52,#16103a);border:1.5px solid rgba(255,255,255,.12)}
.md-c.gold{border-color:#facc15;background:linear-gradient(160deg,#5b3d05,#1a1040);box-shadow:0 0 16px rgba(250,204,21,.3)}.md-c.ready{border-color:#22c55e;animation:mdGlow 1.2s ease-in-out infinite alternate}@keyframes mdGlow{to{box-shadow:0 0 18px rgba(34,197,94,.55)}}
.md-em{font-size:30px}.md-c b{display:block;font-size:14px}.md-c small{display:block;font-size:11.5px;color:#c7c3ff;margin-top:2px}.md-row{display:flex;justify-content:center;gap:4px;margin:4px 0}
.md-row i{font-style:normal;font-size:22px;filter:grayscale(1) brightness(.6);opacity:.45;transition:.3s}.md-row i.on{filter:none;opacity:1;animation:mdPop .5s cubic-bezier(.2,1.6,.4,1)}@keyframes mdPop{from{transform:scale(.3)}to{transform:none}}
.md-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden;margin:5px 4px}.md-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#facc15)}.md-c .rbtn{margin-top:4px;width:100%}
.ad-box{border-radius:16px;padding:12px;margin-bottom:10px;background:#1a1040;border:1.5px solid rgba(250,204,21,.45)}.ad-box>b{display:block;font-size:15px;margin-bottom:6px;color:#fde047}.ad-box small{display:block;color:#c7c3ff;font-size:12.5px}
.ad-box label{display:block;font-size:13px;font-weight:800;margin:6px 0}.ad-box input,.ad-box select{display:block;width:100%;box-sizing:border-box;margin-top:4px;border-radius:10px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;padding:9px;font:inherit;font-size:15px}
.ad-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ad-row2{display:flex;gap:6px;align-items:center;margin-top:4px}.ad-row2 select,.ad-row2 input{margin:0;flex:1}.ad-ck{display:flex!important;gap:6px;align-items:center}.ad-ck input{width:auto;display:inline}
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

  // ===================== 🏅 הישגים ומדליות =====================
  const MI = ["🥉", "🥈", "🥇"], MN = ["ארד", "כסף", "זהב"];
  RP.tiles.push(tile => { const mc = R.medalCount(X.S); return tile("medals", "🏅", "#eab308", "מדליות", `🥇${mc.g} 🥈${mc.s} 🥉${mc.b}${mc.ready ? ` · ${mc.ready} מחכות!` : ""}`, mc.ready ? "!" : ""); });
  PANELS.medals = body => {
    const S = X.S, L = R.medals(S), mc = R.medalCount(S), fmt = n => Math.floor(n).toLocaleString("he-IL");
    body.innerHTML = `${RP.back}<div class="rp-h">🏅 הישגים ומדליות</div><div class="md-sum"><span>🥇 <b>${mc.g}</b></span><span>🥈 <b>${mc.s}</b></span><span>🥉 <b>${mc.b}</b></span><small>${L.length * 3 - mc.g - mc.s - mc.b} מדליות עוד מחכות לך</small></div>
      <div class="rp-s">כל מדליה = פרס: 🥉 100 🔩 · 🥈 🎁 תיבה גדולה · 🥇 💠 תיבת מגה</div>
      <div class="md-grid">${L.map(m => { const ready = m.tier > m.got, pct = m.next ? Math.min(100, m.val / m.next * 100) : 100;
        return `<div class="md-c${m.tier === 3 ? " gold" : ""}${ready ? " ready" : ""}"><div class="md-em">${m.em}</div><b>${esc(m.n)}</b><div class="md-row">${[0, 1, 2].map(i => `<i class="${i < m.tier ? "on" : ""} t${i}">${MI[i]}</i>`).join("")}</div>
          <small>${m.next ? `${fmt(m.val)} / ${fmt(m.next)} ${esc(m.u)}` : `הכל! ${fmt(m.val)} ${esc(m.u)} 👑`}</small><div class="md-bar"><i style="width:${pct}%"></i></div>
          ${ready ? `<button class="rbtn sm" type="button" data-md="${m.id}">${MI[m.got]} לקבל!</button>` : ""}</div>`; }).join("")}</div>`;
    body.querySelector(".rp-back").onclick = () => RP.tab(body);
    body.querySelectorAll("[data-md]").forEach(b => b.onclick = async () => {
      const before = S.bolts, r = R.claimMedal(S, b.dataset.md); if (!r) return; X.save(); X.hubRefresh();
      const boxes = r.prize.filter(p => p.t === "box").map(p => p.box);
      const open = await RP.rewardShow({ title: `${MI[r.tier - 1]} מדליית ${MN[r.tier - 1]}!`, sub: R.MEDALS.find(x => x.id === b.dataset.md).n, got: r.prize, before });
      PANELS.medals(body); if (open && boxes.length) X.openBoxes(boxes);
    });
  };
  // הודעה כשמגיעים למדליה חדשה
  function medalCheck() { const S = X.S; if (!S || X.locked()) return; const L = R.medals(S), key = L.map(m => m.tier).join(""); if (S.mdSeen === key) return; const had = (S.mdSeen || "").split("").map(Number); S.mdSeen = key; X.save();
    const nw = L.find((m, i) => had.length === L.length && m.tier > (had[i] || 0)); if (nw) { X.SFX.gift(); X.toast(`${MI[nw.tier - 1]} <b>מדליית ${MN[nw.tier - 1]} – ${esc(nw.n)}!</b> יש לך פרס שמחכה`, ["🏅 לקבל", () => X.open("fun", "medals")], 8000); } }
  setInterval(medalCheck, 15000); setTimeout(medalCheck, 6000);

  // ===================== 👑 פאנל מנהל (רק בטלפון של מנהל המערכת) =====================
  // מביאים לעצמך כמה שרוצים (ברגים / תיבות / אביזרים), הכל נרשם – ואפשר להחזיר הכל בלחיצה (רק מה שהבאת לעצמך).
  // 🤖 רובוט אוטומטי במשחקים (כפתור 🤖 בשורה העליונה של המשחק), ו-🧹 להוריד את עצמך מטבלאות השיאים כדי שיהיה הוגן.
  const isOwner = () => !!(X.powers && X.powers().owner);
  RP.tiles.push(tile => isOwner() ? tile("admin", "👑", "#facc15", "פאנל מנהל", "להביא לעצמי · להחזיר · רובוט אוטומטי") : "");
  const ledger = () => { const S = X.S; return S.ownL = S.ownL || { bolts: 0, boxes: {}, items: [] }; };
  function giveSelf(o) {
    const S = X.S, L = ledger(); S.ownBx = S.ownBx || {}; let msg = [];
    const b = Math.max(0, Math.floor(+o.bolts || 0)); if (b) { if (S.realBolts != null) S.realBolts += b; else S.bolts += b; L.bolts += b; msg.push(`🔩 ${b.toLocaleString()}`); }
    let room = 500 - S.boxes.length;
    for (const [t, n0] of Object.entries(o.boxes || {})) { const n = Math.min(room, Math.max(0, Math.floor(+n0 || 0))); if (!n || !R.BOX[t]) continue; for (let i = 0; i < n; i++) S.boxes.push(t); room -= n; S.ownBx[t] = (S.ownBx[t] || 0) + n; L.boxes[t] = (L.boxes[t] || 0) + n; msg.push(`${R.BOX[t].em} ×${n}`); }
    let ni = 0; for (const id of o.items || []) { if (!R.ITEMS[id] || (S.own[id] && S.own[id] !== -1)) continue; S.own[id] = Date.now(); S.news.push(id); L.items.push(id); (S.tr = S.tr || {})[id] = 1; ni++; }
    if (ni) msg.push(`👕 ${ni} אביזרים`);
    X.save(); X.hubRefresh(); return msg.join(" · ");
  }
  function undoSelf() {
    const S = X.S, L = ledger(), bx = S.ownBx || {};
    if (S.realBolts != null) S.realBolts = Math.max(0, S.realBolts - L.bolts); else S.bolts = Math.max(0, S.bolts - L.bolts);
    let nb = 0; for (const [t, n] of Object.entries(bx)) { let k = n; for (let i = S.boxes.length - 1; i >= 0 && k > 0; i--) if (S.boxes[i] === t) { S.boxes.splice(i, 1); k--; nb++; } }
    let ni = 0; for (const id of new Set(L.items)) { if (!S.own[id] || id === "skin:classic") continue; delete S.own[id]; ni++; if (S.shiny) delete S.shiny[id]; for (const c of Object.keys(S.eq)) if (S.eq[c] === id) delete S.eq[c]; }
    if (!S.eq.skin) S.eq.skin = "skin:classic"; const b = L.bolts; delete S.ownL; delete S.ownBx; X.save(); X.hubRefresh(); return `החזרתי: 🔩 ${b.toLocaleString()} · 📦 ${nb} תיבות · 👕 ${ni} אביזרים`;
  }
  PANELS.admin = body => {
    if (!isOwner()) { RP.tab(body); return; }
    const S = X.S, L = ledger(), bot = LS.get("roboBot", "") === "1", nBox = Object.values(L.boxes).reduce((a, n) => a + n, 0);
    const RARS = Object.keys(R.RAR), names = R.LIST.filter(x => !x.free).map(x => `<option value="${esc(x.n)} · ${esc(R.RAR[x.r].n)}"></option>`).join("");
    body.innerHTML = `${RP.back}<div class="rp-h">👑 פאנל מנהל</div><div class="rp-s">רק בטלפון שלך. כל מה שאתה מביא לעצמך נרשם – ואפשר להחזיר הכל בלחיצה (מה שנתת לאחרים – לא נלקח).</div>
      <div class="ad-box"><b>🎁 להביא לעצמי</b>
        <label>🔩 ברגים <input type="number" inputmode="numeric" min="0" id="adB" placeholder="למשל 10009"></label>
        <div class="ad-row">${Object.entries(R.BOX).map(([k, B]) => `<label>${B.em} ${esc(B.n)}<input type="number" inputmode="numeric" min="0" data-box="${k}" placeholder="0"></label>`).join("")}</div>
        <label>👕 אביזר לפי שם <input list="adNames" id="adItem" placeholder="מתחילים להקליד…"><datalist id="adNames">${names}</datalist></label>
        <label>✨ או: כמה אביזרים אקראיים מדרגה <span class="ad-row2"><select id="adRar">${RARS.map(r => `<option value="${r}">${esc(R.RAR[r].n)}</option>`).join("")}</select><input type="number" min="0" id="adRarN" placeholder="כמה"><button class="rbtn sm alt" type="button" id="adRarAll">כל הדרגה</button></span></label>
        <button class="rbtn" type="button" id="adGive" style="width:100%;margin-top:8px">🎁 להביא לי עכשיו</button></div>
      <div class="ad-box"><b>📒 מה הבאת לעצמך עד עכשיו</b><small>🔩 ${L.bolts.toLocaleString()} ברגים · 📦 ${nBox} תיבות (${Object.values(S.ownBx || {}).reduce((a, n) => a + n, 0)} עוד סגורות) · 👕 ${L.items.length} אביזרים</small>
        <button class="rbtn alt" type="button" id="adUndo" style="width:100%;margin-top:8px" ${L.bolts || nBox || L.items.length ? "" : "disabled"}>↩️ להחזיר הכל ממני</button></div>
      <div class="ad-box"><b>🤖 רובוט שמשחק בשבילי</b><small>במשחקים (ריצה וברגים נופלים) יש כפתור 🤖 למעלה – לוחצים והרובוט משחק לבד, לוחצים שוב והוא עוצר.</small>
        <button class="rbtn ${bot ? "" : "alt"}" type="button" id="adBot" style="width:100%;margin-top:8px">${bot ? "🤖 פועל – ללחוץ כדי לכבות" : "🤖 להדליק את הרובוט"}</button></div>
      <div class="ad-box"><b>🧹 שיהיה הוגן</b><small>מוריד אותך מטבלת השבוע ומטבלת כל הזמנים (בשני המשחקים).</small>
        <label class="ad-ck"><input type="checkbox" id="adLocal" checked> גם לאפס את השיאים שלי בטלפון</label>
        <button class="rbtn alt" type="button" id="adLb" style="width:100%;margin-top:6px">🧹 להוריד אותי מהטבלאות</button></div>`;
    body.querySelector(".rp-back").onclick = () => RP.tab(body);
    const pickItem = () => { const v = (body.querySelector("#adItem").value || "").split(" · ")[0].trim(); const it = v && R.LIST.find(x => x.n === v); return it ? [it.id] : []; };
    const randItems = (r, n) => { const pool = R.LIST.filter(x => x.r === r && !x.free && !(S.own[x.id] && S.own[x.id] !== -1)); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id); return out; };
    body.querySelector("#adRarAll").onclick = () => { const r = body.querySelector("#adRar").value, m = giveSelf({ items: randItems(r, 9999) }); X.toast(m ? `✅ קיבלת: ${m}` : "כבר יש לך את כל הדרגה הזאת 🙂", null, 3500); PANELS.admin(body); };
    body.querySelector("#adGive").onclick = () => {
      const boxes = {}; body.querySelectorAll("[data-box]").forEach(i => { boxes[i.dataset.box] = +i.value || 0; });
      const items = [...pickItem(), ...randItems(body.querySelector("#adRar").value, +body.querySelector("#adRarN").value || 0)];
      const m = giveSelf({ bolts: body.querySelector("#adB").value, boxes, items });
      if (!m) { X.toast("לא בחרת כלום 🙂", null, 2500); return; } X.SFX.gift(); X.toast(`✅ קיבלת: ${m}`, Object.values(boxes).some(n => n > 0) ? ["📦 לפתוח", () => X.open("boxes")] : null, 6000); PANELS.admin(body);
    };
    body.querySelector("#adUndo").onclick = () => { if (!confirm("להחזיר את כל מה שהבאת לעצמך? (ברגים, תיבות שעוד סגורות, אביזרים – וגם מה שיצא מהתיבות האלה)")) return; X.toast("↩️ " + undoSelf(), null, 5000); PANELS.admin(body); };
    body.querySelector("#adBot").onclick = () => { LS.set("roboBot", LS.get("roboBot", "") === "1" ? null : "1"); PANELS.admin(body); };
    body.querySelector("#adLb").onclick = async e => {
      if (!confirm("להוריד אותך מטבלאות השיאים (השבוע + כל הזמנים)?")) return; e.target.disabled = true; let r = null; try { r = await X.api({ op: "lbMe" }); } catch (er) {}
      if (!r || !r.ok) { e.target.disabled = false; X.toast("לא הצלחתי 📶 נסה שוב", null, 3000); return; }
      if (body.querySelector("#adLocal").checked) { S.runBest = 0; S.gameBest = 0; S.gamePract = 0; delete S.wk; delete S.allTop; X.save(); }
      X.toast("🧹 הורדתי אותך מהטבלאות ✅", null, 3500); PANELS.admin(body);
    };
  };

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
