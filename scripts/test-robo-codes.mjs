// בדיקות: קודים לפרסים (כל ילד פעם אחת, הגבלה לקוד), הטלפון של מנהל המערכת (ברגים/סקינים), ותזכורת לפני שהרצף נשבר.
//   node scripts/test-robo-codes.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore(); mod.__setRoboReset(0);
const crypto = await import("node:crypto");
const handler = mod.default, ORIGIN = "https://eliyaamir5-glitch.github.io";
const ok = (name, c, x = "") => { console.log(c ? "✅" : "❌", name, x); if (!c) process.exitCode = 1; };
let ipN = 0;
async function call(path, body, token, method = "POST") {
  const headers = { "Content-Type": "application/json", origin: ORIGIN }; if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip: "9.9." + (Math.floor(++ipN / 200)) + "." + (ipN % 200) });
  return { status: res.status, json: await res.json() };
}
const feed = b => call("/api/feed", b);
const dev = i => `device-code-${String(i).padStart(4, "0")}`;
for (let i = 1; i <= 5; i++) await feed({ action: "hello", device: dev(i), name: "ילד " + i, cls: "y1", ver: "x" });
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
const tok = (await call("/api/owner", { action: "login", code: "OWNERTEST1234567" })).json.token;

// ---- קודים ----
let r = await call("/api/owner", { action: "codeList" }, tok);
ok("ready-made codes are created on first open (32)", r.json.ok && r.json.list.length === 32, r.json.list && r.json.list.length);
const fs = await import("node:fs"); const src = fs.readFileSync(new URL("../netlify/functions/staff.mjs", import.meta.url), "utf8");
ok("codes are random (not written in the source code)", r.json.list.every(x => !src.includes(x.raw)));
const mega = r.json.list.find(x => x.prize.t === "box" && x.prize.box === "mega");
ok("mega code limited to 10", mega && mega.max === 10);
r = await call("/api/owner", { action: "codeCreate", prize: { t: "box", box: "big" }, max: 2, code: "chag-sameach" }, tok);
ok("owner creates a custom code", r.json.ok && r.json.codes[0] === "CHAG-SAMEACH");
r = await feed({ action: "robo", op: "code", code: "chag sameach", device: dev(1) });
ok("kid redeems (any spacing / lowercase)", r.json.ok && r.json.prize.box === "big");
r = await feed({ action: "robo", op: "code", code: "CHAG-SAMEACH", device: dev(1) });
ok("same kid can't redeem twice", r.json.error === "used");
r = await feed({ action: "robo", op: "code", code: "CHAG-SAMEACH", device: dev(2) });
ok("another kid can", r.json.ok);
r = await feed({ action: "robo", op: "code", code: "CHAG-SAMEACH", device: dev(3) });
ok("limit reached (2) → 'full'", r.json.error === "full");
r = await feed({ action: "robo", op: "code", code: "NOPE-NOPE", device: dev(3) });
ok("wrong code", r.json.error === "bad_code");
r = await feed({ action: "robo", op: "code", code: mega.raw, device: "device-code-9999" });
ok("unregistered device can't redeem", r.json.error === "not_registered");
await call("/api/owner", { action: "codeSet", code: mega.raw, on: false }, tok);
r = await feed({ action: "robo", op: "code", code: mega.raw, device: dev(4) });
ok("turned-off code doesn't work", r.json.error === "off");
r = await call("/api/owner", { action: "codeCreate", prize: { t: "item", id: "skin:gold" }, count: 1 }, tok);
ok("can't make a code for the gold suit (limited to 3)", !r.json.ok);
r = await call("/api/owner", { action: "codeCreate", prize: { t: "bolts", n: 300 }, count: 5, pre: "WOW" }, tok);
ok("bulk: 5 new codes", r.json.ok && r.json.codes.length === 5 && r.json.codes.every(c => c.startsWith("WOW")));
r = await call("/api/owner", { action: "codeList" }, tok);
ok("owner sees how many used each code", r.json.list.find(x => x.raw === "CHAGSAMEACH").used === 2);
ok("no kid names stored with codes", !raw.get("roboCodes").includes("ילד"));
r = await call("/api/owner", { action: "codeList" }, "bad");
ok("not the owner: refused", r.status === 401);

