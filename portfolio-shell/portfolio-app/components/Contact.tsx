import { contact, profile } from "@/content/site";
import Magnetic from "./Magnetic";

export default function Contact() {
  return (
    <section
      id="contact"
      className="section-pad relative overflow-hidden bg-dark text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-220px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(51,102,255,0.5) 0%, rgba(51,102,255,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-6vw] top-8 select-none whitespace-nowrap font-display font-extrabold text-[clamp(80px,16vw,220px)] leading-none text-white/[0.03]"
      >
        {profile.logoFull}
      </div>

      <div className="section-shell relative z-[1]">
        <div data-reveal className="mb-6 font-mono text-sm font-bold text-primary">
          {contact.eyebrow}
        </div>

        <div className="grid gap-16 tab:grid-cols-[1.2fr_1fr] tab:items-end">
          <div>
            <h2
              data-reveal-split
              className="font-display font-extrabold leading-[1.02] tracking-[-0.03em]"
            >
              <span className="split-word-mask block">
                <span className="split-word block text-[clamp(24px,3.4vw,44px)] text-white/60">
                  {contact.headingLines[0]}
                </span>
              </span>
              <span className="split-word-mask block">
                <span
                  className="split-word block text-[clamp(40px,7.4vw,104px)]"
                  style={{ transitionDelay: "0.1s" }}
                >
                  {contact.headingLines[1]}
                </span>
              </span>
            </h2>
            <p data-reveal className="mt-8 max-w-md text-white/70">
              {contact.paragraph}
            </p>

            <Magnetic className="mt-10">
              <a
                href={`mailto:${profile.email}`}
                data-reveal
                data-cursor="MAIL"
                className="inline-block rounded-pill bg-primary px-10 py-5 text-lg font-bold text-white transition-colors hover:bg-white hover:text-primary"
              >
                {contact.ctaLabel}
              </a>
            </Magnetic>
          </div>

          <ul className="border-t border-white/10">
            {contact.channels.map((channel, i) => (
              <li
                key={channel.label}
                data-reveal
                style={{ transitionDelay: `${(i % 4) * 0.06}s` }}
                className="group flex items-baseline gap-4 border-b border-white/10 py-4"
              >
                <span className="font-mono text-xs text-white/40">
                  {channel.index}
                </span>
                <a
                  href={channel.href}
                  className="flex flex-1 items-baseline justify-between font-mono text-sm text-white/70 transition-colors group-hover:text-white"
                >
                  <span className="font-display text-base font-extrabold text-white">
                    {channel.label}
                  </span>
                  <span>{channel.value}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-20 flex flex-col gap-2 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{profile.nameKo}</p>
          <p>{contact.footerNote}</p>
        </footer>
      </div>
    </section>
  );
}
