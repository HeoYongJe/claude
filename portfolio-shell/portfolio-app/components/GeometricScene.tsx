"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * "웹의 구조가 인터랙션이 된다"를 은유하는 배경.
 * 깊이 층으로 서사를 연속 배치한다(장면 전환 없이 그라데이션):
 *   FAR  : HTML 문법 글리프(< > / { }) + 레이아웃 격자 — 날것의 마크업/레이아웃
 *   MID  : 노드(점) + 관계(선) — 조직화되는 DOM
 *   NEAR : 와이어프레임 컴포넌트 — 형성된 UI/인터랙션
 * 모션: 각자 중심축 느린 자전 + 부유, 스크롤=깊이 패럴랙스, 마우스=스프링 자석.
 * 저채도·저투명으로 타이포가 주인공이 되도록(주목도 5~10%).
 */
export default function GeometricScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 모바일 생략

    const reduceMotion = prefersReducedMotion();
    const DARK = 0x0e0e10;
    const BLUE = 0x3366ff;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(DARK, 18, 60);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 8, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(BLUE, 0.7);
    rim.position.set(-6, -4, 6);
    scene.add(rim);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    // ---------- MID: DOM 노드 + 관계선 ----------
    const NODE_COUNT = 90;
    const nodePositions: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodePositions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 18,
          -6 - Math.random() * 18 // z: -6 ~ -24
        )
      );
    }

    const nodeGeo = track(new THREE.BufferGeometry());
    nodeGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(nodePositions.flatMap((p) => [p.x, p.y, p.z])),
        3
      )
    );
    const nodeMat = track(
      new THREE.PointsMaterial({
        color: 0x9db8ff,
        size: 0.09,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      })
    );
    const nodes = new THREE.Points(nodeGeo, nodeMat);

    // 관계선: 가까운 노드끼리 최대 2개씩 연결
    const edgePts: number[] = [];
    const MAX_D = 5.5;
    for (let i = 0; i < nodePositions.length; i++) {
      const dists = [];
      for (let j = 0; j < nodePositions.length; j++) {
        if (i === j) continue;
        const d = nodePositions[i].distanceTo(nodePositions[j]);
        if (d < MAX_D) dists.push({ j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      dists.slice(0, 2).forEach(({ j }) => {
        const a = nodePositions[i];
        const b = nodePositions[j];
        edgePts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      });
    }
    const edgeGeo = track(new THREE.BufferGeometry());
    edgeGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(edgePts), 3)
    );
    const edgeMat = track(
      new THREE.LineBasicMaterial({
        color: BLUE,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      })
    );
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);

    const midGroup = new THREE.Group();
    midGroup.add(nodes, edges);
    scene.add(midGroup);

    // ---------- NEAR: 와이어프레임 컴포넌트 ----------
    const compGeos = [
      track(new THREE.IcosahedronGeometry(1.5, 0)),
      track(new THREE.BoxGeometry(2, 2, 2)),
      track(new THREE.OctahedronGeometry(1.7, 0)),
      track(new THREE.DodecahedronGeometry(1.6, 0)),
      track(new THREE.IcosahedronGeometry(1.3, 0)),
    ];
    const components: { group: THREE.Group; drift: THREE.Vector3; phase: number }[] =
      [];
    const compSlots = [
      new THREE.Vector3(-9, 3.5, 2),
      new THREE.Vector3(9.5, -3, 0),
      new THREE.Vector3(-8, -5, -3),
      new THREE.Vector3(10, 4.5, -4),
      new THREE.Vector3(0, 6.5, -5),
    ];
    compGeos.forEach((geo, i) => {
      const fill = track(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.05,
          roughness: 0.2,
          metalness: 0.2,
        })
      );
      const mesh = new THREE.Mesh(geo, fill);
      const eGeo = track(new THREE.EdgesGeometry(geo));
      const eMat = track(
        new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.4 })
      );
      mesh.add(new THREE.LineSegments(eGeo, eMat));

      const g = new THREE.Group();
      g.position.copy(compSlots[i]);
      g.scale.setScalar(0.85 + Math.random() * 0.4);
      g.add(mesh);
      scene.add(g);
      components.push({
        group: g,
        drift: new THREE.Vector3(
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.03
        ),
        phase: Math.random() * Math.PI * 2,
      });
    });

    // ---------- FAR: 레이아웃 격자 ----------
    const grid = new THREE.GridHelper(60, 24, BLUE, BLUE);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -34;
    const gm = grid.material as THREE.Material;
    gm.transparent = true;
    gm.opacity = 0.05;
    track(gm);
    track(grid.geometry);
    scene.add(grid);

    // ---------- FAR: HTML 문법 글리프 ----------
    const makeGlyph = (ch: string) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = "#9db8ff";
      g.font = "700 84px ui-monospace, Menlo, monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ch, 64, 70);
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      return track(tex);
    };
    const glyphChars = ["<", ">", "/", "{", "}", "[", "]", ";", "<", "/"];
    const glyphs: { sprite: THREE.Sprite; phase: number; baseY: number }[] = [];
    glyphChars.forEach((ch) => {
      const tex = makeGlyph(ch);
      const mat = track(
        new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        })
      );
      const sp = new THREE.Sprite(mat);
      const y = (Math.random() - 0.5) * 16;
      sp.position.set(
        (Math.random() - 0.5) * 34,
        y,
        -24 - Math.random() * 12 // z: -24 ~ -36 (가장 깊은 층)
      );
      sp.scale.setScalar(1.6 + Math.random() * 1.2);
      scene.add(sp);
      glyphs.push({ sprite: sp, phase: Math.random() * Math.PI * 2, baseY: y });
    });

    // ---------- 리사이즈 ----------
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

    // ---------- 입력: 스크롤(깊이 패럴랙스) + 마우스(스프링 자석) ----------
    let scrollProgress = 0;
    const readScroll = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollProgress = Math.min(1, Math.max(0, window.scrollY / max));
    };
    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });

    let targetMX = 0;
    let targetMY = 0;
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
    let mx = 0;
    let my = 0;
    let camZ = 18;
    const clock = new THREE.Clock();

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // 마우스 스프링(부드러운 자석)
      mx += (targetMX - mx) * 0.045;
      my += (targetMY - my) * 0.045;

      // 카메라: 스크롤=깊이(전진), 마우스=미세 오프셋. 오브젝트를 끌지 않고 시점만 움직인다.
      camZ += (18 - scrollProgress * 10 - camZ) * 0.05;
      camera.position.x += (mx * 2.2 - camera.position.x) * 0.05;
      camera.position.y += (-my * 1.4 - camera.position.y) * 0.05;
      camera.position.z = camZ;
      camera.lookAt(0, 0, -6);

      // 컴포넌트: 각자 중심축 아주 느린 자전 + 부유
      components.forEach((c) => {
        c.group.rotation.x += c.drift.x;
        c.group.rotation.y += c.drift.y;
        c.group.position.y += Math.sin(t * 0.35 + c.phase) * 0.0015;
      });

      // 노드망: 전체가 아주 느리게 드리프트
      midGroup.rotation.y = Math.sin(t * 0.05) * 0.05;
      midGroup.rotation.x = Math.cos(t * 0.04) * 0.03;

      // 글리프: 제자리에서 은은히 부유
      glyphs.forEach((g) => {
        g.sprite.position.y = g.baseY + Math.sin(t * 0.3 + g.phase) * 0.4;
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
