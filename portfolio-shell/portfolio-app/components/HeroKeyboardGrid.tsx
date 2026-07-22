"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

export default function HeroKeyboardGrid() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const reduceMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 11, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(4, 8, 6);
    scene.add(dir);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.4,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.45,
    });

    const COLS = 12;
    const ROWS = 8;
    const SPACING = 1.05;
    const SIZE = 0.86;

    const boxGeo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);

    type Key = { mesh: THREE.Mesh; x: number; z: number; current: number };
    const keys: Key[] = [];

    for (let r = 0; r < ROWS; r++) {
      const offset = r % 2 === 0 ? 0 : SPACING / 2;
      for (let c = 0; c < COLS; c++) {
        const x = (c - COLS / 2) * SPACING + offset;
        const z = (r - ROWS / 2) * SPACING;

        const mesh = new THREE.Mesh(boxGeo, bodyMat);
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);
        mesh.position.set(x, 0, z);
        scene.add(mesh);

        keys.push({ mesh, x, z, current: 0 });
      }
    }

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
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

    // 마우스 좌표를 y=0 평면 위의 월드 좌표로 변환
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointerNDC = new THREE.Vector2(999, 999);
    const targetPoint = new THREE.Vector3();
    let hasTarget = false;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      hasTarget = true;
    };
    const onPointerLeave = () => {
      hasTarget = false;
    };

    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerleave", onPointerLeave);

    const RADIUS = 3.4;
    const MAX_LIFT = 1.5;

    let raf = 0;
    const loop = () => {
      if (hasTarget) {
        raycaster.setFromCamera(pointerNDC, camera);
        raycaster.ray.intersectPlane(groundPlane, targetPoint);
      }

      keys.forEach((k) => {
        let target = 0;
        if (hasTarget) {
          const dx = k.x - targetPoint.x;
          const dz = k.z - targetPoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          target = Math.exp(-(dist * dist) / (RADIUS * RADIUS)) * MAX_LIFT;
        }
        k.current += (target - k.current) * 0.12;
        k.mesh.position.y = k.current;
      });

      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      boxGeo.dispose();
      edgeGeo.dispose();
      bodyMat.dispose();
      edgeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
