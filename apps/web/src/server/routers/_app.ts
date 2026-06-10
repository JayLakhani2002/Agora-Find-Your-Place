import { createTRPCRouter } from "../trpc"
import { deckRouter } from "./deck"
import { gdprRouter } from "./gdpr"
import { jobsRouter } from "./jobs"
import { onboardingRouter } from "./onboarding"
import { profileRouter } from "./profile"
// Agent 6: import { applicationsRouter } from "./applications"
// Agent 8: import { billingRouter } from "./billing"

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  gdpr: gdprRouter,
  deck: deckRouter,
  // Agent 6: applications: applicationsRouter,
  // Agent 8: billing: billingRouter,
})

export type AppRouter = typeof appRouter
