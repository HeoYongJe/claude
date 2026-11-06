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

  // ---- 인앱 앵커 링크(nav의 #top·#cta) 스크롤 ----
  // 2026-11-05 39차: 네이티브 scroll-snap(css 참고)이 각 패널에 scroll-snap-stop:always를 걸어두면,
  // smooth scrollIntoView로 먼 패널까지 한 번에 건너뛰려 해도 중간 패널마다 강제로 멈췄다 다시
  // 출발하길 반복해 뚝뚝 끊겨 보임 — 앵커 점프는 behavior:"auto"(즉시 이동)로 처리하고, 네이티브
  // 스냅이 도착 지점을 알아서 해당 패널 상단에 맞춰줌.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "auto", block: "start" });
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

  // ---- 제품 쇼케이스: 2026-11-06 42차 — "섹션 하나도 스크롤마다 단계적으로 전환돼야 한다"는
  //      요청으로, 신발을 .showcase__sticky(position:sticky)로 화면에 고정해두고 그 뒤를 지나가는
  //      투명 마커 3개(각 100svh, css에서 scroll-snap-align:start로 html의 기존 네이티브 스냅에
  //      이미 걸려 있음 — "마커 하나 = 스크롤 한 번"은 CSS만으로 보장됨) 중 지금 뷰포트에 걸린
  //      것을 보고 .showcase__sticky의 data-stage(1~3)를 갱신. 실제 위치·투명도 변화는 전부
  //      css의 [data-stage] attribute selector + transition이 담당 — 여기선 "지금 몇 단계인지"만
  //      갱신. ----
  const showcaseSticky = document.querySelector("[data-showcase-sticky]");
  const showcaseMarkers = [...document.querySelectorAll("[data-showcase-marker]")];
  if (showcaseSticky && showcaseMarkers.length) {
    if (reduceMotion) {
      showcaseSticky.dataset.stage = String(showcaseMarkers.length);
    } else {
      const stageIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              showcaseSticky.dataset.stage = String(showcaseMarkers.indexOf(entry.target) + 1);
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

  // ---- [data-speed] 배경 블롭 패럴럭스(룩북~CTA 장식) ----
  // 2026-11-05 39차: 히어로 줌아웃·매니페스토 핀드줌·쇼케이스 스크럽을 전부 걷어내며(위 참고),
  // 휠 이벤트를 가로채던 "커스텀 휠 스무스 스크롤"도 함께 제거 — preventDefault+scrollTo로 직접
  // 스크롤 위치를 쓰던 그 코드가 네이티브 scroll-snap(css 참고)의 스냅 판정과 정면 충돌하기
  // 때문(브라우저가 스냅을 계산할 "진짜" 스크롤 제스처 자체를 가로채버림). 장식용 블롭 패럴럭스만
  // 가벼운 루프로 남김 — 패널이 불연속으로(스냅) 움직여도 자연스럽게 같이 따라옴.
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
        el.style.transform = `translateY(${(-(elCenter - viewportCenter) * speed).toFixed(1)}px)`;
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
})();
