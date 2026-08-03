"use client"

import { JobListCard, type JobListItem } from "@/components/JobListCard"
import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner } from "@agora/ui"
import Link from "next/link"

export default function SavedJobsPage() {
  const utils = trpc.useUtils()
  const saved = trpc.jobs.saved.useQuery()
  const toggleSave = trpc.jobs.toggleSave.useMutation({
    onSuccess: () => utils.jobs.invalidate(),
  })

  function handleToggleSave(job: JobListItem) {
    toggleSave.mutate({ jobId: job.id, saved: !job.saved })
  }

  if (saved.isLoading) {
    return (
      <main className="flex justify-center py-10">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  if (saved.isError) {
    return (
      <main>
        <Card className="text-center">
          <p className="mb-4 text-sm text-muted">{saved.error.message}</p>
          <Button onClick={() => saved.refetch()}>Try again</Button>
        </Card>
      </main>
    )
  }

  const jobs = saved.data?.jobs ?? []

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Saved Jobs</h1>
        <p className="text-sm text-muted">
          Bookmarks from the job board and your deck. Removing one here does not withdraw an
          application you already started.
        </p>
      </header>

      {jobs.length === 0 ? (
        <Card className="text-center">
          <h2 className="mb-2 text-lg font-bold">Nothing saved yet</h2>
          <p className="mb-4 text-sm text-muted">
            Bookmark a listing from the job board and it will wait for you here.
          </p>
          <Link href="/jobs">
            <Button variant="cta">Browse jobs</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobListCard
              key={job.id}
              job={job}
              onToggleSave={handleToggleSave}
              pending={toggleSave.isPending}
            />
          ))}
        </div>
      )}
    </main>
  )
}
