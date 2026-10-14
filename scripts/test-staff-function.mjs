// בדיקות לפונקציית עדכוני הצוות, עם אחסון בזיכרון (לא נוגע בנטליפיי האמיתי).
//   node scripts/test-staff-function.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default;
const crypto = await import("node:crypto");
const INVITE = "ABCD-EFGH-JKLM";
mod.__setInviteHash(crypto.createHash("sha256").update("ABCDEFGHJKLM").digest("hex"));
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };
const ORIGIN = "https://eliyaamir5-glitch.github.io";
async function call(path, { method = "POST", body, token, ip = "1.1.1.1", origin = ORIGIN } = {}) {
  const headers = { "Content-Type": "application/json", origin };
  if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip });
  return { status: res.status, json: res.status === 204 ? null : await res.json(), headers: res.headers };
}

// הגדרה ראשונה
let r = await call("/api/staff", { method: "GET" });
ok("before setup: needsSetup", r.json.needsSetup === true);
r = await call("/api/staff", { body: { action: "login", code: "x" } });
ok("login before setup is refused", r.status === 409);
r = await call("/api/staff", { body: { action: "setup", name: "פורץ", code: "hacker-123" } });
ok("setup without the invite link is refused", r.status === 403);
r = await call("/api/staff", { body: { action: "setup", name: "פורץ", code: "hacker-123", invite: "guess" } });
ok("setup with a wrong invite is refused", r.status === 403);
r = await call("/api/staff", { body: { action: "check_invite", invite: INVITE } });
ok("check_invite: valid and unused", r.json.valid === true && r.json.used === false);
r = await call("/api/staff", { body: { action: "setup", name: "המנהל", code: "123", invite: INVITE } });
ok("setup rejects a short code", r.status === 400);
r = await call("/api/staff", { body: { action: "setup", name: "הרב המנהל", code: "admin-secret-1", invite: INVITE } });
const adminToken = r.json.token;
ok("setup creates the admin and logs in", r.status === 200 && r.json.user.role === "admin" && !!adminToken);
r = await call("/api/staff", { body: { action: "setup", name: "פורץ", code: "hacker-123", invite: INVITE } });
ok("the invite link works only once", r.status === 409 && r.json.error === "invite_used");
ok("codes are stored only as hashes", !raw.get("users").includes("admin-secret-1"));

// מורה
r = await call("/api/staff", { body: { action: "addUser", name: "המורה דוד" }, token: adminToken });
const teacherCode = r.json.code, teacher = r.json.user;
ok("admin adds a teacher and gets a one-time code", r.status === 200 && /^[A-Z2-9]{8}$/.test(teacherCode) && teacher.role === "teacher");
r = await call("/api/staff", { body: { action: "login", code: teacherCode.toLowerCase() } });
const teacherToken = r.json.token;
ok("teacher logs in with the code (case-insensitive)", r.status === 200 && r.json.user.name === "המורה דוד");
r = await call("/api/staff", { body: { action: "addUser", name: "מורה מזויף" }, token: teacherToken });
ok("teacher cannot add staff", r.status === 403);

// עדכונים
r = await call("/api/staff", { body: { action: "post", text: "מחר מתחילים ב-9:00", minutes: 120, audience: "y1" }, token: teacherToken });
const tUpd = r.json.update;
ok("teacher posts an update (2 hours, י'1)", r.status === 200 && tUpd.audience === "y1" && Math.abs(tUpd.expiresAt - tUpd.createdAt - 120 * 60e3) < 5);
r = await call("/api/staff", { body: { action: "post", text: "<img src=x onerror=alert(1)> טיול מחר", minutes: 60 * 24 * 2, audience: "all", urgent: true }, token: adminToken });
const aUpd = r.json.update;
ok("admin posts an urgent update for everyone (2 days)", r.status === 200 && aUpd.urgent === true);
r = await call("/api/staff", { body: { action: "post", text: "", minutes: 10 }, token: teacherToken });
ok("empty text is refused", r.status === 400);
r = await call("/api/staff", { body: { action: "post", text: "x", minutes: 0 }, token: teacherToken });
ok("zero duration is refused", r.status === 400);
r = await call("/api/staff", { body: { action: "post", text: "x".repeat(2000), minutes: 5 }, token: teacherToken });
ok("long text is cut to 600 chars", r.status === 200 && r.json.update.text.length === 600);
await call("/api/staff", { body: { action: "delete", id: r.json.update.id }, token: teacherToken });

