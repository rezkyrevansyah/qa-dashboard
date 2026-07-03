import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

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
      body: JSON.stringify({ ref: 'master' }),
    }
  )

  if (!response.ok && response.status !== 204) {
    const text = await response.text()
    return NextResponse.json({ error: `GitHub API error: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
