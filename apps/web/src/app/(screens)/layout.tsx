import { BottomNav } from "@/components/BottomNav"
import { Sidebar } from "@/components/Sidebar"
import { TrpcProvider } from "@/lib/trpc/client"

export default function ScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <Sidebar />
      {/* Mobile keeps the original narrow column; desktop clears the 15rem rail
          and caps the reading width — without the cap, list rows stretch to a
          1440px monitor's full width and the page reads as sprawl. */}
      <div className="min-h-dvh px-4 pb-24 pt-6 md:pb-10 md:pl-64 md:pr-8">
        <div className="mx-auto w-full max-w-md md:max-w-5xl">{children}</div>
      </div>
      <BottomNav />
    </TrpcProvider>
  )
}
