// שרת בדיקה מקומי: האתר + השרת (staff.mjs) בזיכרון, עם תלמידים מדומים. לא נוגע בשרת האמיתי.
//   node scripts/dev-server.mjs   →  http://localhost:8790   (דף מנהל המערכת: /owner.html, קוד: DEV0-DEV0-DEV0-DEV0)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8790;
const { APP_VERSION } = createRequire(import.meta.url)(path.join(ROOT, "data.js"));
const mod = await import(pathToFileURL(path.join(ROOT, "netlify/functions/staff.mjs")).href);
const mem = mod.__useMemoryStore();
const salt = "de5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e";
mod.__setOwner({ salt, hash: crypto.scryptSync("DEV0DEV0DEV0DEV0", salt, 32).toString("hex") });

// ---- נתוני דוגמה (שמות מומצאים) ----
const FIRST = ["איתי", "נועם", "יונתן", "אורי", "עמית", "דניאל", "יאיר", "אליה", "הראל", "נתנאל", "שילה", "אביתר", "יהונתן", "אריאל", "מתן", "עידו", "רועי", "אלעד", "נריה", "יוסף", "משה", "אהרון", "דוד", "שמואל", "בנימין", "עוז", "טל", "גל", "אחיה", "ידידיה", "הלל", "צור", "אביב", "נדב", "שקד", "אלון", "יובל", "ליאור", "אסף", "מאיר", "חנן", "עזרא", "רפאל", "ישי", "אוריה", "נחום"];
const LAST = ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "פרידמן", "דהן", "אזולאי", "גבאי", "שפירא", "קליין", "חדד", "עמר", "יוסף", "אוחנה", "בן דוד", "רוזן", "גולן", "שטרן"];
const PLATS = ["iPhone · Safari", "iPhone · Safari", "Android · Chrome", "Android · Chrome", "Android · Samsung", "Windows · Chrome", "iPad · Safari", "Mac · Safari"];
const pick = (a, i) => a[i % a.length];
const now = Date.now(), day = t => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(t);
const presence = {};
FIRST.forEach((f, i) => {
  const k = crypto.createHash("sha256").update("dev:seed" + i).digest("hex").slice(0, 24);
  const ago = i < 6 ? i * 90e3 : i < 20 ? (i * 37 % 600) * 60e3 : i < 38 ? (1 + i % 6) * 864e5 + i * 3e5 : (8 + i % 20) * 864e5;
  const last = now - ago, activeDays = Math.max(1, 22 - (i % 19)), days = [];
  for (let d = 0; d < 30 && days.length < activeDays; d++) if ((d * 7 + i) % 3 || d === Math.round(ago / 864e5)) days.unshift(day(last - d * 864e5));
  presence[k] = { name: `${f} ${pick(LAST, i * 7)}`, cls: i % 2 ? "y1" : "y2", eng: pick(["bokobza", "minervi", "hadad"], i), math: pick(["toni", "adir", "harel"], i * 5),
    major: pick(["econ", "cs", "phys"], i * 2 + 1), mashov: i % 3 === 0, ver: i % 9 === 4 ? "2026-10-20" : APP_VERSION, plat: pick(PLATS, i * 3), inst: i % 4 !== 1,
    first: last - (3 + i % 12) * 864e5, last, opens: 3 + (i * 13) % 40, days: [...new Set(days)] };
});
mem.set("presence", JSON.stringify(presence));
const names = Object.values(presence).map(x => x.name);
mem.set("reactions", JSON.stringify({ u1: Object.fromEntries(names.slice(0, 14).map((n, i) => ["r" + i, { e: pick(["👍", "🔥", "❤️", "😂"], i), name: n, cls: "y1", at: now }])) }));
mem.set("birthdays", JSON.stringify(Object.fromEntries(names.slice(3, 12).map((n, i) => ["b" + i, { name: n, cls: Object.values(presence)[i + 3].cls, md: `${String(1 + i).padStart(2, "0")}-1${i % 3}`, at: now }]))));
mem.set("users", JSON.stringify([{ id: "dev-admin", name: "המנהל (דוגמה)", role: "admin", owner: true, createdAt: now - 3e9 }, { id: "dev-t1", name: "מורה לדוגמה", role: "teacher", createdAt: now - 1e9 }]));
mem.set("updates", JSON.stringify([{ id: "u1", text: "עדכון לדוגמה", authorId: "dev-admin", authorName: "המנהל", role: "admin", audience: "all", createdAt: now - 36e5, expiresAt: now + 36e5 * 5 }]));
mem.set("contacts", JSON.stringify(Object.fromEntries(Array.from({ length: 46 }, (_, i) => ["c" + i, { name: "איש קשר " + i, phone: "050000000" + (i % 10) }]))));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".ics": "text/calendar; charset=utf-8", ".mp4": "video/mp4" };
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname.startsWith("/api/")) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await mod.default(new Request(u, { method: req.method, headers: req.headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body }), { ip: "127.0.0.1" });
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    // רק קבצים בתוך התיקייה, בלי קבצים/תיקיות נסתרים (.git), בלי ":" (זרם נסתר של NTFS: "x.txt::$DATA"),
    // ובלי קובצי txt – הקבצים הסודיים (גם ".TXT": ב-Windows אותיות גדולות/קטנות זה אותו קובץ). השרת מאזין רק למחשב הזה (127.0.0.1)
    if (!file.startsWith(ROOT + path.sep) || /[\\/]\.|:/.test(file.slice(ROOT.length)) || /\.txt$/i.test(file) ||!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e && e.message)); }
}).listen(PORT, "127.0.0.1", () => console.log(`dev server: http://localhost:${PORT}  (owner: /owner.html, code DEV0-DEV0-DEV0-DEV0)`));
