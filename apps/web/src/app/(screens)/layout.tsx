import { BottomNav } from "@/components/BottomNav"
import { TrpcProvider } from "@/lib/trpc/client"

export default function ScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6">{children}</div>
      <BottomNav />
    </TrpcProvider>
  )
}
