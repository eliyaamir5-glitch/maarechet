// "המערכת שלי כתמונה": מצייר טבלה שבועית (ראשון–חמישי × שעות) על canvas, ומייצא לתמונה או ל-PDF.
// מציירים ישירות (ולא צילום מסך) כדי שהעברית תצא נקייה מימין לשמאל ובחדות גבוהה.
(function () {
  const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
  const toMin = t => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const hueOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

  function wrap(ctx, text, max) {
    const out = []; let line = "";
    for (const w of String(text).split(" ")) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // opts: { weekLessons: [[{s,e,n,w}...] × 5], gearOf(name)->[...], title, subtitle }
  async function draw(canvas, opts) {
    try { await Promise.all([document.fonts.load("900 40px Rubik"), document.fonts.load("700 20px Rubik"), document.fonts.load("400 16px Rubik")]); } catch (e) {}
    const all = opts.weekLessons.flat();
    const first = Math.floor(Math.min(...all.map(l => toMin(l.s))) / 30) * 30;
    const last = Math.ceil(Math.max(...all.map(l => toMin(l.e))) / 30) * 30;
    const S = 1.55;                  // פיקסלים לדקה
    const W = 2000, AX = 110, PAD = 40, HEAD = 190, COLH = 60, FOOT = 70;
    const colW = (W - PAD * 2 - AX) / 5;
    const H = HEAD + COLH + (last - first) * S + FOOT;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.direction = "rtl";

    // רקע וכותרת
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#5b6cff"); g.addColorStop(.6, "#a259ff"); g.addColorStop(1, "#ff6bd6");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HEAD - 30);
    ctx.fillStyle = "#fff"; ctx.textAlign = "right";
    ctx.font = "900 64px Rubik, Arial"; ctx.fillText(opts.title, W - PAD, 90);
    ctx.font = "500 28px Rubik, Arial"; ctx.fillText(opts.subtitle, W - PAD, 135);

    // כותרות הימים (ראשון מימין)
    const colX = i => W - PAD - AX - (i + 1) * colW; // שמאל העמודה
    const y0 = HEAD + COLH, yOf = m => y0 + (m - first) * S;
    ctx.font = "700 30px Rubik, Arial"; ctx.textAlign = "center";
    for (let i = 0; i < 5; i++) { ctx.fillStyle = "#191b33"; ctx.fillText(DAYS[i], colX(i) + colW / 2, HEAD + 38); }

    // קווי שעות וציר
    ctx.textAlign = "right"; ctx.font = "500 20px Rubik, Arial";
    for (let m = first; m <= last; m += 30) {
      const y = yOf(m);
      ctx.strokeStyle = m % 60 ? "#f1f0f8" : "#e3e2f2"; ctx.lineWidth = m % 60 ? 1 : 2;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD - AX + 6, y); ctx.stroke();
      if (!(m % 60)) { ctx.fillStyle = "#6c7093"; ctx.fillText(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`, W - PAD, y + 7); }
    }
    for (let i = 0; i <= 5; i++) { ctx.strokeStyle = "#e3e2f2"; ctx.lineWidth = 2; const x = W - PAD - AX - i * colW; ctx.beginPath(); ctx.moveTo(x, y0 - 10); ctx.lineTo(x, yOf(last)); ctx.stroke(); }

    // בלוקים של שיעורים
    for (let i = 0; i < 5; i++) for (const l of opts.weekLessons[i]) {
      const x = colX(i) + 6, w = colW - 12, y = yOf(toMin(l.s)) + 2, h = Math.max(18, (toMin(l.e) - toMin(l.s)) * S - 4);
      const hue = hueOf(l.n);
      ctx.fillStyle = `hsl(${hue} 85% 94%)`; roundRect(ctx, x, y, w, h, 14); ctx.fill();
      ctx.fillStyle = `hsl(${hue} 65% 55%)`; roundRect(ctx, x + w - 8, y, 8, h, 4); ctx.fill();
      ctx.save(); roundRect(ctx, x, y, w, h, 14); ctx.clip();
      const tx = x + w - 20, maxW = w - 36;
      ctx.textAlign = "right"; ctx.fillStyle = "#191b33";
      if (h < 44) { // שיעור קצר: שורה אחת
        ctx.font = "700 19px Rubik, Arial"; ctx.fillText(`${l.n} · ${l.s}`, tx, y + h / 2 + 7);
      } else {
        let ty = y + 32;
        ctx.font = "700 24px Rubik, Arial";
        for (const ln of wrap(ctx, l.n, maxW).slice(0, 2)) { ctx.fillText(ln, tx, ty); ty += 28; }
        ctx.font = "400 18px Rubik, Arial"; ctx.fillStyle = "#6c7093";
        if (ty + 4 < y + h) { ctx.fillText(`${l.s}–${l.e}`, tx, ty); ty += 24; }
        if (l.w && ty + 4 < y + h) { ctx.fillText(wrap(ctx, l.w, maxW)[0], tx, ty); ty += 24; }
        const gear = opts.gearOf(l.n);
        if (gear.length && ty + 8 < y + h) { ctx.fillStyle = `hsl(${hue} 50% 35%)`; ctx.fillText("🎒 " + wrap(ctx, gear.join(", "), maxW - 30)[0], tx, ty); }
      }
      ctx.restore();
    }
    ctx.textAlign = "right"; ctx.font = "400 20px Rubik, Arial"; ctx.fillStyle = "#9aa0c7";
    ctx.fillText(opts.footer || "נוצר באפליקציית המערכת", W - PAD, H - 28);
    return canvas;
  }

  const blobOf = (canvas, type = "image/png", q) => new Promise(r => canvas.toBlob(r, type, q));
  function download(blob, name) {
    const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  }
  async function share(canvas, name, text) {
    const file = new File([await blobOf(canvas)], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancel"; } }
    download(file, name); return "downloaded";
  }
  function loadJsPDF() {
    return new Promise((res, rej) => {
      if (window.jspdf) return res(window.jspdf.jsPDF);
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => res(window.jspdf.jsPDF); s.onerror = rej; document.head.appendChild(s);
    });
  }
  async function pdf(canvas, name) {
    const JsPDF = await loadJsPDF();
    const doc = new JsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 8;
    const r = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m) / canvas.height);
    const w = canvas.width * r, h = canvas.height * r;
    doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
    const blob = doc.output("blob");
    const file = new File([blob], name, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ files: [file] }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
    }
    download(file, name); return "downloaded";
  }

  window.TimetableImage = { draw, share, pdf, download, blobOf };
})();
