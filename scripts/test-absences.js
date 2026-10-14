// בדיקות לחישוב החיסורים (absences.js) עם נתוני דוגמה. node scripts/test-absences.js
const D = require("../data.js");
const A = require("../absences.js");
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };

const profile = { cls: "y1", eng: "hadad", math: "adir", major: "phys" };
const base = { days: D.DAYS_Y1, profile, data: D, year: D.SCHOOL_YEAR, nonBagrut: D.NON_BAGRUT };

// 1. לוח השנה
ok("Yom Kippur (Mon 21.9) is not a school day", !A.isSchoolDay("2026-09-21", D.SCHOOL_YEAR));
ok("Friday is not a school day", !A.isSchoolDay("2026-10-16", D.SCHOOL_YEAR));
ok("a regular Sunday is a school day", A.isSchoolDay("2026-10-11", D.SCHOOL_YEAR));
ok("double lesson = 2 periods", A.periodsOf({ s: "08:55", e: "10:15" }) === 2 && A.periodsOf({ s: "12:00", e: "12:45" }) === 1 && A.periodsOf({ s: "13:45", e: "16:15" }) === 3);

// 2. ללא חיסורים
const r0 = A.analyze({ ...base, behave: [], today: "2026-11-15" });
const gm0 = r0.subjects.find(s => s.name === "גמרא");
ok("Gemara year total ≈ weekly periods × 33–38 school weeks", gm0.yearTotal >= gm0.weekly * 33 && gm0.yearTotal <= gm0.weekly * 38, `total=${gm0.yearTotal} weekly=${gm0.weekly}`);
ok("held so far < year total", gm0.held > 0 && gm0.held < gm0.yearTotal, `held=${gm0.held}`);
ok("major shows as פיזיקה, not 'מגמה'", r0.subjects.some(s => s.name === "פיזיקה") && !r0.subjects.some(s => s.name === "מגמה"));
ok("no absences → green", gm0.status === "green" && gm0.allowedLeft === Math.floor(0.3 * gm0.yearTotal));

// 3. הרבה חיסורים בגמרא → אדום + חילוץ
const today = "2026-11-15";
const held = gm0.held;
const nRed = Math.ceil(held * 0.28);
const ev = [];
let d = "2026-09-01", count = 0;
while (count < nRed) { // חיסורים בבוקר, שעה 1, בימי לימודים
  if (A.isSchoolDay(d, D.SCHOOL_YEAR)) { ev.push({ date: d, lesson: 1, subject: "גמרא", type: "חיסור", justificationId: 0, justification: "" }); count++; }
  const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); d = x.toISOString().slice(0, 10);
}
ev.push({ date: "2026-10-12", lesson: 3, subject: "גמרא", type: "איחור", justificationId: 0 });
ev.push({ date: "2026-10-13", lesson: 4, subject: "גמרא", type: "הפרעה", justificationId: 0 });
const r1 = A.analyze({ ...base, behave: ev, today });
const gm1 = r1.subjects.find(s => s.name === "גמרא");
ok("28% absences → red", gm1.status === "red", `pct=${(gm1.pct * 100).toFixed(1)}% absences=${gm1.absences}/${gm1.held}`);
ok("lates and other events are not counted as absences", gm1.absences === nRed && gm1.lates === 1);
ok("rescue: consecutive lessons needed brings it to ≤25%", gm1.needConsecutive > 0 && gm1.counted / (gm1.held + gm1.needConsecutive) <= 0.25 && gm1.counted / (gm1.held + gm1.needConsecutive - 1) > 0.25, `need=${gm1.needConsecutive} weeks≈${gm1.weeksToRecover}`);
ok("allowedLeft = floor(30% of year) − absences", gm1.allowedLeft === Math.floor(0.3 * gm1.yearTotal) - gm1.counted, `allowed=${gm1.allowedLeft}`);
ok("morning-pattern tip appears", r1.tips.some(t => t.title.includes("בבוקר")));
ok("teacher-talk tip names Gemara", r1.tips.some(t => t.text.includes("גמרא")));
ok("this week lists Gemara with times", r1.thisWeek.some(w => w.name === "גמרא" && w.when.length > 0), JSON.stringify(r1.thisWeek[0]));

