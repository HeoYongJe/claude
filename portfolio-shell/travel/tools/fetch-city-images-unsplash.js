// 도시 대표 이미지를 Unsplash API로 수집해 js/cityImages.js 를 생성한다(예쁜 여행 사진).
// 준비: travel/config.js(gitignore)에 UNSPLASH_ACCESS_KEY 추가 (또는 환경변수 UNSPLASH_ACCESS_KEY).
// 실행: node tools/fetch-city-images-unsplash.js
const https = require("https");
const fs = require("fs");
const path = require("path");
const COUNTRY_DETAIL = require("../js/countryDetail.js");

let KEY = process.env.UNSPLASH_ACCESS_KEY;
try { KEY = KEY || require("../config.js").UNSPLASH_ACCESS_KEY; } catch (e) {}
if (!KEY) {
  console.error("UNSPLASH_ACCESS_KEY가 없습니다. travel/config.js에 추가하거나 환경변수로 설정하세요.");
  process.exit(1);
}

// Unsplash 검색은 영어가 정확 → 도시명(한글) → 영어 검색어 매핑.
const EN = {
  도쿄: "Tokyo", 오사카: "Osaka", 후쿠오카: "Fukuoka",
  다낭: "Da Nang Vietnam", 하노이: "Hanoi", 호치민: "Ho Chi Minh City",
  방콕: "Bangkok", 치앙마이: "Chiang Mai", 푸껫: "Phuket",
  타이베이: "Taipei", 가오슝: "Kaohsiung", 타이중: "Taichung",
  세부: "Cebu Philippines", 마닐라: "Manila", 보라카이: "Boracay",
  발리: "Bali", 자카르타: "Jakarta", 족자카르타: "Yogyakarta",
  싱가포르: "Singapore", 센토사: "Sentosa Singapore", 오차드: "Orchard Road Singapore",
  홍콩섬: "Hong Kong", 구룡: "Kowloon Hong Kong", 마카오: "Macau",
  상하이: "Shanghai", 베이징: "Beijing", 청두: "Chengdu",
  쿠알라룸푸르: "Kuala Lumpur", 코타키나발루: "Kota Kinabalu", 페낭: "Penang",
  이스탄불: "Istanbul", 카파도키아: "Cappadocia", 안탈리아: "Antalya",
  취리히: "Zurich", 인터라켄: "Interlaken", 루체른: "Lucerne",
};

function getJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "yjportfolio-travel/1.0", "Accept-Version": "v1" } }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(null); } });
    }).on("error", () => resolve(null));
  });
}

// 검색 1건 = 요청 1회만(다운로드 트리거 없음 → 시간당 50회 제한 내).
async function search(query) {
  const url = "https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&content_filter=high"
    + "&query=" + encodeURIComponent(query) + "&client_id=" + KEY;
  const j = await getJson(url);
  const p = j && j.results && j.results[0];
  if (!p) return null;
  const src = p.urls.raw + "&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg";
  return { src, by: p.user && p.user.name };
}

(async () => {
  const names = new Set();
  for (const c of Object.values(COUNTRY_DETAIL)) (c.cities || []).forEach((ci) => names.add(ci.name));

  // 이미 받은 건 유지하고 없는 것만 채운다(레이트리밋 대비 재실행 안전).
  let existing = {};
  try { existing = require("../js/cityImages.js") || {}; } catch (e) {}

  const map = { ...existing }; const credit = {}; const miss = [];
  for (const name of names) {
    if (map[name]) continue; // 이미 있음 → 건너뜀
    const res = await search(EN[name] || name);
    if (res) { map[name] = res.src; if (res.by) credit[name] = res.by; }
    else miss.push(name);
    await new Promise((r) => setTimeout(r, 250));
  }

  const out =
    "// 자동 생성 파일 — tools/fetch-city-images-unsplash.js 로 갱신. 직접 수정하지 말 것.\n" +
    "// 도시명 → Unsplash 이미지 URL. citiesHtml에서 ci.img 없을 때 폴백으로 사용.\n" +
    "const CITY_IMAGES = " + JSON.stringify(map, null, 2) + ";\n" +
    "// 사진 크레딧(Unsplash 작가) — 필요 시 표기용.\n" +
    "const CITY_IMAGE_CREDIT = " + JSON.stringify(credit, null, 2) + ";\n" +
    'if (typeof module !== "undefined" && module.exports) module.exports = CITY_IMAGES;\n';
  fs.writeFileSync(path.join(__dirname, "..", "js", "cityImages.js"), out);

  console.log(`수집 완료: ${Object.keys(map).length}개 / 전체 ${names.size}개 (Unsplash)`);
  if (miss.length) console.log("미스(그라데이션 폴백):", miss.join(", "));
})();
