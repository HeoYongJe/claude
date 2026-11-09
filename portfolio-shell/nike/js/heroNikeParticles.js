/* eslint-disable */
// 히어로 "NIKE" — 글자 스태거 대신 파티클 조립/흩어짐 연출 (2026-11-09, 79차·80차·82차·86차)
// 86차: 파티클이 "NIKE" 글자 모양을 캔버스로 재현하려던 걸 전부 버리고(83~85차 거듭 실패,
// 아래 buildParticles 주석 참고), .hero__word 박스에 꽉 차는 타원형 덩어리로 단순화 —
// 폰트 렌더링과 무관한 순수 기하학이라 실제 텍스트와 어긋날 여지 자체가 없음.
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

  // ⚠️ 83~85차에서 거듭 시도하고 폐기한 접근: 캔버스 `fillText`로 "NIKE"를 그려서(한 번에,
  // 그다음 글자별로) 그 알파를 샘플링해 실제 텍스트 위치에 맞추려 했음 — 매번 "거의" 맞았지만
  // (단어 중심 0.2px, 글자 단위도 수 px까지 줄임) 사용자가 실제로 보면 여전히 어긋나 보임.
  // **근본 원인**: Canvas2D의 텍스트 래스터라이저와 브라우저의 실제 DOM 텍스트 레이아웃/렌더링
  // 엔진은 애초에 서로 다른 두 시스템 — 같은 폰트·크기를 지정해도 커닝·힌팅·서브픽셀 처리가
  // 완전히 똑같다는 보장이 없음. 계속 "근사"를 더 정교하게 다듬는 대신, 85차 피드백("hero__word
  // 위치를 잡고 파티클을 거기 맞추면 되잖아")대로 **글자 모양을 캔버스로 재현하려는 시도 자체를
  // 버림** — 파티클은 "NIKE"라는 글자 모양을 흉내 내지 않고, `.hero__word`의 실제 박스
  // (offsetLeft/Top/Width/Height — transform 영향 없는 레이아웃 값, 즉 사용자가 말한 "그 위치")
  // 안에 꽉 차는 둥근 타원형 덩어리로 모인다. 폰트 렌더링과 전혀 무관한 순수 기하학적 좌표라
  // 두 렌더링 엔진 사이에 어긋날 여지 자체가 없음 — "글자처럼 보이는 점들"이 아니라 "글자가
  // 있을 자리에 정확히 뭉쳤다가 글자로 바뀌는" 연출로, 요청("파티클로 느낌만 내고 완성되면
  // 실제 글자")의 핵심도 그대로 만족.
  function buildParticles(homeOffsetX, homeOffsetY) {
    if (!W || !H) { particles = []; return; }
    const boxW = heroWord.offsetWidth;
    const boxH = heroWord.offsetHeight;
    if (!boxW || !boxH) { particles = []; return; }
    const cx = homeOffsetX + boxW / 2;
    const cy = homeOffsetY + boxH / 2;
    const rx = boxW / 2;
    const ry = boxH / 2;
    const fontPx = parseFloat(getComputedStyle(heroWord).fontSize) || 100;
    const gap = Math.max(2, Math.round(fontPx / 20));
    const pts = [];
    for (let y = -ry; y <= ry; y += gap) {
      for (let x = -rx; x <= rx; x += gap) {
        // 타원 안쪽인지(둥근 경계) — 직사각형 박스 그대로 꽉 채우면 네모져 보여서 타원으로.
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) pts.push([cx + x, cy + y]);
      }
    }
    const particleR = gap * 0.44;
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
