// Bridge file: @/* maps to src/*, but utils/ is at repo root.
// This re-exports the server client so all src/ code can use @/lib/supabase.
import { createClient as createServerClientUtil } from '../../utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClientUtil(cookieStore)
}

/**
 * Service role client — bypasses RLS.
 * Only use in server-side API routes that have already verified auth via requireAuth().
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
