import { createTRPCRouter } from "../trpc"
// Agent 4: import { onboardingRouter } from "./onboarding"
// Agent 4: import { profileRouter } from "./profile"
// Agent 5: import { deckRouter } from "./deck"
// Agent 6: import { applicationsRouter } from "./applications"
// Agent 8: import { billingRouter } from "./billing"

export const appRouter = createTRPCRouter({
  // Agent 4: onboarding: onboardingRouter,
  // Agent 4: profile: profileRouter,
  // Agent 5: deck: deckRouter,
  // Agent 6: applications: applicationsRouter,
  // Agent 8: billing: billingRouter,
})

export type AppRouter = typeof appRouter
