/* eslint-disable */
// 히어로 배경 지구본 — originkit.dev Globe 컴포넌트 전체(Fibonacci 점구체 + 정이십면체
// 와이어프레임 케이지 + 떠다니는 컬러 웨이브 + 지나가는 쉬머 + 드래그 회전 + 호버 패널)를
// 이번엔 "필요한 것만 남겨 단순화"하지 않고 사용자가 준 원본 코드 그대로 포팅(2026-11-10 4차).
// 이전 버전(실제 위경도 랜드마스크로 대륙 점만 찍는 방식)은 "지도 모양"을 의도했지만 배경으로
// 옅게 깔다 보니 구체 실루엣 자체가 흐릿해져 "뭘 해놨는지 안 보인다"는 피드백으로 폐기 —
// 이 케이지(정이십면체 와이어프레임)는 그 자체로 또렷한 "구" 실루엣을 만들어주므로 교체.
// React/TS → 바닐라 JS로 변환(JSX·훅·타입 주석 제거, 클래스/셰이더 로직은 그대로)하고
// 색상만 가뿐 디자인 토큰(--ink/--accent/--muted)으로 교체, 강도(density·glow 등)는 원본의
// "쇼케이스용 최대치" 대신 배경 장식에 맞게 낮춤. 모바일·WebGL 미지원·reduced-motion 가드는
// 기존 파일 그대로 유지.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const PERSPECTIVE = 0.15;
const SOURCES = 3;
const CAGE = 1.18;
const DRAG = 0.021;

const DEFAULTS = {
  dot: "#FFFFFF",
  net: "#26FF00",
  density: 20,
  spin: 20,
  spinDir: "right",
  hoverOn: true,
  sizePercent: 100,
  dots: { size: 8, wobble: 6, flicker: 7 },
  cage: { detail: 1, spread: 8, glow: 11 },
  shimmer: { color: "#D8CCFF", speed: 9, style: "sweep", angle: 90, width: 7 },
  waves: { color: "#6FA8FF", color2: "#FF5E8F", size: 9, glow: 11, speed: 7 },
  hover: { fill: 9, glow: 11, reach: 9 },
};

