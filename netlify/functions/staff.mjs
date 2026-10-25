// עדכוני צוות: כניסה למנהל ולמורים, כתיבת עדכונים עם תוקף, וקריאה ציבורית לאפליקציה.
// הנתונים נשמרים ב-Netlify Blobs (אחסון מובנה של נטליפיי, בלי שירות נוסף).
//
// GET  /api/updates                 → { ok, updates:[פעילים בלבד] }            (ציבורי, לאפליקציה)
// POST /api/updates {seen:[ids]}    → ספירת צפיות אנונימית (כמה תלמידים ראו)
// POST /api/feedback {kind,text,..} → רעיון / תקלה מתלמיד (ציבורי, עם הגבלת כמות). מנהלים רואים ב"פניות"
// GET  /api/sets                    → { ok, sets:[סטי כרטיסיות שהצוות פרסם] }    (ציבורי, לכרטיסיות)
// GET  /api/contacts                → { ok, contacts:[{name, phone, note, extra}] } (ספר הטלפונים של המורים)
// POST /api/contacts {action, ...}  → check | set | remove. מותר רק עם "קוד עריכת טלפונים" (scripts/make-phone-code.mjs)
//                                     או עם כניסת מנהל (טוקן). תלמידים רק קוראים.
// GET  /api/staff                   → { ok, needsSetup }                      (האם כבר הוגדר מנהל)
// POST /api/staff {action, ...}     → check_invite | setup | login | me | updateMe | post | end | extend | delete | list
//                                     | users | addUser | resetUser | removeUser | feedback | feedbackDone | feedbackDelete
//                                     | setsList | setSave | setDelete  (סטי כרטיסיות לכיתה: מורה מנהל את שלו, מנהל את כולם)
//
// כניסת המנהל: קוד ההזמנה האישי (נוצר ע"י scripts/make-invite.mjs ונשלח למנהל, גם כקישור staff.html#invite=...).
// בכניסה הראשונה עם הקוד נוצר חשבון המנהל הראשי, והקוד הזה הוא הקוד שלו (אפשר לשנות ב"החשבון שלי").
// כאן נשמר רק ה-hash של הקוד, אז גם כשהקוד ציבורי אי אפשר לנחש אותו. קוד הזמנה חדש מאפס את המנהל הראשי.
//
// אבטחה: קודי כניסה נשמרים רק כ-hash (scrypt). אחרי כניסה מקבלים טוקן חתום (HMAC) לשבוע, עם "גרסה":
// החלפת קוד או איפוס מבטלים מיד את כל הכניסות הקודמות. כל כתיבה היא מותנית (etag) עם ניסיון חוזר,
// כך ששני אנשים שכותבים באותו רגע לא מוחקים אחד לשני. הגבלת ניסיונות כניסה לפי כתובת.
// תוכן העדכונים הוא טקסט בלבד, והאפליקציה מציגה אותו כטקסט (לא HTML).
import crypto from "node:crypto";

export const config = { path: ["/api/updates", "/api/staff", "/api/feedback", "/api/sets", "/api/contacts", "/api/feed"] };

