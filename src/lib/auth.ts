import { createClient } from '@/lib/supabase'

/**
 * Verifies the current session from cookies.
 * Returns the authenticated user or throws a 401 Response.
 * Use in API route handlers to guard server actions.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return user
}
