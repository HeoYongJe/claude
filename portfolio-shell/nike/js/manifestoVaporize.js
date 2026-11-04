// ---- 매니페스토 "입자 등장" 텍스트 ----
// 2026-11-04: "히어로→매니페스토 전환이 스크롤 인터랙션 때문에 어색하다, 다른 인터랙션으로 바꿔보면
// 어떠냐"는 요청 — 사용자가 제공한 React 컴포넌트(Originkit "Text Vaporize")를 바닐라 캔버스로 포팅
// (kineticGrid.js와 같은 포팅 패턴: 호스트 엘리먼트 찾기 → 캔버스 빌드 → IntersectionObserver로 화면
// 밖에서는 안 돌게 가드). 원본은 여러 문구를 계속 사라졌다/나타났다 순환시키는 컴포넌트인데, "반복하지
// 말라"는 요청대로 등장(appear) 단계만 가져오고 사라짐(disappear)·cycle 루프는 아예 구현하지 않음 —
// 뷰포트에 처음 들어오는 순간 흩어진 입자가 한 번 모여 텍스트를 이루고 끝(다시 안 흩어짐).
(function () {
  "use strict";
  const wrap = document.querySelector("[data-manifesto-vaporize]");
  if (!wrap) return;
  const textEl = wrap.querySelector(".manifesto__text");
  const canvas = wrap.querySelector(".manifesto__canvas");
  if (!textEl || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 모션 축소 환경: CSS가 이미 텍스트를 즉시 보여주고 캔버스를 숨겨둠(style.css reduced-motion 블록) —
  // 여기선 애니메이션을 아예 구성하지 않고 끝.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const EM_COLOR = "#D7FF3E"; // --volt, <em> 세그먼트 전용
  const SWEEP_SPAN = 0.55; // 전체 진행률 중 "왼쪽→오른쪽으로 번져나가는" 구간이 차지하는 비율
  const DURATION = 1.05; // 초
  // 캔버스 비용은 이 값의 제곱에 비례(매 프레임 버퍼 전체를 훑음) — 레티나에서 1.5배면 1배의 9배
  // 픽셀을 다루게 되므로 2로 캡(kineticGrid.js와 동일 판단).
  const globalDpr = Math.min(2, window.devicePixelRatio || 1);

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const localProgress = (e, start) => {
    const span = 1 - start;
    if (span <= 0) return e >= start ? 1 : 0;
    return Math.max(0, Math.min(1, (e - start) / span));
  };

  let particles = [];
  let bleed = 0;
  let sampleStep = 1;
  let scatterReach = 60;
  let frameId = null;

  // 한글(완성형 음절)·한자·가나는 띄어쓰기 없이도 글자 사이 아무 데서나 줄바꿈될 수 있음(브라우저의
  // 기본 CJK 줄바꿈 규칙) — 영문·숫자는 평범하게 공백 기준으로만 끊김. 이 차이를 무시하고 공백
  // 단위로만 묶으면, 좁은 화면에서 실제 텍스트는 단어 중간(예: "만들어진" / "다.")에서 꺾이는데 캔버스는
  // 안 꺾여서 줄 수·단어 위치가 어긋나 버림(실측으로 확인한 버그) — 그래서 CJK는 글자 하나하나를
  // 쪼갤 수 있는 토큰으로 만듦.
  function isCJK(ch) {
    const c = ch.codePointAt(0);
    return (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3040 && c <= 0x30FF);
  }
  // pendingSpace를 호출자가 넘겨받아 다음 호출에 이어 쓸 수 있게 반환 — 그래야 "...걸음씩 " (텍스트
  // 노드 끝 공백) 다음에 바로 오는 "<em>만들어진다.</em>" (다른 노드) 사이의 공백이, 노드가 갈리는
  // 경계에서 유실되지 않음(각 DOM 노드를 독립적으로 토큰화하면 한쪽 끝의 trailing space 정보가 다음
  // 노드로 안 넘어가 사라지는 버그가 있었음 — 실측으로 확인).
  function tokenizeInto(raw, color, pendingSpace, out) {
    let i = 0;
    while (i < raw.length) {
      const ch = raw[i];
      if (/\s/.test(ch)) { pendingSpace = true; i++; continue; }
      if (isCJK(ch)) {
        out.push({ text: ch, spaceBefore: pendingSpace, color });
        pendingSpace = false;
        i++;
        continue;
      }
      let j = i;
      while (j < raw.length && !/\s/.test(raw[j]) && !isCJK(raw[j])) j++;
      out.push({ text: raw.slice(i, j), spaceBefore: pendingSpace, color });
      pendingSpace = false;
      i = j;
    }
    return pendingSpace;
  }

  // 실제 <p class="manifesto__text"> 안의 각 "하드" 줄(<br> 기준)을, 색이 입혀진 토큰 배열로 변환 —
  // 줄바꿈 자체는 wrapTokens()가 가용 너비 안에서 따로 계산(아래). DOM에서 직접 읽으므로 나중에
  // 문구가 바뀌어도 이 파일은 안 건드려도 됨.
  function readHardLines(baseColor) {
    const hardLines = [];
    let current = [];
    let pendingSpace = false;
    textEl.childNodes.forEach((node) => {
      if (node.nodeType === 1 && node.tagName === "BR") { hardLines.push(current); current = []; pendingSpace = false; return; }
      const raw = node.textContent;
      if (!raw) return;
      const color = node.nodeType === 1 && node.tagName === "EM" ? EM_COLOR : baseColor;
      pendingSpace = tokenizeInto(raw, color, pendingSpace, current);
    });
    hardLines.push(current);
    return hardLines.filter((l) => l.length);
  }

  // 줄 맨 앞에 혼자 오면 안 되는 마침표·쉼표 등 닫는 문장부호(실제 브라우저의 CJK 줄바꿈 규칙도 이
  // 문자들 앞에서는 안 끊음) — 한 글자씩 쪼개다 보니 이 규칙 없이는 "." 하나만 외로이 다음 줄 맨
  // 앞에 떨어지는 경우가 생김(실측으로 확인한 버그).
  const NO_LINE_START = /^[.,!?)\]}'"」』】、。！？］｝」]/;

  // 좁은 화면에서는 실제 텍스트가 <br> 없이도 자동으로 줄바꿈됨(예: "만들어진다."가 단어 중간에서
  // 꺾여 3줄이 됨) — 캔버스도 똑같이 가용 너비(maxWidthPx) 안에서 토큰 단위로 줄을 채워나가야, 입자가
  // 모인 모습과 애니메이션이 끝난 뒤 드러나는 실제 텍스트의 줄 수·꺾이는 위치가 어긋나지 않음.
  // <br>로 나뉜 "하드 줄"끼리는 폭에 여유가 있어도 절대 안 합쳐짐(실제 <br>과 동일하게 항상 강제 개행).
  function wrapTokens(hardLines, maxWidthPx, spaceWidth, measureCtx) {
    const visual = [];
    hardLines.forEach((tokens) => {
      let line = [];
      let lineWidth = 0;
      tokens.forEach((token) => {
        const tWidth = measureCtx.measureText(token.text).width;
        const extra = (line.length && token.spaceBefore ? spaceWidth : 0) + tWidth;
        if (line.length && lineWidth + extra > maxWidthPx) {
          visual.push(line);
          line = [token];
          lineWidth = tWidth;
        } else {
          line.push(token);
          lineWidth += extra;
        }
      });
      if (line.length) visual.push(line);
    });
    // 줄 맨 앞이 금지된 문장부호면 앞 줄 끝으로 끌어올림(그만큼 앞 줄 너비가 살짝 넘어가도 — 문장부호
    // 한 글자 너비라 체감상 무시할 수준 — 어색하게 혼자 떨어지는 것보다 나음).
    for (let i = 1; i < visual.length; i++) {
      while (visual[i].length && NO_LINE_START.test(visual[i][0].text) && visual[i - 1].length) {
        visual[i - 1].push(visual[i].shift());
      }
    }
    return visual.filter((line) => line.length);
  }

  function build() {
    const cs = getComputedStyle(textEl);
    const fontSize = parseFloat(cs.fontSize) || 40;
    const fontWeight = cs.fontWeight || "600";
    const fontFamily = cs.fontFamily || "sans-serif";
    const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.15;

    const wrapRect = wrap.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    bleed = Math.round(fontSize * 1.2);
    scatterReach = fontSize * 1.1 * globalDpr;

    // 캔버스 크기를 정하기 전에 몇 줄로 꺾일지부터 알아야 하는데, 줄 수를 알려면 폰트로 단어 너비를
    // 재봐야 하고, 캔버스 크기를 바꾸면(width/height 대입) 그 순간 2D 컨텍스트의 font 등 상태가
    // 전부 초기화되는 캔버스 특성상 "실제로 그릴 캔버스"에 미리 font를 걸어둘 수 없음 — 크기와 무관한
    // 임시 캔버스를 하나 더 만들어 측정 전용으로 쓰고, 실제 캔버스는 결과가 나온 뒤 한 번에 맞춤.
    const measureCanvas = document.createElement("canvas");
    const mctx = measureCanvas.getContext("2d");
    const fontStr = `${fontWeight} ${fontSize * globalDpr}px ${fontFamily}`;
    mctx.font = fontStr;
    const maxWidthPx = textRect.width * globalDpr;
    const spaceWidth = mctx.measureText(" ").width;
    const hardLines = readHardLines(cs.color);
    const visualLines = wrapTokens(hardLines, maxWidthPx, spaceWidth, mctx);

    const cssW = textRect.width + bleed * 2;
    const cssH = Math.max(textRect.height, visualLines.length * lineHeight) + bleed * 2;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.style.left = textRect.left - wrapRect.left - bleed + "px";
    canvas.style.top = textRect.top - wrapRect.top - bleed + "px";
    canvas.width = Math.max(1, Math.floor(cssW * globalDpr));
    canvas.height = Math.max(1, Math.floor(cssH * globalDpr));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontStr;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const sample = ctx.measureText("가Mg0");
    const ascent = sample.actualBoundingBoxAscent || fontSize * globalDpr * 0.8;
    const descent = sample.actualBoundingBoxDescent || fontSize * globalDpr * 0.2;

    const leftPx = bleed * globalDpr;
    visualLines.forEach((line, i) => {
      const lineTop = (bleed + i * lineHeight) * globalDpr;
      const baselineY = lineTop + (lineHeight * globalDpr - (ascent - descent)) / 2 + ascent;
      let cursorX = leftPx;
      line.forEach((token, wi) => {
        if (wi > 0 && token.spaceBefore) cursorX += spaceWidth;
        ctx.fillStyle = token.color;
        ctx.fillText(token.text, cursorX, baselineY);
        cursorX += ctx.measureText(token.text).width;
      });
    });

    // 그린 픽셀을 입자로 샘플링 — stride 간격으로 건너뛰며 읽어서 입자 수를 적당히 제한.
    sampleStep = Math.max(1, Math.round(globalDpr));
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    particles = [];
    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = imgData[idx + 3];
        if (alpha === 0) continue;
        const originalAlpha = alpha / 255;
        // 가로 위치 기준 "왼쪽→오른쪽" 스윕 시작 시점(0~SWEEP_SPAN) — 왼쪽 입자가 먼저 모이기 시작.
        const start = (x / canvas.width) * SWEEP_SPAN;
        const angle = Math.random() * Math.PI * 2;
        const dist = (0.5 + Math.random() * 0.5) * scatterReach;
        particles.push({
          originalX: x, originalY: y,
          scatterX: x + Math.cos(angle) * dist,
          scatterY: y + Math.sin(angle) * dist * 0.6,
          r: imgData[idx], g: imgData[idx + 1], b: imgData[idx + 2],
          originalAlpha, start,
        });
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function render() {
    const w = canvas.width, h = canvas.height;
    const buf = ctx.createImageData(w, h);
    const data = buf.data;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0.01) continue;
      const alpha = (p.opacity > 1 ? 1 : p.opacity) * 255 | 0;
      const px = p.x | 0, py = p.y | 0;
      for (let dy = 0; dy < sampleStep; dy++) {
        const y = py + dy;
        if (y < 0 || y >= h) continue;
        let idx = (y * w + px) * 4;
        for (let dx = 0; dx < sampleStep; dx++) {
          const x = px + dx;
          if (x >= 0 && x < w) {
            data[idx] = p.r; data[idx + 1] = p.g; data[idx + 2] = p.b; data[idx + 3] = alpha;
          }
          idx += 4;
        }
      }
    }
    ctx.putImageData(buf, 0, 0);
  }

  function finish() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 캔버스는 페이드아웃, 그 아래 진짜 텍스트(선명하고 선택 가능한 DOM 텍스트)는 동시에 페이드인 —
    // 교차 크로스페이드라 입자 위치와 실제 글자 위치가 1px 안 맞아도 눈에 안 띔.
    canvas.classList.add("is-done");
    textEl.classList.add("is-revealed");
  }

  let t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    const elapsed = (now - t0) / 1000;
    const p = Math.min(1, elapsed / DURATION);
    const e = easeOutCubic(p);
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const local = localProgress(e, particle.start);
      particle.x = particle.scatterX + (particle.originalX - particle.scatterX) * local;
      particle.y = particle.scatterY + (particle.originalY - particle.scatterY) * local;
      particle.opacity = particle.originalAlpha * local;
    }
    render();
    if (p >= 1) { finish(); return; }
    frameId = requestAnimationFrame(frame);
  }

  // 뷰포트에 처음 들어오는 순간 딱 한 번만 재생 — 이후론 다시 안 건드림(반복 금지).
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      build();
      if (!particles.length) { finish(); return; }
      frameId = requestAnimationFrame(frame);
    },
    { threshold: 0.3 }
  );
  io.observe(wrap);
})();
