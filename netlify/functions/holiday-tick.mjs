// 🎉 שעון ברכות החג: נטליפיי מריץ את זה בכל שעה עגולה 06:00–10:00 UTC, ראשון–שישי
// (= בערך 08:00–13:00 בשעון ישראל). הברכה יוצאת פעם אחת: בערב חג ב-12:00, או ביום עצמו ב-09:00 (יום העצמאות, ט"ו בשבט, יום ירושלים).
// אף פעם לא בשבת או בחג עצמו – הכל בתוך holidayTick ב-staff.mjs.
import { holidayTick } from "./staff.mjs";

export const config = { schedule: "0 6-10 * * 0-5" };

export default async () => {
  try { console.log("holiday tick:", JSON.stringify(await holidayTick(Date.now()))); }
  catch (e) { console.error("holiday tick failed:", e && e.message); }
  return new Response("ok");
};
