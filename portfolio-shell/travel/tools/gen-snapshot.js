// 첫 로드 즉시 렌더용 랭킹 스냅샷 생성 → js/rankingSnapshot.js
// 배포 전에 실행: node tools/gen-snapshot.js
// 라이브 API(Vercel)에서 최신 계산결과를 받아 스냅샷으로 굳힌다(인증키 불필요).
const fs = require("fs");
const path = require("path");
const https = require("https");

const API = "https://travel-lyart-five.vercel.app/api/ranking";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (r) => {
      let b = "";
      r.on("data", (c) => (b += c));
      r.on("end", () => { try { resolve(JSON.parse(b)); } catch (e) { reject(new Error("JSON 파싱 실패")); } });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("timeout")));
  });
}

(async () => {
  try {
    const data = await fetchJson(API);
    if (!data || !data.all || !data.all.length) throw new Error("빈 데이터");
    const out =
      "// 자동 생성(tools/gen-snapshot.js) — 첫 로드 즉시 렌더용 스냅샷. 배포 시점 데이터라 접속 직후엔 이걸 보여주고,\n" +
      "// main.js가 백그라운드로 /api/ranking을 받아 최신값으로 교체한다. 직접 수정하지 말 것.\n" +
      "const RANKING_SNAPSHOT = " + JSON.stringify(data) + ";\n" +
      'if (typeof module !== "undefined" && module.exports) module.exports = RANKING_SNAPSHOT;\n';
    fs.writeFileSync(path.join(__dirname, "..", "js", "rankingSnapshot.js"), out);
    console.log(`스냅샷 생성 완료: ${data.all.length}개국 · 기준일 ${data.currentDate}`);
    process.exit(0);
  } catch (e) {
    console.error("스냅샷 생성 실패:", e.message);
    process.exit(1);
  }
})();
