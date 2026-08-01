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
- 구성(원페이지): 히어로 → 실시간 추천 랭킹(**흰 배경**, 나라 클릭 시 상세뷰로 슬라이드 전환) → 서비스 소개("왜 필요?", **맨 밑**) → 푸터
  (구 "체감 물가"·"여정" 섹션 및 마지막 CTA 섹션은 제거. 랭킹 섹션 파란 배경도 제거하고 흰 배경으로 통일)

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
| 강세(유리) 포인트 | `--up` / `--up-tint` | `#EF4444` / `#FEF2F2` |
| 약세(불리)·중립 회색 | `--down` / `--down-tint` | `#767676`(AA 4.5:1) / `#F2F4F6` |
| 파랑 섹션 위 서브텍스트 | — | `#BBD0FF` `#D6E2FF` `#E4ECFF` |

- **색 규칙(확정, 2026-07-27):**
  - **환율 변동률 뱃지: 강세(유리) = 빨강 `#EF4444`, 약세(불리) = 회색 `#767676`**(모드 기준).
  - **체감 물가는 부호 기준**: 저렴(표기 −) = 빨강, 비쌈(표기 +) = 회색. 랭킹 pill·상세 지수·품목%·도시지수 모두 동일.
    (예: 스위스는 강세라 환율 뱃지는 빨강이지만, 물가 +101%라 물가 표기는 회색)
  - **Primary 파랑은 포인트 컬러라 남발하지 않는다** — 브랜드·버튼·항로 레일·진행 바 등 구조 요소와
    랭킹/CTA 섹션 배경(면)에만. 데이터 강조는 빨강(유리)/회색(불리)으로 처리.

## 3. Typography
- **폰트: Pretendard 하나만.** 위계는 크기·굵기로만.
- H1 64px / 800 / line-height 1.08 / -0.03em
- H2(섹션 제목) 40px / 800 / -0.02em
- 카드 제목 26px / 800 · 여정 패널 제목 34px / 800
- 본문 16–18px / Regular~600 / line-height 1.6
- 라벨(키커) 14px / 700 (Primary) · 작은 메타 13px / 700 (Muted)

## 4. Layout & Spacing
- 8px 그리드: 8 / 16 / 24 / 32 / 48 / 64 / 96
- 콘텐츠 최대 너비 **1080px**, 좌우 여백 24px, 카드 간격 24px
- 각 섹션 `min-height:100vh`, 콘텐츠 세로 중앙 정렬, 상하 패딩 96~104px

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
   좌: 브랜드 "travel"(22/800/Primary). 우: 링크(소개/추천 랭킹, 15/600/Muted) + Primary 버튼.
3. **우측 항로 레일** — `fixed; right:40px; top:92px`, 세로 점선(흐르는 dash) + 진행에 따라 채워지는 Primary 실선
   + 하강하는 비행기(글로우 + bob). z-index 45(네비 아래).

## 7. Components (섹션별)
- **히어로:** 배경 = **루프 배경 영상**(`.hero__video` — 밝은 하늘 영상 `assets/hero/sky.mp4`, `object-fit:cover` +
  세로·가로 **흰색** 가독성 그라디언트 오버레이). `.hero`는 `relative`+`overflow:hidden`(배경 `#EBF1FC` 로드 폴백),
  콘텐츠(`.hero__grid`)는 `z-index:10`으로 영상 위에. 루프 경계 하드컷 방지용 진입/종료 **페이드**는 `main.js`
  `heroVideo()`가 `currentTime` 기준 rAF로 opacity 제어(FADE 0.5s).
  **밝은 영상이라 히어로 텍스트는 어두운색**: 제목 `#0F172A`(+흰 halo text-shadow), 강조어·eyebrow는 Primary,
  설명 `#334155`, SCROLL `--muted`, eyebrow는 반투명 흰 pill. nav·버튼은 원래 어두운 톤(흰 nav+어두운 글자 / primary·흰 버튼) 유지.
  환율 카드: 흰 배경, radius 24, 상시 그림자, "오늘의 추천" + 변동률 뱃지 + 국가명(국기) + 1,000원 환산 + 설명. 부유 + 마우스 틸트.
  (영상 파일은 `deploy-tools/deploy-travel.js` FILES에 포함해 닷홈 `/travel/assets/hero/`로 업로드. **도트 지도/도트 배경(`.hero__map`·`.hero__dots`)은
  구름 영상과 안 어울려 제거**, blob 글로우만 잔존. 하단 SCROLL 텍스트는 스크롤 시작하면 `heroScrollEl`이 opacity로 스르륵 사라짐.)
  · **히어로 아래 섹션 배경:** 구름 히어로에서 흰색으로 뚝 끊기지 않게 `body`에 아주 연한 블루 세로 그라데이션
    (`#FFFFFF→#F1F6FF→#EAF1FF→#F4F8FF`). rank·why 섹션 배경은 `transparent`로 두어 흰 카드가 그 위로 떠 보이게 함.
