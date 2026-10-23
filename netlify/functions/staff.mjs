// עדכוני צוות: כניסה למנהל ולמורים, כתיבת עדכונים עם תוקף, וקריאה ציבורית לאפליקציה.
// הנתונים נשמרים ב-Netlify Blobs (אחסון מובנה של נטליפיי, בלי שירות נוסף).
//
// GET  /api/updates                 → { ok, updates:[פעילים בלבד] }            (ציבורי, לאפליקציה)
// POST /api/updates {seen:[ids]}    → ספירת צפיות אנונימית (כמה תלמידים ראו)
// POST /api/feedback {kind,text,..} → רעיון / תקלה מתלמיד (ציבורי, עם הגבלת כמות). מנהלים רואים ב"פניות"
// GET  /api/sets                    → { ok, sets:[סטי כרטיסיות שהצוות פרסם] }    (ציבורי, לכרטיסיות)
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

export const config = { path: ["/api/updates", "/api/staff", "/api/feedback", "/api/sets"] };

const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const MAX_FEEDBACK = 1000, FEEDBACK_KINDS = ["idea", "bug", "other"], FEEDBACK_PER_HOUR = 30;
const MAX_TEXT = 600, MAX_NAME = 40, TOKEN_DAYS = 7, MAX_DURATION_MIN = 60 * 24 * 30;
const LOCK_FAILS = 20, LOCK_MIN = 15; // 20 קודים שגויים ב-15 דקות מאותה כתובת → נעילה ל-15 דקות
const AUDIENCES = ["all", "y1", "y2"];
const MAX_SETS = 200, MAX_CARDS = 300, MAX_SIDE = 300, MAX_SETS_BYTES = 3e6; // סטי כרטיסיות של הצוות
// sha256 של מפתח ההזמנה למנהל. נוצר ע"י: node scripts/make-invite.mjs
let INVITE_HASH = "3cfc136db2d1d5b4403c8de0b99eaa57623b01b6eaa1b1110e191d4f63f9d20d";
export function __setInviteHash(h) { INVITE_HASH = h; }
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const norm = c => String(c || "").replace(/[\s-]/g, "").toUpperCase(); // "abcd-efgh" = "ABCDEFGH"
const isInvite = c => !!INVITE_HASH && !!norm(c) && safeEq(sha(norm(c)), INVITE_HASH);

// שגיאה שמסיימת את הבקשה עם קוד ותשובה מסודרת
class Fail extends Error { constructor(status, error) { super(error); this.status = status; this.error = error; } }

// ---- אחסון: Netlify Blobs בייצור, מפה בזיכרון בבדיקות ----
// update(key, fn): קורא, מחשב ערך חדש (fn), וכותב רק אם אף אחד לא כתב בינתיים. אחרת מנסה שוב.
let memStore = null;
export function __useMemoryStore() {
  const m = new Map();
  const get = async k => m.has(k) ? JSON.parse(m.get(k)) : null;
  const set = async (k, v) => { m.set(k, JSON.stringify(v)); };
  memStore = { get, set, update: async (k, fn) => { const next = fn(await get(k)); if (next !== undefined) await set(k, next); } };
  return m;
}
async function store() {
  if (memStore) return memStore;
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: "maarechet-staff", consistency: "strong" });
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
const activeUpdates = (list, now = Date.now()) => (list || []).filter(u => u.expiresAt > now).sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));

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
    const updates = activeUpdates(list).map(u => ({ id: u.id, text: u.text, author: u.authorName, role: u.role, audience: u.audience, urgent: !!u.urgent, createdAt: u.createdAt, expiresAt: u.expiresAt }));
    return reply(200, { ok: true, now: Date.now(), updates }, { ...headers, "Cache-Control": "public, max-age=20" });
  }

  // ---- ציבורי: סטי הכרטיסיות של הכיתה ----
  if (url.pathname.endsWith("/sets")) {
    if (req.method !== "GET") return reply(405, { ok: false, error: "method" }, headers);
    const sets = (await S.get("sets") || []).slice().sort((a, b) => b.updatedAt - a.updatedAt).map(publicSet);
    return reply(200, { ok: true, sets }, { ...headers, "Cache-Control": "public, max-age=60" });
  }

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
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    if (!isInvite(body.invite)) { await recordFailure(S, ip); return reply(403, { ok: false, error: "bad_invite" }, headers); }
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
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    const code = String(body.code || "").trim();
    const users = await S.get("users") || [];
    const u = code && users.find(x => codeMatches(x, code));
    if (!u) { await recordFailure(S, ip); return reply(401, { ok: false, error: "bad_code" }, headers); }
    return reply(200, { ok: true, token: tokenFor(u, cfg.secret), user: publicUser(u) }, headers);
  }

  // ---- מכאן: רק עם טוקן תקף ----
  const auth = verify((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), cfg.secret);
  const users = await S.get("users") || [];
  const me = auth && users.find(x => x.id === auth.uid && (x.tv || 0) === (auth.tv || 0));
  if (!me) return reply(401, { ok: false, error: "auth" }, headers);
  const isAdmin = me.role === "admin";

  if (action === "me") return reply(200, { ok: true, user: publicUser(me) }, headers);

  // "החשבון שלי": שינוי שם ו/או קוד כניסה (לכל אחד, על עצמו)
  if (action === "updateMe") {
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
        if (all.some(x => x.id !== me.id && codeMatches(x, code))) throw new Fail(409, "code_taken");
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
    const upd = { id: newId(), text, ...author, postedBy: me.id, postedByName: me.name, audience, urgent: !!body.urgent, createdAt: now, expiresAt: now + minutes * 60e3 };
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
        : { ...u, expiresAt: Math.min(Math.max(now, u.expiresAt) + add * 60e3, now + MAX_DURATION_MIN * 60e3) };
      return list.map(x => x.id === id ? out : x);
    });
    return reply(200, { ok: true, ...(out && action === "extend" ? { update: out } : {}) }, headers);
  }

  if (action === "list") {
    // מנהל רואה הכל, מורה רואה את שלו. כולל עדכונים שהסתיימו ב-3 הימים האחרונים
    const now = Date.now();
    const views = await S.get("views") || {};
    const list = (await S.get("updates") || []).filter(u => (isAdmin || u.authorId === me.id) && u.expiresAt > now - 3 * 864e5)
      .sort((a, b) => b.createdAt - a.createdAt).map(u => ({ ...u, active: u.expiresAt > now, views: views[u.id] || 0 }));
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

  // ---- ניהול: מנהל בלבד ----
  if (!isAdmin) return reply(403, { ok: false, error: "forbidden" }, headers);
  if (action === "users") return reply(200, { ok: true, users: users.map(publicUser) }, headers);
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
