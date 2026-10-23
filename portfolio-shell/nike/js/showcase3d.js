// 제품 쇼케이스 3D 신발(assets/models/sneaker.glb) 전용 모듈.
// three.js는 examples/jsm(addons) 로더가 ES 모듈 배포만 안정적으로 유지되는 버전대라 이 파일만
// type="module"로 분리 로드(index.html 하단 importmap 참고). main.js(classic script, 기존 스크롤
// 진행률 raf 루프를 그대로 소유)와는 window.__setShowcaseProgress(progress) 함수 하나로만 통신 —
// "진행률 계산은 main.js가 한 곳에서, 3D 렌더링만 여기서" 역할을 분리.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("[data-showcase-canvas]");
if (canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visual = canvas.closest(".showcase__visual");

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // 라운지 느낌 조명: 은은한 ambient + 키라이트 + 포인트 컬러(volt) 림라이트로 가장자리만 살짝 틴트.
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-5, -2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd7ff3e, 1.4);
  rim.position.set(-3, 2, -5);
  scene.add(rim);

  let model = null;

  function resize() {
    const w = visual.clientWidth || 1;
    const h = visual.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    renderer.render(scene, camera);
  }

  // 2026-10-23 5차: "회전을 줄 거면 360도까지 돌고 나서 다음 아이템이 나오게"라는 요청 — 진행률
  // 0→1에 그대로 0→360deg를 걸어 스테이지가 끝나는 순간(progress=1) 정확히 한 바퀴를 다 돌고 멈춘
  // 채로 핀이 풀리게 함(회전이 중간에 끊기는 느낌 없이 "한 바퀴 다 돌았다"가 분명해짐). 스케일은
  // 회전 내내 흔들리지 않게 고정하고, 초반 진행률의 아주 짧은 구간(0→0.17)에서만 작게 시작해 원래
  // 크기로 "팝인"하는 입장 연출만 남김.
  window.__setShowcaseProgress = (progress) => {
    if (!model) return;
    model.rotation.y = progress * Math.PI * 2;
    model.scale.setScalar(Math.min(1, 0.85 + progress * 6 * 0.15));
    render();
  };

  new GLTFLoader().load(
    "assets/models/sneaker.glb",
    (gltf) => {
      model = gltf.scene;
      // Tripo 등 이미지→3D 생성 모델은 원점·스케일이 제멋대로라 바운딩박스로 중심을 맞춘다.
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);

      // "신발이 화면에서 메인처럼 커야 한다(최소 2배)"는 요청 — 카메라를 모델 쪽으로 바짝 당겨 프레임의
      // 92%(5차, 기존 85%에서 상향)를 채우도록 거리를 역산.
      // ⚠️ 2026-10-23 버그 수정: 처음엔 "회전 중 어느 각도에서도 안 잘리게"라는 이유로 바운딩 **구**의
      // 지름을 기준 크기로 썼는데, 구의 지름은 가로·세로·깊이 3축을 다 합친 대각선(피타고라스) 크기라
      // 실제 눈에 보이는 2D 실루엣보다 훨씬 크게 잡혀서 — 카메라를 그만큼 더 멀리 빼버려 신발이 작게
      // 보였던 것(지름을 92% 채우게 했는데도 작아 보인 이유). 지금 회전은 **Y축(요)만** 돌리고 눕거나
      // 기울어지지(피치·롤) 않으므로, 실제로 안전하게 잡아야 할 건 ① Y축 회전에 따라 안 변하는 세로
      // 폭(size.y) ② Y축 회전 중 가로로 보이는 폭의 최댓값(가로·깊이의 대각선, 신발을 위에서 내려다본
      // "풋프린트"의 지름) 두 가지뿐 — 이 둘로만 핏을 계산해 불필요한 여유를 없앰.
      const footprintDiameter = Math.hypot(size.x, size.z); // Y축 회전 중 가로로 보일 수 있는 최대 폭
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const fitHeightDist = size.y / (2 * Math.tan(fovRad / 2));
      const fitWidthDist = footprintDiameter / (2 * Math.tan(fovRad / 2) * camera.aspect);
      const fillFactor = 0.92;
      const distance = Math.max(fitHeightDist, fitWidthDist) / fillFactor;
      camera.position.set(0, 0, distance);
      camera.near = distance / 100;
      camera.far = distance * 10;
      camera.updateProjectionMatrix();

      scene.add(model);
      if (visual) visual.classList.remove("is-loading");
      window.__setShowcaseProgress(reduceMotion ? 1 : 0);
    },
    undefined,
    (err) => {
      console.error("쇼케이스 3D 모델 로드 실패", err);
      if (visual) visual.classList.remove("is-loading");
    }
  );

  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
  resize();
}
