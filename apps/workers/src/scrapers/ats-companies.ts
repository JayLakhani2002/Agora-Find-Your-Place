import type { AtsKind } from "./ats"

export interface AtsCompany {
  /** Canonical display name — what users see; ATS feeds spell it inconsistently. */
  company: string
  ats: AtsKind
  /** Board token as it appears in the ATS URL. Workday: "<host>/<siteId>". */
  token: string
}

/**
 * Companies whose career pages we poll directly. This is the growth lever: every entry
 * is one employer whose jobs we see the hour they're published, before the aggregators
 * index them.
 *
 * To add companies, don't guess tokens — run the detector, which proves the feed exists
 * and prints ready-to-paste rows:
 *   pnpm --filter @agora/workers exec tsx scripts/detect-ats.ts zalando.de sumup.com …
 *   pnpm --filter @agora/workers exec tsx scripts/detect-ats.ts --file domains.txt
 *
 * Seeded from a 40-domain Berlin/DE sweep on 2026-08-06, plus the slugs already verified
 * in docs/Job Data/Job-API-Documentation.md. Every token below was live-checked and
 * returns Berlin or remote roles.
 *
 * Before adding a Recruitee or Workday tenant, check that tenant's own robots.txt —
 * both platforms let customers set it per tenant, and some are Disallow: /.
 * SmartRecruiters is off-limits entirely (see the note in ats.ts).
 */
export const ATS_COMPANIES: AtsCompany[] = [
  { company: "Contentful", ats: "greenhouse", token: "contentful" },
  { company: "Urban Sports Club", ats: "greenhouse", token: "urbansportsclub" },
  { company: "Grover", ats: "greenhouse", token: "grover" },
  { company: "N26", ats: "greenhouse", token: "n26" },
  { company: "SumUp", ats: "greenhouse", token: "sumup" },
  { company: "GetYourGuide", ats: "greenhouse", token: "getyourguide" },
  { company: "HelloFresh", ats: "greenhouse", token: "hellofresh" },
  { company: "Trade Republic", ats: "greenhouse", token: "traderepublic" },
  { company: "Celonis", ats: "greenhouse", token: "celonis" },
  { company: "Raisin", ats: "greenhouse", token: "raisin" },
  { company: "Flix", ats: "greenhouse", token: "flix" },
  { company: "IONOS", ats: "greenhouse", token: "ionos" },
  { company: "Doctolib", ats: "greenhouse", token: "doctolib" },
  { company: "MOIA", ats: "greenhouse", token: "moia" },
  { company: "Babbel", ats: "ashby", token: "babbel" },
  { company: "Forto", ats: "ashby", token: "forto" },
  { company: "Choco", ats: "ashby", token: "choco" },
  { company: "Zenjob", ats: "ashby", token: "zenjob" },
  { company: "commercetools", ats: "greenhouse", token: "commercetools" },
  { company: "Wunderkind", ats: "greenhouse", token: "wunderkind" },
  { company: "Solaris", ats: "greenhouse", token: "solarisbank" },
  { company: "Staffbase", ats: "greenhouse", token: "staffbase" },
  { company: "Scout24", ats: "greenhouse", token: "scout24" },
  { company: "Flaconi", ats: "greenhouse", token: "flaconi" },
  { company: "Enpal", ats: "ashby", token: "enpal" },
  { company: "Lemon Markets", ats: "ashby", token: "lemon-markets" },
  { company: "Billie", ats: "ashby", token: "billie" },
  { company: "Personio", ats: "personio", token: "personio" },
  { company: "everphone", ats: "personio", token: "everphone" },
  { company: "klarx", ats: "personio", token: "klarx" },
  { company: "rebuy", ats: "recruitee", token: "rebuy" },
  { company: "kfzteile24", ats: "recruitee", token: "kfzteile24" },
  // Rejected, and why each check matters:
  //   Delivery Hero (smartrecruiters) — robots.txt opt-out, see the note in ats.ts
  //   adjust.recruitee.com — a Dutch company, not Adjust GmbH Berlin (offices: Amstelveen, Baarn)
  //   ecosia.jobs.personio.de — abandoned demo board, every description is lorem ipsum
  //   wooga, heycar, preply — live boards, zero Berlin or remote roles today; re-check later
]
