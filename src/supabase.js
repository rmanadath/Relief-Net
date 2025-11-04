import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  console.error('REACT_APP_SUPABASE_URL is missing!')
}

if (!supabaseKey) {
  console.error('REACT_APP_SUPABASE_ANON_KEY is missing!')
}

// Ensure URL doesn't have trailing slash
const cleanUrl = supabaseUrl?.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl

export const supabase = createClient(cleanUrl || '', supabaseKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})