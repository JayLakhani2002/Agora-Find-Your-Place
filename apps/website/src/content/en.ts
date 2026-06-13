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

  story: {
    eyebrow: "The story",
    beats: [
      {
        id: "arrive",
        quote: "I arrived in Berlin with a CV and no idea what I was legally allowed to do.",
        caption: "Day one. A degree, a visa, and a wall of question marks.",
      },
      {
        id: "boards",
        quote:
          "Every job board showed me jobs I couldn't take. Every application vanished into an ATS.",
        caption: "Two hundred tabs later: still guessing, still silent inboxes.",
      },
      {
        id: "agora",
        quote:
          "So we built the app we needed: it knows your visa, your hours, your German — and only shows you what fits.",
        caption: "No guessing. No noise. Just jobs you can actually take.",
      },
    ] as const,
    origin: {
      title: "Why “Agora”?",
      body: "The agora was the heart of the Greek city — the marketplace where strangers found their people and their work. A name like “JobApp” tells you what a product is. Agora tells you what it's for: belonging somewhere new. Jobs names a feature. Agora names the feeling.",
    },
  },

  labyrinth: {
    eyebrow: "The problem, named",
    headline: "The German system is a labyrinth.",
    body: "The 140-day rule. The 20-hour cap. Minijob thresholds, BAföG limits, Werkstudent contracts — and behind every application, an ATS portal silently filtering you out. Nobody hands you the map. Agora models the rules, so you don't have to learn them the hard way.",
    chips: ["140-day rule ✓ modeled", "§ Chancenkarte ✓", "Werkstudent ✓", "Minijob ✓"],
  },

  howItWorks: {
    eyebrow: "How it works",
    headline: "Swipe. Draft. You apply.",
    steps: [
      {
        id: "profile",
        kicker: "01 · Profile",
        title: "One CV in, a real profile out",
        body: "Upload your CV once. Agora reads your skills, your visa type, your German level and your hours — and builds the profile every match is checked against.",
      },
      {
        id: "discover",
        kicker: "02 · Discover",
        title: "A deck that knows your visa",
        body: "A daily swipe deck of jobs you're legally eligible for — each card scored against your profile. If it's in the deck, you can take it. Try the cards →",
      },
      {
        id: "apply",
        kicker: "03 · Apply",
        title: "German documents, scored",
        body: "Agora drafts your German CV and Anschreiben, then scores them across six dimensions before you ever see them. Smart autofill saves you the typing — and you always click the company's own Submit button.",
      },
      {
        id: "track",
        kicker: "04 · Track",
        title: "Your pipeline, with follow-ups",
        body: "Every application in one board — with polite German follow-up drafts ready when an employer goes quiet, and interview prep when they don't.",
      },
    ] as const,
    demoJobs: [
      {
        title: "Werkstudent Frontend",
        company: "Zalando SE · Berlin",
        score: "9.1",
        chips: ["✓ Visa", "✓ B1 OK", "✓ 20h"],
      },
      {
        title: "Working Student Data",
        company: "N26 · Berlin",
        score: "8.7",
        chips: ["✓ Visa", "✓ English OK", "✓ 16h"],
      },
      {
        title: "Werkstudent Marketing",
        company: "HelloFresh · Berlin",
        score: "8.4",
        chips: ["✓ Visa", "✓ B2", "✓ 20h"],
      },
      {
        title: "Working Student Design",
        company: "Contentful · Berlin",
        score: "8.9",
        chips: ["✓ Visa", "✓ English OK", "✓ 18h"],
      },
    ] as const,
    swipeHint: "Drag a card — left to skip, right to save.",
    quality: {
      score: "9.3",
      label: "Application quality",
      dimensions: [
        { label: "Role fit", value: 9.5 },
        { label: "ATS parse", value: 9.4 },
        { label: "German quality", value: 9.1 },
        { label: "Truthfulness", value: 9.8 },
        { label: "Tone", value: 9.0 },
        { label: "Completeness", value: 9.2 },
      ] as const,
    },
  },

  why: {
    eyebrow: "Why it wins",
    headline: "Built for your situation, not just your skills.",
    columns: [
      {
        title: "Visa-aware by design",
        body: "Your work-hour limits, your permit type, your 140 days — modeled in the matching itself. Agora never shows you a job you can't legally take.",
      },
      {
        title: "Tested against real German ATS",
        body: "Your documents are tested against the ATS platforms German companies actually use — Softgarden, Personio, d.vinci — so your CV reaches a human, not a filter.",
      },
      {
        title: "From first Minijob to first full-time",
        body: "Agora grows with you: the Werkstudent job that fits your semester, the follow-up that lands the interview, the full-time role after graduation.",
      },
    ] as const,
    // Rendered ONLY when SHOW_STATS=true. Values stay placeholders until real numbers exist.
    stats: [
      { value: "{{N}}", label: "beta users" },
      { value: "{{N}}", label: "applications generated" },
      { value: "{{N}}%", label: "ATS parse rate" },
    ] as const,
  },

  employers: {
    eyebrow: "Where the jobs come from",
    headline: "Jobs you'll find on Agora come from companies like these.",
    // Honesty note rendered in the band — these are examples, not partnerships.
    note: "Examples of employers whose Werkstudent and working-student roles appear on the German job boards Agora draws from — not partnerships or endorsements.",
    logos: ["Zalando", "N26", "HelloFresh", "Personio", "Delivery Hero", "Contentful"] as const,
    domainsTitle: "Across the fields students actually work in",
    // Dummy counts — swap with live portal numbers at launch.
    domains: [
      { label: "Software", count: 142 },
      { label: "Data", count: 87 },
      { label: "Marketing", count: 64 },
      { label: "Design", count: 41 },
      { label: "Finance", count: 38 },
      { label: "Operations", count: 33 },
      { label: "Logistics", count: 29 },
      { label: "Research", count: 24 },
    ] as const,
  },

  voices: {
    eyebrow: "Voices",
    headline: "Students who found their place.",
    disclaimer: "Placeholder quotes while we're in beta — real student voices land here soon.",
  },

  meetAri: {
    eyebrow: "Meet Ari",
    headline: "Meet Ari — your guide through the labyrinth.",
    values: [
      {
        title: "Knows the rules",
        body: "The 140-day rule, Werkstudent vs Minijob, the 20-hour cap — Ari keeps track so you don't have to.",
      },
      {
        title: "Preps your interviews",
        body: "From “tell me about yourself” to salary questions, in English or German — practice with someone who's seen it before.",
      },
      {
        title: "Remembers your journey",
        body: "Your profile, your applications, your prep — Ari picks up every conversation where you left off.",
      },
    ] as const,
    memoryNote:
      "In the app, Ari remembers your profile, your applications and your interview prep — like a guide who actually knows you.",
    chat: {
      starters: ["What's the 140-day rule?", "Werkstudent vs Minijob?", "What is Agora?"],
      placeholder: "Ask Ari anything about working in Germany…",
      clearLabel: "Ari remembers this chat on your device — clear",
      capMessage: "I'd love to keep talking — that's what the app is for. Join the waitlist?",
      comingSoon: "Ari goes live here soon — join the waitlist to meet them first.",
    },
  },

  faq: {
    eyebrow: "FAQ",
    headline: "Fair questions.",
    items: [
      {
        q: "What does “Agora” mean?",
        a: "The agora was the central square of the Greek city — the marketplace where people found work, traded, and belonged. That's the point: not another job board, but the place where you find your footing somewhere new.",
      },
      {
        q: "Why not a name that just says “jobs”?",
        a: "A name like “JobApp” tells you what a product is, not what it's for. Our differentiator isn't listing jobs — dozens of platforms do that. It's helping you belong somewhere new: the right role, your community, your footing in a foreign system. Jobs names a feature. Agora names the feeling.",
      },
      {
        q: "How do you pronounce it?",
        a: "AH-gor-ah. The Greek stresses the last syllable — ah-go-RAH — and English speakers often say uh-GOR-uh. Either is fine; we say AH-gor-ah.",
      },
      {
        q: "Is Agora free?",
        a: "Yes — swiping, matching and your first application drafts are free. A premium plan with higher limits is coming later; the free plan stays.",
      },
      {
        q: "Does the AI apply to jobs for me?",
        a: "No — and that's deliberate. Agora drafts your German CV and cover letter and pre-fills application forms to save you the typing, but you review everything and you always click the company's own Submit button. Nothing is ever sent in your name without your finger on the button.",
      },
      {
        q: "Is my data safe?",
        a: "Your data lives on EU servers only, handled under GDPR. You can export it or delete your account — and everything with it — anytime, in one tap. We're asking you to trust us with sensitive things; we built the system so you don't have to take our word for it.",
      },
      {
        q: "Who is Ari?",
        a: "Ari is your guide through the German job-and-visa labyrinth — named for Ariadne, who handed Theseus the thread. Ari knows the rules, preps your interviews, and remembers your journey. A peer who's been through it, not a chatbot reading a script.",
      },
    ] as const,
  },

  waitlist: {
    eyebrow: "The waitlist",
    headline: "Find your place first.",
    body: "Agora launches in Berlin first. Join the waitlist and Ari will write to you the moment your spot opens.",
    placeholder: "you@university.de",
    cta: "Join the waitlist",
    success: "You're on the list — Ari will write first.",
    error: "That didn't go through — mind trying again?",
    smallPrint: "No spam. EU-hosted. Delete anytime.",
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
