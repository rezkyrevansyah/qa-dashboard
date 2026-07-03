import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

export async function POST() {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const pat = process.env.GITHUB_PAT

  if (!owner || !repo || !pat) {
    return NextResponse.json({ error: 'Missing GitHub env vars' }, { status: 500 })
  }

  // Create a sync_job row so we can track progress via Realtime
  const supabase = createServiceClient()
  const { data: syncJob, error: jobErr } = await supabase
    .from('sync_jobs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  if (jobErr || !syncJob) {
    console.error('[POST /api/sync] Failed to create sync_job:', jobErr?.message)
    return NextResponse.json({ error: 'Failed to create sync job' }, { status: 500 })
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/sync-suites.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'master',
        inputs: { sync_job_id: syncJob.id },
      }),
    }
  )

  if (!response.ok && response.status !== 204) {
    const text = await response.text()
    // Mark the job as errored since workflow won't run
    await supabase
      .from('sync_jobs')
      .update({ status: 'error', error_message: `GitHub API error: ${text}`, completed_at: new Date().toISOString() })
      .eq('id', syncJob.id)
    return NextResponse.json({ error: `GitHub API error: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, syncJobId: syncJob.id })
}
