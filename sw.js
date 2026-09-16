// Service Worker: מאפשר לאפליקציה להיפתח גם בלי אינטרנט.
// אסטרטגיה: קודם רשת ואם אין – מהמטמון (כך עדכונים מגיעים מיד כשיש קליטה).
// לפונטים של גוגל: קודם מטמון, כי הם לא משתנים.
const CACHE = "maarechet-v1";
const PRECACHE = ["./", "./index.html", "./data.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
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

  // פונטים: מטמון קודם
  if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
    return;
  }

  // שאר הקבצים שלנו: רשת קודם, מטמון כגיבוי
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
    );
  }
});
