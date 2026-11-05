// nike 프로젝트의 정적 파일을 닷홈 FTP의 remoteRoot + /nike/ 경로에 업로드한다.
// 기존 라이브 파일(2021년식 jQuery 클론 사이트)을 지우지 않고 덮어쓰기만 한다 —
// 정리/삭제는 사용자가 직접(CLAUDE.md 정책).
const ftp = require("basic-ftp");
const path = require("path");
const cfg = require("../deploy.config.js");

const LOCAL_ROOT = path.join(__dirname, "..", "nike");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "") + "/nike";

// 2026-11-05: heroWaves.js -> siteWaves.js로 교체, kineticGrid.js는 삭제(아래 FILES에서 뺌) —
// 둘 다 라이브 서버엔 그대로 남아있지만(CLAUDE.md: 라이브 파일 임의 삭제 금지) index.html이 더 이상
// 참조하지 않아 안전하게 방치됨.
const FILES = ["index.html", "css/style.css", "js/main.js", "js/manifestoTypewriter.js", "js/siteWaves.js", "assets/img/nike_s.png"];

(async () => {
  const client = new ftp.Client(20000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR);
    await client.ensureDir(REMOTE_DIR + "/css");
    await client.ensureDir(REMOTE_DIR + "/js");
    await client.ensureDir(REMOTE_DIR + "/assets/img");
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
