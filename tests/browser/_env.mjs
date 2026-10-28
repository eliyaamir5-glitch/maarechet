// הגדרות משותפות לרובוטים: איפה הפרויקט ואיפה כרום. עובד בכל מחשב (ווינדוס/מק/לינוקס).
// כרום במקום אחר? מגדירים CHROME_PATH. בשרת לינוקס כ-root מוסיפים CHROME_NO_SANDBOX=1.
import { fileURLToPath } from "node:url";
import fs from "node:fs";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url)).replace(/[\\/]+$/, "");
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
export const CHROME = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || CANDIDATES[0];
export const CHROME_ARGS = process.env.CHROME_NO_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
