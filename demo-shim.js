// מצב דמו: פעיל רק כשהדף רץ בתוך demo.html (לוח הבקרה). באתר הרגיל הקובץ הזה לא עושה כלום.
// בדמו: האחסון בטלפון מוחלף באחסון זמני של הדמו, השעון מוזז לפי לוח הבקרה,
// והפניות לשרת (משוב, עדכונים, צוות, הודעת הרשמה) נענות מנתוני דוגמה. שום דבר לא נשמר באתר האמיתי.
(function () {
  let host = null;
  try { if (window.parent !== window && window.parent.__DEMO_HOST) host = window.parent.__DEMO_HOST; } catch (e) {}
  if (!host) return;
  window.__DEMO = true;

  // ---- אחסון: במקום localStorage, אובייקט שחי בלוח הבקרה ----
  const S = host.store;
  const fake = {
    getItem: k => Object.prototype.hasOwnProperty.call(S, k) ? S[k] : null,
    setItem: (k, v) => { S[k] = String(v); },
    removeItem: k => { delete S[k]; },
    clear: () => { for (const k of Object.keys(S)) delete S[k]; },
    key: i => Object.keys(S)[i] ?? null,
    get length() { return Object.keys(S).length; },
  };
  try { Object.defineProperty(window, "localStorage", { configurable: true, get: () => fake }); } catch (e) {}

  // ---- שעון: מוזז לפי הזמן שנבחר בלוח הבקרה ----
  const RealDate = Date;
  const off = () => host.offset || 0;
  class DemoDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off()); }
    static now() { return RealDate.now() + off(); }
  }
  window.Date = DemoDate;

  // ---- שרת: תשובות מנתוני הדמו ----
  const realFetch = window.fetch.bind(window);
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    let body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch (e) {}
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
    await new Promise(r => setTimeout(r, 250)); // כמו רשת אמיתית, כדי שהטעינה תיראה טבעית
    if (/\/api\/mashov/.test(url)) { const r = host.mashov(body); return reply(r.status, r.body); }
    if (/\/api\/updates/.test(url)) { const r = host.updates(init.method || "GET", body); return reply(r.status, r.body); }
    if (/\/api\/feedback/.test(url)) { const r = host.feedback(body); return reply(r.status, r.body); }
    if (/\/api\/feed/.test(url)) { const r = host.feed ? host.feed(init.method || "GET", body) : { status: 404, body: { ok: false } }; return reply(r.status, r.body); }
    if (/\/api\/contacts/.test(url)) { const r = host.contacts ? host.contacts(init.method || "GET", body) : { status: 200, body: { ok: true, contacts: [] } }; return reply(r.status, r.body); }
    if (/\/api\/sets/.test(url)) { const r = host.sets ? host.sets() : { status: 200, body: { ok: true, sets: [] } }; return reply(r.status, r.body); }
    if (/\/api\/staff/.test(url)) { const r = host.staff(init.method || "GET", body, String(auth).replace(/^Bearer\s+/i, "")); return reply(r.status, r.body); }
    if (/web3forms\.com/.test(url)) return reply(200, { success: true });
    return realFetch(input, init);
  };

  // מעדכנים את לוח הבקרה באיזה מסך אנחנו. אחרי הפניה הכתובת בלי ".html" (נטליפיי/שרת מקומי), אז מנרמלים ל-"x.html"
  window.addEventListener("load", () => { try { const f = location.pathname.split("/").pop() || "index"; host.onFrameLoad && host.onFrameLoad(/\.html$/.test(f) ? f : f + ".html"); } catch (e) {} });
})();
