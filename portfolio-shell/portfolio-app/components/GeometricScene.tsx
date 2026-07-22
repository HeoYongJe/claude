"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 모바일은 생략(성능)

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 6, 8);
    scene.add(ambient, dir);

    // -------- 기술도면(블루프린트) 느낌의 격자 배경 --------
    const grid = new THREE.GridHelper(46, 46, 0x3366ff, 0x3366ff);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.06;
    grid.rotation.x = Math.PI / 2; // 바닥용 그리드를 카메라를 마주보는 벽으로 세운다
    grid.position.z = -16;
    scene.add(grid);

    // 격자 위 측정점처럼 보이는 작은 십자(+) 마커
    const tickGroup = new THREE.Group();
    const tickMat = new THREE.LineBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.22,
    });
    const TICKS = 10;
    for (let i = 0; i < TICKS; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 26;
      const s = 0.18;
      const pts = new Float32Array([
        x - s, y, -15.9, x + s, y, -15.9,
        x, y - s, -15.9, x, y + s, -15.9,
      ]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      tickGroup.add(new THREE.LineSegments(geo, tickMat));
    }
    scene.add(tickGroup);

    const geometries = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.TetrahedronGeometry(1.2, 0),
      new THREE.OctahedronGeometry(1.1, 0),
    ];

    const group = new THREE.Group();
    const shapes: {
      mesh: THREE.Mesh;
      edges: THREE.LineSegments;
      spin: THREE.Vector3;
    }[] = [];

    const SHAPE_COUNT = 12;
    for (let i = 0; i < SHAPE_COUNT; i++) {
      const geo = geometries[i % geometries.length];
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        roughness: 0.5,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, material);

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x3366ff,
        transparent: true,
        opacity: 0.35,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edges);

      const scale = 0.6 + Math.random() * 1.1;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14 - 4,
        (Math.random() - 0.5) * 10 - 4
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      group.add(mesh);
      shapes.push({
        mesh,
        edges,
        // 각 도형마다 스크롤량에 대한 회전 반응 배율(축마다 다르게 = 기계 부품처럼 제각각 돌아가는 느낌)
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4
        ),
      });
    }
    scene.add(group);

    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let scrollY = window.scrollY;
    let lastScrollY = scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Hero(#top) 구간에는 안 보이다가, About 섹션에 들어설 때부터 서서히 나타난다.
    const updateVisibility = () => {
      const heroHeight = document.getElementById("top")?.offsetHeight ?? window.innerHeight;
      const fadeStart = heroHeight * 0.5;
      const fadeEnd = heroHeight;
      const opacity = clamp01((scrollY - fadeStart) / (fadeEnd - fadeStart));
      canvas.style.opacity = String(opacity);
    };
    function clamp01(v: number) {
      return Math.min(1, Math.max(0, v));
    }

    if (reduceMotion) {
      updateVisibility();
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
      };
    }

    let raf = 0;

    const loop = () => {
      // 스크롤 "이동량"(속도)에만 반응한다 - 가만히 있으면 거의 멈춰있고,
      // 스크롤하는 동안에만 기계 부품처럼 돌아간다.
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      if (Math.abs(delta) > 0.001) {
        shapes.forEach((s) => {
          s.mesh.rotation.x += delta * s.spin.x * 0.004;
          s.mesh.rotation.y += delta * s.spin.y * 0.004;
          s.mesh.rotation.z += delta * s.spin.z * 0.004;
        });
        group.rotation.y += delta * 0.0006;
      }

      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      group.position.y = (scrollY / max) * 6;

      updateVisibility();
      renderer.render(scene, camera);
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
        s.edges.geometry.dispose();
        (s.edges.material as THREE.Material).dispose();
      });
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      tickGroup.children.forEach((c) => {
        const line = c as THREE.LineSegments;
        line.geometry.dispose();
      });
      tickMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[9]"
      style={{ opacity: 0 }}
    />
  );
}
