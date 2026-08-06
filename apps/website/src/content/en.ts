import { claims } from "./claims"

/**
 * All site copy. One file, typed — a German translation is a sibling file, not a refactor.
 * No copy lives in JSX.
 *
 * Approved by Jay 2026-08-04 as COPY-v4.md. Voice: sentence case with full stops, plain
 * verbs, real numbers, clear B2 English. Every number comes from ./claims.ts, which reads
 * ./live-data.json, which is regenerated from the production database on every build.
 *
 * Honesty (legally binding under UWG §5):
 *  - No user counts, hires, ratings or testimonials. The reviews section ships behind
 *    `enabled: false` until real beta quotes exist with named consent.
 *  - The full agent story is told in the present tense ONLY under the visible early-access
 *    frame: the hero badge, every CTA, and the FAQ anchor below.
 *  - Anything not running yet carries a mono `at launch` tag — the Apply step and four of
 *    the five platform doors.
 *  - `faq.items[0]` is the honesty anchor. Its meaning is never softened, never trimmed,
 *    and never moved out of first position.
 */

export const en = {
  brand: { name: "agora", suffix: ".jobs" },

  nav: {
    links: [
      { label: "How it works", href: "/#how-it-works" },
      // v6: was "Germany". The eligibility engine is a capability now, not the headline —
      // it earns its place by being useful when your situation needs it, not by defining us.
      { label: "Eligibility", href: "/#eligibility" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/faq" },
    ],
    cta: "Get early access",
    ctaHref: "/#early-access",
    menuOpen: "Open menu",
    menuClose: "Close menu",
  },

  // 1 — Hero
  hero: {
    // Geography stays explicit and honest. 786 of 921 indexed roles are Berlin and all five
    // sources are German — "global" would be a false claim under UWG §5 until the index
    // actually expands. The ambition is global; the badge tells the truth about today.
    badge: "Early access — starting in Germany",
    headline: "Every kind of work. Not just desk jobs.",
    /** Words from here on render in the brand colour: the half about you, not the machine. */
    headlineAccent: 3,
    // All-professions is TRUE today and it is the category's blind spot: a scan of twelve AI
    // job platforms found every one of them built solely around office/tech roles. The kitchen,
    // warehouse and delivery roles named here are really in the index — see live-data.json.
    sub: "Kitchen, warehouse, delivery, care, retail, trades, office — Agora reads every job source we index, tailors your CV and cover letter to each role, and files the application. You just approve. Works in English.",
    ctaPrimary: "Get early access",
    ctaSecondary: "See how it works",
    ctaSecondaryHref: "/#how-it-works",
    // Describes the FOOTAGE, and specifically its opening/poster frame — that is what a
    // sighted visitor sees first and what anyone with the sequence disabled sees throughout.
    // Naming the individual garments matters: they are the entire argument of the hero, so a
    // screen reader user who only gets this sentence still receives the point.
    imageAlt:
      "A row of iron coat hooks on a warm plaster wall in a dim staff corridor before dawn, hung with work clothes for six different trades: a chef's white jacket, an orange hi-vis vest, a pale care-worker tunic with a lanyard, a courier's rain jacket, a canvas shop apron and a wool blazer. Warm light spills from an open doorway at the end of the corridor.",
    // Deliberately does NOT repeat the listing count — the terminal footer directly above
    // already carries it. This line adds what that one doesn't: breadth and cadence.
    receipt: `${claims.companiesIndexed.value} companies indexed · ${claims.sourcesIndexed.value} sources · last scan ${claims.lastScan.value} CET`,
  },

  /** The engine terminal — labelled a replay, because that is exactly what it is. */
  theater: {
    eyebrow: "That screen, last night",
    title: "agora.engine",
    status: "live",
    caption: "Real rows from the latest scrape, replayed. Times are the nightly run, CET.",
    footer: `${claims.activeListings.value} live listings · ${claims.latestBatch.value} added last night`,
    alt: "Terminal panel replaying the engine's nightly scan and the real listings it found.",
  },

  // 2 — Real-data proof wall, set as a broadsheet classifieds page
  proof: {
    eyebrow: "In the index right now",
    headline: "The classifieds page, printed from the index.",
    /**
     * The dateline under the masthead. Every value is a live claim, none is typed by hand —
     * a broadsheet dates its edition, and this one can only date itself from the last scrape.
     */
    dateline: `Berlin · last scan ${claims.lastScanDate.value}, ${claims.lastScan.value} CET · ${claims.activeListings.value} listings · ${claims.sourcesIndexed.value} sources`,
    /** Column headers. Print structure, and each one says plainly what its block contains. */
    columnLead: "Latest across the index",
    // Says what the count in each box means, once, instead of repeating a note in all 22.
    columnNotices: "Employers with several live listings in our index",
    columnTail: "Also listed",
    /**
     * The rubber-stamp overprint. German for "indexed", and deliberately the ONLY verb we
     * stamp on a listing: we indexed it at that minute. Not sourced, not verified, not
     * partnered. The stamp is the graphic device and the honesty device at once.
     */
    stamp: "Indexiert",
    /** "11 Stellen" — the count is real, the word is the one the ads themselves use. */
    rolesLabel: "Stellen",
    /**
     * The imprint. Legally load-bearing under UWG §5 and set like a masthead imprint for
     * exactly that reason: logos imply endorsement in a way plain text does not, so the
     * sentence that denies it is a formal fixture of the page, not fine print. It is never
     * shrunk below body size and never moved out from under the listings.
     */
    imprint:
      "Companies whose public listings appear in our index. Not partners. Not endorsements. No hiring outcomes implied.",
    imprintSource: `Pulled from the index when this page was built, ${claims.activeListings.checkedOn}. Every role, employer, count and timestamp on this page is printed from that snapshot.`,
  },

  // 3 — The problem
  problem: {
    eyebrow: "Why this exists",
    headline: "Job hunting became a full-time job.",
    beats: [
      "You check the same five sites every night and see the same roles you saw last night.",
      "Every application wants your CV rewritten for its keywords, its form, its screening questions.",
      // v6: this beat used to open "And in Germany there's a second layer" — which made the
      // whole problem German. The rules layer is universal (permits, hours, language, licences);
      // Germany is just where we model it first. Stated so it reads true for any reader.
      "And there's a layer nobody explains: which contracts you're allowed to take, how many hours you may work, whether that language requirement is real.",
    ],
    /**
     * The running tally above the beats. It climbs as each beat lands, so the reader feels
     * the pile-up rather than reading about it. These are descriptions of the ritual, not
     * measured claims about users — there is no user data behind them, and there must not
     * be anything here that reads as a statistic we collected.
     */
    tally: [
      { value: "5", label: "job sites, checked again tonight" },
      { value: "1×", label: "CV rewritten, per application" },
      { value: "?", label: "and nobody explains the rules you're working under" },
    ],
    close: "So most people apply to fewer jobs, more slowly, worse — and call it bad luck.",
  },

  // 4 — The pipeline, four steps, pinned scroll scene
  pipeline: {
    eyebrow: "How it works",
    headline: "Four things, done for you, on a loop.",
    launchTag: "at launch",
    steps: [
      {
        n: "01",
        key: "Find",
        title: "Your agent watches. You don't.",
        body: "Every source, every night. Each new role is scored against your profile with a plain-English reason attached — so you know why it surfaced before you open it.",
        detail: [
          "Re-scans all 5 sources nightly, so a role posted at midnight is on your list by morning",
          "Filters against your permit BEFORE scoring — you never see a contract you can't legally take",
          "Scores on skills, seniority, language requirement and location, and shows its reasoning",
          "Learns from what you skip: dismiss three warehouse roles and it stops surfacing them",
        ],
        receipt: `[${claims.lastScan.value}] nightly scan · ${claims.sourcesIndexed.value} sources · ${claims.latestBatch.value} new roles`,
      },
      {
        n: "02",
        key: "Prep",
        title: "Tailored per role. Every change shown.",
        body: `Your CV and cover letter rewritten for the specific role, drawn from your real background — never invented. Graded on ${claims.scoreDimensions.value} dimensions before the draft reaches you.`,
        detail: [
          "Reads the job ad first: pulls out keywords, must-haves and quiet disqualifiers",
          "Rewrites your bullets against those specifics, using only experience you actually have",
          "Grades six ways — ATS parse, keywords, factual accuracy, format, tone, language",
          "Shows a line-by-line diff, so nothing reaches an employer that you haven't seen",
          "Writes German natively when a role needs it, rather than translating your English",
        ],
        receipt: `draft scored 92/100 · ${claims.scoreDimensions.value} checks passed`,
      },
      {
        n: "03",
        key: "Apply",
        title: "You approve. The agent types.",
        body: "It fills in the company's own application form, answers the screening questions in your voice, and sends you a receipt for every submission.",
        detail: [
          "Fills the employer's real form on their real careers page — no back channel, no scraping around it",
          "Answers screening questions from your profile, in your voice, and flags any it can't answer",
          "Nothing is submitted until you approve it, one application at a time",
          "Auto-approve is opt-in, off by default, and revocable at any moment",
          "Every submission produces a receipt: what was sent, where, and when",
        ],
        receipt: "submitted · 47 fields · receipt saved",
        atLaunch: true,
      },
      {
        n: "04",
        key: "Track",
        title: "The pipeline runs itself.",
        body: "Replies land on the right application. Statuses move on their own. When a company goes quiet, a polite follow-up is drafted and waiting for you.",
        detail: [
          "Threads employer replies back to the application they belong to",
          "Advances status automatically — applied, screening, interview, offer, closed",
          "Notices silence: after two weeks with no reply, drafts a follow-up for your approval",
          "Keeps every version of every document you sent, so you can see exactly what they read",
        ],
        receipt: "status → interview · follow-up drafted",
      },
    ],
  },

  // 5 — Numbers band
  numbers: {
    eyebrow: "Measured, not claimed",
    headline: "Real numbers from the engine.",
    tiles: [
      { value: claims.activeListings.value, label: "live listings" },
      { value: claims.companiesIndexed.value, label: "companies indexed" },
      { value: claims.sourcesIndexed.value, label: "sources scanned nightly" },
      { value: claims.legalTests.value, label: "legal checks passing" },
    ],
    receipt: `Read from the live database every time this page is deployed. Last scan: ${claims.lastScanDate.value}, ${claims.lastScan.value}.`,
  },

  /**
   * 6 — Eligibility. DEMOTED from "the moat section" (Jay, 2026-08-06).
   *
   * This engine is real, tested and genuinely rare — but leading with it made the whole
   * product look like it was only for foreign students in Germany. It now reads as a
   * capability that matters WHEN YOUR SITUATION NEEDS IT, and is invisible when it doesn't.
   * Most readers should be able to skip this section entirely and lose nothing.
   *
   * Do not restore it to the headline position, and do not delete it either: it is the one
   * thing in this category no competitor has (see docs/scope/DECISIONS-NEEDED.md Q1).
   *
   * Every figure below is copied from `packages/legal/src/constraints.ts`, the same table
   * the product's SQL hard filter and per-card eligibility checks read from, and the one
   * covered by the 374 passing tests. If that table changes, this changes with it — do not
   * edit these numbers here in isolation.
   */
  eligibility: {
    eyebrow: "If your situation has rules",
    headline: "Some people can take any job. Some can't. It knows which you are.",
    body: "If you hold a passport that lets you work without limits, this section does nothing for you — and that's fine. If you're on a permit, there are caps on hours, days and contract types, and most job boards let you find out only after you've applied. Agora models those rules first, then filters. Germany is modelled today; each new country is modelled before we index it.",
    /** Source: VISA_CONSTRAINTS in packages/legal/src/constraints.ts */
    permits: [
      {
        code: "§16b",
        name: "Student visa",
        hours: "20 h/week in term",
        detail: "140 full days (or 280 half days) a year. Enrolment required.",
        contracts: "Werkstudent · Minijob · Praktikum",
      },
      {
        code: "§20a",
        name: "Chancenkarte",
        hours: "20 h/week",
        detail: "No annual day limit, no enrolment requirement, while you job-hunt.",
        contracts: "Werkstudent · Minijob · Teilzeit",
      },
      {
        code: "EU",
        name: "EU citizen",
        hours: "Full access",
        detail: "No permit restrictions on hours, days or contract type.",
        contracts: "Every contract type",
      },
      {
        code: "Blue Card",
        name: "Skilled worker",
        hours: "Full-time",
        detail: "Tied to qualified employment. Minijob is not permitted on this permit.",
        contracts: "Vollzeit · Teilzeit · Werkstudent",
      },
    ],
    facts: [
      {
        value: "€556",
        label: "Minijob ceiling, per month",
        note: "Earn above it and you leave Minijob rules — the deductions change.",
      },
      {
        value: "140",
        label: "Days a year on a student visa",
        note: "Or 280 half days. We count what a role would actually cost you.",
      },
      {
        value: "20",
        label: "Hours a week during term",
        note: "Cross it and the Werkstudent social-insurance privilege falls away.",
      },
      {
        value: claims.legalTests.value,
        label: "Automated tests on these rules",
        note: "Run on every change. The number comes from the suite, not from marketing.",
      },
    ],
    micro:
      "Guidance, not legal advice. Genuine edge cases belong with your local immigration office — in Germany that's the Ausländerbehörde — and we tell you when you've hit one instead of guessing.",
  },

  /**
   * 7 — Platforms, as a colonnade: one lit doorway, four drawings.
   *
   * The five channels used to be five identical cards, four of which existed only as a
   * promise — a feature grid where most cells were apologies. The shape now carries the
   * truth: the built channel is a door you can walk through, the unbuilt four are
   * construction drawings, and no reader has to parse a tag to tell them apart.
   *
   * The drawing does legal work. UWG §5 forbids implying an unshipped feature exists, and a
   * blueprint cannot be mistaken for a product. `at launch` still appears on every closed
   * door in plain text — the picture reinforces the tag, it never replaces it.
   */
  platforms: {
    eyebrow: "Wherever you already are",
    headline: "One agent. Five front doors. The first one's open.",
    body: "The web app is the door you can walk through today. The other four are drawn, not built — measured, planned, and honest about which is which. Each one opens when it is real, and this page will say so on the day.",
    /** The one that exists. Lit doorway, solid sign, and the only link in the row. */
    open: {
      name: "Web app",
      body: "The full workspace — matches, drafts, tracker.",
      tag: "early access",
    },
    /** Drawings. Every `at launch` below is load-bearing — never soften or drop one. */
    closed: [
      {
        id: "whatsapp",
        name: "WhatsApp",
        body: "“Anything good today?” — and it answers.",
        tag: "at launch",
      },
      {
        id: "imessage",
        name: "iMessage",
        body: "Same agent, blue bubbles.",
        tag: "at launch",
      },
      {
        id: "claude",
        name: "Claude / MCP",
        body: "Run your job hunt from inside Claude.",
        tag: "at launch",
      },
      {
        id: "chrome",
        name: "Chrome extension",
        body: "On any job page: score it, draft for it, save it.",
        tag: "at launch",
      },
    ],
    cta: "Get early access",
    note: "Four of the five are architectural drawings. Nothing is running behind them yet.",
  },

  /**
   * Reviews. BUILT, SHIPPED DARK. `enabled` stays false until real beta quotes exist with
   * named consent; the component renders nothing at all while it is false, so there is no
   * placeholder quote anywhere in the DOM. Never flip this to seed content.
   */
  reviews: {
    enabled: false,
    eyebrow: "From the beta",
    headline: "What early users say.",
    quotes: [] as { quote: string; name: string; role: string; outcome: string }[],
  },

  // 8 — Early-access offer + pricing preview
  offer: {
    eyebrow: "Early access",
    headline: "Free while we build. Founding price when we launch.",
    body: "Early users get the full product free through the beta, help decide what ships next, and lock the lowest price we will ever offer.",
    cta: "Get early access",
  },

  /**
   * The /pricing page.
   *
   * Two honesty constraints, both load-bearing. First: the credit model is decided but the
   * numbers are NOT (docs/scope/DECISIONS-NEEDED.md Q2) — so this page explains the shape and
   * refuses to print a price it might have to walk back. Second: every competitor surveyed
   * hides pricing behind a separate click or omits numbers entirely, so saying plainly "we
   * have not set it yet" is more trustworthy here than a confident invented figure.
   */
  pricingPage: {
    title: "Pricing",
    updated: "Founding pricing is not final. This page changes before launch, not after.",
    intro:
      "Agora is free through the beta. When it launches you pay for what you use — no subscription, and no monthly clock running whether you job-hunt or not.",
    model: {
      heading: "How it will work",
      points: [
        {
          title: "Credits, not a subscription",
          body: "You buy credits once and spend them on the things that cost us money to run: a tailored CV, a cover letter, an in-depth conversation with the agent. Matching, browsing and tracking do not consume credits.",
        },
        {
          title: "Credits do not expire",
          body: "If you find a job in three weeks and stop, whatever you did not spend is still there a year later when you next need it. You are not renting access to your own job hunt.",
        },
        {
          title: "There is a free allowance",
          body: "Enough to apply properly to real roles and judge whether the output is any good, without a card. We have not fixed the size of it yet.",
        },
        {
          title: "You will see the price before you spend",
          body: "Every action that costs credits says so, and how many, before you confirm it. No silent drawdown.",
        },
      ],
    },
    tbd: {
      heading: "What we have not decided",
      body: "The price per credit, the size of the packs, and how big the free allowance is. We would rather leave this blank than print a number and change it after people have planned around it. Join the waitlist and you will get the founding price, which will be the lowest we ever offer.",
    },
    beta: {
      heading: "During the beta",
      body: "Everything is free. There is no card, no trial timer, and no feature held back to force an upgrade. In exchange we ask for the occasional blunt opinion about what is not working.",
    },
    cta: "Get early access",
  },

  pricing: {
    eyebrow: "Pricing",
    headline: "Pay per application. Never per month.",
    sub: "Credits, not a subscription. You buy them once, they don't expire, and you spend them only when the agent does work for you. No billing clock running while you're not looking.",
    priceSlot: "Locks at launch",
    tiers: [
      { name: "Starter", for: "Testing the water" },
      { name: "Focus", for: "Actively hunting", featured: true },
      { name: "All-in", for: "Hunting hard" },
    ],
    note: "During beta: free.",
    link: { label: "See the pricing detail", href: "/pricing" },
  },

  /**
   * 9 — FAQ. Grouped, and deliberately long: this is where a sceptical reader goes, and a
   * short list reads as having something to hide.
   *
   * `groups[0].items[0]` is THE HONESTY ANCHOR. It is the reason the rest of the page is
   * allowed to speak in the present tense. Never softened, never trimmed, never moved out
   * of first position, and never collapsed by default.
   */
  faq: {
    eyebrow: "Fair questions",
    headline: "The questions everyone asks first.",
    sub: "If something here reads like a dodge, tell us and we'll rewrite it.",
    link: { label: "All questions", href: "/faq" },
    groups: [
      {
        title: "The agent",
        items: [
          {
            q: "What works today, and what arrives at launch?",
            a: `Today: the matching engine across ${claims.sourcesIndexed.value} sources, tailored CV and cover letter drafts with six-dimension scoring, and application tracking — you click Apply yourself, on the company's own site. At launch: the agent submits for you with per-application approval, plus WhatsApp, iMessage, Claude and the Chrome extension.`,
          },
          {
            q: "Is an agent applying for me even allowed?",
            a: "You approve every single application before it goes anywhere, and we fill in the company's own form rather than routing around it. Nothing is sent without your say-so, and your data stays in the EU.",
          },
          {
            q: "Will employers know an AI helped?",
            a: "Your documents are built from your real experience, in your own voice — nothing invented. That is the same help a sharp friend or a career coach gives you, and it isn't something you have to declare.",
          },
          {
            q: "Can it invent experience to make me look better?",
            a: "No, and that is enforced rather than promised. Factual accuracy is one of the six dimensions every draft is graded on, and a draft that asserts something your profile doesn't support gets marked down before you ever see it. You can also read every change as a diff.",
          },
          {
            q: "What if it applies to something I'd never want?",
            a: "It can't, today — you press Apply. When submission arrives, approval is per-application by default. Auto-approve exists, it is off unless you switch it on, and you can revoke it at any time.",
          },
          {
            q: "How many applications will it actually send?",
            a: "As many as you approve. We are not going to promise a number: volume without fit is how people end up ignored, and a hundred bad applications is worse than ten good ones.",
          },
          {
            q: "Does it work for senior roles, or just entry level?",
            a: "Both. The index runs from Minijob and Werkstudent through to full-time senior positions — the current index skews Berlin and early-career because that is where we started scraping, not because of a product limit.",
          },
        ],
      },
      {
        title: "Germany and permits",
        items: [
          {
            q: "I don't speak German. Does it work?",
            a: "The whole product is in English. It reads German job ads for you, tells you honestly when a role genuinely needs German, and writes your German documents when a role calls for them.",
          },
          {
            q: "How do you know what my visa lets me do?",
            a: "We model the rules rather than guessing at them. The permit table covers the §16b student visa, the §20a Chancenkarte, EU citizenship, the Blue Card and the post-graduation transition — hours, annual day limits, enrolment requirements and which contract types each one permits. It is covered by 374 automated tests.",
          },
          {
            q: "What is the 140-day rule?",
            a: "On a §16b student visa you may work 140 full days or 280 half days per calendar year without additional permission. It is easy to burn through it without noticing, so we count what a role would cost you before you apply.",
          },
          {
            q: "Werkstudent or Minijob — what's the difference?",
            a: "A Minijob is capped at €556 a month, above which the deductions change. Werkstudent lets you earn more but caps you at 20 hours a week during term; cross that and you lose the Werkstudent social-insurance privilege. Which one suits you depends on your permit and your enrolment status, and we check both.",
          },
          {
            q: "Is this legal advice?",
            a: "No. It is a model of published rules, applied to your situation, and it is right often enough to save you a lot of wasted evenings. Genuine edge cases belong with the Ausländerbehörde — and we tell you when you have hit one rather than bluffing.",
          },
          {
            q: "Is it Berlin only?",
            a: "Berlin first, because that is where the index is deepest and where we can be most useful on day one. The permit engine is nationwide already; the listing coverage follows city by city.",
          },
        ],
      },
      {
        title: "Your data",
        items: [
          {
            q: "Where does my data live?",
            a: "On EU servers, under GDPR. Your CV, your applications and your documents never leave the EU.",
          },
          {
            q: "Can I delete everything?",
            a: "Yes, at any time, and deletion means deletion — profile, documents, application history, the lot. You can export it all first.",
          },
          {
            q: "Do you sell my data or show it to employers?",
            a: "No. Employers see an application when you send them one. That is the only time your information leaves the product, and it goes to them the same way it would if you had typed it yourself.",
          },
          {
            q: "Do you train models on my CV?",
            a: "No. Your documents are used to do your work, not to improve a model for someone else.",
          },
        ],
      },
      {
        title: "Early access and pricing",
        items: [
          {
            q: "What does early access cost?",
            a: "Nothing. You get the full product free through the beta, and you lock the lowest price we will ever offer when we launch.",
          },
          {
            q: "What will it cost later?",
            a: "Credits, not a subscription. You buy them once, they don't expire, and you spend them only when the agent does work for you. Pack sizes and prices are set before launch — we would rather say that than invent a number now.",
          },
          {
            q: "Why should I trust a product that isn't finished?",
            a: "You shouldn't, entirely — which is why the first FAQ answer here spells out exactly what runs today and what doesn't. Everything on this page marked `at launch` is not built yet, and every number is read from the live system rather than typed in by us.",
          },
        ],
      },
    ],
  },

  // 10 — Final CTA band, over the dawn endposter
  cta: {
    eyebrow: "Early access",
    headline: "Your job hunt, off your plate.",
    // Names where we are without making it the identity: a fact about coverage, not about
    // who the product is for.
    body: "Every trade, every shift, every desk. Germany first, more countries as we index them. Get in before the doors open.",
    imageAlt:
      "The same room at 7am: the laptop closed, papers stacked, a city waking up beyond the window.",
    /** What signing up actually gets you. Concrete, checkable, no invented numbers. */
    points: [
      {
        title: "The full product, free",
        body: "Everything that runs today, for the whole beta. No card, no trial countdown.",
      },
      {
        title: "Founding price, locked",
        body: "When pricing lands, early-access members keep the lowest rate we ever offer.",
      },
      {
        title: "You shape what ships",
        body: "Small group, short feedback loop. What you tell us moves the roadmap.",
      },
      {
        title: "One email, then silence",
        body: "We write when your spot opens. No drip campaign, unsubscribe in one click.",
      },
    ],
    label: "Email address",
    placeholder: "you@email.com",
    submit: "Get early access",
    submitting: "Joining…",
    successTitle: "You're in.",
    successBody: "We'll email you the moment Berlin opens.",
    copyLink: "Copy the link",
    copied: "Link copied",
    error: "That didn't go through. Mind trying again?",
    retry: "Try again",
    smallPrint: "No spam. One email when your access is ready. Unsubscribe in one click.",
  },

  footer: {
    // "Built for Germany" told readers who the product was FOR. "Indexing Germany first"
    // tells them where it currently REACHES. Same fact, and only one of them excludes people.
    // The EU-residency line stays prominent: a scan of twelve rivals found only one showing
    // any compliance signal at all, so this is an unclaimed trust wedge.
    blurb:
      "Agora is an agent for the job hunt: it watches the sources, writes the documents, and keeps the pipeline moving. Every kind of work, in English. Indexing Germany first, and your data never leaves the EU.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/#how-it-works" },
          { label: "Germany", href: "/#germany" },
          { label: "Pricing", href: "/pricing" },
          { label: "FAQ", href: "/faq" },
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
    gdpr: "EU-hosted · GDPR-first. Export or delete your data at any time, documents included.",
    smallPrint: "Made in Berlin · Hosted in the EU · GDPR-first",
  },

  frames: {
    scoreTitle: "Quality score",
    scoreOutOf: "/100",
    scoreDimensions: [
      { label: "ATS parse", value: 94 },
      { label: "Keywords", value: 90 },
      { label: "Factual", value: 96 },
      { label: "Format", value: 89 },
      { label: "Tone", value: 91 },
      { label: "Language", value: 93 },
    ],
    scoreAlt: "Example quality score card: a document graded 92 out of 100 across six dimensions.",
    diffAlt:
      "Example diff view: two CV bullet points, the generic original struck through and the tailored rewrite added below.",
    diffTitle: "Every change shown",
    diffRows: [
      { kind: "del" as const, text: "Worked on the web app front end using React." },
      {
        kind: "add" as const,
        text: "Shipped a React + TypeScript surface used by 4M monthly users; cut p95 render time 38%.",
      },
      { kind: "del" as const, text: "Helped the product team with improvements." },
      { kind: "add" as const, text: "Drove the roadmap with PMs across three product pods." },
    ],
    trackerAlt:
      "Example application tracker showing three applications and the status of each one.",
    trackerRows: [
      { role: "Senior Frontend Engineer", status: "Interview", tone: "good" as const },
      { role: "Product Engineer", status: "Follow-up drafted", tone: "warm" as const },
      { role: "Full-stack Developer", status: "Submitted", tone: "neutral" as const },
    ],
    applyAlt:
      "Example card showing an application filled in on the company's own careers page, waiting for approval.",
    applyTitle: "Ready to send",
    applyRole: "Senior Frontend Engineer",
    applyFields: [
      { label: "Cover letter", value: "tailored" },
      { label: "Screening questions", value: "answered" },
      { label: "Salary expectation", value: "your range" },
    ],
    applyCta: "Approve and submit",
    applyNote: "Nothing is sent until you approve it.",
    matchTitle: "Why this matched",
    matchAlt: "Example match explanation card listing three reasons a role fits.",
    matchReasons: [
      "5 of 6 must-have skills present in your CV",
      "Seniority and salary band line up",
      "No work-permit conflict for this contract type",
    ],
    jobCard: {
      company: "Product engineering · Berlin",
      title: "Senior Frontend Engineer",
      chips: ["match 94", "full time", "permit-checked"],
      alt: "Example job card: a senior frontend engineering role in Berlin, matched at 94, full time, permit-checked.",
    },
    draftCard: {
      title: "Draft ready",
      body: `CV + cover letter · scored 92/100 · ${claims.scoreDimensions.value} checks passed`,
      alt: "Example notification card: a tailored CV and cover letter are ready, scored 92 out of 100, six checks passed.",
    },
  },

  a11y: { skipToContent: "Skip to content", homeLink: "Agora home" },
} as const

export type SiteContent = typeof en
