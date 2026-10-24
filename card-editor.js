// עורך כרטיסים משותף: לכרטיסיות של התלמיד ולמסך הצוות.
// כל כרטיס = שני שדות (מונח / תשובה). "הבא" במקלדת מתקדם, תמיד מחכה כרטיס ריק בסוף,
// והדבקה של רשימה ("מונח - הגדרה" בכל שורה, או טבלה מאקסל/וורד) נפרסת לכרטיסים.

// "מונח - הגדרה" / "מונח: הגדרה" / "מונח = הגדרה" / טאב (העתקה מטבלה)
// סדר עדיפות: טאב, מקף עם רווחים (" - " / " – " / " — "), ": ", "=", ורק אם אין אף אחד – מקף צמוד.
// כך "well-known - מוכר היטב" לא נחתך באמצע המילה.
// מחזיר מערך כרטיסים; ‎.skipped = השורות שלא נמצא בהן מפריד. keep: שורות כאלה נכנסות ככרטיס עם מונח בלבד
function parseCards(text,keep){
  const out=[],skipped=[];
  String(text||"").split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{
    const m=l.match(/^(.+?)\t+(.+)$/)||l.match(/^(.+?)\s+[-–—]\s+(.+)$/)||l.match(/^(.+?)\s*:\s+(.+)$/)||l.match(/^(.+?)\s*=\s*(.+)$/)||bareDash(l);
    const c=m&&{t:m[1].trim(),d:m[2].trim()};
    if(c&&c.t&&c.d)out.push(c);else{skipped.push(l);if(keep)out.push({t:l,d:""})}
  });
  out.skipped=skipped;return out;
}
// מקף צמוד ("dog-כלב"): עדיף המקף שבו מתחלפת השפה (אנגלית ↔ עברית), אחרת הראשון
function bareDash(l){
  const sc=s=>(/[a-z]/i.test(s)?1:0)|(/[֐-׿]/.test(s)?2:0);
  const ix=[...l.matchAll(/[-–—]/g)].map(x=>x.index).filter(i=>i>0&&i<l.length-1);if(!ix.length)return null;
  const i=ix.find(i=>{const a=sc(l.slice(0,i)),b=sc(l.slice(i+1));return a&&b&&!(a&b)})??ix[0];
  return [l,l.slice(0,i),l.slice(i+1)];
}