// קריאה ציבורית
r = await call("/api/updates", { method: "GET" });
ok("public feed shows both active updates, urgent first", r.status === 200 && r.json.updates.length === 2 && r.json.updates[0].urgent === true && r.json.updates[1].author === "המורה דוד");
ok("public feed does not expose author ids", !("authorId" in r.json.updates[0]));
ok("text is stored as plain text (app renders it with textContent)", r.json.updates[0].text.startsWith("<img"));
ok("public feed has CORS for the GitHub Pages site", r.headers.get("access-control-allow-origin") === ORIGIN);

// הרשאות על עדכונים
r = await call("/api/staff", { body: { action: "end", id: aUpd.id }, token: teacherToken });
ok("teacher cannot end the principal's update", r.status === 403);
r = await call("/api/staff", { body: { action: "end", id: tUpd.id }, token: adminToken });
ok("principal can end a teacher's update", r.status === 200);
r = await call("/api/updates", { method: "GET" });
ok("ended update disappears from the feed", r.json.updates.length === 1 && r.json.updates[0].id === aUpd.id);
r = await call("/api/staff", { body: { action: "list" }, token: teacherToken });
ok("teacher's list shows only their own (incl. ended)", r.json.updates.length === 1 && r.json.updates[0].id === tUpd.id && r.json.updates[0].active === false);

// טוקנים והגבלת ניסיונות
r = await call("/api/staff", { body: { action: "me" }, token: adminToken.slice(0, -2) + "xx" });
ok("tampered token is refused", r.status === 401);
for (let i = 0; i < 8; i++) await call("/api/staff", { body: { action: "login", code: "WRONG" + i }, ip: "9.9.9.9" });
r = await call("/api/staff", { body: { action: "login", code: teacherCode }, ip: "9.9.9.9" });
ok("8 wrong codes lock that address", r.status === 429);
r = await call("/api/staff", { body: { action: "login", code: teacherCode }, ip: "2.2.2.2" });
ok("other addresses are not locked", r.status === 200);

// איפוס והסרה
r = await call("/api/staff", { body: { action: "resetUser", id: teacher.id }, token: adminToken });
const newCode = r.json.code;
r = await call("/api/staff", { body: { action: "login", code: teacherCode }, ip: "3.3.3.3" });
ok("after reset the old code stops working", r.status === 401);
r = await call("/api/staff", { body: { action: "login", code: newCode }, ip: "3.3.3.3" });
ok("the new code works", r.status === 200);
r = await call("/api/staff", { body: { action: "removeUser", id: teacher.id }, token: adminToken });
r = await call("/api/staff", { body: { action: "me" }, token: teacherToken });
ok("removed teacher's token stops working", r.status === 401);

// שליחה בשם, הארכה, צפיות
r = await call("/api/staff", { body: { action: "addUser", name: "אורי זרביב" }, token: adminToken });
const uri = r.json.user, uriCode = r.json.code;
r = await call("/api/staff", { body: { action: "post", text: "בשם המורה", minutes: 30, asUser: uri.id }, token: adminToken });
const asT = r.json.update;
ok("principal posts in a teacher's name", r.status === 200 && asT.authorName === "אורי זרביב" && asT.role === "teacher" && asT.postedByName === "הרב המנהל");
r = await call("/api/staff", { body: { action: "post", text: "מהמזכירות", minutes: 30, asName: "המזכירות" }, token: adminToken });
ok("principal posts under a free name", r.status === 200 && r.json.update.authorName === "המזכירות" && r.json.update.role === "staff");
r = await call("/api/staff", { body: { action: "login", code: uriCode }, ip: "4.4.4.4" });
const uriToken = r.json.token;
r = await call("/api/staff", { body: { action: "post", text: "x", minutes: 5, asName: "המנהל" }, token: uriToken });
ok("a teacher cannot post under another name", r.status === 200 && r.json.update.authorName === "אורי זרביב");
r = await call("/api/staff", { body: { action: "list" }, token: uriToken });
ok("the teacher sees the update sent in his name", r.json.updates.some(u => u.id === asT.id));
r = await call("/api/staff", { body: { action: "extend", id: asT.id, minutes: 60 }, token: uriToken });
ok("the teacher can extend it by an hour", r.status === 200 && Math.abs(r.json.update.expiresAt - asT.expiresAt - 60 * 60e3) < 5);
r = await call("/api/updates", { method: "POST", body: { seen: [asT.id, asT.id, "nope-id"] } });
r = await call("/api/updates", { method: "POST", body: { seen: [asT.id] } });
r = await call("/api/staff", { body: { action: "list" }, token: adminToken });
ok("views are counted (unknown ids ignored)", r.json.updates.find(u => u.id === asT.id).views === 3);
r = await call("/api/staff", { body: { action: "addUser", name: "סגן", role: "admin" }, token: adminToken });
const vice = r.json.user;
r = await call("/api/staff", { body: { action: "login", code: r.json.code }, ip: "5.5.5.5" });
const viceToken = r.json.token;
r = await call("/api/staff", { body: { action: "users" }, token: viceToken });
const ownerId = r.json.users.find(u => u.owner).id;
r = await call("/api/staff", { body: { action: "removeUser", id: ownerId }, token: viceToken });
ok("a second admin cannot remove the main principal", r.status === 403 && vice.role === "admin");
r = await call("/api/staff", { body: { action: "resetUser", id: ownerId }, token: viceToken });
ok("…or reset his code", r.status === 403);

