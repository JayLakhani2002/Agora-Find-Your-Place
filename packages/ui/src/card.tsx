import type { HTMLAttributes } from "react"
import { cn } from "./cn"

/** Glassmorphism surface — the project's signature card. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/50 bg-white/80 p-6 shadow-glass backdrop-blur-md",
        className,
      )}
      {...props}
    />
  )
}
