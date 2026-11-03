// בדיקות: הרובוטים של השכבה – פרופיל, רשימת כיתה, לייקים, מתנות ברגים, תיבת הודעות, טרייד (כולל 3 שניות ביטול), קרב כיתות, הכרזת אולטרה.
//   node scripts/test-robo-social.mjs
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default, ORIGIN = "https://eliyaamir5-glitch.github.io";
const ok = (name, c, x = "") => { console.log(c ? "✅" : "❌", name, x); if (!c) process.exitCode = 1; };
let ipN = 0;
async function feed(b, method = "POST") {
  const res = await handler(new Request("http://localhost/api/feed", { method, headers: { "Content-Type": "application/json", origin: ORIGIN }, body: b ? JSON.stringify(b) : undefined }), { ip: "7.7." + Math.floor(++ipN / 200) + "." + (ipN % 200) });
  return (await res.json());
}
const dev = i => `device-soci-${String(i).padStart(4, "0")}`;
const KIDS = [[1, "דני כהן", "y1"], [2, "יוסי לוי", "y1"], [3, "רון גל", "y2"], [4, "אבי בר", "ya1"]];
for (const [i, n, c] of KIDS) await feed({ action: "hello", device: dev(i), name: n, cls: c, ver: "x" });
const R = (i, b) => feed({ action: "robo", device: dev(i), ...b });
const pub = i => R(i, { op: "pub", rn: "רעם ⚡", eq: { skin: "skin:space", hat: "hat:crown" }, st: { n: 5, best: 9, have: 30, all: 263, opened: 12 }, rare: ["skin:space"], ach: [{ e: "🔥", n: "רצף 7" }] });
const pids = {}; for (const [i] of KIDS) pids[i] = (await pub(i)).pid;
ok("publish robot → public id (not the device id)", /^[0-9a-f]{12}$/.test(pids[1]) && !raw.get("roboPub").includes("device-soci"));
let r = await R(1, { op: "class" });
ok("my class list: 2 robots with kid names + robot name + outfit", r.ok && r.list.length === 2 && r.list.some(x => x.kid === "יוסי לוי" && x.rn === "רעם ⚡" && x.eq.skin === "skin:space"));
r = await R(1, { op: "class", cls: "y2" });
ok("other class in my grade", r.ok && r.cls === "y2" && r.list.length === 1 && r.list[0].kid === "רון גל");
r = await R(1, { op: "class", cls: "ya1" });
ok("can't see another grade (falls back to my class)", r.cls === "y1");
await feed({ action: "robo", device: dev(2), op: "pub", rn: "x", eq: {}, st: {}, hide: true });
r = await R(1, { op: "class" });
ok("a kid who hides is not listed", r.list.length === 1 && r.list[0].me);
await pub(2);
// לייקים
r = await R(1, { op: "like", to: pids[2] }); ok("like a friend", r.ok && r.likes === 1);
r = await R(1, { op: "like", to: pids[2] }); ok("only one like a day per robot", r.error === "already");
r = await R(3, { op: "like", to: pids[2] }); ok("kid from the other class can like too", r.ok && r.likes === 2);
r = await R(4, { op: "like", to: pids[2] }); ok("other grade can't", !r.ok);
r = await R(1, { op: "like", to: pids[1] }); ok("can't like yourself", !r.ok);
ok("likes stored without who gave them (beyond today)", !JSON.stringify(JSON.parse(raw.get("roboLikes"))).includes(pids[1]));
// מתנות
r = await R(1, { op: "gift", to: pids[2], n: 30 }); ok("send 30 bolts", r.ok && r.left === 20);
r = await R(1, { op: "gift", to: pids[3], n: 30 }); ok("daily gift limit (50)", r.error === "limit" && r.left === 20);
r = await R(2, { op: "inbox" }); ok("friend's inbox: 2 likes + bolts from Dani", r.inbox.filter(x => x.t === "like").length === 2 && r.inbox.some(x => x.t === "bolts" && x.n === 30 && x.from === "דני כהן"));
r = await R(2, { op: "inbox" }); ok("inbox is emptied after reading", r.inbox.length === 0);
// טרייד
const t = await R(1, { op: "tradeNew", to: pids[3] }); ok("invite to trade", t.ok && t.status === "open" && t.them.kid === "רון גל");
r = await R(3, { op: "inbox" }); ok("friend gets the invite", r.inbox.some(x => x.t === "trade" && x.id === t.id));
await R(1, { op: "tradeSet", id: t.id, offer: { items: ["hat:crown"], boxes: ["mega"], bolts: 10 } });
await R(3, { op: "tradeSet", id: t.id, offer: { items: ["skin:dragon"] } });
r = await R(3, { op: "tradeGet", id: t.id }); ok("both see both offers", r.them.offer.items[0] === "hat:crown" && r.them.offer.boxes[0] === "mega" && r.me.offer.items[0] === "skin:dragon");
await R(1, { op: "tradeOk", id: t.id, ok: true });
await R(3, { op: "tradeSet", id: t.id, offer: { items: ["skin:dragon", "eyes:sun"] } });
r = await R(1, { op: "tradeGet", id: t.id }); ok("changing the offer cancels the 'yes' (no tricks)", !r.me.ok && r.status === "open");
await R(1, { op: "tradeOk", id: t.id, ok: true }); r = await R(3, { op: "tradeOk", id: t.id, ok: true });
ok("both said yes → locked (3 seconds)", r.status === "lock");
r = await R(3, { op: "tradeCancel", id: t.id }); ok("can cancel during the 3 seconds", r.status === "cancel");
const t2 = await R(1, { op: "tradeNew", to: pids[3] });
await R(1, { op: "tradeOk", id: t2.id, ok: true }); await R(3, { op: "tradeOk", id: t2.id, ok: true });
await new Promise(res => setTimeout(res, 3100));
r = await R(1, { op: "tradeCancel", id: t2.id }); ok("after 3 seconds it can't be cancelled", r.status === "done");
r = await R(1, { op: "tradeDone", id: t2.id }); ok("done is recorded", r.doneMe);
r = await R(2, { op: "tradeGet", id: t2.id }); ok("a third kid can't see the trade", !r.ok);
// קרב כיתות
await R(1, { op: "day", n: 5 }); await R(2, { op: "day", n: 3 }); await R(3, { op: "day", n: 1 });
r = await R(1, { op: "class" });
const pts = c => r.battle.now.find(x => x.cls === c).pts;
ok("class battle: daily visits + likes count for the class", pts("y1") === 4 && pts("y2") === 1, JSON.stringify(r.battle.now));
// הכרזת אולטרה
await feed({ action: "robo", op: "claim", item: "skin:cosmic", device: dev(3) });
r = await feed(null, "GET");
ok("ultra win is announced with name, class and how many left", r.roboNews && r.roboNews[0] && r.roboNews[0].kid === "רון גל" && r.roboNews[0].n === 1 && r.roboNews[0].cap === 2);
