import { Check } from "lucide-react"
import Link from "next/link"

const PROMISES = [
  "Every job pre-checked against your visa's work limits",
  "CV + cover letter drafted in German, quality-scored",
  "You always click Apply yourself — full control",
]

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header>
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
          Agora Jobs
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight">
          Your first job in Germany, <span className="text-primary">legally checked.</span>
        </h1>
      </header>

      <ul className="flex flex-col gap-3">
        {PROMISES.map((p) => (
          <li key={p} className="flex items-start gap-3 text-base">
            <Check size={20} className="mt-0.5 shrink-0 text-cta" aria-hidden />
            {p}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg bg-cta px-6 text-lg font-semibold text-white transition-colors duration-200 hover:bg-cta/90"
        >
          Start swiping
        </Link>
        <p className="text-center text-xs text-muted">
          Built for international students in Berlin. Free to start.
        </p>
      </div>
    </main>
  )
}
