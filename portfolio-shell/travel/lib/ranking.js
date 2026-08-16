// 환율·물가 랭킹 계산 로직 (server.js 로컬 개발 / Vercel api/ranking.js 배포 공용).
//
// 왜 서버가 계산하나:
// - 수출입은행 API는 CORS 미허용 + 인증키를 브라우저에 두면 노출됨 → 프록시 필수.
// - "최근 3개월 최저 / 한 달 변동률 / 스파크라인"은 과거 여러 날짜를 조회해야 하는데,
//   브라우저에서 매번 수십 번 호출하면 느리고 낭비. 서버가 하루 1회 모아 계산해 캐시한다.

const https = require("https");
const path = require("path");
const { EXIM_AUTH_KEY, KOTRA_SERVICE_KEY } = require("./config");
const COUNTRIES = require(path.join(__dirname, "..", "js", "currencyCountryMap.js"));

const EXIM_API_URL = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
const KOTRA_API_URL = "https://apis.data.go.kr/B410001/priceInfoByNatn/priceInfoByNatn";
// KOTRA 물가 기준순번: 1=빅맥, 6=생수 500ml, 7=코카콜라 500ml. 가격은 USD.
const PRICE_SEQ = { bigmac: 1, water: 6, cola: 7 };
// 서울(한국) 기준가(원). KOTRA에 한국이 없어 상수로 유지.
const SEOUL_PRICE = { bigmac: 5500, cola: 2000, water: 1000 };

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
    const retry = () => (attempt < 2 ? resolve(fetchRatesForDate(dateStr, attempt + 1)) : resolve([]));
    const req = https.get(url, (r) => {
      if (r.statusCode !== 200) {
        r.resume();
        return retry();
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
    });
    req.on("error", retry);
    req.setTimeout(7000, () => req.destroy(new Error("timeout"))); // 행 방지: 7s 넘으면 끊고 재시도
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
    const retry = () => (attempt < 2 ? resolve(fetchKotraPrices(seq, attempt + 1)) : resolve({}));
    const req = https.get(url, (r) => {
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
    });
    req.on("error", retry);
    req.setTimeout(8000, () => req.destroy(new Error("timeout"))); // 행 방지
  });
}

// ---------- ECB(Frankfurter) 보충 소스 ----------
// 수출입은행 AP01이 안 주는 통화를 ECB 크로스레이트(KRW 기준)로 보충한다. 무료·과거 시계열 지원.
// key = ISO4217, value = 화면용 국가정보. (VND·TWD는 ECB에도 없어 제외)
const ECB_COUNTRIES = {
  PHP: { country: "필리핀", code: "ph", unit: "페소" },
  TRY: { country: "튀르키예", code: "tr", unit: "리라" },
  MXN: { country: "멕시코", code: "mx", unit: "페소" },
  INR: { country: "인도", code: "in", unit: "루피" },
  BRL: { country: "브라질", code: "br", unit: "헤알" },
  ZAR: { country: "남아프리카공화국", code: "za", unit: "랜드" },
  PLN: { country: "폴란드", code: "pl", unit: "즈워티" },
  CZK: { country: "체코", code: "cz", unit: "코루나" },
  HUF: { country: "헝가리", code: "hu", unit: "포린트" },
  ILS: { country: "이스라엘", code: "il", unit: "셰켈" },
  RON: { country: "루마니아", code: "ro", unit: "레우" },
};

// 기간 범위 크로스레이트: { "YYYY-MM-DD": { ISO: (1 KRW 당 외화) } }
function fetchEcbRange(startD, endD, symbols, attempt = 0) {
  return new Promise((resolve) => {
    const url = `https://api.frankfurter.dev/v1/${startD}..${endD}?base=KRW&symbols=${symbols}`;
    // 재시도는 짧은 백오프 후(즉시 재시도 대신) — Vercel 콜드스타트/일시 지연 대응. 최대 3회.
    const retry = () => (attempt < 3
      ? setTimeout(() => resolve(fetchEcbRange(startD, endD, symbols, attempt + 1)), 400 * (attempt + 1))
      : resolve({}));
    const req = https.get(url, (r) => {
      if (r.statusCode !== 200) {
        r.resume();
        return retry();
      }
      let body = "";
      r.on("data", (c) => (body += c));
      r.on("end", () => {
        try {
          const j = JSON.parse(body);
          resolve(j && j.rates ? j.rates : {});
        } catch (e) {
          resolve({});
        }
      });
    });
    req.on("error", retry);
    req.setTimeout(8000, () => req.destroy(new Error("timeout"))); // 행 방지(서버리스 함수 제한 아래로 안전 마진)
  });
}

