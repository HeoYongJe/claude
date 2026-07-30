# Design Guide — travel project

> 이 문서는 이 프로젝트의 디자인 기준이다.
> 모든 화면과 컴포넌트는 이 문서를 먼저 읽고 따른다. 규칙과 어긋나면 만들기 전에 멈추고 물어본다.

> **기준 문서:** `design_handoff_travel_web/README.md`(+ `Travel 웹화면.dc.html`)가 확정 하이파이 스펙이다.
> 이 프로젝트의 `index.html`/`css`/`js`는 그 핸드오프를 재현한 것이고, **이 design.md는 그 구현 상태와
> 일치하도록 유지한다**(2026-07-27 정합성 정리 완료). 세부 인터랙션은 핸드오프 README를 우선.

## 1. Overview
- 브랜드명: travel
- 한 문장: 전날 환율 + 현지 물가지수(빅맥·코카콜라·생수)로 "지금 원화로 가장 이득인 여행지"를 추천
- 무드: 절제 / 타입 중심 / 시원한 Primary 포인트 / 스크롤 인터랙션(관성·패럴럭스·핀 스크롤텔링)
- 구성(원페이지): 히어로 → 실시간 추천 랭킹(파랑 섹션) → 체감 물가 → 여정 스크롤텔링 → CTA(파랑 섹션) → 푸터

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
| 유리/긍정 강조 | `--up` / `--up-tint` | `#0E4AEB`(=Primary) / `#EAF1FF` |
| 불리/하락 | `--danger` / `--danger-tint` | `#EF4444` / `#FEF2F2` |
| 중립·보조 회색 | `--down` / `--down-tint` | `#767676`(AA 4.5:1) / `#F2F4F6` |
| 파랑 섹션 위 서브텍스트 | — | `#BBD0FF` `#D6E2FF` `#E4ECFF` |

- **색 규칙:** 색은 위계에만. 포인트(Primary)는 아이콘·브랜드명·버튼·강조 수치에만. 카드는 중립면(흰색/Surface).
  파랑을 "면"으로 쓰는 곳은 랭킹 섹션과 CTA 섹션 둘뿐.
- **랭킹 변동률 색(확정, 2026-07-27):** **유리(원화 강세) = Primary 파랑 / 불리(원화 약세) = Danger 빨강.**
  "빨강=하락/불리" 통념과 일치하고 Primary=포인트 시스템과 정합. (main.js `renderRank`의 `color`가 이 기준)
  · 중립 회색(`--down`)은 "불리"가 아니라 여정 태그 등 **탈강조 중립 요소**에만 쓴다.

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
2. **네비** — `fixed; top:0`, 반투명 흰 배경 + `backdrop-filter:blur(14px)` + 하단 1px 경계.
   좌: 브랜드 "travel"(22/800/Primary). 우: 링크(추천/체감 물가/여행 정보, 15/600/Muted) + Primary 버튼.
3. **우측 항로 레일** — `fixed; right:40px; top:92px`, 세로 점선(흐르는 dash) + 진행에 따라 채워지는 Primary 실선
   + 하강하는 비행기(글로우 + bob). z-index 45(네비 아래).

## 7. Components (섹션별)
- **히어로 환율 카드:** 흰 배경, radius 24, 상시 그림자. "오늘의 추천" + 변동률 뱃지(강세 1위라 항상 파랑)
  + 국가명(국기 이미지) + 1,000원 환산 + 설명. 부유(t-float 6s) + 마우스 틸트(±10deg).
- **랭킹(파랑 섹션):** 흰 카드 **3개 균등 그리드**(gap 24, radius 20). 세그먼트 토글(강세·유리 / 약세·불리)로
  세 카드 통째 교체. 카드 = 순위(원형 틴트) + 변동률 뱃지 + 국가명 26/800(국기) + 환산 문구 + 미니 스파크라인
  + "체감물가 −xx%" pill + "물가 보기 →"(강세·물가데이터 있는 나라만). 요약 띠(통계 3 + 전체보기).
  · 변동률 뱃지 화살표 = 강세율 부호(강세=▲, 약세=▼), 숫자는 절댓값. 색은 §2 규칙(강세=파랑/약세=빨강).
- **체감 물가(Surface 섹션):** 도시 탭(강세 top3) + `1fr 320px` 그리드. 좌 흰 카드에 항목 3개(빅맥/콜라/생수),
  각 항목 "서울"(회색 100% 막대) vs 선택 도시(Primary 막대, 폭 애니메이션 + 카운트업). 우 Primary 카드에 절약률.
- **여정 스크롤텔링:** 섹션 `320vh`, 내부 `sticky top:0 height:100vh`. 4단계(나라/도시/먹거리/꿀팁).
  좌 고정 인덱스(현재=Primary+3px 보더+들여쓰기), 우 겹친 패널 4장(현재만 opacity 1). 태그 pill 2개.
- **CTA(파랑 섹션):** 중앙 정렬, H2 흰색 48/800 + 흰 버튼(hover lift).

## 8. Motion
- 부드러운 스크롤: 스크롤 값을 lerp(0.09)로 보간하는 rAF 루프가 진행 바·패럴럭스·히어로 페이드·항로 레일 갱신.
- 로컬 패럴럭스: `[data-speed]` = `translateY(-(요소중심 - 뷰포트중심) * speed)`.
- 등장(통일): 아래→위 페이드업 `opacity 0→1, translateY 36→0, .7s cubic-bezier(.2,.7,.2,1)`, 카드 0/.1/.2s 스태거,
  `IntersectionObserver(threshold .15)` 1회. 대상은 `data-reveal`.
- 막대·카운트업 .9s · 부유 6~7.5s · 항로 dash 1.4s.
- 랭킹→물가 연결: 강세 카드/"물가 보기 →" 클릭 → 물가 섹션 해당 도시 선택 + smooth scroll.

## 9. Responsive
- 단일 브레이크포인트 **900px**(`css/style.css`의 `@media (max-width:900px)`): 히어로/랭킹/물가/여정 그리드 1열,
  save-card 100%, H1 44 · 섹션제목 30 · CTA 32.

## 10. States
- 로딩: 스켈레톤(카드 형태 유지). 데이터 로드 실패 시 카드에 "불러오지 못했어요".
- 빈 상태(예: 약세국 0개): Muted 톤 안내 문구만.
- 포커스: Primary 2px 아웃라인.

## 11. Icons & Data
- 국기: 실제 이미지(flagcdn SVG), 모서리 4~6px. (Windows 국기 이모지 미지원 → 이미지)
- 그 외 아이콘: 인라인 라인 SVG. 색은 라인(블랙) 또는 Primary만.
- 데이터: 전날 환율(수출입은행 API) + 물가(KOTRA API)를 서버가 계산해 캐시.
  로직은 `lib/ranking.js`(로컬 `server.js` / Vercel `api/ranking.js` 공용). 닷홈은 정적이라 API는 Vercel 서버리스로 분리.
