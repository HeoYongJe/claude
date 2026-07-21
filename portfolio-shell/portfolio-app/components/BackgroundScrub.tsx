"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

const CHAIN = [
  { id: "top", color: "#0e0e10" },
  { id: "intro", color: "#ffffff" },
  { id: "skills", color: "#f7f7f8" },
  { id: "works", color: "#ffffff" },
  { id: "contact", color: "#0e0e10" },
];

export default function BackgroundScrub() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const layer = layerRef.current;
    if (!layer) return;

    const sections = CHAIN.map((c) => ({
      ...c,
      el: document.getElementById(c.id),
    })).filter((c): c is (typeof CHAIN)[number] & { el: HTMLElement } =>
      Boolean(c.el)
    );
    if (sections.length < 2) return;

    // 배경은 이제 이 레이어가 전담하므로 각 섹션 자체 배경은 투명 처리한다.
    sections.forEach((s) => {
      s.el.style.backgroundColor = "transparent";
    });

    // 구간별 보간 함수(색1→색2). 위치(y)는 Works의 pin 때문에 레이아웃이 늦게
    // 확정되므로 정적으로 캐싱하지 않고, refresh/스크롤마다 실측한다.
    const interpolators = sections
      .slice(1)
      .map((s, i) => gsap.utils.interpolate(sections[i].color, s.color));

    let stopsY: number[] = [];

    const recomputeStops = () => {
      const scrollY = window.scrollY;
      stopsY = sections.map(
        (s) => s.el.getBoundingClientRect().top + scrollY
      );
    };

    const st = ScrollTrigger.create({
      start: 0,
      end: () => document.documentElement.scrollHeight - window.innerHeight,
      scrub: true,
      onRefresh: recomputeStops,
      onUpdate: (self) => {
        const y = self.scroll();
        let idx = 0;
        for (let i = 1; i < stopsY.length; i++) {
          if (y >= stopsY[i]) idx = i;
        }
        if (idx >= stopsY.length - 1) {
          layer.style.backgroundColor = sections[sections.length - 1].color;
          return;
        }
        const segStart = stopsY[idx];
        const segEnd = stopsY[idx + 1];
        const segT =
          segEnd > segStart
            ? gsap.utils.clamp(0, 1, (y - segStart) / (segEnd - segStart))
            : 1;
        layer.style.backgroundColor = interpolators[idx](segT);
      },
    });

    // Works의 pin-spacer 등 다른 컴포넌트의 레이아웃이 먼저 자리잡은 뒤 계산하도록
    // 한 프레임 늦춰서 refresh한다.
    requestAnimationFrame(() => {
      recomputeStops();
      ScrollTrigger.refresh();
    });

    return () => {
      st.kill();
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
