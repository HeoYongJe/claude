// 포트폴리오 메인(shell/)을 닷홈 remoteRoot에 업로드한다.
// nike/, travel/, alliza/, _old_backup/ 등 기존 폴더는 건드리지 않는다.
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const cfg = require("../deploy.config.js");

const LOCAL_DIR = path.join(__dirname, "..", "shell");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "");

(async () => {
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`shell/ 폴더가 없습니다: ${LOCAL_DIR}`);
    process.exitCode = 1;
    return;
  }

  const client = new ftp.Client(30000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR);
    // 주의: clearWorkingDir() 등 원격 디렉토리 전체 삭제 API 사용 금지 —
    // REMOTE_DIR(사이트 루트)에는 nike/travel/alliza도 함께 있어서 지우면 라이브가 날아간다.
    // uploadFromDir는 기존 파일을 지우지 않고 shell/에 있는 파일만 덮어쓴다.
    await client.uploadFromDir(LOCAL_DIR);

    console.log(`배포 완료! (${LOCAL_DIR} → ${REMOTE_DIR})`);
  } catch (err) {
    console.error("배포 실패:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
})();
