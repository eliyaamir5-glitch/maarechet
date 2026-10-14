// מעקב חיסורים וכלל ה-30%: חישובים בלבד (בלי מסך), כדי שאפשר לבדוק אותם גם ב-Node.
// מקבל: המערכת השבועית, הפרופיל, לוח השנה (SCHOOL_YEAR), ואירועי נוכחות ממשוב.
// מחזיר לכל מקצוע: כמה שיעורים בשנה, כמה היו עד היום, כמה חיסורים, אחוז, רמזור, וכמה עוד מותר.
// הכל נשאר בטלפון של התלמיד.
(function (root) {
  const LIMIT = 0.30, RED = 0.25, ORANGE = 0.15, EARLY = 6; // פחות מ-6 שיעורים עד היום = מוקדם לשפוט
  const DAYN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const toMin = t => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const pad = n => String(n).padStart(2, "0");
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = iso => new Date(iso + "T12:00:00");
  const addDays = (iso, n) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };

  // שיעור כפול = 2 שעות (כמו במשוב, שם כל שעה נרשמת לחוד). מינימום שעה אחת
  const periodsOf = l => Math.max(1, Math.round((toMin(l.e) - toMin(l.s)) / 45));

  // נרמול שמות מקצועות לצורך התאמה בין משוב למערכת
  const norm = s => String(s || "").replace(/["'״׳`]/g, "").replace(/[()\-–,.]/g, " ").replace(/\s+/g, " ").trim();

  // השיעורים של התלמיד ביום מסוים, לפי ההקבצות והמגמה שלו
  function lessonsOfDay(days, dayIdx, p, D) {
    const d = days[dayIdx];
    if (!d || !d.lessons) return [];
    return d.lessons.map(l => {
      if (l.key === "eng") return { ...l, w: D.ENG[p.eng] || "" };
      if (l.key === "math") return { ...l, w: D.MATH[p.math] || "" };
      if (l.key === "major") { const m = D.MAJORS[p.major]; return m ? { ...l, n: m.n, w: m.w } : null; }
      return l;
    }).filter(Boolean);
  }

  function isSchoolDay(iso, Y) {
    if (iso < Y.start || iso > Y.end) return false;
    const wd = dateOf(iso).getDay();
    if (wd > 4) return false; // שישי ושבת
    return !Y.off.some(o => iso >= o.from && iso <= o.to);
  }

  // כמה שעות היו בכל מקצוע בין שני תאריכים (כולל)
  function periodsBetween(days, p, D, Y, from, to) {
    const out = {};
    for (let iso = from; iso <= to; iso = addDays(iso, 1)) {
      if (!isSchoolDay(iso, Y)) continue;
      for (const l of lessonsOfDay(days, dateOf(iso).getDay(), p, D)) out[l.n] = (out[l.n] || 0) + periodsOf(l);
    }
    return out;
  }

  // סוג האירוע במשוב: חיסור / איחור / אחר (הפרעה, ציוד וכו' – לא נספרים)
  function classify(ev) {
    const t = String(ev.type || "");
    const kind = /חיסור|נעדר|היעדר|העדר|לא נכח/.test(t) ? "absence" : /איחור/.test(t) ? "late" : "other";
    let justified = null;
    if (typeof ev.justified === "boolean") justified = ev.justified;
    else if (ev.justificationId !== null && ev.justificationId !== undefined) justified = Number(ev.justificationId) > 0;
    if (ev.justification && /לא מוצדק|ללא הצדקה/.test(ev.justification)) justified = false;
    else if (ev.justification && justified === null) justified = true;
    return { kind, justified };
  }

  // התאמת שם מקצוע ממשוב לשם במערכת
  function matchSubject(mashovName, ourNames) {
    const m = norm(mashovName);
    if (!m) return null;
    const exact = ourNames.find(n => norm(n) === m);
    if (exact) return exact;
    const contains = ourNames.filter(n => { const o = norm(n); return o.length > 2 && (m.includes(o) || o.includes(m)); });
    if (contains.length === 1) return contains[0];
    if (contains.length > 1) return contains.sort((a, b) => b.length - a.length)[0];
    if (/תפיל|שחרית/.test(m)) return ourNames.find(n => /שחרית/.test(n)) || null;
    return null;
  }

  function statusOf(pct, held) {
    if (held < EARLY) return "early";
    return pct > RED ? "red" : pct >= ORANGE ? "orange" : "green";
  }

  function analyze({ days, profile, data: D, year: Y, behave, today, countJustified = true, nonBagrut = [] }) {
    today = today || isoOf(new Date());
    const asOf = today > Y.end ? Y.end : today;
    const yearTotals = periodsBetween(days, profile, D, Y, Y.start, Y.end);
    const held = asOf >= Y.start ? periodsBetween(days, profile, D, Y, Y.start, asOf) : {};
    const names = Object.keys(yearTotals);

    const per = {}; const unmatched = {};
    const absEvents = [];
    for (const ev of behave || []) {
      if (!ev.date || ev.date < Y.start || ev.date > Y.end) continue;
      const c = classify(ev);
      if (c.kind === "other") continue;
      const subj = matchSubject(ev.subject, names);
      if (!subj) { const k = ev.subject || "לא ידוע"; unmatched[k] = (unmatched[k] || 0) + (c.kind === "absence" ? 1 : 0); continue; }
      const s = per[subj] || (per[subj] = { absences: 0, justified: 0, unjustified: 0, unknownJust: 0, lates: 0 });
      if (c.kind === "late") { s.lates++; continue; }
      s.absences++;
      if (c.justified === true) s.justified++; else if (c.justified === false) s.unjustified++; else s.unknownJust++;
      absEvents.push({ ...ev, subject: subj, justified: c.justified });
    }

    const subjects = names.map(n => {
      const s = per[n] || { absences: 0, justified: 0, unjustified: 0, unknownJust: 0, lates: 0 };
      const total = yearTotals[n] || 0, h = held[n] || 0;
      const counted = countJustified ? s.absences : s.unjustified + s.unknownJust;
      const pct = h ? counted / h : 0;
      const limit = Math.floor(LIMIT * total);
      const allowedLeft = limit - counted;
      const status = allowedLeft < 0 ? "lost" : statusOf(pct, h);
      // מצב חילוץ: כמה שעות ברצף צריך להגיע כדי לרדת ל-25% (חזרה לכתום)
      const needConsecutive = pct > RED ? Math.max(0, Math.ceil(counted / RED - h)) : 0;
      const weekly = weeklyPeriods(days, profile, D, n);
      return { name: n, nonBagrut: nonBagrut.includes(n), yearTotal: total, held: h, remaining: total - h, ...s, counted, pct, limit, allowedLeft, status,
        needConsecutive, weeksToRecover: weekly ? Math.ceil(needConsecutive / weekly) : null, weekly };
    }).sort((a, b) => (b.pct - a.pct) || a.name.localeCompare(b.name, "he"));

    return {
      asOf, subjects, unmatched: Object.entries(unmatched).map(([subject, absences]) => ({ subject, absences })),
      patterns: patterns(absEvents), thisWeek: thisWeek(subjects, days, profile, D, Y, asOf),
      tips: tips(subjects, absEvents, Y),
    };
  }

  function weeklyPeriods(days, p, D, name) {
    let n = 0;
    for (let d = 0; d < 5; d++) for (const l of lessonsOfDay(days, d, p, D)) if (l.n === name) n += periodsOf(l);
    return n;
  }

  // השבוע: מקצועות בסיכון (כתום/אדום/אבוד) שיש להם עוד שיעורים מהיום ועד סוף השבוע
  function thisWeek(subjects, days, p, D, Y, asOf) {
    const risky = subjects.filter(s => !s.nonBagrut && ["orange", "red", "lost"].includes(s.status));
    const out = [];
    // בשישי ובשבת מסתכלים על השבוע הבא
    const wd0 = dateOf(asOf).getDay();
    const start = wd0 >= 5 ? addDays(asOf, 7 - wd0) : asOf;
    const wd = dateOf(start).getDay();
    for (const s of risky) {
      const when = [];
      for (let i = 0; i <= 4 - wd; i++) {
        const iso = addDays(start, i);
        if (!isSchoolDay(iso, Y)) continue;
        const ls = lessonsOfDay(days, dateOf(iso).getDay(), p, D).filter(l => l.n === s.name);
        if (ls.length) when.push(`${DAYN[dateOf(iso).getDay()]} ${ls[0].s}`);
      }
      if (when.length) out.push({ name: s.name, status: s.status, when });
    }
    return out;
  }

  function patterns(ev) {
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    let morning = 0, afternoon = 0;
    for (const e of ev) {
      byWeekday[dateOf(e.date).getDay()]++;
      const lesson = Number(e.lesson);
      if (/שחרית/.test(e.subject) || (!isNaN(lesson) && lesson <= 1)) morning++;
      else if (!isNaN(lesson) && lesson >= 8) afternoon++;
    }
    return { total: ev.length, byWeekday, morning, afternoon };
  }

  function tips(subjects, ev, Y) {
    const out = [], n = ev.length;
    const P = patterns(ev);
    if (n >= 3 && P.morning / n >= 0.4) out.push({ icon: "⏰", title: "רוב החיסורים בבוקר", text: "זו בעיית קימה, לא בעיית מקצוע. שעון מעורר רחוק מהמיטה, טלפון מחוץ לחדר אחרי 23:00, ותיק מוכן מהערב (רשימת \"מה להביא מחר\" במערכת)." });
    if (n >= 3 && P.afternoon / n >= 0.4) out.push({ icon: "🔋", title: "רוב החיסורים בסוף היום", text: "עייפות של אחר הצהריים. אוכל אמיתי בהפסקת הצהריים ובקבוק מים עוזרים יותר משנדמה. אם יש סיבה קבועה ליציאה מוקדמת, דבר עם המחנך." });
    const maxDay = P.byWeekday.indexOf(Math.max(...P.byWeekday));
    if (n >= 4 && P.byWeekday[maxDay] / n >= 0.4) out.push({ icon: "📅", title: `יום ${DAYN[maxDay]} הוא היום הבעייתי`, text: `${P.byWeekday[maxDay]} מתוך ${n} החיסורים ביום ${DAYN[maxDay]}. כדאי לבדוק מה קורה ביום הזה ולתכנן אותו מראש.` });
    // ימים רצופים עם חיסורים = נראה כמו מחלה
    const dates = [...new Set(ev.map(e => e.date))].sort();
    let run = 1, maxRun = dates.length ? 1 : 0;
    for (let i = 1; i < dates.length; i++) {
      let next = addDays(dates[i - 1], 1); while (!isSchoolDay(next, Y) && next < dates[i]) next = addDays(next, 1);
      run = next === dates[i] ? run + 1 : 1; maxRun = Math.max(maxRun, run);
    }
    if (maxRun >= 3) out.push({ icon: "🩺", title: "חיסור של כמה ימים ברצף", text: "אם היית חולה, תביא אישור רפואי כדי שהחיסורים יירשמו כמוצדקים. זה יכול לשנות את התמונה." });
    const unknown = ev.filter(e => e.justified !== true).length;
    if (unknown >= 3 && ev.some(e => e.justified === true)) out.push({ icon: "📝", title: "יש חיסורים שאפשר אולי להצדיק", text: `${unknown} חיסורים לא מוצדקים. אם חלק מהם היו בגלל תור, מחלה או אירוע משפחתי, בקש מההורים לשלוח אישור.` });
    const bad = subjects.filter(s => !s.nonBagrut && (s.status === "red" || s.status === "lost"));
    if (bad.length) out.push({ icon: "🗣️", title: "שיחה עם המורה", text: `ב${bad.map(s => s.name).join(", ")} כדאי לדבר עם המורה עכשיו, לפני שזה נהיה סופי. מורים מעריכים תלמיד שבא לבד עם תוכנית.` });
    return out;
  }

  const api = { analyze, classify, matchSubject, periodsOf, isSchoolDay, periodsBetween, statusOf, LIMIT, RED, ORANGE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Absences = api;
})(typeof window !== "undefined" ? window : globalThis);
