# Design Guide — portfolio shell (yjportfolio.co.kr 메인)

> 이 문서는 포트폴리오 메인 페이지의 디자인 기준이다.
> **2026-07-24부로 "시안11" 핸드오프 기준으로 전면 교체되었다.**
> 구현체는 `shell/`(바닐라 HTML/CSS/JS)이며, 이전 Next.js 구현(`portfolio-app/`)은
> 더 이상 라이브에 반영되지 않는다(삭제하지 않고 저장소에 보관).
>
> 이전 이력: 3카드 랜딩 → `_archive_old_shell/` / Next.js 스크롤 포트폴리오 → `portfolio-app/`

## 1. Overview
- 한 문장: 웹 퍼블리셔 개인 포트폴리오 — 다크 + 블루 무드의 스크롤 인터랙티브 싱글 페이지
- 무드: 딥네이비 다크 배경, 타이포 중심, primary blue 포인트. "회로/연결선" 모티프로
  구조적인 인상을 주되 모션은 절제(패럴랙스·리빌·플로팅 수준)
- 구성: 히어로 → Selected Work → Design Principles → About → Contact

## 2. Colors
| 용도 | 토큰 | 값 |
|---|---|---|
| Primary blue | `--blue` | `rgb(51,102,255)` |
| 강조 텍스트/아이콘 | `--blue-mid` | `rgb(74,124,255)` |
| hover·노드·선 | `--blue-light` | `rgb(94,138,255)` |
| 칩 텍스트 | `--blue-pale` | `rgb(150,180,255)` |
| 기본 배경 | `--bg` | `#070a11` |
| Works 섹션 배경 | `--bg-works` | `#0a0e18` |
| 카드 배경 | `--bg-card` | `#10151f` |
| 썸네일 배경 | `--bg-thumb` | `#0c111b` |
| 섹션 구분선 | `--line` | `rgba(255,255,255,.09)` |
| 그리드 라인 | `--line-strong` | `rgba(255,255,255,.12)` |

## 3. Typography
- Display/제목: Wanted Sans Variable (800) — `--font-wanted-sans`
- 본문/UI: Pretendard JP (500–700) — `--font-pretendard`
- 모노(라벨/번호): SF Mono 스택 — `--font-mono`
- 규칙: 한글 제목은 letter-spacing 음수(-.02 ~ -.035em)
- 폰트는 jsDelivr CDN 로드(Pretendard JP v1.3.9, Wanted Sans v1.0.1)

## 4. Layout
- 섹션 상하 패딩 `clamp(80px,11vh,140px)` (`--section-y`), 좌우 `clamp(20px,5vw,72px)` (`--gutter`)
- 콘텐츠 최대폭 `1240px` 중앙 정렬 (`--shell`)
- 라운드: 카드 14–18px, 필/버튼 999px
- 반응형 breakpoint: `960px` 단일 (그 이하에서 모든 그리드 1열, 히어로 비주얼 숨김)

## 5. Motion
- Reveal: `[data-reveal]` → opacity/translateY(40px), `cubic-bezier(.16,1,.3,1)` .8s, stagger `(i%3)*0.09s`
- 히어로 패럴랙스: 타이틀 -0.05 / 비주얼 0.12, 아이브로우·본문 페이드아웃
- 연결선 순차 점등(로드 시): path draw .55s stagger .16s → 노드 팝업(백이즈)
- 회로 버튼 hover: 테두리 1바퀴 draw 1.6s 1회 (`@keyframes yjDraw`)
- 글래스 카드 플로팅: 카드마다 7~10s (`yjFloatA/B/C`)
- 마퀴: 없음
- `prefers-reduced-motion` 대응 필수 (플로팅·흐름·리빌·smooth scroll 해제)

## 6. 코드 규칙 (중요)
- **인라인 `style` 금지.** 레이아웃·색·간격은 전부 `styles.css`의 클래스로 정의한다.
  네이밍은 `yj-` 접두 BEM (`yj-work__title`, `yj-glass--portrait`).
- **JS는 표현을 직접 쓰지 않는다.** 상태는 클래스 토글(`.is-solid`, `.is-in`, `.active`)로,
  스크롤 비례값(진행률·패럴랙스 transform)만 인라인으로 계산해 넣는다.
- 색은 `:root` CSS 변수를 쓰고 리터럴을 흩뿌리지 않는다.

## 7. 그리드 라인 컨셉 (제거 금지)
Design Principles의 세로 라인 + 각 섹션 상단 가로 라인이 합쳐져 전체가 그리드처럼 읽히도록
의도된 구성이다. "모든 요소는 존재 이유가 있다"는 철학의 시각화 — 임의로 제거하지 말 것.

## 8. 프로젝트 구조 / 배포
- `shell/index.html`, `shell/styles.css`, `shell/script.js` — 의존성 없는 정적 3파일
- 배포: `node deploy-tools/deploy-shell.js` → 닷홈 FTP 사이트 루트에 업로드
  (기존 `nike/`·`travel/`·`alliza/`는 건드리지 않음, 원격 삭제 API 사용 금지)

## 9. 교체 대상 (플레이스홀더)
- **이미지**: 작업물 3개·작업 공간 사진이 `.yj-ph` 자리표시자 상태.
  `<div class="yj-ph">…</div>`를 `<img src="assets/…" alt="…">`로 교체하면
  `.yj-thumb img`의 톤 필터·스크림이 자동 적용된다.
- **연락처**: `yujin.dev@gmail.com`, `github.com/yujin-dev`, Resume PDF 링크 — 실제 값으로
- **작업물**: LawPilot / 그리다랩 / CoreSoft 링크가 전부 `#works`. 실제 프로젝트
  (`/travel/` 등)로 연결 예정
- **이름**: "YUJIN"
