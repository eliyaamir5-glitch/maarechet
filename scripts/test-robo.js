// בדיקות ל"הרובוט שלי": אביזרים, תיבות, סיכויים, רצף כניסות (שבת/חג לא שוברים), שמירת רצף, חנות.
//   node scripts/test-robo.js
global.HolidaysCore = require("../holidays-core.js");
const R = require("../robo-core.js");
let bad = 0; const ok = (name, c, x = "") => { console.log(c ? "✅" : "❌", name, x); if (!c) { bad++; process.exitCode = 1; } };
const at = s => Date.parse(s);
// אקראי קבוע (כדי שהבדיקה תמיד תיתן אותו דבר)
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---- קטלוג ----
const ids = R.LIST.map(x => x.id);
ok("catalog: 150+ items, unique ids", ids.length >= 150 && new Set(ids).size === ids.length, ids.length);
ok("every item has a known category and rarity", R.LIST.every(x => R.CATS[x.cat] && R.RAR[x.r]));
ok("ultra legendary: 6 suits, each with a cap (♾️ infinity = only 1)", R.LIST.filter(x => x.r === "u").length === 6 && R.ITEMS["skin:infinity"].cap === 1 && R.LIST.filter(x => x.r === "u").every(x => x.cap > 0));
ok("heroes: never in normal boxes, only giant (and 2% mega)", R.LIST.filter(x => x.hero).length >= 10 && R.BOX.giant.hero > 0 && R.BOX.box.hero === undefined);
{ const S = R.fresh(); let h = 0, n = 0; for (let i = 0; i < 3000; i++) for (const p of R.roll(S, "box")) { if (p.t === "item") { n++; if (R.ITEMS[p.id] && R.ITEMS[p.id].hero) h++; } } ok("no heroes from small boxes", h === 0, h + "/" + n); }
{ const S = R.fresh(); let h = 0; for (let i = 0; i < 2000; i++) for (const p of R.roll(S, "giant")) if (p.t === "item" && R.ITEMS[p.id] && R.ITEMS[p.id].hero) h++; ok("heroes do come from giant boxes", h > 100, h); }
ok("robot name filter", R.cleanName("רעם ⚡") === "רעם ⚡" && R.cleanName("בן זונה") === "" && R.cleanName("x".repeat(30)).length === 14);
{ const S = R.fresh(); R.grant(S, { t: "item", id: "hat:crown" }); S.boxes.push("mega"); S.bolts = 50; ok("trade: can give only what you have", R.canGive(S, { items: ["hat:crown"], boxes: ["mega"], bolts: 50 }) && !R.canGive(S, { items: ["skin:gold"] }) && !R.canGive(S, { boxes: ["mega", "mega"] }) && !R.canGive(S, { items: ["skin:classic"] }));
  R.applyTrade(S, { items: ["hat:crown"], boxes: ["mega"], bolts: 20 }, { items: ["skin:dragon"], boxes: ["big"], bolts: 5 }); ok("trade applied both ways", !S.own["hat:crown"] && S.own["skin:dragon"] && S.boxes.join() === "big" && S.bolts === 35 && S.trades === 1);
  ok("trade value scale", R.offerValue({ items: ["skin:dragon"], boxes: ["mega"], bolts: 20 }) === 400 + 380 + 20); }
{ const S = R.fresh(); S.st.best = 31; S.opened = 12; const a = R.achievements(S, 30); ok("achievements", a.some(x => x.n === "רצף 30") && a.some(x => x.n === "10 תיבות") && a.some(x => x.n === "25 לייקים")); }
ok("every rarity c..u has droppable items", R.RK.every(r => R.LIST.some(x => x.r === r && !x.x && !x.free)));
for (const b of Object.keys(R.BOX)) { const s = Object.values(R.BOX[b].odds).reduce((a, c) => a + c, 0); ok(`${b}: odds add up to 100%`, Math.abs(s - 100) < 1e-9, s); }
ok("streak/subject rewards point to real items", Object.values(R.LADDER).flat().every(p => p.t !== "item" || R.ITEMS[p.id]) && R.ITEMS["held:medal"]);

