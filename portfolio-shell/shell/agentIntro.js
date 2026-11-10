/* eslint-disable */
// "에이전트 코드" 인트로(2026-11-10) — saai.pro 참고. 가뿐(travel)에 먼저 시도했던 버전과
// 핵심이 다름: 거긴 "이미 보이는 요소 위에 리사이즈 박스만" 씌웠지만, 여기(셸 메인) 요청의
// 핵심은 "요소가 숨겨져 있다가, 커서가 박스를 그린 뒤 그 안에서 콘텐츠가 타이핑되듯 순차적으로
// 나타나는" 것 — 즉 박스를 먼저 그리고, 그 다음에 콘텐츠를 만들어내는 순서.
// 여러 색 커서(에이전트)가 동시에 각자 맡은 요소를 하나씩 "짓는" 것처럼 보이게 함:
//  - 텍스트(eyebrow/title/sub): 원본 텍스트(중첩 태그·<br> 포함)를 그대로 보존한 채 한 글자씩
//    타이핑해 다시 채워 넣음(실제 콘텐츠를 지웠다가 복원하는 것이라 접근성 텍스트 손실 없음 —
//    타이핑 끝나면 원본과 100% 동일한 DOM).
//  - 장식용 글래스 카드 7장: 텍스트가 아니라 추상적인 목업이라 타이핑 대신 박스 완성 직후
//    페이드+스케일로 등장.
// 프리로더가 완전히 걷힌 뒤에만 시작(MutationObserver로 감지, 하드코딩된 타이밍에 의존 안 함).
(function () {
  "use strict";
  const hero = document.querySelector(".yj-hero");
  if (!hero) return;
  if (window.innerWidth < 961) return; // .yj-hero-visual 자체가 이 폭 밑에서 display:none(기존 CSS 기준)과 통일
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function afterPreloader(cb) {
    const preloader = document.getElementById("yj-preloader");
    if (!preloader) { cb(); return; }
    const mo = new MutationObserver(() => {
      if (!document.getElementById("yj-preloader")) { mo.disconnect(); cb(); }
    });
    mo.observe(document.body, { childList: true });
    setTimeout(() => { mo.disconnect(); cb(); }, 6000); // 안전장치
  }

  // ---- 오버레이(커서/박스/핸들/배지) — travel 버전과 동일한 기법 ----
  const overlay = document.createElement("div");
  overlay.id = "agent-cursor-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  function makeCursor(color) {
    const el = document.createElement("div");
    el.className = "ac-cursor";
    el.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M3 2 L3 19 L7.2 15.2 L10.2 22 L13 20.7 L10 13.8 L16.5 13.8 Z" fill="' +
      color + '" stroke="#070a11" stroke-width="1.2" stroke-linejoin="round"/></svg>';
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
    handles.forEach((hd, i) => { hd.style.left = pts[i][0] + "px"; hd.style.top = pts[i][1] + "px"; });
  }

  // 박스를 target 위치까지 드래그로 그리고, 완성되면 onReady(치수)를 호출 — 이후 정리까지 처리.
  async function drawBox(cursor, box, target) {
    const r = target.getBoundingClientRect();
    if (!r.width || !r.height) return null;

    cursor.style.opacity = "1";
    cursor.style.left = r.left + "px";
    cursor.style.top = r.top + "px";
    await wait(480);

    box.el.style.left = r.left + "px";
    box.el.style.top = r.top + "px";
    box.el.style.width = "0px";
    box.el.style.height = "0px";
    box.el.style.opacity = "1";
    void box.el.offsetWidth;
    box.el.style.width = r.width + "px";
    box.el.style.height = r.height + "px";
    cursor.style.left = r.left + r.width + "px";
    cursor.style.top = r.top + r.height + "px";
    await wait(480);

    placeHandles(box.handles, r.left, r.top, r.width, r.height);
    box.handles.forEach((hd) => (hd.style.opacity = "1"));
    box.badge.textContent = Math.round(r.width) + " × " + Math.round(r.height);
    box.badge.style.left = r.left + r.width + 8 + "px";
    box.badge.style.top = r.top + r.height + 6 + "px";
    box.badge.style.opacity = "1";
    return r;
  }

  function clearBox(cursor, box) {
    box.el.style.opacity = "0";
    box.handles.forEach((hd) => (hd.style.opacity = "0"));
    box.badge.style.opacity = "0";
    cursor.style.opacity = "0";
  }

  // ---- 텍스트 요소: 중첩 태그(<em>/<span>)·<br> 구조를 보존한 채 한 글자씩 타이핑 ----
  async function typeInto(sourceNode, mountParent, speed) {
    for (const node of Array.from(sourceNode.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = document.createTextNode("");
        mountParent.appendChild(textNode);
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          textNode.textContent += text[i];
          await wait(speed);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "BR") {
          mountParent.appendChild(document.createElement("br"));
        } else {
          const clone = node.cloneNode(false);
          mountParent.appendChild(clone);
          await typeInto(node, clone, speed);
        }
      }
    }
  }

  async function typewriterStep(cursor, box, el, speed) {
    const original = document.createDocumentFragment();
    Array.from(el.childNodes).forEach((n) => original.appendChild(n.cloneNode(true)));
    const rect = await drawBox(cursor, box, el); // 원본 텍스트가 아직 그대로 있어 치수가 정확함
    if (!rect) return;
    el.style.opacity = "1";
    el.innerHTML = "";
    await typeInto(original, el, speed);
    await wait(500);
    clearBox(cursor, box);
    await wait(240);
  }

  // ---- 장식용 카드: 박스 완성 후 페이드+스케일로 등장 ----
  async function revealStep(cursor, box, el) {
    const rect = await drawBox(cursor, box, el);
    if (!rect) return;
    el.style.transition = "opacity .4s cubic-bezier(.2,.7,.2,1), transform .4s cubic-bezier(.2,.7,.2,1)";
    el.style.opacity = "1";
    el.style.transform = "scale(1)";
    await wait(650);
    clearBox(cursor, box);
    await wait(240);
  }

  async function runAgent(color, steps, startDelay) {
    await wait(startDelay);
    const cursor = makeCursor(color);
    const box = makeBox(color);
    for (const step of steps) {
      if (step.type === "type") await typewriterStep(cursor, box, step.el, step.speed || 24);
      else await revealStep(cursor, box, step.el);
    }
    cursor.remove();
    box.el.remove();
    box.handles.forEach((hd) => hd.remove());
    box.badge.remove();
  }

  afterPreloader(() => {
    const eyebrow = document.querySelector(".yj-hero__eyebrow-text");
    const title = document.getElementById("yj-title");
    const sub = document.getElementById("yj-sub");
    const cards = Array.from(document.querySelectorAll(".yj-glass"));
    if (!title || !sub) return;

    const textTargets = [eyebrow, title, sub].filter(Boolean);
    const groupB = cards.slice(0, Math.ceil(cards.length / 2));
    const groupC = cards.slice(Math.ceil(cards.length / 2));

    // 시작 전 전부 숨김(opacity만 — 레이아웃 공간은 그대로 유지해 요소가 나타날 때
    // 주변이 덜컥 밀리지 않게 함). 카드는 살짝 눌린 채 숨겼다가 등장 시 원래 크기로.
    textTargets.forEach((el) => { el.style.opacity = "0"; });
    cards.forEach((el) => { el.style.opacity = "0"; el.style.transform = "scale(.94)"; });

    const BLUE = "rgb(51,102,255)";
    const BLUE_SOFT = "rgb(120,160,255)";
    const VIOLET = "rgb(167,139,250)"; // 흰 배지 텍스트와 대비가 잘 나오는 세 번째 에이전트 색

    Promise.all([
      runAgent(BLUE, textTargets.map((el) => ({ type: "type", el })), 300),
      runAgent(BLUE_SOFT, groupB.map((el) => ({ type: "reveal", el })), 650),
      runAgent(VIOLET, groupC.map((el) => ({ type: "reveal", el })), 1000),
    ]).then(() => overlay.remove());
  });
})();
