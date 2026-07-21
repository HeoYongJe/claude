// portfolio-app(Next.js, output:'export')의 빌드 산출물(out/)을
// 닷홈 remoteRoot(사이트 루트)에 업로드한다. nike/, travel/, alliza/ 폴더는 건드리지 않는다.
// 실행 전 반드시 `npm run build`(portfolio-app에서)로 out/ 최신화할 것.
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const cfg = require("../deploy.config.js");

const LOCAL_DIR = path.join(__dirname, "..", "portfolio-app", "out");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "");

(async () => {
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`out/ 폴더가 없습니다: ${LOCAL_DIR}\nportfolio-app에서 npm run build를 먼저 실행하세요.`);
    process.exitCode = 1;
    return;
  }

  const client = new ftp.Client(30000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR);
    // 주의: clearWorkingDir() 사용 금지 — REMOTE_DIR(사이트 루트)에는 nike/travel/alliza도
    // 같이 있어서 지우면 라이브 파일이 날아간다. uploadFromDir는 기존 파일을 지우지 않고
    // out/에 있는 파일만 덮어쓴다.
    await client.uploadFromDir(LOCAL_DIR);

    console.log(`배포 완료! (${LOCAL_DIR} → ${REMOTE_DIR})`);
  } catch (err) {
    console.error("배포 실패:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
})();
