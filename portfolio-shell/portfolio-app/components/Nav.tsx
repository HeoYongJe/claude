"use client";

import { useEffect, useState } from "react";
import { nav, profile } from "@/content/site";

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = nav
      .map((item) => document.querySelector(item.href))
      .filter((el): el is Element => Boolean(el));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[110] transition-[background-color,padding,border-color] duration-[350ms] ${
        solid
          ? "bg-[rgba(14,14,16,0.72)] backdrop-blur-[14px] border-b border-white/[0.08] py-[14px]"
          : "bg-transparent border-b border-transparent py-[22px]"
      }`}
    >
      <div className="section-shell flex items-center justify-between">
        <a
          href="#top"
          className="flex items-center gap-2 font-display font-extrabold text-white"
        >
          <span
            className="inline-block h-2 w-2 rounded-[2px] bg-primary"
            aria-hidden="true"
          />
          {profile.logoFull}
        </a>
        <nav aria-label="주요 섹션" className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`font-mono text-sm transition-colors ${
                active === item.href
                  ? "text-primary"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="rounded-pill bg-primary text-white text-sm font-semibold px-5 py-2.5 hover:bg-white hover:text-primary transition-colors"
        >
          Contact
        </a>
      </div>
    </header>
  );
}
