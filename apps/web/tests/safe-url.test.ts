import { describe, expect, it } from "vitest"
import { safeHttpUrl } from "../src/lib/safe-url"

/**
 * These URLs come from scraped listings and land in `href` / `window.open`. The ingest
 * normaliser filters them today, but `seed-jobs.ts` writes rows without it — so this guard
 * at the render boundary is the one that must hold.
 */
describe("safeHttpUrl", () => {
  it("passes ordinary http and https links through", () => {
    expect(safeHttpUrl("https://jobs.example.de/stelle/123")).toBe(
      "https://jobs.example.de/stelle/123",
    )
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/")
  })

  it("rejects script-bearing schemes", () => {
    // The whole point: a click on this anchor executes in our origin, and the CSP does not
    // stop it because the navigation is user-initiated.
    expect(safeHttpUrl("javascript:alert(document.cookie)")).toBeNull()
    expect(safeHttpUrl("JaVaScRiPt:alert(1)")).toBeNull()
    expect(safeHttpUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeNull()
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull()
    expect(safeHttpUrl("blob:https://example.com/uuid")).toBeNull()
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull()
  })

  it("rejects relative and malformed values", () => {
    expect(safeHttpUrl("/dashboard")).toBeNull()
    expect(safeHttpUrl("not a url")).toBeNull()
    expect(safeHttpUrl("")).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl(undefined)).toBeNull()
  })

  it("is an allow-list, so unknown schemes are rejected by default", () => {
    expect(safeHttpUrl("intent://scan/#Intent;scheme=zxing;end")).toBeNull()
    expect(safeHttpUrl("ws://example.com")).toBeNull()
  })
})