// series([{date:YYYYMMDD, rate: KRW per foreign}]) → 지표 계산(exim/ECB 공용)
function seriesMetrics(series, currentDate, meta, unitMult) {
  const current = series[series.length - 1].rate;
  const monthAgoTargetMs = parseYmd(currentDate) - 30 * 86400000;
  let monthAgo = series[0];
  let bestDiff = Infinity;
  for (const s of series) {
    const diff = Math.abs(parseYmd(s.date) - monthAgoTargetMs);
    if (diff < bestDiff) { bestDiff = diff; monthAgo = s; }
  }
  const changePct = ((monthAgo.rate - current) / monthAgo.rate) * 100;
  const rateVals = series.map((s) => s.rate);
  const minR = Math.min(...rateVals);
  const maxR = Math.max(...rateVals);
  const is3moLow = current <= minR + 1e-9;
  const n = series.length;
  const line = series
    .map((s, i) => {
      const x = ((i / (n - 1)) * 240).toFixed(0);
      const y = maxR === minR ? 24 : (4 + ((s.rate - minR) / (maxR - minR)) * 40).toFixed(0);
      return `${x},${y}`;
    })
    .join(" ");
  const mult = unitMult || 1;
  const foreignPer1000 = (1000 * mult) / current;
  const recv =
    foreignPer1000 >= 100
      ? `${Math.round(foreignPer1000).toLocaleString("ko-KR")}${meta.unit}`
      : `${foreignPer1000.toFixed(1)}${meta.unit}`;
  const krwPer = `${mult}${meta.unit} = ${current.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;
  return { code: meta.code, name: meta.country, changePct, current, is3moLow, line, rate: `1,000원 = ${recv}`, recv, krwPer };
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
    // 익숙한 시세 표기: "100엔 = 917.60원" / "1달러 = 1,350.5원" (current = multiplier단위당 원화)
    const krwPer = `${multiplier}${meta.unit} = ${current.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;

    results.push({
      code: meta.code,
      name: meta.country,
      changePct,
      current,
      is3moLow,
      line,
      rate: `1,000원 = ${recv}`,
      recv,
      krwPer,
    });
  }

  // ECB(Frankfurter) 보충: 수출입은행이 안 주는 통화를 KRW 크로스레이트로 추가.
  // 실패해도 exim 결과는 그대로 유지(try/catch).
  try {
    const endYmd = currentDate;
    const endD = `${endYmd.slice(0, 4)}-${endYmd.slice(4, 6)}-${endYmd.slice(6, 8)}`;
    const sd = new Date(parseYmd(endYmd) - 95 * 86400000);
    const startD = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`;
    const symbols = Object.keys(ECB_COUNTRIES).join(",");
    const ecbRates = await fetchEcbRange(startD, endD, symbols);
    const ecbDates = Object.keys(ecbRates).sort(); // 오래된→최신
    if (ecbDates.length >= 2) {
      const ecbCurrentYmd = ecbDates[ecbDates.length - 1].replace(/-/g, "");
      const existing = new Set(results.map((r) => r.code)); // exim이 이미 준 나라는 제외
      for (const [iso, meta] of Object.entries(ECB_COUNTRIES)) {
        if (existing.has(meta.code)) continue;
        const series = ecbDates
          .map((d) => ({ date: d.replace(/-/g, ""), v: ecbRates[d][iso] }))
          .filter((x) => typeof x.v === "number" && x.v > 0)
          .map((x) => ({ date: x.date, rate: 1 / x.v })); // KRW per foreign unit
        if (series.length < 2) continue;
        results.push(seriesMetrics(series, ecbCurrentYmd, meta, 1));
      }
    }
  } catch (e) {
    /* ECB 보충 실패는 무시 */
  }

  // 물가: KOTRA 3품목(USD)을 원화로 환산해 서울 대비 절약률 계산
  const usdKrw = points[points.length - 1].map["USD"] || null;
  // 순차 호출 (동시 호출 시 data.go.kr이 일부 실패함)
  const bigmacM = await fetchKotraPrices(PRICE_SEQ.bigmac);
  const waterM = await fetchKotraPrices(PRICE_SEQ.water);
  const colaM = await fetchKotraPrices(PRICE_SEQ.cola);
  // KOTRA(data.go.kr) 67개국 명단에 없어 물가가 비던 '인기 여행지'만 근사치(USD)로 수동 보강.
  // (값은 Numbeo 등 참고한 대략치 — 정밀 데이터 아님. 새 나라 추가 = 여기 한 줄.)
  const MANUAL_PRICES = {
    HK: { bigmac: 2.9, water: 0.8, cola: 1.3 }, // 홍콩
    PH: { bigmac: 2.7, water: 0.35, cola: 0.6 }, // 필리핀
  };
  for (const [iso, p] of Object.entries(MANUAL_PRICES)) {
    if (bigmacM[iso] == null) bigmacM[iso] = p.bigmac;
    if (waterM[iso] == null) waterM[iso] = p.water;
    if (colaM[iso] == null) colaM[iso] = p.cola;
  }
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
      krwPer: r.krwPer,
      is3moLow: r.is3moLow,
      changePct: Number(r.changePct.toFixed(1)),
      line: r.line,
      savePct: p ? p.savePct : null,
    };
  };

  // ── 결합 '이득' 점수: 원화 강세율(changePct) + 물가 이득(savePct) 가중합 ──
  // 둘 다 "원화 관점에서 얼마나 이득인가"를 %로 나타내므로 같은 방향으로 더한다.
  // 예) 튀르키예: 환율은 좋아도(+7%) 물가가 서울보다 68% 비싸(savePct≈-68) 점수가 크게 내려가 순위가 밀린다.
  //     일본처럼 환율도 괜찮고 물가도 싼(savePct+) 나라가 위로 온다. → 서비스 취지("지금 원화로 가장 이득인 여행지")에 부합.
  // 가중치는 아래 상수로 조정(현재 1:1).
  const FX_WEIGHT = 1;     // 환율 강세 가중치
  const PRICE_WEIGHT = 1;  // 물가(서울 대비 절약) 가중치
  results.forEach((r) => {
    const p = priceInfo(r.code);
    r._save = p ? p.savePct : null;
    r._score = FX_WEIGHT * r.changePct + PRICE_WEIGHT * (p ? p.savePct : 0);
  });

  // ★ 물가 데이터 있는 나라만 순위 집계 — 환율만으로는 '이득'을 판단할 수 없어 제외한다.
  //   (예전엔 물가 없는 나라를 0=중립으로 둬, 물가 미상 나라가 '물가 비쌈이 확인된' 나라보다 위에 오는 불공정이 있었음.)
  //   KOTRA 미수록 인기국(홍콩·필리핀)은 위 MANUAL_PRICES로 보강해 포함, 그 외(노르웨이·헝가리·EU 등)는 랭킹에서 빠짐.
  const ranked = results.filter((r) => r._save != null);
  // 탭 소속은 환율 부호(강세/약세)로 유지하되, 탭 안 순서·전체 랭킹은 결합 점수 내림차순.
  const strong = ranked.filter((r) => r.changePct > 0).sort((a, b) => b._score - a._score);
  const weak = ranked.filter((r) => r.changePct < 0).sort((a, b) => b._score - a._score);
  // 전체 랭킹: 환율+물가 결합 이득 내림차순.
  const allSorted = ranked.slice().sort((a, b) => b._score - a._score);

  // 물가 데이터: 전체 나라(데이터 있는) 모두 담는다 → 전체 국가 상세뷰 품목 막대·절약률용.
  const cities = {};
  const saveVals = [];
  for (const r of results) {
    const p = priceInfo(r.code);
    if (!p) continue;
    saveVals.push(p.savePct);
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
  const avgSave = saveVals.length ? Math.round(saveVals.reduce((a, b) => a + b, 0) / saveVals.length) : null;

  return {
    currentDate,
    strong: strong.slice(0, 3).map(toCard),
    weak: weak.slice(0, 3).map(toCard),
    all: allSorted.map(toCard), // 전체 국가 랭킹(순위=배열 순서)
    // 코드→카드 맵: '인기 여행지' 캐러셀 등에서 코드로 직접 조회용. 랭킹 제외국(유럽 등 물가 없음)도 포함(num은 순위 아님이라 null).
    byCode: Object.fromEntries(results.map((r) => { const c = toCard(r, 0); c.num = null; return [r.code, c]; })),
    counts: { tracked: ranked.length, strong: strong.length, weak: weak.length, avgSave },
    cities,
    seoul: SEOUL_PRICE,
  };
}

// ---------- 하루 1회 캐시 (서버 프로세스가 살아있는 동안, 콜드스타트마다 새로 생김) ----------
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

// 단일 날짜 원본 프록시 (레거시 /api/rates 용)
function fetchRawRatesJson(dateStr) {
  return new Promise((resolve, reject) => {
    const url = `${EXIM_API_URL}?authkey=${EXIM_AUTH_KEY}&searchdate=${dateStr}&data=AP01`;
    https
      .get(url, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

module.exports = { getRanking, fetchRawRatesJson };
