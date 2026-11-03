// 🔥 תזכורת לפני שהרצף נשבר: נטליפיי מריץ את זה כמה פעמים ביום, ראשון–שישי (UTC).
// השליחה עצמה פעם אחת ביום, ובשעה הנכונה (20:00 בשעון ישראל; בשישי ובערב חג – 12:00) – הכל בתוך streakTick ב-staff.mjs.
import { streakTick } from "./staff.mjs";

export const config = { schedule: "0 9,10,11,17,18,19 * * 0-5" };

export default async () => {
  try { console.log("streak tick:", JSON.stringify(await streakTick(Date.now()))); }
  catch (e) { console.error("streak tick failed:", e && e.message); }
  return new Response("ok");
};
