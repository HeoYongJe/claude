// travel — 핸드오프(.dc.html)의 DCLogic Component를 바닐라 JS로 이식.
// 부드러운 스크롤(lerp) · 로컬 패럴럭스 · 항로 레일 · 히어로 페이드/틸트 ·
// 랭킹 강세/약세 토글 · 물가 도시 탭(막대+카운트업) · 핀 고정 스크롤텔링.

(function () {
  const root = document.getElementById("twrap");
  if (!root) return;

  // 동작 줄이기(reduced-motion)면 카운트업을 생략하고 즉시 최종값을 보여준다.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 데이터 (샘플 — 추후 실제 환율/물가로 교체) ----
  // 랭킹·물가(국가별)·서울 기준가는 서버(/api/ranking)에서 실데이터로 받아온다.
  // 물가 탭 = 강세 랭킹 top3 나라 (키=국가코드). CITYDATA[code] = {name,label,bigmac,cola,water,fx,savePct}
  let RANKDATA = { strong: [], weak: [] };
  let CITYDATA = {};
  let SEOULDATA = { bigmac: 5500, cola: 2000, water: 1000 };

  const state = { cur: null, rmode: "strong", curStep: -1, sm: 0 };

  // ---- 요소 참조 ----
  const layers = [...root.querySelectorAll("[data-speed]")];
  const prog = root.querySelector(".t-progress");
  const hero = root.querySelector(".t-hero");
  const heroInner = hero && hero.querySelector('div[style*="grid-template-columns"]');
  const scrolly = root.querySelector(".t-scrolly");
  const panels = [...root.querySelectorAll(".t-spanel")];
  const idxs = [...root.querySelectorAll(".t-sidx")];
  const railTrail = root.querySelector(".t-rail-trail");
  const railEl = root.querySelector(".t-rail");
  const planeWrap = root.querySelector(".t-planewrap");
  const railLen = 784; // viewBox 0..800 에서 y 8→792

  if (railTrail) {
    railTrail.style.strokeDasharray = railLen;
    railTrail.style.strokeDashoffset = railLen;
  }

  // ---- 연속 이징 렌더 루프(관성 스크롤 느낌) ----
  const render = () => {
    const y = window.pageYOffset;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(1, Math.max(0, y / max));
    state.sm += (target - state.sm) * 0.09; // lerp = 관성
    if (Math.abs(target - state.sm) < 0.0002) state.sm = target;
    const gp = state.sm;
    const sy = gp * max;

    // 로컬 패럴럭스: 뷰포트 중앙 기준 거리만큼 이동
    const vc = window.innerHeight / 2;
    for (const l of layers) {
      const r = l.getBoundingClientRect();
      const off = r.top + r.height / 2 - vc;
      l.style.transform = `translate3d(0, ${(-off * parseFloat(l.dataset.speed)).toFixed(1)}px, 0)`;
    }
    if (prog) prog.style.width = gp * 100 + "%";

    // 항로 레일: 파란 실선 채움 + 비행기 하강
    if (railTrail && planeWrap) {
      railTrail.style.strokeDashoffset = railLen * (1 - gp);
      const topPx = ((8 + gp * 784) / 800) * railEl.clientHeight;
      planeWrap.style.top = topPx.toFixed(1) + "px";
    }

    // 히어로 페이드 + 상승
    if (hero && heroInner) {
      const t = Math.min(1, sy / window.innerHeight);
      heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
      heroInner.style.transform = `translateY(${(t * -60).toFixed(1)}px)`;
    }

    // 스크롤텔링 단계 (즉각 반응 위해 실시간 스크롤 사용)
    if (scrolly) {
      const r = scrolly.getBoundingClientRect();
      const total = Math.max(1, scrolly.offsetHeight - window.innerHeight);
      const p = Math.min(0.999, Math.max(0, -r.top / total));
      const step = Math.floor(p * 4);
      if (step !== state.curStep) {
        state.curStep = step;
        panels.forEach((pn) => {
          const on = +pn.dataset.i === step;
          pn.style.opacity = on ? "1" : "0";
          pn.style.transform = on ? "translateY(0) scale(1)" : "translateY(24px) scale(.98)";
          pn.style.pointerEvents = on ? "auto" : "none";
        });
        idxs.forEach((ix) => {
          const on = +ix.dataset.i === step;
          const active = +ix.dataset.i <= step;
          ix.querySelector(".t-sidx-n").style.color = on ? "#0E4AEB" : active ? "#0F172A" : "#CBD5E1";
          ix.querySelector(".t-sidx-t").style.color = on ? "#0F172A" : active ? "#64748B" : "#CBD5E1";
          ix.style.paddingLeft = on ? "16px" : "0px";
          ix.style.borderLeft = on ? "3px solid #0E4AEB" : "3px solid transparent";
        });
      }
    }
    requestAnimationFrame(render);
  };
  render();

  // ---- 히어로 마우스 틸트 ----
  const card = root.querySelector(".t-fxcard");
  if (hero && card) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg)`;
    });
    hero.addEventListener("mouseleave", () => {
      card.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  }

  // ---- 카드/버튼 호버 ----
  root.querySelectorAll(".t-rcard").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      el.style.boxShadow = "0 24px 50px -24px rgba(15,23,42,.28)";
      el.style.transform = "translateY(-6px)";
      el.style.borderColor = "#0E4AEB";
    });
    el.addEventListener("mouseleave", () => {
      el.style.boxShadow = "none";
      el.style.transform = "none";
      el.style.borderColor = "#EEF1F6";
    });
  });
  root.querySelectorAll(".t-cta, .t-cta-light").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      if (el.classList.contains("t-cta")) el.style.background = "#0b3bc0";
      else el.style.transform = "translateY(-3px)";
    });
    el.addEventListener("mouseleave", () => {
      if (el.classList.contains("t-cta")) el.style.background = "#0E4AEB";
      else el.style.transform = "none";
    });
  });

  // 국기(퍼블릭 도메인 flagcdn) 이미지 HTML. Windows 이모지 미지원 대응.
  const flagImg = (code, w, h) =>
    `<img src="https://flagcdn.com/${code}.svg" alt="" style="width:${w}px; height:${h}px; object-fit:cover; border-radius:4px; vertical-align:middle; margin-right:10px; box-shadow:0 0 0 1px rgba(15,23,42,.08);" onerror="this.style.display='none'">`;

  // 약세국이 0개인 날 등 빈 상태 안내 (그리드 뒤에 1회 생성)
  function ensureEmptyNote() {
    let note = root.querySelector(".t-rank-empty");
    if (!note) {
      note = document.createElement("div");
      note.className = "t-rank-empty";
      note.style.cssText = "display:none; color:#D6E2FF; font-size:16px; padding:40px 0; text-align:center;";
      const grid = root.querySelector(".t-rankgrid");
      grid.parentNode.insertBefore(note, grid.nextSibling);
    }
    return note;
  }

  // ---- 랭킹 렌더 + 토글 ----
  function renderRank(mode) {
    state.rmode = mode;
    const data = RANKDATA[mode] || [];
    // 컬러 시스템: 유리(강세) = Red(포인트), 불리(약세) = Mid-Gray(탈강조).
    // Gray는 흰 배경 대비 4.5:1(AA) 충족하는 #767676을 마지노선으로 사용.
    const color = mode === "strong" ? "#EF4444" : "#767676";
    const tint = mode === "strong" ? "#FEF2F2" : "#F2F4F6";
    root.querySelectorAll(".t-rtab").forEach((t) => {
      const on = t.dataset.mode === mode;
      t.style.background = on ? "#fff" : "rgba(255,255,255,.14)";
      t.style.color = on ? color : "#fff";
    });
    // 카드 수에 따라 그리드를 꽉 채운다 (1개=100%, 2개=반반, 3개=3등분)
    const grid = root.querySelector(".t-rankgrid");
    if (grid) grid.style.gridTemplateColumns = `repeat(${Math.max(1, Math.min(data.length, 3))}, 1fr)`;
    const emptyNote = ensureEmptyNote();
    if (data.length === 0) {
      emptyNote.style.display = "";
      emptyNote.textContent =
        mode === "weak" ? "최근 한 달, 원화가 약세인 나라가 거의 없어요." : "표시할 나라가 없어요.";
    } else {
      emptyNote.style.display = "none";
    }
    root.querySelectorAll(".t-rcard").forEach((rcard) => {
      const d = data[+rcard.dataset.slot];
      if (!d) {
        rcard.style.display = "none"; // 해당 조건 나라 수가 3개 미만이면 빈 카드는 숨김
        return;
      }
      rcard.style.display = "";
      const num = rcard.querySelector(".rc-num");
      num.textContent = d.num;
      // 순위 번호는 중립(회색)으로 — 포인트 컬러는 변동률·추이·pill에만 집중
      num.style.color = "#94A3B8";
      num.style.background = "#F1F5F9";
      const badge = rcard.querySelector(".rc-badge");
      badge.textContent = d.badge;
      badge.style.color = color;
      rcard.querySelector(".rc-name").innerHTML =
        flagImg(d.code, 30, 22) + `<span style="vertical-align:middle;">${d.name}</span>`;
      rcard.querySelector(".rc-rate").textContent = d.rate;
      // 체감물가 pill: 서울 대비 절약(−)/추가(+). 물가 데이터 없으면 숨김.
      const cut = rcard.querySelector(".rc-cut");
      if (d.savePct != null) {
        cut.style.display = "";
        cut.textContent = `체감물가 ${d.savePct >= 0 ? "−" + d.savePct : "+" + -d.savePct}%`;
        cut.style.color = color;
        cut.style.background = tint;
      } else {
        cut.style.display = "none";
      }
      const line = rcard.querySelector(".rc-line");
      line.setAttribute("points", d.line);
      line.setAttribute("stroke", color);
      const area = rcard.querySelector(".rc-area");
      area.setAttribute("points", "0,48 " + d.line + " 240,48");
      area.setAttribute("fill", color);
      // "물가 보기 →": 강세 카드 중 물가 탭이 있는 나라만. pill 형태로 눈에 띄게.
      const link = rcard.querySelector(".rc-link");
      if (mode === "strong" && CITYDATA[d.code]) {
        link.style.display = "";
        link.textContent = "물가 보기 →";
        // CTA는 Brand Blue 독점 (데이터=Red와 분리해 행동 유도)
        link.style.color = "#0E4AEB";
        link.style.background = "#F5F8FF";
        link.style.padding = "6px 12px";
        link.style.borderRadius = "999px";
        rcard.dataset.city = d.code;
        rcard.style.cursor = "pointer";
      } else {
        link.style.display = "none";
        rcard.dataset.city = "";
        rcard.style.cursor = "default";
      }
    });
  }

  // /api/ranking에서 실데이터를 받아 랭킹 + 히어로를 채운다.
  async function loadRanking() {
    try {
      const res = await fetch("/api/ranking");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      RANKDATA = { strong: data.strong || [], weak: data.weak || [] };
      CITYDATA = data.cities || {};
      if (data.seoul) SEOULDATA = data.seoul;
      const basis = root.querySelector(".t-rank-basis");
      if (basis && data.currentDate) {
        const c = data.currentDate;
        basis.textContent = `기준일 ${c.slice(0, 4)}.${c.slice(4, 6)}.${c.slice(6, 8)} · 전날 종가`;
      }
      buildCityTabs();
      renderRank(state.rmode);
      updateHero();
      animate(state.cur); // 물가 섹션 기본 나라 채우기
    } catch (e) {
      console.error("랭킹 로드 실패", e);
      const nameEl = root.querySelector('.t-rcard[data-slot="0"] .rc-name');
      if (nameEl) nameEl.textContent = "불러오지 못했어요";
    }
  }

  // 히어로 카드(오늘의 추천)를 강세 1위로 채운다.
  function updateHero() {
    const top = RANKDATA.strong[0];
    if (!top) return;
    const set = (sel, text) => {
      const el = root.querySelector(sel);
      if (el) el.textContent = text;
    };
    const nameEl = root.querySelector(".t-hero-name");
    if (nameEl) nameEl.innerHTML = flagImg(top.code, 38, 28) + `<span style="vertical-align:middle;">${top.name}</span>`;
    // 히어로는 항상 강세 1위 → 배지도 빨강(좋음)
    const badgeEl = root.querySelector(".t-hero-badge");
    if (badgeEl) {
      badgeEl.textContent = top.badge;
      badgeEl.style.color = "#EF4444";
      badgeEl.style.background = "#FEF2F2";
    }
    set(".t-hero-recv", top.recv);
    set(
      ".t-hero-desc",
      top.is3moLow
        ? "최근 3개월 환율 중 가장 유리해요."
        : `최근 한 달 원화가 ${Math.abs(top.changePct).toFixed(1)}% 강해졌어요.`
    );
  }

  root.querySelectorAll(".t-rtab").forEach((tab) => {
    tab.addEventListener("click", () => renderRank(tab.dataset.mode));
  });

  // ---- 랭킹 카드 클릭 → 물가 섹션 도시 연결 ----
  root.querySelectorAll(".t-rcard").forEach((rcard) => {
    rcard.addEventListener("click", () => {
      const city = rcard.dataset.city;
      if (city) gotoCity(city);
    });
  });

  // ---- 물가 도시 탭 ----
  // 탭을 강세 랭킹 top3 나라로 구성 (데이터 있는 만큼만)
  function buildCityTabs() {
    const keys = Object.keys(CITYDATA);
    [...root.querySelectorAll(".t-citytab")].forEach((tab, i) => {
      const code = keys[i];
      if (code) {
        tab.style.display = "";
        tab.dataset.city = code;
        tab.textContent = CITYDATA[code].name;
      } else {
        tab.style.display = "none";
      }
    });
    state.cur = keys[0] || null;
    updateTabs();
  }

  function updateTabs() {
    root.querySelectorAll(".t-citytab").forEach((t) => {
      const on = t.dataset.city === state.cur;
      t.style.background = on ? "#0E4AEB" : "#fff";
      t.style.color = on ? "#fff" : "#64748B";
      t.style.border = on ? "none" : "1px solid #E2E8F0";
    });
  }

  function selectCity(key) {
    state.cur = key;
    updateTabs();
    animate(key);
  }

  function gotoCity(cityKey) {
    selectCity(cityKey);
    const ps = document.getElementById("price");
    if (ps) {
      const top = ps.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  root.querySelectorAll(".t-citytab").forEach((tab) => {
    tab.addEventListener("click", () => selectCity(tab.dataset.city));
  });

  // ---- 물가 막대 + 카운트업 ----
  function count(el, target, fmt) {
    if (prefersReducedMotion) {
      el.textContent = fmt(target);
      return;
    }
    const start = performance.now();
    const dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * e);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  }

  function animate(key) {
    const c = CITYDATA[key];
    if (!c) return; // 아직 데이터 없음
    root.querySelectorAll(".t-city-label").forEach((l) => (l.textContent = c.label));
    root.querySelectorAll(".t-item").forEach((item) => {
      const it = item.dataset.item;
      const ratio = Math.round((c[it] / SEOULDATA[it]) * 100);
      const bar = item.querySelector(".t-bar");
      const num = item.querySelector(".t-num");
      // 폭은 바로 설정 (CSS transition이 알아서 채워짐; rAF 미동작 환경에서도 안전)
      bar.style.width = ratio + "%";
      count(num, c[it], (v) => Math.round(v).toLocaleString("ko-KR") + "원");
    });
    const save = c.savePct;
    count(root.querySelector(".t-save"), save, (v) => Math.round(v));
    const desc =
      save >= 0
        ? `같은 세 가지를 ${c.name}에서 사면 서울보다 저렴해요.`
        : `같은 세 가지는 ${c.name}이 서울보다 조금 비싸요.`;
    root.querySelector(".t-save-desc").textContent = desc;
    root.querySelector(".t-save-fx").textContent = c.fx;
  }

  // ---- 등장 애니메이션 ----
  const io = new IntersectionObserver(
    (ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          en.target.style.opacity = "1";
          en.target.style.transform = "none";
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  // ---- 물가 섹션 최초 진입 시 1회 자동 재생 ----
  const pio = new IntersectionObserver(
    (ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          animate(state.cur);
          pio.disconnect();
        }
      });
    },
    { threshold: 0.35 }
  );
  const ps = root.querySelector(".t-price");
  if (ps) pio.observe(ps);

  // 초기 렌더 (서버에서 실데이터를 받아 랭킹·히어로를 채움)
  loadRanking();
})();
