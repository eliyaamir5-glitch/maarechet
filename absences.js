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
      if (D.forProfile) { l = D.forProfile(l, p); if (!l || l.stats === false) return null; } // הקבצה/מגמה מסוימת בלבד
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
    if (contains.length > 1) {
      // שם כללי שמתאים לכמה מקצועות (למשל "השכלה כללית") – לא מנחשים
      if (contains.filter(n => norm(n).includes(m)).length > 1) return null;
      return contains.sort((a, b) => b.length - a.length)[0];
    }
    if (/תפיל|שחרית/.test(m)) return ourNames.find(n => /שחרית/.test(n)) || null;
    return null;
  }

  function statusOf(pct, held) {
    if (held < EARLY) return "early";
    return pct > RED ? "red" : pct >= ORANGE ? "orange" : "green";
  }

  // weekFrom: מאיזה תאריך מחשבים את "לא מפספסים השבוע" (ברירת מחדל: today). כך גם כשהנתונים ממשוב ישנים, השבוע הוא השבוע האמיתי
  function analyze({ days, profile, data: D, year: Y, behave, today, weekFrom, countJustified = true, nonBagrut = [] }) {
    today = today || isoOf(new Date());
    const asOf = today > Y.end ? Y.end : today;
    const yearTotals = periodsBetween(days, profile, D, Y, Y.start, Y.end);
    const held = asOf >= Y.start ? periodsBetween(days, profile, D, Y, Y.start, asOf) : {};
    const names = Object.keys(yearTotals);

    const per = {}; const unmatched = {};
    const absEvents = [];
    for (const ev of behave || []) {
      if (!ev.date || ev.date < Y.start || ev.date > Y.end || !isSchoolDay(ev.date, Y)) continue;
      const c = classify(ev);
      if (c.kind === "other") continue;
      const subj = matchSubject(ev.subject, names);
      if (!subj) { if (c.kind === "absence") { const k = ev.subject || "לא ידוע"; unmatched[k] = (unmatched[k] || 0) + 1; } continue; }
      const s = per[subj] || (per[subj] = { absences: 0, justified: 0, unjustified: 0, unknownJust: 0, lates: 0 });
      if (c.kind === "late") { s.lates++; continue; }
      s.absences++;
      if (c.justified === true) s.justified++; else if (c.justified === false) s.unjustified++; else s.unknownJust++;
      absEvents.push({ ...ev, subject: subj, justified: c.justified });
    }

    // המורה של כל מקצוע (לפי ההקבצה והמגמה של התלמיד). שני מורים באותו מקצוע → "א / ב"
    const teachers = {};
    for (let d = 0; d < 6; d++) for (const l of lessonsOfDay(days, d, profile, D)) {
      const w = String(l.w || "").replace(/\s*\(.*\)\s*$/, "").trim();
      if (w) (teachers[l.n] = teachers[l.n] || new Set()).add(w);
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
      return { name: n, teacher: teachers[n] ? [...teachers[n]].join(" / ") : "", nonBagrut: nonBagrut.includes(n), yearTotal: total, held: h, remaining: total - h, ...s, counted, pct, limit, allowedLeft, status,
        needConsecutive, weeksToRecover: weekly ? Math.ceil(needConsecutive / weekly) : null, weekly };
    }).sort((a, b) => (b.pct - a.pct) || a.name.localeCompare(b.name, "he"));

    return {
      asOf, subjects, unmatched: Object.entries(unmatched).map(([subject, absences]) => ({ subject, absences })),
      patterns: patterns(absEvents), thisWeek: thisWeek(subjects, days, profile, D, Y, weekFrom || asOf),
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
      const lesson = e.lesson == null || e.lesson === "" ? NaN : Number(e.lesson);
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
    // כולל גם חיסורים שמשוב לא מציין אם הם מוצדקים, לכן "לא מסומנים כמוצדקים" ולא "לא מוצדקים"
    const notJ = ev.filter(e => e.justified !== true).length;
    if (notJ >= 3 && ev.some(e => e.justified === true)) out.push({ icon: "📝", title: "יש חיסורים שאפשר אולי להצדיק", text: `${notJ} חיסורים לא מסומנים כמוצדקים. אם חלק מהם היו בגלל תור, מחלה או אירוע משפחתי, בקש מההורים לשלוח אישור.` });
    const bad = subjects.filter(s => !s.nonBagrut && (s.status === "red" || s.status === "lost"));
    if (bad.length) out.push({ icon: "🗣️", title: "שיחה עם המורה", text: `ב${bad.map(s => s.name).join(", ")} כדאי לדבר עם המורה עכשיו, לפני שזה נהיה סופי. מורים מעריכים תלמיד שבא לבד עם תוכנית.` });
    return out;
  }


  // ===== רצפים, אירועי התנהגות והישגים =====

  // סוג אירוע ממשוב, לצורך תגובה מתאימה ותצוגה
  function behaviorKind(ev) {
    const t = String(ev.type || "").replace(/["״׳']/g, "");
    if (/צלש|שבח|חיזוק חיובי|הצטיינות|מצוינות|כל הכבוד|מחמאה|הערה חיובית/.test(t)) return "praise";
    if (/חיסור|נעדר|היעדר|העדר|לא נכח/.test(t)) return "absence";
    if (/איחור/.test(t)) return "late";
    if (/הפרעה|התנהגות|הוצא|חוצפה|טלפון|נייד|אלימות|הערה שלילית/.test(t)) return "disrupt";
    if (/שיעורי בית|שב |לא הכין|הכנת|הגשה/.test(t + " ")) return "homework";
    if (/ציוד|ספר|מחברת/.test(t)) return "gear";
    if (/תלבושת|לבוש/.test(t)) return "uniform";
    return "other";
  }

  // ציר הזמן של השיעורים שהיו: כל שיעור (בלוק) עם מצב – הגיע / חיסור / מוצדק / איחור + אירועים
  // until: תאריך אחרון (כולל), untilMin: שעה ביום האחרון (שיעור נספר רק אם הסתיים)
  function timeline({ days, profile: p, data: D, year: Y, behave, until, untilMin = 24 * 60 }) {
    const end = until > Y.end ? Y.end : until;
    const blocks = [];
    for (let iso = Y.start; iso <= end; iso = addDays(iso, 1)) {
      if (!isSchoolDay(iso, Y)) continue;
      for (const l of lessonsOfDay(days, dateOf(iso).getDay(), p, D)) {
        if (iso === end && toMin(l.e) > untilMin) continue;
        blocks.push({ date: iso, s: l.s, e: l.e, n: l.n, periods: periodsOf(l), missed: false, justified: null, late: false, events: [] });
      }
    }
    const names = [...new Set(blocks.map(b => b.n))];
    const byKey = {};
    for (const b of blocks) (byKey[b.date + "|" + b.n] = byKey[b.date + "|" + b.n] || []).push(b);
    const sorted = (behave || []).filter(e => e.date && e.date >= Y.start && e.date <= end)
      .slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (Number(a.lesson) || 0) - (Number(b.lesson) || 0));
    const used = {}; // כמה שעות חיסור כבר "נצרכו" לכל תאריך+מקצוע
    const unmatched = [];
    for (const ev of sorted) {
      const kind = behaviorKind(ev);
      const subj = matchSubject(ev.subject, names);
      const list = subj ? byKey[ev.date + "|" + subj] : null;
      if (!list) { unmatched.push({ ...ev, kind }); continue; }
      const k = ev.date + "|" + subj;
      if (kind === "absence") {
        // מחלקים את שעות החיסור לפי סדר השיעורים באותו יום (שיעור כפול = 2 שעות)
        const n = used[k] = (used[k] || 0) + 1;
        let acc = 0, target = list[list.length - 1];
        for (const b of list) { acc += b.periods; if (n <= acc) { target = b; break; } }
        target.missed = true;
        const j = classify(ev).justified;
        target.justified = target.justified === false ? false : j === true ? true : (j === false ? false : target.justified);
        target.events.push({ ...ev, kind, subject: subj });
      } else {
        const b = list.find(x => !x.events.some(e => e.kind === kind)) || list[0];
        if (kind === "late") b.late = true;
        b.events.push({ ...ev, kind, subject: subj });
      }
    }
    return { blocks, unmatched };
  }

  // רצף שיעורים: חיסור לא מוצדק שובר, חיסור מוצדק מקפיא, איחור שומר בלי להוסיף
  function streaks(blocks) {
    let current = 0, best = 0, lastBreak = null, frozen = 0, sinceBreak = 0;
    for (const b of blocks) {
      if (b.missed && b.justified !== true) {
        if (current > 0) lastBreak = { date: b.date, subject: b.n, lost: current };
        else if (!lastBreak) lastBreak = { date: b.date, subject: b.n, lost: 0 };
        else lastBreak = { ...lastBreak, date: b.date, subject: b.n };
        current = 0; sinceBreak = 0;
      } else if (b.missed) frozen++;
      else if (!b.late) { current++; sinceBreak++; best = Math.max(best, current); }
    }
    const held = blocks.length, missed = blocks.filter(b => b.missed).length;
    return { current, best, lastBreak, frozen, sinceBreak, held, attendedPct: held ? (held - missed) / held : 1 };
  }

  // רצף צל"שים: צל"שים רצופים בלי הפרעה באמצע
  function praiseStreak(blocks) {
    const evs = blocks.flatMap(b => b.events.filter(e => e.kind === "praise" || e.kind === "disrupt"));
    let cur = 0, best = 0, total = 0;
    for (const e of evs) { if (e.kind === "praise") { cur++; total++; best = Math.max(best, cur); } else cur = 0; }
    return { current: cur, best, total };
  }

  const TIERS = [
    { min: 30, name: "אש כחולה", cls: "blue", msg: "רצף אדיר 💙" },
    { min: 15, name: "בוער", cls: "big", msg: "רצף חזק, עוד קצת לאש הכחולה" },
    { min: 5, name: "דולק", cls: "mid", msg: "האש תופסת, תמשיך ככה" },
    { min: 1, name: "ניצוץ", cls: "small", msg: "התחלה טובה" },
    { min: 0, name: "גחלים", cls: "ash", msg: "השיעור הבא מתחיל רצף חדש" },
  ];
  const tierOf = n => TIERS.find(t => n >= t.min);

  // רצף לכל מקצוע בנפרד: כל מקצוע עם הרצף, השיא והשבירה האחרונה שלו
  function subjectStreaks(blocks) {
    const by = {};
    for (const b of blocks) (by[b.n] = by[b.n] || []).push(b);
    const out = {};
    for (const n in by) out[n] = streaks(by[n]);
    return out;
  }

  // מה עונים על כל סוג אירוע
  const EVENT_UI = {
    praise: { icon: "⭐", label: "צל\"ש", say: ["אלוף! המורה שם לב אליך 🌟", "צל\"ש! תשמור את זה להורים 😎", "ככה עושים את זה 👏"] },
    disrupt: { icon: "⚠️", label: "הפרעה", say: ["קורה. מחר דף חדש", "שיעור אחד לא מגדיר אותך. בשיעור הבא תראה למורה", "שווה לעשות סבב שקט כמה שיעורים"] },
    homework: { icon: "📚", label: "שיעורי בית", say: ["10 דקות בערב חוסכות את זה", "אפשר לבקש מחבר לשלוח צילום של המשימה"] },
    gear: { icon: "🎒", label: "ציוד", say: ["רשימת \"מה להביא מחר\" במסך הראשי בדיוק בשביל זה", "תיק מוכן מהערב = אפס בעיות"] },
    uniform: { icon: "👕", label: "תלבושת", say: ["שווה להכין בגדים מהערב"] },
    late: { icon: "⏰", label: "איחור", say: ["הרצף נשמר, אבל לא גדל. בפעם הבאה בזמן", "עוד 5 דקות שינה לא שוות את זה"] },
    absence: { icon: "❌", label: "חיסור", say: ["הרצף נשבר. בונים מחדש מהשיעור הבא", "שיעור אחד פספסת. העיקר לחזור מחר"] },
    absenceJ: { icon: "🩺", label: "חיסור מוצדק", say: ["חיסור מוצדק: הרצף מוקפא, לא נשבר ❄️"] },
    other: { icon: "📝", label: "", say: [""] },
  };

  // עידוד לפי מצב מקצוע
  function cheer(s) {
    if (s.status === "early") return "עוד מוקדם לשפוט, אבל ההתחלה טובה";
    if (s.status === "green" && s.absences === 0) return "מושלם! אף חיסור 💯";
    if (s.status === "green") return ["מצוין, תמשיך ככה 💪", "כל הכבוד, אתה בשליטה", "ירוק ובטוח 👌"][s.name.length % 3];
    if (s.status === "orange") return "שים לב, זה מתחיל להתקרב. לא מפספסים השבוע";
    if (s.status === "red") return "מצב חילוץ: כל שיעור עכשיו חשוב";
    return "עבר את ה-30%. צריך לדבר עם המחנך עכשיו";
  }

  const api = { analyze, classify, matchSubject, periodsOf, isSchoolDay, periodsBetween, lessonsOfDay, statusOf, LIMIT, RED, ORANGE,
    behaviorKind, timeline, streaks, subjectStreaks, praiseStreak, tierOf, TIERS, EVENT_UI, cheer };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Absences = api;
})(typeof window !== "undefined" ? window : globalThis);
