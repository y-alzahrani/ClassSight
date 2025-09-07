// src/lib/auth.ts
import { createServerSupabaseClient } from './supabase'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return null
  }
  
  return profile as UserProfile
}

export async function requireAuth(): Promise<UserProfile> {
  const profile = await getUserProfile()
  
  if (!profile) {
    redirect('/auth/signin')
  }
  
  return profile
}

export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireAuth()
  
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return profile
}

// Sign out helper
export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}