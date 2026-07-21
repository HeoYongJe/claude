"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { works } from "@/content/site";
import { prefersReducedMotion } from "@/lib/motion";
import SplitHeading from "./SplitHeading";

type Work = (typeof works.items)[number];

function WorkCardBody({ work }: { work: Work }) {
  return (
    <>
      <div
        data-cursor="VIEW"
        className="relative overflow-hidden rounded-thumb aspect-[16/10]"
      >
        <img
          src={work.image}
          alt={`${work.title} 썸네일`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute left-4 top-4 rounded-pill bg-black/50 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-md">
          {work.category}
        </span>
      </div>
      <div>
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
    </>
  );
}

export default function Works() {
  const stackWrapperRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const wrapper = stackWrapperRef.current;
    const stack = stackRef.current;
    if (!wrapper || !stack) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      const ctx = gsap.context(() => {
        const cards = stack.querySelectorAll<HTMLElement>("[data-work-card]");
        const n = cards.length;
        if (n === 0) return;

        // 초기 상태: 맨 앞 카드만 보이고, 나머지는 그 뒤에 살짝 밀린 채 숨어있다.
        cards.forEach((card, i) => {
          gsap.set(card, {
            opacity: i === 0 ? 1 : 0,
            scale: i === 0 ? 1 : 0.94,
            y: i === 0 ? 0 : 24,
            zIndex: n - i,
          });
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapper,
            start: "top top",
            end: `+=${n * 100}%`,
            scrub: 0.6,
            pin: true,
            pinSpacing: true,
            onUpdate: (self) => {
              const idx = Math.min(n - 1, Math.floor(self.progress * n));
              setActiveIndex(idx);
            },
          },
        });

        // 카드 i가 뒤로 빠지는 것과 카드 i+1이 앞으로 나오는 것을 같은 구간에서 동시에.
        for (let i = 0; i < n - 1; i++) {
          tl.to(
            cards[i],
            { opacity: 0, scale: 0.94, y: -24, ease: "power1.inOut" },
            i
          ).to(
            cards[i + 1],
            { opacity: 1, scale: 1, y: 0, ease: "power1.inOut" },
            i
          );
        }
      }, stack);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="works" className="bg-light">
      <div className="section-shell section-pad tab:pb-0">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              data-reveal
              className="mb-4 font-mono text-sm font-bold text-primary"
            >
              {works.eyebrow}
            </div>
            <SplitHeading
              as="h2"
              text={works.heading}
              className="font-display font-extrabold tracking-[-0.03em] text-[clamp(30px,4.6vw,60px)]"
            />
          </div>
          <p data-reveal className="max-w-sm text-sm text-[rgba(46,47,51,0.7)]">
            {works.description}
          </p>
        </div>

        {/* 모바일: 스택 효과 없이 그냥 순서대로 쌓임 */}
        <div className="mt-16 flex flex-col gap-16 tab:hidden">
          {works.items.map((work) => (
            <div
              key={work.number}
              data-reveal
              className="grid gap-8"
            >
              <WorkCardBody work={work} />
            </div>
          ))}
        </div>
      </div>

      {/* 데스크탑: 카드 스택 - 하나의 pin 안에서 카드가 한 장씩 앞으로 나온다 */}
      <div
        ref={stackWrapperRef}
        className="relative hidden tab:block tab:h-screen tab:mt-16"
      >
        <div
          ref={stackRef}
          className="section-shell relative h-full flex items-center"
        >
          {works.items.map((work) => (
            <div
              key={work.number}
              data-work-card
              className="absolute inset-x-[clamp(20px,5vw,64px)] grid grid-cols-[1.12fr_0.88fr] items-center gap-16"
            >
              <WorkCardBody work={work} />
            </div>
          ))}
        </div>

        <div className="absolute bottom-10 right-[clamp(20px,5vw,64px)] flex items-center gap-2">
          {works.items.map((work, i) => (
            <span
              key={work.number}
              aria-hidden="true"
              className={`h-1.5 rounded-pill transition-all duration-300 ${
                i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
          <span className="sr-only">
            {activeIndex + 1} / {works.items.length}
          </span>
        </div>
      </div>
    </section>
  );
}
