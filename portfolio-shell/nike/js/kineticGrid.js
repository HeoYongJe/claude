// ---- 쇼케이스 배경 "Kinetic Grid" ----
// 2026-11-02: 사용자가 제공한 React/Framer 컴포넌트(Originkit "Kinetic Grid")를 바닐라 캔버스로 포팅.
// 커서 쪽으로 격자점이 당겨지고 트레일 선이 따라다니는 장식 레이어 — design.md Motion §5 "마우스 정밀도
// 의존 디테일 레이어는 과함" 원칙과 충돌해 먼저 확인했고, 사용자가 "design.md는 포트폴리오 전반 기준,
// 바꿔달라면 그때그때 바꿔주면 된다"고 명시적으로 승인해 추가(design.md 참고). 신발 뒤 순수 배경
// 텍스처로만 깔림 — 색은 원본의 파랑 계열 대신 나이키 팔레트(§2)의 text-on-dark/volt로 교체.
(function () {
  "use strict";
  const canvas = document.querySelector("[data-showcase-gridfx]");
  if (!canvas) return;
  const host = canvas.parentElement; // .showcase__stage
  const ctx = canvas.getContext("2d");
  if (!ctx || !host) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const DOT_RGB = "245,245,245"; // --text-on-dark
  const LINE_RGB = "215,255,62"; // --volt
  const GAP = 46;
  const RADIUS = 260;
  const PULL = 2.4;

  let W = 1, H = 1;
  let cols = [];
  let dots = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const trailPts = [];

  function build() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = [];
    dots = [];
    const nCols = Math.floor(W / GAP) + 2;
    const nRows = Math.floor(H / GAP) + 2;
    for (let c = 0; c < nCols; c++) {
      const col = [];
      for (let rI = 0; rI < nRows; rI++) {
        const hx = c * GAP, hy = rI * GAP;
        const d = { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
        col.push(d);
        dots.push(d);
      }
      cols.push(col);
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgb(" + LINE_RGB + ")";
    ctx.lineWidth = 0.75;
    for (let c = 0; c < cols.length; c++) {
      for (let rI = 0; rI < cols[c].length; rI++) {
        const d = cols[c][rI];
        const right = cols[c + 1] && cols[c + 1][rI];
        const down = cols[c][rI + 1];
        if (right) { ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(right.hx, right.hy); ctx.stroke(); }
        if (down) { ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(down.hx, down.hy); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgb(" + DOT_RGB + ")";
    for (const d of dots) {
      ctx.beginPath(); ctx.arc(d.hx, d.hy, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  build();
  // main.js의 히어로/매니페스토 offsetTop 재측정과 동일한 이유(2026-10-19 설계 메모 참고) — 스크립트
  // 실행 시점엔 웹폰트가 아직 안 끝나 레이아웃이 확정 전일 수 있어, 폰트 로드·load 이벤트 후 한 번 더
  // 재측정해야 `.showcase__stage`의 실제 100vh 크기를 정확히 잡음(처음엔 엉뚱한 크기로 빌드되는 버그 확인).
  document.fonts.ready.then(() => { build(); if (!canHover || reduceMotion) drawStatic(); });
  window.addEventListener("load", () => { build(); if (!canHover || reduceMotion) drawStatic(); });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (!canHover || reduceMotion) drawStatic();
    }, 150);
  });

  // 터치·모션축소 환경: 정적 격자 1프레임만 그리고 커서 추종·rAF 루프 자체를 돌지 않음(배터리·성능 보호).
  if (reduceMotion || !canHover) {
    drawStatic();
    return;
  }

  function setMouse(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const mx = clientX - r.left, my = clientY - r.top;
    mouse.x = mx; mouse.y = my; mouse.active = true;
    const now = performance.now();
    trailPts.push({ x: mx, y: my, t: now });
    if (trailPts.length > 80) trailPts.shift();
  }
  host.addEventListener("mousemove", (e) => setMouse(e.clientX, e.clientY));
  host.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = -9999; mouse.y = -9999;
  });

  // 스테이지가 화면 밖(핀 구간 밖)일 땐 rAF를 돌지 않음 — 스크롤로 한참 지나친 뒤에도 계속 그리는 낭비 방지.
  let inView = false;
  const stageWrap = host.closest(".showcase__stage-wrap") || host;
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) requestAnimationFrame(frame);
  });
  io.observe(stageWrap);

  function frame() {
    if (!inView) return;
    ctx.clearRect(0, 0, W, H);

    for (const d of dots) {
      let ax = (d.hx - d.x) * 0.08;
      let ay = (d.hy - d.y) * 0.08;
      if (mouse.active) {
        const dx = mouse.x - d.x, dy = mouse.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS && dist > 0.001) {
          const f = (1 - dist / RADIUS) * PULL;
          ax += (dx / dist) * f;
          ay += (dy / dist) * f;
        }
      }
      d.vx = (d.vx + ax) * 0.82;
      d.vy = (d.vy + ay) * 0.82;
      d.x += d.vx; d.y += d.vy;
    }

    for (let c = 0; c < cols.length; c++) {
      for (let rI = 0; rI < cols[c].length; rI++) {
        const d = cols[c][rI];
        const right = cols[c + 1] && cols[c + 1][rI];
        const down = cols[c][rI + 1];
        const prox = mouse.active
          ? Math.max(0, 1 - Math.sqrt((mouse.x - d.x) ** 2 + (mouse.y - d.y) ** 2) / RADIUS)
          : 0;
        if (right) {
          ctx.globalAlpha = 0.05 + prox * 0.55;
          ctx.strokeStyle = "rgb(" + LINE_RGB + ")";
          ctx.lineWidth = 0.5 + prox * 1.3;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(right.x, right.y); ctx.stroke();
        }
        if (down) {
          ctx.globalAlpha = 0.05 + prox * 0.55;
          ctx.strokeStyle = "rgb(" + LINE_RGB + ")";
          ctx.lineWidth = 0.5 + prox * 1.3;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(down.x, down.y); ctx.stroke();
        }
      }
    }

    for (const d of dots) {
      const prox = mouse.active
        ? Math.max(0, 1 - Math.sqrt((mouse.x - d.x) ** 2 + (mouse.y - d.y) ** 2) / RADIUS)
        : 0;
      ctx.globalAlpha = 0.18 + prox * 0.7;
      ctx.fillStyle = "rgb(" + DOT_RGB + ")";
      ctx.beginPath(); ctx.arc(d.x, d.y, 0.8 + prox * 2, 0, Math.PI * 2); ctx.fill();
    }

    const now = performance.now();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 1; i < trailPts.length; i++) {
      const a = trailPts[i - 1], b = trailPts[i];
      const age = now - b.t;
      if (age > 260) continue;
      ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.8;
      ctx.strokeStyle = "rgb(" + LINE_RGB + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }
})();
