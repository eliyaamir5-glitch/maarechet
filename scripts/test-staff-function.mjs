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
for (let i = 0; i < 20; i++) await call("/api/staff", { body: { action: "login", code: "WRONG" + i }, ip: "9.9.9.9" });
r = await call("/api/staff", { body: { action: "login", code: teacherCode }, ip: "9.9.9.9" });
ok("20 wrong codes lock that address", r.status === 429);
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
let t3 = r.json.token;
ok("typing the principal code (any case/spaces) signs him in as the main principal", r.status === 200 && r.json.first === true && r.json.user.id === ownerId && r.json.user.owner);
r = await call("/api/staff", { body: { action: "login", code: INVITE3 }, ip: "7.7.7.7" });
ok("the same code keeps working afterwards", r.status === 200 && !r.json.first && r.json.user.id === ownerId);
r = await call("/api/staff", { body: { action: "updateMe", name: "הרב יוסף", code: "my-own-code" }, token: t3 });
ok("he changes his name and code, and gets a fresh sign-in", r.status === 200 && r.json.user.name === "הרב יוסף" && !!r.json.token);
const t3old = t3; t3 = r.json.token;
r = await call("/api/staff", { body: { action: "me" }, token: t3old });
ok("after changing the code, older sign-ins stop working", r.status === 401);
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

// רעיונות ותקלות מתלמידים
r = await call("/api/feedback", { body: { kind: "idea", text: "להוסיף מצב לילה <b>", name: "יוסי", cls: "י'2", page: "index", device: "iPhone" }, ip: "10.0.0.1" });
ok("a student sends an idea", r.status === 200 && r.json.ok);
r = await call("/api/feedback", { body: { kind: "bug", text: "" }, ip: "10.0.0.1" });
ok("empty feedback is refused", r.status === 400);
for (let i = 0; i < 29; i++) await call("/api/feedback", { body: { kind: "bug", text: "תקלה " + i }, ip: "10.0.0.2" });
r = await call("/api/feedback", { body: { kind: "bug", text: "האחרונה" }, ip: "10.0.0.2" });
ok("30 per hour per address are accepted", r.status === 200);
r = await call("/api/feedback", { body: { kind: "bug", text: "אחת יותר מדי" }, ip: "10.0.0.2" });
ok("the 31st within an hour is refused", r.status === 429);
r = await call("/api/staff", { body: { action: "feedback" }, token: uriToken });
ok("teachers cannot read feedback", r.status === 403 || r.status === 401);
r = await call("/api/staff", { body: { action: "feedback" }, token: t3 });
const fb = r.json.feedback;
ok("the principal sees feedback, newest first", r.status === 200 && fb.length === 31 && fb[fb.length - 1].kind === "idea" && fb[fb.length - 1].text.includes("<b>"));
await call("/api/staff", { body: { action: "feedbackDone", id: fb[0].id }, token: t3 });
await call("/api/staff", { body: { action: "feedbackDelete", id: fb[1].id }, token: t3 });
r = await call("/api/staff", { body: { action: "feedback" }, token: t3 });
ok("mark handled and delete work", r.json.feedback.length === 30 && r.json.feedback[0].done === true);

// אותו קוד לשני אנשים = אסור; איפוס מבטל כניסות קודמות
r = await call("/api/staff", { body: { action: "addUser", name: "מורה חדש" }, token: t3 });
const nCode = r.json.code, nUser = r.json.user;
r = await call("/api/staff", { body: { action: "login", code: nCode }, ip: "11.0.0.1" });
const nTok = r.json.token;
r = await call("/api/staff", { body: { action: "updateMe", code: "my-own-code" }, token: nTok });
ok("a teacher cannot pick a code someone else already uses", r.status === 409 && r.json.error === "code_taken");
r = await call("/api/staff", { body: { action: "login", code: "my-own-code" }, ip: "11.0.0.2" });
ok("…so that code still signs in only the principal", r.status === 200 && r.json.user.owner === true);
await call("/api/staff", { body: { action: "resetUser", id: nUser.id }, token: t3 });
r = await call("/api/staff", { body: { action: "me" }, token: nTok });
ok("after a reset, the teacher's old sign-in stops working", r.status === 401);

