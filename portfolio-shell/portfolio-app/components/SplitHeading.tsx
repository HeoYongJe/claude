type Tag = "h1" | "h2" | "h3" | "span" | "p";

export default function SplitHeading({
  text,
  as: Component = "span",
  className = "",
  delayStep = 0.045,
}: {
  text: string;
  as?: Tag;
  className?: string;
  delayStep?: number;
}) {
  const words = text.split(" ");

  return (
    <Component data-reveal-split className={className}>
      {words.map((word, i) => (
        <span className="split-word-mask" key={i}>
          <span
            className="split-word"
            style={{ transitionDelay: `${i * delayStep}s` }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Component>
  );
}
