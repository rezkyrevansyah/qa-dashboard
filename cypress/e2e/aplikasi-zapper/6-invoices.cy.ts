// =============================================================================
// Cypress UI Test — aplikasi-zapper / Invoice
//
// ID Test: 6 | ID Project: 84
// Skenario: "Admin dapat membuat Invoice"
// Deskripsi: Sebagai Admin saya ingin dapat membuat invoice secara otomatis,
// sehingga tidak perlu melakukan edit manual.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - Form "Buat Invoice" ditampilkan sebagai MODAL di halaman /invoices,
//   bukan halaman terpisah /invoices/new.
// - Field Nominal: input[inputMode="numeric"] — bukan type="number", diisi .type() biasa.
// - Field Sub Jenis Dana (zakatType) hanya render saat jenisDana = 'zakat'.
// - Field Pilih Template (templateId) hanya muncul jika ada template aktif & canPickTemplate.
// - Setelah submit sukses: SweetAlert2 auto-dismiss (2200ms) → modal tutup → tabel refresh.
// - Tidak ada redirect — tetap di /invoices.
// - Dua tombol teks "Buat Invoice": satu buka modal (di header), satu submit form (type=submit
//   di footer modal) — dibedakan via { type: 'submit' } atau scope within modal.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'

describe('Admin dapat membuat Invoice', () => {
  it('Admin dapat mengisi form invoice dan menyimpannya, nomor invoice muncul di daftar', () => {
    // 1-4. Login sebagai Admin.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5. Pilih menu "Invoice" di sidebar.
    cy.contains('a', 'Invoice').click()
    cy.url().should('include', '/invoices')
    cy.contains('h1', 'Invoice', { timeout: 20000 }).should('be.visible')

    // 6. Klik "+ Buat Invoice" — sistem menampilkan modal form.
    cy.findByRole('button', { name: /buat invoice/i, timeout: 20000 }).click()

    // Verifikasi modal terbuka (ada heading "Buat Invoice" di dalam modal).
    cy.contains(/buat invoice/i, { timeout: 10000 }).should('be.visible')

    // 7. Isi No. Invoice — unik per run.
    const invoiceNumber = `INV/${Date.now()}`
    cy.get('input[name="invoiceNumber"]')
      .clear()
      .type(invoiceNumber, { parseSpecialCharSequences: false })

    // 8. Pilih Perusahaan — tunggu list load, pilih opsi pertama secara dinamis.
    cy.get('select[name="companyId"]')
      .find('option:not([value=""])')
      .should('have.length.greaterThan', 0)
    cy.get('select[name="companyId"]').then(($sel) => {
      const firstValue = Cypress.$($sel).find('option:not([value=""])').first().val() as string
      cy.wrap($sel).select(firstValue)
    })

    // 9. Isi Nominal Invoice — input bertipe numeric (bukan type=number).
    cy.get('input[placeholder="0"]').clear().type('5000000', { parseSpecialCharSequences: false })

    // 10. Pilih Jenis Dana — set ke 'zakat' (agar Sub Jenis Dana muncul).
    cy.get('select[name="jenisDana"]').select('zakat')

    // 11. Pilih Sub Jenis Dana — hanya muncul saat jenisDana = 'zakat'.
    cy.get('select[name="zakatType"]').should('be.visible').select('zakat_perusahaan')

    // 12. Pilih Template (opsional — hanya ada jika template aktif tersedia & canPickTemplate).
    cy.get('body').then(($body) => {
      if ($body.find('select[name="templateId"]').length > 0) {
        cy.get('select[name="templateId"]').then(($sel) => {
          const firstOpt = Cypress.$($sel).find('option:not([value=""])').first().val() as string
          if (firstOpt) cy.wrap($sel).select(firstOpt)
        })
      }
    })

    // 13. Intercept POST sebelum submit.
    cy.intercept('POST', '**/invoices').as('createInvoice')

    // 14. Klik tombol submit di footer modal (type="submit").
    cy.get('button[type="submit"]').contains(/buat invoice/i).click()

    // 15. Sistem menyimpan data — POST /invoices berhasil.
    cy.wait('@createInvoice', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'POST /invoices harus berhasil').to.be.oneOf([200, 201])
    })

    // 16. SweetAlert2 success tampil (auto-dismiss 2200ms, tidak perlu klik confirm).
    cy.get('.swal2-popup', { timeout: 15000 }).should('be.visible')
    cy.get('.swal2-title, .swal2-html-container')
      .should('contain.text', 'Invoice berhasil dibuat')

    // 17. Modal tertutup setelah alert dismiss.
    cy.get('input[name="invoiceNumber"]', { timeout: 5000 }).should('not.exist')

    // 18. Invoice yang baru dibuat tampil di tabel daftar.
    cy.get('input[placeholder="Cari nomor / perusahaan..."]', { timeout: 10000 })
      .clear()
      .type(invoiceNumber, { parseSpecialCharSequences: false })
    cy.contains('td', invoiceNumber, { timeout: 10000 }).should('be.visible')
  })
})
