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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'teacher'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed (for development)
          router.push('/dashboard')
        } else {
          // Email confirmation required
          setSuccess('Please check your email for a confirmation link.')
        }
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
          <CardTitle className="text-xl sm:text-2xl font-bold text-center text-slate-100">Create Account</CardTitle>
          <CardDescription className="text-center text-slate-400">
            Join ClassSight to start monitoring your classrooms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/30 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                disabled={loading}
                className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={loading}
                className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={loading}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/30">
                  <SelectValue placeholder="Select your role" className="text-slate-400" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectItem value="teacher" className="hover:bg-slate-700 focus:bg-slate-700">Teacher</SelectItem>
                  <SelectItem value="admin" className="hover:bg-slate-700 focus:bg-slate-700">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/30 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-600/50 text-slate-400 hover:text-slate-100"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}