// 환율 데이터 호출 담당
// - 하루 1회(영업일 오전 11시경) 갱신되는 "일환율"이라 실시간 환율이 아님
// - 주말/공휴일에 searchdate를 넣으면 빈 배열([])이 내려옴 -> 하루씩 앞당겨 재시도 필요
// - 수출입은행 API를 브라우저에서 직접 호출하면 CORS로 막히고 인증키도 노출되므로,
//   같은 출처인 서버의 /api/rates 프록시를 통해서만 호출한다. (server.js 참고)

const RATES_PROXY_URL = "/api/rates";

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 특정 날짜(YYYYMMDD)의 환율 데이터를 가져온다.
// 성공 데이터가 없는 날(주말/공휴일)이면 빈 배열을 반환한다.
async function fetchRatesForDate(dateStr) {
  const response = await fetch(`${RATES_PROXY_URL}?date=${dateStr}`);

  if (!response.ok) {
    throw new Error(`환율 API 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  // 정상 데이터는 각 항목의 result가 1. 그 외(빈 배열 포함)는 해당일 데이터 없음으로 처리.
  const validRates = Array.isArray(data) ? data.filter((item) => item.result === 1) : [];
  return validRates;
}

// startDate부터 최대 maxLookbackDays일 전까지 하루씩 앞당겨가며
// 데이터가 있는 가장 최근 영업일의 환율을 찾는다.
async function findLatestAvailableRates(startDate, maxLookbackDays = 10) {
  let cursor = new Date(startDate);

  for (let i = 0; i < maxLookbackDays; i++) {
    const dateStr = formatDateYYYYMMDD(cursor);
    const rates = await fetchRatesForDate(dateStr);

    if (rates.length > 0) {
      return { date: dateStr, rates };
    }

    cursor = addDays(cursor, -1);
  }

  throw new Error("최근 영업일 환율 데이터를 찾지 못했습니다.");
}
