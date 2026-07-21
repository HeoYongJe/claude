export default function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200] opacity-[0.035] mix-blend-overlay"
    >
      <svg width="100%" height="100%">
        <filter id="yj-grain-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#yj-grain-noise)" />
      </svg>
    </div>
  );
}
