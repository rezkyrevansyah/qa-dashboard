/// <reference types="cypress" />

// Shared helpers for cypress/e2e/aplikasi-zapper/companies.cy.ts.
// Field labels/selectors mirror src/components/forms/CompanyForm.tsx in aplikasi-zaper 1:1.

export interface CompanyFormData {
  npwp?: string
  npwz?: string
  name?: string
  companyType?: 'Syariat' | 'Umum'
  establishmentDate?: string
  leaderName?: string
  picName?: string
  /** Sector option label. Omit to auto-pick the first real option; pass '' to leave the placeholder (untouched/required-error case). */
  sector?: string
  /** RO option label substring. Omit to leave "kosongkan" (default to own account). */
  ro?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function validCompanyData(overrides: Partial<CompanyFormData> = {}): CompanyFormData {
  const suffix = uniqueSuffix()
  return {
    // NPWP harus unik per run juga — nilai statis akan bentrok (409) begitu dijalankan
    // dua kali terhadap backend sandbox yang sama, karena NPWP nyatanya unique-constrained.
    npwp: `01.234.${suffix.slice(-3)}.8-901.000`,
    npwz: `NPWZ-${suffix}`,
    name: `PT Automation Test ${suffix}`,
    companyType: 'Umum',
    establishmentDate: '2010-05-17',
    leaderName: 'Budi Santoso',
    picName: 'Siti Aminah',
    phone: '081234567890',
    email: `automation.test+${suffix}@maju.co.id`,
    address: 'Jl. Merdeka No. 10, Jakarta Pusat',
    notes: 'Dibuat oleh automation test',
    ...overrides,
  }
}

/** Selects the first non-placeholder <option> of a <select> located by its label, waiting for it to be populated from the API first. */
function selectFirstRealOption(labelRe: RegExp): void {
  cy.findByLabelText(labelRe)
    .find('option:not([disabled])')
    .should('have.length.greaterThan', 0)
  cy.findByLabelText(labelRe).then(($select) => {
    const value = Cypress.$($select).find('option:not([disabled])').first().val() as string
    cy.wrap($select).select(value)
  })
}

// react-hook-form's `register('address')`/`register('notes')` land on a raw <textarea>
// with NO id/htmlFor (see CompanyForm.tsx) — findByLabelText cannot resolve them, so we
// target the stable `name` attribute react-hook-form assigns instead.
function typeIntoTextarea(name: 'address' | 'notes', value: string): void {
  const el = cy.get(`textarea[name="${name}"]`).clear()
  if (value) el.type(value, { parseSpecialCharSequences: false })
}

// cy.type('') throws — clearing is enough to represent "leave this field empty", so only
// call .type() when there's an actual value to type.
function clearAndType(el: Cypress.Chainable<JQuery<HTMLElement>>, value: string): void {
  const cleared = el.clear()
  if (value) cleared.type(value, { parseSpecialCharSequences: false })
}

export function fillCompanyForm(data: CompanyFormData): void {
  if (data.npwp !== undefined) {
    clearAndType(cy.findByLabelText(/^npwp/i), data.npwp)
  }
  if (data.npwz !== undefined) {
    clearAndType(cy.findByLabelText(/^npwz/i), data.npwz)
  }
  if (data.name !== undefined) {
    clearAndType(cy.findByLabelText(/nama perusahaan/i), data.name)
  }
  if (data.companyType) {
    cy.findByLabelText(/tipe perusahaan/i).select(data.companyType === 'Syariat' ? 'syariat' : 'umum')
  }
  if (data.establishmentDate !== undefined) {
    cy.findByLabelText(/tanggal berdiri/i)
      .invoke('val', data.establishmentDate)
      .trigger('input')
      .trigger('change')
  }
  if (data.leaderName !== undefined) {
    clearAndType(cy.findByLabelText(/nama pimpinan/i), data.leaderName)
  }
  if (data.picName !== undefined) {
    clearAndType(cy.findByLabelText(/penanggung jawab/i), data.picName)
  }
  if (data.sector) {
    cy.findByLabelText(/bidang usaha/i).select(data.sector)
  } else if (data.sector !== '') {
    selectFirstRealOption(/bidang usaha/i)
  }
  if (data.ro) {
    cy.findByLabelText(/relationship officer/i).select(data.ro)
  }
  if (data.phone !== undefined) {
    clearAndType(cy.findByLabelText(/nomor telepon/i), data.phone)
  }
  if (data.email !== undefined) {
    clearAndType(cy.findByLabelText(/email perusahaan/i), data.email)
  }
  if (data.address !== undefined) {
    typeIntoTextarea('address', data.address)
  }
  if (data.notes !== undefined) {
    typeIntoTextarea('notes', data.notes)
  }
}

export function submitCompanyForm(): void {
  cy.findByRole('button', { name: /simpan perusahaan/i }).click()
}
