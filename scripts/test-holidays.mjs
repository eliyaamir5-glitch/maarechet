// בדיקות ל"מצב חג": לוח החגים (holidays-core.js) וברכות החג לטלפונים בשרת (שולח מדומה, אחסון בזיכרון).
//   node scripts/test-holidays.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const H = require("../holidays-core.js");
const crypto = await import("node:crypto");
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };
const at = s => Date.parse(s);
const find = (key, from) => H.list(from, 420).find(h => h.key === key);

// ---- תאריכים ידועים (לוח רשמי) ----
const KNOWN = [["hanukkah", "2026-11-02", "2026-12-05", "2026-12-12"], ["tubishvat", "2026-11-02", "2027-01-23"], ["purim", "2026-11-02", "2027-03-23"],
  ["pesach", "2026-11-02", "2027-04-22", "2027-04-28"], ["shoah", "2026-11-02", "2027-05-04"], ["zikaron", "2026-11-02", "2027-05-11"], ["atzmaut", "2026-11-02", "2027-05-12"],
  ["lagbaomer", "2026-11-02", "2027-05-25"], ["shavuot", "2026-11-02", "2027-06-11"], ["tishabav", "2026-11-02", "2027-08-12"],
  ["rosh", "2027-06-01", "2027-10-02"], ["kippur", "2027-06-01", "2027-10-11"], ["sukkot", "2027-06-01", "2027-10-16"], ["simchat", "2027-06-01", "2027-10-23"],
  ["atzmaut", "2027-11-01", "2028-05-02"], ["zikaron", "2027-11-01", "2028-05-01"], ["purim", "2027-11-01", "2028-03-12"], ["hanukkah", "2027-06-01", "2027-12-25", "2028-01-01"]];
for (const [k, from, start, end] of KNOWN) { const h = find(k, from); ok(`${k} ${start.slice(0, 4)}: ${start}`, h && h.start === start && (!end || h.end === end), h ? h.start + "→" + h.end : "missing"); }

// ---- 10 שנים: ברכה אף פעם לא בשבת, לא ביום טוב, ולא ביום זיכרון; ימי זיכרון בלי ברכה ובלי ספירה לאחור ----
const all = H.list("2026-09-01", 3700);
const yomTov = new Set(all.flatMap(h => h.key === "rosh" ? [h.start, h.end] : h.key === "pesach" ? [h.start, h.end] : ["kippur", "sukkot", "simchat", "shavuot"].includes(h.key) ? [h.start] : []));
const sadDays = new Set(all.filter(h => h.type === "sad").map(h => h.start));
let bad = [];
for (const h of all) { const s = H.sendAt(h); if (!s) continue; if (H.dow(s.day) === 6 || yomTov.has(s.day) || sadDays.has(s.day)) bad.push(h.key + " " + s.day); }
ok("10 years: no greeting on Shabbat / Yom Tov / memorial day", !bad.length && all.length > 140, bad.join(", ") + ` (${all.length} holidays)`);
ok("memorial days: no greeting", all.filter(h => h.type === "sad").every(h => !H.sendAt(h)));
ok("Yom HaZikaron is always the day before Yom HaAtzmaut", all.filter(h => h.key === "zikaron").every(z => all.some(a => a.key === "atzmaut" && a.start === H.add(z.start, 1))));
ok("Yom HaAtzmaut never on Friday / Shabbat / Monday (moved by law)", all.filter(h => h.key === "atzmaut").every(h => ![5, 6, 1].includes(H.dow(h.start))));
ok("Yom HaShoah never on Friday/Sunday", all.filter(h => h.key === "shoah").every(h => ![5, 0].includes(H.dow(h.start))));

// ---- מה פעיל עכשיו ----
const act = s => { const a = H.active(at(s)); return a ? a.key + (a.eve ? ":eve" : ":" + a.day) : "-"; };
ok("erev Hanukkah noon: not yet", act("2026-12-04T12:00:00+02:00") === "-");
ok("erev Hanukkah evening: Hanukkah (eve)", act("2026-12-04T19:00:00+02:00") === "hanukkah:eve");
ok("Hanukkah day 3", act("2026-12-07T10:00:00+02:00") === "hanukkah:3");
ok("candles: night 1 / day 1 noon 1 / day 1 evening 2 / day 8 → 8", H.candles(at("2026-12-04T19:00:00+02:00")) === 1 && H.candles(at("2026-12-05T12:00:00+02:00")) === 1 && H.candles(at("2026-12-05T18:00:00+02:00")) === 2 && H.candles(at("2026-12-12T19:00:00+02:00")) === 8);
ok("after Hanukkah: nothing", act("2026-12-13T10:00:00+02:00") === "-");
ok("Yom HaZikaron 19:30 is still memorial", act("2027-05-11T19:30:00+03:00") === "zikaron:1");
ok("Yom HaZikaron 20:30 → Yom HaAtzmaut", act("2027-05-11T20:30:00+03:00") === "atzmaut:eve");
ok("Pesach day 4", act("2027-04-25T11:00:00+03:00") === "pesach:4");
const nx = H.next(at("2026-11-25T10:00:00+02:00"));
ok("countdown: 10 days to Hanukkah", nx && nx.key === "hanukkah" && nx.inDays === 10);
ok("no countdown more than 14 days ahead", H.next(at("2026-11-02T10:00:00+02:00")) === null);
ok("no countdown to a memorial day", H.next(at("2027-04-30T10:00:00+03:00")).key !== "shoah" && H.next(at("2027-05-05T10:00:00+03:00")).key === "atzmaut");

