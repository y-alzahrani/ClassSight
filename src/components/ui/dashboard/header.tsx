import { getUserProfile } from '@/lib/auth'
import { UserMenu } from '@/components/ui/dashboard/user-menu'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export async function Header() {
  const user = await getUserProfile()
  
  return (
    <header className="bg-[#1E293B] border-b border-[#334155] shadow-lg px-2 sm:px-4 md:px-6 py-3 md:py-4 w-full">
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search rooms, reports..."
              className="pl-10 bg-[#0A0E27] border-[#334155] text-white placeholder-gray-400 focus:bg-[#0A0E27] focus:ring-1 focus:ring-[#4338CA] text-sm rounded-2xl"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative text-white rounded-2xl hover:bg-[#334155]">
            <Bell className="h-4 w-4 md:h-5 md:w-5 text-white" />
            <span className="absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 bg-[#EF4444] rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu */}
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  )
}