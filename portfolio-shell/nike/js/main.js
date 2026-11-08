(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 상단 진행 바 ----
  const progressBar = document.querySelector(".progress__bar");
  const nav = document.querySelector(".nav");
  // 2026-11-07 58차: "스크롤을 시작하면 SCROLL 표시가 자연스럽게 사라지도록" — 80px은 휠 한 틱
  // 정도의 관성 스크롤로도 쉽게 넘는 작은 값이라 "스크롤을 시작했다"는 의도를 바로 반영.
  const heroScroll = document.querySelector(".hero__scroll");
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
    if (nav) nav.classList.toggle("is-scrolled", scrolled > 30);
    if (heroScroll) heroScroll.classList.toggle("is-hidden", scrolled > 80);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 인앱 앵커 링크(nav의 #top·#cta) 스크롤 ----
  // 2026-11-05 39차: 네이티브 scroll-snap(css 참고)이 각 패널에 scroll-snap-stop:always를 걸어두면,
  // smooth scrollIntoView로 먼 패널까지 한 번에 건너뛰려 해도 중간 패널마다 강제로 멈췄다 다시
  // 출발하길 반복해 뚝뚝 끊겨 보임 — 앵커 점프는 즉시 이동으로 처리하고, 네이티브 스냅이 도착
  // 지점을 알아서 해당 패널 상단에 맞춰줌.
  // 2026-11-08: html에 scroll-behavior:smooth를 추가(아래 css 참고, 섹션 간 휠 스크롤을 부드럽게)
  // 하면서 behavior:"auto"의 의미가 바뀜 — CSSOM 스펙상 "auto"는 "CSS의 scroll-behavior 값을
  // 따른다"는 뜻이라, 이제 CSS가 smooth이면 이 앵커 점프도 덩달아 smooth-scroll되어 위에서 고친
  // "중간 패널마다 멈추는" 문제가 재발할 수 있음. CSS 값과 무관하게 항상 즉시 이동하도록
  // behavior:"instant"로 명시(CSS scroll-behavior를 우회하는 값).
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "instant", block: "start" });
    });
  });

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

  // ---- 매니페스토 배경 분할선을 실제 줄바꿈 위치에 맞춤 (2026-11-08 63차) ----
  // css의 --manifesto-split(51%, vh 기준 고정값)만으로는 뷰포트 "높이"가 바뀌면 어긋남 —
  // 폰트가 vw 기반 clamp라 줄 높이가 뷰포트 "너비"에 따라서도 변하기 때문에, 높이 하나만으로
  // 안전한 매직넘버를 찾을 수 없음(1366×768에서 1줄째 마침표 밑단이 살짝 잘리는 것으로 확인).
  // 대신 실제 "매일, 한 걸음씩" span의 렌더 위치를 직접 측정해 %로 환산 — 항상 정확히 줄 경계에
  // 맞음. 타이핑 애니메이션 중엔 이 span이 아직 DOM에 없을 수 있어(글자 단위로 렌더) MutationObserver로
  // 첫 등장 시점부터 추적.
  // 2026-11-08 64차: "줄1·줄2가 분할선에 딱 붙어 보인다" — 분할선을 줄2 상단이 아니라 줄1 하단과
  // 줄2 상단(css의 margin-top:28px로 벌어진 간격) 정중앙으로 옮김. 둘 다 span으로 측정 가능해짐.
  const manifestoEl = document.querySelector(".manifesto");
  const manifestoTextEl = document.querySelector(".manifesto__text");
  if (manifestoEl && manifestoTextEl) {
    function syncManifestoSplit() {
      const line1 = manifestoEl.querySelector(".manifesto__line1");
      const line2 = manifestoEl.querySelector(".manifesto__line2");
      if (!line1 || !line2) return;
      const sectionRect = manifestoEl.getBoundingClientRect();
      const line1Rect = line1.getBoundingClientRect();
      const line2Rect = line2.getBoundingClientRect();
      if (!sectionRect.height) return;
      const midY = (line1Rect.bottom + line2Rect.top) / 2;
      const pct = ((midY - sectionRect.top) / sectionRect.height) * 100;
      manifestoEl.style.setProperty("--manifesto-split", pct.toFixed(2) + "%");
    }
    syncManifestoSplit();
    window.addEventListener("resize", syncManifestoSplit);
    new MutationObserver(syncManifestoSplit).observe(manifestoTextEl, { childList: true, subtree: true });
  }

  // ---- 히어로 타이틀·태그라인 위치를 분할선 기준으로 동적 계산 (2026-11-08 67차, 69차 재작성) ----
  // 72px·110px 등 고정 px를 몇 번 조정했지만 전부 특정 뷰포트에서만 맞았음(design.md 65~67차 참고,
  // --hero-split은 뷰포트 "높이"에 비례해 움직이는데 태그라인 위치는 폰트 clamp가 가로폭 기준이라
  // 높이와 거의 무관 — 세로로 긴 화면에서 분할선이 훨씬 아래로 내려가며 역전).
  // 69차 1차 시도: 분할 비율을 60→50%로 바꾸자 반대쪽(NIKE 타이틀)이 분할선에 걸쳐 똑같은 원리를
  // 반대 방향에 적용했는데(태그라인은 margin-top, 타이틀은 `.hero__inner` 전체를 transform으로
  // 밀어올림), margin-top 증가가 `.hero__inner`의 레이아웃 높이를 바꿔버려 `.hero`의
  // justify-content:center가 "타이틀 쪽 여유까지" 다시 움직이는 피드백 루프가 생김 — 호출마다
  // DOM에 남은 이전 결과(margin 값)가 다음 계산의 기준을 바꿔 수렴하지 않고 계속 어긋났음(실측으로
  // 확인, 2-pass로 묶어봐도 동일). 근본 원인은 "레이아웃 높이를 바꾸는 보정"과 "그 높이에 의존하는
  // flex 중앙정렬"을 섞어 쓴 것 — margin 대신 태그라인+서브 묶음을 감싸는 `.hero__below`
  // 래퍼(index.html)에 transform으로 내리는 방식으로 교체해 레이아웃 높이를 전혀 바꾸지 않게 함.
  // 이제 타이틀 쪽 보정(.hero__inner의 transform)과 태그라인 쪽 보정(.hero__below의 transform)이
  // 서로의 계산 기준에 전혀 영향을 주지 않아 독립적으로 한 번씩만 계산해도 항상 정확히 수렴함.
  const heroSplitEl = document.querySelector(".hero");
  const heroInnerEl = document.querySelector(".hero__inner");
  const heroWordEl = document.querySelector(".hero__word");
  const heroTagline = document.querySelector(".hero__tagline");
  const heroBelowEl = document.querySelector(".hero__below");
  if (heroSplitEl && heroInnerEl && heroWordEl && heroTagline && heroBelowEl) {
    const WORD_TARGET_CLEARANCE_PX = 24;
    const TAGLINE_TARGET_CLEARANCE_PX = 32;
    function currentSplitY() {
      const heroRect = heroSplitEl.getBoundingClientRect();
      const splitPct = parseFloat(getComputedStyle(heroSplitEl).getPropertyValue("--hero-split")) || 50;
      return heroRect.top + heroRect.height * (splitPct / 100);
    }
    // 실측 중 리사이즈/폰트로드 타이밍이 겹치면 측정 시점의 레이아웃이 과도기 상태라 한 번의 계산이
    // 어긋나는 경우가 있었음(테스트로 재현) — "계산 → 적용 → 재측정해서 여전히 어긋나면 한 번 더
    // 계산"을 최대 3회 반복해 수렴하도록(이미 정확하면 1회 만에 끝남).
    // 2026-11-08 72차: 사용자가 로드 직후 스크린샷 두 장(등장 애니메이션 "시작할 때"·"끝날 때")을
    // 비교해 타이틀·태그라인 위치가 서로 다르다고 지적 — 69차의 1.6s setTimeout "안전장치"는 증상을
    // 늦춰 가릴 뿐 근본 원인은 그대로였음: heroWordEl·heroTagline 둘 다 [data-reveal]이라 "등장
    // 중"엔 자기 자신의 transform(translateY(32px)→0)이 아직 안 끝난 상태고, 로드 직후 맨 처음
    // syncHeroLayout() 호출이 바로 그 "아직 안 끝난" 위치를 기준으로 틀린 보정값을 계산해 적용해
    // 버림 — 그 틀린 상태가 화면에 그대로 보이다가, 나중 호출(폰트로드 등)에서야 맞는 값으로
    // 바뀌며 "쿵" 하고 위치가 바뀌는 것처럼 보였던 것. 근본 수정: 이 두 엘리먼트를 잴 때만 자신의
    // reveal transform을 잠깐 "none"으로 지워(등장 애니메이션이 이미 끝난 것처럼) 최종 레이아웃을
    // 읽고, 같은 동기 실행 안에서 즉시 원래 값으로 되돌림(화면엔 중간 상태가 렌더되지 않아 깜빡임
    // 없음) — 이제 등장 애니메이션 진행률과 무관하게 매번 같은(맞는) 값을 읽으므로 "시작"과 "끝"의
    // 계산 결과가 항상 같아짐. 더 이상 과도기 상태에 기댈 필요가 없어 1.6s 안전장치도 제거.
    function measureFinalRect(el) {
      const prevTransform = el.style.transform;
      el.style.transform = "none";
      const rect = el.getBoundingClientRect();
      el.style.transform = prevTransform;
      return rect;
    }
    function syncHeroLayout() {
      let shift = 0;
      for (let i = 0; i < 3; i++) {
        heroInnerEl.style.transform = shift > 0 ? "translateY(-" + shift + "px)" : "";
        const wordClearance = currentSplitY() - measureFinalRect(heroWordEl).bottom;
        const diff = WORD_TARGET_CLEARANCE_PX - wordClearance;
        if (diff < 1) break;
        shift = Math.max(0, shift + diff);
      }
      let push = 0;
      for (let i = 0; i < 3; i++) {
        heroBelowEl.style.transform = push > 0 ? "translateY(" + push + "px)" : "";
        const clearance = measureFinalRect(heroTagline).top - currentSplitY();
        const diff = TAGLINE_TARGET_CLEARANCE_PX - clearance;
        if (Math.abs(diff) < 1) break;
        push = Math.max(0, push + diff);
      }
    }
    syncHeroLayout();
    // 리사이즈 중간값(브라우저가 최종 크기에 도달하기 전 연속 발생하는 resize 이벤트)에서 계산하면
    // 그 중간 크기 기준으로 고정돼버려 최종 크기와 어긋날 수 있어 디바운스.
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncHeroLayout, 150);
    });
    // 폰트가 늦게 로드되면 글자 렌더 크기(= heroWordEl 높이)가 바뀌어 재계산이 필요 — reveal
    // 타이밍과는 무관한 별개의 이유라 그대로 유지.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeroLayout);
  }

  // ---- 히어로 → 매니페스토 전환 완화 (2026-11-08 73차 파일럿) ----
  // "섹션 전환이 너무 휙휙 넘어간다, PRODUCT 신발이 빠질 때 정도의 속도·부드러움을" 피드백 —
  // PRODUCT(아래 showcaseSticky·showcaseMarkers)와 완전히 동일한 패턴·로직 그대로 재사용:
  // 마커(css에서 각 100vh + scroll-snap-align:start) 2개 중 뷰포트에 50% 이상 들어온 마커의
  // 순번(1부터)을 .hero의 data-stage로 반영 — 1번 마커 범위(="쉬는 자리", 최초 로드 위치와
  // 동일 문서 좌표)에 있으면 stage=1(그대로 보임), 2번 마커 범위(스크롤해서 넘어가는 중)에
  // 들어오면 stage=2로 바뀌며 css의 느린(.9s) opacity/filter 전환이 트리거됨. 위로 다시
  // 스크롤해 1번 마커 범위로 돌아오면 그 마커가 다시 "50% 이상 교차"로 잡혀 자연스럽게 stage=1로
  // 복귀(히어로가 다시 나타남) — PRODUCT와 똑같이 정방향 전용 로직(isIntersecting만 처리)이지만
  // 마커가 자기 범위에 들어올 때마다 다시 트리거되므로 왕복에도 별도 분기 없이 동작함.
  const heroSticky = document.querySelector("[data-hero-sticky]");
  const heroMarkers = [...document.querySelectorAll("[data-hero-marker]")];
  if (heroSticky && heroMarkers.length) {
    if (reduceMotion) {
      heroSticky.dataset.stage = "1";
    } else {
      const heroStageIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              heroSticky.dataset.stage = String(heroMarkers.indexOf(entry.target) + 1);
            }
          });
        },
        { threshold: 0.5 }
      );
      heroMarkers.forEach((marker) => heroStageIO.observe(marker));
    }
  }

  // ---- 제품 쇼케이스: 2026-11-06 42차 — "섹션 하나도 스크롤마다 단계적으로 전환돼야 한다"는
  //      요청으로, 신발을 .showcase__sticky(position:sticky)로 화면에 고정해두고 그 뒤를 지나가는
  //      투명 마커 2개(각 100svh, css에서 scroll-snap-align:start로 html의 기존 네이티브 스냅에
  //      이미 걸려 있음 — "마커 하나 = 스크롤 한 번"은 CSS만으로 보장됨) 중 지금 뷰포트에 걸린
  //      것을 보고 .showcase__sticky의 data-stage(1~2)를 갱신. 실제 위치·투명도 변화는 전부
  //      css의 [data-stage] attribute selector + transition이 담당 — 여기선 "지금 몇 단계인지"만
  //      갱신. 2026-11-07 56차: 원래 3단계(신발→텍스트→숫자)였던 걸 2단계(신발→텍스트+숫자)로
  //      축소하며, 숫자 카운트업도 기존의 독립 IntersectionObserver(섹션이 sticky라 뷰포트 진입과
  //      동시에 — opacity:0인 채로 — 이미 끝나버려 실제로는 안 보이던 숨은 버그가 있었음) 대신
  //      여기서 마지막 단계(=showcaseMarkers.length) 진입을 감지할 때 직접 트리거하도록 통합 —
  //      카드가 CSS로 튀어 오르는 시점(.spec-card의 nth-child transition-delay, css 참고)에 맞춰
  //      숫자도 그때 올라가기 시작해야 "촤르륵" 효과가 실제로 보임. ----
  const showcaseSticky = document.querySelector("[data-showcase-sticky]");
  const showcaseMarkers = [...document.querySelectorAll("[data-showcase-marker]")];
  // css .spec-card:nth-child(n) 의 transition-delay와 맞춘 값 — 카드가 튀어 오르는 순간과 숫자가
  // 올라가기 시작하는 순간을 맞추기 위해 그대로 미러링(css 쪽 값을 바꾸면 여기도 같이 바꿀 것).
  const SPEC_COUNT_DELAYS_MS = [750, 830, 910, 990];
  let specsCounted = false;
  function runSpecsCountUp() {
    if (specsCounted) return;
    specsCounted = true;
    const countEls = [...document.querySelectorAll("[data-count]")];
    countEls.forEach((el, i) => {
      const delay = reduceMotion ? 0 : SPEC_COUNT_DELAYS_MS[i] || 0;
      setTimeout(() => {
        el.classList.add("is-popped");
        const target = Number(el.dataset.count) || 0;
        if (reduceMotion) { el.textContent = target; return; }
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
      }, delay);
    });
  }
  if (showcaseSticky && showcaseMarkers.length) {
    if (reduceMotion) {
      showcaseSticky.dataset.stage = String(showcaseMarkers.length);
      runSpecsCountUp();
    } else {
      const stageIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const stage = showcaseMarkers.indexOf(entry.target) + 1;
              showcaseSticky.dataset.stage = String(stage);
              if (stage === showcaseMarkers.length) runSpecsCountUp();
            }
          });
        },
        { threshold: 0.5 }
      );
      showcaseMarkers.forEach((marker) => stageIO.observe(marker));
    }
  }

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

  // ---- [data-speed] 배경 블롭 패럴럭스(룩북~CTA 장식 + 65차부터 히어로·매니페스토 분할 배경) ----
  // 2026-11-05 39차: 히어로 줌아웃·매니페스토 핀드줌·쇼케이스 스크럽을 전부 걷어내며(위 참고),
  // 휠 이벤트를 가로채던 "커스텀 휠 스무스 스크롤"도 함께 제거 — preventDefault+scrollTo로 직접
  // 스크롤 위치를 쓰던 그 코드가 네이티브 scroll-snap(css 참고)의 스냅 판정과 정면 충돌하기
  // 때문(브라우저가 스냅을 계산할 "진짜" 스크롤 제스처 자체를 가로채버림). 장식용 블롭 패럴럭스만
  // 가벼운 루프로 남김 — 패널이 불연속으로(스냅) 움직여도 자연스럽게 같이 따라옴.
  // 2026-11-08 65차: "배경도 좀 더 인터랙티브하게" — 기존엔 `el.style.transform`을 매 프레임 통째로
  // 덮어썼는데, 히어로·매니페스토의 분할 배경 레이어(`.hero__depth`/`.manifesto__depth`)는 패럴럭스로
  // 밀릴 때 가장자리가 비는 걸 막으려고 CSS에서 `scale()`도 같이 줘야 해서 — 통째로 덮어쓰는 대신
  // `--parallax-y` CSS 변수만 갱신하고 실제 `transform`은 각 요소 CSS가 조합(블롭은 translateY만,
  // 분할 배경은 scale+translateY)하도록 변경. 블롭 쪽은 동작 동일(해당 CSS가 translateY만 사용).
  const parallaxEls = [...document.querySelectorAll("[data-speed]")];
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    function applyParallax() {
      ticking = false;
      const viewportCenter = window.innerHeight / 2;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        el.style.setProperty("--parallax-y", (-(elCenter - viewportCenter) * speed).toFixed(1) + "px");
      });
    }
    applyParallax();
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
    }, { passive: true });
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

  // ---- 헤더 "드롭 알림 받기" 모달 — 2026-11-07 59차 ----
  // 기존엔 #cta로 스크롤만 하는 장식용 버튼이었음(브리프 지적) — 실제 신청 UI(검증·상태·접근성
  // 포커스 관리)를 갖춘 모달로 교체. 이메일 전송 서버가 없으므로 성공 메시지에 프로토타입임을
  // 명시(위 .cta__done과 동일 원칙).
  const ctaModal = document.querySelector("[data-cta-modal]");
  const ctaOpenBtn = document.querySelector("[data-cta-open]");
  if (ctaModal && ctaOpenBtn) {
    const overlay = ctaModal.querySelector("[data-cta-modal-overlay]");
    const closeBtn = ctaModal.querySelector("[data-cta-modal-close]");
    const modalForm = ctaModal.querySelector("[data-cta-modal-form]");
    const modalInput = ctaModal.querySelector("#modalEmail");
    const errorEl = ctaModal.querySelector("[data-cta-modal-error]");
    const submitBtn = ctaModal.querySelector("[data-cta-modal-submit]");
    const doneEl = ctaModal.querySelector("[data-cta-modal-done]");
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let lastFocused = null;
    let closeTimer = null;

    function focusable() {
      return [...ctaModal.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.hidden && el.offsetParent !== null);
    }
    function showError(msg) {
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        modalInput.classList.add("is-error");
        modalInput.setAttribute("aria-invalid", "true");
      } else {
        errorEl.hidden = true;
        modalInput.classList.remove("is-error");
        modalInput.removeAttribute("aria-invalid");
      }
    }
    function resetModal() {
      modalForm.hidden = false;
      doneEl.hidden = true;
      modalForm.reset();
      showError("");
      submitBtn.disabled = false;
      submitBtn.textContent = "알림 신청";
    }
    function onKeydown(e) {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function openModal() {
      clearTimeout(closeTimer);
      lastFocused = document.activeElement;
      ctaModal.hidden = false;
      document.documentElement.style.overflow = "hidden";
      requestAnimationFrame(() => {
        ctaModal.classList.add("is-open");
        modalInput.focus();
      });
      document.addEventListener("keydown", onKeydown);
    }
    function closeModal() {
      ctaModal.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      closeTimer = setTimeout(() => { ctaModal.hidden = true; resetModal(); }, reduceMotion ? 0 : 300);
      if (lastFocused) lastFocused.focus();
    }

    ctaOpenBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
    modalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = modalInput.value.trim();
      if (!value) { showError("이메일 주소를 입력해주세요."); modalInput.focus(); return; }
      if (!EMAIL_RE.test(value)) { showError("올바른 이메일 형식이 아니에요."); modalInput.focus(); return; }
      showError("");
      submitBtn.disabled = true;
      submitBtn.textContent = "신청 중…";
      setTimeout(() => {
        modalForm.hidden = true;
        doneEl.hidden = false;
        doneEl.focus();
      }, reduceMotion ? 0 : 500);
    });
  }
})();
