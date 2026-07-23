"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// 히어로 전용 구조(블루프린트) 배경. 얇은 그리드 + 소수의 노드/연결선.
// 장식이 아니라 "콘텐츠를 받치는 보이지 않는 시스템". 모션은 거의 감지되지 않게:
// 미세한 마우스 패럴랙스 + 스크롤 시 그리드가 아주 살짝 변형될 뿐.
export default function HeroGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const netRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let targetMX = 0;
    let targetMY = 0;
    let mx = 0;
    let my = 0;
    let scrollP = 0;

    const onMouse = (e: MouseEvent) => {
      targetMX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const h = window.innerHeight || 1;
      scrollP = Math.min(1, Math.max(0, window.scrollY / h));
    };
    onScroll();
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    const loop = () => {
      mx += (targetMX - mx) * 0.04;
      my += (targetMY - my) * 0.04;

      if (gridRef.current) {
        // 그리드: 아주 작은 패럴랙스 + 스크롤 시 미세한 하강/확대(살짝 변형)
        gridRef.current.style.transform = `translate3d(${mx * 6}px, ${
          my * 6 + scrollP * 18
        }px, 0) scale(${1 + scrollP * 0.03})`;
      }
      if (netRef.current) {
        // 노드망: 그리드보다 조금 더 움직여 얕은 깊이감
        netRef.current.style.transform = `translate3d(${mx * 14}px, ${
          my * 14
        }px, 0)`;
        netRef.current.style.opacity = String(Math.max(0, 1 - scrollP * 1.1));
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* 얇은 그리드 (중앙은 마스크로 비워 타이포를 방해하지 않음) */}
      <div
        ref={gridRef}
        className="absolute inset-[-10%] will-change-transform"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)," +
            "linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "76px 76px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 46%, transparent 0%, rgba(0,0,0,0.55) 55%, #000 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 46%, transparent 0%, rgba(0,0,0,0.55) 55%, #000 80%)",
        }}
      />

      {/* 노드 + 연결선 (측면에 소수 배치, 중앙 비움) */}
      <svg
        ref={netRef}
        className="absolute inset-0 h-full w-full will-change-transform"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g
          stroke="rgba(59,96,255,0.18)"
          strokeWidth="1"
          className="yj-hero-net"
        >
          {/* 좌측 클러스터 */}
          <line x1="150" y1="230" x2="300" y2="330" />
          <line x1="300" y1="330" x2="210" y2="470" />
          <line x1="150" y1="230" x2="210" y2="470" />
          {/* 우측 클러스터 */}
          <line x1="1290" y1="200" x2="1160" y2="310" />
          <line x1="1160" y1="310" x2="1250" y2="470" />
          <line x1="1290" y1="200" x2="1250" y2="470" />
          {/* 느슨한 원거리 연결 */}
          <line x1="300" y1="330" x2="1160" y2="310" stroke="rgba(59,96,255,0.06)" />
        </g>

        <g fill="rgba(59,96,255,0.7)">
          {[
            [150, 230],
            [300, 330],
            [210, 470],
            [1290, 200],
            [1160, 310],
            [1250, 470],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="8"
                fill="none"
                stroke="rgba(59,96,255,0.2)"
                strokeWidth="1"
              />
              <circle
                className="yj-hero-node"
                style={{ animationDelay: `${(i % 6) * -1.7}s` }}
                cx={x}
                cy={y}
                r="2.6"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
