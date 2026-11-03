// עדכוני צוות: כניסה למנהל ולמורים, כתיבת עדכונים עם תוקף, וקריאה ציבורית לאפליקציה.
// הנתונים נשמרים ב-Netlify Blobs (אחסון מובנה של נטליפיי, בלי שירות נוסף).
//
// GET  /api/updates                 → { ok, updates:[פעילים בלבד] }            (ציבורי, לאפליקציה)
// POST /api/updates {seen:[ids]}    → ספירת צפיות אנונימית (כמה תלמידים ראו)
// POST /api/feedback {kind,text,..} → רעיון / תקלה מתלמיד (ציבורי, עם הגבלת כמות). מנהלים רואים ב"פניות"
// GET  /api/sets                    → { ok, sets:[סטי כרטיסיות שהצוות פרסם] }    (ציבורי, לכרטיסיות)
// GET  /api/contacts                → { ok, contacts:[{name, phone, note, extra}] } (ספר הטלפונים של המורים)
// POST /api/contacts {action, ...}  → check | set | remove. מותר רק עם "קוד עריכת טלפונים" או עם כניסת מנהל (טוקן).
//                                     הקוד: מנהל יוצר בכניסת הצוות (phoneCodeNew, נשמר רק כ-scrypt ב-Blobs). עד אז עובד
//                                     הקוד הישן (PHONE_HASH, scripts/make-phone-code.mjs), ומרגע שנוצר קוד חדש – הישן לא עובד.
// GET  /api/staff                   → { ok, needsSetup }                      (האם כבר הוגדר מנהל)
// POST /api/staff {action, ...}     → check_invite | setup | login | me | updateMe | post | end | extend | delete | list
//                                     | users | addUser | resetUser | removeUser | feedback | feedbackDone | feedbackDelete
//                                     | setsList | setSave | setDelete  (סטי כרטיסיות לכיתה: מורה מנהל את שלו, מנהל את כולם)
//                                     | phoneCodeNew | phoneCodeStatus | backup  (מנהל בלבד)
//
// כניסת המנהל: קוד ההזמנה האישי (נוצר ע"י scripts/make-invite.mjs ונשלח למנהל, גם כקישור staff.html#invite=...).
// בכניסה הראשונה עם הקוד נוצר חשבון המנהל הראשי, והקוד הזה הוא הקוד שלו (אפשר לשנות ב"החשבון שלי").
// כאן נשמר רק ה-hash של הקוד, אז גם כשהקוד ציבורי אי אפשר לנחש אותו. קוד הזמנה חדש מאפס את המנהל הראשי.
//
// אבטחה: קודי כניסה נשמרים רק כ-hash (scrypt). אחרי כניסה מקבלים טוקן חתום (HMAC) לשבוע, עם "גרסה":
// החלפת קוד או איפוס מבטלים מיד את כל הכניסות הקודמות. כל כתיבה היא מותנית (etag) עם ניסיון חוזר,
// כך ששני אנשים שכותבים באותו רגע לא מוחקים אחד לשני. הגבלת ניסיונות כניסה לפי כתובת.
// תוכן העדכונים הוא טקסט בלבד, והאפליקציה מציגה אותו כטקסט (לא HTML).
// POST /api/push {action, ...}      → key | sub | unsub   התראות לטלפון (Web Push). ציבורי, לפי מכשיר.
//                                     שומרים רק: כתובת ההתראות של המכשיר, הכיתה וההעדפות. בלי שם.
import crypto from "node:crypto";
import webpush from "web-push";
import HC from "../../holidays-core.js"; // 🎉 לוח החגים (משותף עם האפליקציה)

export const config = { path: ["/api/updates", "/api/staff", "/api/feedback", "/api/sets", "/api/contacts", "/api/feed", "/api/owner", "/api/push", "/api/assist"] };

const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/([a-z0-9-]+--)?lucent-crepe-6db22c\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const MAX_FEEDBACK = 1000, FEEDBACK_KINDS = ["idea", "bug", "other"], FEEDBACK_PER_HOUR = 30;
const MAX_TEXT = 600, MAX_NAME = 40, TOKEN_DAYS = 7, MAX_DURATION_MIN = 60 * 24 * 30;
const LOCK_FAILS = 20, LOCK_MIN = 15; // 20 קודים שגויים ב-15 דקות מאותה כתובת → נעילה ל-15 דקות
const AUDIENCES = ["all", "y1", "y2", "ya1", "ya2"]; // כל התלמידים / כיתה (י'1, י'2, י"א1, י"א2)
const MAX_SETS = 200, MAX_CARDS = 300, MAX_SIDE = 300, MAX_SETS_BYTES = 3e6; // סטי כרטיסיות של הצוות
// sha256 של מפתח ההזמנה למנהל. נוצר ע"י: node scripts/make-invite.mjs
let INVITE_HASH = "6a7b4eabc4df20f822f572207feaad76beaaa7851071108b268ca6f7d0083b2f";
export function __setInviteHash(h) { INVITE_HASH = h; }
// sha256 של קוד העריכה לספר הטלפונים. נוצר ע"י: node scripts/make-phone-code.mjs
let PHONE_HASH = "af6d01a88a81ba0c1eaeae3c628b5825b8ef6e33f3e3e89d7caa459f8a741b7f";
export function __setPhoneHash(h) { PHONE_HASH = h; }
// מנהל המערכת (owner.html): רק salt + scrypt של הקוד הסודי. נוצר ע"י: node scripts/make-owner-code.mjs
let OWNER = { salt: "4b224ec01c8291a91669d5b08af86068", hash: "507e491633b1ae373a1b048c04e042d2dac6346849f75b93c3c0df17ab83ac96" };
export function __setOwner(o) { OWNER = o; }
const PRESENCE_MAX = 3000, PRESENCE_DAYS = 120, OWNER_DAYS = 7;
const MAX_CONTACTS = 300, MAX_USERS = 200, MAX_UPDATES = 1000, RELEASE_DAYS = 8;
const CAPS = { feed: true, schedule: true, phoneCode: true, backup: true };
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const norm = c => String(c || "").replace(/[\s-]/g, "").toUpperCase(); // "abcd-efgh" = "ABCDEFGH"
const isInvite = c => !!INVITE_HASH && !!norm(c) && safeEq(sha(norm(c)), INVITE_HASH);

// שגיאה שמסיימת את הבקשה עם קוד ותשובה מסודרת
class Fail extends Error { constructor(status, error) { super(error); this.status = status; this.error = error; } }

// ---- אחסון: Netlify Blobs בייצור, מפה בזיכרון בבדיקות ----
// שם חדש לאחסון = התחלה נקייה לגמרי (בלי מנהל, מורים, עדכונים, סטים ופניות).
// הוחלף ב-24.10.2026: איפוס אחרי בדיקה, לפני המסירה למנהל. הנתונים הישנים לא נמחקים, פשוט לא בשימוש.
const STORE_NAME = "maarechet-staff-2";
// update(key, fn): קורא, מחשב ערך חדש (fn), וכותב רק אם אף אחד לא כתב בינתיים. אחרת מנסה שוב.
let memStore = null;
export function __useMemoryStore() {
  const m = new Map();
  const get = async k => m.has(k) ? JSON.parse(m.get(k)) : null;
  const set = async (k, v) => { m.set(k, JSON.stringify(v)); };
  // עדכונים לאותו מפתח רצים בתור (כמו הכתיבה המותנית בשרת האמיתי)
  let chain = Promise.resolve();
  memStore = { get, set, update: (k, fn) => { const run = chain.then(async () => { const next = fn(await get(k)); if (next !== undefined) await set(k, next); }); chain = run.catch(() => {}); return run; } };
  return m;
}
async function store() {
  if (memStore) return memStore;
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: STORE_NAME, consistency: "strong" });
  return {
    get: k => s.get(k, { type: "json" }),
    set: (k, v) => s.setJSON(k, v),
    async update(k, fn) {
      for (let i = 0; i < 8; i++) {
        const r = await s.getWithMetadata(k, { type: "json" });
        const next = fn(r ? r.data : null);
        if (next === undefined) return;
        const w = r && r.etag ? await s.setJSON(k, next, { onlyIfMatch: r.etag }) : r ? await s.setJSON(k, next) : await s.setJSON(k, next, { onlyIfNew: true });
        if (!w || w.modified !== false) return;
        await new Promise(res => setTimeout(res, 40 + Math.random() * 160));
      }
      throw new Fail(503, "busy");
    },
  };
}

// ---- עזרים ----
// תשובות ציבוריות שזהות לכולם (עדכונים, פיד): נטליפיי שומר עותק 15 שניות, אז גם 400 תלמידים שבודקים כל 20 שניות
// עולים בערך כמו בקשה אחת (הפונקציה לא רצה בכל פעם). לפי כתובת המקור – כי כותרות ה-CORS שונות
const EDGE = { "Cache-Control": "public, max-age=10", "Netlify-CDN-Cache-Control": "public, durable, s-maxage=15, stale-while-revalidate=30", "Netlify-Vary": "header=Origin" };
function corsHeaders(origin) {
  const h = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin && ALLOWED.some(r => r.test(origin))) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }
  return h;
}
const reply = (status, body, headers) => new Response(JSON.stringify(body), { status, headers });
const hashCode = (code, salt) => crypto.scryptSync(String(code), salt, 32).toString("hex");
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const newId = () => crypto.randomBytes(9).toString("base64url");
const newSalt = () => crypto.randomBytes(16).toString("hex");
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// 256 מתחלק ב-32, אז כל תו אקראי באותה הסתברות
const newCode = (n = 8) => Array.from(crypto.randomBytes(n), b => CODE_CHARS[b % CODE_CHARS.length]).join("");
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
// הקוד כפי שהוקלד, באותיות גדולות, ובלי רווחים/מקפים: כולם מתקבלים
const variants = code => [...new Set([code, code.toUpperCase(), norm(code)])].filter(Boolean);
const hashCodeAsync = (code, salt) => new Promise((res, rej) => crypto.scrypt(String(code), salt, 32, (e, k) => e ? rej(e) : res(k.toString("hex"))));
// קוד נשמר בצורה אחידה (norm: אותיות גדולות, בלי רווחים/מקפים) ומסומן cv:1 – אז בכניסה יש חישוב scrypt אחד לכל משתמש
// (ולא 3). משתמשים ישנים (בלי cv) נבדקים בכל הצורות, ועוברים לצורה האחידה בכניסה המוצלחת הבאה.
const codeFields = code => { const salt = newSalt(); return { salt, hash: hashCode(norm(code), salt), cv: 1 }; };
async function findByCode(users, code) {
  for (const u of users) for (const c of (u.cv ? [norm(code)] : variants(code))) if (c && safeEq(await hashCodeAsync(c, u.salt), u.hash)) return u;
  return null;
}

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}
function verify(token, secret) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const good = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEq(mac, good)) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}
// בטוקן נשמרת "גרסה" של המשתמש (tv): החלפת קוד/איפוס מעלה אותה, וכל טוקן ישן נפסל
const tokenFor = (u, secret) => sign({ uid: u.id, tv: u.tv || 0, exp: Date.now() + TOKEN_DAYS * 864e5 }, secret);
const publicUser = u => ({ id: u.id, name: u.name, role: u.role, owner: !!u.owner });
// סט כרטיסיות כפי שהתלמידים מקבלים אותו
const publicSet = x => ({ id: x.id, title: x.title, subject: x.subject, audience: x.audience, cards: x.cards, author: x.authorName, updatedAt: x.updatedAt });
// בדיקת סט שהגיע מהצוות: טקסט נקי, אורכים סבירים, לפחות 2 כרטיסים מלאים
function cleanSet(b) {
  const title = clean(b?.title, 80), subject = clean(b?.subject, 40);
  const audience = AUDIENCES.includes(b?.audience) ? b.audience : "all";
  const cards = (Array.isArray(b?.cards) ? b.cards : []).slice(0, MAX_CARDS)
    .map(c => ({ t: clean(c?.t, MAX_SIDE), d: clean(c?.d, MAX_SIDE) })).filter(c => c.t && c.d);
  if (!title || cards.length < 2) throw new Fail(400, "bad_request");
  return { title, subject, audience, cards };
}
const activeUpdates = (list, now = Date.now()) => (list || []).filter(u => (u.startsAt || u.createdAt) <= now && u.expiresAt > now).sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));

// יצירת המנהל הראשי (או איפוס שלו, אם כבר קיים) עם קוד ההזמנה הנוכחי
async function claim(S, name, code) {
  let conf = null, admin = null;
  await S.update("config", cfg => (conf = { ...(cfg || { secret: crypto.randomBytes(32).toString("hex"), createdAt: Date.now() }), inviteUsed: INVITE_HASH }));
  const cf = codeFields(code);
  await S.update("users", list => {
    const users = list || [];
    const owner = users.find(u => u.owner) || users.find(u => u.role === "admin");
    if (owner) { // קוד הזמנה חדש = איפוס של המנהל הראשי (המורים נשארים), וכל הכניסות הקודמות שלו נפסלות
      admin = { ...owner, name: name || owner.name, ...cf, owner: true, tv: (owner.tv || 0) + 1 };
      return users.map(u => u.id === owner.id ? admin : u);
    }
    admin = { id: newId(), name: name || "המנהל", role: "admin", owner: true, ...cf, tv: 0, createdAt: Date.now() };
    return [...users, admin];
  });
  return { conf, admin };
}

// הגבלת ניסיונות כניסה
// attempt: סופר ניסיון וזורק 429 אם עברו את המכסה – באותה כתיבה, כך שבקשות מקבילות לא עוקפות
async function attempt(S, ip) {
  const now = Date.now(), win = LOCK_MIN * 60e3;
  await S.update("fails", cur => {
    const r = cur || {};
    const recent = (r[ip] || []).filter(t => now - t < win);
    if (recent.length >= LOCK_FAILS) throw new Fail(429, "locked");
    r[ip] = [...recent, now];
    for (const k of Object.keys(r)) if (!r[k].some(t => now - t < win)) delete r[k];
    return r;
  });
}
// ניסיון שהצליח – לא נחשב לכישלון
async function forgive(S, ip) {
  await S.update("fails", cur => { const r = cur || {}; if (!r[ip] || !r[ip].length) return undefined; r[ip] = r[ip].slice(0, -1); if (!r[ip].length) delete r[ip]; return r; });
}
async function tooManyFailures(S, ip) {
  const r = await S.get("fails") || {};
  const now = Date.now();
  return (r[ip] || []).filter(t => now - t < LOCK_MIN * 60e3).length >= LOCK_FAILS;
}
async function recordFailure(S, ip) {
  const now = Date.now(), win = LOCK_MIN * 60e3;
  await S.update("fails", cur => {
    const r = cur || {};
    r[ip] = [...(r[ip] || []).filter(t => now - t < win), now];
    for (const k of Object.keys(r)) if (!r[k].some(t => now - t < win)) delete r[k];
    return r;
  });
}

export default async (req, context) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try { return await handle(req, context, headers); }
  catch (e) {
    if (e instanceof Fail) return reply(e.status, { ok: false, error: e.error }, headers);
    console.error("staff function error:", e && e.message);
    return reply(500, { ok: false, error: "server" }, headers);
  }
};

