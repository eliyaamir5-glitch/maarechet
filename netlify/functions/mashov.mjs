// פונקציית נטליפיי: גשר בין האפליקציה לממשק הלא רשמי של משוב (web.mashov.info).
// מקבלת שם משתמש, סיסמה, סמל מוסד ושנה, מתחברת, מושכת נתונים, מתנתקת ומחזירה רק את הנתונים.
// הסיסמה לא נשמרת בשום מקום ולא נכתבת ליומנים (אין כאן console.log של הבקשה).
//
// POST /api/mashov  { username, password, semel, year }
//   → { ok:true, fetchedAt, student:{name}, behave:[...], grades:[...], groups:[...], lessonsCount:[...] }
//   → { ok:false, error:"bad_login" | "bad_request" | "mashov_down" | "no_student" }
//
// הממשק של משוב לא רשמי ויכול להשתנות. מבוסס על node-mashov, mashovapi-js ו-MashovMCP (קוד פתוח).

const BASE = process.env.MASHOV_BASE || "https://web.mashov.info/api";
const APP = { appName: "info.mashov.students", apiVersion: "3.20210425", appVersion: "3.20210425", appBuild: "3.20210425",
  deviceUuid: "maarechet-web", devicePlatform: "web", deviceManufacturer: "web", deviceModel: "web", deviceVersion: "1" };
const ALLOWED = [/^https:\/\/eliyaamir5-glitch\.github\.io$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
const TIMEOUT_MS = 15000;

export const config = { path: "/api/mashov" };

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

export default async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, headers);

  let body;
  try { body = await req.json(); } catch { return reply(400, { ok: false, error: "bad_request" }, headers); }
  const username = String(body?.username ?? "").trim(), password = String(body?.password ?? "");
  const semel = Number(body?.semel), year = Number(body?.year);
  if (!username || username.length > 80 || !password || password.length > 200 || !Number.isInteger(semel) || semel < 100 || semel > 99999999 || !(year >= 2015 && year <= 2100))
    return reply(400, { ok: false, error: "bad_request" }, headers);

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
};
