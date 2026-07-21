// 접근성 기본값(OS의 prefers-reduced-motion)을 그대로 존중하되,
// 확인/테스트용으로 URL 쿼리(?motion=on|off)로 강제 오버라이드할 수 있게 한다.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  const forced = new URLSearchParams(window.location.search).get("motion");
  if (forced === "on") return false;
  if (forced === "off") return true;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
