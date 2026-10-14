// יוצר קוד כניסה חדש למנהל הראשי (וקישור שמכניס איתו בלחיצה).
// בכניסה הראשונה עם הקוד נוצר החשבון של המנהל; אחר כך הוא יכול לשנות את הקוד ב"החשבון שלי".
// ההודעה למנהל (קישור + קוד) נשמרת בקובץ קישור-למנהל.txt (לא עולה לגיטהאב). בקוד נשמר רק ה-hash.
// קוד חדש מבטל את הקודם, ואם המנהל כבר קיים, מאפס את הקוד שלו (המורים והעדכונים נשארים).
//   node scripts/make-invite.mjs   ואז מעלים (push)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FN = path.join(ROOT, "netlify/functions/staff.mjs");
const SITE = "https://eliyaamir5-glitch.github.io/maarechet/staff.html";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // בלי 0/O ו-1/I שמתבלבלים
const raw = Array.from(crypto.randomBytes(12), b => CHARS[b % CHARS.length]).join("");
const code = raw.match(/.{4}/g).join("-"); // XXXX-XXXX-XXXX
const hash = crypto.createHash("sha256").update(raw).digest("hex");
let src = fs.readFileSync(FN, "utf8");
if (!/let INVITE_HASH = "[0-9a-f]*";/.test(src)) throw new Error("INVITE_HASH line not found");
fs.writeFileSync(FN, src.replace(/let INVITE_HASH = "[0-9a-f]*";/, `let INVITE_HASH = "${hash}";`));
const link = `${SITE}#invite=${code}`;
fs.writeFileSync(path.join(ROOT, "קישור-למנהל.txt"), [
  "📢 כניסת מנהל – המערכת",
  "",
  "כניסה בלחיצה אחת:",
  link,
  "",
  "או נכנסים לכתובת:",
  SITE,
  "ומקלידים את הקוד:",
  code,
  "",
  "אחרי הכניסה אפשר לשנות את הקוד לקוד שתבחר: לשונית ⚙️ החשבון שלי.",
  "",
].join("\r\n"));
console.log("principal code created. Saved to קישור-למנהל.txt (not committed). Push to activate.");
