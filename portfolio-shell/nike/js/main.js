(function () {
  const root = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

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

  // ---- 제품 쇼케이스: 섹션 진입 시 스우시 드로잉 + 스크롤 스크러빙(계속 회전·확대) ----
  const showcase = document.querySelector(".showcase");
  const showcaseVisual = document.querySelector(".ph-visual--shoe svg");
  if (showcase && !reduceMotion) {
    const showcaseIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => showcase.classList.toggle("is-in", entry.isIntersecting));
      },
      { threshold: 0.3 }
    );
    showcaseIO.observe(showcase);
  } else if (showcase) {
    showcase.classList.add("is-in");
  }

  // ---- rAF 루프: 스크롤 스크러빙 + 커스텀 커서 lerp 추적을 한 곳에서 처리 ----
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");

  if (!reduceMotion) {
    document.addEventListener(
      "mousemove",
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
      },
      { passive: true }
    );

    function raf() {
      // 커서 링은 점보다 느리게 따라와 트레일링 느낌
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      if (cursorDot) cursorDot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%,-50%)`;
      if (cursorRing) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;

      // 쇼케이스 섹션 스크롤 진행률(0~1)에 비주얼을 계속 바인딩
      if (showcaseVisual && showcase) {
        const rect = showcase.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        const rotate = progress * 50 - 10; // -10deg ~ 40deg
        const scale = 0.9 + progress * 0.25;
        showcaseVisual.style.transform = `rotate(${rotate}deg) scale(${scale})`;
      }

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // ---- 커스텀 커서: 호버 가능 기기에서만 활성화 ----
  if (canHover && !reduceMotion) {
    document.documentElement.classList.add("cursor-active");
    const hoverables = document.querySelectorAll("a, button, .lb-tile");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (cursorRing) {
          cursorRing.classList.add("is-hover");
          cursorRing.classList.toggle("is-hover-label", el.classList.contains("lb-tile"));
        }
      });
      el.addEventListener("mouseleave", () => {
        if (cursorRing) { cursorRing.classList.remove("is-hover"); cursorRing.classList.remove("is-hover-label"); }
      });
    });
  }

  // ---- 마그네틱 버튼: 커서가 가까이 오면 버튼이 살짝 끌려옴 ----
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".nav__cta, .cta__btn").forEach((btn) => {
      const strength = 0.35;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = "translate(0,0)"; });
    });
  }

  // ---- 3D 틸트: 스펙 카드 · 룩북 타일 ----
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".spec-card, .lb-tile").forEach((card) => {
      const max = 8; // deg
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(1.02)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(600px) rotateX(0) rotateY(0) scale(1)";
      });
    });
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