(function(){
  const css=`.ec{background:var(--bg);border:1.5px solid var(--line);border-radius:16px;padding:8px 12px 12px;margin-bottom:10px;transition:border-color .2s}
.ec.bad{border-color:var(--bad,var(--red))}
.ec-h{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);font-weight:700}
.ec-x{background:none;border:none;color:var(--muted);font-size:17px;padding:6px 8px;margin:-4px 0 -4px -8px;cursor:pointer;font-family:inherit}
.ec .inp{width:100%;border:1.5px solid var(--line);border-radius:12px;font:inherit;font-size:16px;color:var(--ink);background:var(--card);margin-top:6px;padding:11px 12px}
.ec .ec-t{font-weight:700}
.ec .inp:placeholder-shown{direction:rtl}
.ec .inp.miss{border-color:var(--bad,var(--red))}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
})();

// list: האלמנט שבו יושבים הכרטיסים. onChange: נקרא בכל שינוי (לטיוטה / מונה)
function CardEditor(list,onChange){
  const rows=()=>[...list.querySelectorAll(".ec")];
  const val=r=>({t:r.querySelector(".ec-t").value.trim(),d:r.querySelector(".ec-d").value.trim()});
  const filled=r=>{const c=val(r);return !!(c.t||c.d)};
  const changed=()=>{sync();onChange&&onChange()};
  function add(c,before){
    const r=document.createElement("div");r.className="ec";
    r.innerHTML=`<div class="ec-h"><span class="ec-n"></span><button type="button" class="ec-x" aria-label="מחק כרטיס">✕</button></div>
      <input class="inp ec-t" placeholder="מונח / שאלה" enterkeyhint="next" dir="auto" autocomplete="off">
      <input class="inp ec-d" placeholder="הגדרה / תשובה" enterkeyhint="next" dir="auto" autocomplete="off">`;
    if(c){r.querySelector(".ec-t").value=c.t;r.querySelector(".ec-d").value=c.d}
    list.insertBefore(r,before||null);return r;
  }
  function sync(){
    let rs=rows();
    // בסוף נשאר בדיוק כרטיס ריק אחד (חוץ מזה שעומדים בו), ולפחות 2 כרטיסים
    while(rs.length>2&&!filled(rs.at(-1))&&!filled(rs.at(-2))&&!rs.at(-2).contains(document.activeElement)){rs.at(-1).remove();rs=rows()}
    if(!rs.length||filled(rs.at(-1)))add();
    while(rows().length<2)add();
    rows().forEach((r,i)=>r.querySelector(".ec-n").textContent=`כרטיס ${i+1}`);
  }
  const goTo=el=>{el.focus();el.closest(".ec").scrollIntoView({block:"center",behavior:"smooth"})};
  // רשימה נכנסת לכרטיסים: ממלאת את הכרטיס הנוכחי אם הוא ריק, ואחריו מוסיפה
  function insert(items,at){
    let ref=at&&!filled(at)?at:null,after=at&&filled(at)?at.nextElementSibling:null;
    if(!at){const last=rows().filter(filled).at(-1);after=last?last.nextElementSibling:rows()[0]}
    for(const c of items){const r=ref||add(null,after);ref=null;
      r.querySelector(".ec-t").value=c.t;r.querySelector(".ec-d").value=c.d;r.classList.remove("bad");after=r.nextElementSibling}
    changed();
  }
  list.addEventListener("input",e=>{const r=e.target.closest(".ec");if(!r)return;r.classList.remove("bad");e.target.classList.remove("miss");changed()});
  list.addEventListener("focusout",()=>setTimeout(sync,0));
  list.addEventListener("click",e=>{const x=e.target.closest(".ec-x");if(!x)return;x.closest(".ec").remove();changed()});
  list.addEventListener("keydown",e=>{
    if(e.key!=="Enter"||e.isComposing||!e.target.closest(".ec"))return;e.preventDefault();
    const r=e.target.closest(".ec");
    if(e.target.classList.contains("ec-t"))return goTo(r.querySelector(".ec-d"));
    goTo((r.nextElementSibling||add()).querySelector(".ec-t"));
  });
  list.addEventListener("paste",e=>{
    const txt=(e.clipboardData||window.clipboardData).getData("text");if(!/\n/.test(txt.trim()))return;
    // שורה בלי מפריד לא נעלמת: נכנסת ככרטיס עם מונח בלבד, ובשמירה מסומנת באדום
    const items=parseCards(txt,true);if(items.length===items.skipped.length)return;e.preventDefault();insert(items,e.target.closest(".ec"));
  });
  return {
    set(cards){list.innerHTML="";(cards||[]).forEach(c=>add(c));sync()},
    insert:items=>insert(items),
    // כרטיסים מלאים בלבד (גם כאלה שמולאו חלקית נחשבים "התחלה" לטיוטה)
    cards:()=>rows().map(val).filter(c=>c.t&&c.d),
    draft:()=>rows().map(val).filter(c=>c.t||c.d),
    ready:()=>rows().map(val).filter(c=>c.t&&c.d).length,
    addEmpty(){const r=rows().at(-1);goTo((r&&!filled(r)?r:add()).querySelector(".ec-t"));sync()},
    // מסמן כרטיס שמולא רק חצי. מחזיר הודעה, או null אם הכל תקין
    check(){
      let half=null;
      rows().forEach(r=>{const c=val(r);r.classList.remove("bad");
        if(!!c.t!==!!c.d){r.classList.add("bad");r.querySelector(c.t?".ec-d":".ec-t").classList.add("miss");half=half||r}});
      if(!half)return null;
      half.scrollIntoView({block:"center",behavior:"smooth"});
      return `ב${half.querySelector(".ec-n").textContent} חסר${val(half).t?"ה התשובה":" המונח"}.`;
    },
  };
}
if(typeof module!=="undefined"&&module.exports)module.exports={parseCards};
