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
  };
  const BIG = 1.15; // כמה מגדילים בטקסט גדול
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const st = document.createElement("style"); st.id = "themeStyle";
  function apply() {
    const t = THEMES[get("uiTheme", "purple")] || THEMES.purple, big = get("uiBig", "") === "1";
    // :root:root גובר על ה-:root של כל עמוד, בלי קשר לסדר
    st.textContent = (t === THEMES.purple ? "" : `:root:root{--grad:${t.grad};--accent:${t.dark}}
@media (prefers-color-scheme: light){:root:root{--accent:${t.light}}}`) + (big ? `html{zoom:${BIG}}` : "");
    if (!st.isConnected) (document.head || document.documentElement).appendChild(st);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.meta;
  }
  apply();
  window.Theme = {
    THEMES,
    current: () => get("uiTheme", "purple"),
    setTheme(k) { set("uiTheme", k === "purple" ? null : k); apply(); },
    big: () => get("uiBig", "") === "1",
    setBig(on) { set("uiBig", on ? "1" : null); apply(); },
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
})();