// ---- הטלפון של מנהל המערכת ----
r = await feed({ action: "robo", op: "me", device: dev(5) });
ok("regular phone: not owner", r.json.owner === false);
const lk = (await call("/api/owner", { action: "ownLink" }, tok)).json.token;
r = await feed({ action: "robo", op: "link", token: "deadbeef", device: dev(5) });
ok("wrong link code fails", !r.json.ok);
r = await feed({ action: "robo", op: "link", token: lk, device: dev(5) });
ok("first phone with the link → owner", r.json.ok && r.json.owner);
r = await feed({ action: "robo", op: "link", token: lk, device: dev(4) });
ok("link works only once (a friend can't take it)", !r.json.ok);
await call("/api/owner", { action: "ownPowers", inf: true, all: true }, tok);
r = await feed({ action: "robo", op: "me", device: dev(5) });
ok("owner phone gets ∞ bolts + all skins", r.json.owner && r.json.inf && r.json.all);
r = await feed({ action: "robo", op: "me", device: dev(4) });
ok("other phones don't", r.json.owner === false && !r.json.inf);
// 👑 מנהל המערכת מוריד את עצמו מטבלת השיאים (ורק הוא)
await feed({ action: "robo", op: "score", g: "run", v: 777, device: dev(5) }); await feed({ action: "robo", op: "score", g: "run", v: 555, device: dev(4) });
r = await feed({ action: "robo", op: "lbMe", device: dev(4) }); ok("lbMe: other phones are refused", !r.json.ok);
r = await feed({ action: "robo", op: "lbMe", device: dev(5) }); ok("lbMe: owner phone removed itself", r.json.ok);
r = await feed({ action: "robo", op: "scores", g: "run", device: dev(4) }); ok("lbMe: owner gone from weekly + all-time, others stay", r.json.ok && !r.json.list.some(x => x.v === 777) && !(r.json.all || []).some(x => x.v === 777) && r.json.list.some(x => x.v === 555), JSON.stringify(r.json.list));
await call("/api/owner", { action: "ownPowers", inf: false }, tok);
r = await feed({ action: "robo", op: "me", device: dev(5) });
ok("owner can turn ∞ bolts off", r.json.owner && !r.json.inf && r.json.all);

