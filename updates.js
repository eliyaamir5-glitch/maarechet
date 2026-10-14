// עדכוני צוות באפליקציה: מושך את העדכונים הפעילים מהשרת ומציג אותם בראש המסך.
// עדכון חדש קופץ פעם אחת על כל המסך, ואחרי "הבנתי" עף למקום שלו ברשימת העדכונים ונשאר שם.
// התוכן מוצג כטקסט בלבד (textContent), לעולם לא כ-HTML.
(function () {
  const KEY = "updatesCache", SEEN = "updatesSeen";
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const DAYN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const pad = n => String(n).padStart(2, "0");
  const AUD = { all: "", y1: "י'1", y2: "י'2" };
  const ROLE = { admin: ["מנהל", "admin"], teacher: ["מורה", "teacher"], staff: ["צוות", "staff"] };
  const roleOf = r => ROLE[r] || ROLE.teacher;

  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "עכשיו";
    if (m < 60) return `לפני ${m} דק'`;
    if (m < 1440) { const h = Math.round(m / 60); return h <= 1 ? "לפני שעה" : `לפני ${h} שע'`; }
    const d = Math.round(m / 1440);
    return d <= 1 ? "לפני יום" : d === 2 ? "לפני יומיים" : `לפני ${d} ימים`;
  }
  function until(t) {
    const d = new Date(t), now = new Date(), hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const left = t - Date.now();
    if (left < 60 * 60e3) return `עוד ${Math.max(1, Math.round(left / 60000))} דק'`;
    if (d.toDateString() === now.toDateString()) return `עד ${hm}`;
    const tm = new Date(now); tm.setDate(tm.getDate() + 1);
    if (d.toDateString() === tm.toDateString()) return `עד מחר ${hm}`;
    if (left < 7 * 864e5) return `עד יום ${DAYN[d.getDay()]}`;
    return `עד ${d.getDate()}.${d.getMonth() + 1}`;
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sorted = list => list.slice().sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));

  // כרטיס עדכון אחד (משמש גם ברשימה וגם בחלון הקופץ)
  function card(u, extra) {
    const c = el("div", "upd" + (u.urgent ? " urgent" : "") + (extra ? " " + extra : ""));
    c.dataset.id = u.id;
    const top = el("div", "upd-top"), who = el("span", "upd-who"), [rl, rc] = roleOf(u.role);
    who.append(el("span", "upd-role " + rc, rl), el("b", "", u.author));
    top.append(who);
    if (u.urgent) top.append(el("span", "upd-urgent", "דחוף"));
    if (AUD[u.audience]) top.append(el("span", "upd-aud", AUD[u.audience]));
    c.append(top, el("div", "upd-text", u.text), el("div", "upd-meta", `${ago(u.createdAt)} · ${until(u.expiresAt)}`));
    return c;
  }

  const Updates = {
    url() { return ((typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "") + "/api/updates"; },
    cached() { const c = load(KEY, null); return c ? (c.list || []).filter(u => u.expiresAt > Date.now()) : []; },
    async refresh() {
      try {
        const r = await fetch(this.url(), { cache: "no-store" });
        const j = await r.json();
        if (j && j.ok && Array.isArray(j.updates)) { save(KEY, { at: Date.now(), list: j.updates }); return true; }
      } catch (e) {}
      return false;
    },
    forClass(cls) { return sorted(this.cached().filter(u => !cls || u.audience === "all" || u.audience === cls)); },
    // preview: רשימה לתצוגה מקדימה (במסך הצוות), בלי לגעת במטמון
    render(box, cls, preview) {
      const list = preview ? sorted(preview) : this.forClass(cls);
      const flying = new Set(this._flying || []);
      box.textContent = "";
      if (!list.length) { box.hidden = true; return; }
      box.hidden = false;
      const head = el("div", "upd-head");
      head.append(el("span", "", "📢 עדכונים"), el("small", "", list.length > 1 ? `${list.length} עדכונים פעילים` : ""));
      box.append(head);
      const SHOW = 3;
      list.forEach((u, i) => {
        const c = card(u, (i >= SHOW ? "more" : "") + (flying.has(u.id) ? " waiting" : ""));
        if (i >= SHOW) c.hidden = true;
        box.append(c);
      });
      if (list.length > SHOW) {
        const more = el("button", "upd-more", `הצג עוד ${list.length - SHOW}`);
        more.type = "button";
        more.onclick = () => { box.querySelectorAll(".upd.more").forEach(c => c.hidden = false); more.remove(); };
        box.append(more);
      }
    },

    // ---- חלון קופץ לעדכונים שעוד לא נראו ----
    unseen(cls) { const seen = load(SEEN, []); return this.forClass(cls).filter(u => !seen.includes(u.id)); },
    markSeen(ids) {
      const seen = load(SEEN, []);
      save(SEEN, [...new Set([...seen, ...ids])].slice(-300));
      // ספירת צפיות אנונימית, כדי שהצוות יידע כמה ראו
      try { fetch(this.url(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seen: ids }), keepalive: true }).catch(() => {}); } catch (e) {}
    },
    async popup(box, cls) {
      if (this._popping) return;
      const queue = this.unseen(cls);
      if (!queue.length) return;
      this._popping = true; this._flying = queue.map(u => u.id);
      this.render(box, cls);
      const ov = el("div", "upd-pop"), bk = el("div", "upd-bk"), stage = el("div", "upd-stage");
      ov.append(bk, stage); document.body.append(ov);
      document.documentElement.classList.add("upd-lock");
      try { navigator.vibrate && navigator.vibrate(queue.some(u => u.urgent) ? [60, 40, 60] : 40); } catch (e) {}
      for (let i = 0; i < queue.length; i++) {
        const u = queue[i];
        stage.textContent = "";
        const title = el("div", "upd-pop-title", u.urgent ? "🚨 עדכון דחוף" : "📢 עדכון חדש");
        const c = card(u, "big");
        const btn = el("button", "upd-ok", i < queue.length - 1 ? `הבנתי · עוד ${queue.length - 1 - i}` : "הבנתי ✓");
        btn.type = "button";
        stage.append(title, c, btn);
        await new Promise(res => { btn.onclick = res; bk.onclick = res; });
        btn.disabled = true;
        await this.fly(c, box, u.id, title, btn, i === queue.length - 1 ? bk : null);
        this._flying = this._flying.filter(x => x !== u.id);
        this.markSeen([u.id]);
      }
      ov.remove();
      document.documentElement.classList.remove("upd-lock");
      this._popping = false;
    },
    // אנימציית "מעוף": הכרטיס הגדול מתכווץ ועף בדיוק למקום שלו ברשימה
    async fly(c, box, id, title, btn, bk) {
      window.scrollTo({ top: 0 });
      if (!c.animate) { const r = box.querySelector(`.upd[data-id="${CSS.escape(id)}"]`); if (r) r.classList.remove("waiting"); return; } // דפדפן ישן: בלי אנימציה
      let target = box.querySelector(`.upd[data-id="${CSS.escape(id)}"]`);
      if (target && target.hidden) target = box.querySelector(".upd-more") || box;
      const a = c.getBoundingClientRect(), b = (target || box).getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      const sx = b.width / a.width, sy = b.height / a.height;
      const fade = [{ opacity: 1 }, { opacity: 0 }], ease = "cubic-bezier(.65,0,.3,1)";
      const anims = [
        c.animate([
          { transform: "none", offset: 0 },
          { transform: "translateY(-14px) scale(1.04)", offset: .18 },
          { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, offset: 1 },
        ], { duration: 720, easing: ease, fill: "forwards" }),
        title.animate(fade, { duration: 250, fill: "forwards" }),
        btn.animate(fade, { duration: 200, fill: "forwards" }),
      ];
      if (bk) anims.push(bk.animate(fade, { duration: 720, easing: "ease-in", fill: "forwards" }));
      await Promise.race([Promise.all(anims.map(x => x.finished)), new Promise(r => setTimeout(r, 1000))]);
      c.style.visibility = "hidden";
      const real = box.querySelector(`.upd[data-id="${CSS.escape(id)}"]`);
      if (real) { real.classList.remove("waiting"); real.classList.add("landed"); setTimeout(() => real.classList.remove("landed"), 1200); }
    },

    // מציג מהמטמון מיד, מרענן מהשרת, וממשיך לרענן כל דקה ובכל חזרה לאפליקציה.
    // canPop: האם אפשר להקפיץ עכשיו (למשל לא באמצע הרשמה)
    init(box, getCls, canPop) {
      const ok = () => !canPop || canPop();
      const draw = () => { if (!this._popping) this.render(box, getCls()); };
      const tryPop = () => { if (ok() && !document.hidden) this.popup(box, getCls()); };
      draw();
      const tick = async () => { await this.refresh(); draw(); tryPop(); }; // מציירים גם אם הרענון נכשל, כדי להעלים עדכונים שפג תוקפם
      setTimeout(tryPop, 700); // מהמטמון, מיד בפתיחה
      tick();
      setInterval(tick, 60e3);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
      this.retryPop = tryPop;
    },
  };

  const css = document.createElement("style");
  css.textContent = `#updates{margin-bottom:12px}
  .upd-head{display:flex;justify-content:space-between;align-items:baseline;font-weight:900;font-size:16px;margin:0 4px 8px}
  .upd-head small{font-weight:400;color:var(--muted);font-size:12px}
  .upd{background:var(--card);border:1.5px solid var(--line);border-inline-start:5px solid var(--accent);border-radius:16px;padding:12px 14px;margin-bottom:8px;animation:updin .45s cubic-bezier(.2,.8,.2,1) both;transition:box-shadow .4s}
  .upd.urgent{border-color:#ff5d6c;border-inline-start-color:#ff5d6c;background:linear-gradient(135deg,rgba(255,93,108,.14),var(--card) 60%)}
  .upd.waiting{visibility:hidden;animation:none}
  .upd.landed{animation:updland .9s cubic-bezier(.2,.8,.2,1)}
  @keyframes updin{from{opacity:0;transform:translateY(-8px)}}
  @keyframes updland{0%{box-shadow:0 0 0 0 rgba(124,140,255,.7);transform:scale(1.02)}100%{box-shadow:0 0 0 14px rgba(124,140,255,0);transform:none}}
  .upd-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px}
  .upd-who{display:inline-flex;align-items:center;gap:6px}
  .upd-role{border-radius:8px;padding:1px 8px;font-size:11px;font-weight:900;color:#fff}
  .upd-role.admin{background:linear-gradient(135deg,#5b6cff,#a259ff)}.upd-role.teacher{background:#2a8f9a}.upd-role.staff{background:#8a6d1f}
  .upd-urgent{background:#ff5d6c;color:#fff;border-radius:8px;padding:1px 8px;font-size:11px;font-weight:900}
  .upd-aud{background:var(--break);border-radius:8px;padding:1px 8px;font-size:11px;font-weight:700}
  .upd-text{font-size:16px;line-height:1.5;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}
  .upd-meta{font-size:12px;color:var(--muted);margin-top:6px}
  .upd-more{display:block;width:100%;border:1.5px dashed var(--line);background:none;color:var(--accent);border-radius:12px;padding:8px;font:inherit;font-weight:700;cursor:pointer;margin-bottom:8px}
  html.upd-lock,html.upd-lock body{overflow:hidden}
  .upd-pop{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
  .upd-bk{position:absolute;inset:0;background:rgba(8,10,30,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:updfade .3s both}
  .upd-stage{position:relative;width:100%;max-width:420px;display:flex;flex-direction:column;align-items:stretch;gap:14px}
  .upd-pop-title{color:#fff;text-align:center;font-size:22px;font-weight:900;text-shadow:0 2px 12px rgba(0,0,0,.4);animation:updpop .5s cubic-bezier(.2,1.4,.4,1) both}
  .upd.big{margin:0;padding:18px;border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.45);animation:updpop .55s cubic-bezier(.2,1.3,.4,1) .05s both;transform-origin:center}
  .upd.big .upd-text{font-size:19px;font-weight:500}
  .upd.big .upd-top{font-size:15px}
  .upd-ok{align-self:center;border:none;border-radius:999px;padding:13px 34px;font:inherit;font-size:17px;font-weight:900;background:#fff;color:#1b1f45;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:updpop .5s cubic-bezier(.2,1.4,.4,1) .2s both}
  @keyframes updfade{from{opacity:0}}
  @keyframes updpop{from{opacity:0;transform:scale(.7) translateY(30px)}}`;
  document.head.appendChild(css);
  window.Updates = Updates;
})();
