/* eslint-disable */
// 히어로 배경 지구본 — 2026-11-10 9차: 사용자가 originkit "Globe"(랜드마스크 버전: 대륙 모양을
// 실제 지리 데이터로 따서 점그리드+해안선 아웃라인으로 그리는 방식) 소스를 다시 제공하며
// "이걸로 교체, 색은 히어로 배경에 맞게, 회전은 좌우로만, 위치는 히어로 하단에 반만 걸치게"로
// 레이아웃 자체를 재지시 — 케이지+shimmer 버전(originkit "Globe Mesh")은 교체 전 상태로
// `가뿐_지구본_케이지버전_백업_20261110` 태그에 보존.
// React/TS 원본은 범용 설정 가능한 컴포넌트(수십 개 props)였지만, 여기선 가뿐 히어로라는 단일
// 용도로만 쓰이므로 그 prop API를 그대로 옮기지 않고 같은 "기법"(바다 구체 + 위경도 격자 +
// 실제 대륙 해안선 아웃라인 + 대륙 위 점그리드 + 좌우 자동 회전)만 고정값으로 이식.
// 드래그/호버 인터랙션은 이번 요청에 없고("회전은 좌우로만") 장식용 배경이라 전부 제외.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const LAND_DATA_URL =
  "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json";

function hexToThreeColor(hex) {
  return new THREE.Color(hex);
}

function latLngToVec3(lat, lng, r) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(latRad) * Math.sin(lngRad) * r,
    Math.sin(latRad) * r,
    Math.cos(latRad) * Math.cos(lngRad) * r
  );
}

// 링(좌표 배열)을 N개 중 1개만 남겨 단순화 — 장식용 배경이라 해안선 디테일은 거칠어도 무방.
function simplifyRing(ring, step) {
  if (ring.length <= step * 2) return ring;
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  return out;
}

class GlobeScene {
  constructor(container, cfg) {
    this.container = container;
    this.cfg = cfg;
    this.radius = 1;
    this.spinY = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0, 2.6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = this.renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    container.appendChild(canvas);
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 1.1s ease";

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._buildOcean();
    this._buildGraticule();
    this._buildOutlineRing();

    this._ro = new ResizeObserver(() => this.setSize(container.clientWidth || 1, container.clientHeight || 1));
    this._ro.observe(container);
    this.setSize(container.clientWidth || 1, container.clientHeight || 1);
  }

  _buildOcean() {
    const geo = new THREE.SphereGeometry(this.radius, 48, 48);
    const mat = new THREE.MeshBasicMaterial({ color: hexToThreeColor(this.cfg.oceanColor) });
    this.group.add(new THREE.Mesh(geo, mat));
  }

