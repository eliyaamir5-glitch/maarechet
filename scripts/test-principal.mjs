// בדיקות לכלי מנהל הישיבה (staff.html, תפקיד admin): תמונת מצב, השעיה, הודעות – והגבולות מול מנהל המערכת.
//   node scripts/test-principal.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default;
const crypto = await import("node:crypto");
mod.__setPushSender(async () => {});
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };
const ORIGIN = "https://eliyaamir5-glitch.github.io";
async function call(path, { method = "POST", body, token, ip = "1.1.1.1" } = {}) {
  const headers = { "Content-Type": "application/json", origin: ORIGIN };
  if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip });
  return { status: res.status, json: await res.json() };
}
mod.__setInviteHash(crypto.createHash("sha256").update("ABCDEFGHJKLM").digest("hex"));
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
let r = await call("/api/staff", { body: { action: "setup", name: "הרב המנהל", code: "admin-secret-1", invite: "ABCD-EFGH-JKLM" } });
const admin = r.json.token;
r = await call("/api/staff", { token: admin, body: { action: "addUser", name: "המורה דוד" } });
r = await call("/api/staff", { body: { action: "login", code: r.json.code } });
const teacher = r.json.token;
r = await call("/api/owner", { body: { action: "login", code: "OWNERTEST1234567" } });
const owner = r.json.token;

// תלמידים נכנסים (hello)
const hello = (device, name, cls) => call("/api/feed", { body: { action: "hello", device, name, cls, eng: "anijar", math: "adir", major: "cs", ver: "x", plat: "iPhone" } });
await hello("device-aaaa-0001", "נועה כהן", "ya1");
await hello("device-aaaa-0002", "יוסי לוי", "y2");

// תמונת מצב
r = await call("/api/staff", { token: teacher, body: { action: "pOverview" } });
ok("teacher cannot open the principal overview", r.status === 403);
r = await call("/api/staff", { token: admin, body: { action: "pOverview" } });
ok("principal sees all students with class and groups", r.status === 200 && r.json.students.length === 2 && r.json.students.some(s => s.name === "נועה כהן" && s.cls === "ya1" && s.eng === "anijar"));
ok("principal overview has daily usage and class stats", Array.isArray(r.json.daily) && r.json.daily.length === 30 && typeof r.json.classStats === "object");
ok("owner-only data is not included (errors, log, update mode)", !("errors" in r.json) && !("log" in r.json) && !("maint" in r.json));
const noa = r.json.students.find(s => s.name === "נועה כהן");

// השעיה
r = await call("/api/staff", { token: teacher, body: { action: "pSuspend", people: [{ name: noa.name, cls: noa.cls, keys: [noa.key] }], minutes: 60, reason: "בדיקה" } });
ok("teacher cannot suspend", r.status === 403);
r = await call("/api/staff", { token: admin, body: { action: "pSuspend", people: [{ name: noa.name, cls: noa.cls, keys: [noa.key] }], minutes: 60, reason: "לא נכנס לשיעורים" } });
ok("principal suspends a student", r.status === 200);
r = await hello("device-aaaa-0001", "נועה כהן", "ya1");
ok("the student is suspended in the app (with the reason)", !!r.json.susp && /לא נכנס לשיעורים/.test(r.json.susp.reason || ""), JSON.stringify(r.json.susp));
r = await call("/api/owner", { token: owner, body: { action: "overview" } });
ok("owner log shows the principal did it", r.json.log.some(x => x.action === "suspend" && /👔 הרב המנהל/.test(x.detail)), JSON.stringify(r.json.log.slice(0, 2)));
ok("owner sees the suspension and can undo it", r.json.suspended.length >= 1);
r = await call("/api/owner", { token: owner, body: { action: "unsuspend", people: [{ name: noa.name, cls: noa.cls, keys: [noa.key] }] } });
r = await hello("device-aaaa-0001", "נועה כהן", "ya1");
ok("owner undid the principal's suspension", !r.json.susp);

// הודעות
r = await call("/api/staff", { token: admin, body: { action: "pMsg", text: "שלום י\"א1", to: "ya1", hours: 24 } });
ok("principal sends a class message", r.status === 200);
r = await hello("device-aaaa-0001", "נועה כהן", "ya1");
const pm = (r.json.msgs || []).find(m => m.text === "שלום י\"א1");
ok("student gets it, marked as from the principal", !!pm && pm.from === "principal");
r = await hello("device-aaaa-0002", "יוסי לוי", "y2");
ok("other class does not get it", !(r.json.msgs || []).some(m => m.text === "שלום י\"א1"));
r = await call("/api/owner", { token: owner, body: { action: "msgSend", text: "הודעה ממנהל המערכת", to: "all", hours: 24 } });
const ownMsg = r.json.id;
r = await call("/api/staff", { token: admin, body: { action: "pOverview" } });
ok("principal sees only the principal's messages", r.json.msgs.length === 1 && r.json.msgs[0].from === "principal");
r = await call("/api/staff", { token: admin, body: { action: "pMsgDelete", id: ownMsg } });
r = await hello("device-aaaa-0002", "יוסי לוי", "y2");
ok("principal cannot delete the owner's message", (r.json.msgs || []).some(m => m.id === ownMsg));
const pid = (await call("/api/staff", { token: admin, body: { action: "pOverview" } })).json.msgs[0].id;
r = await call("/api/staff", { token: admin, body: { action: "pMsgDelete", id: pid } });
r = await call("/api/staff", { token: admin, body: { action: "pOverview" } });
ok("principal deletes their own message", r.json.msgs.length === 0);
