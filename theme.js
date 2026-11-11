// צבע האפליקציה וטקסט גדול: התלמיד בוחר בפרופיל, וזה חל על כל המסכים.
// נטען ב-<head> של כל עמוד (אחרי demo-shim.js), כדי שהצבע ייכנס לפני שהעמוד מצויר.
(function () {
  const THEMES = {
    purple: { name: "סגול", grad: "linear-gradient(135deg,#5b6cff 0%,#a259ff 60%,#ff6bd6 100%)", dark: "#7c8cff", light: "#5b6cff", meta: "#5b6cff" },
    ocean: { name: "ים", grad: "linear-gradient(135deg,#0ea5e9 0%,#2563eb 60%,#4f46e5 100%)", dark: "#38bdf8", light: "#2563eb", meta: "#2563eb" },
    forest: { name: "יער", grad: "linear-gradient(135deg,#10b981 0%,#059669 55%,#0d9488 100%)", dark: "#34d399", light: "#047857", meta: "#059669" },
    sunset: { name: "שקיעה", grad: "linear-gradient(135deg,#f59e0b 0%,#f97316 50%,#ef4444 100%)", dark: "#fb923c", light: "#c2410c", meta: "#f97316" },
    rose: { name: "ורוד", grad: "linear-gradient(135deg,#ec4899 0%,#d946ef 55%,#8b5cf6 100%)", dark: "#f472b6", light: "#be185d", meta: "#d946ef" },
    night: { name: "לילה", grad: "linear-gradient(135deg,#1e293b 0%,#334155 55%,#b45309 100%)", dark: "#fbbf24", light: "#b45309", meta: "#1e293b" },
    // 🤖 עיצובים שזוכים בהם ב"הרובוט שלי" (lock = האביזר שצריך כדי לבחור אותם)
    neon: { name: "ניאון", grad: "linear-gradient(135deg,#0f172a 0%,#06b6d4 55%,#d946ef 100%)", dark: "#22d3ee", light: "#0891b2", meta: "#0f172a", lock: "theme:neon" },
    candy: { name: "סוכרייה", grad: "linear-gradient(135deg,#f472b6 0%,#c084fc 50%,#38bdf8 100%)", dark: "#f472b6", light: "#db2777", meta: "#f472b6", lock: "theme:candy" },
    galaxy: { name: "גלקסיה", grad: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 50%,#db2777 100%)", dark: "#c084fc", light: "#7c3aed", meta: "#1e1b4b", lock: "theme:galaxy" },
    lava: { name: "לבה", grad: "linear-gradient(135deg,#1c1917 0%,#b91c1c 50%,#f97316 100%)", dark: "#fb923c", light: "#c2410c", meta: "#1c1917", lock: "theme:lava" },
    aurora: { name: "זוהר צפוני", grad: "linear-gradient(135deg,#022c22 0%,#059669 40%,#6366f1 75%,#ec4899 100%)", dark: "#34d399", light: "#047857", meta: "#022c22", lock: "theme:aurora" },
    ocean: { name: "אוקיינוס עמוק", grad: "linear-gradient(135deg,#082f49 0%,#0369a1 50%,#06b6d4 100%)", dark: "#22d3ee", light: "#0369a1", meta: "#082f49", lock: "theme:ocean" },
    pinksun: { name: "שקיעה ורודה", grad: "linear-gradient(135deg,#831843 0%,#db2777 45%,#fb923c 100%)", dark: "#f472b6", light: "#be185d", meta: "#831843", lock: "theme:pinksun" },
    forest: { name: "יער בלילה", grad: "linear-gradient(135deg,#052e16 0%,#166534 50%,#65a30d 100%)", dark: "#4ade80", light: "#15803d", meta: "#052e16", lock: "theme:forest" },
    rainbow: { name: "קשת בענן", grad: "linear-gradient(135deg,#dc2626 0%,#f59e0b 25%,#16a34a 50%,#2563eb 75%,#9333ea 100%)", dark: "#a78bfa", light: "#7c3aed", meta: "#2563eb", lock: "theme:rainbow" },
    mint: { name: "מנטה", grad: "linear-gradient(135deg,#065f46 0%,#10b981 50%,#a7f3d0 100%)", dark: "#34d399", light: "#047857", meta: "#065f46", lock: "theme:mint" },
    cherry: { name: "דובדבן", grad: "linear-gradient(135deg,#4c0519 0%,#be123c 50%,#fb7185 100%)", dark: "#fb7185", light: "#be123c", meta: "#4c0519", lock: "theme:cherry" },
    space: { name: "חלל עמוק", grad: "linear-gradient(135deg,#020617 0%,#1e1b4b 50%,#7c3aed 100%)", dark: "#a78bfa", light: "#6d28d9", meta: "#020617", lock: "theme:space" },
    hero: { name: "גיבורים", grad: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 45%,#facc15 100%)", dark: "#facc15", light: "#b91c1c", meta: "#7f1d1d", lock: "theme:hero" },
    gold: { name: "זהב", grad: "linear-gradient(135deg,#78350f 0%,#d97706 40%,#facc15 70%,#a16207 100%)", dark: "#facc15", light: "#a16207", meta: "#78350f", lock: "theme:gold" },
    sunrise: { name: "זריחה", grad: "linear-gradient(135deg,#fde68a 0%,#fb923c 50%,#f43f5e 100%)", dark: "#fb923c", light: "#c2410c", meta: "#fb923c", lock: "theme:sunrise" },
    midnight: { name: "חצות", grad: "linear-gradient(135deg,#020617 0%,#1e293b 50%,#0ea5e9 100%)", dark: "#38bdf8", light: "#0369a1", meta: "#020617", lock: "theme:midnight" },
    emerald: { name: "אזמרגד", grad: "linear-gradient(135deg,#022c22 0%,#047857 50%,#34d399 100%)", dark: "#34d399", light: "#047857", meta: "#022c22", lock: "theme:emerald" },
    royal: { name: "מלכותי", grad: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 50%,#facc15 100%)", dark: "#c4b5fd", light: "#6d28d9", meta: "#1e1b4b", lock: "theme:royal" },
    // 💎 אולטרה אגדי – רק 3 בכל הישיבה: הכל זהב טהור נוצץ, הכפתורים יהלומים זוהרים
    goldx: { name: "זהב ויהלומים 💎", grad: "linear-gradient(120deg,#5c3a00 0%,#b8860b 18%,#fff2a8 35%,#d4a017 50%,#fff7c2 65%,#b8860b 82%,#5c3a00 100%)", dark: "#facc15", light: "#a16207", meta: "#1a1200", lock: "theme:goldx", fx: "gold" },
    legend: { name: "אגדי 👑", grad: "linear-gradient(135deg,#000000 0%,#7f1d1d 45%,#facc15 100%)", dark: "#facc15", light: "#b91c1c", meta: "#000000", lock: "theme:legend" },
  };
  // עיצוב לעמוד אחד (מ"הרובוט שלי"): { calc: { id, grad } }
  const PG = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  const pageGrad = () => { try { const m = JSON.parse(localStorage.getItem("roboPage") || "{}"); const g = m && m[PG] && m[PG].grad; return typeof g === "string" && /^linear-gradient\([#0-9a-z%,. ()-]+\)$/i.test(g) ? g : ""; } catch (e) { return ""; } };
  const BIG = 1.15; // כמה מגדילים בטקסט גדול
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const st = document.createElement("style"); st.id = "themeStyle";
  // ✨ עיצוב זהב ויהלומים: רקע זהב-שחור, כותרות זהב נוצץ שזז, כפתורים כמו יהלומים זוהרים, ונצנוצים על המסך
  const GOLD_CSS = `:root:root{--bg:#0d0a02;--bg2:#17120a;--card:#1c160a;--line:#5c4813;--muted:#d6c08a;--ink:#fff8dc;--accent-ink:#1a1200;--next:#3a2c06;--break:#241c08}
@media (prefers-color-scheme: light){:root:root{--bg:#fbf6e6;--bg2:#fffdf5;--card:#fffdf5;--line:#ead9a5;--ink:#2b1d00;--muted:#8a6d2a;--accent-ink:#fff;--next:#fff3c4;--break:#f6edd0}}
html,body{background:radial-gradient(120% 60% at 50% 0%,color-mix(in srgb,#facc15 14%,var(--bg)),var(--bg) 60%) fixed!important}
.top,.tile.big,.btn.smart,#intro,#wiz,#build,.toast{background-size:300% 300%!important;animation:gxShine 7s linear infinite;color:#1a1200!important;text-shadow:0 1px 0 rgba(255,255,255,.45)}
.top{box-shadow:0 12px 34px rgba(212,160,23,.45),inset 0 -2px 0 rgba(255,255,255,.35)!important;border-bottom:2px solid #fff2a8}
.top *{color:inherit}
@keyframes gxShine{0%{background-position:0% 50%}100%{background-position:300% 50%}}
:is(.actions>*,button.primary,a.primary,.btn.primary,.pf-acts>button){background:linear-gradient(135deg,#e0f7ff 0%,#a5f3fc 22%,#ffffff 45%,#93c5fd 65%,#e0e7ff 85%,#ffffff 100%)!important;background-size:250% 250%!important;color:#0b1b3a!important;border:1.5px solid #ffffff!important;box-shadow:0 0 0 1px rgba(56,189,248,.5),0 0 14px rgba(125,211,252,.75),inset 0 1px 0 #fff!important;animation:gxDiamond 3.2s ease-in-out infinite;font-weight:800}
@keyframes gxDiamond{0%,100%{background-position:0% 50%;box-shadow:0 0 0 1px rgba(56,189,248,.5),0 0 12px rgba(125,211,252,.6),inset 0 1px 0 #fff}50%{background-position:100% 50%;box-shadow:0 0 0 1px rgba(56,189,248,.8),0 0 22px rgba(165,243,252,1),inset 0 1px 0 #fff}}
#gxFx{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
#gxFx i{position:absolute;width:10px;height:10px;font-style:normal;background:radial-gradient(circle,#fff 0 18%,transparent 19%),conic-gradient(from 45deg,transparent 0 20%,#fff7c2 22% 28%,transparent 30% 45%,#fff7c2 47% 53%,transparent 55% 70%,#fff7c2 72% 78%,transparent 80%);animation:gxTw 2.6s ease-in-out infinite;opacity:0}
@keyframes gxTw{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:.75;transform:scale(1.2) rotate(45deg)}}
@media (prefers-reduced-motion: reduce){.top,.tile.big,:is(.actions>*,button.primary),#gxFx i{animation:none!important}}`;
  function gxFx(on) {
    const go = () => { let f = document.getElementById("gxFx"); if (!on) { if (f) f.remove(); return; } if (f || !document.body) return;
      f = document.createElement("div"); f.id = "gxFx"; f.setAttribute("aria-hidden", "true");
      f.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="left:${(i * 37 + 7) % 96}%;top:${(i * 53 + 11) % 94}%;animation-delay:${((i * .41) % 2.6).toFixed(2)}s;width:${8 + (i % 3) * 4}px;height:${8 + (i % 3) * 4}px"></i>`).join("");
      document.body.appendChild(f); };
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }
  // 🌗 מצב תצוגה: "" = לפי הטלפון · light = תמיד בהיר · dark = תמיד כהה · time = בהיר ביום (06:30–18:00), כהה בלילה
  // הדפים כתובים עם @media (prefers-color-scheme: …) – כאן "מדליקים" או "מכבים" את הכללים האלה לפי הבחירה
  const wantMode = () => { const m = get("uiMode", ""); if (m === "light" || m === "dark") return m; if (m === "time") { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return h >= 6.5 && h < 18 ? "light" : "dark"; } return null; };
  function applyMode() {
    const want = wantMode();
    const walk = rules => { for (const r of rules) { if (r.media && r.cssRules) { const t = r.__o || r.media.mediaText; if (/prefers-color-scheme/.test(t)) { if (!r.__o) r.__o = t; const isL = /light/.test(t), nt = want == null ? r.__o : (want === (isL ? "light" : "dark") ? "all" : "not all"); if (r.media.mediaText !== nt) try { r.media.mediaText = nt; } catch (e) {} } else walk(r.cssRules); } } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
    try { document.documentElement.style.colorScheme = want || ""; document.documentElement.dataset.mode = want || "auto"; } catch (e) {}
  }
  const FONTS = { round: 'ui-rounded,"SF Pro Rounded","Varela Round",Rubik,system-ui,sans-serif', classic: 'Arial,"Segoe UI",Helvetica,sans-serif', bold: "Rubik,system-ui,sans-serif" };
  function apply() {
    const t = THEMES[get("uiTheme", "purple")] || THEMES.purple, big = get("uiBig", "") === "1", font = get("uiFont", ""), calm = get("uiCalm", "") === "1";
    // :root:root גובר על ה-:root של כל עמוד, בלי קשר לסדר
    const pg = pageGrad();
    st.textContent = (t === THEMES.purple ? "" : `:root:root{--grad:${t.grad};--accent:${t.dark}}
@media (prefers-color-scheme: light){:root:root{--accent:${t.light}}}`) + (t.fx === "gold" ? GOLD_CSS : "") + (pg ? `:root:root{--grad:${pg}}` : "") + (big ? `html{zoom:${BIG}}` : "")
      + (FONTS[font] ? `html,body,button,input,select,textarea{font-family:${FONTS[font]}!important}${font === "bold" ? "body{font-weight:500}b,strong,h1,h2,h3{font-weight:900!important}" : ""}` : "")
      + (calm ? "*,*::before,*::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}" : "");
    gxFx(t.fx === "gold");
    if (!st.isConnected) (document.head || document.documentElement).appendChild(st);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.meta;
    applyMode();
  }
  apply();
  document.addEventListener("DOMContentLoaded", applyMode); addEventListener("load", applyMode);
  setInterval(() => { if (get("uiMode", "") === "time") applyMode(); }, 60000);
  try { new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.tagName === "STYLE" || n.tagName === "LINK"))) applyMode(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  window.Theme = {
    THEMES,
    current: () => get("uiTheme", "purple"),
    setTheme(k) { set("uiTheme", k === "purple" ? null : k); apply(); },
    big: () => get("uiBig", "") === "1",
    setBig(on) { set("uiBig", on ? "1" : null); apply(); },
    mode: () => get("uiMode", ""), setMode(m) { set("uiMode", ["light", "dark", "time"].includes(m) ? m : null); apply(); }, isDark: () => { const w = wantMode(); return w ? w === "dark" : !matchMedia("(prefers-color-scheme: light)").matches; },
    font: () => get("uiFont", ""), setFont(f) { set("uiFont", FONTS[f] ? f : null); apply(); },
    calm: () => get("uiCalm", "") === "1", setCalm(on) { set("uiCalm", on ? "1" : null); apply(); },
  };
  // מסמך שנטען לפני שה-<head> מוכן: מוודאים שהעיצוב נשאר אחרון
  document.addEventListener("DOMContentLoaded", () => { if (st.nextSibling) document.head.appendChild(st); });

  // ---- בלי זום: כמו אפליקציה אמיתית (מי שצריך – "טקסט גדול" בפרופיל) ----
  // touch-action:manipulation מבטל הגדלה בהקשה כפולה בלי לגעת בגלילה, בהחלקות ובלחיצות מהירות.
  // אנדרואיד מכבד user-scalable=no; אייפון מתעלם ממנו, אז שם חוסמים גם את מחוות הצביטה
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const ns = document.createElement("style");
  ns.textContent = "html{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}" +
    // ⛔ השעיה: עד שהמחסום נבנה (בעמוד הראשי) לא מציירים את האפליקציה מתחתיו
    "html.susp-pre,html.susp-pre body{background:#0b0612!important}html.susp-pre body>:not(#suspWall){visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(ns);
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  // מאזין שחוסם גלילה רק באייפון (באנדרואיד/מחשב הוא היה מאט את הגלילה בכל העמוד בלי צורך)
  if (IOS) document.addEventListener("touchmove", e => { if (e.cancelable && e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // אייפון מגדיל את המסך כשנכנסים לשדה כתיבה עם טקסט קטן מ-16px – מגדילים רק את השדה הזה (לא צ'קבוקסים/כפתורים)
  const TXT = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=color]):not([type=file]):not([type=image]),select,textarea';
  const bump = e => { const t = e.target && e.target.closest && e.target.closest(TXT); if (t && parseFloat(getComputedStyle(t).fontSize) < 16) t.style.fontSize = "16px"; };
  if (IOS) { document.addEventListener("touchstart", bump, { passive: true, capture: true }); document.addEventListener("focusin", bump, true); }

  // ---- ⛔ השעיה ממנהל המערכת: נבדק כבר כאן, לפני שהעמוד מצויר ----
  // בעמוד הראשי – מסתירים עד שהמחסום עולה (index.html → applyCtl). בשאר העמודים של התלמיד – חוזרים לעמוד הראשי (למחסום)
  function suspCheck(again) {
    try {
      let c = null; try { c = JSON.parse(get("appCtl", "") || "null"); } catch (e) {}
      const s = c && typeof c === "object" ? c.susp : null, pg = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
      if (!window.__DEMO && s && typeof s === "object" && (s.until == null || +s.until > Date.now())) {
        if (pg === "index") { if (!again) document.documentElement.classList.add("susp-pre"); }
        // קישור של הורה (parent.html, או חתימה בשחרורון #p=) נפתח גם בטלפון של תלמיד מושעה – לא חוסמים
        else if (/^(about|absences|calc|cards|phones|shichrur)$/.test(pg) && !(pg === "shichrur" && /^#p=/.test(location.hash))) location.replace("./");
      }
    } catch (e) {}
  }
  suspCheck();
  // חזרה לעמוד מהזיכרון של הדפדפן (כפתור "חזור") – בודקים שוב
  window.addEventListener("pageshow", e => { if (e && e.persisted) suspCheck(true); });

  // ---- תקלות: שגיאה בטלפון של תלמיד נשלחת לדף מנהל המערכת (בלי מידע אישי מעבר לשם וכיתה) ----
  // לא נשלח: בדמו, יותר מ-5 בעמוד, אותה תקלה יותר מפעם ביום, ו"רעש" שאינו תקלה שלנו (רשת, תוספים, דפדפנים בתוך אפליקציות, הפעלת סרטון)
  const NOISE = /ResizeObserver loop|extension:\/\/|webkit-masked-url|user-script:|AbortError|NotAllowedError|NetworkError|Failed to fetch|Load failed|network connection was lost|^(Uncaught )?(TypeError: )?cancelled$|The operation was aborted|play\(\) (request|failed)|user didn't interact|not allowed by the user agent|__gCrWeb|webkit\.messageHandlers|_AutofillCallbackHandler|instantSearchSDKJSBridge|Java object is gone|^\[object (Event|ProgressEvent)\]$/i;
  let sent = 0, busy = false;
  const errSeen = day => { let s = null; try { s = JSON.parse(get("errSent", "") || "null"); } catch (e) {} return s && typeof s === "object" && s.day === day && Array.isArray(s.s) ? s : { day, s: [] }; };
  function report(msg, src) {
    if (busy) return; busy = true; // תקלה בתוך הדיווח עצמו לא מדווחת שוב
    try {
      msg = String(msg || "").slice(0, 300); src = String(src || "").slice(0, 200);
      if (!msg || window.__DEMO || sent >= 5 || /^(Uncaught )?Script error\.?$/i.test(msg) || NOISE.test(msg) || NOISE.test(src)) return;
      const day = new Date().toDateString(), seen = errSeen(day), sig = msg + "|" + src;
      if (seen.s.includes(sig)) return; // אותה תקלה נשלחת פעם אחת ביום
      seen.s = [...seen.s, sig].slice(-30); set("errSent", JSON.stringify(seen)); sent++;
      // לא הגיע לשרת (אין קליטה) – מותר לנסות שוב בפעם הבאה
      const unmark = () => { const x = errSeen(day); x.s = x.s.filter(v => v !== sig); set("errSent", JSON.stringify(x)); };
      let p = {}; try { p = JSON.parse(get("profile", "{}")) || {}; } catch (e) {}
      if (typeof p !== "object") p = {};
      const u = navigator.userAgent || "", plat = (/iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "Mac" : "אחר") + (/CriOS|Chrome\//.test(u) && !/EdgA?\//.test(u) ? " · Chrome" : /Safari\//.test(u) && !/Chrome|CriOS/.test(u) ? " · Safari" : "");
      const base = (typeof SERVER_BASE !== "undefined" ? SERVER_BASE : (location.port === "8790" ? "" : "https://lucent-crepe-6db22c.netlify.app")) || "";
      const body = JSON.stringify({ action: "err", msg, src: src.replace(location.origin, ""), page: (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index",
        ver: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "", plat, device: get("deviceId", ""), name: `${p.first || ""} ${p.last || ""}`.trim(), cls: typeof p.cls === "string" ? p.cls : "" });
      fetch(base + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(unmark);
    } catch (e) {} finally { busy = false; }
  }
  window.addEventListener("error", e => { try { if (e && e.message) report(e.message, `${e.filename || ""}:${e.lineno || 0}:${e.colno || 0}`); } catch (x) {} });
  window.addEventListener("unhandledrejection", e => { try { const r = e && e.reason; report(r && (r.name === "AbortError" || r.name === "NotAllowedError" ? "" : r.message || String(r)), r && r.stack ? String(r.stack).split("\n")[1] || "" : "promise"); } catch (x) {} });
  window.reportError2 = report; // לבדיקות
  // 🎉 מצב חג: לוח החגים + העיצוב של כל חג (holidays.js). נטען בסדר, בלי לעכב את העמוד
  try { for (const src of ["holidays-core.js", "holidays.js", "robo-core.js", "robo.js", "robo-plus.js", "robo-run.js", "robo-fest.js"]) { const s = document.createElement("script"); s.src = src; s.async = false; (document.head || document.documentElement).appendChild(s); } } catch (e) {}
  // 🔄 עדכון שקט: בודקים גרסה חדשה בכל פתיחה, כל 2 דקות ובכל חזרה לאפליקציה.
  // כשהיא מוכנה – מחליפים בלי שירגישו: כשהאפליקציה ברקע, או אחרי 30 שניות בלי מגע (לא באמצע כתיבה/חלון),
  // וחוזרים לאותו מקום במסך
  if ("serviceWorker" in navigator && !window.__DEMO) {
    const check = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
    addEventListener("load", () => setTimeout(check, 4000));
    setInterval(() => { if (!document.hidden) check(); }, 2 * 60e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    let had = !!navigator.serviceWorker.controller, pending = false, lastTouch = Date.now();
    for (const ev of ["pointerdown", "keydown", "scroll", "touchstart"]) addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true, capture: true });
    const busy = () => !!document.querySelector("dialog[open],#fx,#recap,#delFx:not([hidden]),#asstP:not([hidden])") || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) || !!(document.getElementById("wiz") && !document.getElementById("wiz").hidden);
    const reload = () => {
      try { const t = +sessionStorage.getItem("swReloadAt") || 0; if (Date.now() - t < 60000) return; sessionStorage.setItem("swReloadAt", String(Date.now())); sessionStorage.setItem("softPos", JSON.stringify({ y: scrollY, at: Date.now(), path: location.pathname + location.hash })); } catch (e) {}
      location.reload();
    };
    const tryApply = () => { if (!pending) return; if (document.hidden || (!busy() && Date.now() - lastTouch > 30000)) { pending = false; reload(); } };
    window.SoftUpdate = { request() { pending = true; tryApply(); } };
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!had) { had = true; return; } pending = true; tryApply(); });
    document.addEventListener("visibilitychange", tryApply);
    setInterval(tryApply, 5000);
    // אחרי עדכון שקט – חוזרים לאותו מקום במסך
    try { const sp = JSON.parse(sessionStorage.getItem("softPos") || "null"); if (sp && Date.now() - sp.at < 20000 && sp.path === location.pathname + location.hash) { sessionStorage.removeItem("softPos"); addEventListener("load", () => setTimeout(() => scrollTo(0, sp.y), 60)); } } catch (e) {}
  }
})();
