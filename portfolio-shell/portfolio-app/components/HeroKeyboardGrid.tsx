"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { blueGradient } from "@/lib/theme3d";

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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 10, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(4, 8, 6);
    scene.add(dir);

    // -------- 은은한 별 입자 --------
    const starGeo = new THREE.BufferGeometry();
    const STAR_COUNT = 140;
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 30;
      starPos[i * 3 + 1] = Math.random() * 10 - 1;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x9db8ff,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // -------- 다이아몬드 형태로 배치된 큐브 클러스터 --------
    const SPACING = 1.55;
    const SIZE = 0.92;
    const RADIUS = 3; // 맨해튼 거리 기준 - 다이아몬드 실루엣

    const boxGeo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);

    type Key = { mesh: THREE.Mesh; x: number; z: number; current: number };
    const keys: Key[] = [];
    const group = new THREE.Group();

    for (let row = -RADIUS; row <= RADIUS; row++) {
      for (let col = -RADIUS; col <= RADIUS; col++) {
        if (Math.abs(row) + Math.abs(col) > RADIUS) continue;

        const x = col * SPACING + row * (SPACING / 2);
        const z = row * SPACING * 0.72;

        const t = (row + RADIUS) / (RADIUS * 2);
        const color = blueGradient(t);

        const bodyMat = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.16,
          roughness: 0.4,
        });
        const edgeMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
        });

        const mesh = new THREE.Mesh(boxGeo, bodyMat);
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);
        mesh.position.set(x, 0, z);
        group.add(mesh);

        keys.push({ mesh, x, z, current: 0 });
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

    const LIFT_RADIUS = 2.6;
    const MAX_LIFT = 1.1;

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
          target =
            Math.exp(-(dist * dist) / (LIFT_RADIUS * LIFT_RADIUS)) * MAX_LIFT;
        }
        k.current += (target - k.current) * 0.12;
        k.mesh.position.y = k.current;
      });

      stars.rotation.y += 0.0004;

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
      starGeo.dispose();
      starMat.dispose();
      keys.forEach((k) => {
        (k.mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] max-h-[560px] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(51,102,255,0.16) 0%, rgba(51,102,255,0) 70%)",
        }}
      />
      <canvas ref={canvasRef} className="relative h-full w-full" />
    </div>
  );
}