  _buildGraticule() {
    const mat = new THREE.LineBasicMaterial({
      color: hexToThreeColor(this.cfg.lineColor),
      transparent: true,
      opacity: this.cfg.graticuleOpacity,
    });
    const r = this.radius * 1.001;
    const spacing = 15;
    // 위도선(닫힌 원) — LineLoop 사용.
    for (let lat = -75; lat <= 75; lat += spacing) {
      const pts = [];
      for (let i = 0; i <= 64; i++) pts.push(latLngToVec3(lat, (i / 64) * 360 - 180, r));
      this.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    // 경도선(극-극 반원) — 모든 선이 같은 극축을 공유해 LineLoop를 쓰면 닫는 구간이 겹쳐
    // 극 부근이 과도하게 진해지는 버그가 있었음(이전 라운드에서 확인) → 열린 THREE.Line 사용.
    for (let lng = -180; lng < 180; lng += spacing) {
      const pts = [];
      for (let i = 0; i <= 64; i++) pts.push(latLngToVec3((i / 64) * 180 - 90, lng, r));
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }

  _buildOutlineRing() {
    const segments = 128;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * this.radius * 1.003, Math.sin(a) * this.radius * 1.003, 0));
    }
    const mat = new THREE.LineBasicMaterial({
      color: hexToThreeColor(this.cfg.lineColor),
      transparent: true,
      opacity: this.cfg.outlineOpacity,
    });
    this.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }

  async loadLand() {
    let land;
    try {
      const res = await fetch(LAND_DATA_URL);
      if (!res.ok) throw new Error("land fetch failed");
      land = await res.json();
    } catch (_) {
      return; // 대륙 데이터 없이도 바다 구체+격자만으로 동작(장식 실패가 사이트를 깨면 안 됨)
    }

    // ---- 대륙 판별용 래스터(등장방형 투영, 자체 구현 — d3-geo 의존 없이 캔버스로 직접 채움) ----
    const texW = 1024, texH = 512;
    const off = document.createElement("canvas");
    off.width = texW; off.height = texH;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    const project = (lng, lat) => [((lng + 180) / 360) * texW, ((90 - lat) / 180) * texH];
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, texW, texH);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (const f of land.features || []) {
      const geom = f.geometry;
      if (!geom) continue;
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
      for (const poly of polys) {
        for (const ring of poly) {
          ring.forEach(([lng, lat], i) => {
            const [x, y] = project(lng, lat);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
      }
    }
    ctx.fill("evenodd");
    const pixels = ctx.getImageData(0, 0, texW, texH).data;
    const isOnLand = (lng, lat) => {
      let x = Math.round(((lng + 180) / 360) * texW) % texW;
      if (x < 0) x += texW;
      const y = Math.max(0, Math.min(texH - 1, Math.round(((90 - lat) / 180) * texH)));
      return pixels[(y * texW + x) * 4] > 128;
    };

    // ---- 해안선 아웃라인(바깥 링만, 단순화) ----
    const outlineMat = new THREE.LineBasicMaterial({
      color: hexToThreeColor(this.cfg.lineColor),
      transparent: true,
      opacity: this.cfg.coastOpacity,
    });
    for (const f of land.features || []) {
      const geom = f.geometry;
      if (!geom) continue;
      const outerRings =
        geom.type === "Polygon" ? [geom.coordinates[0]] :
        geom.type === "MultiPolygon" ? geom.coordinates.map((p) => p[0]) : [];
      for (const ring of outerRings) {
        if (!ring || ring.length < 3) continue;
        const simplified = simplifyRing(ring, this.cfg.coastSimplify);
        const pts = simplified.map(([lng, lat]) => latLngToVec3(lat, lng, this.radius * 1.002));
        if (pts.length >= 3) this.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), outlineMat));
      }
    }

    // ---- 대륙 위 점그리드 ----
    const dotCoords = [];
    const baseStep = this.cfg.dotStepDeg;
    for (let lat = -90; lat <= 90; lat += baseStep) {
      const cosLat = Math.max(0.12, Math.cos((Math.abs(lat) * Math.PI) / 180));
      const lngStep = baseStep / cosLat;
      for (let lng = -180; lng < 180; lng += lngStep) {
        if (isOnLand(lng, lat)) dotCoords.push([lng, lat]);
      }
    }
    if (dotCoords.length) {
      const dotGeo = new THREE.SphereGeometry(this.cfg.dotRadius, 4, 4);
      const dotMat = new THREE.MeshBasicMaterial({
        color: hexToThreeColor(this.cfg.lineColor),
        transparent: true,
        opacity: this.cfg.dotOpacity,
      });
      const inst = new THREE.InstancedMesh(dotGeo, dotMat, dotCoords.length);
      const m = new THREE.Matrix4();
      dotCoords.forEach(([lng, lat], i) => {
        const p = latLngToVec3(lat, lng, this.radius * 1.001);
        m.setPosition(p.x, p.y, p.z);
        inst.setMatrixAt(i, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      this.group.add(inst);
    }

    this.renderer.domElement.style.opacity = "1";
  }

  setSize(w, h) {
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    const step = (tMs) => {
      if (this.cfg.spinSpeed !== 0) {
        this.spinY += this.cfg.spinSpeed * this.cfg.spinDir;
        this.group.rotation.y = this.spinY; // 회전은 좌우(Y축)로만 — 상하 틸트·드래그 없음
      }
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }
}

(function () {
  "use strict";
  const container = document.querySelector("[data-hero-globe]");
  if (!container) return;
  if (window.innerWidth < 901) return;
  if (!window.WebGLRenderingContext) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cs = getComputedStyle(document.documentElement);
  const inkColor = (cs.getPropertyValue("--ink") || "#1E293B").trim();
  const bgColor = (cs.getPropertyValue("--bg") || "#FDFCFA").trim();

  const cfg = {
    oceanColor: bgColor,   // 바다=히어로 배경색과 동일 — 구체 뒷면이 묻혀 보이지 않고 윤곽만 남음
    lineColor: inkColor,
    graticuleOpacity: 0.07,
    outlineOpacity: 0.16,
    coastOpacity: 0.3,
    coastSimplify: 3,
    dotStepDeg: 2.4,
    dotRadius: 0.0075,
    dotOpacity: 0.22,
    spinSpeed: prefersReduced ? 0 : 0.0011, // rad/frame, ~60fps → 완전히 한 바퀴 도는 데 약 95초
    spinDir: -1, // "left" 방향(원본 기본값)과 동일
  };

  let scene;
  try {
    scene = new GlobeScene(container, cfg);
  } catch (_) {
    return;
  }
  scene.start();
  scene.loadLand();
})();
