/* eslint-disable */
// 제품 쇼케이스 — 스우시 실루엣 파티클 포메이션 (2026-11-09, 78차)
// "신발이 튀어나오듯 등장" 대신 파티클이 흩어져 있다가 모여서 나이키 스우시 실루엣을 이루는
// 연출로 교체. 로고 이미지 파일은 쓰지 않고(design.md "스우시 로고 이미지 자산 복제 금지"
// 규칙 — 이 건에 한해 사용자 승인된 예외) 직접 정의한 베지어 중심선 + 두께 프로파일을 따라
// 점을 생성해 실루엣을 만든다(얇은 꼬리→두꺼운 몸통→뾰족한 앞코).
// ⚠️ 첫 시도(단순 닫힌 패스를 오프스크린 캔버스에 채우고 알파를 그리드로 샘플링)는 실제
// 렌더링해서 스크린샷으로 확인해보니 얇은 선 하나처럼 보여 폐기 — 중심선을 따라 두께만큼
// 수직으로 점을 뿌리는 파라메트릭 방식으로 교체 후 재확인해 스우시 형태로 보이는 것을 확인함.
// 스크롤/스냅 로직(js/main.js)은 건드리지 않고, data-showcase-sticky의 data-stage 속성
// 변화만 MutationObserver로 지켜봐서 독립적으로 동작한다.
(function () {
  "use strict";
  const canvas = document.querySelector("[data-showcase-shoe]");
  const sticky = document.querySelector("[data-showcase-sticky]");
  if (!canvas || !sticky || !canvas.getContext) return;
  const visual = canvas.closest(".showcase__visual");
  if (!visual) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = reduceMotion ? 1 : 900;

  // 스우시 중심선(꼬리→앞코 큐빅 베지어, 480×250 기준 논리 좌표) + 두께 프로파일.
  // t=0(꼬리)에서 0으로 시작해 t≈0.7(몸통)에서 최대, t=1(앞코)에서 다시 0으로 — 두께는
  // 중심선 기준 한쪽(아래)으로만 퍼지게 해 "위는 매끈한 능선, 아래는 볼록한 배"인 스우시 단면을 만든다.
  const P0 = { x: 15, y: 235 }, P1 = { x: 150, y: 205 }, P2 = { x: 280, y: 120 }, P3 = { x: 470, y: 55 };
  const LOGICAL_W = 485, LOGICAL_H = 250;
  const MAX_R = 78;

  function bezierPoint(t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * P0.x + 3 * mt * mt * t * P1.x + 3 * mt * t * t * P2.x + t * t * t * P3.x,
      y: mt * mt * mt * P0.y + 3 * mt * mt * t * P1.y + 3 * mt * t * t * P2.y + t * t * t * P3.y,
    };
  }
  function bezierTangent(t) {
    const mt = 1 - t;
    return {
      x: 3 * mt * mt * (P1.x - P0.x) + 6 * mt * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x),
      y: 3 * mt * mt * (P1.y - P0.y) + 6 * mt * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y),
    };
  }
  function thicknessAt(t) {
    return MAX_R * Math.sin(Math.PI * Math.pow(t, 1.94));
  }

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let state = sticky.dataset.stage ? "active" : "idle";
  let animStart = performance.now();
  let hasStage = !!sticky.dataset.stage;

  function buildParticles() {
    if (!W || !H) { particles = []; return; }
    const s = (Math.min(W / LOGICAL_W, H / LOGICAL_H)) * 0.92;
    const offX = (W - LOGICAL_W * s) / 2;
    const offY = (H - LOGICAL_H * s) / 2;
    // 두께 방향(법선)이 "아래"를 향하도록 t=0.7에서 부호를 한 번만 정해 전체에 사용.
    const refTan = bezierTangent(0.7);
    const refLen = Math.hypot(refTan.x, refTan.y) || 1;
    const downSign = (-refTan.y / refLen) >= 0 ? 1 : -1;

    const STEPS_T = 150;
    const SPACING = 6.5; // 논리 좌표 기준 두께 방향 점 간격
    const pts = [];
    for (let i = 0; i <= STEPS_T; i++) {
      const t = i / STEPS_T;
      const sp = bezierPoint(t);
      const tan = bezierTangent(t);
      const len = Math.hypot(tan.x, tan.y) || 1;
      const nx = (-tan.y / len) * downSign;
      const ny = (tan.x / len) * downSign;
      const r = thicknessAt(t);
      const steps = Math.max(0, Math.round(r / SPACING));
      for (let k = 0; k <= steps; k++) {
        const u = steps === 0 ? 0 : k / steps;
        pts.push([sp.x + nx * r * u, sp.y + ny * r * u]);
      }
    }
    particles = pts.map(([lx, ly]) => {
      const hx = offX + lx * s;
      const hy = offY + ly * s;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(W, H) * (0.55 + Math.random() * 0.5);
      return {
        homeX: hx,
        homeY: hy,
        outX: hx + Math.cos(angle) * dist,
        outY: hy + Math.sin(angle) * dist,
        r: 1 + Math.random() * 0.9,
      };
    });
  }

  function resize() {
    const rect = visual.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    buildParticles();
  }

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
  ro.observe(visual);
  resize();
  requestAnimationFrame(frame);

  const mo = new MutationObserver(() => {
    const stage = sticky.dataset.stage;
    if (stage && !hasStage) {
      hasStage = true;
      assemble();
    } else if (!stage && hasStage) {
      hasStage = false;
      scatter();
    }
  });
  mo.observe(sticky, { attributes: true, attributeFilter: ["data-stage"] });
})();
