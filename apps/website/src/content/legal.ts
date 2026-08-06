/**
 * Impressum and privacy notice. Separate from en.ts because these are legal instruments,
 * not marketing copy — they are edited for accuracy, never for tone.
 *
 * ⚠ TWO THINGS MUST BE TRUE BEFORE THIS SHIPS PUBLICLY:
 *
 * 1. Every `[[…]]` placeholder below is replaced with Jay's real details. They are the only
 *    fields nobody but him can supply, and §5 DDG makes name + address + contact mandatory
 *    for a German-facing site. Shipping with placeholders is worse than shipping nothing.
 *
 * 2. Every factual claim here still matches the system. This notice is what an AWS/Anthropic
 *    use-case reviewer reads, and what a supervisory authority would read after a complaint.
 *    If a sub-processor, region or retention period changes in code, it changes here in the
 *    same commit. Do not describe anything as built that is only planned — where a right is
 *    fulfilled by hand today, this says so.
 *
 * Written against the actual stack: Neon (EU), Clerk, AWS Bedrock eu-central-1, Upstash EU,
 * Vercel fra1, Stripe. Verified 2026-08-06.
 */

/** Fields only Jay can fill. Grep for "[[" before any public deploy. */
export const OPERATOR = {
  legalName: "[[FULL LEGAL NAME]]",
  street: "[[STREET AND NUMBER]]",
  postcode: "[[POSTCODE]]",
  city: "[[CITY]]",
  country: "Germany",
  email: "[[CONTACT EMAIL]]",
  /**
   * Agora is operated by a natural person, not a company. That is deliberate: registering a
   * UG before BSS approval forfeits eligibility (docs/Business Documents/06-Financial-Model.md).
   * So there is no Handelsregister entry and no USt-IdNr to publish, and inventing either
   * would itself be a false statement. Revisit this whole block at incorporation.
   */
  isNaturalPerson: true,
} as const

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }

export interface LegalSection {
  id: string
  heading: string
  blocks: LegalBlock[]
}

