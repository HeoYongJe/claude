# Design Guide — travel project

> 이 문서는 이 프로젝트의 디자인 기준이다.
> 모든 화면과 컴포넌트는 이 문서를 먼저 읽고 따른다. 규칙과 어긋나면 만들기 전에 멈추고 물어본다.

> **기준 문서:** `design_handoff_travel_web/README.md`(+ `Travel 웹화면.dc.html`)가 확정 하이파이 스펙이다.
> 이 프로젝트의 `index.html`/`css`/`js`는 그 핸드오프를 재현한 것이고, **이 design.md는 그 구현 상태와
> 일치하도록 유지한다**(2026-07-27 정합성 정리 완료). 세부 인터랙션은 핸드오프 README를 우선.

## 1. Overview
- 브랜드명: travel
- 한 문장: 전날 환율 + 현지 물가지수(빅맥·코카콜라·생수)로 "지금 원화로 가장 이득인 여행지"를 추천
- 무드: 절제 / 타입 중심 / 스크롤 인터랙션(관성·패럴럭스·항로 레일)
- 구성(원페이지): 히어로 → **서비스 소개("왜 필요?")** → 실시간 추천 랭킹(나라 클릭 시 상세뷰로 슬라이드 전환) → 푸터
  (2026-08-02: why 섹션을 히어로 바로 다음·랭킹 앞으로 이동 — "나라 하나 본 뒤 서비스 설명" 흐름 어색함 해소.
  구 "체감 물가"·"여정"·CTA 섹션은 제거됨.)

## 2. Colors
`css/style.css`의 `:root` 토큰이 단일 소스.

| 역할 | 토큰 | 값 |
|---|---|---|
| Primary(포인트) | `--primary` | `#0E4AEB` |
| Primary hover | `--primary-dark` | `#0b3bc0` |
| Secondary | — | `#06B6D4` (히어로 블롭 등 장식만) |
| Ink(제목·본문) | `--ink` | `#0F172A` |
| Muted | `--muted` | `#64748B` |
| Muted 2(더 옅은) | `--muted2` | `#94A3B8` |
| Surface(카드·띠) | `--surface` | `#F5F8FF` |
| Border(카드 경계) | `--border` / `--border-strong` | `#EEF1F6` / `#E2E8F0` |
| 오름(+,▲) 데이터 | — / tint | `#EF4444` / `#FEF2F2` |
| 내림(−,▼) 데이터 | — / tint | `#0E4AEB` / `#EAF1FF` |
| 파랑 섹션 위 서브텍스트 | — | `#BBD0FF` `#D6E2FF` `#E4ECFF` |

- **색 규칙(개정, 2026-08-02) — 방향 기준으로 전면 통일:**
  - **모든 증감 수치는 "좋다/나쁘다"가 아니라 방향(오름/내림)으로 색을 정한다.**
    **화면에 보이는 부호 기준: 오름(+, ▲) = 빨강 `#EF4444` / 내림(−, ▼) = 파랑 `#0E4AEB`.** 예외 없이 전 지표 동일.
    (예: 환율 ▲7.8%=빨강 / 체감물가 −49%=파랑 / 빅맥 +150%=빨강 / 스위스 물가 +100%=빨강. 구 규칙의 회색은 폐기.)
  - **"유리/이득" 같은 의미는 색이 아니라 텍스트 라벨로만** 표현(예: 탭 "원화 강세·유리", "환율 이득 N위", "서울 대비 체감 절약").
  - 구현: `main.js`의 **공통 함수 `dirColor(isUp)`/`dirTint(isUp)` 한 곳에서 관리**. 랭킹 뱃지·스파크·체감물가 pill·
    품목%·도시지수·히어로 뱃지·상세 대표숫자 전부 이 함수 사용. `isUp`은 화면 표기 부호 기준(savePct는 −표기라 `savePct<0`이 오름).
  - **예외: 파란 절약 카드 안 텍스트는 흰색 유지**(카드 자체가 파란 면) — 방향은 ±·▲▼ 기호로만 표현.
  - Primary 파랑은 이제 "내림" 데이터 색도 겸함. 구조 요소(브랜드·버튼·레일·진행바)에도 계속 사용.

## 3. Typography
- **폰트: Pretendard 하나만.** 위계는 크기·굵기로만.
- H1 64px / 800 / line-height 1.08 / -0.03em
- H2(섹션 제목) 40px / 800 / -0.02em
- 카드 제목 26px / 800 · 여정 패널 제목 34px / 800
- 본문 16–18px / Regular~600 / line-height 1.6
- 라벨(키커) 14px / 700 (Primary) · 작은 메타 13px / 700 (Muted)

