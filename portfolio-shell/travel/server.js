// 정적 파일 서버 + 환율 API 프록시 + 랭킹 계산(/api/ranking)
//
// 왜 서버가 계산하나:
// - 수출입은행 API는 CORS 미허용 + 인증키를 브라우저에 두면 노출됨 → 프록시 필수.
// - "최근 3개월 최저 / 한 달 변동률 / 스파크라인"은 과거 여러 날짜를 조회해야 하는데,
//   브라우저에서 매번 수십 번 호출하면 느리고 낭비. 서버가 하루 1회 모아 계산해 캐시한다.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { EXIM_AUTH_KEY, KOTRA_SERVICE_KEY } = require("./config");
const COUNTRIES = require("./js/currencyCountryMap.js");

const PORT = 4000;
const ROOT_DIR = __dirname;
const EXIM_API_URL = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
const KOTRA_API_URL = "https://apis.data.go.kr/B410001/priceInfoByNatn/priceInfoByNatn";
// KOTRA 물가 기준순번: 1=빅맥, 6=생수 500ml, 7=코카콜라 500ml. 가격은 USD.
const PRICE_SEQ = { bigmac: 1, water: 6, cola: 7 };
// 서울(한국) 기준가(원). KOTRA에 한국이 없어 상수로 유지.
const SEOUL_PRICE = { bigmac: 5500, cola: 2000, water: 1000 };

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

// ---------- 날짜 유틸 ----------
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function parseYmd(ymd) {
  return new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)).getTime();
}

// ---------- 수출입은행 조회 ----------
// 특정 날짜의 정상 데이터(result===1)를 배열로 반환. 공휴일/주말은 [] (재시도 안 함).
// 네트워크 오류/502 등은 최대 2회 재시도.
function fetchRatesForDate(dateStr, attempt = 0) {
  return new Promise((resolve) => {
    const url = `${EXIM_API_URL}?authkey=${EXIM_AUTH_KEY}&searchdate=${dateStr}&data=AP01`;
    https
      .get(url, (r) => {
        if (r.statusCode !== 200) {
          r.resume();
          return attempt < 2 ? resolve(fetchRatesForDate(dateStr, attempt + 1)) : resolve([]);
        }
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          let arr = [];
          try {
            const j = JSON.parse(body);
            if (Array.isArray(j)) arr = j.filter((x) => x.result === 1);
          } catch (e) {
            /* 파싱 실패는 빈 배열 취급 */
          }
          resolve(arr);
        });
      })
      .on("error", () => {
        attempt < 2 ? resolve(fetchRatesForDate(dateStr, attempt + 1)) : resolve([]);
      });
  });
}

// fromDate부터 하루씩 앞당겨 데이터가 있는 가장 가까운 영업일을 찾는다.
async function resolveLatest(fromDate, maxBack = 7) {
  let cur = new Date(fromDate);
  for (let i = 0; i < maxBack; i++) {
    const dateStr = fmtDate(cur);
    const rates = await fetchRatesForDate(dateStr);
    if (rates.length > 0) return { date: dateStr, rates };
    cur = addDays(cur, -1);
  }
  return null;
}

function toRateMap(rates) {
  const m = {};
  for (const x of rates) {
    const v = Number(String(x.deal_bas_r).replace(/,/g, ""));
    if (Number.isFinite(v)) m[x.cur_unit] = v;
  }
  return m;
}

// ---------- KOTRA 물가 조회 ----------
// 특정 품목(seq)의 국가별 USD 가격 맵 { ISO대문자: usd } 을 반환.
// data.go.kr은 동시 호출에 취약해 실패(빈 맵)하면 최대 2회 재시도한다. (호출부는 순차 실행)
function fetchKotraPrices(seq, attempt = 0) {
  return new Promise((resolve) => {
    const url = `${KOTRA_API_URL}?serviceKey=${encodeURIComponent(
      KOTRA_SERVICE_KEY
    )}&type=json&numOfRows=100&pageNo=1&prcsCritSeq=${seq}`;
    https
      .get(url, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          const map = {};
          try {
            const items = JSON.parse(body).response.body.itemList.item || [];
            for (const it of items) {
              const v = Number(it.cmdltAmt);
              if (Number.isFinite(v)) map[it.isoWd2NatCd] = v;
            }
          } catch (e) {
            /* 실패 시 빈 맵 → 아래에서 재시도 */
          }
          if (Object.keys(map).length === 0 && attempt < 2) {
            return resolve(fetchKotraPrices(seq, attempt + 1));
          }
          resolve(map);
        });
      })
      .on("error", () => {
        attempt < 2 ? resolve(fetchKotraPrices(seq, attempt + 1)) : resolve({});
      });
  });
}

