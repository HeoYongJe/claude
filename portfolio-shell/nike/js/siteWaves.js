// ---- 사이트 전체 배경 "Striped Waves"(WebGL, 2026-11-05 22차) ----
// 구 js/heroWaves.js(히어로 전용, .hero__bg 안에서만 그려짐)를 페이지 전체의 position:fixed 배경으로
// 승격 — "히어로에서 돌아가는 배경 인터렉션이 전체 섹션에 걸쳐 내려오고, 그 인터렉션을 따라 아이템이
// 생기는 디자인"이라는 요청. 섹션별 완전 블랙/화이트 배경은 대부분 투명해졌고(css 참고), 이 캔버스
// 하나가 스크롤 내내 모든 섹션 뒤에서 그대로 유지된다. "아이템이 웨이브를 따라 생긴다"는 느낌은 별도
// 좌표 추적 없이 기존 [data-reveal] + IntersectionObserver(순서대로 등장, main.js)로 충분하다는 사용자
// 확인에 따라 — 배경이 하나로 이어져 보이는 것만으로 "같은 흐름 위에 아이템이 얹힌다"는 체감이 남.
// design.md Motion §5 21~22차 참고.
(function () {
  "use strict";
  const canvas = document.querySelector("[data-site-waves]");
  if (!canvas) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // body의 단색 --ink가 폴백

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) return;

  // 페이지 전체에 걸쳐 항상 떠 있는 배경이라 쇼케이스의 2D 격자(kineticGrid)보다 노출 시간이 훨씬
  // 길다 — DPR 캡은 기존과 동일하게 보수적으로 유지.
  const MAX_DPR = 1.5;
  // ⚠️ 33~35차(2026-11-05, 같은 날): "화면을 크게 쓰는 배경이잖아" 피드백에 패턴 자체를 깎거나
  // (LAYERS·TWIST·WAVE_AMOUNT 축소) 확대(ZOOM·SPREAD 축소/확대)하는 식으로 여러 번 잘못 대응함.
  // ⚠️ 36차(같은 날, 세 번째 반려): "여전히 넓고 커, 원래대로 돌려서 사이즈나 가짓수 모두 — 행동
  // 반경을 넓히라는 거지 웨이브의 크기나 가짓수를 늘리라는 게 아니다" — 그제서야 정확한 의도 파악:
  // 패턴 자체(크기·가닥 수·구불거림)는 처음부터 전혀 문제가 아니었고, **그 패턴이 화면 위를 돌아다니는
  // 범위(궤적의 반경)가 좁았던 것**이 문제였음. LAYERS·ZOOM·SPREAD·LINE_WIDTH·FALLOFF·POS_Y를
  // 전부 26차(사용자가 좋아했던 마지막 "모양") 값으로 정확히 되돌리고, **오직 공전·스크롤 패닝의
  // 반경(ORBIT_RADIUS·SCROLL_PAN_RADIUS)만 큰 폭으로 키워** 같은 모양이 화면 위 훨씬 넓은 영역을
  // 오가게 함.
  const LAYERS = 48;

  // ---- 원본 "Striped Waves" preset 2 근사값, 26차 "유기적 질감" 값으로 정확히 복원(36차) ----
  const FLOW_SPEED = 0.909, FLOW_DIR = 1.24, PHASE = 32.41;
  const ZOOM = 2.04, TILT = -1.69;
  // 2026-11-05 23차: "너무 가운데에서만 돈다, 나선형 느낌을 원한다" 피드백 — 세 가지로 대응.
  // ① 기준 위치(POS_X/POS_Y)를 화면 정중앙(-0.01, 0.06)에서 좌상단 쪽으로 옮겨 소용돌이 핵이 항상
  //    한가운데 고정돼 있지 않게 함. ② 그 기준점을 중심으로 천천히 원을 그리며 공전(ORBIT_*)시켜
  //    "나선형으로 움직인다"는 느낌을 실제 궤적으로 구현. ③ 아래 frame()에서 scrollY를 uPos에도
  //    반영해 스크롤할수록 배경 자체가 움직이게 함(1번 질문 "배경이 스크롤에 따라 움직이게 할 수
  //    있나" 답 — 가능, uPos를 scrollY에 바인딩하면 됨).
  // ⚠️ 24차(같은 날): ③을 처음엔 `scrollY * 고정계수`로 무한히 누적시켰는데, "MANIFESTO부터는 배경이
  // 안 보인다"는 피드백으로 재현해보니 — 이 셰이더는 카메라(uPos)가 패턴 중심(q.y=0)에서 멀어질수록
  // `exp2(-|q.y|*uFalloff)`로 밝기가 지수적으로 죽는 구조라, 스크롤 누적값이 계속 커지며 몇 화면만
  // 내려가도 카메라가 그 감쇠 구간 밖으로 완전히 나가버려 이후 전 구간이 깜깜했던 것(실측: 매니페스토
  // 진입 시점 scrollY≈1670에서 이미 uPos.y 이동량이 화면 높이의 80%를 넘어서고 있었음). **스크롤에
  // 비례해 무한히 멀어지는 대신, `Math.sin/cos(scrollY*SCROLL_PAN_SPEED)`로 일정 반경 안을 왕복하도록
  // 교체** — 스크롤에 계속 반응해 움직이되(요청 그대로), 아무리 많이 스크롤해도 패턴의 "밝은 구간"
  // 밖으로 영영 벗어나지 않음.
  // ⚠️ 25차(같은 날): "괜찮은데 너무 튄다, 조금만 더 죽이고, 위치를 사이드나 사선으로 빼서 덩쿨
  // 느낌으로" — 소용돌이 핵을 화면 바깥(모서리)으로 밀어내 타이틀 영역엔 가는 줄기 몇 가닥만 걸쳐
  // 보이게 하려 했음. ⚠️ 처음 시도(POS_X만 -0.34→-0.62로 키움)는 거의 안 움직였는데, TILT가 -1.69rad
  // (~-97°)라 `rot(p,-TILT)`에서 거의 90도 회전이 걸려 p.x/p.y 기여도가 사실상 "맞바뀌어" 있었던
  // 것(실측: cos(97°)≈-0.12, sin(97°)≈0.99라 p.x 변화는 회전 후 p'.y에 거의 다 들어가고, 화면 좌우
  // 배치는 오히려 POS_Y가 주도함) — 즉 이 셰이더에서 POS_X/POS_Y는 화면의 가로/세로와 직접 대응하지
  // 않음. 브라우저로 값을 바꿔가며 직접 확인해 **POS_Y를 크게(0.6) 줘서 소용돌이 핵을 우상단 모서리
  // 밖으로 밀어냄** — 화면엔 그 모서리에서 대각선으로 드리워지는 가는 줄기만 걸쳐 보이는 "덩쿨" 구도.
  // THETA(선 다발의 기울기)도 1.58→1.32로 더 눕혀 사선으로 드리워지는 느낌을 더함.
  // ⚠️ 26차(같은 날): "매니페스토도 보이게 해달라, 히어로도 너무 죽어있다, 왜 또 가운데로 가있냐" —
  // 두 가지 진짜 원인.
  // ① **다시 가운데로 가있던 원인**: 공전(`ORBIT_RADIUS`=0.14)과 스크롤 패닝(`SCROLL_PAN_RADIUS`=0.3)의
  // 흔들림 폭을 더하면 최대 0.44 — 모서리로 밀어낸 거리(`POS_Y`=0.6)와 거의 맞먹어서, 흔들리는 주기
  // 중 일부 구간에서 핵이 center(0.6-0.44=0.16, 원래 중앙값 0.06에 가까움) 근처까지 되돌아오고
  // 있었음. **흔들림 폭을 모서리 거리 대비 확실히 작게 줄여(0.14→0.07, 0.3→0.12) 항상 모서리 근처에
  // 머물도록** 고침(최소 Y=0.6-0.19=0.41, 더 이상 중앙 근처로 안 내려감).
  // ② **히어로·매니페스토가 너무 어두웠던 원인**: 핵을 모서리 밖으로 밀어낸 구도라, 화면에 보이는 건
  // 이제 핵이 아니라 항상 "핵에서 먼" 줄기 부분인데, `FALLOFF`(2.9, 중심에서 멀수록 밝기가 지수적으로
  // 죽는 세기)가 그대로라 그 줄기들마저 너무 옅게 보였음. `FALLOFF`를 2.9→1.9로 완화해 줄기가 중심에서
  // 멀어져도 밝기가 덜 빠지도록 하고, `INTENSITY`도 0.24→0.3(25차의 0.34보다는 낮고 24차의 0.24보다는
  // 높은 절충)으로 다시 살짝 올림.
  const POS_X = -0.1, POS_Y = 0.6;
  // 36차: "행동 반경을 넓혀라" — 패턴 모양(ZOOM·SPREAD 등)은 그대로 두고 공전·스크롤 패닝의 반경만
  // 크게 키움(0.07→0.3, 0.12→0.45) — 같은 모양이 훨씬 넓은 영역을 오가며 떠다니게 됨.
  const ORBIT_RADIUS = 0.3, ORBIT_SPEED = 0.09;
  const SCROLL_PAN_RADIUS = 0.45, SCROLL_PAN_SPEED = 0.0012;
  const THETA = 1.32, TWIST = 0.5, SHEAR = -0.55, SPREAD = 0.62, LINE_WIDTH = 0.55;
  const WAVE_AMOUNT = 0.197, WAVE_SCALE = 2.48;
  // 36차: 행동 반경(ORBIT_RADIUS·SCROLL_PAN_RADIUS)을 크게 키운 만큼, 핵이 멀리 나가있을 때도 아예
  // 안 보이지 않도록 FALLOFF도 같이 완화(1.9→1.0) — 안 그러면 반경 끝쪽에서 완전히 깜깜해지는 구간이
  // 생김(실측: 매니페스토에서 재현).
  const GLOW_SIZE = 0.0029, SOFTNESS = 0.0071, FALLOFF = 1.0;
  const COLOR_TRAVEL = -0.32, COLOR_CYCLE = 2.0;
  const INTENSITY = 0.3;
  // 스크롤할수록 웨이브 흐름 패턴 자체도 같이 흘러가도록(카메라 이동과는 별개로 패턴의 위상도 변화).
  const SCROLL_TO_FLOW = 0.00055;

  const C1 = [0xd7 / 255, 0xff / 255, 0x3e / 255]; // volt
  const C2 = [0x4b / 255, 0x5a / 255, 0x12 / 255]; // volt, 어둡게(그림자 쪽)
  const C3 = [0xea / 255, 0xff / 255, 0xa0 / 255]; // volt, 밝게(하이라이트)
  const BG = [0x0a / 255, 0x0a / 255, 0x0a / 255]; // --ink

  const VERT_SRC = "attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }";

  const FRAG_SRC = `
precision mediump float;
uniform vec2  uRes;
uniform float uDpr;
uniform float uFlow;
uniform float uZoom;
uniform float uTilt;
uniform vec2  uPos;
uniform int   uLayers;
uniform float uTheta;
uniform float uTwist;
uniform float uShear;
uniform float uSpread;
uniform float uLineWidth;
uniform float uWaveAmount;
uniform float uWaveScale;
uniform float uGlowSize;
uniform float uSoftness;
uniform float uFalloff;
uniform float uColorTravel;
uniform float uColorCycle;
uniform float uIntensity;
uniform vec3  uC1;
uniform vec3  uC2;
uniform vec3  uC3;
uniform vec3  uBg;

const int MAX_LINES = ${LAYERS};

vec3 palette(float x) {
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(uC1, uC2, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(uC2, uC3, smoothstep(0.0, 1.0, x - 1.0));
  return mix(uC3, uC1, smoothstep(0.0, 1.0, x - 2.0));
}

vec2 rot(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c) * p;
}

float lineProfile(float d, float width, float cssPixel) {
  float halfWidth = max(width, 0.01) * 0.5 * cssPixel;
  return 1.0 - smoothstep(halfWidth, halfWidth + cssPixel * 1.15, d);
}

float glowProfile(float d, float width, float cssPixel) {
  float halfWidth = max(width, 0.01) * 0.5 * cssPixel;
  float outside = max(d - halfWidth, 0.0) * 2.19;
  return uGlowSize / max(outside * outside + uSoftness, 1e-6) * 0.055;
}

float lineShape(vec2 q, float index, float n, float time, float cssPixel) {
  float distribution = n - 0.5;
  float offset = distribution * uSpread;
  float curve = uShear * 0.035 * q.y * q.y;
  float phase = distribution * 1.35;

  float wave = sin(q.y * (1.18 * uWaveScale) + time * 0.46 + phase) * uWaveAmount;
  wave += sin(q.y * (2.31 * uWaveScale) - time * 0.18 + phase * 0.63) * (uWaveAmount * 0.19);
  wave += cos(q.y * (0.54 * uWaveScale) + time * 0.11 + phase * 0.31) * (uWaveAmount * 0.08);

  float twistAmount = abs(uTwist) * 0.055;
  float twistDirection = uTwist < 0.0 ? -1.0 : 1.0;
  float twistFrequency = 5.0 + abs(uTwist) * 5.0;
  float twistPhase = q.y * twistFrequency + time * 0.12 * twistDirection + index * 0.17;
  float twistX = sin(twistPhase) * twistAmount;
  float twistDepth = 0.5 + 0.5 * cos(twistPhase);
  twistX += sin(twistPhase * 2.0 + 0.8) * twistAmount * 0.12;

  float x = q.x - offset - curve - wave - twistX;

  float twistStrength = clamp(abs(uTwist), 0.0, 1.0);
  float wireWidth = uLineWidth * mix(1.0, mix(0.78, 1.16, twistDepth), twistStrength);
  float d = abs(x);
  float core = lineProfile(d, wireWidth, cssPixel);
  float glow = glowProfile(d, wireWidth, cssPixel);
  float wireLight = mix(1.0, mix(0.72, 1.18, twistDepth), twistStrength);

  return max(core, glow) * wireLight * exp2(-abs(q.y) * uFalloff);
}

void main() {
  vec2 I = gl_FragCoord.xy;
  vec2 screenP = (I - 0.5 * uRes) / uRes.y;

  vec2 p = (screenP - uPos) * uZoom;
  p = rot(p, -uTilt);
  vec2 q = rot(p, -uTheta);

  float cssPixel = max(uZoom, 0.001) * uDpr / max(uRes.y, 1.0);
  float count = float(uLayers);

  vec3 z = vec3(0.0);
  for (int j = 0; j < MAX_LINES; j++) {
    if (j >= uLayers) break;
    float i = float(j);
    float n = count > 1.0 ? i / (count - 1.0) : 0.5;
    float g = lineShape(q, i, n, uFlow, cssPixel);
    float k = 0.5 + 0.5 * sin(n * 6.283 + i * uColorCycle + uFlow * 1.2 + length(p) * uColorTravel);
    z += g * palette(k);
  }

  z *= uIntensity;
  vec3 x = max(z, 0.0);
  z = x * (2.51 * x + 0.03) / max(x * (2.43 * x + 0.59) + 0.14, vec3(1e-6));
  z = clamp(z, 0.0, 1.0);

  // 배경(uBg)이 항상 어두운 --ink라 원본의 "다크 배경" 분기(스크린 블렌드)만 사용.
  z = 1.0 - (1.0 - uBg) * (1.0 - z);

  gl_FragColor = vec4(z, 1.0);
}
`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("siteWaves shader:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("siteWaves link:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const locs = {};
  function u(name) {
    if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
    return locs[name];
  }

  // 시간에 따라 바뀌지 않는 유니폼은 루프 밖에서 한 번만 설정.
  gl.uniform1i(u("uLayers"), LAYERS);
  gl.uniform1f(u("uTheta"), THETA);
  gl.uniform1f(u("uTwist"), TWIST);
  gl.uniform1f(u("uShear"), SHEAR);
  gl.uniform1f(u("uSpread"), SPREAD);
  gl.uniform1f(u("uLineWidth"), LINE_WIDTH);
  gl.uniform1f(u("uWaveAmount"), WAVE_AMOUNT);
  gl.uniform1f(u("uWaveScale"), WAVE_SCALE);
  gl.uniform1f(u("uGlowSize"), GLOW_SIZE);
  gl.uniform1f(u("uSoftness"), SOFTNESS);
  gl.uniform1f(u("uFalloff"), FALLOFF);
  gl.uniform1f(u("uColorTravel"), COLOR_TRAVEL);
  gl.uniform1f(u("uColorCycle"), COLOR_CYCLE);
  gl.uniform1f(u("uIntensity"), INTENSITY);
  gl.uniform3f(u("uC1"), C1[0], C1[1], C1[2]);
  gl.uniform3f(u("uC2"), C2[0], C2[1], C2[2]);
  gl.uniform3f(u("uC3"), C3[0], C3[1], C3[2]);
  gl.uniform3f(u("uBg"), BG[0], BG[1], BG[2]);
  // uPos는 더 이상 고정값이 아님(공전+스크롤 패닝) — 매 프레임 아래에서 설정.
  gl.uniform1f(u("uTilt"), TILT);
  gl.uniform1f(u("uZoom"), ZOOM);

  // 2026-11-05 22차: 더 이상 .hero__bg라는 호스트 요소가 없음 — fixed 배경이라 뷰포트 크기 그대로 씀.
  function build() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
    }
  }
  build();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  // 2026-11-05 28~31차: PRODUCT(.showcase) 구간에서 웨이브를 신발과 안 겹치게 만들려고 위치 밀어내기
  // → 정적 비네트 마스크까지 시도했었음. ⚠️ 32차: "피하지 말고 차라리 사선으로 신발을 통과하면 더
  // 예쁠 것 같다" — 정반대 요청으로 방향 전환. 비네트(`.showcase__shoemask`)는 제거(css/html 참고).
  // 대신 **신발 스테이지(`.showcase__stage-wrap`) 구간에서만 웨이브 기준 위치를 평소의 "모서리로
  // 치우친 구도"에서 신발과 가까운 값(`STAGE_POS_X/Y`)으로 끌어당겨(stageBias, lerp)** 대각선
  // 밴드가 신발 실루엣을 가로지르듯 지나가게 함 — 흔들림 폭도 이 구간에서만 줄여서(STAGE_WOBBLE_SCALE)
  // 교차가 산만하게 흔들리지 않고 안정적으로 보이게 함.
  let stageBounds = null;
  function measureStage() {
    const el = document.querySelector(".showcase__stage-wrap");
    if (!el) { stageBounds = null; return; }
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    stageBounds = { top, bottom: top + el.offsetHeight };
  }
  measureStage();
  document.fonts.ready.then(measureStage);
  window.addEventListener("load", measureStage);
  let stageResizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(stageResizeTimer);
    stageResizeTimer = setTimeout(measureStage, 150);
  });
  const STAGE_BIAS_RAMP = 400;
  const STAGE_POS_X = -0.08, STAGE_POS_Y = 0.18;
  const STAGE_WOBBLE_SCALE = 0.4;

  let showcaseBounds = null;
  function measureShowcase() {
    const el = document.querySelector(".showcase");
    if (!el) { showcaseBounds = null; return; }
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    showcaseBounds = { top, bottom: top + el.offsetHeight };
  }
  measureShowcase();
  document.fonts.ready.then(measureShowcase);
  window.addEventListener("load", measureShowcase);
  let showcaseResizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(showcaseResizeTimer);
    showcaseResizeTimer = setTimeout(measureShowcase, 150);
  });
  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  const SIDE_BIAS_RAMP = 500;
  const waveveil = document.querySelector("[data-showcase-waveveil]");
  const VEIL_MAX_OPACITY = 0.45;

  // 2026-11-05 22차: 더 이상 히어로 핀 구간에만 존재하는 배경이 아니라 "항상 떠 있는" 페이지 배경이라
  // IntersectionObserver(특정 요소가 화면에 있는지)는 더 이상 쓸 대상이 없음 — 탭이 백그라운드일 때만
  // 중단(기존과 동일한 이유: 안 보이는 동안 GPU를 돌릴 이유가 없음).
  let clock = 0;
  let last = performance.now();
  function frame(now) {
    if (document.hidden) return;
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    clock += dt;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    gl.uniform2f(u("uRes"), canvas.width, canvas.height);
    gl.uniform1f(u("uDpr"), dpr);
    gl.uniform1f(u("uFlow"), clock * FLOW_SPEED * FLOW_DIR + PHASE + window.scrollY * SCROLL_TO_FLOW);

    let sideBias = 0;
    if (showcaseBounds) {
      const enter = smoothstep(showcaseBounds.top - SIDE_BIAS_RAMP, showcaseBounds.top, window.scrollY);
      const exitDone = smoothstep(showcaseBounds.bottom, showcaseBounds.bottom + SIDE_BIAS_RAMP, window.scrollY);
      sideBias = enter * (1 - exitDone);
    }
    if (waveveil) waveveil.style.opacity = (sideBias * VEIL_MAX_OPACITY).toFixed(3);

    let stageBias = 0;
    if (stageBounds) {
      const stageEnter = smoothstep(stageBounds.top - STAGE_BIAS_RAMP, stageBounds.top, window.scrollY);
      const stageExitDone = smoothstep(stageBounds.bottom, stageBounds.bottom + STAGE_BIAS_RAMP, window.scrollY);
      stageBias = stageEnter * (1 - stageExitDone);
    }
    const wobbleScale = 1 - stageBias * (1 - STAGE_WOBBLE_SCALE);
    const orbitX = Math.cos(clock * ORBIT_SPEED) * ORBIT_RADIUS * wobbleScale;
    const orbitY = Math.sin(clock * ORBIT_SPEED) * ORBIT_RADIUS * wobbleScale;
    const scrollPhase = window.scrollY * SCROLL_PAN_SPEED;
    const scrollPanX = Math.cos(scrollPhase) * SCROLL_PAN_RADIUS * wobbleScale;
    const scrollPanY = Math.sin(scrollPhase * 0.8) * SCROLL_PAN_RADIUS * wobbleScale;
    const basePosX = POS_X + (STAGE_POS_X - POS_X) * stageBias;
    const basePosY = POS_Y + (STAGE_POS_Y - POS_Y) * stageBias;
    gl.uniform2f(u("uPos"), basePosX + orbitX + scrollPanX, basePosY + orbitY + scrollPanY);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });
})();
