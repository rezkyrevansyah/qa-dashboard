// Bridge file: @/* maps to src/*, but utils/ is at repo root.
// This re-exports the server client so all src/ code can use @/lib/supabase.
import { createClient as createServerClientUtil } from '../../utils/supabase/server'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClientUtil(cookieStore)
}
