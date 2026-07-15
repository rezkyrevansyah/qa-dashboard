// =============================================================================
// Cypress UI Test — aplikasi-zapper / Sertifikat Label Taat Zakat
//
// ID Test: 10 | ID Project: 84
// Skenario: "Manajemen Label Taat Zakat"
// Deskripsi: Sebagai RO BAZNAS saya ingin dapat mencetak label taat zakat.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - List page: /certificates — Table keyField="uuid", PDF button onClick(r.uuid)
// - Detail page: /certificates/[uuid] — heading adalah certNumber (bukan h1 tetap)
// - PDF list: GET /taat-zakat/pdf/:uuid → blob → window.open(blobUrl, '_blank')
// - PDF detail: GET /taat-zakat/pdf/:uuid → blob → window.open(blobUrl, '_blank')
// - GET /taat-zakat → { data: [...], meta: { totalPages, total, perPage, page } }
// - GET /taat-zakat/detail/:uuid → object TaatZakatCertificate langsung
// - Staging kosong → stub kedua endpoint agar test tidak bergantung data staging.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { FE_BASE } from '../../support/commands'

const STUB_UUID = 'stub-uuid-cert-001'

const STUB_CERT = {
  id:          1,
  uuid:        STUB_UUID,
  certNumber:  'CERT/2026/001',
  companyId:   1,
  companyName: 'PT Automation Stub',
  companyNpwp: '01.000.000.0-000.000',
  receiptId:   1,
  issuedAt:    '2026-01-15T00:00:00.000Z',
  validFrom:   '2026-01-15T00:00:00.000Z',
  validUntil:  '2026-12-31T00:00:00.000Z',
  status:      'active',
  pdfUrl:      null,
  issuedById:  1,
  notes:       'Stub sertifikat untuk automation test',
  year:        2026,
  createdAt:   '2026-01-15T00:00:00.000Z',
  createdBy:   'admin@baznas.go.id',
  updatedAt:   '2026-01-15T00:00:00.000Z',
}

describe('Manajemen Label Taat Zakat', () => {
  it('RO dapat melihat daftar sertifikat, mencetak PDF, dan melihat detail sertifikat', () => {
    // 1-4. Login sebagai RO (programmatic).
    cy.loginAs('ro')

    // Stub GET /taat-zakat (list) SEBELUM visit — agar React Query dapat data dummy.
    cy.intercept('GET', '**/taat-zakat?*', {
      statusCode: 200,
      body: {
        data: [STUB_CERT],
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      },
    }).as('getCertificates')

    // Stub GET /taat-zakat/detail/:id (detail page) — dipanggil saat navigasi ke detail.
    cy.intercept('GET', `**/taat-zakat/detail/${STUB_UUID}`, {
      statusCode: 200,
      body: STUB_CERT,
    }).as('getCertificateDetail')

    // Stub GET PDF — intercept sebelum visit agar tidak miss.
    cy.intercept('GET', '**/taat-zakat/pdf/*').as('getPdf')

    // 5. Buka halaman Sertifikat Label Taat Zakat.
    cy.visit(`${FE_BASE}/certificates`)
    cy.contains('h1', 'Sertifikat Label Taat Zakat', { timeout: 20000 }).should('be.visible')

    // Tunggu list data dimuat dari stub.
    cy.wait('@getCertificates')

    // 6. Tabel menampilkan 1 baris sertifikat dari stub.
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    // ── Bagian A: Cetak PDF dari tombol di tabel ───────────────────────────

    // Stub window.open SETELAH page load (window context sudah ada), SEBELUM klik PDF.
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen')
    })

    // Klik tombol "PDF" pada baris pertama sertifikat.
    cy.contains('button', 'PDF').first().click()

    // Sistem menghasilkan PDF — GET /taat-zakat/pdf/:uuid berhasil.
    cy.wait('@getPdf', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'GET /taat-zakat/pdf/:uuid harus berhasil').to.equal(200)
    })

    // Label Taat Zakat dapat dicetak — window.open dipanggil dengan Blob URL ke tab baru.
    cy.get('@windowOpen').should('have.been.calledOnce')
    cy.get('@windowOpen').should(
      'have.been.calledWith',
      Cypress.sinon.match(/^blob:/),
      '_blank',
    )

    // ── Bagian B: Lihat detail sertifikat ─────────────────────────────────

    // Klik tombol "Detail" pada baris pertama — navigasi ke halaman detail.
    // Detail button adalah <Button> di dalam <Link href="/certificates/:uuid">.
    cy.contains('a', 'Detail').first().click()

    // URL berubah ke /certificates/:uuid.
    cy.url({ timeout: 10000 }).should('include', `/certificates/${STUB_UUID}`)

    // Tunggu data detail dimuat.
    cy.wait('@getCertificateDetail', { timeout: 15000 })

    // Heading halaman detail menampilkan certNumber (bukan teks tetap).
    cy.contains(STUB_CERT.certNumber, { timeout: 10000 }).should('be.visible')

    // Card "Detail Sertifikat Label Taat Zakat" tampil.
    cy.contains('Detail Sertifikat Label Taat Zakat').should('be.visible')

    // Tombol "Download PDF" tersedia di detail page.
    cy.contains('button', 'Download PDF', { timeout: 10000 }).should('be.visible')
  })
})
