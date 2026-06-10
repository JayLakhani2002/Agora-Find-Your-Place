import { createTRPCRouter } from "../trpc"
import { gdprRouter } from "./gdpr"
import { jobsRouter } from "./jobs"
import { onboardingRouter } from "./onboarding"
import { profileRouter } from "./profile"
// Agent 5: import { deckRouter } from "./deck"
// Agent 6: import { applicationsRouter } from "./applications"
// Agent 8: import { billingRouter } from "./billing"

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  gdpr: gdprRouter,
  // Agent 5: deck: deckRouter,
  // Agent 6: applications: applicationsRouter,
  // Agent 8: billing: billingRouter,
})

export type AppRouter = typeof appRouter
