import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nqucslzdeesvalhdfcdr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdWNzbHpkZWVzdmFsaGRmY2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjIwMzUsImV4cCI6MjA5MjQzODAzNX0.NEkskIh2ZZNqPRcjqV0tv0r9vbI_m8Poik52_pBPwCY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'franchise'
  }
})
