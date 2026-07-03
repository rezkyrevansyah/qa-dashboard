import { defineConfig } from 'cypress'
import { mkdirSync, writeFileSync } from 'fs'

export default defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
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
