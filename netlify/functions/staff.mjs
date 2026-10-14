// עדכוני צוות: כניסה למנהל ולמורים, כתיבת עדכונים עם תוקף, וקריאה ציבורית לאפליקציה.
// הנתונים נשמרים ב-Netlify Blobs (אחסון מובנה של נטליפיי, בלי שירות נוסף).
//
// GET  /api/updates                 → { ok, updates:[פעילים בלבד] }            (ציבורי, לאפליקציה)
// POST /api/updates {seen:[ids]}    → ספירת צפיות אנונימית (כמה תלמידים ראו)
// GET  /api/staff                   → { ok, needsSetup }                      (האם כבר הוגדר מנהל)
// POST /api/staff {action, ...}     → check_invite | setup | login | me | updateMe | post | end | extend | delete | list | users | addUser | resetUser | removeUser
//
// כניסת המנהל: קוד ההזמנה האישי (נוצר ע"י scripts/make-invite.mjs ונשלח למנהל, גם כקישור staff.html#invite=...).
// בכניסה הראשונה עם הקוד נוצר חשבון המנהל הראשי, והקוד הזה הוא הקוד שלו (אפשר לשנות ב"החשבון שלי").
// כאן נשמר רק ה-hash של הקוד, אז גם כשהקוד ציבורי אי אפשר לנחש אותו. קוד הזמנה חדש מאפס את המנהל הראשי.
//
// אבטחה: קודי כניסה נשמרים רק כ-hash (scrypt). אחרי כניסה מקבלים טוקן חתום (HMAC) לשבוע.
// הגבלת ניסיונות כניסה לפי כתובת. תוכן העדכונים הוא טקסט בלבד, והאפליקציה מציגה אותו כטקסט (לא HTML).
import crypto from "node:crypto";

export const config = { path: ["/api/updates", "/api/staff"] };

const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const MAX_TEXT = 600, MAX_NAME = 40, TOKEN_DAYS = 7, MAX_DURATION_MIN = 60 * 24 * 30;
const AUDIENCES = ["all", "y1", "y2"];
// sha256 של מפתח ההזמנה למנהל. נוצר ע"י: node scripts/make-invite.mjs
let INVITE_HASH = "3cfc136db2d1d5b4403c8de0b99eaa57623b01b6eaa1b1110e191d4f63f9d20d";
export function __setInviteHash(h) { INVITE_HASH = h; }
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const norm = c => String(c || "").replace(/[\s-]/g, "").toUpperCase(); // "abcd-efgh" = "ABCDEFGH"
const isInvite = c => !!INVITE_HASH && !!norm(c) && safeEq(sha(norm(c)), INVITE_HASH);

// ---- אחסון: Netlify Blobs בייצור, מפה בזיכרון בבדיקות ----
let memStore = null;
export function __useMemoryStore() { const m = new Map(); memStore = { get: async k => m.has(k) ? JSON.parse(m.get(k)) : null, set: async (k, v) => { m.set(k, JSON.stringify(v)); } }; return m; }
async function store() {
  if (memStore) return memStore;
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: "maarechet-staff", consistency: "strong" });
  return { get: k => s.get(k, { type: "json" }), set: (k, v) => s.setJSON(k, v) };
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
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.randomBytes(8), b => CODE_CHARS[b % CODE_CHARS.length]).join("");
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}
// יצירת המנהל הראשי (או איפוס שלו, אם כבר קיים) עם קוד ההזמנה הנוכחי
async function claim(S, cfg, name, code) {
  const salt = crypto.randomBytes(16).toString("hex");
  let users = await S.get("users") || [], admin;
  const owner = cfg && (users.find(u => u.owner) || users.find(u => u.role === "admin"));
  if (owner) { // קוד הזמנה חדש = איפוס של המנהל הראשי (המורים נשארים)
    admin = { ...owner, name, salt, hash: hashCode(code, salt), owner: true };
    users = users.map(u => u.id === owner.id ? admin : u);
  } else {
    admin = { id: newId(), name, role: "admin", owner: true, salt, hash: hashCode(code, salt), createdAt: Date.now() };
    users = [...users, admin];
  }
  const conf = { ...(cfg || { secret: crypto.randomBytes(32).toString("hex"), createdAt: Date.now() }), inviteUsed: INVITE_HASH };
  await S.set("config", conf);
  await S.set("users", users);
  return { conf, admin };
}
function verify(token, secret) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const good = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEq(mac, good)) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}
const publicUser = u => ({ id: u.id, name: u.name, role: u.role, owner: !!u.owner });
const activeUpdates = (list, now = Date.now()) => (list || []).filter(u => u.expiresAt > now).sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));

// הגבלת ניסיונות כניסה: 8 כישלונות ב-15 דקות → נעילה ל-15 דקות
async function tooManyFailures(S, ip) {
  const r = await S.get("fails") || {};
  const now = Date.now(), recent = (r[ip] || []).filter(t => now - t < 15 * 60e3);
  return recent.length >= 8;
}
async function recordFailure(S, ip) {
  const r = await S.get("fails") || {};
  const now = Date.now();
  r[ip] = [...(r[ip] || []).filter(t => now - t < 15 * 60e3), now];
  for (const k of Object.keys(r)) if (!r[k].some(t => now - t < 15 * 60e3)) delete r[k];
  await S.set("fails", r);
}