// ---- סיכויים בפועל (200,000 פרסים מכל סוג תיבה) ----
for (const b of ["box", "big", "mega"]) {
  const S = R.fresh(), rnd = seeded(7), cnt = {}; let items = 0, bolts = 0, boxes = 0;
  const N = Math.round(200000 / R.EXTRA_N[b]);
  const fin = {}; let nb = 0;
  for (let i = 0; i < N; i++) { const pz = R.roll(S, b, rnd); nb++; fin[pz.taps[pz.taps.length - 1]] = (fin[pz.taps[pz.taps.length - 1]] || 0) + 1; for (const p of pz) { if (p.main) continue; if (p.t === "item") { items++; cnt[p.r] = (cnt[p.r] || 0) + 1; } else if (p.t === "bolts") bolts++; else boxes++; } }
  const fo = R.finalOdds(b); ok(`${b}: tap-upgrade results match the published chances`, R.TIERS.every(t => Math.abs(100 * (fin[t] || 0) / nb - fo[t]) < Math.max(0.5, fo[t] * 0.1)), R.TIERS.map(t => t + ":" + (100 * (fin[t] || 0) / nb).toFixed(2) + "/" + fo[t].toFixed(2)).join(" "));
  const pct = r => 100 * (cnt[r] || 0) / items, odds = R.BOX[b].odds;
  ok(`${b}: real chances match the published ones`, ["c", "r", "s", "e", "m", "l"].every(r => Math.abs(pct(r) - odds[r]) < Math.max(0.6, odds[r] * 0.12)), ["c", "r", "s", "e", "m", "l", "u"].map(r => r + ":" + pct(r).toFixed(2)).join(" "));
}
{ const S = R.fresh(), rnd = seeded(3); let got = 0; for (let i = 0; i < 100000; i++) for (const p of R.roll(S, "box", rnd)) if (p.r === "u") got++; ok("ultra legendary from a small box is really rare", got < 10, got + " in 100,000 boxes"); }
{ const S = R.fresh(), rnd = seeded(5); let got = 0; for (let i = 0; i < 20000; i++) for (const p of R.roll(S, "mega", rnd)) if (p.r === "u") got++; ok("ultra legendary from mega boxes: rare (< 0.5%)", got < 100, got + " in 20,000 mega boxes"); }
{ const p = R.roll(R.fresh(), "mega", seeded(11)); ok("mega box: 6 prizes, main prize (tier reached) last", p.length === 6 && p[5].main && p[5].r === p.taps[4] && p.taps.length === 5); }
{ const t = R.upgrades("box", () => 0); ok("lucky taps upgrade every time: r→s→e→m→l", t.join() === "r,s,e,m,l"); ok("unlucky taps: stays", R.upgrades("big", () => 0.99).join() === "s,s,s,s,s"); }
{ const S = R.fresh(); const u = R.roll(S, "mega", () => 0); ok("ultra prize needs the server (claim)", u.some(x => x.need === "claim") || R.roll(S, "box", (() => { const q = [0.5, 0, 0.99999, 0.1, 0, 0, 0, 0]; let i = 0; return () => q[i++ % q.length]; })()).some(x => x.need === "claim")); }

// ---- קבלת פרסים ----
{ const S = R.fresh(); R.grant(S, { t: "item", id: "hat:crown" }); const d = R.grant(S, { t: "item", id: "hat:crown" });
  ok("new item → owned + marked new", S.own["hat:crown"] && S.news.includes("hat:crown"));
  ok("duplicate → bolts (epic = 200)", d.dup === 200 && S.bolts === 200);
  R.grant(S, { t: "box", box: "big" }); ok("box prize goes to my boxes", S.boxes.join() === "big");
  ok("equip owned item", R.equip(S, "hat:crown") && S.eq.hat === "hat:crown"); ok("can't equip what you don't own", !R.equip(S, "skin:gold"));
  R.equip(S, "hat:crown"); ok("tap again = take it off", !S.eq.hat); }

