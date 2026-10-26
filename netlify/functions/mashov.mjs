// פונקציית נטליפיי: גשר בין האפליקציה לממשק הלא רשמי של משוב (web.mashov.info).
// מקבלת שם משתמש, סיסמה, סמל מוסד ושנה, מתחברת, מושכת נתונים, מתנתקת ומחזירה רק את הנתונים.
// הסיסמה לא נשמרת בשום מקום ולא נכתבת ליומנים (אין כאן console.log של הבקשה).
//
// POST /api/mashov  { username, password, semel, year }
//   → { ok:true, fetchedAt, student:{name}, behave:[...], grades:[...], groups:[...], lessonsCount:[...] }
//   → { ok:false, error:"bad_login" | "bad_request" | "mashov_down" | "no_student" }
//   → 429 { ok:false, error:"mashov_down", reason:"too_many" }  אחרי יותר מדי סיסמאות שגויות (לחשבון / לכתובת), ל-15 דקות
//
// הממשק של משוב לא רשמי ויכול להשתנות. מבוסס על node-mashov, mashovapi-js ו-MashovMCP (קוד פתוח).

import crypto from "node:crypto";

const BASE = process.env.MASHOV_BASE || "https://web.mashov.info/api";
const APP = { appName: "info.mashov.students", apiVersion: "3.20210425", appVersion: "3.20210425", appBuild: "3.20210425",
  deviceUuid: "maarechet-web", devicePlatform: "web", deviceManufacturer: "web", deviceModel: "web", deviceVersion: "1" };
// רק האתרים של הפרויקט: GitHub Pages, האתר בנטליפיי (וגרסאות התצוגה שלו xxx--lucent-crepe-6db22c), ומחשב מקומי.
// לא "כל netlify.app": אחרת כל אתר שמישהו מעלה לנטליפיי יכול לשלוח דרכנו סיסמאות של משוב מהדפדפן
const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/([a-z0-9-]+--)?lucent-crepe-6db22c\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const TIMEOUT_MS = 15000;
// הגבלת התחברויות שנכשלו (סיסמה שגויה), כדי שאי אפשר לנחש סיסמאות של תלמידים דרכנו
// (וכדי שמשוב לא יחסום את השרת שלנו לכולם). כל בית הספר יכול לצאת מאותה כתובת – לכן המכסה לכתובת נדיבה.
const FAIL_WIN = 15 * 60e3, IP_FAILS = 100, USER_FAILS = 10;

export const config = { path: "/api/mashov" };

// ---- אחסון קטן לספירת כישלונות: Netlify Blobs בייצור, מפה בזיכרון בבדיקות. תקלה באחסון לא חוסמת אף אחד ----
let memStore = null;
export function __useMemoryStore(custom) {
  if (custom) { memStore = custom; return null; } // בבדיקות: אחסון מדומה (למשל אחד שלא עונה)
  const m = new Map();
  const get = async k => m.has(k) ? JSON.parse(m.get(k)) : null, set = async (k, v) => { m.set(k, JSON.stringify(v)); };
  let chain = Promise.resolve(); // עדכונים לאותו מפתח בתור, כמו הכתיבה המותנית בשרת האמיתי
  memStore = { get, set, update: (k, fn) => { const run = chain.then(async () => { const n = fn(await get(k)); if (n !== undefined) await set(k, n); }); chain = run.catch(() => {}); return run; } };
  return m;
}
async function store() {
  if (memStore) return memStore;
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: "maarechet-mashov", consistency: "strong" });
  return {
    get: k => s.get(k, { type: "json" }), set: (k, v) => s.setJSON(k, v),
    // כתיבה מותנית (etag): שתי בקשות במקביל לא מוחקות אחת לשנייה את הספירה
    async update(k, fn) {
      for (let i = 0; i < 6; i++) {
        const r = await s.getWithMetadata(k, { type: "json" }), next = fn(r ? r.data : null);
        if (next === undefined) return;
        const w = r && r.etag ? await s.setJSON(k, next, { onlyIfMatch: r.etag }) : r ? await s.setJSON(k, next) : await s.setJSON(k, next, { onlyIfNew: true });
        if (!w || w.modified !== false) return;
        await new Promise(res => setTimeout(res, 30 + Math.random() * 120));
      }
      throw new Error("busy");
    },
  };
}
// אחסון בלי update (למשל מדומה בבדיקות) – קריאה וכתיבה רגילות
const upd = (S, k, fn) => S.update ? S.update(k, fn) : (async () => { const n = fn(await S.get(k)); if (n !== undefined) await S.set(k, n); })();
// אחסון איטי לא תוקע את ההתחברות: אחרי 3 שניות ממשיכים בלעדיו
const within = (p, ms = 3000) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); t.unref?.(); })]).finally(() => clearTimeout(t)); };
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 32);
// המפתחות: כתובת, ו-hash של בית ספר+שם משתמש (לא שומרים שמות משתמש)
const failKeys = (ip, semel, username) => [["ip:" + ip, IP_FAILS], ["u:" + sha(semel + ":" + username.toLowerCase()), USER_FAILS]];
// כל ניסיון נרשם *לפני* שפונים למשוב, באותה כתיבה שבודקת את המכסה – כך גם 100 בקשות במקביל לא עוקפות אותה.
// ניסיון שהצליח (או שמשוב לא ענה) נמחק אחר כך (release); סיסמה שגויה נשארת רשומה = כישלון.
async function reserve(keys) {
  const stamp = Date.now() + Math.random(); // חותמת ייחודית לניסיון הזה
  let blocked = false;
  try {
    await within((async () => upd(await store(), "fails", cur => {
      const f = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {}, now = Date.now();
      for (const k of Object.keys(f)) if (!Array.isArray(f[k]) || !f[k].some(t => now - t < FAIL_WIN)) delete f[k];
      if (keys.some(([k, max]) => Object.hasOwn(f, k) && f[k].filter(t => now - t < FAIL_WIN).length >= max)) { blocked = true; return undefined; }
      for (const [k] of keys) f[k] = [...(Object.hasOwn(f, k) ? f[k] : []), stamp].slice(-200);
      return f;
    }))());
  } catch { return { blocked: false, stamp: null }; } // אחסון תקוע/שבור לא חוסם אף אחד
  return { blocked, stamp: blocked ? null : stamp };
}
async function release(keys, stamp) {
  if (stamp == null) return;
  try {
    await within((async () => upd(await store(), "fails", cur => {
      const f = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {};
      let changed = false;
      for (const [k] of keys) if (Object.hasOwn(f, k) && Array.isArray(f[k]) && f[k].includes(stamp)) { f[k] = f[k].filter(t => t !== stamp); if (!f[k].length) delete f[k]; changed = true; }
      return changed ? f : undefined;
    }))());
  } catch {}
}

const isGuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const pick = (o, ...keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]; return undefined; };

function corsHeaders(origin) {
  const h = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin && ALLOWED.some(r => r.test(origin))) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return h;
}
const reply = (status, body, headers) => new Response(JSON.stringify(body), { status, headers });

function withTimeout(ms) { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; }

// מזהה התלמיד מתשובת ההתחברות (המבנה השתנה בין גרסאות משוב, לכן בודקים כמה מקומות)
function findStudentGuid(data) {
  const cands = [
    data?.credential?.userId, data?.credential?.studentGuid, data?.accessToken?.userId, data?.accessToken?.studentGuid,
    data?.accessToken?.children?.[0]?.childGuid, data?.userId, data?.studentGuid,
  ];
  for (const c of cands) if (isGuid(c)) return c;
  // חיפוש כללי של GUID בתוך credential/accessToken
  for (const root of [data?.credential, data?.accessToken]) {
    if (!root || typeof root !== "object") continue;
    for (const v of Object.values(root)) if (isGuid(v)) return v;
  }
  return null;
}
function findStudentName(data) {
  const at = data?.accessToken || {}, cr = data?.credential || {};
  const child = at.children?.[0];
  return pick(at, "displayName", "userName") || pick(cr, "displayName") ||
    (child ? `${child.privateName || ""} ${child.familyName || ""}`.trim() : "") ||
    `${pick(at, "privateName") || ""} ${pick(at, "familyName") || ""}`.trim() || "";
}

// צמצום הנתונים לשדות שהאפליקציה צריכה (ולא יותר)
const slimBehave = arr => (Array.isArray(arr) ? arr : []).map(e => ({
  date: String(pick(e, "lessonDate", "timestamp", "eventDate", "date") || "").slice(0, 10),
  lesson: pick(e, "lesson", "lessonNum", "hour") ?? null,
  subject: pick(e, "subject", "subjectName") || "",
  groupId: pick(e, "groupId") ?? null,
  type: pick(e, "achvaName", "eventName", "type") || "",
  code: pick(e, "achvaCode", "eventCode", "code") ?? null,
  justificationId: pick(e, "justificationId") ?? null,
  justification: pick(e, "justification", "justificationName") || "",
  justified: typeof e?.justified === "boolean" ? e.justified : undefined,
}));
const slimGrades = arr => (Array.isArray(arr) ? arr : []).map(e => ({
  date: String(pick(e, "eventDate", "date", "timestamp") || "").slice(0, 10),
  subject: pick(e, "subjectName", "subject") || "",
  event: pick(e, "gradingEvent", "event", "gradingEventName") || "",
  type: pick(e, "gradeType", "type") || "",
  grade: pick(e, "grade") ?? null,
  teacher: pick(e, "teacherName", "teacher") || "",
  groupId: pick(e, "groupId") ?? null,
}));
const slimGroups = arr => (Array.isArray(arr) ? arr : []).map(e => ({
  groupId: pick(e, "groupId", "id") ?? null, name: pick(e, "groupName", "name") || "",
  subject: pick(e, "subjectName", "subject") || "", teacher: pick(e, "teacherName", "teacher") || "",
}));
const slimCounts = arr => (Array.isArray(arr) ? arr : []).map(e => ({
  groupId: pick(e, "groupId") ?? null, lessonCount: pick(e, "lessonCount") ?? null, weeklyHours: pick(e, "weeklyHours") ?? null,
}));

