// בדיקות: 🕵️ השוק של הרובוטים – מכירה במחיר קבוע (בטווח של הדרגה), עד 5 בבת אחת, קנייה, ביטול, הודעה למוכר, רק בתוך השכבה.
//   node scripts/test-robo-market.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const RC = require("../robo-core.js");
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore(); mod.__setRoboReset(0);
const handler = mod.default, ORIGIN = "https://eliyaamir5-glitch.github.io";
const ok = (name, c, x = "") => { console.log(c ? "✅" : "❌", name, x); if (!c) process.exitCode = 1; };
let ipN = 0;
async function feed(b) {
  const res = await handler(new Request("http://localhost/api/feed", { method: "POST", headers: { "Content-Type": "application/json", origin: ORIGIN }, body: JSON.stringify(b) }), { ip: "8.8." + Math.floor(++ipN / 200) + "." + (ipN % 200) });
  return res.json();
}
const dev = i => `device-mrkt-${String(i).padStart(4, "0")}`;
for (const [i, n, c] of [[1, "דני כהן", "y1"], [2, "יוסי לוי", "y2"], [3, "אבי בר", "ya1"]]) await feed({ action: "hello", device: dev(i), name: n, cls: c, ver: "x" });
const R = (i, b) => feed({ action: "robo", device: dev(i), ...b });

{ const src = (await import("node:fs")).readFileSync(new URL("../netlify/functions/staff.mjs", import.meta.url), "utf8"); const pr = JSON.parse(src.match(/const MARKET_PRICE = (\{[^;]*\}), MARKET_MAX/)[1].replace(/(\w):/g, '"$1":')); ok("server price ranges match the app", JSON.stringify(pr) === JSON.stringify(RC.PRICE)); }

let r = await R(1, { op: "marketSell", item: "hat:crown", r: "m", price: 100 }); ok("price below the rarity range: refused", r.error === "bad_request");
r = await R(1, { op: "marketSell", item: "hat:crown", r: "m", price: 2001 }); ok("price above the range: refused", r.error === "bad_request");
r = await R(1, { op: "marketSell", item: "<script>", r: "c", price: 20 }); ok("bad item: refused", r.error === "bad_request");
r = await R(1, { op: "marketSell", item: "hat:crown", r: "m", price: 900 }); ok("list a mythic hat for 900", r.ok && /^[0-9a-f]{10}$/.test(r.id)); const id1 = r.id;
for (let i = 0; i < 4; i++) await R(1, { op: "marketSell", item: "held:pizza", r: "c", price: 20 + i });
r = await R(1, { op: "marketSell", item: "held:burger", r: "c", price: 30 }); ok("max 5 listings at once", r.error === "max");
r = await R(2, { op: "marketList" }); ok("a kid in the same grade sees 5 listings with the seller's name", r.ok && r.list.length === 5 && r.list.every(x => x.kid === "דני כהן") && r.list.some(x => x.id === id1 && x.price === 900));
ok("no device ids in the listing", !JSON.stringify(r).includes("device-mrkt"));
r = await R(3, { op: "marketList" }); ok("other grade doesn't see them", r.ok && r.list.length === 0);
r = await R(3, { op: "marketBuy", id: id1 }); ok("other grade can't buy", !r.ok);
r = await R(1, { op: "marketBuy", id: id1 }); ok("can't buy your own", r.error === "mine");
r = await R(2, { op: "marketBuy", id: id1 }); ok("buy it", r.ok && r.item === "hat:crown" && r.price === 900);
r = await R(2, { op: "marketBuy", id: id1 }); ok("can't buy twice", r.error === "gone");
r = await R(1, { op: "inbox" }); ok("seller gets a 'sold' message with the price", r.inbox.some(x => x.t === "sold" && x.item === "hat:crown" && x.price === 900 && x.from === "יוסי לוי"));
r = await R(1, { op: "marketList" }); ok("seller sees it as sold in 'mine'", r.mine.some(x => x.id === id1 && x.st === "sold") && r.mine.filter(x => x.st === "open").length === 4);
r = await R(1, { op: "marketSell", item: "held:burger", r: "c", price: 30 }); ok("after a sale there's room for a new listing", r.ok);
const id2 = r.id;
r = await R(2, { op: "marketCancel", id: id2 }); ok("can't cancel someone else's listing", !r.ok);
r = await R(1, { op: "marketCancel", id: id2 }); ok("cancel my listing → item comes back", r.ok && r.item === "held:burger");
r = await R(2, { op: "marketBuy", id: id2 }); ok("cancelled listing can't be bought", r.error === "gone");
r = await feed({ action: "robo", device: "device-mrkt-9999", op: "marketList" }); ok("unregistered device refused", r.error === "not_registered");
// ---- 🏆 טבלת שיאים שבועית ----
r = await R(1, { op: "score", g: "bolts", v: 320 }); ok("post a weekly score", r.ok);
await R(1, { op: "score", g: "bolts", v: 100 }); // נמוך יותר – לא מחליף
await R(2, { op: "score", g: "bolts", v: 450 });
await R(3, { op: "score", g: "bolts", v: 999 });
r = await R(1, { op: "scores", g: "bolts" }); ok("leaderboard: my grade only, best first, keeps my best", r.ok && r.list.length === 2 && r.list[0].kid === "יוסי לוי" && r.list[0].v === 450 && r.list[1].me && r.list[1].v === 320 && r.me.rank === 2, JSON.stringify(r.list));
ok("leaderboard: no device ids", !JSON.stringify(r).includes("device-mrkt"));
r = await R(1, { op: "score", g: "nope", v: 5 }); ok("bad game refused", !r.ok);
r = await R(1, { op: "scores", g: "run" }); ok("empty run board", r.ok && r.list.length === 0 && Array.isArray(r.last));
// ---- 🤝 מטרה משותפת לשכבה + 🏅 תארים ----
r = await R(1, { op: "goal" }); ok("grade goal: starts at 0 with a target", r.ok && r.n === 0 && r.target >= 3000 && !r.done);
await R(1, { op: "goalAdd", n: 1200 }); await R(2, { op: "goalAdd", n: 1200 }); await R(3, { op: "goalAdd", n: 1200 });
r = await R(1, { op: "goal" }); ok("grade goal: counts only my grade, tracks my share", r.n === 2400 && r.mine === 1200 && r.helpers === 2, JSON.stringify(r));
r = await R(1, { op: "goalAdd", n: 5000 }); ok("grade goal: too big a chunk refused", !r.ok);
await R(1, { op: "goalAdd", n: 700 }); r = await R(2, { op: "goal" }); ok("grade goal: done when reaching the target", r.done === (r.n >= r.target) && r.n === 3100);
await R(1, { op: "pub", rn: "x", eq: {}, st: {}, title: "🏃 רץ למרחקים" });
r = await R(2, { op: "scores", g: "bolts" }); ok("leaderboard shows the kid's title", r.list.some(x => x.kid === "דני כהן" && x.title === "🏃 רץ למרחקים"));
r = await R(2, { op: "scores", g: "bolts", full: 1 }); ok("full leaderboard for the in-game chase", r.ok && Array.isArray(r.list) && r.list.length === 2);
