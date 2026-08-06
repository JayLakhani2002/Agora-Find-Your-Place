import { LegalPage } from "@/components/LegalPage"
import { impressum } from "@/content/legal"

export const metadata = {
  title: `${impressum.title} — Agora`,
  description: "Provider identification under § 5 DDG.",
}

export default function Page() {
  return (
    <LegalPage
      title={impressum.title}
      updated={impressum.updated}
      intro={impressum.intro}
      sections={impressum.sections}
    />
  )
}
