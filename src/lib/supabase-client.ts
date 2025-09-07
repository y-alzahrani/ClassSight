import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk3MzEyMDAsImV4cCI6MTk2NTMwNzIwMH0.placeholder';

// Client-side Supabase client for client components
export const createClientSupabaseClient = () => {
  // Add validation to prevent errors with placeholder values
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn('Using placeholder Supabase URL. Authentication will not work.');
    // Return a mock client for development
    return {
      auth: {
        signInWithPassword: async () => ({ 
          data: null, 
          error: { message: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY' } 
        }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null })
      }
    } as any;
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Direct client for use outside of auth-helpers (if needed)
export const supabase = createClientSupabaseClient();
