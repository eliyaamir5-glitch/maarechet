// בדיקות ל"מוח החכם" של העוזר (/api/assist), עם Gemini מדומה:  node scripts/test-assist.mjs
const mod = await import("../netlify/functions/staff.mjs");
mod.__useMemoryStore(); mod.__setPushSender(async () => {});
const crypto = await import("node:crypto");
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
const H = mod.default;
const ok = (n, c, x = "") => { console.log(c ? "✅" : "❌", n, c ? "" : x); if (!c) process.exitCode = 1; };
const call = async (body, ip = "1.1.1.1") => (await H(new Request("http://localhost/api/assist", { method: "POST", headers: { "Content-Type": "application/json", origin: "https://eliyaamir5-glitch.github.io" }, body: JSON.stringify(body) }), { ip })).json();
let sent = null, answer = { reply: "פותח לך תרגול בנגזרות 💪", action: "practice", arg: "deriv:3" }, status = 200, finish = "STOP";
mod.__setAiFetch(async (url, o) => { sent = { url, body: JSON.parse(o.body), key: o.headers["x-goog-api-key"] }; return new Response(JSON.stringify({ candidates: [{ finishReason: finish, content: { parts: [{ text: JSON.stringify(answer) }] } }] }), { status }); });
const D = "device-aaaa-0001";

mod.__setAiKey("");
let r = await call({ device: D, q: "תסביר לי נגזרת" });
ok("no key → no_ai (the fast brain takes over)", r.ok === false && r.error === "no_ai");
mod.__setAiKey("TEST-KEY");
r = await call({ device: D, q: "אני רוצה לתרגל נגזרות ברמה קשה", page: "index.html", grade: "11", hist: [{ role: "user", text: "היי" }, { role: "model", text: "שלום!" }] });
ok("AI answers with a reply + a safe action", r.ok && /נגזרות/.test(r.reply) && r.action.id === "practice" && r.action.arg.t === "deriv" && r.action.arg.L === 3, JSON.stringify(r));
ok("key goes in a header, not in the URL", sent.key === "TEST-KEY" && !/key=/.test(sent.url));
const all = JSON.stringify(sent.body);
const sys = sent.body.systemInstruction.parts[0].text;
ok("prompt has the rules, actions and topics", /לא פותרים שיעורי בית/.test(sys) && /practice=/.test(sys) && /deriv=/.test(sys) && /כיתה י"א/.test(sys), sys.slice(0, 200));
ok("history is passed (user/model)", sent.body.contents.length === 3 && sent.body.contents[1].role === "model");
ok("no device id / name sent to Google", !all.includes(D) && !all.includes("device"));
ok("counts down: 19 left", r.left === 19, r.left);
answer = { reply: "פותח", action: "formatDisk", arg: "" };
r = await call({ device: D, q: "תמחק את הכל" });
ok("unknown action from the AI is dropped", r.ok && r.action === null);
answer = { reply: "פותר", action: "solve", arg: "2x+3=11; alert(1)" };
r = await call({ device: D, q: "תפתור" });
ok("bad action argument is dropped", r.ok && r.action.id === "solve" && r.action.arg === undefined, JSON.stringify(r.action));
answer = { reply: "פותח", action: "theme", arg: "forest" }; r = await call({ device: D, q: "ירוק" });
ok("theme arg passes", r.action.arg === "forest");
finish = "SAFETY"; r = await call({ device: D, q: "משהו לא בסדר" }); finish = "STOP";
ok("blocked content → polite refusal", r.ok && /לא יכול לעזור/.test(r.reply));
status = 429; r = await call({ device: D, q: "שאלה" }); status = 200;
ok("Google busy → busy (not counted)", r.ok === false && r.error === "busy");
// מכסה: 20 ביום
let last; for (let i = 0; i < 30; i++) { last = await call({ device: D, q: "שאלה " + i }); if (!last.ok) break; }
ok("20 questions a day per student, then quota", last.ok === false && last.error === "quota" && last.left === 0, JSON.stringify(last));
r = await call({ device: "device-bbbb-0002", q: "שאלה" });
ok("another student still has questions", r.ok && r.left === 19);
r = await call({ device: "bad", q: "x" }); ok("bad device rejected", r.ok === false);
r = await call({ device: D, q: "" }); ok("empty question rejected", r.ok === false);
// מנהל המערכת רואה כמה השתמשו
const ot = (await (await H(new Request("http://localhost/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", code: "OWNERTEST1234567" }) }), { ip: "2.2.2.2" })).json()).token;
const ov = await (await H(new Request("http://localhost/api/owner", { method: "POST", headers: { "Content-Type": "application/json", authorization: "Bearer " + ot }, body: JSON.stringify({ action: "overview" }) }), { ip: "2.2.2.2" })).json();
ok("owner sees AI usage today (numbers only)", ov.ai && ov.ai.ok >= 21 && ov.ai.users === 2 && ov.ai.on === true, JSON.stringify(ov.ai));