// ---------- 랭킹 계산 ----------
// 최근 약 3개월을 주 1회 간격(최대 13개 시점)으로 모아 국가별 시계열을 만들고
// 한 달 변동률(원화 강세율)·3개월 최저 여부·스파크라인을 계산한다.
async function buildRanking() {
  const base = await resolveLatest(new Date());
  if (!base) throw new Error("최신 영업일 환율을 찾지 못했습니다.");

  const points = []; // { date, map }
  const seen = new Set();
  const push = (res) => {
    if (res && !seen.has(res.date)) {
      seen.add(res.date);
      points.push({ date: res.date, map: toRateMap(res.rates) });
    }
  };
  push(base);
  for (let w = 1; w <= 12; w++) {
    const target = addDays(new Date(parseYmd(base.date)), -7 * w);
    push(await resolveLatest(target));
  }
  points.sort((a, b) => (a.date < b.date ? -1 : 1)); // 오래된→최신

  const currentDate = points[points.length - 1].date;
  const monthAgoTargetMs = parseYmd(currentDate) - 30 * 86400000;

  const results = [];
  for (const [unit, meta] of Object.entries(COUNTRIES)) {
    const series = points
      .map((p) => ({ date: p.date, rate: p.map[unit] }))
      .filter((x) => typeof x.rate === "number");
    if (series.length < 2) continue;

    const current = series[series.length - 1].rate;

    // 한 달 전에 가장 가까운 시점
    let monthAgo = series[0];
    let bestDiff = Infinity;
    for (const s of series) {
      const diff = Math.abs(parseYmd(s.date) - monthAgoTargetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        monthAgo = s;
      }
    }
    // deal_bas_r 하락 = 원화 강세 → changePct 양수(유리)
    const changePct = ((monthAgo.rate - current) / monthAgo.rate) * 100;

    const rateVals = series.map((s) => s.rate);
    const minR = Math.min(...rateVals);
    const maxR = Math.max(...rateVals);
    const is3moLow = current <= minR + 1e-9;

    // 스파크라인: 환율이 낮을수록(유리) 위로 → 강세는 상승선, 약세는 하락선
    const n = series.length;
    const line = series
      .map((s, i) => {
        const x = ((i / (n - 1)) * 240).toFixed(0);
        const y = maxR === minR ? 24 : (4 + ((s.rate - minR) / (maxR - minR)) * 40).toFixed(0);
        return `${x},${y}`;
      })
      .join(" ");

    // 1,000원으로 받는 외화
    const multMatch = unit.match(/\((\d+)\)/);
    const multiplier = multMatch ? Number(multMatch[1]) : 1;
    const foreignPer1000 = (1000 * multiplier) / current;
    const recv =
      foreignPer1000 >= 100
        ? `${Math.round(foreignPer1000).toLocaleString("ko-KR")}${meta.unit}`
        : `${foreignPer1000.toFixed(1)}${meta.unit}`;

    results.push({
      code: meta.code,
      name: meta.country,
      changePct,
      current,
      is3moLow,
      line,
      rate: `1,000원 = ${recv}`,
      recv,
    });
  }

  // 물가: KOTRA 3품목(USD)을 원화로 환산해 서울 대비 절약률 계산
  const usdKrw = points[points.length - 1].map["USD"] || null;
  // 순차 호출 (동시 호출 시 data.go.kr이 일부 실패함)
  const bigmacM = await fetchKotraPrices(PRICE_SEQ.bigmac);
  const waterM = await fetchKotraPrices(PRICE_SEQ.water);
  const colaM = await fetchKotraPrices(PRICE_SEQ.cola);
  const seoulTotal = SEOUL_PRICE.bigmac + SEOUL_PRICE.cola + SEOUL_PRICE.water;
  function priceInfo(code) {
    if (!usdKrw) return null;
    const iso = code.toUpperCase();
    const toKrw = (usd) => (typeof usd === "number" ? Math.round(usd * usdKrw) : null);
    const bigmac = toKrw(bigmacM[iso]);
    const cola = toKrw(colaM[iso]);
    const water = toKrw(waterM[iso]);
    if (bigmac == null || cola == null || water == null) return null;
    const savePct = Math.round((1 - (bigmac + cola + water) / seoulTotal) * 100);
    return { bigmac, cola, water, savePct };
  }

  const toCard = (r, i) => {
    const p = priceInfo(r.code);
    return {
      num: String(i + 1),
      badge: `${r.changePct >= 0 ? "▲" : "▼"} ${Math.abs(r.changePct).toFixed(1)}%`,
      name: r.name,
      code: r.code,
      rate: r.rate,
      recv: r.recv,
      is3moLow: r.is3moLow,
      changePct: Number(r.changePct.toFixed(1)),
      line: r.line,
      savePct: p ? p.savePct : null,
    };
  };

  const strong = results.filter((r) => r.changePct > 0).sort((a, b) => b.changePct - a.changePct);
  const weak = results.filter((r) => r.changePct < 0).sort((a, b) => a.changePct - b.changePct);

  // 물가 섹션 탭 = 강세 top3 중 물가 데이터가 있는 나라
  const cities = {};
  for (const r of strong.slice(0, 3)) {
    const p = priceInfo(r.code);
    if (!p) continue;
    cities[r.code] = {
      name: r.name,
      label: r.name,
      bigmac: p.bigmac,
      cola: p.cola,
      water: p.water,
      fx: `${r.changePct >= 0 ? "▲" : "▼"} ${Math.abs(r.changePct).toFixed(1)}%`,
      savePct: p.savePct,
    };
  }

  return {
    currentDate,
    strong: strong.slice(0, 3).map(toCard),
    weak: weak.slice(0, 3).map(toCard),
    cities,
    seoul: SEOUL_PRICE,
  };
}

