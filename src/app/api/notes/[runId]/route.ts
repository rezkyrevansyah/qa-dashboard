import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface RouteContext {
  params: Promise<{ runId: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('run_notes')
    .select('*')
    .eq('run_id', runId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('run_notes')
    .upsert(
      { run_id: runId, content, updated_at: new Date().toISOString() },
      { onConflict: 'run_id' }
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('run_notes').delete().eq('run_id', runId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
