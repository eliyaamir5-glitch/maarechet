// יוצר קוד סודי חדש לדף מנהל המערכת (owner.html).
// הקוד עצמו נכתב רק לקובץ המקומי קוד-מנהל-מערכת.txt (לא נכנס ל-git), ובשרת נשמר רק salt + scrypt.
// שימוש: node scripts/make-owner-code.mjs  → מעתיקים את שתי השורות שהוא מדפיס ל-OWNER ב-netlify/functions/staff.mjs
import crypto from "node:crypto";
import fs from "node:fs";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const raw = Array.from(crypto.randomBytes(16), b => CHARS[b % CHARS.length]).join("");
const code = raw.match(/.{4}/g).join("-");
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(raw, salt, 32).toString("hex");
fs.writeFileSync(new URL("../קוד-מנהל-מערכת.txt", import.meta.url), `קוד הכניסה לדף מנהל המערכת (owner.html)\n${code}\n\nלא לשתף עם אף אחד. נוצר ב-${new Date().toLocaleString("he-IL")}\n`);
console.log(`salt: "${salt}"`);
console.log(`hash: "${hash}"`);
console.log("הקוד נשמר בקובץ קוד-מנהל-מערכת.txt");
