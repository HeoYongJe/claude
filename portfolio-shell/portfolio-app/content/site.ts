// 실제 값으로 교체할 플레이스홀더 콘텐츠. 컴포넌트는 이 파일만 참조한다.

export const profile = {
  nameKo: "이유진",
  nameEn: "YUJIN LEE",
  logoShort: "Y",
  logoFull: "YUJIN",
  role: "Web Publisher",
  email: "your@email.com",
  socials: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "Behance", href: "https://behance.net/" },
    { label: "Blog", href: "https://blog.naver.com/" },
  ],
};

export const nav = [
  { label: "Intro", href: "#intro" },
  { label: "Works", href: "#works" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  eyebrow: "WEB PUBLISHER · PORTFOLIO 2026",
  titleLines: ["웹의 구조와", "인터랙션을", "설계합니다"],
  titleAccentWord: "설계",
  paragraph:
    "사용자의 흐름을 먼저 그리고, 그 위에 마크업과 스타일과 동작을 쌓습니다. 화면 하나하나가 자연스럽게 이어지도록 만드는 일을 합니다.",
  stats: [
    { value: "6+", label: "Years" },
    { value: "50+", label: "Projects" },
  ],
};

export const intro = {
  eyebrow: "01 — ABOUT",
  heading: ["보이지 않는 코드로", "보이는 경험을 만듭니다."],
  paragraphs: [
    "레이아웃과 인터랙션의 디테일이 사용자 경험을 좌우한다고 생각합니다. 픽셀 단위의 정렬과 자연스러운 모션까지 신경 써서 작업합니다.",
    "웹 표준과 접근성을 기본으로 두고, 어떤 환경에서도 일관되게 동작하는 화면을 만드는 것을 목표로 합니다.",
  ],
  cards: [
    { label: "이름", value: profile.nameEn },
    { label: "역할", value: "Web Publisher" },
    { label: "상태", value: "새 프로젝트 협업 가능 ●", accent: true },
  ],
  stats: [
    { to: 6, suffix: "+", label: "년 경력" },
    { to: 52, suffix: "+", label: "프로젝트" },
    { to: 100, suffix: "%", label: "웹표준 준수" },
    { to: 18, suffix: "", label: "협업 팀" },
  ],
};

export const skills = {
  eyebrow: "TOOLKIT",
  heading: "구현에 사용하는 도구",
  items: [
    {
      index: "D/01",
      title: "Design",
      description: "시안 편집 · 이미지 리터칭",
      chips: ["Photoshop", "Illustrator"],
    },
    {
      index: "M/02",
      title: "Markup",
      description: "구조 설계 · 스타일링 · 반응형",
      chips: ["마크업", "CSS3", "반응형", "Flexbox"],
    },
    {
      index: "S/03",
      title: "Script",
      description: "동작 구현 (학습 중)",
      chips: ["JavaScript"],
    },
  ],
};

export const works = {
  eyebrow: "02 — WORKS",
  heading: "선택된 작업물",
  description: "스크롤과 모션으로 이야기를 전달한 작업들입니다.",
  items: [
    {
      number: "01",
      year: "2026",
      category: "Interactive",
      title: "브랜드 인터랙티브 사이트",
      description:
        "스크롤에 반응하는 패럴랙스와 모션으로 브랜드 스토리를 전달하는 원페이지 사이트. 픽셀 단위로 다듬은 반응형 레이아웃.",
      tags: ["반응형", "패럴랙스", "인터랙션"],
      image: "/works/placeholder-01.svg",
      href: "#",
    },
    {
      number: "02",
      year: "2025",
      category: "Landing",
      title: "제품 소개 랜딩 페이지",
      description:
        "핵심 메시지를 스크롤 흐름에 맞춰 배치한 랜딩 페이지. 섹션 진입 모션과 CTA 강조로 전환에 집중.",
      tags: ["마크업", "CSS3", "Flex"],
      image: "/works/placeholder-02.svg",
      href: "#",
    },
    {
      number: "03",
      year: "2025",
      category: "Responsive",
      title: "반응형 웹사이트 리뉴얼",
      description:
        "데스크탑·태블릿·모바일 전 구간을 재정비한 반응형 퍼블리싱. 웹 표준 기반의 접근 가능한 구조.",
      tags: ["반응형", "마크업", "웹표준"],
      image: "/works/placeholder-03.svg",
      href: "#",
    },
  ],
};

export const contact = {
  eyebrow: "03 — CONTACT",
  headingLines: ["함께 만들", "준비가 되어 있어요."],
  paragraph: "새로운 프로젝트나 협업 제안, 언제든 편하게 연락 주세요.",
  ctaLabel: profile.email,
  channels: [
    { index: "01", label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    { index: "02", label: "GitHub", value: "github.com", href: profile.socials[0].href },
    { index: "03", label: "Behance", value: "behance.net", href: profile.socials[1].href },
    { index: "04", label: "Blog", value: "blog.naver.com", href: profile.socials[2].href },
  ],
  footerNote: `© 2026 ${profile.nameEn}. Built with web standards.`,
};
