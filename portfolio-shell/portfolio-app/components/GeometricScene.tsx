"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * "Invisible Architecture of the Web" — 절제된 추상 배경.
 * 서로 다른 깊이 층에 놓인 소수(4개)의 와이어프레임 오브젝트. 직역(태그/DOM/격자)
 * 없이, 웹 컴포넌트가 공간에 조용히 존재하는 느낌만 준다. 깊이는 글로우가 아니라
 * 거리·안개·투명도로. 모션은 거의 감지되지 않을 만큼 느리며, 가끔 오브젝트 내부
 * 구조(연결선·노드)가 아주 옅게 나타났다 사라진다. 타이포가 언제나 주인공.
 */
export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const reduceMotion = prefersReducedMotion();
    const BG = 0x090909;
    const BLUE = 0x3b60ff;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 14, 46);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const soft = new THREE.DirectionalLight(0xffffff, 0.4);
    soft.position.set(3, 5, 8);
    scene.add(soft);

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    const uniqueVerts = (geo: THREE.BufferGeometry) => {
      const pos = geo.getAttribute("position");
      const seen = new Set<string>();
      const out: THREE.Vector3[] = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const k = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(new THREE.Vector3(x, y, z));
        }
      }
      return out;
    };

    // 깊이 층: 앞은 또렷, 뒤로 갈수록 옅게(거리/안개로 깊이 표현). 중앙은 비운다.
    const specs = [
      { geo: new THREE.IcosahedronGeometry(1.7, 0), pos: [-11, 3.5, 1], edge: 0.22, rot: 0.010 },
      { geo: new THREE.DodecahedronGeometry(1.6, 0), pos: [12, -4, -7], edge: 0.15, rot: 0.008 },
      { geo: new THREE.OctahedronGeometry(1.9, 0), pos: [10.5, 6, -12], edge: 0.1, rot: 0.007 },
      { geo: new THREE.IcosahedronGeometry(2.1, 0), pos: [-9.5, -6, -18], edge: 0.07, rot: 0.006 },
    ];

    type Obj = {
      group: THREE.Group;
      rot: number;
      floatPhase: number;
      revealPhase: number;
      internalLineMat: THREE.LineBasicMaterial;
      internalPtMat: THREE.PointsMaterial;
    };
    const objects: Obj[] = [];

    specs.forEach((s) => {
      const geo = keep(s.geo);

      // 겉 와이어프레임 (저투명 블루, 글로우 없음)
      const fill = keep(
        new THREE.MeshBasicMaterial({ color: BG, transparent: true, opacity: 0.35 })
      );
      const mesh = new THREE.Mesh(geo, fill); // 뒤 오브젝트를 살짝 가려 깊이감
      const edgeGeo = keep(new THREE.EdgesGeometry(geo));
      const edgeMat = keep(
        new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: s.edge })
      );
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // 내부 구조: 꼭짓점→중심 구성선 + 꼭짓점 노드 (평소엔 투명, 가끔 살짝 드러남)
      const verts = uniqueVerts(geo);
      const linePts: number[] = [];
      verts.forEach((v) => linePts.push(0, 0, 0, v.x, v.y, v.z));
      const ilGeo = keep(new THREE.BufferGeometry());
      ilGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePts), 3));
      const ilMat = keep(
        new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthWrite: false })
      );
      const internalLines = new THREE.LineSegments(ilGeo, ilMat);

      const ipGeo = keep(new THREE.BufferGeometry());
      ipGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(verts.flatMap((v) => [v.x, v.y, v.z])), 3)
      );
      const ipMat = keep(
        new THREE.PointsMaterial({
          color: 0xbcd0ff,
          size: 0.07,
          transparent: true,
          opacity: 0,
          sizeAttenuation: true,
          depthWrite: false,
        })
      );
      const internalPts = new THREE.Points(ipGeo, ipMat);

      const g = new THREE.Group();
      g.position.set(s.pos[0], s.pos[1], s.pos[2]);
      g.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      g.add(mesh, internalLines, internalPts);
      scene.add(g);

      objects.push({
        group: g,
        rot: s.rot,
        floatPhase: Math.random() * Math.PI * 2,
        revealPhase: Math.random() * Math.PI * 2,
        internalLineMat: ilMat,
        internalPtMat: ipMat,
      });
    });

    let width = 0, height = 0;
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

    let scrollProgress = 0;
    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollProgress = Math.min(1, Math.max(0, window.scrollY / max));
    };
    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });

    let targetMX = 0, targetMY = 0;
    const onMouse = (e: MouseEvent) => {
      targetMX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    if (reduceMotion) {
      renderOnce();
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", readScroll);
        window.removeEventListener("mousemove", onMouse);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
      };
    }

    renderOnce();

    let raf = 0;
    let mx = 0, my = 0;
    const baseY = objects.map((o) => o.group.position.y);
    const clock = new THREE.Clock();

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // 마우스 스프링(아주 부드럽고 미세하게)
      mx += (targetMX - mx) * 0.035;
      my += (targetMY - my) * 0.035;
      camera.position.x += (mx * 1.1 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.7 - camera.position.y) * 0.04;
      // 스크롤 = 깊이 패럴랙스(시점만 아주 조금 전진)
      const targetZ = 18 - scrollProgress * 5;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, -4);

      objects.forEach((o, i) => {
        // 거의 감지되지 않는 자전 + 2~6px 수준의 미세 부유
        o.group.rotation.y += o.rot * dt;
        o.group.rotation.x += o.rot * 0.4 * dt;
        o.group.position.y = baseY[i] + Math.sin(t * 0.25 + o.floatPhase) * 0.06;

        // 내부 구조: 대부분 0, 가끔 아주 옅게 떠올랐다 사라짐(글리치/효과 아님)
        const pulse = Math.pow(Math.max(0, Math.sin(t * 0.06 + o.revealPhase)), 8);
        o.internalLineMat.opacity = pulse * 0.14;
        o.internalPtMat.opacity = pulse * 0.35;
      });

      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("mousemove", onMouse);
      disposables.forEach((d) => d.dispose());
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
