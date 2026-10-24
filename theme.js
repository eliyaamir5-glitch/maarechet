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
})();
