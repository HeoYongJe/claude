# Handoff: travel — 환율·물가 기반 여행지 추천 웹

## Overview
"travel"은 **전날 환율 + 현지 물가지수(빅맥·코카콜라·생수)**를 함께 계산해, 지금 원화로 가장 이득인 여행지를 추천하는 서비스입니다. 이 핸드오프는 원페이지 마케팅/추천 랜딩 웹 화면 한 개를 다룹니다. 나라 랭킹 → 도시별 체감 물가 비교 → (나라→도시→먹거리→꿀팁) 여정 미리보기 → CTA 흐름으로 구성됩니다.

## About the Design Files
이 번들의 파일(`Travel 웹화면.dc.html`)은 **HTML로 만든 디자인 레퍼런스**입니다 — 최종적인 룩과 인터랙션을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아닙니다. 목표는 이 HTML 디자인을 **타깃 코드베이스의 기존 환경(React/Vue/Next 등)과 패턴·라이브러리로 재현**하는 것입니다. 아직 환경이 없다면 프로젝트에 가장 적합한 프레임워크를 골라 구현하세요.

> 참고: `.dc.html`은 사내 프리뷰 런타임(`support.js`)에서 렌더되는 포맷입니다. 로직은 `<script type="text/x-dc">` 안의 `class Component extends DCLogic`에 들어 있습니다. 재현 시에는 이 로직을 타깃 프레임워크의 컴포넌트/훅으로 옮기면 됩니다. 브라우저에서 그냥 열어 보려면 `support.js`가 같은 폴더에 있어야 합니다.

## Fidelity
**High-fidelity (hifi)** — 최종 색상·타이포·간격·인터랙션이 확정된 목업입니다. 코드베이스의 기존 라이브러리로 픽셀에 가깝게 재현하세요.

## Design Tokens

### Colors
| 역할 | 값 |
| --- | --- |
| Primary (포인트) | `#0E4AEB` |
| Primary hover/pressed | `#0b3bc0` |
| Secondary | `#06B6D4` |
| Ink (제목·본문) | `#0F172A` |
| Muted (보조 텍스트) | `#64748B` |
| Muted 2 (더 옅은) | `#94A3B8` |
| Surface (카드·띠 배경) | `#F5F8FF` |
| Border (카드 경계) | `#EEF1F6` / 입력류 `#E2E8F0` |
| Background | `#FFFFFF` |
| Danger (하락/불리) | `#EF4444`, 배경 틴트 `#FEF2F2` |
| Success/상승 | Primary `#0E4AEB` 재사용 |
| 다크(파랑) 섹션 위 서브텍스트 | `#BBD0FF`, `#D6E2FF`, `#E4ECFF` |
| 파랑 위 반투명 흰색 | `rgba(255,255,255,.14)` / `.28` / `.65` |

**색 규칙:** 색은 위계에만 사용. 포인트 컬러는 아이콘·브랜드명·버튼·강조 수치에만. 카드는 중립면(흰색/Surface). 한 페이지에서 파랑을 "필드(면)"로 쓰는 곳은 랭킹 섹션과 CTA 섹션 두 곳뿐.

