import { LegalPage } from "@/components/LegalPage"
import { privacy } from "@/content/legal"

export const metadata = {
  title: `${privacy.title} — Agora`,
  description:
    "How Agora handles your personal data: what we collect, how AI processes it, where it is stored, and how to delete it. EU-only, GDPR.",
}

export default function Page() {
  return (
    <LegalPage
      title={privacy.title}
      updated={privacy.updated}
      intro={privacy.intro}
      sections={privacy.sections}
    />
  )
}
