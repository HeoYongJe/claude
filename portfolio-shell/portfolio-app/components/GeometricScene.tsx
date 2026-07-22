"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

// 다크 섹션(히어로/컨택트) 안에 절대배치되는 유리 느낌의 기하학 배경.
// 겹치지 않도록 격자 셀마다 하나씩 배치하고, 스크롤에 반응해 회전한다.
export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 모바일 생략

    const reduceMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 16;

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
    const rim = new THREE.DirectionalLight(0x3366ff, 0.6);
    rim.position.set(-6, -3, 4);
    scene.add(rim);

    const geometries = [
      new THREE.IcosahedronGeometry(1.15, 0),
      new THREE.BoxGeometry(1.7, 1.7, 1.7),
      new THREE.TetrahedronGeometry(1.5, 0),
      new THREE.OctahedronGeometry(1.35, 0),
      new THREE.DodecahedronGeometry(1.2, 0),
    ];

    const group = new THREE.Group();
    const shapes: { mesh: THREE.Mesh; spin: THREE.Vector3; drift: number }[] = [];

    // 격자 배치(겹침 방지). 셀 간격이 도형 지름보다 충분히 크다.
    const COLS = 4;
    const ROWS = 3;
    const CELL_X = 5.4;
    const CELL_Y = 4.8;
    let idx = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const geo = geometries[idx % geometries.length];
        const fill = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.08,
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

        const scale = 0.85 + Math.random() * 0.4;
        mesh.scale.setScalar(scale);
        mesh.position.set(
          (c - (COLS - 1) / 2) * CELL_X + (Math.random() - 0.5) * 1.1,
          (r - (ROWS - 1) / 2) * CELL_Y + (Math.random() - 0.5) * 1.0,
          (Math.random() - 0.5) * 3
        );
        mesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        group.add(mesh);
        shapes.push({
          mesh,
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 1.2,
            (Math.random() - 0.5) * 1.2,
            (Math.random() - 0.5) * 1.2
          ),
          drift: 0.04 + Math.random() * 0.05,
        });
        idx++;
      }
    }
    scene.add(group);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height || 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const renderOnce = () => renderer.render(scene, camera);

    if (reduceMotion) {
      renderOnce();
      return () => ro.disconnect();
    }

    let scrollY = window.scrollY;
    let lastScrollY = scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    renderOnce(); // rAF 지연 환경에서도 최소 1프레임은 그려두기

    let raf = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      const dt = clock.getDelta();
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      shapes.forEach((s) => {
        // 은은한 idle 회전 + 스크롤량에 반응하는 추가 회전
        s.mesh.rotation.x += s.drift * dt + delta * s.spin.x * 0.003;
        s.mesh.rotation.y += s.drift * dt + delta * s.spin.y * 0.003;
        s.mesh.rotation.z += delta * s.spin.z * 0.003;
      });
      group.rotation.y += delta * 0.0004;

      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
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
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