// סטי כרטיסיות לכיתה: מורה מפרסם, תלמידים מקבלים, רק הבעלים או מנהל עורכים
r = await call("/api/staff", { body: { action: "addUser", name: "מורה לאנגלית" }, token: t3 });
r = await call("/api/staff", { body: { action: "login", code: r.json.code }, ip: "12.0.0.1" });
const eTok = r.json.token;
r = await call("/api/staff", { body: { action: "addUser", name: "מורה אחר" }, token: t3 });
r = await call("/api/staff", { body: { action: "login", code: r.json.code }, ip: "12.0.0.2" });
const oTok = r.json.token;
r = await call("/api/staff", { body: { action: "setSave", title: "יחידה 3", subject: "אנגלית", audience: "y1", cards: [{ t: "apple", d: "תפוח" }] }, token: eTok });
ok("a set needs at least 2 full cards", r.status === 400);
r = await call("/api/staff", { body: { action: "setSave", title: "יחידה 3", subject: "אנגלית", audience: "y1", cards: [{ t: "apple", d: "תפוח" }, { t: "dog", d: "כלב" }, { t: "", d: "ריק" }, { t: "<b>cat</b>", d: "חתול" }] }, token: eTok });
const setId = r.json.set && r.json.set.id;
ok("teacher publishes a set (empty cards dropped)", r.status === 200 && r.json.set.cards.length === 3 && r.json.set.author === "מורה לאנגלית");
r = await call("/api/sets", { method: "GET" });
ok("students get the set from the public list", r.status === 200 && r.json.sets.length === 1 && r.json.sets[0].audience === "y1" && r.json.sets[0].cards[2].t === "<b>cat</b>" && !("authorId" in r.json.sets[0]));
r = await call("/api/staff", { body: { action: "setSave", id: setId, title: "גנבתי", cards: [{ t: "a", d: "b" }, { t: "c", d: "d" }] }, token: oTok });
ok("another teacher cannot edit it", r.status === 403);
r = await call("/api/staff", { body: { action: "setDelete", id: setId }, token: oTok });
ok("…or delete it", r.status === 403);
r = await call("/api/staff", { body: { action: "setsList" }, token: oTok });
ok("other teachers still see it (read-only)", r.json.sets.length === 1 && r.json.sets[0].canEdit === false && r.json.sets[0].mine === false);
r = await call("/api/staff", { body: { action: "setSave", id: setId, title: "יחידה 3 – מעודכן", audience: "all", cards: [{ t: "apple", d: "תפוח" }, { t: "dog", d: "כלב" }] }, token: eTok });
ok("the author edits it", r.status === 200 && r.json.set.title === "יחידה 3 – מעודכן" && r.json.set.audience === "all");
r = await call("/api/staff", { body: { action: "setSave", id: setId, title: "יחידה 3 – מנהל", cards: [{ t: "apple", d: "תפוח" }, { t: "dog", d: "כלב" }] }, token: t3 });
ok("the principal can edit any set", r.status === 200 && r.json.set.title === "יחידה 3 – מנהל");
r = await call("/api/staff", { body: { action: "setSave", title: "x", cards: [{ t: "a", d: "b" }, { t: "c", d: "d" }] } });
ok("publishing needs a sign-in", r.status === 401);
r = await call("/api/staff", { body: { action: "setDelete", id: setId }, token: t3 });
r = await call("/api/sets", { method: "GET" });
ok("a deleted set disappears for students", r.json.sets.length === 0);

// סרטון בעדכון
r = await call("/api/staff", { body: { action: "post", text: "צפו בסרטון", minutes: 60, video: "https://youtu.be/dQw4w9WgXcQ" }, token: t3 });
ok("update with a video link is saved", r.status === 200 && r.json.update.video === "https://youtu.be/dQw4w9WgXcQ");
r = await call("/api/updates", { method: "GET" });
ok("students get the video link", r.json.updates.some(u => u.video === "https://youtu.be/dQw4w9WgXcQ"));
r = await call("/api/staff", { body: { action: "post", text: "x", minutes: 60, video: "javascript:alert(1)" }, token: t3 });
ok("a non-https 'video' is refused", r.status === 400 && r.json.error === "bad_video");

