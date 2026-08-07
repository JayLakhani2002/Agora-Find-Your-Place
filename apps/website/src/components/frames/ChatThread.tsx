import { FilmSteps, filmStepWindows } from "@/components/ui/FilmSteps"
import { cn } from "@/lib/cn"

/**
 * ChatThread — a message exchange, revealed one bubble at a time by the scrub.
 *
 * GENERIC MESSAGING AFFORDANCES ONLY. This must not resemble WhatsApp, iMessage, Telegram or
 * any other product: no green outgoing bubble, no chat wallpaper, no bubble tails, no platform
 * mark anywhere. That is a trademark and passing-off point, not a style preference, and "make it
 * look more like the real app" is a request to take on that risk. What is left is the part
 * nobody owns — left/right alignment and two surfaces — drawn in our own tokens.
 *
 * The two surfaces are also the reason the sides are distinguishable without colour vision:
 * position carries the sender, and the ink/ivory contrast carries it again. Both bubbles are
 * OPAQUE, because these frames sit over moving hero footage and a translucent bubble is legible
 * on some frames and not others (on-dark/ink-card 14.58:1, text/ivory 16.23:1).
 *
 * NO `role="img"`, deliberately diverging from the other frames/* components. They collapse
 * their subtree behind an `aria-label`, which is fine for a decorative sample card. It is not
 * fine here: one of these bubbles is the user saying yes before anything is submitted, and that
 * approval is the honest part of the exchange. Routing it through `alt` would make the marking
 * depend on whoever next edits the copy remembering to keep the summary in sync with `messages`
 * — so the bubbles stay real DOM text and `alt` is an sr-only summary, not a substitute.
 *
 * `children` sits outside the figure for the same reason, one step further: a caller passing a
 * tracker table is passing real content. It still reveals in sequence — both halves are indexed
 * off ONE window table, so the table's fade continues where the last bubble stopped.
 */

export interface ChatThreadProps {
  messages: readonly { from: "agent" | "user"; text: string }[]
  alt: string
  children?: React.ReactNode
  className?: string
}

const BUBBLE = {
  agent: "mr-auto rounded-bl-sm bg-ink-card text-text-on-dark",
  user: "ml-auto rounded-br-sm bg-ivory text-text",
} as const

export function ChatThread({ messages, alt, children, className }: ChatThreadProps) {
  const windows = filmStepWindows(messages.length + (children ? 1 : 0))

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <figure>
        <figcaption className="sr-only">{alt}</figcaption>
        <FilmSteps windows={windows.slice(0, messages.length)} className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <p
              key={m.text}
              className={cn(
                // 85%, not 100%: a thread where both sides span the full width loses the
                // left/right signal entirely at 390px, which is the only signal of who is
                // speaking.
                "max-w-[85%] rounded-card px-4 py-2.5 text-[0.9375rem] leading-snug shadow-card",
                BUBBLE[m.from],
              )}
            >
              {m.text}
            </p>
          ))}
        </FilmSteps>
      </figure>

      {children ? <FilmSteps windows={windows.slice(messages.length)}>{children}</FilmSteps> : null}
    </div>
  )
}
