// מריץ את כל הרובוטים ומדפיס סיכום.  npm run test:browser   (או: node tests/browser/run-all.mjs e2e ctl2-e2e)
// מרים שרת קבצים מקומי על 127.0.0.1:8787 אם אין כבר אחד (לא מגיש קבצי .txt או קבצים שמתחילים בנקודה).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT } from "./_env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALL = ["e2e", "part1-e2e", "part2-e2e", "calc-e2e", "phones-e2e", "cards-edit", "sets-e2e", "updates-e2e", "contact-check", "demo-check", "demo-sets",
  "staff-fix", "cards-fix-check", "bday-e2e", "react-e2e", "secondary-check", "phonecode-e2e", "combos-e2e", "owner-e2e", "ctl-e2e", "ctl2-e2e",
  "owner-audit-e2e", "audit-e-secondary", "dorm-e2e", "grade11-e2e", "tefillin-e2e", "topics-e2e", "push-e2e", "principal-e2e", "grades-e2e", "fx-e2e", "account-e2e", "monkey"];
const pick = process.argv.slice(2), list = pick.length ? pick : ALL;

const up = () => new Promise(res => { const r = http.get("http://127.0.0.1:8787/", x => { x.resume(); res(true); }); r.on("error", () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); });
let server = null;
if (!(await up())) {
  const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ics": "text/calendar; charset=utf-8" };
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p), rel = path.relative(ROOT, f);
    if (rel.startsWith("..") || /(^|[\\/])\./.test(rel) || /\.txt$/i.test(f) || f.includes(":", 3) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8787, "127.0.0.1", r));
  console.log("static server: http://localhost:8787 (" + ROOT + ")");
}

const results = [];
for (const t of list) {
  const out = await new Promise(res => {
    let buf = "";
    const c = spawn(process.execPath, [path.join(HERE, t + ".mjs")], { cwd: HERE });
    c.stdout.on("data", d => buf += d); c.stderr.on("data", d => buf += d);
    const kill = setTimeout(() => c.kill(), 8 * 60e3);
    c.on("close", code => { clearTimeout(kill); res({ code, buf }); });
  });
  const lines = out.buf.split(/\r?\n/), fails = lines.filter(l => l.startsWith("❌"));
  const sum = lines.filter(l => /passed|FAILED|ISSUES \(|errors:/.test(l)).slice(-2).join(" ").slice(0, 160);
  const ok = !fails.length && out.code === 0 && !/FAILED: [1-9]|ISSUES \([1-9]/.test(out.buf);
  results.push({ t, ok });
  console.log(`${ok ? "✅" : "❌"} ${t.padEnd(18)} ${sum}`);
  for (const f of fails.slice(0, 5)) console.log("     " + f.slice(0, 200));
  if (!ok && !fails.length) console.log("     " + lines.filter(Boolean).slice(-3).join(" | ").slice(0, 300));
}
server && server.close();
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} robots passed${bad.length ? " — failed: " + bad.map(r => r.t).join(", ") : ""}`);
process.exitCode = bad.length ? 1 : 0;
