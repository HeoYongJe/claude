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

    // 이제 배경은 이 레이어가 담당하므로 각 섹션 자체 배경은 투명 처리한다.
    sections.forEach((s) => {
      s.el.style.backgroundColor = "transparent";
    });

    const ctx = gsap.context(() => {
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          start: 0,
          end: () => document.documentElement.scrollHeight - window.innerHeight,
          scrub: true,
        },
      });

      // 타임라인 전체 길이를 1로 고정해서 position 값이 실제 스크롤 진행률(0~1)과 일치하게 만든다.
      tl.set({}, {}, 1);
      gsap.set(layer, { backgroundColor: sections[0].color });

      sections.forEach((s, i) => {
        if (i === 0) return;
        const pos = Math.min(0.999, s.el.offsetTop / totalScroll);
        tl.to(
          layer,
          { backgroundColor: s.color, ease: "none", duration: 0.001 },
          pos
        );
      });
    });

    return () => {
      ctx.revert();
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
