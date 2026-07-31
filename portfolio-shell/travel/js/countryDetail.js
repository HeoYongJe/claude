// 나라 상세뷰용 큐레이션 데이터 (환율·물가는 실데이터, 도시·먹거리·꿀팁은 API로 못 받아 여기서 관리).
// 나라 추가 = 아래 객체에 "국가코드(소문자)" 항목 하나만 붙이면 된다.
//   cities: 추천 도시 3개 { name, index, img? } — index는 서울 대비 대표 물가지수(%), 음수=저렴 (실측 아닌 대표값)
//            img(선택): 도시 사진 경로. 예) img: "assets/cities/tokyo.jpg" (파일을 travel/assets/cities/에 올리면 표시,
//            없거나 로드 실패 시 그라데이션 폴백). 외부 URL도 가능하나 끊길 수 있어 로컬 파일 권장.
//   foods : 대표 먹거리 3개 { name, price, icon } — price는 대략 가격(원 근사), icon은 이모지(교체 가능)
//   tips  : 여행 꿀팁 3개  { cat, title, text } — cat이 아이콘 매핑 키(main.js TIP_ICONS)
const COUNTRY_DETAIL = {
  jp: {
    cities: [{ name: "도쿄", index: -14 }, { name: "오사카", index: -18 }, { name: "후쿠오카", index: -20 }],
    foods: [{ name: "스시", price: 12000, icon: "🍣" }, { name: "라멘", price: 8500, icon: "🍜" }, { name: "규카츠", price: 14000, icon: "🥩" }],
    tips: [
      { cat: "환전", title: "환전", text: "현금은 절반만, 나머지는 IC카드(스이카)로." },
      { cat: "교통", title: "교통", text: "JR·지하철은 패스 활용 시 교통비 크게 절약." },
      { cat: "쇼핑", title: "쇼핑", text: "돈키호테 면세 10% + 여권 지참 시 추가 할인." },
    ],
  },
  vn: {
    cities: [{ name: "다낭", index: -45 }, { name: "하노이", index: -48 }, { name: "호치민", index: -43 }],
    foods: [{ name: "쌀국수", price: 3000, icon: "🍜" }, { name: "반미", price: 2500, icon: "🥖" }, { name: "분짜", price: 4000, icon: "🍢" }],
    tips: [
      { cat: "환전", title: "환전", text: "달러 환전 후 현지 금은방 환전이 환율 유리." },
      { cat: "교통", title: "교통", text: "그랩(Grab) 앱으로 택시·오토바이 정찰제 이용." },
      { cat: "소매치기", title: "소매치기", text: "오토바이 날치기 주의 — 가방은 안쪽으로." },
    ],
  },
  th: {
    cities: [{ name: "방콕", index: -38 }, { name: "치앙마이", index: -44 }, { name: "푸껫", index: -30 }],
    foods: [{ name: "팟타이", price: 3500, icon: "🍜" }, { name: "똠얌꿍", price: 6000, icon: "🍲" }, { name: "망고밥", price: 4000, icon: "🥭" }],
    tips: [
      { cat: "환전", title: "환전", text: "슈퍼리치·현지 환전소가 공항보다 환율 좋음." },
      { cat: "교통", title: "교통", text: "BTS·MRT + 그랩 조합. 툭툭은 흥정 필수." },
      { cat: "쇼핑", title: "쇼핑", text: "야시장 흥정은 부르는 값의 절반부터 시작." },
    ],
  },
  tw: {
    cities: [{ name: "타이베이", index: -22 }, { name: "가오슝", index: -28 }, { name: "타이중", index: -26 }],
    foods: [{ name: "우육면", price: 6000, icon: "🍜" }, { name: "샤오롱바오", price: 7000, icon: "🥟" }, { name: "버블티", price: 3000, icon: "🧋" }],
    tips: [
      { cat: "교통", title: "교통", text: "이지카드(悠遊卡) 하나로 지하철·버스·편의점." },
      { cat: "야시장", title: "야시장", text: "스린·라오허 야시장에서 한 끼 저렴하게." },
      { cat: "환전", title: "환전", text: "공항보다 시내 은행 환율이 유리." },
    ],
  },
  ph: {
    cities: [{ name: "세부", index: -40 }, { name: "마닐라", index: -36 }, { name: "보라카이", index: -28 }],
    foods: [{ name: "아도보", price: 4500, icon: "🍗" }, { name: "레촌", price: 7000, icon: "🐷" }, { name: "할로할로", price: 3500, icon: "🍧" }],
    tips: [
      { cat: "환전", title: "환전", text: "달러로 가져가 현지 환전이 원화 직환전보다 유리." },
      { cat: "교통", title: "교통", text: "그랩 이용, 지프니는 현지인과 함께일 때만." },
      { cat: "안전", title: "안전", text: "야간 이동은 그랩으로, 인적 드문 곳 피하기." },
    ],
  },
  id: {
    cities: [{ name: "발리", index: -32 }, { name: "자카르타", index: -35 }, { name: "족자카르타", index: -42 }],
    foods: [{ name: "나시고렝", price: 4000, icon: "🍚" }, { name: "사테", price: 5000, icon: "🍢" }, { name: "미고렝", price: 3500, icon: "🍜" }],
    tips: [
      { cat: "환전", title: "환전", text: "공식 환전소(PVA 인증) 이용, 노점 환전 사기 주의." },
      { cat: "교통", title: "교통", text: "고젝·그랩 앱으로 오토바이 택시 저렴하게." },
      { cat: "문화", title: "매너", text: "사원 방문 시 사롱·어깨 가리개 착용." },
    ],
  },
  sg: {
    cities: [{ name: "싱가포르", index: 12 }, { name: "센토사", index: 18 }, { name: "오차드", index: 15 }],
    foods: [{ name: "치킨라이스", price: 6000, icon: "🍚" }, { name: "칠리크랩", price: 45000, icon: "🦀" }, { name: "락사", price: 7000, icon: "🍜" }],
    tips: [
      { cat: "호커센터", title: "호커센터", text: "호커센터는 물가 높은 싱가포르에서 가성비 최고." },
      { cat: "교통", title: "교통", text: "EZ-Link 카드로 MRT·버스, 도보 이동도 편리." },
      { cat: "벌금", title: "벌금", text: "지하철 취식·껌·무단횡단 벌금 주의." },
    ],
  },
  hk: {
    cities: [{ name: "홍콩섬", index: 4 }, { name: "구룡", index: -2 }, { name: "마카오", index: -6 }],
    foods: [{ name: "딤섬", price: 9000, icon: "🥟" }, { name: "완탕면", price: 7000, icon: "🍜" }, { name: "에그타르트", price: 2500, icon: "🥧" }],
    tips: [
      { cat: "교통", title: "교통", text: "옥토퍼스 카드로 MTR·트램·페리·편의점 결제." },
      { cat: "차찬텡", title: "차찬텡", text: "현지 차찬텡(홍콩식 분식)이 저렴하고 든든." },
      { cat: "쇼핑", title: "쇼핑", text: "몽콕 야시장 흥정, 명품은 세금 없어 유리." },
    ],
  },
  cn: {
    cities: [{ name: "상하이", index: -8 }, { name: "베이징", index: -12 }, { name: "청두", index: -22 }],
    foods: [{ name: "훠궈", price: 12000, icon: "🍲" }, { name: "샤오롱바오", price: 6000, icon: "🥟" }, { name: "베이징덕", price: 20000, icon: "🦆" }],
    tips: [
      { cat: "결제", title: "결제", text: "알리페이·위챗페이 필수(외국인 카드 등록 가능)." },
      { cat: "VPN", title: "VPN", text: "구글·인스타 차단 — 로밍 또는 VPN 미리 준비." },
      { cat: "교통", title: "교통", text: "디디(DiDi) 앱으로 택시, 고속철(가오톄) 편리." },
    ],
  },
  my: {
    cities: [{ name: "쿠알라룸푸르", index: -30 }, { name: "코타키나발루", index: -34 }, { name: "페낭", index: -36 }],
    foods: [{ name: "나시르막", price: 3500, icon: "🍚" }, { name: "락사", price: 5000, icon: "🍜" }, { name: "사테", price: 4500, icon: "🍢" }],
    tips: [
      { cat: "환전", title: "환전", text: "시내 몰 환전소(Money Changer)가 환율 좋음." },
      { cat: "교통", title: "교통", text: "그랩 저렴, KL은 LRT·모노레일도 편리." },
      { cat: "문화", title: "매너", text: "이슬람 문화권 — 사원 방문 복장 유의." },
    ],
  },
  tr: {
    cities: [{ name: "이스탄불", index: -24 }, { name: "카파도키아", index: -30 }, { name: "안탈리아", index: -28 }],
    foods: [{ name: "케밥", price: 6000, icon: "🥙" }, { name: "고등어케밥", price: 5000, icon: "🐟" }, { name: "바클라바", price: 4000, icon: "🍯" }],
    tips: [
      { cat: "환전", title: "환전", text: "리라 변동 커 — 소액씩, 현지 환전소 이용." },
      { cat: "교통", title: "교통", text: "이스탄불카드로 트램·페리·버스 통합 이용." },
      { cat: "흥정", title: "흥정", text: "그랜드바자르는 흥정 필수, 절반부터 시작." },
    ],
  },
  ch: {
    cities: [{ name: "취리히", index: 34 }, { name: "인터라켄", index: 30 }, { name: "루체른", index: 28 }],
    foods: [{ name: "퐁뒤", price: 35000, icon: "🫕" }, { name: "뢰스티", price: 22000, icon: "🥔" }, { name: "라클렛", price: 30000, icon: "🧀" }],
    tips: [
      { cat: "교통", title: "교통", text: "스위스트래블패스로 기차·버스·유람선 무제한." },
      { cat: "물가", title: "식비", text: "물가 최상위 — 마트(쿱·미그로) 조리식으로 절약." },
      { cat: "카드", title: "카드", text: "대부분 카드 결제, 소액 현금만 준비." },
    ],
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = COUNTRY_DETAIL;
