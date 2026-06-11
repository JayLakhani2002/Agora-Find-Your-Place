"use client"

import { trpc } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

// ── Design tokens (Agora design system; Tailwind not yet wired by Agent 7) ──
const C = {
  primary: "#0369A1",
  cta: "#22C55E",
  bg: "#F0F9FF",
  text: "#0C4A6E",
  muted: "#475569",
  border: "#E2E8F0",
}

const VISA_OPTIONS = [
  { value: "student_visa_16b", label: "Student visa (§16b)", hint: "20 h/week during term" },
  { value: "chancenkarte_20a", label: "Chancenkarte (§20a)", hint: "20 h/week" },
  { value: "near_graduation", label: "Near graduation", hint: "20 h/week" },
  { value: "eu_citizen", label: "EU citizen", hint: "No hour limit" },
  { value: "blue_card", label: "EU Blue Card", hint: "No hour limit" },
] as const

const GERMAN_LEVELS = ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"] as const

type VisaType = (typeof VISA_OPTIONS)[number]["value"]
type GermanLevel = (typeof GERMAN_LEVELS)[number]

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [visaType, setVisaType] = useState<VisaType | "">("")
  const [daysRemaining, setDaysRemaining] = useState("")
  const [semesterEnd, setSemesterEnd] = useState("")
  // Step 2
  const [germanLevel, setGermanLevel] = useState<GermanLevel>("B1")
  const [fields, setFields] = useState("")
  const [location, setLocation] = useState("Berlin")
  const [minRate, setMinRate] = useState("")
  // Step 3
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)

  const saveVisaStep = trpc.onboarding.saveVisaStep.useMutation()
  const savePreferences = trpc.onboarding.savePreferences.useMutation()
  const confirmUploadMutation = trpc.onboarding.confirmUpload.useMutation()
  const completeMutation = trpc.onboarding.complete.useMutation()

  async function submitVisa() {
    if (!visaType) return setError("Please select your visa status.")
    setError(null)
    setBusy(true)
    try {
      await saveVisaStep.mutateAsync({
        visaType,
        daysRemainingThisYear: daysRemaining ? Number(daysRemaining) : undefined,
        semesterEnd: semesterEnd ? new Date(semesterEnd) : undefined,
      })
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function submitPreferences() {
    setError(null)
    setBusy(true)
    try {
      await savePreferences.mutateAsync({
        germanLevel,
        preferredFields: fields
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
          .slice(0, 10),
        locationPreference: location || "Berlin",
        minHourlyRate: minRate ? Number(minRate) : undefined,
      })
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function submitCv() {
    if (!file) return setError("Please choose your CV (PDF).")
    setError(null)
    setBusy(true)
    setExtracting(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload/cv", { method: "POST", body })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? "Upload failed. Please try again.")
      }
      const { key } = (await res.json()) as { key: string }

      await confirmUploadMutation.mutateAsync({
        storageKey: key,
        filename: file.name,
        sizeBytes: file.size,
      })
      // Extraction runs in the background worker — no need to block the user.
      await completeMutation.mutateAsync()
      router.push("/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setExtracting(false)
      setBusy(false)
    }
  }

  return (
    <main className="wrap">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: "IBM Plex Sans", system-ui, sans-serif; color: ${C.text}; }
      `}</style>

      <div className="card">
        <Progress step={step} />
        <h1 className="title">
          {step === 1 && "Your work eligibility"}
          {step === 2 && "Your preferences"}
          {step === 3 && "Upload your CV"}
        </h1>
        <p className="sub">
          {step === 1 && "This sets the legal limits we filter every job against."}
          {step === 2 && "Tell us what you're looking for."}
          {step === 3 && "We extract skills only — never your name, address, or contact details."}
        </p>

        {step === 1 && (
          <div className="stack">
            <label className="lbl" htmlFor="visa">
              Visa status
            </label>
            <div className="opts">
              {VISA_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={`opt ${visaType === o.value ? "sel" : ""}`}
                  onClick={() => setVisaType(o.value)}
                >
                  <span className="optLabel">{o.label}</span>
                  <span className="optHint">{o.hint}</span>
                </button>
              ))}
            </div>
            <label className="lbl" htmlFor="days">
              Days already worked this year (optional)
            </label>
            <input
              id="days"
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(e.target.value)}
              placeholder="e.g. 40"
            />
            <label className="lbl" htmlFor="sem">
              Semester end date (optional)
            </label>
            <input
              id="sem"
              className="input"
              type="date"
              value={semesterEnd}
              onChange={(e) => setSemesterEnd(e.target.value)}
            />
            {error && <p className="err">{error}</p>}
            <button type="button" className="cta" onClick={submitVisa} disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <label className="lbl" htmlFor="german">
              German level
            </label>
            <select
              id="german"
              className="input"
              value={germanLevel}
              onChange={(e) => setGermanLevel(e.target.value as GermanLevel)}
            >
              {GERMAN_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l === "none" ? "None / English only" : l.toUpperCase()}
                </option>
              ))}
            </select>
            <label className="lbl" htmlFor="fields">
              Preferred fields (comma separated)
            </label>
            <input
              id="fields"
              className="input"
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              placeholder="e.g. software, data, marketing"
            />
            <label className="lbl" htmlFor="loc">
              Location
            </label>
            <input
              id="loc"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <label className="lbl" htmlFor="rate">
              Minimum hourly rate € (optional)
            </label>
            <input
              id="rate"
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              value={minRate}
              onChange={(e) => setMinRate(e.target.value)}
              placeholder="e.g. 15"
            />
            {error && <p className="err">{error}</p>}
            <div className="row">
              <button type="button" className="ghost" onClick={() => setStep(1)} disabled={busy}>
                Back
              </button>
              <button type="button" className="cta" onClick={submitPreferences} disabled={busy}>
                {busy ? "Saving…" : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <label className="drop" htmlFor="cv">
              <input
                id="cv"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={extracting}
                style={{ display: "none" }}
              />
              <span className="dropTitle">{file ? file.name : "Choose your CV (PDF)"}</span>
              <span className="dropHint">Skills only are extracted — PII is never stored.</span>
            </label>
            {error && <p className="err">{error}</p>}
            <div className="row">
              <button type="button" className="ghost" onClick={() => setStep(2)} disabled={busy}>
                Back
              </button>
              <button type="button" className="cta" onClick={submitCv} disabled={busy}>
                {extracting ? "Reading your CV…" : "Finish"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .card {
          width: 100%; max-width: 440px; padding: 24px;
          background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 16px;
          box-shadow: 0 10px 25px rgba(3, 105, 161, 0.12);
        }
        .title { font-size: 22px; font-weight: 600; margin: 16px 0 4px; }
        .sub { font-size: 14px; color: ${C.muted}; margin: 0 0 20px; line-height: 1.5; }
        .stack { display: flex; flex-direction: column; gap: 10px; }
        .lbl { font-size: 13px; font-weight: 500; margin-top: 6px; }
        .input {
          width: 100%; min-height: 44px; padding: 10px 14px; font-size: 16px;
          border: 1px solid ${C.border}; border-radius: 8px; background: #fff; color: ${C.text};
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .input:focus { outline: none; border-color: ${C.primary}; box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.15); }
        .opts { display: grid; gap: 8px; }
        .opt {
          display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
          padding: 12px 14px; min-height: 44px; text-align: left; cursor: pointer;
          border: 1px solid ${C.border}; border-radius: 8px; background: #fff; color: ${C.text};
          transition: border-color 200ms ease, background 200ms ease;
        }
        .opt:hover { border-color: ${C.primary}; }
        .opt.sel { border-color: ${C.primary}; background: rgba(3, 105, 161, 0.08); }
        .opt:focus-visible { outline: 2px solid ${C.primary}; outline-offset: 2px; }
        .optLabel { font-weight: 600; font-size: 15px; }
        .optHint { font-size: 12px; color: ${C.muted}; }
        .drop {
          display: flex; flex-direction: column; gap: 6px; align-items: center; justify-content: center;
          padding: 28px 16px; cursor: pointer; text-align: center;
          border: 2px dashed ${C.primary}; border-radius: 12px; background: rgba(3, 105, 161, 0.04);
          transition: background 200ms ease;
        }
        .drop:hover { background: rgba(3, 105, 161, 0.08); }
        .dropTitle { font-weight: 600; }
        .dropHint { font-size: 12px; color: ${C.muted}; }
        .cta {
          min-height: 48px; padding: 12px 24px; font-size: 16px; font-weight: 600; cursor: pointer;
          color: #fff; background: ${C.cta}; border: none; border-radius: 8px; flex: 1;
          transition: opacity 200ms ease, transform 200ms ease;
        }
        .cta:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .cta:disabled { opacity: 0.6; cursor: default; }
        .ghost {
          min-height: 48px; padding: 12px 20px; font-size: 16px; font-weight: 600; cursor: pointer;
          color: ${C.primary}; background: transparent; border: 2px solid ${C.primary}; border-radius: 8px;
          transition: background 200ms ease;
        }
        .ghost:hover:not(:disabled) { background: rgba(3, 105, 161, 0.08); }
        .row { display: flex; gap: 10px; margin-top: 8px; }
        .err { color: #dc2626; font-size: 13px; margin: 4px 0 0; }
      `}</style>
    </main>
  )
}

function Progress({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: n <= step ? C.primary : C.border,
            transition: "background 200ms ease",
          }}
        />
      ))}
    </div>
  )
}
