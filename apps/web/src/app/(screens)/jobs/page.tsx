"use client"

import { JobListCard, type JobListItem } from "@/components/JobListCard"
import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner } from "@agora/ui"
import { Search } from "lucide-react"
import { useState } from "react"

const CONTRACT_TYPES = [
  "werkstudent",
  "minijob",
  "vollzeit",
  "teilzeit",
  "praktikum",
  "freelance",
] as const

type ContractType = (typeof CONTRACT_TYPES)[number]

export default function JobSearchPage() {
  // Draft state is separate from applied state so typing doesn't refetch on
  // every keystroke — the query only moves when the form is submitted.
  const [draft, setDraft] = useState({ query: "", location: "" })
  const [filters, setFilters] = useState<{
    query: string
    location: string
    // Explicit `| undefined`: the repo runs exactOptionalPropertyTypes, so
    // "absent" and "set to undefined" are distinct types and setFilters writes
    // the latter when clearing the chip.
    contractType: ContractType | undefined
    page: number
  }>({ query: "", location: "", contractType: undefined, page: 0 })

  const utils = trpc.useUtils()
  const search = trpc.jobs.search.useQuery(filters)
  const toggleSave = trpc.jobs.toggleSave.useMutation({
    onSuccess: () => utils.jobs.invalidate(),
  })

  function handleToggleSave(job: JobListItem) {
    toggleSave.mutate({ jobId: job.id, saved: !job.saved })
  }

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Job Search</h1>
        <p className="text-sm text-muted">
          Every listing we've scraped. Your dashboard deck ranks these against your profile and
          filters them for visa eligibility — this page does not.
        </p>
      </header>

      <Card className="flex flex-col gap-3 p-5">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            setFilters((f) => ({ ...f, ...draft, page: 0 }))
          }}
        >
          <input
            type="search"
            value={draft.query}
            onChange={(e) => setDraft((d) => ({ ...d, query: e.target.value }))}
            placeholder="Job title or company"
            aria-label="Job title or company"
            className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm"
          />
          <input
            type="search"
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            placeholder="Location"
            aria-label="Location"
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm md:w-56"
          />
          <Button type="submit" variant="cta">
            <Search size={16} aria-hidden />
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All types"
            active={filters.contractType === undefined}
            onClick={() => setFilters((f) => ({ ...f, contractType: undefined, page: 0 }))}
          />
          {CONTRACT_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={type}
              active={filters.contractType === type}
              onClick={() => setFilters((f) => ({ ...f, contractType: type, page: 0 }))}
            />
          ))}
        </div>
      </Card>

      {search.isLoading && (
        <div className="flex justify-center py-10">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {search.isError && (
        <Card className="text-center">
          <p className="mb-4 text-sm text-muted">{search.error.message}</p>
          <Button onClick={() => search.refetch()}>Try again</Button>
        </Card>
      )}

      {search.data && search.data.jobs.length === 0 && (
        <Card className="text-center">
          <h2 className="mb-2 text-lg font-bold">No jobs match those filters</h2>
          <p className="text-sm text-muted">Try a broader title, or clear the contract type.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {search.data?.jobs.map((job) => (
          <JobListCard
            key={job.id}
            job={job}
            onToggleSave={handleToggleSave}
            pending={toggleSave.isPending}
          />
        ))}
      </div>

      {search.data && (filters.page > 0 || search.data.hasMore) && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 0}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted">Page {filters.page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!search.data.hasMore}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors duration-200 ${
        active ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  )
}