## 4. Layout & Spacing
- 8px 그리드: 8 / 16 / 24 / 32 / 48 / 64 / 96
- 콘텐츠 최대 너비 **1080px**, 좌우 여백 24px, 카드 간격 24px.
  **모든 섹션이 동일 정렬선**: `.container`/`.nav__inner`/`.hero__grid`/`.rank__inner` 전부 `max-width:1080; margin:0 auto; padding:0 24px`.
  (2026-08-02: 이전엔 `.rank`가 섹션에 24px 패딩을 줘 why 대비 24px 어긋났음 → 좌우 패딩을 `.rank__inner`로 옮겨 통일.)
- **히어로만 `min-height:100vh`(풀스크린).** 콘텐츠 많은 섹션(랭킹·상세)은 100vh 강제 제거 →
  자연 높이 + 상하 패딩 ~96px(`.rank` `padding:96px 24px 88px`). 상단 여백 과다 문제 해결(2026-08-02).

## 5. Radius & Elevation
- **Radius:** 카드 20px · 큰 카드/패널 24px · 버튼 12–14px · pill 999px
  (구 문서의 "카드 22px / 버튼 pill"은 폐기 — 위 값이 실제 구현·핸드오프 기준)
- **Shadow:** 기본은 면·여백으로 구분. 히어로 환율 카드만 상시 그림자 `0 40px 80px -30px rgba(15,23,42,.28)`.
- **Hover lift(카드):** `0 24px 50px -24px rgba(15,23,42,.28)` + `translateY(-6px)` + 보더 → Primary.
- 라이트그레이 선으로 영역을 나누지 않는다. 박스 좌측 컬러 스트라이프 금지.

## 6. Fixed Elements (고정 요소)
1. **상단 진행 바** — `fixed; top:0; height:3px`, Primary 바가 스크롤 진행률 0→100%.
2. **네비** — `fixed; top:0`. **최상단(히어로 위)에서는 배경 없음(투명)**, 스크롤하면(`y>30`, main.js가 `.is-scrolled` 토글)
   반투명 흰 배경 `rgba(255,255,255,.72)` + `backdrop-filter:blur(14px)` + 하단 1px 경계가 `.3s`로 나타남.
   **요소 2개만**(좌우 양끝): 좌 브랜드 "travel"(클릭 시 맨 위로 스크롤, `.t-nav-brand`) / 우 "추천 랭킹" Primary 버튼(`.t-nav-rank`).
   "추천 랭킹" 버튼 = 랭킹 섹션으로 스크롤 + **상세뷰 열려 있으면 목록으로 복귀 겸함**(`goRank`). (구 "소개" 링크·"여행지 찾기" 버튼 제거.)
3. **우측 항로 레일** — `fixed; right:40px; top:92px`, 세로 점선(흐르는 dash) + Primary 실선 + 하강 비행기. z-index 45.
   **Hero~랭킹 섹션까지만 표시**: 랭킹 섹션을 지나거나 상세뷰가 열리면 render 루프에서 `opacity 0`으로 페이드(`.4s`) — 콘텐츠
   많은 구간에서 외로운 세로줄로 뜨는 문제 해결(2026-08-02).

