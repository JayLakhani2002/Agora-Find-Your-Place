import { Footer } from "@/components/Footer"
import { Nav } from "@/components/Nav"
import { Employers } from "@/components/bands/Employers"
import { Faq } from "@/components/bands/Faq"
import { Hero } from "@/components/bands/Hero"
import { HowItWorks } from "@/components/bands/HowItWorks"
import { Labyrinth } from "@/components/bands/Labyrinth"
import { MeetAri } from "@/components/bands/MeetAri"
import { Story } from "@/components/bands/Story"
import { Voices } from "@/components/bands/Voices"
import { Waitlist } from "@/components/bands/Waitlist"
import { WhyItWins } from "@/components/bands/WhyItWins"

export default function Home() {
  return (
    <>
      <Nav />
      <div className="relative">
        <main className="relative z-10">
          <Hero />
          <Story />
          <Labyrinth />
          <HowItWorks />
          <WhyItWins showStats={process.env.SHOW_STATS === "true"} />
          <Employers />
          <Voices />
          <MeetAri />
          <Faq />
          <Waitlist />
        </main>
      </div>
      <Footer />
    </>
  )
}
