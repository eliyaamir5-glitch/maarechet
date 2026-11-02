// 🤖 מערכתי – העוזר של האפליקציה.
// שני מוחות: "המוח המהיר" (כאן, בטלפון, בחינם ובלי אינטרנט) מבין פקודות ושאלות על המערכת,
// ו"המוח החכם" (AI דרך השרת, עד 20 שאלות ביום) לשאלות פתוחות. שניהם מחזירים פעולה מתוך רשימה סגורה,
// והעוזר "לוחץ" בשביל התלמיד – גם בדפים אחרים (הפעולה נשמרת, עוברים דף, וממשיכים שם).
(function (root) {
"use strict";
const isNode = typeof document === "undefined";
// ===================== עזרים לעברית =====================
const FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
function norm(s) {
  return String(s || "").toLowerCase().replace(/[\u0591-\u05C7]/g, "").replace(/[ךםןףץ]/g, c => FINALS[c])
    .replace(/["'׳״`]/g, "").replace(/[?!.,:;()\[\]{}…–—\-_/\\|]+/g, " ").replace(/\s+/g, " ").trim();
}
const PREFIX = ["ו", "ה", "ב", "ל", "מ", "ש", "כ"];
// "ולנגזרת" → ["ולנגזרת","לנגזרת","נגזרת"]: מסירים עד 3 אותיות שימוש מההתחלה
const FCACHE = new Map();
function forms(w) {
  if (FCACHE.has(w)) return FCACHE.get(w);
  const base = [w]; let x = w;
  for (let i = 0; i < 3 && PREFIX.includes(x[0]) && (x.length > 3 || /^\D\d+$/.test(x)); i++) { x = x.slice(1); base.push(x); } // "ב30" → "30"
  const out = new Set(base);
  for (const b of base) { // רבים/נקבה → בערך הבסיס: "משוואות"→"משווא", "משוואה"→"משווא"
    if (b.length > 4 && /ימ$|ות$/.test(b)) out.add(b.slice(0, -2));
    if (b.length > 3 && /ה$|ת$/.test(b)) out.add(b.slice(0, -1));
  }
  const r = [...out]; if (FCACHE.size > 3000) FCACHE.clear(); FCACHE.set(w, r); return r;
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// האם מילה מהשאלה מתאימה למילה מהביטוי (עם אותיות שימוש ושגיאת כתיב קטנה)
function wordHit(qw, pw) {
  const fq = forms(qw), fp = forms(pw);
  if (fq.some(a => fp.includes(a))) return 1;
  if (pw.length >= 4 && fq.some(a => a.length >= 4 && lev(a, pw) <= (pw.length >= 7 ? 2 : 1))) return 0.8;
  return 0;
}
// כמה מהביטוי נמצא בשאלה: 0..1 (ביטוי של כמה מילים צריך את כולן)
function phraseScore(qWords, phrase) {
  const pws = phrase.split(" ").filter(Boolean); let sum = 0;
  for (const pw of pws) { let best = 0; for (const qw of qWords) best = Math.max(best, wordHit(qw, pw)); if (!best) return 0; sum += best; }
  return sum / pws.length;
}
// ===================== ישויות: מקצוע, יום, רמה, צבע, מורה, תרגיל =====================
const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const LEVEL_WORDS = [[1, ["מתחיל", "מתחילים", "קל", "קלה", "בסיסי", "בסיס"]], [2, ["מתאמן", "רגיל", "רגילה", "בינוני", "בינונית"]], [3, ["מתקדם", "מתקדמים", "קשה", "מבחן"]], [4, ["אלוף", "אלופים", "פרו", "הכי קשה", "בגרות", "מומחה"]]];
const COLORS = { purple: ["סגול", "סגולה"], ocean: ["כחול", "ים", "תכלת"], forest: ["ירוק", "יער"], sunset: ["כתום", "אדום", "שקיעה", "צהוב"], rose: ["ורוד", "ורודה"], night: ["לילה", "כהה", "שחור", "חושך", "dark"] };
const SUBJ_ALIAS = { "מתמטיקה": ["מתמטיקה", "מתמטיקא", "חשבון", "מתמט", "מתמ"], "אנגלית": ["אנגלית", "אנגלי", "english"], "תנ\"ך": ["תנך", "תנ\"ך", "תורה שבכתב"], "היסטוריה": ["היסטוריה", "הסטוריה"],
  "גמרא": ["גמרא", "גמ"], "לשון": ["לשון", "עברית"], "ספרות": ["ספרות"], "חינוך גופני": ["ספורט", "חינוך גופני", "התעמלות", "חנג"], "אזרחות": ["אזרחות"], "מבוא למדעים": ["מדעים"], "פיזיקה": ["פיזיקה", "פיסיקה"],
  "מדעי המחשב": ["מחשבים", "מדעי המחשב", "תכנות"], "כלכלה": ["כלכלה", "מנהל וכלכלה"], "מחשבת ישראל": ["מחשבת ישראל", "מחשבת"], "תורה": ["תורה"], "נביא": ["נביא", "נביאים"] };
function subjectsKnown() { // מהמערכת של התלמיד, אם יש
  const out = new Set(Object.keys(SUBJ_ALIAS));
  try { if (typeof DAYS !== "undefined" && typeof lessonsOf === "function") for (const d of DAYS) if (d && d.lessons) for (const l of lessonsOf(d)) if (l && l.n) out.add(l.n); } catch (e) {}
  return [...out];
}
function findSubject(qn) {
  const qWords = qn.split(" ");
  let best = null, bs = 0;
  for (const s of subjectsKnown()) {
    const names = [s, ...(SUBJ_ALIAS[s] || [])].map(norm);
    for (const n of names) { const sc = phraseScore(qWords, n) * (n.length >= 4 ? 1 : 0.9); if (sc > bs) { bs = sc; best = s; } }
  }
  return bs >= 0.8 ? best : null;
}
function findDay(qn) {
  for (let i = 0; i < 7; i++) if (new RegExp("(^| )(ב|ל|ו)?(יומ )?" + norm(DAYS_HE[i]) + "( |$)").test(qn)) return { day: i }; // יום מסוים קודם ל"היום"
  if (/(^| )(מחרתיימ|למחרתיימ)( |$)/.test(qn)) return { rel: 2 };
  if (/(^| )(מחר|למחר|ומחר)( |$)/.test(qn)) return { rel: 1 };
  if (/(^| )(היומ|להיומ)( |$)/.test(qn)) return { rel: 0 };
  return null;
}
function findLevel(qn) { for (const [L, ws] of LEVEL_WORDS) if (ws.some(w => (" " + qn + " ").includes(" " + norm(w) + " ") || qn.split(" ").some(x => forms(x).includes(norm(w))))) return L; return null; }
function findColor(qn) { for (const [k, ws] of Object.entries(COLORS)) if (qn.split(" ").some(x => ws.some(w => forms(x).includes(norm(w))))) return k; return null; }
// תרגיל לחישוב: "כמה זה 5 כפול 7", "15% מ-200", "שורש של 144"
function mathExpr(q) {
  let s = " " + String(q).replace(/[?？]/g, " ").replace(/(\d+(?:\.\d+)?)\s*(אחוז|אחוזים)/g, "$1%") + " ";
  const pm = s.match(/(\d+(?:\.\d+)?)\s*%\s*(?:מ|מתוך|של)\s*-?\s*(\d+(?:\.\d+)?)/);
  if (pm) return `${pm[1]}%*${pm[2]}`;
  s = s.replace(/כפול|כפל|פעמים/g, "*").replace(/חלקי|לחלק ב|מחולק ב/g, "/").replace(/ועוד|פלוס/g, "+").replace(/פחות|מינוס/g, "-")
    .replace(/בריבוע/g, "^2").replace(/בשלישית|בחזקת שלוש/g, "^3").replace(/בחזקת/g, "^").replace(/שורש(?: של)?/g, "√").replace(/פאי/g, "π")
    .replace(/(כמה זה|כמה יוצא|תחשב לי|תחשב|חשב|מה התוצאה של|מה זה|כמה)/g, " ");
  const t = s.replace(/\s+/g, "");
  if (/[א-ת]/.test(t) || !/\d/.test(t) || !/[-+*/^√%!×÷]|sin|cos|tan|log/.test(t) || /[=<>x]/i.test(t)) return null;
  return t;
}
// משוואה/ביטוי עם x: "תפתור 2x+3=11"
function equation(q) { const m = String(q).match(/[0-9xX+\-*/^().=²³√ <>≤≥]{3,}/g); if (!m) return null; const e = m.map(x => x.trim()).sort((a, b) => b.length - a.length)[0]; return /x/i.test(e) && /\d/.test(e) ? e.replace(/X/g, "x").replace(/\s+/g, "") : null; }
// ===================== הפעולות שהעוזר יודע לעשות =====================
// כל פעולה: page = באיזה דף היא רצה, run = מה עושים שם (צעדים עם "אצבע" שלוחצת)
const ACT = {}; const A = (id, o) => (ACT[id] = { id, ...o });
const ix = "index.html", calc = "calc.html";
A("home", { page: ix, label: "המסך הראשי", run: async () => scrollTop() });
A("profile", { page: ix, label: "הפרופיל", run: async a => { await call("openProfile"); if (a) await openSec(a); } });
A("edit", { page: ix, label: "עריכת פרטים והקבצות", run: async () => { await call("openProfile"); await tap("#pfEdit"); } });
A("photo", { page: ix, label: "תמונת פרופיל", run: async () => { await call("openProfile"); await glow("#pfAv"); } });
A("theme", { page: null, label: "צבע לאפליקציה", run: async a => { if (a && root.Theme) { Theme.setTheme(a); return; } await act("profile", "theme"); } });
A("bigtext", { page: null, label: "טקסט גדול", run: async a => { if (root.Theme) Theme.setBig(a !== "off"); } });
A("push", { page: ix, label: "התראות", run: async () => { await call("openProfile"); await glow("#pfPush"); } });
A("calendar", { page: ix, label: "הוספה ליומן", run: async () => tap("#calBtn") });
A("install", { page: ix, label: "התקנה למסך הבית", run: async () => call("openInstall") });
A("whatsnew", { page: ix, label: "מה חדש", run: async () => call("openWhatsNew", true) });
A("intro", { page: ix, label: "ההיכרות הקצרה", run: async () => call("openIntro") });
A("feedback", { page: ix, label: "רעיון או תקלה", run: async a => call("openFeedback", a === "bug" ? "bug" : "idea") });
A("ask", { page: ix, label: "שאלה לצוות (בלי שם)", run: async () => call("openAsk") });
A("image", { page: ix, label: "המערכת כתמונה", run: async () => tap("#imgBtn") });
A("parents", { page: ix, label: "קישור להורים", run: async () => { await call("openProfile"); await openSec("parent"); await glow("#pfParent"); } });
A("recap", { page: ix, label: "הסיכום החודשי", run: async () => { if (typeof recapDue === "function" && recapDue()) return call("openRecap"); say("הסיכום מוכן רק בימים 1–10 בכל חודש (ובסוף השנה). אני אזכיר לך 😉"); } });
A("mashov", { page: ix, label: "חיבור משוב", run: async () => { await call("openProfile"); await openSec("mashov"); if (document.querySelector("#pfMsOn")) await tap("#pfMsOn"); } });
A("mashovOff", { page: ix, label: "ניתוק משוב", run: async () => { await call("openProfile"); await openSec("mashov"); await glow("#pfMsOff"); } });
A("email", { page: ix, label: "אימייל", run: async () => { await call("openProfile"); await openSec("mail"); } });
A("bday", { page: ix, label: "יום ההולדת שלי", run: async () => { await call("openProfile"); if (!(await openSec("bday"))) { await glow("#bdAsk,.bdask"); return; } await glow("#pfBdD"); } });
A("delete", { page: ix, label: "מחיקת המשתמש", run: async () => { await call("openProfile"); await openSec("del"); await glow("#pfDel"); } });
A("day", { page: ix, label: "המערכת ביום", run: async a => { if (typeof render === "function" && a != null) { try { sel = a; render(); } catch (e) {} } await glow("#tabs .tab.on"); scrollTo0("#hero"); } });
A("calc", { page: calc, hash: "", label: "המחשבון החכם" });
A("sci", { page: calc, hash: "sci", label: "המחשבון המדעי" });
A("topics", { page: calc, hash: "topics", label: "כל הנושאים במתמטיקה" });
A("topic", { page: calc, hash: a => "t-" + a, label: "הסבר על הנושא", run: async () => glow("#tOne .tsec") });
A("practice", { page: calc, hash: a => "t-" + (a && a.t || a), label: "תרגול", run: async a => { await waitFor("#prac .lvn"); if (a && a.L) await tap(`#prac .lvn [data-l="${a.L}"]`); await scrollIn("#prac"); } });
A("solve", { page: calc, hash: "solve", label: "פתרון תרגיל", run: async a => { if (a) { await setVal("#sIn", a); await tap("#sGo"); } } });
A("der", { page: calc, hash: "der", label: "נגזרת ומשיק", run: async a => { if (a) { await setVal("#dIn", a); await tap("#dGo"); } } });
A("seq", { page: calc, hash: "seq", label: "סדרות" });
A("bin", { page: calc, hash: "bin", label: "הסתברות בינומית" });
A("func", { page: calc, hash: "func", label: "גרף של פונקציה" });
A("line", { page: calc, hash: "line", label: "ישר דרך 2 נקודות" });
A("tri", { page: calc, hash: "tri", label: "משולש ישר-זווית" });
A("pct", { page: calc, hash: "pct", label: "מחשבון אחוזים" });
A("sys", { page: calc, hash: "sys", label: "מערכת משוואות" });
A("attendance", { page: "absences.html", hash: "", label: "הנוכחות שלי" });
A("grades", { page: "absences.html", hash: "grades", label: "הציונים שלי", run: async a => { if (a) { const b = await waitFor(`[data-goal="${cssEsc(a)}"]`, 2500); if (b) { b.closest("details") && (b.closest("details").open = true); await glow(b); } } } });
A("goal", { page: "absences.html", hash: "grades", label: "כמה צריך במבחן", run: async a => { const b = await waitFor(a ? `[data-goal="${cssEsc(a)}"]` : "[data-goal]", 2500); if (b) { const d = b.closest("details"); if (d) d.open = true; await tap(b); } } });
A("cards", { page: "cards.html", hash: "", label: "כרטיסיות" });
A("newset", { page: "cards.html", hash: "", label: "סט כרטיסיות חדש", run: async () => tap("#btnNew") });
A("dict", { page: "cards.html", hash: "", label: "מילון אנגלית-עברית", run: async () => tap("#btnDict") });
A("phones", { page: "phones.html", hash: "", label: "ספר הטלפונים", run: async a => { if (a) await setVal("#q", a); } });
A("exit", { page: "shichrur.html", hash: "", label: "שחרורון – אישור יציאה" });
A("about", { page: "about.html", hash: "", label: "על האפליקציה ופרטיות" });
A("staff", { page: "staff.html", hash: "", label: "כניסת צוות" });
// תשובות על המערכת האישית – מחושבות בטלפון (במסך הראשי)
for (const id of ["now", "next", "today", "dayinfo", "gear", "end", "brk", "when", "teacher", "abs", "avg", "streak", "tef", "bdays", "time", "me"]) A(id, { page: ix, label: "", answer: true });

// ===================== המוח המהיר: כוונות =====================
// p = ביטויים (אחרי norm). w = משקל. need = ישות שחייבת להופיע
const INT = [
  // ---- שאלות על המערכת ----
  { id: "now", p: ["מה יש לי עכשיו", "מה עכשיו", "איזה שיעור עכשיו", "שיעור עכשיו", "איפה אני צריך להיות", "איפה צריך להיות עכשיו", "מה יש עכשיו", "באיזה שיעור אני", "מה השיעור עכשיו"] },
  { id: "next", p: ["מה השיעור הבא", "שיעור הבא", "מה הבא", "מה אחרי זה", "מה יש אחר כך", "מה אחר כך", "מה בשיעור הבא"] },
  { id: "today", p: ["מה יש היום", "מערכת היום", "שיעורים היום", "מה יש לי היום", "מה המערכת היום", "מה יש לנו היום"] },
  { id: "dayinfo", p: ["מה יש מחר", "מערכת מחר", "מה יש לי מחר", "מה יש ביום", "מה המערכת ביום", "שיעורים ביום", "מה יש לנו מחר", "מערכת של יום", "מה יש מחרתיים", "מה יש בראשון"], day: true },
  { id: "gear", p: ["מה להביא", "מה לקחת", "מה צריך להביא", "ציוד", "מה להכניס לתיק", "מה לשים בתיק", "מה צריך לקחת", "תיק למחר", "מה להביא מחר", "ספרים להביא", "איזה ספרים", "איזה ספרים להביא", "מחברות"] },
  { id: "end", p: ["מתי נגמר היום", "מתי אני מסיים", "מתי מסיימים", "עד מתי לומדים", "מתי הולכים הביתה", "מתי השיעור האחרון", "מתי נגמרים הלימודים", "עד מתי היום"] },
  { id: "brk", p: ["מתי ההפסקה", "הפסקה", "מתי הפסקה", "מתי יש הפסקה", "מתי אוכל", "ארוחת צהריים"] },
  { id: "when", p: ["מתי יש לי", "מתי יש", "מתי השיעור", "באיזה יום יש", "מתי לומדים"], subj: true, w: 1.1 },
  { id: "teacher", p: ["מי המורה", "מי מלמד", "מי המורה שלי", "מורה של", "מי מלמדת", "איך קוראים למורה"], subj: true, w: 1.1 },
  { id: "abs", p: ["כמה חיסורים", "חיסורים", "כמה חיסרתי", "30 אחוז", "עומד ב 30 אחוז", "עובר את ה 30", "שלושים אחוז", "מצב הנוכחות", "אני בסכנה", "כמה פעמים חיסרתי", "חיסרתי"], w: 1.05 },
  { id: "avg", p: ["מה הממוצע", "ממוצע", "מה הציון", "ציונים שלי", "כמה קיבלתי", "הציון שלי", "ציון", "מה קיבלתי", "קיבלתי במבחן", "ציון במבחן", "איך הלך לי במבחן"] },
  { id: "goal", p: ["כמה אני צריך במבחן", "כמה צריך לקבל", "כמה אני צריך לקבל", "כמה צריך במבחן הבא", "מטרה לממוצע", "יעד לממוצע", "להגיע לממוצע"], w: 1.2 },
  { id: "streak", p: ["רצף", "כמה ברצף", "הרצף שלי", "רצפים"] },
  { id: "tef", p: ["תפילין", "עד מתי אפשר להניח", "מתי השקיעה", "שקיעה", "להניח תפילין", "הנחתי תפילין"] },
  { id: "bdays", p: ["ימי הולדת", "למי יש יום הולדת", "יום הולדת היום", "מי חוגג", "ימי הולדת השבוע"] },
  { id: "time", p: ["מה השעה", "איזה יום היום", "מה התאריך", "תאריך עברי", "איזה תאריך"] },
  // ---- עליי (מהפרופיל, בטלפון) ----
  { id: "me", arg: "name", p: ["מה השם שלי", "איך קוראים לי", "מי אני", "אתה יודע מי אני", "מה שמי", "השם שלי"], w: 1.3 },
  { id: "me", arg: "cls", p: ["באיזה כיתה אני", "באיזו כיתה אני", "מה הכיתה שלי", "הכיתה שלי", "באיזה שכבה אני", "באיזו שכבה אני"], w: 1.3 },
  { id: "me", arg: "rav", p: ["מי המחנך שלי", "מי הרב שלי", "מי המחנך", "מי הר\"מ שלי", "מי הרם שלי", "רב הכיתה", "מחנך הכיתה"], w: 1.3 },
  { id: "me", arg: "groups", p: ["באיזה הקבצה אני", "באיזו הקבצה אני", "כמה יחידות אני", "ההקבצה שלי", "כמה יחידות מתמטיקה אני", "כמה יחידות אנגלית אני", "באיזו רמה אני במתמטיקה", "באיזו קבוצה אני"], w: 1.35 },
  { id: "me", arg: "major", p: ["באיזה מגמה אני", "באיזו מגמה אני", "מה המגמה שלי", "המגמה שלי"], w: 1.35 },
  { id: "me", arg: "dorm", p: ["אני בפנימייה", "האם אני בפנימייה", "אני גר בפנימייה"], w: 1.1 },
  { id: "me", arg: "bday", p: ["מתי יום ההולדת שלי", "מתי נולדתי", "מתי היום הולדת שלי"], w: 1.4 },
  { id: "me", arg: "all", p: ["מה אתה יודע עליי", "מה אתה יודע עלי", "ספר לי עליי", "מה הפרטים שלי", "תגיד לי מה הפרטים שלי"], w: 1.2 },
  // ---- פרופיל והגדרות ----
  { id: "bday", p: ["לשנות יום הולדת", "יום הולדת שלי", "תאריך לידה", "לשנות תאריך יום הולדת", "להוסיף יום הולדת", "יום ההולדת שלי", "לתקן יום הולדת", "לא להציג יום הולדת", "להחליף יום הולדת", "מחליפים יום הולדת", "לעדכן יום הולדת", "לעדכן את יום ההולדת", "טעיתי ביום הולדת", "משנים יום הולדת"], w: 1.3 },
  { id: "edit", p: ["לשנות הקבצה", "לשנות כיתה", "להחליף קבוצה", "עריכת פרטים", "לשנות מגמה", "לשנות פנימייה", "אני לא בפנימייה", "אני בפנימייה", "לשנות שם", "להחליף שם", "לשנות שכבה", "לשנות את הפרטים", "לשנות קבוצה", "הקבצה", "להחליף הקבצה", "לשנות מורה", "ניצנים", "להחליף מגמה", "מגמה", "להחליף כיתה", "עברתי כיתה", "עברתי הקבצה"], w: 1.1 },
  { id: "photo", p: ["תמונת פרופיל", "להוסיף תמונה", "תמונה שלי", "להחליף תמונה", "לשים תמונה"] },
  { id: "theme", p: ["לשנות צבע", "צבע", "צבע האפליקציה", "עיצוב", "ערכת נושא", "רקע", "מצב לילה", "לצבוע", "תצבע"] },
  { id: "bigtext", p: ["טקסט גדול", "להגדיל", "אותיות גדולות", "להגדיל טקסט", "להקטין", "טקסט קטן", "לא רואה טוב", "כתב גדול", "תקטין", "תגדיל", "תקטין טקסט", "תגדיל טקסט", "הגדלה"] },
  { id: "push", p: ["התראות", "להפעיל התראות", "לכבות התראות", "הודעות לטלפון", "נוטיפיקציות", "שלא יקפוץ", "תזכורת"] },
  { id: "calendar", p: ["יומן", "להוסיף ליומן", "תוסיף ליומן", "ליומן שלי", "להכניס ליומן", "גוגל קלנדר", "לוח שנה", "ליומן של הטלפון", "קלנדר"] },
  { id: "install", p: ["להתקין", "מתקינים", "תתקין", "מסך הבית", "להוריד את האפליקציה", "להוריד אפליקציה", "אפליקציה בטלפון", "להוסיף למסך הבית", "התקנה"] },
  { id: "whatsnew", p: ["מה חדש", "חידושים", "מה התחדש", "גרסה חדשה", "מה השתנה"] },
  { id: "intro", p: ["הדרכה", "איך משתמשים", "היכרות", "הסבר על האפליקציה", "סרטון הדרכה", "איך זה עובד"] },
  { id: "feedback", p: ["יש לי רעיון", "רעיון", "הצעה", "לשפר את האפליקציה", "להציע"], arg: "idea" },
  { id: "feedback", p: ["תקלה", "באג", "משהו לא עובד", "לא עובד", "לדווח על תקלה", "נתקע", "שגיאה"], arg: "bug" },
  { id: "ask", p: ["שאלה לצוות", "לשאול מורה", "לשאול את הצוות", "שאלה אנונימית", "לשאול בלי שם", "לשאול את המורה"], w: 1.1 },
  { id: "image", p: ["מערכת כתמונה", "לשתף את המערכת", "צילום מערכת", "להדפיס", "להדפיס את המערכת", "תמונה של המערכת", "לשלוח את המערכת", "וואטסאפ מערכת", "לצלם את המערכת", "תשלח את המערכת", "לשתף מערכת", "לשלוח מערכת לחבר"] },
  { id: "parents", p: ["הורים", "לשלוח להורים", "קישור להורים", "אמא שלי", "אבא שלי", "שההורים יראו"] },
  { id: "recap", p: ["סיכום חודשי", "סיכום שנתי", "הסיכום שלי", "סיכום החודש", "סיכום"] },
  { id: "mashov", p: ["לחבר משוב", "משוב", "להתחבר למשוב", "חיבור למשוב", "סיסמה של משוב"] },
  { id: "mashovOff", p: ["לנתק משוב", "לנתק את משוב", "להתנתק ממשוב", "לבטל משוב"], w: 1.2 },
  { id: "email", p: ["אימייל", "מייל", "לחבר מייל", "לנתק מייל", "כתובת מייל", "גימייל"] },
  { id: "delete", p: ["למחוק משתמש", "למחוק את המשתמש", "מחיקת חשבון", "למחוק חשבון", "לצאת מהמשתמש", "להתנתק מהאפליקציה", "להתחיל מחדש", "לאפס את האפליקציה", "למחוק הכל", "תמחק את החשבון", "תמחק לי את החשבון", "למחוק את החשבון", "תמחק את המשתמש"], w: 1.25 },
  { id: "profile", p: ["פרופיל", "הגדרות", "הפרטים שלי", "הפרופיל שלי", "החשבון שלי"] },
  // ---- מחשבון ----
  { id: "calc", p: ["מחשבון", "מחשבון חכם", "מתמטיקה", "עזרה במתמטיקה", "שיעורי בית במתמטיקה"], w: 0.9 },
  { id: "sci", p: ["מחשבון מדעי", "מחשבון רגיל", "לחשב סינוס", "מחשבון עם סינוס", "מחשבון עם לוג"], w: 1.2 },
  { id: "topics", p: ["כל הנושאים", "נושאים במתמטיקה", "רשימת נושאים", "חומר למבחן במתמטיקה", "נוסחאות"] },
  { id: "practice", p: ["תרגול", "לתרגל", "תרגילים", "להתאמן", "לתרגל במתמטיקה", "תן לי תרגילים", "בוחן אותי", "תבחן אותי"], topic: "opt" },
  { id: "solve", p: ["לפתור תרגיל", "פתרון תרגיל", "לפתור משוואה", "תפתור", "פתור", "לפתור"], w: 0.95 },
  { id: "der", p: ["לגזור", "תגזור", "נגזרת של", "מחשבון נגזרות", "משיק", "נקודות קיצון", "חקירה"], w: 1.05 },
  { id: "seq", p: ["מחשבון סדרות", "לחשב סדרה", "סכום סדרה", "איבר בסדרה", "סדרה חשבונית לחשב", "סדרה הנדסית לחשב"] },
  { id: "bin", p: ["מחשבון בינומי", "מחשבון ברנולי", "לחשב בינומית", "מחשבון הסתברות", "בינומית"] },
  { id: "func", p: ["גרף", "לצייר גרף", "גרף של פונקציה", "לשרטט", "לצייר פונקציה"] },
  { id: "line", p: ["ישר דרך שתי נקודות", "שיפוע בין שתי נקודות", "משוואת ישר", "מרחק בין נקודות", "אמצע קטע"] },
  { id: "tri", p: ["משולש ישר זווית", "מחשבון משולש", "לפתור משולש"] },
  { id: "pct", p: ["מחשבון אחוזים", "אחוזים", "הנחה", "כמה אחוז", "אחוז מתוך"] },
  { id: "sys", p: ["מערכת משוואות", "שתי משוואות", "שני נעלמים"] },
  // ---- דפים אחרים ----
  { id: "attendance", p: ["דף נוכחות", "הנוכחות שלי", "לראות נוכחות", "פירוט חיסורים", "חיסורים לפי מקצוע", "נוכחות"], w: 1.08 },
  { id: "grades", p: ["דף ציונים", "לראות ציונים", "הציונים שלי", "כל הציונים", "ציונים", "מבחנים שלי"], w: 1.05 },
  { id: "cards", p: ["כרטיסיות", "כרטיסים", "ללמוד מילים", "מילים באנגלית", "ללמוד למבחן באנגלית", "שינון", "קווזלט", "quizlet", "לשנן", "פלאש קארדס"] },
  { id: "newset", p: ["סט חדש", "ליצור כרטיסיות", "לעשות כרטיסיות", "סט כרטיסיות חדש", "ליצור סט"], w: 1.2 },
  { id: "dict", p: ["מילון", "תרגום", "לתרגם", "מה זה באנגלית", "איך אומרים באנגלית", "פירוש מילה"] },
  { id: "phones", p: ["ספר טלפונים", "טלפון של", "מספר של", "להתקשר", "מספר טלפון", "וואטסאפ למורה", "לדבר עם המורה", "טלפון", "מספר"], teacherName: true },
  { id: "exit", p: ["שחרורון", "אישור יציאה", "לצאת מהישיבה", "שחרור", "יציאה הביתה", "אישור מההורים", "לצאת באמצע היום"] },
  { id: "about", p: ["פרטיות", "על האפליקציה", "מי בנה", "מי עשה את האפליקציה", "מה אתם שומרים", "מה אתם יודעים עליי", "איזה מידע אתם שומרים", "מידע עליי"] },
  { id: "staff", p: ["כניסת צוות", "אני מורה", "כניסה למורים", "צוות"] },
  { id: "home", p: ["מסך ראשי", "המסך הראשי", "הביתה", "דף הבית", "הדף הראשי", "דף ראשי", "לחזור", "תחזיר אותי", "תחזור", "חזרה למערכת"] },
  // ---- שיחה ----
  { id: "hi", p: ["היי", "שלום", "הי", "מה נשמע", "מה קורה", "בוקר טוב", "ערב טוב", "אהלן", "יו"], w: 0.7 },
  { id: "thanks", p: ["תודה", "תודה רבה", "תותח", "אלוף", "סבבה", "מעולה"], w: 0.7 },
  { id: "help", p: ["מה אתה יודע לעשות", "מי אתה", "עזרה", "מה אפשר לשאול", "איך אתה עובד", "מה אתה"], w: 0.9 },
  { id: "joke", p: ["בדיחה", "תספר בדיחה", "משהו מצחיק", "תצחיק אותי"] },
];
const IDX = INT.map(it => ({ ...it, pn: it.p.map(norm) }));

// ===================== המוח המהיר: לחשוב =====================
// מחזיר { id, arg, say?, conf (0..1), alts:[{id,arg}] }
function think(qRaw, ctx = {}) {
  const q = String(qRaw || "").trim(); const qn = norm(q); if (!qn) return { id: "help", conf: 1 };
  const qWords = qn.split(" ");
  // 1. תרגיל לחישוב
  const ex = mathExpr(q); if (ex) return { id: "compute", arg: ex, conf: 0.95 };
  const eq = equation(q);
  // 2. ציון כל הכוונות
  const scored = [];
  for (const it of IDX) {
    let best = 0, raw = 0; for (const p of it.pn) { const s = phraseScore(qWords, p); if (s) { best = Math.max(best, s * (0.6 + Math.min(p.split(" ").length, 4) * 0.12)); raw = Math.max(raw, s); } }
    if (best) scored.push({ it, s: best * (it.w || 1), raw });
  }
  scored.sort((a, b) => b.s - a.s);
  const subj = findSubject(qn), day = findDay(qn), level = findLevel(qn), color = findColor(qn);
  // 3. נושא במתמטיקה (מהמחשבון)
  let topic = topicFind(qWords, ctx.Topics || root.Topics);
  const learnish = /(ללמוד|להבינ|תסביר|הסבר|מה זה|איך פותרימ|איך עושימ|נושא|לחזור על|שיעורי בית|עזרה ב|לא מבינ|לא הבנתי|תלמד)/.test(qn);
  const practiceish = /(תרגול|לתרגל|תרגילימ|תרגיל ב|להתאמנ|תבחנ|בוחנ|ברמה)/.test(qn) || level != null;
  let top = scored[0];
  // נושא עם שגיאת כתיב ("לירוק"≈"פירוק") לא גובר על פקודה ברורה
  if (topic && !topic.exact && top && top.s >= 0.6 && !learnish && !practiceish) topic = null;
  // 4. פעולות עם תרגיל
  const eqOk = eq && /[-+*/^=<>²³√]/.test(eq) && !(learnish && !/(תגזור|לגזור|תפתור|לפתור|פתור)/.test(qn));
  if (eqOk && /(תגזור|לגזור|נגזרת)/.test(qn)) return { id: "der", arg: eq.replace(/^y=|^f\(x\)=/, ""), conf: 0.95 };
  if (eqOk && (/=|<|>/.test(eq) || /(תפתור|פתור|לפתור|פתרונ)/.test(qn))) return { id: "solve", arg: eq, conf: 0.9 };
  // 5. תרגול / נושא
  if (topic && practiceish) return { id: "practice", arg: { t: topic.id, L: level || undefined }, conf: 0.92, topicName: topic.t };
  if (top && top.it.id === "practice" && !topic) return { id: "topics", conf: 0.75, say: "על איזה נושא לתרגל? למשל: \"תרגול במשוואה ריבועית ברמה מתקדם\". בינתיים – הנה כל הנושאים:" };
  const deep = qWords.length >= 6 && /(^| )(למה|מדוע|איך זה|מה ההבדל|מה הקשר)( |$)/.test(qn);
  if (topic && deep) return { id: "topic", arg: topic.id, conf: 0.6, topicName: topic.t };
  if (topic && (learnish || !top || top.s < 0.75 || ["calc", "topics", "pct", "tri", "func", "seq", "bin"].includes(top.it.id) && learnish)) {
    // "סדרה חשבונית" → הסבר; "לחשב סדרה" → כלי
    if (!(top && top.s >= 0.9 && ["seq", "bin", "pct", "tri", "func", "line", "sys", "der", "sci"].includes(top.it.id) && !learnish)) return { id: "topic", arg: topic.id, conf: 0.88, topicName: topic.t };
  }
  if (!top && day) return { id: "dayinfo", arg: day, conf: 0.8 };
  if (!top) return topic ? { id: "topic", arg: topic.id, conf: 0.7, topicName: topic.t } : { id: null, conf: 0, alts: [] };
  // 6. ישויות
  let id = top.it.id, arg = top.it.arg;
  if (id === "theme" || (color && (/(צבע|תצבע|תשנה|ערכת|רקע|לצבוע|תעשה|שיהיה|תהפוכ)/.test(qn) || top.s < 0.7))) { id = "theme"; arg = color || undefined; }
  if (/(טלפונ|מספר של|להתקשר|תתקשר|וואטסאפ|לחייג|פלאפונ)/.test(qn) && !/(טלפונ הזה|למסכ)/.test(qn) && !["install", "push", "image", "parents", "exit", "feedback"].includes(id) && !/המערכת/.test(qn)) { id = "phones"; arg = teacherIn(qn) || (subj ? teacherOf(subj) : undefined); }
  if (id === "bigtext") arg = /(קטינ|קטנ|רגיל)/.test(qn) ? "off" : "on";
  if (id === "dayinfo" || ((id === "today" || id === "now") && day && day.rel !== 0)) { id = "dayinfo"; arg = day || { rel: 1 }; }
  if (["when", "teacher", "abs", "avg", "grades", "goal"].includes(id)) arg = subj || undefined;
  if (id === "when" && !subj && day) { id = "dayinfo"; arg = day; }
  if (id === "phones" && !arg) { const n = teacherIn(qn) || (subj ? teacherOf(subj) : null); if (n) arg = n; }
  // ביטוי שנמצא בדיוק, בשאלה קצרה = פקודה ברורה (לא מבזבזים שאלה של המוח החכם)
  let conf = Math.min(1, top.s);
  if (top.raw === 1 && qWords.length <= 6) conf = Math.max(conf, 0.9);
  if (id === "theme" && arg) conf = Math.max(conf, 0.95);
  const alts = scored.slice(1, 4).filter(x => x.s > 0.45 && x.it.id !== id).map(x => ({ id: x.it.id, arg: x.it.arg }));
  return { id, arg, conf, alts };
}
// נושא במתמטיקה: כל המילים של שם הנושא (או של מילת מפתח שלו) חייבות להופיע בשאלה
let TOPIC_IDX = null;
function topicFind(qWords, T) {
  if (!T || !T.TOPICS) return null;
  if (!TOPIC_IDX || TOPIC_IDX.T !== T) TOPIC_IDX = { T, L: T.TOPICS.map(t => ({ t, ph: [t.t.replace(/\$[^$]*\$/g, " "), ...t.k].map(norm).filter(x => x.replace(/ /g, "").length >= 3) })) };
  let best = null, bs = 0, exact = false;
  for (const { t, ph } of TOPIC_IDX.L) for (const p of ph) { const sc = phraseScore(qWords, p); if (sc >= 0.8) {
    const first = p.split(" ")[0], pos = qWords.findIndex(w => wordHit(w, first)); // מה שנאמר קודם הוא בדרך כלל הנושא
    const w = sc * (1 + p.length / 40) * (1 + 0.15 * (1 - Math.max(0, pos) / qWords.length)); if (w > bs) { bs = w; best = t; exact = sc === 1; } } }
  return best ? { ...best, exact } : null;
}
// המורה של מקצוע (מהמערכת של התלמיד) – בלי "הרב"
function teacherOf(subj) { try { for (const d of DAYS) if (d && d.lessons) for (const l of lessonsOf(d)) if (l && l.w && match(l.n, subj)) return l.w.split(/\s*\/\s*/)[0].replace(/\s*\(.*\)$/, "").replace(/^הרב\s+/, ""); } catch (e) {} return undefined; }
// שם של מורה מתוך השאלה (מהמערכת)
function teacherIn(qn) {
  const names = new Set();
  try { if (typeof DAYS !== "undefined" && typeof lessonsOf === "function") for (const d of DAYS) if (d && d.lessons) for (const l of lessonsOf(d)) if (l && l.w) l.w.split(/\s*\/\s*/).forEach(x => names.add(x.replace(/\s*\(.*\)$/, "").trim())); } catch (e) {}
  const qWords = qn.split(" ");
  for (const n of names) { const parts = norm(n).split(" ").filter(w => w.length > 1 && !["הרב", "המורה"].includes(w)); if (parts.some(p => p.length >= 3 && qWords.some(w => wordHit(w, p) >= 0.8))) return n.replace(/^הרב\s+/, ""); }
  const m = qn.match(/(?:של|ל|את)\s+(?:הרב\s+|המורה\s+)?([א-ת]{2,}(?: [א-ת]{2,})?)$/); return m ? m[1] : null;
}
const cssEsc = s => String(s).replace(/["\\]/g, "\\$&");

// ===================== תשובות על המערכת (בטלפון) =====================
const g = n => (typeof root[n] !== "undefined" ? root[n] : (() => { try { return eval(n); } catch (e) { return undefined; } })()); // eslint-disable-line no-eval
function todayLessons(dt) {
  const D = g("DAYS"), lo = g("lessonsOf"), wc = g("withChanges"), iso = g("isoOf"), cancel = g("isCancel");
  if (!D || !lo) return null; const d = D[dt.getDay()]; if (!d || !d.lessons || d.shabbat || d.free) return { d, L: [] };
  let L = lo(d); try { if (wc && iso) L = wc(L, iso(dt)); } catch (e) {}
  return { d, L: L.filter(l => !(cancel && cancel(l))) };
}
const tm = t => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const list = L => L.map(l => `<div class="al"><b>${l.s}</b> ${esc(l.n)}${l.w ? ` <small>${esc(l.w)}</small>` : ""}</div>`).join("");
function dayDate(a) { const dt = new Date(); if (a && a.rel != null) dt.setDate(dt.getDate() + a.rel); else if (a && a.day != null) dt.setDate(dt.getDate() + ((a.day - dt.getDay() + 7) % 7 || (a.day === dt.getDay() ? 0 : 7))); return dt; }
function answer(id, arg) {
  const prof = g("profile");
  if (!prof || !prof.cls) return "קודם צריך להירשם באפליקציה – ואז אוכל לענות על המערכת שלך 🙂";
  const now = new Date(), nm = nowMin();
  if (id === "me") {
    const C = g("CLASSES"), c = C && C[prof.cls], G = g("groupsOf"), gr = G ? G(prof.cls) : null, nm = `${prof.first || ""} ${prof.last || ""}`.trim();
    const eng = gr && gr.ENG && gr.ENG[prof.eng], math = gr && gr.MATH && gr.MATH[prof.math], mj = gr && gr.MAJORS && gr.MAJORS[prof.major];
    let bd = null; try { bd = JSON.parse(localStorage.getItem("bday") || "null"); } catch (e) {}
    const M = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const parts = {
      name: `קוראים לך <b>${esc(nm || "…")}</b> 😊`,
      cls: c ? `אתה בכיתה <b>${esc(c.label)}</b>` : "",
      rav: c && c.rav ? `המחנך שלך: <b>${esc(c.rav)}</b>` : "",
      groups: [math ? `מתמטיקה: <b>${esc(math)}</b>` : "", eng ? `אנגלית: <b>${esc(eng)}</b>` : ""].filter(Boolean).join(" · "),
      major: mj ? `מגמה: <b>${esc(mj.n)}</b>${mj.w ? " (" + esc(mj.w) + ")" : ""}` : "",
      dorm: prof.dorm === "yes" ? "כן, אתה בפנימייה 🛏️" : prof.dorm === "no" ? "לא – אתה גר בבית 🏠" : "",
      bday: bd && bd.d && bd.m ? `יום ההולדת שלך: <b>${bd.d} ב${M[bd.m - 1]}</b> 🎂` : "עוד לא הכנסת יום הולדת. כתוב לי \"לשנות יום הולדת\" 🎂",
    };
    const key = arg && parts[arg] != null ? arg : "all";
    if (key === "all") return [parts.name, parts.cls + (c && c.rav ? ` · ${parts.rav}` : ""), parts.groups, parts.major, parts.dorm, parts.bday].filter(Boolean).join("<br>") + "<br><small>🔒 הפרטים נשמרים רק בטלפון שלך. לשינוי: \"עריכת פרטים\"</small>";
    // "מה השם שלי" – גם קצת אישיות
    return (parts[key] || "לא מצאתי את זה בפרופיל שלך.") + (key === "name" && prof.first ? ` נעים להכיר, ${esc(prof.first)}! 🤝` : "");
  }
  if (id === "time") { const hd = document.getElementById("hDate"); return `השעה <b>${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}</b>, יום ${DAYS_HE[now.getDay()]} ${now.getDate()}.${now.getMonth() + 1}${hd && hd.textContent ? ` · ${esc(hd.textContent)}` : ""}`; }
  if (id === "now" || id === "next") {
    const t = todayLessons(now); if (!t) return "לא הצלחתי לקרוא את המערכת 😕";
    if (!t.L.length) return "היום אין לימודים 😎";
    const cur = t.L.find(l => nm >= tm(l.s) && nm < tm(l.e)), nxt = t.L.find(l => tm(l.s) > nm);
    if (id === "now") return cur ? `עכשיו: <b>${esc(cur.n)}</b>${cur.w ? ` עם ${esc(cur.w)}` : ""} (${cur.s}–${cur.e}), נשארו ${tm(cur.e) - nm} דק'.${nxt ? `<br>אחר כך: ${esc(nxt.n)} ב-${nxt.s}` : ""}` : nxt ? `עכשיו אין שיעור. הבא: <b>${esc(nxt.n)}</b> ב-${nxt.s} (בעוד ${tm(nxt.s) - nm} דק').` : "סיימנו להיום 🎉";
    return nxt ? `השיעור הבא: <b>${esc(nxt.n)}</b>${nxt.w ? ` עם ${esc(nxt.w)}` : ""} ב-${nxt.s} (בעוד ${tm(nxt.s) - nm} דק').` : "אין יותר שיעורים היום 🎉";
  }
  if (id === "today" || id === "dayinfo") {
    const dt = id === "today" ? now : dayDate(arg), t = todayLessons(dt);
    const lbl = id === "today" || (arg && arg.rel === 0) ? "היום" : arg && arg.rel === 1 ? "מחר" : arg && arg.rel === 2 ? "מחרתיים" : `ביום ${DAYS_HE[dt.getDay()]}`;
    if (!t) return "לא הצלחתי לקרוא את המערכת 😕";
    if (!t.L.length) return `${lbl} אין לימודים${t.d && t.d.shabbat ? " – שבת שלום 🕯️" : " 😎"}`;
    return `${lbl} (${t.d.name}): ${t.L.length} שיעורים, ${t.L[0].s}–${t.L[t.L.length - 1].e}${list(t.L)}`;
  }
  if (id === "gear") { const tg = g("tomorrowGear"); if (!tg) return "לא הצלחתי לבדוק 😕"; const h = tg(now.getDay()); return h ? h.replace(/<\/?b>/g, "").replace(/<[^>]+>/g, "") : "לא מצאתי יום לימודים קרוב."; }
  if (id === "end") { const t = todayLessons(now); if (!t || !t.L.length) return "היום אין לימודים 😎"; const last = t.L[t.L.length - 1]; return tm(last.e) <= nm ? "כבר סיימנו להיום 🎉" : `היום מסיימים ב-<b>${last.e}</b> (${esc(last.n)}).`; }
  if (id === "brk") { const t = todayLessons(now); if (!t || !t.L.length) return "היום אין לימודים 😎"; for (let i = 1; i < t.L.length; i++) { const a = t.L[i - 1], b = t.L[i]; if (tm(b.s) - tm(a.e) >= 10 && tm(b.s) > nm) return `ההפסקה הבאה: <b>${a.e}–${b.s}</b> (${tm(b.s) - tm(a.e)} דק').`; } return "אין יותר הפסקות היום."; }
  if (id === "when") {
    if (!arg) return "איזה מקצוע? למשל: \"מתי יש לי אנגלית?\"";
    for (let k = 0; k < 8; k++) { const dt = new Date(now); dt.setDate(now.getDate() + k); const t = todayLessons(dt); if (!t) break;
      const l = t.L.find(x => match(x.n, arg) && (k > 0 || tm(x.e) > nm)); if (l) return `${esc(arg)}: <b>${k === 0 ? "היום" : k === 1 ? "מחר" : "ביום " + DAYS_HE[dt.getDay()]}</b> ב-${l.s}${l.w ? ` עם ${esc(l.w)}` : ""}.`; }
    return `לא מצאתי ${esc(arg)} בשבוע הקרוב במערכת שלך.`;
  }
  if (id === "teacher") {
    if (!arg) return "של איזה מקצוע? למשל: \"מי המורה שלי באנגלית?\"";
    const D = g("DAYS"), lo = g("lessonsOf"); if (D && lo) for (const d of D) if (d && d.lessons) { const l = lo(d).find(x => match(x.n, arg) && x.w); if (l) return `${esc(arg)}: <b>${esc(l.w)}</b>`; }
    return `לא מצאתי מורה ל${esc(arg)} במערכת שלך.`;
  }
  if (id === "abs" || id === "streak") {
    const st = g("absState"), a = st && st();
    if (!a) return "כדי לראות חיסורים ורצפים צריך לחבר את משוב (בפרופיל). רוצה שאפתח לך? כתוב \"לחבר משוב\".";
    if (id === "streak") { const L = Object.entries(a.SS).filter(([, x]) => x.current > 0).sort((x, y) => y[1].current - x[1].current).slice(0, 3); return L.length ? "🔥 הרצפים שלך: " + L.map(([n, x]) => `${esc(n)} – <b>${x.current}</b>`).join(" · ") : "עוד אין רצף. השיעור הבא מתחיל אחד 🔥"; }
    const subs = a.r.subjects.filter(x => !x.nonBagrut && x.held > 0);
    if (arg) { const x = subs.find(s => match(s.name, arg)); if (!x) return `לא מצאתי חיסורים ב${esc(arg)}.`; return `${esc(x.name)}: <b>${Math.round(x.pct * 100)}%</b> חיסורים (${x.counted} מתוך ${x.held} שיעורים)${x.status === "red" || x.status === "lost" ? " – ⚠️ מסוכן, חייבים להגיע!" : x.status === "orange" ? " – לשים לב" : " – תקין ✅"}`; }
    const bad = subs.filter(x => ["red", "lost"].includes(x.status)), warn = subs.filter(x => x.status === "orange");
    return bad.length ? `⚠️ ${bad.length} מקצועות מסוכנים: ${bad.map(x => `${esc(x.name)} (${Math.round(x.pct * 100)}%)`).join(", ")}` : warn.length ? `🟠 לשים לב: ${warn.map(x => `${esc(x.name)} (${Math.round(x.pct * 100)}%)`).join(", ")}. כל השאר תקין.` : "✅ הנוכחות שלך תקינה בכל המקצועות. כל הכבוד!";
  }
  if (id === "avg") {
    const M = g("Mashov"), md = M && M.data && M.data(); if (!md) return "כדי לראות ציונים צריך לחבר את משוב (בפרופיל).";
    const G = (md.grades || []).filter(x => isFinite(parseFloat(x.grade)) && (!arg || match(x.subject, arg)));
    if (!G.length) return arg ? `אין עדיין ציונים ב${esc(arg)}.` : "אין עדיין ציונים.";
    const avg = Math.round(G.reduce((s, x) => s + parseFloat(x.grade), 0) / G.length), last = G.slice().sort((a, b) => String(b.date).localeCompare(a.date))[0];
    return `${arg ? esc(arg) + ": " : ""}ממוצע <b>${avg}</b> (${G.length} ציונים). האחרון: ${esc(last.grade)}${arg ? "" : " ב" + esc(last.subject)}.<br><small>ממוצע פשוט – לא הציון בתעודה.</small>`;
  }
  if (id === "tef") { const sa = g("sunsetAt"); if (!sa) return "לא הצלחתי לחשב 😕"; const ss = sa(now), left = Math.round((ss - now) / 6e4); const hm = `${String(ss.getHours()).padStart(2, "0")}:${String(ss.getMinutes()).padStart(2, "0")}`; return left > 0 ? `🙏 אפשר להניח תפילין עד השקיעה – <b>${hm}</b> (עוד ${left >= 60 ? Math.floor(left / 60) + " שע' ו-" : ""}${left % 60} דק').` : `השקיעה היום הייתה ב-${hm}. מחר בבוקר – הזדמנות חדשה 💙`; }
  if (id === "bdays") { const U = g("Updates"), f = U && U.feed && U.feed(), B = (f && f.birthdays || []).filter(x => x.inDays >= 0 && x.inDays <= 7); return B.length ? "🎂 " + B.map(x => `${esc(x.name)} – ${x.inDays === 0 ? "<b>היום!</b>" : x.inDays === 1 ? "מחר" : "בעוד " + x.inDays + " ימים"}`).join(" · ") : "אין ימי הולדת בשבוע הקרוב."; }
  return "";
}
const match = (a, b) => { const x = norm(a), y = norm(b); if (x.includes(y) || y.includes(x)) return true; const al = SUBJ_ALIAS[b]; return !!(al && al.some(w => x.includes(norm(w)))); };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// מה אומרים לפני שעושים פעולה
function sayFor(r) {
  const a = ACT[r.id];
  switch (r.id) {
    case "topic": return `פותח לך הסבר על <b>${esc(r.topicName ? r.topicName.replace(/\$/g, "") : "הנושא")}</b> 📖 יש שם גם תרגול לפי רמה 🎯`;
    case "practice": return `יאללה לתרגל${r.topicName ? ` <b>${esc(r.topicName.replace(/\$/g, ""))}</b>` : ""}${r.arg && r.arg.L ? ` ברמת ${["🌱 מתחיל", "🌿 מתאמן", "🚀 מתקדם", "🏆 אלוף"][r.arg.L - 1]}` : ""} 💪`;
    case "solve": return `פותר את <span dir="ltr">${esc(r.arg || "")}</span> עם כל השלבים 🧮`;
    case "der": return `גוזר את <span dir="ltr">${esc(r.arg || "")}</span> 📉`;
    case "theme": return r.arg ? "צובע את האפליקציה 🎨" : "בחר צבע 🎨";
    case "bigtext": return r.arg === "off" ? "מחזיר לטקסט רגיל 🔍" : "מגדיל את הטקסט 🔍";
    case "bday": return "פותח לך את יום ההולדת בפרופיל – שם משנים 🎂";
    case "delete": return "מחיקת המשתמש נמצאת כאן 👇 (אני לא מוחק בשבילך – זה רק אתה, עם אישורים 😉)";
    case "mashovOff": return "הניתוק נמצא כאן 👇 – תצטרך לאשר כמה פעמים.";
    case "phones": return r.arg ? `מחפש את ${esc(r.arg)} בספר הטלפונים 📞` : "פותח את ספר הטלפונים 📞";
    case "grades": return r.arg ? `פותח את הציונים ב${esc(r.arg)} 📝` : "פותח את הציונים שלך 📝";
    case "goal": return `פותח את "🎯 כמה צריך במבחן"${r.arg ? " ב" + esc(r.arg) : ""}`;
    case "feedback": return r.arg === "bug" ? "ספר לנו מה לא עובד ונתקן 🛠️" : "איזה כיף! כתוב את הרעיון 💡";
    default: return a && a.label ? `פותח: ${a.label} 👉` : "";
  }
}
const SMALL = {
  hi: ["היי! 👋 אני מערכתי. מה צריך?", "שלום! במה אפשר לעזור? 😊", "אהלן! אני כאן 🤖"],
  thanks: ["בכיף! 😊", "תמיד! 💪", "בשמחה 🤖"],
  joke: ["למה המחשבון לא מפחד ממבחנים? כי הוא תמיד יודע את התשובה 😄", "מה אמר המשולש לעיגול? אתה חסר טעם – אין לך בכלל פינות! 📐", "למה הספר של המתמטיקה עצוב? יש לו יותר מדי בעיות 😅"],
};
const HELP = `אני <b>מערכתי</b> 🤖 אפשר לכתוב לי או לדבר איתי, למשל:<br>• "מה יש לי עכשיו?" / "מה להביא מחר?"<br>• "תיקח אותי לנגזרת" / "תרגול בשברים ברמה קלה"<br>• "תפתור 2x+3=11" / "כמה זה 15% מ-200"<br>• "לשנות יום הולדת" / "תצבע בירוק"<br>• "כמה חיסורים יש לי באנגלית?"`;
const CHIPS = ["מה יש לי עכשיו?", "מה להביא מחר?", "תיקח אותי לנגזרת", "כמה חיסורים יש לי?", "תרגול במשוואות"];

// ===================== מבצע: "אצבע" שלוחצת =====================
const PAGE = isNode ? "index.html" : (location.pathname.split("/").pop() || "index.html");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(sel, ms = 4000) { if (typeof sel !== "string") return sel; const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = document.querySelector(sel); if (e && e.getClientRects().length) return e; await sleep(80); } return null; }
async function call(fn, ...a) { const f = g(fn); if (typeof f === "function") { try { await f(...a); } catch (e) { console.warn(e); } } await sleep(350); }
function finger(el) {
  return new Promise(res => {
    if (!el || !el.getBoundingClientRect) return res();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => {
      const r = el.getBoundingClientRect(), f = document.createElement("div"); f.className = "asst-finger"; f.textContent = "👆";
      const host = el.closest("dialog[open]") || document.body; host.appendChild(f);
      f.style.left = (innerWidth - 60) + "px"; f.style.top = (innerHeight - 90) + "px";
      requestAnimationFrame(() => { f.style.left = (r.left + r.width / 2 - 14) + "px"; f.style.top = (r.top + r.height / 2 - 4) + "px"; });
      setTimeout(() => { f.classList.add("press"); el.classList.add("asst-glow"); setTimeout(() => { f.remove(); setTimeout(() => el.classList.remove("asst-glow"), 1800); res(); }, 380); }, 650);
    }, 280);
  });
}
async function tap(sel) { const el = await waitFor(sel); if (!el) return false; await finger(el); try { el.click(); } catch (e) {} await sleep(300); return true; }
async function glow(sel) { const el = await waitFor(sel, 2500); if (!el) return false; await finger(el); return true; }
async function openSec(id) { const d = await waitFor(`#profBody [data-sec="${id}"]`, 2500); if (!d) return false; if (!d.open) { await finger(d.querySelector("summary")); d.open = true; } await sleep(200); d.scrollIntoView({ block: "center", behavior: "smooth" }); return true; }
async function setVal(sel, v) { const el = await waitFor(sel); if (!el) return; await finger(el); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(200); }
async function scrollIn(sel) { const el = await waitFor(sel); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); }
function scrollTo0(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }
const onPage = pg => !pg || pg === PAGE || (pg === ix && PAGE === "");
// הרצת פעולה: אם היא בדף אחר – שומרים ועוברים
async function act(id, arg, opts = {}) {
  const a = ACT[id]; if (!a) return;
  const page = a.page;
  if (page && page !== PAGE && !(page === ix && PAGE === "")) {
    try { sessionStorage.setItem("asst:pending", JSON.stringify({ id, arg, at: Date.now(), say: opts.say || "" })); } catch (e) {}
    const h = typeof a.hash === "function" ? a.hash(arg) : a.hash;
    location.href = page + (h ? "#" + h : ""); return;
  }
  if (a.hash != null) { const h = typeof a.hash === "function" ? a.hash(arg) : a.hash; if (("#" + h) !== location.hash && (h || location.hash)) { location.hash = h; await sleep(500); } }
  if (a.answer) { botSay(answer(id, arg)); return; }
  closePanelSoft();
  if (a.run) await a.run(arg);
}
async function resume() {
  let p = null; try { p = JSON.parse(sessionStorage.getItem("asst:pending") || "null"); sessionStorage.removeItem("asst:pending"); } catch (e) {}
  if (!p || Date.now() - p.at > 30000 || !ACT[p.id]) return;
  await sleep(700);
  if (ACT[p.id].answer) { if (panel) { openPanel(); botSay(answer(p.id, p.arg)); } else toastSay(answer(p.id, p.arg)); return; }
  if (p.say) toastSay(p.say);
  try { await ACT[p.id].run?.(p.arg); } catch (e) { console.warn(e); }
}

// ===================== המוח החכם (AI) =====================
const AI_URL = () => ((typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "https://lucent-crepe-6db22c.netlify.app") + "/api/assist";
function deviceId() { let d = null; try { d = localStorage.getItem("deviceId"); } catch (e) {} if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2)); try { localStorage.setItem("deviceId", d); } catch (e) {} } return d; }
const aiLS = () => { try { const x = JSON.parse(localStorage.getItem("asstAI") || "{}"); return x && typeof x === "object" ? x : {}; } catch (e) { return {}; } };
async function askAI(q, hist) {
  const day = new Date().toDateString(), st = aiLS();
  if (st.day === day && st.left === 0) return { ok: false, error: "quota" };
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(AI_URL(), { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: deviceId(), q, page: PAGE, grade: (() => { try { const p = JSON.parse(localStorage.getItem("profile") || "{}"); return p.cls && /^ya/.test(p.cls) ? "11" : p.cls ? "10" : ""; } catch (e) { return ""; } })(), hist: hist.slice(-6) }) });
    const j = await r.json().catch(() => ({ ok: false, error: "server" }));
    if (j && typeof j.left === "number") { try { localStorage.setItem("asstAI", JSON.stringify({ day, left: j.left })); } catch (e) {} }
    return j;
  } catch (e) { return { ok: false, error: "network" }; } finally { clearTimeout(to); }
}

