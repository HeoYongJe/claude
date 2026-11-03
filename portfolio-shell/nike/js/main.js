(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 커스텀 휠 관성 스크롤(아래)이 진행 중인지 — 앵커 클릭의 scrollIntoView처럼 다른 경로로
  // 스크롤이 움직일 때 이 루프가 계속 옛 목표 지점으로 끌어당기지 않도록, 두 블록이 공유해서 쓴다.
  let wheelAnimating = false;

  // ---- 상단 진행 바 ----
  const progressBar = document.querySelector(".progress__bar");
  const nav = document.querySelector(".nav");
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
    if (nav) nav.classList.toggle("is-scrolled", scrolled > 30);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 인앱 앵커 링크(nav의 #top·#cta) 전용 smooth scroll ----
  // CSS 전역 scroll-behavior:smooth를 뺐기 때문(휠 스크롤이 끊겨 보이던 원인 — css 참고)에, 네비
  // 링크 클릭 시의 부드러운 이동은 여기서 개별적으로 처리.
  if (!reduceMotion) {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        // 아래 커스텀 휠 관성 루프가 아직 돌고 있으면(직전까지 휠을 굴리다 바로 클릭한 경우)
        // 옛 휠 목표 지점으로 계속 끌어당겨서 이 smooth scroll과 서로 싸우게 됨 — 먼저 꺼둠.
        wheelAnimating = false;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ---- 등장 애니메이션(data-reveal) ----
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("is-revealed"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ---- 히어로 키네틱 타이포: "NIKE"를 글자 span으로 쪼개 순차 등장 ----
  const heroWord = document.querySelector(".hero__word");
  if (heroWord) {
    const text = heroWord.textContent.trim();
    heroWord.setAttribute("aria-label", text);
    heroWord.innerHTML = [...text]
      .map((ch, i) => `<span class="letter" style="--d:${(i * 0.09).toFixed(2)}s" aria-hidden="true">${ch}</span>`)
      .join("");
  }

  // ---- 제품 쇼케이스: 2026-10-23 6차 — "홀로그램 표현이 안 됨, 3D/회전 다 빼고 신발을 강조하는
  //      인터랙션으로 시원시원하게"라는 요청으로 three.js 3D 렌더링을 전면 폐기하고 평면 사진 +
  //      스크롤 연동 2D 트랜스폼(확대 + 기울어짐 → 정자세로 정리)으로 교체. 배경 그라데이션은 여전히
  //      JS가 아니라 .showcase 섹션 하나의 정적 CSS 배경(vh 단위 스톱)이라 여기선 안 건드림(css 참고). ----
  const showcaseStageWrap = document.querySelector("[data-showcase-stage-wrap]");
  const showcaseShoe = document.querySelector("[data-showcase-shoe]");
  const showcaseGlow = document.querySelector("[data-showcase-glow]");

  // ---- 룩북: Fluid Hover Accordion ----
  // 2026-10-30: 1~11차 동안 다듬어온 랭크 기반 스택 캐러셀을 전면 폐기 — design.md Lookbook 항목 참고.
  // 데스크톱(마우스 호버 가능)에서는 CSS `:hover`만으로 패널이 커져서 JS가 필요 없음 — 아예 아래 리스너를
  // 안 붙인다. 터치 기기는 호버 자체가 없으므로("데스크톱은 호버, 모바일은 탭" 요청) 탭(click)할 때마다
  // `.is-active`를 토글해 CSS의 `.is-active` 확장 규칙을 대신 태움 — 한 번에 하나만 열리는 표준 아코디언
  // 동작(다른 패널 클릭 시 이전 건 자동으로 닫힘, 열린 걸 다시 탭하면 닫힘).
  const lookbookAccordion = document.querySelector("[data-lookbook-accordion]");
  if (lookbookAccordion && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const panels = [...lookbookAccordion.querySelectorAll("[data-panel]")];
    panels.forEach((panel) => {
      panel.addEventListener("click", () => {
        const wasActive = panel.classList.contains("is-active");
        panels.forEach((p) => p.classList.remove("is-active"));
        if (!wasActive) panel.classList.add("is-active");
      });
    });
  }

  // ---- 스펙 숫자 카운트업(뷰포트 진입 시 0→실제값, 동시에 큰 팝업 애니메이션) ----
  const countEls = document.querySelectorAll("[data-count]");
  if (reduceMotion) {
    countEls.forEach((el) => { el.textContent = el.dataset.count; });
  } else {
    const countIO = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          obs.unobserve(el);
          el.classList.add("is-popped");
          const target = Number(el.dataset.count) || 0;
          const dur = 900;
          const start = performance.now();
          function tick(now) {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            el.textContent = Math.round(target * eased);
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = target;
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    countEls.forEach((el) => countIO.observe(el));
  }

  // ---- 커스텀 휠 스무스 스크롤 ----
  // 2026-11-03: 전역 scroll-behavior:smooth를 뺀 뒤(휠 틱마다 애니메이션이 서로 끊기던 문제 해결,
  // design.md 12차) 휠 스크롤 자체는 네이티브 그대로라 "여전히 딱딱 끊긴다"는 피드백 — 휠 이벤트를
  // 가로채 누적 목표 스크롤 지점을 만들고, 매 프레임 실제 scrollY를 그 목표로 lerp해 보내는 관성
  // 스크롤을 직접 구현. ⚠️ 11차에서 걷어낸 "tails" 스냅과는 근본적으로 다른 코드 — 목표 지점은
  // 오직 휠 입력의 누적값일 뿐 섹션 경계·방향별 분기 조건이 전혀 없어서, 그때처럼 섹션 길이·뷰포트
  // 조합마다 새 엣지 케이스가 나올 구조 자체가 아님.
  if (!reduceMotion) {
    let wheelTarget = window.scrollY;
    // 2026-11-03 16차: "왜 전반적으로 딱딱 끊기냐"는 재질문 끝에 실측으로 잡은 진짜 버그 — 매 프레임
    // `cur`를 `window.scrollY`로 다시 읽어서 다음 걸음을 계산했는데, 브라우저는 scrollTop을 정수
    // 픽셀로 반올림해서 저장/보고함. diff가 줄어들며 한 걸음(diff*0.15)이 1px보다 작아지면, 그
    // 작은 이동분이 반올림에 먹혀 실제 스크롤 위치가 전혀 안 바뀌고(`cur`가 영원히 같은 정수),
    // 따라서 `diff`도 똑같이 반복되면서 `Math.abs(diff) < 0.5`에 영영 도달하지 못하는 무한 루프에
    // 빠졌음(실측: 휠을 완전히 멈춘 뒤에도 wheelStep이 초당 180회 이상 영원히 돌고 있었음 — 다른
    // 스크롤 처리와 메인 스레드를 나눠 쓰며 간헐적 끊김을 만든 실제 원인). **반올림되는
    // `window.scrollY`를 다음 계산에 다시 쓰지 않고, 정밀한 내부 상태(`wheelY`)를 JS 쪽에서만
    // 누적**하도록 변경 — scrollTo로 "쓰기"만 하고 "읽어서 되돌아오지" 않으므로 반올림 손실이
    // 누적 계산에 섞이지 않음.
    let wheelY = window.scrollY;
    const maxScrollY = () => document.documentElement.scrollHeight - window.innerHeight;
    function wheelStep() {
      // 외부(앵커 클릭의 scrollIntoView)에서 wheelAnimating을 꺼뒀다면 여기서 바로 멈춤 — 안 그러면
      // 이미 예약된 이 프레임이 한 번 더 돌면서 옛 목표로 끌어당겨버림.
      if (!wheelAnimating) return;
      const diff = wheelTarget - wheelY;
      if (Math.abs(diff) < 0.5) {
        wheelY = wheelTarget;
        window.scrollTo(0, wheelY);
        wheelAnimating = false;
        return;
      }
      wheelY += diff * 0.15;
      window.scrollTo(0, wheelY);
      requestAnimationFrame(wheelStep);
    }
    window.addEventListener("wheel", (e) => {
      e.preventDefault();
      wheelTarget = Math.min(maxScrollY(), Math.max(0, wheelTarget + e.deltaY));
      if (!wheelAnimating) {
        wheelY = window.scrollY; // 유휴 상태였다면(스크롤바 드래그 등으로 위치가 바뀌었을 수 있음) 실제 위치에서 다시 시작
        wheelAnimating = true;
        requestAnimationFrame(wheelStep);
      }
    }, { passive: false });
    // 휠이 아닌 다른 경로(스크롤바 드래그, 키보드, 앵커 클릭의 scrollIntoView)로 위치가 바뀌었을 때
    // 목표값이 낡은 채로 남아있으면, 다음 휠 입력이 그 낡은 목표에서부터 다시 출발해 엉뚱한 지점으로
    // 튀어버림 — 휠 애니메이션 중이 아닐 때는 목표값을 실제 위치로 계속 동기화해둠.
    window.addEventListener("scroll", () => { if (!wheelAnimating) { wheelTarget = window.scrollY; wheelY = window.scrollY; } }, { passive: true });
  }

  // ---- rAF 루프: 히어로 줌아웃 스크럽 + 매니페스토 핀드줌 스크럽 + 쇼케이스 비주얼 스크럽
  //      + [data-speed] 배경 패럴럭스 ----
  // 2026-11-03: 스크럽 계산에 실제 scrollY를 바로 씀(이전엔 별도 lerp로 한 번 더 보간한 smoothY를
  // 썼는데, 휠 스크롤 자체가 위 커스텀 관성으로 이미 부드러워진 지금은 그 위에 또 lerp를 얹으면
  // 핀이 풀리는 경계에서 "실제 스크롤은 이미 끝났는데 트랜스폼만 계속 따라오는" 이중 지연이 생김 —
  // 쇼케이스에서 "신발이 커지는 도중에 페이지도 같이 내려간다"는 피드백의 원인이었음).
  const heroWrap = document.querySelector(".hero-wrap");
  const heroInner = document.querySelector("[data-hero-scrub]");
  const heroBg = document.querySelector("[data-hero-bg]");
  const heroScrollEl = document.querySelector("[data-hero-scroll]");
  const manifesto = document.querySelector("[data-manifesto]");
  const manifestoText = document.querySelector("[data-manifesto-scrub]");
  // "섹션 전환이 밋밋하다"는 피드백(2026-10-20) — 전체 섹션을 덮는 대신, **배경 레이어만** 콘텐츠와
  // 살짝 다른 속도로 움직이게 해서 "고정된 배경 위로 콘텐츠가 지나가는" 듯한 깊이감만 준다.
  // 매니페스토·쇼케이스 배경(.manifesto__bg, .showcase__bg)은 가뿐과 동일한 [data-speed] 뷰포트 패럴럭스
  // 공식(translateY(-(요소중심−뷰포트중심)*speed))을 그대로 씀 — 이 두 섹션 자체는 보통 플로우로 스크롤되므로
  // 뷰포트 안에서 위치가 바뀌어 패럴럭스가 성립함. 히어로 배경(.hero__bg)은 **sticky로 고정된 .hero 안**이라
  // 뷰포트 기준 위치가 안 바뀌어 같은 공식이 통하지 않음 → 아래 히어로 블록에서 progress에 직접 바인딩해
  // "배경은 전경보다 훨씬 느리게 확대"되는 걸로 같은 효과를 냄.
  const parallaxEls = [...document.querySelectorAll("[data-speed]")];

  if (!reduceMotion) {
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    let bounds = {};
    // raf 루프 유휴-정지용 상태 — measure()가 이 아래 kickRaf()를 바로 호출하므로(측정값이 바뀌면
    // 깨우기 위해), let 선언이 measure() 정의/첫 호출보다 먼저 와야 함(아니면 "초기화 전 접근"
    // ReferenceError로 measure() 자체가 터지고, 그 아래 코드 전체가 안 돌게 됨 — 실제로 겪은 버그).
    let lastRafY = null;
    let idleFrames = 0;
    let rafQueued = false;
    function kickRaf() {
      idleFrames = 0;
      if (!rafQueued) { rafQueued = true; requestAnimationFrame(raf); }
    }
    function measure() {
      bounds = {
        hero: heroWrap ? { start: heroWrap.offsetTop, range: heroWrap.offsetHeight - window.innerHeight } : null,
        manifesto: manifesto ? { start: manifesto.offsetTop, range: manifesto.offsetHeight - window.innerHeight } : null,
        showcaseStage: showcaseStageWrap ? { start: showcaseStageWrap.offsetTop, range: showcaseStageWrap.offsetHeight - window.innerHeight } : null,
      };
      // 바뀐 bounds를 화면에 바로 반영 — 아래 raf 루프가 유휴 상태로 멈춰있던 중이면(가만히 있을 때)
      // 깨워서 최소 한 프레임은 새 bounds로 다시 그리게 함.
      kickRaf();
    }
    measure();
    // 안전장치: 초기 measure()는 스크립트 실행 시점(웹폰트가 아직 안 끝났을 수 있는 때) 한 번만 도는데,
    // Oswald/Pretendard가 늦게 적용되며 위쪽(히어로·매니페스토) 텍스트 줄바꿈이 바뀌면 그 아래
    // showcaseStage의 offsetTop도 같이 밀릴 수 있음 — 창 크기가 그대로여도 폰트 로드 완료 시점엔
    // 다시 재도록 보강(리사이즈 이벤트만으론 이 경우를 못 잡음).
    document.fonts.ready.then(measure);
    window.addEventListener("load", measure);
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 150); });

    // 2026-11-03: 휠 가로채서 픽셀 좌표로 다음 섹션에 강제 스냅시키던 "부분 스냅"(tails) 시스템을
    // 통째로 제거 — 경계 케이스(섹션 길이, 뷰포트 크기, 스크롤 속도 조합)가 끝없이 나오고 고칠 때마다
    // 다른 쪽에서 또 터져서, 전 구간을 보통의 자연스러운 스크롤로 되돌림(design.md 11차 참고).
    // 2026-11-03 15차: "그래도 딱딱 끊긴다"는 재확인 끝에 실측으로 찾은 진짜 버그 — 이 루프가
    // 스크롤을 전혀 안 해도 멈추지 않고 영원히 돌고 있었음(가만히 2초 동안 rAF 722회 호출 확인,
    // 즉 아무 변화가 없는데도 초당 300회 이상 getBoundingClientRect 읽기 + style 쓰기를 반복).
    // 이 유휴 상태의 배경 작업이 메인 스레드를 계속 깎아먹다가, 실제 휠 관성 스크롤(아래)이 같은
    // 스레드에서 scrollTo를 호출해야 하는 순간과 간헐적으로 부딪히며 끊김을 만든 것으로 보임 —
    // 스크롤 위치가 몇 프레임 연속으로 그대로면(더 반영할 변화가 없으면) 루프를 완전히 멈추고,
    // 스크롤·리사이즈가 다시 일어날 때만(`kickRaf`) 재시작하도록 변경(상태 선언은 위 measure() 근처로 옮김).
    function raf() {
      rafQueued = false;
      const realY = window.scrollY;
      // 2026-11-03 14차: "매니페스토 텍스트 스케일 변화가 딱딱 끊긴다" — 원인은 이 함수 끝의 패럴럭스
      // 루프가 매 프레임 getBoundingClientRect(읽기)와 style.transform(쓰기)을 섞어 호출하던 것.
      // 그 직전에 히어로·매니페스토·쇼케이스가 이미 style을 여러 번 써둔 상태라, 패럴럭스 루프의 각
      // getBoundingClientRect 호출마다 브라우저가 강제로 레이아웃을 다시 계산해야 했음(레이아웃
      // 스래싱) — 섹션이 가장 무거운(큰 블러 배경 + 굵은 글씨) 매니페스토 구간에서 가장 두드러지게
      // 프레임이 떨어져 보였을 것. 이 프레임에서 쓸 값을 먼저 전부 읽어두고(아래), 실제 style 변경은
      // 전부 그 다음에 몰아서 하도록(쓰기 전용) 순서를 바꿔 섞이지 않게 함.
      const viewportCenter = window.innerHeight / 2;
      const parallaxOffsets = parallaxEls.map((el) => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        return -(elCenter - viewportCenter) * speed;
      });

      // 히어로: hero-wrap의 추가 높이(100vh)만큼 스크롤하는 동안 진행률 0→1
      if (heroInner && bounds.hero && bounds.hero.range > 0) {
        const progress = clamp01((realY - bounds.hero.start) / bounds.hero.range);
        // 2026-10-29: 기존 *1.6은 핀 구간의 62.5% 지점에서 이미 완전히 투명해져, 나머지 37.5%는
        // 아무것도 없는 빈 화면만 스크롤되는 "죽은 구간"이었음("여백이 너무 많아 미완성 같다" 피드백의
        // 원인). progress를 그대로 써서 핀이 풀리는 정확한 순간에 다 사라지도록 range 전체를 씀.
        const opacity = Math.max(0, 1 - progress);
        // 2026-11-02: "텍스트가 사라지고 스크롤하면 탁 다음 섹션으로" 요청 — opacity 타이밍은 위에서
        // 이미 핀 해제 순간에 정확히 0이 되지만, scale이 1.9까지 커지면서 overflow:hidden 경계에
        // 텍스트가 먼저 잘려나가 "실제로 안 보이는" 시점이 opacity=0보다 한참 앞섰음(그 사이가 체감상
        // 빈 구간). 최대 확대를 1.9→1.4로 낮춰 잘려나가는 시점과 opacity 0 시점을 거의 일치시킴.
        const scale = 1 + progress * 0.4; // 1 -> 1.4 (전경, 확대하며 사라짐)
        // 2026-10-22: 입장 시 blur→선명(위 CSS [data-reveal])의 반대 방향 — 스크롤해서 다음 섹션으로
        // 넘어가는 동안 다시 흐려지도록 진행률에 블러를 바인딩(0 -> 14px, 입장 블러 세기와 동일하게 맞춤).
        const blur = progress * 14;
        heroInner.style.transform = `scale(${scale.toFixed(3)})`;
        heroInner.style.opacity = opacity.toFixed(3);
        heroInner.style.filter = `blur(${blur.toFixed(1)}px)`;
        if (heroScrollEl) heroScrollEl.style.opacity = Math.max(0, 1 - progress * 4).toFixed(3);
        // 배경은 전경보다 훨씬 느리게(1 -> 1.15) — "background-attachment"처럼 배경은 거의 제자리,
        // 콘텐츠만 그 위를 빠르게 지나가는 듯한 깊이감.
        if (heroBg) heroBg.style.transform = `scale(${(1 + progress * 0.15).toFixed(3)})`;
      }

      // 매니페스토: 섹션(220vh) 내 sticky 구간 진행률 0→1에 텍스트 scale 0.5→1.15 바인딩.
      // range의 75% 지점에서 이미 progress=1에 도달하게 해서(÷0.75), 완전히 확대된 채로 잠깐
      // "멈춰 있다가" sticky가 풀리도록(급작스러운 핸드오프 방지용 호흡).
      if (manifestoText && bounds.manifesto && bounds.manifesto.range > 0) {
        const progress = clamp01((realY - bounds.manifesto.start) / (bounds.manifesto.range * 0.75));
        // 2026-10-29: 시작 크기 0.5→0.65, opacity 램프 ×2.5→×3 — 히어로 쪽 여백 수정과 짝으로
        // 텍스트가 더 일찍·더 또렷하게 잡혀서 핸드오프가 타이트하게 느껴지도록.
        const scale = 0.65 + progress * 0.5;
        manifestoText.style.transform = `scale(${scale.toFixed(3)})`;
        manifestoText.style.opacity = Math.min(1, progress * 3).toFixed(3);
      }

      // 쇼케이스 스테이지: 신발 사진이 살짝 기울어진 채 작게 시작해 확대되며 정자세로 "탁" 정리됨 —
      // 3D 대신 순수 2D 트랜스폼(scale+rotate+translateY)만으로 "시원시원한" 임팩트를 냄. 배경
      // 그라데이션은 .showcase 섹션 전체에 걸친 정적 CSS라 여기선 안 건드림(css 참고, 스크롤에 따라
      // 저절로 드러남).
      // 2026-11-03 14차: "확대가 다 끝난 시점에 페이지가 같이 스크롤된다" — 핀 범위 전체(range)를
      // 다 써서 진행률이 딱 unpin 순간에 1이 됐더니, 관성 스크롤이 그 경계를 감속 없이 쭉 통과해버려
      // "다 끝남"과 "페이지가 움직이기 시작함"이 같은 찰나에 겹쳐 보였음 — 매니페스토(÷0.75)와 같은
      // 패턴으로 핀 범위의 80%에서 이미 확대가 끝나게 해서, 남은 20%는 "다 끝난 채로 잠깐 멈춰
      // 있다가" 풀리는 여유를 둠.
      if (showcaseShoe && bounds.showcaseStage && bounds.showcaseStage.range > 0) {
        const progress = clamp01((realY - bounds.showcaseStage.start) / (bounds.showcaseStage.range * 0.8));
        // 2026-10-29: "확대됐을 때 사이즈를 조금만 줄여줘" — 최대 스케일 1.15 -> 1.0.
        const scale = 0.75 + progress * 0.25; // 0.75 -> 1.0, 확대되며 등장
        const rotate = -8 + progress * 8; // -8deg -> 0deg, 비스듬했다가 정자세로 정리
        const rise = (1 - progress) * 50; // 아래에서 살짝 떠오르며 자리 잡음
        showcaseShoe.style.transform = `translateY(${rise.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg)`;
        // 신발 뒤 글로우도 같은 진행률로 밝아짐(transform은 CSS 무한 애니메이션이 소유하므로 opacity만
        // 건드려 충돌 없음, css 참고). 2026-11-03: "신발 강조 글로우 좀 더 강조해줘" 요청으로 최대
        // opacity를 .5→.85로 다시 올림(9차 때 .5로 낮췄던 걸 되돌리되 9차보다는 살짝 낮게 — 완전
        // 불투명한 .9보다는 은은함을 유지).
        if (showcaseGlow) showcaseGlow.style.opacity = (progress * 0.85).toFixed(3);
      }

      // 배경 패럴럭스 적용(쓰기만 — geometry는 이 함수 맨 위에서 이미 읽어둠)
      parallaxEls.forEach((el, i) => {
        el.style.transform = `translateY(${parallaxOffsets[i].toFixed(1)}px)`;
      });

      // 스크롤 위치가 그대로면 더 반영할 변화가 없다는 뜻 — 몇 프레임만 더 지켜보다 멈춤(완전히
      // 정지된 순간 바로 멈추면 트윈·관성이 막 끝나가는 미세한 끝자락을 놓칠 수 있어 약간의 여유를 둠).
      if (realY === lastRafY) {
        idleFrames++;
      } else {
        idleFrames = 0;
        lastRafY = realY;
      }
      if (idleFrames < 6) {
        rafQueued = true;
        requestAnimationFrame(raf);
      }
    }
    kickRaf();
    window.addEventListener("scroll", kickRaf, { passive: true });
    window.addEventListener("resize", kickRaf);
  } else if (manifestoText) {
    manifestoText.style.opacity = 1;
    manifestoText.style.transform = "scale(1)";
  }

  // ---- 마퀴 트랙 폭 안전장치(가뿐 인기여행지 티커와 동일 패턴) ----
  const marqueeTrack = document.querySelector("[data-marquee-track]");
  if (marqueeTrack) {
    const html = marqueeTrack.innerHTML;
    requestAnimationFrame(() => {
      const wrapW = marqueeTrack.parentElement.clientWidth || 1;
      for (let n = 1; n <= 4; n++) {
        if (marqueeTrack.scrollWidth / 2 >= wrapW * 1.1) break;
        marqueeTrack.innerHTML = html.repeat(n + 1);
      }
    });
  }

  // ---- CTA 폼(목업 — 실제 전송 없음) ----
  const ctaForm = document.querySelector(".cta__form");
  const ctaDone = document.querySelector(".cta__done");
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ctaForm.hidden = true;
      if (ctaDone) ctaDone.hidden = false;
    });
  }
})();
