// עדכוני צוות באפליקציה: מושך את העדכונים הפעילים מהשרת ומציג אותם בראש המסך.
// התוכן מוצג כטקסט בלבד (textContent), לעולם לא כ-HTML.
(function () {
  const KEY = "updatesCache", SEEN = "updatesSeen";
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const DAYN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const pad = n => String(n).padStart(2, "0");
  const AUD = { all: "", y1: "י'1", y2: "י'2" };

  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "עכשיו";
    if (m < 60) return `לפני ${m} דק'`;
    if (m < 1440) return `לפני ${Math.round(m / 60)} שע'`;
    return `לפני ${Math.round(m / 1440)} ימים`;
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
    // preview: רשימה לתצוגה מקדימה (במסך הצוות), בלי לגעת במטמון ובמה שכבר נראה
    render(box, cls, preview) {
      const list = (preview || this.cached()).filter(u => !cls || u.audience === "all" || u.audience === cls)
        .sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));
      box.textContent = "";
      if (!list.length) { box.hidden = true; return; }
      box.hidden = false;
      const seen = load(SEEN, []);
      const head = el("div", "upd-head");
      head.append(el("span", "", "📢 עדכונים"), el("small", "", list.length > 1 ? `${list.length} עדכונים פעילים` : ""));
      box.append(head);
      const SHOW = 3;
      list.forEach((u, i) => {
        const card = el("div", "upd" + (u.urgent ? " urgent" : "") + (!seen.includes(u.id) ? " fresh" : "") + (i >= SHOW ? " more" : ""));
        if (i >= SHOW) card.hidden = true;
        const top = el("div", "upd-top");
        const who = el("span", "upd-who");
        who.append(el("span", "upd-role " + (u.role === "admin" ? "admin" : "teacher"), u.role === "admin" ? "מנהל" : "מורה"), el("b", "", u.author));
        top.append(who);
        if (u.urgent) top.append(el("span", "upd-urgent", "דחוף"));
        if (AUD[u.audience]) top.append(el("span", "upd-aud", AUD[u.audience]));
        card.append(top, el("div", "upd-text", u.text), el("div", "upd-meta", `${ago(u.createdAt)} · ${until(u.expiresAt)}`));
        box.append(card);
      });
      if (list.length > SHOW) {
        const more = el("button", "upd-more", `הצג עוד ${list.length - SHOW}`);
        more.type = "button";
        more.onclick = () => { box.querySelectorAll(".upd.more").forEach(c => c.hidden = false); more.remove(); };
        box.append(more);
      }
      if (!preview) save(SEEN, [...new Set([...seen, ...list.map(u => u.id)])].slice(-200));
    },
    // מציג מהמטמון מיד, מרענן מהשרת, וממשיך לרענן כל דקה ובכל חזרה לאפליקציה
    init(box, getCls) {
      const draw = () => this.render(box, getCls());
      draw();
      const tick = async () => { await this.refresh(); draw(); }; // מציירים גם אם הרענון נכשל, כדי להעלים עדכונים שפג תוקפם
      tick();
      setInterval(tick, 60e3);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
    },
  };

  const css = document.createElement("style");
  css.textContent = `#updates{margin-bottom:12px}
  .upd-head{display:flex;justify-content:space-between;align-items:baseline;font-weight:900;font-size:16px;margin:0 4px 8px}
  .upd-head small{font-weight:400;color:var(--muted);font-size:12px}
  .upd{background:var(--card);border:1.5px solid var(--line);border-inline-start:5px solid var(--accent);border-radius:16px;padding:12px 14px;margin-bottom:8px;animation:updin .45s cubic-bezier(.2,.8,.2,1) both}
  .upd.urgent{border-color:#ff5d6c;border-inline-start-color:#ff5d6c;background:linear-gradient(135deg,rgba(255,93,108,.14),var(--card) 60%)}
  .upd.fresh{box-shadow:0 0 0 3px rgba(124,140,255,.35)}
  .upd.urgent.fresh{box-shadow:0 0 0 3px rgba(255,93,108,.35);animation:updin .45s cubic-bezier(.2,.8,.2,1) both,updpulse 1.6s ease-in-out .5s 3}
  @keyframes updin{from{opacity:0;transform:translateY(-8px)}}
  @keyframes updpulse{50%{box-shadow:0 0 0 7px rgba(255,93,108,0)}}
  .upd-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px}
  .upd-who{display:inline-flex;align-items:center;gap:6px}
  .upd-role{border-radius:8px;padding:1px 8px;font-size:11px;font-weight:900;color:#fff}
  .upd-role.admin{background:linear-gradient(135deg,#5b6cff,#a259ff)}.upd-role.teacher{background:#2a8f9a}
  .upd-urgent{background:#ff5d6c;color:#fff;border-radius:8px;padding:1px 8px;font-size:11px;font-weight:900}
  .upd-aud{background:var(--break);border-radius:8px;padding:1px 8px;font-size:11px;font-weight:700}
  .upd-text{font-size:16px;line-height:1.5;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}
  .upd-meta{font-size:12px;color:var(--muted);margin-top:6px}
  .upd-more{display:block;width:100%;border:1.5px dashed var(--line);background:none;color:var(--accent);border-radius:12px;padding:8px;font:inherit;font-weight:700;cursor:pointer;margin-bottom:8px}`;
  document.head.appendChild(css);
  window.Updates = Updates;
})();
