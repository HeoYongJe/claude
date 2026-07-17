// 초간단 정적 파일 서버 + 환율 API 프록시 (Node 내장 모듈만 사용, 별도 설치 불필요)
//
// 왜 프록시가 필요한가:
// 1) 한국수출입은행 API는 CORS 허용 헤더를 내려주지 않아서 브라우저가 직접 호출하면 차단된다.
// 2) 인증키를 브라우저(js 파일)에 두면 배포 시 누구나 "페이지 소스 보기"로 키를 볼 수 있다.
// -> 그래서 브라우저는 이 서버(/api/rates)만 호출하고, 실제 외부 API 호출과 인증키 사용은
//    이 서버 안에서만 일어나게 만든다.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { EXIM_AUTH_KEY } = require("./config");

const PORT = 4000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

function proxyExchangeRates(dateStr, res) {
  const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${EXIM_AUTH_KEY}&searchdate=${dateStr}&data=AP01`;

  https
    .get(apiUrl, (apiRes) => {
      let body = "";
      apiRes.on("data", (chunk) => (body += chunk));
      apiRes.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(body);
      });
    })
    .on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "환율 API 호출 실패", detail: err.message }));
    });
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.join(ROOT_DIR, safePath);

  // 상위 폴더로 빠져나가는 경로 요청 방지 (예: /../config.js)
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

  if (url.pathname === "/api/rates") {
    const dateStr = url.searchParams.get("date");
    if (!dateStr) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "date 파라미터가 필요합니다." }));
      return;
    }
    proxyExchangeRates(dateStr, res);
    return;
  }

  // config.js, config.example.js는 서버 전용이라 브라우저에 절대 내려주지 않는다.
  if (url.pathname.startsWith("/config")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveStaticFile(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
