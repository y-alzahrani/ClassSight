'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClientSupabaseClient } from '../../../lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0E27] p-2 sm:p-4">
      <Card className="w-full max-w-md mx-auto bg-slate-800/70 backdrop-blur-sm border-slate-700/50 shadow-2xl">
        <CardHeader className="space-y-1 px-4 sm:px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center p-3">
              <Image
                src="/classsight-logo.svg"
                alt="ClassSight Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center text-slate-100">Welcome to ClassSight</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base text-slate-400">
            Sign in to access your classroom analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/30 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-600/50 text-slate-400 hover:text-slate-100"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">Don't have an account? </span>
            <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}