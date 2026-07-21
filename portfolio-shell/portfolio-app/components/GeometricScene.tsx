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
      float: number;
      floatSpeed: number;
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
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        ),
        float: Math.random() * Math.PI * 2,
        floatSpeed: 0.2 + Math.random() * 0.3,
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

    let scrollProgress = 0;
    const onScroll = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollProgress = window.scrollY / max;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduceMotion) {
      group.rotation.y = 0.1;
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
        renderer.dispose();
      };
    }

    let raf = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      const t = clock.getElapsedTime();

      shapes.forEach((s) => {
        s.mesh.rotation.x += s.spin.x * 0.01;
        s.mesh.rotation.y += s.spin.y * 0.01;
        s.mesh.position.y +=
          Math.sin(t * s.floatSpeed + s.float) * 0.0025;
      });

      // 스크롤에 따라 전체 그룹이 천천히 회전 + 이동 (스크롤 반응성)
      group.rotation.y = scrollProgress * Math.PI * 0.6;
      group.position.y = scrollProgress * 6;

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