// ---- שרת: ברכות לטלפונים ----
const mod = await import("../netlify/functions/staff.mjs");
mod.__useMemoryStore();
const handler = mod.default, ORIGIN = "https://eliyaamir5-glitch.github.io";
let sent = [];
mod.__setPushSender(async (sub, payload) => { sent.push({ endpoint: sub.endpoint, ...JSON.parse(payload) }); });
async function call(path, body, token, method = "POST") {
  const headers = { "Content-Type": "application/json", origin: ORIGIN }; if (token) headers.authorization = "Bearer " + token;
  const res = await handler(new Request("http://localhost" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip: "1.1.1.9" });
  return { status: res.status, json: await res.json() };
}
const b64 = n => crypto.randomBytes(n).toString("base64url");
const SUB = n => ({ endpoint: `https://fcm.googleapis.com/fcm/send/hol${n}-${b64(8)}`, keys: { p256dh: b64(65), auth: b64(16) } });
await call("/api/push", { action: "sub", device: "device-hhhh-0001", sub: SUB(1), cls: "y1" });
await call("/api/push", { action: "sub", device: "device-hhhh-0002", sub: SUB(2), cls: "ya1", prefs: { tef: true, urgent: true, holiday: false } });
await call("/api/push", { action: "sub", device: "device-hhhh-0003", sub: SUB(3), cls: "y2" });

let r = await mod.holidayTick(at("2026-12-04T11:00:00+02:00"));
ok("erev Hanukkah 11:00: not yet", r.skipped === "none" && sent.length === 0, JSON.stringify(r));
r = await mod.holidayTick(at("2026-12-04T12:00:00+02:00"));
ok("erev Hanukkah 12:00: greeting to 2 phones (one turned it off)", r.out && r.out[0].sent === 2 && sent.length === 2 && sent.every(x => /חנוכה שמח/.test(x.body) && /חנוכה/.test(x.title)), JSON.stringify(sent[0]));
sent = [];
r = await mod.holidayTick(at("2026-12-04T13:00:00+02:00"));
ok("next hour: not sent again", sent.length === 0 && r.out[0].skipped === "done");
r = await mod.holidayTick(at("2026-12-07T12:00:00+02:00"));
ok("middle of Hanukkah: nothing", sent.length === 0 && r.skipped === "none");
r = await mod.holidayTick(at("2027-05-11T12:00:00+03:00"));
ok("Yom HaZikaron noon: no greeting (Atzmaut greeting is the next morning)", sent.length === 0);
r = await mod.holidayTick(at("2027-05-12T09:00:00+03:00"));
ok("Yom HaAtzmaut 09:00: greeting", sent.length === 2 && /עצמאות/.test(sent[0].body));
sent = [];

// מנהל המערכת: נוסח משלו, כיבוי חג, כיבוי הכל
mod.__setOwner({ salt: "ab", hash: crypto.scryptSync("OWNERTEST1234567", "ab", 32).toString("hex") });
const tok = (await call("/api/owner", { action: "login", code: "OWNERTEST1234567" })).json.token;
r = await call("/api/owner", { action: "holGet" }, tok);
ok("owner sees the holiday list", r.status === 200 && r.json.list.length > 10 && r.json.push === true && r.json.list.some(h => h.key === "purim" && h.push && h.push.hour === 12));
r = await call("/api/owner", { action: "holSet", key: "purim", text: "פורים שמח מהמערכת! 🎭" }, tok);
ok("custom text saved", r.json.ok);
r = await call("/api/owner", { action: "holSet", key: "nope", off: true }, tok);
ok("unknown holiday refused", r.json.ok === false);
await mod.holidayTick(at("2027-03-22T12:30:00+02:00"));
ok("Purim greeting uses the owner's text", sent.length === 2 && sent[0].body === "פורים שמח מהמערכת! 🎭");
sent = [];
await call("/api/owner", { action: "holSet", key: "pesach", off: true }, tok);
await mod.holidayTick(at("2027-04-21T12:00:00+03:00"));
ok("Pesach turned off: no greeting", sent.length === 0);
r = await call("/api/feed", null, null, "GET");
ok("feed tells the phones which holiday is off", r.json.hol && r.json.hol.off === false && r.json.hol.offKeys.pesach === true);
await call("/api/owner", { action: "holSet", push: false }, tok);
await mod.holidayTick(at("2027-05-24T12:00:00+03:00"));
ok("greetings turned off: Lag BaOmer not sent", sent.length === 0);
await call("/api/owner", { action: "holSet", push: true }, tok);
await call("/api/owner", { action: "holSet", off: true }, tok);
r = await call("/api/feed", null, null, "GET");
ok("holiday mode off reaches the feed", r.json.hol.off === true);
r = await call("/api/owner", { action: "holSet", off: true }, "bad-token");
ok("not the owner: refused", r.status === 401);
r = await call("/api/owner", { action: "overview" }, tok);
ok("owner log records the changes", JSON.stringify(r.json).includes("נוסח הברכה עודכן"));
