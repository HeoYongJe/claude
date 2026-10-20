// 나라 상세뷰용 큐레이션 데이터 (환율·물가는 실데이터, 도시·먹거리·꿀팁은 API로 못 받아 여기서 관리).
// 나라 추가 = 아래 객체에 "국가코드(소문자)" 항목 하나만 붙이면 된다.
//   cities: 추천 도시 3개 { name, index, img? } — index는 서울 대비 대표 물가지수(%), 음수=저렴 (실측 아닌 대표값)
//            img(선택): 도시 사진 경로. 예) img: "assets/cities/tokyo.jpg" (파일을 travel/assets/cities/에 올리면 표시,
//            없거나 로드 실패 시 그라데이션 폴백). 외부 URL도 가능하나 끊길 수 있어 로컬 파일 권장.
//   foods : 대표 먹거리 3개 { name, desc, price } — desc는 한 줄 설명, price는 대략 가격(원 근사).
//           아이콘은 음식명 키워드로 자동 선택(main.js pickFoodIcon) — 이미지·이모지 준비 불필요.
//   tips  : 여행 꿀팁 3개  { cat, title, text } — cat이 아이콘 매핑 키(main.js TIP_ICONS)
const COUNTRY_DETAIL = {
  jp: {
    cities: [{ name: "도쿄", index: -14 }, { name: "오사카", index: -18 }, { name: "후쿠오카", index: -20 }],
    foods: [{ name: "스시", desc: "신선한 회 + 샤리 · 일본 대표", price: 12000 }, { name: "라멘", desc: "진한 국물 면요리 · 든든한 한 끼", price: 8500 }, { name: "규카츠", desc: "소고기 커틀릿 · 겉바속촉", price: 14000 }],
    tips: [
      { cat: "환전", title: "환전", text: "현금은 절반만, 나머지는 IC카드(스이카)로." },
      { cat: "교통", title: "교통", text: "JR·지하철은 패스 활용 시 교통비 크게 절약." },
      { cat: "쇼핑", title: "쇼핑", text: "돈키호테 면세 10% + 여권 지참 시 추가 할인." },
    ],
  },
  vn: {
    cities: [{ name: "다낭", index: -45 }, { name: "하노이", index: -48 }, { name: "호치민", index: -43 }],
    foods: [{ name: "쌀국수", desc: "소고기 육수 쌀국수 · 아침 대표", price: 3000 }, { name: "반미", desc: "바게트 샌드위치 · 길거리 대표", price: 2500 }, { name: "분짜", desc: "숯불 돼지구이 + 국수 · 하노이 명물", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "달러 환전 후 현지 금은방 환전이 환율 유리." },
      { cat: "교통", title: "교통", text: "그랩(Grab) 앱으로 택시·오토바이 정찰제 이용." },
      { cat: "소매치기", title: "소매치기", text: "오토바이 날치기 주의 — 가방은 안쪽으로." },
    ],
  },
  th: {
    cities: [{ name: "방콕", index: -38 }, { name: "치앙마이", index: -44 }, { name: "푸껫", index: -30 }],
    foods: [{ name: "팟타이", desc: "새콤달콤 볶음 쌀국수 · 길거리 대표", price: 3500 }, { name: "똠얌꿍", desc: "매콤새콤 새우 수프 · 태국 3대 국물", price: 6000 }, { name: "망고밥", desc: "망고 + 코코넛 찰밥 · 대표 디저트", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "슈퍼리치·현지 환전소가 공항보다 환율 좋음." },
      { cat: "교통", title: "교통", text: "BTS·MRT + 그랩 조합. 툭툭은 흥정 필수." },
      { cat: "쇼핑", title: "쇼핑", text: "야시장 흥정은 부르는 값의 절반부터 시작." },
    ],
  },
  tw: {
    cities: [{ name: "타이베이", index: -22 }, { name: "가오슝", index: -28 }, { name: "타이중", index: -26 }],
    foods: [{ name: "우육면", desc: "소고기 국수 · 대만 국민 면", price: 6000 }, { name: "샤오롱바오", desc: "육즙 만두 · 딤섬 대표", price: 7000 }, { name: "버블티", desc: "타피오카 밀크티 · 원조 대만", price: 3000 }],
    tips: [
      { cat: "교통", title: "교통", text: "이지카드(悠遊卡) 하나로 지하철·버스·편의점." },
      { cat: "야시장", title: "야시장", text: "스린·라오허 야시장에서 한 끼 저렴하게." },
      { cat: "환전", title: "환전", text: "공항보다 시내 은행 환율이 유리." },
    ],
  },
  ph: {
    cities: [{ name: "세부", index: -40 }, { name: "마닐라", index: -36 }, { name: "보라카이", index: -28 }],
    foods: [{ name: "아도보", desc: "간장식초 조림 · 필리핀 국민 음식", price: 4500 }, { name: "레촌", desc: "통돼지 바비큐 · 잔치 음식", price: 7000 }, { name: "할로할로", desc: "빙수 디저트 · 여름 대표", price: 3500 }],
    tips: [
      { cat: "환전", title: "환전", text: "달러로 가져가 현지 환전이 원화 직환전보다 유리." },
      { cat: "교통", title: "교통", text: "그랩 이용, 지프니는 현지인과 함께일 때만." },
      { cat: "안전", title: "안전", text: "야간 이동은 그랩으로, 인적 드문 곳 피하기." },
    ],
  },
  id: {
    cities: [{ name: "발리", index: -32 }, { name: "자카르타", index: -35 }, { name: "족자카르타", index: -42 }],
    foods: [{ name: "나시고렝", desc: "볶음밥 · 대표 길거리 음식", price: 4000 }, { name: "사테", desc: "꼬치 구이 · 땅콩 소스", price: 5000 }, { name: "미고렝", desc: "볶음 국수 · 매콤달콤", price: 3500 }],
    tips: [
      { cat: "환전", title: "환전", text: "공식 환전소(PVA 인증) 이용, 노점 환전 사기 주의." },
      { cat: "교통", title: "교통", text: "고젝·그랩 앱으로 오토바이 택시 저렴하게." },
      { cat: "문화", title: "매너", text: "사원 방문 시 사롱·어깨 가리개 착용." },
    ],
  },
  sg: {
    cities: [{ name: "싱가포르", index: 12 }, { name: "센토사", index: 18 }, { name: "오차드", index: 15 }],
    foods: [{ name: "치킨라이스", desc: "닭육수 밥 + 삶은닭 · 국민 한 끼", price: 6000 }, { name: "칠리크랩", desc: "칠리소스 게 요리 · 대표 진미", price: 45000 }, { name: "락사", desc: "코코넛 커리 국수 · 매콤", price: 7000 }],
    tips: [
      { cat: "호커센터", title: "호커센터", text: "호커센터는 물가 높은 싱가포르에서 가성비 최고." },
      { cat: "교통", title: "교통", text: "EZ-Link 카드로 MRT·버스, 도보 이동도 편리." },
      { cat: "벌금", title: "벌금", text: "지하철 취식·껌·무단횡단 벌금 주의." },
    ],
  },
  hk: {
    cities: [{ name: "홍콩섬", index: 4 }, { name: "구룡", index: -2 }, { name: "마카오", index: -6 }],
    foods: [{ name: "딤섬", desc: "한입 만두·점심 · 얌차 문화", price: 9000 }, { name: "완탕면", desc: "새우 완탕 + 국수 · 든든", price: 7000 }, { name: "에그타르트", desc: "바삭 커스터드 타르트 · 디저트", price: 2500 }],
    tips: [
      { cat: "교통", title: "교통", text: "옥토퍼스 카드로 MTR·트램·페리·편의점 결제." },
      { cat: "차찬텡", title: "차찬텡", text: "현지 차찬텡(홍콩식 분식)이 저렴하고 든든." },
      { cat: "쇼핑", title: "쇼핑", text: "몽콕 야시장 흥정, 명품은 세금 없어 유리." },
    ],
  },
  cn: {
    cities: [{ name: "상하이", index: -8 }, { name: "베이징", index: -12 }, { name: "청두", index: -22 }],
    foods: [{ name: "훠궈", desc: "얼얼한 마라 샤브샤브 · 쓰촨", price: 12000 }, { name: "샤오롱바오", desc: "육즙 소룡포 · 상하이 대표", price: 6000 }, { name: "베이징덕", desc: "바삭 오리구이 · 베이징 명물", price: 20000 }],
    tips: [
      { cat: "결제", title: "결제", text: "알리페이·위챗페이 필수(외국인 카드 등록 가능)." },
      { cat: "VPN", title: "VPN", text: "구글·인스타 차단 — 로밍 또는 VPN 미리 준비." },
      { cat: "교통", title: "교통", text: "디디(DiDi) 앱으로 택시, 고속철(가오톄) 편리." },
    ],
  },
  my: {
    cities: [{ name: "쿠알라룸푸르", index: -30 }, { name: "코타키나발루", index: -34 }, { name: "페낭", index: -36 }],
    foods: [{ name: "나시르막", desc: "코코넛밥 + 삼발 · 국민 아침", price: 3500 }, { name: "락사", desc: "매콤 커리 국수 · 페낭 명물", price: 5000 }, { name: "사테", desc: "꼬치 구이 · 땅콩 소스", price: 4500 }],
    tips: [
      { cat: "환전", title: "환전", text: "시내 몰 환전소(Money Changer)가 환율 좋음." },
      { cat: "교통", title: "교통", text: "그랩 저렴, KL은 LRT·모노레일도 편리." },
      { cat: "문화", title: "매너", text: "이슬람 문화권 — 사원 방문 복장 유의." },
    ],
  },
  tr: {
    cities: [{ name: "이스탄불", index: -24 }, { name: "카파도키아", index: -30 }, { name: "안탈리아", index: -28 }],
    foods: [{ name: "케밥", desc: "숯불 고기구이 · 터키 대표", price: 6000 }, { name: "고등어케밥", desc: "고등어 샌드위치 · 이스탄불 명물", price: 5000 }, { name: "바클라바", desc: "견과 시럽 페이스트리 · 디저트", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "리라 변동 커 — 소액씩, 현지 환전소 이용." },
      { cat: "교통", title: "교통", text: "이스탄불카드로 트램·페리·버스 통합 이용." },
      { cat: "흥정", title: "흥정", text: "그랜드바자르는 흥정 필수, 절반부터 시작." },
    ],
  },
  ch: {
    cities: [{ name: "취리히", index: 34 }, { name: "인터라켄", index: 30 }, { name: "루체른", index: 28 }],
    foods: [{ name: "퐁뒤", desc: "치즈 녹여 찍어먹기 · 겨울 대표", price: 35000 }, { name: "뢰스티", desc: "감자전 · 스위스 가정식", price: 22000 }, { name: "라클렛", desc: "녹인 치즈 + 감자 · 대표 요리", price: 30000 }],
    tips: [
      { cat: "교통", title: "교통", text: "스위스트래블패스로 기차·버스·유람선 무제한." },
      { cat: "물가", title: "식비", text: "물가 최상위 — 마트(쿱·미그로) 조리식으로 절약." },
      { cat: "카드", title: "카드", text: "대부분 카드 결제, 소액 현금만 준비." },
    ],
  },
  us: {
    cities: [{ name: "뉴욕", index: 34 }, { name: "로스앤젤레스", index: 24 }, { name: "라스베이거스", index: 18 }],
    foods: [{ name: "수제버거", desc: "두툼한 패티 · 미국 대표 한 끼", price: 15000 }, { name: "뉴욕 피자", desc: "큼직한 한 조각 · 길거리 대표", price: 6000 }, { name: "핫도그", desc: "노점 소시지 번 · 간편 한 끼", price: 4000 }],
    tips: [
      { cat: "문화", title: "팁", text: "식당·택시 팁 15~20% 별도, 계산서 확인." },
      { cat: "결제", title: "카드", text: "어디서나 카드·모바일 결제, 현금 거의 불필요." },
      { cat: "교통", title: "교통", text: "도시 간은 국내선·우버, 대중교통은 도시별 상이." },
    ],
  },
  eu: {
    cities: [{ name: "파리", index: 28 }, { name: "로마", index: 18 }, { name: "바르셀로나", index: 14 }],
    foods: [{ name: "크루아상", desc: "버터 페이스트리 · 아침 대표", price: 4000 }, { name: "파스타", desc: "이탈리아 대표 면요리", price: 14000 }, { name: "젤라또", desc: "이탈리아 아이스크림 · 디저트", price: 5000 }],
    tips: [
      { cat: "소매치기", title: "소매치기", text: "관광지·지하철 소매치기 주의, 가방은 앞으로." },
      { cat: "결제", title: "결제", text: "유로 소액 현금 + 카드 병행, 팁은 소액." },
      { cat: "교통", title: "교통", text: "도시 간 고속열차로 이동이 편리해요." },
    ],
  },
  gb: {
    cities: [{ name: "런던", index: 34 }, { name: "에든버러", index: 24 }, { name: "맨체스터", index: 20 }],
    foods: [{ name: "피시앤칩스", desc: "대구튀김 + 감자 · 국민 음식", price: 13000 }, { name: "잉글리시 브렉퍼스트", desc: "푸짐한 아침 정식", price: 15000 }, { name: "스콘", desc: "애프터눈 티 · 디저트", price: 5000 }],
    tips: [
      { cat: "교통", title: "교통", text: "오이스터 카드로 튜브·버스 통합, 좌측통행." },
      { cat: "결제", title: "카드", text: "컨택리스 카드 결제 보편, 현금 거의 불필요." },
      { cat: "문화", title: "매너", text: "줄서기 문화 철저, 펍은 카운터에서 주문." },
    ],
  },
  ca: {
    cities: [{ name: "밴쿠버", index: 24 }, { name: "토론토", index: 22 }, { name: "몬트리올", index: 18 }],
    foods: [{ name: "푸틴", desc: "감자튀김 + 그레이비·치즈 · 대표", price: 9000 }, { name: "메이플 팬케이크", desc: "메이플 시럽 · 아침 대표", price: 12000 }, { name: "스모크미트 샌드위치", desc: "몬트리올 명물", price: 13000 }],
    tips: [
      { cat: "문화", title: "팁", text: "식당 팁 15% 내외, 표시가에 세금 별도." },
      { cat: "교통", title: "교통", text: "도시 내 대중교통·우버, 도시 간 국내선." },
      { cat: "안전", title: "날씨", text: "겨울 혹한 대비 방한 필수, 실내외 온도차 큼." },
    ],
  },
  au: {
    cities: [{ name: "시드니", index: 30 }, { name: "멜버른", index: 26 }, { name: "골드코스트", index: 20 }],
    foods: [{ name: "미트파이", desc: "고기 파이 · 대표 간식", price: 7000 }, { name: "플랫화이트", desc: "호주식 커피", price: 5000 }, { name: "바라문디", desc: "생선 그릴 · 대표 해산물", price: 22000 }],
    tips: [
      { cat: "결제", title: "카드", text: "탭 결제 보편, 팁 문화는 거의 없음." },
      { cat: "교통", title: "교통", text: "오팔(Opal) 카드로 시드니 교통 통합." },
      { cat: "안전", title: "자외선", text: "자외선 강함 — 선크림·모자 필수." },
    ],
  },
  nz: {
    cities: [{ name: "오클랜드", index: 28 }, { name: "퀸스타운", index: 30 }, { name: "웰링턴", index: 24 }],
    foods: [{ name: "미트파이", desc: "고기 파이 · 국민 간식", price: 7000 }, { name: "피시앤칩스", desc: "해변 대표 한 끼", price: 12000 }, { name: "파블로바", desc: "머랭 디저트 · 국민 디저트", price: 6000 }],
    tips: [
      { cat: "안전", title: "자연", text: "트레킹·자연 관광 — 날씨 급변 대비 겉옷." },
      { cat: "교통", title: "교통", text: "렌터카 여행 보편, 좌측통행 주의." },
      { cat: "결제", title: "카드", text: "카드 결제 보편, 소액 현금만 준비." },
    ],
  },
  se: {
    cities: [{ name: "스톡홀름", index: 32 }, { name: "예테보리", index: 26 }, { name: "말뫼", index: 24 }],
    foods: [{ name: "스웨디시 미트볼", desc: "링곤베리 소스 · 대표 요리", price: 14000 }, { name: "그라브락스", desc: "절인 연어 · 대표 해산물", price: 16000 }, { name: "셈라", desc: "크림 카다멈 빵 · 디저트", price: 6000 }],
    tips: [
      { cat: "물가", title: "식비", text: "외식 비싸 — 마트·피카(카페)로 절약." },
      { cat: "결제", title: "카드", text: "거의 현금 없는 사회, 카드·스위시 필수." },
      { cat: "교통", title: "교통", text: "SL 카드로 스톡홀름 지하철·버스·페리." },
    ],
  },
  no: {
    cities: [{ name: "오슬로", index: 40 }, { name: "베르겐", index: 36 }, { name: "트롬쇠", index: 34 }],
    foods: [{ name: "연어 요리", desc: "노르웨이 연어 · 대표 해산물", price: 25000 }, { name: "시나몬 번", desc: "스칸디 디저트 빵", price: 6000 }, { name: "브루노스트", desc: "갈색 치즈 · 특산 먹거리", price: 8000 }],
    tips: [
      { cat: "물가", title: "물가", text: "세계 최고 물가 — 마트 조리·도시락 절약." },
      { cat: "안전", title: "자연", text: "피오르·오로라 — 방한·우천 대비 철저." },
      { cat: "결제", title: "카드", text: "카드 결제 보편, 현금 거의 불필요." },
    ],
  },
  dk: {
    cities: [{ name: "코펜하겐", index: 34 }, { name: "오르후스", index: 28 }, { name: "오덴세", index: 26 }],
    foods: [{ name: "스뫼레브뢰드", desc: "오픈 샌드위치 · 대표 한 끼", price: 14000 }, { name: "데니시 페이스트리", desc: "덴마크 빵 · 디저트", price: 5000 }, { name: "프리카델러", desc: "덴마크식 미트볼", price: 13000 }],
    tips: [
      { cat: "교통", title: "교통", text: "자전거 천국 — 자전거 대여로 도심 이동." },
      { cat: "결제", title: "카드", text: "카드·모바일 결제 보편, 팁 불필요." },
      { cat: "물가", title: "식비", text: "외식비 높음 — 마트·베이커리 활용." },
    ],
  },
  mx: {
    cities: [{ name: "칸쿤", index: -12 }, { name: "멕시코시티", index: -25 }, { name: "과달라하라", index: -30 }],
    foods: [{ name: "타코", desc: "또띠아 + 고기 · 대표 길거리", price: 3000 }, { name: "부리토", desc: "또띠아 랩 · 든든한 한 끼", price: 5000 }, { name: "과카몰레", desc: "아보카도 딥 · 대표 사이드", price: 4000 }],
    tips: [
      { cat: "소매치기", title: "치안", text: "야간 이동 자제, 우버 이용 권장." },
      { cat: "환전", title: "환전", text: "달러 가져가 현지 환전이 유리." },
      { cat: "먹거리", title: "길거리", text: "길거리 음식 저렴 — 마실 물은 생수만." },
    ],
  },
  in: {
    cities: [{ name: "델리", index: -35 }, { name: "뭄바이", index: -28 }, { name: "자이푸르", index: -45 }],
    foods: [{ name: "버터치킨", desc: "부드러운 커리 · 대표 요리", price: 8000 }, { name: "사모사", desc: "감자 튀김 만두 · 길거리 간식", price: 1500 }, { name: "마살라 도사", desc: "쌀 크레페 · 남인도 대표", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "공항보다 시내 환전소가 환율 유리." },
      { cat: "교통", title: "교통", text: "우버·올라 앱으로, 오토릭샤는 흥정 필수." },
      { cat: "안전", title: "위생", text: "생수만 마시고 길거리 음식은 익힌 것 위주로." },
    ],
  },
  br: {
    cities: [{ name: "리우데자네이루", index: -8 }, { name: "상파울루", index: -5 }, { name: "살바도르", index: -18 }],
    foods: [{ name: "슈하스코", desc: "숯불 바비큐 고기 · 대표", price: 20000 }, { name: "페이조아다", desc: "콩·돼지고기 스튜 · 국민 음식", price: 12000 }, { name: "브리가데이루", desc: "초콜릿 트러플 · 디저트", price: 3000 }],
    tips: [
      { cat: "소매치기", title: "치안", text: "야간·해변가 소지품 주의, 고가품 노출 자제." },
      { cat: "환전", title: "환전", text: "달러 가져가 현지 환전, 카드 병행." },
      { cat: "교통", title: "교통", text: "우버가 택시보다 안전·저렴." },
    ],
  },
  za: {
    cities: [{ name: "케이프타운", index: -20 }, { name: "요하네스버그", index: -25 }, { name: "더반", index: -28 }],
    foods: [{ name: "브라이", desc: "남아공식 숯불 바비큐 · 대표", price: 18000 }, { name: "보보티", desc: "다진고기 커스터드 구이 · 가정식", price: 13000 }, { name: "빌통", desc: "말린 소고기 육포 · 간식", price: 6000 }],
    tips: [
      { cat: "안전", title: "치안", text: "야간 도보 이동 자제, 렌터카·투어 위주로." },
      { cat: "교통", title: "교통", text: "렌터카 여행 보편, 좌측통행 주의." },
      { cat: "문화", title: "사파리", text: "사파리는 예약 필수, 이른 아침이 명당." },
    ],
  },
  pl: {
    cities: [{ name: "바르샤바", index: -18 }, { name: "크라쿠프", index: -25 }, { name: "그단스크", index: -22 }],
    foods: [{ name: "피에로기", desc: "속 채운 만두 · 국민 음식", price: 7000 }, { name: "비고스", desc: "양배추·고기 스튜", price: 9000 }, { name: "폰치키", desc: "잼 도넛 · 디저트", price: 2500 }],
    tips: [
      { cat: "환전", title: "환전", text: "칸토르(환전소)가 공항보다 환율 유리." },
      { cat: "교통", title: "교통", text: "트램·버스 편리, 도시 간 열차도 저렴." },
      { cat: "카드", title: "결제", text: "카드 결제 보편, 소액 즈워티만 현금." },
    ],
  },
  cz: {
    cities: [{ name: "프라하", index: -12 }, { name: "체스키크룸로프", index: -20 }, { name: "브르노", index: -18 }],
    foods: [{ name: "굴라시", desc: "고기 스튜 · 대표(빵과 함께)", price: 11000 }, { name: "스비치코바", desc: "소고기 크림소스 · 가정식", price: 13000 }, { name: "트르델니크", desc: "구운 도넛 페이스트리 · 디저트", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "길거리 환전 사기 주의 — 공식 환전소 이용." },
      { cat: "물가", title: "식비", text: "맥주가 물보다 싼 편, 로컬 식당 가성비 좋음." },
      { cat: "교통", title: "교통", text: "프라하는 도보·트램으로 충분." },
    ],
  },
  hu: {
    cities: [{ name: "부다페스트", index: -15 }, { name: "데브레첸", index: -25 }, { name: "세게드", index: -22 }],
    foods: [{ name: "굴라시", desc: "파프리카 소고기 수프 · 국민 음식", price: 10000 }, { name: "랑고스", desc: "튀긴 감자빵 · 길거리 대표", price: 4000 }, { name: "도보스토르테", desc: "캐러멜 층 케이크 · 디저트", price: 5000 }],
    tips: [
      { cat: "문화", title: "온천", text: "세체니 등 온천 목욕은 부다페스트 명물." },
      { cat: "환전", title: "환전", text: "시내 환전소가 유리, 유로보다 포린트 현금." },
      { cat: "교통", title: "교통", text: "지하철·트램 편리, 도나우 유람선도 인기." },
    ],
  },
  il: {
    cities: [{ name: "예루살렘", index: 25 }, { name: "텔아비브", index: 35 }, { name: "하이파", index: 20 }],
    foods: [{ name: "후무스", desc: "병아리콩 딥 · 대표", price: 8000 }, { name: "팔라펠", desc: "병아리콩 튀김 · 길거리 대표", price: 6000 }, { name: "샥슈카", desc: "토마토 소스 달걀 · 아침 대표", price: 10000 }],
    tips: [
      { cat: "안전", title: "보안", text: "공항·명소 보안검색 엄격 — 시간 여유 두기." },
      { cat: "문화", title: "안식일", text: "금요일 저녁~토요일 상점·교통 상당수 중단." },
      { cat: "문화", title: "복장", text: "종교 유적 방문 시 노출 적은 복장." },
    ],
  },
  ro: {
    cities: [{ name: "부쿠레슈티", index: -30 }, { name: "브라쇼브", index: -35 }, { name: "시비우", index: -32 }],
    foods: [{ name: "미티테이", desc: "숯불 다진고기 소시지 · 대표", price: 7000 }, { name: "사르말레", desc: "양배추 고기말이 · 명절 음식", price: 9000 }, { name: "파파나시", desc: "치즈 도넛 · 디저트", price: 4000 }],
    tips: [
      { cat: "환전", title: "환전", text: "시내 환전소(casa de schimb) 이용, 레우 현금." },
      { cat: "교통", title: "교통", text: "도시 간 열차·버스, 트란실바니아는 렌터카 편리." },
      { cat: "문화", title: "관광", text: "브란성(드라큘라성)은 브라쇼브 근교." },
    ],
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = COUNTRY_DETAIL;