// קישור חדש = איפוס קוד המנהל, המורים נשארים
const INVITE2 = "WXYZ-2345-6789";
mod.__setInviteHash(crypto.createHash("sha256").update("WXYZ23456789").digest("hex"));
r = await call("/api/staff", { body: { action: "setup", name: "הרב המנהל", code: "new-admin-code", invite: INVITE2 }, ip: "6.6.6.6" });
ok("a new invite resets the principal's code", r.status === 200 && r.json.user.id === ownerId);
r = await call("/api/staff", { body: { action: "login", code: "admin-secret-1" }, ip: "6.6.6.6" });
ok("the old principal code stops working", r.status === 401);
r = await call("/api/staff", { body: { action: "users" }, token: viceToken });
ok("teachers and other admins are kept", r.json.users.some(u => u.id === uri.id) && r.json.users.some(u => u.id === vice.id));

// קוד ההזמנה כקוד כניסה: כניסה ראשונה יוצרת את המנהל, ואז אפשר לשנות קוד ושם
const INVITE3 = "QRST-UVWX-YZ23";
mod.__setInviteHash(crypto.createHash("sha256").update("QRSTUVWXYZ23").digest("hex"));
r = await call("/api/staff", { body: { action: "login", code: "qrst uvwx yz23" }, ip: "7.7.7.7" });
const t3 = r.json.token;
ok("typing the principal code (any case/spaces) signs him in as the main principal", r.status === 200 && r.json.first === true && r.json.user.id === ownerId && r.json.user.owner);
r = await call("/api/staff", { body: { action: "login", code: INVITE3 }, ip: "7.7.7.7" });
ok("the same code keeps working afterwards", r.status === 200 && !r.json.first && r.json.user.id === ownerId);
r = await call("/api/staff", { body: { action: "updateMe", name: "הרב יוסף", code: "my-own-code" }, token: t3 });
ok("he changes his name and code", r.status === 200 && r.json.user.name === "הרב יוסף");
r = await call("/api/staff", { body: { action: "login", code: INVITE3 }, ip: "7.7.7.7" });
ok("after changing, the original code stops working", r.status === 401);
r = await call("/api/staff", { body: { action: "login", code: "my-own-code" }, ip: "8.8.8.8" });
ok("the new code works", r.status === 200 && r.json.user.name === "הרב יוסף");
r = await call("/api/staff", { body: { action: "updateMe", code: "123" }, token: t3 });
ok("a too-short code is refused", r.status === 400);

// מאפס: התקנה חדשה, הקוד הראשון יוצר את המנהל
const fresh = await import("../netlify/functions/staff.mjs?fresh=1");
fresh.__useMemoryStore();
fresh.__setInviteHash(crypto.createHash("sha256").update("ABCDEFGHJKLM").digest("hex"));
const res = await fresh.default(new Request("http://localhost/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", code: "ABCD-EFGH-JKLM" }) }), { ip: "9.1.1.1" });
const j = await res.json();
ok("on a fresh install the principal code creates the account", res.status === 200 && j.user.role === "admin" && j.user.name === "המנהל");
