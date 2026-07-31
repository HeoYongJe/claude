// 도시 대표 이미지를 위키백과(한국어) REST API에서 자동 수집해 js/cityImages.js 를 생성한다.
// 실행: node tools/fetch-city-images.js  (countryDetail.js의 모든 도시 대상, 재실행 가능)
// 결과 CITY_IMAGES[도시명] = 위키미디어 썸네일 URL. 미스는 콘솔에 표시(그라데이션 폴백).
const https = require("https");
const fs = require("fs");
const path = require("path");
const COUNTRY_DETAIL = require("../js/countryDetail.js");

// 문서명이 도시명과 다른 경우 수동 매핑(미스 보정 — 검색해서 채움).
const ALIAS = {
  후쿠오카: "후쿠오카시", 상하이: "상하이시", 베이징: "베이징시", 청두: "청두시",
  가오슝: "가오슝시", 타이중: "타이중시", 자카르타: "자카르타", 족자카르타: "욕야카르타",
  푸껫: "푸껫주", 페낭: "페낭주", 센토사: "센토사섬", 발리: "발리섬",
  구룡: "주룽반도", 마카오: "마카오", 코타키나발루: "코타키나발루",
  오차드: "오차드로드", 홍콩섬: "홍콩섬", 안탈리아: "안탈리아",
};

const UA = { "User-Agent": "yjportfolio-travel/1.0 (portfolio)" };
function getJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: UA }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(null); } });
    }).on("error", () => resolve(null));
  });
}
// REST summary → 없으면 pageimages(redirects) 폴백.
async function summary(title) {
  const j = await getJson("https://ko.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
  if (j && j.thumbnail) return j.thumbnail.source;
  const k = await getJson("https://ko.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&titles=" + encodeURIComponent(title));
  try { const p = Object.values(k.query.pages)[0]; if (p && p.thumbnail) return p.thumbnail.source; } catch (e) {}
  return null;
}

// 썸네일 URL의 폭(.../330px-...)을 500px로 키운다.
const upsize = (u) => (u ? u.replace(/\/\d+px-/, "/500px-") : u);

(async () => {
  const names = new Set();
  for (const c of Object.values(COUNTRY_DETAIL)) (c.cities || []).forEach((ci) => names.add(ci.name));

  const map = {};
  const miss = [];
  for (const name of names) {
    let thumb = await summary(name);
    if (!thumb && ALIAS[name]) thumb = await summary(ALIAS[name]); // 실패 시 별칭 재시도
    // 도시 사진이 아닌 것(지도·국기·인물·SVG 렌더) 걸러내기 → 그라데이션 폴백
    if (thumb && /locator|flag[_ ]?of|portrait|\.svg|map[_ ]?of|_map|coat_of/i.test(thumb)) thumb = null;
    if (thumb) map[name] = upsize(thumb);
    else miss.push(name);
    await new Promise((r) => setTimeout(r, 120)); // 예의상 간격
  }

  const out =
    "// 자동 생성 파일 — tools/fetch-city-images.js 로 갱신. 직접 수정하지 말 것.\n" +
    "// 도시명 → 위키미디어 대표 이미지 URL. citiesHtml에서 ci.img 없을 때 폴백으로 사용.\n" +
    "const CITY_IMAGES = " + JSON.stringify(map, null, 2) + ";\n" +
    'if (typeof module !== "undefined" && module.exports) module.exports = CITY_IMAGES;\n';
  fs.writeFileSync(path.join(__dirname, "..", "js", "cityImages.js"), out);

  console.log(`수집 완료: ${Object.keys(map).length}개 / 전체 ${names.size}개`);
  if (miss.length) console.log("미스(그라데이션 폴백):", miss.join(", "));
})();
