// בדיקות ל"מחיקת המשתמש" (leave), זיהוי תלמיד שחזר, ו"מזל טוב" ביום הולדת (wish)
//   node scripts/test-leave.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default;
const crypto = await import("node:crypto");
mod.__setPushSender(async () => {});
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };
async function call(path, body, { token, ip = "1.1.1.1" } = {}) {
  const headers = { "Content-Type": "application/json", origin: "https://eliyaamir5-glitch.github.io" };
  if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method: "POST", headers, body: JSON.stringify(body) }), { ip });
  return { status: res.status, json: await res.json() };
}
mod.__setInviteHash(crypto.createHash("sha256").update("ABCDEFGHJKLM").digest("hex"));
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
const admin = (await call("/api/staff", { action: "setup", name: "הרב המנהל", code: "admin-secret-1", invite: "ABCD-EFGH-JKLM" })).json.token;
const owner = (await call("/api/owner", { action: "login", code: "OWNERTEST1234567" })).json.token;
const hello = (device, name, cls, x = {}) => call("/api/feed", { action: "hello", device, name, cls, eng: "anijar", math: "adir", major: "cs", ver: "x", plat: "iPhone", ...x });
const D1 = "device-aaaa-0001", D2 = "device-bbbb-0002", D3 = "device-cccc-0003";

// הכנה: נועה רשומה, עם יום הולדת והתראות
await hello(D1, "נועה כהן", "ya1");
const md = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", month: "2-digit", day: "2-digit" }).format(new Date());
await call("/api/feed", { action: "birthday", device: D1, name: "נועה כהן", cls: "ya1", md });
await call("/api/push", { action: "sub", device: D1, cls: "ya1", sub: { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "B" + "x".repeat(86), auth: "y".repeat(22) } }, prefs: {} });

// מזל טוב מחבר
let r = await call("/api/feed", { action: "wish", device: D2, name: "יוסי לוי", cls: "ya1", toName: "נועה כהן", toCls: "ya1" });
ok("a friend sends a birthday wish", r.status === 200 && r.json.count === 1, JSON.stringify(r.json));
r = await call("/api/feed", { action: "wish", device: D2, name: "יוסי לוי", cls: "ya1", toName: "נועה כהן", toCls: "ya1" });
ok("the same friend twice counts once", r.json.count === 1);
r = await call("/api/feed", { action: "wish", device: D3, name: "דני", cls: "ya1", toName: "מישהו אחר", toCls: "ya1" });
ok("no wish to someone without a birthday today", r.status === 404);
r = await hello(D1, "נועה כהן", "ya1");
ok("the birthday girl sees who wished her", JSON.stringify(r.json.wishes) === JSON.stringify(["יוסי לוי"]), JSON.stringify(r.json.wishes));
r = await hello(D2, "יוסי לוי", "ya1");
ok("others don't get the wish list", !r.json.wishes);

// מחיקת המשתמש
r = await call("/api/feed", { action: "leave", device: D1, name: "נועה כהן", cls: "ya1" });
ok("leave works", r.status === 200);
r = await call("/api/staff", { action: "pOverview" }, { token: admin });
ok("student is gone from the principal's list", !r.json.students.some(s => s.name === "נועה כהן"));
ok("principal sees she deleted her user", r.json.departures.some(d => d.name === "נועה כהן" && d.cls === "ya1" && !d.back), JSON.stringify(r.json.departures));
r = await call("/api/feed", { action: "leave", device: D1 }); // שוב, בלי רשומה – לא נופל ולא רושם פעמיים
r = await call("/api/staff", { action: "pOverview" }, { token: admin });
ok("leaving twice doesn't duplicate", r.json.departures.length === 1);
const fg = await (await handler(new Request("http://localhost/api/feed"), { ip: "1.1.1.1" })).json();
ok("her birthday is removed", !fg.birthdays.some(x => x.name === "נועה כהן"));
r = await call("/api/owner", { action: "overview" }, { token: owner });
ok("owner log: deleted", r.json.log.some(x => x.action === "leave" && /נועה כהן/.test(x.detail)));

// חוזרת ממכשיר/משתמש חדש
await hello(D3, "נועה  כהן", "ya1", { eng: "", math: "toni", major: "cs" });
r = await call("/api/staff", { action: "pOverview" }, { token: admin });
ok("same name + class + a matching detail → recognized as back", r.json.departures.some(d => d.name === "נועה כהן" && d.back > 0));
r = await call("/api/owner", { action: "overview" }, { token: owner });
ok("owner log: returned", r.json.log.some(x => x.action === "return" && /נועה/.test(x.detail)), JSON.stringify(r.json.log.slice(0, 3)));

// שם זהה בכיתה אחרת – לא "חזר"
await hello("device-dddd-0004", "יוסי לוי", "y2");
await call("/api/feed", { action: "leave", device: "device-dddd-0004" });
await hello("device-eeee-0005", "יוסי לוי", "y1", { eng: "hadad", math: "zz", major: "econ" });
r = await call("/api/staff", { action: "pOverview" }, { token: admin });
ok("same name in another class is not 'back'", r.json.departures.some(d => d.name === "יוסי לוי" && !d.back));
