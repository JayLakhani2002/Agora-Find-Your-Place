import { TrpcProvider } from "@/lib/trpc/client"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>
}
