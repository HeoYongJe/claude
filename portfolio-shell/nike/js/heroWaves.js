// ---- 히어로 배경 "Striped Waves"(WebGL) ----
// 2026-11-05: 사용자가 제공한 React/Three.js 기반 "Striped Waves" Originkit 컴포넌트를 바닐라 WebGL로
// 포팅. 커서 반응형 글로우(원본의 hover 기능)는 빼고 순수 시간 기반 앰비언트 모션만 사용 — 마우스를
// 전혀 안 보므로 design.md Motion §5 "마우스 정밀도 의존 디테일 레이어" 논쟁과 애초에 무관. 밀도(density)·
// 숨쉬기(breath) 등 이 포팅에서 쓰지 않는 원본 파라미터는 제거해 유니폼 개수를 줄임. 색은 사이트
// 포인트컬러(volt, #D7FF3E) 한 색의 밝기 변주 3단으로만 구성 — 새 색을 들이지 않음(design.md §2 "volt는
// 한 곳에만, 남용 금지"를 어기지 않도록).
(function () {
  "use strict";
  const canvas = document.querySelector("[data-hero-waves]");
  if (!canvas) return;
  const host = canvas.parentElement; // .hero__bg
  const heroWrap = document.querySelector(".hero-wrap");
  if (!host || !heroWrap) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) return; // .hero__bg의 기존 라디얼 그라데이션(css)이 그대로 폴백으로 남음

  // 히어로가 화면 전체를 덮는 큰 캔버스라 쇼케이스의 2D 격자(kineticGrid)보다 픽셀당 비용이 크므로
  // DPR을 더 낮게 캡(성능 보호).
  const MAX_DPR = 1.5;
  const LAYERS = 48;

  // ---- 원본 "Striped Waves" preset 2 근사값(흐르는 물결 느낌) ----
  const FLOW_SPEED = 0.909, FLOW_DIR = 1.24, PHASE = 32.41;
  const ZOOM = 2.04, TILT = -1.69, POS_X = -0.01, POS_Y = 0.06;
  // 2026-11-05 1차 테스트 후 조정: 원본 preset은 가로로 넓은 랜드스케이프 캔버스 기준이라, 히어로처럼
  // 세로로 좁은 영역에 그대로 쓰면(cssPixel 계산이 uRes.y 기준이라 세로폭이 좁을수록 가로 분포도
  // 좁게 눌림) 선들이 한 덩어리로 뭉쳐 화면 중앙을 가로지르는 굵은 리본 하나처럼 보여 NIKE 타이틀을
  // 가려버렸음(스크린샷으로 확인). SPREAD를 크게 올려 선들이 화면 폭 전체로 퍼지게 하고, INTENSITY로
  // 전체 밝기를 낮춰 "타이틀 뒤에서 은은히 흐르는 배경"이 되도록 함.
  const THETA = 1.58, TWIST = 0.39, SHEAR = -0.55, SPREAD = 0.62, LINE_WIDTH = 0.55;
  const WAVE_AMOUNT = 0.197, WAVE_SCALE = 2.48;
  const GLOW_SIZE = 0.0029, SOFTNESS = 0.0071, FALLOFF = 2.9;
  const COLOR_TRAVEL = -0.32, COLOR_CYCLE = 2.0;
  const INTENSITY = 0.55;

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
      console.error("heroWaves shader:", gl.getShaderInfoLog(sh));
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
    console.error("heroWaves link:", gl.getProgramInfoLog(prog));
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
  gl.uniform2f(u("uPos"), POS_X, POS_Y);
  gl.uniform1f(u("uTilt"), TILT);
  gl.uniform1f(u("uZoom"), ZOOM);

  function build() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
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
  // kineticGrid.js와 동일한 이유(웹폰트 로드 전/후 레이아웃이 바뀔 수 있음) — 재측정.
  document.fonts.ready.then(build);
  window.addEventListener("load", build);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  // 히어로가 화면 밖(핀 구간을 다 지나간 뒤)일 땐 rAF를 돌지 않음 — kineticGrid.js와 동일한 성능 보호 패턴.
  let inView = false;
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) requestAnimationFrame(frame);
  });
  io.observe(heroWrap);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && inView) requestAnimationFrame(frame);
  });

  let clock = 0;
  let last = performance.now();
  function frame(now) {
    if (!inView || document.hidden) return;
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    clock += dt;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    gl.uniform2f(u("uRes"), canvas.width, canvas.height);
    gl.uniform1f(u("uDpr"), dpr);
    gl.uniform1f(u("uFlow"), clock * FLOW_SPEED * FLOW_DIR + PHASE);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
})();
