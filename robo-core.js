// 🤖 "הרובוט שלי" – הלוגיקה: אביזרים, נדירות, תיבות, רצף כניסות יומי, חנות וברגים.
// בלי ממשק (את זה עושה robo.js) – כדי שאפשר לבדוק הכל ב-Node (scripts/test-robo.js).
// הכל נשמר בטלפון בלבד (localStorage "robo"). רק אביזרי "אולטרה אגדי" נבדקים מול השרת (כמות מוגבלת לכל הישיבה).
(function (root) {
  // ---- דרגות נדירות (כמו בבראול סטארס) ----
  // dup = כמה ברגים מקבלים על אביזר שכבר יש לך · price = מחיר בחנות (רק עד אפי)
  const RAR = {
    c: { n: "רגיל", col: "#a3b1c2", dup: 4, price: 40, o: 0 },
    r: { n: "נדיר", col: "#2ecc71", dup: 10, price: 90, o: 1 },
    s: { n: "סופר נדיר", col: "#3b82f6", dup: 20, price: 200, o: 2 },
    e: { n: "אפי", col: "#a855f7", dup: 40, price: 450, o: 3 },
    m: { n: "מיתי", col: "#ef4444", dup: 100, o: 4 },
    l: { n: "אגדי", col: "#facc15", dup: 200, o: 5 },
    u: { n: "אולטרה אגדי", col: "#ffd700", dup: 500, o: 6 },
  };
  const RK = ["c", "r", "s", "e", "m", "l", "u"];

  // ---- האביזרים ----
  // cat: skin חליפה/צבע · hat כובע · eyes משקפיים/עיניים · held ביד · aura הילה · theme עיצוב לאפליקציה · page עיצוב לעמוד
  // x = לא יוצא בתיבות (רק מרצף / מקצוע) · cap = כמה יש בכל הישיבה (נבדק בשרת)
  const CATS = { skin: "חליפות", hat: "כובעים", eyes: "משקפיים", held: "ביד", aura: "הילות", trail: "עקבות", quote: "קריאות", theme: "עיצובים לאפליקציה", page: "עיצובים לעמוד" };
  const I = [
    // חליפות
    ["skin:classic", "skin", "קלאסי", "c", { free: 1 }], ["skin:mint", "skin", "מנטה", "c"], ["skin:sky", "skin", "תכלת", "c"], ["skin:pink", "skin", "ורוד", "c"],
    ["skin:orange", "skin", "כתום", "c"], ["skin:lemon", "skin", "לימון", "c"], ["skin:coal", "skin", "פחם", "c"],
    ["skin:silver", "skin", "כסף מטאלי", "r"], ["skin:camo", "skin", "הסוואה", "r"], ["skin:candy", "skin", "סוכרייה", "r"],
    ["skin:neon", "skin", "ניאון", "s"], ["skin:ice", "skin", "קרח", "s"],
    ["skin:ninja", "skin", "נינג'ה", "e"], ["skin:lava", "skin", "לבה", "e"], ["skin:galaxy", "skin", "גלקסיה", "e"],
    ["skin:space", "skin", "חליפת חלל", "m"], ["skin:fire", "skin", "חליפת אש", "m"], ["skin:rainbow", "skin", "קשת בענן", "m"],
    ["skin:knight", "skin", "שריון אבירים", "l"], ["skin:holo", "skin", "הולוגרמה", "l"],
    ["skin:diamond", "skin", "חליפת יהלומים", "u", { cap: 5 }], ["skin:gold", "skin", "חליפת זהב טהור", "u", { cap: 3 }],
    // כובעים
    ["hat:cap", "hat", "מצחייה", "c"], ["hat:kippah", "hat", "כיפה סרוגה", "c"], ["hat:beanie", "hat", "כובע צמר", "c"], ["hat:party", "hat", "כובע מסיבה", "c"],
    ["hat:grad", "hat", "כובע סיום", "r"], ["hat:chef", "hat", "כובע שף", "r"], ["hat:pirate", "hat", "כובע פיראטים", "r"],
    ["hat:propeller", "hat", "כובע פרופלור", "s"], ["hat:viking", "hat", "קסדת ויקינג", "s"], ["hat:tophat", "hat", "מגבעת", "s"],
    ["hat:crown", "hat", "כתר", "e"], ["hat:wizard", "hat", "כובע קוסם", "e"],
    ["hat:flame", "hat", "שיער של אש", "m"], ["hat:halo", "hat", "הילת מלאך", "m"],
    ["hat:diamondcrown", "hat", "כתר יהלומים", "l"],
    ["hat:streak", "hat", "כתר הרצף 🔥", "e", { x: 1, how: "רצף של 30 ימים" }],
    // משקפיים ועיניים
    ["eyes:nerd", "eyes", "משקפי חנון", "c"], ["eyes:round", "eyes", "משקפיים עגולים", "c"],
    ["eyes:sun", "eyes", "משקפי שמש", "r"], ["eyes:heart", "eyes", "עיני לב", "r"], ["eyes:star", "eyes", "עיני כוכבים", "r"],
    ["eyes:3d", "eyes", "משקפי תלת-ממד", "s"], ["eyes:ski", "eyes", "משקפי סקי", "s"],
    ["eyes:laser", "eyes", "ויזור לייזר", "e"], ["eyes:vr", "eyes", "משקפי VR", "m"], ["eyes:rainbow", "eyes", "עיני קשת", "l"],
    // ביד
    ["held:ball", "held", "כדורגל ⚽", "c", { em: "⚽" }], ["held:basket", "held", "כדורסל 🏀", "c", { em: "🏀" }], ["held:pizza", "held", "פיצה 🍕", "c", { em: "🍕" }], ["held:book", "held", "ספרים 📚", "c", { em: "📚" }],
    ["held:guitar", "held", "גיטרה 🎸", "r", { em: "🎸" }], ["held:game", "held", "שלט 🎮", "r", { em: "🎮" }], ["held:icecream", "held", "גלידה 🍦", "r", { em: "🍦" }], ["held:balloon", "held", "בלון 🎈", "r", { em: "🎈" }],
    ["held:wand", "held", "שרביט קסמים 🪄", "s", { em: "🪄" }], ["held:bolt", "held", "ברק ⚡", "s", { em: "⚡" }],
    ["held:trophy", "held", "גביע 🏆", "e", { em: "🏆" }], ["held:planet", "held", "כוכב לכת 🪐", "m", { em: "🪐" }], ["held:gem", "held", "יהלום 💎", "l", { em: "💎" }],
    ["held:medal", "held", "מדליית מקצוע 🥇", "e", { em: "🥇", x: 1, how: "רצף של 100 שיעורים במקצוע" }],
    // הילות
    ["aura:bubbles", "aura", "בועות", "r"], ["aura:bolts", "aura", "ברקים", "s"], ["aura:flames", "aura", "להבות", "e"], ["aura:stars", "aura", "כוכבים מסתובבים", "m"], ["aura:rays", "aura", "קרני זהב", "l"],
    ["aura:streak", "aura", "הילת 100 הימים", "l", { x: 1, how: "רצף של 100 ימים" }],
    // עיצובים לכל האפליקציה (נכנסים לבחירת הצבע בפרופיל)
    ["theme:neon", "theme", "ניאון", "s", { grad: "linear-gradient(135deg,#0f172a 0%,#06b6d4 55%,#d946ef 100%)" }],
    ["theme:candy", "theme", "סוכרייה", "s", { grad: "linear-gradient(135deg,#f472b6 0%,#c084fc 50%,#38bdf8 100%)" }],
    ["theme:galaxy", "theme", "גלקסיה", "e", { grad: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 50%,#db2777 100%)" }],
    ["theme:lava", "theme", "לבה", "e", { grad: "linear-gradient(135deg,#1c1917 0%,#b91c1c 50%,#f97316 100%)" }],
    ["theme:aurora", "theme", "זוהר צפוני", "m", { grad: "linear-gradient(135deg,#022c22 0%,#059669 40%,#6366f1 75%,#ec4899 100%)" }],
    ["theme:gold", "theme", "זהב", "l", { grad: "linear-gradient(135deg,#78350f 0%,#d97706 40%,#facc15 70%,#a16207 100%)" }],
    // עיצוב לעמוד אחד (הכותרת של אותו עמוד)
    ["page:absences:ocean", "page", "נוכחות – אוקיינוס", "r", { pg: "absences", grad: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#22d3ee 100%)" }],
    ["page:phones:retro", "page", "ספר טלפונים – רטרו", "r", { pg: "phones", grad: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#facc15 100%)" }],
    ["page:cards:candy", "page", "כרטיסיות – ממתקים", "s", { pg: "cards", grad: "linear-gradient(135deg,#db2777 0%,#f472b6 45%,#a78bfa 100%)" }],
    ["page:calc:galaxy", "page", "מחשבון – גלקסיה", "e", { pg: "calc", grad: "linear-gradient(135deg,#0f0a2e 0%,#4c1d95 50%,#0ea5e9 100%)", x: 1, how: "רצף של 14 ימים" }],
    ["page:calc:matrix", "page", "מחשבון – מטריקס", "e", { pg: "calc", grad: "linear-gradient(135deg,#020617 0%,#14532d 50%,#22c55e 100%)" }],
    ["page:index:fire", "page", "עמוד הבית – בוער", "m", { pg: "index", grad: "linear-gradient(135deg,#450a0a 0%,#dc2626 45%,#f59e0b 100%)" }],
    // ===== עונה 2: עוד אביזרים =====
    ["skin:cookie", "skin", "עוגייה", "c"], ["skin:panda", "skin", "פנדה", "r"], ["skin:melon", "skin", "אבטיח", "r"], ["skin:pixel", "skin", "פיקסלים", "s"],
    ["skin:tiger", "skin", "טיגריס", "s"], ["skin:sakura", "skin", "פריחת דובדבן", "s"], ["skin:ocean", "skin", "גלי ים", "s"],
    ["skin:robocat", "skin", "רובו-חתול", "e"], ["skin:chrome", "skin", "כרום מראה", "e"], ["skin:circuit", "skin", "מעגלים חשמליים", "e"], ["skin:zombie", "skin", "זומבי", "e"],
    ["skin:dragon", "skin", "דרקון", "m"], ["skin:shadow", "skin", "צל סגול", "m"], ["skin:storm", "skin", "סערת ברקים", "l"],
    ["skin:phoenix", "skin", "עוף החול", "u", { cap: 2 }],
    ["hat:headphones", "hat", "אוזניות", "c"], ["hat:kippahblack", "hat", "כיפה שחורה", "c"], ["hat:beret", "hat", "כומתה", "c"],
    ["hat:cowboy", "hat", "כובע בוקרים", "r"], ["hat:bunny", "hat", "אוזני ארנב", "r"], ["hat:sombrero", "hat", "סומבררו", "s"], ["hat:jester", "hat", "כובע ליצן", "s"],
    ["hat:laurel", "hat", "זר דפנה", "e"], ["hat:unicorn", "hat", "קרן חד-קרן", "m"], ["hat:stars", "hat", "כתר כוכבים", "l"],
    ["eyes:monocle", "eyes", "מונוקל", "r"], ["eyes:dollar", "eyes", "עיני דולר", "r"], ["eyes:mask", "eyes", "מסכת זורו", "s"], ["eyes:visor", "eyes", "ויזור ירוק", "s"],
    ["eyes:cyclops", "eyes", "עין אחת ענקית", "e"], ["eyes:hypno", "eyes", "עיני היפנוזה", "e"], ["eyes:fire", "eyes", "עיני אש", "m"],
    ["held:burger", "held", "המבורגר 🍔", "c", { em: "🍔" }], ["held:juice", "held", "שוקו 🧃", "c", { em: "🧃" }], ["held:phone", "held", "טלפון 📱", "c", { em: "📱" }],
    ["held:skate", "held", "סקייטבורד 🛹", "r", { em: "🛹" }], ["held:kite", "held", "עפיפון 🪁", "r", { em: "🪁" }], ["held:cake", "held", "עוגה 🎂", "r", { em: "🎂" }], ["held:teddy", "held", "דובי 🧸", "r", { em: "🧸" }],
    ["held:mic", "held", "מיקרופון 🎤", "s", { em: "🎤" }], ["held:alien", "held", "חייזר 👾", "s", { em: "👾" }],
    ["held:crystal", "held", "כדור בדולח 🔮", "e", { em: "🔮" }], ["held:unicorn", "held", "חד-קרן 🦄", "e", { em: "🦄" }], ["held:dragon", "held", "דרקון 🐉", "m", { em: "🐉" }], ["held:rainbow", "held", "קשת 🌈", "l", { em: "🌈" }],
    ["aura:hearts", "aura", "לבבות", "r"], ["aura:notes", "aura", "תווים", "s"], ["aura:snow", "aura", "שלג", "s"], ["aura:petals", "aura", "עלי כותרת", "e"], ["aura:galaxy", "aura", "מערבולת גלקסיה", "m"], ["aura:rainbow", "aura", "טבעת קשת", "l"],
    // עקבות: מה שנשאר מאחורי הרובוט כשגוררים אותו
    ["trail:sparkle", "trail", "ניצוצות ✨", "c", { em: ["✨", "⭐"] }], ["trail:hearts", "trail", "לבבות 💖", "r", { em: ["💖", "💗", "💕"] }], ["trail:confetti", "trail", "קונפטי 🎉", "r", { em: ["🎉", "🎊", "✨"] }],
    ["trail:stars", "trail", "כוכבים 🌟", "s", { em: ["🌟", "⭐", "💫"] }], ["trail:fire", "trail", "אש 🔥", "e", { em: ["🔥", "💥"] }], ["trail:rainbow", "trail", "קשת 🌈", "m", { em: ["🌈", "✨", "💜", "💙"] }], ["trail:gems", "trail", "יהלומים 💎", "l", { em: ["💎", "✨", "👑"] }],
    // קריאות: מה הרובוט אומר כשלוחצים עליו
    ["quote:yalla", "quote", "יאללה בלגן! 🎉", "c"], ["quote:cool", "quote", "אני הכי מגניב 😎", "c"], ["quote:hello", "quote", "הלו? יש פה מישהו? 👀", "c"],
    ["quote:five", "quote", "תן לי חמש! ✋", "r"], ["quote:boom", "quote", "בום! 💥", "r"], ["quote:strong", "quote", "מי הכי חזק? 💪", "s"], ["quote:learn", "quote", "לימודים זה כוח 📚", "s"],
    ["quote:legend", "quote", "אני רובוט אגדי 👑", "e"], ["quote:fire", "quote", "!!!🔥🔥🔥", "m"], ["quote:ultra", "quote", "אולטרה מוד 🚀", "l"],
    ["theme:ocean", "theme", "אוקיינוס עמוק", "r", { grad: "linear-gradient(135deg,#082f49 0%,#0369a1 50%,#06b6d4 100%)" }],
    ["theme:pinksun", "theme", "שקיעה ורודה", "s", { grad: "linear-gradient(135deg,#831843 0%,#db2777 45%,#fb923c 100%)" }],
    ["theme:forest", "theme", "יער בלילה", "e", { grad: "linear-gradient(135deg,#052e16 0%,#166534 50%,#65a30d 100%)" }],
    ["theme:rainbow", "theme", "קשת בענן", "m", { grad: "linear-gradient(135deg,#dc2626 0%,#f59e0b 25%,#16a34a 50%,#2563eb 75%,#9333ea 100%)" }],
    ["page:absences:gold", "page", "נוכחות – זהב", "e", { pg: "absences", grad: "linear-gradient(135deg,#713f12 0%,#ca8a04 50%,#fde047 100%)" }],
    ["page:cards:neon", "page", "כרטיסיות – ניאון", "s", { pg: "cards", grad: "linear-gradient(135deg,#0f172a 0%,#0891b2 50%,#e879f9 100%)" }],
    ["page:phones:matrix", "page", "ספר טלפונים – מטריקס", "s", { pg: "phones", grad: "linear-gradient(135deg,#020617 0%,#14532d 50%,#22c55e 100%)" }],
    // ===== עונה 3 =====
    // 🦸 סדרת הגיבורים (מקוריים שלנו) – נדירים: רק מתיבת ענק, ולפעמים (2%) מתיבת מגה
    ["skin:nova", "skin", "נובה 🦸", "m", { hero: 1 }], ["skin:blaze", "skin", "להבה 🦸", "m", { hero: 1 }], ["skin:bolthero", "skin", "סופר-ברק 🦸", "m", { hero: 1 }],
    ["skin:titan", "skin", "שריון טיטאן 🦸", "l", { hero: 1 }], ["skin:captain", "skin", "קפטן רובו 🦸", "l", { hero: 1 }], ["skin:frost", "skin", "מלך הכפור 🦸", "l", { hero: 1 }],
    ["skin:cosmic", "skin", "השומר הקוסמי 🦸", "u", { hero: 1, cap: 2 }],
    ["hat:herohelm", "hat", "קסדת גיבור 🦸", "e", { hero: 1 }], ["eyes:heromask", "eyes", "מסכת גיבור 🦸", "e", { hero: 1 }],
    ["aura:cape", "aura", "גלימה אדומה 🦸", "e", { hero: 1 }], ["aura:capegold", "aura", "גלימת זהב 🦸", "l", { hero: 1 }], ["held:shield", "held", "מגן גיבור 🛡️", "m", { hero: 1, em: "🛡️" }],
    // חליפות חדשות
    ["skin:bubblegum", "skin", "מסטיק", "c", { sk: ["#fbcfe8", "#f9a8d4", "#ec4899"], e: "#db2777" }], ["skin:sand", "skin", "חול מדבר", "c", { sk: ["#fde68a", "#d6b26a", "#a16207"], e: "#92400e" }],
    ["skin:mintchoc", "skin", "מנטה-שוקולד", "r", { sk: ["#a7f3d0", "#6ee7b7", "#065f46"], e: "#3f2a14" }], ["skin:sunset", "skin", "שקיעה", "r", { sk: ["#fde047", "#fb923c", "#db2777"], e: "#fff7ed" }],
    ["skin:bronze", "skin", "ארד", "r", { sk: ["#fcd9a8", "#b45309", "#78350f"], e: "#fde68a", shine: 1 }], ["skin:arctic", "skin", "ארקטי", "r", { sk: ["#ffffff", "#e0f2fe", "#93c5fd"], e: "#2563eb" }],
    ["skin:matrix", "skin", "מטריקס", "s", { sk: ["#052e16", "#14532d", "#22c55e"], e: "#4ade80", s: "#020617" }], ["skin:grape", "skin", "ענבים", "s", { sk: ["#e9d5ff", "#a855f7", "#581c87"], e: "#f0abfc" }],
    ["skin:emerald", "skin", "אזמרגד", "e", { sk: ["#d1fae5", "#10b981", "#064e3b"], e: "#ecfdf5", shine: 1, tw: 1 }], ["skin:ruby", "skin", "אודם", "e", { sk: ["#fecdd3", "#e11d48", "#881337"], e: "#fff1f2", shine: 1, tw: 1 }],
    ["skin:sapphire", "skin", "ספיר", "e", { sk: ["#dbeafe", "#2563eb", "#1e3a8a"], e: "#eff6ff", shine: 1, tw: 1 }], ["skin:amethyst", "skin", "אחלמה", "m", { sk: ["#f5d0fe", "#a21caf", "#4a044e"], e: "#fdf4ff", shine: 1, tw: 1 }],
    ["skin:obsidian", "skin", "אובסידיאן", "m", { sk: ["#4b5563", "#111827", "#000000"], e: "#a78bfa", shine: 1 }], ["skin:volcano", "skin", "הר געש", "m", { sk: ["#fde047", "#ea580c", "#1c1917"], e: "#fde68a" }],
    ["skin:aurora", "skin", "זוהר צפוני", "l", { sk: ["#5eead4", "#6366f1", "#ec4899"], e: "#ffffff", shine: 1, tw: 1 }], ["skin:crystal", "skin", "קריסטל קשת", "u", { cap: 3 }],
    ["skin:infinity", "skin", "האינסוף ♾️", "u", { cap: 1, one: 1 }], // 👑 רק אחד בכל הישיבה!
    // כובעים חדשים
    ["hat:sprout", "hat", "נבט על הראש 🌱", "c", { em: "🌱" }], ["hat:backcap", "hat", "כובע הפוך", "c"], ["hat:antennas", "hat", "אנטנות כפולות", "c"],
    ["hat:cloud", "hat", "ענן גשם ☁️", "r", { em: "🌧️" }], ["hat:catears", "hat", "אוזני חתול", "r"], ["hat:flowers", "hat", "זר פרחים 🌸", "r", { em: "🌸🌼🌸" }],
    ["hat:mohawk", "hat", "מוהוק", "s"], ["hat:tiara", "hat", "נזר", "e"], ["hat:samurai", "hat", "קסדת סמוראי", "e"],
    ["hat:rainbowhat", "hat", "קשת על הראש 🌈", "e", { em: "🌈" }], ["hat:comet", "hat", "שביט ☄️", "m", { em: "☄️" }], ["hat:spacehelm", "hat", "קסדת אסטרונאוט", "m"], ["hat:ufo", "hat", "צלחת מעופפת 🛸", "l", { em: "🛸" }],
    // עיניים חדשות
    ["eyes:sleepy", "eyes", "עיניים ישנוניות", "c"], ["eyes:wink", "eyes", "קריצה", "c"], ["eyes:xx", "eyes", "עיני X", "r"], ["eyes:goggles", "eyes", "משקפי מגן", "r"],
    ["eyes:goldshades", "eyes", "משקפי זהב", "e"], ["eyes:galaxy", "eyes", "עיני גלקסיה", "m"],
    // ביד
    ...[["melon", "🍉", "c"], ["popcorn", "🍿", "c"], ["cupcake", "🧁", "c"], ["lolly", "🍭", "c"], ["dice", "🎲", "c"], ["puzzle", "🧩", "c"], ["football", "🏈", "c"], ["pingpong", "🏓", "c"],
        ["target", "🎯", "r"], ["drum", "🥁", "r"], ["trumpet", "🎺", "r"], ["tennis", "🎾", "r"], ["glove", "🥊", "r"], ["cactus", "🌵", "r"], ["mushroom", "🍄", "r"],
        ["dino", "🦖", "s"], ["octopus", "🐙", "s"], ["fox", "🦊", "s"], ["penguin", "🐧", "s"], ["butterfly", "🦋", "s"],
        ["moon", "🌙", "e"], ["star", "⭐", "e"], ["ufo", "🛸", "e"], ["comet", "☄️", "m"], ["volcano", "🌋", "l"]].map(([k, em, r]) => ["held:" + k, "held", { melon: "אבטיח", popcorn: "פופקורן", cupcake: "קאפקייק", lolly: "סוכרייה על מקל", dice: "קובייה", puzzle: "פאזל", football: "פוטבול", pingpong: "פינג-פונג", target: "מטרה", drum: "תוף", trumpet: "חצוצרה", tennis: "טניס", glove: "כפפת אגרוף", cactus: "קקטוס", mushroom: "פטרייה", dino: "דינוזאור", octopus: "תמנון", fox: "שועל", penguin: "פינגווין", butterfly: "פרפר", moon: "ירח", star: "כוכב", ufo: "חללית", comet: "שביט", volcano: "הר געש" }[k] + " " + em, r, { em }]),
    // הילות (אימוג'י שמרחפים)
    ["aura:laughs", "aura", "צחוקים 😂", "r", { fl: ["😂", "🤣"] }], ["aura:ghosts", "aura", "רוחות 👻", "s", { fl: ["👻"] }], ["aura:coins", "aura", "מטבעות 🪙", "s", { fl: ["🪙", "✨"] }],
    ["aura:butterflies", "aura", "פרפרים 🦋", "e", { fl: ["🦋"] }], ["aura:dragons", "aura", "דרקונים 🐉", "m", { fl: ["🐉", "🔥"] }], ["aura:crowns", "aura", "כתרים 👑", "l", { fl: ["👑", "✨"] }],
    // עקבות
    ["trail:bubbles", "trail", "בועות 🫧", "c", { em: ["🫧", "💧"] }], ["trail:candy", "trail", "ממתקים 🍬", "r", { em: ["🍬", "🍭"] }], ["trail:leaves", "trail", "עלים 🍃", "r", { em: ["🍃", "🍂"] }],
    ["trail:notes", "trail", "תווים 🎵", "s", { em: ["🎵", "🎶"] }], ["trail:bolt", "trail", "ברקים ⚡", "s", { em: ["⚡", "✨"] }], ["trail:snow", "trail", "שלג ❄️", "e", { em: ["❄️", "✨"] }],
    ["trail:money", "trail", "כסף 💸", "e", { em: ["💸", "🪙"] }], ["trail:ghost", "trail", "רוחות 👻", "m", { em: ["👻", "✨"] }],
    // קריאות
    ...[["c", "תחזיק מעמד! 💪"], ["c", "מה קורה אחי? 😄"], ["c", "שבוע טוב! 🌟"], ["c", "בוא נלמד 📖"], ["r", "אין עליי! 😎"], ["r", "וואו!!! 🤩"], ["r", "יאללה הפסקה ☕"],
        ["s", "בדרך לאגדי ⭐"], ["s", "מי רוצה טרייד? 🔄"], ["s", "הרצף שלי בוער 🔥"], ["e", "אני מהעתיד 🤖"], ["e", "ברגים זה החיים 🔩"], ["m", "פתחתי מגה!!! 💠"], ["m", "אני גיבור על 🦸"], ["l", "אגדה מהלכת 👑"]].map(([r, t], i) => ["quote:s3_" + i, "quote", t, r]),
    // עיצובים
    ["theme:mint", "theme", "מנטה", "r", { grad: "linear-gradient(135deg,#065f46 0%,#10b981 50%,#a7f3d0 100%)" }], ["theme:cherry", "theme", "דובדבן", "s", { grad: "linear-gradient(135deg,#4c0519 0%,#be123c 50%,#fb7185 100%)" }],
    ["theme:space", "theme", "חלל עמוק", "e", { grad: "linear-gradient(135deg,#020617 0%,#1e1b4b 50%,#7c3aed 100%)" }], ["theme:hero", "theme", "גיבורים 🦸", "l", { grad: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 45%,#facc15 100%)", hero: 1 }],
    ["page:calc:sunset", "page", "מחשבון – שקיעה", "r", { pg: "calc", grad: "linear-gradient(135deg,#7c2d12 0%,#f97316 50%,#fde047 100%)" }],
    ["page:index:space", "page", "עמוד הבית – חלל", "e", { pg: "index", grad: "linear-gradient(135deg,#020617 0%,#1e3a8a 50%,#6366f1 100%)" }],
    ["page:cards:forest", "page", "כרטיסיות – יער", "r", { pg: "cards", grad: "linear-gradient(135deg,#052e16 0%,#15803d 50%,#86efac 100%)" }],
    // ===== עונה 5 (4.11.2026): המון אביזרים חדשים =====
    // 🦸 גיבורים חדשים – הדמויות. מי שאוסף את כל הגיבורים ראשון בישיבה מקבל את "האגדה" 👑
    ["skin:h_shadow", "skin", "צל הלילה 🦸", "m", { hero: 1, sk: ["#475569", "#0f172a", "#000000"], e: "#22d3ee", mk: "☾" }],
    ["skin:h_storm", "skin", "סערה 🦸", "m", { hero: 1, sk: ["#e0f2fe", "#38bdf8", "#1e3a8a"], e: "#ffffff", mk: "ϟ" }],
    ["skin:h_jungle", "skin", "מלך הג'ונגל 🦸", "m", { hero: 1, sk: ["#bbf7d0", "#16a34a", "#14532d"], e: "#fde047", mk: "✦" }],
    ["skin:h_magma", "skin", "מגמה 🦸", "m", { hero: 1, sk: ["#fde047", "#dc2626", "#450a0a"], e: "#fff7ed", mk: "▲" }],
    ["skin:h_pulse", "skin", "פולס 🦸", "m", { hero: 1, sk: ["#fbcfe8", "#db2777", "#500724"], e: "#fff1f2", mk: "♥" }],
    ["skin:h_quantum", "skin", "קוונטום 🦸", "l", { hero: 1, sk: ["#a5f3fc", "#7c3aed", "#0f0a2e"], e: "#ecfeff", shine: 1, tw: 1, mk: "⚛" }],
    ["skin:h_steel", "skin", "לוחם הפלדה 🦸", "l", { hero: 1, sk: ["#f8fafc", "#64748b", "#0f172a"], e: "#38bdf8", shine: 1, mk: "★" }],
    ["skin:h_star", "skin", "כוכבת הצפון 🦸", "l", { hero: 1, sk: ["#fef9c3", "#facc15", "#1e3a8a"], e: "#ffffff", tw: 1, mk: "✶" }],
    ["hat:h_crest", "hat", "סמל הגיבורים ⚜️ 🦸", "e", { hero: 1, em: "⚜️" }],
    ["held:h_hammer", "held", "פטיש הברקים 🔨 🦸", "m", { hero: 1, em: "🔨" }],
    ["held:h_star", "held", "כוכב הכוח 🌟 🦸", "m", { hero: 1, em: "🌟" }],
    ["aura:h_light", "aura", "כנפי אור 🕊️ 🦸", "l", { hero: 1, fl: ["🕊️", "✨"] }],
    ["trail:h_power", "trail", "עקבות כוח 💥 🦸", "e", { hero: 1, em: ["💥", "⚡", "✨"] }],
    // 👑 האגדה: רק אחד בכל הישיבה – למי שאוסף ראשון את כל הגיבורים (לא יוצא בתיבות)
    ["skin:legend", "skin", "👑 האגדה", "u", { cap: 1, one: 1, x: 1, how: "הראשון בישיבה שאוסף את כל הגיבורים 🦸 – רק אחד יקבל!" }],
    // חליפות
    ...[["peach", "אפרסק", "c", ["#ffedd5", "#fdba74", "#ea580c"], "#7c2d12"], ["lilac", "לילך", "c", ["#f3e8ff", "#d8b4fe", "#9333ea"], "#581c87"], ["lime", "ליים", "c", ["#ecfccb", "#a3e635", "#4d7c0f"], "#365314"],
        ["denim", "ג'ינס", "c", ["#bfdbfe", "#3b82f6", "#1e3a8a"], "#eff6ff"], ["choco", "שוקולד", "c", ["#d6a77a", "#7c4a1e", "#3f2a14"], "#fde68a"],
        ["cotton", "צמר גפן מתוק", "r", ["#fce7f3", "#c4b5fd", "#93c5fd"], "#7c3aed"], ["copper", "נחושת", "r", ["#fed7aa", "#c2410c", "#7c2d12"], "#fff7ed", 1], ["teal", "טורקיז", "r", ["#ccfbf1", "#14b8a6", "#134e4a"], "#f0fdfa"],
        ["berry", "פירות יער", "r", ["#fbcfe8", "#be185d", "#4c0519"], "#fdf2f8"], ["toxic", "רעלי", "r", ["#ecfccb", "#84cc16", "#1a2e05"], "#d9f99d"],
        ["jade", "ירקן", "s", ["#d1fae5", "#059669", "#022c22"], "#ecfdf5", 1], ["twilight", "דמדומים", "s", ["#fde68a", "#c026d3", "#1e1b4b"], "#fdf4ff"], ["coral", "אלמוגים", "s", ["#ffe4e6", "#fb7185", "#9f1239"], "#fff1f2"],
        ["honey", "דבש", "s", ["#fef3c7", "#f59e0b", "#78350f"], "#451a03"], ["cyber", "סייבר", "s", ["#f0abfc", "#06b6d4", "#0f172a"], "#22d3ee"],
        ["nebula", "ערפילית", "e", ["#f5d0fe", "#7c3aed", "#0c0a2e"], "#f0abfc", 1, 1], ["plasma", "פלזמה", "e", ["#a5f3fc", "#ec4899", "#4c1d95"], "#ffffff", 1], ["pearl", "פנינה", "e", ["#ffffff", "#e2e8f0", "#cbd5e1"], "#a855f7", 1, 1],
        ["sunfire", "אש השמש", "e", ["#fef08a", "#f97316", "#b91c1c"], "#fffbeb", 1],
        ["abyss", "תהום", "m", ["#1e3a8a", "#020617", "#000000"], "#38bdf8", 0, 1], ["solar", "שמש בוערת", "m", ["#fffbeb", "#facc15", "#ea580c"], "#7c2d12", 1, 1], ["frostfire", "קרח ואש", "m", ["#bae6fd", "#a855f7", "#ef4444"], "#ffffff", 1],
        ["prism", "פריזמה", "l", ["#fde68a", "#34d399", "#818cf8"], "#ffffff", 1, 1], ["royal", "מלכותי", "l", ["#fef3c7", "#7c3aed", "#1e1b4b"], "#facc15", 1, 1]]
      .map(([k, n, r, sk, e, shine, tw]) => ["skin:" + k, "skin", n, r, { sk, e, ...(shine ? { shine: 1 } : {}), ...(tw ? { tw: 1 } : {}) }]),
    // כובעים (אימוג'י על הראש)
    ...[["bow", "פפיון 🎀", "🎀", "c"], ["sunflower", "חמנייה 🌻", "🌻", "c"], ["donut", "דונאט 🍩", "🍩", "c"], ["cherry", "דובדבנים 🍒", "🍒", "c"],
        ["rocket", "טיל 🚀", "🚀", "r"], ["bouquet", "זר 💐", "💐", "r"], ["shroom", "פטרייה 🍄", "🍄", "r"], ["ghost", "רוח 👻", "👻", "s"], ["octo", "תמנון 🐙", "🐙", "s"], ["snowman", "איש שלג ⛄", "⛄", "s"],
        ["dragonhead", "ראש דרקון 🐲", "🐲", "e"], ["sparkcrown", "כתר ניצוצות", "✨👑✨", "e"], ["triplefire", "אש משולשת", "🔥🔥🔥", "m"], ["saturn", "טבעת שבתאי 🪐", "🪐", "m"], ["galaxyhat", "גלקסיה 🌌", "🌌", "l"]]
      .map(([k, n, em, r]) => ["hat:" + k, "hat", n, r, { em }]),
    // ביד
    ...[["pretzel", "בייגלה 🥨", "🥨", "c"], ["cookie", "עוגייה 🍪", "🍪", "c"], ["baseball", "בייסבול ⚾", "⚾", "c"], ["volley", "כדורעף 🏐", "🏐", "c"], ["pencil", "עיפרון ✏️", "✏️", "c"], ["ruler", "סרגל 📏", "📏", "c"],
        ["violin", "כינור 🎻", "🎻", "r"], ["piano", "קלידים 🎹", "🎹", "r"], ["camera", "מצלמה 📷", "📷", "r"], ["scope", "טלסקופ 🔭", "🔭", "r"], ["tube", "מבחנה 🧪", "🧪", "r"], ["yoyo", "יו-יו 🪀", "🪀", "r"],
        ["parrot", "תוכי 🦜", "🦜", "s"], ["turtle", "צב 🐢", "🐢", "s"], ["dolphin", "דולפין 🐬", "🐬", "s"], ["rocket", "טיל 🚀", "🚀", "s"], ["magnet", "מגנט 🧲", "🧲", "s"],
        ["dna", "DNA 🧬", "🧬", "e"], ["earth", "כדור הארץ 🌍", "🌍", "e"], ["eagle", "נשר 🦅", "🦅", "e"], ["lion", "אריה 🦁", "🦁", "e"],
        ["trident", "קלשון 🔱", "🔱", "m"], ["tornado", "טורנדו 🌪️", "🌪️", "m"], ["sun", "שמש ☀️", "☀️", "l"], ["shooting", "כוכב נופל 🌠", "🌠", "l"]]
      .map(([k, n, em, r]) => ["held:" + k + (k === "rocket" ? "2" : ""), "held", n, r, { em }]),
    // הילות
    ...[["stars2", "כוכבים נוצצים", ["⭐", "💫"], "r"], ["clovers", "תלתנים 🍀", ["🍀"], "s"], ["balloons", "בלונים 🎈", ["🎈", "🎉"], "s"], ["frost", "פתיתי שלג ❄️", ["❄️", "✨"], "e"],
        ["sakura", "פריחה 🌸", ["🌸", "🌺"], "e"], ["thunder", "סערה ⛈️", ["⚡", "⛈️"], "m"], ["planets", "כוכבי לכת 🪐", ["🪐", "🌍", "🌙"], "m"], ["diamonds", "יהלומים 💎", ["💎", "✨"], "l"], ["phoenixfire", "אש עוף החול", ["🔥", "👑"], "l"]]
      .map(([k, n, fl, r]) => ["aura:" + k, "aura", n, r, { fl }]),
    // עקבות
    ...[["flowers", "פרחים 🌸", ["🌸", "🌼"], "c"], ["clover", "תלתן 🍀", ["🍀", "☘️"], "r"], ["balloons", "בלונים 🎈", ["🎈"], "s"], ["paws", "טביעות 🐾", ["🐾"], "s"],
        ["night", "לילה 🌙", ["🌙", "⭐"], "e"], ["butterfly", "פרפרים 🦋", ["🦋", "✨"], "m"], ["cosmos", "קוסמוס 🌌", ["🌌", "✨", "💫"], "l"], ["treasure", "אוצר 💰", ["🪙", "💎", "💰"], "l"]]
      .map(([k, n, em, r]) => ["trail:" + k, "trail", n, r, { em }]),
    // קריאות
    ...[["c", "בוקר טוב! ☀️"], ["c", "יש מבחן? 😱"], ["c", "אני רעב 🍕"], ["r", "אלוף העולם 🏆"], ["r", "תורי לשחק 🎮"], ["r", "קיבלתי 100! 💯"], ["s", "עונה חדשה! 🚀"],
        ["s", "אספתי הכל 😎"], ["e", "אף אחד לא עוצר אותי ⚡"], ["e", "גיבור אמיתי 🦸"], ["m", "האגדה מתחילה 👑"], ["l", "אני הבוס פה 💎"]]
      .map(([r, t], i) => ["quote:s5_" + i, "quote", t, r]),
    // עיצובים לאפליקציה
    ["theme:sunrise", "theme", "זריחה", "r", { grad: "linear-gradient(135deg,#fde68a 0%,#fb923c 50%,#f43f5e 100%)" }],
    ["theme:midnight", "theme", "חצות", "s", { grad: "linear-gradient(135deg,#020617 0%,#1e293b 50%,#0ea5e9 100%)" }],
    ["theme:emerald", "theme", "אזמרגד", "e", { grad: "linear-gradient(135deg,#022c22 0%,#047857 50%,#34d399 100%)" }],
    ["theme:royal", "theme", "מלכותי", "m", { grad: "linear-gradient(135deg,#1e1b4b 0%,#6d28d9 50%,#facc15 100%)" }],
    ["theme:goldx", "theme", "זהב טהור ויהלומים 💎", "u", { cap: 3, grad: "linear-gradient(120deg,#5c3a00 0%,#b8860b 18%,#fff2a8 35%,#d4a017 50%,#fff7c2 65%,#b8860b 82%,#5c3a00 100%)" }], // 💎 העיצוב הכי נדיר – רק 3 בכל הישיבה
    ["theme:legend", "theme", "אגדי 👑", "l", { grad: "linear-gradient(135deg,#000000 0%,#7f1d1d 45%,#facc15 100%)" }],
    // עיצובים לעמוד
    ["page:index:ocean", "page", "עמוד הבית – אוקיינוס", "s", { pg: "index", grad: "linear-gradient(135deg,#082f49 0%,#0284c7 50%,#67e8f9 100%)" }],
    ["page:index:gold", "page", "עמוד הבית – זהב", "l", { pg: "index", grad: "linear-gradient(135deg,#78350f 0%,#d97706 45%,#fde047 100%)" }],
    ["page:calc:ice", "page", "מחשבון – קרח", "s", { pg: "calc", grad: "linear-gradient(135deg,#0c4a6e 0%,#38bdf8 50%,#e0f2fe 100%)" }],
    ["page:absences:galaxy", "page", "נוכחות – גלקסיה", "m", { pg: "absences", grad: "linear-gradient(135deg,#0f0a2e 0%,#6d28d9 50%,#ec4899 100%)" }],
    ["page:phones:candy", "page", "ספר טלפונים – ממתקים", "r", { pg: "phones", grad: "linear-gradient(135deg,#db2777 0%,#f9a8d4 50%,#c4b5fd 100%)" }],
    // 🕎 חנוכה: יוצאים בתיבות רק בזמן חנוכה (ev). השמש = מי שמדליק את כל 8 הנרות
    ["skin:sufgania", "skin", "סופגנייה 🍩", "e", { ev: "hanukkah", sk: ["#fde68a", "#d97706", "#7c2d12"], e: "#fff7ed", tw: 1 }],
    ["skin:maccabi", "skin", "מכבי ⚔️", "m", { ev: "hanukkah", sk: ["#dbeafe", "#1d4ed8", "#1e1b4b"], e: "#fde047", shine: 1, mk: "✡" }],
    ["hat:menorah", "hat", "חנוכייה על הראש 🕎", "m", { ev: "hanukkah", em: "🕎" }], ["held:sufgania", "held", "סופגנייה 🍩", "r", { ev: "hanukkah", em: "🍩" }],
    ["held:oil", "held", "כד השמן 🫙", "s", { ev: "hanukkah", em: "🫙" }], ["aura:candles", "aura", "נרות חנוכה 🕯️", "e", { ev: "hanukkah", fl: ["🕯️", "✨"] }],
    ["trail:donuts", "trail", "סופגניות 🍩", "r", { ev: "hanukkah", em: ["🍩", "✨"] }], ["quote:nes", "quote", "נס גדול היה פה! 🕎", "c", { ev: "hanukkah" }],
    ["skin:shamash", "skin", "השמש 🕯️", "l", { x: 1, sk: ["#fffbeb", "#facc15", "#1e3a8a"], e: "#ffffff", shine: 1, tw: 1, mk: "🕯", how: "להדליק את כל 8 הנרות בחנוכה" }],
    ["page:cards:lava", "page", "כרטיסיות – לבה", "e", { pg: "cards", grad: "linear-gradient(135deg,#1c1917 0%,#dc2626 50%,#f97316 100%)" }],
  ];
  const ITEMS = {}; I.forEach(([id, cat, n, r, o]) => { ITEMS[id] = Object.assign({ id, cat, n, r }, o || {}); });
  const LIST = Object.values(ITEMS);
  const DROP = r => LIST.filter(x => x.r === r && !x.x && !x.free && !x.hero && (!x.ev || evOn(x.ev)));
  const HEROES = r => LIST.filter(x => x.r === r && x.hero);

  // ---- תיבות: כמה פרסים בכל תיבה, וסיכוי לכל דרגה (באחוזים, לכל פרס) ----
  const BOX = {
    box: { n: "תיבה", em: "📦", rolls: 2, kind: { item: 57, bolts: 40, box: 3 }, odds: { c: 58, r: 26, s: 11, e: 4, m: 0.85, l: 0.145, u: 0.005 }, bolts: [10, 25], price: 40, col: "#38bdf8" },
    big: { n: "תיבה גדולה", em: "🎁", rolls: 3, kind: { item: 65, bolts: 30, box: 5 }, odds: { c: 35, r: 32, s: 20, e: 9, m: 3.2, l: 0.78, u: 0.02 }, bolts: [35, 80], price: 130, col: "#a855f7" },
    mega: { n: "תיבת מגה", em: "💠", rolls: 6, kind: { item: 74, bolts: 20, box: 6 }, odds: { c: 10, r: 30, s: 30, e: 20, m: 7.5, l: 2.45, u: 0.05 }, bolts: [70, 160], price: 380, col: "#f43f5e", hero: 0.02 },
    giant: { n: "תיבת ענק", em: "💎", rolls: 9, kind: { item: 82, bolts: 12, box: 6 }, odds: { c: 0, r: 8, s: 24, e: 36, m: 22, l: 9.9, u: 0.1 }, bolts: [150, 320], price: 1200, col: "#06b6d4", hero: 0.3 },
  };
  const EXTRA = { box: "box", big: "box", mega: "big", giant: "mega" }; // תיבה בתוך תיבה
  // ⭐ שדרוג בכל לחיצה (כמו בבראול): התיבה מתחילה בדרגה מסוימת, ובכל אחת מ-4 הלחיצות יכולה לעלות דרגה.
  // הדרגה שבסוף = הפרס הראשי (אביזר מהדרגה הזו, מובטח). ועוד פרסים רגילים (extra) לפי הטבלה של התיבה.
  const TIERS = ["r", "s", "e", "m", "l", "u"], TAPS = 4;
  const START = { box: "r", big: "s", mega: "e", giant: "m" }, EXTRA_N = { box: 1, big: 2, mega: 5, giant: 8 };
  const UP = { r: 0.15, s: 0.075, e: 0.05, m: 0.035, l: 0.01, u: 0 }; // סיכוי לעלות דרגה בכל לחיצה
  function upgrades(type, rnd = Math.random, mult = 1) { let t = START[type]; const out = [t]; for (let i = 0; i < TAPS; i++) { if (rnd() < Math.min(0.9, UP[t] * mult)) t = TIERS[TIERS.indexOf(t) + 1]; out.push(t); } return out; }
  // הסיכוי המדויק לכל דרגה סופית (לטבלה שמוצגת לילדים)
  function finalOdds(type) { let d = { [START[type]]: 1 }; for (let i = 0; i < TAPS; i++) { const n = {}; for (const [t, p] of Object.entries(d)) { const up = UP[t]; n[t] = (n[t] || 0) + p * (1 - up); if (up) { const nx = TIERS[TIERS.indexOf(t) + 1]; n[nx] = (n[nx] || 0) + p * up; } } d = n; } const o = {}; for (const t of TIERS) o[t] = 100 * (d[t] || 0); return o; }

  // ---- תאריכים (שעון ישראל) ----
  const ymd = t => { const p = {}; for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t))) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}`; };
  const tOf = d => Date.parse(d + "T12:00:00Z"), add = (d, n) => new Date(tOf(d) + n * 864e5).toISOString().slice(0, 10), dow = d => new Date(tOf(d)).getUTCDay();
  // 🕎 איזה יום של חנוכה היום (1–8), או 0
  let hkTest = 0; const setHanukkahTest = n => { hkTest = n | 0; };
  function hanukkahDay(now = Date.now()) {
    if (hkTest) return hkTest; const H = typeof HolidaysCore !== "undefined" ? HolidaysCore : root.HolidaysCore; if (!H) return 0;
    const d = ymd(now), h = H.list(add(d, -9), 12).find(x => x.key === "hanukkah"); if (!h || d < h.start || d > h.end) return 0;
    return Math.round((tOf(d) - tOf(h.start)) / 864e5) + 1;
  }
  function hanukkahIn(now = Date.now()) { const H = typeof HolidaysCore !== "undefined" ? HolidaysCore : root.HolidaysCore; if (!H) return -1; const d = ymd(now), h = H.list(d, 40).find(x => x.key === "hanukkah" && x.start > d); return h ? Math.round((tOf(h.start) - tOf(d)) / 864e5) : -1; }
  let evMemo = { m: -1, v: 0 }; // נבדק פעם בדקה (החישוב איטי, ו-DROP נקרא הרבה)
  const evOn = ev => { if (ev !== "hanukkah") return false; if (hkTest) return true; const m = Math.floor(Date.now() / 60000); if (evMemo.m !== m) evMemo = { m, v: hanukkahDay() > 0 }; return evMemo.v; };
  // 🕯️ נר לכל יום של חנוכה – מתנה כל יום, ועל כל 8 = "השמש" (אגדי)
  const CANDLE = [[{ t: "bolts", n: 150 }], [{ t: "box", box: "big" }], [{ t: "bolts", n: 250 }], [{ t: "box", box: "mega" }], [{ t: "bolts", n: 400 }], [{ t: "box", box: "big" }, { t: "bolts", n: 200 }], [{ t: "box", box: "mega" }], [{ t: "box", box: "giant" }]];
  function lightCandle(S, now = Date.now()) {
    const day = hanukkahDay(now); if (!day) return { ok: false, error: "off" }; const y = add(ymd(now), -(day - 1)); // מזהה החג = היום הראשון שלו
    if (!S.hk || S.hk.y !== y) S.hk = { y, lit: {} };
    if (S.hk.lit[day]) return { ok: false, error: "done" }; S.hk.lit[day] = 1;
    const got = CANDLE[day - 1].map(p => grant(S, p)); let shamash = false;
    if (Object.keys(S.hk.lit).length === 8 && !S.own["skin:shamash"]) { got.push(grant(S, { t: "item", id: "skin:shamash", r: "l" })); shamash = true; S.hk.all = 1; }
    return { ok: true, day, got, shamash };
  }
  // ימים שלא שוברים רצף: שבת ויום טוב (בישיבה אין טלפונים)
  function restDay(d) {
    if (dow(d) === 6) return true;
    const H = typeof HolidaysCore !== "undefined" ? HolidaysCore : root.HolidaysCore; if (!H) return false;
    return H.list(add(d, -8), 10).some(h => (h.key === "rosh" && (d === h.start || d === h.end)) || (h.key === "pesach" && (d === h.start || d === h.end)) || (["kippur", "sukkot", "simchat", "shavuot"].includes(h.key) && d === h.start));
  }
  // כמה ימי חול "חובה" עברו בלי כניסה בין שני תאריכים (לא כולל אותם)
  function missed(a, b) { let n = 0; for (let d = add(a, 1), i = 0; d < b && i < 400; d = add(d, 1), i++) if (!restDay(d)) n++; return n; }

  // ---- מצב ----
  const fresh = () => ({ v: 1, bolts: 0, own: { "skin:classic": 1 }, eq: { skin: "skin:classic" }, st: { n: 0, last: "", best: 0 }, brk: null, boxes: [], mile: {}, news: [], got: 0, name: "", hide: false, opened: 0, trades: 0, gave: 0 });
  function norm(s) {
    const f = fresh(); if (!s || typeof s !== "object") return f;
    const o = Object.assign(f, s); o.own = Object.assign({ "skin:classic": 1 }, s.own || {}); o.eq = Object.assign({ skin: "skin:classic" }, s.eq || {});
    o.st = Object.assign({ n: 0, last: "", best: 0 }, s.st || {}); o.boxes = Array.isArray(s.boxes) ? s.boxes.filter(b => BOX[b]).slice(0, 99) : [];
    o.bolts = Math.max(0, Math.floor(+s.bolts || 0)); o.mile = s.mile && typeof s.mile === "object" ? s.mile : {}; o.news = Array.isArray(s.news) ? s.news.filter(id => ITEMS[id]) : [];
    for (const k of Object.keys(o.eq)) if (!ITEMS[o.eq[k]] || !o.own[o.eq[k]]) delete o.eq[k];
    if (!o.eq.skin) o.eq.skin = "skin:classic";
    return o;
  }

  // ---- הגרלות ----
  function pickW(w, rnd) { const tot = Object.values(w).reduce((a, b) => a + b, 0); let x = rnd() * tot; for (const [k, v] of Object.entries(w)) { if ((x -= v) < 0) return k; } return Object.keys(w)[0]; }
  // אביזר מדרגה מסוימת: 70% שיהיה חדש (אם יש כזה) – כמו בבראול
  function pickItem(S, r, rnd, hero = 0) {
    const hs = hero ? HEROES(r) : []; const all = hs.length && rnd() < hero ? hs : DROP(r); if (!all.length) return null;
    const nw = all.filter(x => !S.own[x.id]);
    const pool = nw.length && rnd() < 0.7 ? nw : all;
    return pool[Math.floor(rnd() * pool.length)].id;
  }
  // פותחים תיבה: רשימת פרסים (עוד לא נכנסים למצב – grant עושה את זה). אולטרה אגדי מסומן need:"claim" (שרת)
  function roll(S, type, rnd = Math.random) {
    const ev = typeof Date !== "undefined" && eventNow(), B = BOX[type], out = [], taps = upgrades(type, rnd, ev && rnd !== Math.random ? 1 : ev ? ev.up : 1), top = taps[taps.length - 1];
    for (let i = 0; i < EXTRA_N[type]; i++) {
      const k = pickW(B.kind, rnd);
      if (k === "bolts") out.push({ t: "bolts", n: Math.round(B.bolts[0] + rnd() * (B.bolts[1] - B.bolts[0])) });
      else if (k === "box") out.push({ t: "box", box: EXTRA[type] });
      else {
        let r = pickW(B.odds, rnd), id = pickItem(S, r, rnd, B.hero || 0);
        while (!id && r !== "c") { r = RK[RK.indexOf(r) - 1]; id = pickItem(S, r, rnd); }
        out.push({ t: "item", id, r, ...(r === "u" ? { need: "claim" } : {}), ...(rnd() < SHINY ? { shiny: 1 } : {}) });
      }
    }
    // הכי נדיר בסוף (מתח!) – והפרס הראשי (הדרגה שהתיבה הגיעה אליה) תמיד אחרון
    const rank = p => p.t === "item" ? RAR[p.r].o + 2 : p.t === "box" ? 1.5 : 0;
    out.sort((a, b) => rank(a) - rank(b));
    let r = top, id = pickItem(S, r, rnd, B.hero ? Math.min(1, B.hero * 1.5) : 0); while (!id && r !== "c") { r = RK[RK.indexOf(r) - 1]; id = pickItem(S, r, rnd); }
    out.push({ t: "item", id, r, main: 1, ...(r === "u" ? { need: "claim" } : {}), ...(rnd() < SHINY ? { shiny: 1 } : {}) });
    out.taps = taps; return out;
  }
  // הגרלה מדרגה מובטחת (פרסי רצף גדולים)
  const guaranteed = (S, r, rnd = Math.random) => ({ t: "item", id: pickItem(S, r, rnd), r });

  // מכניסים פרס למצב. מחזיר מה קרה בפועל (אביזר כפול → ברגים)
  function grant(S, p) {
    if (p.t === "bolts") { S.bolts += p.n; return p; }
    if (p.t === "box") { S.boxes.push(p.box); return p; }
    if (p.t === "item") {
      if (!ITEMS[p.id]) return { t: "bolts", n: 0 };
      if (p.shiny) { S.shiny = S.shiny || {}; if (!S.shiny[p.id]) { const had = !!S.own[p.id]; S.shiny[p.id] = 1; if (!S.own[p.id]) { S.own[p.id] = Date.now(); S.got++; } S.news.push(p.id); return Object.assign({}, p, { shinyNew: 1, had }); } }
      if (S.own[p.id]) { const n = RAR[ITEMS[p.id].r].dup; S.bolts += n; return Object.assign({}, p, { dup: n }); }
      S.own[p.id] = Date.now(); S.news.push(p.id); S.got++; return p;
    }
    return p;
  }

  // ---- רצף כניסות: מתנה כל יום, ככל שהרצף ארוך יותר – יותר שווה ----
  const LADDER = {
    1: [{ t: "box", box: "big" }], 2: [{ t: "bolts", n: 150 }], 3: [{ t: "box", box: "big" }], 4: [{ t: "bolts", n: 200 }], 5: [{ t: "box", box: "mega" }],
    7: [{ t: "box", box: "mega" }, { t: "item", id: "theme:neon" }, { t: "bolts", n: 300 }], 10: [{ t: "box", box: "mega" }, { t: "box", box: "big" }], 14: [{ t: "box", box: "mega" }, { t: "item", id: "page:calc:galaxy" }],
    21: [{ t: "box", box: "giant" }], 30: [{ t: "box", box: "giant" }, { t: "item", id: "hat:streak" }], 50: [{ t: "box", box: "giant" }, { t: "guar", r: "l" }],
    75: [{ t: "box", box: "giant" }, { t: "box", box: "mega" }], 100: [{ t: "item", id: "aura:streak" }, { t: "box", box: "giant" }, { t: "guar", r: "l" }],
    150: [{ t: "box", box: "giant" }, { t: "guar", r: "l" }], 200: [{ t: "box", box: "giant" }, { t: "box", box: "giant" }, { t: "guar", r: "l" }],
  };
  // מתנה בכל יום ברצף – ככל שהרצף ארוך יותר, יותר שווה: תיבת מגה כל שבוע, תיבת ענק כל 3 שבועות
  function dayGift(n) {
    if (LADDER[n]) return LADDER[n];
    if (n % 21 === 0) return [{ t: "box", box: "giant" }];
    if (n % 7 === 0) return [{ t: "box", box: "mega" }, { t: "bolts", n: 300 }];
    if (n % 2 === 1) return [{ t: "box", box: n > 10 ? "mega" : "big" }];
    return [{ t: "bolts", n: Math.min(800, 150 + n * 15) }];
  }
  // מחיר שמירת רצף שנשבר (בברגים) – ככל שהרצף ארוך יותר, יקר יותר
  const saveCost = n => Math.min(400, 30 + n * 4);
  // נכנסים לאפליקציה: פעם ביום (הפתיחה הראשונה). מחזיר null אם כבר נספר היום
  function checkIn(S, now = Date.now()) {
    const today = ymd(now);
    if (S.st.last === today) return null;
    let broken = null;
    if (!S.st.last || S.st.n <= 0) S.st.n = 1;
    else if (S.st.last > today) return null; // שעון לא תקין
    else if (missed(S.st.last, today) === 0) S.st.n += 1;
    else { broken = { n: S.st.n, ymd: today }; S.brk = broken; S.st.n = 1; }
    S.st.last = today; S.st.best = Math.max(S.st.best || 0, S.st.n);
    return { n: S.st.n, gift: dayGift(S.st.n), broken };
  }
  // שמירת הרצף (רק ביום שבו נשבר): משלמים ברגים, הרצף חוזר ונמשך (+1)
  function saveStreak(S, now = Date.now()) {
    const b = S.brk; if (!b || b.ymd !== ymd(now)) return { ok: false, error: "none" };
    const cost = saveCost(b.n); if (S.bolts < cost) return { ok: false, error: "bolts", cost };
    S.bolts -= cost; S.st.n = b.n + 1; S.st.best = Math.max(S.st.best, S.st.n); S.brk = null;
    return { ok: true, n: S.st.n, cost, gift: dayGift(S.st.n) };
  }
  // ---- רצף במקצוע (שיעורים ברצף בלי חיסור) → תיבות ----
  function subjectGift(m) { return m >= 100 ? (m === 100 ? [{ t: "box", box: "mega" }, { t: "item", id: "held:medal" }] : m % 50 === 0 ? [{ t: "box", box: "mega" }] : []) : m >= 50 ? (m === 50 ? [{ t: "box", box: "mega" }] : []) : m >= 30 ? (m % 10 === 0 ? [{ t: "box", box: "big" }] : []) : m >= 10 && m % 10 === 0 ? [{ t: "box", box: "box" }] : []; }
  function subjectMile(S, subj, m) {
    const k = String(subj).slice(0, 40); if ((S.mile[k] || 0) >= m) return null;
    S.mile[k] = m; const g = subjectGift(m); return g.length ? g : null;
  }

  // ---- חנות ----
  // מבצע יומי: אביזר אחד שמתחלף כל יום (לפי התאריך והמכשיר), עד אפי
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function deals(S, dev, now = Date.now()) {
    const d = ymd(now), pool = LIST.filter(x => !x.x && !x.free && RAR[x.r].price && !S.own[x.id]);
    if (!pool.length) return [];
    const out = [], seen = new Set();
    for (let i = 0; i < 6 && out.length < 2; i++) { const it = pool[hash(d + "|" + dev + "|" + i) % pool.length]; if (!seen.has(it.id)) { seen.add(it.id); out.push({ id: it.id, price: RAR[it.r].price }); } }
    return out;
  }
  function buy(S, what, dev, now = Date.now()) {
    if (BOX[what]) { const p = BOX[what].price; if (S.bolts < p) return { ok: false, error: "bolts" }; S.bolts -= p; S.boxes.push(what); return { ok: true, box: what }; }
    const d = deals(S, dev, now).find(x => x.id === what); if (!d) return { ok: false, error: "gone" };
    if (S.bolts < d.price) return { ok: false, error: "bolts" };
    S.bolts -= d.price; grant(S, { t: "item", id: what }); return { ok: true, id: what };
  }
  function equip(S, id) {
    const it = ITEMS[id]; if (!it || !S.own[id]) return false;
    if (it.cat === "theme" || it.cat === "page") return true; // עיצובים – נבחרים במקום אחר
    if (S.eq[it.cat] === id && it.cat !== "skin") delete S.eq[it.cat]; else S.eq[it.cat] = id;
    return true;
  }
  // כמה אוספים: X מתוך Y (בלי עיצובים בלעדיים לרצף)
  const progress = S => ({ have: LIST.filter(x => S.own[x.id]).length, all: LIST.length });
  // האביזר הכי נדיר שיש לך
  const best = S => LIST.filter(x => S.own[x.id]).sort((a, b) => RAR[b.r].o - RAR[a.r].o)[0];

  // ================= עונה 4: גלגל, תיבת בזק, מעבדה, נוצץ, סטים, אירוע עולמי, שוק, מפה =================
  const SHINY = 0.01; // ✨ 1% שהאביזר יוצא "נוצץ"
  // 🎰 גלגל מזל יומי (סיבוב חינם אחד ביום)
  const WHEEL = [{ t: "bolts", n: 50, w: 22 }, { t: "bolts", n: 100, w: 20 }, { t: "box", box: "box", w: 16 }, { t: "bolts", n: 200, w: 14 }, { t: "box", box: "big", w: 12 }, { t: "bolts", n: 500, w: 8 }, { t: "box", box: "mega", w: 6 }, { t: "box", box: "giant", w: 2 }];
  function spinWheel(S, now = Date.now(), rnd = Math.random) {
    const d = ymd(now); if (S.wheel === d) return null;
    let x = rnd() * WHEEL.reduce((a, w) => a + w.w, 0), i = 0; for (; i < WHEEL.length - 1; i++) { if ((x -= WHEEL[i].w) < 0) break; }
    S.wheel = d; const p = WHEEL[i]; return { i, prize: p.t === "box" ? { t: "box", box: p.box } : { t: "bolts", n: p.n } };
  }
  // ⚡ תיבת בזק: 3 חלונות של 10 דקות ביום (07:30–21:30), מחיר מוזל. אחת לחלון
  const FLASH = [{ box: "mega", price: 150 }, { box: "giant", price: 600 }, { box: "big", price: 50 }];
  function flashNow(S, dev, now = Date.now()) {
    const d = ymd(now), t = new Date(now), il = new Date(t.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })), m = il.getHours() * 60 + il.getMinutes();
    for (let k = 0; k < 3; k++) {
      const h = (str => { let x = 2166136261; for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; })(d + "|" + dev + "|f" + k);
      const start = 450 + k * 280 + (h % 220), offer = FLASH[(h >> 8) % FLASH.length], id = d + "#" + k;
      if (m >= start && m < start + 10) return Object.assign({ id, left: start + 10 - m, bought: (S.flash || "") === id }, offer);
    }
    return null;
  }
  function buyFlash(S, dev, now = Date.now()) { const f = flashNow(S, dev, now); if (!f || f.bought) return { ok: false, error: "gone" }; if (S.bolts < f.price) return { ok: false, error: "bolts" }; S.bolts -= f.price; S.boxes.push(f.box); S.flash = f.id; return { ok: true, box: f.box }; }
  // 🔨 מעבדה: 5 אביזרים מאותה דרגה → אביזר אחד מהדרגה הבאה (עד אגדי)
  function labCombine(S, ids, rnd = Math.random) {
    if (!Array.isArray(ids) || ids.length !== 5 || new Set(ids).size !== 5) return { ok: false, error: "five" };
    const its = ids.map(id => ITEMS[id]); if (its.some(x => !x || !S.own[x.id] || S.own[x.id] === -1 || x.free || x.cat === "theme" || x.cat === "page")) return { ok: false, error: "own" };
    const r = its[0].r; if (its.some(x => x.r !== r) || RAR[r].o >= 5) return { ok: false, error: "rarity" };
    const nr = RK[RK.indexOf(r) + 1], id = pickItem(S, nr, rnd, 0.05); if (!id) return { ok: false, error: "none" };
    for (const x of ids) { delete S.own[x]; for (const k of Object.keys(S.eq)) if (S.eq[k] === x) delete S.eq[k]; if (S.shiny) delete S.shiny[x]; }
    if (!S.eq.skin) S.eq.skin = "skin:classic";
    const g = grant(S, { t: "item", id, r: nr }); S.labs = (S.labs || 0) + 1; return { ok: true, got: g };
  }
  // 🎭 סטים: אוספים סדרה שלמה → פרס (פעם אחת לכל סט)
  const SETS = [
    { id: "heroes", n: "🦸 כל הגיבורים", ids: LIST.filter(x => x.hero && x.r !== "u").map(x => x.id), prize: [{ t: "box", box: "giant" }, { t: "bolts", n: 2000 }] },
    { id: "gems", n: "💎 אבני חן", ids: ["skin:emerald", "skin:ruby", "skin:sapphire", "skin:amethyst"], prize: [{ t: "box", box: "mega" }, { t: "bolts", n: 800 }] },
    { id: "space", n: "🚀 חלל", ids: ["skin:space", "hat:spacehelm", "held:planet", "held:ufo", "aura:galaxy"], prize: [{ t: "box", box: "mega" }, { t: "bolts", n: 600 }] },
    { id: "sport", n: "⚽ ספורט", ids: ["held:ball", "held:basket", "held:football", "held:tennis", "held:pingpong", "held:trophy"], prize: [{ t: "box", box: "big" }, { t: "bolts", n: 400 }] },
    { id: "food", n: "🍕 אוכל", ids: ["held:pizza", "held:burger", "held:popcorn", "held:cupcake", "held:icecream", "held:melon", "held:cake"], prize: [{ t: "box", box: "big" }, { t: "bolts", n: 400 }] },
    { id: "crowns", n: "👑 כתרים", ids: ["hat:crown", "hat:diamondcrown", "hat:tiara", "hat:stars", "hat:streak"], prize: [{ t: "box", box: "giant" }, { t: "bolts", n: 1000 }] },
    { id: "animals", n: "🦊 חיות", ids: ["held:dino", "held:octopus", "held:fox", "held:penguin", "held:butterfly", "held:unicorn", "held:dragon"], prize: [{ t: "box", box: "mega" }, { t: "bolts", n: 600 }] },
    { id: "music", n: "🎵 להקה", ids: ["held:guitar", "held:violin2", "held:violin", "held:piano", "held:drum", "held:trumpet", "held:mic"], prize: [{ t: "box", box: "big" }, { t: "bolts", n: 300 }] },
    { id: "cosmos", n: "🌌 קוסמוס", ids: ["hat:galaxyhat", "held:shooting", "aura:planets", "trail:cosmos", "skin:nebula"], prize: [{ t: "box", box: "giant" }] },
    { id: "sweets", n: "🍬 מתוקים", ids: ["held:cupcake", "held:lolly", "held:cookie", "hat:donut", "skin:choco", "skin:cotton"], prize: [{ t: "box", box: "big" }, { t: "bolts", n: 250 }] },
    { id: "newheroes", n: "🦸 הגיבורים החדשים", ids: LIST.filter(x => x.hero && /^(skin|hat|held|aura|trail):h_/.test(x.id)).map(x => x.id), prize: [{ t: "box", box: "giant" }, { t: "bolts", n: 1500 }] },
    { id: "eyes", n: "👓 משקפיים", ids: LIST.filter(x => x.cat === "eyes" && ["c", "r", "s"].includes(x.r)).map(x => x.id), prize: [{ t: "box", box: "mega" }, { t: "bolts", n: 500 }] },
  ].map(x => Object.assign(x, { ids: x.ids.filter(id => ITEMS[id]) }));
  function setsCheck(S) { S.sets = S.sets || {}; const out = []; for (const st of SETS) { if (S.sets[st.id] || !st.ids.length) continue; if (st.ids.every(id => S.own[id] && S.own[id] !== -1)) { S.sets[st.id] = Date.now(); out.push(st); } } return out; }
  // 🌍 אירוע עולמי: בימים 1–3 בכל חודש – פי 1.6 סיכוי לשדרוג בכל לחיצה על תיבה
  const eventNow = (now = Date.now()) => { const d = +ymd(now).slice(8, 10); return d >= 1 && d <= 3 ? { n: "🌍 סופש בונוס!", up: 1.6, until: 3 } : null; };
  // 🕵️ שוק: טווח מחירים לכל דרגה
  const PRICE = { c: [10, 80], r: [25, 200], s: [50, 400], e: [100, 800], m: [250, 2000], l: [500, 5000], u: [2000, 20000] };
  // 🎮 משחק הברגים: עד 500 ברגים ו-2 אביזרים ביום (אחרי זה – מצב אימון בלי פרסים)
  const GAME_CAP = 500, GAME_ITEMS = 2;
  // 🎲 כפול או כלום (ברגים נופלים, כשמגיעים ל-500): ניצחון = 500 נשמרים + עוד 500, הפסד = כלום (וגמרת להיום)
  function gameDouble(S, win, now = Date.now()) {
    const d = ymd(now); if (!S.game || S.game.d !== d) S.game = { d, n: 0, it: 0 };
    const base = Math.max(0, GAME_CAP - S.game.n); S.game.n = GAME_CAP; S.game.dbl = win ? 1 : -1;
    if (win) S.bolts += base * 2; return { bolts: win ? base * 2 : 0 };
  }
  // 🛒 שדרוגים קבועים למשחקים (3 רמות לכל אחד)
  const UPG = {
    magnet: { n: "מגנט חזק", em: "🧲", g: "both", d: "המגנט מחזיק יותר זמן (+3 שניות לכל רמה)", cost: [250, 700, 1800] },
    shield: { n: "מגן בהתחלה", em: "🛡️", g: "both", d: "סיכוי להתחיל עם מגן: 35% → 70% → תמיד", cost: [400, 1000, 2500] },
    luck: { n: "מזל", em: "🍀", g: "both", d: "יותר כוחות ופריטים נופלים", cost: [350, 900, 2200] },
    bucket: { n: "רובוט רחב", em: "🪣", g: "bolts", d: "ב\"ברגים נופלים\" – תופסים רחב יותר", cost: [300, 800, 2000] },
    flight: { n: "קקי עוצמתי", em: "💩", g: "run", d: "בריצה – עפים יותר זמן (+2 שניות לכל רמה)", cost: [300, 800, 2000] },
  };
  const upg = (S, k) => Math.min(3, (S.upg || {})[k] || 0);
  function buyUpg(S, k) { const U = UPG[k], l = upg(S, k); if (!U) return { ok: false, error: "bad" }; if (l >= 3) return { ok: false, error: "max" }; const c = U.cost[l]; if (S.bolts < c) return { ok: false, error: "bolts", cost: c }; S.bolts -= c; S.upg = Object.assign({}, S.upg, { [k]: l + 1 }); return { ok: true, lvl: l + 1, cost: c }; }
  // 🎯 אתגר יומי לכל משחק (אחד ביום, אותו אתגר לכל השכבה) – הצלחה = 💠 תיבת מגה (פעם ביום)
  const CHAL = {
    bolts: [{ id: "lv5", n: "להגיע לשלב 5 בסיבוב אחד", ok: s => s.lvl >= 5 }, { id: "gold3", n: "לתפוס 3 ברגי זהב בסיבוב אחד", ok: s => s.gold >= 3 }, { id: "noshield", n: "לתפוס 120 ברגים בסיבוב בלי להשתמש במגן", ok: s => s.bolts >= 120 && !s.shieldUsed },
      { id: "combo30", n: "קומבו של 30 ברצף", ok: s => s.combo >= 30 }, { id: "boss", n: "לשרוד בוס 👾", ok: s => s.boss >= 1 }, { id: "t90", n: "לשרוד 90 שניות בסיבוב אחד", ok: s => s.t >= 90 }],
    run: [{ id: "d800", n: "לרוץ 800 מטר בריצה אחת", ok: s => s.dist >= 800 }, { id: "fly2", n: "לעוף 2 פעמים בריצה אחת 💩", ok: s => s.flights >= 2 }, { id: "b60", n: "לאסוף 60 ברגים בריצה אחת", ok: s => s.bolts >= 60 },
      { id: "nostumble", n: "לרוץ 500 מטר בלי למעוד", ok: s => s.cleanDist >= 500 }, { id: "world3", n: "להגיע לעולם השלישי 🍽️", ok: s => s.world >= 3 }, { id: "bully", n: "לעבור 3 ביריונים בלי שיתפסו אותך", ok: s => s.bullyPass >= 3 }],
  };
  function challenge(game, now = Date.now()) { const d = ymd(now), L = CHAL[game]; let h = 0; for (const c of d + game) h = (h * 31 + c.charCodeAt(0)) >>> 0; return L[h % L.length]; }
  function challengeCheck(S, game, stats, now = Date.now()) {
    const d = ymd(now), c = challenge(game, now); S.chal = S.chal || {}; if (S.chal[game] === d || !c.ok(stats || {})) return null;
    S.chal[game] = d; S.boxes.push("mega"); return c;
  }
  // 🏃 ריצת הרובוט: עד 250 ברגים ביום (אחרי זה – אימון בלי פרסים)
  const RUN_CAP = 250;
  function runBank(S, n, now = Date.now()) { const d = ymd(now); if (!S.run || S.run.d !== d) S.run = { d, n: 0 }; const g = Math.max(0, Math.min(Math.floor(n), RUN_CAP - S.run.n)); S.run.n += g; S.bolts += g; return { bolts: g, left: RUN_CAP - S.run.n }; }
  function gameBank(S, n, items = [], now = Date.now()) {
    const d = ymd(now); if (!S.game || S.game.d !== d) S.game = { d, n: 0, it: 0 };
    const g = Math.max(0, Math.min(Math.floor(n), GAME_CAP - S.game.n)); S.game.n += g; S.bolts += g;
    const got = []; for (const r of items) { if (S.game.it >= GAME_ITEMS) break; const id = pickItem(S, r, Math.random); if (id) { S.game.it++; got.push(grant(S, { t: "item", id, r })); } }
    return { bolts: g, items: got, left: GAME_CAP - S.game.n };
  }
  // 🗺️ מסע על מפה: צעדים על כל דבר שעושים (כניסה יומית +3, תיבה +1, גלגל +1, משחק +1…). כל 10 צעדים = תחנה עם אוצר
  const WORLDS = [{ n: "🏝️ האי", c: "#22c55e" }, { n: "🌲 היער", c: "#16a34a" }, { n: "🏜️ המדבר", c: "#f59e0b" }, { n: "❄️ הקרח", c: "#38bdf8" }, { n: "🌋 הר הגעש", c: "#ef4444" }];
  const MAP_N = 40, MAP_STEP = 10;
  const mapPrize = i => i === MAP_N ? [{ t: "box", box: "giant" }, { t: "bolts", n: 3000 }] : i % 10 === 0 ? [{ t: "box", box: "giant" }] : i % 5 === 0 ? [{ t: "box", box: "mega" }] : i % 2 === 0 ? [{ t: "box", box: i > 20 ? "big" : "box" }] : [{ t: "bolts", n: 100 + i * 10 }];
  function mapStep(S, n = 1) { S.map = S.map || { p: 0, c: 0 }; const before = Math.floor(S.map.p / MAP_STEP); S.map.p = Math.min(MAP_N * MAP_STEP, S.map.p + Math.max(0, n | 0)); return Math.floor(S.map.p / MAP_STEP) - before; }
  function mapClaim(S) { S.map = S.map || { p: 0, c: 0 }; const reach = Math.min(MAP_N, Math.floor(S.map.p / MAP_STEP)); if (S.map.c >= reach) return null; const i = ++S.map.c; return { i, prize: mapPrize(i) }; }
  // 📋 משימות יומיות: 3 משימות קטנות כל יום (שונות לכל ילד), פרס קטן לכל אחת + תיבה על כל ה-3
  const MISSIONS = {
    box: { n: "לפתוח 2 תיבות", ev: "box", need: 2, b: 30, em: "🎁" }, wheel: { n: "לסובב את גלגל המזל", ev: "wheel", need: 1, b: 20, em: "🎰" },
    game: { n: "לשמור ברגים במשחק", ev: "game", need: 1, b: 30, em: "🔩" }, game40: { n: "לתפוס 40 ברגים בסיבוב אחד", ev: "game40", need: 1, b: 50, em: "🏃" },
    learn: { n: "לקבל 20 ברגים מתרגול", ev: "learn", need: 20, b: 40, em: "📚" }, wear: { n: "להחליף 3 דברים לרובוט", ev: "wear", need: 3, b: 20, em: "👕" },
    like: { n: "לתת לייק לרובוט של חבר", ev: "like", need: 1, b: 25, em: "❤️" }, lab: { n: "להשתמש במעבדה", ev: "lab", need: 1, b: 40, em: "🔨" },
    market: { n: "לבקר בשוק", ev: "market", need: 1, b: 15, em: "🕵️" }, run: { n: "לרוץ 500 מטר בריצת הרובוט", ev: "run500", need: 1, b: 30, em: "🏃" }, steps: { n: "ללכת 4 צעדים במסע", ev: "step", need: 4, b: 25, em: "🗺️" },
  };
  function missions(S, now = Date.now()) {
    const d = ymd(now); if (S.ms && S.ms.d === d) return S.ms;
    if (!S.seed) S.seed = Math.floor(Math.random() * 1e9);
    let h = 2166136261; for (const c of d + "|" + S.seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const keys = Object.keys(MISSIONS), ids = [];
    while (ids.length < 3) { h = Math.imul(h ^ (h >>> 13), 1597334677) >>> 0; const k = keys[h % keys.length]; if (!ids.includes(k)) ids.push(k); }
    return (S.ms = { d, ids, p: {}, got: {}, all: 0 });
  }
  function track(S, ev, n = 1, now = Date.now()) { const m = missions(S, now); let done = []; for (const id of m.ids) { const M = MISSIONS[id]; if (M.ev !== ev || m.got[id]) continue; const was = (m.p[id] || 0) >= M.need; m.p[id] = Math.min(M.need, (m.p[id] || 0) + n); if (!was && m.p[id] >= M.need) done.push(id); } return done; }
  function claimMission(S, id, now = Date.now()) {
    const m = missions(S, now), M = MISSIONS[id]; if (!M || !m.ids.includes(id) || m.got[id] || (m.p[id] || 0) < M.need) return { ok: false };
    m.got[id] = 1; S.bolts += M.b; let box = null; if (m.ids.every(k => m.got[k]) && !m.all) { m.all = 1; box = "big"; S.boxes.push(box); }
    return { ok: true, bolts: M.b, box };
  }
  // 🏅 תארים ליד השם – נפתחים על הישגים, הילד בוחר איזה להציג
  const TITLES = [
    { id: "runner", t: "🏃 רץ למרחקים", how: "לרוץ 1000 מטר בריצה אחת", ok: S => (S.runBest || 0) >= 1000 },
    { id: "meteor", t: "🚀 מטאור", how: "לרוץ 3000 מטר בריצה אחת", ok: S => (S.runBest || 0) >= 3000 },
    { id: "hunter", t: "🔩 צייד ברגים", how: "לתפוס 300 ברגים בסיבוב אחד", ok: S => (S.gameBest || 0) >= 300 },
    { id: "brave", t: "🎲 אמיץ", how: "לנצח בכפול או כלום", ok: S => (S.dblWins || 0) >= 1 },
    { id: "lab", t: "🔨 מלך המעבדה", how: "להשתמש במעבדה 10 פעמים", ok: S => (S.labs || 0) >= 10 },
    { id: "heroes", t: "🦸 אספן גיבורים", how: "לאסוף 10 גיבורים", ok: S => LIST.filter(x => x.hero && S.own[x.id] && S.own[x.id] !== -1).length >= 10 },
    { id: "streak", t: "🔥 רצף ברזל", how: "רצף של 14 ימים", ok: S => ((S.st || {}).best || 0) >= 14 },
    { id: "smart", t: "📚 תלמיד חכם", how: "לקבל 3 תיבות על ציונים טובים", ok: S => (S.gBox || 0) >= 3 },
    { id: "champ", t: "🏆 אלוף השבוע", how: "להיות מקום ראשון בשכבה בטבלת השיאים", ok: S => (S.lbWins || 0) >= 1 },
    { id: "explorer", t: "🗺️ חוקר", how: "להגיע לתחנה 20 במסע", ok: S => ((S.map || {}).c || 0) >= 20 },
    { id: "sets", t: "🎭 אספן סטים", how: "להשלים 5 סטים", ok: S => Object.keys(S.sets || {}).length >= 5 },
    { id: "team", t: "🤝 שחקן קבוצה", how: "לעזור לשכבה להשיג 3 מטרות", ok: S => (S.goalHelps || 0) >= 3 },
    { id: "candles", t: "🕎 שומר הנרות", how: "להדליק את כל 8 הנרות בחנוכה", ok: S => !!(S.hk && S.hk.all) },
    { id: "gold", t: "💎 בעל זהב", how: "להשיג את עיצוב הזהב והיהלומים", ok: S => !!S.own["theme:goldx"] && S.own["theme:goldx"] !== -1 },
    { id: "legend", t: "👑 האגדה", how: "להיות האגדה", ok: S => !!S.own["skin:legend"] && S.own["skin:legend"] !== -1 },
  ];
  const titlesOf = S => TITLES.filter(x => x.ok(S));
  const titleText = S => { const x = TITLES.find(q => q.id === S.title); return x && x.ok(S) ? x.t : ""; };
  // ---- 🏷️ שם לרובוט (עם סינון מילים לא יפות) ----
  const BAD = ["זונה", "שרמוט", "כוס", "זין", "מזדיין", "חרא", "מניאק", "בן זונה", "אידיוט", "מפגר", "דביל", "מטומטם", "fuck", "shit", "bitch", "dick", "ass", "sex", "porn", "nazi", "נאצי", "היטלר", "hitler"];
  function cleanName(n) { const t = String(n || "").replace(/[<>&"'`\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 14); const low = t.toLowerCase().replace(/[^a-zא-ת]/g, ""); return BAD.some(w => low.includes(w.replace(/\s/g, ""))) ? "" : t; }
  // ---- 🏅 הישגים (מה שחברים רואים בכרטיס) ----
  function achievements(S, likes = 0) {
    const pr = progress(S), has = r => LIST.some(x => S.own[x.id] && S.own[x.id] !== -1 && x.r === r), out = [];
    const A = (ok, e, n) => { if (ok) out.push({ e, n }); };
    A(S.st.best >= 100, "🔥", "רצף 100"); A(S.st.best >= 30 && S.st.best < 100, "🔥", "רצף 30"); A(S.st.best >= 7 && S.st.best < 30, "🔥", "רצף 7");
    A(pr.have >= 200, "🏆", "אספן 200"); A(pr.have >= 100 && pr.have < 200, "🏆", "אספן 100"); A(pr.have >= 50 && pr.have < 100, "🏆", "אספן 50"); A(pr.have >= 25 && pr.have < 50, "🏆", "אספן 25");
    A((S.opened || 0) >= 200, "📦", "200 תיבות"); A((S.opened || 0) >= 50 && S.opened < 200, "📦", "50 תיבות"); A((S.opened || 0) >= 10 && S.opened < 50, "📦", "10 תיבות");
    A(has("u"), "👑", "אולטרה אגדי"); A(has("l"), "⭐", "אגדי"); A(LIST.some(x => x.hero && S.own[x.id] && S.own[x.id] !== -1), "🦸", "גיבור");
    A(likes >= 100, "❤️", "100 לייקים"); A(likes >= 25 && likes < 100, "❤️", "25 לייקים"); A((S.trades || 0) >= 1, "🤝", "סוחר"); A((S.gave || 0) >= 100, "🎁", "נדיב");
    return out;
  }
  // ---- 🔄 טרייד: שווי (למאזניים), בדיקה שיש לך, וביצוע ----
  const RVAL = { c: 10, r: 25, s: 60, e: 150, m: 400, l: 1000, u: 5000 }, BVAL = { box: 40, big: 130, mega: 380, giant: 1200 };
  function offerValue(o) { o = o || {}; return (o.items || []).reduce((a, id) => a + (ITEMS[id] ? RVAL[ITEMS[id].r] : 0), 0) + (o.boxes || []).reduce((a, b) => a + (BVAL[b] || 0), 0) + Math.max(0, Math.floor(+o.bolts || 0)); }
  function canGive(S, o) {
    o = o || {}; const items = o.items || [], boxes = o.boxes || [], bolts = Math.max(0, Math.floor(+o.bolts || 0));
    if (items.some(id => !ITEMS[id] || !S.own[id] || S.own[id] === -1 || id === "skin:classic")) return false;
    const need = {}; for (const b of boxes) need[b] = (need[b] || 0) + 1; for (const [b, n] of Object.entries(need)) if (S.boxes.filter(x => x === b).length < n) return false;
    return bolts <= S.bolts && (S.realBolts == null);
  }
  function applyTrade(S, give, get) {
    give = give || {}; get = get || {};
    for (const id of give.items || []) { delete S.own[id]; for (const k of Object.keys(S.eq)) if (S.eq[k] === id) delete S.eq[k]; }
    for (const b of give.boxes || []) { const i = S.boxes.indexOf(b); if (i >= 0) S.boxes.splice(i, 1); }
    S.bolts = Math.max(0, S.bolts - Math.max(0, Math.floor(+give.bolts || 0)));
    for (const id of get.items || []) if (ITEMS[id]) { if (!S.own[id] || S.own[id] === -1) { S.own[id] = Date.now(); S.news.push(id); } else S.bolts += RAR[ITEMS[id].r].dup; }
    for (const b of get.boxes || []) if (BOX[b]) S.boxes.push(b);
    S.bolts += Math.max(0, Math.floor(+get.bolts || 0));
    if (!S.eq.skin) S.eq.skin = "skin:classic"; S.trades = (S.trades || 0) + 1;
  }
  // ---- ⚔️ קרב כיתות: מזהה השבוע (מתחיל ביום ראשון) ----
  const weekId = (now = Date.now()) => { const d = ymd(now); return add(d, -dow(d)); };
  // 🔩 בונוס על תרגול (מחשבון / כרטיסיות): עד 60 ברגים ביום
  const EARN_CAP = 150;
  function earn(S, n, now = Date.now()) {
    const d = ymd(now); if (!S.earn || S.earn.d !== d) S.earn = { d, n: 0 };
    const g = Math.max(0, Math.min(n, EARN_CAP - S.earn.n)); S.earn.n += g; S.bolts += g; return g;
  }
  const api = { hanukkahDay, hanukkahIn, setHanukkahTest, evOn, CANDLE, lightCandle, TITLES, titlesOf, titleText, gameDouble, UPG, upg, buyUpg, CHAL, challenge, challengeCheck, RUN_CAP, runBank, MISSIONS, missions, track, claimMission, WORLDS, MAP_N, MAP_STEP, mapPrize, mapStep, mapClaim, SHINY, WHEEL, spinWheel, FLASH, flashNow, buyFlash, labCombine, SETS, setsCheck, eventNow, PRICE, GAME_CAP, GAME_ITEMS, gameBank, cleanName, achievements, RVAL, BVAL, offerValue, canGive, applyTrade, weekId, HEROES, EARN_CAP, earn, RAR, RK, CATS, ITEMS, LIST, BOX, LADDER, TIERS, TAPS, START, EXTRA_N, UP, upgrades, finalOdds, ymd, add, dow, restDay, missed, fresh, norm, roll, guaranteed, grant, dayGift, saveCost, checkIn, saveStreak, subjectGift, subjectMile, deals, buy, equip, progress, best, pickW };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RoboCore = api;
})(typeof self !== "undefined" ? self : this);
