// בדיקת פונקציית משוב מול שרת משוב מדומה (לא נוגע במשוב האמיתי ולא בחשבון אמיתי).
//   node scripts/test-mashov-function.mjs
import http from "node:http";

const GUID = "11111111-2222-3333-4444-555555555555";
let lastAuthHeaders = null, loginBody = null, logoutCalled = false, loginCalls = 0;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    const send = (code, obj, headers = {}) => { res.writeHead(code, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(obj)); };
    if (req.url === "/api/login" && req.method === "POST") {
      loginBody = JSON.parse(body); loginCalls++;
      if (loginBody.username === "good" && loginBody.password === "pw") {
        res.setHeader("Set-Cookie", ["MashovAuthToken=abc123; Path=/; HttpOnly", "uniquId=u-1; Path=/"]);
        return send(200, { credential: { userId: GUID }, accessToken: { displayName: "ישראל ישראלי" } }, { "x-csrf-token": "tok-1" });
      }
      return send(401, { message: "bad" });
    }
    if (req.url === "/api/logout") { logoutCalled = true; return send(200, {}); }
    const m = req.url.match(/^\/api\/students\/([^/]+)\/(\w+)$/);
    if (m) {
      lastAuthHeaders = { csrf: req.headers["x-csrf-token"], cookie: req.headers["cookie"] };
      if (m[1] !== GUID || req.headers["x-csrf-token"] !== "tok-1" || !String(req.headers.cookie).includes("MashovAuthToken=abc123")) return send(401, {});
      const data = {
        behave: [
          { lessonDate: "2026-09-14T00:00:00", lesson: 1, subject: "גמרא", groupId: 5, achvaName: "חיסור", justificationId: 0, justification: "", extraField: "should be dropped" },
          { lessonDate: "2026-09-15T00:00:00", lesson: 3, subject: "אנגלית", groupId: 7, achvaName: "חיסור", justificationId: 4, justification: "מחלה" },
        ],
        grades: [{ eventDate: "2026-09-20T00:00:00", subjectName: "מתמטיקה", gradingEvent: "בוחן", grade: 92, teacherName: "אדיר חניה", groupId: 9 }],
        groups: [{ groupId: 5, groupName: "גמרא י1", subjectName: "גמרא", teacherName: "הרב שחר" }],
        lessonsCount: [{ groupId: 5, lessonCount: 20, weeklyHours: 6 }],
      }[m[2]];
      return data ? send(200, data) : send(404, {});
    }
    send(404, {});
  });
});
await new Promise(r => server.listen(8899, r));
process.env.MASHOV_BASE = "http://localhost:8899/api";
const mod = await import("../netlify/functions/mashov.mjs");
const { default: handler } = mod;
mod.__useMemoryStore();

const call = (body, origin = "https://eliyaamir5-glitch.github.io", method = "POST", ip = "1.1.1.1") =>
  handler(new Request("http://localhost/api/mashov", { method, headers: { "Content-Type": "application/json", origin }, body: method === "POST" ? JSON.stringify(body) : undefined }), { ip });
const ok = (name, cond, extra = "") => { console.log(cond ? "✅" : "❌", name, extra); if (!cond) process.exitCode = 1; };

const r1 = await call({ username: "good", password: "pw", semel: 144758, year: 2027 });
const j1 = await r1.json();
ok("good login returns data", r1.status === 200 && j1.ok && j1.behave.length === 2 && j1.grades[0].grade === 92, JSON.stringify(j1).slice(0, 120));
ok("student name extracted", j1.student?.name === "ישראל ישראלי");
ok("behave slimmed (extra fields dropped, date cut)", j1.behave[0].date === "2026-09-14" && !("extraField" in j1.behave[0]) && j1.behave[1].justification === "מחלה");
ok("csrf token and cookies forwarded", lastAuthHeaders.csrf === "tok-1" && lastAuthHeaders.cookie.includes("MashovAuthToken=abc123") && lastAuthHeaders.cookie.includes("uniquId=u-1"));
ok("login body has semel/year/username as numbers/strings", loginBody.semel === 144758 && loginBody.year === 2027 && loginBody.username === "good");
ok("logged out after fetching", logoutCalled);
ok("no password in response", !JSON.stringify(j1).includes("pw\""));
ok("CORS allowed for the GitHub Pages site", r1.headers.get("access-control-allow-origin") === "https://eliyaamir5-glitch.github.io");
ok("never cached", r1.headers.get("cache-control") === "no-store");

const r2 = await call({ username: "good", password: "wrong", semel: 144758, year: 2027 });
ok("wrong password → bad_login", r2.status === 401 && (await r2.json()).error === "bad_login");
const r3 = await call({ username: "good", password: "pw", semel: "abc", year: 2027 });
ok("bad semel → bad_request", r3.status === 400 && (await r3.json()).error === "bad_request");
const r4 = await call({ username: "good", password: "pw", semel: 144758, year: 2027 }, "https://evil.example.com");
ok("unknown origin gets no CORS header", !r4.headers.get("access-control-allow-origin"));
const r5 = await call(null, "https://eliyaamir5-glitch.github.io", "OPTIONS");
ok("preflight answered", r5.status === 204);
const r6 = await call(null, "https://eliyaamir5-glitch.github.io", "GET");
ok("GET rejected", r6.status === 405);

