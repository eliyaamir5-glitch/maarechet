// עדכוני צוות באפליקציה: מושך את העדכונים הפעילים מהשרת ומציג אותם בראש המסך.
// עדכון חדש קופץ פעם אחת על כל המסך, ואחרי "הבנתי" עף למקום שלו ברשימת העדכונים ונשאר שם.
// התוכן מוצג כטקסט בלבד (textContent), לעולם לא כ-HTML. קישורים הופכים ללחיצים (נבנים כאלמנטים, לא כ-HTML),
// וסרטון (יוטיוב / גוגל דרייב / וימאו / קובץ וידאו) מוצג ככפתור ▶️ – מתנגן רק אם התלמיד לוחץ.
(function () {
  const KEY = "updatesCache", SEEN = "updatesSeen";
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const DAYN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const pad = n => String(n).padStart(2, "0");
  const AUD = { all: "", y1: "י'1", y2: "י'2" };
  const ROLE = { admin: ["מנהל", "admin"], teacher: ["מורה", "teacher"], staff: ["צוות", "staff"] };
  const own = (o, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
  const roleOf = r => own(ROLE, r) ? ROLE[r] : ROLE.teacher;
  // מטמון פגום בטלפון (לא רשימה / לא אובייקט) = מתחילים מחדש, בלי לקרוס
  const loadArr = k => { const v = load(k, []); return Array.isArray(v) ? v : []; };
  const loadObj = k => { const v = load(k, {}); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; };

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

  // ---- קישורים וסרטונים ----
  const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  const trimUrl = u => u.replace(/[.,;:!?)\]}'"״׳]+$/, "");
  function linkify(text) {
    const box = el("div", "upd-text"), t = String(text || "");
    let last = 0;
    t.replace(URL_RE, (m, _x, i) => {
      const url = trimUrl(m), end = i + url.length;
      box.append(document.createTextNode(t.slice(last, i)));
      const href = /^https?:/i.test(url) ? url : "https://" + url;
      const a = el("a", "upd-link"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
      let host = url; try { const u = new URL(href); host = u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? "/…" : ""); } catch (e) {}
      a.textContent = "🔗 " + host;
      a.addEventListener("click", e => e.stopPropagation());
      box.append(a); last = end; return m;
    });
    box.append(document.createTextNode(t.slice(last)));
    return box;
  }
  // איך מנגנים סרטון מקישור: iframe (יוטיוב/דרייב/וימאו) או <video> (קובץ ישיר). null = לא סרטון
  function videoEmbed(url) {
    let u; try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== "https:") return null;
    const h = u.hostname.replace(/^(www|m)\./, "");
    let id = null, vertical = false;
    if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (h === "youtube.com" || h === "music.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else { const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/); if (m) { id = m[2]; vertical = m[1] === "shorts"; } }
    }
    if (id && /^[\w-]{6,20}$/.test(id)) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, vertical, label: "יוטיוב" };
    if (h === "drive.google.com") { const m = u.pathname.match(/\/file\/d\/([\w-]+)/) || [null, u.searchParams.get("id")]; if (m[1]) return { kind: "iframe", src: `https://drive.google.com/file/d/${m[1]}/preview`, label: "גוגל דרייב" }; }
    if (h === "vimeo.com") { const m = u.pathname.match(/^\/(\d+)/); if (m) return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, label: "וימאו" }; }
    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: "video", src: u.href, label: "סרטון" };
    return null;
  }
  // הסרטון של העדכון: השדה video, או קישור לסרטון שהודבק בטקסט
  function videoOf(u) {
    if (u.video && videoEmbed(u.video)) return u.video;
    const m = String(u.text || "").match(URL_RE) || [];
    return m.map(trimUrl).find(x => videoEmbed(x)) || null;
  }
  function videoBtn(url) {
    const v = videoEmbed(url), b = el("button", "upd-video"); b.type = "button";
    if (v.thumb) { const img = el("img"); img.src = v.thumb; img.alt = ""; img.loading = "lazy"; img.onerror = () => img.remove(); b.append(img); b.classList.add("thumb"); }
    b.append(el("span", "upd-play", "▶"), el("span", "upd-vlabel", "צפייה בסרטון"));
    b.addEventListener("click", e => { e.stopPropagation(); Updates.playVideo(url); });
    return b;
  }

  // כרטיס עדכון אחד (משמש גם ברשימה וגם בחלון הקופץ)
  function card(u, extra) {
    const c = el("div", "upd" + (u.urgent ? " urgent" : "") + (extra ? " " + extra : ""));
    c.dataset.id = String(u.id);
    const top = el("div", "upd-top"), who = el("span", "upd-who"), [rl, rc] = roleOf(u.role);
    who.append(el("span", "upd-role " + rc, rl), el("b", "", u.author));
    top.append(who);
    if (u.urgent) top.append(el("span", "upd-urgent", "דחוף"));
    if (own(AUD, u.audience) && AUD[u.audience]) top.append(el("span", "upd-aud", AUD[u.audience]));
    c.append(top, linkify(u.text));
    const vid = videoOf(u); if (vid) c.append(videoBtn(vid));
    c.append(el("div", "upd-meta", (+u.createdAt ? ago(+u.createdAt) + " · " : "") + until(+u.expiresAt)));
    return c;
  }

  // אימוג'י מוכנים לבחירה מהירה (ואפשר גם כל אימוג'י מהמקלדת)
  const PICK = ["👍","❤️","😂","😮","😢","🙏","🔥","👏","🎉","💯","😍","🤔","😅","😎","🥳","🤩","🙌","💪","✅","⭐","🏆","📚","✏️","⚽","🍕","🎂","🤯","😇","🫡","👀","💙","🤣","😴","😬","🥲","🤝","💡","🌟","😡","❌"];
  const EMOJI_RE = /^(?=.*[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3])[\p{Extended_Pictographic}\p{Emoji_Component}\u200d\ufe0f\u20e3]{1,10}$/u;
  // תו אחד שנראה (grapheme): "👍🏽" או "👨‍👩‍👦" = אחד, "😀😀" = שניים
  const oneEmoji = v => { if (!EMOJI_RE.test(v)) return false; try { if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter().segment(v)].length === 1; } catch (e) {} return true; };
  const Updates = {
    videoEmbed,
    // נגן סרטון על כל המסך. נסגר ב-✕, בלחיצה בחוץ או ב-Esc
    playVideo(url) {
      const v = videoEmbed(url); if (!v) { window.open(url, "_blank", "noopener"); return; }
      const ov = el("div", "upd-vid"), frame = el("div", "upd-vframe" + (v.vertical ? " vert" : "")), x = el("button", "upd-vclose", "✕ סגירה");
      x.type = "button";
      let media;
      if (v.kind === "iframe") { media = el("iframe"); media.src = v.src; media.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; media.allowFullscreen = true; media.referrerPolicy = "strict-origin-when-cross-origin"; }
      else { media = el("video"); media.src = v.src; media.controls = true; media.autoplay = true; media.playsInline = true; }
      frame.append(media); ov.append(x, frame);
      const open = el("a", "upd-vopen", "פתיחה באפליקציה ↗"); open.href = url; open.target = "_blank"; open.rel = "noopener noreferrer"; ov.append(open);
      const close = () => { ov.remove(); document.removeEventListener("keydown", esc); };
      const esc = e => { if (e.key === "Escape") close(); };
      x.onclick = close; ov.addEventListener("click", e => { if (e.target === ov) close(); });
      document.addEventListener("keydown", esc);
      document.body.append(ov);
    },
    url() { return ((typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "") + "/api/updates"; },
    feedUrl() { return ((typeof SERVER_BASE !== "undefined" && SERVER_BASE) || "") + "/api/feed"; },
    // סקרים, אירועים, תשובות לשאלות וימי הולדת – מגיעים יחד עם העדכונים
    feed() { const f = load("feedCache", null) || {}, A = x => Array.isArray(x) ? x.filter(o => o && typeof o === "object") : []; return { polls: A(f.polls), events: A(f.events), answers: A(f.answers), birthdays: A(f.birthdays), changes: A(f.changes) }; },
    cached() { const c = load(KEY, null); return c && Array.isArray(c.list) ? c.list.filter(u => u && typeof u === "object" && u.id != null && +u.expiresAt > Date.now()) : []; },
    async refresh() {
      try {
        // קודם הפיד המשולב; אם השרת עוד לא מכיר אותו – הכתובת הישנה (רק עדכונים)
        let j = null, answered = false;
        try { const r = await fetch(this.feedUrl(), { cache: "no-store" }); answered = r.status === 404 || r.ok; if (r.ok) j = await r.json(); } catch (e) {}
        // האם השרת כבר מכיר את הפיד המשולב (סקרים, שאלות וכו') – אם לא, התכונות האלה מוסתרות
        if (answered) try { localStorage.setItem("feedOk", j && j.ok ? "1" : "0"); } catch (e) {}
        if (j && j.ok && Array.isArray(j.updates)) save("feedCache", { at: Date.now(), polls: j.polls || [], events: j.events || [], answers: j.answers || [], birthdays: j.birthdays || [], changes: j.changes || [] });
        else { const r = await fetch(this.url(), { cache: "no-store" }); j = await r.json(); }
        if (j && j.ok && Array.isArray(j.updates)) { save(KEY, { at: Date.now(), list: j.updates }); if (this.onFeed) try { this.onFeed(); } catch (e) {} return true; }
      } catch (e) {}
      return false;
    },
    forClass(cls) { return sorted(this.cached().filter(u => !cls || u.audience === "all" || u.audience === cls)); },
    // preview: רשימה לתצוגה מקדימה (במסך הצוות), בלי לגעת במטמון
    render(box, cls, preview) {
      const list = preview ? sorted(preview) : this.forClass(cls);
      const rOn = !preview && this.who && this.reactOn && this.reactOn(), mine = loadObj("myReacts");
      const sig = JSON.stringify([list.map(u => [u.id, u.text, u.video, u.urgent, u.expiresAt, rOn ? [u.reacts, mine[u.id]] : 0]), [...(this._flying || [])]]);
      if (!preview && box.__sig === sig && box.childElementCount) return;
      box.__sig = preview ? null : sig;
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
        if (rOn && u.reacts && typeof u.reacts === "object") c.append(this.reactBar(u, mine[u.id] || "")); // רק כשהשרת כבר תומך בתגובות
        if (i >= SHOW) c.hidden = true;
        box.append(c);
      });
      if (list.length > SHOW) {
        const more = el("button", "upd-more", `הצג עוד ${list.length - SHOW}`);
        more.type = "button";
        more.onclick = () => { box.querySelectorAll(".upd.more").forEach(c => c.hidden = false); more.remove(); box.__open = true; };
        if (box.__open) more.click();
        box.append(more);
      }
    },

    // ---- תגובות באימוג'י: כל תלמיד מגיב פעם אחת (אפשר להחליף); השולח והמנהל רואים מי הגיב ----
    reactBar(u, mine) {
      const bar = el("div", "upd-react");
      const counts = Object.entries(u.reacts || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      for (const [e, n] of counts.slice(0, 8)) {
        const b = el("button", "upd-rc" + (e === mine ? " mine" : ""), `${e} ${n}`); b.type = "button";
        b.setAttribute("aria-label", e === mine ? `הסר את התגובה ${e}` : `להגיב ${e}`);
        b.onclick = () => this.react(u.id, e === mine ? "" : e);
        bar.append(b);
      }
      const add = el("button", "upd-radd", mine ? "שינוי" : "😀＋"); add.type = "button";
      add.setAttribute("aria-label", "להגיב באימוג'י");
      add.onclick = () => this.picker(u.id, mine);
      bar.append(add);
      return bar;
    },
    picker(id, mine) {
      const ov = el("div", "upd-pick"), sh = el("div", "upd-sheet");
      sh.append(el("div", "upd-ptitle", "איך הגבת לעדכון?"));
      const grid = el("div", "upd-pgrid");
      for (const e of PICK) { const b = el("button", e === mine ? "on" : "", e); b.type = "button"; b.onclick = () => { close(); this.react(id, e); }; grid.append(b); }
      const row = el("div", "upd-prow"), inp = el("input"), go = el("button", "upd-pgo", "שליחה");
      inp.placeholder = "או כל אימוג'י מהמקלדת"; inp.maxLength = 16; inp.setAttribute("aria-label", "אימוג'י"); go.type = "button";
      const msg = el("div", "upd-pmsg");
      go.onclick = () => { const v = inp.value.trim(); if (!oneEmoji(v)) { msg.textContent = "אפשר רק אימוג'י אחד, בלי אותיות."; return; } close(); this.react(id, v); };
      inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); go.click(); } };
      row.append(inp, go); sh.append(grid, row, msg);
      if (mine) { const rm = el("button", "upd-prm", `להסיר את התגובה שלי (${mine})`); rm.type = "button"; rm.onclick = () => { close(); this.react(id, ""); }; sh.append(rm); }
      const x = el("button", "upd-pclose", "סגירה"); x.type = "button"; x.onclick = () => close(); sh.append(x);
      ov.append(sh); document.body.append(ov);
      const close = () => { ov.remove(); document.removeEventListener("keydown", esc); };
      const esc = e => { if (e.key === "Escape") close(); };
      ov.addEventListener("click", e => { if (e.target === ov) close(); });
      document.addEventListener("keydown", esc);
    },
    async react(id, emoji) {
      const mineAll = loadObj("myReacts"), prev = mineAll[id] || "", c = load(KEY, null);
      const bump = (u, e, d) => { if (!e) return; u.reacts = u.reacts || {}; u.reacts[e] = Math.max(0, (u.reacts[e] || 0) + d); if (!u.reacts[e]) delete u.reacts[e]; };
      const apply = (from, to) => { if (c && Array.isArray(c.list)) { const u = c.list.find(x => x && x.id === id); if (u) { bump(u, from, -1); bump(u, to, 1); save(KEY, c); } } };
      const setMine = v => { const m = loadObj("myReacts"); if (v) m[id] = v; else delete m[id]; save("myReacts", m); };
      apply(prev, emoji); setMine(emoji); this.redraw && this.redraw(); // מיד, בלי לחכות לשרת
      let j = null;
      try { const who = this.who(); const r = await fetch(this.feedUrl(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "react", id, emoji, ...who }) }); j = await r.json(); } catch (e) {}
      if (j && j.ok) { const c2 = load(KEY, null); if (c2 && Array.isArray(c2.list)) { const u = c2.list.find(x => x && x.id === id); if (u) { u.reacts = j.counts && typeof j.counts === "object" ? j.counts : {}; save(KEY, c2); } } }
      else { apply(emoji, prev); setMine(prev); if (window.toast) window.toast("התגובה לא נשלחה", "בדקו חיבור ונסו שוב."); }
      this.redraw && this.redraw();
    },

    // ---- חלון קופץ לעדכונים שעוד לא נראו ----
    // מספר על אייקון האפליקציה (כמו בוואטסאפ) = כמה עדכונים חדשים. עובד בטלפונים ומחשבים שתומכים
    badge(cls) { try { const n = this.unseen(cls).length; if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (e) {} },
    unseen(cls) { const seen = loadArr(SEEN); return this.forClass(cls).filter(u => !seen.includes(u.id)); },
    markSeen(ids) {
      const seen = loadArr(SEEN);
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
      try { const ua = navigator.userActivation; if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(queue.some(u => u.urgent) ? [60, 40, 60] : 40); } catch (e) {}
      // גם אם משהו נכשל באמצע – המסך לא נשאר נעול (בלי גלילה) והעדכונים לא נשארים מוסתרים
      try {
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
        this.markSeen([u.id]); this.badge(cls);
      }
      } finally {
        ov.remove();
        document.documentElement.classList.remove("upd-lock");
        this._popping = false;
        if (this._flying.length) { this._flying = []; this.render(box, cls); }
      }
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
      this.redraw = draw;
      const tryPop = () => { if (ok() && !document.hidden) this.popup(box, getCls()); };
      draw();
      const tick = async () => { await this.refresh(); draw(); tryPop(); this.badge(getCls()); }; // מציירים גם אם הרענון נכשל, כדי להעלים עדכונים שפג תוקפם
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
  .upd-react{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .upd-rc,.upd-radd{border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:3px 10px;font:inherit;font-size:14px;cursor:pointer;line-height:1.4}
  .upd-rc.mine{border-color:var(--accent);background:rgba(124,140,255,.18);font-weight:700}
  .upd-radd{color:var(--muted);font-size:13px}
  .upd-pick{position:fixed;inset:0;z-index:10040;background:rgba(8,10,30,.55);display:flex;align-items:flex-end;justify-content:center;animation:updfade .2s both}
  .upd-sheet{background:var(--card);color:var(--ink);width:100%;max-width:460px;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));max-height:80vh;overflow:auto}
  .upd-ptitle{font-weight:900;font-size:16px;text-align:center;margin-bottom:10px}
  .upd-pgrid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}
  .upd-pgrid button{border:none;background:none;font-size:26px;padding:6px 0;border-radius:10px;cursor:pointer}
  .upd-pgrid button.on,.upd-pgrid button:hover{background:var(--break)}
  .upd-prow{display:flex;gap:6px;margin-top:12px}
  .upd-prow input{flex:1;min-width:0;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:18px;background:var(--bg);color:var(--ink);text-align:center}
  .upd-pgo{border:none;border-radius:12px;padding:0 16px;font:inherit;font-weight:800;background:var(--accent);color:#fff;cursor:pointer}
  .upd-pmsg{color:#ff5d6c;font-size:13px;min-height:16px;margin-top:4px;text-align:center}
  .upd-prm,.upd-pclose{display:block;width:100%;border:none;background:var(--break);color:var(--ink);border-radius:12px;padding:10px;font:inherit;font-weight:700;margin-top:8px;cursor:pointer}
  @media (max-width:360px){.upd-pgrid{grid-template-columns:repeat(6,1fr)}}
  .upd-more{display:block;width:100%;border:1.5px dashed var(--line);background:none;color:var(--accent);border-radius:12px;padding:8px;font:inherit;font-weight:700;cursor:pointer;margin-bottom:8px}
  html.upd-lock,html.upd-lock body{overflow:hidden}
  .upd-pop{position:fixed;inset:0;z-index:9999;display:flex;padding:20px;overflow-y:auto;overscroll-behavior:contain}
  .upd-bk{position:absolute;inset:0;background:rgba(8,10,30,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:updfade .3s both}
  .upd-stage{position:relative;width:100%;max-width:420px;margin:auto;display:flex;flex-direction:column;align-items:stretch;gap:14px}
  .upd-pop-title{color:#fff;text-align:center;font-size:22px;font-weight:900;text-shadow:0 2px 12px rgba(0,0,0,.4);animation:updpop .5s cubic-bezier(.2,1.4,.4,1) both}
  .upd.big{margin:0;padding:18px;border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.45);animation:updpop .55s cubic-bezier(.2,1.3,.4,1) .05s both;transform-origin:center}
  .upd.big .upd-text{font-size:19px;font-weight:500}
  .upd.big .upd-top{font-size:15px}
  .upd-ok{align-self:center;border:none;border-radius:999px;padding:13px 34px;font:inherit;font-size:17px;font-weight:900;background:#fff;color:#1b1f45;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:updpop .5s cubic-bezier(.2,1.4,.4,1) .2s both}
  .upd-link{color:var(--accent);font-weight:700;text-decoration:none;background:var(--break);border-radius:8px;padding:1px 7px;margin:0 2px;white-space:nowrap;display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom;direction:ltr}
  .upd-video{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:64px;margin-top:10px;border:none;border-radius:14px;overflow:hidden;cursor:pointer;background:linear-gradient(135deg,#1b1f45,#3a2f7a);color:#fff;font:inherit;font-weight:900;font-size:16px;padding:0}
  .upd-video.thumb{aspect-ratio:16/9;min-height:0;max-height:220px}
  .upd-video img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6}
  .upd-play{position:relative;width:46px;height:46px;border-radius:50%;background:#ff3b5c;display:flex;align-items:center;justify-content:center;font-size:20px;padding-inline-start:3px;box-shadow:0 6px 20px rgba(0,0,0,.4)}
  .upd-vlabel{position:relative;text-shadow:0 2px 8px rgba(0,0,0,.6)}
  .upd-vid{position:fixed;inset:0;z-index:10050;background:rgba(5,6,20,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;animation:updfade .25s both}
  .upd-vframe{width:100%;max-width:900px;aspect-ratio:16/9;max-height:78vh;background:#000;border-radius:14px;overflow:hidden}
  .upd-vframe.vert{aspect-ratio:9/16;width:auto;height:78vh;max-width:100%}
  .upd-vframe iframe,.upd-vframe video{width:100%;height:100%;border:0;display:block}
  .upd-vclose{align-self:center;border:none;border-radius:999px;padding:10px 22px;font:inherit;font-weight:900;font-size:15px;background:#fff;color:#1b1f45;cursor:pointer}
  .upd-vopen{color:#cfd4ff;font-size:13px;text-decoration:underline}
  @keyframes updfade{from{opacity:0}}
  @keyframes updpop{from{opacity:0;transform:scale(.7) translateY(30px)}}`;
  document.head.appendChild(css);
  window.Updates = Updates;
})();
