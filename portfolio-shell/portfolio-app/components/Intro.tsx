import { intro } from "@/content/site";
import CountUp from "./CountUp";

export default function Intro() {
  return (
    <section id="intro" className="section-pad relative overflow-hidden text-white">
      <div className="section-shell relative">
        <div
          data-reveal
          className="mb-4 font-mono text-sm font-bold text-primary"
        >
          {intro.eyebrow}
        </div>

        <div className="yj-intro-grid grid gap-16 sm:grid-cols-[1.6fr_1fr]">
          <div>
            <h2
              data-reveal-split
              className="font-display font-extrabold tracking-[-0.03em] text-[clamp(30px,4.6vw,60px)] leading-tight"
            >
              {intro.heading.map((line, i) => (
                <span className="split-word-mask block" key={line}>
                  <span
                    className="split-word"
                    style={{ transitionDelay: `${i * 0.08}s` }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h2>
            <div className="mt-8 space-y-5">
              {intro.paragraphs.map((p, i) => (
                <p
                  key={p}
                  data-reveal
                  style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
                  className="max-w-xl text-[16px] leading-[1.75] text-white/65"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {intro.cards.map((card, i) => (
              <div
                key={card.label}
                data-reveal
                style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
                className={`rounded-card p-6 backdrop-blur-sm ${
                  card.accent
                    ? "bg-primary text-white"
                    : "border border-white/10 bg-white/[0.04] text-white/90"
                }`}
              >
                <div
                  className={`font-mono text-xs ${
                    card.accent ? "text-white/70" : "text-white/45"
                  }`}
                >
                  {card.label}
                </div>
                <div className="mt-2 font-bold">{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="yj-stats-grid mt-20 grid grid-cols-2 gap-8 border-t border-white/10 pt-12 sm:grid-cols-4">
          {intro.stats.map((stat, i) => (
            <div
              key={stat.label}
              data-reveal
              style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
            >
              <div className="font-display font-extrabold text-[44px] leading-none">
                <CountUp to={stat.to} suffix={stat.suffix} />
              </div>
              <div className="mt-2 text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
