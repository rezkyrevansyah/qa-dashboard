// =============================================================================
// Cypress UI Test — aplikasi-zapper / Lembar Komitmen
//
// ID Test: 5 | ID Project: 84
// Skenario: "Admin dapat mencetak lembar komitmen"
// Deskripsi: Sebagai Admin saya ingin dapat mencetak lembar komitmen, sehingga
// mitra dapat memegang lembar komitmen fisik.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - Halaman detail: /commitments/[id] — tombol utama: "Generate PDF"
// - Tidak ada tombol "Cetak" atau "Unduh" terpisah; skenario "cetak" = Generate PDF
// - Alur: klik Generate PDF → POST /commitments/{id}/generate-pdf (blob response)
//   → URL.createObjectURL(blob) → window.open(url, '_blank')
// - window.open() di-stub agar Cypress tidak benar-benar buka tab baru,
//   sekaligus memungkinkan assertion bahwa fungsi dipanggil dengan URL blob.
// - Precondition: minimal 1 Lembar Komitmen sudah ada di staging.
//   Test menggunakan loginAs (programmatic) karena alur login bukan fokus skenario.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { FE_BASE } from '../../support/commands'

describe('Admin dapat mencetak Lembar Komitmen', () => {
  it('Admin membuka detail lembar komitmen, klik Generate PDF, sistem menghasilkan dokumen PDF', () => {
    // 1-4. Login sebagai Admin (programmatic — lebih cepat, login bukan fokus skenario ini).
    cy.loginAs('admin')
    cy.visit(`${FE_BASE}/commitments`)

    // 5-6. Sistem menampilkan daftar Lembar Komitmen.
    cy.contains('h1', 'Lembar Komitmen', { timeout: 20000 }).should('be.visible')

    // Precondition: pastikan ada minimal 1 baris di tabel sebelum lanjut.
    cy.get('table tbody tr', { timeout: 20000 }).should('have.length.greaterThan', 0)

    // 7-8. Pilih Lembar Komitmen pertama yang tersedia → klik "Detail".
    cy.get('table tbody tr').first().within(() => {
      cy.findByRole('link', { name: /detail/i }).click()
    })

    // 9. Sistem menampilkan halaman detail lembar komitmen.
    cy.url({ timeout: 15000 }).should('match', /\/commitments\/\d+/)
    cy.contains('Detail Lembar Komitmen', { timeout: 15000 }).should('be.visible')

    // Pastikan tombol Generate PDF exist dan tidak dalam kondisi loading/disabled.
    cy.findByRole('button', { name: /generate pdf/i }, { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')

    // 10. Stub window.open agar tidak membuka tab baru di browser Cypress,
    // sekaligus memungkinkan verifikasi bahwa fungsi dipanggil dengan benar.
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen')
    })

    // Intercept POST generate-pdf sebelum klik tombol.
    cy.intercept('POST', '**/commitments/*/generate-pdf').as('generatePdf')

    // 11. Klik tombol "Generate PDF" — sistem memproses PDF.
    cy.findByRole('button', { name: /generate pdf/i }).click()

    // 12. Sistem menghasilkan dokumen PDF: POST berhasil (200/201).
    cy.wait('@generatePdf', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'POST generate-pdf harus berhasil').to.be.oneOf([200, 201])
    })

    // 13. Sistem menampilkan pratinjau / membuka PDF di tab baru:
    // window.open dipanggil sekali dengan URL blob dan target '_blank'.
    cy.get('@windowOpen').should('have.been.calledOnce')
    cy.get('@windowOpen').should(
      'have.been.calledWith',
      Cypress.sinon.match(/^blob:/),
      '_blank',
    )
  })
})
