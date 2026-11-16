// 🗳️ בחירות למועצת התלמידים – קלפי כמו באמת: פרגוד, שולחן עם פתקים, מעטפה וקלפי.
// קול אחד לכל טלפון. השרת שומר רק כמה קולות קיבל כל מועמד ושהטלפון (מוצפן) כבר הצביע – אף פעם לא מי בחר במי.
// התוצאות מתפרסמות רק כשמנהל המערכת סוגר את הקלפי (בדף הניהול). עד אז – רק אחוז הצבעה בערך.
(function () {
  if (window.__ELECT) return; window.__ELECT = 1;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || LS.get("uiCalm", "") === "1";
  const base = () => (typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "";
  const dev = () => LS.get("deviceId", "");
  const profile = () => { try { return JSON.parse(LS.get("profile", "null")); } catch (e) { return null; } };
  let E = null, busy = false;
  async function api(body) {
    if (window.__DEMO || !dev()) return null;
    try { const r = await fetch(base() + "/api/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ action: "elect", device: dev() }, body || {})) }); return await r.json(); } catch (e) { return null; }
  }
  // סדר הפתקים שונה בכל טלפון (קבוע לאותו טלפון) – אף מועמד לא תמיד ראשון
  const order = cands => { const h = s => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }; return cands.slice().sort((a, b) => h(dev() + a.id) - h(dev() + b.id)); };

  const CSS = `
#electCard{display:flex;align-items:center;gap:12px;border-radius:18px;padding:12px 14px;margin-bottom:12px;cursor:pointer;color:#fff;order:1;position:relative;overflow:hidden;border:0;width:100%;text-align:start;font:inherit;
  background:linear-gradient(115deg,#0038b8 0%,#1d4ed8 55%,#0b2a7a 100%);box-shadow:0 8px 22px rgba(0,56,184,.35)}
#electCard::before{content:"";position:absolute;inset:auto 0 0 0;height:6px;background:repeating-linear-gradient(90deg,#fff 0 18px,#0038b8 18px 36px);opacity:.9}
#electCard .ec-ic{font-size:34px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))}#electCard .ec-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
#electCard b{font-size:16px}#electCard small{font-size:12.5px;opacity:.92}#electCard .ec-go{flex:0 0 auto;background:#fff;color:#0038b8;font-weight:900;border-radius:99px;padding:8px 14px}
#electCard .ec-bar{height:7px;border-radius:9px;background:rgba(255,255,255,.25);overflow:hidden}#electCard .ec-bar i{display:block;height:100%;background:#fff;border-radius:9px}
#electCard.wait .ec-go{animation:ecBeat 1.1s ease-in-out infinite}@keyframes ecBeat{50%{transform:scale(1.08)}}
#elB{position:fixed;inset:0;z-index:9800;background:#0b1a3d;color:#fff;display:flex;flex-direction:column;overflow:hidden;font-family:inherit;direction:rtl}
#elB .eb-top{display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) 10px max(14px,env(safe-area-inset-left,0px));background:linear-gradient(#0038b8,#0b2a7a)}
#elB .eb-top b{flex:1;font-size:16px}#elB .eb-x{border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:12px;width:40px;height:40px;font-size:18px;cursor:pointer}
#elB .eb-stage{position:relative;flex:1;overflow-y:auto;padding:14px max(14px,env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px))}
/* הפרגוד */
#elB .eb-curtain{position:absolute;inset:0 0 auto 0;height:70px;background:repeating-linear-gradient(90deg,#1e3a8a 0 22px,#2547a8 22px 44px);box-shadow:inset 0 -14px 18px rgba(0,0,0,.35);pointer-events:none}
#elB .eb-curtain::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:12px;background:radial-gradient(circle at 11px 0,#1e3a8a 10px,transparent 11px) 0 0/22px 12px repeat-x}
#elB .eb-hint{position:relative;text-align:center;margin:60px auto 10px;max-width:420px;font-weight:700;color:#dbe6ff}
/* השולחן עם הפתקים */
#elB .eb-table{position:relative;margin:0 auto;max-width:560px;padding:18px 12px 22px;border-radius:18px;background:linear-gradient(180deg,#8b5a2b,#6b4220);box-shadow:inset 0 3px 0 rgba(255,255,255,.18),0 18px 30px rgba(0,0,0,.45)}
#elB .eb-slips{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px}
#elB .slip{position:relative;border:0;cursor:pointer;background:transparent;padding:0;font:inherit;aspect-ratio:3/4;max-width:100%}
#elB .slip .pile{position:absolute;inset:0;border-radius:4px;background:#fbfbf7;box-shadow:3px 3px 0 #e9e6da,6px 6px 0 #ddd9cb,0 10px 16px rgba(0,0,0,.35)}
#elB .slip .face{position:absolute;inset:0;border-radius:4px;background:#fffef9;border:2px solid #cfd8ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;color:#0b2a7a;transition:transform .2s}
#elB .slip .lt{font-size:30px;font-weight:900;letter-spacing:1px;line-height:1}#elB .slip .nm{font-size:12px;font-weight:800;text-align:center;line-height:1.2}
#elB .slip:hover .face,#elB .slip:focus-visible .face{transform:translateY(-6px) rotate(-2deg)}#elB .slip:focus-visible{outline:3px solid #fff;outline-offset:4px;border-radius:6px}
/* פתק נבחר + מעטפה + קלפי */
#elB .eb-pick{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(5,12,32,.88);padding:20px}
#elB .big{position:relative;width:min(220px,62vw);aspect-ratio:3/4;background:#fffef9;border:3px solid #cfd8ea;border-radius:6px;color:#0b2a7a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:0 20px 40px rgba(0,0,0,.5);animation:ebLift .5s cubic-bezier(.2,1.4,.4,1)}
#elB .big .lt{font-size:72px;font-weight:900;line-height:1}#elB .big .nm{font-weight:900;font-size:18px}#elB .big .sl{font-size:13px;font-weight:600;color:#3b5bb5;text-align:center;padding:0 8px}
@keyframes ebLift{from{transform:translateY(120px) scale(.5) rotate(8deg);opacity:0}to{transform:none;opacity:1}}
#elB .eb-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#elB .eb-btn{border:0;border-radius:99px;padding:12px 20px;font:inherit;font-weight:900;font-size:16px;cursor:pointer;background:#fff;color:#0038b8;box-shadow:0 4px 0 #9fb4e6}
#elB .eb-btn.alt{background:rgba(255,255,255,.14);color:#fff;box-shadow:none}#elB .eb-btn:disabled{opacity:.6}
#elB .env{position:absolute;left:50%;top:50%;width:min(260px,70vw);aspect-ratio:4/3;margin:calc(min(260px,70vw) * -.375) 0 0 calc(min(260px,70vw) * -.5);background:linear-gradient(#5b8def,#3b6fd8);border-radius:8px;box-shadow:0 18px 30px rgba(0,0,0,.45);z-index:6}
#elB .env::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 49.5%,rgba(0,0,0,.15) 50%) left/50% 100% no-repeat,linear-gradient(225deg,transparent 49.5%,rgba(0,0,0,.15) 50%) right/50% 100% no-repeat}
#elB .env .flap{position:absolute;left:0;right:0;top:0;height:55%;background:linear-gradient(#7aa5f5,#4f80e2);clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:top;transform:rotateX(180deg);transition:transform .45s}
#elB .env.closed .flap{transform:none}#elB .env .seal{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);font-size:30px;transition:transform .3s .35s}#elB .env.closed .seal{transform:translate(-50%,-50%) scale(1)}
#elB .box{position:absolute;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(240px,64vw);aspect-ratio:5/4;background:linear-gradient(#e8eefc,#c7d4f2);border:3px solid #0038b8;border-radius:10px;z-index:4;display:flex;align-items:center;justify-content:center;color:#0038b8;font-weight:900;font-size:22px;box-shadow:0 16px 28px rgba(0,0,0,.45)}
#elB .box::before{content:"";position:absolute;top:-3px;left:22%;right:22%;height:10px;background:#0b1a3d;border-radius:0 0 6px 6px}
#elB .box.shake{animation:ebShake .5s}@keyframes ebShake{25%{transform:translateX(-50%) rotate(-4deg)}50%{transform:translateX(-50%) rotate(4deg)}75%{transform:translateX(-50%) rotate(-2deg)}}
#elB .done{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:20px;background:radial-gradient(circle,rgba(0,56,184,.55),rgba(5,12,32,.95) 70%)}
#elB .stamp{font-size:30px;font-weight:900;color:#fff;border:5px solid #fff;border-radius:16px;padding:10px 22px;transform:rotate(-8deg);animation:ebStamp .55s cubic-bezier(.2,1.8,.4,1)}@keyframes ebStamp{from{transform:rotate(-8deg) scale(2.4);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:1}}
#elB .conf{position:absolute;top:-16px;width:9px;height:14px;border-radius:2px;animation:ebConf linear forwards;z-index:9}@keyframes ebConf{to{transform:translateY(110vh) rotate(720deg)}}
/* תוצאות */
#elB .res{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
#elB .res h3{margin:6px 0 2px;font-size:22px;text-align:center}#elB .res .sub{text-align:center;color:#c7d6ff;font-size:14px}
#elB .row{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;background:rgba(255,255,255,.07);border-radius:14px;padding:10px}
#elB .row .lt{width:52px;height:52px;border-radius:10px;background:#fffef9;color:#0b2a7a;display:grid;place-items:center;font-weight:900;font-size:16px}
#elB .row .nm{font-weight:800;min-width:0}#elB .row .bar{height:10px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:6px}#elB .row .bar i{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#7aa5f5,#fff);transition:width 1.4s cubic-bezier(.2,.8,.2,1)}
#elB .row .pc{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}#elB .row.win{background:linear-gradient(135deg,rgba(250,204,21,.25),rgba(255,255,255,.08));outline:2px solid #facc15}
#elB .cd{position:absolute;inset:0;z-index:7;display:grid;place-items:center;background:#0b1a3d;font-size:96px;font-weight:900}
#elB .cd small{display:block;font-size:18px;text-align:center;color:#c7d6ff}
@media (prefers-reduced-motion:reduce){#elB *,#electCard *{animation:none!important;transition:none!important}}
`;
  const css = () => { if (document.getElementById("electCss")) return; const s = document.createElement("style"); s.id = "electCss"; s.textContent = CSS; document.head.appendChild(s); };

  // ---- כרטיס בדף הבית ----
  function card() {
    const host = document.getElementById("streakPill") || document.getElementById("content"); if (!host || !host.parentNode) return;
    let el = document.getElementById("electCard");
    if (!E || !["open", "closed"].includes(E.state) || !Array.isArray(E.cands) || !profile()) { if (el) el.remove(); return; }
    css();
    if (!el) { el = document.createElement("button"); el.type = "button"; el.id = "electCard"; host.parentNode.insertBefore(el, host); el.onclick = () => booth(); }
    const t = esc(E.title || "בחירות למועצת התלמידים"), bar = `<div class="ec-bar"><i style="width:${E.turnout}%"></i></div>`;
    if (E.state === "closed") { el.className = ""; el.innerHTML = `<span class="ec-ic">📊</span><span class="ec-t"><b>${t} – התוצאות פורסמו!</b><small>אחוז הצבעה: בערך ${E.turnout}%</small></span><span class="ec-go">לראות</span>`; return; }
    if (E.voted) { el.className = ""; el.innerHTML = `<span class="ec-ic">✅</span><span class="ec-t"><b>הצבעת! תודה 🇮🇱</b><small>כבר הצביעו בערך ${E.turnout}% · התוצאות יפורסמו כשהקלפי תיסגר</small>${bar}</span>`; return; }
    el.className = "wait"; el.innerHTML = `<span class="ec-ic">🗳️</span><span class="ec-t"><b>${t} – הקלפי פתוחה!</b><small>כבר הצביעו בערך ${E.turnout}% · קול אחד לכל אחד, והוא סודי</small>${bar}</span><span class="ec-go">להצביע</span>`;
  }

  // ---- הקלפי ----
  function booth() {
    if (!E) return; css(); const old = document.getElementById("elB"); if (old) old.remove();
    const d = document.createElement("div"); d.id = "elB"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "קלפי"); document.body.appendChild(d);
    const close = () => { d.remove(); card(); }; const key = e => { if (e.key === "Escape") { removeEventListener("keydown", key); close(); } }; addEventListener("keydown", key);
    d.innerHTML = `<div class="eb-top"><b>🗳️ ${esc(E.title || "בחירות למועצת התלמידים")}</b><button class="eb-x" type="button" aria-label="סגור">✕</button></div><div class="eb-stage"></div>`;
    d.querySelector(".eb-x").onclick = close;
    const st = d.querySelector(".eb-stage");
    if (E.state === "closed") return results(st);
    if (E.voted) { st.innerHTML = `<div class="done" style="position:relative;min-height:60vh"><div class="stamp">הצבעתי ✓</div><p>הקול שלך כבר בקלפי. כבר הצביעו בערך ${E.turnout}%.</p><p style="color:#c7d6ff">התוצאות יפורסמו כשהקלפי תיסגר.</p></div>`; return; }
    st.innerHTML = `<div class="eb-curtain" aria-hidden="true"></div><p class="eb-hint">אתה מאחורי הפרגוד – אף אחד לא רואה 🤫<br>בחר פתק מהשולחן</p>
      <div class="eb-table"><div class="eb-slips">${order(E.cands || []).map(c => `<button type="button" class="slip" data-c="${esc(c.id)}" aria-label="פתק של ${esc(c.name)}"><span class="pile"></span><span class="face"><span class="lt">${esc(c.letters || c.name.slice(0, 2))}</span><span class="nm">${esc(c.name)}</span></span></button>`).join("")}</div></div>
      <p class="eb-hint" style="margin-top:14px;font-size:13px;font-weight:600">קול אחד לכל אחד. אחרי ששמים במעטפה ובקלפי – אי אפשר לשנות.</p>`;
    st.querySelectorAll(".slip").forEach(b => b.onclick = () => pick(st, E.cands.find(c => c.id === b.dataset.c)));
  }
  function pick(st, c) {
    if (!c) return; const ov = document.createElement("div"); ov.className = "eb-pick"; st.appendChild(ov);
    ov.innerHTML = `<div class="big"><span class="lt">${esc(c.letters || c.name.slice(0, 2))}</span><span class="nm">${esc(c.name)}</span>${c.slogan ? `<span class="sl">${esc(c.slogan)}</span>` : ""}</div>
      <div class="eb-btns"><button class="eb-btn" type="button" id="ebPut">✉️ לשים במעטפה</button><button class="eb-btn alt" type="button" id="ebBack">להחזיר לשולחן</button></div>`;
    ov.querySelector("#ebBack").onclick = () => ov.remove();
    ov.querySelector("#ebPut").onclick = async e => {
      if (busy) return; busy = true; e.target.disabled = true;
      const j = await api({ op: "vote", cid: c.id }); busy = false;
      if (!j || !j.ok) { e.target.disabled = false; const m = { already: "כבר הצבעת מהטלפון הזה 🙂", closed: "הקלפי כבר נסגרה", not_registered: "האפליקציה עוד נרשמת – נסה שוב בעוד דקה" }[j && j.error] || "אין חיבור כרגע – נסה שוב"; ov.querySelector(".eb-btns").insertAdjacentHTML("afterend", `<p style="color:#fecaca;font-weight:800">${m}</p>`); if (j && j.error === "already") { E.voted = true; } return; }
      E = Object.assign(E, j); LS.set("electVoted", E.id || "1"); drop(st, ov);
    };
  }
  // ✉️ → 🗳️ אנימציה: הפתק נכנס למעטפה, המעטפה נסגרת ונופלת לקלפי
  async function drop(st, ov) {
    const w = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms)), big = ov.querySelector(".big"), btns = ov.querySelector(".eb-btns"); btns.remove();
    const env = document.createElement("div"); env.className = "env"; env.innerHTML = `<div class="flap"></div><div class="seal">🇮🇱</div>`; ov.appendChild(env);
    const box = document.createElement("div"); box.className = "box"; box.textContent = "קלפי"; ov.appendChild(box);
    if (big.animate && !REDUCED) await big.animate([{ transform: "none" }, { transform: "translateY(40px) scale(.55)", opacity: 1 }, { transform: "translateY(60px) scale(.4)", opacity: 0 }], { duration: 700, easing: "ease-in", fill: "forwards" }).finished.catch(() => {}); else big.style.opacity = 0;
    env.classList.add("closed"); try { navigator.vibrate && navigator.vibrate(20); } catch (e) {} await w(800);
    if (env.animate && !REDUCED) { const r1 = env.getBoundingClientRect(), r2 = box.getBoundingClientRect(); await env.animate([{ transform: "none" }, { transform: `translate(${(r2.left + r2.width / 2) - (r1.left + r1.width / 2)}px,${(r2.top) - (r1.top + r1.height / 2)}px) scale(.35) rotate(-6deg)`, opacity: 1 }, { transform: `translate(${(r2.left + r2.width / 2) - (r1.left + r1.width / 2)}px,${(r2.top + 30) - (r1.top + r1.height / 2)}px) scale(.3)`, opacity: 0 }], { duration: 900, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).finished.catch(() => {}); } else env.style.opacity = 0;
    box.classList.add("shake"); try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) {} await w(450);
    const done = document.createElement("div"); done.className = "done";
    done.innerHTML = `<div class="stamp">הצבעתי ✓</div><h3 style="margin:6px 0 0;font-size:22px">הקול שלך נספר!</h3><p>כבר הצביעו בערך ${E.turnout}%. התוצאות יפורסמו כשהקלפי תיסגר.</p><p style="color:#c7d6ff;font-size:13px">ההצבעה סודית – אף אחד (גם לא מנהל המערכת) לא יודע במי בחרת.</p><button class="eb-btn" type="button" id="ebFin">סיום</button>`
      + (REDUCED ? "" : Array.from({ length: 34 }, (_, i) => `<i class="conf" style="left:${Math.random() * 100}%;background:${i % 2 ? "#fff" : "#0038b8"};animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .6}s"></i>`).join(""));
    ov.appendChild(done); done.querySelector("#ebFin").onclick = () => { const b = document.getElementById("elB"); if (b) b.remove(); card(); };
  }
  // 📊 התוצאות: ספירה לאחור (פעם ראשונה), ואז עמודות שגדלות
  async function results(st) {
    const R = (E.results || []).map(r => Object.assign({}, r, (E.cands || []).find(c => c.id === r.id) || {})), first = LS.get("electSeen", "") !== E.id;
    st.innerHTML = `<div class="res"><h3>📊 התוצאות</h3><div class="sub">אחוז הצבעה: בערך ${E.turnout}%</div>${R.length > 1 && R[0].pct > 0 && R[0].pct === R[1].pct ? `<div class="sub" style="font-weight:800;color:#fff">🤝 תיקו בראש!</div>` : ""}${R.map((r, i) => `<div class="row${r.pct > 0 && r.pct === R[0].pct ? " win" : ""}"><span class="lt">${esc(r.letters || (r.name || "").slice(0, 2))}</span><div style="min-width:0"><div class="nm">${r.pct > 0 && r.pct === R[0].pct ? "👑 " : ""}${esc(r.name || "")}</div><div class="bar"><i data-w="${r.pct}"></i></div></div><span class="pc">${r.pct}%</span></div>`).join("")}
      <p class="sub" style="margin-top:6px">כל טלפון הצביע פעם אחת. השרת שמר רק כמה קולות קיבל כל מועמד.</p></div>`;
    if (first && !REDUCED) { LS.set("electSeen", E.id); const cd = document.createElement("div"); cd.className = "cd"; st.appendChild(cd); for (const n of ["3", "2", "1"]) { cd.innerHTML = `<div>${n}<small>הקלפי נסגרה · סופרים קולות…</small></div>`; await new Promise(r => setTimeout(r, 800)); } cd.remove(); }
    requestAnimationFrame(() => st.querySelectorAll(".bar i").forEach(i => { i.style.width = i.dataset.w + "%"; }));
    if (first && !REDUCED && R[0] && R[0].pct > 0) { const f = document.createElement("div"); f.innerHTML = Array.from({ length: 30 }, (_, i) => `<i class="conf" style="position:fixed;left:${Math.random() * 100}%;background:${i % 2 ? "#fff" : "#facc15"};animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${.8 + Math.random() * .6}s"></i>`).join(""); st.appendChild(f); }
  }

  let last = 0;
  async function refresh() { last = Date.now(); const j = await api(); if (j && j.ok) { E = j; E.turnout = +j.turnout || 0; card(); } }
  // 🛰️ הפיד הרגיל (updates.js) מספר אם יש קלפי – רק אז מבקשים את הפרטים. ככה אין בקשה נוספת לשרת כשאין בחירות
  function hint(el) {
    LS.set("electHint", el ? JSON.stringify(el) : null);
    if (!el) { if (E) { E = null; card(); } return; }
    const changed = !E || E.state !== el.s || (E.id || "") !== el.id;
    if (changed || (el.s === "open" && Date.now() - last > 5 * 60e3)) refresh();
  }
  window.Elect = { refresh, booth, hint, state: () => E };
  // פתיחה: אם בפעם הקודמת הייתה קלפי – מראים מיד (בלי לחכות לפיד)
  try { const h = JSON.parse(LS.get("electHint", "null")); if (h && h.s && document.getElementById("content")) setTimeout(() => { if (!last) refresh(); }, 1500); } catch (e) {}
})();
