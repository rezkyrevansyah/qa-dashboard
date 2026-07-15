// =============================================================================
// Cypress UI Test — aplikasi-zapper / Kuitansi Print
//
// ID Test: 9 | ID Project: 84
// Skenario: "Admin dapat mencetak Kuitansi"
// Deskripsi: Sebagai Admin saya ingin dapat mencetak kuitansi, sehingga mitra
// mendapatkan bukti bayar secara fisik.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - Halaman detail Kuitansi: /receipts/[id] (App Router, 'use client')
// - PDF di-generate via POST /receipts/:id/generate-pdf (responseType: blob)
//   saat komponen mount (useEffect) — dipanggil OTOMATIS, bukan saat klik.
// - Blob URL disimpan ke state pdfUrl → di-assign ke <iframe src={pdfUrl}>.
// - Tombol "Unduh" adalah <a href={pdfUrl} download="KUIT-{receiptNumber}.pdf">
//   yang membungkus komponen Button (bukan button langsung, bukan window.open).
// - Tidak ada window.open() — berbeda dengan commitments-print.
// - Intercept POST harus dipasang SEBELUM cy.visit() agar tidak miss auto-fetch.
//
// Prekondisi: minimal 1 kuitansi sudah ada di staging (bisa dari run receipts.cy.ts).
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { FE_BASE, CREDS } from '../../support/commands'

describe('Admin dapat mencetak Kuitansi', () => {
  it('Admin dapat melihat pratinjau PDF kuitansi dan mengunduhnya', () => {
    // 1-4. Login programmatic (tidak perlu test login flow di skenario print).
    cy.loginAs('admin')

    // Pasang intercept POST generate-pdf SEBELUM navigasi ke halaman daftar.
    // PDF di-trigger oleh useEffect saat detail page mount — jika intercept
    // dipasang setelah mount, request bisa sudah pergi duluan.
    cy.intercept('POST', '**/receipts/*/generate-pdf').as('generatePdf')

    // 5. Buka halaman daftar Kuitansi.
    cy.visit(`${FE_BASE}/receipts`)
    cy.contains('h1', 'Kuitansi', { timeout: 20000 }).should('be.visible')

    // 6. Sistem menampilkan daftar Kuitansi. Pastikan ada minimal 1 baris.
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0)

    // 7-8. Pilih kuitansi pertama — klik tombol "Detail".
    cy.contains('button', 'Detail').first().click()

    // 9. Sistem menampilkan halaman detail — URL berubah ke /receipts/:id.
    cy.url({ timeout: 10000 }).should('match', /\/receipts\/\d+/)

    // 10. Sistem menghasilkan PDF — tunggu POST /receipts/:id/generate-pdf selesai.
    cy.wait('@generatePdf', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'POST generate-pdf harus berhasil').to.equal(200)
    })

    // Pratinjau PDF tampil di iframe dengan Blob URL.
    cy.get('iframe', { timeout: 15000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('match', /^blob:/)

    // 11. Tombol "Unduh" tersedia — <a download="KUIT-xxx.pdf"> bukan <button>.
    cy.contains('a', 'Unduh', { timeout: 10000 })
      .should('be.visible')
      .and('have.attr', 'download')
      .and('match', /^KUIT-/)

    // Klik link "Unduh" untuk mensimulasikan aksi unduh PDF.
    // Browser akan menangani download file — Cypress tidak perlu verify file di disk.
    cy.contains('a', 'Unduh').click()
  })
})
