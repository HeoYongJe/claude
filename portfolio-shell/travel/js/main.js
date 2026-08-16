// travel — 바닐라 JS.
// 부드러운 스크롤(lerp) · 로컬 패럴럭스 · 항로 레일 · 히어로 페이드/틸트 ·
// 랭킹 강세/약세 토글 · 나라 클릭 시 상세뷰(슬라이드 전환).

(function () {
  const root = document.getElementById("twrap");
  if (!root) return;

  // 랭킹·물가(국가별)·서울 기준가는 서버(/api/ranking)에서 실데이터로 받아온다.
  // CITYDATA[code] = {name,bigmac,cola,water,fx,savePct} (강세 top3 등 물가 데이터 있는 나라)
  let RANKDATA = { strong: [], weak: [] };
  let ALLDATA = [];               // 전체 국가 랭킹(환율 이득 내림차순)
  let COUNTS = null;              // { tracked, strong, weak, avgSave }
  let CITYDATA = {};
  let hasData = false;            // 스냅샷/라이브 중 하나라도 반영됐는지
  // 첫 로드 즉시 렌더용 스냅샷(배포 시점 데이터). 접속 직후 이걸로 그리고, loadRanking이 라이브로 교체.
  const SNAPSHOT = (typeof RANKING_SNAPSHOT !== "undefined") ? RANKING_SNAPSHOT : null;
  let SEOULDATA = { bigmac: 5500, cola: 2000, water: 1000 };

  // 도시·먹거리·꿀팁은 API에 없어 큐레이션(js/countryDetail.js)에서 가져온다.
  const DETAIL = (typeof COUNTRY_DETAIL !== "undefined") ? COUNTRY_DETAIL : {};
  // 도시 이미지: 위키백과에서 자동 수집(tools/fetch-city-images.js → js/cityImages.js).
  const CITY_IMG = (typeof CITY_IMAGES !== "undefined") ? CITY_IMAGES : {};

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
  const heroScrollEl = hero && hero.querySelector(".hero__scroll");
  const navEl = document.querySelector(".nav");
  const railTrail = root.querySelector(".t-rail-trail");
  const railEl = root.querySelector(".t-rail");
  const planeWrap = root.querySelector(".t-planewrap");
  const rankSecEl = document.getElementById("rank");
  const bgShiftEl = root.querySelector(".t-bgshift");
  const railLen = 784;

  // 트레일은 CSS 점선(dasharray) + 아래→위로 y2를 늘려 채운다(아래 render 루프).

  // ---- 연속 이징 렌더 루프(관성 스크롤 느낌) ----
  const render = () => {
    const y = window.pageYOffset;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(1, Math.max(0, y / max));
    state.sm += (target - state.sm) * 0.09;
    if (Math.abs(target - state.sm) < 0.0002) state.sm = target;
    const gp = state.sm;
    const sy = gp * max;

    // 패럴럭스: 레이아웃 스래싱 방지 위해 rect 읽기(read)와 transform 쓰기(write)를 분리.
    const vc = window.innerHeight / 2;
    const offs = layers.map((l) => { const r = l.getBoundingClientRect(); return r.top + r.height / 2 - vc; });
    layers.forEach((l, i) => {
      l.style.transform = `translate3d(0, ${(-offs[i] * parseFloat(l.dataset.speed)).toFixed(1)}px, 0)`;
    });
    if (prog) prog.style.transform = "scaleX(" + gp.toFixed(4) + ")";
    if (bgShiftEl) bgShiftEl.style.opacity = gp.toFixed(3); // B4: 스크롤 진행률로 배경 미세 블루(전용 요소 — 전체 트리 리캘크 없음)

    if (railTrail && planeWrap) {
      // 아래(792)에서 위로 채워지는 점선 + 채워진 선의 끝을 따라 위로 올라가는 비행기(스크롤 역방향)
      const y2 = 792 - gp * 784;
      railTrail.setAttribute("y2", y2.toFixed(1));
      const topPx = (y2 / 800) * railEl.clientHeight;
      planeWrap.style.top = topPx.toFixed(1) + "px";
    }

    if (hero && heroInner) {
      const t = Math.min(1, sy / window.innerHeight);
      heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
      heroInner.style.transform = `translateY(${(t * -60).toFixed(1)}px)`;
      // 하단 SCROLL 텍스트: 다음 섹션으로 넘어가면 스르륵 사라짐
      if (heroScrollEl) heroScrollEl.style.opacity = Math.max(0, 1 - t * 2.4).toFixed(3);
    }
    // nav: 최상단은 배경 없음, 스크롤하면 반투명 배경 생김
    if (navEl) navEl.classList.toggle("is-scrolled", y > 30);
    // 항로 레일: Hero~랭킹(상세뷰 포함)까지 표시. 섹션을 완전히 지나면(푸터쪽) 페이드아웃.
    if (railEl && rankSecEl) {
      const rb = rankSecEl.getBoundingClientRect();
      const pastRank = rb.bottom < window.innerHeight * 0.4;
      railEl.style.opacity = pastRank ? "0" : "1";
    }
    requestAnimationFrame(render);
  };
  render();

  // (히어로 카드 마우스 틸트 효과 제거 — 뒤틀림 없이 정적으로 둔다)

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
  // 받침 유무로 은/는 조사 선택 (예: "스위스는", "일본은")
  const josaEunNeun = (w) => {
    const s = String(w); const c = s.charCodeAt(s.length - 1);
    const hasJong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    return hasJong ? "은" : "는";
  };

  // ── 증감 수치 색: 방향(오름/내림)만 담당 (좋다/나쁘다 의미는 텍스트 라벨로) ──
  // 화면에 보이는 부호 기준: 오름(+, ▲) = 빨강 / 내림(−, ▼) = 파랑. 예외 없이 모든 지표에 동일 적용.
  const DIR_UP = "#EF4444", DIR_DOWN = "#0E4AEB";
  const DIR_UP_TINT = "#FEF2F2", DIR_DOWN_TINT = "#EAF1FF";
  const dirColor = (isUp) => (isUp ? DIR_UP : DIR_DOWN);
  const dirTint = (isUp) => (isUp ? DIR_UP_TINT : DIR_DOWN_TINT);

  // ── B1: 수치 카운트업(뷰포트 진입/토글 시 0→최종값 .6s easeOut). 겹침·NaN 방지, reduced-motion이면 즉시 최종값 ──
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el, to, fmt, dur = 600) {
    if (!el) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (reduceMotion || !isFinite(to)) { el.textContent = fmt(to); el._raf = 0; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      el._raf = p < 1 ? requestAnimationFrame(step) : 0;
    };
    el._raf = requestAnimationFrame(step);
  }
  // 요소의 현재 텍스트(뱃지 ▲x.x% / N개국 / ±xx%)를 파싱해 0에서 세어 올림. 알 수 없는 포맷은 그대로 둠.
  function animateCountup(el) {
    const txt = (el.textContent || "").trim(); let m;
    if ((m = txt.match(/^([▲▼])\s*([\d.]+)%$/))) countUp(el, +m[2], (v) => `${m[1]} ${v.toFixed(1)}%`);
    else if ((m = txt.match(/^(\d+)개국$/))) countUp(el, +m[1], (v) => `${Math.round(v)}개국`);
    else if ((m = txt.match(/^([−+])([\d.]+)%$/))) countUp(el, +m[2], (v) => `${m[1]}${Math.round(v)}%`);
  }
  const countIO = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { animateCountup(en.target); countIO.unobserve(en.target); } });
  }, { threshold: 0.6 });
  function observeCountups() {
    root.querySelectorAll(".rc-badge, .summary__stats .stat__val").forEach((el) => {
      if (el.offsetParent !== null) countIO.observe(el); // 표시 중인 것만
    });
  }

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
    // 환율 변동 방향 색: 강세(▲, 오름)=빨강 / 약세(▼, 내림)=파랑. (좋다/나쁨 의미는 탭 라벨로)
    const color = dirColor(mode === "strong");
    root.querySelectorAll(".t-rtab").forEach((t) => {
      const on = t.dataset.mode === mode;
      // 흰 배경 섹션: 활성 = 흰 pill + 잉크 텍스트 + 옅은 그림자, 비활성 = 투명 + muted.
      t.style.background = on ? "#fff" : "transparent";
      t.style.color = on ? "#0F172A" : "#64748B";
      t.style.boxShadow = on ? "0 1px 3px rgba(15,23,42,.10)" : "none";
      t.setAttribute("aria-selected", on ? "true" : "false");
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
      const rateEl = rcard.querySelector(".rc-rate");
      rateEl.textContent = d.rate;
      // 익숙한 시세 표기("100엔 = 917.60원")를 rc-rate 아래 작은 줄로.
      let rate2 = rcard.querySelector(".rc-rate2");
      if (!rate2) {
        rate2 = document.createElement("p");
        rate2.className = "rc-rate2";
        rateEl.parentNode.insertBefore(rate2, rateEl.nextSibling);
      }
      rate2.textContent = d.krwPer || "";
      const cut = rcard.querySelector(".rc-cut");
      if (d.savePct != null) {
        // 체감물가: 화면 표기 부호 기준. 저렴(−, 내림)=파랑 / 비쌈(+, 오름)=빨강.
        const up = d.savePct < 0; // savePct<0 이면 화면엔 "+"(비쌈)로 표기 → 오름
        cut.style.display = "";
        cut.textContent = `체감물가 ${pctText(d.savePct)}`;
        cut.style.color = dirColor(up);
        cut.style.background = dirTint(up);
      } else {
        cut.style.display = "none";
      }
      // 물가가 오히려 비싼 나라 경고(추천에 포함돼도 숨기지 않음)
      let warn = rcard.querySelector(".rc-warn");
      if (!warn) {
        warn = document.createElement("p");
        warn.className = "rc-warn";
        rcard.appendChild(warn);
      }
      if (d.savePct != null && d.savePct < 0) {
        warn.hidden = false;
        warn.textContent = "환율 유리 · 현지 물가 높음";
      } else {
        warn.hidden = true;
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
  // 품목 라인 아이콘(빅맥/콜라/생수)은 S() 정의 이후에 ITEM_SVG로 선언 — itemsHtml은 렌더 시점에 참조.

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
      const pcol = dirColor(pctNum > 0); // 오름(+)=빨강 / 내림(−)=파랑
      return `<div class="d-item">
        <span class="d-item__icon">${ITEM_SVG[key] || ""}</span>
        <span class="d-item__name">${label}</span>
        <div class="d-item__cmp">
          <div class="d-cmp__row"><span class="d-cmp__label">서울</span><span class="d-cmp__track"><span class="d-cmp__fill d-cmp__fill--seoul" data-w="${wSeoul}"></span></span><span class="d-cmp__amt d-cmp__amt--seoul">${won(seoul)}</span></div>
          <div class="d-cmp__row"><span class="d-cmp__label">${esc(local)}</span><span class="d-cmp__track"><span class="d-cmp__fill" data-w="${wLocal}" style="background:${dirColor(pctNum > 0)}"></span></span><span class="d-cmp__amt">${won(price)}</span></div>
        </div>
        <span class="d-item__pct" style="color:${pcol}">${pctNum > 0 ? "+" + pct : pct}%</span>
      </div>`;
    }).join("");
  }

  function citiesHtml(code) {
    const dd = DETAIL[code];
    if (!dd || !dd.cities) return "";
    return dd.cities.map((ci) => {
      const col = dirColor(ci.index > 0); // 물가지수 오름(+)=빨강 / 내림(−)=파랑
      // 우선순위: 수동 지정 ci.img → 자동 수집 CITY_IMG[도시명] → (없거나 로드 실패 시) 도시 아이콘 + '이미지 준비중'.
      const imgSrc = ci.img || CITY_IMG[ci.name] || "";
      const placeholder = `<div class="d-city__ph">${CITY_PH_SVG}<span>이미지 준비중</span></div>`;
      // img가 뜨면 플레이스홀더를 덮고, onerror로 img 제거 시 밑의 플레이스홀더가 드러난다.
      const thumbImg = imgSrc ? `<img src="${esc(imgSrc)}" alt="" loading="lazy" onerror="this.remove()">` : "";
      return `<div class="d-city">
        <div class="d-city__thumb">${placeholder}${thumbImg}</div>
        <div class="d-city__body">
          <div class="d-city__name">${esc(ci.name)}</div>
          <div class="d-city__idx">물가 지수 <b style="color:${col}">${ci.index > 0 ? "+" + ci.index : ci.index}%</b></div>
        </div>
      </div>`;
    }).join("");
  }

  // 먹거리: 음식명 키워드로 카테고리 라인아이콘 자동 선택 + 이름 + 한 줄 설명 + 가격.
  // 도시마다 이미지 준비 없이 { name, desc, price }만 채우면 됨. 아이콘 확장은 FOOD_RULES에 키워드 추가.
  function foodsHtml(code) {
    const dd = DETAIL[code];
    if (!dd || !dd.foods) return `<p class="d-empty">먹거리 정보 준비 중이에요.</p>`;
    return dd.foods.map((f, i) =>
      `<div class="d-food">
         <span class="d-food__icon">${pickFoodIcon(f.name)}</span>
         <div class="d-food__body">
           <div class="d-food__name">${esc(f.name)}</div>
           ${f.desc ? `<div class="d-food__desc">${esc(f.desc)}</div>` : ""}
         </div>
         <span class="d-food__price">약 ${f.price.toLocaleString("ko-KR")}원</span>
       </div>`
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

  // 먹거리 카테고리 라인 아이콘 — 전부 lucide 실제 경로 데이터. 색은 Primary(S()가 stroke 처리).
  // 15종: 기본(포크) 외 국물/전골/구이/생선/소고기/닭·오리/샌드위치/피자/크루아상/아이스크림/케이크/커피/음료/샐러드.
  const FOOD_SVG = {
    fork:      S('<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'),
    soup:      S('<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>'),
    pot:       S('<path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/>'),
    flame:     S('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    fish:      S('<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="M16.01 17.93l.23 1.4A2 2 0 0 1 14.26 21H8.5"/>'),
    beef:      S('<path d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1-2.29 7.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/><circle cx="12.5" cy="8.5" r="2.5"/>'),
    drumstick: S('<path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23"/><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/>'),
    sandwich:  S('<path d="m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777"/><path d="M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25"/><path d="M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9"/><path d="m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2"/><rect width="20" height="4" x="2" y="11" rx="1"/>'),
    pizza:     S('<path d="m12 14-1 1"/><path d="m13.75 18.25-1.25 1.42"/><path d="M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12"/><path d="M18.8 9.3a1 1 0 0 0 2.1 7.7"/><path d="M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z"/>'),
    croissant: S('<path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487"/><path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132"/><path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42"/><path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14"/><path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676"/>'),
    icecream:  S('<path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7"/><path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/>'),
    cake:      S('<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/>'),
    coffee:    S('<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>'),
    drink:     S('<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>'),
    salad:     S('<path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"/><path d="m13 12 4-4"/><path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"/>'),
  };
  // 위에서부터 먼저 매칭되는 규칙이 이김. 음식명 키워드 기반이라 순서가 중요.
  const FOOD_RULES = [
    { icon: "fish",      keys: ["회", "생선", "해산물", "스시", "초밥", "크랩", "고등어", "새우", "연어", "그라브락스", "바라문디", "피시앤칩스", "sushi", "seafood", "crab", "salmon"] },
    { icon: "pot",       keys: ["전골", "샤브", "훠궈", "퐁뒤", "라클렛", "핫팟", "hotpot", "fondue"] },
    { icon: "soup",      keys: ["탕", "찌개", "쌀국수", "국수", "면", "라멘", "수프", "똠얌", "파스타", "락사", "굴라시", "비고스", "페이조아다", "pho", "ramen", "noodle", "soup", "pasta"] },
    { icon: "drumstick", keys: ["치킨", "닭", "윙", "chicken", "drumstick"] },
    { icon: "flame",     keys: ["구이", "꼬치", "바베큐", "사테", "케밥", "레촌", "덕", "분짜", "슈하스코", "브라이", "미티테이", "grill", "kebab", "bbq", "satay"] },
    { icon: "sandwich",  keys: ["샌드위치", "버거", "반미", "타코", "부리토", "랩", "스뫼레브뢰드", "핫도그", "burger", "sandwich", "taco", "burrito", "hotdog"] },
    { icon: "beef",      keys: ["미트볼", "미트", "스테이크", "규카츠", "프리카델러", "보보티", "빌통", "스비치코바", "beef", "steak", "meatball"] },
    { icon: "pizza",     keys: ["피자", "pizza"] },
    { icon: "croissant", keys: ["크루아상", "크로와상", "데니시", "번", "페이스트리", "croissant"] },
    { icon: "icecream",  keys: ["아이스크림", "젤라또", "빙수", "파블로바", "할로할로", "gelato"] },
    { icon: "cake",      keys: ["케이크", "타르트", "바클라바", "스콘", "셈라", "팬케이크", "망고", "디저트", "빵", "브리가데이루", "폰치키", "트르델니크", "도보스", "파파나시", "cake", "tart", "scone"] },
    { icon: "coffee",    keys: ["커피", "플랫화이트", "라떼", "coffee", "latte"] },
    { icon: "drink",     keys: ["버블티", "밀크티", "음료", "콜라", "소다", "juice", "soda", "tea"] },
    { icon: "salad",     keys: ["샐러드", "과카몰레", "후무스", "salad"] },
  ];
  function pickFoodIcon(name) {
    const n = String(name).toLowerCase();
    for (const r of FOOD_RULES) if (r.keys.some((k) => n.includes(k.toLowerCase()))) return FOOD_SVG[r.icon];
    return FOOD_SVG.fork; // 기본 (밥/볶음 등)
  }

  // 도시 썸네일 폴백 아이콘(lucide building-2). 이미지 없거나 로드 실패 시 '이미지 준비중'과 함께 표시.
  const CITY_PH_SVG = S('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>');

  // 주요 품목 체감 물가 라인 아이콘(lucide hamburger / cup-soda / droplet). 색은 Primary.
  const ITEM_SVG = {
    bigmac: S('<path d="M12 16H4a2 2 0 1 1 0-4h16a2 2 0 1 1 0 4h-4.25"/><path d="M5 12a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2"/><path d="M5 16a2 2 0 0 0-2 2 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 2 2 0 0 0-2-2"/><path d="m6.67 12 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2"/>'),
    cola:   S('<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>'),
    water:  S('<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>'),
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
    // 순위 라벨은 그 나라의 환율 방향으로(강세=환율 이득 / 약세=원화 약세). state.rmode 아님.
    const strong = (d.changePct == null ? 0 : d.changePct) >= 0;
    detail.querySelector(".detail__flag").innerHTML =
      `<img src="https://flagcdn.com/${d.code}.svg" alt="" onerror="this.style.display='none'">`;
    detail.querySelector(".detail__name").textContent = d.name;
    const rankEl = detail.querySelector(".detail__rank");
    rankEl.textContent = strong ? `환율 이득 ${d.num}위` : `원화 약세 ${d.num}위`;
    rankEl.style.color = "#475569";        // 순위는 방향색 아님 → 중립
    rankEl.style.background = "#F1F5F9";

    // 상단 대표 숫자 = 최근 한 달 대비 환율 변동 (방향 색: 오름=빨강 / 내림=파랑)
    const fxVal = detail.querySelector(".detail__fx-val");
    if (fxVal) {
      fxVal.textContent = d.badge;
      fxVal.style.color = dirColor((d.changePct == null ? 0 : d.changePct) >= 0);
    }
    // head에도 익숙한 시세("100엔 = 917원") 표기
    const headKrw = detail.querySelector(".detail__krwper");
    if (headKrw) headKrw.textContent = d.krwPer || "—";

    // 파란 카드 = 물가 절약 지표 전용 (환율 표기 없음).
    // 대표(대형) 숫자 = 서울 대비 체감 절약/부담 %. 텍스트 전부 흰색.
    detail.querySelector(".d-rate").textContent = d.rate;
    const krwPerEl = detail.querySelector(".d-krwper");
    if (krwPerEl) krwPerEl.textContent = d.krwPer || "—";

    const idx = detail.querySelector(".d-index");          // 대표 숫자: 절약률(절댓값)
    const label = detail.querySelector(".d-save-label");
    const desc = detail.querySelector(".d-save-desc");
    const save = detail.querySelector(".d-save");           // 예상 절약/추가지출 금액
    const saveCap = detail.querySelector(".d-save-caption"); // 예상 절약/추가지출 라벨
    const warn = detail.querySelector(".d-savecard__warn");
    if (d.savePct != null) {
      const cheaper = d.savePct >= 0;
      idx.textContent = Math.abs(d.savePct);
      label.textContent = cheaper ? "서울 대비 체감 절약" : "서울 대비 물가 부담";
      desc.textContent = cheaper
        ? `같은 돈으로 ${d.name}에서 더 여유롭게 여행할 수 있어요.`
        : `${d.name}${josaEunNeun(d.name)} 서울보다 물가가 높은 편이에요.`;
      const amt = Math.round((BASELINE_7D * d.savePct) / 100 / 1000) * 1000;
      // 비싼 나라는 '절약'이 아니라 '추가 지출'로 라벨·값을 정합적으로 표기(문구 깨짐 방지).
      if (saveCap) saveCap.textContent = cheaper ? "예상 절약(추정)" : "예상 추가 지출(추정)";
      save.textContent = amt > 0 ? `약 ${amt.toLocaleString("ko-KR")}원`
        : amt < 0 ? `약 ${(-amt).toLocaleString("ko-KR")}원` : "서울과 비슷";
      // 환율은 유리하나 현지 물가가 비싼 나라: 경고 라벨 노출(숨기지 않음)
      if (warn) {
        if (!cheaper) { warn.hidden = false; warn.textContent = "환율은 유리하나 현지 물가는 높은 편이에요."; }
        else warn.hidden = true;
      }
    } else {
      idx.textContent = "—";
      label.textContent = "서울 대비 체감 절약";
      desc.textContent = "물가 데이터가 없어요.";
      if (saveCap) saveCap.textContent = "예상 절약(추정)";
      save.textContent = "—";
      if (warn) warn.hidden = true;
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
    if (!d || !detail) return;
    // 이미 상세가 열려 있으면(다른 나라 보는 중) 내용만 교체해 언제든 전환 가능하게.
    if (detailOpen) {
      clearTimeout(detailTimer);
      populateDetail(d);
      // 섹션 순차 등장 애니메이션 재생(전환 시에도 동일 연출)
      detail.classList.remove("is-in");
      void detail.getBoundingClientRect();
      detail.classList.add("is-in");
      animateDetailBars();
      scrollToRank();
      return;
    }
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

  // ---- 기준일 표기: 한 곳(currentDate)에서 랭킹·푸터 등 모든 표기를 통일 ----
  // 실데이터(currentDate) 있으면 실제 기준일 표시하고 '샘플' 문구는 쓰지 않는다.
  function setBasis(currentDate) {
    const fmt = currentDate && currentDate.length >= 8
      ? `${currentDate.slice(0, 4)}.${currentDate.slice(4, 6)}.${currentDate.slice(6, 8)}`
      : null;
    // 라이브 dot은 그대로 두고 텍스트 자식만 갱신(textContent로 통째 덮으면 dot이 사라짐)
    const rankBasisText = root.querySelector(".t-rank-basis__text");
    const liveDot = root.querySelector(".t-live-dot");
    const footBasis = document.querySelector(".foot-basis");
    if (rankBasisText) rankBasisText.textContent = fmt ? `기준일 ${fmt} · 전날 종가` : "기준일 · 전날 종가";
    if (liveDot) liveDot.style.display = fmt ? "" : "none"; // 실데이터(기준일) 있을 때만 펄스
    if (footBasis) footBasis.textContent = fmt ? `환율·물가 데이터 · 기준일 ${fmt} (전날 종가)` : "환율·물가 데이터 · 전날 종가 기준";
  }

  // ---- 요약 통계: 실제 카운트로 채움(하드코딩 제거) ----
  function updateSummary() {
    if (!COUNTS) return;
    const vals = root.querySelectorAll(".summary__stats .stat__val");
    const labels = root.querySelectorAll(".summary__stats .stat__label");
    if (vals[0]) vals[0].textContent = `${COUNTS.tracked}개국`;
    // 강세/약세 개수
    if (COUNTS.weak > 0) {
      if (labels[1]) labels[1].textContent = "원화 강세 · 약세";
      if (vals[1]) { vals[1].textContent = `강세 ${COUNTS.strong} · 약세 ${COUNTS.weak}`; vals[1].style.color = ""; }
    } else {
      if (labels[1]) labels[1].textContent = "이번 주 원화 강세";
      if (vals[1]) vals[1].textContent = `${COUNTS.strong}개국`;
    }
    // 3번째 = 체감물가 최대 절약(가장 유리한 나라 기준) — 데이터 있는 나라 중 최댓값.
    const saves = (ALLDATA || []).map((d) => d.savePct).filter((v) => v != null);
    if (vals[2] && saves.length) {
      const maxSave = Math.max(...saves);
      if (maxSave >= 0) {
        if (labels[2]) labels[2].textContent = "체감물가 최대 절약";
        vals[2].textContent = `−${maxSave}%`;
        vals[2].style.color = DIR_DOWN;
      } else {
        if (labels[2]) labels[2].textContent = "체감물가 최소 부담";
        vals[2].textContent = `+${-maxSave}%`;
        vals[2].style.color = DIR_UP;
      }
    }
  }

  // ---- /api/ranking 로드 (타임아웃 + 재시도로 콜드스타트/지연에 견고) ----
  // 한 번 fetch(신호로 timeoutMs 넘으면 중단). Vercel 콜드스타트가 느려도 UI가 멈추지 않게 한다.
  function fetchRankingOnce(timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(`${API_BASE}/api/ranking`, { signal: ctrl.signal, cache: "no-store" })
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .finally(() => clearTimeout(t));
  }

  // 데이터(스냅샷 또는 라이브)를 화면에 반영. 상세뷰가 열려 있으면 목록 재렌더는 건너뜀(전환 방해 방지).
  function applyRanking(data) {
    RANKDATA = { strong: data.strong || [], weak: data.weak || [] };
    ALLDATA = data.all || [];
    COUNTS = data.counts || null;
    CITYDATA = data.cities || {};
    if (data.seoul) SEOULDATA = data.seoul;
    setBasis(data.currentDate);
    updateSummary();
    if (!detailOpen) renderRank(state.rmode);
    updateHero();
    observeCountups(); // 뷰포트 진입 시 카운트업(값 세팅 후 관찰)
    hasData = true;
  }

  async function loadRanking(attempt = 0) {
    const setCard0 = (txt) => { const el = root.querySelector('.t-rcard[data-slot="0"] .rc-name'); if (el) el.textContent = txt; };
    try {
      const data = await fetchRankingOnce(20000);
      applyRanking(data); // 라이브 최신값으로 교체
    } catch (e) {
      console.error("랭킹 로드 실패", e, "시도", attempt + 1);
      if (attempt < 3) {
        // 콜드스타트로 첫 요청이 느리면, 잠시 후 재시도(그때는 서버 캐시가 데워져 빠르게 온다).
        if (!hasData) setCard0("불러오는 중…"); // 스냅샷이 이미 떠 있으면 건드리지 않음
        setTimeout(() => loadRanking(attempt + 1), 1800 * (attempt + 1));
      } else if (!hasData) {
        setCard0("불러오지 못했어요 — 새로고침해 주세요");
      }
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
      const up = (top.changePct == null ? 0 : top.changePct) >= 0;
      badgeEl.textContent = top.badge;
      badgeEl.style.color = dirColor(up);
      badgeEl.style.background = dirTint(up);
    }
    set(".t-hero-recv", top.recv);
    set(".t-hero-desc",
      top.is3moLow ? "최근 3개월 환율 중 가장 유리해요."
        : `최근 한 달 원화가 ${Math.abs(top.changePct).toFixed(1)}% 강해졌어요.`);
  }

  // ---- 이벤트 ----
  root.querySelectorAll(".t-rtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      renderRank(tab.dataset.mode);
      // 토글 시 표시 중인 뱃지 카운트업 재생(연타해도 countUp이 이전 rAF 취소 → 겹침/NaN 없음)
      root.querySelectorAll(".t-rcard").forEach((c) => {
        if (c.style.display !== "none") { const b = c.querySelector(".rc-badge"); if (b) animateCountup(b); }
      });
    });
  });
  root.querySelectorAll(".t-rcard").forEach((rcard) => {
    rcard.addEventListener("click", () => {
      const d = (RANKDATA[state.rmode] || [])[+rcard.dataset.slot];
      openDetail(d);
    });
  });
  // ---- 전체 랭킹(추적 통화 국가) 팝업 ----
  const modal = document.querySelector(".t-modal");
  const modalGrid = modal && modal.querySelector(".t-modal__grid");
  const modalCount = modal && modal.querySelector(".t-modal__count");
  const CCMAP = (typeof CURRENCY_COUNTRY_MAP !== "undefined") ? CURRENCY_COUNTRY_MAP : {};

  // 전체 랭킹(ALLDATA)이 있으면 그걸로, 없으면(구 API) 강세+약세 top으로 폴백.
  function modalList() {
    if (ALLDATA && ALLDATA.length) return ALLDATA;
    return [...(RANKDATA.strong || []), ...(RANKDATA.weak || [])];
  }

  function renderModal() {
    if (!modalGrid) return;
    const list = modalList();
    if (modalCount) modalCount.textContent = `${list.length}개국`;
    modalGrid.innerHTML = list.map((d, i) => {
      const up = (d.changePct == null ? 0 : d.changePct) >= 0;
      const cutHtml = d.savePct != null
        ? `<span class="t-mcountry__cut" style="color:${dirColor(d.savePct < 0)}">체감 ${pctText(d.savePct)}</span>`
        : `<span class="t-mcountry__cut t-mcountry__cut--none">체감 —</span>`;
      return `<button class="t-mcountry is-rank" data-code="${esc(d.code)}" type="button">
        <span class="t-mcountry__rank">${i + 1}</span>
        ${flagImg(d.code, 26, 19)}
        <span class="t-mcountry__main">
          <span class="t-mcountry__name">${esc(d.name)}</span>
          <span class="t-mcountry__rate">${esc(d.rate || "")}</span>
        </span>
        <span class="t-mcountry__metrics">
          <span class="t-mcountry__badge" style="color:${dirColor(up)}">${esc(d.badge || "")}</span>
          ${cutHtml}
        </span>
      </button>`;
    }).join("");
    // 나라 클릭 → 해당 상세뷰(열려 있으면 전환)
    const byCode = {};
    list.forEach((d) => { byCode[d.code] = d; });
    modalGrid.querySelectorAll(".t-mcountry.is-rank").forEach((el) => {
      el.addEventListener("click", () => {
        const d = byCode[el.dataset.code];
        if (!d) return;
        closeModal();
        openDetail(d);
      });
    });
  }

  function openModal() {
    if (!modal) return;
    renderModal();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  if (modal) {
    modal.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  const backBtn = root.querySelector(".t-detail-back");
  // "다른 나라 선택하기" → 전체 랭킹 팝업(다른 나라로 전환용)
  if (backBtn) backBtn.addEventListener("click", openModal);
  // "전체 랭킹 보기 →" → 전체 랭킹 팝업
  const summaryBtn = root.querySelector(".t-cta--summary");
  if (summaryBtn) summaryBtn.addEventListener("click", openModal);

  // ── 네비 / 히어로 액션 ──
  // "추천 랭킹" 버튼: 상세뷰가 열려 있으면 목록으로 복귀, 아니면 랭킹 섹션으로 스크롤.
  const goRank = () => { if (detailOpen) closeDetail(); else scrollToRank(); };
  const navRankBtn = document.querySelector(".t-nav-rank");
  if (navRankBtn) navRankBtn.addEventListener("click", goRank);
  const heroRankBtn = root.querySelector(".t-hero-rank");
  if (heroRankBtn) heroRankBtn.addEventListener("click", goRank);
  // 로고: 맨 위로 스크롤(상세뷰 열려 있으면 먼저 닫음).
  const navBrand = document.querySelector(".t-nav-brand");
  if (navBrand) navBrand.addEventListener("click", (e) => {
    e.preventDefault();
    if (detailOpen) closeDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  // 히어로 '오늘의 추천' 카드 클릭 → 해당(강세 1위) 나라 상세뷰.
  const heroCardEl = root.querySelector(".t-hero-card");
  const openHeroTop = () => {
    const top = RANKDATA.strong[0];
    if (!top) return;
    if (state.rmode !== "strong") renderRank("strong");
    openDetail(top);
  };
  if (heroCardEl) {
    heroCardEl.addEventListener("click", openHeroTop);
    heroCardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openHeroTop(); }
    });
  }

  // ---- 등장 애니메이션 ----
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-revealed"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  // ---- 히어로 배경 영상 ----
  (function heroVideo() {
    const v = document.querySelector(".hero__video-el");
    if (!v) return;
    // 모바일(≤560px)·모션최소화: 영상 대신 하늘 배경색 폴백(데이터·배터리·성능). autoplay 해제 후 종료.
    if (matchMedia("(max-width: 560px)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // 영상 다운로드도 막고 포스터(sky-poster.jpg)만 노출 — 데이터·배터리 절약
      v.removeAttribute("autoplay"); v.preload = "none"; try { v.pause(); } catch (e) {} return;
    }
    // 루프 경계 opacity 페이드는 제거함: 영상 위에 흰 가독성 그라디언트가 있어 opacity를 낮추면
    // 흰 배경이 비쳐 '하얗게 깜빡'였음. 느린 구름 영상은 네이티브 루프의 하드컷이 흰 깜빡임보다 훨씬 덜 거슬린다.
    v.style.opacity = "1";
    v.play().catch(() => {});
  })();

  // 접속 즉시 스냅샷으로 렌더(빈 화면·placeholder 방지) → 백그라운드로 라이브 최신값 갱신.
  if (SNAPSHOT) { try { applyRanking(SNAPSHOT); } catch (e) { console.warn("스냅샷 적용 실패", e); } }
  loadRanking();
})();
