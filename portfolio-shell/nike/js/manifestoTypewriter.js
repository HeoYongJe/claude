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

  // 원본 DOM(<br>, <em>)은 최초 1회만 토큰 배열로 파싱해두고, 타이핑 중에는
  // 이 배열만 갖고 innerHTML을 매 글자 다시 그린다 — 실제 텍스트 노드는
  // 건드리지 않으므로 JS가 실패해도 정적 텍스트는 그대로 남는다(폴백).
  const tokens = [];
  textEl.childNodes.forEach((node) => {
    if (node.nodeType === 1 && node.tagName === "BR") {
      tokens.push({ br: true });
      return;
    }
    const em = node.nodeType === 1 && node.tagName === "EM";
    const text = node.textContent || "";
    for (const ch of text) tokens.push({ ch, em });
  });
  if (!tokens.length) return;

  function escape(ch) {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    return ch;
  }

  function render(count, done) {
    let html = "";
    let openEm = false;
    for (let i = 0; i < count; i++) {
      const t = tokens[i];
      if (t.br) {
        if (openEm) { html += "</em>"; openEm = false; }
        html += "<br>";
        continue;
      }
      if (t.em && !openEm) { html += "<em>"; openEm = true; }
      if (!t.em && openEm) { html += "</em>"; openEm = false; }
      // 가장 마지막(이번 틱에 막 나타난) 글자만 페이드업 애니메이션 span으로 감싼다 — 다음 틱엔
      // 이 글자도 평범한 텍스트로 재렌더링되므로(아래서 통째로 다시 그림) 애니메이션이 중복 재생되지 않음.
      const isNew = i === count - 1;
      html += isNew ? '<span class="manifesto__char-in">' + escape(t.ch) + "</span>" : escape(t.ch);
    }
    if (openEm) html += "</em>";
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

  // threshold 0.5 — 섹션이 뷰포트에 절반쯍 들어왔을 때(화면 중간쯤 내려왔을 때)
  // 타이핑 시작. 다 쳐지면 멈추고(반복/삭제 없음), 섹션을 벗어났다가 다시
  // 들어오면(threshold를 다시 위로 교차) start()가 또 호출돼 처음부터 재생된다.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else stop();
      });
    },
    { threshold: 0.5 }
  );
  io.observe(wrap);
})();
