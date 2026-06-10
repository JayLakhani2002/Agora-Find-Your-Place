import type { AppRouter } from "@/server/routers/_app"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

// Onboarding-local vanilla tRPC client. Agent 7 owns the app-wide React Query
// client (lib/trpc/client.ts); the wizard migrates to it once that exists.
// Relative URL is fine — the wizard is a client component, so it runs in the browser.
export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
})
