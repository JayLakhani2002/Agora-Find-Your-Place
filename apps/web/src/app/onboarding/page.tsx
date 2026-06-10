import type { Metadata } from "next"
import { OnboardingWizard } from "./OnboardingWizard"

export const metadata: Metadata = {
  title: "Set up your profile — Agora Jobs",
}

export default function OnboardingPage() {
  return <OnboardingWizard />
}
