"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { blueGradient } from "@/lib/theme3d";

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

    // -------- 큐브(모듈/블록) 클러스터 - "웹을 조립한다"는 은유 --------
    const boxGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);

    const group = new THREE.Group();
    const shapes: {
      mesh: THREE.Mesh;
      spin: THREE.Vector3;
      pos: THREE.Vector3;
    }[] = [];

    const SHAPE_COUNT = 11;
    for (let i = 0; i < SHAPE_COUNT; i++) {
      const t = i / (SHAPE_COUNT - 1);
      const color = blueGradient(t);

      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        roughness: 0.5,
        metalness: 0.1,
      });
      const edgeMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
      });

      const mesh = new THREE.Mesh(boxGeo, bodyMat);
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edges);

      const scale = 0.7 + Math.random() * 0.9;
      mesh.scale.setScalar(scale);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14 - 4,
        (Math.random() - 0.5) * 10 - 4
      );
      mesh.position.copy(pos);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      group.add(mesh);
      shapes.push({
        mesh,
        pos,
        // 각 도형마다 스크롤량에 대한 회전 반응 배율(축마다 다르게 = 기계 부품처럼 제각각 돌아가는 느낌)
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4
        ),
      });
    }

    // -------- 큐브들을 잇는 은은한 네트워크 회로선 (가까운 것들끼리만) --------
    const linkMat = new THREE.LineBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.1,
    });
    const linkPoints: number[] = [];
    for (let i = 0; i < shapes.length; i++) {
      let nearest = -1;
      let nearestDist = Infinity;
      for (let j = 0; j < shapes.length; j++) {
        if (i === j) continue;
        const d = shapes[i].pos.distanceTo(shapes[j].pos);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = j;
        }
      }
      if (nearest >= 0) {
        linkPoints.push(
          shapes[i].pos.x, shapes[i].pos.y, shapes[i].pos.z,
          shapes[nearest].pos.x, shapes[nearest].pos.y, shapes[nearest].pos.z
        );
      }
    }
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linkPoints), 3)
    );
    const links = new THREE.LineSegments(linkGeo, linkMat);
    group.add(links);

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
      boxGeo.dispose();
      edgeGeo.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      shapes.forEach((s) => {
        (s.mesh.material as THREE.Material).dispose();
      });
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