## 7. Components (섹션별)
- **히어로:** 배경 = **루프 배경 영상**(`.hero__video` — 밝은 하늘 영상 `assets/hero/sky.mp4`, `object-fit:cover` +
  세로·가로 **흰색** 가독성 그라디언트 오버레이). `.hero`는 `relative`+`overflow:hidden`(배경 `#EBF1FC` 로드 폴백),
  콘텐츠(`.hero__grid`)는 `z-index:10`으로 영상 위에. 루프 경계 하드컷 방지용 진입/종료 **페이드**는 `main.js`
  `heroVideo()`가 `currentTime` 기준 rAF로 opacity 제어(FADE 0.5s).
  **밝은 영상이라 히어로 텍스트는 어두운색**: 제목 `#0F172A`(+흰 halo text-shadow), 강조어·eyebrow는 Primary,
  설명 `#334155`, SCROLL `--muted`, eyebrow는 반투명 흰 pill. nav·버튼은 원래 어두운 톤(흰 nav+어두운 글자 / primary·흰 버튼) 유지.
  환율 카드(`.t-fxcard`): **반투명 흰 배경 `rgba(255,255,255,.66)` + `backdrop-filter:blur(10px)`**(뒤 구름 영상이 은은히 비침, 가독성 유지),
  radius 24, 상시 그림자, "오늘의 추천" + 변동률 뱃지 + 국가명(국기) + 1,000원 환산 + 설명. **마우스 틸트(3D 뒤틀림) 제거**(부유 애니메이션만 유지).
  **카드 전체가 클릭 가능**(`.t-hero-card`, role=button) → 강세 1위 나라 상세뷰로 이동("클릭해서 상세 보기 →" 힌트).
  히어로 버튼은 **"추천 랭킹 보기" 1개**(Primary)만 — 랭킹으로 스크롤. (구 "내 여행지 찾기" 버튼 제거.)
  (영상 파일은 `deploy-tools/deploy-travel.js` FILES에 포함해 닷홈 `/travel/assets/hero/`로 업로드. **도트 지도/도트 배경(`.hero__map`·`.hero__dots`)은
  구름 영상과 안 어울려 제거**, blob 글로우만 잔존. 하단 SCROLL 텍스트는 스크롤 시작하면 `heroScrollEl`이 opacity로 스르륵 사라짐.)
  · **히어로 아래 섹션 배경:** 구름 히어로에서 흰색으로 뚝 끊기지 않게 `body`에 아주 연한 블루 세로 그라데이션
    (`#FFFFFF→#F1F6FF→#EAF1FF→#F4F8FF`). rank·why 섹션 배경은 `transparent`로 두어 흰 카드가 그 위로 떠 보이게 함.
- **랭킹(흰 배경):** 흰 카드 **3개 균등 그리드**(gap 24, radius 20, 보더 `--border`). 세그먼트 토글(강세·유리 / 약세·불리,
  Surface 컨테이너·활성=흰 pill+그림자). 카드 = 순위 + 변동률 뱃지 + 국가명 26/800(국기) + 환산 문구 + 미니 스파크라인
  + "체감물가 ±xx%" pill(부호 방향색: −=파랑/+=빨강) + "상세 보기 →". **카드 클릭 → 상세뷰로 슬라이드 전환**.
  · **대표 숫자 = 환율 변동 뱃지(▲/▼%, 방향색)**, 체감물가는 보조 pill. 물가가 비싼(savePct<0) 나라는 **"환율 유리·물가 높음" 경고(`.rc-warn`, 앰버)** 노출.
  · 요약 띠(Surface, 통계 3 + 버튼). 카운트(개국)는 중립색, "−28%"는 파랑(내림).
  · **스파크라인**: `.rc-line`을 대시로 감춰두고 **카드별 IntersectionObserver**(`sparkIO`, threshold .35)로 카드가
    화면에 들어올 때 dashoffset 0으로 그려짐. 토글 시 재렌더→재관찰로 다시 그려짐. (섹션 단위 트리거는 타이밍 취약해 폐기)
