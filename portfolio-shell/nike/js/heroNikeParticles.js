/* eslint-disable */
// 히어로 "NIKE" — 글자 스태거 대신 파티클 조립/흩어짐 연출 (2026-11-09, 79차·80차·82차)
// 82차: 조립이 끝난 뒤에도 계속 점으로 남아있지 말고 실제 폰트 글자로 보이도록 — 조립 완료
// (active) 시점에 캔버스를 페이드아웃하고 숨겨뒀던 실제 텍스트를 페이드인(css transition,
// has-particles/is-settled 클래스 토글). 흩어질 때(scatter)는 반대로 즉시 원복.
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
    // 83차: letter-spacing(-.02em)이 실제 텍스트엔 적용돼 있는데 캔버스 fillText엔 반영이
    // 안 돼 있었음 — 캔버스가 더 넓게 그려져 조립 완료 순간 실제 글자 위치와 어긋나는 원인 중
    // 하나. 지원 브라우저(Canvas letterSpacing)에서는 그대로 맞춰줌.
    if ("letterSpacing" in octx) {
      try { octx.letterSpacing = cs.letterSpacing; } catch (_) { /* 미지원 브라우저는 무시 */ }
    }
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
    // 81차: 80차에서 넣은 jitter(칸 안에서 무작위로 흔들기)가 사용자가 보여준 원본 예시(칼같이
    // 정렬된 격자, 흔들림 없음)와 반대 방향이었음 — "간격이 일정하지 않다"는 원래 격자가 성겨서
    // 점과 점 사이 빈틈이 크게 보인다는 뜻이었는데, 그걸 "너무 기계적이다"로 잘못 해석해 흔들어버려
    // 오히려 울퉁불퉁해짐. jitter 제거 + 격자를 그대로 유지하되, 점 반지름을 격자 간격에 거의 맞춰
    // (gap의 ~44%) 점끼리 서로 가까이 붙게 키워서 원본처럼 촘촘하고 깔끔한 모자이크로 보이게 함.
    const gap = Math.max(2, Math.round(fontPx / 46));
    const pts = [];
    let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 110) {
          pts.push([x, y]);
          if (x < sMinX) sMinX = x;
          if (x > sMaxX) sMaxX = x;
          if (y < sMinY) sMinY = y;
          if (y > sMaxY) sMaxY = y;
        }
      }
    }
    // 83차: "파티클이 합쳐지는 순간 위치가 변동된다(최종 NIKE 텍스트 위치가 맞음)" — 캔버스
    // fillText의 textBaseline:"middle" 기준 중앙과, 실제 .letter span들이 줄간격(line-height:.9)
    // 기준으로 렌더링되는 중앙이 폰트 메트릭 차이로 정확히 일치하지 않아 생긴 어긋남. letterSpacing
    // 보정만으론 세로 방향은 못 맞추므로, 실제 .letter span의 레이아웃 박스(offsetLeft/Top —
    // transform의 영향을 받지 않는 값이라 글자 애니메이션 진행 상태와 무관하게 항상 정확)를 직접
    // 재서 캔버스 샘플링 결과의 중심을 거기 맞춰 평행이동시킴 — 폰트 메트릭을 추측하는 대신 실제
    // 렌더링된 위치를 기준점으로 삼는 쪽이 더 정확.
    let dx = 0, dy = 0;
    const letters = heroWord.querySelectorAll(".letter");
    if (letters.length && pts.length) {
      let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
      letters.forEach((l) => {
        rMinX = Math.min(rMinX, l.offsetLeft);
        rMinY = Math.min(rMinY, l.offsetTop);
        rMaxX = Math.max(rMaxX, l.offsetLeft + l.offsetWidth);
        rMaxY = Math.max(rMaxY, l.offsetTop + l.offsetHeight);
      });
      const realCenterX = homeOffsetX + (rMinX + rMaxX) / 2;
      const realCenterY = homeOffsetY + (rMinY + rMaxY) / 2;
      dx = realCenterX - (sMinX + sMaxX) / 2;
      dy = realCenterY - (sMinY + sMaxY) / 2;
    }
    const particleR = gap * 0.44;
    particles = pts.map(([sx, sy]) => {
      const hx = sx + dx;
      const hy = sy + dy;
      // 흩어진 상태는 글자 주변이 아니라 히어로 화면 전체(캔버스 전체) 어디든 될 수 있게 —
      // 약간의 여유(±8%)를 둬 가장자리 밖에서 날아들어오는 듯한 느낌도 섞는다.
      const outX = (Math.random() * 1.16 - 0.08) * W;
      const outY = (Math.random() * 1.16 - 0.08) * H;
      return {
        homeX: hx,
        homeY: hy,
        outX,
        outY,
        r: particleR,
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
    // 82차: 조립이 끝나(active) 자리잡은 뒤에도 계속 점으로만 남아있지 말고, 실제 폰트 글자로
    // 바뀌도록 — 흩어지는 중엔(scatter) 다시 점으로 되돌려야 하니 여기서 선제적으로 원복.
    canvas.classList.remove("is-settled");
    heroWord.classList.add("has-particles");
    state = "assembling";
    animStart = performance.now();
  }
  function scatter() {
    if (state === "idle" || state === "scattering") return;
    canvas.classList.remove("is-settled");
    heroWord.classList.add("has-particles");
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
    if (state === "assembling" && t >= 1) {
      state = "active";
      // 조립 완료 — 파티클(캔버스)은 페이드아웃하고 실제 폰트 글자를 페이드인(css transition).
      canvas.classList.add("is-settled");
      heroWord.classList.remove("has-particles");
    }
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
