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
  const LAYERS = 48;

  // ---- 원본 "Striped Waves" preset 2 근사값 + 2026-11-05 22~23차 조정값 ----
  const FLOW_SPEED = 0.909, FLOW_DIR = 1.24, PHASE = 32.41;
  const ZOOM = 2.04, TILT = -1.69;
  // 2026-11-05 23차: "너무 가운데에서만 돈다, 나선형 느낌을 원한다" 피드백 — 세 가지로 대응.
  // ① 기준 위치(POS_X/POS_Y)를 화면 정중앙(-0.01, 0.06)에서 좌상단 쪽으로 옮겨 소용돌이 핵이 항상
  //    한가운데 고정돼 있지 않게 함. ② 그 기준점을 중심으로 천천히 원을 그리며 공전(ORBIT_*)시켜
  //    "나선형으로 움직인다"는 느낌을 실제 궤적으로 구현. ③ 아래 frame()에서 scrollY를 uPos.y에도
  //    더해(SCROLL_PAN) 스크롤할수록 배경 자체가 위로 흘러가듯 보이게 함 — 이전엔 uFlow(흐름 위상)만
  //    스크롤에 연동돼 있어 "패턴은 바뀌지만 카메라는 고정"이었던 것을, 실제 카메라 이동으로 바꿈
  //    (1번 질문 "배경이 스크롤에 따라 움직이게 할 수 있나" 답 — 가능, uPos를 scrollY에 바인딩하면 됨).
  const POS_X = -0.34, POS_Y = -0.12;
  const ORBIT_RADIUS = 0.2, ORBIT_SPEED = 0.09;
  const SCROLL_PAN = 0.00048;
  const THETA = 1.58, TWIST = 0.5, SHEAR = -0.55, SPREAD = 0.62, LINE_WIDTH = 0.55;
  const WAVE_AMOUNT = 0.197, WAVE_SCALE = 2.48;
  const GLOW_SIZE = 0.0029, SOFTNESS = 0.0071, FALLOFF = 2.9;
  const COLOR_TRAVEL = -0.32, COLOR_CYCLE = 2.0;
  // 2026-11-05 23차: "전체적으로 가독성이 떨어진다"는 피드백(2번과 같은 결) — 전체 밝기를 0.55→0.34로
  // 더 낮춤. 위 ①②③로 소용돌이의 가장 밝은 핵이 텍스트 뒤에 고정돼 있지 않게 된 것과 합쳐, 어느
  // 스크롤 위치에서도 텍스트 대비가 과하게 떨어지는 구간이 줄어들도록 함.
  const INTENSITY = 0.34;
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

    const orbitX = Math.cos(clock * ORBIT_SPEED) * ORBIT_RADIUS;
    const orbitY = Math.sin(clock * ORBIT_SPEED) * ORBIT_RADIUS;
    const scrollPan = window.scrollY * SCROLL_PAN;
    gl.uniform2f(u("uPos"), POS_X + orbitX, POS_Y + orbitY - scrollPan);

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
