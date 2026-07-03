// report-results.mjs
// Reads cypress/results/results.json (written by cypress.config.ts after:run hook)
// and writes test_results + test_cases rows to Supabase, then updates the test_run summary.
// Called from GitHub Actions after Cypress completes.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RUN_ID, SUITE_NAME } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!RUN_ID) {
  console.error('Missing required env var: RUN_ID')
  process.exit(1)
}
if (!SUITE_NAME) {
  console.error('Missing required env var: SUITE_NAME')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const resultsPath = 'cypress/results/results.json'

async function markError(message) {
  console.error('[report-results] FATAL:', message)
  await supabase.from('test_runs').update({
    status: 'error',
    completed_at: new Date().toISOString(),
  }).eq('id', RUN_ID)
  process.exit(1)
}

/**
 * Parse HTTP method, URL, and status code from a Cypress test title.
 * Handles patterns like:
 *   "GET /health → 200 dan envelope lengkap"
 *   "POST /auth/login (admin) → 200 dan dapat access_token"
 *   "DELETE /users/1 should return 204"
 */
function parseHttpFromTitle(title) {
  if (!title) return { http_method: null, http_url: null, http_status: null }

  const methodUrlMatch = title.match(/\b(GET|POST|PUT|PATCH|DELETE)\b\s+(\/[^\s→\u2192,)]+)/i)
  const statusMatch = title.match(/(?:[→\u2192]|returns?|status)\s*(\d{3})\b/i)

  return {
    http_method: methodUrlMatch ? methodUrlMatch[1].toUpperCase() : null,
    http_url: methodUrlMatch ? methodUrlMatch[2] : null,
    http_status: statusMatch ? parseInt(statusMatch[1], 10) : null,
  }
}

async function main() {
  if (!existsSync(resultsPath)) {
    await markError('No results file found — Cypress may have failed to launch.')
    return
  }

  let report
  try {
    report = JSON.parse(readFileSync(resultsPath, 'utf8'))
  } catch (err) {
    await markError(`Failed to parse results.json: ${err.message}`)
    return
  }

  // after:run format: report.runs[] — one entry per spec file
  const specRuns = report.runs ?? []

  if (specRuns.length === 0) {
    await markError('results.json has no run entries — Cypress may have found no specs.')
    return
  }

  let totalPassed = 0
  let totalFailed = 0
  let totalPending = 0
  let totalDuration = 0

  for (const specRun of specRuns) {
    // spec.relative = "cypress/e2e/service-zapper/service-zaper.cy.ts"
    const specRelative = specRun.spec?.relative ?? ''
    const specFileName = specRelative.split('/').pop() ?? ''
    const exactPath = `${SUITE_NAME}/${specFileName}`

    console.log(`\nLooking up spec: "${exactPath}" (from: "${specRelative}")`)

    // Flexible lookup: exact path first, then fallback to filename match
    let specRow = null

    const { data: exactMatch } = await supabase
      .from('specs')
      .select('id, path')
      .eq('path', exactPath)
      .maybeSingle()

    if (exactMatch) {
      specRow = exactMatch
      console.log(`  ✓ Found by exact path: ${exactMatch.path}`)
    } else {
      const { data: fuzzyMatch } = await supabase
        .from('specs')
        .select('id, path')
        .ilike('path', `%${specFileName}`)
        .maybeSingle()

      if (fuzzyMatch) {
        specRow = fuzzyMatch
        console.log(`  ✓ Found by filename fallback: ${fuzzyMatch.path}`)
      }
    }

    if (!specRow) {
      console.warn(`  ✗ Spec not found in DB: ${exactPath} — skipping`)
      continue
    }

    const stats = specRun.stats ?? {}
    const passed = stats.passes ?? 0
    const failed = stats.failures ?? 0
    const pending = stats.pending ?? 0
    const duration = stats.duration ?? 0

    // Insert test_result row for this spec
    const { data: resultRow, error: resultErr } = await supabase
      .from('test_results')
      .insert({
        run_id: RUN_ID,
        spec_id: specRow.id,
        status: failed > 0 ? 'failed' : 'passed',
        duration_ms: duration,
      })
      .select('id')
      .single()

    if (resultErr || !resultRow) {
      console.error(`  ✗ Failed to insert test_result for ${exactPath}:`, resultErr?.message)
      continue
    }

    // after:run tests[]: { title: string[], state: 'passed'|'failed'|'pending', duration, displayError }
    const tests = specRun.tests ?? []

    for (const test of tests) {
      const fullTitle = Array.isArray(test.title) ? test.title.join(' ') : (test.title ?? '')
      const caseStatus = test.state === 'passed' ? 'passed'
        : test.state === 'pending' ? 'pending'
        : 'failed'

      const httpMeta = parseHttpFromTitle(fullTitle)

      // error info: test.displayError is a string, test.attempts[].error has message+stack
      const lastAttempt = test.attempts?.[test.attempts.length - 1]
      const errorMessage = lastAttempt?.error?.message ?? null
      const errorStack = lastAttempt?.error?.stack ?? null

      await supabase.from('test_cases').insert({
        result_id: resultRow.id,
        title: fullTitle,
        status: caseStatus,
        duration_ms: test.duration ?? null,
        error_message: errorMessage,
        error_stack: errorStack,
        http_method: httpMeta.http_method,
        http_url: httpMeta.http_url,
        http_status: httpMeta.http_status,
      })
    }

    totalPassed += passed
    totalFailed += failed
    totalPending += pending
    totalDuration += duration

    console.log(`  ✓ ${specFileName}: ${passed} passed, ${failed} failed, ${pending} pending`)
  }

  // Guard: if all specs were skipped (not found in DB), mark error
  if ((totalPassed + totalFailed + totalPending) === 0 && specRuns.length > 0) {
    await markError(
      `No specs matched in DB for suite "${SUITE_NAME}". ` +
      `Ran ${specRuns.length} spec(s) but none found in specs table. ` +
      `Run sync-suites workflow first.`
    )
    return
  }

  // Final status based on actual test counts, not Cypress exit code
  const finalStatus = totalFailed > 0 ? 'failed' : 'passed'

  const { error: updateErr } = await supabase.from('test_runs').update({
    status: finalStatus,
    total_tests: totalPassed + totalFailed + totalPending,
    passed_tests: totalPassed,
    failed_tests: totalFailed,
    skipped_tests: totalPending,
    duration_ms: totalDuration,
    completed_at: new Date().toISOString(),
  }).eq('id', RUN_ID)

  if (updateErr) {
    console.error('Failed to update test_run:', updateErr.message)
    process.exit(1)
  }

  console.log(`\nRun ${RUN_ID} → ${finalStatus}: ${totalPassed} passed, ${totalFailed} failed, ${totalPending} pending`)
}

main().catch((err) => {
  console.error('Fatal error in report-results:', err)
  process.exit(1)
})
