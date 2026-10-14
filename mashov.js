// חיבור למשוב מצד האפליקציה.
// הנתונים והחיבור נשמרים רק בטלפון של התלמיד (localStorage). הסיסמה נשמרת רק אם התלמיד בחר "לזכור בטלפון הזה",
// ותמיד רק במכשיר שלו. לשרת היא נשלחת רק בזמן חיבור/רענון, והוא לא שומר אותה.
(function () {
  const K = { conn: "mashovConn", pw: "mashovPw", data: "mashovData" };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const ERR = {
    bad_login: "שם המשתמש או הסיסמה לא נכונים. אלה אותם פרטים של אתר משוב.",
    bad_request: "חסרים פרטים. צריך לבחור בית ספר ולמלא שם משתמש וסיסמה.",
    mashov_down: "משוב לא עונה כרגע. נסה שוב בעוד כמה דקות.",
    no_student: "התחברנו, אבל לא מצאנו חשבון תלמיד. חשבון הורה או מורה לא נתמך כרגע.",
    offline: "אין חיבור לאינטרנט.",
    no_server: "החיבור למשוב עוד לא פעיל באתר הזה. הוא יופעל בקרוב.",
    need_password: "צריך להקליד את הסיסמה של משוב שוב כדי לרענן.",
  };

  const Mashov = {
    endpoint() { return (typeof MASHOV_API !== "undefined" && MASHOV_API) || "/api/mashov"; },
    // שנת הלימודים במשוב = השנה שבה היא מסתיימת (ספטמבר 2026 → 2027)
    schoolYear(d = new Date()) { return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear(); },
    conn() { return load(K.conn, null); },
    data() { return load(K.data, null); },
    connected() { return !!this.conn(); },
    remembers() { return !!load(K.pw, null); },
    message(code) { return ERR[code] || "משהו השתבש. נסה שוב."; },

    async _call(body) {
      if (!navigator.onLine) return { ok: false, error: "offline" };
      let res;
      try {
        res = await fetch(this.endpoint(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      } catch (e) { return { ok: false, error: "mashov_down" }; }
      if (res.status === 404 || res.status === 405 && !res.headers.get("content-type")?.includes("json")) return { ok: false, error: "no_server" };
      const j = await res.json().catch(() => null);
      if (!j) return { ok: false, error: res.status === 404 ? "no_server" : "mashov_down" };
      return j;
    },

    async connect({ semel, schoolName, username, password, remember }) {
      const year = this.schoolYear();
      const r = await this._call({ semel, year, username, password });
      if (!r.ok) return r;
      save(K.conn, { semel, schoolName, username, year, name: r.student?.name || "", connectedAt: new Date().toISOString() });
      save(K.pw, remember ? { p: password } : null);
      save(K.data, { at: r.fetchedAt, behave: r.behave, grades: r.grades, groups: r.groups, lessonsCount: r.lessonsCount, partial: !!r.partial });
      document.dispatchEvent(new CustomEvent("mashov-updated"));
      return { ok: true };
    },

    async refresh(password) {
      const c = this.conn(); if (!c) return { ok: false, error: "bad_request" };
      const pw = password || load(K.pw, null)?.p;
      if (!pw) return { ok: false, error: "need_password" };
      const r = await this._call({ semel: c.semel, year: this.schoolYear(), username: c.username, password: pw });
      if (!r.ok) return r;
      save(K.data, { at: r.fetchedAt, behave: r.behave, grades: r.grades, groups: r.groups, lessonsCount: r.lessonsCount, partial: !!r.partial });
      document.dispatchEvent(new CustomEvent("mashov-updated"));
      return { ok: true };
    },

    // רענון שקט ברקע אם הנתונים ישנים מ-maxHours ויש סיסמה שמורה
    async autoRefresh(maxHours = 6) {
      if (!this.connected() || !this.remembers()) return;
      const d = this.data();
      if (d && Date.now() - new Date(d.at).getTime() < maxHours * 3600e3) return;
      await this.refresh();
    },

    disconnect() { save(K.conn, null); save(K.pw, null); save(K.data, null); document.dispatchEvent(new CustomEvent("mashov-updated")); },

    agoText() {
      const d = this.data(); if (!d) return "עוד לא עודכן";
      const m = Math.round((Date.now() - new Date(d.at).getTime()) / 60000);
      return m < 2 ? "עודכן עכשיו" : m < 60 ? `עודכן לפני ${m} דק'` : m < 1440 ? `עודכן לפני ${Math.round(m / 60)} שע'` : `עודכן לפני ${Math.round(m / 1440)} ימים`;
    },

    // ---- רשימת בתי הספר של משוב ----
    _schools: null,
    async schools() {
      if (this._schools) return this._schools;
      try { this._schools = await (await fetch("mashov-schools.json")).json(); } catch (e) { this._schools = []; }
      return this._schools;
    },
    norm(s) { return String(s || "").replace(/["'״׳`.,()\-–]/g, " ").replace(/[ךםןףץ]/g, c => ({ "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" })[c]).replace(/\s+/g, " ").trim(); },
    async search(q) {
      const list = await this.schools(); const t = this.norm(q).split(" ").filter(w => w.length > 1);
      if (!t.length) return [];
      if (/^\d{3,}$/.test(q.trim())) return list.filter(s => String(s[0]).startsWith(q.trim())).slice(0, 6);
      const scored = [];
      for (const s of list) {
        const n = this.norm(s[1]); let sc = 0;
        for (const w of t) { if (n.split(" ").includes(w)) sc += 3; else if (n.includes(w)) sc += 2; else { sc = -1; break; } }
        if (sc > 0) scored.push([sc - n.length / 200, s]);
      }
      return scored.sort((a, b) => b[0] - a[0]).slice(0, 6).map(x => x[1]);
    },

    // ---- טופס חיבור (משמש גם באשף וגם בפרופיל) ----
    formHTML() {
      const def = (typeof MASHOV_SCHOOL !== "undefined" && MASHOV_SCHOOL && MASHOV_SCHOOL.semel) ? MASHOV_SCHOOL : null;
      return `<div class="ms-form">
        <div class="ms-school">
          <input class="ms-in" id="msSchool" placeholder="בית הספר (שם או סמל)" autocomplete="off" value="${def ? esc(def.name) : ""}" data-semel="${def ? def.semel : ""}">
          <div class="ms-res" id="msRes" hidden></div>
        </div>
        <input class="ms-in" id="msUser" placeholder="שם משתמש במשוב (בדרך כלל ת״ז)" dir="ltr" autocomplete="username" inputmode="numeric">
        <input class="ms-in" id="msPass" type="password" placeholder="סיסמה של משוב" dir="ltr" autocomplete="current-password">
        <label class="ms-rem"><input type="checkbox" id="msRem" checked> לזכור בטלפון הזה, כדי שהנתונים יתעדכנו לבד</label>
        <div class="ms-note">🔒 הפרטים נשלחים ישירות למשוב רק כדי למשוך את הנוכחות והציונים שלך. השרת שלנו לא שומר את הסיסמה. אם בחרת "לזכור", היא נשמרת רק בטלפון הזה.</div>
        <div class="ms-msg" id="msMsg"></div>
      </div>`;
    },
    wireForm(root) {
      const school = root.querySelector("#msSchool"), res = root.querySelector("#msRes");
      let timer = null;
      school.addEventListener("input", () => {
        school.dataset.semel = ""; clearTimeout(timer);
        timer = setTimeout(async () => {
          const r = await this.search(school.value);
          res.hidden = !r.length;
          res.innerHTML = r.map(s => `<button type="button" data-s="${s[0]}" data-n="${esc(s[1])}">${esc(s[1])} <small>${s[0]}</small></button>`).join("");
          res.querySelectorAll("button").forEach(b => b.onclick = () => { school.value = b.dataset.n; school.dataset.semel = b.dataset.s; res.hidden = true; });
        }, 150);
      });
      // הפונקציה שמבצעת את החיבור בפועל. מחזירה true בהצלחה
      return async () => {
        const msg = root.querySelector("#msMsg");
        const semel = Number(school.dataset.semel || (/^\d{3,}$/.test(school.value.trim()) ? school.value.trim() : 0));
        const username = root.querySelector("#msUser").value.trim(), password = root.querySelector("#msPass").value;
        if (!semel) { msg.textContent = "בחר את בית הספר מהרשימה שנפתחת כשמקלידים."; school.focus(); return false; }
        if (!username || !password) { msg.textContent = "חסרים שם משתמש או סיסמה."; return false; }
        msg.textContent = "מתחבר למשוב…";
        let schoolName = school.value.trim();
        if (!school.dataset.semel) { const hit = (await this.schools()).find(s => s[0] === semel); schoolName = hit ? hit[1] : `סמל מוסד ${semel}`; }
        const r = await this.connect({ semel, schoolName, username, password, remember: root.querySelector("#msRem").checked });
        msg.textContent = r.ok ? "✅ מחובר!" : this.message(r.error);
        return r.ok;
      };
    },
  };

  // עיצוב הטופס
  const css = document.createElement("style");
  css.textContent = `.ms-form{display:flex;flex-direction:column;gap:10px;text-align:start}
  .ms-in{width:100%;border:2px solid var(--line);border-radius:14px;padding:12px;font:inherit;font-size:16px;background:var(--bg);color:var(--ink)}
  .ms-school{position:relative}.ms-res{position:absolute;inset-inline:0;top:100%;z-index:5;background:var(--card);border:1.5px solid var(--line);border-radius:12px;margin-top:4px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.25)}
  .ms-res button{display:block;width:100%;text-align:start;background:none;border:none;border-bottom:1px solid var(--line);padding:10px 12px;font:inherit;font-size:14px;color:var(--ink);cursor:pointer}
  .ms-res button small{color:var(--muted)}.ms-rem{display:flex;gap:8px;align-items:center;font-size:14px}
  .ms-note{font-size:12px;color:var(--muted);line-height:1.5}.ms-msg{font-size:14px;font-weight:700;min-height:18px}`;
  document.head.appendChild(css);

  window.Mashov = Mashov;
})();
