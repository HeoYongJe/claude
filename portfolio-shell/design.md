# Design Guide — portfolio shell (yjportfolio.co.kr 메인)

> 이 문서는 포트폴리오 껍데기(메인 페이지)의 디자인 기준이다.
> 2026-07-21부로 컨셉이 "3개 프로젝트 카드 랜딩"에서 "스크롤 인터랙티브 웹 퍼블리셔 포트폴리오"로 전면 교체되었다.
> 이전 버전(카드 랜딩)은 `_archive_old_shell/`에 보관되어 있다 (삭제 아님).

> **현재 확정 화면 스펙:** `design_handoff_portfolio/README.md`(핸드오프 원본, 로컬 다운로드 폴더)가
> 최신 하이파이 기준. `portfolio-app/`(Next.js + TS + Tailwind + GSAP/Lenis)이 그 스펙을 재구현한 것.
> 아래 토큰은 핸드오프와 일치하며, 화면 구조/인터랙션의 세부는 핸드오프 README를 우선한다.

## 1. Overview
- 한 문장: 웹 퍼블리셔 개인 포트폴리오 — 스크롤에 반응하는 인터랙티브 원페이지
- 무드: 다크 히어로 기반, 절제된 타이포 중심, primary blue 포인트
- 구성: 히어로 → 마퀴 → 소개/스탯 → 스킬 → 작업물(3개, 좌우교차 쇼케이스) → 컨택트

## 2. Colors
- Primary (accent): `rgb(51,102,255)`
- 다크 배경 (hero/contact): `#0e0e10`
- 라이트 배경 (intro/works): `#ffffff`
- 라이트 대체 배경 (skills/카드): `rgb(247,247,248)`
- 제목 텍스트(라이트): `rgb(23,23,23)`
- 경계선: `rgb(225,226,228)` (라이트) / `rgba(255,255,255,.1~.28)` (다크)

## 3. Typography
- Display/제목: Wanted Sans Variable (weight 800), 폴백 Pretendard
- 본문/UI: Pretendard JP Variable (weight 500–700)
- 모노(라벨/연도): SF Mono, ui-monospace, Menlo, monospace
- 규칙: 한글 제목은 letter-spacing 음수(-.02~-.04em)

## 4. Layout
- 섹션 상하 패딩 `clamp(90px,13vh,160px)`, 좌우 `clamp(20px,5vw,64px)`
- 콘텐츠 최대폭 `1180px` 중앙 정렬
- 커스텀 반응형 breakpoint: `900px`(tab), `640px`(sm, Tailwind 기본값 사용)

## 5. Motion
- Reveal: opacity/translateY, `cubic-bezier(.16,1,.3,1)` .8s, stagger `(i%4)*0.08s`
- 카운트업: 1400ms easeOutCubic
- 마퀴: 24s linear infinite
- 히어로 패럴랙스 계수: 오브 0.28 / 고스트텍스트 0.35 / 타이틀 -0.06
- `prefers-reduced-motion` 대응 필수 (globals.css에 전역 처리됨)

## 6. 프로젝트 구조
- `portfolio-app/` — Next.js 소스 (App Router, static export)
- `content/site.ts` — 스탯/스킬/작업물/컨택트 플레이스홀더 콘텐츠, 교체 대상
- 배포: `npm run build` → `out/` 정적 산출물을 닷홈 FTP로 업로드 (`deploy-tools/deploy-portfolio-app.js`)
- Works 섹션의 3개 작업물은 향후 travel/nike/alliza 등 실제 프로젝트로 연결 예정

## 7. 추후 논의 필요
- Works 항목을 실제 프로젝트(travel 등)로 교체
- 실제 사진/스킬/이름 정보로 콘텐츠 교체
