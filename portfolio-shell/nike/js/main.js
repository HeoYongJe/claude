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

  // ---- 히어로 글로우: 커서를 따라가는 volt 라이트 (2026-11-08 62차, 옵션2 — 1번 스크롤
  //      패럴럭스의 보조) — .showcase__glow와 같은 단색 블러 기법을 재사용해 "오브젝트가 빛에
  //      반응한다"는 체감만 가져오고, 과거에 걷어낸 "커서 정밀도 의존 3D 틸트"(design.md §5 1차)는
  //      재도입하지 않음: 신발/워드마크 자체는 전혀 움직이지 않고, 배경 글로우 하나만 아주 느리게
  //      커서를 쫓아감. 데스크톱(hover+fine pointer)에서만 동작, lerp(0.08)로 부드럽게 따라가되
  //      15차 raf 버그 교훈대로 목표에 수렴하면 루프를 멈춤(idle 시 CPU 소모 없음).
  const heroGlow = document.querySelector("[data-hero-glow]");
  const heroEl = document.querySelector(".hero");
  if (heroGlow && heroEl && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let gx = 0, gy = 0, tx = 0, ty = 0, glowRunning = false;
    const GLOW_MAX = 90; // 중앙에서 최대 이동 거리(px) — 가장자리로 snap되지 않게 clamp
    function glowTick() {
      gx += (tx - gx) * 0.08;
      gy += (ty - gy) * 0.08;
      heroGlow.style.setProperty("--gx", gx.toFixed(1) + "px");
      heroGlow.style.setProperty("--gy", gy.toFixed(1) + "px");
      if (Math.abs(tx - gx) > 0.3 || Math.abs(ty - gy) > 0.3) {
        requestAnimationFrame(glowTick);
      } else {
        glowRunning = false;
      }
    }
    function kickGlow() {
      if (!glowRunning) { glowRunning = true; requestAnimationFrame(glowTick); }
    }
    heroEl.addEventListener("mousemove", (e) => {
      const rect = heroEl.getBoundingClientRect();
      tx = Math.max(-GLOW_MAX, Math.min(GLOW_MAX, (e.clientX - (rect.left + rect.width / 2)) * 0.18));
      ty = Math.max(-GLOW_MAX, Math.min(GLOW_MAX, (e.clientY - (rect.top + rect.height / 2)) * 0.18));
      kickGlow();
    });
    heroEl.addEventListener("mouseleave", () => { tx = 0; ty = 0; kickGlow(); });
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
