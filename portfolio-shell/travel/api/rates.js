// Vercel 서버리스 함수: GET /api/rates?date=YYYYMMDD (레거시/직접 조회용)
const { fetchRawRatesJson } = require("../lib/ranking");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const dateStr = req.query.date;
  if (!dateStr) {
    res.status(400).json({ error: "date 파라미터가 필요합니다." });
    return;
  }
  try {
    const body = await fetchRawRatesJson(dateStr);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(body);
  } catch (err) {
    res.status(502).json({ error: "환율 API 호출 실패", detail: String((err && err.message) || err) });
  }
};
