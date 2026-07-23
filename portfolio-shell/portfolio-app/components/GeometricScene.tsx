"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

// 전 페이지 고정 배경. 스크롤하면 카메라가 Z축으로 전진하며 흩어진 도형들
// 사이를 "관통하듯" 날아간다. 안개(fog)로 원근을 줘 3D 공간을 통과하는 느낌.
export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 모바일 생략

    const reduceMotion = prefersReducedMotion();
    const DARK = 0x0e0e10;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(DARK, 16, 62);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    const START_Z = 14;
    const END_Z = -54;
    camera.position.set(0, 0, START_Z);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(5, 8, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3366ff, 0.8);
    rim.position.set(-6, -4, 6);
    scene.add(rim);

    const geometries = [
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.TetrahedronGeometry(1.8, 0),
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.DodecahedronGeometry(1.5, 0),
    ];

    const shapes: { mesh: THREE.Mesh; spin: THREE.Vector3 }[] = [];

    // 도형을 Z 터널을 따라 분포. 중앙(텍스트 영역)은 비우고 바깥 링에 배치해
    // 스쳐 지나갈 때 모션 패럴랙스가 강하게 느껴지도록 한다.
    const COUNT = 26;
    const zNear = START_Z - 6;
    const zFar = END_Z - 6;

    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);
      const z = zNear + (zFar - zNear) * t + (Math.random() - 0.5) * 3;
      const radius = 5.5 + Math.random() * 7;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.72;

      const geo = geometries[i % geometries.length];
      const fill = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        roughness: 0.15,
        metalness: 0.25,
      });
      const mesh = new THREE.Mesh(geo, fill);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: 0x3366ff,
          transparent: true,
          opacity: 0.55,
        })
      );
      mesh.add(edges);

      mesh.scale.setScalar(0.8 + Math.random() * 0.9);
      mesh.position.set(x, y, z);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      scene.add(mesh);
      shapes.push({
        mesh,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ),
      });
    }

    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height || 1;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const renderOnce = () => renderer.render(scene, camera);

    let progress = 0; // 목표 스크롤 진행률
    let camZ = START_Z; // 부드럽게 따라가는 현재 카메라 Z
    const readProgress = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      progress = Math.min(1, Math.max(0, window.scrollY / max));
    };
    readProgress();
    window.addEventListener("scroll", readProgress, { passive: true });

    if (reduceMotion) {
      camera.position.z = START_Z;
      renderOnce();
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", readProgress);
      };
    }

    renderOnce();

    let raf = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      const dt = clock.getDelta();
      const targetZ = START_Z + (END_Z - START_Z) * progress;
      camZ += (targetZ - camZ) * 0.06; // 스크롤 멈춰도 부드럽게 도착
      camera.position.z = camZ;
      camera.position.x = Math.sin(clock.elapsedTime * 0.15) * 0.6; // 은은한 부유
      camera.lookAt(0, 0, camZ - 10);

      shapes.forEach((s) => {
        s.mesh.rotation.x += s.spin.x * dt;
        s.mesh.rotation.y += s.spin.y * dt;
      });

      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", readProgress);
      geometries.forEach((g) => g.dispose());
      shapes.forEach((s) => {
        (s.mesh.material as THREE.Material).dispose();
        const e = s.mesh.children[0] as THREE.LineSegments;
        e.geometry.dispose();
        (e.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[9]"
    />
  );
}
