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
// + 완전히 빈 화면에서 시작(index.html 맨 위 인라인 스크립트 + styles.css의
//   `html.yj-intro-pending [data-build]{opacity:0}`로 깜빡임 없이 처리됨) → 히어로 완성 →
//   02 섹션으로 자동 스크롤 → 완성 → 03 → … → 마지막 섹션 완성 → 맨 위로 자동 스크롤.
//   2026-11-11: "새로고침해도 재생 안 됨"이 오히려 이상하다는 피드백 — 매 방문(새로고침 포함)
//   마다 재생(localStorage 제거). 클릭·키로 즉시 건너뛰기 가능(휠은 막기만 함).
// ⚠️ 2026-11-11 재지적 — "순서가 뒤죽박죽(히어로 짓다가 2섹션 갔다가 다시 히어로로)" 원인 발견:
//   script.js의 기존 히어로 패럴랙스(onScroll)가 같은 요소(eyebrow/title/sub/visual)의
//   opacity·transform을 스크롤 위치에 따라 동시에 건드리고 있었음 — 인트로가 자동 스크롤로
//   히어로를 지나가는 바로 그 구간(y < innerHeight*1.2)에서 두 시스템이 같은 속성을 서로 다른
//   값으로 계속 덮어써서 요소가 사라졌다 나타나는 것처럼 보였던 것(실제로 순서가 바뀐 게
//   아니라 이미 완성된 히어로가 패럴랙스 때문에 다시 흔들린 것). script.js에 `yj-intro-pending`
//   동안은 그 패럴랙스를 끄도록 수정해 해결.
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
  if (!document.documentElement.classList.contains("yj-intro-pending")) return; // 방어적 가드(이 클래스는 항상 붙어있어야 정상)

  // ---- 타이밍(2026-11-11: "너무 빠르다" 재지적으로 조금 늘림) ----
  const MOVE_MS = 230;
  const GROW_MS = 230;
  const HOLD_MS = 280;
  const CLEAR_MS = 140;
  const TYPE_MS = 13;
  const SCROLL_MS = 650;
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
  // ⚠️ 2026-11-11 재지적 "첫 덩어리들 타이밍이 어긋난다" — 실측으로 2단계 원인을 확정:
  //  1차: 예전엔 레인마다 `idx % lanes`로 자기 몫을 뽑아 독립적으로(서로 기다리지 않고) 쭉
  //     진행했음 — reveal류(즉시 opacity만 바뀜, ~460ms)는 type류(글자 수만큼 타이핑,
  //     700~1200ms)보다 항상 먼저 끝나버려서, 전혀 다른 다음 섹션/다음 줄 요소가 아직 타이핑
  //     중인 제목보다 먼저 완성되는 게 실측됨(Contact: 타이틀이 19619ms로 가장 늦게 끝나는데
  //     Email 카드는 407ms 먼저 끝남). → 레인을 독립 큐 대신 "웨이브"로 바꿔 Promise.all로
  //     한 웨이브가 전부 끝나야 다음 웨이브로 넘어가게 1차 수정.
  //  2차(더 근본 원인): 웨이브를 그냥 문서 순서 4개씩 끊으면, "제목(해더)"과 "그 아래 첫 번째
  //     줄(스텝/스킬/카드) 중 하나"가 우연히 같은 웨이브에 같이 묶여버림 — Think 섹션 실측:
  //     eyebrow+title+lead(해더, 3개)와 "01. Information"(스텝 줄의 첫 요소, 전혀 다른 그룹)이
  //     한 웨이브에 섞여서, 짧은 "01. Information"만 먼저 끝나고(8921ms) 나머지 해더 텍스트는
  //     한참 더 타이핑 중(9160/9541ms)인 채로 남아 "첫 덩어리가 어긋나 보이는" 현상의 진짜
  //     원인이었음. 해결: 웨이브 경계를 고정 개수(4개)가 아니라 **실제 마크업에서 같은 부모를
  //     공유하는 형제 요소 단위**로 나눔 — index.html을 보면 eyebrow/title/lead는 항상 같은
  //     해더용 `<div>`의 자식이고, 스텝/스킬그룹/카드는 항상 별도 줄 컨테이너(`.yj-steps`/
  //     `.yj-skills`/`.yj-contact-grid`)의 자식이라 이 기준이면 "해더 묶음"과 "줄 묶음"이
  //     구조적으로 절대 섞이지 않는다(한 부모의 자식이 4개 넘으면 그 안에서만 추가로 나눔).
  async function buildGroup(elements) {
    if (!elements.length) return;
    const maxLanes = AGENTS_WIDE;
    let i = 0;
    while (i < elements.length) {
      let j = i + 1;
      while (j < elements.length && elements[j].parentElement === elements[i].parentElement && (j - i) < maxLanes) j++;
      const wave = elements.slice(i, j);
      const cursors = wave.map((_, k) => makeCursor(COLORS[k % COLORS.length]));
      await Promise.all(wave.map((el, k) => buildOne(COLORS[k % COLORS.length], cursors[k], el)));
      cursors.forEach((c) => c.remove());
      i = j;
    }
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
  // ⚠️ html(documentElement)에도 overflow:hidden을 걸면 스크롤 컨테이너 자체가 없어져서 우리
  // 쪽 window.scrollTo까지 같이 막혀버림 — body에만 건다(기존 프리로더와 같은 방식).
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
  let skipped = false;
  function skipIntro() {
    if (skipped) return;
    skipped = true;
    ABORTED = true;
    forceFinishAll();
    overlay.remove();
    window.scrollTo(0, 0);
    unlockScroll();
    document.documentElement.classList.remove("yj-intro-pending");
    window.removeEventListener("click", skipIntro, true);
    window.removeEventListener("keydown", skipIntro, true);
  }

  // ⚠️ 2026-11-11 재지적 "순서가 뒤죽박죽" — 실제 원인: 아래 안전장치 setTimeout(6000ms)이
  // MutationObserver가 정상적으로 먼저 발동해도 취소되지 않고 그대로 남아있어서, 6초 뒤에
  // cb()가 또 한 번 호출됨 — 전체 시퀀스가 통째로 두 번(서로 독립적으로) 동시에 돌면서 둘이
  // 서로 다른 목표로 스크롤을 다투는 바람에 화면이 왔다갔다하는 것처럼 보였던 것. cb()가
  // 정확히 한 번만 불리도록 수정.
  function afterPreloader(cb) {
    const preloader = document.getElementById("yj-preloader");
    if (!preloader) { cb(); return; }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      mo.disconnect();
      clearTimeout(timer);
      cb();
    };
    const mo = new MutationObserver(() => {
      if (!document.getElementById("yj-preloader")) finish();
    });
    mo.observe(document.body, { childList: true });
    const timer = setTimeout(finish, 6000);
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
      document.documentElement.classList.remove("yj-intro-pending");
      window.removeEventListener("click", skipIntro, true);
      window.removeEventListener("keydown", skipIntro, true);
    }
  });
})();