- **나라 상세뷰(`.t-detail`, 랭킹 안에서 전환):** **detail은 흰 면만** — Surface(#f5f8ff) 틴트 전부 제거,
  카드는 `.dcard`(흰 배경+보더). **유일한 컬러 면 = 파란 절약 카드**.
  · **상단(head): 좌 그룹(`.detail__headL`) = 국기+국가명+순위 뱃지(중립색) 위에 "전날 대비 환율 ▲/▼%"(`.detail__fx`, 방향색) 좌측 정렬 /
    우 "다른 나라 선택하기 →"만.** 순위 뱃지 중립 `#475569`/`#F1F5F9`.
    **"다른 나라 선택하기"는 전체 랭킹 팝업(`.t-modal`)을 연다**(리스트로 복귀 아님) — 상세를 보는 중 언제든 다른 나라로 전환.
  · **상세는 언제든 전환 가능**: `openDetail(d)`는 이미 열려 있으면 내용만 교체(팝업·히어로 카드에서 선택 시 바로 다른 나라로 바뀜).
  · **예상 절약/추가지출 라벨은 방향에 맞춤**: 쌈 → "예상 절약(추정) 약 N원" / 비쌈 → "예상 추가 지출(추정) 약 N원"(‘…원 더’ 같은 어긋난 문구 제거).
    설명문 조사도 받침 검사(`josaEunNeun`)로 "스위스는/일본은" 정확히.
  · **상세뷰 상단 여백 축소**: `.rank.is-detail { padding-top: 32px }`(리스트는 96px) — 헤더가 네비 바로 아래에서 시작.
  · **품목 막대 색**: 서울 막대=회색, **현지 막대는 방향색**(더 쌈=파랑 / 더 비쌈=빨강, `dirColor(pctNum>0)`) — 비싼 품목이 "이득"처럼 보이던 문제 해결.
  · **Row1 `1fr 300px`**: 좌 "주요 품목 체감 물가"(흰 카드 — 라인아이콘(빅맥=hamburger·콜라=cup-soda·생수=droplet, `ITEM_SVG`, Primary)
    + 이름 + [서울 회색막대/현지 파란막대 + 금액] + 큰 % 부호색)
    / 우 **파란 카드 = 물가 절약 지표 전용**(환율 표기 없음): 라벨 "서울 대비 체감 절약/물가 부담" + **대표(대형 44px) 숫자 = 절약률 `.d-index`%**
    + 설명 + 물가 비쌈 시 흰 톤 **경고 라벨**(`.d-savecard__warn`) + 1,000원 환산·예상절약(추정) 행. 카드 텍스트는 전부 흰색.
    (환율 변동은 head의 `.detail__fx`에서만 표시 — 카드에서 중복 제거.)
  · **Row2 `1fr 1fr`**: 추천 도시(라인 리스트) | 대표 먹거리(세로 리스트 행 — 카테고리 라인아이콘 + 한 줄 설명 + 가격).
    아이콘은 음식명(`f.name`) 키워드로 자동 선택(`main.js` `pickFoodIcon`/`FOOD_RULES`+`FOOD_SVG`), 색은 Primary.
    데이터는 `{ name, desc, price }`(name은 아이콘 매핑에만 쓰이고 행에는 desc·가격만 노출 — 번호/이름 표기는 제거됨).
  · **Row3 풀 너비**: 여행 꿀팁 3분할(세로 라인) + 모던 라인 SVG 아이콘(`TIP_SVG`+`CAT_ICON`).
  · 품목 막대는 서울 vs 현지 금액 비교 + 차오름 애니메이션. 전환: `.t-rankview.is-out` ↔ `.t-detail.is-in`, 연타 가드.
- **서비스 소개(why, 히어로 바로 다음·랭킹 앞):** "왜 이 서비스가 필요할까요?" + 3카드(환율만 보면 손해 / 체감 물가로 진짜 이득 /
  매일 갱신). Surface 카드 + 라인 아이콘. (2026-08-02 랭킹 뒤 → 랭킹 앞으로 이동.)
- **전체 랭킹 팝업(`.t-modal`):** "전체 랭킹 보기 →"(요약 띠)·"다른 나라 선택하기"(상세 head) 둘 다 이 팝업을 연다.
  **전체 국가를 환율 이득 순으로** 나열(API `all`) — 각 행 = 순위 + 국기 + 이름 + 1,000원 환산 + 환율변동 뱃지(방향색) + 체감물가.
  **모든 나라 클릭 → 해당 상세로 전환**(상세가 열려 있어도 `openDetail`이 내용만 교체). 오버레이·✕·Esc로 닫기.
  (API `all`/`counts` 없으면 강세+약세 top으로 폴백.)
- **기준일 표기(공통):** `main.js` `setBasis(currentDate)` 한 곳에서 랭킹 basis(`.t-rank-basis`)·푸터(`.foot-basis`)를 동시에 채움.
  실데이터(currentDate) 있으면 실제 기준일 표시, **"샘플" 문구는 사용 안 함**.

## 8. Motion
- 부드러운 스크롤: 스크롤 값을 lerp(0.09)로 보간하는 rAF 루프가 진행 바·패럴럭스·히어로 페이드·항로 레일 갱신.
- 로컬 패럴럭스: `[data-speed]` = `translateY(-(요소중심 - 뷰포트중심) * speed)`.
- 등장(통일): 아래→위 페이드업 `opacity 0→1, translateY 36→0, .7s cubic-bezier(.2,.7,.2,1)`, 카드 0/.1/.2s 스태거,
  `IntersectionObserver(threshold .15)` 1회. 대상은 `data-reveal`.
- 막대 폭 애니메이션 .9s · 부유 6s · 항로 dash 1.4s.
- 랭킹→상세뷰: 카드 클릭 → 랭킹 섹션 안에서 TOP3(`.t-rankview`)가 위로 사라지고 상세뷰(`.t-detail`)가 올라옴,
  섹션 배경 파랑→흰색 전환. "다른 나라 선택하기"로 역전환. (전환 .45~.5s, 연타 방지 타이머)

## 9. Responsive
- 단일 브레이크포인트 **900px**(`css/style.css`의 `@media (max-width:900px)`): 히어로/랭킹/why/상세뷰 그리드 1열,
  H1 44 · 섹션제목 30 · CTA 32.

## 10. States
- 로딩: 스켈레톤(카드 형태 유지). 데이터 로드 실패 시 카드에 "불러오지 못했어요".
- 빈 상태(예: 약세국 0개): Muted 톤 안내 문구만.
- 포커스: Primary 2px 아웃라인.

## 11. Icons & Data
- 국기: 실제 이미지(flagcdn SVG), 모서리 4~6px. (Windows 국기 이모지 미지원 → 이미지)
- 그 외 아이콘: 인라인 라인 SVG. 색은 라인(블랙) 또는 Primary만.
- **실데이터:** 전날 환율(수출입은행 API) + 물가(KOTRA API, 국가 단위 빅맥/콜라/생수)를 서버가 계산해 캐시.
  로직은 `lib/ranking.js`(로컬 `server.js` / Vercel `api/ranking.js` 공용). 닷홈은 정적이라 API는 Vercel 서버리스로 분리.
  **API 응답:** `strong`/`weak`(top3) + **`all`(전체 국가 랭킹, 환율이득 내림차순)** + **`counts`{tracked,strong,weak,avgSave}**
  + `cities`(**전체 국가** 물가데이터 — 어느 나라 상세든 품목 막대·절약률 표시) + `seoul`. 요약 스탯은 `counts`/`all`로 실시간 채움(하드코딩 제거).
  **환율 소스 2개 혼용**: ①주력 **수출입은행**(AP01, 공식) ②보충 **ECB(Frankfurter, `api.frankfurter.dev`)** — KRW 크로스레이트·과거 시계열 무료.
  exim이 안 주는 통화를 ECB로 채워 **현재 ~28개국**(ECB 추가분: 필리핀·튀르키예·멕시코·인도·브라질·남아공·폴란드·체코·헝가리·이스라엘·루마니아).
  `lib/ranking.js` `ECB_COUNTRIES` 맵 + `fetchEcbRange()` + `seriesMetrics()`(exim/ECB 공용 지표). exim 우선(중복 code는 ECB 건너뜀).
  ⚠️ **베트남·대만(VND·TWD)은 ECB에도 없고 무료 과거데이터 소스가 없어 여전히 제외** — 큐레이션 전용. (넣으려면 유료/타 환율 API 필요.)
  ⚠️ **API(lib/api) 변경 시 Vercel 재배포 필요**: `cd portfolio-shell/travel && npx vercel --prod`(CLI 로그인·프로젝트 링크 상태, 인증키는 Vercel 환경변수).
- **큐레이션 데이터:** 상세뷰의 **추천 도시·대표 먹거리·꿀팁은 API로 못 받는다**(KOTRA는 도시 단위 없음).
  `js/countryDetail.js`의 `COUNTRY_DETAIL`에 국가코드별로 손수 관리(현재 **30개국**:
  jp/vn/th/tw/ph/id/sg/hk/cn/my/tr/ch/us/eu/gb/ca/au/nz/se/no/dk/mx + 2026-08-02 ECB 추가분 in/br/za/pl/cz/hu/il/ro).
  먹거리 항목은 `{ name, desc, price }` — 아이콘은 이름 키워드로 **15종**(fork·soup·pot·flame·fish·beef·drumstick·sandwich·pizza·
  croissant·icecream·cake·coffee·drink·salad, 전부 lucide 경로) 중 자동 매핑(`FOOD_RULES`, 위→아래 우선). 카테고리 확장은 규칙에 키워드 추가.
  (참고: "추적 중인 통화" 스탯도 실제 연동 수 **22개국**으로 표기. 랭킹은 이 중 물가데이터 있는 나라만 계산.)
  나라 추가 = 객체에 항목 하나 추가. 큐레이션 없는 나라 클릭 시 환율·물가는 실데이터로 보이고 도시/먹거리/꿀팁은 "준비 중".
  도시별 "물가 지수 %"는 실측이 아닌 **대표값**.
- **도시 이미지(자동 수집):** `tools/fetch-city-images.js`가 위키백과 REST/pageimages API로 각 도시 대표 이미지를
  자동 수집해 `js/cityImages.js`(도시명→위키미디어 URL) 생성(재실행 가능). 지도·국기·인물·SVG는 필터로 걸러 그라데이션 폴백.
  우선순위: `cities[].img`(수동, 최우선) → `CITY_IMAGES[도시명]`(자동) → 그라데이션. (핫링크 — 안정성 원하면 로컬 다운로드로 전환)
