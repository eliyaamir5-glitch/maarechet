// 🤖 "הרובוט שלי" – הלוגיקה: אביזרים, נדירות, תיבות, רצף כניסות יומי, חנות וברגים.
// בלי ממשק (את זה עושה robo.js) – כדי שאפשר לבדוק הכל ב-Node (scripts/test-robo.js).
// הכל נשמר בטלפון בלבד (localStorage "robo"). רק אביזרי "אולטרה אגדי" נבדקים מול השרת (כמות מוגבלת לכל הישיבה).
(function (root) {
  // ---- דרגות נדירות (כמו בבראול סטארס) ----
  // dup = כמה ברגים מקבלים על אביזר שכבר יש לך · price = מחיר בחנות (רק עד אפי)
  const RAR = {
    c: { n: "רגיל", col: "#a3b1c2", dup: 10, price: 40, o: 0 },
    r: { n: "נדיר", col: "#2ecc71", dup: 25, price: 90, o: 1 },
    s: { n: "סופר נדיר", col: "#3b82f6", dup: 50, price: 200, o: 2 },
    e: { n: "אפי", col: "#a855f7", dup: 100, price: 450, o: 3 },
    m: { n: "מיתי", col: "#ef4444", dup: 250, o: 4 },
    l: { n: "אגדי", col: "#facc15", dup: 400, o: 5 },
    u: { n: "אולטרה אגדי", col: "#ffd700", dup: 1000, o: 6 },
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
  ];
  const ITEMS = {}; I.forEach(([id, cat, n, r, o]) => { ITEMS[id] = Object.assign({ id, cat, n, r }, o || {}); });
  const LIST = Object.values(ITEMS);
  const DROP = r => LIST.filter(x => x.r === r && !x.x && !x.free && !x.hero);
  const HEROES = r => LIST.filter(x => x.r === r && x.hero);

  // ---- תיבות: כמה פרסים בכל תיבה, וסיכוי לכל דרגה (באחוזים, לכל פרס) ----
  const BOX = {
    box: { n: "תיבה", em: "📦", rolls: 2, kind: { item: 57, bolts: 40, box: 3 }, odds: { c: 58, r: 26, s: 11, e: 4, m: 0.85, l: 0.145, u: 0.005 }, bolts: [20, 45], price: 40, col: "#38bdf8" },
    big: { n: "תיבה גדולה", em: "🎁", rolls: 3, kind: { item: 65, bolts: 30, box: 5 }, odds: { c: 35, r: 32, s: 20, e: 9, m: 3.2, l: 0.78, u: 0.02 }, bolts: [35, 80], price: 130, col: "#a855f7" },
    mega: { n: "תיבת מגה", em: "💠", rolls: 6, kind: { item: 74, bolts: 20, box: 6 }, odds: { c: 10, r: 30, s: 30, e: 20, m: 7.5, l: 2.45, u: 0.05 }, bolts: [70, 160], price: 380, col: "#f43f5e", hero: 0.02 },
    giant: { n: "תיבת ענק", em: "💎", rolls: 9, kind: { item: 82, bolts: 12, box: 6 }, odds: { c: 0, r: 8, s: 24, e: 36, m: 22, l: 9.9, u: 0.1 }, bolts: [150, 320], price: 1200, col: "#06b6d4", hero: 0.3 },
  };
  const EXTRA = { box: "box", big: "box", mega: "big", giant: "mega" }; // תיבה בתוך תיבה
  // ⭐ שדרוג בכל לחיצה (כמו בבראול): התיבה מתחילה בדרגה מסוימת, ובכל אחת מ-4 הלחיצות יכולה לעלות דרגה.
  // הדרגה שבסוף = הפרס הראשי (אביזר מהדרגה הזו, מובטח). ועוד פרסים רגילים (extra) לפי הטבלה של התיבה.
  const TIERS = ["r", "s", "e", "m", "l", "u"], TAPS = 4;
  const START = { box: "r", big: "s", mega: "e", giant: "m" }, EXTRA_N = { box: 1, big: 2, mega: 5, giant: 8 };
  const UP = { r: 0.30, s: 0.15, e: 0.10, m: 0.07, l: 0.02, u: 0 }; // סיכוי לעלות דרגה בכל לחיצה
  function upgrades(type, rnd = Math.random) { let t = START[type]; const out = [t]; for (let i = 0; i < TAPS; i++) { if (rnd() < UP[t]) t = TIERS[TIERS.indexOf(t) + 1]; out.push(t); } return out; }
  // הסיכוי המדויק לכל דרגה סופית (לטבלה שמוצגת לילדים)
  function finalOdds(type) { let d = { [START[type]]: 1 }; for (let i = 0; i < TAPS; i++) { const n = {}; for (const [t, p] of Object.entries(d)) { const up = UP[t]; n[t] = (n[t] || 0) + p * (1 - up); if (up) { const nx = TIERS[TIERS.indexOf(t) + 1]; n[nx] = (n[nx] || 0) + p * up; } } d = n; } const o = {}; for (const t of TIERS) o[t] = 100 * (d[t] || 0); return o; }

  // ---- תאריכים (שעון ישראל) ----
  const ymd = t => { const p = {}; for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t))) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}`; };
  const tOf = d => Date.parse(d + "T12:00:00Z"), add = (d, n) => new Date(tOf(d) + n * 864e5).toISOString().slice(0, 10), dow = d => new Date(tOf(d)).getUTCDay();
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
    const B = BOX[type], out = [], taps = upgrades(type, rnd), top = taps[taps.length - 1];
    for (let i = 0; i < EXTRA_N[type]; i++) {
      const k = pickW(B.kind, rnd);
      if (k === "bolts") out.push({ t: "bolts", n: Math.round(B.bolts[0] + rnd() * (B.bolts[1] - B.bolts[0])) });
      else if (k === "box") out.push({ t: "box", box: EXTRA[type] });
      else {
        let r = pickW(B.odds, rnd), id = pickItem(S, r, rnd, B.hero || 0);
        while (!id && r !== "c") { r = RK[RK.indexOf(r) - 1]; id = pickItem(S, r, rnd); }
        out.push({ t: "item", id, r, ...(r === "u" ? { need: "claim" } : {}) });
      }
    }
    // הכי נדיר בסוף (מתח!) – והפרס הראשי (הדרגה שהתיבה הגיעה אליה) תמיד אחרון
    const rank = p => p.t === "item" ? RAR[p.r].o + 2 : p.t === "box" ? 1.5 : 0;
    out.sort((a, b) => rank(a) - rank(b));
    let r = top, id = pickItem(S, r, rnd, B.hero ? Math.min(1, B.hero * 1.5) : 0); while (!id && r !== "c") { r = RK[RK.indexOf(r) - 1]; id = pickItem(S, r, rnd); }
    out.push({ t: "item", id, r, main: 1, ...(r === "u" ? { need: "claim" } : {}) });
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
      if (S.own[p.id]) { const n = RAR[ITEMS[p.id].r].dup; S.bolts += n; return Object.assign({}, p, { dup: n }); }
      S.own[p.id] = Date.now(); S.news.push(p.id); S.got++; return p;
    }
    return p;
  }

  // ---- רצף כניסות: מתנה כל יום, ככל שהרצף ארוך יותר – יותר שווה ----
  const LADDER = {
    1: [{ t: "box", box: "box" }], 2: [{ t: "bolts", n: 60 }], 3: [{ t: "box", box: "box" }], 4: [{ t: "bolts", n: 80 }], 5: [{ t: "box", box: "big" }],
    7: [{ t: "box", box: "big" }, { t: "item", id: "theme:neon" }], 10: [{ t: "box", box: "mega" }], 14: [{ t: "box", box: "big" }, { t: "item", id: "page:calc:galaxy" }],
    21: [{ t: "box", box: "mega" }], 30: [{ t: "box", box: "mega" }, { t: "item", id: "hat:streak" }], 50: [{ t: "box", box: "mega" }, { t: "guar", r: "l" }],
    75: [{ t: "box", box: "mega" }, { t: "box", box: "mega" }], 100: [{ t: "item", id: "aura:streak" }, { t: "box", box: "mega" }, { t: "guar", r: "l" }],
    150: [{ t: "box", box: "mega" }, { t: "guar", r: "l" }], 200: [{ t: "box", box: "mega" }, { t: "box", box: "mega" }, { t: "guar", r: "l" }],
  };
  function dayGift(n) {
    if (LADDER[n]) return LADDER[n];
    if (n > 60 && n % 10 === 0) return [{ t: "box", box: "mega" }];
    if (n % 5 === 0) return [{ t: "box", box: "big" }];
    if (n % 2 === 1) return [{ t: "box", box: n > 30 ? "big" : "box" }];
    return [{ t: "bolts", n: Math.min(300, 40 + n * 6) }];
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
  const EARN_CAP = 60;
  function earn(S, n, now = Date.now()) {
    const d = ymd(now); if (!S.earn || S.earn.d !== d) S.earn = { d, n: 0 };
    const g = Math.max(0, Math.min(n, EARN_CAP - S.earn.n)); S.earn.n += g; S.bolts += g; return g;
  }
  const api = { cleanName, achievements, RVAL, BVAL, offerValue, canGive, applyTrade, weekId, HEROES, EARN_CAP, earn, RAR, RK, CATS, ITEMS, LIST, BOX, LADDER, TIERS, TAPS, START, EXTRA_N, UP, upgrades, finalOdds, ymd, add, dow, restDay, missed, fresh, norm, roll, guaranteed, grant, dayGift, saveCost, checkIn, saveStreak, subjectGift, subjectMile, deals, buy, equip, progress, best, pickW };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RoboCore = api;
})(typeof self !== "undefined" ? self : this);
