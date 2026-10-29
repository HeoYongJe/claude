(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // ---- 등장 애니메이션(data-reveal) — 룩북 타일은 같은 매커니즘으로 is-revealed만 받고,
  //      실제 비주얼(클립패스 와이프)은 CSS에서 .lb-tile[data-reveal] 쪽이 더 구체적이라 오버라이드됨 ----
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
  const showcaseRing = document.querySelector("[data-showcase-ring]");

  // ---- 룩북 슬라이더: 센터 강조 캐러셀 + 화살표/점/마우스 드래그 네비 ----
  // 2026-10-29 2차: "가운데가 양옆보다 크게, 돌아갈 때마다 가운데가 커 보이게, 마우스로도 슬라이드되게,
  // 끝에 다다르면 빈 화면이 생긴다" 피드백 — CSS 쪽에서 scroll-snap-align을 center로 바꾸고 좌우
  // padding을 센터링 전용 공식으로 재계산(끝 빈 화면 버그의 원인이던 좌우 비대칭 padding 해소, css 참고).
  // 여기서는 스크롤/드래그될 때마다 각 슬라이드-트랙 중심 거리로 scale/opacity를 계속 갱신.
  const lookbookTrack = document.querySelector("[data-lookbook-track]");
  if (lookbookTrack) {
    const slides = [...lookbookTrack.children];
    const dotsWrap = document.querySelector("[data-lookbook-dots]");
    const prevBtn = document.querySelector("[data-lookbook-prev]");
    const nextBtn = document.querySelector("[data-lookbook-next]");
    const dots = slides.map((slide, i) => {
      if (!dotsWrap) return null;
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "lookbook__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `${i + 1}번째 슬라이드로 이동`);
      dot.addEventListener("click", () => slide.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
      dotsWrap.appendChild(dot);
      return dot;
    });

    // 센터에 가까울수록 크고 또렷하게(reduced-motion에서는 끄고 CSS 기본 크기 그대로 둠).
    let emphasisQueued = false;
    function updateEmphasis() {
      const trackRect = lookbookTrack.getBoundingClientRect();
      const centerX = trackRect.left + trackRect.width / 2;
      let closest = 0;
      let closestDist = Infinity;
      slides.forEach((slide, i) => {
        const r = slide.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - centerX);
        if (dist < closestDist) { closestDist = dist; closest = i; }
        if (!reduceMotion) {
          const norm = Math.min(1, dist / (trackRect.width / 2));
          const scale = 1.06 - norm * 0.26; // 센터 ~1.06, 가장자리 ~0.8
          const opacity = Math.max(0.45, 1 - norm * 0.5);
          slide.style.transform = `scale(${scale.toFixed(3)})`;
          slide.style.opacity = opacity.toFixed(3);
        }
      });
      dots.forEach((dot, i) => dot && dot.classList.toggle("is-active", i === closest));
      emphasisQueued = false;
    }
    updateEmphasis();
    lookbookTrack.addEventListener("scroll", () => {
      if (!emphasisQueued) {
        emphasisQueued = true;
        requestAnimationFrame(updateEmphasis);
      }
    }, { passive: true });
    window.addEventListener("resize", updateEmphasis);

    if (prevBtn) prevBtn.addEventListener("click", () => lookbookTrack.scrollBy({ left: -(slides[0].offsetWidth + 20), behavior: "smooth" }));
    if (nextBtn) nextBtn.addEventListener("click", () => lookbookTrack.scrollBy({ left: slides[0].offsetWidth + 20, behavior: "smooth" }));

    // 마우스 클릭+드래그로도 넘기기("버튼 말고 마우스로도 슬라이드되게") — 트랙패드/휠은 이미 네이티브로 됨.
    // 드래그 중엔 scroll-snap을 끄고(css .is-dragging) scrollLeft를 1:1로 따라가게 하다가, 손을 떼면
    // snap이 되살아나 가장 가까운 슬라이드로 자연스럽게 정렬됨.
    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragScrollStart = 0;
    lookbookTrack.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragMoved = false;
      dragStartX = e.pageX;
      dragScrollStart = lookbookTrack.scrollLeft;
      lookbookTrack.classList.add("is-dragging");
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.pageX - dragStartX;
      if (Math.abs(dx) > 4) dragMoved = true;
      lookbookTrack.scrollLeft = dragScrollStart - dx;
    });
    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      lookbookTrack.classList.remove("is-dragging");
    });
    lookbookTrack.addEventListener("dragstart", (e) => e.preventDefault());
    // 드래그 끝에 자식 요소가 의도치 않게 클릭되는 것 방지
    lookbookTrack.addEventListener("click", (e) => { if (dragMoved) { e.preventDefault(); e.stopPropagation(); } }, true);
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

  // ---- rAF 루프: 히어로 줌아웃 스크럽 + 매니페스토 핀드줌 스크럽 + 쇼케이스 비주얼 스크럽
  //      + [data-speed] 배경 패럴럭스 ----
  // 실제 스크롤 위치를 바로 쓰지 않고 lerp로 보간한 "스무스 스크롤 값"을 스크럽 계산에 써서
  // 트랙패드·휠 스크롤의 미세한 끊김이 그대로 전달되지 않고 부드럽게 쫓아가는 느낌을 만든다
  // (가뿐 히어로 패럴럭스의 lerp(0.09) 패턴과 동일 — 2026-10-19, "스크롤 효과가 더 부드러웠으면" 피드백 반영).
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
    function measure() {
      bounds = {
        hero: heroWrap ? { start: heroWrap.offsetTop, range: heroWrap.offsetHeight - window.innerHeight } : null,
        manifesto: manifesto ? { start: manifesto.offsetTop, range: manifesto.offsetHeight - window.innerHeight } : null,
        showcaseStage: showcaseStageWrap ? { start: showcaseStageWrap.offsetTop, range: showcaseStageWrap.offsetHeight - window.innerHeight } : null,
      };
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

    let smoothY = window.scrollY;
    function raf() {
      const realY = window.scrollY;
      // 0.085 → 0.06: 마우스 휠처럼 값이 뚝뚝 끊겨 들어오는 입력에서도 체감되는 끊김이 있었음(2026-10-19 피드백) —
      // 보간 폭을 더 키워서(=더 천천히 따라가서) 개별 휠 틱들이 뭉개져 보이도록.
      smoothY += (realY - smoothY) * 0.06;
      if (Math.abs(realY - smoothY) < 0.05) smoothY = realY;

      // 히어로: hero-wrap의 추가 높이(100vh)만큼 스크롤하는 동안 진행률 0→1
      if (heroInner && bounds.hero && bounds.hero.range > 0) {
        const progress = clamp01((smoothY - bounds.hero.start) / bounds.hero.range);
        const scale = 1 + progress * 0.9; // 1 -> 1.9 (전경, 빠르게 확대)
        // 2026-10-29: 기존 *1.6은 핀 구간의 62.5% 지점에서 이미 완전히 투명해져, 나머지 37.5%는
        // 아무것도 없는 빈 화면만 스크롤되는 "죽은 구간"이었음("여백이 너무 많아 미완성 같다" 피드백의
        // 원인). progress를 그대로 써서 핀이 풀리는 정확한 순간에 다 사라지도록 range 전체를 씀.
        const opacity = Math.max(0, 1 - progress);
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
        const progress = clamp01((smoothY - bounds.manifesto.start) / (bounds.manifesto.range * 0.75));
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
      if (showcaseShoe && bounds.showcaseStage && bounds.showcaseStage.range > 0) {
        const progress = clamp01((smoothY - bounds.showcaseStage.start) / bounds.showcaseStage.range);
        // 2026-10-29: "확대됐을 때 사이즈를 조금만 줄여줘" — 최대 스케일 1.15 -> 1.0.
        const scale = 0.75 + progress * 0.25; // 0.75 -> 1.0, 확대되며 등장
        const rotate = -8 + progress * 8; // -8deg -> 0deg, 비스듬했다가 정자세로 정리
        const rise = (1 - progress) * 50; // 아래에서 살짝 떠오르며 자리 잡음
        showcaseShoe.style.transform = `translateY(${rise.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg)`;
        // 신발 뒤 글로우·링도 같은 진행률로 밝아짐 — "이펙트가 화려했으면" 피드백 반영(transform은
        // 각자 CSS 무한 애니메이션이 소유하므로 opacity만 건드려 충돌 없음, css 참고).
        if (showcaseGlow) showcaseGlow.style.opacity = (progress * 0.9).toFixed(3);
        if (showcaseRing) showcaseRing.style.opacity = (progress * 0.8).toFixed(3);
      }

      // 배경 패럴럭스: 각 섹션 배경이 콘텐츠보다 느리게(요소중심이 뷰포트중심과 가까울수록 변위 0에 수렴)
      const viewportCenter = window.innerHeight / 2;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const offset = -(elCenter - viewportCenter) * speed;
        el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
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
