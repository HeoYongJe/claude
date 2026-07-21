// 포트폴리오 껍데기(메인 index.html, css, js)를 닷홈 remoteRoot에 업로드한다.
// nike/, travel/, _old_backup/ 폴더는 건드리지 않는다.
const ftp = require("basic-ftp");
const path = require("path");
const cfg = require("../deploy.config.js");

const LOCAL_ROOT = path.join(__dirname, "..");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "");

const FILES = ["index.html", "css/style.css", "js/main.js"];

(async () => {
  const client = new ftp.Client(20000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR + "/css");
    await client.ensureDir(REMOTE_DIR + "/js");

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
