"use client"

// Step 1 mock — CV upload row + extracted profile fields. The fields stagger in
// via [data-reveal] handled by the parent band's reveal pass; statically visible
// otherwise.

const FIELDS = [
  { label: "Visa", value: "Student §16b" },
  { label: "Hours", value: "20h/week · 140 days" },
  { label: "German", value: "B1" },
  { label: "Skills", value: "React · SQL · Figma" },
]

export function ProfileMock() {
  return (
    <div className="flex h-full flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-laurel/40 bg-laurel/5 p-3">
        <span aria-hidden className="font-data text-lg text-laurel-text">
          ↑
        </span>
        <div>
          <div className="font-data text-xs text-laurel-text">cv_final_v3.pdf</div>
          <div className="mt-0.5 text-[0.65rem] text-text-mute">Uploaded · extracting…</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {FIELDS.map((f) => (
          <div
            key={f.label}
            data-mock-field
            className="flex items-baseline justify-between rounded-lg bg-marble-deep px-3 py-2"
          >
            <span className="font-data text-[0.65rem] uppercase tracking-wider text-text-mute">
              {f.label}
            </span>
            <span className="text-xs font-medium">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-laurel/30 px-3 py-2 text-center font-data text-[0.65rem] text-laurel-text">
        ✓ Profile ready — matching against it
      </div>
    </div>
  )
}
