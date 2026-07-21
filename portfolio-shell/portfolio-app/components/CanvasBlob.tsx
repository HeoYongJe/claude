"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Blob = {
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  speed: number;
  phase: number;
  range: number;
};

export default function CanvasBlob() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const blobs: Blob[] = [
      {
        baseX: 0.72,
        baseY: 0.28,
        radius: 0.32,
        color: "rgba(51,102,255,0.5)",
        speed: 0.00012,
        phase: 0,
        range: 60,
      },
      {
        baseX: 0.18,
        baseY: 0.78,
        radius: 0.22,
        color: "rgba(255,255,255,0.05)",
        speed: 0.00009,
        phase: 2,
        range: 50,
      },
      {
        baseX: 0.5,
        baseY: 0.5,
        radius: 0.16,
        color: "rgba(51,102,255,0.18)",
        speed: 0.00016,
        phase: 4,
        range: 40,
      },
    ];

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      blobs.forEach((b) => {
        const dx = reduceMotion ? 0 : Math.cos(t * b.speed + b.phase) * b.range;
        const dy = reduceMotion ? 0 : Math.sin(t * b.speed + b.phase) * b.range;
        const cx = b.baseX * width + dx;
        const cy = b.baseY * height + dy;
        const r = b.radius * Math.max(width, height);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, b.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (reduceMotion) {
      draw(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
