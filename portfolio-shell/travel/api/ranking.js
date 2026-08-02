// Vercel 서버리스 함수: GET /api/ranking
// 로컬(server.js)과 같은 로직(lib/ranking.js)을 공유한다.
const { getRanking } = require("../lib/ranking");

module.exports = async (req, res) => {
  // 닷홈(정적 호스팅)에서 이 Vercel 도메인으로 넘어오는 요청이라 CORS 허용 필요.
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const data = await getRanking();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // Vercel 엣지 CDN 캐시: 30분 신선 + 하루 동안 stale-while-revalidate.
    // → 대부분 요청은 CDN 캐시로 즉시 응답(콜드스타트 계산에 안 매달림). 데이터는 전날 종가라 30분 캐시 무방.
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: "랭킹 계산 실패", detail: String((err && err.message) || err) });
  }
};
