"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export default function CountUp({
  to,
  suffix = "",
}: {
  to: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const duration = 1400;
          const start = performance.now();

          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            setValue(Math.round(easeOutCubic(p) * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.unobserve(el);
        });
      },
      { threshold: 0.55 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return (
    <span ref={ref} className="yj-count">
      {value}
      <span className="text-primary">{suffix}</span>
    </span>
  );
}
