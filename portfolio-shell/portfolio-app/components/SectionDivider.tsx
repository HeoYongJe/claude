// 다크↔라이트 섹션 경계용 디바이더.
// 회색으로 뭉개지는 전면 모핑 대신, 경계에만 이전 섹션 색이 짧게 페이드되고
// primary blue 글로우 라인을 얹어 "의도된 이음새"처럼 보이게 한다.
export default function SectionDivider({ from }: { from: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[120px]"
    >
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${from}, transparent)` }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-primary/70" />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-primary/40 blur-[3px]" />
    </div>
  );
}