// CORS: רק האתרים של הפרויקט (לא כל netlify.app)
const acao = async o => (await call({ username: "x", password: "y", semel: 1, year: 2027 }, o)).headers.get("access-control-allow-origin");
ok("CORS allowed for the project's Netlify site", await acao("https://lucent-crepe-6db22c.netlify.app") === "https://lucent-crepe-6db22c.netlify.app");
ok("CORS allowed for its deploy previews", await acao("https://deploy-preview-12--lucent-crepe-6db22c.netlify.app") === "https://deploy-preview-12--lucent-crepe-6db22c.netlify.app");
ok("CORS allowed for localhost", await acao("http://localhost:8787") === "http://localhost:8787");
ok("CORS refused for any other *.netlify.app", !(await acao("https://evil-site.netlify.app")) && !(await acao("https://lucent-crepe-6db22c.netlify.app.evil.com")) && !(await acao("https://xlucent-crepe-6db22c.netlify.app")));

// סיסמאות שגויות: אחרי 10 לאותו חשבון – חסימה ל-15 דקות (גם עם הסיסמה הנכונה); חשבון אחר מאותה כתובת לא נחסם
for (let i = 0; i < 10; i++) await call({ username: "good", password: "wrong" + i, semel: 144758, year: 2027 }, undefined, "POST", "20.0.0.1");
const r8 = await call({ username: "good", password: "pw", semel: 144758, year: 2027 }, undefined, "POST", "20.0.0.2");
const j8 = await r8.json();
ok("10 wrong passwords lock that account (even from another address)", r8.status === 429 && j8.error === "mashov_down" && j8.reason === "too_many");
const r9 = await call({ username: "other", password: "pw", semel: 144758, year: 2027 }, undefined, "POST", "20.0.0.1");
ok("…other accounts from the same address still work", r9.status === 401 && (await r9.json()).error === "bad_login");
const r10 = await call({ username: "GOOD", password: "pw", semel: 144758, year: 2027 }, undefined, "POST", "20.0.0.3");
ok("…the lock ignores upper/lower case of the username", r10.status === 429);
for (let i = 0; i < 100; i++) await call({ username: "spray" + i, password: "x", semel: 144758, year: 2027 }, undefined, "POST", "30.0.0.1");
const r11 = await call({ username: "spray-new", password: "x", semel: 144758, year: 2027 }, undefined, "POST", "30.0.0.1");
ok("100 wrong logins from one address (many accounts) lock that address", r11.status === 429);
// ניחוש במקביל: 40 סיסמאות שגויות באותו רגע לאותו חשבון – רק 10 מגיעות למשוב, והחשבון ננעל
{
  const before = loginCalls;
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => call({ username: "victim", password: "guess" + i, semel: 144758, year: 2027 }, undefined, "POST", "50.0.0." + i)));
  ok("40 parallel guesses: at most 10 reach Mashov, the rest are refused", loginCalls - before <= 10 && rs.filter(x => x.status === 429).length >= 30, `reached=${loginCalls - before}`);
  const r = await call({ username: "victim", password: "pw", semel: 144758, year: 2027 }, undefined, "POST", "51.0.0.1");
  ok("…and the account stays locked afterwards", r.status === 429);
}
// הצלחות לא נספרות ככישלון: 15 רענונים מוצלחים ברצף מאותה כתובת – כולם עוברים
{
  const codes = [];
  for (let i = 0; i < 15; i++) codes.push((await call({ username: "good", password: "pw", semel: 555555, year: 2027 }, undefined, "POST", "52.0.0.1")).status);
  ok("successful sign-ins never lock (15 in a row)", codes.every(c => c === 200), codes.join());
  const rs = await Promise.all(Array.from({ length: 8 }, () => call({ username: "good", password: "pw", semel: 555556, year: 2027 }, undefined, "POST", "52.0.0.2")));
  ok("…also 8 at once (a sign-in in progress counts until it finishes)", rs.every(x => x.status === 200), rs.map(x => x.status).join());
  const r = await call({ username: "good", password: "pw", semel: 555556, year: 2027 }, undefined, "POST", "52.0.0.2");
  ok("…and the account is not locked after them", r.status === 200);
}
// אחסון שלא עונה לא תוקע את ההתחברות
mod.__useMemoryStore({ get: () => new Promise(() => {}), set: () => new Promise(() => {}) });
const t0 = Date.now();
const r12 = await call({ username: "good", password: "pw", semel: 999999, year: 2027 }, undefined, "POST", "40.0.0.1");
ok("a stuck rate-limit store doesn't block sign-in (gives up after ~3s)", r12.status === 200 && (await r12.json()).ok && Date.now() - t0 < 5000, Date.now() - t0 + "ms");
mod.__useMemoryStore({ get: async () => { throw new Error("down"); }, set: async () => { throw new Error("down"); } });
const r13 = await call({ username: "good", password: "pw", semel: 999998, year: 2027 }, undefined, "POST", "40.0.0.2");
ok("a broken rate-limit store doesn't block sign-in", r13.status === 200);

process.env.MASHOV_BASE = "http://localhost:1/api"; // שרת שלא קיים
const { default: handler2 } = await import("../netlify/functions/mashov.mjs?down");
const r7 = await handler2(new Request("http://localhost/api/mashov", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "a", password: "b", semel: 144758, year: 2027 }) }));
ok("mashov unreachable → mashov_down", r7.status === 502 && (await r7.json()).error === "mashov_down");

server.close();
