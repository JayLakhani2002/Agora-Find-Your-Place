"use client"

import { type ApplicationRow, ApplicationsTable } from "@/components/ApplicationsTable"
import type { DeckCard } from "@/components/JobCard"
import { RoleQuestionsSheet } from "@/components/RoleQuestionsSheet"
import { type SwipeAction, SwipeDeck } from "@/components/SwipeDeck"
import { trpc } from "@/lib/trpc/client"
import { type TableFilter, matchesFilter } from "@/lib/ui"
import { Button, Card, Spinner, Tabs } from "@agora/ui"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

const FILTERS: { value: TableFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "review", label: "Review matches" },
  { value: "applied", label: "Applied" },
  { value: "declined", label: "Declined" },
]

export default function DashboardPage() {
  const [view, setView] = useState<"review" | "jobs">("review")

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">
          Every card passed the legal checks for your visa. Swipe right to draft an application —
          you always send it yourself.
        </p>
      </header>

      <Tabs
        className="md:max-w-md"
        value={view}
        onChange={(v) => setView(v as "review" | "jobs")}
        items={[
          { value: "review", label: "Quick Review" },
          { value: "jobs", label: "Your Jobs" },
        ]}
      />

      {view === "review" ? <QuickReview /> : <YourJobs />}
    </main>
  )
}

// ── Quick Review: the ranked deck ─────────────────────────────────────────────

function QuickReview() {
  const router = useRouter()
  const [asking, setAsking] = useState<{ jobId: string; title: string } | null>(null)

  const deck = trpc.deck.getDeck.useQuery(undefined, {
    retry: (count, error) => error.data?.code !== "PRECONDITION_FAILED" && count < 2,
  })
  const utils = trpc.useUtils()
  const swipe = trpc.deck.swipe.useMutation({
    // Drop the swiped card from the cached deck. Without this, navigating away and
    // back inside the 60s staleTime re-serves the same cards and the user swipes
    // jobs they already decided on (the server no-ops, so the action is just lost).
    onSuccess: (_res, vars) => {
      utils.deck.getDeck.setData(undefined, (d) =>
        d ? { ...d, cards: d.cards.filter((c) => c.jobId !== vars.jobId) } : d,
      )
      utils.applications.list.invalidate()
    },
  })
  const createApplication = trpc.applications.create.useMutation({
    onSuccess: () => utils.applications.list.invalidate(),
  })

  // The in-flight swipe write. deck.swipe inserts the application shell, so anything
  // that later looks that row up must wait for it — racing the two let create's lookup
  // miss the row and insert a duplicate.
  const swipeInFlight = useRef<Promise<unknown>>(Promise.resolve())

  function handleSwipe(card: DeckCard, action: SwipeAction) {
    // Optimistic: the card has already left the deck. Server side is
    // idempotent (unique user+job index), so a retry can never double-count.
    const swipeAction = action === "save" ? "save" : action
    swipeInFlight.current = swipe
      .mutateAsync({ jobId: card.jobId, action: swipeAction, matchScore: card.matchScore })
      .catch(() => undefined)
    if (action === "right") setAsking({ jobId: card.jobId, title: card.title })
  }

  if (deck.isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-muted">Building your deck — checking legal eligibility…</p>
      </div>
    )
  }

  if (deck.isError) {
    const needsOnboarding = deck.error.data?.code === "PRECONDITION_FAILED"
    return (
      <Card className="w-full text-center">
        {needsOnboarding ? (
          <>
            <h2 className="mb-2 text-lg font-bold">Finish setting up first</h2>
            <p className="mb-4 text-sm text-muted">
              We need your visa status and preferences to filter every job for legal eligibility.
            </p>
            <Link href="/onboarding">
              <Button variant="cta" className="w-full md:w-auto">
                Complete onboarding
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-bold">Couldn't load your deck</h2>
            <p className="mb-4 text-sm text-muted">{deck.error.message}</p>
            <Button onClick={() => deck.refetch()}>Try again</Button>
          </>
        )}
      </Card>
    )
  }

  const remaining = deck.data?.cards.length ?? 0

  return (
    // Narrow, centred column: the deck is a focused one-card-at-a-time view, so
    // it must read as deliberate rather than as a small card lost on a wide page.
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      {remaining > 0 && (
        <p className="text-center text-sm text-muted">
          {remaining} {remaining === 1 ? "match" : "matches"} in your deck
        </p>
      )}

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
            // Waits for the swipe write, rather than racing it: the swipe inserts the
            // application shell, and firing both in parallel let create's lookup miss
            // the row and insert a second one. onError surfaces a quota rejection or
            // network failure instead of silently leaving a row in "Preparing…".
            const jobId = asking.jobId
            swipeInFlight.current.then(() =>
              createApplication.mutate(
                { jobId, roleAnswers: {} },
                {
                  onError: (err) =>
                    window.alert(
                      err.message || "Couldn't start drafting — try again from Your Jobs.",
                    ),
                },
              ),
            )
            setAsking(null)
          }}
          onSubmitted={(applicationId) => {
            setAsking(null)
            router.push(`/applications/${applicationId}/review`)
          }}
        />
      )}
    </div>
  )
}

// ── Your Jobs: the applications table ─────────────────────────────────────────

function YourJobs() {
  const [filter, setFilter] = useState<TableFilter>("all")
  const list = trpc.applications.list.useQuery()

  if (list.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (list.isError) {
    return (
      <Card className="text-center">
        <p className="mb-4 text-sm text-muted">{list.error.message}</p>
        <Button onClick={() => list.refetch()}>Try again</Button>
      </Card>
    )
  }

  const rows = (list.data ?? []) as ApplicationRow[]
  const submitted = rows.filter((r) => r.userSubmittedAt !== null).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Applications submitted" value={submitted} />
        <Stat label="Matches in your list" value={rows.length} />
      </div>

      <Tabs
        className="md:max-w-xl"
        value={filter}
        onChange={(v) => setFilter(v as TableFilter)}
        items={FILTERS.map((f) => ({
          value: f.value,
          label: `${f.label} ${rows.filter((r) => matchesFilter(r.status, f.value)).length}`,
        }))}
      />

      <ApplicationsTable rows={rows.filter((r) => matchesFilter(r.status, filter))} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  )
}