function clamp(v, lo, hi, fallback) {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

function settingsFor(cfg) {
  const d = cfg.dots || DEFAULTS.dots;
  const cg = cfg.cage || DEFAULTS.cage;
  const sh = cfg.shimmer || DEFAULTS.shimmer;
  const wv = cfg.waves || DEFAULTS.waves;
  const hv = cfg.hover || DEFAULTS.hover;
  const on = cfg.hoverOn === false ? 0 : 1;

  const density = clamp(cfg.density, 1, 20, DEFAULTS.density);
  const cageSpread = clamp(cg && cg.spread, 1, 20, DEFAULTS.cage.spread);

  return {
    points: Math.round(300 + density * density * 22),
    dotSize: 0.004 + clamp(d && d.size, 1, 20, DEFAULTS.dots.size) * 0.0013,
    wobble: clamp(d && d.wobble, 0, 20, DEFAULTS.dots.wobble) * 0.0055,
    flicker: clamp(d && d.flicker, 0, 20, DEFAULTS.dots.flicker) * 0.042,

    detail: Math.round(clamp(cg && cg.detail, 0, 4, DEFAULTS.cage.detail)),
    cage: CAGE + (cageSpread - 8) * 0.022,
    netGlow: clamp(cg && cg.glow, 0, 20, DEFAULTS.cage.glow) * 0.075,

    shimmer: clamp(sh && sh.speed, 0, 20, DEFAULTS.shimmer.speed) * 0.03,
    edgeMix: sh && sh.style === "sweep" ? 0 : 1,
    sweepMix: sh && sh.style === "sweep" ? 1 : 0,
    sweepAxis: clamp(sh && sh.angle, 0, 360, DEFAULTS.shimmer.angle) * (Math.PI / 180),
    sweepWidth: 0.05 + clamp(sh && sh.width, 1, 20, DEFAULTS.shimmer.width) * 0.022,

    spread: 0.12 + clamp(wv && wv.size, 1, 20, DEFAULTS.waves.size) * 0.045,
    intensity: clamp(wv && wv.glow, 0, 20, DEFAULTS.waves.glow) * 0.075,
    wave: clamp(wv && wv.speed, 0, 20, DEFAULTS.waves.speed) * 0.11,

    hoverFill: on * clamp(hv && hv.fill, 0, 20, DEFAULTS.hover.fill) * 0.007,
    hoverGlow: on * clamp(hv && hv.glow, 0, 20, DEFAULTS.hover.glow) * 0.09,
    hoverArc: 0.25 + clamp(hv && hv.reach, 1, 20, DEFAULTS.hover.reach) * 0.055,
    hoverOn: on,

    spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.055 * (cfg.spinDir === "left" ? -1 : 1),
    radius: 1,
  };
}

function buildPoints(count) {
  const dirs = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = golden * i;
    dirs[i * 3] = Math.cos(a) * r;
    dirs[i * 3 + 1] = y;
    dirs[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(dirs, 3));
  g.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
  return g;
}

function buildCage(radius, detail) {
  const solid = new THREE.IcosahedronGeometry(radius, detail);

  const edges = new THREE.EdgesGeometry(solid);
  const pos = edges.attributes.position;
  const n = pos.count;
  const param = new Float32Array(n);
  const edgeSeed = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    param[i] = 0;
    param[i + 1] = 1;
    const mx = (pos.getX(i) + pos.getX(i + 1)) * 0.5;
    const my = (pos.getY(i) + pos.getY(i + 1)) * 0.5;
    const mz = (pos.getZ(i) + pos.getZ(i + 1)) * 0.5;
    const s = Math.abs(Math.sin(mx * 127.1 + my * 311.7 + mz * 74.7) * 43758.5453) % 1;
    edgeSeed[i] = s;
    edgeSeed[i + 1] = s;
  }
  edges.setAttribute("aEdge", new THREE.BufferAttribute(param, 1));
  edges.setAttribute("aSeed", new THREE.BufferAttribute(edgeSeed, 1));

  const fp = solid.attributes.position;
  const verts = fp.count;
  const face = new Float32Array(verts * 3);
  const faceSeed = new Float32Array(verts);
  for (let i = 0; i < verts; i += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) {
      cx += fp.getX(i + k);
      cy += fp.getY(i + k);
      cz += fp.getZ(i + k);
    }
    cx /= 3; cy /= 3; cz /= 3;
    const s = Math.abs(Math.sin(cx * 269.5 + cy * 183.3 + cz * 246.1) * 43758.5453) % 1;
    for (let k = 0; k < 3; k++) {
      face[(i + k) * 3] = cx;
      face[(i + k) * 3 + 1] = cy;
      face[(i + k) * 3 + 2] = cz;
      faceSeed[i + k] = s;
    }
  }
  solid.setAttribute("aFace", new THREE.BufferAttribute(face, 3));
  solid.setAttribute("aSeed", new THREE.BufferAttribute(faceSeed, 1));

  return { edges, panels: solid };
}

const SOURCE_GLSL = `
  #define SOURCES ${SOURCES}
  uniform vec3 uSource[SOURCES];
  uniform vec3 uSourceColor[SOURCES];
  uniform float uSpread;
  uniform float uIntensity;
  uniform float uWave;
  uniform float uTime;
  uniform vec3 uHoverDir;
  uniform float uHover;
  uniform float uHoverArc;

  vec3 sourceLight(vec3 dir) {
    vec3 lit = vec3(0.0);
    for (int i = 0; i < SOURCES; i++) {
      float ang = acos(clamp(dot(dir, uSource[i]), -1.0, 1.0));
      float reach = smoothstep(uSpread, 0.0, ang);
      float ripple = 0.5 + 0.5 * sin(ang * 9.0 - uTime * uWave * 3.0);
      lit += uSourceColor[i] * reach * (0.55 + ripple * 0.75);
    }
    return lit * uIntensity;
  }

  float hoverNear(vec3 dir) {
    float ang = acos(clamp(dot(dir, uHoverDir), -1.0, 1.0));
    return smoothstep(uHoverArc, 0.0, ang) * uHover;
  }
`;

const SWEEP_GLSL = `
  uniform float uSweepAxis;
  float sweepCoord(vec3 worldDir) {
    return dot(worldDir, vec3(cos(uSweepAxis), sin(uSweepAxis), 0.0));
  }
`;

