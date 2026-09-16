// מחולל קובצי היומן: מייצר את cal/<כיתה>-<אנגלית>-<מתמטיקה>-<פיזיקה>.ics
// מאותם נתונים שהאפליקציה משתמשת בהם (data.js). רץ אוטומטית בפריסה לנטליפיי.
//   node gen-cal.js            – יצירה
//   node gen-cal.js --check    – רק בדיקה שהקבצים בתיקייה מעודכנים (יוצא עם שגיאה אם לא)
const fs = require("fs");
const path = require("path");
const { ENG, MATH, DAYS_Y1, DAYS_Y2, CLASSES_META, DEFAULT_GEAR } = require("./data.js");
const { BOARD } = require("./board.js");

const OUT_DIR = path.join(__dirname, "cal");
const WEEK_START = new Date(2026, 8, 13);      // ראשון 13.9.2026 – השבוע הראשון של המערכת
const UNTIL = "20270620T235959Z";               // סוף שנת הלימודים
const PHYS_TEACHER = "יבגני קלנר";
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
// חותמת זמן אחת לכל ריצה. אפשר לקבע עם ICS_STAMP=20260916T080000Z
const STAMP = process.env.ICS_STAMP || new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

const pad = n => String(n).padStart(2, "0");
const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const gearOf = n => (DEFAULT_GEAR[n] || "").split(/[,\n]/).map(x => x.trim()).filter(Boolean);

function resolve(l, p) {
  if (l.key === "eng") return { ...l, w: ENG[p.eng] };
  if (l.key === "math") return { ...l, w: MATH[p.math] };
  if (l.key === "phys") return p.phys === "yes" ? { ...l, n: "פיזיקה", w: PHYS_TEACHER } : null; // בלי פיזיקה – אין אירוע
  return l;
}

function buildICS(p) {
  const days = p.cls === "y1" ? DAYS_Y1 : DAYS_Y2;
  const combo = `${p.cls}-${p.eng}-${p.math}-${p.phys}`;
  const out = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//maarechet//HE", "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:המערכת ${CLASSES_META[p.cls].label}`, "X-WR-TIMEZONE:Asia/Jerusalem",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H",
  ];
  days.forEach((d, di) => {
    if (!d.lessons) return;
    const date = new Date(WEEK_START); date.setDate(date.getDate() + di);
    const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    d.lessons.forEach((raw, li) => {
      const l = resolve(raw, p);
      if (!l) return;
      const g = gearOf(l.n);
      const desc = [l.w, g.length ? "להביא: " + g.join(", ") : ""].filter(Boolean).join("\n");
      out.push(
        "BEGIN:VEVENT",
        `UID:${combo}-${di}-${li}@maarechet`,
        `DTSTAMP:${STAMP}`,
        `DTSTART;TZID=Asia/Jerusalem:${ymd}T${l.s.replace(":", "")}00`,
        `DTEND;TZID=Asia/Jerusalem:${ymd}T${l.e.replace(":", "")}00`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[di]};UNTIL=${UNTIL}`,
        `SUMMARY:${esc(l.n)}`,
        desc ? `DESCRIPTION:${esc(desc)}` : "",
        "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", `DESCRIPTION:${esc(l.n)} מתחיל בעוד 10 דקות`, "END:VALARM",
        "END:VEVENT",
      );
    });
  });
  // 🎒 תזכורת ערב: מה להביא מחר (20:45 בערב שלפני כל יום לימודים)
  days.forEach((d, di) => {
    if (!d.lessons) return;
    const eve = (di + 6) % 7;                       // הערב שלפני: ראשון ← שבת בערב
    const date = new Date(WEEK_START); date.setDate(date.getDate() + eve);
    const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const gear = [...new Set(d.lessons.map(l => resolve(l, p)).filter(Boolean).flatMap(l => gearOf(l.n)))];
    if (!gear.length) return;
    out.push("BEGIN:VEVENT", `UID:${combo}-gear-${di}@maarechet`, `DTSTAMP:${STAMP}`,
      `DTSTART;TZID=Asia/Jerusalem:${ymd}T204500`, `DTEND;TZID=Asia/Jerusalem:${ymd}T205000`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[eve]};UNTIL=${UNTIL}`,
      `SUMMARY:🎒 מחר להביא (${d.name})`, `DESCRIPTION:${esc(gear.join(", "))}`,
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:מחר להביא: ${esc(gear.join(", "))}`, "END:VALARM", "END:VEVENT");
  });
  // 📝 מבחנים והודעות מלוח הכיתה (אירועי יום שלם, תזכורת בערב שלפני)
  BOARD.filter(b => b.date && (b.cls === "all" || b.cls === p.cls)).forEach((b, i) => {
    const ymd = b.date.replace(/-/g, "");
    const next = new Date(b.date + "T12:00:00"); next.setDate(next.getDate() + 1);
    const ymd2 = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
    out.push("BEGIN:VEVENT", `UID:${combo}-board-${i}-${ymd}@maarechet`, `DTSTAMP:${STAMP}`,
      `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${ymd2}`,
      `SUMMARY:${b.type === "test" ? "📝 " : "📌 "}${esc(b.title)}`, b.detail ? `DESCRIPTION:${esc(b.detail)}` : "",
      ...(b.type === "test" ? ["BEGIN:VALARM", "TRIGGER:-PT4H", "ACTION:DISPLAY", `DESCRIPTION:מחר ${esc(b.title)}`, "END:VALARM"] : []),
      "END:VEVENT");
  });
  out.push("END:VCALENDAR");
  return out.filter(Boolean).join("\r\n");
}

const check = process.argv.includes("--check");
fs.mkdirSync(OUT_DIR, { recursive: true });
let written = 0, stale = 0;
for (const cls of Object.keys(CLASSES_META))
  for (const eng of Object.keys(ENG))
    for (const math of Object.keys(MATH))
      for (const phys of ["yes", "no"]) {
        const file = path.join(OUT_DIR, `${cls}-${eng}-${math}-${phys}.ics`);
        const text = buildICS({ cls, eng, math, phys });
        if (check) {
          const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
          const strip = t => t.replace(/^DTSTAMP:.*$/gm, "");
          if (strip(cur) !== strip(text)) { stale++; console.error("stale:", path.basename(file)); }
        } else { fs.writeFileSync(file, text); written++; }
      }
if (check) { console.log(stale ? `${stale} files out of date` : "all 36 calendar files up to date"); process.exit(stale ? 1 : 0); }
console.log(`wrote ${written} calendar files to cal/`);