// 4. מוצדקים: ספירה או לא
const evJ = ev.map((e, i) => i % 2 ? { ...e, justificationId: 5, justification: "מחלה" } : e);
const withJ = A.analyze({ ...base, behave: evJ, today, countJustified: true }).subjects.find(s => s.name === "גמרא");
const noJ = A.analyze({ ...base, behave: evJ, today, countJustified: false }).subjects.find(s => s.name === "גמרא");
ok("justified split detected", withJ.justified > 0 && withJ.unjustified > 0 && withJ.justified + withJ.unjustified === withJ.absences);
ok("excluding justified lowers the count", noJ.counted < withJ.counted && noJ.pct < withJ.pct);

// 5. אבוד: יותר מ-30% מכל השנה
const evLost = [];
for (let i = 0; i < Math.floor(0.3 * gm0.yearTotal) + 3; i++) evLost.push({ date: "2026-10-1" + (i % 5), lesson: 2, subject: "גמרא", type: "חיסור" });
const lost = A.analyze({ ...base, behave: evLost, today }).subjects.find(s => s.name === "גמרא");
ok("more than 30% of the whole year → lost", lost.status === "lost" && lost.allowedLeft < 0);

// 6. התאמת שמות ממשוב
const names = Object.keys(A.periodsBetween(D.DAYS_Y1, profile, D, D.SCHOOL_YEAR, "2026-09-01", "2027-06-20"));
ok("'תנ\"ך' with different quotes matches", A.matchSubject("תנ״ך", names) === 'תנ"ך');
ok("'מתמטיקה 5 יח\\'' matches מתמטיקה", A.matchSubject("מתמטיקה 5 יח'", names) === "מתמטיקה");
ok("'תפילה' maps to תפילת שחרית", A.matchSubject("תפילה", names) === "תפילת שחרית");
ok("unknown subject → null (reported as unmatched)", A.matchSubject("כימיה", names) === null);
const r2 = A.analyze({ ...base, behave: [{ date: "2026-10-12", subject: "כימיה", type: "חיסור" }], today });
ok("unmatched subjects are listed", r2.unmatched.length === 1 && r2.unmatched[0].subject === "כימיה");

// 7. מקצועות בלי בגרות
ok("prayers flagged as non-bagrut", r0.subjects.find(s => s.name === "תפילת שחרית").nonBagrut === true);

// 8. סיווג
ok("classify: justificationId>0 → justified", A.classify({ type: "חיסור", justificationId: 3 }).justified === true);
ok("classify: 'לא מוצדק' text → unjustified", A.classify({ type: "חיסור", justificationId: 3, justification: "לא מוצדק" }).justified === false);
ok("classify: boolean justified wins", A.classify({ type: "חיסור", justified: true, justificationId: 0 }).justified === true);

// ===== רצפים, אירועים והישגים =====
const TL = (behave, until = "2026-10-15", untilMin) => A.timeline({ days: D.DAYS_Y1, profile, data: D, year: D.SCHOOL_YEAR, behave, until, untilMin });
const t0 = TL([]);
ok("timeline: no lessons on holidays (Yom Kippur 21.9)", !t0.blocks.some(b => b.date === "2026-09-21"));
ok("timeline: ends at 'until', and on that day only lessons that already ended", !t0.blocks.some(b => b.date > "2026-10-15") && !TL([], "2026-10-15", 9 * 60).blocks.some(b => b.date === "2026-10-15" && b.s >= "08:55"));
const s0 = A.streaks(t0.blocks);
ok("no absences → streak = all lessons held", s0.current === t0.blocks.length && s0.best === s0.current && s0.lastBreak === null, `streak=${s0.current}`);

