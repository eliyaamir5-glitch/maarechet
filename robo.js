// 🤖 "הרובוט שלי" – הממשק: ציור הרובוט עם כל האביזרים, ארון בגדים, פתיחת תיבות, רצף כניסות יומי, חנות ותמונה לחברים.
// הלוגיקה ב-robo-core.js. נטען מ-theme.js בכל עמודי התלמיד. העוזר (assistant.js) מצייר את הרובוט דרך Robo.svg.
(function () {
  const R = window.RoboCore; if (!R) return;
  const page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  if (page === "parent" || (page === "shichrur" && /^#p=/.test(location.hash))) return;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  let S = load();
  function load() { let s = null; try { s = JSON.parse(LS.get("robo", "null")); } catch (e) {} return R.norm(s); }
  function save() {
    // 🎭 סט שלם → פרס (פעם אחת)
    const sets = R.setsCheck(S); for (const st of sets) { for (const p of st.prize) R.grant(S, p); setTimeout(() => { toast(`🎭 <b>השלמת את הסט ${esc(st.n)}!</b> קיבלת ${esc(st.prize.map(giftText).join(" + "))}`, st.prize.some(p => p.t === "box") ? ["לפתוח", () => openBoxes(st.prize.filter(p => p.t === "box").map(p => p.box))] : null, 9000); SFX.gift(); }, 900); }
    if (S.sets && S.sets.heroes && !S.legendTry && !legendBusy && !locked()) setTimeout(legendClaim, 1500);
    LS.set("robo", JSON.stringify(S)); try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {} applyBubble(); homeBtn(); }
  // כפתור "🤖 הרובוט שלי" במסך הראשי – עם מספר התיבות שמחכות
  // 📋 משימות יומיות: מעדכנים התקדמות ומודיעים כשמשימה הושלמה
  function trk(ev, n = 1) { const d = R.track(S, ev, n); for (const id of d) { const M = R.MISSIONS[id]; setTimeout(() => toast(`📋 <b>משימה הושלמה!</b> ${M.em} ${esc(M.n)} – לך לאסוף את הפרס`, ["לאסוף", () => open("fun")], 6000), 1200); } return d.length; }
  // 🗺️ צעדים במסע (מחזיר כמה תחנות חדשות)
  function step(n) { trk("step", n); const k = R.mapStep(S, n); if (k > 0) setTimeout(() => toast(`🗺️ הגעת לתחנה חדשה במסע! יש שם אוצר 💰`, ["למפה", () => open("fun", "map")], 7000), 1500); return k; }
  function homeBtn() { const b = document.getElementById("roboBtn"); if (!b) return; if (locked()) { b.innerHTML = "🔒 הרובוט שלי"; b.classList.remove("rb-glow"); return; } const n = S.boxes.length; b.innerHTML = `🤖 הרובוט שלי${n ? ` <span class="rb-badge">${n}</span>` : ""}`; b.classList.toggle("rb-glow", n > 0); }
  const profile = () => { try { return JSON.parse(LS.get("profile", "null")) || null; } catch (e) { return null; } };
  const dev = () => LS.get("deviceId", "") || "dev";
  const RC = r => R.RAR[r].col;
  const bl = () => S.bolts >= 999999 ? "∞" : S.bolts;
  // 🔒 עונה חדשה: הרובוט נעול לכולם עד 5.11.2026 07:00, ואז כולם מתחילים מאפס ושווים – 1000 ברגים (בקשת מנהל המערכת)
  const OPEN_AT = Date.parse("2026-11-04T07:30:00+02:00"), SEASON = "2026-11-05";
  const testRun = () => !!(navigator.webdriver && LS.get("roboTest", "") && !LS.get("roboLockTest", ""));
  const locked = () => !testRun() && !powers().owner && Date.now() < OPEN_AT;
  function seasonReset() {
    if (testRun() || Date.now() < OPEN_AT || S.season === SEASON) return false;
    S = R.norm(null); S.bolts = 1000; S.g1000 = 1; S.cap2k = 1; S.season = SEASON;
    for (const k of ["roboPubAt", "roboMyLikes", "roboClassCache", "roboRare", "roboNews", "roboPage", "roboFlashSeen", "roboPendingCode"]) LS.set(k, null);
    try { const T = window.Theme; if (T && T.THEMES[T.current()] && T.THEMES[T.current()].lock) T.setTheme("purple"); } catch (e) {}
    save(); setTimeout(() => { toast("🎉 <b>הרובוט נפתח!</b> עונה חדשה – כולם מתחילים שווה עם 1000 ברגים 🔩 בהצלחה!", ["לחנות", () => open("shop")], 12000); SFX.gift(); }, 3500);
    return true;
  }
  const lockLeft = () => { const s = Math.max(0, Math.floor((OPEN_AT - Date.now()) / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  function lockScreen() {
    const d = dlg("roboLock"); let tm = 0;
    const draw = () => { if (!d.open && tm) { clearInterval(tm); return; } if (!locked()) { clearInterval(tm); d.close(); seasonReset(); return; } const c = d.querySelector("#rlLeft"); if (c) c.textContent = lockLeft(); };
    d.innerHTML = `<div class="ann" style="padding:calc(28px + env(safe-area-inset-top)) 20px 24px"><div class="t">🔒 הרובוט נעול עד הבוקר</div><div class="bot">${svg("", { skin: "skin:classic" }, { noHoli: true })}</div>
      <div class="w">נפתח לכולם ביחד ב-07:30 בבוקר ⏰</div><div class="l">עונה חדשה: כולם מתחילים מאפס ושווים –<br>1000 ברגים 🔩 לכל אחד!</div>
      <div style="font-size:34px;font-weight:900;margin:16px 0;font-variant-numeric:tabular-nums" id="rlLeft">${lockLeft()}</div><div class="rd-btns"><button class="rbtn" type="button" id="rlOk">הבנתי 👍</button></div></div>`;
    show(d); d.querySelector("#rlOk").onclick = () => { clearInterval(tm); d.close(); }; tm = setInterval(draw, 1000);
  } // ∞ = ברגים לאין סוף (רק בטלפון של מנהל המערכת)

  // =============== ציור הרובוט ===============
  // חליפות: צבע ראש/אוזניים/מסך/עיניים + שכבות מיוחדות. bg = הבועה של העוזר
  const DEF_BG = "radial-gradient(circle at 35% 30%,#8f9bff,#5b6cff 45%,#a259ff 80%,#ff6bd6)";
  const lg = (u, id, stops, x2 = 1, y2 = 1) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  const twinkles = (pts, col, cls = "rtw") => pts.map(([x, y, s], i) => `<path class="${cls}" style="animation-delay:${(i * .37) % 2}s" d="M${x} ${y - s}L${x + s * .3} ${y - s * .3}L${x + s} ${y}L${x + s * .3} ${y + s * .3}L${x} ${y + s}L${x - s * .3} ${y + s * .3}L${x - s} ${y}L${x - s * .3} ${y - s * .3}Z" fill="${col}"/>`).join("");
  const shine = u => `<g clip-path="url(#${u}c)"><rect class="rshine" x="-30" y="0" width="12" height="70" fill="#fff" opacity=".55" transform="skewX(-20)"/></g>`;
  const SK = {
    "skin:classic": {},
    "skin:mint": { head: "#d1fae5", ear: "#a7f3d0", eye: "#34d399", bg: "radial-gradient(circle at 35% 30%,#a7f3d0,#10b981 55%,#047857)" },
    "skin:sky": { head: "#dbeafe", ear: "#bfdbfe", eye: "#60a5fa", bg: "radial-gradient(circle at 35% 30%,#bfdbfe,#3b82f6 55%,#1d4ed8)" },
    "skin:pink": { head: "#fce7f3", ear: "#fbcfe8", eye: "#f472b6", bg: "radial-gradient(circle at 35% 30%,#fbcfe8,#ec4899 55%,#be185d)" },
    "skin:orange": { head: "#ffedd5", ear: "#fed7aa", eye: "#fb923c", bg: "radial-gradient(circle at 35% 30%,#fed7aa,#f97316 55%,#c2410c)" },
    "skin:lemon": { head: "#fef9c3", ear: "#fde68a", eye: "#facc15", bg: "radial-gradient(circle at 35% 30%,#fef08a,#eab308 55%,#a16207)" },
    "skin:coal": { head: "#374151", ear: "#1f2937", scr: "#0b0f19", eye: "#f87171", bg: "radial-gradient(circle at 35% 30%,#6b7280,#1f2937 60%,#030712)" },
    "skin:silver": { head: "u:h", ear: "#94a3b8", defs: u => lg(u, "h", [[0, "#ffffff"], [.45, "#cbd5e1"], [.7, "#94a3b8"], [1, "#e2e8f0"]]), top: shine, bg: "radial-gradient(circle at 35% 30%,#f1f5f9,#94a3b8 55%,#475569)" },
    "skin:camo": { head: "#6b8e23", ear: "#556b2f", eye: "#bef264", top: u => `<g clip-path="url(#${u}c)" opacity=".9"><ellipse cx="18" cy="22" rx="7" ry="4" fill="#3f5216"/><ellipse cx="44" cy="19" rx="8" ry="4" fill="#8f9b4a"/><ellipse cx="30" cy="47" rx="9" ry="4" fill="#3f5216"/><ellipse cx="50" cy="44" rx="5" ry="4" fill="#a3a85a"/><ellipse cx="14" cy="44" rx="5" ry="3" fill="#8f9b4a"/></g>`, bg: "radial-gradient(circle at 35% 30%,#a3b35a,#556b2f 60%,#2f3b14)" },
    "skin:candy": { head: "u:h", ear: "#f9a8d4", eye: "#f472b6", defs: u => `<linearGradient id="${u}h" x1="0" y1="0" x2=".35" y2=".35" spreadMethod="repeat"><stop offset="0" stop-color="#fbcfe8"/><stop offset=".5" stop-color="#fbcfe8"/><stop offset=".5" stop-color="#bae6fd"/><stop offset="1" stop-color="#bae6fd"/></linearGradient>`, bg: "radial-gradient(circle at 35% 30%,#fbcfe8,#f472b6 50%,#38bdf8)" },
    "skin:neon": { head: "#0f172a", ear: "#0f172a", scr: "#020617", eye: "#f0abfc", stroke: "#22d3ee", glow: "#22d3ee", bg: "radial-gradient(circle at 35% 30%,#1e293b,#0f172a 60%,#020617)", ring: "#22d3ee" },
    "skin:ice": { head: "u:h", ear: "#7dd3fc", scr: "#0c4a6e", eye: "#e0f2fe", defs: u => lg(u, "h", [[0, "#f0f9ff"], [.6, "#bae6fd"], [1, "#7dd3fc"]]), top: u => `<path d="M17 50l2 6 2-6M27 51l1.5 5 1.5-5M38 51l2 7 2-7M47 50l1.5 4 1.5-4" fill="#e0f2fe" stroke="#7dd3fc" stroke-width=".6"/>${twinkles([[46, 20, 2.2], [18, 46, 1.6]], "#fff")}`, bg: "radial-gradient(circle at 35% 30%,#e0f2fe,#38bdf8 55%,#0369a1)", ring: "#7dd3fc" },
    "skin:ninja": { head: "#111827", ear: "#1f2937", scr: "#030712", eye: "#f8fafc", top: () => `<rect x="11" y="18" width="42" height="5" fill="#dc2626"/><path class="rtail" d="M53 20q8 -2 10 4M53 21q6 3 7 9" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>`, bg: "radial-gradient(circle at 35% 30%,#4b5563,#111827 60%,#000)", ring: "#dc2626" },
    "skin:lava": { head: "#1c1917", ear: "#292524", scr: "#0c0a09", eye: "#fb923c", top: u => `<g clip-path="url(#${u}c)"><path class="rlava" d="M13 26l6 3-2 5 5 4M50 22l-5 4 2 4-4 3M24 48l4-4 5 2 4-3" stroke="#f97316" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`, bg: "radial-gradient(circle at 35% 30%,#f97316,#7c2d12 55%,#1c1917)", ring: "#f97316" },
    "skin:galaxy": { head: "u:h", ear: "#4c1d95", scr: "#0f0a2e", eye: "#f0abfc", defs: u => lg(u, "h", [[0, "#1e1b4b"], [.55, "#6d28d9"], [1, "#db2777"]]), top: u => `<g clip-path="url(#${u}c)">${[[16, 19], [47, 22], [21, 47], [44, 47], [33, 17], [50, 40]].map(([x, y], i) => `<circle class="rtw" style="animation-delay:${i * .4}s" cx="${x}" cy="${y}" r=".9" fill="#fff"/>`).join("")}</g>`, bg: "radial-gradient(circle at 35% 30%,#7c3aed,#312e81 55%,#0f0a2e)", ring: "#c084fc" },
    "skin:space": { head: "#f8fafc", ear: "#cbd5e1", scr: "#0b1026", eye: "#7dd3fc", top: () => `<rect x="44" y="40" width="6" height="4" rx=".8" fill="#2563eb"/><rect x="44" y="40" width="3" height="4" fill="#fff" opacity=".8"/>${[[20, 24], [44, 25], [33, 41]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" fill="#fff" opacity=".8"/>`).join("")}`,
      over: () => `<circle cx="32" cy="32" r="28.5" fill="rgba(186,230,253,.14)" stroke="#e2e8f0" stroke-width="2.4"/><path d="M14 22a21 21 0 0 1 14-11" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/><circle class="rorb" cx="32" cy="32" r="2.4" fill="#fbbf24"/>`, bg: "radial-gradient(circle at 30% 25%,#1e3a8a,#0b1026 60%,#000)", ring: "#93c5fd" },
    "skin:fire": { head: "u:h", ear: "#ea580c", scr: "#431407", eye: "#fff7ed", defs: u => lg(u, "h", [[0, "#fde047"], [.5, "#f97316"], [1, "#dc2626"]], 0, 1), under: () => `<g class="rflame"><path d="M14 22q-6-10 2-18 0 7 5 9-2-8 6-13 0 8 6 11 3-6 9-7-3 6 0 11 4-2 6-7 4 8-1 15z" fill="#f97316"/><path d="M20 20q-2-7 3-11 0 5 4 6 0-5 5-8 0 6 4 8 2-3 5-4-1 5 1 8z" fill="#fde047"/></g>`, bg: "radial-gradient(circle at 35% 30%,#fde047,#f97316 50%,#b91c1c)", ring: "#f97316" },
    "skin:rainbow": { head: "u:h", ear: "#a78bfa", eye: "#fff", scr: "#1e1b4b", defs: u => lg(u, "h", [[0, "#f87171"], [.2, "#fbbf24"], [.4, "#a3e635"], [.6, "#22d3ee"], [.8, "#818cf8"], [1, "#f472b6"]], 1, 0), cls: "rrain", bg: "conic-gradient(from 0deg,#f87171,#fbbf24,#a3e635,#22d3ee,#818cf8,#f472b6,#f87171)", ring: "#f472b6" },
    "skin:knight": { head: "u:h", ear: "#64748b", scr: "#0f172a", eye: "#e2e8f0", defs: u => lg(u, "h", [[0, "#f8fafc"], [.4, "#94a3b8"], [.75, "#e2e8f0"], [1, "#64748b"]]), top: u => shine(u) + `<path d="M17 28h30M17 32h30" stroke="#94a3b8" stroke-width="1.6"/>`, under: () => `<path class="rplume" d="M32 16q-2-10 8-14-4 6 2 8-6 2-10 6z" fill="#dc2626"/>`, bg: "radial-gradient(circle at 35% 30%,#f1f5f9,#64748b 55%,#1e293b)", ring: "#cbd5e1" },
    "skin:holo": { head: "rgba(34,211,238,.28)", ear: "rgba(34,211,238,.35)", scr: "rgba(8,47,73,.6)", eye: "#a5f3fc", stroke: "#67e8f9", glow: "#22d3ee", cls: "rholo", top: u => `<g clip-path="url(#${u}c)" opacity=".5">${Array.from({ length: 12 }, (_, i) => `<rect x="11" y="${15 + i * 3}" width="42" height=".8" fill="#a5f3fc"/>`).join("")}</g>`, bg: "radial-gradient(circle at 35% 30%,#67e8f9,#0e7490 55%,#083344)", ring: "#67e8f9" },
    "skin:diamond": { head: "u:h", ear: "u:e", scr: "#0c1a3a", eye: "#e0f2fe", defs: u => lg(u, "h", [[0, "#ffffff"], [.3, "#a5f3fc"], [.55, "#e0e7ff"], [.75, "#c4b5fd"], [1, "#e0f2fe"]]) + lg(u, "e", [[0, "#e0f2fe"], [1, "#a5b4fc"]]),
      top: u => `<g clip-path="url(#${u}c)" opacity=".55"><path d="M11 15l14 14-14 8M53 15l-14 14 14 8M25 29h14M25 29l7 22 7-22" stroke="#fff" stroke-width=".8" fill="none"/></g>` + shine(u) + twinkles([[15, 17, 3], [50, 19, 2.4], [48, 48, 3], [13, 46, 2]], "#fff"), cls: "rdia", bg: "radial-gradient(circle at 35% 30%,#ffffff,#a5f3fc 40%,#818cf8 75%,#1e1b4b)", ring: "#a5f3fc" },
    "skin:cookie": { head: "#d6a46a", ear: "#b07d43", eye: "#fde68a", top: u => `<g clip-path="url(#${u}c)">${[[16, 19], [44, 18], [14, 46], [49, 45], [30, 48], [24, 17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.8" fill="#4a2c12"/>`).join("")}</g>`, bg: "radial-gradient(circle at 35% 30%,#f5d0a0,#b07d43 60%,#5c3a17)" },
    "skin:panda": { head: "#ffffff", ear: "#111827", scr: "#111827", eye: "#ffffff", top: u => `<g clip-path="url(#${u}c)"><ellipse cx="13" cy="18" rx="7" ry="6" fill="#111827"/><ellipse cx="51" cy="18" rx="7" ry="6" fill="#111827"/></g>`, bg: "radial-gradient(circle at 35% 30%,#ffffff,#d1d5db 55%,#111827)" },
    "skin:melon": { head: "#22c55e", ear: "#15803d", scr: "#fb7185", eye: "#1f2937", stroke: "#15803d", top: u => `<g clip-path="url(#${u}c)" opacity=".5"><path d="M11 22h42M11 30h42M11 38h42M11 46h42" stroke="#86efac" stroke-width="1.6"/></g>`, bg: "radial-gradient(circle at 35% 30%,#fda4af,#22c55e 55%,#14532d)" },
    "skin:pixel": { head: "#60a5fa", ear: "#2563eb", scr: "#0f172a", eye: "#facc15", top: u => `<g clip-path="url(#${u}c)" shape-rendering="crispEdges">${Array.from({ length: 30 }, (_, i) => { const x = 11 + (i % 6) * 7, y = 15 + Math.floor(i / 6) * 7; return (i * 7) % 3 === 0 ? `<rect x="${x}" y="${y}" width="7" height="7" fill="#93c5fd"/>` : ""; }).join("")}</g>`, cls: "rpix", bg: "radial-gradient(circle at 35% 30%,#93c5fd,#2563eb 55%,#1e3a8a)" },
    "skin:tiger": { head: "#fb923c", ear: "#ea580c", eye: "#fef08a", top: u => `<g clip-path="url(#${u}c)"><path d="M11 20l8 3-8 3M53 20l-8 3 8 3M11 42l7 2-7 3M53 42l-7 2 7 3M28 15l4 4 4-4" stroke="#1c1917" stroke-width="2.2" fill="none" stroke-linejoin="round"/></g>`, bg: "radial-gradient(circle at 35% 30%,#fed7aa,#f97316 55%,#7c2d12)" },
    "skin:sakura": { head: "#fdf2f8", ear: "#fbcfe8", eye: "#ec4899", top: u => [[16, 20, 0], [47, 18, 40], [14, 46, 80], [49, 46, 120], [32, 48, 20]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="2.6" ry="1.5" fill="#f9a8d4"/><ellipse rx="1.5" ry="2.6" fill="#f472b6" opacity=".8"/></g>`).join(""), bg: "radial-gradient(circle at 35% 30%,#fce7f3,#f472b6 55%,#9d174d)" },
    "skin:ocean": { head: "u:h", ear: "#0284c7", scr: "#082f49", eye: "#7dd3fc", defs: u => lg(u, "h", [[0, "#7dd3fc"], [.5, "#0ea5e9"], [1, "#1e3a8a"]], 0, 1), top: u => `<g clip-path="url(#${u}c)"><g class="rwave"><path d="M5 46q5-4 10 0t10 0 10 0 10 0 10 0 10 0" stroke="#e0f2fe" stroke-width="1.8" fill="none"/><path d="M5 50q5-4 10 0t10 0 10 0 10 0 10 0 10 0" stroke="#bae6fd" stroke-width="1.4" fill="none"/></g></g>`, bg: "radial-gradient(circle at 35% 30%,#7dd3fc,#0369a1 55%,#082f49)" },
    "skin:robocat": { head: "#9ca3af", ear: "#6b7280", eye: "#a3e635", under: () => `<path d="M14 20L16 4 28 16Z" fill="#6b7280"/><path d="M50 20L48 4 36 16Z" fill="#6b7280"/><path d="M17 16L18 8 24 15Z" fill="#f9a8d4"/><path d="M47 16L46 8 40 15Z" fill="#f9a8d4"/>`, top: () => `<path d="M8 36h9M8 40h9M47 36h9M47 40h9" stroke="#374151" stroke-width="1.2"/>`, bg: "radial-gradient(circle at 35% 30%,#d1d5db,#6b7280 55%,#1f2937)" },
    "skin:chrome": { head: "u:h", ear: "u:e", scr: "#020617", eye: "#e0f2fe", defs: u => lg(u, "h", [[0, "#f8fafc"], [.25, "#64748b"], [.45, "#f1f5f9"], [.7, "#334155"], [1, "#cbd5e1"]]) + lg(u, "e", [[0, "#e2e8f0"], [1, "#475569"]]), top: shine, bg: "radial-gradient(circle at 35% 30%,#ffffff,#94a3b8 40%,#1e293b)", ring: "#e2e8f0" },
    "skin:circuit": { head: "#064e3b", ear: "#065f46", scr: "#022c22", eye: "#4ade80", top: u => `<g clip-path="url(#${u}c)"><path class="rcirc" d="M11 22h8v6h6M53 24h-7v8h-5M14 48v-4h9v3M50 48v-5h-8M32 15v4" stroke="#4ade80" stroke-width="1.4" fill="none"/><circle cx="25" cy="28" r="1.4" fill="#4ade80"/><circle cx="41" cy="32" r="1.4" fill="#4ade80"/><circle cx="23" cy="47" r="1.4" fill="#4ade80"/></g>`, bg: "radial-gradient(circle at 35% 30%,#34d399,#065f46 55%,#022c22)", ring: "#4ade80" },
    "skin:zombie": { head: "#86efac", ear: "#4ade80", scr: "#14532d", eye: "#fef08a", top: () => `<path d="M17 17v6M15 19h4M15 21h4M46 46l4-4M46 42l4 4M45 44h6" stroke="#166534" stroke-width="1.3"/><circle cx="48" cy="19" r="2" fill="#4ade80" stroke="#166534" stroke-width=".8"/>`, bg: "radial-gradient(circle at 35% 30%,#bbf7d0,#22c55e 55%,#14532d)" },
    "skin:dragon": { head: "u:h", ear: "#047857", scr: "#052e16", eye: "#fde047", defs: u => lg(u, "h", [[0, "#4ade80"], [.5, "#16a34a"], [1, "#064e3b"]], 0, 1), under: () => `<path d="M16 18Q10 8 14 2Q18 10 22 15Z" fill="#fde68a"/><path d="M48 18Q54 8 50 2Q46 10 42 15Z" fill="#fde68a"/>`, top: u => `<g clip-path="url(#${u}c)" opacity=".55">${[14, 22, 30, 38, 46].map(x => `<path d="M${x} 50q4-5 8 0" stroke="#bbf7d0" stroke-width="1.3" fill="none"/>`).join("")}</g>`, bg: "radial-gradient(circle at 35% 30%,#86efac,#15803d 55%,#022c22)", ring: "#4ade80" },
    "skin:shadow": { head: "#1e1b4b", ear: "#312e81", scr: "#020617", eye: "#c084fc", glow: "#a855f7", stroke: "#7c3aed", top: () => twinkles([[15, 18, 1.8], [48, 46, 2]], "#c084fc"), cls: "rshadow", bg: "radial-gradient(circle at 35% 30%,#7c3aed,#1e1b4b 60%,#000)", ring: "#a855f7" },
    "skin:storm": { head: "u:h", ear: "#1e40af", scr: "#0b1026", eye: "#fde047", defs: u => lg(u, "h", [[0, "#1e3a8a"], [.6, "#3b82f6"], [1, "#facc15"]], 0, 1), top: u => `<g clip-path="url(#${u}c)"><path class="rzap" d="M18 15l-4 9h5l-3 9M46 16l-4 8h5l-3 9" stroke="#fde047" stroke-width="1.8" fill="none"/></g>` + shine(u), glow: "#facc15", bg: "radial-gradient(circle at 35% 30%,#fde047,#2563eb 50%,#0b1026)", ring: "#facc15" },
    "skin:phoenix": { head: "u:h", ear: "u:e", scr: "#3b0a0a", eye: "#fff7ed", defs: u => lg(u, "h", [[0, "#fef08a"], [.4, "#f97316"], [1, "#b91c1c"]], 0, 1) + lg(u, "e", [[0, "#fde047"], [1, "#dc2626"]]),
      under: () => `<g class="rwing"><path d="M8 30Q-10 20-6 2Q2 18 12 22Z" fill="#f97316"/><path d="M8 34Q-12 34-10 18Q0 30 12 28Z" fill="#fde047" opacity=".9"/></g><g class="rwing r"><path d="M56 30Q74 20 70 2Q62 18 52 22Z" fill="#f97316"/><path d="M56 34Q76 34 74 18Q64 30 52 28Z" fill="#fde047" opacity=".9"/></g><g class="rflame"><path d="M22 16q-3-8 3-12 0 5 4 6 0-5 5-8 0 6 4 8 2-4 5-5-1 5 1 11z" fill="#fde047"/></g>`,
      top: u => shine(u) + twinkles([[15, 18, 2.6], [50, 20, 2.2], [48, 47, 2.8]], "#fffbe6"), cls: "rgold", bg: "radial-gradient(circle at 35% 30%,#fef08a,#f97316 45%,#7f1d1d)", ring: "#f97316" },
    // ♾️ האינסוף – רק אחד בכל הישיבה: חור שחור עם דיסקת זהב מסתובבת סביב הראש
    // 👑 האגדה – רק אחד בכל הישיבה: שחור-ארגמן-זהב, קרני שמש מסתובבות, עיני אש, כתר זהב
    "skin:legend": { noAnt: 1, head: "u:h", ear: "u:e", scr: "#0a0000", eye: "#ff3b3b", stroke: "#facc15", glow: "#facc15", bg: "radial-gradient(circle at 50% 40%,#facc15,#7f1d1d 55%,#000)", ring: "#facc15",
      defs: u => `<radialGradient id="${u}h" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#7f1d1d"/><stop offset=".55" stop-color="#1c0a0a"/><stop offset="1" stop-color="#000"/></radialGradient>` + lg(u, "e", [[0, "#fde047"], [1, "#a16207"]]) + lg(u, "g", [[0, "#fff7c2"], [.5, "#facc15"], [1, "#b45309"]], 0, 1),
      under: u => `<g class="rleg">${Array.from({ length: 16 }, (_, i) => `<path d="M32 33L${32 + 31 * Math.cos(i * Math.PI / 8 - .08)} ${33 + 31 * Math.sin(i * Math.PI / 8 - .08)}L${32 + 31 * Math.cos(i * Math.PI / 8 + .08)} ${33 + 31 * Math.sin(i * Math.PI / 8 + .08)}Z" fill="url(#${u}g)" opacity="${i % 2 ? .35 : .7}"/>`).join("")}</g>`,
      top: u => `<g clip-path="url(#${u}c)"><path d="M11 44 Q32 36 53 44 L53 51 L11 51Z" fill="#facc15" opacity=".18"/>${Array.from({ length: 8 }, (_, i) => `<circle class="rtw" style="animation-delay:${(i * .27) % 2}s" cx="${14 + (i * 31) % 36}" cy="${18 + (i * 13) % 28}" r=".8" fill="#fde68a"/>`).join("")}</g>` + shine(u) + `<path d="M26 17.5l2 2.6 4-3.6 4 3.6 2-2.6-.8 4.2H26.8z" fill="url(#${u}g)" stroke="#78350f" stroke-width=".4"/>`,
      over: u => `<path d="M20 9l3.5 4.5L27 6.5l5 6.5 5-6.5 3.5 7 3.5-4.5-1.6 7.5H21.6z" fill="url(#${u}g)" stroke="#78350f" stroke-width=".6" style="filter:drop-shadow(0 0 3px #facc15)"/><circle cx="32" cy="12.5" r="1.5" fill="#ef4444"/>` + twinkles([[4, 18, 2.8], [60, 44, 3], [58, 12, 2.2], [6, 48, 2.4]], "#fde047") },
    "skin:infinity": { head: "u:h", ear: "#1c1917", scr: "#000", eye: "#fde047", stroke: "#fbbf24", glow: "#f59e0b", defs: u => `<radialGradient id="${u}h" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#0c0a09"/><stop offset=".8" stop-color="#4c1d95"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>` + lg(u, "dk", [[0, "#fde047"], [.5, "#f97316"], [1, "#a855f7"]], 1, 0),
      under: u => `<g class="rinf1" style="transform-origin:32px 33px"><ellipse cx="32" cy="33" rx="31" ry="9" fill="none" stroke="url(#${u}dk)" stroke-width="3.2" opacity=".9"/></g>`,
      top: u => `<g clip-path="url(#${u}c)">${Array.from({ length: 12 }, (_, i) => `<circle class="rtw" style="animation-delay:${(i * .19) % 2}s" cx="${13 + (i * 29) % 38}" cy="${17 + (i * 17) % 32}" r=".7" fill="#fde68a"/>`).join("")}</g>` + shine(u),
      over: u => `<g class="rinf2" style="transform-origin:32px 33px"><path d="M2 33a30 9 0 0 0 60 0" fill="none" stroke="url(#${u}dk)" stroke-width="3.2"/></g><text x="32" y="1" font-size="13" font-weight="900" text-anchor="middle" fill="#fde047" style="filter:drop-shadow(0 0 3px #f59e0b)">∞</text>` + twinkles([[4, 20, 2.6], [60, 46, 2.8], [58, 16, 2]], "#fde68a"),
      cls: "rgold", bg: "radial-gradient(circle at 50% 50%,#000 30%,#4c1d95 60%,#f59e0b 85%,#fde047)", ring: "#fbbf24" },
    "skin:crystal": { head: "u:h", ear: "u:e", scr: "#1e1b4b", eye: "#ffffff", defs: u => lg(u, "h", [[0, "#fef9c3"], [.2, "#fbcfe8"], [.4, "#a5f3fc"], [.6, "#c4b5fd"], [.8, "#bbf7d0"], [1, "#fde68a"]]) + lg(u, "e", [[0, "#e0f2fe"], [1, "#f0abfc"]]),
      top: u => `<g clip-path="url(#${u}c)" opacity=".6"><path d="M11 15l12 12-12 10M53 15l-12 12 12 10M23 27h18M23 27l9 24 9-24M32 15v12" stroke="#fff" stroke-width=".9" fill="none"/></g>` + shine(u) + twinkles([[14, 16, 3.2], [51, 18, 2.6], [50, 49, 3.2], [13, 47, 2.4], [32, 12, 2]], "#fff"), cls: "rdia rrain", bg: "conic-gradient(from 0deg,#fde68a,#fbcfe8,#a5f3fc,#c4b5fd,#bbf7d0,#fde68a)", ring: "#f0abfc" },
    // 🦸 גיבורים
    "skin:nova": { head: "u:h", ear: "#6d28d9", scr: "#1e1b4b", eye: "#fde68a", defs: u => lg(u, "h", [[0, "#c4b5fd"], [.5, "#7c3aed"], [1, "#3b0764"]], 0, 1), top: () => `<path d="M32 15l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.6-4.5 2.6 1-5-3.7-3.4 5-.6z" fill="#fde047" transform="translate(0 -3) scale(1)" style="filter:drop-shadow(0 0 2px #fde047)"/>` + twinkles([[15, 46, 2], [49, 45, 2]], "#fde68a"), glow: "#a78bfa", bg: "radial-gradient(circle at 35% 30%,#c4b5fd,#6d28d9 55%,#1e1b4b)", ring: "#c4b5fd" },
    "skin:blaze": { head: "u:h", ear: "#c2410c", scr: "#1c1917", eye: "#fde047", defs: u => lg(u, "h", [[0, "#fdba74"], [.55, "#ea580c"], [1, "#7c2d12"]], 0, 1), top: () => `<path d="M14 25q9-4 18 1 9-5 18-1-1 4-6 5-6 1-12-2-6 3-12 2-5-1-6-5z" fill="#111827"/>`, under: () => `<g class="rflame"><path d="M16 18q-5-9 1-15 0 6 4 7-1-7 5-11 0 7 5 9 2-5 7-6-2 6 0 10 3-2 5-6 4 8-2 13z" fill="#f97316"/><path d="M22 17q-2-6 2-10 0 4 3 5 0-4 4-7 0 5 3 7 2-3 4-4-1 4 1 7z" fill="#fde047"/></g>`, glow: "#f97316", bg: "radial-gradient(circle at 35% 30%,#fdba74,#ea580c 55%,#431407)", ring: "#f97316" },
    "skin:bolthero": { head: "u:h", ear: "#b91c1c", scr: "#1c1917", eye: "#fef08a", defs: u => lg(u, "h", [[0, "#fca5a5"], [.5, "#dc2626"], [1, "#7f1d1d"]], 0, 1), top: () => `<path d="M34 14l-5 8h4l-3 7 7-9h-4l3-6z" fill="#facc15" stroke="#a16207" stroke-width=".6" style="filter:drop-shadow(0 0 2px #facc15)"/><path d="M11 46h42" stroke="#facc15" stroke-width="2.4"/>`, bg: "radial-gradient(circle at 35% 30%,#fde047,#dc2626 50%,#450a0a)", ring: "#facc15" },
    "skin:titan": { head: "u:h", ear: "u:e", scr: "#0b1026", eye: "#7dd3fc", defs: u => lg(u, "h", [[0, "#f1f5f9"], [.35, "#94a3b8"], [.6, "#e2e8f0"], [1, "#334155"]]) + lg(u, "e", [[0, "#cbd5e1"], [1, "#1e3a8a"]]), top: u => shine(u) + `<path d="M11 22h6M47 22h6M11 44h6M47 44h6" stroke="#1e40af" stroke-width="2"/><circle cx="32" cy="48" r="3.2" fill="#7dd3fc" style="filter:drop-shadow(0 0 3px #38bdf8)"/>`, glow: "#38bdf8", bg: "radial-gradient(circle at 35% 30%,#e2e8f0,#3b82f6 50%,#0b1026)", ring: "#7dd3fc" },
    "skin:captain": { head: "u:h", ear: "#c2410c", scr: "#042f2e", eye: "#99f6e4", defs: u => lg(u, "h", [[0, "#5eead4"], [.55, "#0d9488"], [1, "#134e4a"]], 0, 1), top: () => `<circle cx="32" cy="18" r="3.4" fill="#fb923c" stroke="#7c2d12" stroke-width=".7"/><g stroke="#fb923c" stroke-width="1.4">${[0, 45, 90, 135].map(a => `<line x1="${(32 + 2.4 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y1="${(18 + 2.4 * Math.sin(a * Math.PI / 180)).toFixed(1)}" x2="${(32 + 5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y2="${(18 + 5 * Math.sin(a * Math.PI / 180)).toFixed(1)}"/><line x1="${(32 - 2.4 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y1="${(18 - 2.4 * Math.sin(a * Math.PI / 180)).toFixed(1)}" x2="${(32 - 5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y2="${(18 - 5 * Math.sin(a * Math.PI / 180)).toFixed(1)}"/>`).join("")}</g><circle cx="32" cy="18" r="1.3" fill="#134e4a"/>`, bg: "radial-gradient(circle at 35% 30%,#5eead4,#0f766e 55%,#042f2e)", ring: "#fb923c" },
    "skin:frost": { head: "u:h", ear: "#38bdf8", scr: "#082f49", eye: "#e0f2fe", defs: u => lg(u, "h", [[0, "#ffffff"], [.5, "#bae6fd"], [1, "#0284c7"]], 0, 1), under: () => `<path d="M14 18L17 4 22 15 27 1 32 14 37 1 42 15 47 4 50 18Z" fill="#e0f2fe" stroke="#7dd3fc" stroke-width=".8"/>`, top: u => `<path d="M17 50l2 6 2-6M30 51l2 7 2-7M43 50l2 6 2-6" fill="#e0f2fe" stroke="#7dd3fc" stroke-width=".6"/>` + twinkles([[16, 22, 2.2], [48, 24, 2]], "#fff"), glow: "#7dd3fc", bg: "radial-gradient(circle at 35% 30%,#ffffff,#38bdf8 50%,#082f49)", ring: "#bae6fd" },
    "skin:cosmic": { head: "u:h", ear: "u:e", scr: "#020617", eye: "#f0abfc", defs: u => `<radialGradient id="${u}h" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#6366f1"/><stop offset=".45" stop-color="#312e81"/><stop offset=".8" stop-color="#0f0a2e"/><stop offset="1" stop-color="#000"/></radialGradient>` + lg(u, "e", [[0, "#818cf8"], [1, "#1e1b4b"]]),
      top: u => `<g clip-path="url(#${u}c)"><g class="rorbit" style="transform-origin:32px 33px"><ellipse cx="32" cy="33" rx="16" ry="5" fill="none" stroke="#f0abfc" stroke-width=".7" opacity=".7"/><circle cx="48" cy="33" r="1.4" fill="#fde047"/></g>${Array.from({ length: 14 }, (_, i) => `<circle class="rtw" style="animation-delay:${(i * .23) % 2}s" cx="${12 + (i * 37) % 40}" cy="${16 + (i * 23) % 34}" r=".8" fill="#fff"/>`).join("")}</g>` + shine(u), over: () => `<circle class="rpulse" cx="32" cy="32" r="31" fill="none" stroke="#a78bfa" stroke-width="1.6" opacity=".7"/>`, cls: "rshadow", glow: "#a78bfa", bg: "radial-gradient(circle at 35% 30%,#818cf8,#1e1b4b 55%,#000)", ring: "#f0abfc" },
    "skin:gold": { head: "u:h", ear: "u:e", scr: "#3b2300", eye: "#fef08a", defs: u => lg(u, "h", [[0, "#fff7c2"], [.35, "#facc15"], [.65, "#ca8a04"], [1, "#fde68a"]]) + lg(u, "e", [[0, "#fde047"], [1, "#a16207"]]),
      top: u => shine(u) + twinkles([[15, 17, 3], [50, 20, 2.4], [49, 48, 3.2], [13, 45, 2]], "#fffbe6"), cls: "rgold", bg: "radial-gradient(circle at 35% 30%,#fff7c2,#facc15 40%,#ca8a04 75%,#713f12)", ring: "#facc15" },
  };
  // חליפות "פשוטות" מהקטלוג (צבעים + ברק / נצנוצים)
  const genCache = {};
  function genSkin(id) {
    const it = R.ITEMS[id]; if (!it || !it.sk) return null; if (genCache[id]) return genCache[id];
    const [a, b, c] = it.sk;
    return (genCache[id] = { head: "u:h", ear: b, eye: it.e || "#fff", scr: it.s || "#1b1f45", defs: u => lg(u, "h", [[0, a], [.55, b], [1, c]], 0, 1), top: u => (it.shine ? shine(u) : "") + (it.tw ? twinkles([[15, 18, 2.4], [49, 46, 2.6]], "#fff") : "") + (it.mk ? `<text x="32" y="19.6" font-size="5.6" font-weight="900" text-anchor="middle" fill="${it.e || "#fff"}" style="filter:drop-shadow(0 0 1.5px ${b})">${it.mk}</text>` : ""), bg: `radial-gradient(circle at 35% 30%,${a},${b} 55%,${c})`, ring: b });
  }
  // כובעים (מעל הראש, הראש מתחיל ב-y=15)
  const HAT = {
    "hat:cap": () => `<path d="M13 19Q32 0 51 19Z" fill="#ef4444"/><path d="M40 17h20q3 0 3 3H40z" fill="#b91c1c"/><circle cx="32" cy="7.5" r="1.8" fill="#fff"/>`,
    "hat:kippah": () => `<path d="M19 16Q32 5 45 16Z" fill="#1d4ed8"/><path d="M21 14.5Q32 7 43 14.5" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 1.6" fill="none"/><path d="M19 16h26" stroke="#facc15" stroke-width="1.6"/>`,
    "hat:beanie": () => `<path d="M12 20Q32-3 52 20Z" fill="#10b981"/><rect x="11" y="15" width="42" height="6" rx="3" fill="#047857"/><circle cx="32" cy="3" r="4.5" fill="#fff"/>`,
    "hat:party": () => `<g transform="rotate(-12 32 17)"><path d="M22 18L32-8 42 18Z" fill="#a855f7"/><path d="M25 10l12 4M28 2l7 3M23.5 14.5l15 3" stroke="#facc15" stroke-width="2"/><circle cx="32" cy="-9" r="3.5" fill="#f43f5e"/></g>`,
    "hat:grad": () => `<rect x="21" y="10" width="22" height="8" rx="2" fill="#111827"/><path d="M8 10L32 2 56 10 32 18Z" fill="#1f2937"/><path d="M32 10L50 14V24" stroke="#facc15" stroke-width="1.6" fill="none"/><circle cx="50" cy="25" r="2" fill="#facc15"/>`,
    "hat:chef": () => `<rect x="20" y="9" width="24" height="9" rx="2" fill="#fff" stroke="#e5e7eb"/><circle cx="23" cy="6" r="7" fill="#fff"/><circle cx="32" cy="3" r="8" fill="#fff"/><circle cx="41" cy="6" r="7" fill="#fff"/>`,
    "hat:pirate": () => `<path d="M8 17Q32 6 56 17Q48 2 32 0Q16 2 8 17Z" fill="#111827"/><path d="M8 17Q32 10 56 17" stroke="#facc15" stroke-width="1.4" fill="none"/><text x="32" y="12.5" font-size="7" text-anchor="middle">☠️</text>`,
    "hat:propeller": () => `<path d="M14 19Q32 1 50 19Z" fill="#3b82f6"/><path d="M32 19Q32 1 50 19Z" fill="#facc15"/><path d="M14 19Q32 1 32 19Z" fill="#ef4444" opacity=".85"/><rect x="31" y="2" width="2" height="7" fill="#374151"/><g class="rprop"><ellipse cx="25" cy="2" rx="8" ry="1.8" fill="#22c55e"/><ellipse cx="39" cy="2" rx="8" ry="1.8" fill="#f43f5e"/></g>`,
    "hat:viking": () => `<path d="M14 19Q32 0 50 19Z" fill="#9ca3af"/><rect x="13" y="15" width="38" height="4" fill="#6b7280"/><path d="M15 15Q4 12 6 0Q10 10 17 11Z" fill="#fef3c7" stroke="#d6c7a1"/><path d="M49 15Q60 12 58 0Q54 10 47 11Z" fill="#fef3c7" stroke="#d6c7a1"/>`,
    "hat:tophat": () => `<rect x="20" y="-8" width="24" height="23" rx="2" fill="#111827"/><rect x="20" y="9" width="24" height="4" fill="#dc2626"/><ellipse cx="32" cy="16" rx="18" ry="3" fill="#111827"/>`,
    "hat:crown": u => `<defs>${lg(u, "cr", [[0, "#fff7c2"], [.5, "#facc15"], [1, "#ca8a04"]], 0, 1)}</defs><path d="M14 19V5l8 7 10-11 10 11 8-7v14Z" fill="url(#${u}cr)" stroke="#a16207" stroke-width=".8"/><circle cx="32" cy="12" r="2.4" fill="#ef4444"/><circle cx="22" cy="14" r="1.8" fill="#3b82f6"/><circle cx="42" cy="14" r="1.8" fill="#22c55e"/>${twinkles([[49, 4, 2.4]], "#fff")}`,
    "hat:wizard": () => `<path d="M12 19Q32 13 52 19L40 6Q36-6 24-10Q32-2 26 8Z" fill="#4338ca"/><path d="M12 19Q32 13 52 19" stroke="#facc15" stroke-width="2" fill="none"/><text x="34" y="9" font-size="7" fill="#facc15">★</text><text x="26" y="2" font-size="5" fill="#fde68a">✦</text>`,
    "hat:flame": () => `<g class="rflame"><path d="M14 20q-6-12 3-20 0 8 5 10-2-9 7-14 0 9 6 12 3-7 10-8-3 7 0 12 4-2 6-8 5 9-2 16z" fill="#f97316"/><path d="M20 19q-3-8 3-13 0 6 5 7 0-6 6-9 0 7 5 9 3-4 6-5-1 6 1 10z" fill="#fde047"/></g>`,
    "hat:halo": () => `<ellipse class="rhalo" cx="32" cy="3" rx="15" ry="4" fill="none" stroke="#fde047" stroke-width="3"/>`,
    "hat:diamondcrown": u => `<defs>${lg(u, "dc", [[0, "#ffffff"], [.5, "#a5f3fc"], [1, "#a78bfa"]], 0, 1)}</defs><path d="M14 19V5l8 7 10-11 10 11 8-7v14Z" fill="url(#${u}dc)" stroke="#67e8f9" stroke-width=".8"/><path d="M27 12l5-6 5 6-5 5Z" fill="#e0f2fe" stroke="#67e8f9" stroke-width=".6"/>${twinkles([[16, 4, 2.6], [48, 3, 3], [32, -3, 2.2]], "#fff")}`,
    "hat:headphones": () => `<path d="M9 30Q9 6 32 6Q55 6 55 30" stroke="#111827" stroke-width="4" fill="none"/><rect x="4" y="25" width="9" height="15" rx="4" fill="#ef4444"/><rect x="51" y="25" width="9" height="15" rx="4" fill="#ef4444"/>`,
    "hat:kippahblack": () => `<path d="M20 16Q32 6 44 16Z" fill="#111827"/><path d="M22 15Q32 9 42 15" stroke="#374151" stroke-width=".8" fill="none"/>`,
    "hat:beret": () => `<ellipse cx="28" cy="14" rx="18" ry="6" fill="#dc2626" transform="rotate(-10 28 14)"/><rect x="27" y="5" width="2" height="4" fill="#991b1b"/>`,
    "hat:cowboy": () => `<ellipse cx="32" cy="17" rx="29" ry="5" fill="#92400e"/><path d="M19 17Q19 2 26 4Q32 7 38 4Q45 2 45 17Z" fill="#b45309"/><rect x="19" y="12" width="26" height="3" fill="#451a03"/>`,
    "hat:bunny": () => `<g class="rtail"><ellipse cx="23" cy="2" rx="5" ry="15" fill="#f8fafc" transform="rotate(-12 23 2)"/><ellipse cx="23" cy="3" rx="2.5" ry="11" fill="#f9a8d4" transform="rotate(-12 23 3)"/></g><ellipse cx="41" cy="2" rx="5" ry="15" fill="#f8fafc" transform="rotate(14 41 2)"/><ellipse cx="41" cy="3" rx="2.5" ry="11" fill="#f9a8d4" transform="rotate(14 41 3)"/>`,
    "hat:sombrero": () => `<ellipse cx="32" cy="16" rx="33" ry="6" fill="#facc15"/><path d="M22 16Q22 0 32 0Q42 0 42 16Z" fill="#eab308"/><path d="M-1 16Q32 24 65 16" stroke="#dc2626" stroke-width="1.6" fill="none"/><rect x="22" y="11" width="20" height="3" fill="#16a34a"/>`,
    "hat:jester": () => `<path d="M14 18Q10 4 2 2Q12 6 22 16Z" fill="#a855f7"/><path d="M50 18Q54 4 62 2Q52 6 42 16Z" fill="#22c55e"/><path d="M22 17Q30 -4 34 -6Q34 6 42 17Z" fill="#ef4444"/><circle cx="2" cy="2" r="2.4" fill="#facc15"/><circle cx="62" cy="2" r="2.4" fill="#facc15"/><circle cx="34" cy="-6" r="2.4" fill="#facc15"/><rect x="13" y="15" width="38" height="4" rx="2" fill="#facc15"/>`,
    "hat:laurel": () => `<g fill="#16a34a">${[-60, -40, -20, 0, 20, 40, 60].map((a, i) => `<ellipse cx="${(32 + 20 * Math.sin(a * Math.PI / 180)).toFixed(1)}" cy="${(17 - 9 * Math.cos(a * Math.PI / 180)).toFixed(1)}" rx="2.2" ry="4.2" transform="rotate(${a} ${(32 + 20 * Math.sin(a * Math.PI / 180)).toFixed(1)} ${(17 - 9 * Math.cos(a * Math.PI / 180)).toFixed(1)})" fill="${i % 2 ? "#22c55e" : "#15803d"}"/>`).join("")}</g>`,
    "hat:unicorn": u => `<defs>${lg(u, "un", [[0, "#fde68a"], [.5, "#f9a8d4"], [1, "#a5b4fc"]], 0, 1)}</defs><path d="M27 17L33 -9L37 17Z" fill="url(#${u}un)" stroke="#e9d5ff" stroke-width=".6"/><path d="M29 10l7-2M30 4l5-1.5M28 15l8-2" stroke="#fff" stroke-width="1"/>${twinkles([[44, 0, 2.4], [22, 4, 2]], "#fff")}`,
    "hat:stars": () => `<g class="rhalo">${[-50, -25, 0, 25, 50].map((a, i) => `<text x="${(32 + 18 * Math.sin(a * Math.PI / 180)).toFixed(1)}" y="${(12 - 6 * Math.cos(a * Math.PI / 180)).toFixed(1)}" font-size="${i === 2 ? 11 : 8}" text-anchor="middle" fill="#fde047" style="filter:drop-shadow(0 0 2px #facc15)">★</text>`).join("")}</g>`,
    "hat:backcap": () => `<path d="M13 19Q32 0 51 19Z" fill="#2563eb"/><path d="M24 17H4q-3 0-3 3h23z" fill="#1d4ed8"/><circle cx="32" cy="7.5" r="1.8" fill="#fff"/>`,
    "hat:antennas": () => `<line x1="24" y1="16" x2="18" y2="2" stroke="#e8ebff" stroke-width="2.2" stroke-linecap="round"/><line x1="40" y1="16" x2="46" y2="2" stroke="#e8ebff" stroke-width="2.2" stroke-linecap="round"/><circle class="ant" cx="18" cy="2" r="3.2" fill="#7cf5ff"/><circle class="ant" cx="46" cy="2" r="3.2" fill="#7cf5ff"/>`,
    "hat:catears": () => `<path d="M13 20L15 3 28 15Z" fill="#374151"/><path d="M51 20L49 3 36 15Z" fill="#374151"/><path d="M16 15L17 7 23 13Z" fill="#f9a8d4"/><path d="M48 15L47 7 41 13Z" fill="#f9a8d4"/>`,
    "hat:mohawk": () => `<path d="M22 17L24 2 28 12 31 -2 34 12 38 1 41 12 43 4 42 17Z" fill="#ec4899"/><path d="M26 16L28 6 31 13 34 5 37 13 39 8 39 16Z" fill="#a855f7"/>`,
    "hat:tiara": () => `<path d="M18 16Q32 6 46 16" stroke="#fde68a" stroke-width="2.4" fill="none"/><path d="M27 11L32 3 37 11" fill="#fde68a" stroke="#ca8a04" stroke-width=".6"/><circle cx="32" cy="8" r="2" fill="#ec4899"/><circle cx="22" cy="12" r="1.3" fill="#a5f3fc"/><circle cx="42" cy="12" r="1.3" fill="#a5f3fc"/>`,
    "hat:samurai": () => `<path d="M10 20Q12 4 32 3Q52 4 54 20Z" fill="#1f2937"/><path d="M8 20h48v3H8z" fill="#7f1d1d"/><path d="M32 4L22 -8Q30 -2 32 -10Q34 -2 42 -8Z" fill="#facc15"/><circle cx="32" cy="10" r="2.6" fill="#dc2626"/>`,
    "hat:spacehelm": () => `<circle cx="32" cy="32" r="29" fill="rgba(186,230,253,.12)" stroke="#e2e8f0" stroke-width="2.6"/><path d="M14 20a22 22 0 0 1 12-11" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/><rect x="28" y="-1" width="8" height="5" rx="2" fill="#94a3b8"/>`,
    "hat:herohelm": () => `<path d="M12 22Q12 4 32 4Q52 4 52 22L46 18Q32 12 18 18Z" fill="#dc2626"/><path d="M12 14L2 6 6 18Z" fill="#fde047"/><path d="M52 14L62 6 58 18Z" fill="#fde047"/><path d="M28 6L32 1 36 6" fill="#fde047"/>`,
    "hat:streak": u => `<defs>${lg(u, "sc", [[0, "#fde047"], [.6, "#f97316"], [1, "#dc2626"]], 0, 1)}</defs><g class="rflame" opacity=".85"><path d="M16 8q-3-6 1-10 0 4 3 5 0-4 4-7 0 5 3 6" fill="#f97316"/><path d="M48 8q3-6-1-10 0 4-3 5 0-4-4-7 0 5-3 6" fill="#f97316"/></g><path d="M14 19V5l8 7 10-11 10 11 8-7v14Z" fill="url(#${u}sc)" stroke="#b91c1c" stroke-width=".8"/><text x="32" y="16" font-size="8" text-anchor="middle">🔥</text>`,
  };
  // משקפיים (מעל העיניים, זזים יחד איתן)
  const EYES = {
    "eyes:nerd": () => `<circle cx="25" cy="30" r="6.8" fill="rgba(255,255,255,.12)" stroke="#111827" stroke-width="2"/><circle cx="39" cy="30" r="6.8" fill="rgba(255,255,255,.12)" stroke="#111827" stroke-width="2"/><path d="M31.8 30h0.4" stroke="#111827" stroke-width="2"/><path d="M18 29l-5-2M46 29l5-2" stroke="#111827" stroke-width="1.6"/>`,
    "eyes:round": () => `<circle cx="25" cy="30" r="6.4" fill="none" stroke="#d4a017" stroke-width="1.3"/><circle cx="39" cy="30" r="6.4" fill="none" stroke="#d4a017" stroke-width="1.3"/><path d="M31.4 29.5q.6-1 1.2 0" stroke="#d4a017" stroke-width="1.2" fill="none"/>`,
    "eyes:sun": () => `<rect x="16" y="25" width="15" height="10" rx="4" fill="#0b0b12"/><rect x="33" y="25" width="15" height="10" rx="4" fill="#0b0b12"/><path d="M31 28h2" stroke="#0b0b12" stroke-width="2"/><path d="M19 27l4 0M36 27l4 0" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`,
    "eyes:3d": () => `<rect x="15" y="24" width="34" height="12" rx="2" fill="#f8fafc"/><rect x="17" y="26" width="13" height="8" rx="1.5" fill="#ef4444" opacity=".85"/><rect x="34" y="26" width="13" height="8" rx="1.5" fill="#06b6d4" opacity=".85"/>`,
    "eyes:ski": u => `<defs>${lg(u, "sk", [[0, "#fde047"], [.5, "#fb923c"], [1, "#db2777"]])}</defs><rect x="10" y="27" width="44" height="5" fill="#111827"/><rect x="15" y="23.5" width="34" height="13" rx="6.5" fill="url(#${u}sk)" stroke="#111827" stroke-width="1.6"/><path d="M20 27q6-2 10 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>`,
    "eyes:laser": () => `<rect x="15" y="25" width="34" height="10" rx="3" fill="rgba(239,68,68,.85)"/><rect class="rscan" x="15" y="25" width="3" height="10" fill="#fff" opacity=".9"/>`,
    "eyes:monocle": () => `<circle cx="39" cy="30" r="6.6" fill="rgba(255,255,255,.12)" stroke="#d4a017" stroke-width="1.6"/><path d="M45 33q4 6 2 14" stroke="#d4a017" stroke-width=".9" fill="none"/>`,
    "eyes:mask": () => `<path d="M13 26q10-4 19 1 9-5 19-1-1 9-8 9-7 0-11-4-4 4-11 4-7 0-8-9z" fill="#111827"/><ellipse cx="25" cy="30" rx="3.4" ry="2.6" fill="#1b1f45"/><ellipse cx="39" cy="30" rx="3.4" ry="2.6" fill="#1b1f45"/>`,
    "eyes:visor": () => `<rect x="14" y="25" width="36" height="10" rx="5" fill="rgba(74,222,128,.55)" stroke="#16a34a" stroke-width="1.2"/><path d="M18 28h10" stroke="#fff" stroke-width="1.2" opacity=".7"/>`,
    "eyes:goggles": () => `<rect x="10" y="27" width="44" height="5" fill="#78350f"/><circle cx="25" cy="30" r="7" fill="rgba(253,230,138,.35)" stroke="#a16207" stroke-width="2.4"/><circle cx="39" cy="30" r="7" fill="rgba(253,230,138,.35)" stroke="#a16207" stroke-width="2.4"/>`,
    "eyes:goldshades": () => `<path d="M15 26h15l-1 7q-1 3-6 3t-7-3z" fill="#1c1917" stroke="#facc15" stroke-width="1.4"/><path d="M34 26h15l-1 7q-1 3-6 3t-7-3z" fill="#1c1917" stroke="#facc15" stroke-width="1.4"/><path d="M30 27h4" stroke="#facc15" stroke-width="1.4"/>`,
    "eyes:heromask": () => `<path d="M12 26q10-5 20 0 10-5 20 0-1 8-9 9-7 0-11-4-4 4-11 4-8-1-9-9z" fill="#dc2626"/><ellipse cx="24.5" cy="30" rx="3.6" ry="2.4" fill="#fff"/><ellipse cx="39.5" cy="30" rx="3.6" ry="2.4" fill="#fff"/>`,
    "eyes:vr": () => `<rect x="12" y="21" width="40" height="18" rx="6" fill="#e5e7eb" stroke="#9ca3af"/><rect x="15" y="24" width="34" height="12" rx="4" fill="#111827"/><circle class="rtw" cx="44" cy="30" r="1.6" fill="#22d3ee"/><rect x="10" y="27" width="3" height="6" fill="#374151"/><rect x="51" y="27" width="3" height="6" fill="#374151"/>`,
  };
  const EYE_SHAPE = {
    "eyes:sleepy": (x, c) => `<path class="eye" d="M${x - 4} 30q4 3 8 0" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    "eyes:xx": (x) => `<path class="eye" d="M${x - 3.4} 26.6l6.8 6.8M${x + 3.4} 26.6l-6.8 6.8" stroke="#f87171" stroke-width="2.2" stroke-linecap="round"/>`,
    "eyes:galaxy": (x, c, u) => `<circle class="eye" cx="${x}" cy="30" r="4.6" fill="url(#${u}gx)"/><circle class="rtw" cx="${x + 1.4}" cy="28.6" r=".9" fill="#fff"/>`,
    "eyes:dollar": (x) => `<text class="eye" x="${x}" y="34" font-size="11" font-weight="900" text-anchor="middle" fill="#4ade80">$</text>`,
    "eyes:hypno": (x) => `<g class="rspin" style="transform-origin:${x}px 30px"><circle cx="${x}" cy="30" r="4.6" fill="none" stroke="#f0abfc" stroke-width="1.3"/><circle cx="${x}" cy="30" r="2.6" fill="none" stroke="#a855f7" stroke-width="1.3"/><circle cx="${x}" cy="30" r=".9" fill="#f0abfc"/></g>`,
    "eyes:fire": (x) => `<path class="eye rflame" d="M${x} 35q-5-1-4-6 1 2 2 2-1-4 2-7 0 3 2 4 1-2 2-2 1 5-4 9z" fill="#f97316"/><path d="M${x} 35q-2 0-2-3 1 1 2 1 0-2 1-3 1 3-1 5z" fill="#fde047"/>`,
    "eyes:heart": (x, c) => `<path class="eye" d="M${x} 34.5l-4.6-4.6a2.8 2.8 0 0 1 4.6-3.4 2.8 2.8 0 0 1 4.6 3.4Z" fill="#f43f5e"/>`,
    "eyes:star": (x) => `<path class="eye" d="M${x} 24.5l1.7 3.6 3.9.4-2.9 2.6.9 3.9-3.6-2-3.6 2 .9-3.9-2.9-2.6 3.9-.4Z" fill="#facc15"/>`,
    "eyes:rainbow": (x, c, u) => `<ellipse class="eye rrain" cx="${x}" cy="30" rx="4" ry="4.8" fill="url(#${u}rb)"/>`,
  };
  // הילות (מאחורי הרובוט)
  const AURA = {
    "aura:bubbles": () => [[8, 50, 2.6, 0], [56, 46, 2, .7], [12, 30, 1.6, 1.3], [54, 22, 2.2, 1.9], [30, 60, 1.8, .4]].map(([x, y, r, d]) => `<circle class="rbub" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#7dd3fc" stroke-width="1"/>`).join(""),
    "aura:bolts": () => `<path class="rzap" d="M3 20l5 6-3 2 6 8M61 18l-5 7 3 2-6 9" stroke="#facc15" stroke-width="2" fill="none" stroke-linejoin="round"/><path class="rzap" style="animation-delay:.35s" d="M6 44l4 4-2 2 4 6M58 42l-4 5 2 2-4 6" stroke="#fde047" stroke-width="1.6" fill="none"/>`,
    "aura:flames": () => `<g class="rflame">${[[6, 52], [16, 58], [28, 61], [40, 60], [52, 56], [60, 48]].map(([x, y], i) => `<path d="M${x} ${y}q-4-7 0-12q1 4 3 4q0-5 3-8q1 7-2 12z" fill="${i % 2 ? "#fde047" : "#f97316"}"/>`).join("")}</g>`,
    "aura:stars": () => `<g class="rorbit">${[0, 72, 144, 216, 288].map(a => { const r = 31, x = 32 + r * Math.cos(a * Math.PI / 180), y = 32 + r * Math.sin(a * Math.PI / 180); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="7" text-anchor="middle" dominant-baseline="middle" fill="#fde047">★</text>`; }).join("")}</g>`,
    "aura:rays": () => `<g class="rrays" opacity=".75">${Array.from({ length: 12 }, (_, i) => `<path d="M32 32L${(32 + 40 * Math.cos(i * Math.PI / 6 - .1)).toFixed(1)} ${(32 + 40 * Math.sin(i * Math.PI / 6 - .1)).toFixed(1)}L${(32 + 40 * Math.cos(i * Math.PI / 6 + .1)).toFixed(1)} ${(32 + 40 * Math.sin(i * Math.PI / 6 + .1)).toFixed(1)}Z" fill="#fde047"/>`).join("")}</g>`,
    "aura:hearts": () => [[8, 52, 0], [56, 48, .8], [12, 28, 1.6], [54, 22, 2.2]].map(([x, y, d]) => `<text class="rbub" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="7" text-anchor="middle">💖</text>`).join(""),
    "aura:notes": () => [[7, 50, 0, "♪"], [57, 44, .7, "♫"], [10, 26, 1.4, "♫"], [55, 20, 2.1, "♪"]].map(([x, y, d, t]) => `<text class="rbub" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="9" font-weight="900" text-anchor="middle" fill="#a78bfa">${t}</text>`).join(""),
    "aura:snow": () => [[6, 4, 0], [20, 0, 1], [44, 2, .5], [58, 6, 1.5], [32, -2, 2]].map(([x, y, d]) => `<text class="rsnow" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="6" fill="#e0f2fe" text-anchor="middle">❄</text>`).join(""),
    "aura:petals": () => [[6, 2, 0], [22, -2, .9], [46, 0, .4], [60, 4, 1.4], [34, -4, 1.9]].map(([x, y, d]) => `<ellipse class="rsnow" style="animation-delay:${d}s" cx="${x}" cy="${y}" rx="2.2" ry="1.3" fill="#f9a8d4"/>`).join(""),
    "aura:galaxy": () => `<g class="rorbit">${Array.from({ length: 14 }, (_, i) => { const a = i * 0.9, r = 22 + i * 0.9; return `<circle cx="${(32 + r * Math.cos(a)).toFixed(1)}" cy="${(32 + r * Math.sin(a)).toFixed(1)}" r="${(1.6 - i * 0.06).toFixed(2)}" fill="${i % 3 ? "#c084fc" : "#f0abfc"}"/>`; }).join("")}</g>`,
    "aura:rainbow": () => `<g class="rorbit">${["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].map((c, i) => `<path d="M${(32 + 31 * Math.cos(i * Math.PI / 3)).toFixed(1)} ${(32 + 31 * Math.sin(i * Math.PI / 3)).toFixed(1)}A31 31 0 0 1 ${(32 + 31 * Math.cos((i + 1) * Math.PI / 3)).toFixed(1)} ${(32 + 31 * Math.sin((i + 1) * Math.PI / 3)).toFixed(1)}" stroke="${c}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`).join("")}</g>`,
    "aura:cape": () => `<path class="rcape" d="M10 30Q4 52 12 66Q32 58 52 66Q60 52 54 30Z" fill="#dc2626"/><path d="M12 30Q32 38 52 30" stroke="#991b1b" stroke-width="2" fill="none"/>`,
    "aura:capegold": u => `<defs>${lg(u, "cg", [[0, "#fde047"], [.6, "#ca8a04"], [1, "#713f12"]], 0, 1)}</defs><path class="rcape" d="M10 30Q4 52 12 66Q32 58 52 66Q60 52 54 30Z" fill="url(#${u}cg)"/>${twinkles([[16, 56, 2.2], [46, 58, 2.4]], "#fff")}`,
    "aura:streak": u => `<defs><radialGradient id="${u}st"><stop offset=".6" stop-color="#f97316" stop-opacity="0"/><stop offset=".85" stop-color="#f97316" stop-opacity=".7"/><stop offset="1" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs><circle class="rpulse" cx="32" cy="32" r="34" fill="url(#${u}st)"/><g class="rorbit">${[0, 90, 180, 270].map(a => `<text x="${(32 + 31 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y="${(32 + 31 * Math.sin(a * Math.PI / 180)).toFixed(1)}" font-size="8" text-anchor="middle" dominant-baseline="middle">🔥</text>`).join("")}</g>`,
  };
  // 🎉 בחגים הרובוט מחזיק משהו של החג (לא משנה את מה שבחרת – רק בזמן החג)
  const HOLI = { rosh: "🍎", sukkot: "🍋", simchat: "📜", hanukkah: "🍩", tubishvat: "🌱", purim: "🎭", pesach: "🍷", atzmaut: "🇮🇱", lagbaomer: "🔥", yerushalayim: "✨", shavuot: "🧀" };
  function holiday() { try { const H = window.Holidays && Holidays.current && Holidays.current(); return H && H.now ? H.now : null; } catch (e) { return null; } }

  let uid = 0;
  // eq: מה לבוש (ברירת מחדל: מה שבחרת). opt.still = בלי אנימציות (תצוגות קטנות), opt.noHoli = בלי תוספת חג
  function svg(cls = "", eq = null, opt = {}) {
    const E = Object.assign({}, eq || S.eq), u = "rb" + (++uid) + "_", sk = SK[E.skin] || genSkin(E.skin) || SK["skin:classic"];
    const hol = !opt.noHoli && !eq ? holiday() : null;
    let heldEm = E.held && R.ITEMS[E.held] ? R.ITEMS[E.held].em : "";
    if (hol && hol.type === "sad") delete E.aura; else if (hol && HOLI[hol.key]) heldEm = HOLI[hol.key];
    const col = v => (v && v.startsWith("u:") ? `url(#${u}${v.slice(2)})` : v);
    const head = col(sk.head || "#f2f4ff"), ear = col(sk.ear || "#dfe4ff"), scr = sk.scr || "#1b1f45", eye = sk.eye || "#7cf5ff";
    const strokeA = sk.stroke ? ` stroke="${sk.stroke}" stroke-width="1.6"` : "";
    const glow = sk.glow ? ` style="filter:drop-shadow(0 0 3px ${sk.glow})"` : "";
    const eyeSh = EYE_SHAPE[E.eyes];
    const eyesHtml = E.eyes === "eyes:wink" ? `<ellipse class="eye" cx="25" cy="30" rx="3.8" ry="4.6" fill="${eye}"/><circle cx="26.3" cy="28.3" r="1.2" fill="#fff"/><path d="M35 31q4-4 8 0" stroke="${eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : E.eyes === "eyes:cyclops" ? `<ellipse class="eye" cx="32" cy="31" rx="8" ry="8" fill="#fff"/><circle cx="32" cy="31" r="4.4" fill="${eye}"/><circle cx="32" cy="31" r="2" fill="#0b0b12"/><circle cx="34" cy="29" r="1.2" fill="#fff"/>` : eyeSh ? eyeSh(25, eye, u) + eyeSh(39, eye, u) : `<ellipse class="eye" cx="25" cy="30" rx="3.8" ry="4.6" fill="${eye}"/><ellipse class="eye" cx="39" cy="30" rx="3.8" ry="4.6" fill="${eye}"/><circle cx="26.3" cy="28.3" r="1.2" fill="#fff"/><circle cx="40.3" cy="28.3" r="1.2" fill="#fff"/>`;
    const defs = (sk.defs ? sk.defs(u) : "") + `<clipPath id="${u}c"><rect x="11" y="15" width="42" height="36" rx="14"/></clipPath>` + (E.eyes === "eyes:rainbow" ? lg(u, "rb", [[0, "#f87171"], [.33, "#facc15"], [.66, "#22d3ee"], [1, "#a855f7"]], 0, 1) : "") + (E.eyes === "eyes:galaxy" ? `<radialGradient id="${u}gx"><stop offset="0" stop-color="#f0abfc"/><stop offset=".6" stop-color="#7c3aed"/><stop offset="1" stop-color="#1e1b4b"/></radialGradient>` : "");
    const hatIt = R.ITEMS[E.hat], hat = HAT[E.hat] ? HAT[E.hat](u) : hatIt && hatIt.em ? `<text x="32" y="${hatIt.em.length > 3 ? 12 : 13}" font-size="${hatIt.em.length > 3 ? 9 : 15}" text-anchor="middle">${hatIt.em}</text>` : "";
    return `<svg class="abot ${cls}${opt.still ? " still" : ""}${sk.cls ? " " + sk.cls : ""}" viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>
${E.aura && AURA[E.aura] ? `<g class="raura">${AURA[E.aura](u)}</g>` : E.aura && R.ITEMS[E.aura] && R.ITEMS[E.aura].fl ? `<g class="raura">${[[7, 52, 0], [57, 46, .8], [11, 26, 1.6], [55, 20, 2.3]].map(([x, y, d], i) => `<text class="rbub" style="animation-delay:${d}s" x="${x}" y="${y}" font-size="8" text-anchor="middle">${R.ITEMS[E.aura].fl[i % R.ITEMS[E.aura].fl.length]}</text>`).join("")}</g>` : ""}<g class="body">
${hat || sk.noAnt ? "" : `<line x1="32" y1="9" x2="32" y2="16" stroke="${sk.stroke || "#e8ebff"}" stroke-width="2.5" stroke-linecap="round"/><circle class="ant" cx="32" cy="7.5" r="3.6" fill="${sk.stroke || "#7cf5ff"}"/>`}
${sk.under ? sk.under(u) : ""}
<rect class="ear l" x="6.5" y="27" width="6" height="12" rx="3" fill="${ear}"${strokeA}/><rect class="ear r" x="51.5" y="27" width="6" height="12" rx="3" fill="${ear}"${strokeA}/>
<rect x="11" y="15" width="42" height="36" rx="14" fill="${head}"${strokeA}${glow}/>${sk.top ? sk.top(u) : ""}<rect x="15.5" y="20" width="33" height="24" rx="9" fill="${scr}"/>
<g class="look"><g class="eyes">${eyesHtml}</g>${EYES[E.eyes] ? EYES[E.eyes](u) : ""}</g>
<path class="ms" d="M27 37.5 Q32 41.5 37 37.5" fill="none" stroke="${eye}" stroke-width="2.2" stroke-linecap="round"/><ellipse class="mo" cx="32" cy="38.5" rx="3" ry="2" fill="${eye}"/>
<circle cx="19.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/><circle cx="44.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/>
${hat}${sk.over ? sk.over(u) : ""}${(eq ? opt.shiny : S.shiny && Object.values(E).some(id => S.shiny[id])) ? `<g class="rshiny">${twinkles([[8, 14, 3], [56, 12, 2.6], [58, 44, 3], [6, 46, 2.4], [32, 4, 2.2]], "#fde047", "rtw")}</g>` : ""}${heldEm ? `<text class="rheld" x="55" y="56" font-size="15" text-anchor="middle">${heldEm}</text>` : ""}</g></svg>`;
  }
  // תצוגה של אביזר אחד (בכרטיס): הרובוט שלך + האביזר
  function preview(id, still = true) {
    const it = R.ITEMS[id];
    if (it.cat === "theme" || it.cat === "page") return `<div class="rv-sw" style="background:${it.grad}"><span>${it.cat === "page" ? pageIcon(it.pg) : "🎨"}</span></div>`;
    if (it.cat === "trail") return `<div class="rv-sw rv-trail" style="background:radial-gradient(circle,#3b1d7a,#1a1040)">${it.em.map((e, i) => `<span style="animation-delay:${i * .25}s">${e}</span>`).join("")}</div>`;
    if (it.cat === "quote") return `<div class="rv-q"><div class="rv-qb">${esc(it.n)}</div><div style="width:46%;margin:2px auto 0">${svg("", S.eq, { still, noHoli: true })}</div></div>`;
    const eq = Object.assign({}, S.eq, { [it.cat]: id }); return svg("", eq, { still, noHoli: true, shiny: !!(S.shiny && S.shiny[id]) });
  }
  const pageIcon = pg => ({ calc: "🧮", cards: "🃏", absences: "📊", phones: "📞", index: "🏠" }[pg] || "📄");

  // הבועה של העוזר בצבע החליפה
  function applyBubble() {
    const b = document.getElementById("asstBtn"); if (!b) return;
    const sk = SK[S.eq.skin] || {}; b.style.setProperty("--robo-bg", sk.bg || DEF_BG); b.style.setProperty("--robo-ring", sk.ring || "rgba(162,89,255,.55)");
    const best = R.ITEMS[S.eq.skin]; b.classList.toggle("robo-rare", !!best && R.RAR[best.r].o >= 5);
  }

  // =============== עיצוב ===============
  const CSS = `
.abot .rshine{animation:rShine 3.2s ease-in-out infinite}@keyframes rShine{0%,55%{transform:skewX(-20deg) translateX(0)}100%{transform:skewX(-20deg) translateX(110px)}}
.abot .rtw{transform-box:fill-box;transform-origin:center;animation:rTw 1.8s ease-in-out infinite}@keyframes rTw{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
.abot .rflame{transform-box:fill-box;transform-origin:50% 100%;animation:rFl .5s ease-in-out infinite alternate}@keyframes rFl{to{transform:scaleY(1.12) skewX(3deg)}}
.abot .rprop{transform-box:fill-box;transform-origin:center;animation:rProp .35s linear infinite}@keyframes rProp{50%{transform:scaleX(.1)}}
.abot .rhalo{animation:rHalo 2.4s ease-in-out infinite;filter:drop-shadow(0 0 3px #fde047)}@keyframes rHalo{50%{transform:translateY(-2px)}}
.abot .rscan{animation:rScan 1.4s ease-in-out infinite alternate}@keyframes rScan{to{transform:translateX(31px)}}
.abot .rbub{animation:rBub 3s ease-in infinite}@keyframes rBub{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-26px);opacity:0}}
.abot .rzap{animation:rZap 1.1s steps(1) infinite}@keyframes rZap{0%,40%{opacity:1}50%,100%{opacity:0}}
.abot .rorbit{transform-origin:32px 32px;animation:rSpin 7s linear infinite}@keyframes rSpin{to{transform:rotate(360deg)}}
.abot .rrays{transform-origin:32px 32px;animation:rSpin 14s linear infinite}
.abot .rpulse{animation:rPulse 1.6s ease-in-out infinite}@keyframes rPulse{50%{opacity:.5}}
.abot .rorb{transform-origin:32px 32px;animation:rOrb 5s linear infinite}@keyframes rOrb{from{transform:rotate(0) translateX(29px)}to{transform:rotate(360deg) translateX(29px)}}
.abot .rheld{animation:rHeld 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes rHeld{50%{transform:rotate(-10deg) translateY(-1.5px)}}
.abot .rtail{animation:rTail 1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:0 50%}@keyframes rTail{to{transform:rotate(12deg)}}
.abot .rplume{transform-box:fill-box;transform-origin:50% 100%;animation:rTail 1.6s ease-in-out infinite alternate}
.abot .rlava{animation:rLava 1.5s ease-in-out infinite;filter:drop-shadow(0 0 2px #f97316)}@keyframes rLava{50%{stroke:#fde047}}
.abot.rrain .body,.abot .rrain{animation:rHue 4s linear infinite}@keyframes rHue{to{filter:hue-rotate(360deg)}}
.abot.rholo .body{animation:rHolo 3s steps(1) infinite}@keyframes rHolo{0%,92%{opacity:.95}93%{opacity:.4}95%{opacity:.9}97%{opacity:.5}}
.abot.rgold .body{filter:drop-shadow(0 0 4px rgba(250,204,21,.7))}.abot.rdia .body{filter:drop-shadow(0 0 4px rgba(165,243,252,.8))}
.abot .rwave{animation:rWave 2.4s linear infinite}@keyframes rWave{to{transform:translateX(-20px)}}
.abot .rcirc{stroke-dasharray:4 3;animation:rCirc 1.2s linear infinite}@keyframes rCirc{to{stroke-dashoffset:-14}}
.abot .rwing{transform-box:fill-box;transform-origin:100% 80%;animation:rWing .7s ease-in-out infinite alternate}.abot .rwing.r{transform-origin:0 80%;animation-direction:alternate-reverse}@keyframes rWing{to{transform:rotate(-14deg)}}
.abot .rsnow{animation:rSnow 3.2s linear infinite}@keyframes rSnow{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(62px) translateX(4px);opacity:0}}
.abot .rspin{animation:rSpin 1.6s linear infinite}
.abot.rshadow .body{filter:drop-shadow(0 0 5px #a855f7)}.abot.rpix{image-rendering:pixelated}
.abot .rleg{transform-origin:32px 33px;animation:rLeg 9s linear infinite}@keyframes rLeg{to{transform:rotate(360deg)}}.abot.still .rleg{animation:none}
.abot .rinf1,.abot .rinf2{animation:rInf 3s linear infinite}@keyframes rInf{0%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}100%{transform:rotate(-8deg)}}
.abot .rcape{transform-box:fill-box;transform-origin:50% 0;animation:rCape 1.6s ease-in-out infinite alternate}@keyframes rCape{to{transform:skewX(4deg) scaleY(1.04)}}
.abot.still *,.abot.still{animation:none!important}
.rv-trail{font-size:20px;gap:2px;flex-wrap:wrap}.rv-trail span{animation:rTw 1.6s ease-in-out infinite}
.rv-q{width:100%;display:flex;flex-direction:column;align-items:center}.rv-qb{background:#fff;color:#1a1040;border-radius:10px;padding:4px 6px;font-size:10px;font-weight:900;line-height:1.2;position:relative;max-width:96%}
.rv-qb::after{content:"";position:absolute;bottom:-5px;left:50%;margin-left:-5px;border:5px solid transparent;border-top-color:#fff;border-bottom:0}
.robo-trail{position:fixed;z-index:8999;pointer-events:none;font-size:18px;animation:rTrail .9s ease-out forwards}@keyframes rTrail{to{transform:translate(var(--tx),var(--ty)) scale(.3) rotate(var(--tr));opacity:0}}
.robo-say{position:fixed;z-index:9100;background:#fff;color:#1a1040;border-radius:16px;padding:8px 12px;font-size:15px;font-weight:900;box-shadow:0 10px 26px rgba(0,0,0,.3);pointer-events:none;animation:rSay 2.4s cubic-bezier(.2,1.5,.4,1) forwards;direction:rtl;white-space:nowrap}
@keyframes rSay{0%{transform:scale(.3) translateY(10px);opacity:0}12%{transform:scale(1.08);opacity:1}20%{transform:scale(1)}85%{opacity:1}100%{opacity:0;transform:translateY(-12px)}}
.ro-mute,.rw-mute{position:absolute;z-index:3;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:99px;font-size:16px;cursor:pointer;width:36px;height:36px}
.ro-mute{top:calc(16px + env(safe-area-inset-top));left:84px}.rw-mute{top:calc(10px + env(safe-area-inset-top));left:52px}
.abot{overflow:visible}
#roboBtn{position:relative;white-space:nowrap}
#roboBtn .rb-badge{display:inline-block;min-width:18px;height:18px;line-height:18px;border-radius:9px;background:#f43f5e;color:#fff;font-size:11px;font-weight:900;margin-inline-start:4px;text-align:center;vertical-align:1px}
#roboBtn.rb-glow{animation:rbGlow 1.8s ease-in-out infinite}@keyframes rbGlow{50%{box-shadow:0 0 0 3px rgba(250,204,21,.5)}}
.pf-sec.pf-robo{background:linear-gradient(135deg,#1a1040 0%,#3b1d7a 60%,#6d28d9 100%)!important;color:#fff!important;border-color:#7c3aed!important;box-shadow:0 8px 24px rgba(91,33,182,.35)}
.pf-sec.pf-robo summary,.pf-sec.pf-robo summary em{color:#fff!important}.pf-sec.pf-robo .ghost{background:rgba(255,255,255,.14)!important;color:#fff!important}
#asstBtn{background:var(--robo-bg,radial-gradient(circle at 35% 30%,#8f9bff,#5b6cff 45%,#a259ff 80%,#ff6bd6))!important}#asstBtn::after{border-color:var(--robo-ring,rgba(162,89,255,.55))!important}
#asstBtn.robo-rare::before{content:"";position:absolute;inset:-6px;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--robo-ring) 20%,transparent 40%);animation:rSpinB 2.4s linear infinite;z-index:-1;opacity:.9;-webkit-mask:radial-gradient(circle,transparent 60%,#000 62%);mask:radial-gradient(circle,transparent 60%,#000 62%)}
@keyframes rSpinB{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.abot *{animation:none!important}}

dialog.robo{padding:0;border:0;width:100%;max-width:560px;height:100%;max-height:100%;margin:0 auto;background:#0b0820;color:#fff;overflow:hidden;font-family:inherit;direction:rtl}
dialog.robo::backdrop{background:rgba(5,3,20,.85)}
dialog.robo[open]{animation:rIn .35s cubic-bezier(.2,1.2,.4,1)}@keyframes rIn{from{transform:translateY(40px);opacity:0}}
.rw{display:flex;flex-direction:column;height:100%}
.rw-top{position:relative;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:radial-gradient(120% 90% at 50% 10%,var(--rc,#5b6cff) 0%,#1a1040 55%,#0b0820 100%);text-align:center;overflow:hidden}
.rw-top::before{content:"";position:absolute;inset:-50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.07) 0 10deg,transparent 10deg 20deg);animation:rSpinB 30s linear infinite}
.rw-x{position:absolute;top:calc(10px + env(safe-area-inset-top));left:10px;z-index:2;border:0;background:rgba(255,255,255,.15);color:#fff;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer}
.rw-bot{position:relative;width:150px;height:150px;margin:2px auto 0;filter:drop-shadow(0 14px 22px rgba(0,0,0,.45))}
.rw-bot .abot{animation:rFloat 3s ease-in-out infinite}@keyframes rFloat{50%{transform:translateY(-6px)}}
.rw-bot.hop .abot{animation:rHop .6s cubic-bezier(.2,1.6,.4,1)}@keyframes rHop{40%{transform:translateY(-22px) rotate(8deg) scale(1.08)}}
.rw-name{position:relative;font-weight:900;font-size:19px;margin-top:2px}
.rw-edit{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:99px;font-size:12px;width:26px;height:26px;cursor:pointer;vertical-align:3px}
.rw-sub{position:relative;font-size:12px;opacity:.8;margin-top:-2px}
.fr-bat{border-radius:18px;padding:12px;margin-bottom:10px;background:linear-gradient(135deg,#1e3a8a,#3b1d7a 50%,#7f1d1d);border:1.5px solid rgba(255,255,255,.15)}
.fr-bat b{display:block;text-align:center;font-size:15px;margin-bottom:6px}.fr-bar{display:flex;height:26px;border-radius:99px;overflow:hidden;font-weight:900;font-size:13px}
.fr-bar span{display:flex;align-items:center;justify-content:center;transition:flex .6s;min-width:54px}.fr-bar .a{background:linear-gradient(90deg,#2563eb,#60a5fa)}.fr-bar .b{background:linear-gradient(90deg,#f87171,#dc2626)}
.fr-bat small{display:block;text-align:center;opacity:.85;font-size:11px;margin-top:6px}
.fr-row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}.fr-row button{border:1.5px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.fr-row button.on{background:#fff;color:#1a1040}
.fr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:9px}
.fc{position:relative;border:0;border-radius:16px;padding:8px 6px;color:#fff;font:inherit;text-align:center;cursor:pointer;background:linear-gradient(170deg,#3b1d7a,#1a1040);border:1.5px solid rgba(255,255,255,.12);animation:fcIn .4s cubic-bezier(.2,1.4,.4,1) both}
@keyframes fcIn{from{transform:scale(.6) translateY(10px);opacity:0}}.fc.me{border-color:#facc15}.fc .pv{width:78px;height:78px;margin:0 auto}.fc .pv .abot{width:100%;height:100%}
.fc .rn{font-weight:900;font-size:13px;margin-top:2px;line-height:1.2}.fc .kid{font-size:11px;opacity:.75}.fc .lk{font-size:11px;font-weight:800;margin-top:3px}
.fc .medal{position:absolute;top:-6px;right:-4px;font-size:20px}
.fr-tog{display:flex;align-items:center;gap:8px;font-size:13px;margin:10px 2px}
dialog.robo.fr .frc{height:100%;overflow-y:auto;padding-bottom:calc(20px + env(safe-area-inset-bottom))}
.frc-top{position:relative;text-align:center;padding:calc(16px + env(safe-area-inset-top)) 14px 14px;background:radial-gradient(120% 90% at 50% 15%,var(--rc,#7c3aed),#1a1040 60%,#0b0820);overflow:hidden}
.frc-top::before{content:"";position:absolute;inset:-50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.08) 0 9deg,transparent 9deg 18deg);animation:rSpinB 24s linear infinite}
.frc-bot{position:relative;width:170px;height:170px;margin:4px auto 0;animation:frIn .9s cubic-bezier(.2,1.3,.4,1) both;filter:drop-shadow(0 14px 22px rgba(0,0,0,.5))}
@keyframes frIn{0%{transform:scale(.2) rotate(-200deg);opacity:0}100%{transform:none;opacity:1}}.frc-bot .abot{animation:rFloat 3s ease-in-out infinite}
.frc-rn{position:relative;font-size:24px;font-weight:900}.frc-kid{position:relative;font-size:13px;opacity:.85}
.frc-st{position:relative;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}.frc-st span{background:rgba(0,0,0,.35);border-radius:99px;padding:5px 11px;font-size:13px;font-weight:800}
.frc-in{padding:12px}.ach{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.ach div{border-radius:14px;padding:10px 6px;text-align:center;background:linear-gradient(160deg,#facc15,#f97316);color:#1a1040;font-weight:900;font-size:12px;animation:achIn .5s cubic-bezier(.2,1.6,.4,1) both;box-shadow:0 4px 0 #9a3412}
.ach div b{display:block;font-size:26px;line-height:1.1}@keyframes achIn{from{transform:scale(0) rotate(-20deg)}}
.frc-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.frc-btns .rbtn{flex:1;min-width:100px}
/* טרייד */
.tr{height:100%;display:flex;flex-direction:column;overflow:hidden}
.tr2{background:linear-gradient(160deg,#1e1b4b,#3b0764 40%,#7f1d1d 100%);background-size:200% 200%;animation:trBg 8s ease-in-out infinite alternate}@keyframes trBg{to{background-position:100% 100%}}
.tr-vs{display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top)) 12px 8px;position:relative}
.vs-side{position:relative;width:38%;text-align:center;border-radius:18px;padding:8px 4px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.12);transition:border-color .3s,box-shadow .3s}
.vs-side.ok{border-color:#22c55e;box-shadow:0 0 22px rgba(34,197,94,.55)}.vs-side i{position:absolute;top:-8px;left:-6px;font-style:normal;font-size:22px;animation:rTierPop .5s}
.vs-side.me{animation:vsL .7s cubic-bezier(.2,1.4,.4,1) both}.vs-side.them{animation:vsR .7s cubic-bezier(.2,1.4,.4,1) both}@keyframes vsL{from{transform:translateX(60px);opacity:0}}@keyframes vsR{from{transform:translateX(-60px);opacity:0}}
.vs-bot{width:84px;height:84px;margin:0 auto}.vs-bot .abot{width:100%;height:100%}.vs-side.them .vs-bot{transform:scaleX(-1)}
.vs-side b{display:block;font-size:14px;font-weight:900}.vs-side small{font-size:11px;opacity:.8}
.vs-mid{position:relative;flex:1;text-align:center}.vs-mid b{font-size:34px;font-weight:900;font-style:italic;background:linear-gradient(180deg,#fde047,#f97316);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px #f97316);animation:rBeat 1.2s ease-in-out infinite;display:inline-block}
.vs-bolt{position:absolute;top:-8px;right:8px;font-size:20px;animation:rZap 1.2s steps(1) infinite}.vs-bolt.b2{top:auto;bottom:-6px;right:auto;left:8px;animation-delay:.6s}
.tr2 .tr-side{background:rgba(0,0,0,.25);border-color:rgba(255,255,255,.14);box-shadow:inset 0 0 20px rgba(0,0,0,.25)}.tr2 .tr-it{box-shadow:0 0 12px var(--c);animation:rTierPop .4s}
.tr2 .tr-foot{background:rgba(0,0,0,.35)}.tr-top{padding:calc(12px + env(safe-area-inset-top)) 14px 8px;text-align:center;background:linear-gradient(135deg,#1e3a8a,#5b21b6)}
.tr-body{flex:1;overflow-y:auto;padding:10px 12px}.tr-side{border-radius:16px;padding:10px;margin-bottom:10px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12)}
.tr-side h4{margin:0 0 6px;font-size:14px;display:flex;justify-content:space-between;align-items:center}.tr-side h4 em{font-style:normal;font-size:12px;opacity:.8}
.tr-items{display:flex;gap:6px;flex-wrap:wrap;min-height:58px}.tr-it{width:62px;border-radius:12px;padding:4px;text-align:center;font-size:10px;font-weight:800;background:var(--c);color:#fff;position:relative}
.tr-it .pv{width:52px;height:52px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:28px}.tr-it .pv .abot,.tr-it .pv .rv-sw{width:100%;height:100%}.tr-it .x{position:absolute;top:-6px;left:-6px;width:20px;height:20px;border-radius:50%;border:0;background:#f43f5e;color:#fff;font-size:11px;cursor:pointer}
.tr-add{width:62px;min-height:62px;border-radius:12px;border:2px dashed rgba(255,255,255,.35);background:none;color:#fff;font-size:26px;cursor:pointer}
.scale{position:relative;height:96px;margin:6px 0}.scale .beam{position:absolute;left:10%;right:10%;top:24px;height:6px;border-radius:3px;background:#facc15;transform-origin:50% 50%;transition:transform .6s cubic-bezier(.2,1.4,.4,1)}
.scale .post{position:absolute;left:50%;top:24px;width:6px;margin-left:-3px;height:64px;background:#a16207;border-radius:3px}.scale .base{position:absolute;left:38%;right:38%;bottom:2px;height:8px;border-radius:4px;background:#a16207}
.scale .pan{position:absolute;top:-6px;width:74px;text-align:center;font-size:12px;font-weight:900}.scale .pan.l{left:-30px}.scale .pan.r{right:-30px}.scale .pan i{display:block;font-style:normal;font-size:22px}
.tr-verd{text-align:center;font-weight:900;font-size:15px;margin-bottom:6px}
.tr-foot{padding:10px 12px calc(12px + env(safe-area-inset-bottom));background:#120c2e;display:flex;gap:8px}.tr-foot .rbtn{flex:1}
.tr-st{text-align:center;font-size:13px;opacity:.85;margin:4px 0}
.tr-count{position:absolute;inset:0;z-index:5;background:rgba(5,2,15,.88);display:flex;flex-direction:column;align-items:center;justify-content:center}
.tr-count b{font-size:120px;font-weight:900;color:#facc15;text-shadow:0 0 30px #f97316;animation:rTierPop .5s cubic-bezier(.2,1.8,.4,1)}
.tr-swap{position:absolute;inset:0;z-index:6;background:radial-gradient(circle,#3b1d7a,#05020f);display:flex;align-items:center;justify-content:center;overflow:hidden}
.tr-swap .s1,.tr-swap .s2{position:absolute;font-size:46px;display:flex;gap:4px}.tr-swap .s1{animation:swapA 1.4s cubic-bezier(.6,-.3,.4,1.3) forwards}.tr-swap .s2{animation:swapB 1.4s cubic-bezier(.6,-.3,.4,1.3) forwards}
@keyframes swapA{0%{transform:translate(110px,-70px) scale(1)}50%{transform:translate(0,0) scale(1.4) rotate(180deg)}100%{transform:translate(-110px,70px) scale(1) rotate(360deg)}}
@keyframes swapB{0%{transform:translate(-110px,70px) scale(1)}50%{transform:translate(0,0) scale(1.4) rotate(-180deg)}100%{transform:translate(110px,-70px) scale(1) rotate(-360deg)}}
.tr-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;max-height:46vh;overflow-y:auto;margin:8px 0}
.tr-pick button{border:2px solid transparent;border-radius:12px;padding:4px;background:var(--c);color:#fff;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.tr-pick button.on{border-color:#fff;box-shadow:0 0 0 2px #facc15}
.tr-pick .pv{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:30px}.tr-pick .pv .abot,.tr-pick .pv .rv-sw{width:100%;height:100%}
/* הכרזת אולטרה */
.ann{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;background:radial-gradient(circle at 50% 40%,#713f12,#1a1040 55%,#05020f);position:relative;overflow:hidden}
.ann::before{content:"";position:absolute;width:200vmax;height:200vmax;background:repeating-conic-gradient(from 0deg,rgba(250,204,21,.18) 0 8deg,transparent 8deg 18deg);animation:rSpinB 16s linear infinite}
.ann>*{position:relative}.ann .t{font-size:30px;font-weight:900;background:linear-gradient(90deg,#fde047,#f472b6,#a5f3fc,#fde047);background-size:300%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rGrad 1.4s linear infinite}
.ann .bot{width:190px;height:190px;animation:frIn 1s cubic-bezier(.2,1.3,.4,1) both}.ann .bot .abot{width:100%;height:100%}.ann .w{font-size:19px;font-weight:900;margin-top:6px}.ann .l{font-size:15px;margin-top:8px;color:#fde68a}display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.rw-chips span{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:5px 11px;font-size:13px;font-weight:800}
.rw-tabs{display:flex;gap:2px;padding:8px 6px;overflow-x:auto;scrollbar-width:none;background:#120c2e;border-bottom:1px solid rgba(255,255,255,.08)}
.rw-tabs button{flex:1 0 auto;border:0;border-radius:12px;padding:9px 5px;font:inherit;font-size:12.5px;white-space:nowrap;font-weight:800;color:#c7c3ff;background:transparent;cursor:pointer;position:relative}
.rw-tabs button.on{background:linear-gradient(135deg,#5b6cff,#a259ff);color:#fff;box-shadow:0 4px 14px rgba(91,108,255,.4)}
.rw-tabs .dot{position:absolute;top:4px;left:8px;min-width:16px;height:16px;border-radius:9px;background:#f43f5e;font-size:11px;line-height:16px;color:#fff}
.rw-body{flex:1;overflow-y:auto;padding:12px 12px calc(20px + env(safe-area-inset-bottom))}
.rw-cats{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}.rw-cats::-webkit-scrollbar{display:none}
.rw-cats button{flex:0 0 auto;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;position:relative}
.rw-cats button.on{background:#fff;color:#1a1040}
.rw-cats button i{position:absolute;top:-3px;left:-3px;width:10px;height:10px;border-radius:50%;background:#f43f5e}
.rw-prog{font-size:12px;color:#c7c3ff;margin:2px 2px 8px}
.rw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:9px}
.rc{position:relative;border-radius:14px;padding:6px 6px 7px;text-align:center;cursor:pointer;border:0;font:inherit;color:#fff;
  background:linear-gradient(170deg,color-mix(in srgb,var(--c) 85%,#fff 15%) 0%,var(--c) 45%,color-mix(in srgb,var(--c) 55%,#000) 100%);box-shadow:0 4px 0 color-mix(in srgb,var(--c) 50%,#000),0 8px 16px rgba(0,0,0,.3);transition:transform .15s}
.rc:active{transform:translateY(3px);box-shadow:0 1px 0 color-mix(in srgb,var(--c) 50%,#000)}
.rc .pv{width:100%;aspect-ratio:1;border-radius:10px;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;overflow:visible}
.rc .pv .abot{width:84%;height:84%}
.rc .nm{font-size:12px;font-weight:900;margin-top:5px;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,.5);min-height:29px;display:flex;align-items:center;justify-content:center}
.rc .rr{font-size:10px;font-weight:800;opacity:.92;text-transform:uppercase}
.rc.lock{--c:#3a3560!important;color:#b8b3e0}.rc.lock .pv{filter:brightness(0) opacity(.35)}.rc.lock .q{position:absolute;inset:6px 6px auto;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:30px;filter:none}
.rc.lock .rr{color:var(--rcol)}
.rc.on{outline:3px solid #fff;outline-offset:2px}.rc.on::after{content:"✓";position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#22c55e;color:#fff;font-size:13px;line-height:22px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.rc .new{position:absolute;top:-7px;left:-5px;background:#f43f5e;color:#fff;font-size:10px;font-weight:900;border-radius:7px;padding:2px 6px;transform:rotate(-8deg);animation:rNew 1s ease-in-out infinite alternate}@keyframes rNew{to{transform:rotate(-8deg) scale(1.12)}}
.rc.leg,.rc.ult{overflow:hidden}.rc.leg::before,.rc.ult::before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);animation:rCardShine 2.6s ease-in-out infinite;pointer-events:none}
.rc.ult{background:linear-gradient(135deg,#fff7c2,#facc15 30%,#f472b6 60%,#a5f3fc 85%,#facc15)}
.rc.shiny{box-shadow:0 0 0 2px #fde047,0 0 16px rgba(253,224,71,.7)!important;overflow:hidden}.rc.shiny::after{content:"✨";position:absolute;top:2px;left:4px;font-size:14px;animation:rBeat 1.2s infinite}
.abot .rshiny{filter:drop-shadow(0 0 2px #fde047)}
.ro.shiny .ro-in{box-shadow:0 0 0 3px #fde047,0 0 40px #fde047!important}.ro-shiny{color:#fde047;text-shadow:0 0 10px #fde047}
.rev{margin:0 0 10px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#6366f1,#a855f7);color:#fff;font-size:13px;font-weight:700;box-shadow:0 6px 18px rgba(99,102,241,.4)}.rev b{display:block;font-size:15px}
.rflash{animation:rFl 1s ease-in-out infinite alternate}@keyframes rFl{to{box-shadow:0 0 0 2px #f43f5e,0 0 22px rgba(244,63,94,.6)}}@keyframes rCardShine{0%,40%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.rv-sw{width:86%;aspect-ratio:1;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
.rw-sec{font-weight:900;font-size:16px;margin:14px 2px 8px;display:flex;align-items:center;gap:8px}.rw-sec small{font-weight:600;color:#c7c3ff;font-size:12px}
.rbx{display:flex;align-items:center;gap:12px;border-radius:18px;padding:12px;margin-bottom:9px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 70%,#000) 0%,#1a1040 100%);border:1.5px solid color-mix(in srgb,var(--c) 70%,#fff 10%)}
.rbx .em{font-size:44px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4));animation:rBob 2s ease-in-out infinite}@keyframes rBob{50%{transform:translateY(-4px) rotate(-4deg)}}
.rbx .t{flex:1}.rbx b{font-size:16px;display:block}.rbx small{font-size:12px;color:#d6d3ff}
.rbtn{border:0;border-radius:14px;padding:11px 16px;font:inherit;font-size:15px;font-weight:900;cursor:pointer;color:#1a1040;background:linear-gradient(180deg,#fef08a,#facc15);box-shadow:0 4px 0 #a16207,0 8px 18px rgba(250,204,21,.3)}
.rbtn:active{transform:translateY(3px);box-shadow:0 1px 0 #a16207}.rbtn.alt{background:linear-gradient(180deg,#a5b4fc,#6366f1);color:#fff;box-shadow:0 4px 0 #3730a3}.rbtn:disabled{filter:grayscale(1);opacity:.6}
.rbtn.sm{padding:7px 11px;font-size:13px}.rlink{border:0;background:none;color:#c7c3ff;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}
.rodds{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}.rodds td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.08)}.rodds td:last-child{text-align:left;font-weight:900}
.rtag{display:inline-block;border-radius:7px;padding:2px 8px;font-size:12px;font-weight:900;color:#fff;background:var(--c);text-shadow:0 1px 2px rgba(0,0,0,.4)}
.rtag.u{background:linear-gradient(90deg,#facc15,#f472b6,#a5f3fc,#facc15);background-size:200%;animation:rGrad 2s linear infinite;color:#1a1040;text-shadow:none}@keyframes rGrad{to{background-position:200% 0}}
.rladder{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:7px}
.rl{border-radius:12px;padding:8px 4px;text-align:center;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);font-size:12px}
.rl b{display:block;font-size:13px}.rl .g{font-size:22px;margin:3px 0}.rl.done{opacity:.45}.rl.today{border-color:#facc15;background:rgba(250,204,21,.15);animation:rGlow 1.4s ease-in-out infinite}.rl.big{border-color:#a855f7}
@keyframes rGlow{50%{box-shadow:0 0 18px rgba(250,204,21,.6)}}
.rtoast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9500;background:linear-gradient(135deg,#1a1040,#3b1d7a);color:#fff;border:1.5px solid #a855f7;border-radius:18px;padding:11px 14px;font-size:14px;font-weight:700;box-shadow:0 14px 34px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center;max-width:92vw;animation:rIn .35s cubic-bezier(.2,1.3,.4,1);direction:rtl}

/* פתיחת תיבה */
dialog.robo.open{background:#05020f}
.ro{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;text-align:center;user-select:none;-webkit-user-select:none}
.ro-rays{position:absolute;width:220vmax;height:220vmax;left:50%;top:45%;margin:-110vmax 0 0 -110vmax;background:repeating-conic-gradient(from 0deg,var(--rc,#38bdf8) 0 8deg,transparent 8deg 20deg);opacity:0;transition:opacity .4s;animation:rSpinB 18s linear infinite;mask:radial-gradient(circle,#000 0,transparent 40%);-webkit-mask:radial-gradient(circle,#000 0,transparent 40%)}
.ro.lit .ro-rays{opacity:.45}
.ro-chest{position:relative;width:230px;max-width:62vw;cursor:pointer;--sz:1;transform:scale(var(--sz));transition:transform .4s cubic-bezier(.2,1.6,.4,1);filter:drop-shadow(0 0 26px var(--rc)) drop-shadow(0 16px 18px rgba(0,0,0,.5))}
.ro-chest .chest{width:100%;display:block;overflow:visible;animation:rBoxIdle 1.6s ease-in-out infinite}
.ro-chest.tap .chest{animation:rTap .3s ease-out}@keyframes rTap{30%{transform:scale(1.12,.86)}65%{transform:scale(.94,1.08)}}
.ro-chest.up .chest{animation:rUp .75s cubic-bezier(.2,1.6,.4,1)}@keyframes rUp{0%{transform:scale(1)}25%{transform:scale(1.4) rotate(-8deg)}55%{transform:scale(1.1) rotate(6deg)}100%{transform:scale(1)}}
.ro-chest .clid{transform-box:fill-box;transform-origin:20% 100%;transition:transform .55s cubic-bezier(.3,1.4,.5,1),opacity .55s}
.ro-chest.open .clid{transform:translate(-30px,-150px) rotate(-35deg);opacity:0}.ro-chest.open .chest{animation:none}
.ro-chest .stop{transition:stop-color .3s}
.ro-beam{position:absolute;left:50%;bottom:42%;width:150px;margin-left:-75px;height:80vh;background:linear-gradient(to top,var(--rc),transparent 85%);opacity:0;filter:blur(6px);transform-origin:50% 100%;transform:scaleY(0)}
.ro.opened .ro-beam{animation:rBeam 1s ease-out forwards}@keyframes rBeam{0%{opacity:0;transform:scaleY(0)}40%{opacity:.95;transform:scaleY(1)}100%{opacity:.6;transform:scaleY(1)}}
.ro-type{font-size:15px;font-weight:800;opacity:.8;margin-bottom:6px}
.ro-tier{margin-top:12px;font-size:22px;font-weight:900;padding:6px 20px;border-radius:99px;background:var(--rc);color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.45);box-shadow:0 0 26px var(--rc);transition:background .3s}
.ro-tier.pop{animation:rTierPop .6s cubic-bezier(.2,1.8,.4,1)}@keyframes rTierPop{0%{transform:scale(.4)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
.ro-up{position:absolute;top:18%;left:0;right:0;font-size:46px;font-weight:900;color:#fff;text-shadow:0 0 24px var(--rc),0 0 8px var(--rc),0 4px 10px #000;animation:rUpTxt 1.1s cubic-bezier(.2,1.4,.4,1) forwards;pointer-events:none}
@keyframes rUpTxt{0%{transform:scale(.3) translateY(30px);opacity:0}30%{transform:scale(1.25);opacity:1}75%{transform:scale(1) translateY(-10px);opacity:1}100%{transform:translateY(-40px);opacity:0}}
.ro-ring{position:absolute;left:50%;top:48%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:6px solid var(--rc);box-shadow:0 0 30px var(--rc);animation:rRing .85s ease-out forwards;pointer-events:none}@keyframes rRing{to{transform:scale(9);opacity:0}}
.ro-go{display:inline-block;font-size:26px;font-weight:900;color:#fff;text-shadow:0 0 18px var(--rc);animation:rGo .7s ease-in-out infinite alternate}@keyframes rGo{to{transform:scale(1.15)}}
.ro-chest.ready .chest{animation:rReady .5s ease-in-out infinite alternate}@keyframes rReady{from{transform:scale(1) rotate(-2deg)}to{transform:scale(1.08) rotate(2deg)}}
.rare-pre .rp-sil{width:190px;height:190px;filter:brightness(0) drop-shadow(0 0 18px var(--rc)) drop-shadow(0 0 40px var(--rc));animation:rpSpin 2.2s ease-in-out infinite}.rare-pre .rp-sil>*{width:100%;height:100%}
@keyframes rpSpin{0%{transform:rotateY(0) scale(1)}50%{transform:rotateY(180deg) scale(1.08)}100%{transform:rotateY(360deg) scale(1)}}
.rare-pre .rp-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,var(--rc),transparent 65%);opacity:.55;animation:rPulse 1s ease-in-out infinite}
.rare-pre .rp-t{font-size:24px;font-weight:900;margin-top:14px;text-shadow:0 0 16px var(--rc);animation:rPulseT 1s ease-in-out infinite}
.rare-pre.burst .rp-sil{animation:rpBurst .5s ease-in forwards}@keyframes rpBurst{to{transform:scale(2.6);opacity:0;filter:brightness(3) drop-shadow(0 0 40px #fff)}}
.ro-main{display:inline-block;font-size:13px;font-weight:900;background:#fff;color:#1a1040;border-radius:99px;padding:3px 12px;margin-bottom:6px}
.ro-box{position:relative;font-size:130px;line-height:1;cursor:pointer;filter:drop-shadow(0 0 30px var(--rc,#38bdf8)) drop-shadow(0 20px 20px rgba(0,0,0,.5));animation:rBoxIdle 1.6s ease-in-out infinite;transition:filter .3s}
@keyframes rBoxIdle{50%{transform:translateY(-10px) rotate(-3deg)}}
.ro-box.shake{animation:rShake .45s cubic-bezier(.36,.07,.19,.97)}@keyframes rShake{10%,90%{transform:translateX(-4px) rotate(-4deg) scale(1.05)}20%,80%{transform:translateX(8px) rotate(6deg) scale(1.1)}30%,50%,70%{transform:translateX(-12px) rotate(-8deg) scale(1.15)}40%,60%{transform:translateX(12px) rotate(8deg) scale(1.15)}}
.ro-box.boom{animation:rBoom .5s ease-in forwards}@keyframes rBoom{40%{transform:scale(1.4)}100%{transform:scale(3);opacity:0}}
.ro-hint{margin-top:22px;font-size:20px;font-weight:900;letter-spacing:.5px;animation:rPulseT 1s ease-in-out infinite}@keyframes rPulseT{50%{opacity:.4;transform:scale(.95)}}
.ro-taps{display:flex;gap:6px;justify-content:center;margin-top:10px}.ro-taps i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.2)}.ro-taps i.on{background:var(--rc);box-shadow:0 0 10px var(--rc)}.ro-taps i{width:14px;height:14px;transition:background .3s}
.ro-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.ro-flash.go{animation:rFlash .6s ease-out}@keyframes rFlash{0%{opacity:.95}100%{opacity:0}}
.ro-card{position:relative;width:min(78vw,300px);perspective:900px;cursor:pointer}
.ro-in{position:relative;border-radius:24px;padding:18px 14px 16px;transform-style:preserve-3d;animation:rFlip .8s cubic-bezier(.2,1.2,.4,1) both;
  background:linear-gradient(170deg,color-mix(in srgb,var(--c) 80%,#fff 20%) 0%,var(--c) 40%,color-mix(in srgb,var(--c) 45%,#000) 100%);box-shadow:0 0 50px color-mix(in srgb,var(--c) 70%,transparent),0 20px 40px rgba(0,0,0,.5);overflow:hidden}
@keyframes rFlip{0%{transform:rotateY(180deg) scale(.4);opacity:0}60%{transform:rotateY(-12deg) scale(1.06);opacity:1}100%{transform:none}}
.ro-in::before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.5) 50%,transparent 65%);animation:rCardShine 2.2s ease-in-out infinite}
.ro-rar{display:inline-block;font-weight:900;font-size:15px;padding:4px 14px;border-radius:99px;background:rgba(0,0,0,.35);letter-spacing:.5px}
.ro-pv{width:170px;height:170px;margin:8px auto 4px;display:flex;align-items:center;justify-content:center}.ro-pv .abot{width:100%;height:100%}.ro-pv .rv-sw{width:140px;font-size:56px}
.ro-big{font-size:96px;line-height:1;margin:16px 0 6px;filter:drop-shadow(0 8px 16px rgba(0,0,0,.4))}
.ro-nm{font-size:24px;font-weight:900;text-shadow:0 2px 6px rgba(0,0,0,.45)}.ro-sub{font-size:14px;opacity:.95;margin-top:4px}
.ro-left{position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px;font-weight:900;font-size:15px;background:rgba(255,255,255,.12);border-radius:99px;padding:6px 12px}
.ro-skip{position:absolute;top:calc(16px + env(safe-area-inset-top));left:16px;border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:99px;padding:7px 14px;font:inherit;font-weight:800;cursor:pointer}
.ro-tap{margin-top:18px;font-size:14px;opacity:.75}
.ro-p{position:absolute;left:50%;top:45%;pointer-events:none;font-size:22px;animation:rP 1.3s cubic-bezier(.1,.7,.3,1) forwards}@keyframes rP{to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(.4);opacity:0}}
.ro.shakeS{animation:rScr .5s}@keyframes rScr{20%{transform:translate(-8px,4px)}40%{transform:translate(8px,-6px)}60%{transform:translate(-6px,-4px)}80%{transform:translate(6px,6px)}}
.ro-ultra{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;z-index:5}
.ro-ultra b{font-size:34px;font-weight:900;background:linear-gradient(90deg,#fde047,#f472b6,#a5f3fc,#fde047);background-size:300%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rGrad 1.2s linear infinite,rBeat .6s ease-in-out infinite}
@keyframes rBeat{50%{transform:scale(1.12)}}
.ro-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(92vw,420px);margin:14px auto}
.ro-sum .rc{cursor:default}
/* רצף יומי */
.rd{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;background:radial-gradient(100% 70% at 50% 25%,#7c2d12 0%,#2a0f2e 55%,#0b0820 100%);position:relative;overflow:hidden}
.rd.brk{background:radial-gradient(100% 70% at 50% 25%,#334155 0%,#1e1b3a 55%,#0b0820 100%)}
.rd-fl{font-size:110px;line-height:1;filter:drop-shadow(0 0 30px #f97316);animation:rFire 1.1s ease-in-out infinite alternate}@keyframes rFire{to{transform:scale(1.08) rotate(3deg);filter:drop-shadow(0 0 50px #facc15)}}
.rd.brk .rd-fl{filter:grayscale(1) drop-shadow(0 0 10px #64748b);animation:rCrack .5s 2}@keyframes rCrack{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
.rd-n{font-size:64px;font-weight:900;line-height:1;margin-top:4px;background:linear-gradient(180deg,#fff7c2,#facc15 50%,#f97316);-webkit-background-clip:text;background-clip:text;color:transparent}
.rd-t{font-size:22px;font-weight:900;margin-top:4px}.rd-s{font-size:14px;color:#e0d9ff;margin-top:6px;line-height:1.5}
.rd-week{display:flex;gap:6px;justify-content:center;margin:20px 0 16px;width:100%;max-width:420px}
.rd-week .rl{flex:1;min-width:0;padding:7px 2px}.rd-week .rl .g{font-size:20px}
.rd-btns{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%;max-width:320px}.rd-btns .rbtn{width:100%;font-size:17px;padding:14px}
`;
  function addCss() { if (document.getElementById("roboCss")) return; const s = document.createElement("style"); s.id = "roboCss"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  addCss();

  // =============== 🔊 צלילים (נוצרים בדפדפן – בלי קבצים) ===============
  // רק בתיבות, בפרסים, במתנת הרצף ובחנות. כפתור 🔊/🔇 משתיק (נשמר). באייפון – מצב שקט של הטלפון משתיק לבד
  const SFX = (() => {
    let ac = null;
    const muted = () => LS.get("roboMute", "") === "1";
    const ctx = () => { if (muted()) return null; try { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; } };
    function tone(f, t, dur, { type = "sine", vol = 0.18, to = 0, at = 0.01 } = {}) {
      const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
      o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(t, dur, { vol = 0.15, from = 400, to = 4000 } = {}) {
      const c = ctx(); if (!c) return; const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + t;
      s.buffer = b; f.type = "bandpass"; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur); f.Q.value = 0.8;
      g.gain.setValueAtTime(vol, t0); s.connect(f).connect(g).connect(c.destination); s.start(t0);
    }
    const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98];
    return {
      muted, toggle() { LS.set("roboMute", muted() ? null : "1"); if (!muted()) this.coin(); return !muted(); },
      tap() { tone(160, 0, 0.14, { type: "sine", vol: 0.3, to: 60 }); noise(0, 0.08, { vol: 0.08, from: 900, to: 300 }); },
      up(lv) { const base = 2 + lv; [0, 2, 4].forEach((k, i) => tone(NOTES[Math.min(8, base + k)] * (lv >= 4 ? 1 : 0.5), i * 0.07, 0.3, { type: "triangle", vol: 0.16 })); noise(0, 0.35, { vol: 0.07, from: 1500, to: 8000 }); if (lv >= 4) tone(110, 0, 0.6, { type: "sawtooth", vol: 0.06 }); },
      open() { noise(0, 0.45, { vol: 0.16, from: 200, to: 6000 }); tone(90, 0.35, 0.6, { type: "sine", vol: 0.4, to: 40 }); [0, 1, 2, 3].forEach(i => tone(NOTES[4 + i], 0.4 + i * 0.05, 0.25, { type: "triangle", vol: 0.08 })); },
      reveal(o) { // o = דרגה 0..6
        if (o <= 1) { tone(NOTES[o ? 4 : 2], 0, 0.3, { type: "triangle", vol: 0.16 }); tone(NOTES[o ? 6 : 4], 0.09, 0.35, { type: "triangle", vol: 0.14 }); return; }
        const seq = o >= 5 ? [0, 2, 4, 5, 7, 8] : o >= 4 ? [0, 2, 4, 6, 7] : o >= 3 ? [0, 2, 4, 7] : [1, 3, 5];
        seq.forEach((k, i) => tone(NOTES[k], i * 0.09, 0.45, { type: o >= 5 ? "square" : "triangle", vol: o >= 5 ? 0.07 : 0.14 }));
        if (o >= 4) { tone(130.8, 0, 0.9, { type: "sawtooth", vol: 0.07 }); tone(196, 0.05, 0.9, { type: "sawtooth", vol: 0.05 }); }
        if (o >= 5) { noise(0.5, 0.6, { vol: 0.06, from: 3000, to: 9000 }); [0, 4, 7].forEach(k => tone(NOTES[k] * 2, 0.6, 1.1, { type: "triangle", vol: 0.07 })); }
      },
      ultra() { tone(55, 0, 1.6, { type: "sawtooth", vol: 0.12, to: 110 }); [0, 0.4, 0.8, 1.2].forEach(t => tone(70, t, 0.18, { type: "sine", vol: 0.45, to: 35 })); },
      coin() { tone(988, 0, 0.08, { type: "square", vol: 0.07 }); tone(1319, 0.07, 0.22, { type: "square", vol: 0.07 }); },
      gift() { [0, 2, 4, 7, 8].forEach((k, i) => tone(NOTES[k], i * 0.06, 0.3, { type: "triangle", vol: 0.12 })); noise(0.1, 0.4, { vol: 0.05, from: 4000, to: 9000 }); },
      sad() { [5, 3, 1].forEach((k, i) => tone(NOTES[k] / 2, i * 0.18, 0.35, { type: "triangle", vol: 0.12 })); },
    };
  })();
  const muteBtn = cls => `<button type="button" class="${cls}" aria-label="צלילים">${SFX.muted() ? "🔇" : "🔊"}</button>`;
  function wireMute(root) { const b = root.querySelector(".ro-mute,.rw-mute"); if (b) b.onclick = e => { e.stopPropagation(); b.textContent = SFX.toggle() ? "🔊" : "🔇"; }; }

  // =============== דיאלוגים ===============
  function dlg(id, cls = "") {
    let d = document.getElementById(id);
    if (!d) { d = document.createElement("dialog"); d.id = id; document.body.appendChild(d); d.addEventListener("cancel", e => { if (d.dataset.lock) e.preventDefault(); }); }
    d.className = "robo " + cls; return d;
  }
  const show = d => { if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute("open", ""); } } };
  function toast(html, act, ms = 6000) {
    const t = document.createElement("div"); t.className = "rtoast"; t.innerHTML = html + (act ? `<button class="rbtn sm" type="button">${act[0]}</button>` : "");
    document.body.appendChild(t); if (act) t.querySelector("button").onclick = () => { t.remove(); act[1](); };
    setTimeout(() => t.remove(), ms); return t;
  }
  // 🎮 נקודה על הלשונית "כיף": גלגל שעוד לא סובב היום + אוצר במפה שמחכה
  const funDot = () => (() => { const m = R.missions(S); return m.ids.filter(id => !m.got[id] && (m.p[id] || 0) >= R.MISSIONS[id].need).length; })() + (S.wheel !== R.ymd(Date.now()) ? 1 : 0) + (Math.min(R.MAP_N, Math.floor(((S.map || {}).p || 0) / R.MAP_STEP)) > ((S.map || {}).c || 0) ? 1 : 0);
  // 🌍 אירוע עולמי (ימים 1–3 בחודש)
  const evBanner = () => { const e = R.eventNow(); return e ? `<div class="rev"><b>${e.n}</b> עד ה-${e.until} בחודש: פי ${e.up} סיכוי שהתיבה תשתדרג בכל לחיצה! 🚀</div>` : ""; };
  const rarTag = r => `<span class="rtag ${r === "u" ? "u" : ""}" style="--c:${RC(r)}">${R.RAR[r].n}</span>`;
  const giftIcon = g => g.t === "box" ? R.BOX[g.box].em : g.t === "bolts" ? "🔩" : g.t === "guar" ? "⭐" : g.t === "item" ? (R.ITEMS[g.id].cat === "theme" || R.ITEMS[g.id].cat === "page" ? "🎨" : "👕") : "🎁";
  const giftText = g => g.t === "box" ? R.BOX[g.box].n : g.t === "bolts" ? `${g.n} ברגים` : g.t === "guar" ? `אביזר ${R.RAR[g.r].n} מובטח!` : g.t === "item" ? R.ITEMS[g.id].n : "";

  // ---------- הארון / תיבות / חנות / רצף ----------
  let tab = "wear", cat = "skin";
  let funSub = "";
  function open(t, sub) {
    if (locked()) return lockScreen();
    if (t) tab = t; if (sub) funSub = sub;
    const d = dlg("roboUI"); draw(); show(d);
  }
  function topRar() { const b = R.best(S); return b ? b.r : "c"; }
  function draw() {
    const d = document.getElementById("roboUI"); if (!d) return;
    const p = profile() || {}, pr = R.progress(S), nb = S.boxes.length, rc = RC(topRar()), inboxN = 0;
    const newIn = c => S.news.some(id => R.ITEMS[id] && R.ITEMS[id].cat === c);
    d.innerHTML = `<div class="rw"><div class="rw-top" style="--rc:${rc}"><button class="rw-x" type="button" aria-label="סגור">✕</button>${muteBtn("rw-mute")}
      <div class="rw-bot" id="rwBot">${svg()}</div><div class="rw-name">${S.name ? esc(S.name) : `הרובוט של ${esc(p.first || "")}`} <button type="button" class="rw-edit" id="rwName" aria-label="שם לרובוט">✏️</button></div>${S.name ? `<div class="rw-sub">של ${esc(p.first || "")}</div>` : ""}
      <div class="rw-chips"><span>🔥 רצף ${S.st.n}</span><span>🔩 ${bl()}</span><span>🏆 ${pr.have}/${pr.all}</span></div></div>
      <div class="rw-tabs">${[["wear", "👕 ארון"], ["fun", "🎮 כיף", funDot()], ["boxes", "🎁 תיבות", nb], ["friends", "👥 חברים", inboxN], ["shop", "🛒 חנות"], ["streak", "🔥 רצף"]].map(([k, l, n]) => `<button type="button" data-t="${k}" class="${tab === k ? "on" : ""}">${l}${n ? `<span class="dot">${n}</span>` : ""}</button>`).join("")}</div>
      <div class="rw-body" id="rwBody"></div></div>`;
    d.querySelector(".rw-x").onclick = () => d.close(); wireMute(d);
    d.querySelector("#rwName").onclick = () => { const v = prompt("איך קוראים לרובוט שלך? (עד 14 תווים)", S.name || ""); if (v == null) return; const c = R.cleanName(v); if (v.trim() && !c) { toast("השם הזה לא מתאים 🙈 נסה שם אחר", null, 3000); return; } S.name = c; save(); publishSoon(); draw(); };
    d.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    const body = d.querySelector("#rwBody");
    if (tab === "wear") {
      const items = R.LIST.filter(x => x.cat === cat).sort((a, b) => R.RAR[a.r].o - R.RAR[b.r].o);
      const have = items.filter(x => S.own[x.id]).length;
      body.innerHTML = `<div class="rw-cats">${Object.entries(R.CATS).map(([k, l]) => `<button type="button" data-c="${k}" class="${cat === k ? "on" : ""}">${l}${newIn(k) && cat !== k ? "<i></i>" : ""}</button>`).join("")}</div>
        <div class="rw-prog">יש לך ${have} מתוך ${items.length} · לחיצה על משהו שיש לך = ללבוש / להוריד · ❓ = עוד לא השגת</div>
        <div class="rw-grid">${items.map(it => card(it)).join("")}</div>`;
      body.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { cat = b.dataset.c; draw(); });
      body.querySelectorAll(".rc[data-id]").forEach(b => b.onclick = () => tapItem(b.dataset.id));
      if (S.news.some(id => R.ITEMS[id] && R.ITEMS[id].cat === cat)) { S.news = S.news.filter(id => !R.ITEMS[id] || R.ITEMS[id].cat !== cat); setTimeout(save, 1500); }
    } else if (tab === "friends") {
      friendsTab(body);
    } else if (tab === "fun") {
      if (window.RoboPlus) { RoboPlus.tab(body, funSub); funSub = ""; } else body.innerHTML = `<div class="rw-prog" style="text-align:center;padding:30px 0">⏳ טוען…</div>`;
    } else if (tab === "boxes") {
      const cnt = t => S.boxes.filter(b => b === t).length;
      body.innerHTML = evBanner() + (nb ? "" : `<div class="rw-sec">אין לך תיבות כרגע <small>מקבלים כל יום ברצף, על רצף במקצוע, או קונים בחנות</small></div>`)
        + ["giant", "mega", "big", "box"].filter(t => cnt(t)).map(t => boxRow(t, cnt(t), `<button class="rbtn" type="button" data-open="${t}">לפתוח!</button>`)).join("")
        + (nb > 1 ? `<button class="rbtn alt" type="button" id="rwAll" style="width:100%;margin:4px 0 10px">⚡ לפתוח הכל (${nb})</button>` : "")
        + `<div class="rw-sec">ℹ️ מה יש בתיבות <small>הסיכוי לכל דרגה, בכל פרס</small></div>` + oddsTable() + rareInfo();
      body.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openBoxes([b.dataset.open]));
      const all = body.querySelector("#rwAll"); if (all) all.onclick = () => openBoxes(S.boxes.slice());
    } else if (tab === "shop") {
      const deals = R.deals(S, dev());
      const ms = (() => { const n = new Date(), t = new Date(n.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })), m = 24 * 60 - (t.getHours() * 60 + t.getMinutes()); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; })();
      const brk = S.brk && S.brk.ymd === R.ymd(Date.now()) ? S.brk : null;
      const fl = R.flashNow(S, dev());
      body.innerHTML = evBanner() + (fl && !fl.bought ? `<div class="rbx rflash" style="--c:#f43f5e"><div class="em">⚡</div><div class="t"><b>תיבת בזק: ${R.BOX[fl.box].n}!</b><small>רק עוד ${fl.left} דק' · במקום ${R.BOX[fl.box].price}</small></div><button class="rbtn" type="button" id="rwFlash" ${S.bolts < fl.price ? "disabled" : ""}>🔩 ${fl.price}</button></div>` : "") + `<div class="rw-sec">🔩 יש לך ${bl()} ברגים <small>מקבלים על כפולים, ברצף ובתיבות</small></div><button class="rbtn alt" type="button" id="rwCode" style="width:100%;margin-bottom:10px">🎟️ יש לי קוד לפרס</button>`
        + (brk ? `<div class="rbx" style="--c:#f43f5e"><div class="em">💔</div><div class="t"><b>להציל את הרצף (${brk.n} ימים)</b><small>רק היום! הרצף חוזר ונמשך</small></div><button class="rbtn" type="button" id="rwSave" ${S.bolts < R.saveCost(brk.n) ? "disabled" : ""}>🔩 ${R.saveCost(brk.n)}</button></div>` : "")
        + ["box", "big", "mega", "giant"].map(t => boxRow(t, 0, `<button class="rbtn" type="button" data-buy="${t}" ${S.bolts < R.BOX[t].price ? "disabled" : ""}>🔩 ${R.BOX[t].price}</button>`)).join("")
        + `<div class="rw-sec">⏰ מבצע יומי <small>מתחלף בעוד ${ms} שעות</small></div><div class="rw-grid">${deals.map(x => card(R.ITEMS[x.id], x.price)).join("") || `<div class="rw-prog">יש לך כבר הכל מהחנות 🤯</div>`}</div>
        <p class="rw-prog" style="margin-top:12px">אביזרים מיתיים, אגדיים ואולטרה לא נמכרים בחנות – רק בתיבות 😉</p>`;
      body.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const r = R.buy(S, b.dataset.buy, dev()); if (!r.ok) return; save(); vib(30); SFX.coin(); toast(`${R.BOX[r.box].em} קנית ${R.BOX[r.box].n}!`, ["לפתוח", () => openBoxes([r.box])]); draw(); });
      body.querySelectorAll(".rc[data-id]").forEach(b => b.onclick = () => { const id = b.dataset.id, x = deals.find(d => d.id === id); if (!x) return; if (S.bolts < x.price) { toast(`חסרים לך ${x.price - S.bolts} ברגים 🔩`); return; } if (!confirm(`לקנות "${R.ITEMS[id].n}" ב-${x.price} ברגים?`)) return; if (R.buy(S, id, dev()).ok) { save(); celebrateItem(id); draw(); } });
      const sv = body.querySelector("#rwSave"); if (sv) sv.onclick = () => doSave();
      const fb = body.querySelector("#rwFlash"); if (fb) fb.onclick = () => { const r = R.buyFlash(S, dev()); if (!r.ok) { toast(r.error === "bolts" ? "חסרים ברגים 🔩" : "המבצע נגמר ⏰", null, 3000); draw(); return; } save(); SFX.coin(); vib(30); toast(`⚡ קנית ${R.BOX[r.box].n} במחיר בזק!`, ["לפתוח", () => openBoxes([r.box])]); draw(); };
      body.querySelector("#rwCode").onclick = async () => { const c = prompt("מה הקוד? 🎟️ (כל קוד – פעם אחת)"); if (!c) return; const r = await redeem(c); if (!r.ok || !/תיבה/.test(r.msg)) toast(r.msg, null, 4500); draw(); };
    } else {
      const n = S.st.n, from = Math.max(1, n - 2), days = Array.from({ length: 18 }, (_, i) => from + i);
      const miles = [7, 10, 14, 21, 30, 50, 75, 100, 150, 200].filter(m => m > n).slice(0, 4);
      body.innerHTML = `<div class="rbx" style="--c:#f97316"><div class="em">🔥</div><div class="t"><b>רצף של ${n} ${n === 1 ? "יום" : "ימים"}</b><small>השיא שלך: ${S.st.best} · כל יום שנכנסים לאפליקציה = מתנה. שבת וחג לא שוברים את הרצף 🙂</small></div></div>
        <div class="rw-sec">🎁 המתנות הבאות</div><div class="rladder">${days.map(d => dayTile(d, n)).join("")}</div>
        <div class="rw-sec">🏆 יעדים גדולים</div>${miles.map(m => `<div class="rbx" style="--c:${m >= 50 ? "#facc15" : m >= 30 ? "#ef4444" : "#a855f7"}"><div class="em">${m >= 100 ? "👑" : m >= 50 ? "⭐" : "💠"}</div><div class="t"><b>יום ${m}</b><small>${R.dayGift(m).map(giftText).join(" + ")}</small></div><b>עוד ${m - n}</b></div>`).join("")}
        <div class="rw-sec">📚 רצף במקצוע <small>שיעורים ברצף בלי חיסור (ממשוב)</small></div>
        <div class="rw-prog">10 → 📦 תיבה · 30 → 🎁 תיבה גדולה · 50 → 💠 מגה · 100 → 💠 מגה + 🥇 מדליית מקצוע</div>
        <div style="text-align:center;margin-top:14px"><button class="rbtn alt" type="button" id="rwShare">📸 להראות לחברים</button></div>`;
      body.querySelector("#rwShare").onclick = share;
    }
  }
  // הצלת רצף שנשבר היום (מהחנות)
  function doSave() { const r = R.saveStreak(S); if (!r.ok) { toast(r.error === "bolts" ? `חסרים לך ${r.cost - S.bolts} ברגים 🔩` : "אין רצף להציל היום", null, 3000); return; } save(); vib([30, 30, 60]); toast(`🔥 הרצף ניצל! אתה ברצף של ${r.n} ימים`, null, 4000); draw(); hubRefresh(); }
  function card(it, price) {
    const own = !!S.own[it.id], on = Object.values(S.eq).includes(it.id) || (it.cat === "theme" && window.Theme && Theme.current() === it.id.split(":")[1]) || (it.cat === "page" && pageOn(it));
    const sh = own && S.shiny && S.shiny[it.id], cls = ["rc", own || price ? "" : "lock", on ? "on" : "", it.r === "l" ? "leg" : "", it.r === "u" ? "ult" : "", sh ? "shiny" : ""].join(" ");
    return `<button type="button" class="${cls}" data-id="${it.id}" style="--c:${RC(it.r)};--rcol:${RC(it.r)}">${S.news.includes(it.id) ? `<span class="new">חדש!</span>` : ""}<div class="pv">${preview(it.id)}</div>${own || price ? "" : `<span class="q">❓</span>`}
      <div class="nm">${sh ? "✨ " : ""}${esc(it.n)}</div><div class="rr">${price ? `🔩 ${price}` : sh ? "נוצץ · " + R.RAR[it.r].n : R.RAR[it.r].n}</div></button>`;
  }
  function boxRow(t, n, btn) { const B = R.BOX[t]; return `<div class="rbx" style="--c:${B.col}"><div class="em">${B.em}</div><div class="t"><b>${B.n}${n > 1 ? ` ×${n}` : ""}</b><small>${B.rolls} פרסים · מתחילה ב${R.RAR[R.START[t]].n} ומשתדרגת בלחיצות${t === "giant" ? " · 🦸 הכי הרבה סיכוי לגיבורים!" : t === "mega" ? " · שווה!" : ""}</small></div>${btn}</div>`; }
  function oddsTable() {
    const F = { box: R.finalOdds("box"), big: R.finalOdds("big"), mega: R.finalOdds("mega"), giant: R.finalOdds("giant") };
    return `<div class="rw-prog" style="margin-top:4px">⭐ <b>הפרס הראשי</b> – לפי הדרגה שהתיבה מגיעה אליה אחרי ${R.TAPS} לחיצות (בכל לחיצה היא יכולה להשתדרג):</div><table class="rodds"><tr><td></td>${["box", "big", "mega", "giant"].map(t => `<td style="text-align:center">${R.BOX[t].em}</td>`).join("")}</tr>${R.TIERS.map(r => `<tr><td>${rarTag(r)}</td>${["box", "big", "mega", "giant"].map(t => `<td style="text-align:center">${F[t][r] ? fmtPct(F[t][r]) : "–"}</td>`).join("")}</tr>`).join("")}</table>
    <div class="rw-prog" style="margin-top:12px">➕ <b>עוד פרסים בתיבה</b> (📦 1 · 🎁 2 · 💠 5 · 💎 8) – ברגים, תיבה נוספת, או אביזר לפי הסיכויים:</div><table class="rodds"><tr><td></td>${["box", "big", "mega", "giant"].map(t => `<td style="text-align:center">${R.BOX[t].em}</td>`).join("")}</tr>${R.RK.map(r => `<tr><td>${rarTag(r)}</td>${["box", "big", "mega", "giant"].map(t => `<td style="text-align:center">${fmtPct(R.BOX[t].odds[r])}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  const fmtPct = p => (p >= 1 ? p.toFixed(p % 1 ? 1 : 0) : p >= 0.01 ? p.toFixed(2).replace(/0$/, "") : p.toFixed(3).replace(/0+$/, "")) + "%";
  function rareInfo() {
    const rare = rareCounts();
    return `<div class="rw-sec">👑 אולטרה אגדי <small>הכי נדיר שיש – כמות מוגבלת לכל הישיבה!</small></div>` + R.LIST.filter(x => x.r === "u").map(x => {
      const c = rare[x.id] || { n: 0, cap: x.cap }, left = Math.max(0, (c.cap || x.cap) - (c.n || 0));
      return `<div class="rbx" style="--c:#facc15"><div style="width:58px;height:58px">${svg("", Object.assign({}, S.eq, { skin: x.id }), { still: false, noHoli: true })}</div><div class="t"><b>${esc(x.n)}</b><small>${x.one ? (left ? "♾️ רק אחד בכל הישיבה! עוד לא נלקח 😱" : "♾️ נלקח! יש לו בעלים אחד בלבד 🔒") : left ? `נשארו רק ${left} מתוך ${c.cap || x.cap} בכל הישיבה 😱` : "אזלו! כולן נלקחו 🔒"}</small></div>${S.own[x.id] ? "✅" : ""}</div>`;
    }).join("");
  }
  const rareCounts = () => { try { return JSON.parse(LS.get("roboRare", "{}")) || {}; } catch (e) { return {}; } };
  function dayTile(d, n) {
    const g = R.dayGift(d), big = g.length > 1 || g.some(x => x.t === "guar" || (x.t === "box" && x.box !== "box"));
    return `<div class="rl ${d < n ? "done" : d === n ? "today" : ""} ${big ? "big" : ""}"><b>יום ${d}</b><div class="g">${d < n ? "✅" : g.map(giftIcon).join("")}</div>${d === n ? "היום" : esc(g.map(giftText).join(" + "))}</div>`;
  }
  const pageMap = () => { try { return JSON.parse(LS.get("roboPage", "{}")) || {}; } catch (e) { return {}; } };
  const pageOn = it => (pageMap()[it.pg] || {}).id === it.id;
  function tapItem(id) {
    const it = R.ITEMS[id];
    if (!S.own[id]) { toast(`❓ <b>${esc(it.n)}</b> ${rarTag(it.r)}<br><small>${esc(howGet(it))}</small>`, null, 4000); return; }
    if (it.cat === "theme") { if (window.Theme) Theme.setTheme(id.split(":")[1]); vib(20); draw(); toast(`🎨 העיצוב "${esc(it.n)}" הופעל בכל האפליקציה!`, null, 2500); return; }
    if (it.cat === "page") { const m = pageMap(); if (pageOn(it)) delete m[it.pg]; else m[it.pg] = { id, grad: it.grad }; LS.set("roboPage", JSON.stringify(m)); draw(); toast(pageOn(it) ? `✨ העמוד מעוצב! תיכנס אליו לראות` : "העיצוב הוסר מהעמוד", null, 2500); return; }
    R.equip(S, id); trk("wear"); save(); vib(15); draw(); publishSoon();
    const b = document.getElementById("rwBot"); if (b) { b.classList.add("hop"); setTimeout(() => b.classList.remove("hop"), 650); }
  }
  function howGet(it) {
    if (it.how) return "איך משיגים: " + it.how;
    if (it.r === "u") return "רק בתיבות – והכמות מוגבלת לכל הישיבה!";
    if (it.hero) return "🦸 סדרת הגיבורים: יוצא רק מתיבת ענק 💎 (ולפעמים, נדיר מאוד, מתיבת מגה)";
    return `יוצא בתיבות (${["box", "big", "mega"].map(t => R.BOX[t].em + " " + fmtPct(R.BOX[t].odds[it.r])).join(" · ")})${R.RAR[it.r].price ? " · לפעמים במבצע היומי בחנות" : ""}`;
  }

  // ---------- פתיחת תיבות ----------
  let opening = false;
  async function openBoxes(list, opt = {}) {
    if (opening || !list.length) return; opening = true;
    const d = dlg("roboOpen", "open"); d.dataset.lock = "1"; show(d);
    const all = [];
    try {
      for (let bi = 0; bi < list.length; bi++) {
        const type = list[bi], ix = S.boxes.indexOf(type); if (ix < 0) continue;
        S.boxes.splice(ix, 1); S.opened = (S.opened || 0) + 1; R.mapStep(S, 1); trk("box");
        let prizes = R.roll(S, type), taps = prizes.taps.slice();
        if (opt.rig && bi === 0) { const id = R.LIST.filter(x => x.r === opt.rig && !x.x)[0].id; prizes[prizes.length - 1] = { t: "item", id, r: opt.rig, main: 1, ...(opt.rig === "u" ? { need: "claim" } : {}) }; const st = R.TIERS.indexOf(R.START[type]), en = R.TIERS.indexOf(opt.rig); taps = Array.from({ length: R.TAPS + 1 }, (_, i) => R.TIERS[Math.min(en, st + i)]); } // דמו בלבד
        // אולטרה אגדי – השרת מאשר (כמות מוגבלת). לא אושר → אגדי רגיל במקום
        for (const p of prizes) if (p.need === "claim") { const ok = await claim(p.id); if (!ok) { Object.assign(p, R.guaranteed(S, "l"), { need: undefined }); if (p.main) taps = taps.map(t => t === "u" ? "l" : t); } }
        const got = prizes.map(p => R.grant(S, p)); save();
        all.push(...got);
        const skip = await boxScene(d, type, got, list.length - bi - 1, taps);
        if (skip) { for (let j = bi + 1; j < list.length; j++) { const t = list[j], k = S.boxes.indexOf(t); if (k < 0) continue; S.boxes.splice(k, 1); let pz = R.roll(S, t); for (const p of pz) if (p.need === "claim") { const ok = await claim(p.id); if (!ok) Object.assign(p, R.guaranteed(S, "l"), { need: undefined }); } all.push(...pz.map(p => R.grant(S, p))); } save(); break; }
        // תיבה שיצאה מתיבה – נפתחת מיד אחרי
        const extra = got.filter(g => g.t === "box").map(g => g.box); if (extra.length) list.splice(bi + 1, 0, ...extra);
      }
      await summary(d, all);
    } finally { opening = false; delete d.dataset.lock; d.close(); draw(); hubRefresh(); }
  }
  function particles(host, col, n = 26, em) {
    if (REDUCED) return;
    for (let i = 0; i < n; i++) { const p = document.createElement("span"); p.className = "ro-p"; const a = rnd(0, Math.PI * 2), r = rnd(120, 340);
      p.textContent = em ? em[i % em.length] : "✦"; p.style.color = col; p.style.setProperty("--x", Math.cos(a) * r + "px"); p.style.setProperty("--y", Math.sin(a) * r + "px"); p.style.setProperty("--r", rnd(-360, 360) + "deg"); p.style.fontSize = rnd(14, 30) + "px";
      host.appendChild(p); setTimeout(() => p.remove(), 1400); }
  }
  const waitTap = (el, ms) => new Promise(res => { let done = false; const go = () => { if (done) return; done = true; el.removeEventListener("click", go); res(); }; el.addEventListener("click", go); if (ms) setTimeout(go, ms); });
  // 🎁 התיבה (מצוירת): הצבע לפי הדרגה הנוכחית
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))); return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); };
  const chestSVG = em => `<svg class="chest" viewBox="0 0 200 190" aria-hidden="true"><defs><linearGradient id="cgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c1)"/><stop offset="1" style="stop-color:var(--c2)"/></linearGradient><linearGradient id="cgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c0)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient></defs>
<ellipse cx="100" cy="179" rx="72" ry="9" fill="rgba(0,0,0,.4)"/>
<g class="cbody"><rect x="22" y="86" width="156" height="84" rx="14" fill="url(#cgB)" stroke="rgba(0,0,0,.4)" stroke-width="3"/><rect x="44" y="86" width="16" height="84" fill="#fcd34d"/><rect x="140" y="86" width="16" height="84" fill="#fcd34d"/><rect x="22" y="152" width="156" height="7" fill="rgba(0,0,0,.18)"/><text x="100" y="146" font-size="30" text-anchor="middle">${em}</text></g>
<g class="clid"><path d="M18 92V64Q18 26 100 26Q182 26 182 64V92Z" fill="url(#cgL)" stroke="rgba(0,0,0,.4)" stroke-width="3"/><rect x="44" y="32" width="16" height="60" fill="#fcd34d"/><rect x="140" y="32" width="16" height="60" fill="#fcd34d"/><path d="M32 52Q100 30 168 52" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>
<g class="clock"><rect x="84" y="74" width="32" height="36" rx="8" fill="#fde047" stroke="#a16207" stroke-width="3"/><circle cx="100" cy="88" r="5" fill="#713f12"/><rect x="98" y="90" width="4" height="10" fill="#713f12"/></g></g></svg>`;
  function paint(el, t) { const c = RC(t); el.style.setProperty("--rc", c); el.style.setProperty("--c0", shade(c, .45)); el.style.setProperty("--c1", c); el.style.setProperty("--c2", shade(c, -.45)); }
  // סצנה של תיבה: 4 לחיצות – בכל אחת התיבה יכולה להשתדרג (כמו בבראול). הדרגה בסוף = הפרס הראשי. מחזיר true אם דילגו
  async function boxScene(d, type, got, left, taps) {
    const B = R.BOX[type]; let cur = taps[0];
    d.innerHTML = `<div class="ro"><div class="ro-rays"></div><div class="ro-flash"></div><div class="ro-beam"></div>${left ? `<div class="ro-left">עוד ${left} 📦</div>` : ""}<button class="ro-skip" type="button">דלג ⏭</button>${muteBtn("ro-mute")}
      <div class="ro-type">${esc(B.n)}</div><div class="ro-chest">${chestSVG(B.em)}</div><div class="ro-tier">${R.RAR[cur].n}</div>
      <div class="ro-hint">לחץ על התיבה! היא יכולה להשתדרג 💥</div><div class="ro-taps">${"<i></i>".repeat(R.TAPS)}</div></div>`;
    const ro = d.querySelector(".ro"), ch = d.querySelector(".ro-chest"), tier = d.querySelector(".ro-tier"), dots = d.querySelectorAll(".ro-taps i"), hint = d.querySelector(".ro-hint");
    paint(ro, cur); ro.classList.add("lit"); wireMute(ro);
    let skipped = false; d.querySelector(".ro-skip").onclick = e => { e.stopPropagation(); skipped = true; ro.click(); };
    for (let i = 0; i < R.TAPS && !skipped; i++) {
      await waitTap(ro); if (skipped) break;
      const nx = taps[i + 1];
      dots[i].classList.add("on");
      if (nx !== cur) { // ⬆️ שדרוג!
        cur = nx; paint(ro, cur); dots[i].style.background = RC(cur);
        ch.classList.remove("tap", "up"); void ch.offsetWidth; ch.classList.add("up"); ch.style.setProperty("--sz", 1 + R.TIERS.indexOf(cur) * 0.06);
        tier.textContent = R.RAR[cur].n + (cur === "u" ? " 👑" : cur === "l" ? " ⭐" : ""); tier.classList.remove("pop"); void tier.offsetWidth; tier.classList.add("pop");
        const up = document.createElement("div"); up.className = "ro-up"; up.textContent = cur === "u" ? "!!!אולטרה" : cur === "l" ? "!!אגדי" : "שדרוג!"; ro.appendChild(up); setTimeout(() => up.remove(), 1100);
        const ring = document.createElement("div"); ring.className = "ro-ring"; ro.appendChild(ring); setTimeout(() => ring.remove(), 900);
        d.querySelector(".ro-flash").classList.remove("go"); void ro.offsetWidth; d.querySelector(".ro-flash").classList.add("go");
        ro.classList.remove("shakeS"); void ro.offsetWidth; ro.classList.add("shakeS");
        particles(ro, RC(cur), R.TIERS.indexOf(cur) >= 3 ? 40 : 24, R.TIERS.indexOf(cur) >= 4 ? ["⭐", "✨", "💛"] : null); vib(R.TIERS.indexOf(cur) >= 3 ? [50, 30, 90] : 45); SFX.up(R.TIERS.indexOf(cur));
      } else { ch.classList.remove("tap", "up"); void ch.offsetWidth; ch.classList.add("tap"); particles(ro, RC(cur), 8); vib(18); SFX.tap(); }
      const leftT = R.TAPS - i - 1; hint.textContent = leftT ? `עוד ${leftT} ${leftT === 1 ? "לחיצה" : "לחיצות"}…` : "";
    }
    if (skipped) return true;
    // 👆 הילד פותח בעצמו
    hint.innerHTML = `<span class="ro-go">💥 לחץ לפתוח!</span>`; ch.classList.add("ready");
    await waitTap(ro); if (skipped) return true; ch.classList.remove("ready");
    ch.classList.add("open"); ro.classList.add("opened"); vib([30, 30, 80]); SFX.open();
    d.querySelector(".ro-flash").classList.remove("go"); void ro.offsetWidth; d.querySelector(".ro-flash").classList.add("go"); particles(ro, RC(cur), 36); await sleep(900);
    for (let i = 0; i < got.length; i++) {
      const g = got[i]; if (await revealOne(d, g, got.length - i - 1)) return true;
    }
    return false;
  }
  async function revealOne(d, g, more) {
    const r = g.t === "item" ? g.r : null, col = r ? RC(r) : g.t === "box" ? R.BOX[g.box].col : "#94a3b8";
    // ✨ משהו נדיר (אפי ומעלה, ולא כפול): מסך כהה, צללית זוהרת שמסתובבת, ולחיצה לחשוף
    if (r && R.RAR[r].o >= 3 && r !== "u" && !g.dup) {
      const lv = R.RAR[r].o;
      d.innerHTML = `<div class="ro rare-pre" style="--rc:${col}"><div class="ro-rays"></div><div class="rp-glow"></div><div class="rp-sil">${preview(g.id, true)}</div><div class="rp-t">${lv >= 5 ? "⭐ משהו אגדי מגיע…" : lv >= 4 ? "🔥 משהו מיתי מגיע…" : "✨ משהו נדיר מגיע…"}</div><div class="ro-hint">לחץ לחשוף!</div></div>`;
      const ro0 = d.querySelector(".ro"); ro0.classList.add("lit"); SFX.up(lv); vib(lv >= 5 ? [60, 40, 60, 40, 140] : [40, 30, 80]);
      await waitTap(ro0); ro0.classList.add("burst"); SFX.open(); particles(ro0, col, lv >= 5 ? 70 : 45, lv >= 5 ? ["⭐", "✨", "💛"] : null); await sleep(lv >= 5 ? 650 : 450);
    }
    // אולטרה אגדי: מסך שחור, דופק, ואז הפיצוץ הגדול
    if (r === "u") {
      d.innerHTML = `<div class="ro"><div class="ro-ultra"><div style="font-size:70px;animation:rBeat .5s infinite">⚡</div><b>אולטרה אגדי!!!</b></div></div>`; vib([80, 60, 80, 60, 200]); SFX.ultra(); await sleep(1900);
    }
    let inner;
    if (g.t === "item") {
      const it = R.ITEMS[g.id];
      inner = `${g.main ? `<div class="ro-main">⭐ הפרס הראשי</div>` : ""}<div class="ro-rar">${R.RAR[r].n}${r === "u" ? " 👑" : r === "l" ? " ⭐" : ""}</div><div class="ro-pv">${preview(g.id, false)}</div><div class="ro-nm">${esc(it.n)}</div><div class="ro-sub">${g.shinyNew ? `<b class="ro-shiny">✨ גרסה נוצצת! ✨</b> רק 1% מהאביזרים יוצאים ככה` : g.dup ? `כבר יש לך → <b>+${g.dup} 🔩</b>` : "✨ חדש באוסף!"}</div>`;
    } else if (g.t === "bolts") inner = `<div class="ro-big">🔩</div><div class="ro-nm">+${g.n} ברגים</div><div class="ro-sub">אפשר לקנות בהם תיבות בחנות</div>`;
    else inner = `<div class="ro-big">${R.BOX[g.box].em}</div><div class="ro-nm">עוד תיבה!</div><div class="ro-sub">${R.BOX[g.box].n} – נפתחת מיד אחרי</div>`;
    d.innerHTML = `<div class="ro lit" style="--rc:${col}"><div class="ro-rays"></div><div class="ro-flash go"></div>${more ? `<div class="ro-left">עוד ${more}</div>` : ""}<button class="ro-skip" type="button">דלג ⏭</button>
      <div class="ro-card"><div class="ro-in" style="--c:${col}">${inner}</div></div><div class="ro-tap">לחץ להמשך</div></div>`;
    const ro = d.querySelector(".ro"); let skipped = false;
    if (g.shinyNew) { ro.classList.add("shiny"); particles(ro, "#fde047", 50, ["✨", "⭐", "💛"]); SFX.reveal(5); } else if (g.t === "item") SFX.reveal(g.dup ? 0 : R.RAR[r].o); else if (g.t === "bolts") SFX.coin(); else SFX.gift();
    d.querySelector(".ro-skip").onclick = e => { e.stopPropagation(); skipped = true; ro.click(); };
    if (r && R.RAR[r].o >= 3) { ro.classList.add("shakeS"); particles(ro, col, R.RAR[r].o >= 5 ? 60 : 34, R.RAR[r].o >= 5 ? ["⭐", "✨", "💛", "👑"] : null); vib(R.RAR[r].o >= 5 ? [60, 40, 120] : 40); }
    else particles(ro, col, 14);
    await sleep(500); await waitTap(ro);
    return skipped;
  }
  async function summary(d, all) {
    const items = all.filter(g => g.t === "item"), bolts = all.filter(g => g.t === "bolts").reduce((a, g) => a + g.n, 0) + items.reduce((a, g) => a + (g.dup || 0), 0);
    const fresh = items.filter(g => !g.dup).sort((a, b) => R.RAR[b.r].o - R.RAR[a.r].o);
    d.innerHTML = `<div class="ro" style="--rc:#a855f7;padding:20px"><div class="ro-nm">🎉 מה קיבלת</div>
      <div class="ro-sum">${items.map(g => `<div class="rc ${g.r === "l" ? "leg" : ""} ${g.r === "u" ? "ult" : ""}" style="--c:${RC(g.r)}"><div class="pv">${preview(g.id)}</div><div class="nm">${esc(R.ITEMS[g.id].n)}</div><div class="rr">${g.dup ? "+" + g.dup + " 🔩" : R.RAR[g.r].n}</div></div>`).join("")}</div>
      ${bolts ? `<div class="ro-sub" style="font-size:17px;font-weight:900">🔩 +${bolts} ברגים</div>` : ""}
      <div class="rd-btns" style="margin-top:16px">${fresh[0] && ["skin", "hat", "eyes", "held", "aura"].includes(R.ITEMS[fresh[0].id].cat) ? `<button class="rbtn" type="button" id="roWear">👕 ללבוש את ${esc(R.ITEMS[fresh[0].id].n)}</button>` : ""}<button class="rbtn alt" type="button" id="roDone">סגור</button></div></div>`;
    await new Promise(res => { const w = d.querySelector("#roWear"); if (w) w.onclick = () => { R.equip(S, fresh[0].id); save(); res(); }; d.querySelector("#roDone").onclick = res; });
  }
  function celebrateItem(id) { const it = R.ITEMS[id]; toast(`✨ <b>${esc(it.n)}</b> ${rarTag(it.r)} נכנס לארון!`, null, 3000); vib(30); }

  // ---------- 👑 האגדה: מי שאוסף ראשון את כל הגיבורים ----------
  let legendBusy = false;
  async function legendClaim() {
    if (legendBusy || S.legendTry || !S.sets || !S.sets.heroes || locked() || window.__DEMO) return; legendBusy = true;
    try {
      const base = (typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "";
      const r = await fetch(base + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "robo", op: "claim", item: "skin:legend", device: dev() }) });
      const j = await r.json(); if (!j || !j.ok) return; // אין חיבור / נעול – ננסה שוב אחר כך
      if (j.counts) LS.set("roboRare", JSON.stringify(j.counts));
      S.legendTry = 1;
      if (j.granted) { R.grant(S, { t: "item", id: "skin:legend", r: "u" }); save(); legendShow(true); }
      else { save(); legendShow(false); }
    } catch (e) {} finally { legendBusy = false; }
  }
  function legendShow(won) {
    const d = dlg("roboAnn");
    d.innerHTML = won ? `<div class="ann"><div class="t">👑 אתה האגדה!!!</div><div class="bot">${svg("", { skin: "skin:legend" }, { noHoli: true })}</div><div class="w">אספת ראשון בישיבה את כל הגיבורים 🦸</div><div class="l">קיבלת את "האגדה" – הסקין הכי נדיר במשחק. רק אחד בכל הישיבה, והוא שלך!</div><div class="rd-btns" style="margin-top:18px"><button class="rbtn" type="button" id="annOk">👑 ללבוש עכשיו</button></div></div>`
      : `<div class="ann"><div class="t">🦸 אספת את כל הגיבורים!</div><div class="bot">${svg()}</div><div class="w">כל הכבוד – זה הישג ענק!</div><div class="l">"האגדה" 👑 כבר נלקחה – מישהו הגיע לפניך. אבל אתה בין הבודדים שאספו הכל!</div><div class="rd-btns" style="margin-top:18px"><button class="rbtn" type="button" id="annOk">וואו 🤩</button></div></div>`;
    show(d); if (won) { SFX.ultra(); setTimeout(() => SFX.reveal(6), 900); setTimeout(() => particles(d.querySelector(".ann"), "#facc15", 80, ["👑", "⭐", "✨", "💛"]), 400); vib([80, 60, 80, 60, 300]); }
    d.querySelector("#annOk").onclick = () => { if (won) { R.equip(S, "skin:legend"); save(); publishSoon(); } d.close(); };
  }
  // ---------- שרת: אולטרה אגדי (כמות מוגבלת) ----------
  async function claim(id) {
    if (window.__DEMO) return true;
    try {
      const base = (typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "";
      const r = await fetch(base + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "robo", op: "claim", item: id, device: dev() }) });
      const j = await r.json(); if (j && j.counts) LS.set("roboRare", JSON.stringify(j.counts));
      return !!(j && j.ok && j.granted);
    } catch (e) { return false; }
  }

  // ---------- שרת: קודים, הטלפון של מנהל המערכת, דיווח רצף ----------
  const api = async body => { const base = (typeof SERVER_BASE !== "undefined" && SERVER_BASE) || ""; const r = await fetch(base + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ action: "robo", device: dev() }, body)) }); return r.json(); };
  // 👑 כוחות של מנהל המערכת (מופעלים מדף הניהול): ברגים לאין סוף / כל האביזרים. רק בטלפון שחובר
  function powers() { try { return JSON.parse(LS.get("roboOwner", "null")) || {}; } catch (e) { return {}; } }
  function applyPowers() {
    const P = powers(); let ch = false;
    if (P.owner && P.inf) { if (S.realBolts == null) { S.realBolts = S.bolts; ch = true; } if (S.bolts < 999999) { S.bolts = 999999; ch = true; } }
    else if (S.realBolts != null) { S.bolts = S.realBolts; delete S.realBolts; ch = true; }
    if (P.owner && P.all) { for (const it of R.LIST) if (!S.own[it.id]) { S.own[it.id] = -1; ch = true; } }
    else for (const k of Object.keys(S.own)) if (S.own[k] === -1) { delete S.own[k]; ch = true; }
    if (ch) { S = R.norm(S); save(); }
  }
  async function checkPowers(force) {
    if (window.__DEMO || !profile()) return;
    const P = powers(); if (!force && P.at && Date.now() - P.at < 10 * 60e3 && !P.owner) return;
    try { const j = await api({ op: "me" }); if (j && j.ok) { LS.set("roboOwner", JSON.stringify({ owner: !!j.owner, inf: !!j.inf, all: !!j.all, at: Date.now() })); applyPowers(); hubRefresh(); } } catch (e) {}
  }
  // 🎟️ מממשים קוד (מהעוזר, מברקוד או מהארון). כל קוד – פעם אחת לכל ילד
  const CODE_ERR = { bad_code: "הקוד הזה לא נכון 🤔 תבדוק שהקלדת נכון", used: "כבר מימשת את הקוד הזה 😉 כל קוד – פעם אחת", full: "אוי, הקוד נגמר – כל הפרסים שלו כבר נלקחו 😅", off: "הקוד הזה כבר לא פעיל", not_registered: "צריך קודם להירשם לאפליקציה (ולפתוח אותה פעם אחת)", bad_token: "קוד החיבור לא נכון או שפג תוקפו – צור חדש בדף הניהול" };
  async function redeem(raw) {
    const code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4) return { ok: false, msg: "זה לא נראה כמו קוד 🤔" };
    if (locked()) { LS.set("roboPendingCode", null); return { ok: false, msg: "🔒 הרובוט נעול עד 07:30 בבוקר – אז כולם מתחילים מחדש. תנסה את הקוד אז!" }; }
    if (!profile()) { LS.set("roboPendingCode", code); return { ok: false, msg: "שמרתי את הקוד – הוא ימומש אחרי שתסיים להירשם 🙂" }; }
    if (window.__DEMO) return { ok: false, msg: "בדמו אין מימוש קודים" };
    let j; try { j = await api(code.startsWith("OWN") ? { op: "link", token: code } : { op: "code", code }); } catch (e) { return { ok: false, msg: "אין חיבור לאינטרנט כרגע – נסה שוב עוד רגע" }; }
    if (!j || !j.ok) return { ok: false, msg: CODE_ERR[j && j.error] || "משהו השתבש, נסה שוב" };
    if (j.owner) { await checkPowers(true); toast("👑 הטלפון שלך מחובר לניהול! מדף הניהול אפשר להפעיל ברגים לאין סוף וכל האביזרים", null, 6000); return { ok: true, msg: "👑 הטלפון שלך חובר לניהול!" }; }
    const p = j.prize; let msg = "";
    if (p.t === "box") { S.boxes.push(p.box); save(); msg = `🎁 קיבלת ${R.BOX[p.box].n}!`; setTimeout(() => openBoxes([p.box]), 400); }
    else if (p.t === "bolts") { R.grant(S, p); save(); msg = `🔩 קיבלת ${p.n} ברגים!`; toast(msg, null, 3500); }
    else if (p.t === "item" && R.ITEMS[p.id]) { const x = R.grant(S, p); save(); msg = x.dup ? `כבר היה לך ${R.ITEMS[p.id].n} – קיבלת ${x.dup} ברגים 🔩` : `✨ קיבלת ${R.ITEMS[p.id].n}!`; if (!x.dup) { celebrateItem(p.id); setTimeout(() => open("wear"), 900); } else toast(msg, null, 3500); }
    hubRefresh(); return { ok: true, msg: "🎉 הקוד מומש! " + msg };
  }
  // קישור / ברקוד: ?code=XXXX (פרס) או ?own=OWN-XXXX (חיבור הטלפון של מנהל המערכת)
  // בטלפון ברקוד תמיד נפתח בדפדפן (לא באפליקציה שבמסך הבית – כך עובדים אייפון ואנדרואיד).
  // אם בדפדפן הזה אין משתמש רשום → מראים את הקוד בגדול + "להעתיק" + איך מדביקים למערכתי באפליקציה
  const standalone = () => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } };
  function urlCodes() {
    try {
      const q = new URLSearchParams(location.search), c = q.get("code") || q.get("own"), own = !q.get("code") && !!q.get("own");
      if (!c) return;
      q.delete("code"); q.delete("own"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
      if (profile() || standalone()) { LS.set("roboPendingCode", c); return; }
      const show = () => landing(String(c).toUpperCase().replace(/[^A-Z0-9-]/g, ""), own);
      if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
    } catch (e) {}
  }
  function landing(code, own) {
    const el = document.createElement("div"); el.id = "roboLand";
    el.innerHTML = `<div class="rl-box"><div class="rl-em">${own ? "👑" : "🎁"}</div><div class="rl-t">${own ? "קוד החיבור לטלפון שלך" : "קיבלת קוד מתנה!"}</div>
      <div class="rl-code" dir="ltr">${esc(code)}</div><button type="button" class="rbtn" id="rlCopy">📋 להעתיק את הקוד</button>
      <ol class="rl-steps"><li>פתח את <b>המערכת</b> מהמסך הבית של הטלפון</li><li>לחץ על הרובוט <b>מערכתי</b> 🤖</li><li>הדבק לו את הקוד (לחיצה ארוכה ← הדבק) ושלח${own ? "" : " – והפרס אצלך! 🎉"}</li></ol>
      <button type="button" class="rlink" id="rlHere">אין לי עדיין את האפליקציה – להירשם כאן</button></div>`;
    document.body.appendChild(el);
    const st = document.createElement("style"); st.textContent = `#roboLand{position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 50% 30%,#3b1d7a,#0b0820 70%);color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl;font-family:inherit}
.rl-box{max-width:380px;width:100%;text-align:center}.rl-em{font-size:76px;animation:rBob 2s ease-in-out infinite}.rl-t{font-size:24px;font-weight:900;margin:6px 0 12px}
.rl-code{font:900 30px/1.2 ui-monospace,Menlo,monospace;letter-spacing:2px;background:rgba(255,255,255,.1);border:2px dashed #facc15;border-radius:16px;padding:14px;margin-bottom:12px;user-select:all;-webkit-user-select:all}
#roboLand .rbtn{width:100%;font-size:17px;padding:14px}.rl-steps{text-align:right;margin:16px 0;padding-inline-start:22px;line-height:1.8;font-size:15px}`; document.head.appendChild(st);
    el.querySelector("#rlCopy").onclick = async e => { let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch (x) {} if (!ok) { const r = document.createRange(); r.selectNodeContents(el.querySelector(".rl-code")); const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r); try { ok = document.execCommand("copy"); } catch (x) {} } e.target.textContent = ok ? "✅ הועתק! עכשיו פתח את האפליקציה" : "סמן את הקוד והעתק ידנית"; };
    el.querySelector("#rlHere").onclick = () => { LS.set("roboPendingCode", code); el.remove(); };
  }
  async function pendingCode() {
    const c = LS.get("roboPendingCode", ""); if (!c || !profile() || !LS.get("introSeen", "")) return;
    LS.set("roboPendingCode", null); const r = await redeem(c); if (!r.ok || !/תיבה/.test(r.msg)) toast(r.msg, null, 5000);
  }

  // ---------- רצף כניסות יומי ----------
  async function daily(force) {
    if (!profile() || locked()) return;
    const c = R.checkIn(S); if (!c && !force) return; if (c) step(3); save();
    if (c && !window.__DEMO) api({ op: "day", n: S.st.n }).catch(() => {}); // בשביל התזכורת לפני שהרצף נשבר
    const d = dlg("roboDay"); d.dataset.lock = "1";
    if (c && c.broken) {
      const cost = R.saveCost(c.broken.n), can = S.bolts >= cost;
      d.innerHTML = `<div class="rd brk"><div class="rd-fl">🔥</div><div class="rd-t">💔 הרצף של ${c.broken.n} ימים נשבר</div><div class="rd-s">לא נכנסת ביום חול אחד או יותר.<br>${can ? `אפשר להציל אותו עכשיו ב-${cost} ברגים 🔩 (יש לך ${S.bolts})` : `כדי להציל צריך ${cost} ברגים 🔩 – יש לך ${S.bolts}. מתחילים מחדש, בפעם הבאה יותר!`}</div>
        <div class="rd-btns" style="margin-top:22px">${can ? `<button class="rbtn" type="button" id="rdSave">🔩 להציל את הרצף (${cost})</button>` : ""}<button class="rbtn alt" type="button" id="rdNew">להתחיל רצף חדש</button></div></div>`;
      show(d); SFX.sad();
      const choice = await new Promise(res => { const s = d.querySelector("#rdSave"); if (s) s.onclick = () => res("save"); d.querySelector("#rdNew").onclick = () => res("new"); });
      if (choice === "save") { const r = R.saveStreak(S); if (r.ok) { save(); c.n = r.n; c.gift = r.gift; c.saved = true; } }
    }
    const n = S.st.n, gift = c ? c.gift : R.dayGift(n);
    d.innerHTML = `<div class="rd"><div class="rd-fl">🔥</div><div class="rd-n" id="rdN">${Math.max(0, n - 1)}</div><div class="rd-t">${c && c.saved ? "הרצף ניצל! 🎉" : n === 1 ? "יום 1 – מתחילים רצף!" : `רצף של ${n} ימים!`}</div>
      <div class="rd-s">כל יום שנכנסים = מתנה. ככל שהרצף ארוך יותר – המתנות שוות יותר 💪<br>שבת וחג לא שוברים את הרצף.</div>
      <div class="rd-week">${Array.from({ length: 5 }, (_, i) => n - 1 + i).filter(x => x >= 1).slice(0, 5).map(x => dayTile(x, n)).join("")}</div>
      <div class="rd-btns"><button class="rbtn" type="button" id="rdGo">🎁 לקבל: ${esc(gift.map(giftText).join(" + "))}</button></div></div>`;
    show(d);
    const nEl = d.querySelector("#rdN"); setTimeout(() => { nEl.textContent = n; nEl.animate && nEl.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 500, easing: "cubic-bezier(.2,1.6,.4,1)" }); vib(30); }, 450);
    await new Promise(res => d.querySelector("#rdGo").onclick = res); SFX.gift();
    const boxes = [];
    for (const g of gift) {
      if (g.t === "box") { S.boxes.push(g.box); boxes.push(g.box); }
      else if (g.t === "guar") { const p = R.guaranteed(S, g.r); const x = R.grant(S, p); toast(`⭐ <b>${esc(R.ITEMS[x.id].n)}</b> ${rarTag(x.r)}${x.dup ? ` (כפול → +${x.dup} 🔩)` : ""}`, null, 5000); }
      else { const x = R.grant(S, g); if (x.t === "item") celebrateItem(x.id); else if (x.t === "bolts") toast(`🔩 +${x.n} ברגים!`, null, 2500); }
    }
    save(); delete d.dataset.lock; d.close(); hubRefresh();
    if (boxes.length) openBoxes(boxes);
  }

  // ---------- רצף במקצוע (index.html קורא לזה כשיש אבן דרך חדשה) ----------
  function subjectMile(subj, m) {
    const g = R.subjectMile(S, subj, m); if (!g) { save(); return; }
    const boxes = [];
    for (const x of g) { if (x.t === "box") { S.boxes.push(x.box); boxes.push(x.box); } else R.grant(S, x); }
    save();
    setTimeout(() => toast(`📚 רצף ${m} ב${esc(subj)}! קיבלת ${esc(g.map(giftText).join(" + "))}`, boxes.length ? ["לפתוח", () => openBoxes(boxes)] : null, 9000), 7000);
  }

  // ---------- להראות לחברים: תמונה ----------
  async function share() {
    const p = profile() || {}, pr = R.progress(S), top = R.LIST.filter(x => S.own[x.id]).sort((a, b) => R.RAR[b.r].o - R.RAR[a.r].o).slice(0, 3), tr = topRar();
    const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    const g = x.createRadialGradient(W / 2, 420, 50, W / 2, 500, 900); g.addColorStop(0, RC(tr)); g.addColorStop(.5, "#1a1040"); g.addColorStop(1, "#0b0820"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.translate(W / 2, 470); x.globalAlpha = .08; x.fillStyle = "#fff"; for (let i = 0; i < 18; i++) { x.rotate(Math.PI / 9); x.beginPath(); x.moveTo(0, 0); x.lineTo(900, -60); x.lineTo(900, 60); x.fill(); } x.restore();
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg("", null, { still: true }).replace('class="abot', 'width="640" height="640" class="abot'));
    await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 2500); });
    try { x.drawImage(img, W / 2 - 320, 150, 640, 640); } catch (e) {}
    x.direction = "rtl"; x.textAlign = "center"; x.fillStyle = "#fff";
    x.font = "900 72px system-ui,Arial"; x.fillText(`הרובוט של ${p.first || ""}`, W / 2, 110);
    x.font = "800 46px system-ui,Arial"; x.fillText(`🔥 רצף ${S.st.n}   ·   🏆 ${pr.have}/${pr.all}   ·   🔩 ${S.bolts}`, W / 2, 870);
    top.forEach((it, i) => { const y = 960 + i * 100; x.fillStyle = RC(it.r); x.beginPath(); x.roundRect ? x.roundRect(170, y - 62, 740, 84, 24) : x.rect(170, y - 62, 740, 84); x.fill(); x.fillStyle = "#fff"; x.font = "900 44px system-ui,Arial"; x.fillText(`${it.n} · ${R.RAR[it.r].n}`, W / 2, y - 6); });
    x.fillStyle = "rgba(255,255,255,.75)"; x.font = "700 34px system-ui,Arial"; x.fillText("המערכת · ישיבת בני עקיבא בית יהודה", W / 2, H - 50);
    cv.toBlob(async b => {
      if (!b) return; const f = new File([b], "my-robot.png", { type: "image/png" });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "הרובוט שלי", text: "תראה את הרובוט שלי במערכת! 🤖" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "my-robot.png"; document.body.appendChild(a); a.click(); a.remove(); toast("📸 התמונה נשמרה – שלח לחברים!", null, 3000);
    }, "image/png");
  }

  // ---------- כרטיס בפרופיל ----------
  let hubEl = null;
  function hub(el) { hubEl = el; hubRefresh(); }
  function hubRefresh() {
    const el = hubEl; if (!el || !el.isConnected) return;
    if (locked()) { el.innerHTML = `<div style="font-size:14px;font-weight:800;line-height:1.6">🔒 הרובוט נעול עד 07:30 בבוקר.<br><span style="font-weight:600;opacity:.85">עונה חדשה: כולם מתחילים שווה עם 1000 ברגים 🔩</span></div>`; return; }
    const pr = R.progress(S), nb = S.boxes.length, b = R.best(S);
    el.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><button type="button" id="rhBot" style="width:86px;height:86px;flex:0 0 86px;border:0;border-radius:24px;cursor:pointer;background:${(SK[S.eq.skin] || {}).bg || DEF_BG};box-shadow:0 8px 20px rgba(0,0,0,.3)">${svg()}</button>
      <div style="flex:1;min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:800"><span>🔥 רצף ${S.st.n}</span><span>🔩 ${bl()}</span><span>🏆 ${pr.have}/${pr.all}</span></div>
      ${b && R.RAR[b.r].o >= 2 ? `<div style="font-size:12px;margin-top:4px;opacity:.85">הכי נדיר: ${esc(b.n)} ${rarTag(b.r)}</div>` : `<div style="font-size:12px;margin-top:4px;opacity:.8">פתח תיבות ותלביש את הרובוט שלך!</div>`}</div></div>
      <div class="pf-acts" style="margin-top:10px"><button type="button" class="primary" id="rhWear">👕 הארון שלי</button><button type="button" class="ghost" id="rhBox" style="${nb ? "background:linear-gradient(135deg,#facc15,#f97316);color:#1a1040;font-weight:900" : ""}">🎁 ${nb ? `לפתוח תיבות (${nb})` : "תיבות"}</button><button type="button" class="ghost" id="rhFun">🎮 כיף${funDot() ? " 🔴" : ""}</button><button type="button" class="ghost" id="rhShop">🛒 חנות</button><button type="button" class="ghost" id="rhShare">📸 לחברים</button></div>`;
    el.querySelector("#rhBot").onclick = () => open("wear"); el.querySelector("#rhWear").onclick = () => open("wear");
    el.querySelector("#rhBox").onclick = () => nb ? openBoxes(S.boxes.slice()) : open("boxes"); el.querySelector("#rhShop").onclick = () => open("shop"); el.querySelector("#rhFun").onclick = () => open("fun"); el.querySelector("#rhShare").onclick = share;
  }

  // ---------- ✨ עקבות (כשגוררים את הרובוט) ו-💬 קריאות (כשלוחצים עליו) ----------
  let lastTrail = 0, downAt = 0, downX = 0, downY = 0;
  addEventListener("pointermove", e => {
    const b = document.getElementById("asstBtn"), it = R.ITEMS[S.eq.trail]; if (!b || !it || !b.classList.contains("drag") || REDUCED) return;
    const now = Date.now(); if (now - lastTrail < 45) return; lastTrail = now;
    const r = b.getBoundingClientRect(), t = document.createElement("span"); t.className = "robo-trail"; t.textContent = it.em[Math.floor(Math.random() * it.em.length)];
    t.style.left = r.left + r.width / 2 - 9 + rnd(-8, 8) + "px"; t.style.top = r.top + r.height / 2 - 9 + rnd(-8, 8) + "px";
    t.style.setProperty("--tx", rnd(-30, 30) + "px"); t.style.setProperty("--ty", rnd(10, 40) + "px"); t.style.setProperty("--tr", rnd(-180, 180) + "deg");
    document.body.appendChild(t); setTimeout(() => t.remove(), 950);
  }, { passive: true });
  addEventListener("pointerdown", e => { if (e.target.closest && e.target.closest("#asstBtn")) { downAt = Date.now(); downX = e.clientX; downY = e.clientY; } }, { passive: true, capture: true });
  addEventListener("pointerup", e => {
    if (!downAt || !(e.target.closest && e.target.closest("#asstBtn"))) { downAt = 0; return; }
    const tap = Date.now() - downAt < 450 && Math.hypot(e.clientX - downX, e.clientY - downY) < 10; downAt = 0;
    const it = R.ITEMS[S.eq.quote]; if (!tap || !it) return;
    const b = document.getElementById("asstBtn").getBoundingClientRect(), q = document.createElement("div"); q.className = "robo-say"; q.textContent = it.n;
    document.body.appendChild(q); const w = q.offsetWidth; q.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.left + b.width / 2 - w / 2)) + "px"; q.style.top = Math.max(8, b.top - 44) + "px";
    setTimeout(() => q.remove(), 2400);
  }, { passive: true, capture: true });
  // 🔩 בונוס על תרגול (מחשבון / כרטיסיות) – עד 60 ביום
  let earnShown = 0;
  function earn(n) {
    if (locked()) return 0;
    const g = R.earn(S, n); if (!g) return 0; trk("learn", g); save();
    const now = Date.now(); if (now - earnShown > 1500) { earnShown = now; const t = document.createElement("div"); t.className = "rtoast"; t.style.padding = "6px 12px"; t.style.fontSize = "13px"; t.textContent = `+${g} 🔩 על התרגול!`; document.body.appendChild(t); setTimeout(() => t.remove(), 1400); }
    return g;
  }

  // ================= 👥 חברים: הרובוטים של השכבה, לייקים, מתנות, טרייד, קרב כיתות =================
  const CLS_L = c => ({ y1: "י'1", y2: "י'2", ya1: 'י"א1', ya2: 'י"א2' }[c] || c);
  const online = () => !window.__DEMO && !!profile();
  let fCls = "", fSort = "likes", fData = null, fBusy = false;
  const myStats = () => { const pr = R.progress(S); return { n: S.st.n, best: S.st.best, have: pr.have, all: pr.all, opened: S.opened || 0 }; };
  const topRare = () => R.LIST.filter(x => S.own[x.id] && S.own[x.id] !== -1 && !x.free).sort((a, b) => R.RAR[b.r].o - R.RAR[a.r].o).slice(0, 3).map(x => x.id);
  let pubT = 0, myLikes = +LS.get("roboMyLikes", "0") || 0;
  async function publish() { if (!online() || locked()) return; try { const pj = await api({ op: "pub", rn: S.name || "", eq: S.eq, st: myStats(), rare: topRare(), ach: R.achievements(S, myLikes), hide: !!S.hide }); if (pj && pj.pid) LS.set("roboPid", pj.pid); LS.set("roboPubAt", String(Date.now())); } catch (e) {} }
  // ⚡ הזמנה לטרייד מגיעה מהר: הפיד (שנבדק כל 20 שניות) אומר אם מחכה לי משהו
  let hintAt = 0;
  function inviteHint(list) { const me = LS.get("roboPid", ""); if (!me || !list.includes(me) || Date.now() - hintAt < 8000) return; hintAt = Date.now(); checkInbox(); }
  function publishSoon() { clearTimeout(pubT); pubT = setTimeout(publish, 2500); }
  async function loadClass(cls) {
    if (!online()) return { ok: false, error: "offline" };
    try { const j = await api({ op: "class", cls }); if (j && j.ok && !Array.isArray(j.list)) return { ok: false, error: "old" }; if (j && j.ok) { const me = j.list.find(x => x.me); if (me) { myLikes = me.likes; LS.set("roboMyLikes", String(myLikes)); } try { const c = JSON.parse(LS.get("roboClassCache", "{}")) || {}; c[j.cls] = j.list.map(x => ({ kid: x.kid, eq: x.eq })); LS.set("roboClassCache", JSON.stringify(c)); } catch (e) {} battleReward(j); } return j; } catch (e) { return { ok: false, error: "net" }; }
  }
  // ⚔️ הכיתה שניצחה בשבוע שעבר מקבלת תיבה גדולה (פעם אחת)
  function battleReward(j) {
    const b = j.battle; if (!b || !Array.isArray(b.last) || S.battleClaim === b.lastWeek) return;
    const top = b.last.slice().sort((x, y) => y.pts - x.pts); if (!top[0] || !top[0].pts || (top[1] && top[1].pts === top[0].pts)) { S.battleClaim = b.lastWeek; save(); return; }
    S.battleClaim = b.lastWeek;
    if (top[0].cls === j.myCls) { S.boxes.push("big"); save(); setTimeout(() => toast(`⚔️ הכיתה שלך (${CLS_L(j.myCls)}) ניצחה בקרב הכיתות! קיבלת 🎁 תיבה גדולה`, ["לפתוח", () => openBoxes(["big"])], 9000), 600); SFX.gift(); } else save();
  }
  async function friendsTab(body) {
    body.innerHTML = `<div class="rw-prog" style="text-align:center;padding:30px 0">⏳ טוען את הרובוטים של הכיתה…</div>`;
    if (!online()) { body.innerHTML = `<div class="rw-prog" style="text-align:center;padding:30px 0">${window.__DEMO ? "בדמו אין חברים 🙂" : "צריך להירשם קודם"}</div>`; return; }
    if (!fData || fData.cls !== fCls || Date.now() - fData.at > 30000) { publish(); const j = await loadClass(fCls); if (!j || !j.ok) { body.innerHTML = `<div class="rw-prog" style="text-align:center;padding:30px 0">${j && j.error === "not_registered" ? "עוד רגע… האפליקציה נרשמת בשרת. נסה שוב בעוד דקה 🙂" : "אין חיבור כרגע 📶 נסה שוב"}</div>`; return; } fData = Object.assign(j, { at: Date.now() }); fCls = j.cls; }
    drawFriends(body);
  }
  function drawFriends(body) {
    const j = fData, bat = (j.battle && Array.isArray(j.battle.now) && j.battle.now.length ? j.battle.now : [{ cls: j.cls, pts: 0 }]), tot = bat.reduce((a, x) => a + x.pts, 0) || 1, A = bat[0], B = bat[1] || { cls: "", pts: 0 };
    const key = { likes: x => x.likes, streak: x => (x.st || {}).n || 0, have: x => (x.st || {}).have || 0 }[fSort];
    const list = j.list.slice().sort((a, b) => key(b) - key(a) || a.kid.localeCompare(b.kid, "he"));
    const medal = i => key(list[i]) > 0 ? ["🥇", "🥈", "🥉"][i] || "" : "";
    body.innerHTML = `<div class="fr-bat"><b>⚔️ קרב הכיתות השבוע</b><div class="fr-bar"><span class="a" style="flex:${Math.max(A.pts, tot * .15)}">${CLS_L(A.cls)} · ${A.pts}</span><span class="b" style="flex:${Math.max(B.pts, tot * .15)}">${B.pts} · ${CLS_L(B.cls)}</span></div><small>כל כניסה יומית ❤️ וכל לייק = נקודה לכיתה. המנצחת מקבלת 🎁 תיבה גדולה במוצאי שבת</small></div>
      <div class="fr-row">${bat.map(x => `<button type="button" data-cls="${x.cls}" class="${x.cls === j.cls ? "on" : ""}">${CLS_L(x.cls)}${x.cls === j.myCls ? " (שלי)" : ""}</button>`).join("")}<span style="flex:1"></span>${[["likes", "❤️"], ["streak", "🔥"], ["have", "🏆"]].map(([k, l]) => `<button type="button" data-so="${k}" class="${fSort === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${list.length ? `<div class="fr-grid">${list.map((x, i) => `<button type="button" class="fc${x.me ? " me" : ""}" data-pid="${x.pid}" style="animation-delay:${Math.min(i, 20) * 40}ms">${medal(i) ? `<span class="medal">${medal(i)}</span>` : ""}<div class="pv">${svg("", Object.assign({ skin: "skin:classic" }, x.eq), { still: true, noHoli: true })}</div><div class="rn">${esc(x.rn || "רובוט")}</div><div class="kid">${esc(x.kid)}${x.me ? " (אני)" : ""}</div><div class="lk">❤️ ${x.likes} · 🔥 ${(x.st || {}).n || 0}</div></button>`).join("")}</div>` : `<div class="rw-prog" style="text-align:center;padding:20px 0">עוד אין כאן רובוטים 🤖 תגיד לחברים להיכנס!</div>`}
      <label class="fr-tog"><input type="checkbox" id="frHide" ${S.hide ? "" : "checked"}> להציג את הרובוט שלי לשכבה</label>`;
    body.querySelectorAll("[data-cls]").forEach(b => b.onclick = () => { fCls = b.dataset.cls; fData = null; friendsTab(body); });
    body.querySelectorAll("[data-so]").forEach(b => b.onclick = () => { fSort = b.dataset.so; drawFriends(body); });
    body.querySelectorAll(".fc[data-pid]").forEach(b => b.onclick = () => friendCard(j.list.find(x => x.pid === b.dataset.pid)));
    body.querySelector("#frHide").onchange = e => { S.hide = !e.target.checked; save(); publish().then(() => { fData = null; }); };
  }
  // 🔍 הכרטיס של חבר
  function friendCard(x) {
    if (!x) return;
    const d = dlg("roboFriend", "fr"), best = (x.rare || []).filter(id => R.ITEMS[id]), rc = best[0] ? RC(R.ITEMS[best[0]].r) : "#7c3aed", st = x.st || {};
    d.innerHTML = `<div class="frc"><div class="frc-top" style="--rc:${rc}"><button class="rw-x" type="button" aria-label="סגור">✕</button>
      <div class="frc-bot">${svg("", Object.assign({ skin: "skin:classic" }, x.eq), { noHoli: true })}</div><div class="frc-rn">${esc(x.rn || "רובוט")}</div><div class="frc-kid">של ${esc(x.kid)}</div>
      <div class="frc-st"><span>❤️ ${x.likes}</span><span>🔥 רצף ${st.n || 0}</span><span>🏆 ${st.have || 0}/${st.all || R.LIST.length}</span><span>📦 ${st.opened || 0} תיבות</span></div></div>
      <div class="frc-in"><div class="rw-sec">🏅 ההישגים</div>${(x.ach || []).length ? `<div class="ach">${x.ach.map((a, i) => `<div style="animation-delay:${200 + i * 90}ms"><b>${esc(a.e)}</b>${esc(a.n)}</div>`).join("")}</div>` : `<div class="rw-prog">עוד אין הישגים – הכל לפניו 💪</div>`}
      ${best.length ? `<div class="rw-sec">⭐ הכי נדירים שלו</div><div class="rw-grid">${best.map(id => { const it = R.ITEMS[id]; return `<div class="rc ${it.r === "l" ? "leg" : ""} ${it.r === "u" ? "ult" : ""}" style="--c:${RC(it.r)};cursor:default"><div class="pv">${it.cat === "theme" || it.cat === "page" || it.cat === "trail" || it.cat === "quote" ? preview(id) : svg("", Object.assign({ skin: "skin:classic" }, { [it.cat]: id }), { still: true, noHoli: true })}</div><div class="nm">${esc(it.n)}</div><div class="rr">${R.RAR[it.r].n}</div></div>`; }).join("")}</div>` : ""}
      ${x.me ? `<p class="rw-prog" style="text-align:center;margin-top:14px">ככה החברים רואים את הרובוט שלך 😎</p>` : `<div class="frc-btns"><button class="rbtn" type="button" id="frLike" ${x.liked ? "disabled" : ""}>${x.liked ? "❤️ נתת היום" : "❤️ לייק"}</button><button class="rbtn alt" type="button" id="frGift">🎁 ברגים</button><button class="rbtn alt" type="button" id="frTrade">🔄 טרייד</button></div>`}</div></div>`;
    show(d); d.querySelector(".rw-x").onclick = () => d.close();
    if (!REDUCED) setTimeout(() => particles(d.querySelector(".frc-top"), rc, 18, ["✨", "⭐"]), 500);
    const lk = d.querySelector("#frLike"); if (lk) lk.onclick = async () => { lk.disabled = true; const j = await api({ op: "like", to: x.pid }).catch(() => null); if (j && j.ok) { trk("like"); save(); x.likes = j.likes; x.liked = true; lk.textContent = "❤️ נתת היום"; SFX.coin(); particles(d.querySelector(".frc-top"), "#f43f5e", 22, ["❤️", "💖"]); fData = null; } else { lk.disabled = false; toast(j && j.error === "already" ? "כבר נתת לייק היום 🙂" : "לא הצלחנו – נסה שוב", null, 2500); } };
    const gf = d.querySelector("#frGift"); if (gf) gf.onclick = async () => {
      if (S.realBolts != null) { toast("בטלפון של מנהל המערכת אי אפשר לשלוח ברגים 😉", null, 3000); return; }
      const v = Math.floor(+prompt(`כמה ברגים לשלוח ל${x.kid}? (עד 50 ביום, יש לך ${S.bolts})`, "10") || 0); if (!v) return;
      if (v > S.bolts) { toast("אין לך מספיק ברגים 🔩", null, 2500); return; }
      const j = await api({ op: "gift", to: x.pid, n: v }).catch(() => null);
      if (j && j.ok) { S.bolts -= v; S.gave = (S.gave || 0) + v; save(); SFX.coin(); toast(`🎁 שלחת ${v} ברגים ל${esc(x.kid)}!`, null, 3000); } else toast(j && j.error === "limit" ? `אפשר לשלוח עוד ${j.left} ברגים היום` : "לא הצלחנו – נסה שוב", null, 3000);
    };
    const tr = d.querySelector("#frTrade"); if (tr) tr.onclick = async () => { const j = await api({ op: "tradeNew", to: x.pid }).catch(() => null); if (!j || !j.ok) { toast("לא הצלחנו לפתוח טרייד", null, 2500); return; } d.close(); tradeOpen(j.id); };
  }

  // ---------- 🔄 טרייד ----------
  let TRD = null, trPoll = 0, trOffset = 0;
  const offerEmpty = () => ({ items: [], boxes: [], bolts: 0 });
  function trItem(kind, v, mine) {
    if (kind === "item") { const it = R.ITEMS[v]; if (!it) return ""; return `<div class="tr-it" style="--c:${RC(it.r)}"><div class="pv">${it.cat === "theme" || it.cat === "page" || it.cat === "trail" || it.cat === "quote" ? preview(v) : svg("", Object.assign({ skin: "skin:classic" }, { [it.cat]: v }), { still: true, noHoli: true })}</div>${esc(it.n.split(" ")[0])}${mine ? `<button class="x" type="button" data-rm="i:${v}">✕</button>` : ""}</div>`; }
    if (kind === "box") return `<div class="tr-it" style="--c:${R.BOX[v].col}"><div class="pv">${R.BOX[v].em}</div>${R.BOX[v].n}${mine ? `<button class="x" type="button" data-rm="b:${v}">✕</button>` : ""}</div>`;
    return `<div class="tr-it" style="--c:#475569"><div class="pv">🔩</div>${v}${mine ? `<button class="x" type="button" data-rm="bolts">✕</button>` : ""}</div>`;
  }
  const offerHtml = (o, mine) => (o.items || []).map(id => trItem("item", id, mine)).join("") + (o.boxes || []).map(b => trItem("box", b, mine)).join("") + (o.bolts ? trItem("bolts", o.bolts, mine) : "");
  async function tradeOpen(id) {
    const d = dlg("roboTrade"); d.dataset.lock = "1"; show(d);
    TRD = { id, view: null, applied: false, counting: false };
    d.innerHTML = `<div class="tr"><div class="tr-top"><b>🔄 טרייד</b></div><div class="tr-body"><div class="rw-prog" style="text-align:center;padding:30px">⏳ מתחבר…</div></div></div>`;
    await trRefresh(); clearInterval(trPoll); trPoll = setInterval(() => { if (!d.open) { clearInterval(trPoll); return; } trRefresh(); }, 1300);
  }
  async function trCall(b) { const t0 = Date.now(); const j = await api(Object.assign({ id: TRD.id }, b)).catch(() => null); if (j && j.now) trOffset = j.now - (t0 + Date.now()) / 2; return j; }
  async function trRefresh() { if (!TRD) return; const j = await trCall({ op: "tradeGet" }); if (j && j.ok) { TRD.view = j; trDraw(); } }
  function trDraw() {
    const d = document.getElementById("roboTrade"), v = TRD.view; if (!d || !v) return;
    if (v.status === "done") return trFinish();
    if (v.status === "cancel") { clearInterval(trPoll); d.innerHTML = `<div class="tr"><div class="tr-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"><div style="font-size:70px">🚫</div><div class="ro-nm">הטרייד בוטל</div><div class="rd-btns" style="margin-top:16px"><button class="rbtn alt" type="button" id="trClose">סגור</button></div></div></div>`; d.querySelector("#trClose").onclick = () => { delete d.dataset.lock; d.close(); TRD = null; }; return; }
    const give = R.offerValue(v.me.offer), get = R.offerValue(v.them.offer), diff = get - give, tilt = Math.max(-14, Math.min(14, diff / Math.max(40, give + get) * 30));
    const verd = !give && !get ? "⚖️ עוד אין הצעות" : Math.abs(diff) <= Math.max(20, (give + get) * 0.1) ? "⚖️ טרייד הוגן לשניכם" : diff > 0 ? "👍 שווה לך – אתה מקבל יותר" : "⚠️ שים לב: אתה נותן יותר ממה שאתה מקבל";
    if (v.status === "lock") return trCountdown();
    const me = profile() || {}, botMe = svg("", Object.assign({ skin: "skin:classic" }, Object.keys(v.me.eq || {}).length ? v.me.eq : S.eq), { noHoli: true }), botThem = svg("", Object.assign({ skin: "skin:classic" }, v.them.eq || {}), { noHoli: true });
    d.innerHTML = `<div class="tr tr2"><div class="tr-vs"><div class="vs-side me${v.me.ok ? " ok" : ""}"><div class="vs-bot">${botMe}</div><b>${esc(v.me.rn || "הרובוט שלי")}</b><small>${esc(me.first || "אני")}</small>${v.me.ok ? `<i>✅</i>` : ""}</div>
      <div class="vs-mid"><span class="vs-bolt">⚡</span><b>VS</b><span class="vs-bolt b2">⚡</span></div>
      <div class="vs-side them${v.them.ok ? " ok" : ""}"><div class="vs-bot">${botThem}</div><b>${esc(v.them.rn || "רובוט")}</b><small>${esc(v.them.kid)}</small>${v.them.ok ? `<i>✅</i>` : ""}</div></div><div class="tr-body">
      <div class="tr-side"><h4>📤 אתה נותן <em>שווי: ${give}</em></h4><div class="tr-items">${offerHtml(v.me.offer, true)}<button type="button" class="tr-add" id="trAdd" aria-label="להוסיף">＋</button></div></div>
      <div class="scale"><div class="beam" style="transform:rotate(${-tilt}deg)"><div class="pan l"><i>📤</i>${give}</div><div class="pan r"><i>📥</i>${get}</div></div><div class="post"></div><div class="base"></div></div>
      <div class="tr-verd">${verd}</div>
      <div class="tr-side"><h4>📥 אתה מקבל מ${esc(v.them.kid)} <em>שווי: ${get}</em></h4><div class="tr-items">${offerHtml(v.them.offer, false) || `<div class="rw-prog">${esc(v.them.kid)} עוד לא הציע כלום…</div>`}</div></div>
      <div class="tr-st">${v.me.ok ? "✅ אישרת" : "עוד לא אישרת"} · ${v.them.ok ? `✅ ${esc(v.them.kid)} אישר` : `⏳ מחכה ש${esc(v.them.kid)} יאשר`}</div>
      <div class="tr-st" style="font-size:11px">כשתשנה משהו – האישורים מתאפסים. אחרי ששניכם מאשרים יש עוד 3 שניות לבטל.</div></div>
      <div class="tr-foot"><button class="rbtn" type="button" id="trOk">${v.me.ok ? "↩️ לבטל אישור" : "✅ מסכים"}</button><button class="rbtn alt" type="button" id="trCancel">❌ לבטל טרייד</button></div></div>`;
    d.querySelector("#trAdd").onclick = trPick;
    d.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const o = JSON.parse(JSON.stringify(v.me.offer)), k = b.dataset.rm; if (k === "bolts") o.bolts = 0; else if (k.startsWith("i:")) o.items = o.items.filter(x => x !== k.slice(2)); else { const i = o.boxes.indexOf(k.slice(2)); if (i >= 0) o.boxes.splice(i, 1); } trSet(o); });
    d.querySelector("#trOk").onclick = async () => { if (!v.me.ok && !R.canGive(S, v.me.offer)) { toast("אין לך את כל מה שהצעת 🤔", null, 2500); return; } const j = await trCall({ op: "tradeOk", ok: !v.me.ok }); if (j && j.ok) { TRD.view = j; SFX.tap(); trDraw(); } };
    d.querySelector("#trCancel").onclick = async () => { const j = await trCall({ op: "tradeCancel" }); if (j && j.ok) { TRD.view = j; trDraw(); } };
  }
  async function trSet(o) { if (!R.canGive(S, o)) { toast("אין לך את זה 🤔", null, 2000); return; } const j = await trCall({ op: "tradeSet", offer: o }); if (j && j.ok) { TRD.view = j; trDraw(); } }
  function trPick() {
    const v = TRD.view, o = JSON.parse(JSON.stringify(v.me.offer)), own = R.LIST.filter(x => S.own[x.id] && S.own[x.id] !== -1 && x.id !== "skin:classic").sort((a, b) => R.RAR[b.r].o - R.RAR[a.r].o);
    const d = dlg("roboPick"); show(d);
    const cnt = t => S.boxes.filter(x => x === t).length - o.boxes.filter(x => x === t).length;
    const draw2 = () => {
      d.innerHTML = `<div class="tr"><div class="tr-top"><b>➕ מה להציע?</b></div><div class="tr-body">
        <div class="rw-sec">📦 תיבות</div><div class="tr-items">${["giant", "mega", "big", "box"].filter(t => cnt(t) > 0).map(t => `<button type="button" class="tr-add" style="width:auto;padding:0 10px;font-size:15px" data-box="${t}">${R.BOX[t].em} ×${cnt(t)}</button>`).join("") || `<span class="rw-prog">אין לך תיבות</span>`}</div>
        <div class="rw-sec">🔩 ברגים <small>יש לך ${S.realBolts != null ? "∞ (לא לטרייד)" : S.bolts}</small></div><input type="number" min="0" max="${S.realBolts != null ? 0 : S.bolts}" id="pkB" value="${o.bolts || ""}" placeholder="כמה ברגים" style="width:100%;padding:10px;border-radius:12px;border:0;font:inherit;font-size:16px">
        <div class="rw-sec">👕 אביזרים <small>לחיצה = להוסיף / להוריד</small></div><div class="tr-pick">${own.map(it => `<button type="button" data-it="${it.id}" class="${o.items.includes(it.id) ? "on" : ""}" style="--c:${RC(it.r)}"><div class="pv">${preview(it.id)}</div>${esc(it.n.split(" ")[0])}</button>`).join("") || `<span class="rw-prog">אין לך עוד אביזרים</span>`}</div></div>
        <div class="tr-foot"><button class="rbtn" type="button" id="pkOk">✅ להציע</button><button class="rbtn alt" type="button" id="pkNo">ביטול</button></div></div>`;
      d.querySelectorAll("[data-box]").forEach(b => b.onclick = () => { o.boxes.push(b.dataset.box); draw2(); });
      d.querySelectorAll("[data-it]").forEach(b => b.onclick = () => { const id = b.dataset.it; o.items = o.items.includes(id) ? o.items.filter(x => x !== id) : [...o.items, id].slice(0, 12); b.classList.toggle("on"); });
      d.querySelector("#pkNo").onclick = () => d.close();
      d.querySelector("#pkOk").onclick = () => { o.bolts = Math.max(0, Math.min(S.bolts, Math.floor(+d.querySelector("#pkB").value || 0))); d.close(); trSet(o); };
    };
    draw2();
  }
  function trCountdown() {
    const d = document.getElementById("roboTrade"), v = TRD.view; if (!d || TRD.counting) return; TRD.counting = true;
    const box = document.createElement("div"); box.className = "tr-count"; d.querySelector(".tr").appendChild(box);
    const end = v.lockAt + 3000;
    const tick = async () => {
      if (!TRD || TRD.view.status !== "lock") { TRD && (TRD.counting = false); box.remove(); return; }
      const left = Math.ceil((end - (Date.now() + trOffset)) / 1000);
      if (left <= 0) { box.innerHTML = `<div class="ro-nm">🤝 מחליפים…</div>`; await trRefresh(); if (TRD && TRD.view.status === "lock") setTimeout(tick, 400); return; }
      if (box.dataset.n !== String(left)) { box.dataset.n = left; box.innerHTML = `<div class="ro-nm" style="margin-bottom:6px">שניכם הסכמתם!</div><b>${left}</b><div class="tr-st">עוד אפשר להתחרט</div><button class="rbtn alt" type="button" id="trStop" style="margin-top:14px">❌ לבטל!</button>`; SFX.tap(); vib(30);
        box.querySelector("#trStop").onclick = async () => { const j = await trCall({ op: "tradeCancel" }); if (j && j.ok) { TRD.view = j; TRD.counting = false; box.remove(); trDraw(); } }; }
      setTimeout(tick, 200);
    };
    tick();
  }
  async function trFinish() {
    if (!TRD || TRD.applied) return; TRD.applied = true; clearInterval(trPoll);
    const d = document.getElementById("roboTrade"), v = TRD.view;
    const doneKey = "roboTrDone_" + v.id;
    if (!LS.get(doneKey, "")) { R.applyTrade(S, v.me.offer, v.them.offer); LS.set(doneKey, "1"); save(); publishSoon(); trCall({ op: "tradeDone" }); }
    const em = o => [...(o.items || []).slice(0, 3).map(id => { const it = R.ITEMS[id]; return it && it.em ? (Array.isArray(it.em) ? it.em[0] : it.em) : "👕"; }), ...(o.boxes || []).slice(0, 2).map(b => R.BOX[b].em), o.bolts ? "🔩" : ""].join("") || "🤝";
    const sw = document.createElement("div"); sw.className = "tr-swap"; sw.innerHTML = `<div class="s1">${em(v.me.offer)}</div><div class="s2">${em(v.them.offer)}</div>`; d.querySelector(".tr").appendChild(sw);
    SFX.reveal(5); vib([40, 40, 120]); setTimeout(() => particles(sw, "#facc15", 40, ["✨", "⭐", "🤝"]), 650);
    await sleep(1600);
    d.innerHTML = `<div class="tr"><div class="tr-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"><div style="font-size:80px">🤝</div><div class="ro-nm">הטרייד בוצע!</div><div class="tr-side" style="width:100%;margin-top:12px"><h4>📥 קיבלת</h4><div class="tr-items">${offerHtml(v.them.offer, false) || "—"}</div></div><div class="rd-btns" style="margin-top:14px"><button class="rbtn" type="button" id="trWear">👕 לארון</button><button class="rbtn alt" type="button" id="trClose">סגור</button></div></div></div>`;
    d.querySelector("#trClose").onclick = () => { delete d.dataset.lock; d.close(); TRD = null; hubRefresh(); };
    d.querySelector("#trWear").onclick = () => { delete d.dataset.lock; d.close(); TRD = null; open("wear"); };
  }

  // ---------- 💬 הודעות: לייקים, מתנות, הזמנות לטרייד ----------
  async function checkInbox() {
    if (!online() || locked()) return; let j; try { j = await api({ op: "inbox" }); } catch (e) { return; } if (!j || !j.ok || !Array.isArray(j.inbox) || !j.inbox.length) return;
    const likes = j.inbox.filter(x => x.t === "like").length; let ch = false;
    if (likes) { myLikes += likes; LS.set("roboMyLikes", String(myLikes)); toast(`❤️ קיבלת ${likes === 1 ? "לייק" : likes + " לייקים"} לרובוט שלך!`, null, 4500); }
    for (const x of j.inbox.filter(x => x.t === "bolts")) { S.bolts += Math.max(0, Math.min(50, x.n | 0)); ch = true; setTimeout(() => { toast(`🎁 ${esc(x.from)} שלח לך ${x.n} ברגים!`, null, 5000); SFX.coin(); }, 600); }
    for (const x of j.inbox.filter(x => x.t === "sold")) { const n = Math.max(0, Math.min(20000, x.price | 0)); S.bolts += n; if (S.mkt) delete S.mkt[x.id]; ch = true; setTimeout(() => { toast(`🕵️ ${esc(x.from)} קנה ממך ${esc((R.ITEMS[x.item] || {}).n || "אביזר")}! קיבלת ${n} ברגים 🔩`, null, 7000); SFX.coin(); }, 900); }
    for (const x of j.inbox.filter(x => x.t === "trade").slice(-2)) setTimeout(() => toast(`🔄 ${esc(x.from)} מזמין אותך לטרייד!`, ["לפתוח", () => tradeOpen(x.id)], 15000), 1200);
    if (ch) save();
  }
  // ---------- 👑 הכרזה: מישהו בשכבה זכה באולטרה אגדי ----------
  function checkNews() {
    let N = []; try { N = JSON.parse(LS.get("roboNews", "[]")) || []; } catch (e) {}
    const p = profile(); if (!p || !N.length || locked() || document.querySelector("dialog[open]")) return;
    const g = c => (String(c).startsWith("ya") ? 11 : 10), seen = (LS.get("roboNewsSeen", "") || "").split(",");
    const x = N.find(n => n && n.id && !seen.includes(n.id) && (g(n.cls) === g(p.cls) || n.item === "skin:legend") && Date.now() - n.at < 2 * 864e5 && R.ITEMS[n.item]); if (!x) return;
    LS.set("roboNewsSeen", [...seen, x.id].slice(-30).join(","));
    if (`${p.first || ""} ${p.last || ""}`.trim() === x.kid) return; // זה אני
    const d = dlg("roboAnn"); const left = Math.max(0, x.cap - x.n);
    d.innerHTML = `<div class="ann"><div class="t">👑 אולטרה אגדי!</div><div class="bot">${svg("", { skin: x.item }, { noHoli: true })}</div><div class="w">${esc(x.kid)} מ${CLS_L(x.cls)} זכה ב${esc(x.name)}!</div><div class="l">${left ? `נשארו רק ${left} מתוך ${x.cap} בכל הישיבה 😱` : "וזאת הייתה האחרונה! אזל 🔒"}</div><div class="rd-btns" style="margin-top:18px"><button class="rbtn" type="button" id="annOk">וואו! 🤩</button></div></div>`;
    show(d); SFX.ultra(); setTimeout(() => SFX.reveal(6), 900); setTimeout(() => particles(d.querySelector(".ann"), "#facc15", 50, ["⭐", "✨", "👑", "💛"]), 400);
    d.querySelector("#annOk").onclick = () => d.close();
  }
  // 🤖 רובוט קטן ליד שם (ימי הולדת / מזל טוב) – מהרשימה ששמורה בטלפון
  function mini(name, cls) {
    try { const c = JSON.parse(LS.get("roboClassCache", "{}")) || {}; const lists = cls && c[cls] ? [c[cls]] : Object.values(c); for (const l of lists) { const x = l.find(z => z.kid === name); if (x) return `<span class="robo-mini" style="display:inline-block;width:22px;height:22px;vertical-align:-6px;margin-inline-end:3px">${svg("", Object.assign({ skin: "skin:classic" }, x.eq), { still: true, noHoli: true })}</span>`; } } catch (e) {}
    return "";
  }

  // ---------- הפעלה ----------
  window.Robo = {
    svg, open, hub, share, subjectMile, daily, openBoxes, redeem, earn, sfx: SFX, mini, friendCard, tradeOpen, checkNews, publish, inviteHint, state: () => S, owns: id => !!S.own[id],
    give(p) { const x = R.grant(S, p); save(); hubRefresh(); return x; }, // דמו / בדיקות
    // בשביל robo-plus.js (גלגל, מעבדה, שוק, משחק, מפה)
    _: { locked, trk, get S() { return S; }, save, toast, dlg, show, SFX, openBoxes, svg, preview, RC, rarTag, esc, particles, draw, hubRefresh, api, sleep, vib, card, celebrateItem, online, profile, dev, CLS_L, giftText, giftIcon, bl, step, open, wireMute, muteBtn, REDUCED, page, LS },
    reload() { S = load(); applyBubble(); try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {} },
    locked, status: () => locked() ? "🔒 נעול עד 07:30" : `🔥 ${S.st.n} · 🔩 ${bl()}${S.boxes.length ? ` · 🎁 ${S.boxes.length}` : ""}`,
  };
  try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {}
  urlCodes();
  const boot = () => {
    seasonReset(); setInterval(() => { if (seasonReset()) { homeBtn(); hubRefresh(); applyBubble(); setTimeout(() => tick(), 2000); } }, 30000);
    applyBubble(); setTimeout(applyBubble, 1500); homeBtn();
    // ⚖️ איזון (4.11): מי שצבר יותר מ-2000 ברגים יורד ל-2000 (פעם אחת). האביזרים נשארים
    if (!S.cap2k) { S.cap2k = 1; const k = S.realBolts != null ? "realBolts" : "bolts"; if (S[k] > 2000 && S[k] < 999999) { S[k] = 2000; setTimeout(() => toast("⚖️ <b>עדכון איזון:</b> היה קל מדי לצבור ברגים, אז כל מי שהיה לו יותר מ-2000 ירד ל-2000. כל האביזרים שלך נשארו! 🤖", null, 10000), 4000); } save(); }
    applyPowers(); setTimeout(() => checkPowers(), 3000);
    // 👥 מפרסמים את הרובוט (פעם ב-6 שעות), בודקים הודעות כל דקה וחצי, והכרזות אולטרה
    if (online() && Date.now() - (+LS.get("roboPubAt", "0") || 0) > 6 * 3600e3) setTimeout(publish, 6000);
    setTimeout(checkInbox, 7000); setInterval(() => { if (!document.hidden) checkInbox(); }, 90000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(checkInbox, 800); });
    if (!LS.get("roboPid", "") && online()) setTimeout(publish, 4000);
    // 🎁 מתנת פתיחה: 1000 ברגים לכל תלמיד (פעם אחת)
    if (!S.g1000 && profile() && !locked()) { S.g1000 = 1; S.bolts += 1000; save(); setTimeout(() => { toast("🎁 <b>מתנה מהמערכת: 1000 ברגים!</b> 🔩 לך לחנות ותפתח תיבות", ["לחנות", () => open("shop")], 9000); SFX.coin(); }, 5000); }
    setTimeout(checkNews, 9000); setInterval(() => { if (!document.hidden) checkNews(); }, 30000);
    const pc = () => { if (!LS.get("roboPendingCode", "")) return; if (!profile() || !LS.get("introSeen", "") || document.querySelector("dialog[open]")) { setTimeout(pc, 3000); return; } pendingCode(); }; setTimeout(pc, 2500);
    // רצף כניסות: בפתיחה הראשונה של היום, כשלא באמצע משהו (אשף, חלון, אנימציה)
    tries = 0;
    // לא בפעם הראשונה (אשף + היכרות), לא באמצע שיחה עם העוזר / כתיבה / לחיצות, ולא אצל הרובוטים של הבדיקות (חוץ מהבדיקה של הרובוט)
    if (navigator.webdriver && !LS.get("roboTest", "")) return;
    const busy = () => !profile() || !LS.get("introSeen", "") || Date.now() - lastTouch < 3500 || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) || !!document.querySelector("dialog[open],#fx,#recap,.upd-pop,#suspWall,#asstP:not([hidden]),.asst-finger") || (document.getElementById("wiz") && !document.getElementById("wiz").hidden) || (document.getElementById("intro") && !document.getElementById("intro").hidden) || (document.getElementById("build") && !document.getElementById("build").hidden) || document.documentElement.classList.contains("susp-pre");
    let calm = 0; // צריך שתי בדיקות רצופות "פנוי" (כדי לא לקפוץ רגע לפני "מה חדש" וכו')
    // 👋 פעם אחת: "חדש! אפשר להלביש אותי" – אחרי שהכל נרגע
    const intro = () => { if (LS.get("roboIntro", "") || page !== "index") return; if (busy() || S.st.last !== R.ymd(Date.now())) { setTimeout(intro, 4000); return; } LS.set("roboIntro", "1"); toast("🤖 <b>חדש!</b> אפשר להלביש אותי 👕 יש לי ארון, תיבות וחנות. אפשר גם לכתוב לי \"תלביש אותך\"", ["לארון", () => open("wear")], 9000); };
    if (!(navigator.webdriver && !LS.get("roboTest", ""))) setTimeout(intro, 9000);
    tick = () => { if (S.st.last === R.ymd(Date.now())) return; if (busy()) { calm = 0; if (++tries < 120) setTimeout(tick, 2000); return; } if (++calm < 2) { setTimeout(tick, 1500); return; } daily(); };
    setTimeout(tick, page === "index" ? 3500 : 2000);
  };
  let tick = () => {}, tries = 0, lastTouch = 0;
  for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true, capture: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  // ניווט "חזור" / חזרה לאפליקציה ביום חדש
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.st.last !== R.ymd(Date.now())) { S = load(); seasonReset(); homeBtn(); setTimeout(() => tick(), 1200); } });
})();