// ספר טלפונים: קוד עריכה או מנהל; תלמידים רק קוראים
mod.__setPhoneHash(crypto.createHash("sha256").update("PHON1234").digest("hex"));
r = await call("/api/contacts", { method: "GET" });
ok("contacts start empty", r.status === 200 && r.json.contacts.length === 0);
r = await call("/api/contacts", { body: { action: "set", name: "טוני כהן", phone: "0501234567" } });
ok("a student (no code) cannot add a number", r.status === 401);
r = await call("/api/contacts", { body: { action: "check", code: "WRONG-CODE" }, ip: "13.0.0.1" });
ok("wrong edit code is refused", r.status === 403);
r = await call("/api/contacts", { body: { action: "check", code: "phon-1234" }, ip: "13.0.0.2" });
ok("edit code works (any case, with dash)", r.status === 200 && r.json.who === "editor");
r = await call("/api/contacts", { body: { action: "set", code: "PHON-1234", name: "טוני כהן", phone: "+972 50-123 4567" } });
ok("number saved in a uniform format", r.status === 200 && r.json.contact.phone === "050-123-4567", JSON.stringify(r.json));
r = await call("/api/contacts", { body: { action: "set", code: "PHON-1234", name: "מזכירות", phone: "08-6123456", note: "בשעות 8–14", extra: true } });
ok("landline + extra contact", r.json.contact.phone === "08-612-3456" && r.json.contact.extra === true, JSON.stringify(r.json));
r = await call("/api/contacts", { body: { action: "set", code: "PHON-1234", name: "טוני כהן", phone: "12345" } });
ok("invalid number refused", r.status === 400 && r.json.error === "bad_phone");
r = await call("/api/contacts", { body: { action: "set", name: "אדיר חניה", phone: "052-7654321" }, token: t3 });
ok("the principal can edit with his sign-in", r.status === 200 && r.json.contact.phone === "052-765-4321");
r = await call("/api/contacts", { method: "GET" });
ok("students see all numbers", r.json.contacts.length === 3 && r.json.contacts.find(c => c.name === "מזכירות").note === "בשעות 8–14");
r = await call("/api/contacts", { body: { action: "remove", code: "PHON-1234", name: "מזכירות" } });
r = await call("/api/contacts", { method: "GET" });
ok("remove works", r.json.contacts.length === 2 && !r.json.contacts.some(c => c.name === "מזכירות"));

