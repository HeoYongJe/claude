"use client";

import { useEffect } from "react";

export default function RevealController() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    const wire = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.dataset.wired) return;
        el.dataset.wired = "true";
        if (reduceMotion) {
          el.classList.add("is-revealed");
        } else {
          observer.observe(el);
        }
      });
    };

    wire();
    const raf = requestAnimationFrame(wire);
    const timers = [150, 400, 900].map((delay) => window.setTimeout(wire, delay));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      observer.disconnect();
    };
  }, []);

  return null;
}
