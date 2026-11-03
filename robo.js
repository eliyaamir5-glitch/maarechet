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
  function save() { LS.set("robo", JSON.stringify(S)); try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {} applyBubble(); }
  const profile = () => { try { return JSON.parse(LS.get("profile", "null")) || null; } catch (e) { return null; } };
  const dev = () => LS.get("deviceId", "") || "dev";
  const RC = r => R.RAR[r].col;

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
    "skin:gold": { head: "u:h", ear: "u:e", scr: "#3b2300", eye: "#fef08a", defs: u => lg(u, "h", [[0, "#fff7c2"], [.35, "#facc15"], [.65, "#ca8a04"], [1, "#fde68a"]]) + lg(u, "e", [[0, "#fde047"], [1, "#a16207"]]),
      top: u => shine(u) + twinkles([[15, 17, 3], [50, 20, 2.4], [49, 48, 3.2], [13, 45, 2]], "#fffbe6"), cls: "rgold", bg: "radial-gradient(circle at 35% 30%,#fff7c2,#facc15 40%,#ca8a04 75%,#713f12)", ring: "#facc15" },
  };
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
    "eyes:vr": () => `<rect x="12" y="21" width="40" height="18" rx="6" fill="#e5e7eb" stroke="#9ca3af"/><rect x="15" y="24" width="34" height="12" rx="4" fill="#111827"/><circle class="rtw" cx="44" cy="30" r="1.6" fill="#22d3ee"/><rect x="10" y="27" width="3" height="6" fill="#374151"/><rect x="51" y="27" width="3" height="6" fill="#374151"/>`,
  };
  const EYE_SHAPE = {
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
    "aura:streak": u => `<defs><radialGradient id="${u}st"><stop offset=".6" stop-color="#f97316" stop-opacity="0"/><stop offset=".85" stop-color="#f97316" stop-opacity=".7"/><stop offset="1" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs><circle class="rpulse" cx="32" cy="32" r="34" fill="url(#${u}st)"/><g class="rorbit">${[0, 90, 180, 270].map(a => `<text x="${(32 + 31 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y="${(32 + 31 * Math.sin(a * Math.PI / 180)).toFixed(1)}" font-size="8" text-anchor="middle" dominant-baseline="middle">🔥</text>`).join("")}</g>`,
  };
  // 🎉 בחגים הרובוט מחזיק משהו של החג (לא משנה את מה שבחרת – רק בזמן החג)
  const HOLI = { rosh: "🍎", sukkot: "🍋", simchat: "📜", hanukkah: "🍩", tubishvat: "🌱", purim: "🎭", pesach: "🍷", atzmaut: "🇮🇱", lagbaomer: "🔥", yerushalayim: "✨", shavuot: "🧀" };
  function holiday() { try { const H = window.Holidays && Holidays.current && Holidays.current(); return H && H.now ? H.now : null; } catch (e) { return null; } }

  let uid = 0;
  // eq: מה לבוש (ברירת מחדל: מה שבחרת). opt.still = בלי אנימציות (תצוגות קטנות), opt.noHoli = בלי תוספת חג
  function svg(cls = "", eq = null, opt = {}) {
    const E = Object.assign({}, eq || S.eq), u = "rb" + (++uid) + "_", sk = SK[E.skin] || SK["skin:classic"];
    const hol = !opt.noHoli && !eq ? holiday() : null;
    let heldEm = E.held && R.ITEMS[E.held] ? R.ITEMS[E.held].em : "";
    if (hol && hol.type === "sad") delete E.aura; else if (hol && HOLI[hol.key]) heldEm = HOLI[hol.key];
    const col = v => (v && v.startsWith("u:") ? `url(#${u}${v.slice(2)})` : v);
    const head = col(sk.head || "#f2f4ff"), ear = col(sk.ear || "#dfe4ff"), scr = sk.scr || "#1b1f45", eye = sk.eye || "#7cf5ff";
    const strokeA = sk.stroke ? ` stroke="${sk.stroke}" stroke-width="1.6"` : "";
    const glow = sk.glow ? ` style="filter:drop-shadow(0 0 3px ${sk.glow})"` : "";
    const eyeSh = EYE_SHAPE[E.eyes];
    const eyesHtml = eyeSh ? eyeSh(25, eye, u) + eyeSh(39, eye, u) : `<ellipse class="eye" cx="25" cy="30" rx="3.8" ry="4.6" fill="${eye}"/><ellipse class="eye" cx="39" cy="30" rx="3.8" ry="4.6" fill="${eye}"/><circle cx="26.3" cy="28.3" r="1.2" fill="#fff"/><circle cx="40.3" cy="28.3" r="1.2" fill="#fff"/>`;
    const defs = (sk.defs ? sk.defs(u) : "") + `<clipPath id="${u}c"><rect x="11" y="15" width="42" height="36" rx="14"/></clipPath>` + (E.eyes === "eyes:rainbow" ? lg(u, "rb", [[0, "#f87171"], [.33, "#facc15"], [.66, "#22d3ee"], [1, "#a855f7"]], 0, 1) : "");
    const hat = HAT[E.hat] ? HAT[E.hat](u) : "";
    return `<svg class="abot ${cls}${opt.still ? " still" : ""}${sk.cls ? " " + sk.cls : ""}" viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>
${E.aura && AURA[E.aura] ? `<g class="raura">${AURA[E.aura](u)}</g>` : ""}<g class="body">
${hat ? "" : `<line x1="32" y1="9" x2="32" y2="16" stroke="${sk.stroke || "#e8ebff"}" stroke-width="2.5" stroke-linecap="round"/><circle class="ant" cx="32" cy="7.5" r="3.6" fill="${sk.stroke || "#7cf5ff"}"/>`}
${sk.under ? sk.under(u) : ""}
<rect class="ear l" x="6.5" y="27" width="6" height="12" rx="3" fill="${ear}"${strokeA}/><rect class="ear r" x="51.5" y="27" width="6" height="12" rx="3" fill="${ear}"${strokeA}/>
<rect x="11" y="15" width="42" height="36" rx="14" fill="${head}"${strokeA}${glow}/>${sk.top ? sk.top(u) : ""}<rect x="15.5" y="20" width="33" height="24" rx="9" fill="${scr}"/>
<g class="look"><g class="eyes">${eyesHtml}</g>${EYES[E.eyes] ? EYES[E.eyes](u) : ""}</g>
<path class="ms" d="M27 37.5 Q32 41.5 37 37.5" fill="none" stroke="${eye}" stroke-width="2.2" stroke-linecap="round"/><ellipse class="mo" cx="32" cy="38.5" rx="3" ry="2" fill="${eye}"/>
<circle cx="19.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/><circle cx="44.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/>
${hat}${sk.over ? sk.over(u) : ""}${heldEm ? `<text class="rheld" x="55" y="56" font-size="15" text-anchor="middle">${heldEm}</text>` : ""}</g></svg>`;
  }
  // תצוגה של אביזר אחד (בכרטיס): הרובוט שלך + האביזר
  function preview(id, still = true) {
    const it = R.ITEMS[id];
    if (it.cat === "theme" || it.cat === "page") return `<div class="rv-sw" style="background:${it.grad}"><span>${it.cat === "page" ? pageIcon(it.pg) : "🎨"}</span></div>`;
    const eq = Object.assign({}, S.eq, { [it.cat]: id }); return svg("", eq, { still, noHoli: true });
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
.abot.still *,.abot.still{animation:none!important}
.abot{overflow:visible}
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
.rw-chips{position:relative;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.rw-chips span{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:5px 11px;font-size:13px;font-weight:800}
.rw-tabs{display:flex;gap:4px;padding:8px 10px;background:#120c2e;border-bottom:1px solid rgba(255,255,255,.08)}
.rw-tabs button{flex:1;border:0;border-radius:12px;padding:9px 4px;font:inherit;font-size:14px;font-weight:800;color:#c7c3ff;background:transparent;cursor:pointer;position:relative}
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
.rc.ult{background:linear-gradient(135deg,#fff7c2,#facc15 30%,#f472b6 60%,#a5f3fc 85%,#facc15)}@keyframes rCardShine{0%,40%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
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
.ro-box{position:relative;font-size:130px;line-height:1;cursor:pointer;filter:drop-shadow(0 0 30px var(--rc,#38bdf8)) drop-shadow(0 20px 20px rgba(0,0,0,.5));animation:rBoxIdle 1.6s ease-in-out infinite;transition:filter .3s}
@keyframes rBoxIdle{50%{transform:translateY(-10px) rotate(-3deg)}}
.ro-box.shake{animation:rShake .45s cubic-bezier(.36,.07,.19,.97)}@keyframes rShake{10%,90%{transform:translateX(-4px) rotate(-4deg) scale(1.05)}20%,80%{transform:translateX(8px) rotate(6deg) scale(1.1)}30%,50%,70%{transform:translateX(-12px) rotate(-8deg) scale(1.15)}40%,60%{transform:translateX(12px) rotate(8deg) scale(1.15)}}
.ro-box.boom{animation:rBoom .5s ease-in forwards}@keyframes rBoom{40%{transform:scale(1.4)}100%{transform:scale(3);opacity:0}}
.ro-hint{margin-top:22px;font-size:20px;font-weight:900;letter-spacing:.5px;animation:rPulseT 1s ease-in-out infinite}@keyframes rPulseT{50%{opacity:.4;transform:scale(.95)}}
.ro-taps{display:flex;gap:6px;justify-content:center;margin-top:10px}.ro-taps i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.2)}.ro-taps i.on{background:var(--rc);box-shadow:0 0 10px var(--rc)}
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
  const rarTag = r => `<span class="rtag ${r === "u" ? "u" : ""}" style="--c:${RC(r)}">${R.RAR[r].n}</span>`;
  const giftIcon = g => g.t === "box" ? R.BOX[g.box].em : g.t === "bolts" ? "🔩" : g.t === "guar" ? "⭐" : g.t === "item" ? (R.ITEMS[g.id].cat === "theme" || R.ITEMS[g.id].cat === "page" ? "🎨" : "👕") : "🎁";
  const giftText = g => g.t === "box" ? R.BOX[g.box].n : g.t === "bolts" ? `${g.n} ברגים` : g.t === "guar" ? `אביזר ${R.RAR[g.r].n} מובטח!` : g.t === "item" ? R.ITEMS[g.id].n : "";

  // ---------- הארון / תיבות / חנות / רצף ----------
  let tab = "wear", cat = "skin";
  function open(t) {
    if (t) tab = t;
    const d = dlg("roboUI"); draw(); show(d);
  }
  function topRar() { const b = R.best(S); return b ? b.r : "c"; }
  function draw() {
    const d = document.getElementById("roboUI"); if (!d) return;
    const p = profile() || {}, pr = R.progress(S), nb = S.boxes.length, rc = RC(topRar());
    const newIn = c => S.news.some(id => R.ITEMS[id] && R.ITEMS[id].cat === c);
    d.innerHTML = `<div class="rw"><div class="rw-top" style="--rc:${rc}"><button class="rw-x" type="button" aria-label="סגור">✕</button>
      <div class="rw-bot" id="rwBot">${svg()}</div><div class="rw-name">הרובוט של ${esc(p.first || "")}</div>
      <div class="rw-chips"><span>🔥 רצף ${S.st.n}</span><span>🔩 ${S.bolts}</span><span>🏆 ${pr.have}/${pr.all}</span></div></div>
      <div class="rw-tabs">${[["wear", "👕 ארון"], ["boxes", "🎁 תיבות", nb], ["shop", "🛒 חנות"], ["streak", "🔥 רצף"]].map(([k, l, n]) => `<button type="button" data-t="${k}" class="${tab === k ? "on" : ""}">${l}${n ? `<span class="dot">${n}</span>` : ""}</button>`).join("")}</div>
      <div class="rw-body" id="rwBody"></div></div>`;
    d.querySelector(".rw-x").onclick = () => d.close();
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
    } else if (tab === "boxes") {
      const cnt = t => S.boxes.filter(b => b === t).length;
      body.innerHTML = (nb ? "" : `<div class="rw-sec">אין לך תיבות כרגע <small>מקבלים כל יום ברצף, על רצף במקצוע, או קונים בחנות</small></div>`)
        + ["mega", "big", "box"].filter(t => cnt(t)).map(t => boxRow(t, cnt(t), `<button class="rbtn" type="button" data-open="${t}">לפתוח!</button>`)).join("")
        + (nb > 1 ? `<button class="rbtn alt" type="button" id="rwAll" style="width:100%;margin:4px 0 10px">⚡ לפתוח הכל (${nb})</button>` : "")
        + `<div class="rw-sec">ℹ️ מה יש בתיבות <small>הסיכוי לכל דרגה, בכל פרס</small></div>` + oddsTable() + rareInfo();
      body.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openBoxes([b.dataset.open]));
      const all = body.querySelector("#rwAll"); if (all) all.onclick = () => openBoxes(S.boxes.slice());
    } else if (tab === "shop") {
      const deals = R.deals(S, dev());
      const ms = (() => { const n = new Date(), t = new Date(n.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })), m = 24 * 60 - (t.getHours() * 60 + t.getMinutes()); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; })();
      const brk = S.brk && S.brk.ymd === R.ymd(Date.now()) ? S.brk : null;
      body.innerHTML = `<div class="rw-sec">🔩 יש לך ${S.bolts} ברגים <small>מקבלים על כפולים, ברצף ובתיבות</small></div>`
        + (brk ? `<div class="rbx" style="--c:#f43f5e"><div class="em">💔</div><div class="t"><b>להציל את הרצף (${brk.n} ימים)</b><small>רק היום! הרצף חוזר ונמשך</small></div><button class="rbtn" type="button" id="rwSave" ${S.bolts < R.saveCost(brk.n) ? "disabled" : ""}>🔩 ${R.saveCost(brk.n)}</button></div>` : "")
        + ["box", "big", "mega"].map(t => boxRow(t, 0, `<button class="rbtn" type="button" data-buy="${t}" ${S.bolts < R.BOX[t].price ? "disabled" : ""}>🔩 ${R.BOX[t].price}</button>`)).join("")
        + `<div class="rw-sec">⏰ מבצע יומי <small>מתחלף בעוד ${ms} שעות</small></div><div class="rw-grid">${deals.map(x => card(R.ITEMS[x.id], x.price)).join("") || `<div class="rw-prog">יש לך כבר הכל מהחנות 🤯</div>`}</div>
        <p class="rw-prog" style="margin-top:12px">אביזרים מיתיים, אגדיים ואולטרה לא נמכרים בחנות – רק בתיבות 😉</p>`;
      body.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const r = R.buy(S, b.dataset.buy, dev()); if (!r.ok) return; save(); vib(30); toast(`${R.BOX[r.box].em} קנית ${R.BOX[r.box].n}!`, ["לפתוח", () => openBoxes([r.box])]); draw(); });
      body.querySelectorAll(".rc[data-id]").forEach(b => b.onclick = () => { const id = b.dataset.id, x = deals.find(d => d.id === id); if (!x) return; if (S.bolts < x.price) { toast(`חסרים לך ${x.price - S.bolts} ברגים 🔩`); return; } if (!confirm(`לקנות "${R.ITEMS[id].n}" ב-${x.price} ברגים?`)) return; if (R.buy(S, id, dev()).ok) { save(); celebrateItem(id); draw(); } });
      const sv = body.querySelector("#rwSave"); if (sv) sv.onclick = () => doSave();
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
  function card(it, price) {
    const own = !!S.own[it.id], on = Object.values(S.eq).includes(it.id) || (it.cat === "theme" && window.Theme && Theme.current() === it.id.split(":")[1]) || (it.cat === "page" && pageOn(it));
    const cls = ["rc", own || price ? "" : "lock", on ? "on" : "", it.r === "l" ? "leg" : "", it.r === "u" ? "ult" : ""].join(" ");
    return `<button type="button" class="${cls}" data-id="${it.id}" style="--c:${RC(it.r)};--rcol:${RC(it.r)}">${S.news.includes(it.id) ? `<span class="new">חדש!</span>` : ""}<div class="pv">${preview(it.id)}</div>${own || price ? "" : `<span class="q">❓</span>`}
      <div class="nm">${esc(it.n)}</div><div class="rr">${price ? `🔩 ${price}` : R.RAR[it.r].n}</div></button>`;
  }
  function boxRow(t, n, btn) { const B = R.BOX[t]; return `<div class="rbx" style="--c:${B.col}"><div class="em">${B.em}</div><div class="t"><b>${B.n}${n > 1 ? ` ×${n}` : ""}</b><small>${B.rolls} ${B.rolls === 1 ? "פרס" : "פרסים"} · ${t === "mega" ? "הכי שווה! סיכוי גבוה לאפי ומעלה" : t === "big" ? "פי 7 יותר סיכוי לאגדי" : "יכול לצאת כל דבר"}</small></div>${btn}</div>`; }
  function oddsTable() {
    return `<table class="rodds"><tr><td></td>${["box", "big", "mega"].map(t => `<td style="text-align:center">${R.BOX[t].em}</td>`).join("")}</tr>${R.RK.map(r => `<tr><td>${rarTag(r)}</td>${["box", "big", "mega"].map(t => `<td style="text-align:center">${fmtPct(R.BOX[t].odds[r])}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  const fmtPct = p => (p >= 1 ? p.toFixed(p % 1 ? 1 : 0) : p.toFixed(2).replace(/0$/, "")) + "%";
  function rareInfo() {
    const rare = rareCounts();
    return `<div class="rw-sec">👑 אולטרה אגדי <small>הכי נדיר שיש – כמות מוגבלת לכל הישיבה!</small></div>` + R.LIST.filter(x => x.r === "u").map(x => {
      const c = rare[x.id] || { n: 0, cap: x.cap }, left = Math.max(0, (c.cap || x.cap) - (c.n || 0));
      return `<div class="rbx" style="--c:#facc15"><div style="width:58px;height:58px">${svg("", Object.assign({}, S.eq, { skin: x.id }), { still: false, noHoli: true })}</div><div class="t"><b>${esc(x.n)}</b><small>${left ? `נשארו רק ${left} מתוך ${c.cap || x.cap} בכל הישיבה 😱` : "אזלו! כולן נלקחו 🔒"}</small></div>${S.own[x.id] ? "✅" : ""}</div>`;
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
    R.equip(S, id); save(); vib(15); draw();
    const b = document.getElementById("rwBot"); if (b) { b.classList.add("hop"); setTimeout(() => b.classList.remove("hop"), 650); }
  }
  function howGet(it) {
    if (it.how) return "איך משיגים: " + it.how;
    if (it.r === "u") return "רק בתיבות – והכמות מוגבלת לכל הישיבה!";
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
        S.boxes.splice(ix, 1);
        let prizes = R.roll(S, type);
        if (opt.rig && bi === 0) { const id = R.LIST.filter(x => x.r === opt.rig && !x.x)[0].id; prizes[prizes.length - 1] = { t: "item", id, r: opt.rig, ...(opt.rig === "u" ? { need: "claim" } : {}) }; } // דמו בלבד
        // אולטרה אגדי – השרת מאשר (כמות מוגבלת). לא אושר → אגדי רגיל במקום
        for (const p of prizes) if (p.need === "claim") { const ok = await claim(p.id); if (!ok) Object.assign(p, R.guaranteed(S, "l"), { need: undefined }); }
        const got = prizes.map(p => R.grant(S, p)); save();
        all.push(...got);
        const skip = await boxScene(d, type, got, list.length - bi - 1);
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
  // סצנה של תיבה אחת: 3 לחיצות (הצבע "עולה דרגה" לפי הפרס הכי נדיר), פיצוץ, ואז כרטיס לכל פרס. מחזיר true אם דילגו
  async function boxScene(d, type, got, left) {
    const B = R.BOX[type], top = got.filter(g => g.t === "item").reduce((m, g) => Math.max(m, R.RAR[g.r].o), -1);
    const steps = [B.col, top >= 2 ? RC(R.RK[Math.min(top, 3)]) : B.col, top >= 0 ? RC(R.RK[top]) : B.col];
    d.innerHTML = `<div class="ro" style="--rc:${B.col}"><div class="ro-rays"></div><div class="ro-flash"></div>${left ? `<div class="ro-left">עוד ${left} 📦</div>` : ""}<button class="ro-skip" type="button">דלג ⏭</button>
      <div class="ro-box">${B.em}</div><div class="ro-hint">לחץ על התיבה!</div><div class="ro-taps"><i></i><i></i><i></i></div></div>`;
    const ro = d.querySelector(".ro"), box = d.querySelector(".ro-box"), taps = d.querySelectorAll(".ro-taps i");
    let skipped = false; d.querySelector(".ro-skip").onclick = e => { e.stopPropagation(); skipped = true; ro.click(); };
    for (let i = 0; i < 3 && !skipped; i++) {
      await waitTap(ro); if (skipped) break;
      ro.style.setProperty("--rc", steps[i]); taps[i].classList.add("on"); box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); vib(i === 2 ? [30, 40, 60] : 25);
      if (i === 2) ro.classList.add("lit");
      d.querySelector(".ro-hint").textContent = i === 0 ? "עוד!" : i === 1 ? "עוד אחד!!" : "";
    }
    if (skipped) return true;
    box.classList.add("boom"); d.querySelector(".ro-flash").classList.add("go"); particles(ro, steps[2], 30); await sleep(480);
    for (let i = 0; i < got.length; i++) {
      const g = got[i]; if (await revealOne(d, g, got.length - i - 1)) return true;
    }
    return false;
  }
  async function revealOne(d, g, more) {
    const r = g.t === "item" ? g.r : null, col = r ? RC(r) : g.t === "box" ? R.BOX[g.box].col : "#94a3b8";
    // אולטרה אגדי: מסך שחור, דופק, ואז הפיצוץ הגדול
    if (r === "u") {
      d.innerHTML = `<div class="ro"><div class="ro-ultra"><div style="font-size:70px;animation:rBeat .5s infinite">⚡</div><b>אולטרה אגדי!!!</b></div></div>`; vib([80, 60, 80, 60, 200]); await sleep(1900);
    }
    let inner;
    if (g.t === "item") {
      const it = R.ITEMS[g.id];
      inner = `<div class="ro-rar">${R.RAR[r].n}${r === "u" ? " 👑" : r === "l" ? " ⭐" : ""}</div><div class="ro-pv">${preview(g.id, false)}</div><div class="ro-nm">${esc(it.n)}</div><div class="ro-sub">${g.dup ? `כבר יש לך → <b>+${g.dup} 🔩</b>` : "✨ חדש באוסף!"}</div>`;
    } else if (g.t === "bolts") inner = `<div class="ro-big">🔩</div><div class="ro-nm">+${g.n} ברגים</div><div class="ro-sub">אפשר לקנות בהם תיבות בחנות</div>`;
    else inner = `<div class="ro-big">${R.BOX[g.box].em}</div><div class="ro-nm">עוד תיבה!</div><div class="ro-sub">${R.BOX[g.box].n} – נפתחת מיד אחרי</div>`;
    d.innerHTML = `<div class="ro lit" style="--rc:${col}"><div class="ro-rays"></div><div class="ro-flash go"></div>${more ? `<div class="ro-left">עוד ${more}</div>` : ""}<button class="ro-skip" type="button">דלג ⏭</button>
      <div class="ro-card"><div class="ro-in" style="--c:${col}">${inner}</div></div><div class="ro-tap">לחץ להמשך</div></div>`;
    const ro = d.querySelector(".ro"); let skipped = false;
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

  // ---------- רצף כניסות יומי ----------
  async function daily(force) {
    if (!profile()) return;
    const c = R.checkIn(S); if (!c && !force) return; save();
    const d = dlg("roboDay"); d.dataset.lock = "1";
    if (c && c.broken) {
      const cost = R.saveCost(c.broken.n), can = S.bolts >= cost;
      d.innerHTML = `<div class="rd brk"><div class="rd-fl">🔥</div><div class="rd-t">💔 הרצף של ${c.broken.n} ימים נשבר</div><div class="rd-s">לא נכנסת ביום חול אחד או יותר.<br>${can ? `אפשר להציל אותו עכשיו ב-${cost} ברגים 🔩 (יש לך ${S.bolts})` : `כדי להציל צריך ${cost} ברגים 🔩 – יש לך ${S.bolts}. מתחילים מחדש, בפעם הבאה יותר!`}</div>
        <div class="rd-btns" style="margin-top:22px">${can ? `<button class="rbtn" type="button" id="rdSave">🔩 להציל את הרצף (${cost})</button>` : ""}<button class="rbtn alt" type="button" id="rdNew">להתחיל רצף חדש</button></div></div>`;
      show(d);
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
    await new Promise(res => d.querySelector("#rdGo").onclick = res);
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
    const pr = R.progress(S), nb = S.boxes.length, b = R.best(S);
    el.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><button type="button" id="rhBot" style="width:86px;height:86px;flex:0 0 86px;border:0;border-radius:24px;cursor:pointer;background:${(SK[S.eq.skin] || {}).bg || DEF_BG};box-shadow:0 8px 20px rgba(0,0,0,.3)">${svg()}</button>
      <div style="flex:1;min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:800"><span>🔥 רצף ${S.st.n}</span><span>🔩 ${S.bolts}</span><span>🏆 ${pr.have}/${pr.all}</span></div>
      ${b && R.RAR[b.r].o >= 2 ? `<div style="font-size:12px;margin-top:4px;opacity:.85">הכי נדיר: ${esc(b.n)} ${rarTag(b.r)}</div>` : `<div style="font-size:12px;margin-top:4px;opacity:.8">פתח תיבות ותלביש את הרובוט שלך!</div>`}</div></div>
      <div class="pf-acts" style="margin-top:10px"><button type="button" class="primary" id="rhWear">👕 הארון שלי</button><button type="button" class="ghost" id="rhBox" style="${nb ? "background:linear-gradient(135deg,#facc15,#f97316);color:#1a1040;font-weight:900" : ""}">🎁 ${nb ? `לפתוח תיבות (${nb})` : "תיבות"}</button><button type="button" class="ghost" id="rhShop">🛒 חנות</button><button type="button" class="ghost" id="rhShare">📸 לחברים</button></div>`;
    el.querySelector("#rhBot").onclick = () => open("wear"); el.querySelector("#rhWear").onclick = () => open("wear");
    el.querySelector("#rhBox").onclick = () => nb ? openBoxes(S.boxes.slice()) : open("boxes"); el.querySelector("#rhShop").onclick = () => open("shop"); el.querySelector("#rhShare").onclick = share;
  }

  // ---------- הפעלה ----------
  window.Robo = {
    svg, open, hub, share, subjectMile, daily, openBoxes, state: () => S, owns: id => !!S.own[id],
    give(p) { const x = R.grant(S, p); save(); hubRefresh(); return x; }, // דמו / בדיקות
    reload() { S = load(); applyBubble(); try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {} },
    status: () => `🔥 ${S.st.n} · 🔩 ${S.bolts}${S.boxes.length ? ` · 🎁 ${S.boxes.length}` : ""}`,
  };
  try { dispatchEvent(new CustomEvent("robo:change")); } catch (e) {}
  const boot = () => {
    applyBubble(); setTimeout(applyBubble, 1500);
    // רצף כניסות: בפתיחה הראשונה של היום, כשלא באמצע משהו (אשף, חלון, אנימציה)
    tries = 0;
    // לא בפעם הראשונה (אשף + היכרות), לא באמצע שיחה עם העוזר / כתיבה / לחיצות, ולא אצל הרובוטים של הבדיקות (חוץ מהבדיקה של הרובוט)
    if (navigator.webdriver && !LS.get("roboTest", "")) return;
    const busy = () => !profile() || !LS.get("introSeen", "") || Date.now() - lastTouch < 3500 || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) || !!document.querySelector("dialog[open],#fx,#recap,.upd-pop,#suspWall,#asstP:not([hidden]),.asst-finger") || (document.getElementById("wiz") && !document.getElementById("wiz").hidden) || (document.getElementById("intro") && !document.getElementById("intro").hidden) || (document.getElementById("build") && !document.getElementById("build").hidden) || document.documentElement.classList.contains("susp-pre");
    let calm = 0; // צריך שתי בדיקות רצופות "פנוי" (כדי לא לקפוץ רגע לפני "מה חדש" וכו')
    tick = () => { if (S.st.last === R.ymd(Date.now())) return; if (busy()) { calm = 0; if (++tries < 120) setTimeout(tick, 2000); return; } if (++calm < 2) { setTimeout(tick, 1500); return; } daily(); };
    setTimeout(tick, page === "index" ? 3500 : 2000);
  };
  let tick = () => {}, tries = 0, lastTouch = 0;
  for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true, capture: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  // ניווט "חזור" / חזרה לאפליקציה ביום חדש
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.st.last !== R.ymd(Date.now())) { S = load(); setTimeout(() => tick(), 1200); } });
})();