// חיסור לא מוצדק שובר
const firstGemara = t0.blocks.find(b => b.n === "גמרא" && b.date >= "2026-10-11");
const idx = t0.blocks.indexOf(firstGemara);
const sBreak = A.streaks(TL([{ date: firstGemara.date, subject: "גמרא", type: "חיסור", lesson: 3 }]).blocks);
ok("unjustified absence breaks the streak", sBreak.current === t0.blocks.length - idx - 1 && sBreak.lastBreak.lost === idx && sBreak.lastBreak.subject === "גמרא", `lost=${sBreak.lastBreak.lost} now=${sBreak.current}`);
// מוצדק מקפיא
const sFreeze = A.streaks(TL([{ date: firstGemara.date, subject: "גמרא", type: "חיסור", justificationId: 4, justification: "מחלה" }]).blocks);
ok("justified absence freezes (no break, no +1)", sFreeze.lastBreak === null && sFreeze.frozen === 1 && sFreeze.current === t0.blocks.length - 1);
// איחור שומר
const sLate = A.streaks(TL([{ date: firstGemara.date, subject: "גמרא", type: "איחור" }]).blocks);
ok("late keeps the streak but doesn't add", sLate.lastBreak === null && sLate.current === t0.blocks.length - 1);

// שיעור כפול: ביום ראשון בי'1 יש גמרא 10:30–11:55 (2 שעות) ו-14:30–15:15 (שעה)
const sun = "2026-10-11";
const two = TL([1, 2].map(l => ({ date: sun, subject: "גמרא", type: "חיסור", lesson: l }))).blocks.filter(b => b.date === sun && b.n === "גמרא");
ok("2 absence periods → only the double Gemara block is missed", two.length === 2 && two[0].missed && !two[1].missed);
const three = TL([1, 2, 5].map(l => ({ date: sun, subject: "גמרא", type: "חיסור", lesson: l }))).blocks.filter(b => b.date === sun && b.n === "גמרא");
ok("3 absence periods → both Gemara blocks missed", three[0].missed && three[1].missed);

// סוגי אירועים
ok("behaviorKind: צל\"ש / הפרעה / שיעורי בית / ציוד / איחור / חיסור",
  A.behaviorKind({ type: "צל\"ש" }) === "praise" && A.behaviorKind({ type: "צל״ש" }) === "praise" && A.behaviorKind({ type: "הפרעה בשיעור" }) === "disrupt" &&
  A.behaviorKind({ type: "אי הכנת שיעורי בית" }) === "homework" && A.behaviorKind({ type: "חוסר ציוד" }) === "gear" &&
  A.behaviorKind({ type: "איחור" }) === "late" && A.behaviorKind({ type: "חיסור" }) === "absence");
const evs = [["2026-10-05", "צל\"ש"], ["2026-10-07", "צל\"ש"], ["2026-10-11", "הפרעה בשיעור"], ["2026-10-12", "צל\"ש"]].map(([date, type]) => ({ date, type, subject: "גמרא", lesson: 2 }));
const tlE = TL(evs);
const pr = A.praiseStreak(tlE.blocks);
ok("praise streak: 2 in a row, broken by disruption", pr.best === 2 && pr.current === 1 && pr.total === 3, JSON.stringify(pr));
ok("events attached to the right lesson", tlE.blocks.filter(b => b.events.length).every(b => b.n === "גמרא"));

// הישגים
const ach = A.achievements({ blocks: tlE.blocks, streak: A.streaks(tlE.blocks), praise: pr, subjects: r0.subjects });
const got = id => ach.find(a => a.id === id).got;
ok("achievements: streak10, perfect week, praise1, praisePair earned; streak200 matches the real streak; triple and comeback not", got("streak10") && got("perfectWeek") && got("praise1") && got("praisePair") && got("streak200") === (A.streaks(tlE.blocks).best >= 200) && !got("praiseTriple") && !got("comeback"));
ok("achievements: progress is between 0 and 1", ach.every(a => a.progress >= 0 && a.progress <= 1));
ok("fire tiers", A.tierOf(0).cls === "ash" && A.tierOf(3).cls === "small" && A.tierOf(12).cls === "mid" && A.tierOf(20).cls === "big" && A.tierOf(40).cls === "blue");