// ===================== ממשק =====================
let panel, log, inp, hist = [], busy = false;
function css() {
  const s = document.createElement("style");
  s.textContent = `
/* 🤖 הרובוט: גוררים לכל מקום בצד (נצמד לקצה), מתחבא חצי כשגוללים */
#asstBtn{position:fixed;left:0;top:0;z-index:9000;width:60px;height:60px;border-radius:50%;border:none;cursor:grab;padding:0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  background:radial-gradient(circle at 35% 30%,#8f9bff,#5b6cff 45%,#a259ff 80%,#ff6bd6);box-shadow:0 10px 26px rgba(91,108,255,.5),inset 0 -4px 10px rgba(0,0,0,.18);
  transform:translate(var(--x,0px),var(--y,0px));transition:transform .45s cubic-bezier(.2,1.3,.4,1),opacity .3s,box-shadow .3s;animation:asstIn .6s cubic-bezier(.2,1.6,.4,1)}
#asstBtn.drag{transition:none;cursor:grabbing;box-shadow:0 18px 40px rgba(91,108,255,.6)}
#asstBtn.tuck{transform:translate(calc(var(--x,0px) + var(--tx,0px)),var(--y,0px));opacity:.55}
#asstBtn::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(162,89,255,.55);animation:asstPulse 2.8s infinite;pointer-events:none}
#asstBtn.drag::after,#asstBtn.tuck::after,#asstBtn.away::after{display:none}
#asstBtn.away{transform:translate(calc(var(--x,0px) + var(--tx,0px) * 2.2),var(--y,0px));opacity:0;pointer-events:none}
@keyframes asstIn{from{opacity:0;scale:0}}@keyframes asstPulse{0%{transform:scale(1);opacity:.9}70%{transform:scale(1.4);opacity:0}100%{opacity:0}}
.abot{width:100%;height:100%;display:block;overflow:visible}
.abot .body{animation:aBob 3.2s ease-in-out infinite;transform-origin:32px 40px}
.abot .eyes{transform-box:fill-box;transform-origin:center;animation:aBlink 4.6s infinite}
.abot .look{transition:transform .25s ease}
.abot .ant{animation:aAnt 2.2s infinite}
.abot .mouth{transition:d .2s}
.abot .ms{display:block}.abot .mo{display:none}
.abot .ear{transform-box:fill-box;transform-origin:center}
@keyframes aBob{50%{transform:translateY(-2.5px) rotate(-2deg)}}
@keyframes aBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
@keyframes aAnt{0%,100%{fill:#7cf5ff;filter:drop-shadow(0 0 2px #7cf5ff)}50%{fill:#ff6bd6;filter:drop-shadow(0 0 5px #ff6bd6)}}
.abot.think .look{animation:aScan 1.1s ease-in-out infinite alternate}.abot.think .ant{animation-duration:.45s}.abot.think .ms{display:none}.abot.think .mo{display:block}
@keyframes aScan{from{transform:translateX(-3px)}to{transform:translateX(3px)}}
.abot.talk .mo{display:block;animation:aTalk .18s infinite alternate;transform-box:fill-box;transform-origin:center}.abot.talk .ms{display:none}
@keyframes aTalk{from{transform:scaleY(.3)}to{transform:scaleY(1.2)}}
.abot.happy .body{animation:aHop .7s cubic-bezier(.2,1.6,.4,1)}.abot.happy .eyes{animation:none}.abot.happy .eye{transform:scaleY(.5);transform-box:fill-box;transform-origin:center}
@keyframes aHop{0%{transform:translateY(0)}35%{transform:translateY(-9px) rotate(8deg)}70%{transform:translateY(0) rotate(-4deg)}}
.abot.wave .ear.r{animation:aWave .4s 3 alternate}@keyframes aWave{to{transform:rotate(-35deg) translateY(-3px)}}
.asst-tip{position:fixed;z-index:9002;max-width:220px;background:#fff;color:#1d2247;border-radius:16px;padding:9px 12px;font-size:14px;font-weight:700;line-height:1.4;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:asstUp .35s ease;direction:rtl;pointer-events:none}
.asst-tip small{display:block;font-weight:500;color:#6c7093;font-size:12px;margin-top:2px}
.asst-spark{position:fixed;z-index:9002;pointer-events:none;font-size:16px;animation:aSpark .8s ease-out forwards}@keyframes aSpark{to{transform:translate(var(--sx),var(--sy)) scale(.4);opacity:0}}
@media (prefers-reduced-motion:reduce){.abot *,#asstBtn::after{animation:none!important}}
body.asst-hide #asstBtn,body:has(#suspWall) #asstBtn,body:has(#wiz:not([hidden])) #asstBtn,body:has(#intro:not([hidden])) #asstBtn,body:has(#build:not([hidden])) #asstBtn,body:has(#fx) #asstBtn,body:has(#recap) #asstBtn,body:has(#delFx:not([hidden])) #asstBtn{display:none}
#asstP{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9001;max-width:460px;margin:0 auto;max-height:min(78vh,640px);display:flex;flex-direction:column;
  background:var(--card,#1d2247);color:var(--ink,#f4f5ff);border:1.5px solid var(--line,#2b3162);border-radius:22px;box-shadow:0 18px 60px rgba(0,0,0,.45);overflow:hidden;animation:asstUp .3s ease;font-family:inherit;direction:rtl}
#asstP[hidden]{display:none}@keyframes asstUp{from{transform:translateY(30px);opacity:0}}
#asstP.pop{animation:asstPop .38s cubic-bezier(.2,1.3,.4,1);transform-origin:var(--ox,10%) 100%}@keyframes asstPop{from{transform:scale(.2);opacity:0}}
#asstP .am{animation:aMsg .3s ease}@keyframes aMsg{from{transform:translateY(8px);opacity:0}}
#asstP .ah .hb{width:40px;height:40px;flex:0 0 40px}#asstP .ah .hide{width:auto;border-radius:999px;padding:0 10px;font-size:12px;font-weight:700}
#asstP .ah{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#5b6cff,#a259ff 60%,#ff6bd6);color:#fff}
#asstP .ah b{font-size:17px;flex:1}#asstP .ah small{display:block;font-size:12px;opacity:.9;font-weight:500}#asstP .ah button{border:none;background:rgba(255,255,255,.2);color:#fff;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer}
#asstP .alog{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:120px}
#asstP .am{max-width:88%;padding:9px 12px;border-radius:16px;font-size:15px;line-height:1.55;word-wrap:break-word}
#asstP .am.me{align-self:flex-start;background:var(--accent,#7c8cff);color:#fff;border-bottom-right-radius:4px}
#asstP .am.bot{align-self:flex-end;background:var(--bg,#0f1226);border:1.5px solid var(--line,#2b3162);border-bottom-left-radius:4px}
#asstP .am.bot.ai{border-color:#a259ff}#asstP .am .tag{display:block;font-size:11px;opacity:.65;margin-top:4px}
#asstP .am .al{padding:2px 0;border-bottom:1px dashed var(--line,#2b3162);font-size:14px}#asstP .am .al small{opacity:.7}
#asstP .am button.go{display:inline-block;margin:6px 0 0 6px;border:none;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;background:var(--accent,#7c8cff);color:#fff}
#asstP .dots{align-self:flex-end;padding:10px 14px;border-radius:16px;background:var(--bg,#0f1226);border:1.5px solid var(--line,#2b3162)}
#asstP .dots i{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:var(--muted,#9aa0c7);animation:asstDot 1s infinite}#asstP .dots i:nth-child(2){animation-delay:.15s}#asstP .dots i:nth-child(3){animation-delay:.3s}
@keyframes asstDot{50%{transform:translateY(-5px);opacity:.4}}
#asstP .achips{display:flex;gap:6px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:none}#asstP .achips::-webkit-scrollbar{display:none}
#asstP .achips button{flex:0 0 auto;border:1.5px solid var(--line,#2b3162);background:var(--bg,#0f1226);color:var(--ink,#f4f5ff);border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}
#asstP form{display:flex;gap:6px;padding:10px;border-top:1.5px solid var(--line,#2b3162)}
#asstP input{flex:1;min-width:0;border:1.5px solid var(--line,#2b3162);background:var(--bg,#0f1226);color:var(--ink,#f4f5ff);border-radius:14px;padding:11px 12px;font:inherit;font-size:16px}
#asstP form button{border:none;border-radius:14px;width:46px;font-size:20px;cursor:pointer;background:var(--accent,#7c8cff);color:#fff}#asstP form button.mic{background:var(--break,#2a2f5c)}#asstP form button.mic.on{background:#ff3b4f;animation:asstPulse2 1s infinite}
@keyframes asstPulse2{50%{transform:scale(1.08)}}
#asstP .quota{font-size:11px;opacity:.7;text-align:center;padding:0 10px 6px}
.asst-finger{position:fixed;z-index:10002;font-size:30px;pointer-events:none;transition:left .6s cubic-bezier(.4,0,.2,1),top .6s cubic-bezier(.4,0,.2,1),transform .2s;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))}
.asst-finger.press{transform:scale(.8) translateY(4px)}
.asst-glow{outline:3px solid #a259ff!important;outline-offset:3px;border-radius:10px;box-shadow:0 0 0 8px rgba(162,89,255,.25)!important;transition:outline .2s}
.asst-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(88px + env(safe-area-inset-bottom));z-index:9003;background:#1d2247;color:#fff;border-radius:999px;padding:9px 16px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);animation:asstUp .3s ease;max-width:90vw}
@media print{#asstBtn,#asstP{display:none}}`;
  document.head.appendChild(s);
}
// הרובוט: ראש עם מסך, עיניים זוהרות, אנטנה, אוזניים
function robotSVG(cls = "") {
  return `<svg class="abot ${cls}" viewBox="0 0 64 64" aria-hidden="true"><g class="body">
    <line x1="32" y1="9" x2="32" y2="16" stroke="#e8ebff" stroke-width="2.5" stroke-linecap="round"/><circle class="ant" cx="32" cy="7.5" r="3.6" fill="#7cf5ff"/>
    <rect class="ear l" x="6.5" y="27" width="6" height="12" rx="3" fill="#dfe4ff"/><rect class="ear r" x="51.5" y="27" width="6" height="12" rx="3" fill="#dfe4ff"/>
    <rect x="11" y="15" width="42" height="36" rx="14" fill="#f2f4ff"/><rect x="15.5" y="20" width="33" height="24" rx="9" fill="#1b1f45"/>
    <g class="look"><g class="eyes"><ellipse class="eye" cx="25" cy="30" rx="3.8" ry="4.6" fill="#7cf5ff"/><ellipse class="eye" cx="39" cy="30" rx="3.8" ry="4.6" fill="#7cf5ff"/>
      <circle cx="26.3" cy="28.3" r="1.2" fill="#fff"/><circle cx="40.3" cy="28.3" r="1.2" fill="#fff"/></g></g>
    <path class="ms" d="M27 37.5 Q32 41.5 37 37.5" fill="none" stroke="#7cf5ff" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse class="mo" cx="32" cy="38.5" rx="3" ry="2" fill="#7cf5ff"/>
    <circle cx="19.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/><circle cx="44.5" cy="38" r="2.2" fill="#ff6bd6" opacity=".55"/></g></svg>`;
}
const bots = () => document.querySelectorAll(".abot");
function mood(m, ms) { bots().forEach(b => { b.classList.remove("think", "talk", "happy", "wave"); if (m) b.classList.add(m); }); clearTimeout(mood.t); if (m && ms) mood.t = setTimeout(() => mood(null), ms); }
function sparks(el) { const r = el.getBoundingClientRect(); for (let i = 0; i < 8; i++) { const s = document.createElement("span"); s.className = "asst-spark"; s.textContent = ["✨", "⭐", "💜"][i % 3]; s.style.left = r.left + r.width / 2 - 8 + "px"; s.style.top = r.top + r.height / 2 - 8 + "px"; const a = Math.PI * 2 * i / 8; s.style.setProperty("--sx", Math.cos(a) * 48 + "px"); s.style.setProperty("--sy", Math.sin(a) * 48 + "px"); document.body.appendChild(s); setTimeout(() => s.remove(), 850); } }
// מיקום: צד (ימין/שמאל) + גובה, נשמר. גוררים → נצמד לקצה הקרוב
const POSK = "asstPos";
function posGet() { try { const p = JSON.parse(localStorage.getItem(POSK) || "null"); if (p && (p.side === "l" || p.side === "r") && p.y >= 0 && p.y <= 1) return p; } catch (e) {} return { side: "l", y: 0.86 }; }
function place(b, p, anim = true) {
  const W = innerWidth, H = innerHeight, s = 60, m = 12, top = 70, bot = H - s - 16;
  const x = p.side === "r" ? W - s - m : m, y = Math.max(top, Math.min(bot, top + p.y * (bot - top)));
  b.classList.toggle("drag", !anim); b.style.setProperty("--x", x + "px"); b.style.setProperty("--y", y + "px"); b.style.setProperty("--tx", (p.side === "r" ? 38 : -38) + "px");
}
function dragify(b, onTap) {
  let st = null;
  b.addEventListener("pointerdown", e => { st = { x: e.clientX, y: e.clientY, ox: parseFloat(b.style.getPropertyValue("--x")), oy: parseFloat(b.style.getPropertyValue("--y")), moved: false, id: e.pointerId }; try { b.setPointerCapture(e.pointerId); } catch (_) {} });
  b.addEventListener("pointermove", e => { if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; if (!st.moved && Math.hypot(dx, dy) < 8) return; st.moved = true; b.classList.add("drag"); b.style.setProperty("--x", st.ox + dx + "px"); b.style.setProperty("--y", st.oy + dy + "px"); });
  const end = e => { if (!st) return; const s0 = st; st = null; b.classList.remove("drag", "tuck");
    if (!s0.moved) { onTap(); return; }
    const x = parseFloat(b.style.getPropertyValue("--x")), y = parseFloat(b.style.getPropertyValue("--y")), H = innerHeight;
    const p = { side: x + 30 > innerWidth / 2 ? "r" : "l", y: Math.max(0, Math.min(1, (y - 70) / Math.max(1, H - 60 - 16 - 70))) };
    try { localStorage.setItem(POSK, JSON.stringify(p)); } catch (_) {} place(b, p); mood("happy", 800); };
  b.addEventListener("pointerup", end); addEventListener("pointerup", end); // גם אם האצבע "ברחה" מהרובוט b.addEventListener("pointercancel", () => { if (st) { st = null; b.classList.remove("drag"); place(b, posGet()); } });
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } });
}
// גוללים → מתחבא חצי לצד; עוצרים → חוזר
function tuckOnScroll(b) { let t = 0, lastY = scrollY; addEventListener("scroll", () => { if (Math.abs(scrollY - lastY) < 6) return; lastY = scrollY; if (!panel || panel.hidden) b.classList.add("tuck"); clearTimeout(t); t = setTimeout(() => b.classList.remove("tuck"), 1100); }, { passive: true }); }
// כותבים בשדה כלשהו בדף → הרובוט זז לגמרי מהדרך (שלא יסתיר כפתורים ליד המקלדת)
function awayWhileTyping(b) {
  const isField = el => el && el.matches && el.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select,[contenteditable]") && !el.closest("#asstP");
  document.addEventListener("focusin", e => { if (isField(e.target)) b.classList.add("away"); });
  document.addEventListener("focusout", () => setTimeout(() => { if (!isField(document.activeElement)) b.classList.remove("away"); }, 200));
}
// העיניים מסתכלות לכיוון האצבע/העכבר
function eyesFollow() { addEventListener("pointermove", e => { const b = document.getElementById("asstBtn"); if (!b) return; const r = b.getBoundingClientRect(), dx = e.clientX - (r.left + 30), dy = e.clientY - (r.top + 30), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
  b.querySelectorAll(".look").forEach(l => { if (!l.closest(".think")) l.style.transform = `translate(${(dx / d * 2.6 * k).toFixed(2)}px,${(dy / d * 2.2 * k).toFixed(2)}px)`; }); }, { passive: true }); }
