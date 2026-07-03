import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface RouteContext {
  params: Promise<{ runId: string }>
}

const NOTE_SELECT = `
  id, run_id, content, created_at, updated_at,
  referenced_cases:note_test_cases(
    test_case_id,
    test_cases(id, title, status, http_method, http_url)
  )
`

export async function GET(_req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('run_notes')
    .select(NOTE_SELECT)
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })
  const testCaseIds: string[] = Array.isArray(body.test_case_ids) ? body.test_case_ids : []

  const supabase = await createClient()

  // Validate test_case_ids belong to this run
  if (testCaseIds.length > 0) {
    const { data: valid } = await supabase
      .from('test_cases')
      .select('id')
      .in('id', testCaseIds)
      .in('result_id', supabase.from('test_results').select('id').eq('run_id', runId) as unknown as string[])
    const validIds = new Set((valid ?? []).map((r: { id: string }) => r.id))
    const invalid = testCaseIds.filter((id) => !validIds.has(id))
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'Some test_case_ids do not belong to this run' }, { status: 400 })
    }
  }

  // Insert note
  const { data: note, error: noteErr } = await supabase
    .from('run_notes')
    .insert({ run_id: runId, content, updated_at: new Date().toISOString() })
    .select('id')
    .single()
  if (noteErr || !note) return NextResponse.json({ error: noteErr?.message ?? 'Insert failed' }, { status: 500 })

  // Attach test cases
  if (testCaseIds.length > 0) {
    await supabase.from('note_test_cases').insert(
      testCaseIds.map((test_case_id) => ({ note_id: note.id, test_case_id }))
    )
  }

  // Return full note with joined cases
  const { data: full, error: fullErr } = await supabase
    .from('run_notes')
    .select(NOTE_SELECT)
    .eq('id', note.id)
    .single()
  if (fullErr) return NextResponse.json({ error: fullErr.message }, { status: 500 })
  return NextResponse.json(full)
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const url = new URL(req.url)
  const noteId = url.searchParams.get('noteId')

  const supabase = await createClient()
  if (noteId) {
    // Delete specific note (note_test_cases cascade)
    const { error } = await supabase
      .from('run_notes')
      .delete()
      .eq('id', noteId)
      .eq('run_id', runId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Fallback: delete all notes for run (backward compat)
    const { error } = await supabase.from('run_notes').delete().eq('run_id', runId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