export const impressum = {
  title: "Impressum",
  updated: "6 August 2026",
  intro: "Provider identification under § 5 DDG (formerly § 5 TMG).",
  sections: [
    {
      id: "provider",
      heading: "Provider",
      blocks: [
        {
          kind: "p",
          text: `${OPERATOR.legalName}\n${OPERATOR.street}\n${OPERATOR.postcode} ${OPERATOR.city}\n${OPERATOR.country}`,
        },
        {
          kind: "p",
          text: "Agora is operated by a natural person. There is no commercial register entry and no VAT identification number, because no company has been incorporated.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [{ kind: "p", text: `Email: ${OPERATOR.email}` }],
    },
    {
      id: "responsible",
      heading: "Responsible for content",
      blocks: [
        {
          kind: "p",
          text: `${OPERATOR.legalName}, at the address above (§ 18 (2) MStV).`,
        },
      ],
    },
    {
      id: "disputes",
      heading: "Dispute resolution",
      blocks: [
        {
          kind: "p",
          text: "The European Commission provides a platform for online dispute resolution at https://ec.europa.eu/consumers/odr. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.",
        },
      ],
    },
    {
      id: "liability",
      heading: "Liability for links",
      blocks: [
        {
          kind: "p",
          text: "Our pages link to external sites, including employers' own job postings and application forms. We have no control over their content and accept no responsibility for it. Job listings shown by Agora are gathered from public sources and from employers' own career pages; the employer, not Agora, is responsible for the accuracy of a posting and for the hiring decision.",
        },
      ],
    },
  ] satisfies LegalSection[],
}

export const privacy = {
  title: "Privacy notice",
  updated: "6 August 2026",
  intro:
    "How Agora handles your personal data, under the GDPR. Written to be read, not to be survived — if any part of it is unclear, ask and we will rewrite it.",
  sections: [
    {
      id: "summary",
      heading: "The short version",
      blocks: [
        {
          kind: "list",
          items: [
            "Your data is stored and processed in the European Union. It is not transferred outside the EU.",
            "Your CV and profile are sent to an AI model to write your documents. That model runs inside the EU, and your data is not used to train it.",
            "We do not sell your data, and we do not share it with advertisers.",
            "You can delete your account and everything in it at any time, from inside the app. Deletion is immediate and permanent.",
            "Right now this website only collects an email address for the waitlist. Everything below about CVs and applications describes the product you are joining the waitlist for.",
          ],
        },
      ],
    },
    {
      id: "controller",
      heading: "Who is responsible",
      blocks: [
        {
          kind: "p",
          text: `The controller for the processing described here is ${OPERATOR.legalName}, ${OPERATOR.street}, ${OPERATOR.postcode} ${OPERATOR.city}, ${OPERATOR.country}. Contact: ${OPERATOR.email}.`,
        },
        {
          kind: "p",
          text: "We have not appointed a data protection officer. We are not required to: we do not carry out large-scale monitoring, and our core activity is not processing special categories of data. You can raise any data protection question at the address above.",
        },
      ],
    },
    {
      id: "waitlist",
      heading: "If you only joined the waitlist",
      blocks: [
        {
          kind: "p",
          text: "The waitlist form on this website collects one thing: your email address, together with the time you submitted it. We use it to tell you when early access opens, and for nothing else. We do not profile you, and we do not pass it to anyone for marketing.",
        },
        {
          kind: "p",
          text: "Legal basis: your consent, Art. 6 (1) (a) GDPR. You can withdraw it at any time by replying to any email we send, or by writing to the address above, and we will erase the record. Withdrawing does not affect processing that already happened.",
        },
      ],
    },
    {
      id: "data",
      heading: "What the product collects, and why",
      blocks: [
        {
          kind: "p",
          text: "When you create an account and use Agora, we process the following. Each row says why we need it and what permits us to process it.",
        },
        {
          kind: "table",
          head: ["Data", "Why", "Legal basis"],
          rows: [
            [
              "Account details — email, name, authentication identifiers",
              "To create your account, sign you in and secure it",
              "Art. 6 (1) (b) — performance of a contract",
            ],
            [
              "Your CV and the profile extracted from it — work history, education, skills, languages",
              "To match you to roles and to write your applications",
              "Art. 6 (1) (b) — performance of a contract",
            ],
            [
              "Job preferences — location, hours, contract type, minimum pay, availability",
              "To filter the roles you are shown",
              "Art. 6 (1) (b) — performance of a contract",
            ],
            [
              "Residence and work-permit status, where you provide it",
              "To exclude jobs you are not legally allowed to accept",
              "Art. 9 (2) (a) — your explicit consent (see below)",
            ],
            [
              "Applications, drafts and their status",
              "To generate documents and track what you sent where",
              "Art. 6 (1) (b) — performance of a contract",
            ],
            [
              "Usage and security logs, rate-limit counters",
              "To keep the service up and stop abuse of the AI features",
              "Art. 6 (1) (f) — our legitimate interest in a working, un-abused service",
            ],
            [
              "Payment records, if you buy credits",
              "To take payment and meet tax record-keeping duties",
              "Art. 6 (1) (b) and (c) — contract and legal obligation",
            ],
          ],
        },
        {
          kind: "p",
          text: "Work-permit status deserves its own note. Depending on your circumstances it can reveal, or allow inference of, your nationality or immigration status. We therefore treat it as requiring your explicit consent under Art. 9 (2) (a) GDPR: you are asked for it directly, it is optional, and if you do not give it we simply do not apply eligibility filtering. You can withdraw it and we will erase it, without losing your account.",
        },
      ],
    },
    {
      id: "ai",
      heading: "How AI is used, and what happens to your data inside it",
      blocks: [
        {
          kind: "p",
          text: "Agora uses large language models to read job adverts, to write and grade your CV and cover letters, to rank roles against your profile, and to answer your questions. This is the core of the product, so it is worth being precise about it.",
        },
        {
          kind: "list",
          items: [
            "The models are Anthropic's Claude models, accessed through Amazon Bedrock in the AWS Europe (Frankfurt) region, eu-central-1. We also use Cohere's embedding model through the same service to represent your profile and job adverts as vectors for matching.",
            "Your prompts and outputs are not used to train Anthropic's, Cohere's or Amazon's models. Amazon Bedrock does not use inputs or outputs submitted to it to train the underlying models, and does not share them with the model providers.",
            "Calls are restricted to EU regions at the infrastructure level, not merely by configuration: our AWS access policy explicitly denies any Bedrock request made outside the EU, so a misconfiguration cannot send your data elsewhere.",
            "The model is never the last word on your application. You read every document before it goes anywhere, changes are shown to you line by line, and you decide whether to send it.",
            "We do not use AI to make any decision that produces a legal or similarly significant effect on you. Agora ranks and drafts; it does not reject you, and no employer's hiring decision is made by us. Art. 22 GDPR automated-decision rules therefore do not apply.",
          ],
        },
      ],
    },
    {
      id: "processors",
      heading: "Who else touches your data",
      blocks: [
        {
          kind: "p",
          text: "We use the following processors. Each is bound by a data processing agreement, and each stores your data in the EU.",
        },
        {
          kind: "table",
          head: ["Processor", "What for", "Where"],
          rows: [
            [
              "Amazon Web Services",
              "AI models (Bedrock), file storage, encryption keys",
              "EU — Frankfurt",
            ],
            ["Neon", "The database", "EU"],
            ["Clerk", "Accounts and sign-in", "EU data residency"],
            ["Upstash", "Rate limiting and the job queue", "EU"],
            ["Vercel", "Website and app hosting", "EU — Frankfurt"],
            ["Stripe", "Payments, if you buy credits", "EU, with Stripe's own safeguards"],
          ],
        },
        {
          kind: "p",
          text: "We do not sell personal data, we do not share it with advertising networks, and we do not run third-party advertising or cross-site tracking on this website.",
        },
      ],
    },
    {
      id: "security",
      heading: "How it is protected",
      blocks: [
        {
          kind: "list",
          items: [
            "Everything is encrypted in transit (TLS) and at rest.",
            "CV content is additionally encrypted at the application level with keys held in AWS KMS, so the database alone does not yield readable CVs.",
            "Access to your records is scoped to your account on every request, and enforced again in the database layer.",
            "Secrets are scanned out of our codebase automatically on every change.",
          ],
        },
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      blocks: [
        {
          kind: "list",
          items: [
            "Account, profile, CV and application data: for as long as your account exists. When you delete your account it is erased immediately.",
            "Waitlist email addresses: until early access opens and we have contacted you, or until you ask us to remove you — whichever comes first.",
            "Security and rate-limit logs: a short rolling window, then discarded.",
            "Payment and invoice records: retained for as long as German tax and commercial law requires, currently up to ten years (§ 147 AO). This is a legal obligation and survives deletion of your account — it is the one exception to immediate erasure, and it covers the invoice, not your CV.",
          ],
        },
      ],
    },
    {
      id: "rights",
      heading: "Your rights",
      blocks: [
        {
          kind: "p",
          text: "Under the GDPR you have the following rights. We will answer within one month, and we will not charge you.",
        },
        {
          kind: "list",
          items: [
            "Access (Art. 15) — a copy of the data we hold about you.",
            "Rectification (Art. 16) — correct anything wrong. Most of it you can edit yourself.",
            "Erasure (Art. 17) — delete your account and its contents. This is built into the app: one action, immediate, and it removes your stored files as well as your database records.",
            "Data portability (Art. 20) — receive your data in a machine-readable format. A self-service export is not yet in the product; until it is, email us and we will send it to you. We would rather tell you that than imply a button exists.",
            "Restriction (Art. 18) and objection (Art. 21) — including objecting to processing based on our legitimate interests.",
            "Withdraw consent (Art. 7 (3)) — at any time, including the consent for work-permit data, without affecting processing already carried out.",
          ],
        },
        {
          kind: "p",
          text: `To exercise any of these, write to ${OPERATOR.email}. You also have the right to complain to a supervisory authority. In Berlin that is the Berliner Beauftragte für Datenschutz und Informationsfreiheit; you may also complain to the authority where you live or work.`,
        },
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and tracking",
      blocks: [
        {
          kind: "p",
          text: "This website sets no advertising or analytics cookies and does not track you across sites. The app sets the cookies strictly necessary to keep you signed in, which do not require consent under § 25 (2) TTDSG. If we ever add analytics, it will be EU-hosted and cookieless, and this notice will say so before it goes live.",
        },
      ],
    },
    {
      id: "children",
      heading: "Age",
      blocks: [
        {
          kind: "p",
          text: "Agora is not intended for children. You must be at least 16 to create an account, which is also the age at which you can consent to this processing in Germany.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this notice",
      blocks: [
        {
          kind: "p",
          text: "If we change how we process your data we will update this page and change the date at the top. If a change is significant — a new purpose, a new category of data, a processor outside the EU — we will tell you directly rather than relying on you re-reading this page.",
        },
      ],
    },
  ] satisfies LegalSection[],
}
