import { contact, profile } from "@/content/site";

export default function Contact() {
  return (
    <section
      id="contact"
      className="section-pad relative overflow-hidden bg-dark text-center text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-220px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(51,102,255,0.5) 0%, rgba(51,102,255,0) 70%)",
        }}
      />

      <div className="section-shell relative z-[1] flex flex-col items-center">
        <div
          data-reveal
          className="mb-6 font-mono text-sm font-bold text-primary"
        >
          {contact.eyebrow}
        </div>
        <h2
          data-reveal
          className="font-display font-extrabold leading-[1.05] tracking-[-0.03em] text-[clamp(38px,7vw,96px)]"
        >
          {contact.headingLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p data-reveal className="mt-6 max-w-md text-white/70">
          {contact.paragraph}
        </p>

        <a
          href={`mailto:${profile.email}`}
          data-reveal
          className="mt-10 rounded-pill bg-primary px-10 py-5 text-lg font-bold text-white transition-colors hover:bg-white hover:text-primary"
        >
          {contact.ctaLabel}
        </a>

        <ul className="mt-12 flex gap-8">
          {profile.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                className="font-mono text-sm text-white/60 transition-colors hover:text-white"
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/50">
          <p>{profile.nameKo}</p>
          <p className="mt-1">{contact.footerNote}</p>
        </footer>
      </div>
    </section>
  );
}
