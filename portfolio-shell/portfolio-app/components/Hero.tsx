"use client";

import { useEffect, useRef } from "react";
import { hero } from "@/content/site";
import { prefersReducedMotion } from "@/lib/motion";

export default function Hero() {
  const orbRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let ticking = false;

    const apply = () => {
      const y = window.scrollY;

      if (orbRef.current) {
        orbRef.current.style.transform = `translateY(${y * 0.28}px)`;
      }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(-50%, ${y * 0.35}px)`;
      }
      if (h1Ref.current) {
        h1Ref.current.style.transform = `translateY(${y * -0.06}px)`;
      }
      if (eyebrowRef.current) {
        eyebrowRef.current.style.opacity = String(
          Math.max(0, 1 - y / 300)
        );
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
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-dark text-white pt-[100px] pb-[128px]"
    >
      <div
        ref={orbRef}
        aria-hidden="true"
        className="yj-orb-float pointer-events-none absolute -top-40 -right-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(51,102,255,0.55) 0%, rgba(51,102,255,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-160px] left-[-120px] h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div
        ref={ghostRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display font-extrabold text-[clamp(80px,20vw,300px)] leading-none text-white/[0.03]"
      >
        PUBLISHER
      </div>

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
          className="font-display font-extrabold leading-[0.98] tracking-[-0.035em] text-[clamp(46px,8.6vw,124px)]"
        >
          {hero.titleLines.map((line, i) => (
            <span key={i} className="block">
              {line.includes(hero.titleAccentWord) ? (
                <>
                  {line.split(hero.titleAccentWord)[0]}
                  <span className="text-primary">{hero.titleAccentWord}</span>
                  {line.split(hero.titleAccentWord)[1]}
                </>
              ) : (
                line
              )}
            </span>
          ))}
        </h1>

        <div className="mt-16 flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <p
            ref={paraRef}
            className="max-w-md text-[16px] leading-[1.7] text-white/70"
          >
            {hero.paragraph}
          </p>
          <div className="flex gap-10">
            {hero.stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display font-extrabold text-[44px] leading-none">
                  {stat.value}
                </div>
                <div className="mt-2 font-mono text-sm text-white/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
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
