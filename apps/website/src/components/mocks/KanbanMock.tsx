"use client"

// Step 4 mock — application pipeline board with one celebrated card.

const COLUMNS = [
  { title: "Applied", cards: ["Werkstudent QA", "Working Student Ops"] },
  { title: "Interview", cards: ["Werkstudent Frontend"] },
  { title: "Offer", cards: [] as string[] },
]

export function KanbanMock() {
  return (
    <div className="flex h-full gap-2 px-3 py-3">
      {COLUMNS.map((col) => (
        <div key={col.title} className="flex-1">
          <div className="font-data text-[0.6rem] uppercase tracking-wider text-text-mute">
            {col.title}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {col.cards.map((card) => {
              const highlight = card === "Werkstudent Frontend"
              return (
                <div
                  key={card}
                  className={
                    highlight
                      ? "rounded-lg border border-laurel/60 bg-laurel/10 p-2"
                      : "rounded-lg border border-text/10 bg-marble-deep p-2"
                  }
                >
                  <div className="text-[0.65rem] font-medium leading-tight">{card}</div>
                  {highlight && (
                    <div className="mt-1.5 font-data text-[0.55rem] text-laurel-text">
                      ✓ Interview invited · prep ready
                    </div>
                  )}
                </div>
              )
            })}
            {col.cards.length === 0 && (
              <div className="rounded-lg border border-dashed border-text/15 p-2 text-center text-[0.6rem] text-text-mute">
                soon
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