// ---- פיד: עדכון מתוזמן, סקרים, אירועים, שאלות, ימי הולדת, סטטיסטיקה, שחרורים ----
const DEV1 = "device-aaaa-1111", DEV2 = "device-bbbb-2222";
r = await call("/api/staff", { body: { action: "post", text: "מתוזמן למחר", minutes: 60, startsAt: Date.now() + 864e5 }, token: t3 });
ok("scheduled update saved", r.status === 200 && r.json.update.startsAt > Date.now());
r = await call("/api/feed", { method: "GET" });
ok("scheduled update not visible yet", r.status === 200 && !r.json.updates.some(u => u.text === "מתוזמן למחר"));
r = await call("/api/staff", { body: { action: "list" }, token: t3 });
ok("staff sees it marked as scheduled", r.json.updates.some(u => u.text === "מתוזמן למחר" && u.scheduled && !u.active));
r = await call("/api/staff", { body: { action: "post", text: "x", minutes: 60, startsAt: Date.now() + 90 * 864e5 }, token: t3 });
ok("can't schedule more than 30 days ahead", r.status === 400);
// סקר
r = await call("/api/staff", { body: { action: "pollCreate", q: "לאן הטיול?", options: ["צפון", "דרום", ""], audience: "y1", hours: 24 }, token: t3 });
const pid = r.json.poll && r.json.poll.id;
ok("poll created (empty option dropped)", r.status === 200 && r.json.poll.options.length === 2);
r = await call("/api/feed", { body: { action: "vote", poll: pid, option: 1, device: DEV1 } });
ok("student votes", r.status === 200 && r.json.poll.counts[1] === 1 && r.json.mine === 1);
r = await call("/api/feed", { body: { action: "vote", poll: pid, option: 0, device: DEV1 } });
ok("same phone can't vote twice", r.json.poll.total === 1 && r.json.mine === 1);
r = await call("/api/feed", { body: { action: "vote", poll: pid, option: 0, device: DEV2 } });
r = await call("/api/feed", { method: "GET" });
ok("feed shows the poll with counts", r.json.polls[0].counts.join() === "1,1" && !("voters" in r.json.polls[0]));
// אירוע
r = await call("/api/staff", { body: { action: "eventCreate", title: "שבת אחים", date: "2099-01-05", time: "18:00", place: "בית המדרש", audience: "all" }, token: t3 });
ok("event created", r.status === 200);
r = await call("/api/feed", { method: "GET" });
ok("feed shows upcoming events", r.json.events.some(e => e.title === "שבת אחים" && e.place === "בית המדרש"));
// שאלה אנונימית → תשובה
r = await call("/api/feed", { body: { action: "ask", text: "מה בדיוק בחומר למבחן?", to: "אנגלית", cls: "y2" } });
ok("student asks anonymously", r.status === 200);
r = await call("/api/feed", { method: "GET" });
ok("unanswered question is NOT public", !r.json.answers.length);
r = await call("/api/staff", { body: { action: "qList" }, token: t3 });
const qid = r.json.questions[0].id;
ok("staff sees the question (no name)", r.json.questions[0].text === "מה בדיוק בחומר למבחן?" && !("name" in r.json.questions[0]));
await call("/api/staff", { body: { action: "qAnswer", id: qid, answer: "יחידות 3–4." }, token: t3 });
r = await call("/api/feed", { method: "GET" });
ok("answer published to the class", r.json.answers[0].a === "יחידות 3–4." && r.json.answers[0].cls === "y2");
// יום הולדת
const md = new Date(Date.now() + 3 * 3600e3).toISOString().slice(5, 10);
r = await call("/api/feed", { body: { action: "birthday", device: DEV1, name: "יוסי כהן", cls: "y2", md } });
r = await call("/api/feed", { method: "GET" });
ok("birthday today shows (opt-in)", r.json.birthdays.some(x => x.name === "יוסי כהן" && x.inDays === 0));
await call("/api/feed", { body: { action: "birthday", device: DEV1, remove: true } });
r = await call("/api/feed", { method: "GET" });
ok("…and disappears when removed", !r.json.birthdays.length);
// סטטיסטיקה
await call("/api/feed", { body: { action: "ping", device: DEV1, cls: "y1", risk: ["אנגלית"], warn: ["גמרא"], mashov: true } });
await call("/api/feed", { body: { action: "ping", device: DEV2, cls: "y1", risk: ["אנגלית"] } });
r = await call("/api/staff", { body: { action: "stats" }, token: t3 });
ok("principal stats: active + at-risk counts, no names", r.json.classes.y1.active === 2 && r.json.classes.y1.risk["אנגלית"] === 2 && r.json.classes.y1.mashov === 1);
r = await call("/api/staff", { body: { action: "stats" }, token: eTok });
ok("teachers can't see stats", r.status === 403);
// שחרור
r = await call("/api/feed", { body: { action: "release", name: "יוסי כהן", cls: "y2", reason: "רופא שיניים", from: "11:00", parent: "אבא" } });
r = await call("/api/staff", { body: { action: "releasesList" }, token: eTok });
ok("signed release shows for staff", r.json.releases.some(x => x.name === "יוסי כהן" && x.reason === "רופא שיניים"));

