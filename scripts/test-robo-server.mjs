// בדיקות לשרת של "הרובוט שלי": אביזרי אולטרה אגדי – כמות מוגבלת לכל הישיבה, בלי שמות.
//   node scripts/test-robo-server.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const RC = require("../robo-core.js");
const mod = await import("../netlify/functions/staff.mjs");
const raw = mod.__useMemoryStore();
const handler = mod.default, ORIGIN = "https://eliyaamir5-glitch.github.io";
const ok = (name, c, x = "") => { console.log(c ? "✅" : "❌", name, x); if (!c) process.exitCode = 1; };
async function call(body, method = "POST", ip = "2.2.2.2") {
  const res = await handler(new Request("http://localhost/api/feed", { method, headers: { "Content-Type": "application/json", origin: ORIGIN }, body: body ? JSON.stringify(body) : undefined }), { ip });
  return { status: res.status, json: await res.json() };
}
const dev = i => `device-robo-${String(i).padStart(4, "0")}`;
const hello = i => call({ action: "hello", device: dev(i), name: "תלמיד " + i, cls: "y1", ver: "x" }, "POST", "3.3.3." + i);
for (let i = 1; i <= 6; i++) await hello(i);
let r = await call({ action: "robo", op: "claim", item: "skin:gold", device: "device-robo-9999" });
ok("unregistered device can't claim", r.status === 403);
r = await call({ action: "robo", op: "claim", item: "hat:crown", device: dev(1) });
ok("only ultra items can be claimed", r.status === 400);
const res = [];
for (let i = 1; i <= 5; i++) { const x = await call({ action: "robo", op: "claim", item: "skin:gold", device: dev(i) }, "POST", "4.4.4." + i); res.push(x.json.granted); }
ok("gold suit: first 3 get it, then sold out", res.join() === "true,true,true,false,false", res.join());
r = await call({ action: "robo", op: "claim", item: "skin:gold", device: dev(2) }, "POST", "5.5.5.5");
ok("same device again (reinstall) keeps it, no extra count", r.json.granted === true && r.json.n === 3);
r = await call(null, "GET");
ok("feed shows how many are left", r.json.robo["skin:gold"].n === 3 && r.json.robo["skin:gold"].cap === 3 && r.json.robo["skin:diamond"].n === 0 && r.json.robo["skin:phoenix"].cap === 2);
ok("no names / device ids stored", !raw.get("roboRare").includes("device-robo") && !raw.get("roboRare").includes("תלמיד"));
{ const src = (await import("node:fs")).readFileSync(new URL("../netlify/functions/staff.mjs", import.meta.url), "utf8"); const caps = JSON.parse(src.match(/const ROBO_CAPS = (\{[^}]*\})/)[1]); ok("server caps match the app catalog exactly", RC.LIST.filter(x => x.r === "u").every(x => caps[x.id] === x.cap) && Object.keys(caps).length === RC.LIST.filter(x => x.r === "u").length, JSON.stringify(caps)); }
