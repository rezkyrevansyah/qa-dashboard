/// <reference types="cypress" />

// ─── Shared target environment for the aplikasi-zapper (Zaper FE) suite ─────
export const FE_BASE = 'https://fe-zaper-staging-53046748745.asia-southeast2.run.app'
export const API_BASE = 'https://service-zaper-53046748745.asia-southeast2.run.app/api/v1'

export type ZaperRole = 'admin' | 'ro' | 'layanan' | 'kepala'

// Same accounts/backend already used by cypress/e2e/service-zapper/service-zaper.cy.ts
export const CREDS: Record<ZaperRole, { email: string; password: string }> = {
  admin:   { email: 'admin@baznas.go.id',   password: 'Admin@12345' },
  ro:      { email: 'revanro@baznas.go.id', password: 'revan123' },
  layanan: { email: 'layanan@baznas.go.id', password: 'Layanan@12345' },
  kepala:  { email: 'kepala@baznas.go.id',  password: 'Kepala@12345' },
}

// ─── Real UI login — used only where the login flow itself is under test ────
Cypress.Commands.add('loginUI', (email: string, password: string) => {
  cy.visit(`${FE_BASE}/login`)
  cy.findByLabelText(/alamat email/i).clear().type(email)
  cy.findByLabelText(/^password/i).clear().type(password)
  cy.findByRole('button', { name: /masuk ke dashboard/i }).click()
  cy.url().should('include', '/dashboard')
})

// ─── Fast programmatic session — used as precondition for all other cases ───
//
// useAuth() (src/hooks/useAuth.ts) only reads a cached user from
// localStorage['baznas_user'] on mount — if that's empty it NEVER calls GET /auth/me to
// bootstrap it, even with a perfectly valid token cookie. So role-gated UI (isAdmin, etc.)
// silently stays false unless we seed localStorage ourselves the same way the real
// useAuth().login() flow does (setToken + setUser). Data-fetching (axios + the token
// cookie) works fine without this — only the *client-side RBAC gating* depends on it.
Cypress.Commands.add('loginAs', (role: ZaperRole) => {
  const creds = CREDS[role]
  return cy
    .request({ method: 'POST', url: `${API_BASE}/auth/login`, body: creds, timeout: 20000 })
    .then((res) => {
      const token = res.body?.data?.access_token as string
      expect(token, `access_token for role "${role}"`).to.be.a('string').and.not.be.empty

      return cy
        .request({ url: `${API_BASE}/auth/me`, headers: { Authorization: `Bearer ${token}` }, timeout: 20000 })
        .then((meRes) => {
          const user = meRes.body?.data

          // Perlu sudah berada di origin FE_BASE dulu supaya cookie/localStorage menempel ke
          // domain yang benar — /login aman dikunjungi tanpa token (public path).
          cy.visit(`${FE_BASE}/login`)
          cy.setCookie('baznas_token', token, { domain: new URL(FE_BASE).hostname })
          cy.window().then((win) => {
            win.localStorage.setItem('baznas_user', JSON.stringify(user))
          })
          return cy.wrap(token, { log: false })
        })
    })
})

declare global {
  namespace Cypress {
    interface Chainable {
      /** Drives the real login form (email + password + submit) and waits for /dashboard. */
      loginUI(email: string, password: string): Chainable<void>
      /** Logs in via API and injects the resulting token as the baznas_token cookie. Returns the token. */
      loginAs(role: ZaperRole): Chainable<string>
    }
  }
}

export {}
