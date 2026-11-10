/* eslint-disable */
// 히어로 배경 지구본 — 사용자가 제공한 originkit.dev Globe(React/Three.js) 컴포넌트를 참고해
// 이 프로젝트(바닐라 JS, React 없음)에 맞게 새로 작성 (2026-11-10).
// 원본 그대로 포팅하지 않고 이 용도("히어로 카드 뒤 은은한 배경")에 필요한 것만 남겨 단순화:
//   - 자동 회전만(드래그·호버멈춤·텍스처 채우기 모드 등 상호작용 기능은 뺌 — 배경 장식이라 불필요)
//   - d3-geo 의존성 제거 — 등장방형(equirectangular) 투영 하나만 쓰므로 직접 계산
//   - 대륙 윤곽선은 원본의 TubeGeometry(3D 튜브) 대신 단순 LineLoop로 — 작은 배경 지구본에서는
//     시각 차이가 거의 없고 코드가 훨씬 가벼움
// 라이트 테마(가뿐 배경은 밝은 아이보리) 대응: 원본은 검은 배경+흰 점 기준이라, 지구본 자체를
// 반투명한 "윤곽선+점"으로만 그리고(구체 표면 채움 없음) 브랜드 색상(--ink/--accent)을 입힘.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(async function () {
  "use strict";
  const container = document.querySelector("[data-hero-globe]");
  if (!container) return;
  // 모바일(1열 레이아웃)은 배경으로 깔 공간이 없고 WebGL 비용도 큼 — css(.hero__bgwrap)에서도
  // 900px 이하는 숨기지만, 그 폭에서 아예 초기화(fetch·렌더러 생성)조차 안 하도록 js에서도 가드.
  if (window.innerWidth < 901) return;
  if (!window.WebGLRenderingContext) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cs = getComputedStyle(document.documentElement);
  const inkColor = (cs.getPropertyValue("--ink") || "#1E293B").trim();
  const accentColor = (cs.getPropertyValue("--accent") || "#E76F51").trim();

  // 자체 호스팅 간소화 지형 데이터(원본 2.7MB geojson을 섬 제거·좌표 반올림으로 85KB까지 축소,
  // 자세한 내용은 design.md 2026-11-10 항목 참고) — [[lng,lat], ...] 링(ring) 배열.
  let landRings;
  try {
    const res = await fetch("js/worldLand.json");
    landRings = await res.json();
  } catch (_) {
    return; // 배경 장식일 뿐 페이지 기능과 무관 — 못 받으면 조용히 생략
  }
  if (!landRings || !landRings.length) return;

  function latLngToVec3(lat, lng, radius) {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(latRad) * Math.sin(lngRad) * radius,
      Math.sin(latRad) * radius,
      Math.cos(latRad) * Math.cos(lngRad) * radius
    );
  }

  // ---- 육지 판별용 래스터 마스크(등장방형 투영) — d3 없이 직접 그림 ----
  const maskW = 720, maskH = 360;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskW;
  maskCanvas.height = maskH;
  const mctx = maskCanvas.getContext("2d");
  mctx.fillStyle = "#fff";
  landRings.forEach((ring) => {
    mctx.beginPath();
    ring.forEach(([lng, lat], i) => {
      const x = ((lng + 180) / 360) * maskW;
      const y = ((90 - lat) / 180) * maskH;
      if (i === 0) mctx.moveTo(x, y);
      else mctx.lineTo(x, y);
    });
    mctx.closePath();
    mctx.fill();
  });
  const maskData = mctx.getImageData(0, 0, maskW, maskH).data;
  function isOnLand(lng, lat) {
    let x = Math.round(((lng + 180) / 360) * maskW) % maskW;
    if (x < 0) x += maskW;
    const y = Math.max(0, Math.min(maskH - 1, Math.round(((90 - lat) / 180) * maskH)));
    return maskData[(y * maskW + x) * 4 + 3] > 10;
  }

  // ---- Three.js 장면 ----
  const radius = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 2.85);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // 대륙 점(잉크 톤, 은은하게)
  const dotCoords = [];
  const step = 3.4;
  for (let lat = -82; lat <= 82; lat += step) {
    const cosLat = Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    const lngStep = step / cosLat;
    for (let lng = -180; lng < 180; lng += lngStep) {
      if (isOnLand(lng, lat)) dotCoords.push([lng, lat]);
    }
  }
  if (dotCoords.length) {
    const dotGeom = new THREE.SphereGeometry(0.009, 4, 4);
    // 2026-11-10(3차): 2차 조정 때 너무 낮춰서 전체적으로 "너무 흐림" 피드백 — 살짝 올림.
    const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(inkColor), transparent: true, opacity: 0.2 });
    const dots = new THREE.InstancedMesh(dotGeom, dotMat, dotCoords.length);
    const m = new THREE.Matrix4();
    dotCoords.forEach(([lng, lat], i) => {
      const p = latLngToVec3(lat, lng, radius);
      m.setPosition(p.x, p.y, p.z);
      dots.setMatrixAt(i, m);
    });
    dots.instanceMatrix.needsUpdate = true;
    globeGroup.add(dots);
  }

  // 위도/경도 그리드 — 구체 형태를 드러내는 핵심 요소.
  // 2026-11-10: "구체모형이 안 보인다"는 피드백 — border색(아주 연한 회색)은 에어오트밀
  // 배경과 명도 대비가 거의 없어 opacity를 올려도 안 보였음(색 자체의 문제) → ink색으로 교체.
  // 2026-11-10(2차): 교체 직후 0.85는 "찐하다/오브제 같다"는 피드백 — ink색 유지한 채
  // opacity만 크게 낮춰 "선이 있긴 한데 아주 연하게" 수준으로.
  // 2026-11-10(3차): "가운데 세로중심라인만 너무 진하다" — 경도선(자오선)은 극-극 반원이라
  // LineLoop로 그리면 끝점(북극)을 시작점(남극)으로 되돌리는 "닫는 선분"이 추가되는데, 이 닫는
  // 선분이 하필 극축(수직 중심선)과 정확히 겹침. 경도선 11개 전부가 같은 극축 닫는 선분을
  // 긋다 보니 그 한 줄만 11겹으로 겹쳐 그려져 유독 진하게 보였던 것(버그) — 자오선은 애초에
  // 닫힌 루프가 아니므로 LineLoop 대신 열린 Line으로 교체. 위도선(평행선)은 진짜로 한 바퀴
  // 도는 닫힌 루프라 LineLoop 그대로 유지.
  const graticuleMat = new THREE.LineBasicMaterial({ color: new THREE.Color(inkColor), transparent: true, opacity: 0.46 });
  function addGraticuleLoop(points) {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    globeGroup.add(new THREE.LineLoop(geom, graticuleMat));
  }
  function addGraticuleOpen(points) {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    globeGroup.add(new THREE.Line(geom, graticuleMat));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let i = 0; i <= 64; i++) pts.push(latLngToVec3(lat, (i / 64) * 360 - 180, radius));
    addGraticuleLoop(pts);
  }
  for (let lng = -150; lng < 180; lng += 30) {
    const pts = [];
    for (let i = 0; i <= 64; i++) pts.push(latLngToVec3((i / 64) * 180 - 90, lng, radius));
    addGraticuleOpen(pts);
  }

  // ⚠️ 2026-11-10: 여기 있던 "외곽 테두리"는 z=0 평면에 그린 2D 원을 globeGroup(계속 회전)에
  // 그대로 매달아놓은 것이었음 — 평면 원은 Y축 회전 그룹에 종속되면 회전하면서 타원으로
  // 찌그러짐(진짜 3D 구체가 아니라서 카메라 시점에서 실루엣이 항상 원으로 유지되지 않음).
  // 사용자가 "모양이 변형된다"고 정확히 지적한 그 버그 — 제대로 고치려면 실제 SphereGeometry가
  // 필요한데(원본 컴포넌트의 oceanMesh처럼), 이번엔 "제대로 재포팅" 대신 "더 옅은 배경"으로
  // 방향을 바꿨으므로 이 장식용 테두리 자체를 제거 — 점·그리드만으로도(둘 다 실제 구면 좌표라
  // 회전해도 찌그러지지 않음) 충분히 구체처럼 읽힘.

  // 포인트컬러(테라코타) 마커 — "오늘의 추천"(현재 히어로 카드 기준 일본) + 출발지(서울)를 짚어줌.
  const markerPositions = [
    { lat: 35.68, lng: 139.69 }, // Tokyo
    { lat: 37.57, lng: 126.98 }, // Seoul
  ];
  const markerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor) });
  const markerGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor), transparent: true, opacity: 0.25 });
  markerPositions.forEach(({ lat, lng }) => {
    const p = latLngToVec3(lat, lng, radius * 1.018);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 16), markerMat);
    marker.position.copy(p);
    globeGroup.add(marker);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 16), markerGlowMat);
    glow.position.copy(p);
    globeGroup.add(glow);
  });

  globeGroup.rotation.y = -0.5;
  globeGroup.rotation.x = 0.32;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener("resize", resize);

  const rotSpeed = prefersReduced ? 0 : 0.001; // 배경 텍스처용이라 더 느긋하게(2026-11-10)
  function tick() {
    requestAnimationFrame(tick);
    globeGroup.rotation.y += rotSpeed;
    renderer.render(scene, camera);
  }
  tick();
})();
