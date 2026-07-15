// =============================================================================
// Cypress UI Test — aplikasi-zapper / Invoice
//
// ID Test: 7 | ID Project: 84
// Skenario: "Admin dapat mencetak Invoice"
// Deskripsi: Sebagai Admin saya ingin dapat mencetak invoice secara otomatis,
// sehingga dapat dilakukan approval oleh Direktur Keuangan.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - Halaman detail: /invoices/[id] — PDF di-fetch OTOMATIS saat halaman mount.
// - Alur: useEffect mount → GET /invoices/pdf/:id (responseType: blob)
//   → URL.createObjectURL(blob) → iframe src = pdfUrl
// - Tombol "Unduh": <a href={pdfUrl} download="INV-xxx.pdf"> — download langsung ke lokal.
// - Tidak ada window.open(), tidak ada window.print(), tidak ada tab baru.
// - Intercept GET harus dipasang SEBELUM visit halaman detail (fetch terjadi saat mount).
// - Precondition: minimal 1 invoice sudah ada di staging.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { FE_BASE } from '../../support/commands'

describe('Admin dapat mencetak Invoice', () => {
  it('Admin membuka detail invoice, sistem menampilkan pratinjau PDF dan tombol Unduh tersedia', () => {
    // 1-4. Login sebagai Admin (programmatic — login bukan fokus skenario ini).
    cy.loginAs('admin')

    // 5. Buka halaman daftar Invoice.
    cy.visit(`${FE_BASE}/invoices`)
    cy.contains('h1', 'Invoice', { timeout: 20000 }).should('be.visible')

    // 6. Sistem menampilkan daftar invoice — pastikan ada minimal 1 baris.
    cy.get('table tbody tr', { timeout: 20000 }).should('have.length.greaterThan', 0)

    // Pasang intercept SEBELUM navigasi ke halaman detail, karena PDF di-fetch saat mount.
    cy.intercept('GET', '**/invoices/pdf/*').as('getPdf')

    // 7-8. Pilih invoice pertama → klik "Detail".
    cy.get('table tbody tr').first().within(() => {
      cy.findByRole('link', { name: /detail/i }).click()
    })

    // 9. Sistem menampilkan halaman detail invoice.
    cy.url({ timeout: 15000 }).should('match', /\/invoices\/\d+/)

    // 10. Sistem menghasilkan dokumen invoice dalam format PDF:
    // GET /invoices/pdf/:id berhasil dipanggil dan mengembalikan blob PDF.
    cy.wait('@getPdf', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'GET /invoices/pdf/:id harus berhasil').to.equal(200)
    })

    // 11. Sistem menampilkan pratinjau PDF di iframe (pratinjau dokumen).
    cy.get('iframe[title="Pratinjau Invoice"]', { timeout: 15000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('match', /^blob:/)

    // 12. Tombol "Unduh" tersedia dan memiliki attribute download (PDF siap diunduh/dicetak).
    // Tombol Unduh adalah <a> element dengan attribute download, bukan <button>.
    cy.contains('a', 'Unduh', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'download')
      .and('match', /^INV-/)
  })
})
