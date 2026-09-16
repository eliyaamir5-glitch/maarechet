// סטים של הכיתה – כרטיסיות שכל התלמידים רואים.
// כל סט: id ייחודי, כותרת, מקצוע, ורשימת כרטיסים {t: מונח/שאלה, d: הגדרה/תשובה}.
// כדי להוסיף סט לכולם: מוסיפים כאן ועושים push.
const CLASS_SETS=[
 {id:"demo-eng-1",title:"אנגלית – מילים לדוגמה",subject:"אנגלית",cards:[
  {t:"achieve",d:"להשיג"},{t:"although",d:"למרות ש"},{t:"available",d:"זמין"},{t:"benefit",d:"תועלת"},
  {t:"curious",d:"סקרן"},{t:"decrease",d:"לרדת, להפחית"},{t:"effort",d:"מאמץ"},{t:"familiar",d:"מוכר"},
  {t:"however",d:"אולם"},{t:"improve",d:"לשפר"}]},
];
if(typeof module!=="undefined"&&module.exports){module.exports={CLASS_SETS};}
