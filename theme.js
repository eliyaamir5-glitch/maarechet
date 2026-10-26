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
  // אייפון מתעלם מ-user-scalable=no, אז חוסמים גם את מחוות הצביטה והקשה כפולה
  const ns = document.createElement("style");
  ns.textContent = "html{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}";
  (document.head || document.documentElement).appendChild(ns);
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  document.addEventListener("touchmove", e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // אייפון מגדיל את המסך כשנכנסים לשדה עם טקסט קטן מ-16px – מגדילים רק את השדה הזה
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
    document.addEventListener("touchstart", e => { const t = e.target && e.target.closest && e.target.closest("input,select,textarea"); if (t && parseFloat(getComputedStyle(t).fontSize) < 16) t.style.fontSize = "16px"; }, { passive: true, capture: true });

  // ---- תקלות: שגיאה בטלפון של תלמיד נשלחת לדף מנהל המערכת (בלי מידע אישי מעבר לשם וכיתה) ----
  let sent = 0;
  function report(msg, src) {
    try {
      msg = String(msg || "").slice(0, 300); src = String(src || "").slice(0, 200);
      if (!msg || window.__DEMO || sent >= 5 || /^Script error\.?$/i.test(msg) || /ResizeObserver loop|extension:\/\/|^AbortError|NetworkError|Failed to fetch|Load failed/i.test(msg + " " + src)) return;
      const day = new Date().toDateString(), key = "errSent", seen = JSON.parse(get(key, "{}") || "{}"), sig = msg + "|" + src;
      if (seen.day !== day) { seen.day = day; seen.s = []; }
      if (!Array.isArray(seen.s)) seen.s = [];
      if (seen.s.includes(sig)) return; // אותה תקלה נשלחת פעם אחת ביום
      seen.s = [...seen.s, sig].slice(-30); set(key, JSON.stringify(seen)); sent++;
      let p = {}; try { p = JSON.parse(get("profile", "{}")) || {}; } catch (e) {}
      const u = navigator.userAgent || "", plat = (/iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "Mac" : "אחר") + (/CriOS|Chrome\//.test(u) && !/EdgA?\//.test(u) ? " · Chrome" : /Safari\//.test(u) && !/Chrome|CriOS/.test(u) ? " · Safari" : "");
      const base = (typeof SERVER_BASE !== "undefined" ? SERVER_BASE : (location.port === "8790" ? "" : "https://lucent-crepe-6db22c.netlify.app")) || "";
      const body = JSON.stringify({ action: "err", msg, src: src.replace(location.origin, ""), page: (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index",
        ver: typeof APP_VERSION !== "undefined" ? APP_VERSION : "", plat, device: get("deviceId", ""), name: `${p.first || ""} ${p.last || ""}`.trim(), cls: p.cls || "" });
      fetch(base + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  window.addEventListener("error", e => { if (e && e.message) report(e.message, `${e.filename || ""}:${e.lineno || 0}:${e.colno || 0}`); });
  window.addEventListener("unhandledrejection", e => { const r = e && e.reason; report(r && (r.message || String(r)), r && r.stack ? String(r.stack).split("\n")[1] || "" : "promise"); });
  window.reportError2 = report; // לבדיקות
})();
