// ---- 매니페스토 "타이핑" 텍스트 ----
(function () {
  "use strict";
  const wrap = document.querySelector("[data-manifesto-typewriter]");
  if (!wrap) return;
  const textEl = wrap.querySelector(".manifesto__text");
  if (!textEl) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // 2026-11-05: "타이핑이 딱딱 끊기는 것 같다, 조금 더 빠르거나 부드럽게" 피드백 — 55ms 고정 간격에
  // 매 글자를 "통째로 다시 그리기"만 하다 보니 글자가 간격 그대로 툭툭 나타나는 느낌이었음. 간격을
  // 줄여 조금 더 빠르게 하고(55→32ms), 아래 render()에서 가장 최근 글자만 짧은 페이드업 애니메이션을
  // 입혀(.manifesto__char-in, css 참고) 각 글자가 "툭" 나타나는 대신 "스윽" 떠오르듯 보이게 함 —
  // 다음 글자가 32ms 뒤 바로 이어지므로 연속된 애니메이션들이 서로 겹쳐 흐르듯 부드럽게 체감됨.
  const TYPE_DELAY_MS = 32;

  // 원본 DOM(<br>, <em>, <span class="...">)은 최초 1회만 토큰 배열로 파싱해두고, 타이핑 중에는
  // 이 배열만 갖고 innerHTML을 매 글자 다시 그린다 — 실제 텍스트 노드는
  // 건드리지 않으므로 JS가 실패해도 정적 텍스트는 그대로 남는다(폴백).
  // 2026-11-08 63차: "매일, 한 걸음씩"을 배경 분할(아래 css 참고)에 맞춰 흰→volt가 아닌 별도 색으로
  // 칠하기 위해 <span class="manifesto__line2">를 추가 — 기존엔 <em> 하나만 인식하는 boolean(em)
  // 구조였던 걸, 임의의 태그(em·클래스가 있는 span)를 한 번에 하나만 열려있는 태그로 추적하는
  // 일반화된 구조로 교체(동시에 여러 태그가 겹치는 경우는 이 텍스트에 없어서 지원 안 해도 충분).
  const tokens = [];
  textEl.childNodes.forEach((node) => {
    if (node.nodeType === 1 && node.tagName === "BR") {
      tokens.push({ br: true });
      return;
    }
    let tag = null;
    if (node.nodeType === 1) {
      if (node.tagName === "EM") tag = "em";
      else if (node.tagName === "SPAN" && node.className) tag = "span:" + node.className;
    }
    const text = node.textContent || "";
    for (const ch of text) tokens.push({ ch, tag });
  });
  if (!tokens.length) return;

  function escape(ch) {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    return ch;
  }
  function openTagHtml(tag) {
    return tag.startsWith("span:") ? '<span class="' + tag.slice(5) + '">' : "<em>";
  }
  function closeTagHtml(tag) {
    return tag.startsWith("span:") ? "</span>" : "</em>";
  }

  function render(count, done) {
    let html = "";
    let open = null;
    for (let i = 0; i < count; i++) {
      const t = tokens[i];
      if (t.br) {
        if (open) { html += closeTagHtml(open); open = null; }
        html += "<br>";
        continue;
      }
      if (t.tag !== open) {
        if (open) html += closeTagHtml(open);
        if (t.tag) html += openTagHtml(t.tag);
        open = t.tag;
      }
      // 가장 마지막(이번 틱에 막 나타난) 글자만 페이드업 애니메이션 span으로 감싼다 — 다음 틱엔
      // 이 글자도 평범한 텍스트로 재렌더링되므로(아래서 통째로 다시 그림) 애니메이션이 중복 재생되지 않음.
      const isNew = i === count - 1;
      html += isNew ? '<span class="manifesto__char-in">' + escape(t.ch) + "</span>" : escape(t.ch);
    }
    if (open) html += closeTagHtml(open);
    html += '<span class="manifesto__cursor" aria-hidden="true"></span>';
    textEl.innerHTML = html;
    textEl.classList.toggle("is-typed-done", done);
  }

  let timer = null;

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function start() {
    stop();
    let i = 0;
    render(0, false);
    const step = () => {
      i++;
      render(i, i >= tokens.length);
      if (i < tokens.length) timer = setTimeout(step, TYPE_DELAY_MS);
      else timer = null;
    };
    timer = setTimeout(step, TYPE_DELAY_MS);
  }

  // 2026-11-05 27차: "타이핑 시작 시점이 좀 더 빨랐으면" 피드백 — threshold 0.5(섹션이 화면 중간쯤
  // 내려와야 시작)는 체감상 너무 늦었음. 사이트 공통 등장 애니메이션([data-reveal], main.js)과 같은
  // 기준(0.15, 조금만 들어와도 시작)으로 낮춤. 다 쳐지면 멈추고(반복/삭제 없음), 섹션을 벗어났다가
  // 다시 들어오면(threshold를 다시 위로 교차) start()가 또 호출돼 처음부터 재생된다.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else stop();
      });
    },
    { threshold: 0.15 }
  );
  io.observe(wrap);
})();
