"use client"

import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner } from "@agora/ui"
import { CreditCard, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const GERMAN_LEVELS = ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"] as const
type GermanLevel = (typeof GERMAN_LEVELS)[number]

export default function SettingsPage() {
  const profile = trpc.profile.get.useQuery()
  const update = trpc.profile.update.useMutation()
  const deleteAccount = trpc.gdpr.deleteAccount.useMutation({
    // Clerk session is gone after erasure — a hard navigation resets everything.
    onSuccess: () => window.location.assign("/"),
  })

  const [germanLevel, setGermanLevel] = useState<GermanLevel>("B1")
  const [location, setLocation] = useState("")
  const [minRate, setMinRate] = useState("")
  const [fields, setFields] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (profile.data && !loaded) {
      setGermanLevel((profile.data.germanLevel as GermanLevel | null) ?? "B1")
      setLocation(profile.data.locationPreference ?? "")
      setMinRate(profile.data.minHourlyRate?.toString() ?? "")
      setFields((profile.data.preferredFields ?? []).join(", "))
      setLoaded(true)
    }
  }, [profile.data, loaded])

  function save() {
    update.mutate({
      germanLevel,
      ...(location.trim() ? { locationPreference: location.trim() } : {}),
      ...(minRate ? { minHourlyRate: Number(minRate) } : {}),
      preferredFields: fields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 10),
    })
  }

  if (profile.isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="font-bold">Profile</h2>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          German level
          <select
            value={germanLevel}
            onChange={(e) => setGermanLevel(e.target.value as GermanLevel)}
            className="min-h-11 cursor-pointer rounded-lg border border-line bg-white p-2.5 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
          >
            {GERMAN_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === "none" ? "None / English only" : l === "native" ? "Native" : l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="min-h-11 rounded-lg border border-line p-2.5 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
            placeholder="Berlin"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Minimum hourly rate (€)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={minRate}
            onChange={(e) => setMinRate(e.target.value)}
            className="min-h-11 rounded-lg border border-line p-2.5 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
            placeholder="15"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Preferred fields (comma separated)
          <input
            value={fields}
            onChange={(e) => setFields(e.target.value)}
            className="min-h-11 rounded-lg border border-line p-2.5 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
            placeholder="software, data, marketing"
          />
        </label>

        <Button variant="primary" onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving…" : update.isSuccess ? "Saved" : "Save changes"}
        </Button>
        {update.isError && <p className="text-sm text-red-600">{update.error.message}</p>}
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <CreditCard size={18} aria-hidden /> Plan
        </h2>
        <p className="text-sm text-muted">
          You're on the free plan. Premium features unlock as they launch.
        </p>
        <Link href="/pricing">
          <Button variant="outline" className="w-full">
            See plans
          </Button>
        </Link>
      </Card>

      <Card className="flex flex-col gap-3 border-red-200 p-4">
        <h2 className="flex items-center gap-2 font-bold text-red-700">
          <ShieldAlert size={18} aria-hidden /> Delete account
        </h2>
        <p className="text-sm text-muted">
          Permanently erases your profile, documents, and applications (GDPR Art. 17). This cannot
          be undone.
        </p>
        {!showDelete ? (
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete my account…
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="confirm-delete">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </label>
            <input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="min-h-11 rounded-lg border border-line p-2.5 text-base transition-colors duration-200 focus:border-red-500 focus:outline-none"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={confirmText !== "DELETE" || deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                {deleteAccount.isPending ? "Erasing…" : "Erase everything"}
              </Button>
            </div>
            {deleteAccount.isError && (
              <p className="text-sm text-red-600">{deleteAccount.error.message}</p>
            )}
          </div>
        )}
      </Card>
    </main>
  )
}