const BAND_GLSL = `
  uniform float uSweepWidth;
  uniform float uSweepMix;
  float sweepBand(float coord, float time, float rate) {
    float head = mix(1.3, -1.3, fract(time * rate * 0.5));
    float d = coord - head;
    return exp(-(d * d) / (uSweepWidth * uSweepWidth)) * uSweepMix;
  }
`;

const POINT_VERTEX = `
  attribute vec3 aDir;
  attribute float aSeed;
  uniform float uRadius;
  uniform float uDotSize;
  uniform float uWobble;
  uniform float uFlicker;
  uniform float uViewHeight;
  varying float vFacing;
  varying float vLit;
  varying vec3 vGlow;
  varying float vSeed;
  varying float vNear;
  varying float vFlick;
  ${SOURCE_GLSL}
  void main() {
    vec3 glow = sourceLight(aDir);
    vGlow = glow;
    vLit = min(1.0, max(max(glow.r, glow.g), glow.b));
    vSeed = aSeed;
    vNear = hoverNear(aDir);

    float w =
      sin(aDir.x * 4.1 + uTime * 1.7) *
      cos(aDir.y * 3.3 - uTime * 1.3) *
      sin(aDir.z * 3.9 + uTime * 0.9 + aSeed * 0.6);

    float rate = 1.4 + aSeed * 4.6;
    float f =
      sin(uTime * rate + aSeed * 61.0) * 0.6 +
      sin(uTime * rate * 1.7 + aSeed * 23.0) * 0.4;
    vFlick = 1.0 - uFlicker * (1.0 - (0.5 + 0.5 * f));

    float r = uRadius * (1.0 + w * uWobble + vLit * 0.03 + vNear * 0.02);
    vec4 mv = modelViewMatrix * vec4(aDir * r, 1.0);

    vec3 n = normalize((modelViewMatrix * vec4(aDir, 0.0)).xyz);
    vFacing = dot(n, normalize(-mv.xyz));

    float size = uDotSize
      * (1.0 + vLit * 0.5 + vNear * 0.6)
      * mix(1.0, vFlick, 0.35);
    gl_PointSize = max(
      size * (uViewHeight * projectionMatrix[1][1]) / (-2.0 * mv.z),
      0.0
    );
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT = `
  precision highp float;
  uniform vec3 uDot;
  varying float vFacing;
  varying float vLit;
  varying vec3 vGlow;
  varying float vSeed;
  varying float vNear;
  varying float vFlick;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.45, d);
    float halo = exp(-d * d * 2.5);
    float depth = mix(0.25, 1.0, smoothstep(-0.6, 0.65, vFacing));
    float grain = 0.7 + 0.3 * vSeed;
    vec3 col = uDot * grain + vGlow;
    float a = (core * 0.8 + halo * 0.35) * depth * vFlick
      * (0.85 + vLit * 0.9 + vNear * 0.8);
    if (a < 0.002) discard;
    gl_FragColor = vec4(col * a, a);
  }
`;

const CAGE_VERTEX = `
  attribute float aEdge;
  attribute float aSeed;
  varying float vFacing;
  varying float vEdge;
  varying float vSeed;
  varying vec3 vGlow;
  varying float vNear;
  varying float vSweep;
  ${SOURCE_GLSL}
  ${SWEEP_GLSL}
  void main() {
    vec3 dir = normalize(position);
    vEdge = aEdge;
    vSeed = aSeed;
    vGlow = sourceLight(dir);
    vNear = hoverNear(dir);
    vSweep = sweepCoord(normalize((modelMatrix * vec4(position, 1.0)).xyz));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
    vFacing = dot(n, normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }
`;

const CAGE_FRAGMENT = `
  precision highp float;
  uniform vec3 uNet;
  uniform vec3 uShimmerColor;
  uniform float uNetGlow;
  uniform float uShimmer;
  uniform float uHoverGlow;
  uniform float uEdgeMix;
  uniform float uTime;
  varying float vFacing;
  varying float vEdge;
  varying float vSeed;
  varying vec3 vGlow;
  varying float vNear;
  varying float vSweep;
  ${BAND_GLSL}
  void main() {
    float depth = mix(0.32, 1.0, smoothstep(-0.9, 0.8, vFacing));
    float head = fract(vSeed + uTime * uShimmer);
    float run = smoothstep(0.3, 0.0, abs(vEdge - head)) * uEdgeMix;
    float sweep = sweepBand(vSweep, uTime, uShimmer);
    float twinkle = 0.5 + 0.5 * sin(vSeed * 43.0 + uTime * uShimmer * 5.0);
    float spark = clamp(run * 1.1 + sweep * 1.2 + twinkle * 0.35, 0.0, 1.0);
    vec3 col = mix(uNet, uShimmerColor, spark) + vGlow * 0.6;
    float a = uNetGlow * depth * (0.4 + run * 1.5 + sweep * 1.9 + twinkle * 0.3);
    a += vNear * uHoverGlow * depth;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col * a, a);
  }