// ---------- 하루 1회 캐시 ----------
let cache = null; // { ymd, data }
let inflight = null;
function getRanking() {
  const ymd = fmtDate(new Date());
  if (cache && cache.ymd === ymd) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = buildRanking()
    .then((data) => {
      cache = { ymd, data };
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

// ---------- 프록시(과거 호환용, 물가 단계에서도 사용) ----------
function proxyExchangeRates(dateStr, res) {
  const apiUrl = `${EXIM_API_URL}?authkey=${EXIM_AUTH_KEY}&searchdate=${dateStr}&data=AP01`;
  https
    .get(apiUrl, (apiRes) => {
      let body = "";
      apiRes.on("data", (c) => (body += c));
      apiRes.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(body);
      });
    })
    .on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "환율 API 호출 실패", detail: err.message }));
    });
}

// ---------- 정적 파일 ----------
function serveStaticFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.join(ROOT_DIR, safePath);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("파일을 찾을 수 없습니다.");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/ranking") {
    getRanking()
      .then((data) => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(data));
      })
      .catch((err) => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "랭킹 계산 실패", detail: String((err && err.message) || err) }));
      });
    return;
  }

  if (url.pathname === "/api/rates") {
    const dateStr = url.searchParams.get("date");
    if (!dateStr) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "date 파라미터가 필요합니다." }));
      return;
    }
    proxyExchangeRates(dateStr, res);
    return;
  }

  // config.js 등 서버 전용 파일은 브라우저에 절대 내려주지 않는다.
  if (url.pathname.startsWith("/config")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveStaticFile(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  // 시작 시 랭킹 캐시 예열 (실패해도 요청 시 재시도)
  getRanking()
    .then(() => console.log("랭킹 캐시 준비 완료"))
    .catch((e) => console.log("랭킹 예열 실패(요청 시 재시도):", e.message));
});
