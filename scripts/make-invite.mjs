// יוצר קישור הזמנה חדש למנהל: רק מי שיש לו את הקישור יכול להגדיר את עצמו כמנהל.
// הקישור נשמר בקובץ קישור-למנהל.txt (לא עולה לגיטהאב). בקוד נשמר רק ה-hash שלו.
// קישור חדש מבטל את הקודם, ומאפשר למנהל לאפס את הקוד שלו (המורים והעדכונים נשארים).
//   node scripts/make-invite.mjs   ואז מעלים (push)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FN = path.join(ROOT, "netlify/functions/staff.mjs");
const SITE = "https://eliyaamir5-glitch.github.io/maarechet/staff.html";

const key = crypto.randomBytes(18).toString("base64url");
const hash = crypto.createHash("sha256").update(key).digest("hex");
let src = fs.readFileSync(FN, "utf8");
if (!/let INVITE_HASH = "[0-9a-f]*";/.test(src)) throw new Error("INVITE_HASH line not found");
src = src.replace(/let INVITE_HASH = "[0-9a-f]*";/, `let INVITE_HASH = "${hash}";`);
fs.writeFileSync(FN, src);
const link = `${SITE}#invite=${key}`;
fs.writeFileSync(path.join(ROOT, "קישור-למנהל.txt"),
  `הקישור האישי למנהל (לשלוח רק לו, בהודעה פרטית):\r\n\r\n${link}\r\n\r\nהקישור עובד פעם אחת: המנהל בוחר שם וקוד כניסה, ומאז נכנס עם הקוד.\r\nאם המנהל שכח את הקוד: מבקשים קישור חדש (הקודם מפסיק לעבוד).\r\n`);
console.log("invite created. Link saved to קישור-למנהל.txt (not committed). Push to activate.");
