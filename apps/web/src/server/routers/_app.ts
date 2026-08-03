import { createTRPCRouter } from "../trpc"
import { applicationsRouter } from "./applications"
import { billingRouter } from "./billing"
import { deckRouter } from "./deck"
import { gdprRouter } from "./gdpr"
import { jobsRouter } from "./jobs"
import { onboardingRouter } from "./onboarding"
import { profileRouter } from "./profile"
import { resumesRouter } from "./resumes"

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  gdpr: gdprRouter,
  deck: deckRouter,
  applications: applicationsRouter,
  billing: billingRouter,
  resumes: resumesRouter,
})

export type AppRouter = typeof appRouter
