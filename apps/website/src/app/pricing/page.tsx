import { ComingSoon, comingSoonMetadata } from "@/components/ComingSoon"

export const metadata = comingSoonMetadata("pricing")

export default function Page() {
  return <ComingSoon page="pricing" />
}