async function handle(req, context, headers) {
  const url = new URL(req.url);
  const S = await store();
  // הכתובת משמשת כמפתח באובייקטים של הגבלת הכמות: רק תווים של כתובת IP (בלי "__proto__" וכדומה)
  const ip = String((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "").replace(/[^0-9a-fA-F:.,\s]/g, "").trim().slice(0, 100) || "unknown";

  // ---- ציבורי: העדכונים הפעילים ----
  if (url.pathname.endsWith("/updates")) {
    if (req.method === "POST") {
      // צפיות: מספר משוער (בלי זיהוי תלמיד). שמור בנפרד מהעדכונים, כדי שלא יתנגש עם כתיבת עדכון
      let b; try { b = await req.json(); } catch { b = null; }
      const ids = Array.isArray(b?.seen) ? b.seen.map(String).filter(x => /^[\w-]{4,20}$/.test(x)).slice(0, 10) : [];
      if (ids.length) await rateLimit(S, "viewRate", ip, 8000); // כל בית הספר יכול לצאת מאותה כתובת
      if (ids.length) {
        const known = new Set((await S.get("updates") || []).map(u => u.id));
        await S.update("views", cur => {
          const v = cur || {};
          for (const id of ids) if (known.has(id)) v[id] = (v[id] || 0) + 1;
          for (const k of Object.keys(v)) if (!known.has(k)) delete v[k];
          return v;
        });
      }
      return reply(200, { ok: true }, headers);
    }
    if (req.method !== "GET") return reply(405, { ok: false, error: "method" }, headers);
    const list = await S.get("updates") || [];
    const updates = activeUpdates(list).map(publicUpdate);
    return reply(200, { ok: true, now: Date.now(), updates }, { ...headers, ...EDGE });
  }

  // ---- ציבורי: סטי הכרטיסיות של הכיתה ----
  if (url.pathname.endsWith("/sets")) {
    if (req.method !== "GET") return reply(405, { ok: false, error: "method" }, headers);
    const sets = (await S.get("sets") || []).slice().sort((a, b) => b.updatedAt - a.updatedAt).map(publicSet);
    return reply(200, { ok: true, sets }, { ...headers, "Cache-Control": "public, max-age=60" });
  }

  // ---- פיד לתלמידים ----
  if (url.pathname.endsWith("/feed")) return feed(req, S, ip, headers);
  if (url.pathname.endsWith("/push")) return push(req, S, ip, headers);
  if (url.pathname.endsWith("/assist")) return assist(req, S, ip, headers);

  // ---- דף מנהל המערכת ----
  if (url.pathname.endsWith("/owner")) return owner(req, S, ip, headers);

  // ---- ספר הטלפונים של המורים ----
  if (url.pathname.endsWith("/contacts")) return contacts(req, S, ip, headers);

  // ---- ציבורי: רעיון או תקלה מתלמיד ----
  if (url.pathname.endsWith("/feedback")) {
    if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
    let b; try { b = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
    const text = clean(b?.text, MAX_FEEDBACK);
    if (!text) return reply(400, { ok: false, error: "bad_request" }, headers);
    // הגבלה לפי כתובת (כל בית הספר יכול לצאת מאותה כתובת, אז המספר נדיב)
    const now = Date.now();
    await S.update("fbRate", cur => {
      const rate = cur || {}, recent = (rate[ip] || []).filter(t => now - t < 3600e3);
      if (recent.length >= FEEDBACK_PER_HOUR) throw new Fail(429, "too_many");
      rate[ip] = [...recent, now];
      for (const k of Object.keys(rate)) if (!rate[k].some(t => now - t < 3600e3)) delete rate[k];
      return rate;
    });
    const item = {
      id: newId(), kind: FEEDBACK_KINDS.includes(b.kind) ? b.kind : "other", text,
      name: clean(b.name, 60), cls: clean(b.cls, 10), page: clean(b.page, 40), device: clean(b.device, 200), ver: clean(b.ver, 20),
      at: now, done: false,
    };
    await S.update("feedback", cur => [item, ...(cur || [])].slice(0, 300));
    return reply(200, { ok: true }, headers);
  }

  const cfg = await S.get("config");
  if (req.method === "GET") return reply(200, { ok: true, needsSetup: !cfg }, headers);
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);

  let body;
  try { body = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const action = String(body?.action || "");

  // ---- הגדרת המנהל הראשי: רק עם קוד ההזמנה ----
  if (action === "check_invite") {
    await attempt(S, ip); // גם בדיקה בלבד נספרת, כדי שאי אפשר לנחש קודי הזמנה בלי הגבלה
    const valid = isInvite(body.invite);
    if (valid) await forgive(S, ip);
    return reply(200, { ok: true, valid, used: valid && !!cfg && cfg.inviteUsed === INVITE_HASH, hasAdmin: !!cfg }, headers);
  }
  if (action === "setup") {
    await attempt(S, ip);
    if (!isInvite(body.invite)) return reply(403, { ok: false, error: "bad_invite" }, headers);
    await forgive(S, ip);
    if (cfg && cfg.inviteUsed === INVITE_HASH) return reply(409, { ok: false, error: "invite_used" }, headers);
    const name = clean(body.name, MAX_NAME), code = String(body.code || "");
    if (!name || code.length < 6 || code.length > 64 || norm(code).length < 6) return reply(400, { ok: false, error: "bad_request" }, headers);
    const { conf, admin } = await claim(S, name, code);
    return reply(200, { ok: true, token: tokenFor(admin, conf.secret), user: publicUser(admin), caps: CAPS }, headers);
  }
  // כניסה ראשונה של המנהל עם קוד ההזמנה (מהקישור או בהקלדה): יוצר את החשבון שלו
  if (action === "login" && isInvite(body.code) && !(cfg && cfg.inviteUsed === INVITE_HASH)) {
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    const { conf, admin } = await claim(S, null, norm(body.code));
    return reply(200, { ok: true, first: true, token: tokenFor(admin, conf.secret), user: publicUser(admin), caps: CAPS }, headers);
  }
  if (!cfg) return reply(409, { ok: false, error: "needs_setup" }, headers);

  // ---- כניסה בקוד אישי ----
  if (action === "login") {
    await attempt(S, ip);
    const code = String(body.code || "").trim();
    if (!code || code.length > 64) return reply(401, { ok: false, error: "bad_code" }, headers);
    const users = await S.get("users") || [];
    const u = await findByCode(users, code);
    if (!u) return reply(401, { ok: false, error: "bad_code" }, headers);
    await forgive(S, ip);
    // משתמש ישן: עובר לשמירה האחידה (כניסות הבאות מהירות יותר). הטוקנים לא משתנים
    if (!u.cv) { const cf = codeFields(code); await S.update("users", list => (list || []).map(x => x.id === u.id && !x.cv && x.hash === u.hash ? { ...x, ...cf } : x)).catch(() => {}); }
    return reply(200, { ok: true, token: tokenFor(u, cfg.secret), user: publicUser(u), caps: CAPS }, headers);
  }

  // ---- מכאן: רק עם טוקן תקף ----
  const auth = verify((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), cfg.secret);
  const users = await S.get("users") || [];
  const me = auth && users.find(x => x.id === auth.uid && (x.tv || 0) === (auth.tv || 0));
  if (!me) return reply(401, { ok: false, error: "auth" }, headers);
  const isAdmin = me.role === "admin";

  if (action === "me") return reply(200, { ok: true, user: publicUser(me), caps: CAPS }, headers);

  // "החשבון שלי": שינוי שם ו/או קוד כניסה (לכל אחד, על עצמו)
  if (action === "updateMe") {
    if (body.code != null) {
      await attempt(S, ip);
      const want = String(body.code).trim();
      // כל החלפת קוד נספרת (לא "נסלחת"), כדי שאי אפשר יהיה לבדוק קודים של אחרים שוב ושוב
      if (want.length >= 6 && want.length <= 64 && await findByCode(users.filter(x => x.id !== me.id), want)) return reply(409, { ok: false, error: "code_taken" }, headers);
    }
    const name = body.name != null ? clean(body.name, MAX_NAME) : null;
    const code = body.code != null ? String(body.code).trim() : null;
    if ((name != null && !name) || (code != null && (code.length < 6 || code.length > 64 || norm(code).length < 6))) return reply(400, { ok: false, error: "bad_request" }, headers);
    let next = null;
    const cf = code != null ? codeFields(code) : null;
    await S.update("users", list => {
      const all = list || [], cur = all.find(x => x.id === me.id);
      if (!cur) throw new Fail(401, "auth");
      next = { ...cur, ...(name != null ? { name } : {}) };
      // שני אנשים עם אותו קוד = אחד נכנס לחשבון של השני. לא מאפשרים (נבדק למעלה)
      if (cf) next = { ...next, ...cf, tv: (cur.tv || 0) + 1 };
      return all.map(x => x.id === me.id ? next : x);
    });
    // אחרי החלפת קוד כל הכניסות הישנות נפסלות, אז מחזירים טוקן חדש למכשיר הנוכחי
    return reply(200, { ok: true, user: publicUser(next), ...(code != null ? { token: tokenFor(next, cfg.secret) } : {}) }, headers);
  }

  if (action === "post") {
    const text = clean(body.text, MAX_TEXT);
    const minutes = Math.round(Number(body.minutes));
    const audience = AUDIENCES.includes(body.audience) ? body.audience : "all";
    if (!text || !(minutes >= 1 && minutes <= MAX_DURATION_MIN)) return reply(400, { ok: false, error: "bad_request" }, headers);
    // מנהל יכול לשלוח בשם מורה (asUser) או בשם חופשי כמו "המזכירות" (asName)
    let author = { authorId: me.id, authorName: me.name, role: me.role };
    if (isAdmin && body.asUser && body.asUser !== me.id) {
      const t = users.find(x => x.id === body.asUser);
      if (!t) return reply(404, { ok: false, error: "not_found" }, headers);
      author = { authorId: t.id, authorName: t.name, role: t.role };
    } else if (isAdmin && clean(body.asName, MAX_NAME)) {
      author = { authorId: me.id, authorName: clean(body.asName, MAX_NAME), role: "staff" };
    }
    const now = Date.now();
    // קישור לסרטון (יוטיוב, גוגל דרייב וכו'): התלמיד רואה כפתור ▶️ וצופה רק אם הוא רוצה
    const video = clean(body.video, 400);
    if (video && !/^https:\/\/[^\s<>"']+$/i.test(video)) return reply(400, { ok: false, error: "bad_video" }, headers);
    // שליחה מתוזמנת: startsAt בעתיד (עד 30 יום). עד אז התלמידים לא רואים
    const startsAt = body.startsAt ? Math.round(Number(body.startsAt)) : 0;
    if (startsAt && !(startsAt > now - 60e3 && startsAt < now + 30 * 864e5)) return reply(400, { ok: false, error: "bad_time" }, headers);
    const from = startsAt > now ? startsAt : now;
    const upd = { id: newId(), text, ...(video ? { video } : {}), ...author, postedBy: me.id, postedByName: me.name, audience, urgent: !!body.urgent, createdAt: now, ...(from > now ? { startsAt: from } : {}), expiresAt: from + minutes * 60e3 };
    await S.update("updates", cur => { // + ניקוי ישנים, ותקרה כדי שהאחסון לא יגדל בלי סוף
      const list = (cur || []).filter(u => u.expiresAt > now - 7 * 864e5);
      if (list.length >= MAX_UPDATES) throw new Fail(413, "too_many");
      return [...list, upd];
    });
    // עדכון דחוף שמתפרסם עכשיו → גם התראה לטלפון (מי שהפעיל התראות; לא בלילה ולא בשבת)
    if (upd.urgent && from <= now) await sendPush(S, x => audienceMatch(audience, x), { title: "🚨 עדכון דחוף", body: text.slice(0, 160), tag: "upd-" + upd.id }, { pref: "urgent", ttl: 6 * 3600 }).catch(() => {});
    return reply(200, { ok: true, update: upd }, headers);
  }

  if (action === "extend" || action === "end" || action === "delete") {
    const id = String(body.id || ""), add = Math.round(Number(body.minutes));
    if (action === "extend" && !(add >= 1 && add <= MAX_DURATION_MIN)) return reply(400, { ok: false, error: "bad_request" }, headers);
    let out = null;
    await S.update("updates", cur => {
      const list = cur || [], u = list.find(x => x.id === id);
      if (!u) throw new Fail(404, "not_found");
      if (!isAdmin && u.authorId !== me.id) throw new Fail(403, "forbidden");
      const now = Date.now();
      if (action === "delete") return list.filter(x => x.id !== id);
      out = action === "end"
        ? { ...u, expiresAt: Math.min(u.expiresAt, now - 1) }
        : { ...u, expiresAt: Math.min(Math.max(now, u.expiresAt) + add * 60e3, Math.max(now, u.startsAt || 0) + MAX_DURATION_MIN * 60e3) };
      return list.map(x => x.id === id ? out : x);
    });
    return reply(200, { ok: true, ...(out && action === "extend" ? { update: out } : {}) }, headers);
  }

  if (action === "list") {
    // מנהל רואה הכל, מורה רואה את שלו. כולל עדכונים שהסתיימו ב-3 הימים האחרונים
    const now = Date.now();
    const views = await S.get("views") || {}, rx = await S.get("reactions") || {};
    const list = (await S.get("updates") || []).filter(u => (isAdmin || u.authorId === me.id) && u.expiresAt > now - 3 * 864e5)
      .sort((a, b) => b.createdAt - a.createdAt).map(u => ({ ...u, reactions: Object.values(reactsOf(rx, u.id)).sort((a, b) => b.at - a.at).map(x => ({ e: x.e, name: x.name || "", cls: x.cls || "" })), active: u.expiresAt > now && (u.startsAt || 0) <= now, scheduled: (u.startsAt || 0) > now && u.expiresAt > now, views: views[u.id] || 0 }));
    return reply(200, { ok: true, now, updates: list }, headers);
  }

  // ---- סטי כרטיסיות לכיתה ----
  if (action === "setsList") {
    // כולם רואים את כל הסטים (כדי לא להכין פעמיים), ועורכים רק את מה שמותר
    const sets = (await S.get("sets") || []).slice().sort((a, b) => b.updatedAt - a.updatedAt)
      .map(x => ({ ...publicSet(x), mine: x.authorId === me.id, canEdit: isAdmin || x.authorId === me.id }));
    return reply(200, { ok: true, sets }, headers);
  }
  if (action === "setSave") {
    const data = cleanSet(body), id = body.id ? String(body.id) : null, now = Date.now();
    let out = null;
    await S.update("sets", cur => {
      const list = cur || [];
      if (id) {
        const x = list.find(y => y.id === id);
        if (!x) throw new Fail(404, "not_found");
        if (!isAdmin && x.authorId !== me.id) throw new Fail(403, "forbidden");
        out = { ...x, ...data, updatedAt: now, editedBy: me.name };
      } else {
        if (list.length >= MAX_SETS) throw new Fail(413, "too_many_sets");
        out = { id: newId(), ...data, authorId: me.id, authorName: me.name, createdAt: now, updatedAt: now };
      }
      const next = id ? list.map(y => y.id === id ? out : y) : [...list, out];
      if (JSON.stringify(next).length > MAX_SETS_BYTES) throw new Fail(413, "too_big");
      return next;
    });
    return reply(200, { ok: true, set: publicSet(out) }, headers);
  }
  if (action === "setDelete") {
    const id = String(body.id || "");
    await S.update("sets", cur => {
      const list = cur || [], x = list.find(y => y.id === id);
      if (!x) throw new Fail(404, "not_found");
      if (!isAdmin && x.authorId !== me.id) throw new Fail(403, "forbidden");
      return list.filter(y => y.id !== id);
    });
    return reply(200, { ok: true }, headers);
  }

  // ---- סקרים ----
  if (action === "pollCreate") {
    const q = clean(body.q, 200), options = strList(body.options, 6, 80), hours = Math.round(Number(body.hours) || 24);
    const audience = AUDIENCES.includes(body.audience) ? body.audience : "all";
    if (!q || options.length < 2 || !(hours >= 1 && hours <= 24 * 30)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const now = Date.now(), p = { id: newId(), q, options, audience, votes: {}, voters: {}, authorId: me.id, authorName: me.name, createdAt: now, endsAt: now + hours * 3600e3 };
    await S.update("polls", cur => [p, ...(cur || []).filter(x => x.endsAt > now - 30 * 864e5)].slice(0, 200));
    return reply(200, { ok: true, poll: publicPoll(p) }, headers);
  }
  if (action === "pollList") {
    const now = Date.now();
    const polls = (await S.get("polls") || []).sort((a, b) => b.createdAt - a.createdAt).map(p => ({ ...publicPoll(p), active: p.endsAt > now, canEdit: isAdmin || p.authorId === me.id }));
    return reply(200, { ok: true, polls }, headers);
  }
  if (action === "pollEnd" || action === "pollDelete") {
    await S.update("polls", cur => {
      const list = cur || [], p = list.find(x => x.id === body.id);
      if (!p) throw new Fail(404, "not_found");
      if (!isAdmin && p.authorId !== me.id) throw new Fail(403, "forbidden");
      return action === "pollDelete" ? list.filter(x => x !== p) : list.map(x => x === p ? { ...x, endsAt: Date.now() - 1 } : x);
    });
    return reply(200, { ok: true }, headers);
  }
  // ---- אירועים (לוח הישיבה) ----
  if (action === "eventCreate") {
    const title = clean(body.title, 80), date = String(body.date || ""), time = String(body.time || "");
    const audience = AUDIENCES.includes(body.audience) ? body.audience : "all";
    if (!title || !validDate(date) || (time && !validTime(time))) return reply(400, { ok: false, error: "bad_request" }, headers);
    const e = { id: newId(), title, date, time, place: clean(body.place, 60), desc: clean(body.desc, 300), audience, author: me.name, authorId: me.id, createdAt: Date.now() };
    const today = israelDay();
    await S.update("events", cur => [...(cur || []).filter(x => x.date >= israelDay(Date.now() - 30 * 864e5)), e].slice(-300));
    return reply(200, { ok: true, event: e, past: date < today }, headers);
  }
  if (action === "eventList") {
    const events = (await S.get("events") || []).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(e => ({ ...e, canEdit: isAdmin || e.authorId === me.id }));
    return reply(200, { ok: true, events, today: israelDay() }, headers);
  }
  if (action === "eventDelete") {
    await S.update("events", cur => {
      const list = cur || [], e = list.find(x => x.id === body.id);
      if (!e) throw new Fail(404, "not_found");
      if (!isAdmin && e.authorId !== me.id) throw new Fail(403, "forbidden");
      return list.filter(x => x !== e);
    });
    return reply(200, { ok: true }, headers);
  }
  // ---- 🔄 שינויים במערכת (שיעור בוטל / מורה מחליף / שעה אחרת / הערה) ----
  if (action === "changeCreate") {
    const c = cleanChange(body);
    if (!c) return reply(400, { ok: false, error: "bad_request" }, headers);
    const today = israelDay();
    if (c.date < israelDay(Date.now() - 864e5) || c.date > israelDay(Date.now() + 60 * 864e5)) return reply(400, { ok: false, error: "bad_date" }, headers);
    const ch = { id: newId(), ...c, author: me.name, authorId: me.id, createdAt: Date.now() };
    // אותו שיעור באותו יום – השינוי החדש מחליף את הקודם. אבל מורה לא מחליף (= מוחק) שינוי של מישהו אחר:
    // את זה מותר רק למי שפרסם אותו או למנהל (כמו במחיקה)
    const same = x => x.date === ch.date && x.cls === ch.cls && x.s === ch.s && x.n === ch.n && x.w === ch.w;
    await S.update("changes", cur => {
      const list = (cur || []).filter(x => x.date >= israelDay(Date.now() - 14 * 864e5));
      const old = list.find(same);
      if (old && !isAdmin && old.authorId !== me.id) throw new Fail(409, "change_taken");
      return [...list.filter(x => !same(x)), ch].slice(-500);
    });
    return reply(200, { ok: true, change: ch, today }, headers);
  }
  if (action === "changeList") {
    const since = israelDay(Date.now() - 7 * 864e5);
    const changes = (await S.get("changes") || []).filter(x => x.date >= since).sort((a, b) => (a.date + a.s).localeCompare(b.date + b.s)).map(x => ({ ...x, canEdit: isAdmin || x.authorId === me.id }));
    return reply(200, { ok: true, changes, today: israelDay() }, headers);
  }
  if (action === "changeDelete") {
    await S.update("changes", cur => {
      const list = cur || [], x = list.find(y => y.id === body.id);
      if (!x) throw new Fail(404, "not_found");
      if (!isAdmin && x.authorId !== me.id) throw new Fail(403, "forbidden");
      return list.filter(y => y !== x);
    });
    return reply(200, { ok: true }, headers);
  }
  // ---- שאלות מתלמידים (אנונימיות) ----
  if (action === "qList") {
    const qs = (await S.get("questions") || []).sort((a, b) => b.createdAt - a.createdAt);
    return reply(200, { ok: true, questions: qs }, headers);
  }
  if (action === "qAnswer" || action === "qHide" || action === "qRestore" || action === "qDelete") {
    const answer = clean(body.answer, 800);
    if (action === "qAnswer" && !answer) return reply(400, { ok: false, error: "bad_request" }, headers);
    await S.update("questions", cur => {
      const list = cur || [], q = list.find(x => x.id === body.id);
      if (!q) throw new Fail(404, "not_found");
      if (action === "qDelete") return list.filter(x => x !== q);
      return list.map(x => x !== q ? x : action === "qAnswer" ? { ...x, status: "answered", answer, answeredBy: me.name, answeredAt: Date.now() } : action === "qRestore" ? { ...x, status: x.answer ? "answered" : "new" } : { ...x, status: "hidden" });
    });
    return reply(200, { ok: true }, headers);
  }
  // ---- שחרורים שההורים חתמו עליהם ----
  if (action === "releasesList") {
    const since = Date.now() - 7 * 864e5;
    // ניקוי גם בלי שחרור חדש: אחרי 8 ימים השחרור נמחק מהשרת
    const all = await S.get("releases") || [];
    if (all.some(r => !(r.at > Date.now() - RELEASE_DAYS * 864e5))) await S.update("releases", cur => (cur || []).filter(r => r.at > Date.now() - RELEASE_DAYS * 864e5)).catch(() => {});
    return reply(200, { ok: true, releases: all.filter(r => r.at > since), today: israelDay() }, headers);
  }

  // ---- ניהול: מנהל בלבד ----
  if (!isAdmin) return reply(403, { ok: false, error: "forbidden" }, headers);
  if (action === "users") return reply(200, { ok: true, users: users.map(publicUser) }, headers);
  if (action === "bdList") {
    const bd = await S.get("birthdays") || {};
    return reply(200, { ok: true, birthdays: Object.entries(bd).map(([k, x]) => ({ key: k, name: x.name, cls: x.cls, md: x.md })).sort((a, b) => a.md.localeCompare(b.md)) }, headers);
  }
  if (action === "bdDelete") {
    await S.update("birthdays", cur => { const m = cur || {}; if (!Object.hasOwn(m, String(body.key))) return undefined; delete m[String(body.key)]; return m; });
    return reply(200, { ok: true }, headers);
  }
  if (action === "stats") return reply(200, { ok: true, classes: await classStats(S) }, headers);
  // ===== 👔 כלי מנהל הישיבה: רשימת תלמידים, השעיה, הודעות – כמו מנהל המערכת, בלי תקלות/יומן/מצב עדכון =====
  // כל פעולה נרשמת ביומן של מנהל המערכת עם שם המנהל, ומנהל המערכת יכול לבטל.
  const by = `👔 ${me.name}: `;
  if (action === "pOverview") return reply(200, { ...(await schoolOverview(S, Date.now(), false)), classStats: await classStats(S) }, headers);
  if (action === "pSuspend" || action === "pUnsuspend") return reply(200, await suspendOp(S, { ...body, action: action === "pSuspend" ? "suspend" : "unsuspend" }, Date.now(), by), headers);
  if (action === "pMsg") return reply(200, await msgSendOp(S, body, Date.now(), by), headers);
  if (action === "pMsgDelete") return reply(200, await msgDeleteOp(S, body, by, true), headers);
  if (action === "feedback") return reply(200, { ok: true, feedback: await S.get("feedback") || [] }, headers);
  if (action === "feedbackDone" || action === "feedbackDelete") {
    await S.update("feedback", cur => {
      const list = cur || [];
      return action === "feedbackDelete" ? list.filter(x => x.id !== body.id) : list.map(x => x.id === body.id ? { ...x, done: !x.done } : x);
    });
    return reply(200, { ok: true }, headers);
  }
  if (action === "addUser") {
    const name = clean(body.name, MAX_NAME), role = body.role === "admin" ? "admin" : "teacher";
    if (!name) return reply(400, { ok: false, error: "bad_request" }, headers);
    const code = newCode();
    const u = { id: newId(), name, role, ...codeFields(code), tv: 0, createdAt: Date.now() };
    // תקרה: כל משתמש מוסיף חישוב לכל כניסה, ואחסון בלי סוף הוא פתח לתקלות
    await S.update("users", cur => { if ((cur || []).length >= MAX_USERS) throw new Fail(413, "too_many"); return [...(cur || []), u]; });
    return reply(200, { ok: true, user: publicUser(u), code }, headers);
  }
  if (action === "resetUser") {
    const code = newCode(), cf = codeFields(code);
    let target = null;
    await S.update("users", cur => {
      const list = cur || [], u = list.find(x => x.id === body.id);
      if (!u) throw new Fail(404, "not_found");
      if (u.owner && !me.owner) throw new Fail(403, "forbidden");
      target = u;
      return list.map(x => x.id === u.id ? { ...x, ...cf, tv: (x.tv || 0) + 1 } : x);
    });
    return reply(200, { ok: true, user: publicUser(target), code }, headers);
  }
  if (action === "removeUser") {
    if (body.id === me.id) return reply(400, { ok: false, error: "self" }, headers);
    await S.update("users", cur => {
      const list = cur || [];
      if (list.find(x => x.id === body.id)?.owner) throw new Fail(403, "forbidden");
      return list.filter(x => x.id !== body.id);
    });
    return reply(200, { ok: true }, headers);
  }
  // ---- קוד עריכה חדש לספר הטלפונים ----
  // נוצר בשרת, מוחזר פעם אחת בלבד, ובאחסון נשמר רק scrypt עם מלח (לא בקוד המקור, שהוא ציבורי בגיטהאב).
  // מרגע שיש קוד כזה, הקוד הישן (PHONE_HASH) כבר לא מתקבל.
  if (action === "phoneCodeNew") {
    const raw = newCode(12), salt = newSalt(), hash = hashCode(raw, salt), at = Date.now();
    await S.update("config", c => ({ ...(c || cfg), phoneCode: { salt, hash, at, by: me.name } }));
    return reply(200, { ok: true, code: raw.match(/.{4}/g).join("-"), at }, headers);
  }
  if (action === "phoneCodeStatus") {
    const pc = cfg.phoneCode;
    return reply(200, { ok: true, set: !!(pc && pc.hash), at: pc ? pc.at : 0, by: pc ? pc.by || "" : "", legacy: !(pc && pc.hash) && !!PHONE_HASH }, headers);
  }
  // ---- גיבוי: כל הנתונים כקובץ JSON (בלי קודים, מלחים, סודות ומזהי מכשירים). אין שחזור אוטומטי ----
  if (action === "backup") {
    const keys = ["users", "updates", "polls", "events", "questions", "birthdays", "releases", "contacts", "sets", "feedback", "reactions", "changes", "views"];
    const d = Object.fromEntries((await Promise.all(keys.map(k => S.get(k)))).map((v, i) => [keys[i], v]));
    const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
    const backup = {
      app: "maarechet", version: 1, exportedAt: new Date().toISOString(), by: me.name,
      users: (d.users || []).map(u => ({ id: u.id, name: u.name, role: u.role, owner: !!u.owner, createdAt: u.createdAt || null })),
      updates: d.updates || [],
      polls: (d.polls || []).map(({ voters, ...p }) => p), // בלי מזהי המכשירים של המצביעים
      events: d.events || [], questions: d.questions || [],
      birthdays: Object.values(obj(d.birthdays)).map(x => ({ name: x.name, cls: x.cls, md: x.md, at: x.at })),
      releases: d.releases || [],
      contacts: Object.entries(obj(d.contacts)).map(([name, x]) => ({ name, phone: x.phone || "", note: x.note || "", extra: !!x.extra, updatedAt: x.updatedAt || null, by: x.by || "" })),
      sets: d.sets || [], feedback: d.feedback || [], changes: d.changes || [], views: obj(d.views),
      reactions: Object.fromEntries(Object.entries(obj(d.reactions)).map(([id, r]) => [id, Object.values(obj(r)).map(x => ({ e: x.e, name: x.name || "", cls: x.cls || "", at: x.at }))])),
    };
    return reply(200, { ok: true, backup }, headers);
  }
  return reply(400, { ok: false, error: "bad_action" }, headers);
}

// ---------- פיד לתלמידים: הכל בבקשה אחת (עדכונים, סקרים, אירועים, תשובות, ימי הולדת) ----------
// GET  /api/feed               → { ok, now, updates, polls, events, answers, birthdays }
// POST /api/feed {action, ...}  → vote | ask | birthday | wish | leave | ping | release   (ציבורי, עם הגבלות)
const DEV_RE = /^[A-Za-z0-9-]{8,64}$/;
// אימוג'י אחד (כולל גוון עור, דגל או צירוף) – בלי אותיות. בודקים לפי טווחי קוד, בלי \p{…},
// כי בשרת של נטליפיי הביטוי עם \p{…} דחה גם אימוג'י תקינים
const EMOJI_PIC = c => (c >= 0x1F000 && c <= 0x1FAFF) || (c >= 0x2600 && c <= 0x27BF) || (c >= 0x2300 && c <= 0x23FF) || (c >= 0x2B00 && c <= 0x2BFF) ||
  (c >= 0x2190 && c <= 0x21FF) || (c >= 0x25A0 && c <= 0x25FF) || (c >= 0x2934 && c <= 0x2935) || [0xA9, 0xAE, 0x203C, 0x2049, 0x2122, 0x2139, 0x3030, 0x303D, 0x3297, 0x3299].includes(c);
const EMOJI_JOIN = c => c === 0x200D || c === 0xFE0F || c === 0x20E3 || (c >= 0xE0020 && c <= 0xE007F);
function isEmoji(s) {
  if (typeof s !== "string" || !s || s.length > 32) return false;
  const cps = [...s].map(ch => ch.codePointAt(0)), keycap = cps.includes(0x20E3);
  if (cps.length > 10 || !cps.some(EMOJI_PIC) && !keycap) return false;
  return cps.every(c => EMOJI_PIC(c) || EMOJI_JOIN(c) || (keycap && (c === 0x23 || c === 0x2A || (c >= 0x30 && c <= 0x39))));
}
const reactsOf = (rx, id) => (rx && Object.hasOwn(rx, id) && rx[id] && typeof rx[id] === "object") ? rx[id] : {};
const reactCounts = r => { const c = Object.create(null); for (const x of Object.values(r || {})) if (x && x.e) c[x.e] = (c[x.e] || 0) + 1; return c; };
const devKey = d => sha("dev:" + d).slice(0, 24); // לא שומרים את מזהה המכשיר עצמו
const strList = (a, n = 30, len = 60) => (Array.isArray(a) ? a : []).slice(0, n).map(x => clean(x, len)).filter(Boolean);
const IL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" });
const israelDay = (t = Date.now()) => IL_DAY.format(new Date(t)); // YYYY-MM-DD לפי שעון ישראל (קיץ/חורף)
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + "T12:00:00Z")) && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
const validTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
// שינוי במערכת: לאיזה שיעור (תאריך, כיתה, שעת התחלה, מקצוע, מורה) ומה קרה לו
const CHANGE_KINDS = ["cancel", "sub", "move", "note"];
function cleanChange(b) {
  const date = String(b.date || ""), s = String(b.s || ""), cls = AUDIENCES.includes(b.cls) ? b.cls : "";
  const n = clean(b.n, 60), w = clean(b.w, 60), kind = CHANGE_KINDS.includes(b.kind) ? b.kind : "";
  if (!validDate(date) || !validTime(s) || !cls || !n || !kind) return null;
  const c = { date, cls, s, n, w, kind, note: clean(b.note, 120) };
  if (kind === "sub") { c.sub = clean(b.sub, 60); if (!c.sub) return null; }
  if (kind === "move") {
    const [a, e] = String(b.to || "").split("-");
    if (!validTime(a) || !validTime(e) || a >= e) return null;
    c.to = a + "-" + e;
  }
  if (kind === "note" && !c.note) return null;
  return c;
}
const publicChange = x => ({ id: x.id, date: x.date, cls: x.cls, s: x.s, n: x.n, w: x.w, kind: x.kind, ...(x.sub ? { sub: x.sub } : {}), ...(x.to ? { to: x.to } : {}), note: x.note || "" });
const SAFE_KEY = k => !["__proto__", "constructor", "prototype", "toString", "valueOf", "hasOwnProperty"].includes(k);
const publicUpdate = u => ({ id: u.id, text: u.text, ...(u.video ? { video: u.video } : {}), author: u.authorName, role: u.role, audience: u.audience, urgent: !!u.urgent, createdAt: u.startsAt || u.createdAt, expiresAt: u.expiresAt });
const pollCounts = p => p.options.map((_, i) => (p.votes && p.votes[i]) || 0);
const publicPoll = p => ({ id: p.id, q: p.q, options: p.options, audience: p.audience, endsAt: p.endsAt, author: p.authorName, counts: pollCounts(p), total: pollCounts(p).reduce((a, b) => a + b, 0) });
// הגבלת כמות לפי כתובת: לכל כתובת רק מונה לשעה הנוכחית ולקודמת ({h, n, p}) – קטן, במקום רשימת זמנים שגדלה
// לאלפים (כל בית הספר יוצא לפעמים מאותה כתובת). ההערכה: n + p × החלק שנשאר מהשעה הקודמת (חלון "מחליק").
async function rateLimit(S, key, ip, perHour) {
  const now = Date.now(), h = Math.floor(now / 3600e3), rest = 1 - (now % 3600e3) / 3600e3;
  await S.update(key, cur => {
    const rate = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {};
    let r = Object.hasOwn(rate, ip) ? rate[ip] : null;
    if (Array.isArray(r)) r = { h, n: r.filter(t => now - t < 3600e3).length, p: 0 }; // מבנה ישן: רשימת זמנים
    else if (!r || typeof r !== "object" || !(r.h >= h - 1)) r = { h, n: 0, p: 0 };
    else if (r.h === h - 1) r = { h, n: 0, p: +r.n || 0 };
    if ((+r.n || 0) + (+r.p || 0) * rest >= perHour) throw new Fail(429, "too_many");
    rate[ip] = { h, n: (+r.n || 0) + 1, p: +r.p || 0 };
    for (const k of Object.keys(rate)) { const x = rate[k]; if (Array.isArray(x) ? !x.some(t => now - t < 3600e3) : !(x && x.h >= h - 1)) delete rate[k]; }
    return rate;
  });
}
// הגבלה בזיכרון של השרת בלבד (בלי כתיבה לאחסון = בלי עלות). לא מדויקת (כל עותק של השרת סופר לבד),
// אבל עוצרת הצפה מכתובת אחת. בשביל "שלום" ודיווחי תקלות, שמגיעים הרבה ולא שווים כתיבה בכל פעם.
const memHits = new Map();
function memRate(bucket, ip, perHour) {
  const now = Date.now(), k = bucket + "|" + ip, r = memHits.get(k);
  if (memHits.size > 5000) for (const [x, v] of memHits) if (now - v.t > 3600e3) memHits.delete(x);
  if (!r || now - r.t > 3600e3) { memHits.set(k, { t: now, n: 1 }); return; }
  if (++r.n > perHour) throw new Fail(429, "too_many");
}
export function __resetMemRate() { memHits.clear(); }
// תאריך (YYYY-MM-DD) לפני/אחרי n ימים מתאריך נתון – לפי לוח השנה, בלי בעיות של מעבר שעון קיץ/חורף
const dayAdd = (day, n) => new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function upcomingBirthdays(bd, now = Date.now()) {
  const today = israelDay(now), out = [], days = Array.from({ length: 7 }, (_, d) => dayAdd(today, d).slice(5)); // MM-DD, פעם אחת לכל בקשה
  for (const x of Object.values(bd || {})) {
    const d = days.indexOf(x && x.md);
    if (d >= 0) out.push({ name: x.name, cls: x.cls, md: x.md, inDays: d });
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}
// ---- מנהל המערכת: כניסה בקוד סודי, ואז תמונת מצב מלאה ----
// הסוד לחתימת הכניסות נשמר במפתח נפרד (לא ב-config, כדי לא לבלבל את הקמת המנהל של בית הספר)
// control = { maint: {until|null, msg, at} | null, susp: { [deviceKey]: {until|null, reason, at, name, cls} }, suspN: { ["שם|כיתה"]: same } }
// מפתח של תלמיד לפי שם+כיתה: רווחים אחידים, אותיות קטנות, ובלי תווים נסתרים (כיוון כתיבה / רוחב אפס),
// כדי שאותו שם עם תו נסתר לא יעקוף השעיה. אותה פונקציה בהשעיה, ב"שלום" ובחסימת הפעולות
const INVIS = /[­​-‏‪-‮⁠-⁩﻿]/g;
const personKey = (name, cls) => clean(name, MAX_NAME).replace(INVIS, "").replace(/\s+/g, " ").trim().toLowerCase() + "|" + (cls || "");
// תלמיד שנבחר בדף הניהול → מפתח, רק עם שם אמיתי (2 תווים לפחות) וכיתה אמיתית.
// אחרת "שם ריק" היה תופס כל מי שלא כתב שם בפרופיל (וכל הכיתה הייתה מושעית / מקבלת הודעה "אישית")
function personOf(p) {
  const cls = p && AUDIENCES.includes(p.cls) && p.cls !== "all" ? p.cls : "", k = personKey(p && p.name, cls);
  return cls && [...k.slice(0, k.lastIndexOf("|"))].length >= 2 ? k : null;
}
const isDevKey = k => /^[0-9a-f]{24}$/.test(k);
const keysOf = (a, n) => [...new Set((Array.isArray(a) ? a : []).slice(0, n * 2).map(String).filter(isDevKey))].slice(0, n);
// דקות מהדף: ריק = "עד שאעצור". מספר לא תקין = שגיאה (ולא "דקה אחת" בטעות)
const badMinutes = v => v != null && v !== "" && !(Number(v) >= 1);
const liveUntil = (x, now) => !!x && (x.until == null || x.until > now);
function maintOf(ctl, now) { const m = ctl && ctl.maint; return liveUntil(m, now) ? { until: m.until ?? null, msg: m.msg || "" } : null; }
function suspOf(ctl, k, pk, now) {
  const a = ctl && ctl.susp && Object.hasOwn(ctl.susp, k) ? ctl.susp[k] : null, b = ctl && ctl.suspN && Object.hasOwn(ctl.suspN, pk) ? ctl.suspN[pk] : null;
  const x = [a, b].find(y => liveUntil(y, now));
  return x ? { until: x.until ?? null, reason: x.reason || "" } : null;
}
const MSG_MAX = 300, MSG_TEXT = 500;
const minutesOrNull = v => v == null || v === "" ? null : Math.max(1, Math.min(60 * 24 * 60, Math.round(Number(v)) || 0)) || null;
// הודעות שמגיעות למכשיר הזה: לכולם, לכיתה שלו, או אליו (לפי מכשיר או שם+כיתה)
const msgsFor = (list, k, pk, cls, now) => (Array.isArray(list) ? list : []).filter(m => m.expiresAt > now && (m.to === "all" || m.to === cls || (m.to === "some" && ((m.keys || []).includes(k) || (m.people || []).includes(pk)))))
  .map(m => ({ id: m.id, text: m.text, at: m.createdAt, exp: m.expiresAt, ...(m.from ? { from: m.from } : {}) }));



// תמונת מצב של בית הספר: תלמידים, שימוש יומי, השעיות, הודעות ותוכן. full = מנהל המערכת (גם תקלות ויומן)
async function schoolOverview(S, now, full) {
  const keys = ["presence", "users", "updates", "polls", "events", "questions", "feedback", "contacts", "releases", "changes", "reactions", "birthdays", "sets", "views", "control", "ownerMsgs", "errors", "ownerLog", "departures", "aiStats"];
  const v = Object.fromEntries(await Promise.all(keys.map(async k => [k, await S.get(k)])));
  const arr = x => Array.isArray(x) ? x : [], obj = x => x && typeof x === "object" && !Array.isArray(x) ? x : {};
  // תגובות לפי שם (השם שהתלמיד כתב בפרופיל), ימי הולדת לפי שם+כיתה
  const rxBy = Object.create(null);
  for (const r of Object.values(obj(v.reactions))) for (const x of Object.values(obj(r))) if (x && x.name) rxBy[x.name] = (rxBy[x.name] || 0) + 1;
  const bdBy = Object.create(null);
  for (const x of Object.values(obj(v.birthdays))) if (x && x.name) bdBy[x.name + "|" + x.cls] = x.md;
  const today = israelDay(now), last30 = Array.from({ length: 30 }, (_, i) => dayAdd(today, i - 29)); // לפי לוח השנה בישראל
  const students = Object.entries(obj(v.presence)).filter(([k, x]) => isDevKey(k) && x && typeof x === "object").map(([key, x]) => {
    const days = arr(x.days);
    return { key, name: x.name || "", cls: x.cls || "", eng: x.eng || "", math: x.math || "", major: x.major || "", mashov: !!x.mashov, ver: x.ver || "", plat: x.plat || "", inst: !!x.inst,
      first: x.first || 0, last: x.last || 0, opens: x.opens || 0, d7: days.filter(d => d >= last30[23]).length, d30: days.filter(d => d >= last30[0]).length,
      days: days.filter(d => d >= last30[0]), reacts: rxBy[x.name] || 0, bday: bdBy[(x.name || "") + "|" + (x.cls || "")] || "", susp: suspOf(v.control, key, personKey(x.name, x.cls), now) };
  }).sort((a, b) => b.last - a.last);
  const daily = last30.map(d => ({ day: d, n: students.filter(s => s.days.includes(d)).length }));
  const ctl = obj(v.control);
  // תקלות: מקובצות לפי "חתימה" (אותה שגיאה באותו מקום)
  const eg = new Map();
  for (const e of arr(v.errors)) {
    if (!e || !e.sig) continue;
    const g = eg.get(e.sig) || { sig: e.sig, msg: e.msg, src: e.src, pages: new Set(), count: 0, first: e.at, last: e.at, vers: new Set(), plats: new Set(), names: new Set(), devs: new Set() };
    g.count++; g.first = Math.min(g.first, e.at); g.last = Math.max(g.last, e.at);
    if (e.page) g.pages.add(e.page); if (e.ver) g.vers.add(e.ver); if (e.plat) g.plats.add(e.plat); if (e.name) g.names.add(e.name); if (e.k) g.devs.add(e.k);
    eg.set(e.sig, g);
  }
  const errors = [...eg.values()].sort((a, b) => b.last - a.last).slice(0, 60)
    .map(g => ({ sig: g.sig, msg: g.msg, src: g.src, pages: [...g.pages], count: g.count, many: g.count >= ERR_PER_SIG, devices: g.devs.size, first: g.first, last: g.last, vers: [...g.vers].slice(0, 6), plats: [...g.plats].slice(0, 6), names: [...g.names].slice(0, 12) }));
  // מנהל הישיבה רואה הכול חוץ מהכלים של מנהל המערכת: תקלות, יומן מלא ומצב עדכון
  const ownerOnly = full ? { maint: maintOf(ctl, now), errors, log: arr(v.ownerLog).slice(0, 150) } : {};
  return { ok: true, now, today, students, daily, ...ownerOnly,
    suspended: [...Object.entries(obj(ctl.suspN)).map(([p, x]) => ({ person: p, ...x })), ...Object.entries(obj(ctl.susp)).map(([k, x]) => ({ key: k, ...x }))].filter(x => liveUntil(x, now))
      .map(x => ({ ...(x.person ? { person: x.person } : { key: x.key }), until: x.until ?? null, reason: x.reason || "", at: x.at || 0, g: x.g || "" })),
    msgs: arr(v.ownerMsgs).filter(m => m.expiresAt > now && (full || m.from === "principal")).map(m => ({ id: m.id, text: m.text, to: m.to, from: m.from || "owner", names: m.names || [], count: (m.keys || []).length, createdAt: m.createdAt, expiresAt: m.expiresAt })),
    ai: (() => { const st = obj(v.aiStats); return st.day === israelDay(now) ? { ok: st.ok || 0, fail: st.fail || 0, users: Object.keys(obj(st.users)).length, on: !!aiKey(), last: st.last || null } : { ok: 0, fail: 0, users: 0, on: !!aiKey() }; })(),
    departures: arr(v.departures).filter(d => d && d.at > now - 30 * 864e5).map(d => ({ name: d.name, cls: d.cls, at: d.at, back: d.back || 0 })),
    staff: arr(v.users).map(u => ({ name: u.name, role: u.role, owner: !!u.owner, createdAt: u.createdAt || 0 })),
    content: {
      updatesActive: activeUpdates(v.updates, now).length, updatesTotal: arr(v.updates).length,
      views: Object.values(obj(v.views)).reduce((a, n) => a + (+n || 0), 0),
      pollsActive: arr(v.polls).filter(x => x.endsAt > now).length, events: arr(v.events).filter(e => e.date >= today).length,
      qNew: arr(v.questions).filter(q => q.status === "new").length, qAnswered: arr(v.questions).filter(q => q.status === "answered").length,
      fbOpen: arr(v.feedback).filter(x => !x.done).length, fbTotal: arr(v.feedback).length,
      contacts: Array.isArray(v.contacts) ? v.contacts.length : Object.keys(obj(v.contacts)).length,
      releases: arr(v.releases).filter(r => r.at > now - RELEASE_DAYS * 864e5).length,
      changes: arr(v.changes).filter(c => c && c.date >= today).length, sets: arr(v.sets).length,
      reactions: Object.values(rxBy).reduce((a, n) => a + n, 0), birthdays: Object.keys(obj(v.birthdays)).length,
    },
  };
}
// מי השתמש ב-7 הימים האחרונים, ובכמה תלמידים כל מקצוע בסיכון – רק מספרים, בלי שמות
async function classStats(S) {
  const st = await S.get("stats") || {}, since = israelDay(Date.now() - 7 * 864e5), out = {};
  for (const x of Object.values(st)) {
    if (!x || x.day < since) continue;
    const c = out[x.cls] = out[x.cls] || { active: 0, mashov: 0, risk: Object.create(null), warn: Object.create(null) };
    c.active++; if (x.mashov) c.mashov++;
    for (const n of x.risk || []) c.risk[n] = (c.risk[n] || 0) + 1;
    for (const n of x.warn || []) c.warn[n] = (c.warn[n] || 0) + 1;
  }
  return out;
}
// ===== פעולות ניהול משותפות: מנהל המערכת (owner.html) ומנהל הישיבה (staff.html, תפקיד admin) =====
// by = "" למנהל המערכת, או "👔 <שם>: " למנהל הישיבה – כך ביומן הפעולות רואים מי עשה מה.
async function suspendOp(S, b, now, by) { // השעיה לפי מכשירים + לפי שם וכיתה (כדי שהרשמה מחדש באותו שם לא תעקוף)
    // כל תלמיד = קבוצה אחת: השם+כיתה שלו והמכשירים שלו (people:[{name, cls, keys}]). החזרה של חלק מהקבוצה מחזירה את כולה,
    // כך שלא נשאר מכשיר או שם "תקוע" בהשעיה (למשל מכשיר שנמחק מהרשימה, או תלמיד ששינה שם)
    const ppl = (Array.isArray(b.people) ? b.people : []).slice(0, 50).map(p => ({ pk: personOf(p), keys: keysOf(p && p.keys, 20), name: clean(p && p.name, MAX_NAME) })).filter(p => p.pk || p.keys.length);
    let loose = keysOf(b.keys, 50).filter(k => !ppl.some(p => p.keys.includes(k)));
    if (ppl.length === 1 && loose.length) { ppl[0].keys = [...ppl[0].keys, ...loose].slice(0, 50); loose = []; } // מבנה ישן: keys בנפרד, תלמיד אחד
    const groups = [...ppl, ...loose.map(k => ({ pk: null, keys: [k], name: "" }))];
    // החזרה לפי המפתח השמור עצמו ("שם|כיתה" כמו שמופיע ברשימת המושעים) – גם לרשומות ישנות שלא עוברות את הבדיקה של היום
    if (b.action === "unsuspend") for (const x of (Array.isArray(b.pkeys) ? b.pkeys : []).slice(0, 50)) if (typeof x === "string" && x.length <= 60 && x.includes("|")) groups.push({ pk: x, keys: [], name: x.slice(0, x.lastIndexOf("|")) });
    if (!groups.length || (b.action === "suspend" && badMinutes(b.minutes))) throw new Fail(400, "bad_request");
    const min = minutesOrNull(b.minutes), until = min ? now + min * 60e3 : null, reason = clean(b.reason, 200);
    await S.update("control", cur => {
      const c = cur && typeof cur === "object" ? cur : {};
      c.susp = c.susp && typeof c.susp === "object" ? c.susp : {}; c.suspN = c.suspN && typeof c.suspN === "object" ? c.suspN : {};
      if (b.action === "suspend") for (const g of groups) {
        const rec = { until, reason, at: now, g: newId() };
        for (const k of g.keys) c.susp[k] = rec;
        if (g.pk) c.suspN[g.pk] = rec;
      } else {
        const gs = new Set(), own = (m, k) => Object.hasOwn(m, k) && m[k] && m[k].g;
        for (const g of groups) { for (const k of g.keys) if (own(c.susp, k)) gs.add(c.susp[k].g); if (g.pk && own(c.suspN, g.pk)) gs.add(c.suspN[g.pk].g); }
        for (const g of groups) { for (const k of g.keys) delete c.susp[k]; if (g.pk) delete c.suspN[g.pk]; }
        for (const m of [c.susp, c.suspN]) for (const x of Object.keys(m)) if (m[x] && gs.has(m[x].g)) delete m[x];
      }
      for (const m of [c.susp, c.suspN]) for (const x of Object.keys(m)) if (!liveUntil(m[x], now)) delete m[x]; // ניקוי השעיות שנגמרו
      if (Object.keys(c.susp).length + Object.keys(c.suspN).length > 3000) throw new Fail(413, "too_many");
      return c;
    });
    const who = groups.map(g => g.name).filter(Boolean).slice(0, 10).join(", ") || groups.reduce((a, g) => a + g.keys.length, 0) + " מכשירים";
    await olog(S, b.action, by + (b.action === "suspend" ? `השעיה: ${who} ${min ? "ל-" + (min >= 1440 ? Math.round(min / 1440) + " ימים" : min + " דק'") : "עד החזרה"}${reason ? " · " + reason : ""}` : `החזרה: ${who}`));
    return { ok: true };
  }
async function msgSendOp(S, b, now, by) { // הודעה ממנהל המערכת: לכולם / לכיתה / לתלמידים שנבחרו
    const text = clean(b.text, MSG_TEXT), to = [...AUDIENCES, "some"].includes(b.to) ? b.to : "";
    const hours = Math.max(1, Math.min(24 * 14, Math.round(Number(b.hours)) || 24));
    const pl = (Array.isArray(b.people) ? b.people : []).slice(0, 300);
    const keys = [...new Set([...keysOf(b.keys, 300), ...pl.flatMap(p => keysOf(p && p.keys, 20))])].slice(0, 600);
    const people = [...new Set(pl.map(personOf).filter(Boolean))];
    if (!text || !to || (to === "some" && !keys.length && !people.length)) throw new Fail(400, "bad_request");
    const m = { id: newId(), text, to, ...(by ? { from: "principal" } : {}), ...(to === "some" ? { keys, people, names: (Array.isArray(b.names) ? b.names : []).map(x => clean(x, MAX_NAME)).filter(Boolean).slice(0, 300) } : {}), createdAt: now, expiresAt: now + hours * 3600e3 };
    await S.update("ownerMsgs", cur => [m, ...(Array.isArray(cur) ? cur : []).filter(x => x.expiresAt > now - 7 * 864e5)].slice(0, MSG_MAX));
    await olog(S, "msgSend", by + `הודעה ${to === "all" ? "לכולם" : to === "some" ? "ל-" + ((m.names || []).slice(0, 5).join(", ") || keys.length + " מכשירים") : "ל" + to}: ${text.slice(0, 80)}`);
    const pushed = await sendPush(S, (x, k) => to === "some" ? keys.includes(k) : audienceMatch(to, x), { title: by ? "📩 הודעה מהנהלת הישיבה" : "📩 הודעה ממנהל המערכת", body: text.slice(0, 160), tag: "own-" + m.id }, { pref: "urgent", ttl: 6 * 3600 }).catch(() => 0);
    return { ok: true, id: m.id, pushed };
  }
async function msgDeleteOp(S, b, by, onlyPrincipal = false) {
    const id = String(b.id || "");
    if (!/^[\w-]{4,40}$/.test(id)) throw new Fail(400, "bad_request");
    let gone = null;
    await S.update("ownerMsgs", cur => { const l = Array.isArray(cur) ? cur : []; gone = l.find(x => x && x.id === id && (!onlyPrincipal || x.from === "principal")) || null; return gone ? l.filter(x => x !== gone) : undefined; });
    if (gone) await olog(S, "msgDelete", by + `מחיקת הודעה: ${String(gone.text || "").slice(0, 60)}`);
    return { ok: true };
  }

// תלמיד שמחק את המשתמש ונרשם מחדש: אותו שם ואותה כיתה, ולפחות עוד פרט אחד תואם (הקבצה/מגמה) → "חזר"
const DEPART_DAYS = 120;
async function noticeReturn(S, k, rec, now) {
  const pk = personKey(rec.name, rec.cls), dep = await S.get("departures");
  const hit = d => d && !d.back && personKey(d.name, d.cls) === pk && ["eng", "math", "major"].some(f => d[f] && d[f] === rec[f]);
  if (!Array.isArray(dep) || !dep.some(hit)) return;
  let found = null;
  await S.update("departures", cur => { const l = Array.isArray(cur) ? cur : [], d = l.find(hit); if (!d) return undefined; d.back = now; found = d; return l; });
  if (found) { const days = Math.round((now - found.at) / 864e5); await olog(S, "return", `🔄 ${rec.name} (${rec.cls}) חזר למערכת${days ? " אחרי " + days + " ימים" : ""}, ממשתמש חדש`); }
}
// יומן פעולות של מנהל המערכת (300 אחרונות)
async function olog(S, action, detail) {
  const now = Date.now(), e = { at: now, action, detail: clean(detail, 300) };
  await S.update("ownerLog", cur => {
    const l = Array.isArray(cur) ? cur : [], top = l[0];
    // הרבה קודים שגויים ברצף = שורה אחת עם מונה, כדי שמי שמנחש לא ידחוק החוצה את כל היומן
    if (action === "loginFail" && top && top.action === "loginFail" && now - top.at < 3600e3) {
      const n = (+top.n || 1) + 1;
      return [{ ...top, at: now, n, detail: `${n} ניסיונות כניסה עם קוד שגוי (בשעה האחרונה)` }, ...l.slice(1)];
    }
    return [e, ...l].slice(0, 300);
  }).catch(() => {});
}
const ERR_MAX = 500, ERR_PER_SIG = 40; // תקלה אחת שקורית לכולם לא דוחקת החוצה את כל השאר
const HELLO_TOUCH = 7 * 60e3; // "שלום" בלי שינוי נכתב לכל היותר פעם ב-7 דקות ("מחובר עכשיו" בדף הניהול = 10 דקות)
async function ownerSecret(S) {
  let sec = null;
  await S.update("ownerConf", cur => { if (cur && cur.secret) { sec = cur.secret; return undefined; } sec = crypto.randomBytes(32).toString("hex"); return { secret: sec, createdAt: Date.now() }; });
  return sec;
}
async function owner(req, S, ip, headers) {
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let b; try { b = await req.json(); } catch { b = null; }
  if (!b || typeof b !== "object") return reply(400, { ok: false, error: "bad_request" }, headers);
  const secret = await ownerSecret(S), now = Date.now(), ov = String(OWNER.hash || "").slice(0, 12);
  if (b.action === "login") {
    const code = norm(b.code);
    if (!code || code.length > 64) return reply(400, { ok: false, error: "bad_request" }, headers);
    await attempt(S, ip);
    if (!OWNER.hash || !safeEq(await hashCodeAsync(code, OWNER.salt), OWNER.hash)) { await olog(S, "loginFail", "ניסיון כניסה עם קוד שגוי"); return reply(401, { ok: false, error: "bad_code" }, headers); }
    await forgive(S, ip);
    await olog(S, "login", "כניסה לדף הניהול");
    return reply(200, { ok: true, token: sign({ own: 1, ov, exp: now + OWNER_DAYS * 864e5 }, secret) }, headers);
  }
  const p = verify((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), secret);
  if (!p || p.own !== 1 || p.ov !== ov) return reply(401, { ok: false, error: "auth" }, headers);
  if (b.action === "logoutAll") { // ניתוק כל המכשירים (למשל אם נכנסת ממחשב של מישהו אחר): סוד חדש = כל הטוקנים הישנים נפסלים
    await S.update("ownerConf", cur => ({ ...(cur && typeof cur === "object" ? cur : {}), secret: crypto.randomBytes(32).toString("hex"), rotatedAt: now }));
    await olog(S, "logoutAll", "ניתוק כל המכשירים מדף הניהול");
    return reply(200, { ok: true }, headers);
  }
  if (b.action === "forget") { // מחיקת רשומה של מכשיר (למשל לבקשת תלמיד)
    const k = String(b.key || "");
    if (!/^[0-9a-f]{24}$/.test(k)) return reply(400, { ok: false, error: "bad_request" }, headers);
    let nm = "";
    await S.update("presence", cur => { const m = cur || {}; if (!Object.hasOwn(m, k)) return undefined; nm = m[k] && m[k].name || ""; delete m[k]; return m; });
    await olog(S, "forget", `מחיקת רשומת מכשיר${nm ? " של " + nm : ""}`);
    return reply(200, { ok: true }, headers);
  }
  if (b.action === "errClear") { // תקלה טופלה (או: ניקוי כל התקלות)
    const sig = String(b.sig || "");
    if (sig && !/^[0-9a-f]{12}$/.test(sig)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await S.update("errors", cur => { const l = Array.isArray(cur) ? cur : []; const n = sig ? l.filter(e => e.sig !== sig) : []; return n.length === l.length ? undefined : n; });
    await olog(S, "errClear", sig ? "תקלה סומנה כטופלה" : "ניקוי כל התקלות");
    return reply(200, { ok: true }, headers);
  }
  if (b.action === "maint") { // מצב עדכון לכולם: לזמן קצוב (דקות) או עד שעוצרים
    if (b.on && badMinutes(b.minutes)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const on = !!b.on, min = minutesOrNull(b.minutes), msg = clean(b.msg, 200);
    await S.update("control", cur => { const c = cur && typeof cur === "object" ? cur : {}; c.maint = on ? { until: min ? now + min * 60e3 : null, msg, at: now } : null; return c; });
    await olog(S, on ? "maintOn" : "maintOff", on ? `הפעלת מצב עדכון ${min ? "ל-" + min + " דק'" : "עד עצירה"}${msg ? ": " + msg : ""}` : "עצירת מצב העדכון");
    return reply(200, { ok: true }, headers);
  }
  if (b.action === "suspend" || b.action === "unsuspend") return reply(200, await suspendOp(S, b, now, ""), headers);
  if (b.action === "msgSend") return reply(200, await msgSendOp(S, b, now, ""), headers);
  if (b.action === "msgDelete") return reply(200, await msgDeleteOp(S, b, ""), headers);
  if (b.action === "holGet") return reply(200, await holOverview(S, now), { ...headers, "Cache-Control": "no-store" });
  if (b.action === "holSet") return reply(200, await holSetOp(S, b), headers);
  if (["codeList", "codeCreate", "codeSet", "ownLink", "ownPowers", "ownUnlink"].includes(b.action)) return reply(200, await roboOwnerOp(S, b, now), { ...headers, "Cache-Control": "no-store" });
  if (b.action !== "overview") return reply(400, { ok: false, error: "bad_action" }, headers);
  return reply(200, await schoolOverview(S, now, true), { ...headers, "Cache-Control": "no-store" });
}

async function feed(req, S, ip, headers) {
  if (req.method === "GET") {
    const now = Date.now(), today = israelDay(now);
    const [ups, polls, events, qs, bd, rx, chg, ctl, om, hc, rr, rn] = await Promise.all(["updates", "polls", "events", "questions", "birthdays", "reactions", "changes", "control", "ownerMsgs", "holCfg", "roboRare", "roboNews"].map(k => S.get(k)));
    return reply(200, {
      ok: true, now,
      // 🎉 מצב חג: האם מנהל המערכת כיבה (הכל / חג מסוים). התאריכים עצמם מחושבים בטלפון
      hol: holPublic(hc),
      robo: roboCounts(rr), // 🤖 כמה נשארו מכל אביזר אולטרה אגדי
      roboNews: (Array.isArray(rn) ? rn : []).filter(x => now - x.at < 2 * 864e5).slice(0, 5), // 👑 מי זכה באולטרה (שם, כיתה, כמה נשארו)
      updates: activeUpdates(ups, now).map(u => ({ ...publicUpdate(u), reacts: reactCounts(reactsOf(rx, u.id)) })),
      polls: (polls || []).filter(p => p.endsAt > now).sort((a, b) => b.createdAt - a.createdAt).map(publicPoll),
      events: (events || []).filter(e => e.date >= today).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).slice(0, 30)
        .map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time || "", place: e.place || "", desc: e.desc || "", audience: e.audience })),
      answers: (qs || []).filter(q => q.status === "answered" && q.answeredAt > now - 21 * 864e5).sort((a, b) => b.answeredAt - a.answeredAt).slice(0, 30)
        .map(q => ({ id: q.id, q: q.text, a: q.answer, to: q.to, cls: q.cls, by: q.answeredBy, at: q.answeredAt })),
      birthdays: upcomingBirthdays(bd, now),
      changes: (chg || []).filter(x => x.date >= today).sort((a, b) => (a.date + a.s).localeCompare(b.date + b.s)).slice(0, 200).map(publicChange),
      maint: maintOf(ctl, now),
      // הודעות של המנהל/מנהל המערכת לכולם או לכיתה – מגיעות מהר דרך הפיד (הודעות אישיות – רק דרך "שלום")
      msgs: (Array.isArray(om) ? om : []).filter(m => m.expiresAt > now && m.to !== "some").map(m => ({ id: m.id, text: m.text, to: m.to, at: m.createdAt, exp: m.expiresAt, ...(m.from ? { from: m.from } : {}) })),
    }, { ...headers, ...EDGE });
  }
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let b; try { b = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const action = String(b?.action || ""), now = Date.now();
  const device = String(b?.device || ""), cls = AUDIENCES.includes(b?.cls) && b.cls !== "all" ? b.cls : "";
  if (["vote", "react", "birthday", "ask"].includes(action) && DEV_RE.test(device)) {
    const ctl = await S.get("control");
    if (suspOf(ctl, devKey(device), personKey(b?.name, cls), now)) return reply(403, { ok: false, error: "suspended" }, headers);
  }
  if (action === "vote") {
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "voteRate", ip, 1500); // מכסות לכתובת: כל בית הספר יכול לצאת מאותה כתובת (WiFi של בית הספר)
    const k = devKey(device), opt = Math.round(Number(b.option));
    let out = null;
    await S.update("polls", cur => {
      const list = cur || [], p = list.find(x => x.id === b.poll);
      if (!p || p.endsAt <= now) throw new Fail(404, "not_found");
      if (!(opt >= 0 && opt < p.options.length)) throw new Fail(400, "bad_request");
      p.voters = p.voters || {};
      if (Object.keys(p.voters).length >= 3000) throw new Fail(413, "too_many");
      if (p.voters[k] != null) { out = p; return undefined; } // כבר הצביע – לא סופרים פעמיים
      p.voters[k] = opt; p.votes = p.votes || {}; p.votes[opt] = (p.votes[opt] || 0) + 1; out = p;
      return list;
    });
    return reply(200, { ok: true, poll: publicPoll(out), mine: out.voters[k] }, headers);
  }
  if (action === "ask") {
    const text = clean(b.text, 500), to = clean(b.to, 60);
    if (!text) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "askRate", ip, 200);
    const q = { id: newId(), text, to, cls, status: "new", createdAt: now };
    await S.update("questions", cur => [q, ...(cur || []).filter(x => x.createdAt > now - 90 * 864e5)].slice(0, 500));
    return reply(200, { ok: true, id: q.id }, headers);
  }
  if (action === "react") {
    const id = String(b.id || ""), emoji = String(b.emoji || "");
    if (!DEV_RE.test(device) || !id || id.length > 40 || (emoji && !isEmoji(emoji))) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "reactRate", ip, 4000);
    const ups = await S.get("updates") || [];
    if (!ups.some(u => u.id === id && u.expiresAt > now && (u.startsAt || 0) <= now)) return reply(404, { ok: false, error: "not_found" }, headers);
    const k = devKey(device), name = clean(b.name, MAX_NAME);
    let counts = null;
    await S.update("reactions", cur => {
      const m = cur && typeof cur === "object" ? cur : {};
      const live = new Set(ups.filter(u => u.expiresAt > now - 7 * 864e5).map(u => u.id));
      for (const x of Object.keys(m)) if (!live.has(x)) delete m[x]; // ניקוי תגובות לעדכונים ישנים
      const r = Object.hasOwn(m, id) ? m[id] : (m[id] = {});
      if (!emoji) delete r[k];
      else { if (!r[k] && Object.keys(r).length >= 3000) throw new Fail(413, "too_many"); r[k] = { e: emoji, name, cls, at: now }; }
      counts = reactCounts(r);
      return m;
    });
    return reply(200, { ok: true, id, counts, mine: emoji }, headers);
  }
  if (action === "err") { // שגיאה שקרתה בטלפון של תלמיד – לדף מנהל המערכת
    const msg = clean(b.msg, 300), src = clean(b.src, 200), page = clean(b.page, 40);
    if (!msg) return reply(400, { ok: false, error: "bad_request" }, headers);
    memRate("err", ip, 3000);
    const e = { sig: sha(msg + "|" + src.replace(/[?#].*$/, "")).slice(0, 12), msg, src, page, ver: clean(b.ver, 20), plat: clean(b.plat, 40), name: clean(b.name, MAX_NAME), cls, k: DEV_RE.test(device) ? devKey(device) : "", at: now };
    // אותה תקלה מאותו מכשיר באותו יום כבר רשומה – לא כותבים שוב (חוסך כתיבה, ומונע ניפוח של המונה)
    const dup = l => e.k && l.some(x => x && x.sig === e.sig && x.k === e.k && israelDay(x.at) === israelDay(now));
    const known = await S.get("errors");
    if (dup(Array.isArray(known) ? known : [])) return reply(200, { ok: true }, headers);
    await rateLimit(S, "errRate", ip, 2000);
    await S.update("errors", cur => {
      const l = Array.isArray(cur) ? cur : [];
      if (dup(l)) return undefined;
      // תקלה שקורית לכולם: שומרים רק את 40 האחרונות שלה, כדי שלא תדחוק החוצה תקלות אחרות
      const same = l.filter(x => x && x.sig === e.sig), drop = same.length >= ERR_PER_SIG ? same[same.length - 1] : null;
      return [e, ...l.filter(x => x !== drop)].slice(0, ERR_MAX);
    });
    return reply(200, { ok: true }, headers);
  }
  if (action === "hello") {
    if (!DEV_RE.test(device) || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    // כל בית הספר יכול לצאת מאותה כתובת (400 תלמידים × "שלום" כל 3 דקות = 8,000 בשעה) – לכן הגבלה בזיכרון בלבד, נדיבה
    memRate("hello", ip, 20000);
    const k = devKey(device), day = israelDay(now), key = x => /^[a-z]{2,12}$/.test(String(x || "")) ? String(x) : "";
    const rec = { name: clean(b.name, MAX_NAME), cls, eng: key(b.eng), math: key(b.math), major: key(b.major), mashov: !!b.mashov, ver: clean(b.ver, 20), plat: clean(b.plat, 40), inst: !!b.inst, ...(b.hide ? { hide: true } : {}) };
    const sig = x => JSON.stringify([x.name, x.cls, x.eng, x.math, x.major, x.mashov, x.ver, x.plat, x.inst, !!x.hide]);
    const mine = m => m && typeof m === "object" && Object.hasOwn(m, k) && m[k] && typeof m[k] === "object" ? m[k] : null;
    // כותבים רק כשצריך: מכשיר חדש, יום חדש, כל 7 דקות, או פרטים שהשתנו (לכל היותר פעם בדקה).
    // אחרת כל "שלום" היה כותב מחדש את כל הרשימה – עלות, ועומס כשכולם פותחים בהפסקה
    const due = old => !old || !Array.isArray(old.days) || !old.days.includes(day) || !(now - old.last < HELLO_TOUCH) || (sig(old) !== sig(rec) && !(now - old.last < 60e3));
    let isNew = false;
    try {
      const old0 = mine(await S.get("presence")); isNew = !old0;
      if (due(old0)) {
        if (!old0) await rateLimit(S, "helloNew", ip, 1500); // מכשירים חדשים מכתובת אחת – שאי אפשר למלא את הרשימה במכשירים מזויפים
        await S.update("presence", cur => {
          const m = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {}, old = mine(m);
          if (!due(old)) return undefined;
          for (const x of Object.keys(m)) if (!isDevKey(x) || !m[x] || !(now - m[x].last <= PRESENCE_DAYS * 864e5)) delete m[x];
          if (!old && Object.keys(m).length >= PRESENCE_MAX) throw new Fail(413, "too_many");
          const since = dayAdd(day, -31), days = (old && Array.isArray(old.days) ? old.days : []).filter(d => typeof d === "string" && d >= since && d !== day);
          m[k] = { ...rec, first: old?.first || now, last: now, opens: (old?.opens || 0) + (!old || now - old.last > 30 * 60e3 ? 1 : 0), days: [...days, day] };
          return m;
        });
      }
    } catch (e) { if (!(e instanceof Fail)) console.error("hello presence:", e && e.message); } // רשימה מלאה / עומס – עדיין עונים עם מצב עדכון/השעיה/הודעות
    const [ctl, om, wz] = await Promise.all([S.get("control"), S.get("ownerMsgs"), S.get("wishes")]), pk = personKey(rec.name, cls);
    if (isNew && rec.name) await noticeReturn(S, k, rec, now).catch(() => {});
    const w = wz && Object.hasOwn(wz, pk) && wz[pk] && wz[pk].day === day ? Object.values(wz[pk].from || {}).map(x => x.name).filter(Boolean).slice(0, 200) : [];
    return reply(200, { ok: true, maint: maintOf(ctl, now), susp: suspOf(ctl, k, pk, now), msgs: msgsFor(om, k, pk, cls, now), ...(w.length ? { wishes: w } : {}) }, headers);
  }
  if (action === "birthday") {
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const k = devKey(device);
    if (b.remove) { await S.update("birthdays", cur => { const m = cur || {}; if (!Object.hasOwn(m, k)) return undefined; delete m[k]; return m; }); return reply(200, { ok: true }, headers); }
    const name = clean(b.name, MAX_NAME), md = String(b.md || "");
    if (!name || !cls || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(md)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "bdRate", ip, 1000);
    await S.update("birthdays", cur => { const m = cur || {}; if (!m[k] && Object.keys(m).length >= 2000) throw new Fail(413, "too_many"); m[k] = { name, cls, md, at: now }; return m; });
    return reply(200, { ok: true }, headers);
  }
  if (action === "mates") { // לעוזר: מי מהכיתה שלי רשום באפליקציה (שמות), וימי הולדת ששותפו בשכבה שלי
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    memRate("mates", ip, 3000);
    const pres = await S.get("presence"), k = devKey(device), me = pres && Object.hasOwn(pres, k) ? pres[k] : null;
    if (!me || !me.cls) return reply(403, { ok: false, error: "not_registered" }, headers); // רק תלמיד רשום, ורק על הכיתה/השכבה שלו
    const grade = c => (String(c).startsWith("ya") ? "11" : "10"), now2 = Date.now();
    const seen = new Set(), mates = [];
    for (const [kk, x] of Object.entries(pres || {})) {
      if (!isDevKey(kk) || !x || x.cls !== me.cls || x.hide || !x.name || !(now2 - x.last <= PRESENCE_DAYS * 864e5)) continue;
      const pk = personKey(x.name, x.cls); if (seen.has(pk)) continue; seen.add(pk); mates.push(x.name);
    }
    mates.sort((a, b) => a.localeCompare(b, "he"));
    const bd = await S.get("birthdays"), bdays = Object.values(bd || {}).filter(x => x && x.name && x.md && grade(x.cls) === grade(me.cls)).map(x => ({ name: x.name, cls: x.cls, md: x.md }));
    return reply(200, { ok: true, cls: me.cls, mates, bdays }, headers);
  }
  if (action === "robo") { // 🤖 אביזר "אולטרה אגדי" יצא בתיבה: כמות מוגבלת לכל הישיבה. נשמר רק מונה + קוד מכשיר מוצפן (בלי שם)
    if (DEV_RE.test(device) && ["code", "me", "link", "day"].includes(b.op)) return reply(200, await roboOp(S, b, device, ip, now), headers);
    if (DEV_RE.test(device) && ["pub", "class", "like", "gift", "inbox", "tradeNew", "tradeGet", "tradeSet", "tradeOk", "tradeCancel", "tradeDone"].includes(b.op)) return reply(200, await roboSocial(S, b, device, ip, now), headers);
    if (!DEV_RE.test(device) || b.op !== "claim" || !Object.hasOwn(ROBO_CAPS, String(b.item))) return reply(400, { ok: false, error: "bad_request" }, headers);
    memRate("robo", ip, 3000);
    const pres = await S.get("presence"), k = devKey(device);
    if (!pres || !Object.hasOwn(pres, k)) return reply(403, { ok: false, error: "not_registered", counts: roboCounts(await S.get("roboRare")) }, headers);
    const item = String(b.item), cap = ROBO_CAPS[item];
    let granted = false, n = 0;
    await S.update("roboRare", cur => {
      const m = cur && typeof cur === "object" ? { ...cur } : {}, x = m[item] && Array.isArray(m[item].keys) ? { ...m[item], keys: [...m[item].keys] } : { keys: [] };
      if (x.keys.includes(k)) { granted = true; n = x.keys.length; return undefined; } // כבר קיבל (למשל אחרי התקנה מחדש)
      if (x.keys.length >= cap) { n = x.keys.length; return undefined; } // אזל
      x.keys.push(k); m[item] = x; granted = true; n = x.keys.length; return m;
    });
    const counts = roboCounts(await S.get("roboRare"));
    if (granted) await olog(S, "roboRare", `👑 תלמיד קיבל ${ROBO_NAMES[item]} מתיבה! (${n} מתוך ${cap})`);
    if (granted && n > 0) { const me = pres[k] || {}; await S.update("roboNews", cur => [{ id: crypto.randomBytes(5).toString("hex"), kid: clean(me.name, MAX_NAME), cls: me.cls || "", item, name: ROBO_NAMES[item], n, cap, at: now }, ...(Array.isArray(cur) ? cur : [])].filter(x => now - x.at < 3 * 864e5).slice(0, 20)); }
    return reply(200, { ok: true, granted, n, cap, counts }, headers);
  }
  if (action === "leave") { // התלמיד מחק את המשתמש שלו: מוחקים את מה שנשמר עליו בשרת, ומודיעים להנהלה
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "leaveRate", ip, 200);
    const k = devKey(device);
    let rec = null;
    await S.update("presence", cur => { if (!cur || !Object.hasOwn(cur, k)) return undefined; rec = cur[k]; const m = { ...cur }; delete m[k]; return m; });
    for (const key of ["birthdays", "stats", "push"]) await S.update(key, cur => { if (!cur || !Object.hasOwn(cur, k)) return undefined; const m = { ...cur }; delete m[k]; return m; });
    const name = clean(rec?.name || b.name, MAX_NAME), c = rec?.cls || cls;
    if (name) {
      const d = { name, cls: c, eng: rec?.eng || "", math: rec?.math || "", major: rec?.major || "", at: now, first: rec?.first || 0 };
      await S.update("departures", cur => [d, ...(Array.isArray(cur) ? cur : []).filter(x => x && x.at > now - DEPART_DAYS * 864e5)].slice(0, 300));
      await olog(S, "leave", `🗑️ ${name}${c ? " (" + c + ")" : ""} מחק את המשתמש שלו`);
    }
    return reply(200, { ok: true }, headers);
  }
  if (action === "wish") { // "🎉 מזל טוב" לחבר מהשכבה שיש לו היום יום הולדת. החוגג רואה מי איחל לו
    const to = personKey(b.toName, AUDIENCES.includes(b.toCls) ? b.toCls : ""), name = clean(b.name, MAX_NAME);
    if (!DEV_RE.test(device) || !name || !cls || !b.toName || to.endsWith("|")) return reply(400, { ok: false, error: "bad_request" }, headers);
    const day = israelDay(now), bd = await S.get("birthdays");
    if (!Object.values(bd || {}).some(x => x && personKey(x.name, x.cls) === to && x.md === day.slice(5))) return reply(404, { ok: false, error: "not_found" }, headers);
    await rateLimit(S, "wishRate", ip, 3000);
    const k = devKey(device);
    let n = 0;
    await S.update("wishes", cur => {
      const m = {};
      for (const [x, v] of Object.entries(cur && typeof cur === "object" ? cur : {})) if (v && v.day === day) m[x] = v; // רק של היום
      const w = Object.hasOwn(m, to) ? m[to] : (m[to] = { day, from: {} });
      if (!w.from[k] && Object.keys(w.from).length >= 300) throw new Fail(413, "too_many");
      w.from[k] = { name, cls, at: now }; n = Object.keys(w.from).length;
      return m;
    });
    return reply(200, { ok: true, count: n }, headers);
  }
  if (action === "ping") {
    // סטטיסטיקה אנונימית למנהל: כיתה + אילו מקצועות בסיכון. בלי שם ובלי מזהה אמיתי
    if (!DEV_RE.test(device) || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "pingRate", ip, 3000);
    const k = devKey(device), day = israelDay(now);
    const rec = { cls, day, risk: strList(b.risk, 15, 40).filter(SAFE_KEY), warn: strList(b.warn, 15, 40).filter(SAFE_KEY), mashov: !!b.mashov };
    await S.update("stats", cur => {
      const m = cur || {};
      if (m[k] && JSON.stringify(m[k]) === JSON.stringify(rec)) return undefined; // כבר נספר היום, בלי שינוי – לא כותבים
      if (!m[k] && Object.keys(m).length >= 3000) throw new Fail(413, "too_many");
      m[k] = rec;
      for (const x of Object.keys(m)) if (m[x].day < israelDay(now - 60 * 864e5)) delete m[x];
      return m;
    });
    return reply(200, { ok: true }, headers);
  }
  if (action === "release") {
    // אישור יציאה שההורה חתם עליו – מופיע אצל הצוות ב"שחרורים"
    const name = clean(b.name, MAX_NAME), reason = clean(b.reason, 200);
    if (!name || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "relRate", ip, 200);
    const date = clean(b.date, 10), from = clean(b.from, 5), until = clean(b.until, 5);
    if ((date && !validDate(date)) || (from && !validTime(from)) || (until && !validTime(until))) return reply(400, { ok: false, error: "bad_request" }, headers);
    const r = { id: newId(), name, cls, reason, date: date || israelDay(now), from, until, parent: clean(b.parent, MAX_NAME), lesson: clean(b.lesson, 60), teacher: clean(b.teacher, 60), at: now };
    // להורה כתוב שהאישור נשמר שבוע: שומרים 8 ימים (שבוע + מרווח) ולא יותר
    await S.update("releases", cur => [r, ...(cur || []).filter(x => x.at > now - RELEASE_DAYS * 864e5)].slice(0, 1000));
    return reply(200, { ok: true }, headers);
  }
  return reply(400, { ok: false, error: "bad_action" }, headers);
}

// ---------- ספר טלפונים ----------
// מספר בפורמט אחיד: 0501234567 → 050-123-4567. מקבל גם +972
function normPhone(p) {
  let d = String(p || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4); else if (d.startsWith("972") && d.length >= 11) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  if (!/^0\d{8,9}$/.test(d)) return null;
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
}
async function contacts(req, S, ip, headers) {
  if (req.method === "GET") {
    const c = await S.get("contacts") || {};
    const list = Object.entries(c).map(([name, x]) => ({ name, phone: x.phone || "", note: x.note || "", extra: !!x.extra }));
    return reply(200, { ok: true, contacts: list }, { ...headers, "Cache-Control": "public, max-age=30" });
  }
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let body; try { body = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  if (!body || typeof body !== "object") return reply(400, { ok: false, error: "bad_request" }, headers);
  // מי מורשה לערוך: קוד העריכה, או מנהל מחובר
  let who = null;
  const code = norm(body.code);
  if (code) {
    await attempt(S, ip);
    // קוד שהמנהל יצר (scrypt ב-Blobs) גובר על הקוד הישן שבקוד המקור. אחרי שנוצר – הישן לא עובד
    const pc = (await S.get("config"))?.phoneCode;
    const good = code.length <= 64 && (pc && pc.hash ? safeEq(await hashCodeAsync(code, pc.salt), pc.hash) : !!PHONE_HASH && safeEq(sha(code), PHONE_HASH));
    if (good) { who = "editor"; await forgive(S, ip); }
    else return reply(403, { ok: false, error: "bad_code" }, headers);
  } else {
    const cfg = await S.get("config");
    const auth = cfg && verify((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), cfg.secret);
    const users = auth ? await S.get("users") || [] : [];
    const me = auth && users.find(x => x.id === auth.uid && (x.tv || 0) === (auth.tv || 0));
    if (me && me.role === "admin") who = me.name;
  }
  if (!who) return reply(401, { ok: false, error: "auth" }, headers);
  const action = String(body.action || "");
  if (action === "check") return reply(200, { ok: true, who }, headers);
  const name = clean(body.name, MAX_NAME);
  if (!name || !SAFE_KEY(name)) return reply(400, { ok: false, error: "bad_request" }, headers);
  if (action === "set") {
    const raw = clean(body.phone, 30), phone = raw ? normPhone(raw) : "";
    if (raw && !phone) return reply(400, { ok: false, error: "bad_phone" }, headers);
    const note = clean(body.note, 60);
    let out = null;
    await S.update("contacts", cur => {
      const c = cur || {};
      const prev = Object.hasOwn(c, name) && c[name] && typeof c[name] === "object" ? c[name] : null; // לא קוראים מה-prototype
      if (!prev && Object.keys(c).length >= MAX_CONTACTS) throw new Fail(413, "too_many");
      c[name] = { ...(prev || {}), phone, note, extra: !!(body.extra ?? (prev && prev.extra)), updatedAt: Date.now(), by: who };
      out = { name, phone, note: c[name].note, extra: c[name].extra };
      return c;
    });
    return reply(200, { ok: true, contact: out }, headers);
  }
  if (action === "remove") {
    await S.update("contacts", cur => { const c = cur || {}; if (!Object.hasOwn(c, name)) return undefined; delete c[name]; return c; });
    return reply(200, { ok: true }, headers);
  }
  return reply(400, { ok: false, error: "bad_action" }, headers);
}

// ===== 🔔 התראות לטלפון (Web Push) =====
// המפתחות (VAPID) נוצרים לבד בפעם הראשונה ונשמרים באחסון – אין מה להגדיר בנטליפיי.
// "push" = { [devKey]: { sub:{endpoint,keys}, cls, prefs:{tef,urgent}, at, last } }. בלי שם ובלי מזהה המכשיר עצמו.
const PUSH_MAX = 4000, PUSH_PREFS = ["tef", "urgent", "holiday", "streak"];
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|windows\.com|microsoft\.com|notify\.windows\.com)\//i;
let pushSender = (sub, payload, opts) => webpush.sendNotification(sub, payload, opts);
export function __setPushSender(f) { pushSender = f; }
async function vapid(S) {
  let v = await S.get("vapid");
  if (!v || !v.publicKey) { const k = webpush.generateVAPIDKeys(); await S.update("vapid", cur => cur && cur.publicKey ? undefined : k); v = await S.get("vapid"); }
  return v;
}
const audienceMatch = (aud, x) => aud === "all" || aud === x.cls;
function cleanSub(sub) {
  const e = String(sub && sub.endpoint || ""), p = String(sub && sub.keys && sub.keys.p256dh || ""), a = String(sub && sub.keys && sub.keys.auth || "");
  if (e.length > 600 || !PUSH_HOSTS.test(e) || !/^[A-Za-z0-9_-]{40,200}$/.test(p) || !/^[A-Za-z0-9_-]{10,60}$/.test(a)) return null;
  return { endpoint: e, keys: { p256dh: p, auth: a } };
}

// ===== 🤖 מערכתי – "המוח החכם" (Gemini, מסלול חינמי) =====
// POST /api/assist {device, q, page, grade, hist:[{role,text}]} → {ok, reply, action:{id,arg}|null, left}
// המפתח רק במשתני הסביבה של נטליפיי (GEMINI_API_KEY). לא שולחים לגוגל שם, כיתה, ציונים או חיסורים – רק את השאלה.
const AI_PER_DEVICE = 20, AI_PER_DAY = 900, AI_Q_MAX = 300;
let aiFetch = (...a) => fetch(...a), aiKeyOverride = null;
export function __setAiFetch(f) { aiFetch = f; }
export function __setAiKey(k) { aiKeyOverride = k; }
const aiKey = () => (aiKeyOverride != null ? aiKeyOverride : (process.env.GEMINI_API_KEY || ""));
// גוגל מחליפים שמות של מודלים מדי פעם: מנסים לפי הסדר, וממשיכים לבא בתור אם המודל לא קיים
const aiModels = () => [...new Set([process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"].filter(Boolean))];
const AI_TOPICS = [["order","סדר פעולות חשבון"],["fractions","שברים: חיבור, חיסור, כפל וחילוק"],["powers","חוקי חזקות"],["roots","שורשים"],["expand","פתיחת סוגריים וכינוס איברים"],["special","נוסחאות הכפל המקוצר"],["factor","פירוק לגורמים"],["algfrac","שברים אלגבריים"],["percent","אחוזים"],["ratio","יחס ופרופורציה"],["linear","משוואה ממעלה ראשונה"],["fraceq","משוואה עם שברים"],["lineq","אי-שוויון ממעלה ראשונה"],["system","מערכת משוואות (שני נעלמים)"],["quad","משוואה ריבועית (נוסחת השורשים)"],["quadineq","אי-שוויון ריבועי"],["biquad","משוואה דו-ריבועית והצבת עזר"],["radeq","משוואה עם שורש (אי-רציונלית)"],["linefn","פונקציה קווית (ישר): שיפוע ומשוואת ישר"],["parabola","פרבולה: קודקוד, חיתוכים וגרף"],["domain","תחום הגדרה של פונקציה"],["transform","הזזות ומתיחות של גרפים"],["pyth","משפט פיתגורס"],["areas","שטחים והיקפים"],["angles","זוויות: במשולש, במקבילים ובמצולע"],["congruent","חפיפת משולשים"],["similar","דמיון משולשים"],["circle","מעגל: זוויות, מיתרים ומשיקים"],["analytic","גיאומטריה אנליטית: מרחק, אמצע ומעגל"],["trigright","טריגונומטריה במשולש ישר-זווית"],["sinlaw","משפט הסינוסים"],["coslaw","משפט הקוסינוסים"],["trigarea","שטח משולש בעזרת סינוס"],["trigid","זהויות ומשוואות טריגונומטריות"],["arith","סדרה חשבונית"],["geom","סדרה הנדסית"],["expeq","משוואות מעריכיות"],["log","לוגריתמים"],["growth","גדילה ודעיכה"],["deriv","נגזרת: כללי גזירה"],["tangent","משיק לגרף"],["study","חקירת פונקציה"],["extreme","בעיות קיצון (מקסימום ומינימום)"],["integral","אינטגרל: פונקציה קדומה ושטח"],["expln","נגזרות של ,  וטריגו"],["prob","הסתברות בסיסית"],["tree","עץ הסתברות והסתברות מותנית"],["binom","התפלגות בינומית (ברנולי)"],["stats","סטטיסטיקה: ממוצע, חציון, שכיח וסטיית תקן"],["normal","התפלגות נורמלית"]];
const AI_ACTIONS = {
  home: "המסך הראשי", profile: "הפרופיל", edit: "עריכת פרטים: כיתה, הקבצות, מגמה, פנימייה, שם", photo: "תמונת פרופיל", theme: "צבע לאפליקציה (arg: purple|ocean|forest|sunset|rose|night)",
  bigtext: "טקסט גדול (arg: on|off)", push: "הגדרות התראות", calendar: "הוספת המערכת ליומן", install: "התקנה למסך הבית", whatsnew: "מה חדש", intro: "הדרכה קצרה על האפליקציה",
  feedback: "רעיון או תקלה (arg: idea|bug)", ask: "שאלה אנונימית לצוות", image: "המערכת כתמונה לשיתוף/הדפסה", parents: "קישור להורים", recap: "הסיכום החודשי",
  mashov: "חיבור משוב", mashovOff: "ניתוק משוב", email: "אימייל", bday: "שינוי יום ההולדת", delete: "מחיקת המשתמש (רק פותח – לא מוחק)", day: "המערכת ביום מסוים (arg: 0-6, ראשון=0)",
  calc: "המחשבון החכם", sci: "מחשבון מדעי", topics: "רשימת כל הנושאים במתמטיקה", topic: "הסבר על נושא במתמטיקה (arg: מזהה נושא)", practice: "תרגול בנושא (arg: מזהה נושא:רמה 1-4)",
  solve: "פתרון משוואה/תרגיל עם שלבים (arg: התרגיל, למשל 2x+3=11)", der: "נגזרת של פולינום (arg: הפולינום)", seq: "מחשבון סדרות", bin: "הסתברות בינומית", func: "גרף של פונקציה",
  line: "ישר דרך 2 נקודות", tri: "משולש ישר-זווית", pct: "מחשבון אחוזים", sys: "מערכת משוואות", attendance: "דף הנוכחות", grades: "דף הציונים (arg: מקצוע)", goal: "כמה צריך במבחן (arg: מקצוע)",
  cards: "כרטיסיות לשינון", newset: "סט כרטיסיות חדש", dict: "מילון אנגלית-עברית", phones: "ספר טלפונים של המורים (arg: שם)", exit: "שחרורון – אישור יציאה", about: "על האפליקציה ופרטיות",
  now: "מה יש לי עכשיו", next: "השיעור הבא", today: "המערכת היום", dayinfo: "המערכת ביום (arg: +1 למחר, או 0-6)", gear: "מה להביא מחר", end: "מתי נגמר היום", brk: "מתי ההפסקה",
  when: "מתי יש מקצוע (arg: מקצוע)", teacher: "מי המורה של מקצוע (arg: מקצוע)", abs: "חיסורים (arg: מקצוע)", avg: "ממוצע ציונים (arg: מקצוע)", streak: "רצפים", tef: "עד מתי אפשר להניח תפילין", bdays: "ימי הולדת קרובים", time: "שעה ותאריך",
  start: "מתי מתחילים (arg: +1 למחר)", changes: "שינויים/ביטולים במערכת", vac: "חופשות וחגים (arg: שם החג)", parsha: "פרשת השבוע", zmanim: "זמני היום, כניסת/יציאת שבת (arg: מה מחפשים)",
  news: "עדכונים והודעות מהצוות", polls: "סקרים פתוחים", events: "אירועים קרובים בישיבה", qanswers: "תשובות הצוות לשאלות של התלמיד", wishes: "מי איחל לו מזל טוב",
  lates: "כמה איחורים", praise: "כמה צל\"שים", left30: "כמה עוד מותר להחסיר עד 30% (arg: מקצוע)", best: "המקצוע הכי חזק/חלש לפי ציונים", teachers: "כל המורים שלו", subjects: "כל המקצועות שלו", weekly: "כמה שיעורים בשבוע במקצוע (arg: מקצוע)", mashovAge: "מתי משוב עודכן",
  mates: "מי מהכיתה שלו רשום באפליקציה (arg: withRav = גם המחנך)", bdayOf: "מתי יום ההולדת של חבר (arg: שם החבר)",
  me: "פרטים על התלמיד מהפרופיל שלו (arg: name|cls|rav|groups|major|dorm|bday|all) – למשל \"מה השם שלי\", \"באיזו כיתה אני\", \"מי המחנך שלי\"",
};
function aiPrompt(page, grade) {
  return `אתה "מערכתי" 🤖 – העוזר באפליקציית מערכת השעות של ישיבת בני עקיבא בית יהודה (כפר מימון). מדברים איתך תלמידי ${grade === "11" ? 'כיתה י"א' : grade === "10" ? "כיתה י'" : "תיכון"}.
כללים:
- עונים בעברית, קצר וברור (עד 70 מילים), בגובה העיניים, בחום ובכבוד. אימוג'י אחד-שניים זה בסדר.
- שאלה בלימודים: מסבירים ומדריכים צעד-צעד, נותנים רמז או דוגמה דומה – אבל לא פותרים שיעורי בית במקום התלמיד. אפשר להציע פעולה topic/practice/solve.
- אין לך מידע אישי על התלמיד (מערכת, ציונים, חיסורים, שמות). לשאלה כזו (כולל "מה השם שלי", "באיזו כיתה אני", עדכונים, שינויים, חופשות, איחורים) בוחרים את הפעולה המתאימה (me/mates/bdayOf/now/next/today/dayinfo/start/changes/gear/end/brk/when/teacher/teachers/subjects/weekly/abs/left30/lates/praise/avg/best/streak/tef/zmanim/parsha/vac/news/polls/events/qanswers/wishes/bdays/time/mashovAge) והאפליקציה תענה בעצמה – אל תמציא תשובה.
- כשהתלמיד מבקש להגיע למקום / לשנות הגדרה – בוחרים פעולה מהרשימה, ו-reply קצר שאומר מה עושים.
- לא עוזרים במשהו לא מתאים (אלימות, פגיעה, תוכן לא צנוע, עקיפת כללי הישיבה). מפנים בעדינות לצוות או לרב.
- אם לא בטוחים – שואלים שאלה קצרה בחזרה, בלי פעולה.
התשובה תמיד JSON: {"reply": "...", "action": "<מזהה מהרשימה או ריק>", "arg": "<פרמטר או ריק>"}.
פעולות: ${Object.entries(AI_ACTIONS).map(([k, v]) => `${k}=${v}`).join("; ")}.
נושאי מתמטיקה (מזהה=שם): ${AI_TOPICS.map(([k, v]) => `${k}=${v}`).join("; ")}.
התלמיד נמצא עכשיו בדף: ${page || "index.html"}.`;
}
// הפרמטר של ה-AI (טקסט) → הפרמטר של האפליקציה
function aiArg(id, a) {
  a = String(a || "").trim().slice(0, 120); if (!a) return undefined;
  if (id === "practice") { const [t, L] = a.split(/[:|,\s]+/); return AI_TOPICS.some(x => x[0] === t) ? { t, ...(+L >= 1 && +L <= 4 ? { L: +L } : {}) } : undefined; }
  if (id === "topic") return AI_TOPICS.some(x => x[0] === a) ? a : undefined;
  if (id === "day") return /^[0-6]$/.test(a) ? +a : undefined;
  if (id === "dayinfo") return /^\+?[0-2]$/.test(a) && a.startsWith("+") ? { rel: +a } : /^[0-6]$/.test(a) ? { day: +a } : { rel: 1 };
  if (id === "theme") return ["purple", "ocean", "forest", "sunset", "rose", "night"].includes(a) ? a : undefined;
  if (id === "bigtext") return a === "off" ? "off" : "on";
  if (id === "feedback") return a === "bug" ? "bug" : "idea";
  if (id === "start") return /^\+?[0-2]$/.test(a) ? { rel: +a } : undefined;
  if (id === "vac" || id === "zmanim") return a.replace(/[<>"'`]/g, "").slice(0, 60);
  if (id === "mates") return a === "withRav" ? "withRav" : undefined;
  if (id === "bdayOf") return a.replace(/[<>"'`]/g, "").slice(0, 40) || undefined;
  if (id === "me") return ["name", "cls", "rav", "groups", "major", "dorm", "bday", "all"].includes(a) ? a : "all";
  if (["solve", "der"].includes(id)) return /^[0-9xX+\-*/^().=²³√<>≤≥ ]{1,60}$/.test(a) ? a.replace(/\s+/g, "") : undefined;
  return a.replace(/[<>"'`]/g, "");
}
async function assist(req, S, ip, headers) {
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let b; try { b = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const device = String(b?.device || ""), q = clean(b?.q, AI_Q_MAX);
  if (!DEV_RE.test(device) || !q) return reply(400, { ok: false, error: "bad_request" }, headers);
  if (!aiKey()) return reply(200, { ok: false, error: "no_ai" }, headers);
  memRate("assist", ip, 1500);
  const k = devKey(device), day = israelDay(), now = Date.now();
  const use = await S.get("aiUse"), u = use && use.day === day ? use : { day, total: 0, dev: {} };
  const mine = +(u.dev && Object.hasOwn(u.dev, k) ? u.dev[k] : 0) || 0;
  if (mine >= AI_PER_DEVICE) return reply(200, { ok: false, error: "quota", left: 0 }, headers);
  if (u.total >= AI_PER_DAY) return reply(200, { ok: false, error: "busy", left: AI_PER_DEVICE - mine }, headers);
  const hist = (Array.isArray(b.hist) ? b.hist : []).slice(-6).map(h => ({ role: h && h.role === "model" ? "model" : "user", parts: [{ text: clean(h && h.text, 400) }] })).filter(h => h.parts[0].text);
  const body = {
    systemInstruction: { parts: [{ text: aiPrompt(clean(b.page, 40), b.grade === "11" ? "11" : b.grade === "10" ? "10" : "") }] },
    contents: [...hist, { role: "user", parts: [{ text: q }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 700, responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: { reply: { type: "STRING" }, action: { type: "STRING" }, arg: { type: "STRING" } }, required: ["reply"] } },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map(category => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" })),
  };
  let out = null, err = "server", code = 0;
  for (const model of aiModels()) {
    try {
      const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 15000);
      const r = await aiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": aiKey() }, body: JSON.stringify(body) }).finally(() => clearTimeout(to));
      code = r.status;
      if (r.status === 404) continue; // המודל לא קיים (יותר) – הבא בתור
      if (r.status === 429) { err = "busy"; break; }
      if (!r.ok) { console.error("assist: gemini", model, r.status, (await r.text().catch(() => "")).slice(0, 300)); err = r.status === 400 || r.status === 403 ? "key" : "server"; break; }
      const j = await r.json(), c = j && j.candidates && j.candidates[0], txt = c && c.content && c.content.parts && c.content.parts.map(p => p.text || "").join("");
      if (c && c.finishReason === "SAFETY" || (j && j.promptFeedback && j.promptFeedback.blockReason)) out = { reply: "על זה אני לא יכול לעזור 🙏 אם משהו מטריד אותך – כדאי לדבר עם הרב או עם המחנך.", action: "" };
      else if (txt) { try { out = JSON.parse(txt); } catch (e) { out = { reply: txt.slice(0, 600), action: "" }; } }
      break;
    } catch (e) { err = e && e.name === "AbortError" ? "slow" : "server"; code = 0; console.error("assist:", e && e.message); break; }
  }
  await S.update("aiStats", cur => { const st = cur && cur.day === day ? cur : { day, ok: 0, fail: 0, users: {} }; if (out) st.ok++; else { st.fail++; st.last = { err, code, at: now }; } if (out) st.users[k] = 1; return st; }).catch(() => {});
  if (!out) return reply(200, { ok: false, error: err, code, left: AI_PER_DEVICE - mine }, headers);
  await S.update("aiUse", cur => { const x = cur && cur.day === day ? cur : { day, total: 0, dev: {} }; x.total++; x.dev[k] = (+x.dev[k] || 0) + 1; return x; });
  const id = String(out.action || "").trim(), ok = Object.hasOwn(AI_ACTIONS, id);
  return reply(200, { ok: true, reply: clean(out.reply, 900) || "🙂", action: ok ? { id, arg: aiArg(id, out.arg) } : null, left: Math.max(0, AI_PER_DEVICE - mine - 1) }, headers);
}

async function push(req, S, ip, headers) {
  if (req.method === "GET") return reply(200, { ok: true, key: (await vapid(S)).publicKey }, headers);
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let b; try { b = await req.json(); } catch (e) { return reply(400, { ok: false, error: "bad_json" }, headers); }
  const device = String(b?.device || "");
  if (b?.action === "key") return reply(200, { ok: true, key: (await vapid(S)).publicKey }, headers);
  if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
  await rateLimit(S, "pushRate", ip, 120); // יותר מדי → 429
  const k = devKey(device), now = Date.now();
  if (b.action === "unsub") { await S.update("push", cur => { if (!cur || !Object.hasOwn(cur, k)) return undefined; const o = { ...cur }; delete o[k]; return o; }); return reply(200, { ok: true }, headers); }
  if (b.action === "sub") {
    const sub = cleanSub(b.sub), cls = AUDIENCES.includes(b.cls) && b.cls !== "all" ? b.cls : "";
    if (!sub || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    const prefs = Object.fromEntries(PUSH_PREFS.map(p => [p, b.prefs ? b.prefs[p] !== false : true]));
    await S.update("push", cur => {
      const o = cur && typeof cur === "object" ? { ...cur } : {};
      // אותה כתובת התראות ממכשיר אחר (למשל אחרי איפוס) – נשאר רק החדש
      for (const [kk, x] of Object.entries(o)) if (kk !== k && x && x.sub && x.sub.endpoint === sub.endpoint) delete o[kk];
      if (!Object.hasOwn(o, k) && Object.keys(o).length >= PUSH_MAX) { const old = Object.entries(o).sort((a, c) => (a[1].at || 0) - (c[1].at || 0))[0]; if (old) delete o[old[0]]; }
      o[k] = { sub, cls, prefs, at: now, last: o[k] && o[k].last || 0 };
      return o;
    });
    return reply(200, { ok: true, prefs }, headers);
  }
  return reply(400, { ok: false, error: "bad_request" }, headers);
}
// שעון ישראל: יום בשבוע ושעה
const IL_PARTS = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", hourCycle: "h23" });
function ilClock(t) { const p = Object.fromEntries(IL_PARTS.formatToParts(new Date(t)).map(x => [x.type, x.value])); return { dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), hour: +p.hour }; }
// שקיעה בכפר מימון (כמו באפליקציה – אלגוריתם NOAA, דקה ליתר ביטחון)
function sunsetIL(day) {
  const R = Math.PI / 180, lat = 31.433, lon = 34.537, [y, m, d] = day.split("-").map(Number);
  const n = Date.UTC(y, m - 1, d, 12) / 864e5 + 2440587.5 - 2451545, J = n - lon / 360, M = (357.5291 + 0.98560028 * J) % 360;
  const C = 1.9148 * Math.sin(M * R) + 0.02 * Math.sin(2 * M * R) + 0.0003 * Math.sin(3 * M * R), L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + J + 0.0053 * Math.sin(M * R) - 0.0069 * Math.sin(2 * L * R), dec = Math.asin(Math.sin(L * R) * Math.sin(23.4397 * R));
  const w = Math.acos((Math.sin(-0.833 * R) - Math.sin(lat * R) * Math.sin(dec)) / (Math.cos(lat * R) * Math.cos(dec)));
  return (Jt + w / (2 * Math.PI) - 2440587.5) * 864e5 - 60e3;
}
// בלי תפילין: שבת, יום טוב וחול המועד (כמו TEF_OFF באפליקציה)
const TEF_OFF = [["2027-04-22", "2027-04-28"], ["2027-06-11", "2027-06-11"]];
// שקט: לילה (22:00–07:00), שבת, וערב שבת אחרי השקיעה
function quietNow(t) { const { dow, hour } = ilClock(t); return hour >= 22 || hour < 7 || dow === 6 || (dow === 5 && t >= sunsetIL(israelDay(t))); }
// שולח לכל המנויים שמתאימים (match) ושההעדפה שלהם (pref) פתוחה. מנוי שהכתובת שלו פגה (404/410) נמחק.
async function sendPush(S, match, msg, { pref, ttl = 3600, force = false } = {}) {
  const now = Date.now();
  if (!force && quietNow(now)) return 0;
  const all = (await S.get("push")) || {}, v = await vapid(S);
  const list = Object.entries(all).filter(([k, x]) => x && x.sub && (!pref || !x.prefs || x.prefs[pref] !== false) && match(x, k));
  if (!list.length) return 0;
  const payload = JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag || "", url: msg.url || "./" });
  const opts = { TTL: ttl, urgency: "normal", vapidDetails: { subject: "https://eliyaamir5-glitch.github.io/maarechet/", publicKey: v.publicKey, privateKey: v.privateKey } };
  const dead = [];
  let sent = 0;
  for (let i = 0; i < list.length; i += 40) {
    const r = await Promise.allSettled(list.slice(i, i + 40).map(([k, x]) => pushSender(x.sub, payload, opts).then(() => k)));
    r.forEach((x, j) => { if (x.status === "fulfilled") sent++; else if ([404, 410].includes(x.reason && x.reason.statusCode)) dead.push(list[i + j][0]); });
  }
  if (dead.length) await S.update("push", cur => { if (!cur) return undefined; const o = { ...cur }; for (const k of dead) delete o[k]; return o; });
  return sent;
}
// רץ כל רבע שעה אחר הצהריים (push-tick.mjs): שעה לפני השקיעה – תזכורת תפילין, פעם אחת ביום
export async function pushTick(now = Date.now()) {
  const S = await store(), day = israelDay(now), { dow } = ilClock(now);
  if (dow === 6 || TEF_OFF.some(([a, b]) => day >= a && day <= b)) return { skipped: "off" };
  const ss = sunsetIL(day), left = ss - now;
  if (!(left <= 75 * 60e3 && left > 40 * 60e3)) return { skipped: "time" };
  let first = false;
  await S.update("pushTef", cur => { if (cur && cur.day === day) return undefined; first = true; return { day, at: now }; });
  if (!first) return { skipped: "done" };
  const hm = new Date(ss).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
  const sent = await sendPush(S, () => true, { title: "🙏 תפילין", body: `נשארה בערך שעה להנחת תפילין – אפשר עד ${hm}. כבר הנחת? כל הכבוד! 💪`, tag: "tef-" + day }, { pref: "tef", ttl: 3000, force: true });
  return { sent };
}

// ---- 🎉 חגים: ברכה לטלפונים בתחילת כל חג + הגדרות של מנהל המערכת ----
// "holCfg" = { off: כיבוי מצב החג כולו, push: false = בלי ברכות לטלפון, offKeys: {key:true} חגים מכובים, text: {key:"נוסח משלך"} }
// "holSent" = { "hanukkah:2026-12-05": זמן } – כל ברכה נשלחת פעם אחת בלבד
const holCfgOf = c => (c && typeof c === "object" ? c : {});
function holPublic(c) { c = holCfgOf(c); const offKeys = {}; for (const k of Object.keys(c.offKeys || {})) if (HC.BY[k] && c.offKeys[k]) offKeys[k] = true; return { off: !!c.off, offKeys }; }
const holText = (c, h) => (holCfgOf(c).text || {})[h.key] || h.greet || "";
async function holOverview(S, now) {
  const [c, sent] = await Promise.all([S.get("holCfg"), S.get("holSent")]), cfg = holCfgOf(c), today = israelDay(now);
  const list = HC.list(today, 380).map(h => {
    const at = HC.sendAt(h);
    return { key: h.key, name: h.name, em: h.em, type: h.type, start: h.start, end: h.end, off: !!(cfg.offKeys || {})[h.key],
      push: at ? { day: at.day, hour: at.hour } : null, text: holText(c, h), custom: !!(cfg.text || {})[h.key], def: h.greet || "",
      sent: (sent || {})[h.key + ":" + h.start] || 0 };
  });
  return { ok: true, off: !!cfg.off, push: cfg.push !== false, list };
}
async function holSetOp(S, b) {
  const key = b.key == null ? "" : String(b.key);
  if (key && !HC.BY[key]) return { ok: false, error: "bad_request" };
  let what = "";
  await S.update("holCfg", cur => {
    const c = { ...holCfgOf(cur) }; c.offKeys = { ...(c.offKeys || {}) }; c.text = { ...(c.text || {}) };
    if (!key && typeof b.off === "boolean") { c.off = b.off; what = b.off ? "כיבוי מצב החג" : "הפעלת מצב החג"; }
    if (!key && typeof b.push === "boolean") { c.push = b.push; what = b.push ? "הפעלת ברכות החג לטלפונים" : "כיבוי ברכות החג לטלפונים"; }
    if (key && typeof b.off === "boolean") { if (b.off) c.offKeys[key] = true; else delete c.offKeys[key]; what = `${HC.BY[key].name}: ${b.off ? "כובה" : "הופעל"}`; }
    if (key && typeof b.text === "string") { const t = clean(b.text, 160); if (t && t !== HC.BY[key].greet) c.text[key] = t; else delete c.text[key]; what = `${HC.BY[key].name}: נוסח הברכה ${t && t !== HC.BY[key].greet ? "עודכן" : "חזר לברירת המחדל"}`; }
    return c;
  });
  if (what) await olog(S, "holiday", "🎉 " + what);
  return { ok: true };
}
// רץ כמה פעמים בבוקר ובצהריים (holiday-tick.mjs). שולח ברכה כשהגיע הזמן שלה (ערב חג 12:00 / היום עצמו 09:00), פעם אחת
export async function holidayTick(now = Date.now()) {
  const S = await store(), { ymd, hour } = HC.ilNow(now), c = holCfgOf(await S.get("holCfg"));
  if (c.off || c.push === false) return { skipped: "off" };
  const due = HC.list(HC.add(ymd, -1), 10).filter(h => { const at = HC.sendAt(h); return at && at.day === ymd && HC.dow(ymd) !== 6 && hour >= at.hour && hour < 17 && !(c.offKeys || {})[h.key]; });
  const out = [];
  for (const h of due) {
    const id = h.key + ":" + h.start; let first = false;
    await S.update("holSent", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; if (o[id]) return undefined; o[id] = now;
      for (const k of Object.keys(o)) if (now - o[k] > 400 * 864e5) delete o[k]; first = true; return o; });
    if (!first) { out.push({ id, skipped: "done" }); continue; }
    const sent = await sendPush(S, () => true, { title: `${h.em || "🎉"} ${h.name}`, body: holText(c, h), tag: "hol-" + id }, { pref: "holiday", ttl: 8 * 3600, force: true }); // השעה כבר נבדקה כאן (09:00–17:00, אף פעם לא בשבת)
    await olog(S, "holidayPush", `🎉 נשלחה ברכה ל${h.name} ל-${sent} טלפונים`);
    out.push({ id, sent });
  }
  return out.length ? { out } : { skipped: "none" };
}

// ---- 🤖 "הרובוט שלי": אביזרי אולטרה אגדי – כמות מוגבלת לכל הישיבה (חייב להתאים ל-robo-core.js) ----
const ROBO_CAPS = { "skin:gold": 3, "skin:diamond": 5, "skin:phoenix": 2, "skin:cosmic": 2, "skin:crystal": 3 };
const ROBO_NAMES = { "skin:gold": "חליפת זהב טהור", "skin:diamond": "חליפת יהלומים", "skin:phoenix": "עוף החול", "skin:cosmic": "השומר הקוסמי", "skin:crystal": "קריסטל קשת" };
function roboCounts(rr) { const o = {}; for (const [id, cap] of Object.entries(ROBO_CAPS)) { const x = rr && rr[id]; o[id] = { n: x && Array.isArray(x.keys) ? x.keys.length : 0, cap }; } return o; }

// ---- 🎟️ קודים לפרסים, 👑 הטלפון של מנהל המערכת, 🔥 תזכורת לפני שהרצף נשבר ----
// "roboCodes" = { codes: { CODE: { prize, max (null = בלי הגבלה), used: [devKey], on, note, at } }, seeded }
// "roboOwn"   = { key: devKey של הטלפון של מנהל המערכת, inf, all, link: { token, exp } }
// "roboDay"   = { devKey: { d: יום אחרון שנכנס, n: אורך הרצף } } – רק בשביל התזכורת, בלי שם
const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // בלי 0/O/1/I שמתבלבלים
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
const showCode = c => c.length > 4 ? c.slice(0, 4) + "-" + c.slice(4) : c;
const newPromo = (pre = "") => { let s = normCode(pre).slice(0, 4); while (s.length < 8) s += CODE_ABC[crypto.randomInt(CODE_ABC.length)]; return s; };
const BOXES = ["box", "big", "mega"];
function cleanPrize(p) {
  if (!p || typeof p !== "object") return null;
  if (p.t === "box" && BOXES.includes(p.box)) return { t: "box", box: p.box };
  if (p.t === "bolts" && Number.isInteger(+p.n) && +p.n >= 1 && +p.n <= 5000) return { t: "bolts", n: +p.n };
  if (p.t === "item" && /^(skin|hat|eyes|held|aura|theme|page):[a-z0-9:]{1,30}$/.test(String(p.id)) && !Object.hasOwn(ROBO_CAPS, p.id)) return { t: "item", id: String(p.id) };
  return null;
}
// הקודים המוכנים: נוצרים בפעם הראשונה שמנהל המערכת פותח את הכרטיס (אקראיים – לא כתובים בשום מקום בקוד)
const SEED_CODES = [
  ...Array.from({ length: 10 }, () => ({ pre: "BOX", prize: { t: "box", box: "box" }, max: null, note: "תיבה חינם" })),
  ...Array.from({ length: 6 }, () => ({ pre: "BIG", prize: { t: "box", box: "big" }, max: 30, note: "תיבה גדולה" })),
  ...Array.from({ length: 4 }, () => ({ pre: "MEGA", prize: { t: "box", box: "mega" }, max: 10, note: "תיבת מגה" })),
  ...Array.from({ length: 6 }, () => ({ pre: "BOLT", prize: { t: "bolts", n: 200 }, max: null, note: "200 ברגים" })),
  { pre: "VIP", prize: { t: "bolts", n: 1000 }, max: 5, note: "1000 ברגים" },
  { pre: "HAT", prize: { t: "item", id: "hat:propeller" }, max: 20, note: "כובע פרופלור" },
  { pre: "SUN", prize: { t: "item", id: "eyes:sun" }, max: null, note: "משקפי שמש" },
  { pre: "NEON", prize: { t: "item", id: "skin:neon" }, max: 15, note: "חליפת ניאון" },
  { pre: "WIZ", prize: { t: "item", id: "hat:wizard" }, max: 8, note: "כובע קוסם" },
  { pre: "SPCE", prize: { t: "item", id: "skin:space" }, max: 3, note: "חליפת חלל (מיתי!)" },
];
async function roboCodesGet(S, now) {
  let c = await S.get("roboCodes");
  if (!c || !c.seeded) {
    await S.update("roboCodes", cur => {
      const o = cur && typeof cur === "object" ? { ...cur, codes: { ...(cur.codes || {}) } } : { codes: {} };
      if (o.seeded) return undefined;
      for (const x of SEED_CODES) { let k; do k = newPromo(x.pre); while (o.codes[k]); o.codes[k] = { prize: x.prize, max: x.max, used: [], on: true, note: x.note, at: now }; }
      o.seeded = now; return o;
    });
    c = await S.get("roboCodes");
  }
  return c;
}
async function roboOp(S, b, device, ip, now) {
  const k = devKey(device);
  if (b.op === "me") { // האם זה הטלפון של מנהל המערכת (ומה הוא הפעיל לעצמו)
    const o = await S.get("roboOwn");
    return o && o.key === k ? { ok: true, owner: true, inf: !!o.inf, all: !!o.all } : { ok: true, owner: false };
  }
  if (b.op === "link") { // מחברים את הטלפון של מנהל המערכת: קוד חד-פעמי מדף הניהול. הטלפון הראשון שמשתמש בו – הוא שלך
    memRate("roboLink", ip, 5);
    const tok = normCode(b.token);
    let ok = false;
    await S.update("roboOwn", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; if (!o.link || o.link.token !== tok || o.link.exp < now || tok.length < 10) return undefined; o.key = k; o.link = null; o.at = now; ok = true; return o; });
    if (ok) await olog(S, "roboOwn", "👑 הטלפון שלך חובר לניהול (ברגים וסקינים)");
    return ok ? { ok: true, owner: true } : { ok: false, error: "bad_token" };
  }
  if (b.op === "day") { // הרצף של היום (בשביל התזכורת לפני שהוא נשבר)
    const n = Math.max(0, Math.min(5000, Math.floor(+b.n || 0))), d = israelDay(now);
    await S.update("roboDay", cur => { const m = cur && typeof cur === "object" ? { ...cur } : {}; if (!m[k] && Object.keys(m).length >= 4000) return undefined; m[k] = { d, n }; return m; });
    { const pres = (await S.get("presence")) || {}; if (pres[k] && pres[k].cls) await roboBattleAdd(S, pres[k].cls, 1, now); } // ⚔️ כל כניסה יומית = נקודה לכיתה
    return { ok: true };
  }
  // op === "code": מממשים קוד – כל ילד פעם אחת, ועד הכמות שנקבעה לקוד
  memRate("roboCode", ip, 20);
  await rateLimit(S, "codeRate", ip, 60);
  const code = normCode(b.code);
  if (code.length < 4) return { ok: false, error: "bad_code" };
  const pres = await S.get("presence");
  if (!pres || !Object.hasOwn(pres, k)) return { ok: false, error: "not_registered" };
  await roboCodesGet(S, now);
  let out = { ok: false, error: "bad_code" };
  await S.update("roboCodes", cur => {
    const x = cur && cur.codes && cur.codes[code]; if (!x) { out = { ok: false, error: "bad_code" }; return undefined; }
    if (!x.on) { out = { ok: false, error: "off" }; return undefined; }
    if (x.used.includes(k)) { out = { ok: false, error: "used" }; return undefined; }
    if (x.max != null && x.used.length >= x.max) { out = { ok: false, error: "full" }; return undefined; }
    const o = { ...cur, codes: { ...cur.codes, [code]: { ...x, used: [...x.used, k] } } };
    out = { ok: true, prize: x.prize, note: x.note || "" }; return o;
  });
  return out;
}
async function roboOwnerOp(S, b, now) {
  if (b.action === "codeList") {
    const c = await roboCodesGet(S, now);
    const list = Object.entries(c.codes || {}).map(([code, x]) => ({ code: showCode(code), raw: code, prize: x.prize, max: x.max, used: x.used.length, on: x.on, note: x.note || "", at: x.at })).sort((a, b) => b.at - a.at || a.code.localeCompare(b.code));
    const o = await S.get("roboOwn") || {};
    return { ok: true, list, own: { linked: !!o.key, inf: !!o.inf, all: !!o.all } };
  }
  if (b.action === "codeCreate") {
    const prize = cleanPrize(b.prize), count = Math.max(1, Math.min(50, Math.floor(+b.count || 1))), max = b.max == null || b.max === "" ? null : Math.max(1, Math.min(10000, Math.floor(+b.max)));
    if (!prize || (b.max != null && b.max !== "" && !Number.isFinite(+b.max))) return { ok: false, error: "bad_request" };
    const custom = normCode(b.code), made = [];
    await S.update("roboCodes", cur => {
      const o = cur && typeof cur === "object" ? { ...cur, codes: { ...(cur.codes || {}) } } : { codes: {} };
      if (custom) { if (custom.length < 4 || o.codes[custom]) throw new Fail(409, "exists"); o.codes[custom] = { prize, max, used: [], on: true, note: clean(b.note, 60), at: now }; made.push(custom); return o; }
      if (Object.keys(o.codes).length + count > 2000) throw new Fail(413, "too_many");
      for (let i = 0; i < count; i++) { let k; do k = newPromo(b.pre || ""); while (o.codes[k]); o.codes[k] = { prize, max, used: [], on: true, note: clean(b.note, 60), at: now }; made.push(k); }
      return o;
    });
    await olog(S, "codeCreate", `🎟️ נוצרו ${made.length} קודים`);
    return { ok: true, codes: made.map(showCode) };
  }
  if (b.action === "codeSet") {
    const code = normCode(b.code); let found = false;
    await S.update("roboCodes", cur => { const x = cur && cur.codes && cur.codes[code]; if (!x) return undefined; found = true; const o = { ...cur, codes: { ...cur.codes } };
      if (b.del) delete o.codes[code]; else o.codes[code] = { ...x, on: !!b.on }; return o; });
    return found ? { ok: true } : { ok: false, error: "not_found" };
  }
  if (b.action === "ownLink") { // קוד חד-פעמי לחבר את הטלפון שלך (30 דקות)
    let token = "OWN"; while (token.length < 12) token += CODE_ABC[crypto.randomInt(CODE_ABC.length)];
    await S.update("roboOwn", cur => ({ ...(cur && typeof cur === "object" ? cur : {}), link: { token, exp: now + 30 * 60e3 } }));
    return { ok: true, token: showCode(token) };
  }
  if (b.action === "ownUnlink") { await S.update("roboOwn", () => ({})); await olog(S, "roboOwn", "👑 הטלפון נותק מהניהול"); return { ok: true }; }
  // ownPowers: ברגים לאין סוף / כל הסקינים – רק בטלפון המחובר
  await S.update("roboOwn", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; if (typeof b.inf === "boolean") o.inf = b.inf; if (typeof b.all === "boolean") o.all = b.all; return o; });
  return { ok: true };
}
// 🔥 תזכורת: מי שיש לו רצף (2+) ועוד לא נכנס היום – פעם אחת. בדרך כלל ב-20:00; בשישי ובערב חג ב-12:00 (לפני שבת/חג)
function restDayS(d) {
  const w = new Date(d + "T12:00:00Z").getUTCDay(); if (w === 6) return true;
  return HC.list(HC.add(d, -8), 10).some(h => (h.key === "rosh" && (d === h.start || d === h.end)) || (h.key === "pesach" && (d === h.start || d === h.end)) || (["kippur", "sukkot", "simchat", "shavuot"].includes(h.key) && d === h.start));
}
function prevWorkDay(d) { let x = HC.add(d, -1); for (let i = 0; i < 10 && restDayS(x); i++) x = HC.add(x, -1); return x; }
export async function streakTick(now = Date.now()) {
  const S = await store(), { ymd, hour } = HC.ilNow(now);
  if (restDayS(ymd)) return { skipped: "rest" };
  const early = new Date(ymd + "T12:00:00Z").getUTCDay() === 5 || restDayS(HC.add(ymd, 1));
  if (early ? !(hour >= 12 && hour < 15) : !(hour >= 20 && hour < 22)) return { skipped: "time" };
  let first = false;
  await S.update("pushStreak", cur => { if (cur && cur.day === ymd) return undefined; first = true; return { day: ymd, at: now }; });
  if (!first) return { skipped: "done" };
  const days = (await S.get("roboDay")) || {}, prev = prevWorkDay(ymd);
  const sent = await sendPush(S, (x, k) => { const r = days[k]; return !!r && r.n >= 2 && r.d === prev; }, { title: "🔥 הרצף שלך עומד להישבר!", body: "עוד לא נכנסת היום – תיכנס לאפליקציה לשמור על הרצף ולקבל את המתנה של היום 🎁", tag: "streak-" + ymd }, { pref: "streak", ttl: 3 * 3600, force: true });
  return { sent };
}

// ---- 👥 הרובוטים של השכבה: פרופיל ציבורי, לייקים, מתנות, טריידים, קרב כיתות ----
// "roboPub"    = { devKey: { pid, rn (שם הרובוט), eq, st: {n,best,have,all,opened}, rare: [3 ids], ach: [{e,n}], hide, at } } – השם והכיתה מגיעים מהנוכחות בשרת (לא מהטלפון)
// "roboLikes"  = { pid: { n, wk: {weekId: n} } } · "roboLikeDay" = { d, pairs: ["fromPid>toPid"] } – בלי לשמור מי נתן לייק למי מעבר ליום
// "roboInbox"  = { pid: [ {t:"bolts"|"trade"|"like", ...} ] } · "roboGiftDay" = { d, m: {pid: n} } · "roboTrades" = { id: {...} } · "roboBattle" = { weekId: { cls: points } }
const pidOf = k => crypto.createHash("sha256").update("robo|" + k).digest("hex").slice(0, 12);
const ITEM_RE = /^(skin|hat|eyes|held|aura|trail|quote|theme|page):[a-z0-9:_]{1,30}$/;
const gradeOfCls = c => (String(c).startsWith("ya") ? "11" : "10");
const ilWeek = now => { const d = israelDay(now), w = new Date(d + "T12:00:00Z").getUTCDay(); return new Date(Date.parse(d + "T12:00:00Z") - w * 864e5).toISOString().slice(0, 10); };
function cleanEq(eq) { const o = {}; if (eq && typeof eq === "object") for (const [k, v] of Object.entries(eq)) if (/^[a-z]{3,6}$/.test(k) && ITEM_RE.test(String(v))) o[k] = String(v); return o; }
function cleanOffer(o) {
  o = o && typeof o === "object" ? o : {};
  return { items: (Array.isArray(o.items) ? o.items : []).map(String).filter(x => ITEM_RE.test(x)).slice(0, 12), boxes: (Array.isArray(o.boxes) ? o.boxes : []).map(String).filter(x => ["box", "big", "mega", "giant"].includes(x)).slice(0, 12), bolts: Math.max(0, Math.min(100000, Math.floor(+o.bolts || 0))) };
}
async function roboBattleAdd(S, cls, pts, now) {
  if (!AUDIENCES.includes(cls)) return; const w = ilWeek(now);
  await S.update("roboBattle", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; for (const k of Object.keys(o)) if (k < HC.add(w, -21)) delete o[k]; o[w] = { ...(o[w] || {}) }; o[w][cls] = (o[w][cls] || 0) + pts; return o; });
}
async function inboxPush(S, pid, msg) { await S.update("roboInbox", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; o[pid] = [...(o[pid] || []), msg].slice(-30); return o; }); }
async function roboSocial(S, b, device, ip, now) {
  const k = devKey(device), pid = pidOf(k), pres = (await S.get("presence")) || {}, me = pres[k];
  if (!me || !me.cls) return { ok: false, error: "not_registered" };
  memRate("roboSoc", ip, 120);
  const findPid = async x => { const pub = (await S.get("roboPub")) || {}; const kk = Object.keys(pub).find(z => pub[z].pid === x); return kk ? { key: kk, p: pub[kk], who: pres[kk] } : null; };
  if (b.op === "pub") { // מפרסמים את הרובוט שלי (מה לובש + הישגים)
    const st = b.st && typeof b.st === "object" ? b.st : {}, num = (v, m) => Math.max(0, Math.min(m, Math.floor(+v || 0)));
    const rec = { pid, rn: clean(b.rn, 14), eq: cleanEq(b.eq), st: { n: num(st.n, 5000), best: num(st.best, 5000), have: num(st.have, 2000), all: num(st.all, 2000), opened: num(st.opened, 100000) },
      rare: (Array.isArray(b.rare) ? b.rare : []).map(String).filter(x => ITEM_RE.test(x)).slice(0, 3), ach: (Array.isArray(b.ach) ? b.ach : []).slice(0, 16).map(a => ({ e: clean(a && a.e, 4), n: clean(a && a.n, 20) })), hide: !!b.hide, at: now };
    await S.update("roboPub", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; if (!o[k] && Object.keys(o).length >= 3000) return undefined; o[k] = rec; return o; });
    return { ok: true, pid };
  }
  if (b.op === "class") { // הרובוטים של כיתה בשכבה שלי
    const cls = AUDIENCES.includes(b.cls) && gradeOfCls(b.cls) === gradeOfCls(me.cls) ? b.cls : me.cls;
    const pub = (await S.get("roboPub")) || {}, likes = (await S.get("roboLikes")) || {}, day = (await S.get("roboLikeDay")) || {}, bat = (await S.get("roboBattle")) || {};
    const today = israelDay(now), liked = new Set(day.d === today ? (day.pairs || []).filter(x => x.startsWith(pid + ">")).map(x => x.split(">")[1]) : []);
    const list = Object.entries(pub).filter(([kk, p]) => pres[kk] && pres[kk].cls === cls && (!p.hide || kk === k) && !pres[kk].hide && now - (pres[kk].last || 0) < 60 * 864e5)
      .map(([kk, p]) => ({ pid: p.pid, me: kk === k, kid: pres[kk].name || "", rn: p.rn, eq: p.eq, st: p.st, rare: p.rare, ach: p.ach, likes: (likes[p.pid] || {}).n || 0, liked: liked.has(p.pid) }));
    const w = ilWeek(now), last = HC.add(w, -7), cl = Object.keys(CLASSES_GRADE(me.cls));
    const battle = { week: w, now: cl.map(c => ({ cls: c, pts: ((bat[w] || {})[c]) || 0 })), last: cl.map(c => ({ cls: c, pts: ((bat[last] || {})[c]) || 0 })), lastWeek: last };
    return { ok: true, cls, myCls: me.cls, list, battle };
  }
  if (b.op === "like") {
    const to = String(b.to || ""); if (!/^[0-9a-f]{12}$/.test(to) || to === pid) return { ok: false, error: "bad_request" };
    const t = await findPid(to); if (!t || !t.who || gradeOfCls(t.who.cls) !== gradeOfCls(me.cls)) return { ok: false, error: "not_found" };
    const today = israelDay(now); let fresh = false;
    await S.update("roboLikeDay", cur => { const o = cur && cur.d === today ? { d: today, pairs: [...cur.pairs] } : { d: today, pairs: [] }; const key = pid + ">" + to; if (o.pairs.includes(key)) return undefined; o.pairs.push(key); fresh = true; return o; });
    if (!fresh) return { ok: false, error: "already" };
    const w = ilWeek(now); let n = 0;
    await S.update("roboLikes", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; const x = { ...(o[to] || { n: 0, wk: {} }) }; x.n++; x.wk = { [w]: ((x.wk || {})[w] || 0) + 1 }; o[to] = x; n = x.n; return o; });
    await roboBattleAdd(S, t.who.cls, 1, now);
    await inboxPush(S, to, { t: "like", at: now });
    return { ok: true, likes: n };
  }
  if (b.op === "gift") { // 🎁 ברגים לחבר – עד 50 ביום
    const to = String(b.to || ""), n = Math.floor(+b.n || 0);
    if (!/^[0-9a-f]{12}$/.test(to) || to === pid || n < 1 || n > 50) return { ok: false, error: "bad_request" };
    const t = await findPid(to); if (!t || !t.who || gradeOfCls(t.who.cls) !== gradeOfCls(me.cls)) return { ok: false, error: "not_found" };
    const today = israelDay(now); let okk = false, left = 0;
    await S.update("roboGiftDay", cur => { const o = cur && cur.d === today ? { d: today, m: { ...cur.m } } : { d: today, m: {} }; const used = o.m[pid] || 0; if (used + n > 50) { left = 50 - used; return undefined; } o.m[pid] = used + n; left = 50 - o.m[pid]; okk = true; return o; });
    if (!okk) return { ok: false, error: "limit", left };
    await inboxPush(S, to, { t: "bolts", n, from: clean(me.name, MAX_NAME), at: now });
    return { ok: true, left };
  }
  if (b.op === "inbox") { let box = []; await S.update("roboInbox", cur => { if (!cur || !cur[pid] || !cur[pid].length) return undefined; box = cur[pid]; const o = { ...cur }; delete o[pid]; return o; }); return { ok: true, inbox: box }; }
  // ---- 🔄 טרייד: הזמנה → כל צד מציע → שניהם מאשרים → 3 שניות שאפשר לבטל → בוצע ----
  const TR = id => /^[0-9a-f]{10}$/.test(String(id || "")) ? String(id) : "";
  const view = (t, mine) => { const side = t.a === pid ? "a" : "b", other = side === "a" ? "b" : "a"; return { ok: true, id: t.id, side, status: t.status, lockAt: t.lockAt || 0, now, me: { offer: t[side + "Offer"], ok: !!t[side + "Ok"], kid: t[side + "Kid"] }, them: { offer: t[other + "Offer"], ok: !!t[other + "Ok"], kid: t[other + "Kid"], done: !!t[other + "Done"] }, doneMe: !!t[side + "Done"] }; };
  const settle = t => { if (t.status === "lock" && now - t.lockAt >= 3000) t.status = "done"; if (t.status !== "done" && t.status !== "cancel" && now - t.at > 15 * 60e3) t.status = "cancel"; return t; };
  if (b.op === "tradeNew") {
    const to = String(b.to || ""); if (!/^[0-9a-f]{12}$/.test(to) || to === pid) return { ok: false, error: "bad_request" };
    const t = await findPid(to); if (!t || !t.who || gradeOfCls(t.who.cls) !== gradeOfCls(me.cls)) return { ok: false, error: "not_found" };
    const id = crypto.randomBytes(5).toString("hex"), E = { items: [], boxes: [], bolts: 0 };
    const tr = { id, a: pid, b: to, aKid: clean(me.name, MAX_NAME), bKid: clean(t.who.name, MAX_NAME), aOffer: E, bOffer: E, aOk: false, bOk: false, status: "open", at: now };
    await S.update("roboTrades", cur => { const o = cur && typeof cur === "object" ? { ...cur } : {}; for (const [x, v] of Object.entries(o)) if (now - v.at > 864e5) delete o[x]; o[id] = tr; return o; });
    await inboxPush(S, to, { t: "trade", id, from: tr.aKid, at: now });
    return view(tr);
  }
  const id = TR(b.id); if (!id) return { ok: false, error: "bad_request" };
  let res = { ok: false, error: "not_found" };
  await S.update("roboTrades", cur => {
    const o = cur && typeof cur === "object" ? { ...cur } : {}, t0 = o[id]; if (!t0 || (t0.a !== pid && t0.b !== pid)) return undefined;
    const t = settle({ ...t0 }), side = t.a === pid ? "a" : "b";
    if (b.op === "tradeSet" && t.status === "open") { t[side + "Offer"] = cleanOffer(b.offer); t.aOk = t.bOk = false; }
    if (b.op === "tradeOk" && t.status === "open") { t[side + "Ok"] = !!b.ok; if (t.aOk && t.bOk) { t.status = "lock"; t.lockAt = now; } }
    if (b.op === "tradeCancel" && (t.status === "open" || (t.status === "lock" && now - t.lockAt < 3000))) { t.status = "cancel"; t.by = side; }
    if (b.op === "tradeDone" && t.status === "done") t[side + "Done"] = true;
    o[id] = t; res = view(t); return o;
  });
  if (b.op === "tradeDone" && res.ok) await roboBattleAdd(S, me.cls, 0, now);
  return res;
}
function CLASSES_GRADE(cls) { const o = {}; for (const c of AUDIENCES) if (c !== "all" && gradeOfCls(c) === gradeOfCls(cls)) o[c] = 1; return o; }
