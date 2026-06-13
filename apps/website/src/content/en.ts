// All site copy lives here so a German translation is a sibling file, not a refactor (§8.9).
// Real copy provided in the spec is used; placeholder slots use {{TOKENS}} and never invent stats.

export const en = {
  brand: {
    name: "AGORA",
    tagline: "Find your place.",
    subline:
      "The job app for international students in Berlin — visa-aware, German-level-aware, ATS-tested.",
  },

  nav: {
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Story", href: "#story" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Join the waitlist",
  },

  hero: {
    primaryCta: "Join the waitlist",
    secondaryCta: "Meet Ari",
    chips: ["✓ Visa eligible", "✓ B1 OK", "✓ 20h/week"],
  },

  footer: {
    threadLine: "You found your place.",
    cta: "Join the waitlist",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "#how-it-works" },
          { label: "Meet Ari", href: "#meet-ari" },
          { label: "FAQ", href: "#faq" },
        ],
      },
      {
        title: "Story",
        links: [
          { label: "Why Agora exists", href: "#story" },
          { label: "The labyrinth", href: "#labyrinth" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Impressum", href: "/impressum" },
          { label: "Datenschutz", href: "/datenschutz" },
        ],
      },
    ],
    social: "@joinagora",
    smallPrint: "Made in Berlin · Hosted in the EU.",
    langs: ["EN", "DE"],
  },
} as const

export type SiteContent = typeof en
