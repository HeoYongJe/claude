import { marqueeItems } from "@/content/site";

export default function Marquee() {
  const text = marqueeItems.join(" · ") + " · ";

  return (
    <div className="overflow-hidden bg-primary py-4 text-white">
      <span className="sr-only">사용 기술: {marqueeItems.join(", ")}</span>
      <div
        aria-hidden="true"
        className="yj-marquee-track flex w-max whitespace-nowrap font-mono text-sm"
      >
        <span className="pr-2">{text}</span>
        <span className="pr-2">{text}</span>
      </div>
    </div>
  );
}
