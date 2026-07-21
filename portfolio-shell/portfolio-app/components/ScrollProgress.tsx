"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: () => document.documentElement.scrollHeight - window.innerHeight,
      onUpdate: (self) => {
        if (fillRef.current) {
          fillRef.current.style.width = `${self.progress * 100}%`;
        }
      },
    });
    return () => {
      st.kill();
      gsap.set(fillRef.current, { clearProps: "all" });
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[120] bg-white/[0.06]"
      aria-hidden="true"
    >
      <div ref={fillRef} className="h-full bg-primary" style={{ width: "0%" }} />
    </div>
  );
}