// ---- רצף כניסות ----
{ const S = R.fresh();
  let c = R.checkIn(S, at("2026-11-01T08:00:00+02:00")); ok("first day: streak 1 + a big box", c.n === 1 && c.gift[0].box === "big");
  ok("second open the same day: not counted again", R.checkIn(S, at("2026-11-01T21:00:00+02:00")) === null);
  c = R.checkIn(S, at("2026-11-02T07:30:00+02:00")); ok("next day: 2", c.n === 2);
  R.checkIn(S, at("2026-11-03T10:00:00+02:00")); R.checkIn(S, at("2026-11-04T10:00:00+02:00")); R.checkIn(S, at("2026-11-05T10:00:00+02:00"));
  c = R.checkIn(S, at("2026-11-06T10:00:00+02:00")); ok("Friday: 6", c.n === 6);
  c = R.checkIn(S, at("2026-11-08T10:00:00+02:00")); ok("Shabbat without the app does NOT break the streak (Sunday = 7, + theme)", c.n === 7 && !c.broken && c.gift.some(g => g.id === "theme:neon"));
  c = R.checkIn(S, at("2026-11-10T10:00:00+02:00")); ok("missed a weekday (Monday) → broken, back to 1", c.n === 1 && c.broken && c.broken.n === 7);
  S.bolts = 10; ok("save streak: not enough bolts", R.saveStreak(S, at("2026-11-10T11:00:00+02:00")).error === "bolts");
  S.bolts = 500; const sv = R.saveStreak(S, at("2026-11-10T11:00:00+02:00")); ok("save streak with bolts: back to 8 (cost 58)", sv.ok && S.st.n === 8 && sv.cost === 58 && S.bolts === 442);
  ok("save only once", !R.saveStreak(S, at("2026-11-10T12:00:00+02:00")).ok);
  ok("best streak remembered", S.st.best === 8); }
{ const S = R.fresh(); R.checkIn(S, at("2027-04-20T10:00:00+03:00")); R.checkIn(S, at("2027-04-21T10:00:00+03:00"));
  const c = R.checkIn(S, at("2027-04-23T10:00:00+03:00")); ok("Pesach (Yom Tov) without the app does not break", c.n === 3 && !c.broken);
  const S2 = R.fresh(); R.checkIn(S2, at("2027-10-01T10:00:00+03:00")); const c2 = R.checkIn(S2, at("2027-10-04T10:00:00+03:00")); ok("Rosh Hashana (2 days) + Shabbat: not broken", c2.n === 2 && !c2.broken); }
ok("bigger streak = better gifts", R.dayGift(31)[0].box === "mega" && R.dayGift(9)[0].box === "big" && R.dayGift(63)[0].box === "giant" && R.dayGift(28)[0].box === "mega" && R.dayGift(100).some(g => g.id === "aura:streak") && R.dayGift(12)[0].n === 330);
ok("every day has a gift (1..400)", Array.from({ length: 400 }, (_, i) => R.dayGift(i + 1)).every(g => g.length > 0));
ok("saving costs more for a longer streak, max 400", R.saveCost(5) < R.saveCost(50) && R.saveCost(1000) === 400);

// ---- רצף במקצוע ----
{ const S = R.fresh(); ok("subject 10 → box", R.subjectMile(S, "גמרא", 10)[0].box === "box"); ok("same milestone twice → nothing", R.subjectMile(S, "גמרא", 10) === null);
  ok("30 → big, 50 → mega, 100 → mega + medal", R.subjectGift(30)[0].box === "big" && R.subjectGift(50)[0].box === "mega" && R.subjectGift(100).some(g => g.id === "held:medal")); }

// ---- חנות ----
{ const S = R.fresh(); S.bolts = 1000;
  ok("buy a big box (130)", R.buy(S, "big", "dev1").ok && S.boxes.includes("big") && S.bolts === 870);
  const d = R.deals(S, "dev1", at("2026-11-03T10:00:00+02:00")); ok("2 daily deals, never mythic+", d.length === 2 && d.every(x => R.RAR[R.ITEMS[x.id].r].o <= 3));
  ok("same deals all day, different tomorrow", JSON.stringify(R.deals(S, "dev1", at("2026-11-03T22:00:00+02:00"))) === JSON.stringify(d) && JSON.stringify(R.deals(S, "dev1", at("2026-11-04T10:00:00+02:00"))) !== JSON.stringify(d));
  const b = R.buy(S, d[0].id, "dev1", at("2026-11-03T10:00:00+02:00")); ok("buy the deal", b.ok && S.own[d[0].id]);
  ok("can't buy gold in the shop", !R.buy(S, "skin:gold", "dev1").ok); }
// ---- מצב שבור/ישן נטען בבטחה ----
{ const S = R.norm({ bolts: "abc", own: { "hat:fake": 1 }, eq: { hat: "skin:gold" }, boxes: ["box", "nope"] }); ok("bad saved state is cleaned", S.bolts === 0 && !S.eq.hat && S.boxes.join() === "box" && S.eq.skin === "skin:classic"); }
{ const S = R.fresh(); const t = at("2026-11-03T10:00:00+02:00"); let g = 0; for (let i = 0; i < 40; i++) g += R.earn(S, 6, t); ok("practice bonus: capped at 150 bolts a day", g === 150 && S.bolts === 150); ok("new day → bonus again", R.earn(S, 6, at("2026-11-04T10:00:00+02:00")) === 6); }
console.log(bad ? `❌ ${bad} problems` : "all robo tests passed");
