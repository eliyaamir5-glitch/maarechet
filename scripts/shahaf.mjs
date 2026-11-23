// 🏫 קורא את מערכת השעות של בית הספר מאתר שחף (b-yeuda.shahaf.site) – מערכת קבועה, בלי שינויים יומיים.
//   import { fetchShahaf } from "./shahaf.mjs"  →  { y1:[day0..day5], ... }  כל יום = [{s,e,n,w:[מורים]}]
//   node scripts/shahaf.mjs [cls]   → מדפיס את המערכת (לבדיקה)
export const SHAHAF = "https://b-yeuda.shahaf.site";
export const SHAHAF_CLS = { y1: 7, y2: 8, ya1: 10, ya2: 9 }; // המספרים של הכיתות באתר
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const txt = s => ent(String(s).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();
export function parseTimetable(html) {
  const tb = html.slice(html.indexOf('class="TTTable"')); if (tb.length === html.length + 1) throw new Error("no TTTable");
  const days = [[], [], [], [], [], []];
  for (const row of tb.split(/<tr>/).slice(2)) {
    const hm = row.match(/hour-time">(\d\d:\d\d)<\/span>[\s\S]*?hour-time">(\d\d:\d\d)</); if (!hm) continue;
    const [, s, e] = hm;
    for (const cell of row.split(/<td class="TTCell"/).slice(1)) {
      const d = +((cell.match(/data-day="(\d)"/) || [])[1]); if (!(d >= 0 && d <= 5)) continue;
      const ls = [...cell.matchAll(/<div class="TTLesson[^"]*">([\s\S]*?)<\/div>/g)].map(m => { const [n, ...w] = txt(m[1]).split("\n").map(x => x.trim()).filter(Boolean); return { n: n || "", w: w.join(" ") }; }).filter(x => x.n);
      if (!ls.length) continue;
      const byN = {}; for (const l of ls) (byN[l.n] = byN[l.n] || []).push(l.w);
      for (const [n, w] of Object.entries(byN)) days[d].push({ s, e, n, w: [...new Set(w.filter(Boolean))].sort() });
    }
  }
  // שעות רצופות של אותו שיעור עם אותם מורים → שיעור אחד
  for (const D of days) { D.sort((a, b) => a.s.localeCompare(b.s) || a.n.localeCompare(b.n)); for (let i = D.length - 1; i > 0; i--) { const p = D.findIndex((x, j) => j < i && x.e === D[i].s && x.n === D[i].n && x.w.join() === D[i].w.join()); if (p >= 0) { D[p].e = D[i].e; D.splice(i, 1); } } D.sort((a, b) => a.s.localeCompare(b.s) || a.n.localeCompare(b.n)); }
  return days;
}
export async function fetchShahaf(only) {
  const out = {};
  for (const [k, id] of Object.entries(SHAHAF_CLS)) { if (only && k !== only) continue;
    const r = await fetch(`${SHAHAF}/?cls=${id}&tab=timetable`, { headers: { "User-Agent": "maarechet-timetable-check" } }); if (!r.ok) throw new Error(`shahaf ${k} HTTP ${r.status}`);
    out[k] = parseTimetable(await r.text()); }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const T = await fetchShahaf(process.argv[2]); const DN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
  for (const [k, days] of Object.entries(T)) { console.log(`===== ${k}`); days.forEach((D, i) => { if (!D.length) return; console.log(`-- ${DN[i]}`); for (const l of D) console.log(`  ${l.s}-${l.e} ${l.n} | ${l.w.join(", ")}`); }); }
}
