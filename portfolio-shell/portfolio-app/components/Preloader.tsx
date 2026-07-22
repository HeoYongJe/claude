"use client";

import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { prefersReducedMotion } from "@/lib/motion";
import { profile } from "@/content/site";

export default function Preloader() {
  const [count, setCount] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [done, setDone] = useState(false);
  const lenis = useLenis();

  // 카운터 + 스크롤 잠금 (마운트 시 1회)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(true);
      return;
    }

    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const DURATION = 1300;
    const start = performance.now();
    const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      setCount(Math.round(easeOutCubic(p) * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => setRevealing(true), 220);
      }
    };
    raf = requestAnimationFrame(tick);

    // 안전장치: rAF가 지연되는 환경(백그라운드 탭 등)에서도 로더가 반드시 걷히게 한다.
    const safety = window.setTimeout(() => setRevealing(true), 4000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
    };
  }, []);

  // Lenis(부드러운 스크롤)는 프리로더 동안 멈춰둔다. 늦게 초기화돼도 반영되도록.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (done) lenis?.start();
    else lenis?.stop();
  }, [lenis, done]);

  const onRevealEnd = () => {
    setDone(true);
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
  };

  // transitionend가 놓쳐도 리빌 시작 후에는 반드시 완료 처리한다.
  useEffect(() => {
    if (!revealing) return;
    const t = window.setTimeout(onRevealEnd, 1000);
    return () => window.clearTimeout(t);
  }, [revealing]);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      onTransitionEnd={revealing ? onRevealEnd : undefined}
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-dark text-white transition-transform duration-[900ms] ${
        revealing ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.76, 0, 0.24, 1)" }}
    >
      <div className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
        <span className="inline-block h-2 w-2 rounded-[2px] bg-primary" />
        {profile.logoFull}
      </div>

      <div className="mt-5 font-display text-[clamp(56px,10vw,120px)] font-extrabold leading-none tabular-nums">
        {count}
        <span className="text-primary">%</span>
      </div>

      <div className="mt-8 h-[2px] w-[min(180px,50vw)] overflow-hidden bg-white/10">
        <div
          className="h-full bg-primary"
          style={{ width: `${count}%` }}
        />
      </div>

      <div className="mt-4 font-mono text-xs tracking-[0.3em] text-white/40">
        LOADING
      </div>
    </div>
  );
}
