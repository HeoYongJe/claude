(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 상단 진행 바 ----
  const progressBar = document.querySelector(".progress__bar");
  const nav = document.querySelector(".nav");
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
    if (nav) nav.classList.toggle("is-scrolled", scrolled > 30);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 등장 애니메이션(data-reveal) ----
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("is-revealed"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ---- 히어로 키네틱 타이포: "NIKE"를 글자 span으로 쪼개 순차 등장 ----
  const heroWord = document.querySelector(".hero__word");
  if (heroWord) {
    const text = heroWord.textContent.trim();
    heroWord.setAttribute("aria-label", text);
    heroWord.innerHTML = [...text]
      .map((ch, i) => `<span class="letter" style="--d:${(i * 0.09).toFixed(2)}s" aria-hidden="true">${ch}</span>`)
      .join("");
  }

  // ---- 제품 쇼케이스: 2026-10-23 6차 — "홀로그램 표현이 안 됨, 3D/회전 다 빼고 신발을 강조하는
  //      인터랙션으로 시원시원하게"라는 요청으로 three.js 3D 렌더링을 전면 폐기하고 평면 사진 +
  //      스크롤 연동 2D 트랜스폼(확대 + 기울어짐 → 정자세로 정리)으로 교체. 배경 그라데이션은 여전히
  //      JS가 아니라 .showcase 섹션 하나의 정적 CSS 배경(vh 단위 스톱)이라 여기선 안 건드림(css 참고). ----
  const showcaseStageWrap = document.querySelector("[data-showcase-stage-wrap]");
  const showcaseShoe = document.querySelector("[data-showcase-shoe]");
  const showcaseGlow = document.querySelector("[data-showcase-glow]");

  // ---- 룩북: Fluid Hover Accordion ----
  // 2026-10-30: 1~11차 동안 다듬어온 랭크 기반 스택 캐러셀을 전면 폐기 — design.md Lookbook 항목 참고.
  // 데스크톱(마우스 호버 가능)에서는 CSS `:hover`만으로 패널이 커져서 JS가 필요 없음 — 아예 아래 리스너를
  // 안 붙인다. 터치 기기는 호버 자체가 없으므로("데스크톱은 호버, 모바일은 탭" 요청) 탭(click)할 때마다
  // `.is-active`를 토글해 CSS의 `.is-active` 확장 규칙을 대신 태움 — 한 번에 하나만 열리는 표준 아코디언
  // 동작(다른 패널 클릭 시 이전 건 자동으로 닫힘, 열린 걸 다시 탭하면 닫힘).
  const lookbookAccordion = document.querySelector("[data-lookbook-accordion]");
  if (lookbookAccordion && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const panels = [...lookbookAccordion.querySelectorAll("[data-panel]")];
    panels.forEach((panel) => {
      panel.addEventListener("click", () => {
        const wasActive = panel.classList.contains("is-active");
        panels.forEach((p) => p.classList.remove("is-active"));
        if (!wasActive) panel.classList.add("is-active");
      });
    });
  }

  // ---- 스펙 숫자 카운트업(뷰포트 진입 시 0→실제값, 동시에 큰 팝업 애니메이션) ----
  const countEls = document.querySelectorAll("[data-count]");
  if (reduceMotion) {
    countEls.forEach((el) => { el.textContent = el.dataset.count; });
  } else {
    const countIO = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          obs.unobserve(el);
          el.classList.add("is-popped");
          const target = Number(el.dataset.count) || 0;
          const dur = 900;
          const start = performance.now();
          function tick(now) {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            el.textContent = Math.round(target * eased);
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = target;
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    countEls.forEach((el) => countIO.observe(el));
  }

  // ---- rAF 루프: 히어로 줌아웃 스크럽 + 매니페스토 핀드줌 스크럽 + 쇼케이스 비주얼 스크럽
  //      + [data-speed] 배경 패럴럭스 ----
  // 실제 스크롤 위치를 바로 쓰지 않고 lerp로 보간한 "스무스 스크롤 값"을 스크럽 계산에 써서
  // 트랙패드·휠 스크롤의 미세한 끊김이 그대로 전달되지 않고 부드럽게 쫓아가는 느낌을 만든다
  // (가뿐 히어로 패럴럭스의 lerp(0.09) 패턴과 동일 — 2026-10-19, "스크롤 효과가 더 부드러웠으면" 피드백 반영).
  const heroWrap = document.querySelector(".hero-wrap");
  const heroInner = document.querySelector("[data-hero-scrub]");
  const heroBg = document.querySelector("[data-hero-bg]");
  const heroScrollEl = document.querySelector("[data-hero-scroll]");
  const manifesto = document.querySelector("[data-manifesto]");
  const manifestoText = document.querySelector("[data-manifesto-scrub]");
  const marqueeEl = document.querySelector(".marquee");
  const lookbookSectionEl = document.querySelector(".lookbook");
  const lookbookContentEl = document.querySelector(".lookbook .container");
  // "섹션 전환이 밋밋하다"는 피드백(2026-10-20) — 전체 섹션을 덮는 대신, **배경 레이어만** 콘텐츠와
  // 살짝 다른 속도로 움직이게 해서 "고정된 배경 위로 콘텐츠가 지나가는" 듯한 깊이감만 준다.
  // 매니페스토·쇼케이스 배경(.manifesto__bg, .showcase__bg)은 가뿐과 동일한 [data-speed] 뷰포트 패럴럭스
  // 공식(translateY(-(요소중심−뷰포트중심)*speed))을 그대로 씀 — 이 두 섹션 자체는 보통 플로우로 스크롤되므로
  // 뷰포트 안에서 위치가 바뀌어 패럴럭스가 성립함. 히어로 배경(.hero__bg)은 **sticky로 고정된 .hero 안**이라
  // 뷰포트 기준 위치가 안 바뀌어 같은 공식이 통하지 않음 → 아래 히어로 블록에서 progress에 직접 바인딩해
  // "배경은 전경보다 훨씬 느리게 확대"되는 걸로 같은 효과를 냄.
  const parallaxEls = [...document.querySelectorAll("[data-speed]")];

  if (!reduceMotion) {
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    let bounds = {};
    function measure() {
      bounds = {
        hero: heroWrap ? { start: heroWrap.offsetTop, range: heroWrap.offsetHeight - window.innerHeight } : null,
        manifesto: manifesto ? { start: manifesto.offsetTop, range: manifesto.offsetHeight - window.innerHeight } : null,
        showcaseStage: showcaseStageWrap ? { start: showcaseStageWrap.offsetTop, range: showcaseStageWrap.offsetHeight - window.innerHeight } : null,
        marquee: marqueeEl ? { start: marqueeEl.offsetTop } : null,
        // lookbookSectionEl·lookbookContentEl은 position:relative인 .speedfield 영향권 근처에 있어
        // offsetTop이 조상 기준으로 틀어질 수 있음 — getBoundingClientRect + scrollY로 절대 위치를 직접 계산.
        lookbookSection: lookbookSectionEl ? { top: lookbookSectionEl.getBoundingClientRect().top + window.scrollY } : null,
        lookbookContent: lookbookContentEl ? { start: lookbookContentEl.getBoundingClientRect().top + window.scrollY } : null,
      };
    }
    measure();
    // 안전장치: 초기 measure()는 스크립트 실행 시점(웹폰트가 아직 안 끝났을 수 있는 때) 한 번만 도는데,
    // Oswald/Pretendard가 늦게 적용되며 위쪽(히어로·매니페스토) 텍스트 줄바꿈이 바뀌면 그 아래
    // showcaseStage의 offsetTop도 같이 밀릴 수 있음 — 창 크기가 그대로여도 폰트 로드 완료 시점엔
    // 다시 재도록 보강(리사이즈 이벤트만으론 이 경우를 못 잡음).
    document.fonts.ready.then(measure);
    window.addEventListener("load", measure);
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 150); });

    // 2026-11-02: "텍스트가 다 사라진 뒤에도 빈 화면을 스크롤 서너 번 더 해야 다음 섹션이 나온다,
    // 한 번만 스크롤해도 바로 다음 섹션으로 넘어가는 원페이지 스크롤 방식으로" 요청 — 핀/스크럽 구간
    // 전체를 원페이지로 바꾸는 대신, **스크럽 연출 자체는 이미 끝났는데 핀이 풀릴 때까지 스크롤을
    // 더 받아야 하는 "꼬리 구간"에서만** 마우스 휠 한 번에 다음 섹션이 뷰포트를 꽉 채우는 지점으로
    // 바로 넘기는 "부분 스냅"을 추가. 트랙패드 관성에 애니메이션이 씹히지 않도록 스냅 중엔 모든 휠
    // 입력을 막아뒀다가 끝나면 풀고, 위로 스크롤해 꼬리 구간에 다시 들어가려 할 때도 대칭으로 한 번에
    // 건너뜀. 휠 전용(터치는 wheel 이벤트가 안 쓰여 영향 없음 — 모바일은 핀 자체가 해제됨).
    // 2026-11-02 추가: "히어로→매니페스토만 적용되니 어색하다, 전체적으로 적용하는 게 나을 것 같은데"
    // — 매니페스토→쇼케이스 전환도 같은 패턴(스크럽이 range*0.75 지점에서 이미 끝나고 나머지 25%는
    // "다 된 채로 더 스크롤해야 하는" 꼬리)이라 이 스냅 목록(`tails`)에 같이 추가. BY THE NUMBERS
    // (specs) 이후는 sticky/스크럽이 아니라 카드를 쭉 읽으며 내려가는 보통의 문서 흐름이라 이 패턴
    // 대상이 아님 — 사용자와 상의해 쇼케이스까지만으로 범위를 확정.
    let snapping = false;
    // 2026-11-03: 착지 직후 반대 방향 스냅이 바로 재발동하는 걸 막기 위한 쿨다운(아래 forward/reverse
    // 분기 공용 — 10차부터는 양방향 모두에 대칭 적용).
    let lastForwardLandKey = null;
    let lastForwardLandAt = -Infinity;
    let lastReverseLandKey = null;
    let lastReverseLandAt = -Infinity;
    const SNAP_LAND_COOLDOWN_MS = 900;
    // 2026-11-03: reverse 조건이 "y > deadStart"만으로 무제한 범위를 허용해서, CTA 근처처럼 꼬리
    // 구간에서 한참 떨어진 곳에서 빠르게(델타 큰) 위로 스크롤하면 그 한 번의 틱만으로 projected가
    // target+40 밑으로 내려가 버려 룩북 타이틀을 거치지도 않고 곧장 deadStart로 점프해버림(재현 확인).
    // forward 쪽은 "y < bottom"으로 이미 현재 위치를 제한하고 있는 것과 대칭으로, reverse도 착지
    // 지점(target) 근처 REVERSE_ARM_ZONE_PX 안에서만 armed되게 제한 — 이 범위보다 멀리서 스크롤할
    // 땐 일반 스크롤 그대로 두어 룩북 콘텐츠를 반드시 거치고 나서야 꼬리 쪽 스냅이 걸리게 함.
    const REVERSE_ARM_ZONE_PX = 220;
    // 2026-11-03 10차: forward 쪽은 반대로 "projected >= deadStart"만 있고 "y가 deadStart에 얼마나
    // 가까운지"는 안 봤음 — 쇼케이스처럼 deadStart보다 한참 위에서 트랙패드 관성으로 크게(델타 큰)
    // 한 번에 스크롤하면, 그 한 틱만으로 projected가 deadStart를 넘어버려 PRODUCT(specs) 섹션을
    // 한 프레임도 보여주지 않고 통째로 건너뛰거나, 카드/통계 그리드가 다 보이기도 전에 중간에서
    // 잘려버림("product 상단/하단이 짤린다" 재현 확인 — specs 섹션 높이가 뷰포트보다 짧아서 더 잘 걸림).
    // reverse와 대칭으로 "현재 위치도 deadStart 근처여야" armed되게 제한.
    const FORWARD_ARM_ZONE_PX = 220;
    function tweenScrollTo(target, duration) {
      const startY = window.scrollY;
      const delta = target - startY;
      const t0 = performance.now();
      function step(now) {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        // html에 전역 `scroll-behavior:smooth`가 걸려 있어(css 참고) 두 인자짜리 scrollTo(x,y)를
        // 쓰면 매 프레임 값이 그 CSS 스무딩과 다시 겹쳐 애니메이션이 서로 싸우며 엉뚱한 지점에
        // 멈추는 버그가 있었음 — behavior:"auto"를 명시해 매 프레임 즉시 점프시키고, 이징 자체는
        // 이미 위에서 직접 계산하므로(easeOutCubic) 전역 smooth와 중복되지 않게 함.
        window.scrollTo({ top: startY + delta * eased, left: 0, behavior: "auto" });
        if (t < 1) requestAnimationFrame(step);
        else snapping = false;
      }
      requestAnimationFrame(step);
    }
    window.addEventListener("wheel", (e) => {
      if (snapping) { e.preventDefault(); return; }
      const y = window.scrollY;
      const projected = y + e.deltaY; // 이번 휠 틱이 끝나면 대략 어디로 갈지(빠른 스크롤 대응, 아래 참고)
      // 각 구간의 "꼬리 시작 지점(deadStart)"과 "다음 섹션이 뷰포트를 꽉 채우는 지점(nextStart)" —
      // 핀 구간(히어로·매니페스토)은 deadFrom이 그 구간 자신의 스크럽 진행률 공식이 이미 1에 도달해
      // 더는 아무것도 안 바뀌는 지점(히어로는 opacity가 사실상 안 보이게 되는 .78, 매니페스토는 스크럽
      // 공식 자체가 쓰는 .75). 핀이 아닌 보통 흐름 구간(PRODUCT→LOOKBOOK)은 그런 진행률 공식 대신,
      // "마지막 실제 콘텐츠가 끝나는 지점"(specsGrid 하단)을 죽은 구간의 시작으로 씀 — 아래 참고.
      const tails = [];
      if (bounds.hero && bounds.hero.range > 0 && bounds.manifesto && bounds.marquee) {
        // 2026-11-03: "스크롤 시 marquee가 안 보인다" — 원래 다음 섹션(쇼케이스 스테이지) 시작점으로
        // 바로 넘겼더니, 매니페스토와 쇼케이스 사이에 끼어있는 장식 띠(.marquee)가 그 점프 범위 안에
        // 통째로 들어있어 한 번도 화면에 걸리지 않고 건너뛰어졌음 — 다음 섹션이 아니라 marquee
        // 시작점까지만 넘기도록 수정, 이후 marquee→쇼케이스는 원래대로 자연스럽게 스크롤됨.
        tails.push({
          deadStart: bounds.hero.start + bounds.hero.range * 0.78,
          bottom: bounds.hero.start + bounds.hero.range,
          nextStart: bounds.manifesto.start,
        });
      }
      if (bounds.manifesto && bounds.manifesto.range > 0 && bounds.marquee) {
        tails.push({
          deadStart: bounds.manifesto.start + bounds.manifesto.range * 0.75,
          bottom: bounds.manifesto.start + bounds.manifesto.range,
          nextStart: bounds.marquee.start,
        });
      }
      // 2026-11-03: "PRODUCT에서 LOOKBOOK으로 넘어갈 때도 원페이지 스크롤 적용해줘" / "검은 지점이
      // 끝날 때 바로 다음 섹션이 나오게" — 목표 지점은 "LOOKBOOK 제목이 내비 아래로 보이는 지점"으로 맞춤(아래).
      // ⚠️ 2026-11-03 재수정: deadStart를 "카드가 끝나는 지점"(specsGrid 하단)으로 뒀더니, 그 지점에
      // 도달하기 한참 전부터(뷰포트가 섹션 높이보다 커서) 이미 LOOKBOOK의 흰 배경이 화면 아래쪽에
      // 일반 스크롤로 자연스럽게 섞여 보이는 구간이 생겼음(유저가 "뚝뚝 끊긴다"며 캡처한 바로 그 상태) —
      // 스냅이 발동하기도 전에 이미 섞인 모습을 다 보여준 뒤라 스냅 자체가 의미가 없었음. "검은 지점이
      // 끝난다"를 문서 좌표가 아니라 "화면에 흰색이 한 픽셀이라도 보이기 시작하는 시점"으로 다시 정의 —
      // deadStart = (specs 끝 = lookbook 시작 지점) − 뷰포트 높이. 이 지점을 넘어서자마자 치는 스크롤은
      // 무조건 한 번에 착지 지점까지 완주되므로, 섞인 화면이 뷰포트에 정지 상태로는 노출되지 않음.
      // ⚠️ 2026-11-03 세 번째 수정: "룩북에서 위로 스크롤이 안 된다" — forward 스냅이 착지하는 자리
      // 자체가 reverse 트리거 조건(y <= target+40)을 항상 만족해서, 착지 직후 첫 위쪽 휠 입력이 바로
      // 다시 deadStart로 튕겨 보내길 반복했음(아래로도 위로도 "막힌" 것처럼 보인 진짜 원인). 착지 후
      // REVERSE_SNAP_COOLDOWN_MS 동안은 같은 꼬리의 reverse 스냅을 걸지 않고 자연스럽게 이어서
      // 스크롤되도록 쿨다운을 추가(공용 로직, 아래 for 루프 참고) — 히어로·매니페스토 꼬리도 구조상
      // 같은 문제가 있어 함께 적용.
      // 2026-11-03 10차: 룩북+CTA를 합친 실제 콘텐츠 길이가 짧아서(현재 레이아웃 기준 target이 페이지
      // 최대 스크롤 위치에서 불과 9px 안쪽), reverse 쪽 "착지 지점 근처" 판정이 룩북·CTA 거의 전체를
      // 덮어버려 그 구간 어디서 위로 스크롤해도 곧장 PRODUCT 쪽으로 튕겨나갔음(재현 확인) — 튕겨나간
      // 자리에서 작은 반대 방향 떨림만 있어도 forward가 바로 재발동해 왕복하며 "위로 스크롤이 막힌"
      // 것처럼 보였던 것도 이 때문. 히어로·매니페스토 꼬리와 달리 이 구간(specs→lookbook)의 "꼬리"는
      // 진짜 빈 공간이 아니라 룩북 타이틀이라는 실제 콘텐츠라, reverse 스냅 자체를 이 꼬리에서만 끈다
      // (forward만 유지 — 내려갈 때 뭉개진 전환을 막는 원래 목적은 그대로 살림).
      if (bounds.lookbookSection && bounds.lookbookContent) {
        const lookbookNextStart = bounds.lookbookContent.start - 144;
        tails.push({
          deadStart: bounds.lookbookSection.top - window.innerHeight,
          bottom: lookbookNextStart + 24,
          nextStart: lookbookNextStart,
          reverse: false,
        });
      }
      for (const tdef of tails) {
        const target = tdef.nextStart + 24; // 다음 섹션 시작 지점 + 여유(경계 1px 안 남게)
        const canReverse = tdef.reverse !== false;
        if (e.deltaY > 0 && y < tdef.bottom && y >= tdef.deadStart - FORWARD_ARM_ZONE_PX && projected >= tdef.deadStart) {
          const justReverseLanded = canReverse && tdef.deadStart === lastReverseLandKey && performance.now() - lastReverseLandAt < SNAP_LAND_COOLDOWN_MS;
          if (justReverseLanded) continue;
          e.preventDefault();
          snapping = true;
          lastForwardLandKey = tdef.nextStart;
          lastForwardLandAt = performance.now();
          tweenScrollTo(target, 420);
          return;
        }
        if (canReverse && e.deltaY < 0 && y > tdef.deadStart && y <= target + REVERSE_ARM_ZONE_PX && (y <= target + 40 || projected <= target + 40)) {
          const justForwardLanded = tdef.nextStart === lastForwardLandKey && performance.now() - lastForwardLandAt < SNAP_LAND_COOLDOWN_MS;
          if (justForwardLanded) continue;
          e.preventDefault();
          snapping = true;
          lastReverseLandKey = tdef.deadStart;
          lastReverseLandAt = performance.now();
          tweenScrollTo(tdef.deadStart, 420);
          return;
        }
      }
    }, { passive: false });

    let smoothY = window.scrollY;
    function raf() {
      const realY = window.scrollY;
      // 0.085 → 0.06: 마우스 휠처럼 값이 뚝뚝 끊겨 들어오는 입력에서도 체감되는 끊김이 있었음(2026-10-19 피드백) —
      // 보간 폭을 더 키워서(=더 천천히 따라가서) 개별 휠 틱들이 뭉개져 보이도록.
      smoothY += (realY - smoothY) * 0.06;
      if (Math.abs(realY - smoothY) < 0.05) smoothY = realY;

      // 히어로: hero-wrap의 추가 높이(100vh)만큼 스크롤하는 동안 진행률 0→1
      if (heroInner && bounds.hero && bounds.hero.range > 0) {
        const progress = clamp01((smoothY - bounds.hero.start) / bounds.hero.range);
        // 2026-10-29: 기존 *1.6은 핀 구간의 62.5% 지점에서 이미 완전히 투명해져, 나머지 37.5%는
        // 아무것도 없는 빈 화면만 스크롤되는 "죽은 구간"이었음("여백이 너무 많아 미완성 같다" 피드백의
        // 원인). progress를 그대로 써서 핀이 풀리는 정확한 순간에 다 사라지도록 range 전체를 씀.
        const opacity = Math.max(0, 1 - progress);
        // 2026-11-02: "텍스트가 사라지고 스크롤하면 탁 다음 섹션으로" 요청 — opacity 타이밍은 위에서
        // 이미 핀 해제 순간에 정확히 0이 되지만, scale이 1.9까지 커지면서 overflow:hidden 경계에
        // 텍스트가 먼저 잘려나가 "실제로 안 보이는" 시점이 opacity=0보다 한참 앞섰음(그 사이가 체감상
        // 빈 구간). 최대 확대를 1.9→1.4로 낮춰 잘려나가는 시점과 opacity 0 시점을 거의 일치시킴.
        const scale = 1 + progress * 0.4; // 1 -> 1.4 (전경, 확대하며 사라짐)
        // 2026-10-22: 입장 시 blur→선명(위 CSS [data-reveal])의 반대 방향 — 스크롤해서 다음 섹션으로
        // 넘어가는 동안 다시 흐려지도록 진행률에 블러를 바인딩(0 -> 14px, 입장 블러 세기와 동일하게 맞춤).
        const blur = progress * 14;
        heroInner.style.transform = `scale(${scale.toFixed(3)})`;
        heroInner.style.opacity = opacity.toFixed(3);
        heroInner.style.filter = `blur(${blur.toFixed(1)}px)`;
        if (heroScrollEl) heroScrollEl.style.opacity = Math.max(0, 1 - progress * 4).toFixed(3);
        // 배경은 전경보다 훨씬 느리게(1 -> 1.15) — "background-attachment"처럼 배경은 거의 제자리,
        // 콘텐츠만 그 위를 빠르게 지나가는 듯한 깊이감.
        if (heroBg) heroBg.style.transform = `scale(${(1 + progress * 0.15).toFixed(3)})`;
      }

      // 매니페스토: 섹션(220vh) 내 sticky 구간 진행률 0→1에 텍스트 scale 0.5→1.15 바인딩.
      // range의 75% 지점에서 이미 progress=1에 도달하게 해서(÷0.75), 완전히 확대된 채로 잠깐
      // "멈춰 있다가" sticky가 풀리도록(급작스러운 핸드오프 방지용 호흡).
      if (manifestoText && bounds.manifesto && bounds.manifesto.range > 0) {
        const progress = clamp01((smoothY - bounds.manifesto.start) / (bounds.manifesto.range * 0.75));
        // 2026-10-29: 시작 크기 0.5→0.65, opacity 램프 ×2.5→×3 — 히어로 쪽 여백 수정과 짝으로
        // 텍스트가 더 일찍·더 또렷하게 잡혀서 핸드오프가 타이트하게 느껴지도록.
        const scale = 0.65 + progress * 0.5;
        manifestoText.style.transform = `scale(${scale.toFixed(3)})`;
        manifestoText.style.opacity = Math.min(1, progress * 3).toFixed(3);
      }

      // 쇼케이스 스테이지: 신발 사진이 살짝 기울어진 채 작게 시작해 확대되며 정자세로 "탁" 정리됨 —
      // 3D 대신 순수 2D 트랜스폼(scale+rotate+translateY)만으로 "시원시원한" 임팩트를 냄. 배경
      // 그라데이션은 .showcase 섹션 전체에 걸친 정적 CSS라 여기선 안 건드림(css 참고, 스크롤에 따라
      // 저절로 드러남).
      if (showcaseShoe && bounds.showcaseStage && bounds.showcaseStage.range > 0) {
        const progress = clamp01((smoothY - bounds.showcaseStage.start) / bounds.showcaseStage.range);
        // 2026-10-29: "확대됐을 때 사이즈를 조금만 줄여줘" — 최대 스케일 1.15 -> 1.0.
        const scale = 0.75 + progress * 0.25; // 0.75 -> 1.0, 확대되며 등장
        const rotate = -8 + progress * 8; // -8deg -> 0deg, 비스듬했다가 정자세로 정리
        const rise = (1 - progress) * 50; // 아래에서 살짝 떠오르며 자리 잡음
        showcaseShoe.style.transform = `translateY(${rise.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg)`;
        // 신발 뒤 글로우도 같은 진행률로 밝아짐(transform은 CSS 무한 애니메이션이 소유하므로 opacity만
        // 건드려 충돌 없음, css 참고). 2026-11-02: "그라데이션은 신발 한정으로 은은하게"에 맞춰 최대
        // opacity도 .9→.5로 낮춤 — 회전 링(showcaseRing)은 요청대로 완전히 제거.
        if (showcaseGlow) showcaseGlow.style.opacity = (progress * 0.5).toFixed(3);
      }

      // 배경 패럴럭스: 각 섹션 배경이 콘텐츠보다 느리게(요소중심이 뷰포트중심과 가까울수록 변위 0에 수렴)
      const viewportCenter = window.innerHeight / 2;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const offset = -(elCenter - viewportCenter) * speed;
        el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  } else if (manifestoText) {
    manifestoText.style.opacity = 1;
    manifestoText.style.transform = "scale(1)";
  }

  // ---- 마퀴 트랙 폭 안전장치(가뿐 인기여행지 티커와 동일 패턴) ----
  const marqueeTrack = document.querySelector("[data-marquee-track]");
  if (marqueeTrack) {
    const html = marqueeTrack.innerHTML;
    requestAnimationFrame(() => {
      const wrapW = marqueeTrack.parentElement.clientWidth || 1;
      for (let n = 1; n <= 4; n++) {
        if (marqueeTrack.scrollWidth / 2 >= wrapW * 1.1) break;
        marqueeTrack.innerHTML = html.repeat(n + 1);
      }
    });
  }

  // ---- CTA 폼(목업 — 실제 전송 없음) ----
  const ctaForm = document.querySelector(".cta__form");
  const ctaDone = document.querySelector(".cta__done");
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ctaForm.hidden = true;
      if (ctaDone) ctaDone.hidden = false;
    });
  }
})();