function hideToday() { try { localStorage.setItem("asstHideDay", new Date().toDateString()); } catch (e) {} closePanel(); const b = document.getElementById("asstBtn"); if (b) b.remove(); toastSay("נתראה מחר 👋 אפשר להחזיר אותי בפרופיל ← תצוגה"); }
function greet(b) {
  let seen = false; try { seen = localStorage.getItem("asstGreeted") === "1"; localStorage.setItem("asstGreeted", "1"); } catch (e) {}
  if (seen) return;
  setTimeout(() => { if (!b.isConnected || b.getClientRects().length === 0 || getComputedStyle(b).display === "none") return;
    mood("wave", 1400); const r = b.getBoundingClientRect(), t = document.createElement("div"); t.className = "asst-tip"; t.innerHTML = "היי! אני מערכתי 👋<small>אפשר לשאול אותי הכל – ולגרור אותי לאן שנוח</small>";
    document.body.appendChild(t); const tw = t.offsetWidth; t.style.top = Math.max(10, r.top - t.offsetHeight - 10) + "px"; t.style.left = Math.min(innerWidth - tw - 10, Math.max(10, r.left + 30 - tw / 2)) + "px";
    const bye = () => { t.remove(); removeEventListener("pointerdown", bye, true); }; addEventListener("pointerdown", bye, true); setTimeout(bye, 6000); }, 1800);
}
function build() {
  css();
  const b = document.createElement("button"); b.id = "asstBtn"; b.type = "button"; b.setAttribute("aria-label", "מערכתי – העוזר (אפשר לגרור)"); b.title = "מערכתי – העוזר (אפשר לגרור)"; b.innerHTML = robotSVG(); document.body.appendChild(b);
  place(b, posGet()); addEventListener("resize", () => place(b, posGet()));
  panel = document.createElement("div"); panel.id = "asstP"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "מערכתי");
  panel.innerHTML = `<div class="ah"><span class="hb">${robotSVG()}</span><b>מערכתי<small>העוזר שלך באפליקציה</small></b><button type="button" class="hide" title="להסתיר את הרובוט עד מחר">👋 הסתר</button><button type="button" class="ax" aria-label="סגור">✕</button></div>
    <div class="alog" aria-live="polite"></div><div class="achips">${CHIPS.map(c => `<button type="button">${esc(c)}</button>`).join("")}</div>
    <div class="quota" id="asstQ"></div>
    <form><input type="text" placeholder="מה צריך? כתוב או דבר 🎤" enterkeyhint="send" autocomplete="off" aria-label="ההודעה שלך"><button type="button" class="mic" aria-label="דבר">🎤</button><button type="submit" aria-label="שלח">➤</button></form>`;
  document.body.appendChild(panel);
  log = panel.querySelector(".alog"); inp = panel.querySelector("input");
  dragify(b, () => (panel.hidden ? openPanel() : closePanel())); tuckOnScroll(b); awayWhileTyping(b); eyesFollow(); greet(b);
  panel.querySelector(".ax").onclick = closePanel;
  panel.querySelector(".hide").onclick = hideToday;
  panel.querySelector("form").onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); if (v) { inp.value = ""; send(v); } };
  panel.querySelectorAll(".achips button").forEach(c => c.onclick = () => send(c.textContent));
  const mic = panel.querySelector(".mic"), SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  if (!SR) mic.hidden = true; else mic.onclick = () => listen(SR, mic);
  try { hist = JSON.parse(sessionStorage.getItem("asst:hist") || "[]"); } catch (e) { hist = []; }
  if (hist.length) hist.slice(-8).forEach(h => bubble(h.role === "user" ? "me" : "bot", h.html || esc(h.text)));
}
function openPanel() { const b = document.getElementById("asstBtn"); if (b) { const r = b.getBoundingClientRect(); panel.style.setProperty("--ox", (r.left + 30 < innerWidth / 2 ? 8 : 92) + "%"); sparks(b); } document.querySelectorAll(".asst-tip").forEach(t => t.remove());
  panel.classList.remove("pop"); void panel.offsetWidth; panel.classList.add("pop"); panel.hidden = false; mood("wave", 1300); if (!log.children.length) bubble("bot", HELP); quota(); setTimeout(() => inp.focus({ preventScroll: true }), 50); log.scrollTop = log.scrollHeight; }
