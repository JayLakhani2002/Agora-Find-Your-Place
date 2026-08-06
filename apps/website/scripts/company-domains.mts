/**
 * Hand-verified `company name in the DB` → `official domain` map, used only to fetch a
 * logo for the proof wall.
 *
 * WHY A MAP AND NOT A LOOKUP: the `jobs` table stores `source_url`, which always points at
 * the job board (arbeitsagentur.de, arbeitnow.com, stellenticket.tu-berlin.de) and never at
 * the employer. There is no employer domain anywhere in the data, so a domain has to be
 * supplied by hand. Guessing one algorithmically is not acceptable here — a wrong guess
 * puts another company's logo next to a name, which is a misrepresentation, not a glitch.
 *
 * RULES for adding an entry:
 *  1. The key must match `jobs.company` EXACTLY, including the legal suffix.
 *  2. The domain must be the company's own official site, verified by a human.
 *  3. Presence here is NOT a claim that the company is a partner, a customer, or that it
 *     hired anyone through us. The wall only ever says these employers have roles in our
 *     index — and `fetch-live-data.mts` re-checks that against the live database on every
 *     build, so a company that stops appearing in the index drops off the wall by itself.
 *
 * A company with no entry simply renders as a text mark. That is the intended fallback,
 * not a failure state.
 */
export const COMPANY_DOMAINS: Record<string, string> = {
  // Consumer names people recognise instantly
  "Zalando SE": "zalando.de",
  SumUp: "sumup.com",
  "Deutsche Post AG": "deutschepost.de",
  Flix: "flix.com",
  "Wolt - English": "wolt.com",
  "IONOS SE": "ionos.de",
  "Lidl Dienstleistung GmbH & Co. KG": "lidl.de",
  "Netto Marken-Discount Stiftung & Co. KG": "netto-online.de",
  "idealo internet GmbH": "idealo.de",
  "KoRo Handels GmbH": "korodrogerie.de",
  "HELLWEG Die Profi-Bau-& Gartenmärkte GmbH & Co. KG": "hellweg.de",
  "Premier Inn Holding GmbH": "premierinn.de",

  // Berlin institutions and public bodies
  "Berliner Verkehrsbetriebe (BVG)": "bvg.de",
  "Stromnetz Berlin GmbH": "stromnetz.berlin",
  "Vivantes Netzwerk für Gesundheit GmbH": "vivantes.de",
  "Tech­ni­sche Uni­ver­si­tät Ber­lin": "tu.berlin",
  "Fraun­ho­fer Hein­rich-Hertz-Insti­tut": "hhi.fraunhofer.de",
  "Max-Planck-Institute for Human Development": "mpib-berlin.mpg.de",
  "Ärzte ohne Gren­zen e.V.": "aerzte-ohne-grenzen.de",

  // Tech and scale-ups
  Speechify: "speechify.com",
  "1KOMMA5˚": "1komma5grad.com",
  Buena: "buena.com",
  "Distribusion Technologies": "distribusion.com",
  Lassie: "lassie.co",
  Lumiform: "lumiform.com",
  "Adfinis AG": "adfinis.com",
  CGI: "cgi.com",
  "TELUS Digital": "telusdigital.com",
  "K-tronik GmbH": "k-tronik.de",
  "Projektron GmbH": "projektron.de",
  Consultport: "consultport.com",
}
