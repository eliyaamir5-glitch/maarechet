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

export const config = { path: ["/api/updates", "/api/staff", "/api/feedback", "/api/sets", "/api/contacts", "/api/feed", "/api/owner", "/api/push"] };

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
    return reply(200, { ok: true, now: Date.now(), updates }, { ...headers, "Cache-Control": "public, max-age=20" });
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
// POST /api/feed {action, ...}  → vote | ask | birthday | ping | release   (ציבורי, עם הגבלות)
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
  const keys = ["presence", "users", "updates", "polls", "events", "questions", "feedback", "contacts", "releases", "changes", "reactions", "birthdays", "sets", "views", "control", "ownerMsgs", "errors", "ownerLog"];
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
  if (b.action !== "overview") return reply(400, { ok: false, error: "bad_action" }, headers);
  return reply(200, await schoolOverview(S, now, true), { ...headers, "Cache-Control": "no-store" });
}

async function feed(req, S, ip, headers) {
  if (req.method === "GET") {
    const now = Date.now(), today = israelDay(now);
    const [ups, polls, events, qs, bd, rx, chg, ctl] = await Promise.all(["updates", "polls", "events", "questions", "birthdays", "reactions", "changes", "control"].map(k => S.get(k)));
    return reply(200, {
      ok: true, now,
      updates: activeUpdates(ups, now).map(u => ({ ...publicUpdate(u), reacts: reactCounts(reactsOf(rx, u.id)) })),
      polls: (polls || []).filter(p => p.endsAt > now).sort((a, b) => b.createdAt - a.createdAt).map(publicPoll),
      events: (events || []).filter(e => e.date >= today).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).slice(0, 30)
        .map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time || "", place: e.place || "", desc: e.desc || "", audience: e.audience })),
      answers: (qs || []).filter(q => q.status === "answered" && q.answeredAt > now - 21 * 864e5).sort((a, b) => b.answeredAt - a.answeredAt).slice(0, 30)
        .map(q => ({ id: q.id, q: q.text, a: q.answer, to: q.to, cls: q.cls, by: q.answeredBy, at: q.answeredAt })),
      birthdays: upcomingBirthdays(bd, now),
      changes: (chg || []).filter(x => x.date >= today).sort((a, b) => (a.date + a.s).localeCompare(b.date + b.s)).slice(0, 200).map(publicChange),
      maint: maintOf(ctl, now),
    }, { ...headers, "Cache-Control": "public, max-age=20" });
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
    const rec = { name: clean(b.name, MAX_NAME), cls, eng: key(b.eng), math: key(b.math), major: key(b.major), mashov: !!b.mashov, ver: clean(b.ver, 20), plat: clean(b.plat, 40), inst: !!b.inst };
    const sig = x => JSON.stringify([x.name, x.cls, x.eng, x.math, x.major, x.mashov, x.ver, x.plat, x.inst]);
    const mine = m => m && typeof m === "object" && Object.hasOwn(m, k) && m[k] && typeof m[k] === "object" ? m[k] : null;
    // כותבים רק כשצריך: מכשיר חדש, יום חדש, כל 7 דקות, או פרטים שהשתנו (לכל היותר פעם בדקה).
    // אחרת כל "שלום" היה כותב מחדש את כל הרשימה – עלות, ועומס כשכולם פותחים בהפסקה
    const due = old => !old || !Array.isArray(old.days) || !old.days.includes(day) || !(now - old.last < HELLO_TOUCH) || (sig(old) !== sig(rec) && !(now - old.last < 60e3));
    try {
      const old0 = mine(await S.get("presence"));
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
    const [ctl, om] = await Promise.all([S.get("control"), S.get("ownerMsgs")]), pk = personKey(rec.name, cls);
    return reply(200, { ok: true, maint: maintOf(ctl, now), susp: suspOf(ctl, k, pk, now), msgs: msgsFor(om, k, pk, cls, now) }, headers);
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
const PUSH_MAX = 4000, PUSH_PREFS = ["tef", "urgent"];
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
