import { Sidebar } from '@/components/ui/dashboard/sidebar'
import { Header } from '@/components/ui/dashboard/header'
import { requireAuth } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  return (
    <div className="min-h-screen bg-[#0A0E27] w-full">
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen w-full lg:w-auto">
          <Header />
          <main className="flex-1 p-2 sm:p-4 md:p-6 text-gray-200 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}