const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/([a-z0-9-]+--)?lucent-crepe-6db22c\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const MAX_FEEDBACK = 1000, FEEDBACK_KINDS = ["idea", "bug", "other"], FEEDBACK_PER_HOUR = 30;
const MAX_TEXT = 600, MAX_NAME = 40, TOKEN_DAYS = 7, MAX_DURATION_MIN = 60 * 24 * 30;
const LOCK_FAILS = 20, LOCK_MIN = 15; // 20 קודים שגויים ב-15 דקות מאותה כתובת → נעילה ל-15 דקות
const AUDIENCES = ["all", "y1", "y2"];
const MAX_SETS = 200, MAX_CARDS = 300, MAX_SIDE = 300, MAX_SETS_BYTES = 3e6; // סטי כרטיסיות של הצוות
// sha256 של מפתח ההזמנה למנהל. נוצר ע"י: node scripts/make-invite.mjs
let INVITE_HASH = "568b920bf334e23fd0f8d6b9b11446dd7d9de4c716b47a18d95a95e5c381ab14";
export function __setInviteHash(h) { INVITE_HASH = h; }
// sha256 של קוד העריכה לספר הטלפונים. נוצר ע"י: node scripts/make-phone-code.mjs
let PHONE_HASH = "af6d01a88a81ba0c1eaeae3c628b5825b8ef6e33f3e3e89d7caa459f8a741b7f";
export function __setPhoneHash(h) { PHONE_HASH = h; }
const MAX_CONTACTS = 300;
const CAPS = { feed: true, schedule: true };
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
const newCode = () => Array.from(crypto.randomBytes(8), b => CODE_CHARS[b % CODE_CHARS.length]).join("");
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
// הקוד כפי שהוקלד, באותיות גדולות, ובלי רווחים/מקפים: כולם מתקבלים
const variants = code => [...new Set([code, code.toUpperCase(), norm(code)])].filter(Boolean);
const codeMatches = (u, code) => variants(code).some(c => safeEq(hashCode(c, u.salt), u.hash));
const hashCodeAsync = (code, salt) => new Promise((res, rej) => crypto.scrypt(String(code), salt, 32, (e, k) => e ? rej(e) : res(k.toString("hex"))));
async function findByCode(users, code) {
  for (const u of users) for (const c of variants(code)) if (safeEq(await hashCodeAsync(c, u.salt), u.hash)) return u;
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
  await S.update("users", list => {
    const users = list || [], salt = newSalt();
    const owner = users.find(u => u.owner) || users.find(u => u.role === "admin");
    if (owner) { // קוד הזמנה חדש = איפוס של המנהל הראשי (המורים נשארים), וכל הכניסות הקודמות שלו נפסלות
      admin = { ...owner, name: name || owner.name, salt, hash: hashCode(code, salt), owner: true, tv: (owner.tv || 0) + 1 };
      return users.map(u => u.id === owner.id ? admin : u);
    }
    admin = { id: newId(), name: name || "המנהל", role: "admin", owner: true, salt, hash: hashCode(code, salt), tv: 0, createdAt: Date.now() };
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
  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";

  // ---- ציבורי: העדכונים הפעילים ----
  if (url.pathname.endsWith("/updates")) {
    if (req.method === "POST") {
      // צפיות: מספר משוער (בלי זיהוי תלמיד). שמור בנפרד מהעדכונים, כדי שלא יתנגש עם כתיבת עדכון
      let b; try { b = await req.json(); } catch { b = null; }
      const ids = Array.isArray(b?.seen) ? b.seen.map(String).filter(x => /^[\w-]{4,20}$/.test(x)).slice(0, 10) : [];
      if (ids.length) await rateLimit(S, "viewRate", ip, 2000);
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
    const valid = isInvite(body.invite);
    return reply(200, { ok: true, valid, used: valid && !!cfg && cfg.inviteUsed === INVITE_HASH, hasAdmin: !!cfg }, headers);
  }
  if (action === "setup") {
    await attempt(S, ip);
    if (!isInvite(body.invite)) return reply(403, { ok: false, error: "bad_invite" }, headers);
    await forgive(S, ip);
    if (cfg && cfg.inviteUsed === INVITE_HASH) return reply(409, { ok: false, error: "invite_used" }, headers);
    const name = clean(body.name, MAX_NAME), code = String(body.code || "");
    if (!name || code.length < 6 || code.length > 64) return reply(400, { ok: false, error: "bad_request" }, headers);
    const { conf, admin } = await claim(S, name, code);
    return reply(200, { ok: true, token: tokenFor(admin, conf.secret), user: publicUser(admin) }, headers);
  }
  // כניסה ראשונה של המנהל עם קוד ההזמנה (מהקישור או בהקלדה): יוצר את החשבון שלו
  if (action === "login" && isInvite(body.code) && !(cfg && cfg.inviteUsed === INVITE_HASH)) {
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    const { conf, admin } = await claim(S, null, norm(body.code));
    return reply(200, { ok: true, first: true, token: tokenFor(admin, conf.secret), user: publicUser(admin) }, headers);
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
    if ((name != null && !name) || (code != null && (code.length < 6 || code.length > 64))) return reply(400, { ok: false, error: "bad_request" }, headers);
    let next = null;
    await S.update("users", list => {
      const all = list || [], cur = all.find(x => x.id === me.id);
      if (!cur) throw new Fail(401, "auth");
      next = { ...cur, ...(name != null ? { name } : {}) };
      if (code != null) {
        // שני אנשים עם אותו קוד = אחד נכנס לחשבון של השני. לא מאפשרים
        const salt = newSalt();
        next = { ...next, salt, hash: hashCode(code, salt), tv: (cur.tv || 0) + 1 };
      }
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
    await S.update("updates", cur => [...(cur || []).filter(u => u.expiresAt > now - 7 * 864e5), upd]); // + ניקוי ישנים
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
    // אותו שיעור באותו יום – השינוי החדש מחליף את הקודם
    const same = x => x.date === ch.date && x.cls === ch.cls && x.s === ch.s && x.n === ch.n && x.w === ch.w;
    await S.update("changes", cur => [...(cur || []).filter(x => x.date >= israelDay(Date.now() - 14 * 864e5) && !same(x)), ch].slice(-500));
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
    return reply(200, { ok: true, releases: (await S.get("releases") || []).filter(r => r.at > since), today: israelDay() }, headers);
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
  if (action === "stats") {
    // מי השתמש ב-7 הימים האחרונים, ובכמה תלמידים כל מקצוע בסיכון – רק מספרים, בלי שמות
    const st = await S.get("stats") || {}, since = israelDay(Date.now() - 7 * 864e5), out = {};
    for (const x of Object.values(st)) {
      if (x.day < since) continue;
      const c = out[x.cls] = out[x.cls] || { active: 0, mashov: 0, risk: Object.create(null), warn: Object.create(null) };
      c.active++; if (x.mashov) c.mashov++;
      for (const n of x.risk || []) c.risk[n] = (c.risk[n] || 0) + 1;
      for (const n of x.warn || []) c.warn[n] = (c.warn[n] || 0) + 1;
    }
    return reply(200, { ok: true, classes: out }, headers);
  }
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
    const code = newCode(), salt = newSalt();
    const u = { id: newId(), name, role, salt, hash: hashCode(code, salt), tv: 0, createdAt: Date.now() };
    await S.update("users", cur => [...(cur || []), u]);
    return reply(200, { ok: true, user: publicUser(u), code }, headers);
  }
  if (action === "resetUser") {
    const code = newCode(), salt = newSalt();
    let target = null;
    await S.update("users", cur => {
      const list = cur || [], u = list.find(x => x.id === body.id);
      if (!u) throw new Fail(404, "not_found");
      if (u.owner && !me.owner) throw new Fail(403, "forbidden");
      target = u;
      return list.map(x => x.id === u.id ? { ...x, salt, hash: hashCode(code, salt), tv: (x.tv || 0) + 1 } : x);
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
async function rateLimit(S, key, ip, perHour) {
  const now = Date.now();
  await S.update(key, cur => {
    const rate = cur || {}, recent = (rate[ip] || []).filter(t => now - t < 3600e3);
    if (recent.length >= perHour) throw new Fail(429, "too_many");
    rate[ip] = [...recent, now];
    for (const k of Object.keys(rate)) if (!rate[k].some(t => now - t < 3600e3)) delete rate[k];
    return rate;
  });
}
function upcomingBirthdays(bd, now = Date.now()) {
  const out = [];
  for (const x of Object.values(bd || {})) {
    for (let d = 0; d < 7; d++) {
      const day = israelDay(now + d * 864e5).slice(5); // MM-DD
      if (x.md === day) { out.push({ name: x.name, cls: x.cls, md: x.md, inDays: d }); break; }
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}
async function feed(req, S, ip, headers) {
  if (req.method === "GET") {
    const now = Date.now(), today = israelDay(now);
    const [ups, polls, events, qs, bd, rx, chg] = await Promise.all(["updates", "polls", "events", "questions", "birthdays", "reactions", "changes"].map(k => S.get(k)));
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
    }, { ...headers, "Cache-Control": "public, max-age=20" });
  }
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  let b; try { b = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const action = String(b?.action || ""), now = Date.now();
  const device = String(b?.device || ""), cls = AUDIENCES.includes(b?.cls) && b.cls !== "all" ? b.cls : "";
  if (action === "vote") {
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "voteRate", ip, 400);
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
    await rateLimit(S, "askRate", ip, 60);
    const q = { id: newId(), text, to, cls, status: "new", createdAt: now };
    await S.update("questions", cur => [q, ...(cur || []).filter(x => x.createdAt > now - 90 * 864e5)].slice(0, 500));
    return reply(200, { ok: true, id: q.id }, headers);
  }
  if (action === "react") {
    const id = String(b.id || ""), emoji = String(b.emoji || "");
    if (!DEV_RE.test(device) || !id || id.length > 40 || (emoji && !isEmoji(emoji))) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "reactRate", ip, 3000);
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
  if (action === "birthday") {
    if (!DEV_RE.test(device)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const k = devKey(device);
    if (b.remove) { await S.update("birthdays", cur => { const m = cur || {}; delete m[k]; return m; }); return reply(200, { ok: true }, headers); }
    const name = clean(b.name, MAX_NAME), md = String(b.md || "");
    if (!name || !cls || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(md)) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "bdRate", ip, 100);
    await S.update("birthdays", cur => { const m = cur || {}; if (!m[k] && Object.keys(m).length >= 2000) throw new Fail(413, "too_many"); m[k] = { name, cls, md, at: now }; return m; });
    return reply(200, { ok: true }, headers);
  }
  if (action === "ping") {
    // סטטיסטיקה אנונימית למנהל: כיתה + אילו מקצועות בסיכון. בלי שם ובלי מזהה אמיתי
    if (!DEV_RE.test(device) || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "pingRate", ip, 600);
    const k = devKey(device), day = israelDay(now);
    await S.update("stats", cur => {
      const m = cur || {};
      if (m[k] && m[k].day === day && JSON.stringify(m[k].risk) === JSON.stringify(strList(b.risk))) return undefined; // כבר נספר היום
      if (!m[k] && Object.keys(m).length >= 3000) throw new Fail(413, "too_many");
      m[k] = { cls, day, risk: strList(b.risk, 15, 40).filter(SAFE_KEY), warn: strList(b.warn, 15, 40).filter(SAFE_KEY), mashov: !!b.mashov };
      for (const x of Object.keys(m)) if (m[x].day < israelDay(now - 60 * 864e5)) delete m[x];
      return m;
    });
    return reply(200, { ok: true }, headers);
  }
  if (action === "release") {
    // אישור יציאה שההורה חתם עליו – מופיע אצל הצוות ב"שחרורים"
    const name = clean(b.name, MAX_NAME), reason = clean(b.reason, 200);
    if (!name || !cls) return reply(400, { ok: false, error: "bad_request" }, headers);
    await rateLimit(S, "relRate", ip, 60);
    const date = clean(b.date, 10), from = clean(b.from, 5), until = clean(b.until, 5);
    if ((date && !validDate(date)) || (from && !validTime(from)) || (until && !validTime(until))) return reply(400, { ok: false, error: "bad_request" }, headers);
    const r = { id: newId(), name, cls, reason, date: date || israelDay(now), from, until, parent: clean(b.parent, MAX_NAME), lesson: clean(b.lesson, 60), teacher: clean(b.teacher, 60), at: now };
    await S.update("releases", cur => [r, ...(cur || []).filter(x => x.at > now - 30 * 864e5)].slice(0, 1000));
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
  // מי מורשה לערוך: קוד העריכה, או מנהל מחובר
  let who = null;
  const code = norm(body.code);
  if (code) {
    await attempt(S, ip);
    if (PHONE_HASH && safeEq(sha(code), PHONE_HASH)) { who = "editor"; await forgive(S, ip); }
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
      if (!Object.hasOwn(c, name) && Object.keys(c).length >= MAX_CONTACTS) throw new Fail(413, "too_many");
      c[name] = { ...(c[name] || {}), phone, note, extra: !!(body.extra ?? (c[name] && c[name].extra)), updatedAt: Date.now(), by: who };
      out = { name, phone, note: c[name].note, extra: c[name].extra };
      return c;
    });
    return reply(200, { ok: true, contact: out }, headers);
  }
  if (action === "remove") {
    await S.update("contacts", cur => { const c = cur || {}; delete c[name]; return c; });
    return reply(200, { ok: true }, headers);
  }
  return reply(400, { ok: false, error: "bad_action" }, headers);
}
