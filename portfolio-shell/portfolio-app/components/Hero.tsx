"use client";

import { useEffect, useRef } from "react";
import { hero } from "@/content/site";
import { prefersReducedMotion } from "@/lib/motion";
import HeroGrid from "./HeroGrid";

export default function Hero() {
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let ticking = false;
    const apply = () => {
      const y = window.scrollY;
      if (h1Ref.current) {
        h1Ref.current.style.transform = `translateY(${y * -0.04}px)`;
      }
      if (eyebrowRef.current) {
        eyebrowRef.current.style.opacity = String(Math.max(0, 1 - y / 300));
      }
      if (paraRef.current) {
        paraRef.current.style.opacity = String(Math.max(0, 1 - y / 420));
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(apply);
        ticking = true;
      }
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden text-white pt-[100px] pb-[128px]"
    >
      <HeroGrid />

      <div className="section-shell relative z-[2] w-full">
        <div
          ref={eyebrowRef}
          className="mb-8 flex items-center gap-3 font-mono text-sm text-white/70"
        >
          <span className="h-[2px] w-[34px] bg-primary" aria-hidden="true" />
          {hero.eyebrow}
        </div>

        <h1
          ref={h1Ref}
          data-reveal-split
          className="font-display font-extrabold leading-[1.02] tracking-[-0.035em] text-[clamp(44px,7.4vw,104px)]"
        >
          {hero.titleLines.map((line, i) => (
            <span className="split-word-mask block" key={i}>
              <span
                className="split-word"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                {line.includes(hero.titleAccentWord) ? (
                  <>
                    {line.split(hero.titleAccentWord)[0]}
                    <span className="text-primary">
                      {hero.titleAccentWord}
                    </span>
                    {line.split(hero.titleAccentWord)[1]}
                  </>
                ) : (
                  line
                )}
              </span>
            </span>
          ))}
        </h1>

        <p
          ref={paraRef}
          data-reveal
          className="mt-10 max-w-xl text-[16px] leading-[1.75] text-white/65"
        >
          {hero.paragraph}
        </p>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/60">
        <span className="font-mono text-xs tracking-[0.2em]">SCROLL</span>
        <span
          aria-hidden="true"
          className="flex h-[34px] w-[22px] items-start justify-center rounded-full border border-white/30 p-1.5"
        >
          <span className="yj-scroll-dot h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      </div>
    </section>
  );
}
