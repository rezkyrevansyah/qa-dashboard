import { defineConfig } from 'cypress'
import { mkdirSync, writeFileSync } from 'fs'

export default defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    // Sidebar/nav in aplikasi-zaper only renders as a static (non-collapsed) layout at the
    // Tailwind `lg` breakpoint (>=1024px) — default Cypress viewport (1000px) keeps it hidden
    // behind a hamburger toggle, which breaks the aplikasi-zapper UI suite's sidebar clicks.
    viewportWidth: 1280,
    viewportHeight: 900,
    setupNodeEvents(on) {
      on('after:run', (results) => {
        mkdirSync('cypress/results', { recursive: true })
        writeFileSync(
          'cypress/results/results.json',
          JSON.stringify(results, null, 2)
        )
        console.log('[cypress] results.json written to cypress/results/results.json')
      })
    },
  },
})
