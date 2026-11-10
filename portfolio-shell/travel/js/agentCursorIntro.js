/* eslint-disable */
// "에이전트 코드" 스타일 인트로(2026-11-10) — 사용자가 saai.pro 참고 스크린샷으로 요청:
// 페이지가 열리면 여러 색의 가상 커서가 동시에 나타나 히어로의 실제 UI 요소들을 하나씩
// "드래그로 선택"하는 것처럼 보이게(피그마류 협업 커서 + 리사이즈 핸들 + W×H 치수 배지) —
// 마치 여러 AI 에이전트가 동시에 화면을 "짜고" 있는 것 같은 연출. 실제 DOM/콘텐츠는 이미
// 완성된 채로 보이고, 그 위에 장식용 오버레이만 얹는 방식이라 레이아웃 깨짐·깜빡임 위험이
// 없음(진짜 요소를 0→실제 크기로 "만드는" 게 아니라, 이미 그 자리에 있는 실제 요소 치수를
// 그대로 읽어와 그 위에 테두리·핸들·배지만 애니메이션으로 그림).
(function () {
  "use strict";
  const hero = document.querySelector(".t-hero");
  if (!hero) return;
  if (window.innerWidth < 901) return; // 데스크톱 전용 장식(다른 장식 요소들과 같은 기준)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // 에이전트(색상)별로 맡는 실제 요소들 — 전부 히어로에 실존하는 셀렉터.
  const AGENTS = [
    { color: "#3B82F6", selectors: [".nav__brand", ".hero__title", ".hero__desc"] },
    { color: "#F43F5E", selectors: [".t-cta--nav", ".t-hero-badge", ".t-cta--hero"] },
    { color: "#10B981", selectors: [".t-fxcard", ".fxcard__amt--send"] },
  ];

  const overlay = document.createElement("div");
  overlay.id = "agent-cursor-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  function makeCursor(color) {
    const el = document.createElement("div");
    el.className = "ac-cursor";
    el.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M3 2 L3 19 L7.2 15.2 L10.2 22 L13 20.7 L10 13.8 L16.5 13.8 Z" fill="' +
      color + '" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
    overlay.appendChild(el);
    return el;
  }
  function makeBox(color) {
    const el = document.createElement("div");
    el.className = "ac-box";
    el.style.borderColor = color;
    overlay.appendChild(el);
    const handles = [];
    for (let i = 0; i < 4; i++) {
      const h = document.createElement("div");
      h.className = "ac-handle";
      h.style.borderColor = color;
      overlay.appendChild(h);
      handles.push(h);
    }
    const badge = document.createElement("div");
    badge.className = "ac-badge";
    badge.style.background = color;
    overlay.appendChild(badge);
    return { el, handles, badge };
  }

  function placeHandles(handles, x, y, w, h) {
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    handles.forEach((hd, i) => {
      hd.style.left = pts[i][0] + "px";
      hd.style.top = pts[i][1] + "px";
    });
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function runStep(cursor, box, target) {
    const r = target.getBoundingClientRect();
    if (!r.width || !r.height) return; // 숨겨진/렌더 전 요소는 건너뜀

    // 1) 커서가 타깃 좌상단으로 이동
    cursor.style.opacity = "1";
    cursor.style.left = r.left + "px";
    cursor.style.top = r.top + "px";
    await wait(520);

    // 2) 선택 박스가 그 지점에서 실제 크기로 "드래그 확장"
    box.el.style.left = r.left + "px";
    box.el.style.top = r.top + "px";
    box.el.style.width = "0px";
    box.el.style.height = "0px";
    box.el.style.opacity = "1";
    void box.el.offsetWidth; // 강제 리플로우 — 0px 상태가 실제로 한 프레임 그려지게
    box.el.style.width = r.width + "px";
    box.el.style.height = r.height + "px";
    // 커서는 성장하는 박스의 우하단 모서리(드래그 핸들 쥔 손)를 따라감
    cursor.style.left = r.left + r.width + "px";
    cursor.style.top = r.top + r.height + "px";
    await wait(520);

    // 3) 리사이즈 핸들 + 치수 배지 표시
    placeHandles(box.handles, r.left, r.top, r.width, r.height);
    box.handles.forEach((hd) => (hd.style.opacity = "1"));
    box.badge.textContent = Math.round(r.width) + " × " + Math.round(r.height);
    box.badge.style.left = r.left + r.width + 8 + "px";
    box.badge.style.top = r.top + r.height + 6 + "px";
    box.badge.style.opacity = "1";
    await wait(850);

    // 4) 다음 요소로 넘어가기 전 정리
    box.el.style.opacity = "0";
    box.handles.forEach((hd) => (hd.style.opacity = "0"));
    box.badge.style.opacity = "0";
    cursor.style.opacity = "0";
    await wait(260);
  }

  async function runAgent(agent, startDelay) {
    await wait(startDelay);
    const cursor = makeCursor(agent.color);
    const box = makeBox(agent.color);
    for (const sel of agent.selectors) {
      const target = document.querySelector(sel);
      if (target) await runStep(cursor, box, target);
    }
    cursor.remove();
    box.el.remove();
    box.handles.forEach((hd) => hd.remove());
    box.badge.remove();
  }

  Promise.all(AGENTS.map((a, i) => runAgent(a, i * 320 + 300))).then(() => {
    overlay.remove();
  });
})();