// ---- תזכורת לפני שהרצף נשבר ----
let sent = []; mod.__setPushSender(async (sub, payload) => { sent.push({ ep: sub.endpoint, ...JSON.parse(payload) }); });
const b64 = n => crypto.randomBytes(n).toString("base64url");
const SUB = n => ({ endpoint: `https://fcm.googleapis.com/fcm/send/st${n}-${b64(8)}`, keys: { p256dh: b64(65), auth: b64(16) } });
for (let i = 1; i <= 4; i++) await call("/api/push", { action: "sub", device: dev(i), sub: SUB(i), cls: "y1", prefs: { tef: true, urgent: true, holiday: true, streak: i !== 4 } });
const at = s => Date.parse(s);
// ביום שני: 1 נכנס היום, 2 נכנס אתמול (רצף 5), 3 נכנס אתמול (רצף 1), 4 כיבה תזכורות
const S = raw; const put = o => S.set("roboDay", JSON.stringify(o));
r = await feed({ action: "robo", op: "day", device: dev(2), n: 5 });
ok("phone reports its streak (no name)", r.json.ok && !raw.get("roboDay").includes("ילד"));
const pushKeys = Object.keys(JSON.parse(raw.get("push")));
// בונים מצב: לכל מכשיר רשומה לפי מפתח המכשיר (אותו מפתח כמו בהתראות)
const day = {}; const [p1, p2, p3, p4] = pushKeys;
day[p1] = { d: "2026-11-09", n: 9 }; day[p2] = { d: "2026-11-08", n: 5 }; day[p3] = { d: "2026-11-08", n: 1 }; day[p4] = { d: "2026-11-08", n: 7 };
put(day);
r = await mod.streakTick(at("2026-11-09T19:00:00+02:00")); ok("Monday 19:00: too early", r.skipped === "time");
r = await mod.streakTick(at("2026-11-09T20:05:00+02:00"));
ok("Monday 20:00: reminder only to the kid with a real streak who didn't come in (and didn't turn it off)", r.sent === 1 && sent.length === 1 && /הרצף/.test(sent[0].title), JSON.stringify(r));
sent = []; r = await mod.streakTick(at("2026-11-09T21:00:00+02:00")); ok("only once a day", r.skipped === "done" && !sent.length);
day[p2] = { d: "2026-11-12", n: 6 }; put(day);
r = await mod.streakTick(at("2026-11-13T20:05:00+02:00")); ok("Friday: not at 20:00 (Shabbat)", r.skipped === "time");
r = await mod.streakTick(at("2026-11-13T12:10:00+02:00")); ok("Friday: at 12:00 instead", r.sent === 1);
r = await mod.streakTick(at("2026-11-14T20:05:00+02:00")); ok("Shabbat: nothing", r.skipped === "rest");
// ---- 🎁 קוד-חבילה (ברגים + תיבות + אביזרים) ----
r = await call("/api/owner", { action: "codeCreate", prize: { t: "multi", bolts: 750, boxes: { big: 2, giant: 1 }, items: ["hat:crown", "skin:legend"] }, max: 3, code: "PACK-TEST" }, tok);
ok("multi-prize code created (capped ultra filtered out)", r.json.ok, JSON.stringify(r.json));
r = await feed({ action: "robo", op: "code", code: "PACKTEST", device: dev(2) });
ok("redeem a multi code", r.json.ok && r.json.prize.t === "multi" && r.json.prize.bolts === 750 && r.json.prize.boxes.big === 2 && r.json.prize.boxes.giant === 1 && r.json.prize.items.length === 1, JSON.stringify(r.json));
// ---- 🤖 הרובוטים של התלמידים (דף הניהול) ----
await feed({ action: "robo", op: "pub", rn: "רובי", eq: { skin: "skin:classic" }, st: { have: 3 }, b: 1234, own: ["skin:classic", "hat:crown", "held:pizza"], bx: ["big"], device: dev(2) });
r = await call("/api/owner", { action: "roboKids" }, tok); const kid = (r.json.list || []).find(x => x.bolts === 1234);
ok("admin sees everyone's bolts and items", r.json.ok && kid && kid.own.includes("hat:crown") && kid.boxes.length === 1, JSON.stringify(r.json.list && r.json.list.slice(0, 2)));
r = await call("/api/owner", { action: "roboAdm", pid: kid.pid, setBolts: 0, take: ["hat:crown"], give: ["held:burger"], boxes: { mega: 2 } }, tok); ok("admin action accepted", r.json.ok);
r = await feed({ action: "robo", op: "inbox", device: dev(2) }); const adm = (r.json.inbox || []).find(x => x.t === "adm");
ok("the phone gets the admin command", adm && adm.set === 0 && adm.take[0] === "hat:crown" && adm.give[0] === "held:burger" && adm.boxes.mega === 2, JSON.stringify(adm));
r = await call("/api/owner", { action: "roboKids" }, tok); ok("admin list updates right away", r.json.list.find(x => x.pid === kid.pid).bolts === 0 && !r.json.list.find(x => x.pid === kid.pid).own.includes("hat:crown"));
r = await call("/api/owner", { action: "roboAdm", pid: kid.pid, ban: true }, tok); ok("ban", r.json.ok);
r = await feed({ action: "robo", op: "class", device: dev(2) }); ok("banned robot: social ops refused", r.json.error === "banned");
r = await feed({ action: "robo", op: "me", device: dev(2) }); ok("banned robot: phone learns it via 'me'", r.json.banned === true);
r = await feed({ action: "robo", op: "class", device: dev(4) }); ok("other kids not affected", r.json.ok);
await call("/api/owner", { action: "roboAdm", pid: kid.pid, ban: false }, tok); r = await feed({ action: "robo", op: "me", device: dev(2) }); ok("unban", r.json.banned === false);
r = await feed({ action: "robo", op: "roboAdm" , device: dev(2) }); ok("kids can't call admin ops", !r.json.ok);
