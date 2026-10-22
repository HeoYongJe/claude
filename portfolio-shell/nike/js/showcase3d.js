// 제품 쇼케이스 3D 신발(assets/models/sneaker.glb) 전용 모듈.
// three.js는 examples/jsm(addons) 로더가 ES 모듈 배포만 안정적으로 유지되는 버전대라 이 파일만
// type="module"로 분리 로드(index.html 하단 importmap 참고). main.js(classic script, 기존 스크롤
// 진행률 raf 루프를 그대로 소유)와는 window.__setShowcaseProgress(progress) 함수 하나로만 통신 —
// "진행률 계산은 main.js가 한 곳에서, 3D 렌더링만 여기서" 역할을 분리해 라인·배경 그라데이션 타이밍과
// 신발 회전이 항상 같은 값을 기준으로 동기화되게 함.
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

  // -46deg(옆에서 보이기 시작) -> 8deg(정면을 살짝 지나 멈춤, 가만히 서 있는 것보다 역동적으로)로
  // 진행률에 바인딩. main.js가 스크롤 진행률 계산 때마다 이 함수를 호출.
  window.__setShowcaseProgress = (progress) => {
    if (!model) return;
    const deg = -46 + progress * 54;
    model.rotation.y = THREE.MathUtils.degToRad(deg);
    model.scale.setScalar(0.92 + progress * 0.08);
    render();
  };

  new GLTFLoader().load(
    "assets/models/sneaker.glb",
    (gltf) => {
      model = gltf.scene;
      // Tripo 등 이미지→3D 생성 모델은 원점·스케일이 제멋대로라, 바운딩구(sphere)로 중심을 맞춘다 —
      // 박스 대신 구를 쓰는 이유: 신발이 회전(-46~8deg)하는 동안 화면상 외곽선 크기가 축마다 달라지는데,
      // 구 반지름은 회전과 무관하게 항상 안전한 "최대 크기"라 어느 각도에서도 프레임을 벗어나지 않음.
      const box = new THREE.Box3().setFromObject(model);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      model.position.sub(sphere.center);

      // "신발이 화면에서 메인처럼 커야 한다"는 요청 — 카메라를 모델 쪽으로 바짝 당겨 프레임의 85%를
      // 채우도록 거리를 역산(거리가 가까울수록 더 크게 보임). camera.aspect는 위 resize()가 로드
      // 완료 전에 이미 한 번 실행돼 있어 이 시점엔 실제 캔버스 비율을 정확히 반영한 상태.
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const diameter = sphere.radius * 2;
      const fitHeightDist = diameter / (2 * Math.tan(fovRad / 2));
      const fitWidthDist = fitHeightDist / camera.aspect;
      const fill = 0.85;
      const distance = Math.max(fitHeightDist, fitWidthDist) / fill;
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
