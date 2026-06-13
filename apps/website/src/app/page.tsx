import { Footer } from "@/components/Footer"
import { Nav } from "@/components/Nav"
import { SmoothScroll } from "@/components/SmoothScroll"
import { Hero } from "@/components/bands/Hero"
import { Thread } from "@/components/thread/Thread"

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      {/* The Thread overlays the whole document and scroll-draws (§6.4) */}
      <div className="relative">
        <Thread />
        <main className="relative z-10">
          <Hero />

          {/* Placeholder bands — content bands 2–9 arrive in the next stage.
              Kept so the Thread has document height to weave through. */}
          <PlaceholderBand id="story" tone="dark" label="Story · band 2" />
          <PlaceholderBand id="labyrinth" tone="dark" label="The labyrinth · band 3" />
          <PlaceholderBand id="how-it-works" tone="light" label="How it works · band 4" />
          <PlaceholderBand id="why" tone="dark" label="Why it wins · band 5" />
          <PlaceholderBand id="voices" tone="light" label="Voices · band 6" />
          <PlaceholderBand id="meet-ari" tone="dark" label="Meet Ari · band 7" />
          <PlaceholderBand id="faq" tone="light" label="FAQ · band 8" />
        </main>
      </div>
      <Footer />
    </>
  )
}

function PlaceholderBand({
  id,
  tone,
  label,
}: {
  id: string
  tone: "light" | "dark"
  label: string
}) {
  return (
    <section
      id={id}
      className={`band ${tone === "dark" ? "band-dark" : "band-light"} flex min-h-[70vh] items-center`}
    >
      <div className="band-inner py-24">
        <p className={`eyebrow ${tone === "dark" ? "eyebrow-on-ink" : ""}`}>{label}</p>
        <p
          className={`mt-3 max-w-md font-display text-h2 ${tone === "dark" ? "text-text-on-ink" : ""}`}
        >
          Content coming in the next stage.
        </p>
      </div>
    </section>
  )
}
