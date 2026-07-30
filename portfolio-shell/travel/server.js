// 로컬 개발용 정적 파일 서버 + 환율/물가 API (lib/ranking.js 로직 재사용).
// 실제 배포는 이 파일이 아니라 api/ranking.js, api/rates.js (Vercel)로 나간다.
const http = require("http");
const fs = require("fs");
const path = require("path");

// 로컬 config.js(gitignore) 값을 lib 코드가 쓰는 process.env로 미리 주입.
// (lib/config.js는 Vercel 번들 호환을 위해 환경변수만 읽는다)
try {
  const local = require("./config");
  process.env.EXIM_AUTH_KEY = process.env.EXIM_AUTH_KEY || local.EXIM_AUTH_KEY;
  process.env.KOTRA_SERVICE_KEY = process.env.KOTRA_SERVICE_KEY || local.KOTRA_SERVICE_KEY;
} catch (e) {
  console.warn("config.js를 못 찾았습니다. .env 또는 config.example.js를 참고해 만들어주세요.");
}

const { getRanking, fetchRawRatesJson } = require("./lib/ranking");

const PORT = 4000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.join(ROOT_DIR, safePath);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("파일을 찾을 수 없습니다.");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/ranking") {
    getRanking()
      .then((data) => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(data));
      })
      .catch((err) => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "랭킹 계산 실패", detail: String((err && err.message) || err) }));
      });
    return;
  }

  if (url.pathname === "/api/rates") {
    const dateStr = url.searchParams.get("date");
    if (!dateStr) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "date 파라미터가 필요합니다." }));
      return;
    }
    fetchRawRatesJson(dateStr)
      .then((body) => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(body);
      })
      .catch((err) => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "환율 API 호출 실패", detail: err.message }));
      });
    return;
  }

  // config.js 등 서버 전용 파일은 브라우저에 절대 내려주지 않는다.
  if (url.pathname.startsWith("/config") || url.pathname.startsWith("/lib")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveStaticFile(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  getRanking()
    .then(() => console.log("랭킹 캐시 준비 완료"))
    .catch((e) => console.log("랭킹 예열 실패(요청 시 재시도):", e.message));
});
