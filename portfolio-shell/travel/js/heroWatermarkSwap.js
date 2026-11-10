/* eslint-disable */
// 히어로 "GAPPUN" 배경 워터마크 — originkit RandomLetterSwap 컴포넌트를 바닐라 JS로 포팅
// (2026-11-10). 마우스를 올리면 글자가 무작위 순서로 세로로 swap, 떼면 역순으로 되돌아감
// (원본 "pingpong" 모드). 텍스트 색상·크기는 기존 .hero__watermark 규칙을 그대로 두고(요청:
// "컬러 사이즈 건들지말고") 글자별 span 구조 + 애니메이션만 새로 추가.
// framer-motion 의존 없이 CSS transition + transitionDelay(글자별 스태거)로 동일한 효과를 냄.
(function () {
  "use strict";
  const el = document.querySelector("[data-letter-swap]");
  if (!el) return;

  const label = el.textContent.trim();
  if (!label) return;
  el.textContent = "";

  const STAGGER_MS = 100; // originkit 기본 staggerDuration(0.1s)
  const DUR_MS = 550;

  const primaries = [];
  const secondaries = [];
  for (const ch of label) {
    const slot = document.createElement("span");
    slot.className = "wm-letter";
    if (ch === " ") {
      slot.classList.add("wm-letter--space");
      slot.textContent = " ";
      el.appendChild(slot);
      continue;
    }
    const primary = document.createElement("span");
    primary.className = "wm-letter-primary";
    primary.textContent = ch;
    const secondary = document.createElement("span");
    secondary.className = "wm-letter-secondary";
    secondary.textContent = ch;
    slot.appendChild(primary);
    slot.appendChild(secondary);
    el.appendChild(slot);
    primaries.push(primary);
    secondaries.push(secondary);
  }
  if (!primaries.length) return;

  // 소스 그대로: Fisher-Yates 대신 sort(() => Math.random()-0.5) 사용(원본과 동일한 셔플 방식).
  function shuffle(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    arr.sort(() => Math.random() - 0.5);
    return arr;
  }

  let blocked = false; // forward(hover-in)만 — 짧은 시간에 여러 번 올려도 겹쳐 재생되지 않도록.

  function runForward() {
    if (blocked) return;
    blocked = true;
    const order = shuffle(primaries.length);
    order.forEach((idx, i) => {
      const delay = i * STAGGER_MS;
      primaries[idx].style.transitionDelay = delay + "ms";
      secondaries[idx].style.transitionDelay = delay + "ms";
      primaries[idx].style.transform = "translateY(-100%)";
      secondaries[idx].style.transform = "translateY(0%)";
    });
    const total = (order.length - 1) * STAGGER_MS + DUR_MS;
    setTimeout(() => { blocked = false; }, total);
  }

  function runReverse() {
    const order = shuffle(primaries.length);
    order.forEach((idx, i) => {
      const delay = i * STAGGER_MS;
      primaries[idx].style.transitionDelay = delay + "ms";
      secondaries[idx].style.transitionDelay = delay + "ms";
      primaries[idx].style.transform = "translateY(0%)";
      secondaries[idx].style.transform = "translateY(100%)";
    });
  }

  el.addEventListener("mouseenter", runForward);
  el.addEventListener("mouseleave", runReverse);
})();
