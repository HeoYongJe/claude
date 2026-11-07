// nike 프로젝트의 정적 파일을 닷홈 FTP의 remoteRoot + /nike/ 경로에 업로드한다.
// 기존 라이브 파일(2021년식 jQuery 클론 사이트)을 지우지 않고 덮어쓰기만 한다 —
// 정리/삭제는 사용자가 직접(CLAUDE.md 정책).
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const { Readable } = require("stream");
const cfg = require("../deploy.config.js");

const LOCAL_ROOT = path.join(__dirname, "..", "nike");
const REMOTE_DIR = cfg.remoteRoot.replace(/\/$/, "") + "/nike";

// 2026-11-07 60차: "개발자도구로 보면 작업 히스토리 주석이 다 보인다, 안 보이게 해달라" 요청 —
// git 저장소의 index.html/css/js(design.md 관행대로 날짜별 의사결정 주석이 계속 누적되는 "진짜"
// 작업 소스)는 그대로 두고, FTP로 올라가는 사본만 주석을 제거해서 업로드한다(로컬 파일 자체는
// 안 건드림 — 다음 라운드 작업 때도 지금까지의 히스토리 그대로 이어서 볼 수 있음).
// JS는 문자열/정규식 리터럴 안의 "//"·"/*"까지 긁어버릴 위험이 있어, 제거 후 vm으로 문법 검증하고
// 실패하면 그 파일만 원본 그대로 업로드(깨진 JS를 올리는 것보단 주석이 남는 쪽이 안전).
function stripHtmlComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, "");
}
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}
function stripJsComments(src) {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  try {
    new vm.Script(stripped, { filename: "stripped-check.js" });
    return stripped;
  } catch (err) {
    console.warn(`  ⚠ 주석 제거 후 문법 오류 감지, 이 파일은 원본 그대로 업로드: ${err.message}`);
    return src;
  }
}
const TEXT_STRIPPERS = { ".html": stripHtmlComments, ".css": stripCssComments, ".js": stripJsComments };

// 2026-11-06: 40차에서 배경 웨이브를 완전히 제거하며 siteWaves.js도 삭제(아래 FILES에서 뺌) — heroWaves.js
// (siteWaves.js 이전 이름)·kineticGrid.js와 마찬가지로 라이브 서버엔 그대로 남아있지만(CLAUDE.md: 라이브
// 파일 임의 삭제 금지) index.html이 더 이상 참조하지 않아 안전하게 방치됨.
// 2026-11-07 53차: 룩북 실사 이미지 5장 추가.
const FILES = [
  "index.html", "css/style.css", "js/main.js", "js/manifestoTypewriter.js",
  "assets/img/nike_s.png",
  "assets/img/lookbook/01-street.webp",
  "assets/img/lookbook/02-training.webp",
  "assets/img/lookbook/03-studio.webp",
  "assets/img/lookbook/04-collection.webp",
  "assets/img/lookbook/05-court.webp",
];

(async () => {
  const client = new ftp.Client(20000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공");

    await client.ensureDir(REMOTE_DIR);
    await client.ensureDir(REMOTE_DIR + "/css");
    await client.ensureDir(REMOTE_DIR + "/js");
    await client.ensureDir(REMOTE_DIR + "/assets/img");
    await client.ensureDir(REMOTE_DIR + "/assets/img/lookbook");
    console.log(`원격 폴더 준비: ${REMOTE_DIR}`);

    for (const rel of FILES) {
      const local = path.join(LOCAL_ROOT, rel);
      const remote = REMOTE_DIR + "/" + rel;
      const strip = TEXT_STRIPPERS[path.extname(rel)];
      if (strip) {
        const clean = strip(fs.readFileSync(local, "utf8"));
        await client.uploadFrom(Readable.from(clean), remote);
        console.log(` ✓ ${rel} → ${remote} (주석 제거)`);
      } else {
        await client.uploadFrom(local, remote);
        console.log(` ✓ ${rel} → ${remote}`);
      }
    }

    console.log("배포 완료!");
  } catch (err) {
    console.error("배포 실패:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
})();