// ---- אבטחה (מעבר יסודי 25.10) ----
// אי אפשר לנחש קודים של אחרים דרך "קוד תפוס": כל בדיקה נספרת, ואחרי 20 – נעילה
{
  let locked = false;
  let tok = eTok;
  for (let i = 0; i < 25; i++) { const x = await call("/api/staff", { body: { action: "updateMe", code: "guess" + String(i).padStart(4, "0") }, token: tok, ip: "66.0.0.1" }); if (x.json.token) tok = x.json.token; if (x.status === 429) { locked = true; break; } }
  ok("guessing codes via 'code taken' gets locked out", locked);
}
// 60 ניסיונות כניסה במקביל מאותה כתובת – הנעילה תופסת
{
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => call("/api/staff", { body: { action: "login", code: "WRONG" + i }, ip: "77.0.0.1" })));
  ok("parallel wrong logins are locked out too", rs.filter(x => x.status === 429).length >= 15, rs.map(x => x.status).join(","));
}
r = await call("/api/staff", { body: { action: "login", code: "x".repeat(500) }, ip: "78.0.0.1" });
ok("absurdly long code rejected fast", r.status === 401);
// שחרור עם תאריך לא תקין
r = await call("/api/feed", { body: { action: "release", name: "x", cls: "y1", date: "__proto__" } });
ok("release with a fake date is refused", r.status === 400);
// אירוע: תאריך שלא קיים
r = await call("/api/staff", { body: { action: "eventCreate", title: "x", date: "2099-99-99" }, token: t3 });
ok("event with an impossible date is refused", r.status === 400);
// בפיד אין מזהים פנימיים של אירועים
await call("/api/staff", { body: { action: "eventCreate", title: "בדיקה", date: "2099-02-02" }, token: t3 });
r = await call("/api/feed", { method: "GET" });
ok("public events don't leak author ids", r.json.events.every(e => !("authorId" in e) && !("createdAt" in e)));
// יום הולדת – המנהל יכול להסיר
await call("/api/feed", { body: { action: "birthday", device: "device-cccc-3333", name: "שם לא מתאים", cls: "y1", md: "01-01" } });
r = await call("/api/staff", { body: { action: "bdList" }, token: t3 });
const bk = r.json.birthdays.find(x => x.name === "שם לא מתאים");
await call("/api/staff", { body: { action: "bdDelete", key: bk.key }, token: t3 });
r = await call("/api/staff", { body: { action: "bdList" }, token: t3 });
ok("principal can remove a birthday entry", !r.json.birthdays.some(x => x.name === "שם לא מתאים"));
r = await call("/api/staff", { body: { action: "addUser", name: "מורה לבדיקה" }, token: t3 });
r = await call("/api/staff", { body: { action: "login", code: r.json.code }, ip: "79.0.0.1" });
r = await call("/api/staff", { body: { action: "bdList" }, token: r.json.token });
ok("teachers can't list birthdays", r.status === 403);
// ספר טלפונים: שמות שמורים
r = await call("/api/contacts", { body: { action: "set", name: "__proto__", phone: "0501234567" }, token: t3 });
ok("reserved names refused in the phone book", r.status === 400);
// סטטיסטיקה: מקצוע בשם "constructor" לא שובר את הספירה
await call("/api/feed", { body: { action: "ping", device: "device-dddd-4444", cls: "y2", risk: ["constructor", "אנגלית"] } });
r = await call("/api/staff", { body: { action: "stats" }, token: t3 });
ok("stats ignore prototype-named subjects", r.json.classes.y2 && !Object.hasOwn(r.json.classes.y2.risk, "constructor") && r.json.classes.y2.risk["אנגלית"] >= 1);
// login/me מחזירים את יכולות השרת
r = await call("/api/staff", { body: { action: "me" }, token: t3 });
ok("server tells the staff page what it supports", r.json.caps && r.json.caps.feed === true);
// שאלה שהוסתרה בטעות – אפשר להחזיר
r = await call("/api/feed", { body: { action: "ask", text: "שאלה שהוסתרה בטעות", to: "כללי", cls: "y1" } });
r = await call("/api/staff", { body: { action: "qList" }, token: t3 });
const hq = r.json.questions.find(q => q.text === "שאלה שהוסתרה בטעות");
await call("/api/staff", { body: { action: "qHide", id: hq.id }, token: t3 });
await call("/api/staff", { body: { action: "qRestore", id: hq.id }, token: t3 });
r = await call("/api/staff", { body: { action: "qList" }, token: t3 });
ok("hidden question can be restored", r.json.questions.find(q => q.id === hq.id).status === "new");