- **랭킹(흰 배경):** 흰 카드 **3개 균등 그리드**(gap 24, radius 20, 보더 `--border`). 세그먼트 토글(강세·유리 / 약세·불리,
  Surface 컨테이너·활성=흰 pill+그림자). 카드 = 순위 + 변동률 뱃지 + 국가명 26/800(국기) + 환산 문구 + 미니 스파크라인
  + "체감물가 ±xx%" pill(부호 색) + "상세 보기 →". **카드 클릭 → 상세뷰로 슬라이드 전환**.
  · 변동률 화살표 = 강세율 부호(강세=▲/약세=▼), 숫자 절댓값. 요약 띠(Surface, 통계 3 + 버튼).
  · **스파크라인**: `.rc-line`을 대시로 감춰두고 **카드별 IntersectionObserver**(`sparkIO`, threshold .35)로 카드가
    화면에 들어올 때 dashoffset 0으로 그려짐. 토글 시 재렌더→재관찰로 다시 그려짐. (섹션 단위 트리거는 타이밍 취약해 폐기)
- **나라 상세뷰(`.t-detail`, 랭킹 안에서 전환):** **detail은 흰 면만** — Surface(#f5f8ff) 틴트 전부 제거,
  카드는 `.dcard`(흰 배경+보더). **유일한 컬러 면 = 파란 절약 카드**.
  · 상단: 국기 + 국가명 + 순위 뱃지 + "다른 나라 선택하기 →".
  · **Row1 `1fr 300px`**: 좌 "주요 품목 체감 물가"(흰 카드 — 라인아이콘(빅맥=hamburger·콜라=cup-soda·생수=droplet, `ITEM_SVG`, Primary)
    + 이름 + [서울 회색막대/현지 파란막대 + 금액] + 큰 % 부호색)
    / 우 **파란 절약 카드**(서울 대비 체감 절약 큰 % + 설명 + 전날환율·환율변동·예상절약(추정)).
  · **Row2 `1fr 1fr`**: 추천 도시(라인 리스트) | 대표 먹거리(세로 리스트 행 — 카테고리 라인아이콘 + 번호 01/02/03
    + 이름 + 한 줄 설명 + 가격). 아이콘은 음식명 키워드로 자동 선택(`main.js` `pickFoodIcon`/`FOOD_RULES`+`FOOD_SVG`),
    색은 Primary. 도시별 이미지·이모지 준비 불필요 — `{ name, desc, price }`만 채우면 됨.
  · **Row3 풀 너비**: 여행 꿀팁 3분할(세로 라인) + 모던 라인 SVG 아이콘(`TIP_SVG`+`CAT_ICON`).
  · 품목 막대는 서울 vs 현지 금액 비교 + 차오름 애니메이션. 전환: `.t-rankview.is-out` ↔ `.t-detail.is-in`, 연타 가드.
- **서비스 소개(why, 맨 밑 흰 섹션):** "왜 이 서비스가 필요할까요?" + 3카드(환율만 보면 손해 / 체감 물가로 진짜 이득 /
  매일 갱신). Surface 카드 + 라인 아이콘. (마지막 CTA 섹션은 제거됨)

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
- **큐레이션 데이터:** 상세뷰의 **추천 도시·대표 먹거리·꿀팁은 API로 못 받는다**(KOTRA는 도시 단위 없음).
  `js/countryDetail.js`의 `COUNTRY_DETAIL`에 국가코드별로 손수 관리(현재 **22개국** = `currencyCountryMap.js`의 환율·물가 연동국 전체:
  jp/vn/th/tw/ph/id/sg/hk/cn/my/tr/ch/us/eu/gb/ca/au/nz/se/no/dk/mx).
  먹거리 항목은 `{ name, desc, price }` — 아이콘은 이름 키워드로 **15종**(fork·soup·pot·flame·fish·beef·drumstick·sandwich·pizza·
  croissant·icecream·cake·coffee·drink·salad, 전부 lucide 경로) 중 자동 매핑(`FOOD_RULES`, 위→아래 우선). 카테고리 확장은 규칙에 키워드 추가.
  (참고: "추적 중인 통화" 스탯도 실제 연동 수 **22개국**으로 표기. 랭킹은 이 중 물가데이터 있는 나라만 계산.)
  나라 추가 = 객체에 항목 하나 추가. 큐레이션 없는 나라 클릭 시 환율·물가는 실데이터로 보이고 도시/먹거리/꿀팁은 "준비 중".
  도시별 "물가 지수 %"는 실측이 아닌 **대표값**.
- **도시 이미지(자동 수집):** `tools/fetch-city-images.js`가 위키백과 REST/pageimages API로 각 도시 대표 이미지를
  자동 수집해 `js/cityImages.js`(도시명→위키미디어 URL) 생성(재실행 가능). 지도·국기·인물·SVG는 필터로 걸러 그라데이션 폴백.
  우선순위: `cities[].img`(수동, 최우선) → `CITY_IMAGES[도시명]`(자동) → 그라데이션. (핫링크 — 안정성 원하면 로컬 다운로드로 전환)