`;

const PANEL_VERTEX = `
  attribute vec3 aFace;
  attribute float aSeed;
  varying float vFacing;
  varying float vSeed;
  varying float vNear;
  varying vec3 vGlow;
  varying float vSweep;
  ${SOURCE_GLSL}
  ${SWEEP_GLSL}
  void main() {
    vec3 dir = normalize(aFace);
    vSeed = aSeed;
    vNear = hoverNear(dir);
    vGlow = sourceLight(dir);
    vSweep = sweepCoord(normalize((modelMatrix * vec4(aFace, 0.0)).xyz));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
    vFacing = dot(n, normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }
`;

const PANEL_FRAGMENT = `
  precision highp float;
  uniform vec3 uNet;
  uniform vec3 uShimmerColor;
  uniform float uFill;
  uniform float uShimmer;
  uniform float uEdgeMix;
  uniform float uTime;
  varying float vFacing;
  varying float vSeed;
  varying float vNear;
  varying vec3 vGlow;
  varying float vSweep;
  ${BAND_GLSL}
  void main() {
    float depth = mix(0.12, 1.0, smoothstep(-0.4, 0.7, vFacing));
    float pulse = (0.5 + 0.5 * sin(vSeed * 31.0 + uTime * uShimmer * 4.0)) * uEdgeMix;
    pulse = clamp(pulse + sweepBand(vSweep, uTime, uShimmer) * 1.2, 0.0, 1.0);
    vec3 col = mix(uNet, uShimmerColor, pulse * 0.7) + vGlow * 0.5;
    float a = uFill * depth * vNear * (0.45 + pulse * 0.9);
    if (a < 0.002) discard;
    gl_FragColor = vec4(col * a, a);
  }
`;

class GlobeScene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
  group = new THREE.Group();
  sources = [];
  axes = [];
  hoverDir = new THREE.Vector3(0, 0, 1);
  aimX = 0;
  aimY = 0;
  grip = 0;
  targetGrip = 0;
  halfHeight = 1.5;
  time = 0;
  spinAngle = 0;
  dragX = 0;
  dragY = 0;
  velX = 0;
  velY = 0;
  isDragging = false;
  lastX = 0;
  lastY = 0;
  width = 0;
  height = 0;
  dpr = 1;
  frameId = 0;
  lastT = 0;
  disposed = false;
  unbind = () => {};

  constructor(container, cfg) {
    this.container = container;
    this.cfg = cfg;
    const S = settingsFor(cfg);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const el = this.renderer.domElement;
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.cursor = "grab";
    el.style.touchAction = "none";
    container.appendChild(el);

    const starts = [
      new THREE.Vector3(-0.6, -0.45, 0.65),
      new THREE.Vector3(0.72, 0.35, 0.6),
      new THREE.Vector3(0.1, 0.9, -0.42),
    ];
    const axes = [
      new THREE.Vector3(0.2, 1, 0.1),
      new THREE.Vector3(-0.8, 0.4, 0.3),
      new THREE.Vector3(0.3, -0.5, 0.9),
    ];
    for (let i = 0; i < SOURCES; i++) {
      this.sources.push(starts[i].clone().normalize());
      this.axes.push(axes[i].clone().normalize());
    }

    const shared = {
      uTime: { value: 0 },
      uSpread: { value: S.spread },
      uIntensity: { value: S.intensity },
      uWave: { value: S.wave },
      uSource: { value: this.sources.map((v) => v.clone()) },
      uSourceColor: { value: this.sourceColors(cfg) },
      uHoverDir: { value: this.hoverDir },
      uHover: { value: 0 },
      uHoverArc: { value: S.hoverArc },
    };
    const cageColors = {
      uNet: { value: new THREE.Color(cfg.net || DEFAULTS.net) },
      uShimmerColor: { value: new THREE.Color((cfg.shimmer && cfg.shimmer.color) || DEFAULTS.shimmer.color) },
      uShimmer: { value: S.shimmer },
      uEdgeMix: { value: S.edgeMix },
      uSweepMix: { value: S.sweepMix },
      uSweepAxis: { value: S.sweepAxis },
      uSweepWidth: { value: S.sweepWidth },
    };

    this.pointMat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: {
        ...shared,
        uRadius: { value: S.radius },
        uDotSize: { value: S.dotSize },
        uWobble: { value: S.wobble },
        uFlicker: { value: S.flicker },
        uViewHeight: { value: 600 },
        uDot: { value: new THREE.Color(cfg.dot) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.cageMat = new THREE.ShaderMaterial({
      vertexShader: CAGE_VERTEX,
      fragmentShader: CAGE_FRAGMENT,
      uniforms: { ...shared, ...cageColors, uNetGlow: { value: S.netGlow }, uHoverGlow: { value: S.hoverGlow } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.panelMat = new THREE.ShaderMaterial({
      vertexShader: PANEL_VERTEX,
      fragmentShader: PANEL_FRAGMENT,
      uniforms: { ...shared, ...cageColors, uFill: { value: S.hoverFill } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.pointGeo = buildPoints(S.points);
    this.points = new THREE.Points(this.pointGeo, this.pointMat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    const built = buildCage(S.radius * S.cage, S.detail);
    this.cageGeo = built.edges;
    this.panelGeo = built.panels;
    this.cage = new THREE.LineSegments(this.cageGeo, this.cageMat);
    this.panels = new THREE.Mesh(this.panelGeo, this.panelMat);
    this.cage.frustumCulled = false;
    this.panels.frustumCulled = false;
    this.group.add(this.panels);
    this.group.add(this.cage);

    this.scene.add(this.group);
    this.bindEvents();
  }

  sourceColors(cfg) {
    const wv = cfg.waves || DEFAULTS.waves;
    const a = new THREE.Color((wv && wv.color) || DEFAULTS.waves.color);
    const b = new THREE.Color((wv && wv.color2) || DEFAULTS.waves.color2);
    return [a.clone(), b.clone(), a.clone().lerp(b, 0.35)];
  }

  bindEvents() {
    const el = this.renderer.domElement;
    const down = (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.velX = 0;
      this.velY = 0;
      el.style.cursor = "grabbing";
    };
    const move = (e) => {
      const r = this.container.getBoundingClientRect();
      if (r.width && r.height) {
        this.aimX = ((e.clientX - r.left) / r.width) * 2 - 1;
        this.aimY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragY += dx * DRAG;
      this.dragX += dy * DRAG;
      this.velY = dx * DRAG;
      this.velX = dy * DRAG;
    };
    const up = () => {
      this.isDragging = false;
      el.style.cursor = "grab";
    };
    const enter = () => { this.targetGrip = 1; };
    const leave = () => { this.targetGrip = 0; up(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    this.unbind = () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }

  start() {
    this.lastT = performance.now();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      this.step();
    };
    loop();
  }

  setSize(width, height) {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.pointMat.uniforms.uViewHeight.value = height * this.dpr;
    this.updateCamera();
  }

  updateCamera() {
    const aspect = Math.max(1, this.width) / Math.max(1, this.height);
    const distance = 1 / PERSPECTIVE;
    const sizePct = clamp(this.cfg.sizePercent, 20, 200, DEFAULTS.sizePercent);
    const S = settingsFor(this.cfg);
    const span = S.radius * S.cage * 2.55 * (100 / sizePct);
    const visibleHeight = aspect < 1 ? span / aspect : span;
    this.halfHeight = visibleHeight / 2;

    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
    this.camera.near = Math.max(0.1, distance - 20);
    this.camera.far = distance + 20;
    this.camera.updateProjectionMatrix();
  }

  updateHoverDir() {
    const aspect = Math.max(1, this.width) / Math.max(1, this.height);
    const distance = 1 / PERSPECTIVE;
    const halfH = this.halfHeight;
    const halfW = halfH * aspect;

    const oz = distance;
    let dx = this.aimX * halfW;
    let dy = this.aimY * halfH;
    let dz = -oz;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;

    const S = settingsFor(this.cfg);
    const radius = S.radius * S.cage;
    const b = oz * dz;
    const c = oz * oz - radius * radius;
    const disc = b * b - c;
    const t = disc > 0 ? -b - Math.sqrt(disc) : -b;

    const hit = new THREE.Vector3(dx * t, dy * t, oz + dz * t);
    this.group.updateMatrixWorld();
    this.group.worldToLocal(hit);
    if (hit.lengthSq() > 1e-8) this.hoverDir.copy(hit.normalize());
  }

  step() {
    if (this.disposed) return;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    const S = settingsFor(this.cfg);
    this.time += dt;

    const live = this.pointMat.uniforms.uSource.value;
    for (let i = 0; i < SOURCES; i++) {
      this.sources[i].applyAxisAngle(this.axes[i], dt * S.wave * (0.35 + i * 0.12)).normalize();
      live[i].copy(this.sources[i]);
    }

    if (!this.isDragging) {
      const decay = Math.exp(-dt * 3);
      this.dragY += this.velY;
      this.dragX += this.velX;
      this.velX *= decay;
      this.velY *= decay;
      this.spinAngle += S.spin * dt;
    }

    this.pointMat.uniforms.uTime.value = this.time;
    this.group.rotation.y = this.spinAngle + this.dragY;
    this.group.rotation.x = clamp(this.dragX * 0.5, -1, 1, 0);

    this.grip += (this.targetGrip * S.hoverOn - this.grip) * (1 - Math.exp(-dt * 5));
    this.pointMat.uniforms.uHover.value = this.grip;
    if (this.grip > 0.001) this.updateHoverDir();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.unbind();
    this.pointGeo.dispose();
    this.cageGeo.dispose();
    this.panelGeo.dispose();
    this.pointMat.dispose();
    this.cageMat.dispose();
    this.panelMat.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el.parentNode === this.container) this.container.removeChild(el);
  }
}

(function () {
  "use strict";
  const container = document.querySelector("[data-hero-globe]");
  if (!container) return;
  // 모바일(1열 레이아웃)은 배경으로 깔 공간이 없고 WebGL 비용도 큼.
  if (window.innerWidth < 901) return;
  if (!window.WebGLRenderingContext) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cs = getComputedStyle(document.documentElement);
  const inkColor = (cs.getPropertyValue("--ink") || "#1E293B").trim();
  const accentColor = (cs.getPropertyValue("--accent") || "#E76F51").trim();
  const mutedColor = (cs.getPropertyValue("--muted") || "#64748B").trim();

  // 가뿐 배색: 점구체(dot)는 ink, 케이지 와이어(net)는 muted로 살짝 구분하고,
  // "sparse accent"(디자인 규칙)에 맞게 accent는 쉬머(지나가는 하이라이트) 한 곳에만 씀.
  // 웨이브는 accent↔ink 두 톤이 천천히 번갈아 떠다니게. 강도는 원본(쇼케이스용 최대치)보다
  // 배경 장식에 맞게 전반적으로 낮춤.
  const cfg = {
    dot: inkColor,
    net: mutedColor,
    density: 14,
    spin: prefersReduced ? 0 : 4,
    spinDir: "right",
    hoverOn: !prefersReduced,
    sizePercent: 100,
    dots: { size: 6, wobble: 5, flicker: 6 },
    // 2026-11-10 5차: 케이지가 자체 회전하면서 카메라를 향한 면적이 계속 달라져(같은 스크롤
    // 위치에서도 시간에 따라 선이 또렷했다 옅어졌다 함) "안 보인다"는 피드백으로 이어짐 —
    // 옅어지는 순간에도 어느 정도 보이도록 기준 밝기(glow)를 7→9로.
    cage: { detail: 1, spread: 8, glow: 9 },
    shimmer: { color: accentColor, speed: 6, style: "sweep", angle: 90, width: 7 },
    waves: { color: accentColor, color2: inkColor, size: 7, glow: 7, speed: 5 },
    hover: { fill: 5, glow: 6, reach: 8 },
  };

  let scene;
  try {
    scene = new GlobeScene(container, cfg);
  } catch (_) {
    return; // WebGL 생성 실패 등 — 배경 장식일 뿐이니 조용히 생략
  }
  scene.setSize(container.clientWidth || 1, container.clientHeight || 1);
  scene.start();

  const ro = new ResizeObserver(() => {
    scene.setSize(container.clientWidth || 1, container.clientHeight || 1);
  });
  ro.observe(container);
})();
