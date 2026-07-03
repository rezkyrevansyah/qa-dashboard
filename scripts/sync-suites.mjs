// sync-suites.mjs
// Scans cypress/e2e/ and upserts suites + specs into Supabase.
// Runs via GitHub Actions on push to main (when cypress/e2e/** changes).

import { createClient } from '@supabase/supabase-js'
import { readdirSync } from 'fs'
import { join, relative } from 'path'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const e2eRoot = join(process.cwd(), 'cypress', 'e2e')

function scanDirectory(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const suiteMap = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const absPath = join(dir, entry.name)
    const suitePath = relative(e2eRoot, absPath).replace(/\\/g, '/')

    const specs = readdirSync(absPath)
      .filter((f) => f.endsWith('.cy.ts') || f.endsWith('.cy.js'))
      .map((f) => ({
        name: f,
        path: `${suitePath}/${f}`,
      }))

    suiteMap[suitePath] = {
      name: entry.name,
      path: suitePath,
      specs,
    }
  }

  return suiteMap
}

async function main() {
  console.log('Scanning cypress/e2e/ ...')
  const suiteMap = scanDirectory(e2eRoot)
  const suiteEntries = Object.values(suiteMap)

  if (suiteEntries.length === 0) {
    console.log('No suite folders found under cypress/e2e/')
    return
  }

  let hasError = false

  for (const suite of suiteEntries) {
    // Upsert the suite row (no updated_at — column does not exist in schema)
    const { data: suiteRow, error: suiteErr } = await supabase
      .from('suites')
      .upsert(
        { name: suite.name, path: suite.path },
        { onConflict: 'path' }
      )
      .select('id')
      .single()

    if (suiteErr || !suiteRow) {
      console.error(`Suite upsert error for "${suite.name}":`, suiteErr?.message)
      hasError = true
      continue
    }

    console.log(`✓ Suite: ${suite.name} (id: ${suiteRow.id})`)

    // Upsert each spec (no updated_at — column does not exist in schema)
    for (const spec of suite.specs) {
      const { error: specErr } = await supabase
        .from('specs')
        .upsert(
          {
            suite_id: suiteRow.id,
            name: spec.name,
            path: spec.path,
          },
          { onConflict: 'path' }
        )

      if (specErr) {
        console.error(`  Spec upsert error for "${spec.name}":`, specErr.message)
        hasError = true
      } else {
        console.log(`  ✓ Spec: ${spec.name}`)
      }
    }
  }

  console.log(`\nSync complete: ${suiteEntries.length} suites processed.`)

  if (hasError) {
    console.error('One or more upserts failed — see errors above.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