function closePanel() { panel.hidden = true; }
function closePanelSoft() { if (!panel) return; if (innerWidth < 700) panel.hidden = true; }
function quota() { const st = aiLS(), el = panel && panel.querySelector("#asstQ"); if (!el) return; el.textContent = st.day === new Date().toDateString() && typeof st.left === "number" ? (st.left > 0 ? `🧠 נשארו לך היום ${st.left} שאלות למוח החכם` : "🧠 המוח החכם נח עד מחר – המוח המהיר ממשיך לעזור ⚡") : ""; }
function bubble(who, html, cls = "") { const d = document.createElement("div"); d.className = `am ${who} ${cls}`; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
function remember(role, text, html, ai) { hist.push({ role, text: String(text).slice(0, 400), html: html ? String(html).slice(0, 2000) : undefined, ...(ai ? { ai: 1 } : {}) }); hist = hist.slice(-12); try { sessionStorage.setItem("asst:hist", JSON.stringify(hist)); } catch (e) {} }
function botSay(html, cls) { if (!panel) return; if (panel.hidden) panel.hidden = false; mood("talk", Math.min(2200, 500 + String(html).length * 12)); const d = bubble("bot", html, cls); remember("bot", d.textContent, html, cls === "ai"); return d; }
function say(t) { botSay(esc(t)); }
function toastSay(html) { const t = document.createElement("div"); t.className = "asst-toast"; t.innerHTML = "🤖 " + html; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
function listen(SR, mic) {
  if (mic.classList.contains("on")) { try { listen.r && listen.r.stop(); } catch (e) {} return; }
  const r = new SR(); listen.r = r; r.lang = "he-IL"; r.interimResults = true; r.maxAlternatives = 1;
  mic.classList.add("on"); inp.placeholder = "מקשיב… 🎤";
  r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(""); inp.value = t; if (e.results[e.results.length - 1].isFinal) { r.stop(); setTimeout(() => { const v = inp.value.trim(); if (v) { inp.value = ""; send(v); } }, 250); } };
  r.onerror = e => { if (e.error === "not-allowed") say("צריך לאשר גישה למיקרופון 🎤 (או פשוט לכתוב)."); };
  r.onend = () => { mic.classList.remove("on"); inp.placeholder = "מה צריך? כתוב או דבר 🎤"; };
  try { r.start(); } catch (e) { mic.classList.remove("on"); }
}
async function ensureTopics() { if (root.Topics) return; await new Promise(res => { const s = document.createElement("script"); s.src = "calc-topics.js"; s.onload = s.onerror = res; document.head.appendChild(s); }); }
async function ensureSci() { if (root.Sci) return; await new Promise(res => { const s = document.createElement("script"); s.src = "calc-sci.js"; s.onload = s.onerror = res; document.head.appendChild(s); }); }
async function send(text) {
  if (busy) return; busy = true;
  bubble("me", esc(text)); remember("user", text);
  try { await ensureTopics(); await handle(text); } catch (e) { console.warn(e); say("אופס, משהו השתבש 😕 נסה שוב."); }
  busy = false; quota();
}
// ההחלטה: פקודה ברורה → המוח המהיר (מיידי, בלי לבזבז שאלות). אחרת → המוח החכם. אין AI → הניחוש הכי טוב + הצעות
async function handle(text) {
  const r = think(text);
  if (r.id === "compute") { await ensureSci(); try { const v = Sci.evaluate(r.arg, { deg: true }); botSay(`<span dir="ltr">${esc(r.arg.replace(/\*/g, "×").replace(/\//g, "÷"))} = <b>${esc(Sci.fmt(v))}</b></span> <button class="go" data-a="sci">🔢 למחשבון המדעי</button>`); wire(); return; } catch (e) { /* לא חישוב – ממשיכים */ } }
  if (r.id && r.conf >= 0.85) return local(r);
  const ai = await withDots(() => askAI(text, hist.slice(0, -1).filter(h => h.role === "user" || h.ai).map(h => ({ role: h.role === "user" ? "user" : "model", text: h.text }))));
  if (ai && ai.ok) {
    const ok = ai.action && ACT[ai.action.id];
    // שני המוחות ביחד: מתחת לתשובה של ה-AI – כפתורים מהמוח המהיר (הסבר, תרגול, או הפעולה שהוא זיהה)
    const btns = [];
    if (r.id === "topic" || r.id === "practice") { const t = r.id === "topic" ? r.arg : r.arg && r.arg.t; if (t) { btns.push(["topic", t, "📖 הסבר בנושא"]); btns.push(["practice", { t }, "🎯 לתרגל"]); } }
    else if (r.id && ACT[r.id] && r.conf >= 0.5 && !ACT[r.id].answer && ACT[r.id].label) btns.push([r.id, r.arg, "👉 " + ACT[r.id].label]);
    const show = btns.filter(([id, a]) => !(ai.action && ai.action.id === id && JSON.stringify(ai.action.arg) === JSON.stringify(a)));
    botSay(esc(ai.reply || "").replace(/\n/g, "<br>") + (show.length ? "<br>" + show.map(([id, a, l]) => `<button class="go" data-a="${id}" data-g='${esc(JSON.stringify(a ?? null))}'>${esc(l)}</button>`).join("") : "") + `<span class="tag">🧠 המוח החכם (AI) – כדאי לבדוק</span>`, "ai"); wire();
    if (ok) { remember("bot", `[פעולה: ${ai.action.id}]`); await sleep(500); await act(ai.action.id, ai.action.arg, { say: esc(ai.reply || "").slice(0, 120) }); }
    return;
  }
  const why = !ai || ai.error === "no_ai" ? "" : ai.error === "quota" ? "🧠 נגמרו 20 השאלות למוח החכם להיום – אבל המוח המהיר ממשיך ⚡" : ai.error === "busy" ? "🧠 המוח החכם עמוס כרגע, אז עניתי במוח המהיר ⚡" : ai.error === "network" ? "📶 אין חיבור כרגע – עניתי במוח המהיר ⚡" : ai.error === "key" ? `🧠 המוח החכם לא מחובר כמו שצריך (בעיה במפתח${ai.code ? " · " + ai.code : ""}) – עניתי במוח המהיר ⚡` : `🧠 המוח החכם לא הצליח לענות${ai.code ? " (קוד " + ai.code + ")" : ai.error === "slow" ? " (לקח יותר מדי זמן)" : ""} – עניתי במוח המהיר ⚡`;
  if (r.id && r.conf >= 0.5) return local(r, why);
  // לא הבנתי – מציעים
  const opts = (r.alts || []).concat(think(text.split(" ").slice(-2).join(" ")).id ? [{ id: think(text.split(" ").slice(-2).join(" ")).id }] : []).filter((x, i, a) => x.id && ACT[x.id] && a.findIndex(y => y.id === x.id) === i).slice(0, 3);
  botSay(`${why ? why + "<br>" : ""}לא בטוח שהבנתי 🤔 ${opts.length ? "אולי התכוונת ל:" : "נסה לכתוב אחרת, למשל \"תיקח אותי למחשבון\"."}<br>${opts.map(o => `<button class="go" data-a="${o.id}" data-g='${esc(JSON.stringify(o.arg ?? null))}'>${esc(ACT[o.id].label || o.id)}</button>`).join("")}`); wire();
}
async function local(r, pre = "") {
  if (SMALL[r.id]) { botSay((pre ? pre + "<br>" : "") + SMALL[r.id][Math.floor(Math.random() * SMALL[r.id].length)]); return; }
  if (r.id === "help") { botSay(HELP); return; }
  if (r.say) botSay((pre ? pre + "<br>" : "") + r.say);
  else { const s = sayFor(r); if (s) botSay((pre ? pre + "<br>" : "") + s); }
  if (ACT[r.id] && ACT[r.id].answer) { if (onPage(ix)) botSay(answer(r.id, r.arg)); else { botSay("רגע, בודק במערכת שלך… 🔎"); await act(r.id, r.arg); } return; }
  await sleep(450); await act(r.id, r.arg, { say: sayFor(r) });
}
function wire() { log.querySelectorAll("button.go:not([data-w])").forEach(b => { b.dataset.w = 1; b.onclick = () => { let a = null; try { a = JSON.parse(b.dataset.g || "null"); } catch (e) {} act(b.dataset.a, a ?? undefined); }; }); }
async function withDots(f) { const d = document.createElement("div"); d.className = "dots"; d.innerHTML = "<i></i><i></i><i></i>"; log.appendChild(d); log.scrollTop = log.scrollHeight; mood("think"); try { return await f(); } finally { d.remove(); mood(null); } }

// ===================== הפעלה =====================
const api = { think, norm, ACT, INT, mathExpr, equation, findSubject, findDay, findLevel, findColor, answer, act };
if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
root.Asst = api;
api.show = () => { try { localStorage.removeItem("asstOff"); localStorage.removeItem("asstHideDay"); } catch (e) {} if (!document.getElementById("asstBtn")) { if (panel) { panel.remove(); panel = null; } build(); } };
api.off = () => { try { localStorage.setItem("asstOff", "1"); } catch (e) {} const b = document.getElementById("asstBtn"); if (b) b.remove(); if (panel) panel.hidden = true; };
function start() {
  if (document.getElementById("asstBtn")) return;
  let off = false; try { off = localStorage.getItem("asstOff") === "1" || localStorage.getItem("asstHideDay") === new Date().toDateString(); } catch (e) {}
  if (off) { resume(); return; } // מוסתר – אבל פעולה שהתחילה בדף אחר עדיין מסתיימת
  build(); resume();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(typeof window !== "undefined" ? window : globalThis);
