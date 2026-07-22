"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

// 전 페이지 고정 배경. 스크롤에 반응해 회전/이동하는 유리 느낌의 기하학 도형.
// 서로 충분히 떨어지도록 최소 간격을 두고 배치한다.
export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 모바일 생략

    const reduceMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3366ff, 0.7);
    rim.position.set(-6, -3, 4);
    scene.add(rim);

    const geometries = [
      new THREE.IcosahedronGeometry(1.3, 0),
      new THREE.BoxGeometry(1.9, 1.9, 1.9),
      new THREE.TetrahedronGeometry(1.7, 0),
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.DodecahedronGeometry(1.4, 0),
    ];

    const group = new THREE.Group();
    const shapes: { mesh: THREE.Mesh; spin: THREE.Vector3; drift: number }[] = [];

    // 최소 간격 확보(rejection sampling)로 넓게 흩뿌린다.
    const COUNT = 9;
    const MIN_DIST = 7;
    const placed: THREE.Vector3[] = [];

    for (let i = 0; i < COUNT; i++) {
      let pos = new THREE.Vector3();
      let tries = 0;
      do {
        pos = new THREE.Vector3(
          (Math.random() - 0.5) * 34,
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 10 - 2
        );
        tries++;
      } while (placed.some((p) => p.distanceTo(pos) < MIN_DIST) && tries < 40);
      placed.push(pos);

      const geo = geometries[i % geometries.length];
      const fill = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.07,
        roughness: 0.15,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, fill);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: 0x3366ff,
          transparent: true,
          opacity: 0.5,
        })
      );
      mesh.add(edges);

      mesh.scale.setScalar(0.8 + Math.random() * 0.5);
      mesh.position.copy(pos);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      group.add(mesh);
      shapes.push({
        mesh,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4
        ),
        drift: 0.03 + Math.random() * 0.04,
      });
    }
    scene.add(group);

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

    let scrollY = window.scrollY;
    let lastScrollY = scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduceMotion) {
      renderOnce();
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
      };
    }

    renderOnce();

    let raf = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      const dt = clock.getDelta();
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      shapes.forEach((s) => {
        // 은은한 idle 회전 + 스크롤량에 크게 반응하는 회전
        s.mesh.rotation.x += s.drift * dt + delta * s.spin.x * 0.005;
        s.mesh.rotation.y += s.drift * dt + delta * s.spin.y * 0.005;
        s.mesh.rotation.z += delta * s.spin.z * 0.005;
      });

      // 스크롤에 따라 전체 그룹이 천천히 흐르며 회전(패럴랙스)
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      const p = scrollY / max;
      group.position.y = p * 10;
      group.rotation.y = p * Math.PI * 0.5;

      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
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
