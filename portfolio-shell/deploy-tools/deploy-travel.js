// travel 프로젝트의 정적 파일(index.html, css/style.css, js/main.js)만
// 닷홈 FTP의 remoteRoot + /travel/ 경로에 업로드한다.
// 서버 전용 파일(server.js, config.js, lib/, api/, node_modules 등)은 올리지 않는다 —
// 그건 Vercel에 이미 배포돼있고, 닷홈은 정적 파일 전용이라 필요도 없고 인증키 노출 위험만 있음.
const ftp = require("basic-ftp");
const path = require("path");
const cfg = require("../deploy.config.js");

const LOCAL_ROOT = path.join(__dirname, "..", "travel");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "") + "/travel";

const FILES = ["index.html", "css/style.css", "js/main.js"];

(async () => {
  const client = new ftp.Client(20000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR);
    await client.ensureDir(REMOTE_DIR + "/css");
    await client.ensureDir(REMOTE_DIR + "/js");
    console.log(`원격 폴더 준비: ${REMOTE_DIR}`);

    for (const rel of FILES) {
      const local = path.join(LOCAL_ROOT, rel);
      const remote = REMOTE_DIR + "/" + rel;
      await client.uploadFrom(local, remote);
      console.log(` ✓ ${rel} → ${remote}`);
    }

    console.log("배포 완료!");
  } catch (err) {
    console.error("배포 실패:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
})();
