import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient<any> | null = null

export function getSupabaseAdmin() {
  if (cached) return cached

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing SUPABASE_URL in backend/.env')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend/.env')
  }

  cached = createClient<any>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cached
}