export default async (req, context) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = new URL(req.url);
  const S = await store();

  // ---- ציבורי: העדכונים הפעילים ----
  if (url.pathname.endsWith("/updates")) {
    if (req.method === "POST") {
      // צפיות: מספר משוער (בלי זיהוי תלמיד). שמור בנפרד מהעדכונים, כדי שלא יתנגש עם כתיבת עדכון
      let b; try { b = await req.json(); } catch { b = null; }
      const ids = Array.isArray(b?.seen) ? b.seen.map(String).filter(x => /^[\w-]{4,20}$/.test(x)).slice(0, 10) : [];
      if (ids.length) {
        const list = await S.get("updates") || [], known = new Set(list.map(u => u.id));
        const v = await S.get("views") || {};
        for (const id of ids) if (known.has(id)) v[id] = (v[id] || 0) + 1;
        for (const k of Object.keys(v)) if (!known.has(k)) delete v[k];
        await S.set("views", v);
      }
      return reply(200, { ok: true }, headers);
    }
    if (req.method !== "GET") return reply(405, { ok: false, error: "method" }, headers);
    const list = await S.get("updates") || [];
    const updates = activeUpdates(list).map(u => ({ id: u.id, text: u.text, author: u.authorName, role: u.role, audience: u.audience, urgent: !!u.urgent, createdAt: u.createdAt, expiresAt: u.expiresAt }));
    return reply(200, { ok: true, now: Date.now(), updates }, { ...headers, "Cache-Control": "public, max-age=20" });
  }

  const cfg = await S.get("config");
  if (req.method === "GET") return reply(200, { ok: true, needsSetup: !cfg }, headers);
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);

  let body;
  try { body = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const action = String(body?.action || "");
  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";

  // ---- הגדרה ראשונה: רק אם עוד אין מנהל ----
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
    const { conf, admin } = await claim(S, cfg, name, code);
    return reply(200, { ok: true, token: sign({ uid: admin.id, exp: Date.now() + TOKEN_DAYS * 864e5 }, conf.secret), user: publicUser(admin) }, headers);
  }
  // כניסה ראשונה של המנהל עם קוד ההזמנה (מהקישור או בהקלדה): יוצר את החשבון שלו
  if (action === "login" && isInvite(body.code) && !(cfg && cfg.inviteUsed === INVITE_HASH)) {
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    const users = await S.get("users") || [];
    const owner = users.find(u => u.owner);
    const { conf, admin } = await claim(S, cfg, owner ? owner.name : "המנהל", norm(body.code));
    return reply(200, { ok: true, first: true, token: sign({ uid: admin.id, exp: Date.now() + TOKEN_DAYS * 864e5 }, conf.secret), user: publicUser(admin) }, headers);
  }
  if (!cfg) return reply(409, { ok: false, error: "needs_setup" }, headers);

  // ---- כניסה בקוד אישי ----
  if (action === "login") {
    if (await tooManyFailures(S, ip)) return reply(429, { ok: false, error: "locked" }, headers);
    const code = String(body.code || "").trim();
    const users = await S.get("users") || [];
    // קודים של מורים הם באותיות גדולות, אז מקבלים גם הקלדה באותיות קטנות
    const tries = [...new Set([code, code.toUpperCase(), norm(code)])].filter(Boolean);
    const u = code && users.find(x => tries.some(c => safeEq(hashCode(c, x.salt), x.hash)));
    if (!u) { await recordFailure(S, ip); return reply(401, { ok: false, error: "bad_code" }, headers); }
    return reply(200, { ok: true, token: sign({ uid: u.id, exp: Date.now() + TOKEN_DAYS * 864e5 }, cfg.secret), user: publicUser(u) }, headers);
  }

  // ---- מכאן: רק עם טוקן תקף ----
  const auth = verify((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), cfg.secret);
  const users = await S.get("users") || [];
  const me = auth && users.find(x => x.id === auth.uid);
  if (!me) return reply(401, { ok: false, error: "auth" }, headers);
  const isAdmin = me.role === "admin";

  if (action === "me") return reply(200, { ok: true, user: publicUser(me) }, headers);

  // "החשבון שלי": שינוי שם ו/או קוד כניסה (לכל אחד, על עצמו)
  if (action === "updateMe") {
    const name = body.name != null ? clean(body.name, MAX_NAME) : me.name;
    const code = body.code != null ? String(body.code) : null;
    if (!name || (code != null && (code.trim().length < 6 || code.length > 64))) return reply(400, { ok: false, error: "bad_request" }, headers);
    let next = { ...me, name };
    if (code != null) { const salt = crypto.randomBytes(16).toString("hex"); next = { ...next, salt, hash: hashCode(code.trim(), salt) }; }
    await S.set("users", users.map(x => x.id === me.id ? next : x));
    return reply(200, { ok: true, user: publicUser(next) }, headers);
  }

  if (action === "post") {
    const text = clean(body.text, MAX_TEXT);
    const minutes = Math.round(Number(body.minutes));
    const audience = AUDIENCES.includes(body.audience) ? body.audience : "all";
    if (!text || !(minutes >= 1 && minutes <= MAX_DURATION_MIN)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const now = Date.now();
    const list = (await S.get("updates") || []).filter(u => u.expiresAt > now - 7 * 864e5); // ניקוי ישנים
    // מנהל יכול לשלוח בשם מורה (asUser) או בשם חופשי כמו "המזכירות" (asName)
    let author = { authorId: me.id, authorName: me.name, role: me.role };
    if (isAdmin && body.asUser && body.asUser !== me.id) {
      const t = (await S.get("users") || []).find(x => x.id === body.asUser);
      if (!t) return reply(404, { ok: false, error: "not_found" }, headers);
      author = { authorId: t.id, authorName: t.name, role: t.role };
    } else if (isAdmin && clean(body.asName, MAX_NAME)) {
      author = { authorId: me.id, authorName: clean(body.asName, MAX_NAME), role: "staff" };
    }
    const upd = { id: newId(), text, ...author, postedBy: me.id, postedByName: me.name, audience, urgent: !!body.urgent, createdAt: now, expiresAt: now + minutes * 60e3 };
    list.push(upd);
    await S.set("updates", list);
    return reply(200, { ok: true, update: upd }, headers);
  }

  if (action === "extend") {
    const id = String(body.id || ""), add = Math.round(Number(body.minutes));
    if (!(add >= 1 && add <= MAX_DURATION_MIN)) return reply(400, { ok: false, error: "bad_request" }, headers);
    const list = await S.get("updates") || [];
    const u = list.find(x => x.id === id);
    if (!u) return reply(404, { ok: false, error: "not_found" }, headers);
    if (!isAdmin && u.authorId !== me.id) return reply(403, { ok: false, error: "forbidden" }, headers);
    const now = Date.now(), from = Math.max(now, u.expiresAt);
    u.expiresAt = Math.min(from + add * 60e3, now + MAX_DURATION_MIN * 60e3);
    await S.set("updates", list);
    return reply(200, { ok: true, update: u }, headers);
  }
  if (action === "end" || action === "delete") {
    const id = String(body.id || "");
    const list = await S.get("updates") || [];
    const u = list.find(x => x.id === id);
    if (!u) return reply(404, { ok: false, error: "not_found" }, headers);
    if (!isAdmin && u.authorId !== me.id) return reply(403, { ok: false, error: "forbidden" }, headers);
    const next = action === "delete" ? list.filter(x => x.id !== id) : list.map(x => x.id === id ? { ...x, expiresAt: Math.min(x.expiresAt, Date.now() - 1) } : x);
    await S.set("updates", next);
    return reply(200, { ok: true }, headers);
  }

  if (action === "list") {
    // מנהל רואה הכל, מורה רואה את שלו. כולל עדכונים שהסתיימו ב-3 הימים האחרונים
    const now = Date.now();
    const views = await S.get("views") || {};
    const list = (await S.get("updates") || []).filter(u => (isAdmin || u.authorId === me.id) && u.expiresAt > now - 3 * 864e5)
      .sort((a, b) => b.createdAt - a.createdAt).map(u => ({ ...u, active: u.expiresAt > now, views: views[u.id] || 0 }));
    return reply(200, { ok: true, now, updates: list }, headers);
  }

  // ---- ניהול צוות: מנהל בלבד ----
  if (!isAdmin) return reply(403, { ok: false, error: "forbidden" }, headers);
  if (action === "users") return reply(200, { ok: true, users: users.map(publicUser) }, headers);
  if (action === "addUser") {
    const name = clean(body.name, MAX_NAME), role = body.role === "admin" ? "admin" : "teacher";
    if (!name) return reply(400, { ok: false, error: "bad_request" }, headers);
    const code = newCode(), salt = crypto.randomBytes(16).toString("hex");
    const u = { id: newId(), name, role, salt, hash: hashCode(code, salt), createdAt: Date.now() };
    await S.set("users", [...users, u]);
    return reply(200, { ok: true, user: publicUser(u), code }, headers);
  }
  if (action === "resetUser") {
    const u = users.find(x => x.id === body.id);
    if (!u) return reply(404, { ok: false, error: "not_found" }, headers);
    if (u.owner && !me.owner) return reply(403, { ok: false, error: "forbidden" }, headers);
    const code = newCode(), salt = crypto.randomBytes(16).toString("hex");
    await S.set("users", users.map(x => x.id === u.id ? { ...x, salt, hash: hashCode(code, salt) } : x));
    return reply(200, { ok: true, user: publicUser(u), code }, headers);
  }
  if (action === "removeUser") {
    if (body.id === me.id) return reply(400, { ok: false, error: "self" }, headers);
    if (users.find(x => x.id === body.id)?.owner) return reply(403, { ok: false, error: "forbidden" }, headers);
    await S.set("users", users.filter(x => x.id !== body.id));
    return reply(200, { ok: true }, headers);
  }
  return reply(400, { ok: false, error: "bad_action" }, headers);
};
