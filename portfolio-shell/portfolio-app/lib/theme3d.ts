import * as THREE from "three";

// 사이트 primary blue(rgb(51,102,255))를 축으로 한 그라데이션.
// 다른 색상(보라/핑크 등)을 새로 끌어오지 않고, 톤 변화만으로 은은한
// 그라데이션을 낸다.
const DEEP = new THREE.Color("#0b1640");
const PRIMARY = new THREE.Color("#3366ff");
const LIGHT = new THREE.Color("#9db8ff");

export function blueGradient(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const c = new THREE.Color();
  if (clamped < 0.5) {
    c.lerpColors(DEEP, PRIMARY, clamped / 0.5);
  } else {
    c.lerpColors(PRIMARY, LIGHT, (clamped - 0.5) / 0.5);
  }
  return c;
}
