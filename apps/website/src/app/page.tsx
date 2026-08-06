import { Cta } from "@/components/sections/Cta"
import { Eligibility } from "@/components/sections/Eligibility"
import { FaqTeaser } from "@/components/sections/FaqTeaser"
import { Hero } from "@/components/sections/Hero"
import { Numbers } from "@/components/sections/Numbers"
import { Offer } from "@/components/sections/Offer"
import { Pipeline } from "@/components/sections/Pipeline"
import { Platforms } from "@/components/sections/Platforms"
import { Problem } from "@/components/sections/Problem"
import { ProofWall } from "@/components/sections/ProofWall"
import { Reviews } from "@/components/sections/Reviews"

/**
 * The one-page site, per COPY-v4.md (approved by Jay 2026-08-04).
 *
 * The order below IS the design. Shell bands are about the reader, dark bands are about
 * the machine, and that alternation is what the "split canvas" direction means:
 *
 *   FILM   Hero        — four scrubbed scenes: it finds, it explains, it drafts, you apply
 *   DARK   Problem     — the mess the machine exists to absorb
 *   shell  Pipeline    — the four steps, handed back to you
 *   shell  ProofWall   — every kind of work, printed from the index
 *   DARK   Numbers     — the machine reporting on itself
 *   shell  Eligibility — the rules layer, in your language
 *   DARK   Platforms   — the agent, everywhere you already are
 *   shell  Offer       — early access and pricing
 *   shell  FaqTeaser   — the honesty anchor
 *   DARK   Cta         — the close, and the footer continues the same dark band
 *
 * ProofWall moved down from position 2 (2026-08-06). Two reasons. The film is itself a
 * live-data proof surface, so back-to-back proof read as repetition; and ProofWall's real
 * rows include kitchen and warehouse work, which at position 2 put those roles 800px from
 * the top — the exact thing Jay asked to move out of the opening. After Pipeline the same
 * rows land as coverage evidence for a mechanism the reader now understands, rather than as
 * the site's identity. Pipeline (light) into ProofWall (ivory-deep, border-y) puts two light
 * bands together, but the wash and the double-rule dateline already make ProofWall read as a
 * separate paper object, so the rhythm holds.
 *
 * Reviews sits between Platforms and Offer and renders nothing at all: the flag is false
 * and stays false until real beta quotes exist. It is in the tree so that switching it on
 * later is a content change rather than a build.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Pipeline />
      <ProofWall />
      <Numbers />
      <Eligibility />
      <Platforms />
      <Reviews />
      <Offer />
      <FaqTeaser />
      <Cta />
    </>
  )
}
