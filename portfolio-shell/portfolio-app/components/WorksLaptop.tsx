"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

const CLOSED_ROT = -Math.PI / 2;
const OPEN_ROT = CLOSED_ROT + THREE.MathUtils.degToRad(100);

export default function WorksLaptop() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const reduceMotion = prefersReducedMotion();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 2.4, 6.4);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(3, 5, 4);
    scene.add(dir);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      roughness: 0.5,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.55,
    });

    const makePanel = (w: number, h: number, d: number) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, bodyMat);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        edgeMat
      );
      mesh.add(edges);
      return mesh;
    };

    // 베이스(키보드 판)
    const BASE_W = 3.4;
    const BASE_D = 2.2;
    const base = makePanel(BASE_W, 0.12, BASE_D);
    base.position.set(0, 0, 0);
    scene.add(base);

    // 힌지(뒷쪽 모서리)에서 회전하는 스크린
    const SCREEN_H = 2.1;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.06, -BASE_D / 2);
    scene.add(hinge);

    const screenGeo = new THREE.BoxGeometry(BASE_W, SCREEN_H, 0.1);
    screenGeo.translate(0, SCREEN_H / 2, 0);
    const screen = new THREE.Mesh(screenGeo, bodyMat);
    const screenEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(screenGeo),
      edgeMat
    );
    screen.add(screenEdges);
    hinge.add(screen);

    hinge.rotation.x = CLOSED_ROT;

    const renderOnce = () => renderer.render(scene, camera);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderOnce();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (reduceMotion) {
      hinge.rotation.x = OPEN_ROT;
      renderOnce();
      return () => ro.disconnect();
    }

    const st = ScrollTrigger.create({
      trigger: wrapper,
      start: "top bottom",
      end: "bottom top",
      scrub: 0.4,
      onUpdate: (self) => {
        hinge.rotation.x = gsap.utils.interpolate(
          CLOSED_ROT,
          OPEN_ROT,
          self.progress
        );
        scene.rotation.y = (self.progress - 0.5) * 0.5;
        renderOnce();
      },
    });

    renderOnce();

    return () => {
      st.kill();
      ro.disconnect();
      bodyMat.dispose();
      edgeMat.dispose();
      base.geometry.dispose();
      screenGeo.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative hidden tab:block tab:h-[220vh]"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none sticky top-0 h-screen w-full"
      />
    </div>
  );
}