### Typography
- **폰트: Pretendard 하나만.** (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css`)
- H1 64px / 800 / line-height 1.08 / letter-spacing -0.03em
- H2(섹션 제목) 40px / 800 / -0.02em
- 카드 제목 26px / 800, 여정 패널 제목 34px / 800
- 본문 16–18px / Regular~600 / line-height 1.6
- 라벨(키커) 14px / 700 (Primary)
- 작은 메타 13px / 700 (Muted)
- 위계는 폰트가 아니라 **크기·굵기**로만.

### Spacing
- 8px 그리드: 8 / 16 / 24 / 32 / 48 / 64 / 96
- 콘텐츠 최대 너비 **1080px**, 좌우 여백 24px
- 섹션 세로: 각 섹션 `min-height: 100vh`, 콘텐츠 세로 중앙 정렬, 상하 패딩 96~104px
- 카드 간격 24px

### Radius & Shadow
- Radius: 카드 20px, 큰 카드/패널 24px, 버튼 12–14px, pill 999px
- Shadow(히어로 카드): `0 40px 80px -30px rgba(15,23,42,.28)`
- Hover lift(카드): `0 24px 50px -24px rgba(15,23,42,.28)`, `translateY(-6px)`, border → Primary

## Screens / Views

단일 스크롤 페이지. 고정 요소 2개 + 섹션 5개 + 푸터.

### 고정 요소
1. **상단 진행 바** — `position:fixed; top:0; height:3px`. 스크롤 진행률에 따라 Primary 바가 0→100% 폭.
2. **네비게이션** — `position:fixed; top:0`, 반투명 흰 배경 + `backdrop-filter: blur(14px)`, 하단 1px 경계. 좌: 브랜드 "travel"(22px/800/Primary). 우: 텍스트 링크(추천/체감 물가/여행 정보, 15px/600/Muted) + Primary 버튼 "여행지 찾기".
3. **우측 항로 레일** — `position:fixed; right:40px; top:92px; height:calc(100vh - 116px)`. 세로 점선(흐르는 dash 애니메이션) + 스크롤 진행에 따라 채워지는 Primary 실선 + 상단에서 아래로 내려가는 비행기 아이콘(글로우 + 좌우 bob 애니메이션). z-index 45(네비 아래).

### Section 1 — Hero
- **레이아웃:** 2열 그리드 `1.15fr .85fr`, gap 56px, 세로 중앙. 배경 `radial-gradient(1200px 700px at 78% 12%, #F5F8FF, #FFFFFF)`.
- **배경 장식(패럴럭스):** 블러 처리된 원형 그라디언트 2개(파랑/시안) + 도트 그리드(`radial-gradient(#0E4AEB 1px, transparent 1px)`, 38px, opacity .05). 각 요소는 뷰포트 중앙 기준 거리에 비례해 이동(로컬 패럴럭스).
- **좌측:** pill 키커("전날 환율 · 물가지수 기반 추천") → H1("지금 원화로 / 가장 **이득인** 여행지", '이득인'만 Primary) → 본문 → 버튼 2개(Primary "내 여행지 찾기" + 아웃라인 "체감 물가 보기").
- **우측:** 환율 카드(흰 배경, radius 24, 큰 shadow). "오늘의 추천" + 전일대비 뱃지, "일본 🇯🇵", 1,000원 → ¥106 환산, 설명. 카드는 **천천히 부유(t-float, 6s)** + **마우스 틸트(±10deg rotateX/Y)**.
- 하단 중앙 "SCROLL ↓".

### Section 2 — 실시간 추천 랭킹  ⚑ 배경 Primary(#0E4AEB)
- **대비 포인트:** 이 섹션만 배경이 파란색. 그 위에 **흰 카드**들이 떠 있는 극적 대비.
- **헤더:** 좌측 키커(#BBD0FF)+H2(흰색)+본문(#D6E2FF). 우측: 기준일 메타 + **세그먼트 토글**("원화 강세·유리" / "원화 약세·불리"). 토글 컨테이너 `rgba(255,255,255,.14)`, 활성 탭은 흰 배경+해당 색 텍스트(강세=Primary, 약세=Danger).
- **카드 3개:** 3열 그리드, gap 24. 흰 배경/radius 20. 각 카드: 순위 번호(원형 틴트) + 변동률 뱃지 + 나라명(26/800) + 환산 문구 + **미니 추이 스파크라인(SVG polyline+area)** + 하단 "체감물가 −xx%" pill + "도시 보기 →".
- **토글 동작:** 강세→약세 전환 시 세 카드의 나라/수치/스파크라인/색이 통째로 교체됨(강세=Primary·상승선, 약세=Danger·하락선). 데이터는 아래 State 참고.
- **요약 띠:** 흰 카드, 통계 3개(추적 통화 32개국 / 이번 주 강세 18개국 / 평균 절감 −28%) + "전체 랭킹 보기 →" 버튼.

### Section 3 — 체감 물가 (빅맥/콜라/생수 지수)  배경 Surface(#F5F8FF)
- **헤더:** 키커+H2("환율만큼 중요한 건, 현지 물가")+본문(랭킹과 이어지는 문구).
- **도시 탭:** 도쿄·일본 / 하노이·베트남 / 이스탄불·튀르키예. 활성=Primary 배경/흰 텍스트, 비활성=흰 배경/Muted/경계.
- **본문 그리드:** `1fr 320px`, gap 40.
  - 좌: 흰 카드. 항목 3개(빅맥/코카콜라 500ml/생수 500ml). 각 항목마다 "서울"(회색 100% 막대 + 원가) / 선택 도시(Primary 막대, 애니메이션으로 폭 채워짐 + 카운트업 숫자). 막대가 짧을수록 저렴.
  - 우: Primary 카드. "서울 대비 체감 절약 nn%"(카운트업) + 설명 + 환율 변동.
- **동작:** 도시 탭 클릭 시 막대 폭(width transition .9s)과 숫자(900ms ease-out 카운트업)가 재생. 섹션이 처음 뷰에 들어올 때 최초 1회 자동 재생.

### Section 4 — 나라를 고르면 이어지는 여정 (핀 고정 스크롤텔링)
- **구조:** 섹션 높이 `320vh`, 내부는 `position:sticky; top:0; height:100vh`. 스크롤에 따라 4단계 진행.
- **좌:** 고정 인덱스 리스트(01 나라 / 02 도시 / 03 먹거리 / 04 꿀팁). 현재 단계는 Primary + 왼쪽 3px Primary 보더 + 들여쓰기, 지난 단계는 Ink, 이후 단계는 연회색(#CBD5E1).
- **우:** 겹쳐 놓인 패널 4장(absolute). 현재 단계 패널만 opacity 1 + `translateY(0) scale(1)`, 나머지는 opacity 0 + `translateY(24px) scale(.98)`. 각 패널: STEP 라벨 + 제목 + 설명 + pill 태그 2개.
- 진행률 = `(-sectionTop) / (sectionHeight - 100vh)` → `floor(p*4)`로 단계 산출.
- (현재는 일본→오사카→먹거리→꿀팁 예시 고정. 추후 선택 나라 기준으로 데이터 바인딩 가능.)

### Section 5 — CTA  ⚑ 배경 Primary(#0E4AEB)
- 세로 중앙, 텍스트 중앙정렬. H2(흰색, 48/800) + 흰 버튼("내 여행지 찾기 →", hover 시 `translateY(-3px)`).

### 푸터
- 최대너비 1080, 좌우 양끝: "travel" / "환율·물가 데이터는 전날 기준 · 샘플".

## Interactions & Behavior
- **부드러운 스크롤:** 스크롤 값을 lerp(0.09)로 보간하는 `requestAnimationFrame` 루프가 진행 바·패럴럭스·히어로 페이드·항로 레일·비행기 위치를 매 프레임 갱신(관성감). 스크롤 스냅은 사용하지 않음.
- **로컬 패럴럭스:** `[data-speed]` 요소는 `translateY(-(요소중심 - 뷰포트중심) * speed)`.
- **히어로 페이드업:** 스크롤 시 히어로 내부 opacity(1→0.1)·translateY(0→-60px).
- **항로 레일:** 진행률로 실선 `stroke-dashoffset` 채움 + 비행기 top 위치 이동.
- **등장 애니메이션(통일):** 모든 섹션 콘텐츠는 **아래→위 페이드업**(`opacity 0→1`, `translateY(36px)→0`, `.7s cubic-bezier(.2,.7,.2,1)`, 카드류는 0/.1/.2s 스태거). `IntersectionObserver(threshold .15)`로 1회 트리거. 마크업의 `data-reveal` 속성이 대상.
- **카드 부유+틸트:** 히어로 환율 카드는 CSS `t-float` + 마우스무브 rotateX/Y.
- **호버:** 카드 lift+Primary 보더, 버튼 배경 hover 톤(#0b3bc0)/lift.
- **랭킹 토글:** 강세/약세 전환은 카드 콘텐츠 전체 교체(재정렬 아님, 데이터셋 스왑).
- **랭킹→물가 연결:** 강세 카드 클릭 또는 "도시 보기 →" → 해당 나라 대표 도시를 물가 섹션에서 선택 상태로 만들고 `window.scrollTo({behavior:'smooth'})`로 물가 섹션(offset -70)으로 이동. 약세 카드는 물가 대상이 없어 도시 링크 숨김.
- **애니메이션 상수:** 진행 lerp 0.09 / reveal .7s / 막대·카운트업 .9s / 부유 6~7.5s / 항로 dash 1.4s.

## State Management
- `cur`: 현재 선택된 물가 도시 키(`tokyo` | `hanoi` | `istanbul`). 기본 `tokyo`.
- `rmode`: 랭킹 토글 모드(`strong` | `weak`). 기본 `strong`.
- `_curStep`: 여정 스크롤텔링 현재 단계(0–3).
- `_sm`: 보간된 전역 스크롤 진행률(0–1).

### 데이터 (샘플 — 실제 데이터로 교체 대상)
```
// 물가 (원화 환산, 원)
SEOUL   = { bigmac:5500, cola:2000, water:1000 }
tokyo   = { bigmac:4300, cola:1300, water:900,  fx:'▲ 6.2%' }
hanoi   = { bigmac:3400, cola:800,  water:400,  fx:'▲ 3.1%' }
istanbul= { bigmac:3900, cola:1100, water:500,  fx:'▲ 11.4%' }
// 절약률 = 1 - (도시합/서울합)

// 랭킹 강세(strong): 일본 ▲6.2 ¥106 −22 → tokyo / 튀르키예 ▲11.4 29.8₺ −31 → istanbul / 베트남 ▲3.1 18,900₫ −45 → hanoi
// 랭킹 약세(weak):  미국 ▼5.1 $0.71 +34 / 스위스 ▼3.6 0.63₣ +58 / 영국 ▼2.2 £0.57 +29 (도시 링크 없음)
```

### 실제 데이터 연동 메모
- 사용자가 확보 가능한 데이터: **전날 환율 + 물가지수(빅맥·코카콜라·생수)**. 위 하드코딩 값들을 이 소스로 교체.
- 변동률(전일 대비)·체감 절약률은 서울 기준값과 비교해 계산.

## Assets
- 폰트: Pretendard (CDN, 위 URL).
- 아이콘/일러스트: 별도 이미지 에셋 없음. 비행기·스파크라인·막대·환율선은 전부 인라인 SVG. 국기는 이모지(🇯🇵🇹🇷🇻🇳🇺🇸🇨🇭🇬🇧) — 브랜드 톤에 따라 실제 국기 에셋으로 교체 검토.
- 사용자 보유 "로고/이미지 에셋"이 있다면 브랜드 마크·히어로 이미지에 반영.

## Files
- `Travel 웹화면.dc.html` — 전체 디자인(마크업 + 로직). 재현의 기준 파일.
- `support.js` — `.dc.html` 프리뷰 런타임(브라우저에서 열어 볼 때만 필요, 재구현에는 불필요).
- 참고용 대안 시안: 프로젝트 루트의 `Travel 추천화면.dc.html`(초기 모바일 3안) — 방향 참고용, 이번 웹 구현 범위 아님.
