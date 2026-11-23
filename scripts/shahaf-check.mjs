// 🏫 בדיקה יומית: האם מערכת השעות באתר שחף השתנתה מאז הפעם הקודמת?
//   NODE_USE_ENV_PROXY=1 node scripts/shahaf-check.mjs         → מדפיס מה השתנה (יציאה 0 = אין שינוי, 2 = יש שינוי, 1 = תקלה)
//   NODE_USE_ENV_PROXY=1 node scripts/shahaf-check.mjs --save  → שומר את המצב הנוכחי (אחרי שעדכנו את data.js לפיו)
// משווים לתמונה האחרונה ששמרנו (scripts/shahaf-snapshot.json) ולא ישירות ל-data.js, כי ב-data.js יש דברים שלא בשחף
// (ערבית, פנימייה, הקבצות, מורה שכבר עזב) – ככה רק שינוי אמיתי בבית הספר מעיר אותנו.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { fetchShahaf } from "./shahaf.mjs";
const SNAP = path.join(path.dirname(fileURLToPath(import.meta.url)), "shahaf-snapshot.json");
const DN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
const line = l => `${l.s}-${l.e} ${l.n}${l.w.length ? " | " + l.w.join(", ") : ""}`;
let now; try { now = await fetchShahaf(); } catch (e) { console.error("❌ לא הצלחתי לקרוא את שחף:", e.message); process.exit(1); }
// הגנה: מערכת כמעט ריקה = תקלה באתר, לא שינוי אמיתי
for (const [k, days] of Object.entries(now)) { const n = days.reduce((a, d) => a + d.length, 0); if (n < 15) { console.error(`❌ במערכת של ${k} יש רק ${n} שיעורים – נראה כמו תקלה באתר. לא נוגעים.`); process.exit(1); } }
if (process.argv.includes("--save")) { fs.writeFileSync(SNAP, JSON.stringify({ at: new Date().toISOString().slice(0, 10), ...now }, null, 1) + "\n"); console.log("✅ נשמר", SNAP); process.exit(0); }
const old = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, "utf8")) : {};
let changed = 0;
for (const [k, days] of Object.entries(now)) days.forEach((D, i) => {
  const a = (old[k] && old[k][i] || []).map(line), b = D.map(line);
  const gone = a.filter(x => !b.includes(x)), added = b.filter(x => !a.includes(x));
  if (!gone.length && !added.length) return; changed++;
  console.log(`\n=== ${k} יום ${DN[i]}`); gone.forEach(x => console.log("  - " + x)); added.forEach(x => console.log("  + " + x));
});
console.log(changed ? `\n🔄 יש שינויים (${changed} ימים). (- = היה, + = עכשיו)` : "✅ אין שינוי במערכת בשחף"); process.exit(changed ? 2 : 0);
