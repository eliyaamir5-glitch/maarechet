// יוצר קוד עריכה לספר הטלפונים (מי שיש לו את הקוד יכול להוסיף ולשנות מספרים של מורים).
// הקוד נשמר בקובץ קוד-ספר-טלפונים.txt (לא עולה לגיטהאב). בשרת נשמר רק ה-hash.
// קוד חדש מבטל את הקודם.
//   node scripts/make-phone-code.mjs   ואז מעלים (push)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FN = path.join(ROOT, "netlify/functions/staff.mjs");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // בלי 0/O ו-1/I שמתבלבלים
const raw = Array.from(crypto.randomBytes(8), b => CHARS[b % CHARS.length]).join("");
const code = raw.match(/.{4}/g).join("-"); // XXXX-XXXX
const hash = crypto.createHash("sha256").update(raw).digest("hex");
let src = fs.readFileSync(FN, "utf8");
if (!/let PHONE_HASH = "[0-9a-f]*";/.test(src)) throw new Error("PHONE_HASH line not found");
fs.writeFileSync(FN, src.replace(/let PHONE_HASH = "[0-9a-f]*";/, `let PHONE_HASH = "${hash}";`));
fs.writeFileSync(path.join(ROOT, "קוד-ספר-טלפונים.txt"), [
  "📞 קוד עריכה – ספר הטלפונים",
  "",
  "באפליקציה: 📞 ספר טלפונים → בתחתית \"🔑 עריכת מספרים\" → מקלידים:",
  code,
  "",
  "הקוד נשמר בטלפון אחרי הכניסה הראשונה. לא לשתף – מי שיש לו את הקוד יכול לשנות מספרים.",
  "",
].join("\r\n"));
console.log("phone-book edit code created. Saved to קוד-ספר-טלפונים.txt (not committed). Push to activate.");
