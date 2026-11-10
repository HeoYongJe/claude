/* eslint-disable */
// "에이전트 코드" 인트로 — 전체 페이지 버전(2026-11-11).
// 요청 핵심 3가지:
//  1. 모든 섹션·모든 요소에 적용(히어로만이 아니라 Think/Works/Principles/About/Contact까지).
//     → 사이트에 이미 있는 [data-reveal](섹션마다 체계적으로 붙어있던 "리빌 단위" 표시)을
//       그대로 재사용해 [data-build]로 전부 표시해뒀음(index.html) — 손으로 하나씩 고를
//       필요 없이 이미 있는 곳 전부, 빠짐없이 동일한 기준으로 적용됨.
//  2. 더 정확하게: 히어로 글래스 카드 7장은 `.yj-stage`가 3D로 기울어져 있고(rotateX/rotateY)
//     계속 둥실거리는 애니메이션이 돌고 있어, 뷰포트 기준 평면 사각형으로는 절대 정확히 못
//     맞춘다 — 이 카드들만 박스를 같은 3D 부모(.yj-stage) 안에 로컬 좌표로 넣어 똑같이
//     회전하게 하고, 박스 그리는 동안만 둥실거림을 멈춰서(animationPlayState) 정확히 맞춤.
//  3. 더 빠르게: 모든 타이밍을 짧게, 섹션당 병렬 에이전트 수를 늘림.
// + 새 요청: 완전히 빈 화면에서 시작(이미 index.html 맨 위 인라인 스크립트 + styles.css의
//   `html.yj-intro-pending [data-build]{opacity:0}`로 깜빡임 없이 처리됨) → 히어로 완성 →
//   02 섹션으로 자동 스크롤 → 완성 → 03 → … → 마지막 섹션 완성 → 맨 위로 자동 스크롤.
//   최초 방문 1회만(localStorage), 클릭·키·휠 아무거나로 즉시 건너뛰기 가능.
(function () {
  "use strict";
  // ⚠️ 모바일/좁은 화면이나 reduced-motion이면 그냥 return만 하면, styles.css의
  // `html.yj-intro-pending [data-build]{opacity:0}`가 계속 걸린 채로 아무도 풀어주지 않아서
  // 콘텐츠가 영원히 안 보이는 버그가 생김(실측으로 발견) — 이 경우엔 클래스를 직접 지워서
  // 그 CSS 규칙 자체가 더 이상 안 걸리게 하고, 애니메이션 없이 평소처럼 바로 보이게 함.
  if (window.innerWidth < 961 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.remove("yj-intro-pending");
    return;
  }
  if (!document.documentElement.classList.contains("yj-intro-pending")) return; // 재방문

  // ---- 타이밍(전부 "빠르게" 요청으로 짧게) ----
  const MOVE_MS = 170;
  const GROW_MS = 170;
  const HOLD_MS = 200;
  const CLEAR_MS = 110;
  const TYPE_MS = 9;
  const SCROLL_MS = 520;
  const AGENTS_WIDE = 4; // 섹션당 동시 작업 커서 수

  const INLINE_TAGS = new Set(["BR", "EM", "SPAN", "STRONG", "B", "I", "A", "SMALL"]);
  const COLORS = ["rgb(51,102,255)", "rgb(120,160,255)", "rgb(167,139,250)", "rgb(94,210,180)"];

  function wait(ms) {
    return new Promise((r) => {
      if (ABORTED) { r(); return; }
      setTimeout(r, ms);
    });
  }

  // ---- 전역 상태 ----
  let ABORTED = false;
  const REGISTRY = new Map(); // el -> { kind: 'type'|'reveal', originalHTML }

  function classify(el) {
    const hasBlockChild = Array.from(el.children).some((c) => !INLINE_TAGS.has(c.tagName));
    return hasBlockChild ? "reveal" : "type";
  }

  // ---- 오버레이(뷰포트 고정 — 핸들·배지·대부분의 박스) ----
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
  function makeBoxSet(color, parent) {
    const el = document.createElement("div");
    el.className = "ac-box";
    el.style.borderColor = color;
    parent.appendChild(el);
    const handles = [];
    for (let i = 0; i < 4; i++) {
      const h = document.createElement("div");
      h.className = "ac-handle";
      h.style.borderColor = color;
      overlay.appendChild(h); // 핸들은 항상 뷰포트 고정(점 표시라 기울어진 요소에도 그대로 정확)
      handles.push(h);
    }
    const badge = document.createElement("div");
    badge.className = "ac-badge";
    badge.style.background = color;
    overlay.appendChild(badge); // 배지도 항상 뷰포트 고정(3D 안에 두면 글자가 비스듬히 누움)
    return { el, handles, badge };
  }
  function placeHandles(handles, x, y, w, h) {
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    handles.forEach((hd, i) => { hd.style.left = pts[i][0] + "px"; hd.style.top = pts[i][1] + "px"; });
  }
  function removeBoxSet(box) {
    box.el.remove();
    box.handles.forEach((h) => h.remove());
    box.badge.remove();
  }

  function localRectOf(el) {
    const cs = getComputedStyle(el);
    return {
      left: parseFloat(cs.left) || 0,
      top: parseFloat(cs.top) || 0,
      width: parseFloat(cs.width) || 0,
      height: parseFloat(cs.height) || 0,
    };
  }

  // 커서 이동 + 박스를 실제 크기까지 드래그로 확장 — 3D 스테이지 안의 요소(글래스 카드)는
  // 박스 "테두리"만 같은 3D 부모 안에 로컬 좌표로 그려 정확히 겹치게 하고(핸들·배지는
  // 그냥 뷰포트 좌표), 그 외 모든 요소는 통째로 뷰포트 기준.
  async function drawBox(cursor, color, el) {
    const stage = el.closest(".yj-stage");
    if (stage) el.style.animationPlayState = "paused";

    const vRect = el.getBoundingClientRect();
    if (!vRect.width || !vRect.height) { if (stage) el.style.animationPlayState = ""; return null; }
    const boxRect = stage ? localRectOf(el) : vRect;
    if (!boxRect.width || !boxRect.height) { if (stage) el.style.animationPlayState = ""; return null; }

    cursor.style.opacity = "1";
    cursor.style.left = vRect.left + "px";
    cursor.style.top = vRect.top + "px";
    await wait(MOVE_MS);
    if (ABORTED) { if (stage) el.style.animationPlayState = ""; return vRect; }

    const box = makeBoxSet(color, stage || overlay);
    box.el.style.left = boxRect.left + "px";
    box.el.style.top = boxRect.top + "px";
    box.el.style.width = "0px";
    box.el.style.height = "0px";
    box.el.style.opacity = "1";
    void box.el.offsetWidth;
    box.el.style.width = boxRect.width + "px";
    box.el.style.height = boxRect.height + "px";
    cursor.style.left = vRect.left + vRect.width + "px";
    cursor.style.top = vRect.top + vRect.height + "px";
    await wait(GROW_MS);

    placeHandles(box.handles, vRect.left, vRect.top, vRect.width, vRect.height);
    box.handles.forEach((h) => (h.style.opacity = "1"));
    box.badge.textContent = Math.round(vRect.width) + " × " + Math.round(vRect.height);
    box.badge.style.left = vRect.left + vRect.width + 8 + "px";
    box.badge.style.top = vRect.top + vRect.height + 6 + "px";
    box.badge.style.opacity = "1";

    return { vRect, box, stage };
  }

  function clearBox(cursor, drawn) {
    if (!drawn) { cursor.style.opacity = "0"; return; }
    if (drawn.box) {
      drawn.box.el.style.opacity = "0";
      drawn.box.handles.forEach((h) => (h.style.opacity = "0"));
      drawn.box.badge.style.opacity = "0";
      setTimeout(() => removeBoxSet(drawn.box), CLEAR_MS + 40);
    }
    cursor.style.opacity = "0";
  }

  // ---- 타이핑(중첩 태그·<br> 보존) ----
  async function typeInto(sourceNode, mountParent, speed) {
    for (const node of Array.from(sourceNode.childNodes)) {
      if (ABORTED) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = document.createTextNode("");
        mountParent.appendChild(textNode);
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          if (ABORTED) { textNode.textContent = text; return; }
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

  async function buildOne(agentColor, cursor, el) {
    if (ABORTED) return;
    const info = REGISTRY.get(el);
    if (!info) return;
    el.style.transition = "none";
    el.style.transform = "none";

    const drawn = await drawBox(cursor, agentColor, el);
    const stage = el.closest(".yj-stage");

    if (info.kind === "type") {
      const original = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((n) => original.appendChild(n.cloneNode(true)));
      el.style.opacity = "1";
      el.innerHTML = "";
      if (ABORTED) { el.innerHTML = info.originalHTML; }
      else await typeInto(original, el, TYPE_MS);
    } else {
      el.style.transition = "opacity .28s cubic-bezier(.2,.7,.2,1)";
      el.style.opacity = "1";
    }
    if (stage) el.style.animationPlayState = "";

    await wait(HOLD_MS);
    clearBox(cursor, drawn);
    await wait(CLEAR_MS);
  }

  // 한 묶음(섹션)의 요소들을 N개 병렬 커서로 나눠 돌림.
  async function buildGroup(elements) {
    if (!elements.length) return;
    const lanes = Math.min(AGENTS_WIDE, elements.length);
    const workers = [];
    for (let i = 0; i < lanes; i++) {
      const color = COLORS[i % COLORS.length];
      const cursor = makeCursor(color);
      const mine = elements.filter((_, idx) => idx % lanes === i);
      workers.push(
        (async () => {
          for (const el of mine) await buildOne(color, cursor, el);
          cursor.remove();
        })()
      );
    }
    await Promise.all(workers);
  }

  // ---- 섹션 간 자동 스크롤 ----
  function animateScrollTo(targetY, duration) {
    return new Promise((resolve) => {
      if (ABORTED) { window.scrollTo(0, targetY); resolve(); return; }
      const startY = window.scrollY;
      const delta = targetY - startY;
      if (Math.abs(delta) < 2) { resolve(); return; }
      const t0 = performance.now();
      function step(now) {
        if (ABORTED) { resolve(); return; }
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        window.scrollTo(0, startY + delta * eased);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  // ---- 스크롤 잠금(사용자 입력만 차단 — 우리 쪽 window.scrollTo는 그대로 동작) ----
  const BLOCK_KEYS = new Set([" ", "PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp"]);
  function blockKey(e) { if (BLOCK_KEYS.has(e.key)) e.preventDefault(); }
  function blockWheel(e) { e.preventDefault(); }
  function blockTouch(e) { e.preventDefault(); }
  function lockScroll() {
    document.body.classList.add("yj-noscroll");
    window.addEventListener("keydown", blockKey, { capture: true });
    window.addEventListener("wheel", blockWheel, { passive: false });
    window.addEventListener("touchmove", blockTouch, { passive: false });
  }
  function unlockScroll() {
    document.body.classList.remove("yj-noscroll");
    window.removeEventListener("keydown", blockKey, { capture: true });
    window.removeEventListener("wheel", blockWheel, { passive: false });
    window.removeEventListener("touchmove", blockTouch, { passive: false });
  }

  // ---- 건너뛰기: 즉시 전부 완성 상태로 ----
  function forceFinishAll() {
    REGISTRY.forEach((info, el) => {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
      if (info.kind === "type") el.innerHTML = info.originalHTML;
      if (el.closest(".yj-stage")) el.style.animationPlayState = "";
    });
  }
  function markSeen() {
    try { localStorage.setItem("yjIntroSeen", "1"); } catch (e) {}
  }
  let skipped = false;
  function skipIntro() {
    if (skipped) return;
    skipped = true;
    ABORTED = true;
    forceFinishAll();
    overlay.remove();
    window.scrollTo(0, 0);
    unlockScroll();
    markSeen();
    document.documentElement.classList.remove("yj-intro-pending");
    window.removeEventListener("click", skipIntro, true);
    window.removeEventListener("keydown", skipIntro, true);
  }

  function afterPreloader(cb) {
    const preloader = document.getElementById("yj-preloader");
    if (!preloader) { cb(); return; }
    const mo = new MutationObserver(() => {
      if (!document.getElementById("yj-preloader")) { mo.disconnect(); cb(); }
    });
    mo.observe(document.body, { childList: true });
    setTimeout(() => { mo.disconnect(); cb(); }, 6000);
  }

  afterPreloader(async () => {
    if (skipped) return;
    lockScroll();
    window.scrollTo(0, 0);
    window.addEventListener("click", skipIntro, true);
    window.addEventListener("keydown", skipIntro, true);

    // 레지스트리 구성(원본 보존) — 건너뛰기가 언제 눌려도 즉시 복원 가능해야 함.
    const all = Array.from(document.querySelectorAll("[data-build]"));
    all.forEach((el) => {
      const kind = classify(el);
      REGISTRY.set(el, { kind, originalHTML: kind === "type" ? el.innerHTML : null });
    });

    const nav = document.getElementById("yj-nav");
    const hero = document.getElementById("top");
    const laterSections = ["think", "works", "principles", "about", "contact"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const group0 = all.filter((el) => (nav && nav.contains(el)) || (hero && hero.contains(el)));
    const groups = [{ els: group0 }];
    laterSections.forEach((sec) => {
      groups.push({ y: null, sectionEl: sec, els: all.filter((el) => sec.contains(el)) });
    });

    for (const g of groups) {
      if (skipped) break;
      if (g.sectionEl) {
        const targetY = g.sectionEl.getBoundingClientRect().top + window.scrollY;
        await animateScrollTo(targetY, SCROLL_MS);
      }
      if (skipped) break;
      await buildGroup(g.els);
    }

    if (!skipped) {
      await animateScrollTo(0, SCROLL_MS);
      overlay.remove();
      unlockScroll();
      markSeen();
      document.documentElement.classList.remove("yj-intro-pending");
      window.removeEventListener("click", skipIntro, true);
      window.removeEventListener("keydown", skipIntro, true);
    }
  });
})();
