"use client";

import { useEffect, useRef } from "react";

// 배경색 체인. 뷰포트 기준선이 각 섹션의 "중심"을 지날 때 그 색이 되고,
// 인접한 두 중심 사이에서는 연속적으로 보간된다(뚝 끊기지 않고 물 흐르듯).
// 매 스크롤마다 위치를 실측하므로(캐싱 X) Works의 pin·반응형 리레이아웃에도
// 안전하고, 스크롤 값의 순수 함수라 위로 되돌아와도 색이 고착되지 않는다.
const CHAIN = [
  { id: "top", color: "#0e0e10" },
  { id: "intro", color: "#ffffff" },
  { id: "works", color: "#ffffff" },
  { id: "contact", color: "#0e0e10" },
];

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export default function BackgroundScrub() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const sections = CHAIN.map((c) => ({
      ...c,
      el: document.getElementById(c.id),
    })).filter((c): c is (typeof CHAIN)[number] & { el: HTMLElement } =>
      Boolean(c.el)
    );
    if (sections.length === 0) return;

    // 배경은 이 레이어가 전담하므로 각 섹션 자체 배경은 투명 처리한다.
    sections.forEach((s) => {
      s.el.style.backgroundColor = "transparent";
    });

    let raf = 0;
    let pending = false;

    const update = () => {
      pending = false;
      const ref = window.scrollY + window.innerHeight * 0.5;

      // 각 섹션의 중심을 실측(캐싱 X)
      const stops = sections.map((s) => {
        const r = s.el.getBoundingClientRect();
        return { center: r.top + window.scrollY + r.height * 0.5, color: s.color };
      });

      let color = stops[stops.length - 1].color;
      if (ref <= stops[0].center) {
        color = stops[0].color;
      } else {
        for (let i = 0; i < stops.length - 1; i++) {
          if (ref >= stops[i].center && ref < stops[i + 1].center) {
            const span = stops[i + 1].center - stops[i].center;
            const t = span > 0 ? (ref - stops[i].center) / span : 1;
            color = lerpColor(stops[i].color, stops[i + 1].color, t);
            break;
          }
        }
      }
      layer.style.backgroundColor = color;
    };

    const onScroll = () => {
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      sections.forEach((s) => {
        s.el.style.backgroundColor = "";
      });
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10"
      style={{ backgroundColor: CHAIN[0].color }}
    />
  );
}
