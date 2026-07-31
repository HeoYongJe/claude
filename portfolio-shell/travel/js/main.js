// travel — 바닐라 JS.
// 부드러운 스크롤(lerp) · 로컬 패럴럭스 · 항로 레일 · 히어로 페이드/틸트 ·
// 랭킹 강세/약세 토글 · 나라 클릭 시 상세뷰(슬라이드 전환).

(function () {
  const root = document.getElementById("twrap");
  if (!root) return;

  // 랭킹·물가(국가별)·서울 기준가는 서버(/api/ranking)에서 실데이터로 받아온다.
  // CITYDATA[code] = {name,bigmac,cola,water,fx,savePct} (강세 top3 등 물가 데이터 있는 나라)
  let RANKDATA = { strong: [], weak: [] };
  let CITYDATA = {};
  let SEOULDATA = { bigmac: 5500, cola: 2000, water: 1000 };

  // 도시·먹거리·꿀팁은 API에 없어 큐레이션(js/countryDetail.js)에서 가져온다.
  const DETAIL = (typeof COUNTRY_DETAIL !== "undefined") ? COUNTRY_DETAIL : {};

  // 예상 절약 금액 기준: 1인 7일 여행 기본 지출 가정 × 체감 절약률.
  const BASELINE_7D = 700000;

  const state = { rmode: "strong", sm: 0 };

  const isLocalDev = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API_BASE = isLocalDev ? "" : "https://travel-lyart-five.vercel.app";

  // ---- 요소 참조 ----
  const layers = [...root.querySelectorAll("[data-speed]")];
  const prog = root.querySelector(".t-progress");
  const hero = root.querySelector(".t-hero");
  const heroInner = hero && hero.querySelector(".hero__grid");
  const railTrail = root.querySelector(".t-rail-trail");
  const railEl = root.querySelector(".t-rail");
  const planeWrap = root.querySelector(".t-planewrap");
  const railLen = 784;

  if (railTrail) {
    railTrail.style.strokeDasharray = railLen;
    railTrail.style.strokeDashoffset = railLen;
  }

  // ---- 연속 이징 렌더 루프(관성 스크롤 느낌) ----
  const render = () => {
    const y = window.pageYOffset;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(1, Math.max(0, y / max));
    state.sm += (target - state.sm) * 0.09;
    if (Math.abs(target - state.sm) < 0.0002) state.sm = target;
    const gp = state.sm;
    const sy = gp * max;

    const vc = window.innerHeight / 2;
    for (const l of layers) {
      const r = l.getBoundingClientRect();
      const off = r.top + r.height / 2 - vc;
      l.style.transform = `translate3d(0, ${(-off * parseFloat(l.dataset.speed)).toFixed(1)}px, 0)`;
    }
    if (prog) prog.style.width = gp * 100 + "%";

    if (railTrail && planeWrap) {
      railTrail.style.strokeDashoffset = railLen * (1 - gp);
      const topPx = ((8 + gp * 784) / 800) * railEl.clientHeight;
      planeWrap.style.top = topPx.toFixed(1) + "px";
    }

    if (hero && heroInner) {
      const t = Math.min(1, sy / window.innerHeight);
      heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
      heroInner.style.transform = `translateY(${(t * -60).toFixed(1)}px)`;
    }
    requestAnimationFrame(render);
  };
  render();

  // ---- 히어로 마우스 틸트 ----
  const heroCard = root.querySelector(".t-fxcard");
  if (hero && heroCard) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      heroCard.style.transform = `rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg)`;
    });
    hero.addEventListener("mouseleave", () => {
      heroCard.style.transform = "rotateY(0deg) rotateX(0deg)";
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

  // 국기(flagcdn) 이미지.
  const flagImg = (code, w, h) =>
    `<img src="https://flagcdn.com/${code}.svg" alt="" style="width:${w}px;height:${h}px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:10px;box-shadow:0 0 0 1px rgba(15,23,42,.08);" onerror="this.style.display='none'">`;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pctText = (p) => `${p >= 0 ? "−" + p : "+" + -p}%`; // 체감물가: 절약(양수)을 −로 표기

  // ---- 스파크라인: 카드가 화면에 들어오면 선이 서서히 그려진다 ----
  // 선을 대시로 감춰두고(prepSpark), 카드가 뷰포트에 들어오면 dashoffset 0으로 애니메이션.
  function prepSpark(line) {
    const len = line.getTotalLength ? line.getTotalLength() : 260;
    line.style.transition = "none";
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    void line.getBoundingClientRect();
    line.style.transition = ""; // CSS(.rc-line)의 transition 사용
  }
  const sparkIO = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const line = en.target.querySelector(".rc-line");
      if (line) requestAnimationFrame(() => { line.style.strokeDashoffset = "0"; });
      sparkIO.unobserve(en.target);
    });
  }, { threshold: 0.35 });
  function observeSparks() {
    root.querySelectorAll(".t-rcard").forEach((c) => {
      if (c.style.display !== "none") sparkIO.observe(c);
    });
  }

  function ensureEmptyNote() {
    let note = root.querySelector(".t-rank-empty");
    if (!note) {
      note = document.createElement("div");
      note.className = "t-rank-empty";
      note.style.cssText = "display:none;color:#94A3B8;font-size:16px;padding:40px 0;text-align:center;";
      const grid = root.querySelector(".t-rankgrid");
      grid.parentNode.insertBefore(note, grid.nextSibling);
    }
    return note;
  }

  // ---- 랭킹 렌더 + 토글 ----
  function renderRank(mode) {
    state.rmode = mode;
    const data = RANKDATA[mode] || [];
    // 강세(유리)=빨강 포인트, 약세(불리)=회색계열.
    const color = mode === "strong" ? "#EF4444" : "#767676";
    const tint = mode === "strong" ? "#FEF2F2" : "#F2F4F6";
    root.querySelectorAll(".t-rtab").forEach((t) => {
      const on = t.dataset.mode === mode;
      // 흰 배경 섹션: 활성 = 흰 pill + 잉크 텍스트 + 옅은 그림자, 비활성 = 투명 + muted.
      t.style.background = on ? "#fff" : "transparent";
      t.style.color = on ? "#0F172A" : "#64748B";
      t.style.boxShadow = on ? "0 1px 3px rgba(15,23,42,.10)" : "none";
    });
    const grid = root.querySelector(".t-rankgrid");
    if (grid) grid.dataset.count = String(Math.max(1, Math.min(data.length, 3)));
    const emptyNote = ensureEmptyNote();
    if (data.length === 0) {
      emptyNote.style.display = "";
      emptyNote.textContent = mode === "weak" ? "최근 한 달, 원화가 약세인 나라가 거의 없어요." : "표시할 나라가 없어요.";
    } else {
      emptyNote.style.display = "none";
    }
    root.querySelectorAll(".t-rcard").forEach((rcard) => {
      const d = data[+rcard.dataset.slot];
      if (!d) {
        rcard.style.display = "none";
        return;
      }
      rcard.style.display = "";
      const num = rcard.querySelector(".rc-num");
      num.textContent = d.num;
      num.style.color = "#94A3B8";
      num.style.background = "#F1F5F9";
      const badge = rcard.querySelector(".rc-badge");
      badge.textContent = d.badge;
      badge.style.color = color;
      rcard.querySelector(".rc-name").innerHTML =
        flagImg(d.code, 30, 22) + `<span style="vertical-align:middle;">${esc(d.name)}</span>`;
      rcard.querySelector(".rc-rate").textContent = d.rate;
      const cut = rcard.querySelector(".rc-cut");
      if (d.savePct != null) {
        // 체감물가 색은 변동률 모드가 아니라 "저렴(−)=빨강 / 비쌈(+)=회색" 부호 기준.
        const cheaper = d.savePct >= 0;
        cut.style.display = "";
        cut.textContent = `체감물가 ${pctText(d.savePct)}`;
        cut.style.color = cheaper ? "#EF4444" : "#767676";
        cut.style.background = cheaper ? "#FEF2F2" : "#F2F4F6";
      } else {
        cut.style.display = "none";
      }
      const line = rcard.querySelector(".rc-line");
      line.setAttribute("points", d.line);
      line.setAttribute("stroke", color);
      const area = rcard.querySelector(".rc-area");
      area.setAttribute("points", "0,48 " + d.line + " 240,48");
      area.setAttribute("fill", color);
      prepSpark(line);
      // 이제 모든 카드는 클릭 시 상세뷰로 이동.
      const link = rcard.querySelector(".rc-link");
      link.textContent = "상세 보기 →";
      rcard.style.cursor = "pointer";
    });
    observeSparks(); // 렌더 후(토글 포함) 화면에 보이면 스파크라인 그리기
  }

  // ---- 나라 상세뷰 ----
  const rankSec = document.getElementById("rank");
  const rankView = root.querySelector(".t-rankview");
  const detail = root.querySelector(".t-detail");

  const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
  const ITEM_ICONS = { bigmac: "🍔", cola: "🥤", water: "💧" };

  // 품목 체감 물가: 아이콘 + 이름 + [서울/현지 두 막대·금액] + 큰 %.
  function itemsHtml(code, countryName) {
    const c = CITYDATA[code];
    if (!c) return `<p class="d-empty">이 나라는 품목별 물가 데이터가 아직 없어요.</p>`;
    const items = [["빅맥", "bigmac"], ["코카콜라 500ml", "cola"], ["생수 500ml", "water"]];
    const local = countryName || "현지";
    return items.map(([label, key]) => {
      const price = c[key], seoul = SEOULDATA[key];
      if (price == null || !seoul) return "";
      const max = Math.max(price, seoul);
      const wSeoul = Math.round((seoul / max) * 100);
      const wLocal = Math.round((price / max) * 100);
      const pctNum = (price / seoul - 1) * 100;
      const pct = pctNum.toFixed(1);
      const pcol = pctNum <= 0 ? "#EF4444" : "#767676"; // 저렴(−)=빨강 / 비쌈(+)=회색
      return `<div class="d-item">
        <span class="d-item__icon">${ITEM_ICONS[key] || ""}</span>
        <span class="d-item__name">${label}</span>
        <div class="d-item__cmp">
          <div class="d-cmp__row"><span class="d-cmp__label">서울</span><span class="d-cmp__track"><span class="d-cmp__fill d-cmp__fill--seoul" data-w="${wSeoul}"></span></span><span class="d-cmp__amt d-cmp__amt--seoul">${won(seoul)}</span></div>
          <div class="d-cmp__row"><span class="d-cmp__label">${esc(local)}</span><span class="d-cmp__track"><span class="d-cmp__fill" data-w="${wLocal}"></span></span><span class="d-cmp__amt">${won(price)}</span></div>
        </div>
        <span class="d-item__pct" style="color:${pcol}">${pctNum > 0 ? "+" + pct : pct}%</span>
      </div>`;
    }).join("");
  }

  function citiesHtml(code) {
    const dd = DETAIL[code];
    if (!dd || !dd.cities) return "";
    return dd.cities.map((ci) => {
      const cheaper = ci.index <= 0;
      const col = cheaper ? "#EF4444" : "#767676";
      return `<div class="d-city">
        <div class="d-city__thumb"></div>
        <div class="d-city__body">
          <div class="d-city__name">${esc(ci.name)}</div>
          <div class="d-city__idx">물가 지수 <b style="color:${col}">${ci.index > 0 ? "+" + ci.index : ci.index}%</b></div>
        </div>
      </div>`;
    }).join("");
  }

  // 먹거리: 아이콘 대신 깔끔한 번호(01/02/03).
  function foodsHtml(code) {
    const dd = DETAIL[code];
    if (!dd || !dd.foods) return `<p class="d-empty">먹거리 정보 준비 중이에요.</p>`;
    return dd.foods.map((f, i) =>
      `<div class="d-food"><span class="d-food__num">${String(i + 1).padStart(2, "0")}</span><div><div class="d-food__name">${esc(f.name)}</div><div class="d-food__price">약 ${f.price.toLocaleString("ko-KR")}원</div></div></div>`
    ).join("");
  }

  // 꿀팁: 모던 라인 아이콘(SVG). cat → 아이콘 키 매핑.
  const S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const TIP_SVG = {
    money: S('<path d="M4 8a8 3 0 1 0 16 0 8 3 0 1 0-16 0"/><path d="M4 8v8a8 3 0 0 0 16 0V8"/><path d="M4 12a8 3 0 0 0 16 0"/>'),
    transit: S('<rect x="6" y="4" width="12" height="12" rx="3"/><path d="M6 11h12"/><path d="M8.5 20l-1.5 2M15.5 20l1.5 2"/><circle cx="9" cy="13.5" r=".6" fill="currentColor"/><circle cx="15" cy="13.5" r=".6" fill="currentColor"/>'),
    bag: S('<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    shield: S('<path d="M12 3l7 3v5c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z"/>'),
    globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.1 0 17M12 3.5c-2.5 2.4-2.5 14.1 0 17"/>'),
    card: S('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h3"/>'),
    wifi: S('<path d="M4 9a13 13 0 0 1 16 0M7 12.5a8 8 0 0 1 10 0M10 16a3 3 0 0 1 4 0"/><circle cx="12" cy="19" r=".8" fill="currentColor"/>'),
    food: S('<path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9"/>'),
    tag: S('<path d="M20 12l-8 8-9-9V4h7z"/><circle cx="8" cy="8" r="1.3"/>'),
    info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8" fill="currentColor"/>'),
  };
  const CAT_ICON = {
    환전: "money", 교통: "transit", 쇼핑: "bag", 흥정: "tag",
    치안: "shield", 안전: "shield", 주의: "shield", 소매치기: "shield", 벌금: "shield",
    문화: "globe", 매너: "globe", 결제: "card", 카드: "card", "VPN": "wifi", 인터넷: "wifi",
    물가: "food", 식비: "food", 먹거리: "food", 야시장: "food", 호커센터: "food", 차찬텡: "food",
  };

  function tipsHtml(code) {
    const dd = DETAIL[code];
    if (!dd || !dd.tips) return `<p class="d-empty">꿀팁 준비 중이에요.</p>`;
    return dd.tips.map((t) => {
      const icon = TIP_SVG[CAT_ICON[t.cat] || "info"];
      return `<div class="d-tip"><span class="d-tip__icon">${icon}</span><div><div class="d-tip__title">${esc(t.title)}</div><div class="d-tip__text">${esc(t.text)}</div></div></div>`;
    }).join("");
  }

  function populateDetail(d) {
    const strong = state.rmode === "strong";
    detail.querySelector(".detail__flag").innerHTML =
      `<img src="https://flagcdn.com/${d.code}.svg" alt="" onerror="this.style.display='none'">`;
    detail.querySelector(".detail__name").textContent = d.name;
    const rankEl = detail.querySelector(".detail__rank");
    rankEl.textContent = strong ? `오늘의 ${d.num}위` : `약세 ${d.num}위`;
    rankEl.style.color = strong ? "#EF4444" : "#767676";
    rankEl.style.background = strong ? "#FEF2F2" : "#F2F4F6";

    // 파란 절약 카드 (텍스트 전부 흰색 — 부호 색 사용 안 함)
    detail.querySelector(".d-rate").textContent = d.rate;
    detail.querySelector(".d-fx").textContent = d.badge;

    const idx = detail.querySelector(".d-index");        // 큰 숫자(절약률)
    const label = detail.querySelector(".d-save-label");
    const desc = detail.querySelector(".d-save-desc");
    const save = detail.querySelector(".d-save");         // 예상 절약 금액
    if (d.savePct != null) {
      const cheaper = d.savePct >= 0;
      idx.textContent = Math.abs(d.savePct);
      label.textContent = cheaper ? "서울 대비 체감 절약" : "서울 대비 물가 부담";
      desc.textContent = cheaper
        ? `같은 돈으로 ${d.name}에서 더 여유롭게 여행할 수 있어요.`
        : `${d.name}은 서울보다 물가가 높은 편이에요.`;
      const amt = Math.round((BASELINE_7D * d.savePct) / 100 / 1000) * 1000;
      save.textContent = amt > 0 ? `약 ${amt.toLocaleString("ko-KR")}원`
        : amt < 0 ? `약 ${(-amt).toLocaleString("ko-KR")}원 더` : "서울과 비슷";
    } else {
      idx.textContent = "—";
      label.textContent = "서울 대비 체감 절약";
      desc.textContent = "물가 데이터가 없어요.";
      save.textContent = "—";
    }

    detail.querySelector(".d-items").innerHTML = itemsHtml(d.code, d.name);
    const cities = citiesHtml(d.code);
    detail.querySelector(".d-cities").innerHTML = cities || `<p class="d-empty">도시 정보 준비 중이에요.</p>`;
    detail.querySelector(".d-cities-note").textContent = cities ? "" : "준비 중";
    detail.querySelector(".d-foods").innerHTML = foodsHtml(d.code);
    detail.querySelector(".d-tips").innerHTML = tipsHtml(d.code);
  }

  function animateDetailBars() {
    detail.querySelectorAll(".d-cmp__fill").forEach((el) => {
      el.style.width = "0%";
      requestAnimationFrame(() => { el.style.width = el.dataset.w + "%"; });
    });
  }

  let detailTimer = null;         // 전환 setTimeout 핸들 (연타 시 레이스 방지)
  let detailOpen = false;
  const scrollToRank = () => {
    const top = rankSec.getBoundingClientRect().top + window.pageYOffset - 70;
    window.scrollTo({ top, behavior: "smooth" });
  };

  function openDetail(d) {
    if (!d || !detail || detailOpen) return;
    detailOpen = true;
    clearTimeout(detailTimer);
    populateDetail(d);
    rankView.classList.add("is-out");
    rankSec.classList.add("is-detail");
    scrollToRank();
    detailTimer = setTimeout(() => {
      rankView.hidden = true;
      detail.hidden = false;
      detail.setAttribute("aria-hidden", "false");
      void detail.getBoundingClientRect();
      detail.classList.add("is-in");
      animateDetailBars();
    }, 450);
  }

  function closeDetail() {
    if (!detail || !detailOpen) return;
    detailOpen = false;
    clearTimeout(detailTimer);
    detail.classList.remove("is-in");
    detailTimer = setTimeout(() => {
      detail.hidden = true;
      detail.setAttribute("aria-hidden", "true");
      rankView.hidden = false;
      void rankView.getBoundingClientRect();
      rankView.classList.remove("is-out");
      rankSec.classList.remove("is-detail");
      scrollToRank();
    }, 400);
  }

  // ---- /api/ranking 로드 ----
  async function loadRanking() {
    try {
      const res = await fetch(`${API_BASE}/api/ranking`);
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
      renderRank(state.rmode);
      updateHero();
    } catch (e) {
      console.error("랭킹 로드 실패", e);
      const nameEl = root.querySelector('.t-rcard[data-slot="0"] .rc-name');
      if (nameEl) nameEl.textContent = "불러오지 못했어요";
    }
  }

  function updateHero() {
    const top = RANKDATA.strong[0];
    if (!top) return;
    const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
    const nameEl = root.querySelector(".t-hero-name");
    if (nameEl) nameEl.innerHTML = flagImg(top.code, 38, 28) + `<span style="vertical-align:middle;">${esc(top.name)}</span>`;
    const badgeEl = root.querySelector(".t-hero-badge");
    if (badgeEl) {
      badgeEl.textContent = top.badge;
      badgeEl.style.color = "#EF4444";
      badgeEl.style.background = "#FEF2F2";
    }
    set(".t-hero-recv", top.recv);
    set(".t-hero-desc",
      top.is3moLow ? "최근 3개월 환율 중 가장 유리해요."
        : `최근 한 달 원화가 ${Math.abs(top.changePct).toFixed(1)}% 강해졌어요.`);
  }

  // ---- 이벤트 ----
  root.querySelectorAll(".t-rtab").forEach((tab) => {
    tab.addEventListener("click", () => renderRank(tab.dataset.mode));
  });
  root.querySelectorAll(".t-rcard").forEach((rcard) => {
    rcard.addEventListener("click", () => {
      const d = (RANKDATA[state.rmode] || [])[+rcard.dataset.slot];
      openDetail(d);
    });
  });
  const backBtn = root.querySelector(".t-detail-back");
  if (backBtn) backBtn.addEventListener("click", closeDetail);

  // ---- 등장 애니메이션 ----
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-revealed"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  loadRanking();
})();
