// YUJIN Portfolio — scroll interactions (vanilla JS, no dependencies)
// 표현(색·배경·패딩)은 styles.css가 담당하고, 여기서는 상태 클래스와
// 스크롤 값에 비례하는 값(진행률·패럴랙스)만 다룬다.
(function () {
  const q = (s) => document.querySelector(s);
  const bar = q("#yj-bar");
  const nav = q("#yj-nav");
  const eyebrow = q("#yj-eyebrow");
  const title = q("#yj-title");
  const sub = q("#yj-sub");
  const visual = q("#yj-visual");
  const navLinks = Array.from(document.querySelectorAll(".yj-navlink"));
  const sections = ["top", "works", "about", "contact"].map((id) => document.getElementById(id));

  // ---- scroll: progress bar, nav state, hero parallax, active link ----
  let ticking = false;
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("is-solid", y > 60);
    if (y < window.innerHeight * 1.2) {
      if (eyebrow) eyebrow.style.opacity = String(Math.max(0, 1 - y / 300));
      if (title) title.style.transform = `translateY(${y * -0.05}px)`;
      if (sub) sub.style.opacity = String(Math.max(0, 1 - y / 420));
      if (visual) visual.style.transform = `translateY(${y * 0.12}px)`;
    }
    const mid = y + window.innerHeight * 0.4;
    let cur = "top";
    sections.forEach((sec) => { if (sec && sec.offsetTop <= mid) cur = sec.id; });
    const map = { top: "top", works: "works", principles: "works", about: "about", contact: "contact" };
    const active = map[cur] || cur;
    navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("data-nav") === active));
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---- reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal]").forEach((el, i) => {
    el.style.transitionDelay = ((i % 3) * 0.09) + "s";
    io.observe(el);
  });

  // ---- hero connectors: draw paths, then pop nodes ----
  function runDraw() {
    const bases = Array.from(document.querySelectorAll(".yj-base path"));
    const nodes = Array.from(document.querySelectorAll(".yj-nodes circle"));
    bases.forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.transition = "none";
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect(); // reflow
      p.style.transition = "stroke-dashoffset .55s ease";
      p.style.transitionDelay = (i * 0.16) + "s";
      p.style.strokeDashoffset = "0";
    });
    const total = bases.length * 0.16 + 0.55;
    nodes.forEach((c, i) => {
      c.style.transformBox = "fill-box";
      c.style.transformOrigin = "center";
      c.style.transition = "none";
      c.style.opacity = "0";
      c.style.transform = "scale(0)";
      c.getBoundingClientRect();
      c.style.transition = "opacity .3s ease, transform .4s cubic-bezier(.34,1.56,.64,1)";
      c.style.transitionDelay = (total * 0.5 + i * 0.08) + "s";
      c.style.opacity = "1";
      c.style.transform = "scale(1)";
    });
  }
  setTimeout(runDraw, 350);
})();
