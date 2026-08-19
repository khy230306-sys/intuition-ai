import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isCloudMode(): boolean {
  return Boolean(url && anon && url.startsWith('http') && anon.length > 20)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isCloudMode()) return null
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}
