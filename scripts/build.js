// בנייה אחת לשני האתרים (GitHub Pages ונטליפיי): מייצר את קובצי היומן ומעתיק את קובצי האתר ל-_site.
// כשמוסיפים קובץ חדש לאתר – מוסיפים אותו כאן בלבד.
//   node scripts/build.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "_site");

const FILES = [
  "index.html", "about.html", "absences.html", "cards.html", "calc.html", "shichrur.html", "staff.html", "demo.html",
  "data.js", "board.js", "sets.js", "card-editor.js", "calc-engine.js", "mashov.js", "absences.js", "timetable-image.js", "updates.js", "demo-shim.js", "sw.js",
  "mashov-schools.json",
];
const OPTIONAL = ["logo.png"]; // אם קיים, מועתק. אם לא, האתר פשוט בלי לוגו

require(path.join(ROOT, "gen-cal.js")); // מייצר את cal/*.ics

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "cal"), { recursive: true });
let n = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.error("missing file:", f); process.exitCode = 1; continue; }
  fs.copyFileSync(src, path.join(OUT, f)); n++;
}
for (const f of OPTIONAL) if (fs.existsSync(path.join(ROOT, f))) { fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f)); n++; }
// סרטוני הדרכה ותמונות שלהם
if (fs.existsSync(path.join(ROOT, "media"))) { fs.mkdirSync(path.join(OUT, "media"), { recursive: true }); for (const f of fs.readdirSync(path.join(ROOT, "media"))) { fs.copyFileSync(path.join(ROOT, "media", f), path.join(OUT, "media", f)); n++; } }
for (const f of fs.readdirSync(path.join(ROOT, "cal"))) { fs.copyFileSync(path.join(ROOT, "cal", f), path.join(OUT, "cal", f)); n++; }
console.log(`copied ${n} files to _site/`);
