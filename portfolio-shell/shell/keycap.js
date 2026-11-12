/* eslint-disable */
// About Me "작업공간" 키캡 비주얼 — Originkit "Citron Keyscape"(Framer 코드 컴포넌트) 포팅.
// 2026-11-12: 사용자가 Framer용 React/TSX 소스(그대로 "words": ["A","B","C","D","E","F"]를
// 기본값으로 쓰는 범용 컴포넌트)를 제공, "A/B/C 자리에 나를 표현하는 단어를 넣고 싶다" →
// 커스텀 가능 여부 확인 후, 이 프로젝트가 React/번들러 없는 순수 정적 HTML/CSS/JS 사이트라
// (travel/js/globe.js가 같은 이유로 이미 쓰고 있는 방식 그대로) React 래퍼·Framer 전용 prop
// 시스템·TypeScript 타입은 걷어내고 "기법"(three.js 지오메트리·커스텀 셰이더 프린팅·후처리·
// 포인터 인터랙션)만 고정값으로 이식했다. 이 파일은 단일 용도 전용이라 prop으로 값을 받지
// 않고 아래 cfg에 직접 값을 박아 둔다 — 바꾸고 싶으면 cfg만 고치면 됨.
//
//  - words: 원본 기본값("A"~"F") → 본인을 표현하는 5단어("HTML"/"CSS"/"Photoshop"/"Design"/"Figma")로 교체.
//  - 중앙 히어로 캡: 원본은 로고 이미지 또는 기본 마크(사선+블록 2개) — 로고 이미지 로딩 코드는
//    통째로 들어내고, 대신 주변 캡과 똑같은 도트매트릭스 word-print 함수(paintWord)를 히어로의
//    윗면에도 그대로 재사용해 "ME"를 찍음(새 셰이더/새 프린팅 코드 없이 "어떤 텍스트를 찍을지"만
//    바꾼 것 — uTopMap/uTopTint 유니폼과 셰이더는 원본 그대로).
//  - 포인트 컬러: 원본 기본값은 시트론 옐로(#D2F53A). 비교해본 결과:
//      · 그대로 두면 "Originkit 데모를 가져다 붙인 것" 같은 이질감 — 이 사이트의 다른 포인트
//        색은 전부 블루 계열(nav 활성 링크, 05 섹션 스킬 dot의 글로우(rgba(74,124,255,.7)),
//        썸네일 그라디언트 오버레이(rgba(51,102,255,.18)) 등 `--blue-*` 토큰 하나로 통일돼 있음.
//      · 블루로 바꿔도 셰이더 자체는 색상 무관(블룸·이미시브 모두 RGB 값을 그대로 증폭하는
//        구조라 노랑이든 파랑이든 동일하게 동작) — 재질감 디자인을 다시 튜닝할 필요가 없었음.
//      · 결론: **사이트 자체의 포인트 컬러(`--blue-light`)를 사용** — "이 사이트의 일부"로
//        보이는 쪽을 택함. 배경도 카드 자체 배경(`--bg-thumb`)과 맞춰 캔버스 경계가 안 보이게.
//  - 인터랙션(호버 시 캡이 가라앉고 뷰가 기울어짐 / 클릭 시 끝까지 눌렸다 튀어오르며 히어로가
//    번쩍임)은 원본 포인터 피킹·스프링 로직을 그대로 가져왔다 — 빠뜨리지 않음.
//  - 모바일(≤640px)은 CSS(`.yj-about__photo{display:none}`, 2026-11-11 결정)가 이 카드 자체를
//    숨기므로, 여기서도 같은 폭 기준으로 WebGL 컨텍스트 생성 자체를 건너뛴다(불필요한 GPU 사용 방지).
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(function () {
  "use strict";

  const container = document.querySelector("[data-keycap-stage]");
  if (!container) return;
  if (window.innerWidth < 641) return; // .yj-about__photo 자체가 이 폭 이하에서 display:none
  if (!window.WebGLRenderingContext) return;

  const cs = getComputedStyle(document.documentElement);
  const read = (name, fallback) => {
    const v = cs.getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  };

  const DEG = Math.PI / 180;

  /* ---- 고정 설정(원본 CitronLegendProps 기본값 대신 이 카드 전용 값을 직접 박음) ---- */
  const cfg = {
    // 2026-11-12(7차): "html,css 계속 겹친다, design/web/app 적절히 섞어서 다양해보이게" —
    // 원인은 wordClass()의 대칭 배치 자체가 히어로 바로 옆 가장 눈에 띄는 링에는 배열의
    // 앞쪽 3개 단어만 나오게 만드는 구조였음(안쪽 링일수록 word=c로 결정, c는 0~2만 등장,
    // 그중에서도 array[0]이 대각선 4칸을 독점). 지난번엔 array[0]이 "HTML"이라 HTML이
    // 제일 가까운 링을 독점했던 것 — 배열 순서를 바꿔 design/web/app을 앞쪽(히어로에서 가장
    // 가까운 링)으로, html/css를 뒤쪽(바깥 링)으로 보냄.
    words: ["Design", "Web", "App", "HTML", "CSS"],
    heroWord: "ME",
    background: read("--bg-thumb", "#0c111b"),
    // 2026-11-12(5차): 캡 앞면에 "ME"를 올렸던 건 되돌림 — 사용자가 원한 건 앞면은 비워두고
    // (X 표시 = 텍스트 없음), 기존 코드 그대로 윗면 도트매트릭스에만 "ME"를 찍되 잉크 색만
    // 흰색으로 바꾸는 것이었음. 앞면/옆면 캡션은 다시 끔.
    caption: { show: false, lines: [] },
    font: {
      fontFamily: "Wanted Sans Variable, Pretendard JP, system-ui, sans-serif",
      fontWeight: 700,
      lineHeight: "1.15em",
      letterSpacing: "-0.02em",
    },
    // 2026-11-12(5차): 윗면 "ME" 도트매트릭스 잉크 색 — 어두운 네이비(#0b0e14)에서 흰색으로.
    textColor: "#ffffff",
    scale: 100,
    colors: {
      accent: read("--blue-light", "#5E8AFF"),
      light: "#E2E2E2",
      dark: "#121212",
    },
    // 2026-11-12(3차): 여전히 "ME"가 번진다는 피드백 — bloom 자체(아래 composite 단계의
    // uBloom 기본치)를 더 낮췄고, 글로우도 6→4로 한 번 더 낮춰 블룸 번짐을 줄임.
    glow: 4,
    parallax: 10,
    press: 10,
    speed: 3,
    advanced: {
      heroLift: 70,
      heroTurn: 0,
      keyGap: 7,
      dish: 3,
      yaw: 47,
      tilt: 42.6,
      lens: 21,
      // 2026-11-12(3차): "작은 화면에서 보면 그냥 흐리다" — 심도흐림(배경/전경 보케)이
      // 전체적으로 선명도를 깎아먹던 주범이라 완전히 끔(아래 dofOn이 false가 됨).
      blur: 0,
      exposure: 100,
      // 2026-11-12: "위쪽에 은은한 푸른 배경 처리"로 지적된 상단 빔/코너 헤이즈를 꺼서 제거.
      haze: 0,
      fringe: 100,
      // 2026-11-12(3차): 비네트(가장자리 어둡게)도 "뿌옇다"는 인상에 한몫 — 55→25로 완화.
      vignette: 25,
      grain: 4,
    },
  };

  /* ---- constants(원본 그대로 — 레퍼런스 포스터 실측값) ---- */
  const GRID = 6;
  const CAP_H = 0.5;
  const TAPER = 0.095;
  const R_BASE = 0.09;
  const R_TOP = 0.075;
  const EDGE_R = 0.04;
  const VIEW_HALF = 1.45;
  const AIM_SHIFT = 0.115;
  const REF_ASPECT = 736 / 920;
  const AIM_DROP = 0.1;
  const NEAR_BAND = 0.45;
  const FAR_BAND = 1.6;
  const APERTURE = 0.0435;
  const FAR_BLUR = 0.35;
  const FOCUS_RANGE = 16;
  const FOG_START = 1.2;
  const PRESS_TRAVEL = 0.2;
  // 2026-11-12(9차): "텍스트 사이즈 전체적으로 살짝씩만 줄여줘(ME 포함)" — 공유 상수라
  // 캡 레전드와 히어로 "ME" 양쪽에 다 같이 적용됨.
  const LEGEND_WIDTH = 0.68;
  const DOT_MAX = 0.036;
  // 2026-11-12(9차): "컬러/opacity 살짝 죽여줘(ME는 컬러 그대로)" — 캡 레전드 잉크에만 곱해지는
  // 알파(아래 uPrintA), 히어로는 1(그대로)로 둬서 ME 색은 안 건드림.
  const LEGEND_INK_ALPHA = 0.62;
  // 2026-11-12: "ME"(2글자라 DOT_MAX 상한에 걸려 점이 가장 커지는 경우)가 뭉개져 보인다는 피드백 —
  // 원인은 이 16px 래스터 자체의 해상도 부족(M/E의 획을 몇 픽셀만으로 표현해 점으로 확대하면
  // 블록처럼 뭉침). 폰트 두께 문제가 아니라 소스 해상도 문제라 2배로 올림(치수들은 전부 이
  // 배율에 맞춰 함께 스케일 — 아래 th/baseline/oy 참고).
  // 2026-11-12(3차): "ME" 가독성을 한 단계 더 올리기 위해 소스 래스터를 2배→3배로.
  const DOT_RASTER_SCALE = 3;
  const DOT_FONT = `${16 * DOT_RASTER_SCALE}px "Courier New", Courier, monospace`;
  // 2026-11-12(4차): 단어가 Web/Publisher 2줄이 아니라 "ME" 한 단어뿐이라, 더 크고 또렷하게
  // 보이도록 상한을 키움(실측하며 room/widest 쪽 제약에 안 걸리는지 확인 후 적용).
  const CAPTION_CAP = 0.3;
  const FALLBACK_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const MAX_PIXELS = 2.4e6;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const num = (x, fallback) => (typeof x === "number" && isFinite(x) ? x : fallback);
  const familyOf = (f) => (f.fontFamily ? `${f.fontFamily}, ${FALLBACK_FAMILY}` : FALLBACK_FAMILY);
  const emOf = (v, fallback) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (isFinite(n)) return v.trim().endsWith("px") ? n / 24 : v.trim().endsWith("%") ? n / 100 : n;
    }
    return fallback;
  };

  /** 스머지 프린트가 어느 기기에서나 같게 나오도록 시드 고정. */
  function mulberry(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------------------------------------- geometry */

  const wallHalf = (s, y) => lerp(s.base, s.top, clamp(y / (s.height - EDGE_R)));

  /** 하나의 매끈한 lofted 메시: 라운드 사각형 링을 벽을 따라 쌓고, 롤된 윗 모서리를 돌아
   *  오목한 윗면 중심까지 좁혀간다. 모든 링이 같은 둘레 샘플을 공유해 코너를 포함한
   *  전체 캡이 하나의 그리드로, 노멀이 매끄럽게 이어진다. */
  function capGeometry(s) {
    const ARC = 10;
    const SIDE = 5;
    const corners = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    const samples = [];
    for (let k = 0; k < 4; k++) {
      const [sx, sz] = corners[k];
      const [nx, nz] = corners[(k + 1) % 4];
      for (let q = 0; q <= ARC; q++) {
        const ang = (k + q / ARC) * (Math.PI / 2);
        const p = { sx, sz, c: Math.cos(ang), s: Math.sin(ang) };
        samples.push({ a: p, b: p, t: 0 });
      }
      const endAng = (k + 1) * (Math.PI / 2);
      const a = { sx, sz, c: Math.cos(endAng), s: Math.sin(endAng) };
      const b = { sx: nx, sz: nz, c: Math.cos(endAng), s: Math.sin(endAng) };
      for (let q = 1; q <= SIDE; q++) samples.push({ a, b, t: q / (SIDE + 1) });
    }
    const M = samples.length;
    const rings = [];
    if (s.skirt > 0) rings.push([s.base, R_BASE, -s.skirt], [s.base, R_BASE, -s.skirt * 0.5]);
    const ys = s.height - EDGE_R;
    for (let q = 0; q <= 5; q++) {
      const t = q / 5;
      rings.push([lerp(s.base, s.top, t), lerp(R_BASE, R_TOP, t), t * ys]);
    }
    for (let q = 1; q <= 6; q++) {
      const f = (q / 6) * (Math.PI / 2);
      const inset = EDGE_R * (1 - Math.cos(f));
      rings.push([s.top - inset, Math.max(0.01, R_TOP - inset), ys + EDGE_R * Math.sin(f)]);
    }
    const h0 = s.top - EDGE_R;
    const r0 = R_TOP - EDGE_R;
    for (let q = 1; q <= 10; q++) {
      const f = 1 - q / 10;
      rings.push([h0 * f, Math.max(0.001, r0 * f), s.height - s.dish * (1 - f * f)]);
    }
    const pos = new Float32Array(rings.length * M * 3);
    let o = 0;
    const at = (p, h, r) => [p.sx * (h - r) + r * p.c, p.sz * (h - r) + r * p.s];
    for (const [h, r, y] of rings) {
      const rr = Math.min(r, h);
      for (const sm of samples) {
        const [ax, az] = at(sm.a, h, rr);
        const [bx, bz] = at(sm.b, h, rr);
        pos[o++] = lerp(ax, bx, sm.t);
        pos[o++] = y;
        pos[o++] = lerp(az, bz, sm.t);
      }
    }
    const idx = [];
    for (let k = 0; k < rings.length - 1; k++) {
      for (let m = 0; m < M; m++) {
        const a = k * M + m;
        const b = k * M + ((m + 1) % M);
        const c = a + M;
        const d = b + M;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  /* ----------------------------------------------------------- printing */

  const PRINT_HEAD = /* glsl */ `
varying vec3 vObjP;
varying vec3 vObjN;
uniform sampler2D uTopMap;
uniform float uTopHalf;
uniform vec3 uTopInk;
uniform float uTopTint;
uniform float uInkGlow;
uniform float uRange;
varying float vFocusD;
uniform float uAo;
uniform float uCapH;
uniform float uPrintA;
#ifdef HERO
uniform sampler2D uFrontMap;
uniform sampler2D uSideMap;
uniform vec3 uFaceInk;
uniform float uFaceHalf;
uniform float uFaceTop;
uniform float uFaceBottom;
uniform vec3 uGlowColor;
#endif
`;

  const PRINT_BODY = /* glsl */ `
float printA = 0.0;
float smearA = 0.0;
vec3 printInk = vec3(0.0);
{
    vec3 on = normalize(vObjN);
    float topW = smoothstep(0.8, 0.96, on.y);
    vec4 t = texture2D(uTopMap, vObjP.xz / (2.0 * uTopHalf) + 0.5);
    vec3 ink = mix(t.rgb, uTopInk, uTopTint);
    float a = t.a * topW * uPrintA;
    diffuseColor.rgb = mix(diffuseColor.rgb, ink, a);
    printA = a;
    printInk = ink;
    #ifdef HERO
    float v = (uFaceTop - vObjP.y) / (uFaceTop - uFaceBottom);
    float inV = step(0.0, v) * step(v, 1.0);
    vec4 f = texture2D(uFrontMap, vec2(vObjP.x / (2.0 * uFaceHalf) + 0.5, v));
    float fa = f.a * smoothstep(0.45, 0.75, on.z) * inV;
    vec4 s = texture2D(uSideMap, vec2(-vObjP.z / (2.0 * uFaceHalf) + 0.5, v));
    float sa = s.a * smoothstep(0.45, 0.75, on.x) * inV;
    diffuseColor.rgb = mix(diffuseColor.rgb, uFaceInk, fa);
    diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb * 1.7, vec3(1.0)), sa);
    printA = max(printA, fa);
    smearA = sa;
    #endif
}
`;

  const EMIT_BODY = /* glsl */ `
totalEmissiveRadiance += printInk * uInkGlow * printA;
#ifdef HERO
{
    vec3 on = normalize(vObjN);
    float wall = 1.0 - smoothstep(0.45, 0.9, on.y);
    float low = 1.0 - smoothstep(uFaceBottom, uFaceTop + 0.08, vObjP.y);
    float g = mix(0.05, 1.0, wall * low * low * low);
    totalEmissiveRadiance += uGlowColor * (g * (1.0 - printA) + smearA * 1.4);
}
#endif
`;

  const AO_BODY = /* glsl */ `
{
    float ao = mix(1.0 - uAo, 1.0, smoothstep(-0.05, uCapH * 0.8, vObjP.y));
    outgoingLight = (outgoingLight - totalEmissiveRadiance) * ao + totalEmissiveRadiance;
}
`;

  const FOCUS_VERTEX = /* glsl */ `
{
    vec4 fp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
    fp = instanceMatrix * fp;
    #endif
    fp = modelMatrix * fp;
    vFocusD = dot(fp.xz, uFwd);
}
`;

  const DEPTH_TAIL = /* glsl */ `
gl_FragColor.a = clamp(0.5 + vFocusD / (2.0 * uRange), 0.002, 1.0);
`;

  function hookMaterial(mat, uniforms, kind) {
    if (kind === "hero") mat.defines = { HERO: "" };
    mat.customProgramCacheKey = () => "keycap-" + kind;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform vec2 uFwd;\nvarying float vFocusD;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n" + FOCUS_VERTEX);
      if (kind === "plate") {
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform float uRange;\nvarying float vFocusD;")
          .replace("#include <opaque_fragment>", "#include <opaque_fragment>\n" + DEPTH_TAIL);
        return;
      }
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObjP;\nvarying vec3 vObjN;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjP = position;\nvObjN = normal;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + PRINT_HEAD)
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + PRINT_BODY)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + EMIT_BODY)
        .replace("#include <opaque_fragment>", AO_BODY + "\n#include <opaque_fragment>\n" + DEPTH_TAIL);
    };
  }

  /** 단어를 작게 래스터한 뒤, 켜진 픽셀 하나하나를 둥근 점으로 찍어 도트매트릭스 레전드를
   *  만든다. 어떤 길이의 단어가 와도 전체 폭(LEGEND_WIDTH)은 같게, 점 크기만 달라짐(DOT_MAX로
   *  짧은 단어의 점이 너무 커지는 것만 제한) — 히어로의 "ME"에도 그대로 재사용. */
  function paintWord(ctx, scratch, N, word) {
    ctx.clearRect(0, 0, N, N);
    const w = word.trim();
    if (!w) return;
    scratch.font = DOT_FONT;
    const tw = Math.ceil(scratch.measureText(w).width) + 2 * DOT_RASTER_SCALE;
    const th = 22 * DOT_RASTER_SCALE;
    scratch.canvas.width = tw;
    scratch.canvas.height = th;
    scratch.font = DOT_FONT;
    scratch.fillStyle = "#fff";
    scratch.textBaseline = "alphabetic";
    scratch.fillText(w, 1 * DOT_RASTER_SCALE, 15 * DOT_RASTER_SCALE);
    const px = scratch.getImageData(0, 0, tw, th).data;
    let x0 = tw;
    let x1 = 0;
    let y0 = th;
    let y1 = 0;
    for (let y = 0; y < th; y++)
      for (let x = 0; x < tw; x++)
        if (px[(y * tw + x) * 4 + 3] >= 96) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
        }
    if (x1 <= x0) return;
    // DOT_MAX 상한도 raster 배율만큼 나눠, 2배 해상도로 세밀해진 점이 전체 폭(짧은 단어가
    // 상한에 걸릴 때)까지 덩달아 2배로 늘어나지 않고 전과 같은 폭에 더 촘촘히 들어가게 한다.
    const pitch = Math.min((N * LEGEND_WIDTH) / (x1 - x0), (N * DOT_MAX) / DOT_RASTER_SCALE);
    const ox = N / 2 - ((x0 + x1) / 2) * pitch;
    const oy = N / 2 - 11 * DOT_RASTER_SCALE * pitch;
    const d = pitch * 0.82;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        if (px[(y * tw + x) * 4 + 3] < 96) continue;
        const cx = ox + x * pitch + (pitch - d) / 2;
        const cy = oy + y * pitch + (pitch - d) / 2;
        ctx.roundRect(cx, cy, d, d, d * 0.42);
      }
    }
    ctx.fill();
  }

  /** 히어로 앞면에 세로로 찍히는 캡션 — 롤된 모서리 아래, 좌측 정렬, 벽 폭에 맞춰 자동 축소. */
  function paintCaption(ctx, CW, CH, shape, lines, font) {
    ctx.clearRect(0, 0, CW, CH);
    if (!lines.length) return;
    const k = CW / (2 * shape.base);
    const faceTop = shape.height - EDGE_R;
    const faceH = faceTop + shape.skirt;
    const top = 0.012;
    const inset = 0.05;
    const right = 0.06;
    const family = familyOf(font);
    const weight = font.fontWeight || 700;
    const style = font.fontStyle || "normal";
    const lh = emOf(font.lineHeight, 1.2);
    const ls = emOf(font.letterSpacing, 0);
    ctx.font = `${style} ${weight} 100px ${family}`;
    const capK = clamp((ctx.measureText("H").actualBoundingBoxAscent || 72) / 100, 0.5, 0.9);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width / 100 + Math.max(0, l.length - 1) * ls));
    const room = 2 * wallHalf(shape, faceTop - top) - inset - right;
    const roomH = faceH - top - 0.05;
    const size = Math.min(CAPTION_CAP / capK, room / Math.max(widest, 1e-3), roomH / (lines.length * lh));
    const px = size * k;
    ctx.font = `${style} ${weight} ${px}px ${family}`;
    ctx.letterSpacing = `${ls * px}px`;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    lines.forEach((l, i) => {
      const yTopWorld = faceTop - top - i * lh * size;
      const base = yTopWorld - size * capK;
      const x = (shape.base - wallHalf(shape, yTopWorld) + inset) * k;
      ctx.fillText(l, x, (faceTop - base) * (CH / faceH));
    });
  }

  /** 히어로 측면의 스머지 프린트 — 캡션이 있을 때만(캡션을 옆으로 긁어낸 듯한 장식용 디테일). */
  function paintSmear(ctx, CW, CH, shape) {
    ctx.clearRect(0, 0, CW, CH);
    const rnd = mulberry(7);
    const faceTop = shape.height - EDGE_R;
    const faceH = faceTop + shape.skirt;
    const yPx = (y) => ((faceTop - y) / faceH) * CH;
    const x0 = CW * 0.07;
    const x1 = CW * 0.76;
    const yA = yPx(faceTop - 0.01);
    const yB = yPx(faceTop - 0.2);
    const col = Math.max(2, Math.round(CW / 160));
    for (let x = x0; x < x1; x += col * (1 + rnd() * 0.8)) {
      const edge = clamp((Math.min(x - x0, x1 - x) / (x1 - x0)) * 10);
      const base = (0.35 + 0.65 * rnd()) * edge;
      let y = yA + rnd() * 10;
      while (y < yB) {
        const run = 6 + rnd() * 30;
        if (rnd() > 0.25) {
          ctx.fillStyle = `rgba(255,255,255,${(base * (0.5 + 0.5 * rnd())).toFixed(3)})`;
          ctx.fillRect(x, y, col * (0.45 + 0.4 * rnd()), run);
        }
        y += run + rnd() * 6;
      }
      const tail = (yB - yA) * (0.2 + 0.6 * rnd());
      const g = ctx.createLinearGradient(0, yB, 0, yB + tail);
      g.addColorStop(0, `rgba(255,255,255,${(base * 0.5).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, yB, col * 0.6, tail);
    }
  }

  /** 반사용 생성 스튜디오 — 위에서 넓고 부드러운 박스 하나, 뒤-오른쪽에 띠 하나(뿌연 느낌),
   *  왼쪽에 흐린 패널 하나. 색 자체는 그레이스케일이라 포인트 컬러와 무관. */
  function buildStudio(renderer) {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x020202);
    const panel = (w, h, c, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
      return m;
    };
    const parts = [
      panel(6, 6, 0xb8b8b8, -1, 8, 2),
      panel(2, 7, 0x8a8a8a, 6, 4, -5),
      panel(1.5, 6, 0x262626, -7, 3, 1),
      panel(10, 2, 0x1a1a1a, 0, 1, -8),
    ];
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(env, 0.03);
    pmrem.dispose();
    parts.forEach((m) => {
      m.geometry.dispose();
      m.material.dispose();
    });
    return rt;
  }

  /* ----------------------------------------------------------- post */

  const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

  const COC_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform float uRange;
uniform float uAperture;
uniform float uNear;
uniform float uFarBand;
uniform float uFarK;
uniform float uMax;
void main() {
    vec4 s = texture2D(uScene, vUv);
    float d = s.a < 0.001 ? uRange : (s.a - 0.5) * 2.0 * uRange;
    float c = d < 0.0 ? -max(0.0, -d - uNear) : max(0.0, d - uFarBand) * uFarK;
    gl_FragColor = vec4(s.rgb, clamp(c * uAperture, -uMax, uMax));
}
`;

  const BOKEH_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uMax;
void main() {
    vec4 c0 = texture2D(uTex, vUv);
    float cs = abs(c0.a);
    vec3 col = c0.rgb;
    float tot = 1.0;
    float reach = cs;
    float r = 0.6;
    float ang = 0.0;
    for (int i = 0; i < 200; i++) {
        if (r >= uMax) break;
        ang += 2.39996323;
        vec4 s = texture2D(uTex, vUv + vec2(cos(ang), sin(ang)) * uTexel * r);
        float ss = abs(s.a);
        if (s.a > c0.a) ss = min(ss, cs * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, ss);
        col += mix(col / tot, s.rgb, m);
        tot += 1.0;
        reach = max(reach, m * ss);
        r += 0.6 / r;
    }
    gl_FragColor = vec4(col / tot, reach);
}
`;

  const BRIGHT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
vec3 tap(vec2 o, inout float wsum) {
    vec3 c = texture2D(uTex, vUv + uTexel * o).rgb;
    float w = 1.0 / (1.0 + max(c.r, max(c.g, c.b)));
    wsum += w;
    return c * w;
}
void main() {
    float ws = 0.0;
    vec3 c = tap(vec2(-0.5, -0.5), ws) + tap(vec2(0.5, -0.5), ws)
           + tap(vec2(-0.5, 0.5), ws) + tap(vec2(0.5, 0.5), ws);
    c /= ws;
    float l = max(c.r, max(c.g, c.b));
    float knee = 0.25;
    float soft = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    float w = max(soft, l - uThreshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * w, 1.0);
}
`;

  const BLUR_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;
void main() {
    vec2 o1 = uStep * 1.3846153846;
    vec2 o2 = uStep * 3.2307692308;
    vec3 c = texture2D(uTex, vUv).rgb * 0.2270270270;
    c += (texture2D(uTex, vUv + o1).rgb + texture2D(uTex, vUv - o1).rgb) * 0.3162162162;
    c += (texture2D(uTex, vUv + o2).rgb + texture2D(uTex, vUv - o2).rgb) * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
}
`;

  const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uDof;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform sampler2D uBloomC;
uniform float uDofOn;
uniform float uBloom;
uniform float uExposure;
uniform float uRange;
uniform float uFogStart;
uniform float uFog;
uniform float uHaze;
uniform float uFringe;
uniform float uVignette;
uniform float uGrain;
uniform float uAspect;
uniform float uShimmer;
uniform vec3 uBg;
uniform vec3 uTint;
uniform vec3 uAccent;
uniform vec2 uHero;

vec3 RRTAndODTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
}
vec3 aces(vec3 c) {
    const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    c = OUT * RRTAndODTFit(IN * (c / 0.6));
    return clamp(c, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float vnoise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

vec3 lens(vec2 uv) {
    vec4 s = texture2D(uScene, uv);
    vec4 d = texture2D(uDof, uv);
    vec3 c = mix(s.rgb, d.rgb, uDofOn * smoothstep(0.35, 1.3, d.a));
    c += (texture2D(uBloomA, uv).rgb * 0.8 + texture2D(uBloomB, uv).rgb * 0.5 + texture2D(uBloomC, uv).rgb * 0.35) * uBloom;
    c *= uExposure;
    float m = max(c.r, max(c.g, c.b));
    c = toSRGB(m > 1e-5 ? c * (aces(vec3(m)).r / m) : c);
    float ground = (s.a - 0.5) * 2.0 * uRange;
    float fog = s.a < 0.001 ? 1.0 : 1.0 - exp(-max(0.0, ground - uFogStart) * uFog);
    float far = mix(0.3, 1.0, fog);
    vec2 q = vec2((uv.x - 0.5) * uAspect, uv.y);
    float riseH = clamp(uv.y - uHero.y, 0.0, 1.0);
    float coneWidth = 0.22 + 0.26 * riseH;
    float rise = smoothstep(uHero.y - 0.04, uHero.y + 0.12, uv.y) * (1.0 - smoothstep(0.82, 1.08, uv.y));
    float column = exp(-pow((uv.x - uHero.x - 0.05) / coneWidth, 2.0)) * rise;
    float streak = 0.6 + 0.4 * vnoise(uv.x * 46.0 + uShimmer) * vnoise(uv.x * 13.0 - uShimmer * 0.4 + 7.0);
    float corner = exp(-length((q - vec2(0.5 * uAspect + 0.08, 0.72)) * vec2(1.0, 0.8)) / 0.3);
    vec3 tint = mix(uTint, uAccent, 0.55 * smoothstep(0.9, 0.0, uv.y - uHero.y));
    vec3 beam = tint * (column * streak * 0.085 + corner * 0.06) * uHaze * far;
    return mix(c, uBg, fog) + beam;
}

void main() {
    vec2 cc = (vUv - 0.5) * vec2(uAspect, 1.0);
    float rr = dot(cc, cc) / (0.25 * (uAspect * uAspect + 1.0));
    vec2 shift = (vUv - 0.5) * rr * uFringe;
    vec3 c = vec3(lens(vUv + shift).r, lens(vUv).g, lens(vUv - shift).b);
    float px = exp(-pow((vUv.x - 0.99) / 0.03, 2.0)) * exp(-pow((vUv.y - 0.27) / 0.13, 2.0));
    vec3 rainbow = 0.5 + 0.5 * cos(6.2832 * (vUv.y * 3.0 + vec3(0.0, 0.33, 0.67)));
    c += rainbow * px * uFringe * 9.0;
    c *= 1.0 - uVignette * smoothstep(0.15, 0.95, dot(cc, cc));
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    c += g * uGrain;
    gl_FragColor = vec4(c, 1.0);
}
`;

  /* ----------------------------------------------------------- layout */

  // 2026-11-12(8차): "html me app / design html css 식으로 교차해서 섞으라는거잖아" — 이전의
  // 점대칭(홀짝 클래스) 배치는 대각선으로 같은 단어 4칸이 뭉치는 구조라 아무리 배열 순서를
  // 바꿔도 "뭉침" 자체는 안 없어졌음(그 뭉친 단어가 HTML이냐 Design이냐만 바뀜). 그래서 클래스
  // 방식 자체를 버리고 (i + 2*j) 선형 해시로 바꿈 — 바로 옆/대각선 포함 8방향 이웃이 전부
  // 중심과 다른 단어가 되도록(5개 단어 기준 수학적으로 검증, 그리드 전체 인접 쌍 0개 중복)
  // 체커보드처럼 어긋나게 섞이게 함.
  function wordIndex(i, j, n) {
    return (((i + 2 * j) % n) + n) % n;
  }

  /* ----------------------------------------------------------- scene */

  function initKeycap(host, p) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const canvas = renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(canvas);

    const floatOk = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
    const type = floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const postOpts = { type, depthBuffer: false, stencilBuffer: false };
    const rtScene = new THREE.WebGLRenderTarget(1, 1, { type, samples: 4 });
    const rtCoc = new THREE.WebGLRenderTarget(1, 1, postOpts);
    const rtDof = new THREE.WebGLRenderTarget(1, 1, postOpts);
    const rts = Array.from({ length: 6 }, () => new THREE.WebGLRenderTarget(1, 1, postOpts));
    const [rtA, rtB, rtC, rtD, rtE, rtF] = rts;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(p.advanced.lens, 1, 0.1, 80);
    const env = buildStudio(renderer);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.35;

    const spot = new THREE.SpotLight(0xffffff, 7.5, 0, 12 * DEG, 1, 0);
    spot.position.set(-1.1, 6.2, 2.6);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = 0.012;
    spot.shadow.radius = 4;
    spot.shadow.camera.near = 2;
    spot.shadow.camera.far = 14;
    scene.add(spot, spot.target);
    const rim = new THREE.DirectionalLight(0xe8eef5, 0.55);
    rim.position.set(3.5, 4, -5);
    scene.add(rim);
    const glowLight = new THREE.PointLight(0xffffff, 1, 0, 2);
    const glowLow = new THREE.PointLight(0xffffff, 1, 0, 2);
    scene.add(glowLight, glowLow);

    const uRange = { value: FOCUS_RANGE };
    const uFwd = { value: new THREE.Vector2() };
    const uAo = { value: 0.72 };
    const uCapH = { value: CAP_H };

    const plateMat = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.85 });
    hookMaterial(plateMat, { uRange, uFwd }, "plate");
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), plateMat);
    plate.receiveShadow = true;
    scene.add(plate);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const makeTex = (cv) => {
      const t = new THREE.CanvasTexture(cv);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    };
    const makeCanvas = (w, h) => {
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      return cv;
    };
    const scratch = makeCanvas(8, 8).getContext("2d", { willReadFrequently: true });

    const N = 2 * GRID + 1;
    const COUNT = N * N;
    const HERO = GRID * N + GRID;
    const gi = (g) => Math.floor(g / N) - GRID;
    const gj = (g) => (g % N) - GRID;
    const pressPos = new Float32Array(COUNT);
    const pressVel = new Float32Array(COUNT);
    const lastY = new Float32Array(COUNT).fill(NaN);

    let shape = { base: 0.465, top: 0.37, height: CAP_H, dish: 0.015, skirt: 0 };
    let heroShape = { ...shape, skirt: 0.3 };
    let keyGeo = capGeometry(shape);
    let heroGeo = capGeometry(heroShape);
    let shapeKey = "";

    const heroTopCv = makeCanvas(1024, 1024);
    const heroFrontCv = makeCanvas(1024, 1024);
    const heroSideCv = makeCanvas(1024, 1024);
    const heroTopTex = makeTex(heroTopCv);
    const heroFrontTex = makeTex(heroFrontCv);
    const heroSideTex = makeTex(heroSideCv);
    const heroU = {
      uTopMap: { value: heroTopTex },
      uTopHalf: { value: shape.top },
      uTopInk: { value: new THREE.Color() },
      uTopTint: { value: 1 },
      uInkGlow: { value: 0 },
      uPrintA: { value: 1 },
      uFrontMap: { value: heroFrontTex },
      uSideMap: { value: heroSideTex },
      uFaceInk: { value: new THREE.Color() },
      uFaceHalf: { value: shape.base },
      uFaceTop: { value: CAP_H - EDGE_R },
      uFaceBottom: { value: -0.3 },
      uGlowColor: { value: new THREE.Color() },
      uRange,
      uFwd,
      uAo: { value: 0.35 },
      uCapH,
    };
    const heroMat = new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    hookMaterial(heroMat, heroU, "hero");
    const hero = new THREE.Mesh(heroGeo, heroMat);
    hero.castShadow = true;
    hero.receiveShadow = true;
    scene.add(hero);

    let combos = [];
    let wordTex = [];
    let wordsKey = "";
    const blankCv = makeCanvas(4, 4);
    const blankTex = makeTex(blankCv);

    const buildCaps = (list) => {
      combos.forEach((c) => {
        scene.remove(c.mesh);
        c.mesh.dispose();
        c.mat.dispose();
      });
      wordTex.forEach((t) => t.dispose());
      wordTex = list.map((w) => {
        const cv = makeCanvas(512, 512);
        const ctx = cv.getContext("2d");
        if (ctx && scratch) paintWord(ctx, scratch, 512, w);
        return makeTex(cv);
      });
      const n = list.length;
      const byKey = new Map();
      for (let g = 0; g < COUNT; g++) {
        if (g === HERO) continue;
        const word = n ? wordIndex(gi(g), gj(g), n) : -1;
        const style = (n ? word : 0) % 3;
        const k = `${style}:${word}`;
        if (!byKey.has(k)) byKey.set(k, { style, word, cells: [] });
        byKey.get(k).cells.push(g);
      }
      combos = [...byKey.values()].map(({ style, word, cells }) => {
        const uni = {
          uTopMap: { value: word >= 0 ? wordTex[word] : blankTex },
          uTopHalf: { value: shape.top },
          uTopInk: { value: new THREE.Color() },
          uTopTint: { value: 1 },
          uInkGlow: { value: 0 },
          uPrintA: { value: LEGEND_INK_ALPHA },
          uRange,
          uFwd,
          uAo,
          uCapH,
        };
        const mat =
          style === 1
            ? new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.4 })
            : new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.28 });
        hookMaterial(mat, uni, "key");
        const mesh = new THREE.InstancedMesh(keyGeo, mat, cells.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        return { mesh, mat, uni, style, cells };
      });
      lastY.fill(NaN);
    };

    /* ---- 히어로 프린트: 원본은 로고 이미지 or 기본 마크였지만, 여기선 외부 로고 없이
       항상 주변 캡과 같은 도트매트릭스로 heroWord("ME")를 찍는다. */
    let printVersion = 0;
    const onFonts = () => {
      printVersion++;
    };
    document.fonts?.addEventListener?.("loadingdone", onFonts);
    let printKey = "";
    let lastBake = -1e9;
    let wantFont = "";

    const bakeHero = (now) => {
      const f = p.font;
      const lines = p.caption.show ? p.caption.lines.map((l) => String(l)).filter((l) => l.trim()) : [];
      const key = JSON.stringify([lines, f.fontFamily, f.fontWeight, f.fontStyle, f.lineHeight, f.letterSpacing, shapeKey, printVersion]);
      if (key === printKey) return false;
      if (now - lastBake < 120) return false;
      lastBake = now;
      printKey = key;
      const fontStr = `${f.fontStyle || "normal"} ${f.fontWeight || 600} 100px ${familyOf(f)}`;
      if (fontStr !== wantFont) {
        wantFont = fontStr;
        document.fonts?.load(fontStr).then(onFonts, () => {});
      }
      const tctx = heroTopCv.getContext("2d");
      if (tctx) {
        tctx.clearRect(0, 0, 1024, 1024);
        paintWord(tctx, scratch, 1024, p.heroWord);
        heroU.uTopTint.value = 1;
        heroTopTex.needsUpdate = true;
      }
      const ch = Math.round((1024 * (heroShape.height - EDGE_R + heroShape.skirt)) / (2 * heroShape.base));
      if (heroFrontCv.height !== ch) {
        heroFrontCv.height = ch;
        heroSideCv.height = ch;
        heroFrontTex.dispose();
        heroSideTex.dispose();
      }
      const fctx = heroFrontCv.getContext("2d");
      if (fctx) paintCaption(fctx, 1024, ch, heroShape, lines, f);
      // 2026-11-12(4차): 사용자가 스크린샷에 X로 표시한 "지저분한" 부분 중 하나 — 옆면의
      // 장식용 스머지 텍스처가 캡션 옆에 긁힌 자국처럼 보여 정리된 느낌을 해쳤다. "ME" 하나만
      // 깔끔하게 보이게 아예 그리지 않는다.
      const sctx = heroSideCv.getContext("2d");
      if (sctx) sctx.clearRect(0, 0, 1024, ch);
      heroFrontTex.needsUpdate = true;
      heroSideTex.needsUpdate = true;
      return true;
    };

    /* ---- post ---- */

    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const shader = (fragmentShader, uniforms) =>
      new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const coc = shader(COC_FRAGMENT, {
      uScene: { value: rtScene.texture },
      uRange,
      uAperture: { value: 10 },
      uNear: { value: NEAR_BAND },
      uFarBand: { value: FAR_BAND },
      uFarK: { value: FAR_BLUR },
      uMax: { value: 14 },
    });
    const bokeh = shader(BOKEH_FRAGMENT, {
      uTex: { value: rtCoc.texture },
      uTexel: { value: new THREE.Vector2() },
      uMax: { value: 14 },
    });
    const bright = shader(BRIGHT_FRAGMENT, {
      uTex: { value: rtScene.texture },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 1.4 },
    });
    const blur = shader(BLUR_FRAGMENT, { uTex: { value: null }, uStep: { value: new THREE.Vector2() } });
    const composite = shader(COMPOSITE_FRAGMENT, {
      uScene: { value: rtScene.texture },
      uDof: { value: rtDof.texture },
      uBloomA: { value: rtA.texture },
      uBloomB: { value: rtD.texture },
      uBloomC: { value: rtF.texture },
      uDofOn: { value: 1 },
      uBloom: { value: 0.5 },
      uExposure: { value: 1 },
      uRange,
      uFogStart: { value: FOG_START },
      uFog: { value: 1.6 },
      uHaze: { value: 1 },
      uFringe: { value: 0.006 },
      uVignette: { value: 0.4 },
      uGrain: { value: 0.04 },
      uAspect: { value: 1 },
      uShimmer: { value: 0 },
      uBg: { value: new THREE.Vector3() },
      uTint: { value: new THREE.Vector3(0.85, 0.87, 0.82) },
      uAccent: { value: new THREE.Vector3() },
      uHero: { value: new THREE.Vector2(0.5, 0.5) },
    });
    const quad = new THREE.Mesh(quadGeo, composite);
    quad.frustumCulled = false;
    postScene.add(quad);
    const pass = (mat, target) => {
      quad.material = mat;
      renderer.setRenderTarget(target);
      renderer.render(postScene, postCam);
    };

    /* ---- size ---- */

    let W = 1;
    let H = 1;
    let quality = 1;
    const resize = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, Math.round(host.clientWidth || r.width));
      H = Math.max(1, Math.round(host.clientHeight || r.height));
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (W * H * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (W * H));
      dpr *= quality;
      const cw = Math.max(1, Math.round(W * dpr));
      const chh = Math.max(1, Math.round(H * dpr));
      renderer.setSize(cw, chh, false);
      rtScene.setSize(cw, chh);
      rtCoc.setSize(Math.max(1, cw >> 1), Math.max(1, chh >> 1));
      rtDof.setSize(Math.max(1, cw >> 1), Math.max(1, chh >> 1));
      rts.forEach((rt, i) => {
        const sh = (i >> 1) + 1;
        rt.setSize(Math.max(1, cw >> sh), Math.max(1, chh >> sh));
      });
      camera.aspect = W / H;
      composite.uniforms.uAspect.value = W / H;
      needs = true;
    };
    let needs = true;
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* ---- input ---- */

    const pt = { cx: 0, cy: 0, u: 0.5, v: 0.5, over: false, down: false, moved: false };
    const onMove = (e) => {
      pt.cx = e.clientX;
      pt.cy = e.clientY;
      pt.over = true;
      pt.moved = true;
    };
    const onDown = (e) => {
      onMove(e);
      pt.down = true;
    };
    const onUp = (e) => {
      pt.down = false;
      if (e.pointerType === "touch") pt.over = false;
      pt.moved = true;
    };
    const onLeave = () => {
      pt.over = false;
      pt.down = false;
      pt.moved = true;
    };
    const onScroll = () => {
      if (pt.over) pt.moved = true;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onLeave);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    let visible = true;
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting);
          })
        : null;
    io?.observe(host);
    const reduce = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    /* ---- hover hit test ---- */

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const P = new THREE.Vector3();
    const capY = (g, lift, sunk) => (g === HERO ? lift : 0) - pressPos[g] * sunk;
    const pick = (lift, sunk, twist) => {
      const ct = Math.cos(twist);
      const st = Math.sin(twist);
      ndc.set(pt.u * 2 - 1, 1 - pt.v * 2);
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      if (d.y >= -1e-4) return -1;
      const yTop = CAP_H + lift + 0.05;
      const t0 = (o.y - yTop) / -d.y;
      const t1 = o.y / -d.y;
      const STEPS = 40;
      for (let s = 0; s <= STEPS; s++) {
        P.copy(d).multiplyScalar(lerp(t0, t1, s / STEPS)).add(o);
        const i = Math.round(P.x);
        const j = Math.round(P.z);
        if (Math.abs(i) > GRID || Math.abs(j) > GRID) continue;
        const g = (i + GRID) * N + (j + GRID);
        const sh = g === HERO ? heroShape : shape;
        const y = P.y - capY(g, lift, sunk);
        if (y > sh.height || y < -sh.skirt) continue;
        const hw = y < 0 ? sh.base : wallHalf(sh, y);
        const lx = g === HERO ? ct * P.x - st * P.z : P.x - i;
        const lz = g === HERO ? st * P.x + ct * P.z : P.z - j;
        if (Math.abs(lx) < hw && Math.abs(lz) < hw) return g;
      }
      return -1;
    };

    /* ---- loop ---- */

    const M4 = new THREE.Matrix4();
    const accent = new THREE.Color();
    const light = new THREE.Color();
    const dark = new THREE.Color();
    const bg = new THREE.Color();
    const accSRGB = new THREE.Color();
    let raf = 0;
    let last = -1;
    let lastDraw = -1e9;
    let gapEma = 16;
    let lastQualityDrop = 0;
    let clock = 0;
    let leanX = 0;
    let leanY = 0;
    let hover = -1;
    let flare = 0;
    let announced = false;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible && announced) return;
      const A = p.advanced;
      const still = !!(reduce && reduce.matches);

      const gap = clamp(num(A.keyGap, 7), 1, 30) / 100;
      const lift = (clamp(num(A.heroLift, 70), 0, 150) / 100) * CAP_H;
      const dish = (clamp(num(A.dish, 3), 0, 10) / 100) * CAP_H;
      const sk = [gap, lift, dish].join();
      if (sk !== shapeKey) {
        shapeKey = sk;
        const base = 0.5 - gap / 2;
        shape = { base, top: base - TAPER, height: CAP_H, dish, skirt: 0 };
        heroShape = { ...shape, skirt: lift + 0.12 };
        keyGeo.dispose();
        heroGeo.dispose();
        keyGeo = capGeometry(shape);
        heroGeo = capGeometry(heroShape);
        hero.geometry = heroGeo;
        combos.forEach((c) => {
          c.mesh.geometry = keyGeo;
          c.uni.uTopHalf.value = shape.top;
        });
        heroU.uTopHalf.value = shape.top;
        heroU.uFaceHalf.value = shape.base;
        heroU.uFaceTop.value = CAP_H - EDGE_R;
        heroU.uFaceBottom.value = -heroShape.skirt;
        lastY.fill(NaN);
      }
      const list = (Array.isArray(p.words) ? p.words : []).map((w) => String(w ?? ""));
      const wk = JSON.stringify(list);
      if (wk !== wordsKey) {
        wordsKey = wk;
        buildCaps(list);
        needs = true;
      }
      if (bakeHero(now)) needs = true;

      if (pt.moved) {
        pt.moved = false;
        const r = host.getBoundingClientRect();
        pt.u = clamp((pt.cx - r.left) / Math.max(1, r.width), -0.2, 1.2);
        pt.v = clamp((pt.cy - r.top) / Math.max(1, r.height), -0.2, 1.2);
        needs = true;
      }

      const par = clamp(num(p.parallax, 10), 0, 10) / 10;
      const tx = pt.over ? (pt.u - 0.5) * 2 : 0;
      const ty = pt.over ? (pt.v - 0.5) * 2 : 0;
      const kl = 1 - Math.exp(-dt * 3.2);
      const leanTX = tx * par * 6 * DEG;
      const leanTY = -ty * par * 3.5 * DEG;
      leanY += (leanTX - leanY) * kl;
      leanX += (leanTY - leanX) * kl;
      const leaning = Math.abs(leanTX - leanY) > 1e-4 || Math.abs(leanTY - leanX) > 1e-4;

      const sp = still ? 0 : clamp(num(p.speed, 3), 0, 10) / 10;
      const idle = sp > 0;

      const sunk = (clamp(num(p.press, 10), 0, 10) / 10) * PRESS_TRAVEL;
      const lens = clamp(num(A.lens, 21), 10, 70);
      if (camera.fov !== lens) {
        camera.fov = lens;
      }
      camera.updateProjectionMatrix();
      const sc = clamp(num(p.scale, 100), 30, 100) / 100;
      const yaw = num(A.yaw, 47) * DEG + leanY + (idle ? Math.sin(clock * 0.21) * 1.4 * DEG : 0);
      const tilt = clamp(num(A.tilt, 42.6) * DEG + leanX, 10 * DEG, 88 * DEG);
      const dist = (VIEW_HALF * Math.max(1, REF_ASPECT / (W / H))) / Math.tan((lens * DEG) / 2) / sc;
      const aimY = CAP_H + lift - AIM_DROP;
      camera.position.set(Math.sin(yaw) * Math.cos(tilt) * dist, aimY + Math.sin(tilt) * dist, Math.cos(yaw) * Math.cos(tilt) * dist);
      camera.lookAt(0, aimY, 0);
      uFwd.value.set(-Math.sin(yaw), -Math.cos(yaw));
      camera.updateMatrixWorld();
      camera.projectionMatrix.elements[9] += AIM_SHIFT;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      const twist = num(A.heroTurn, 0) * DEG;
      hero.rotation.y = twist;

      hover = pt.over && sunk > 0 ? pick(lift, sunk, twist) : -1;
      let springing = false;
      const sdt = dt / 2;
      for (let g = 0; g < COUNT; g++) {
        const target = g === hover ? (pt.down ? 1 : 0.35) : 0;
        if (target === 0 && pressPos[g] === 0 && pressVel[g] === 0) continue;
        for (let s = 0; s < 2; s++) {
          const a = 900 * (target - pressPos[g]) - 30 * pressVel[g];
          pressVel[g] += a * sdt;
          pressPos[g] += pressVel[g] * sdt;
        }
        if (Math.abs(target - pressPos[g]) < 1e-3 && Math.abs(pressVel[g]) < 1e-2) {
          pressPos[g] = target;
          pressVel[g] = 0;
        } else springing = true;
      }
      const flareT = hover === HERO && pt.down ? 1 : 0;
      flare += (flareT - flare) * (1 - Math.exp(-dt * (flareT ? 14 : 4)));
      const flaring = Math.abs(flareT - flare) > 1e-3;

      const active = springing || leaning || flaring;
      const interval = active ? 1000 / 60 : idle ? 1000 / 30 : Infinity;
      if (!needs && now - lastDraw < interval - 2) return;
      const gapMs = now - lastDraw;
      if (active && gapMs < 100) {
        gapEma += (gapMs - gapEma) * 0.1;
        if (gapEma > 26 && quality > 0.6 && now - lastQualityDrop > 1500) {
          quality = Math.max(0.6, quality - 0.1);
          lastQualityDrop = now;
          gapEma = 16;
          resize();
        }
      }
      if (idle) clock += Math.min(0.1, gapMs / 1000) * (0.4 + sp * 1.2);
      lastDraw = now;
      needs = false;

      let moved = false;
      for (const c of combos) {
        let any = false;
        c.cells.forEach((g, k) => {
          const y = capY(g, lift, sunk);
          if (y !== lastY[g]) {
            lastY[g] = y;
            any = true;
          }
          M4.makeTranslation(gi(g), y, gj(g));
          c.mesh.setMatrixAt(k, M4);
        });
        if (any) {
          c.mesh.instanceMatrix.needsUpdate = true;
          moved = true;
        }
      }
      const hy = capY(HERO, lift, sunk);
      if (hy !== lastY[HERO]) {
        lastY[HERO] = hy;
        moved = true;
      }
      hero.position.set(0, hy, 0);
      if (moved) renderer.shadowMap.needsUpdate = true;

      const pal = p.colors;
      accent.set(pal.accent);
      light.set(pal.light);
      dark.set(pal.dark);
      for (const c of combos) {
        c.mat.color.copy(c.style === 1 ? light : dark);
        c.uni.uTopInk.value.copy(c.style === 0 ? accent : c.style === 1 ? dark : light);
        c.uni.uInkGlow.value = c.style === 0 ? 0.35 : 0;
      }
      heroMat.color.copy(accent);
      heroU.uTopInk.value.set(p.textColor);
      heroU.uFaceInk.value.set(p.textColor);
      const gl = clamp(num(p.glow, 10), 0, 10) / 10;
      const breathe = idle ? 1 + 0.1 * Math.sin(clock * 1.3) : 1;
      const glowK = gl * breathe * (1 + 0.8 * flare);
      heroU.uGlowColor.value.copy(accent).multiplyScalar(0.75 * glowK);
      glowLight.color.copy(accent);
      glowLow.color.copy(accent);
      glowLight.intensity = 0.65 * glowK;
      glowLow.intensity = 0.35 * glowK;
      glowLight.position.set(0, hy + CAP_H * 0.45, 0);
      glowLow.position.set(0, 0.12, 0);
      spot.target.position.set(-0.4, 0, -0.4);

      renderer.setRenderTarget(rtScene);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);

      const blurK = clamp(num(A.blur, 100), 0, 300) / 100;
      const halfH = rtCoc.height;
      const dofOn = floatOk && blurK > 0;
      composite.uniforms.uDofOn.value = dofOn ? 1 : 0;
      if (dofOn) {
        const maxC = Math.max(2, halfH * 0.028 * Math.max(1, blurK));
        coc.uniforms.uAperture.value = APERTURE * halfH * blurK * sc;
        coc.uniforms.uMax.value = maxC;
        bokeh.uniforms.uMax.value = maxC;
        bokeh.uniforms.uTexel.value.set(1 / rtCoc.width, 1 / rtCoc.height);
        pass(coc, rtCoc);
        pass(bokeh, rtDof);
      }

      bright.uniforms.uTexel.value.set(1 / rtScene.width, 1 / rtScene.height);
      pass(bright, rtA);
      const step = blur.uniforms.uStep.value;
      const levels = [
        [rtA, rtB, rtA],
        [rtA, rtC, rtD],
        [rtD, rtE, rtF],
      ];
      levels.forEach(([src, mid, dst], i) => {
        blur.uniforms.uTex.value = src.texture;
        step.set((i === 0 ? 1 : 2) / src.width, 0);
        pass(blur, mid);
        blur.uniforms.uTex.value = mid.texture;
        step.set(0, 1 / mid.height);
        pass(blur, dst);
      });

      bg.set(p.background).convertLinearToSRGB();
      const acc = accSRGB.copy(accent).convertLinearToSRGB();
      composite.uniforms.uAccent.value.set(acc.r, acc.g, acc.b);
      P.set(0, hy + CAP_H, 0).project(camera);
      composite.uniforms.uHero.value.set(P.x * 0.5 + 0.5, P.y * 0.5 + 0.5);
      composite.uniforms.uBg.value.set(bg.r, bg.g, bg.b);
      // 2026-11-12(3차): bloom 기본치와 거리-배경 페이드(fog)가 "흐릿한 배경 그라데이션"처럼
      // 보인다는 피드백 — bloom 바닥값을 낮추고 fog는 완전히 0으로(거리에 따라 배경색으로
      // 섞이던 효과 자체를 제거).
      composite.uniforms.uBloom.value = 0.08 + 0.35 * gl * (1 + 0.6 * flare);
      composite.uniforms.uExposure.value = clamp(num(A.exposure, 100), 20, 300) / 100;
      composite.uniforms.uFog.value = 0;
      composite.uniforms.uHaze.value = clamp(num(A.haze, 100), 0, 300) / 100;
      composite.uniforms.uFringe.value = (0.008 * clamp(num(A.fringe, 100), 0, 300)) / 100;
      composite.uniforms.uVignette.value = clamp(num(A.vignette, 55), 0, 100) / 100;
      composite.uniforms.uGrain.value = clamp(num(A.grain, 4), 0, 30) / 100;
      composite.uniforms.uShimmer.value = clock * 0.35;
      pass(composite, null);

      if (!announced) {
        announced = true;
        host.style.opacity = "1";
      }
    };
    raf = requestAnimationFrame(frame);
  }

  try {
    initKeycap(container, cfg);
  } catch (_) {
    // 생성 중 실패해도 사이트 전체가 깨지면 안 됨 — 카드는 그냥 빈 배경(.yj-ph 폴백)으로 남는다.
  }
})();
