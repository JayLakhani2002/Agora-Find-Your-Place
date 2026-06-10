"use client"

import { Badge, Button, Card } from "@agora/ui"
import { Check } from "lucide-react"

// Agent 7 owns this screen; Agent 8 owns the billing logic. Checkout wires up
// to billing.* tRPC procedures once Agent 8 ships (BSS funding gate).

const FREE = [
  "Legally-filtered swipe deck",
  "AI-drafted CV + cover letter",
  "Application tracker",
  "Follow-up drafts",
]

const PREMIUM = [
  "Everything in Free",
  "Unlimited applications",
  "Priority document generation",
  "Early access to new sources",
]

export default function PricingPage() {
  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Plans</h1>
        <p className="text-sm text-muted">Start free. Premium arrives soon.</p>
      </header>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Free</h2>
          <span className="text-2xl font-bold">€0</span>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {FREE.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check size={16} className="shrink-0 text-cta" aria-hidden /> {f}
            </li>
          ))}
        </ul>
        <Button variant="outline" disabled>
          Your current plan
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 border-primary/30 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            Premium <Badge variant="info">Coming soon</Badge>
          </h2>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {PREMIUM.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check size={16} className="shrink-0 text-cta" aria-hidden /> {f}
            </li>
          ))}
        </ul>
        <Button variant="primary" disabled>
          Not yet available
        </Button>
        <p className="text-xs text-muted">
          Premium launches with our funding milestone — pricing will be announced then.
        </p>
      </Card>
    </main>
  )
}