export default async (req, context) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);
  // תקלה לא צפויה מחזירה תשובה מסודרת (עם CORS), ולא שגיאת 500 ריקה שהאפליקציה לא מבינה
  try { return await handle(req, context, headers); }
  catch (e) { console.error("mashov function error:", e && e.message); return reply(502, { ok: false, error: "mashov_down" }, headers); }
};

async function handle(req, context, headers) {
  let body;
  try { body = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const username = String(body?.username ?? "").trim(), password = String(body?.password ?? "");
  const semel = Number(body?.semel), year = Number(body?.year);
  if (!username || username.length > 80 || !password || password.length > 200 || !Number.isInteger(semel) || semel < 100 || semel > 99999999 || !(year >= 2015 && year <= 2100))
    return reply(400, { ok: false, error: "bad_request" }, headers);

  // 0. יותר מדי סיסמאות שגויות לאותו חשבון / מאותה כתובת → מחכים 15 דקות (גם סיסמה נכונה, כדי שלא יהיה אפשר לנחש)
  const ip = String((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown").replace(/[^0-9a-fA-F:.]/g, "").slice(0, 64) || "unknown";
  const keys = failKeys(ip, semel, username);
  // האפליקציה מכירה את "mashov_down" ("נסה שוב בעוד כמה דקות"); reason מפרט למה
  const { blocked, stamp } = await reserve(keys);
  if (blocked) return reply(429, { ok: false, error: "mashov_down", reason: "too_many" }, headers);
  try { const out = await fetchMashov(username, password, semel, year, headers); if (out.status !== 401) await release(keys, stamp); return out; } // רק סיסמה שגויה נשארת ככישלון
  catch (e) { await release(keys, stamp); throw e; }
}

// ההתחברות למשוב, משיכת הנתונים והתנתקות
async function fetchMashov(username, password, semel, year, headers) {

  // 1. התחברות
  let loginRes, loginData;
  const t1 = withTimeout(TIMEOUT_MS);
  try {
    loginRes = await fetch(`${BASE}/login`, {
      method: "POST", signal: t1.signal,
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ ...APP, semel, year, username, password }),
    });
    loginData = await loginRes.json().catch(() => null);
  } catch {
    return reply(502, { ok: false, error: "mashov_down" }, headers);
  } finally { t1.done(); }
  if (loginRes.status === 401 || loginRes.status === 403 || (loginRes.status === 400 && loginData)) return reply(401, { ok: false, error: "bad_login" }, headers);
  if (!loginRes.ok || !loginData) return reply(502, { ok: false, error: "mashov_down" }, headers);

  const csrf = loginRes.headers.get("x-csrf-token") || "";
  const setCookies = typeof loginRes.headers.getSetCookie === "function" ? loginRes.headers.getSetCookie() : (loginRes.headers.get("set-cookie") || "").split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  const cookie = setCookies.map(c => c.split(";")[0].trim()).filter(Boolean).concat(csrf ? [`Csrf-Token=${csrf}`] : []).join("; ");
  const guid = findStudentGuid(loginData);
  if (!guid) return reply(200, { ok: false, error: "no_student" }, headers);
  const auth = { "X-Csrf-Token": csrf, "Cookie": cookie, "Accept": "application/json", "Referer": "https://web.mashov.info/students/main/" };

  // 2. משיכת הנתונים במקביל. כל חלק שנכשל חוזר ריק, בלי להפיל את השאר
  const get = async (path) => {
    const t = withTimeout(TIMEOUT_MS);
    try { const r = await fetch(`${BASE}/students/${guid}/${path}`, { headers: auth, signal: t.signal }); return r.ok ? await r.json() : null; }
    catch { return null; } finally { t.done(); }
  };
  const [behave, grades, groups, lessonsCount] = await Promise.all([get("behave"), get("grades"), get("groups"), get("lessonsCount")]);

  // 3. התנתקות (לא מחכים לה יותר מדי)
  const t3 = withTimeout(4000);
  try { await fetch(`${BASE}/logout`, { headers: auth, signal: t3.signal }); } catch {} finally { t3.done(); }

  // בלי נתוני נוכחות אין טעם להחזיר הצלחה: זה היה מוחק את הנתונים הקודמים בטלפון ומראה "אפס חיסורים"
  if (behave === null) return reply(200, { ok: false, error: "mashov_down" }, headers);
  return reply(200, {
    ok: true, fetchedAt: new Date().toISOString(),
    student: { name: findStudentName(loginData) },
    behave: slimBehave(behave), grades: slimGrades(grades), groups: slimGroups(groups), lessonsCount: slimCounts(lessonsCount),
    partial: [behave, grades, groups, lessonsCount].some(x => x === null),
  }, headers);
}
