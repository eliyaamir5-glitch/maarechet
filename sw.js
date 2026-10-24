// Service Worker: מאפשר לאפליקציה להיפתח גם בלי אינטרנט.
// אסטרטגיה: קודם רשת ואם אין – מהמטמון (כך עדכונים מגיעים מיד כשיש קליטה).
// לפונטים של גוגל: קודם מטמון, כי הם לא משתנים.
const CACHE = "maarechet-v30";
const PRECACHE = ["./", "./index.html", "./data.js", "./shichrur.html", "./cards.html", "./sets.js", "./card-editor.js", "./calc.html", "./parent.html", "./theme.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./phones.html", "./calc-engine.js", "./board.js", "./mashov.js", "./absences.js", "./absences.html", "./timetable-image.js", "./about.html", "./updates.js", "./demo-shim.js", "./staff.html", "./mashov-schools.json"];

// בנטליפיי (ובשרת המקומי) x.html מופנה ל-x. תשובה שעברה הפניה אסור להחזיר לניווט,
// אז שומרים עותק "נקי" (בלי סימון ההפניה), כדי שגם עמוד שלא נפתח עם אינטרנט ייפתח בלי אינטרנט
const fresh = async res => res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(async u => {
    const res = await fresh(await fetch(u, { cache: "reload" }));
    if (!res.ok) throw new Error("precache failed: " + u);
    // נשמר גם תחת x.html וגם תחת הכתובת הנקייה x
    await Promise.all([c.put(u, res.clone()), ...(/\.html$/.test(u) ? [c.put(u.replace(/\.html$/, ""), res.clone())] : [])]);
  }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // קובצי יומן נמשכים ע"י אפליקציית היומן, לא דרכנו – לא נוגעים
  if (url.pathname.endsWith(".ics")) return;
  // קריאות שרת (משוב) – תמיד ישר לרשת
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;
  // סרטונים: הדפדפן מבקש אותם בחלקים (Range), אז לא נוגעים ולא שומרים במטמון
  if (url.pathname.includes("/media/")) return;

  // פונטים: מטמון קודם
  if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com") || url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res;
      }))
    );
    return;
  }

  // שאר הקבצים שלנו: רשת קודם, מטמון כגיבוי
  if (url.origin === location.origin) {
    const nav = req.mode === "navigate";
    e.respondWith(
      (nav ? fetch(req) : fetch(req, { cache: "no-cache" })).then(res => { // קבצים: תמיד הגרסה הכי חדשה מהשרת (ניווט נשאר רגיל, בגלל הפניות)
        if (res.ok) { const copy = res.clone(); fresh(copy).then(r => caches.open(CACHE).then(c => c.put(req, r))).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req, nav ? { ignoreSearch: true } : undefined).then(hit => hit || (nav ? caches.match("./index.html") : undefined)))
    );
  }
});
