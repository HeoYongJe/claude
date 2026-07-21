"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

// 순서는 실제 DOM 순서와 무관하다 - 각 섹션이 뷰포트 중앙을 지날 때
// 그 섹션의 색으로 전환한다. Works의 pin처럼 레이아웃이 동적으로 바뀌어도
// 절대 위치를 계산/캐싱하지 않으므로(IntersectionObserver 기반) 안전하다.
const CHAIN = [
  { id: "top", color: "#0e0e10" },
  { id: "intro", color: "#ffffff" },
  { id: "works", color: "#ffffff" },
  { id: "contact", color: "#0e0e10" },
];

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

    // 배경은 이제 이 레이어가 전담하므로 각 섹션 자체 배경은 투명 처리한다.
    sections.forEach((s) => {
      s.el.style.backgroundColor = "transparent";
    });

    const reduceMotion = prefersReducedMotion();

    const setColor = (color: string) => {
      if (reduceMotion) {
        layer.style.backgroundColor = color;
      } else {
        gsap.to(layer, {
          backgroundColor: color,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = sections.find((s) => s.el === entry.target);
          if (match) setColor(match.color);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s.el));

    return () => {
      observer.disconnect();
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
