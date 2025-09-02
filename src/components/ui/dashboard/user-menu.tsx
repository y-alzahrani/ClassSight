'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '../../../lib/supabase-client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Settings, LogOut, Shield } from 'lucide-react'
interface UserMenuProps {
  user: {
    id: string
    email: string
    full_name: string | null
    role: string
    avatar_url: string | null
    created_at: string
    updated_at: string
  } | null
}

export function UserMenu({ user }: UserMenuProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/signin')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-[#334155]/60 transition-all duration-200">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || ''} alt={user.full_name || ''} />
            <AvatarFallback className="bg-[#4338CA] text-white font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-[#1E293B]/95 backdrop-blur-sm border border-[#334155]/50 shadow-xl shadow-[#0A0E27]/30 rounded-2xl p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3 bg-[#0A0E27]/60 backdrop-blur-sm border border-[#334155]/40 rounded-xl shadow-md shadow-[#0A0E27]/30 mb-2">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none text-white">
              {user.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-gray-400">
              {user.email}
            </p>
            <div className="flex items-center mt-2">
              {user.role === 'admin' && (
                <div className="flex items-center px-2 py-1 bg-red-900/30 text-red-400 border border-red-500/30 rounded-lg">
                  <Shield className="h-3 w-3 mr-1" />
                  <span className="text-xs font-medium">Administrator</span>
                </div>
              )}
              {user.role === 'teacher' && (
                <div className="flex items-center px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded-lg">
                  <span className="text-xs font-medium">Teacher</span>
                </div>
              )}
              {user.role === 'student' && (
                <div className="flex items-center px-2 py-1 bg-green-900/30 text-green-400 border border-green-500/30 rounded-lg">
                  <span className="text-xs font-medium">Student</span>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#334155]/50 my-2" />
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem 
            onClick={() => router.push('/dashboard/settings')}
            className="text-gray-300 hover:text-white hover:bg-[#334155]/60 focus:bg-[#334155]/60 focus:text-white rounded-xl py-2 px-3 cursor-pointer transition-all duration-200"
          >
            <User className="mr-3 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => router.push('/dashboard/settings')}
            className="text-gray-300 hover:text-white hover:bg-[#334155]/60 focus:bg-[#334155]/60 focus:text-white rounded-xl py-2 px-3 cursor-pointer transition-all duration-200"
          >
            <Settings className="mr-3 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#334155]/50 my-2" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={loading}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 rounded-xl py-2 px-3 cursor-pointer transition-all duration-200"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>{loading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}