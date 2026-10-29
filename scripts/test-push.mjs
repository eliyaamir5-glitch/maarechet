// בדיקות להתראות לטלפון (Web Push) בשרת, עם אחסון בזיכרון ושולח מדומה (לא שולח באמת).
//   node scripts/test-push.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default;
const crypto = await import("node:crypto");
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };
const ORIGIN = "https://eliyaamir5-glitch.github.io";
let sent = [], failFor = new Set();
mod.__setPushSender(async (sub, payload) => {
  if (failFor.has(sub.endpoint)) { const e = new Error("gone"); e.statusCode = 410; throw e; }
  sent.push({ endpoint: sub.endpoint, ...JSON.parse(payload) });
});
async function call(path, { method = "POST", body, token, ip = "1.1.1.1" } = {}) {
  const headers = { "Content-Type": "application/json", origin: ORIGIN };
  if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip });
  return { status: res.status, json: await res.json() };
}
const b64 = n => crypto.randomBytes(n).toString("base64url");
const SUB = n => ({ endpoint: `https://fcm.googleapis.com/fcm/send/dev${n}-${b64(8)}`, keys: { p256dh: b64(65), auth: b64(16) } });

// מפתח ציבורי
let r = await call("/api/push", { method: "GET" });
ok("public key is created automatically", r.status === 200 && /^[A-Za-z0-9_-]{80,}$/.test(r.json.key));
const k1 = r.json.key;
r = await call("/api/push", { body: { action: "key" } });
ok("same key on the next request", r.json.key === k1);
ok("private key never returned", !JSON.stringify(r.json).includes(JSON.parse(raw.get("vapid")).privateKey));

// הרשמה
const s1 = SUB(1), s2 = SUB(2), s3 = SUB(3);
r = await call("/api/push", { body: { action: "sub", device: "device-aaaa-0001", sub: s1, cls: "y1" } });
ok("subscribe (defaults: tefillin + urgent on)", r.status === 200 && r.json.prefs.tef === true && r.json.prefs.urgent === true);
await call("/api/push", { body: { action: "sub", device: "device-aaaa-0002", sub: s2, cls: "ya1", prefs: { tef: false, urgent: true } } });
await call("/api/push", { body: { action: "sub", device: "device-aaaa-0003", sub: s3, cls: "y2" } });
const stored = raw.get("push");
ok("stored without device id or name", !stored.includes("device-aaaa") && Object.keys(JSON.parse(stored)).length === 3);
r = await call("/api/push", { body: { action: "sub", device: "device-aaaa-0004", sub: { endpoint: "https://evil.example.com/x", keys: s1.keys }, cls: "y1" } });
ok("unknown push service is refused", r.status === 400);
r = await call("/api/push", { body: { action: "sub", device: "device-aaaa-0004", sub: SUB(4), cls: "y9" } });
ok("unknown class is refused", r.status === 400);
r = await call("/api/push", { body: { action: "sub", device: "bad", sub: SUB(5), cls: "y1" } });
ok("bad device id is refused", r.status === 400);

// תזכורת תפילין: חמישי 29.10.2026, שקיעה ~16:55 → חלון 15:40–16:15
const at = s => Date.parse(s);
r = await mod.pushTick(at("2026-10-29T13:00:00+02:00"));
ok("tick at 13:00: too early", r.skipped === "time" && sent.length === 0);
r = await mod.pushTick(at("2026-10-29T15:50:00+02:00"));
ok("tick at 15:50: sends to tefillin subscribers only", r.sent === 2 && sent.every(x => /תפילין/.test(x.body) && /16:5\d/.test(x.body)) && !sent.some(x => x.endpoint === s2.endpoint), JSON.stringify(r));
sent = [];
r = await mod.pushTick(at("2026-10-29T16:05:00+02:00"));
ok("second tick the same day: not sent again", r.skipped === "done" && sent.length === 0);
r = await mod.pushTick(at("2026-10-31T15:50:00+02:00"));
ok("Shabbat: nothing", r.skipped === "off");
r = await mod.pushTick(at("2027-04-25T17:50:00+03:00"));
ok("Chol HaMoed Pesach: nothing", r.skipped === "off");

// עדכון דחוף מהצוות → התראה לכיתה
const INVITE = "ABCD-EFGH-JKLM";
mod.__setInviteHash(crypto.createHash("sha256").update("ABCDEFGHJKLM").digest("hex"));
r = await call("/api/staff", { body: { action: "setup", name: "הרב המנהל", code: "admin-secret-1", invite: INVITE } });
const tok = r.json.token;
sent = [];
const RealNow = Date.now;
Date.now = () => at("2026-10-28T10:00:00+02:00"); // רביעי בבוקר
r = await call("/api/staff", { token: tok, body: { action: "post", text: "מחר אין לימודים", minutes: 60, audience: "y1", urgent: true } });
ok("urgent update to י'1 → push only to י'1", r.status === 200 && sent.length === 1 && sent[0].endpoint === s1.endpoint && /דחוף/.test(sent[0].title), JSON.stringify(sent));
sent = [];
r = await call("/api/staff", { token: tok, body: { action: "post", text: "סתם עדכון", minutes: 60, audience: "all" } });
ok("regular (not urgent) update → no push", sent.length === 0);
Date.now = () => at("2026-10-28T23:30:00+02:00"); // לילה
r = await call("/api/staff", { token: tok, body: { action: "post", text: "דחוף בלילה", minutes: 60, audience: "all", urgent: true } });
ok("urgent at night → no push (quiet hours)", sent.length === 0);
Date.now = () => at("2026-10-31T11:00:00+02:00"); // שבת
r = await call("/api/staff", { token: tok, body: { action: "post", text: "דחוף בשבת", minutes: 60, audience: "all", urgent: true } });
ok("urgent on Shabbat → no push", sent.length === 0);
// כתובת שפגה נמחקת
Date.now = () => at("2026-10-28T10:00:00+02:00");
failFor.add(s3.endpoint);
r = await call("/api/staff", { token: tok, body: { action: "post", text: "דחוף לכולם", minutes: 60, audience: "all", urgent: true } });
ok("urgent to all → everyone with urgent on", sent.length === 2, JSON.stringify(sent.map(x => x.endpoint.slice(-12))));
ok("expired subscription (410) is removed", Object.keys(JSON.parse(raw.get("push"))).length === 2);
Date.now = RealNow;

// ביטול
r = await call("/api/push", { body: { action: "unsub", device: "device-aaaa-0001" } });
ok("unsubscribe removes the device", r.status === 200 && Object.keys(JSON.parse(raw.get("push"))).length === 1);
