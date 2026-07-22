"use client";

import { useEffect, useRef, useState } from "react";
import { works } from "@/content/site";

type Item = { label: string; value: number };

// active가 명시되면 그 값을 쓰고(데스크탑 핀 스택), 없으면 스스로 뷰포트
// 진입을 관찰해 채운다(모바일 목록).
export default function ContributionGraph({
  items,
  active,
}: {
  items: Item[];
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (active !== undefined) return;
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            ob.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [active]);

  const filled = active !== undefined ? active : inView;

  return (
    <div ref={ref} className="mt-7 border-t border-border pt-5">
      <div className="mb-4 font-mono text-xs font-bold tracking-[0.15em] text-primary">
        {works.contribTitle.toUpperCase()}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-3">
            <span className="w-[84px] shrink-0 font-mono text-[13px] text-[rgba(46,47,51,0.7)]">
              {it.label}
            </span>
            <span className="relative h-[7px] flex-1 overflow-hidden rounded-pill bg-light-alt">
              <span
                className="absolute inset-y-0 left-0 rounded-pill bg-primary"
                style={{
                  width: filled ? `${it.value}%` : "0%",
                  transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                  transitionDelay: `${i * 0.1}s`,
                }}
              />
            </span>
            <span className="w-[46px] shrink-0 text-right font-mono text-[13px] font-bold tabular-nums text-heading-light">
              {it.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
