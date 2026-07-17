// 메인 화면 로직: 환율 데이터를 가져와서 국가 카드 그리드로 렌더링한다.

const COMPARE_DAYS_AGO = 30; // "N일 전" 비교 기준. 우선 1개월 전으로 고정.
const INITIAL_VISIBLE_COUNT = 5; // 처음에 보여줄 카드 개수. 나머지는 "더보기"로 노출.

const state = {
  rankingData: [],
  sortMode: "favorable", // "favorable" | "rising"
  expanded: false,
  currentDate: null,
  pastDate: null,
};

const cardGridEl = document.getElementById("cardGrid");
const statusMessageEl = document.getElementById("statusMessage");
const dateInfoEl = document.getElementById("dateInfo");
const sortFavorableBtn = document.getElementById("sortFavorableBtn");
const sortRisingBtn = document.getElementById("sortRisingBtn");
const showMoreBtn = document.getElementById("showMoreBtn");

async function loadTravelRanking() {
  showStatus("환율 정보를 불러오는 중입니다...");

  try {
    const today = new Date();
    const pastTarget = addDays(today, -COMPARE_DAYS_AGO);

    const [currentResult, pastResult] = await Promise.all([
      findLatestAvailableRates(today),
      findLatestAvailableRates(pastTarget),
    ]);

    state.currentDate = currentResult.date;
    state.pastDate = pastResult.date;
    state.rankingData = buildRankingData(currentResult.rates, pastResult.rates);

    if (state.rankingData.length === 0) {
      showStatus("표시할 수 있는 환율 데이터가 없습니다.");
      return;
    }

    hideStatus();
    renderDateInfo();
    renderCards();
  } catch (err) {
    console.error(err);
    showStatus("환율 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

// 두 시점의 환율 데이터를 통화 기준으로 매칭해서 변동률을 계산한다.
function buildRankingData(currentRates, pastRates) {
  const pastMap = new Map(pastRates.map((item) => [item.cur_unit, item]));
  const result = [];

  for (const cur of currentRates) {
    const countryInfo = CURRENCY_COUNTRY_MAP[cur.cur_unit];
    if (!countryInfo) continue; // 관심 여행지 목록에 없는 통화는 제외

    const pastItem = pastMap.get(cur.cur_unit);
    if (!pastItem) continue;

    const currentRate = parseRate(cur.deal_bas_r);
    const pastRate = parseRate(pastItem.deal_bas_r);
    if (currentRate === null || pastRate === null || pastRate === 0) continue;

    // deal_bas_r(원화 환산 매매기준율)이 하락했다는 건 원화가 그 통화 대비 강세가 됐다는 뜻.
    // 여행 경비가 원화 기준 싸지므로 changeRate가 음수일수록 "유리해진" 여행지.
    const changeRate = ((currentRate - pastRate) / pastRate) * 100;

    result.push({
      curUnit: cur.cur_unit,
      country: countryInfo.country,
      flag: countryInfo.flag,
      currentRate,
      changeRate,
    });
  }

  return result;
}

// API는 "1,320.50" 처럼 콤마 포함 문자열로 환율을 내려준다.
function parseRate(rateStr) {
  const num = Number(String(rateStr).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function getSortedData() {
  const data = [...state.rankingData];

  if (state.sortMode === "rising") {
    // 외화가 가장 많이 오른(= 원화 기준 가장 불리해진) 순. favorable과 항상 정반대 정렬이라
    // 데이터가 한쪽으로 쏠려 있어도(예: 전부 원화 강세) 두 탭이 다른 결과를 보여준다.
    return data.sort((a, b) => b.changeRate - a.changeRate);
  }

  // 기본: 환율 유리한 순 (원화 강세 폭이 큰 = changeRate가 작은(음수) 순)
  return data.sort((a, b) => a.changeRate - b.changeRate);
}

function renderCards() {
  const sorted = getSortedData();
  const visible = state.expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE_COUNT);

  cardGridEl.innerHTML = "";
  for (const item of visible) {
    cardGridEl.appendChild(createCard(item));
  }

  showMoreBtn.hidden = state.expanded || sorted.length <= INITIAL_VISIBLE_COUNT;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "country-card";
  card.dataset.curUnit = item.curUnit;

  const isFavorable = item.changeRate < 0;
  const arrow = isFavorable ? "▼" : "▲";
  const changeClass = isFavorable ? "favorable" : "unfavorable";

  card.innerHTML = `
    <div class="country-card__flag">${item.flag}</div>
    <h3 class="country-card__name">${item.country}</h3>
    <p class="country-card__rate">${item.currentRate.toLocaleString()}원</p>
    <p class="country-card__change ${changeClass}">
      ${arrow} ${Math.abs(item.changeRate).toFixed(2)}%
    </p>
  `;

  // 상세 화면은 다음 단계에서 구현 예정.
  card.addEventListener("click", () => {
    console.log(`상세 화면 예정: ${item.country} (${item.curUnit})`);
  });

  return card;
}

function renderDateInfo() {
  dateInfoEl.textContent = `${formatDisplayDate(state.currentDate)} 기준, ${formatDisplayDate(
    state.pastDate
  )} 대비 (일환율, 실시간 아님)`;
}

function formatDisplayDate(yyyymmdd) {
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}.${m}.${d}`;
}

function showStatus(message) {
  statusMessageEl.textContent = message;
  statusMessageEl.hidden = false;
}

function hideStatus() {
  statusMessageEl.hidden = true;
}

function setSortMode(mode) {
  state.sortMode = mode;
  state.expanded = false; // 탭을 바꾸면 다시 상위 5개국만 보여준다.
  sortFavorableBtn.classList.toggle("active", mode === "favorable");
  sortRisingBtn.classList.toggle("active", mode === "rising");
  renderCards();
}

sortFavorableBtn.addEventListener("click", () => setSortMode("favorable"));
sortRisingBtn.addEventListener("click", () => setSortMode("rising"));
showMoreBtn.addEventListener("click", () => {
  state.expanded = true;
  renderCards();
});

loadTravelRanking();
