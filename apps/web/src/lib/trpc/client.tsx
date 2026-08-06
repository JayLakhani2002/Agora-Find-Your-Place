"use client"

import type { AppRouter } from "@/server/routers/_app"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { type CreateTRPCReact, createTRPCReact } from "@trpc/react-query"
import { type ReactNode, useState } from "react"

// App-wide typed tRPC + React Query client (Agent 7 owns this file).
// All reads via useQuery, writes via useMutation — never raw fetch to our API.
//
// The explicit annotation is required, not decorative: without it tsc infers a type
// that references @trpc/react-query's internal `getQueryKey.d-*.mjs` chunk by relative
// path into node_modules, which is not portable under pnpm's symlinked store (TS2742).
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>()

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetch storms on tab focus during a swipe session.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient()
  // Browser: singleton so React suspense never recreates the client mid-render.
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function TrpcProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    trpc.createClient({
      // Client components only — relative URL always hits our own /api/trpc.
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
