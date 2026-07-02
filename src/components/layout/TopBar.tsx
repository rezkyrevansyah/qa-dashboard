import { createClient } from '@/lib/supabase'

async function signOut() {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase')
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  const { redirect } = await import('next/navigation')
  redirect('/login')
}

export async function TopBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user?.email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
