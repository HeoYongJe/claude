"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export default function MouseSpotlight() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const spot = spotRef.current;
    if (!wrapper || !spot) return;
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let x = 0;
    let y = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      spot.style.opacity = "1";
    };
    const onLeave = () => {
      spot.style.opacity = "0";
    };

    const tick = () => {
      curX += (x - curX) * 0.1;
      curY += (y - curY) * 0.1;
      spot.style.transform = `translate(${curX}px, ${curY}px)`;
      raf = requestAnimationFrame(tick);
    };

    wrapper.addEventListener("pointermove", onMove);
    wrapper.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      wrapper.removeEventListener("pointermove", onMove);
      wrapper.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        ref={spotRef}
        className="absolute left-0 top-0 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(51,102,255,0.22) 0%, rgba(51,102,255,0.08) 40%, rgba(51,102,255,0) 70%)",
        }}
      />
    </div>
  );
}
