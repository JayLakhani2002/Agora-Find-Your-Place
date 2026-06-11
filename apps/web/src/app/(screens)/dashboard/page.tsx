"use client"

import type { DeckCard } from "@/components/JobCard"
import { RoleQuestionsSheet } from "@/components/RoleQuestionsSheet"
import { type SwipeAction, SwipeDeck } from "@/components/SwipeDeck"
import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner } from "@agora/ui"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function DashboardPage() {
  const router = useRouter()
  const [asking, setAsking] = useState<{ jobId: string; title: string } | null>(null)

  const deck = trpc.deck.getDeck.useQuery(undefined, {
    retry: (count, error) => error.data?.code !== "PRECONDITION_FAILED" && count < 2,
  })
  const swipe = trpc.deck.swipe.useMutation()
  const createApplication = trpc.applications.create.useMutation()

  function handleSwipe(card: DeckCard, action: SwipeAction) {
    // Optimistic: the card has already left the deck. Server side is
    // idempotent (unique user+job index), so a retry can never double-count.
    const swipeAction = action === "save" ? "save" : action
    swipe.mutate({ jobId: card.jobId, action: swipeAction, matchScore: card.matchScore })
    if (action === "right") setAsking({ jobId: card.jobId, title: card.title })
  }

  if (deck.isLoading) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-muted">Building your deck — checking legal eligibility…</p>
      </main>
    )
  }

  if (deck.isError) {
    const needsOnboarding = deck.error.data?.code === "PRECONDITION_FAILED"
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full text-center">
          {needsOnboarding ? (
            <>
              <h1 className="mb-2 text-lg font-bold">Finish setting up first</h1>
              <p className="mb-4 text-sm text-muted">
                We need your visa status and preferences to filter every job for legal eligibility.
              </p>
              <Link href="/onboarding">
                <Button variant="cta" className="w-full">
                  Complete onboarding
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-lg font-bold">Couldn't load your deck</h1>
              <p className="mb-4 text-sm text-muted">{deck.error.message}</p>
              <Button onClick={() => deck.refetch()}>Try again</Button>
            </>
          )}
        </Card>
      </main>
    )
  }

  return (
    <main>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Your deck</h1>
        <p className="text-sm text-muted">
          Every card passed the legal checks for your visa. Swipe right to apply.
        </p>
      </header>

      <SwipeDeck
        cards={deck.data?.cards ?? []}
        onSwipe={handleSwipe}
        emptyState={
          <Card className="text-center">
            <h2 className="mb-2 text-lg font-bold">That's every match for now</h2>
            <p className="mb-4 text-sm text-muted">
              New jobs arrive with the nightly scrape. Saved jobs and drafts live in your tracker.
            </p>
            <Button variant="outline" onClick={() => deck.refetch()} disabled={deck.isFetching}>
              <RefreshCw size={16} aria-hidden className={deck.isFetching ? "animate-spin" : ""} />
              {deck.isFetching ? "Checking…" : "Check again"}
            </Button>
          </Card>
        }
      />

      {asking && (
        <RoleQuestionsSheet
          jobId={asking.jobId}
          jobTitle={asking.title}
          onClose={() => {
            // Closing without answering = skip: enqueue generation with no answers
            // so the application doesn't stay stuck in "pending" forever.
            createApplication.mutate({ jobId: asking.jobId, roleAnswers: {} })
            setAsking(null)
          }}
          onSubmitted={(applicationId) => {
            setAsking(null)
            router.push(`/applications/${applicationId}/review`)
          }}
        />
      )}
    </main>
  )
}
