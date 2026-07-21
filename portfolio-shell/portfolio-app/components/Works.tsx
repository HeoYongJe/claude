"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { works } from "@/content/site";

export default function Works() {
  const listRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!listRef.current) return;

    const ctx = gsap.context(() => {
      const rows = listRef.current!.querySelectorAll<HTMLElement>(
        "[data-work-row]"
      );
      rows.forEach((row) => {
        const img = row.querySelector<HTMLElement>("[data-parallax-img]");
        if (!img) return;
        gsap.fromTo(
          img,
          { yPercent: -12 },
          {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: row,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    }, listRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section id="works" className="section-pad bg-light">
      <div className="section-shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              data-reveal
              className="mb-4 font-mono text-sm font-bold text-primary"
            >
              {works.eyebrow}
            </div>
            <h2
              data-reveal
              className="font-display font-extrabold tracking-[-0.03em] text-[clamp(30px,4.6vw,60px)]"
            >
              {works.heading}
            </h2>
          </div>
          <p
            data-reveal
            className="max-w-sm text-sm text-[rgba(46,47,51,0.7)]"
          >
            {works.description}
          </p>
        </div>

        <div
          ref={listRef}
          className="yj-works-list mt-20 flex flex-col gap-[clamp(64px,11vh,128px)]"
        >
          {works.items.map((work, i) => {
            const mediaOrder = i % 2 === 1 ? "tab:order-2" : "tab:order-1";
            const bodyOrder = i % 2 === 1 ? "tab:order-1" : "tab:order-2";
            return (
              <div
                key={work.number}
                data-work-row
                data-reveal
                className="yj-work-row grid items-center gap-10 tab:grid-cols-[1.12fr_0.88fr]"
              >
                <div
                  className={`yj-work-media relative overflow-hidden rounded-thumb aspect-[16/10] ${mediaOrder}`}
                  onMouseEnter={() => setCursorActive(true)}
                  onMouseLeave={() => setCursorActive(false)}
                >
                  <img
                    data-parallax-img
                    src={work.image}
                    alt={`${work.title} 썸네일`}
                    className="absolute inset-0 h-full w-full scale-125 object-cover will-change-transform"
                  />
                  <span className="absolute left-4 top-4 rounded-pill bg-black/50 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-md">
                    {work.category}
                  </span>
                </div>

                <div className={`yj-work-body ${bodyOrder}`}>
                  <div className="font-display font-extrabold text-primary text-[clamp(44px,5.2vw,76px)] leading-none">
                    {work.number}
                  </div>
                  <div className="mt-3 font-mono text-sm text-[rgba(46,47,51,0.6)]">
                    {work.year}
                  </div>
                  <h3 className="mt-3 font-display font-extrabold tracking-[-0.02em] text-[clamp(26px,3.2vw,42px)]">
                    {work.title}
                  </h3>
                  <p className="mt-4 max-w-md text-[15px] leading-[1.75] text-[rgba(46,47,51,0.7)]">
                    {work.description}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-pill border border-border bg-light-alt px-3 py-1.5 text-sm font-semibold"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={work.href}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-primary"
                  >
                    View Project <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[130]"
      >
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition-[opacity,transform] duration-200 ${
            cursorActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
        >
          VIEW
        </div>
      </div>
    </section>
  );
}
