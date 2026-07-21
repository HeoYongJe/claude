import { skills } from "@/content/site";
import SplitHeading from "./SplitHeading";

export default function Skills() {
  return (
    <section id="skills" className="section-pad bg-light-alt">
      <div className="section-shell">
        <div
          data-reveal
          className="mb-4 font-mono text-sm font-bold text-primary"
        >
          {skills.eyebrow}
        </div>
        <SplitHeading
          as="h2"
          text={skills.heading}
          className="font-display font-extrabold tracking-[-0.03em] text-[clamp(30px,4.6vw,60px)]"
        />

        <div className="yj-skills-grid mt-14 grid gap-6 tab:grid-cols-3">
          {skills.items.map((item, i) => (
            <div
              key={item.title}
              data-reveal
              style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
              className="group flex min-h-[230px] flex-col justify-between rounded-card border border-border bg-white p-7 transition-colors hover:border-primary"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-extrabold">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs text-[rgba(46,47,51,0.5)]">
                    {item.index}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[rgba(46,47,51,0.7)]">
                  {item.description}
                </p>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2">
                {item.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-pill border border-border bg-light-alt px-3 py-1.5 text-sm font-semibold"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
