/* eslint-disable */
// 히어로 "NIKE" — 글자 스태거 대신 파티클 조립/흩어짐 연출 (2026-11-09, 79차·80차)
// 실제 텍스트(.hero__word의 .letter span들, js/main.js가 생성)는 건드리지 않고 그대로 둔다 —
// syncHeroLayout()의 레이아웃 측정 기준점이자 스크린리더용 aria-label 출처라 구조를 깨면 안 됨.
// main.js의 setHeroRevealed()가 토글하는 .hero__word의 "is-revealed" 클래스만 MutationObserver로
// 지켜봐서 독립적으로 동작 — 히어로 재진입 시 재생(replay)도 자동으로 따라온다.
// ⚠️ 80차: 1차 버전은 캔버스를 .hero__word(글자 박스) 안에 가둬서, 흩어진 파티클이 글자 바로
// 주변의 좁은 영역에서만 맴돌아 "컨테이너에 갇혀 보인다"는 피드백을 받음 — 캔버스를 .hero__inner
// (히어로 전체를 감싸는 요소, 스크롤 줌아웃 transform도 여기 걸려 있어 같이 움직임)의 자식으로
// 옮기고 히어로 섹션 전체 크기로 키워, 파티클이 화면 전체에 흩어졌다가 NIKE 자리로 모이도록 함.
// .hero__word의 실제 위치는 offsetLeft/offsetTop(레이아웃 값, transform의 영향을 받지 않음)으로
// 캔버스 좌표계에 환산 — getBoundingClientRect를 쓰면 스크롤 줌 transform이 걸려있을 때 값이
// 틀어질 수 있어 피함.
(function () {
  "use strict";
  const hero = document.querySelector(".hero");
  const heroInner = document.querySelector(".hero__inner");
  const heroWord = document.querySelector(".hero__word");
  if (!hero || !heroInner || !heroWord) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-hero-nike-canvas", "");
  if (!canvas.getContext) return;
  heroInner.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = reduceMotion ? 1 : 1000;

  let W = 0, H = 0, dpr = 1;
  let particles = [];

  function buildParticles(homeOffsetX, homeOffsetY) {
    if (!W || !H) { particles = []; return; }
    const cs = getComputedStyle(heroWord);
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = "#fff";
    octx.fillText(
      "NIKE",
      homeOffsetX + heroWord.offsetWidth / 2,
      homeOffsetY + heroWord.offsetHeight / 2,
      heroWord.offsetWidth
    );
    let data;
    try {
      data = octx.getImageData(0, 0, W, H).data;
    } catch (_) {
      return;
    }
    const fontPx = parseFloat(cs.fontSize) || 100;
    // 80차: 격자(그리드)가 그대로 드러나 "간격이 고르지 않다/인쇄 하프톤 같다"는 지적 — 샘플링
    // 간격을 촘촘히(÷60) 하고, 각 점을 자기 칸 안에서 무작위로 살짝 흔들어(jitter) 기계적인
    // 격자 느낌을 지움.
    const gap = Math.max(2, Math.round(fontPx / 60));
    const pts = [];
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 70) {
          const jx = x + (Math.random() - 0.5) * gap * 0.8;
          const jy = y + (Math.random() - 0.5) * gap * 0.8;
          pts.push([jx, jy]);
        }
      }
    }
    particles = pts.map(([hx, hy]) => {
      // 흩어진 상태는 글자 주변이 아니라 히어로 화면 전체(캔버스 전체) 어디든 될 수 있게 —
      // 약간의 여유(±8%)를 둬 가장자리 밖에서 날아들어오는 듯한 느낌도 섞는다.
      const outX = (Math.random() * 1.16 - 0.08) * W;
      const outY = (Math.random() * 1.16 - 0.08) * H;
      return {
        homeX: hx,
        homeY: hy,
        outX,
        outY,
        r: 0.9 + Math.random() * 1.0,
      };
    });
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, hero.offsetWidth);
    H = Math.max(1, hero.offsetHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    // heroInner는 .hero 기준 offsetLeft/offsetTop만큼 안쪽에 있으므로, 캔버스를 그만큼
    // 반대로 당겨 캔버스 로컬 (0,0)이 .hero의 (0,0)과 겹치게 만든다 — 둘 다 레이아웃 값이라
    // syncHeroLayout이 .hero__inner에 거는 transform(스크롤 줌)의 영향을 받지 않는다.
    const canvasOffsetX = -heroInner.offsetLeft;
    const canvasOffsetY = -heroInner.offsetTop;
    canvas.style.left = canvasOffsetX + "px";
    canvas.style.top = canvasOffsetY + "px";
    const homeOffsetX = heroWord.offsetLeft - canvasOffsetX;
    const homeOffsetY = heroWord.offsetTop - canvasOffsetY;
    buildParticles(homeOffsetX, homeOffsetY);
  }

  let state = heroWord.classList.contains("is-revealed") ? "active" : "idle";
  let animStart = performance.now();
  let hasRevealed = state === "active";

  function assemble() {
    if (state === "active" || state === "assembling") return;
    state = "assembling";
    animStart = performance.now();
  }
  function scatter() {
    if (state === "idle" || state === "scattering") return;
    state = "scattering";
    animStart = performance.now();
  }

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  let lastDrawnIdle = false;

  function frame() {
    requestAnimationFrame(frame);
    if (!particles.length || !W || !H) return;
    const elapsed = performance.now() - animStart;
    const t = easeOutCubic(Math.min(1, elapsed / DUR));
    if (state === "assembling" && t >= 1) state = "active";
    if (state === "scattering" && t >= 1) state = "idle";
    if (state === "idle") {
      if (!lastDrawnIdle) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        lastDrawnIdle = true;
      }
      return;
    }
    lastDrawnIdle = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#F5F5F5";
    for (const p of particles) {
      let px, py;
      if (state === "active") {
        px = p.homeX;
        py = p.homeY;
      } else if (state === "assembling") {
        px = p.outX + (p.homeX - p.outX) * t;
        py = p.outY + (p.homeY - p.outY) * t;
      } else {
        px = p.homeX + (p.outX - p.homeX) * t;
        py = p.homeY + (p.outY - p.homeY) * t;
      }
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function scheduleResize() {
    resize();
  }
  const ro = new ResizeObserver(() => scheduleResize());
  ro.observe(hero);
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scheduleResize, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleResize);

  resize();
  heroWord.classList.add("has-particles");
  requestAnimationFrame(frame);

  const mo = new MutationObserver(() => {
    const revealed = heroWord.classList.contains("is-revealed");
    if (revealed && !hasRevealed) {
      hasRevealed = true;
      assemble();
    } else if (!revealed && hasRevealed) {
      hasRevealed = false;
      scatter();
    }
  });
  mo.observe(heroWord, { attributes: true, attributeFilter: ["class"] });
})();
