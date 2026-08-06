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
 *   shell  Hero        — you, with the engine running in a dark panel in front of you
 *   shell  ProofWall   — real companies, real index
 *   DARK   Problem     — the mess the machine exists to absorb
 *   shell  Pipeline    — the four steps, handed back to you
 *   DARK   Numbers     — the machine reporting on itself
 *   shell  Germany     — the moat, in your language
 *   DARK   Platforms   — the agent, everywhere you already are
 *   shell  Offer       — early access and pricing
 *   shell  FaqTeaser   — the honesty anchor
 *   DARK   Cta         — the close, and the footer continues the same dark band
 *
 * Reviews sits between Platforms and Offer and renders nothing at all: the flag is false
 * and stays false until real beta quotes exist. It is in the tree so that switching it on
 * later is a content change rather than a build.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <ProofWall />
      <Problem />
      <Pipeline />
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
