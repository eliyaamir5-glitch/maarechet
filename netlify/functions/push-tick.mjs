// שעון ההתראות: נטליפיי מריץ את זה כל רבע שעה, ראשון–שישי, 12:00–16:45 UTC
// (= בערך 14:00–19:45 בשעון ישראל, השעות שבהן "שעה לפני השקיעה" יכולה לקרות בשנה).
// כל השאר – בתוך pushTick ב-staff.mjs (שולח רק פעם אחת ביום, רק בחלון הנכון).
import { pushTick } from "./staff.mjs";

export const config = { schedule: "*/15 12-16 * * 0-5" };

export default async () => {
  try { console.log("push tick:", JSON.stringify(await pushTick(Date.now()))); }
  catch (e) { console.error("push tick failed:", e && e.message); }
  return new Response("ok");
};
