/* eslint-disable */
// 히어로 "NIKE" — 글자 스태거 대신 파티클 조립/흩어짐 연출 (2026-11-09, 79차)
// 실제 텍스트(.hero__word의 .letter span들, js/main.js가 생성)는 건드리지 않고 그대로 둔다 —
// syncHeroLayout()의 레이아웃 측정 기준점이자 스크린리더용 aria-label 출처라 구조를 깨면 안 됨.
// 그 위에 캔버스를 덮어 시각적으로만 파티클로 보여주고, 원래 텍스트는 css(.hero__word.has-particles)
// 로 투명 처리한다. main.js의 setHeroRevealed()가 토글하는 .hero__word의 "is-revealed" 클래스만
// MutationObserver로 지켜봐서 독립적으로 동작 — 히어로 재진입 시 재생(replay)도 자동으로 따라온다.
(function () {
  "use strict";
  const heroWord = document.querySelector(".hero__word");
  if (!heroWord) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  if (!canvas.getContext) return;
  heroWord.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = reduceMotion ? 1 : 900;

  let W = 0, H = 0, dpr = 1;
  let particles = [];

  function buildParticles() {
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
    octx.fillText("NIKE", W / 2, H / 2, W);
    let data;
    try {
      data = octx.getImageData(0, 0, W, H).data;
    } catch (_) {
      return;
    }
    const fontPx = parseFloat(cs.fontSize) || 100;
    const gap = Math.max(2, Math.round(fontPx / 42));
    const pts = [];
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 80) pts.push([x, y]);
      }
    }
    particles = pts.map(([hx, hy]) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(W, H) * (0.5 + Math.random() * 0.55);
      return {
        homeX: hx,
        homeY: hy,
        outX: hx + Math.cos(angle) * dist,
        outY: hy + Math.sin(angle) * dist,
        r: 1.1 + Math.random() * 1.1,
      };
    });
  }

  function resize() {
    const rect = heroWord.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    buildParticles();
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

  const ro = new ResizeObserver(() => resize());
  ro.observe(heroWord);
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
