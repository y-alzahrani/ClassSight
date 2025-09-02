'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and analytics'
  },
  {
    name: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
    description: 'Interactive chat system'
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
    description: 'Daily reports and documents'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Account and preferences'
  }
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-[#1E293B]/80 backdrop-blur-sm border-[#334155]/50 text-white hover:bg-[#334155]/60 shadow-lg shadow-[#0A0E27]/20 rounded-xl"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-[#1E293B]/80 backdrop-blur-sm border-r border-[#334155]/50 shadow-lg shadow-[#0A0E27]/20 flex flex-col transition-all duration-300",
        "fixed lg:static inset-y-0 left-0 z-50",
        "w-64 p-4 md:p-6",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo and Toggle */}
        <div className="mb-10 pt-10 lg:pt-1">
          <div className="flex items-center justify-center">
            <img src="/classsight-logo.svg" alt="ClassSight" className="h-14 md:h-20" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-[#4338CA] text-white shadow-md shadow-[#4338CA]/30'
                    : 'text-gray-300 hover:bg-[#334155]/60 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-4 w-4 md:h-5 md:w-5 transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-300'
                  )}
                />
                <div className="flex-1">
                  <div className="text-white">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 hidden md:block">
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User Section at Bottom */}
        <nav className="flex flex-col gap-4 mt-auto">
          <Link 
            href="/auth/logout" 
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 rounded-xl"
            onClick={() => setMobileOpen(false)}
          >
            Logout
          </Link>
        </nav>
      </aside>
    </>
  )
}