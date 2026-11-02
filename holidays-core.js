// 🎉 לוח החגים: מחשב לבד מתי כל חג ומועד, לכל שנה, לפי הלוח העברי של הדפדפן (Intl – בלי טבלאות לעדכן).
// משותף לאפליקציה (holidays.js) ולשרת (ברכות "חג שמח" לטלפונים – staff.mjs).
// כל התאריכים כאן הם "YYYY-MM-DD" בשעון ישראל. חג עברי מתחיל בערב שלפניו (eveHour).
(function (root) {
  const FMT = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const ymdOf = t => new Date(t).toISOString().slice(0, 10);
  const tOf = ymd => Date.parse(ymd + "T12:00:00Z");
  const add = (ymd, n) => ymdOf(tOf(ymd) + n * 864e5);
  const dow = ymd => new Date(tOf(ymd)).getUTCDay(); // 0 = ראשון … 6 = שבת
  // תאריך עברי: {d, m, y}. אדר ב' בשנה מעוברת = "Adar" (שם פורים), אדר א' = "Adar I"
  function heb(ymd) {
    const o = {}; for (const p of FMT.formatToParts(new Date(tOf(ymd)))) o[p.type] = p.value;
    return { d: +o.day, m: o.month === "Adar II" ? "Adar" : o.month, y: +String(o.year).replace(/\D/g, "") };
  }

  // type: joy = שמח · solemn = רציני (יום כיפור) · sad = יום זיכרון/אבל (בלי אפקטים, בלי ברכה)
  // push: מתי שולחים ברכה – "eve" = ערב החג ב-12:00 (לפני כניסת החג – לא מגיע בחג/בשבת), "day" = ביום עצמו ב-09:00
  const DEFS = [
    { key: "rosh", name: "ראש השנה", m: "Tishri", d: 1, len: 2, type: "joy", push: "eve", greet: "שנה טובה ומתוקה! 🍎🍯" },
    { key: "kippur", name: "יום כיפור", m: "Tishri", d: 10, len: 1, type: "solemn", push: "eve", greet: "גמר חתימה טובה 🤍" },
    { key: "sukkot", name: "סוכות", m: "Tishri", d: 15, len: 7, type: "joy", push: "eve", greet: "חג סוכות שמח! 🌿🍋" },
    { key: "simchat", name: "שמחת תורה", m: "Tishri", d: 22, len: 1, type: "joy", push: "eve", greet: "חג שמח! שמחת תורה 📜💃" },
    { key: "hanukkah", name: "חנוכה", m: "Kislev", d: 25, len: 8, type: "joy", push: "eve", greet: "חנוכה שמח! 🕎 הערב מדליקים נר ראשון" },
    { key: "tubishvat", name: "ט\"ו בשבט", m: "Shevat", d: 15, len: 1, type: "joy", push: "day", greet: "ט\"ו בשבט שמח! 🌳🌸" },
    { key: "purim", name: "פורים", m: "Adar", d: 14, len: 2, type: "joy", push: "eve", greet: "פורים שמח! 🎭🤡🎉" },
    { key: "pesach", name: "פסח", m: "Nisan", d: 15, len: 7, type: "joy", push: "eve", greet: "חג כשר ושמח! 🍷🫓" },
    { key: "shoah", name: "יום הזיכרון לשואה ולגבורה", m: "Nisan", d: 27, len: 1, type: "sad", eveHour: 20, push: null },
    { key: "zikaron", name: "יום הזיכרון לחללי מערכות ישראל", m: "Iyar", d: 4, len: 1, type: "sad", eveHour: 20, push: null },
    { key: "atzmaut", name: "יום העצמאות", m: "Iyar", d: 5, len: 1, type: "joy", eveHour: 20, push: "day", greet: "חג עצמאות שמח! 🇮🇱🎆" },
    { key: "lagbaomer", name: "ל\"ג בעומר", m: "Iyar", d: 18, len: 1, type: "joy", push: "eve", greet: "ל\"ג בעומר שמח! 🔥" },
    { key: "yerushalayim", name: "יום ירושלים", m: "Iyar", d: 28, len: 1, type: "joy", push: "day", greet: "יום ירושלים שמח! ירושלים של זהב ✨" },
    { key: "shavuot", name: "שבועות", m: "Sivan", d: 6, len: 1, type: "joy", push: "eve", greet: "חג שבועות שמח! 🌾🧀" },
    { key: "tishabav", name: "תשעה באב", m: "Av", d: 9, len: 1, type: "sad", push: null },
  ];
  // סימן לכל חג (כותרת ההתראה בטלפון)
  const EM = { rosh: "🍎", kippur: "🤍", sukkot: "🌿", simchat: "📜", hanukkah: "🕎", tubishvat: "🌳", purim: "🎭", pesach: "🍷", shoah: "🕯️", zikaron: "🕯️", atzmaut: "🇮🇱", lagbaomer: "🔥", yerushalayim: "✨", shavuot: "🌾", tishabav: "🕯️" };
  DEFS.forEach(x => { x.em = EM[x.key]; });
  const BY = Object.fromEntries(DEFS.map(x => [x.key, x]));

  // ימים שזזים לפי החוק בישראל (כדי לא לגעת בשבת)
  function move(key, ymd) {
    const w = dow(ymd);
    if (key === "shoah") return w === 5 ? add(ymd, -1) : w === 0 ? add(ymd, 1) : ymd; // שישי → חמישי, ראשון → שני
    if (key === "atzmaut") return w === 5 ? add(ymd, -1) : w === 6 ? add(ymd, -2) : w === 1 ? add(ymd, 1) : ymd; // שישי/שבת → חמישי, שני → שלישי
    if (key === "tishabav") return w === 6 ? add(ymd, 1) : ymd; // נדחה
    return ymd;
  }

  const cache = {};
  // כל המועדים שמסתיימים מ-from והלאה, עד days ימים קדימה, מסודרים לפי תאריך
  function list(from, days = 400) {
    const ck = from + "|" + days; if (cache[ck]) return cache[ck];
    const idx = {}; // "Tishri-1-5787" → תאריך לועזי
    for (let i = -40; i <= days; i++) { const g = add(from, i), h = heb(g); idx[h.m + "-" + h.d + "-" + h.y] = g; }
    const years = [...new Set(Object.keys(idx).map(k => +k.split("-").pop()))], out = [];
    for (const y of years) for (const def of DEFS) {
      let start = idx[def.m + "-" + def.d + "-" + y]; if (!start) continue;
      start = move(def.key, start);
      let o = { key: def.key, start, end: add(start, def.len - 1) };
      if (def.key === "zikaron") { const a = idx["Iyar-5-" + y]; if (!a) continue; o.start = o.end = add(move("atzmaut", a), -1); }
      if (o.end < from || o.start > add(from, days)) continue;
      out.push(Object.assign({}, def, o, { hy: y }));
    }
    out.sort((a, b) => a.start.localeCompare(b.start));
    return (cache[ck] = out);
  }

  // מה פעיל עכשיו (t = זמן, ymd + שעה בישראל). חג מתחיל בערב שלפניו משעה eveHour (ברירת מחדל 18:00)
  function ilNow(t) {
    const p = {}; for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date(t))) p[x.type] = x.value;
    return { ymd: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24 };
  }
  function active(t = Date.now()) {
    const { ymd, hour } = ilNow(t);
    const l = list(add(ymd, -1), 60);
    // ערב חג גובר על היום שנגמר (למשל ערב יום העצמאות בסוף יום הזיכרון)
    const eve = l.find(h => h.start === add(ymd, 1) && hour >= (h.eveHour || 18));
    if (eve) return Object.assign({}, eve, { day: 0, eve: true });
    const h = l.find(h => ymd >= h.start && ymd <= h.end);
    return h ? Object.assign({}, h, { day: Math.round((tOf(ymd) - tOf(h.start)) / 864e5) + 1, eve: false }) : null;
  }
  // החג הבא שעוד לא התחיל (רק שמחים/רציניים – לא סופרים ימים לקראת יום זיכרון), ובעוד כמה ימים
  function next(t = Date.now(), within = 14) {
    const { ymd } = ilNow(t);
    const h = list(ymd, within + 2).find(h => h.start > ymd && h.type !== "sad");
    if (!h) return null;
    const inDays = Math.round((tOf(h.start) - tOf(ymd)) / 864e5);
    return inDays <= within ? Object.assign({}, h, { inDays }) : null;
  }
  // חנוכה: כמה נרות דולקים הערב/היום (בערב – הנר של הלילה הבא)
  function candles(t = Date.now()) {
    const a = active(t); if (!a || a.key !== "hanukkah") return 0;
    const { hour } = ilNow(t); return a.eve ? 1 : Math.min(8, a.day + (hour >= 17 && a.day < 8 ? 1 : 0));
  }
  // מתי שולחים ברכה לטלפונים: ערב החג (12:00) או היום עצמו (09:00). לא בשבת – מקדימים לשישי
  function sendAt(h) {
    if (!h || !h.push) return null;
    let day = h.push === "eve" ? add(h.start, -1) : h.start;
    if (dow(day) === 6) day = add(day, -1);
    return { day, hour: h.push === "eve" ? 12 : 9 };
  }
  // שנת המדינה (ליום העצמאות)
  const stateYears = h => +h.start.slice(0, 4) - 1948;

  const api = { DEFS, BY, heb, list, active, next, candles, sendAt, ilNow, add, dow, stateYears };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HolidaysCore = api;
})(typeof self !== "undefined" ? self : this);
