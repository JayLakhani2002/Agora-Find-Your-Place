"use client"

import { Button } from "@agora/ui"
import { Check, Copy } from "lucide-react"
import { useState } from "react"

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-HTTPS / old browser) — select-and-copy fallback
      window.prompt("Copy with Ctrl/Cmd+C:", text)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  )
}
