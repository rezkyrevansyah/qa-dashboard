// =============================================================================
// Cypress UI Test — aplikasi-zapper / Kuitansi
//
// ID Test: 8 | ID Project: 84
// Skenario: "Admin dapat membuat Kuitansi"
// Deskripsi: Sebagai Admin saya ingin dapat membuat kuitansi, sehingga tidak
// perlu melakukan edit manual.
//
// Catatan implementasi (diverifikasi dari D:\diti\aplikasi-zaper):
// - Form "Buat Kuitansi" ditampilkan sebagai MODAL di halaman /receipts.
// - Field "Pilih Transaksi": GET /transactions?perPage=500 (dipanggil saat modal buka).
//   Di staging transaksi mungkin kosong → select hanya punya opsi disabled "Tidak ada
//   transaksi". Solusi: stub GET /transactions dengan 1 transaksi dummy sebelum buka modal.
// - Field "Pilih Template": hanya muncul jika role admin/kepala DAN ada template.
// - Tombol submit disabled sampai transactionId dipilih.
// - Setelah sukses: SweetAlert2 auto-close 2200ms → modal tutup → tabel refresh.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'

// Satu transaksi dummy yang memenuhi interface Transaction dari src/types/index.ts.
// Nilai field disesuaikan agar label di option "<companyName> · <nominal> · <tanggal>" valid.
const STUB_TRANSACTION = {
  id:              '999',
  uuid:            'stub-uuid-999',
  companyId:       '1',
  companyName:     'PT Automation Stub',
  roId:            null,
  roName:          null,
  receiptNumber:   null,
  transactionDate: '2026-01-15',
  amount:          5000000,
  zakatType:       'zakat_perusahaan',
  npwzNumber:      'NPWZ-STUB',
  jenisDana:       'zakat',
  simbaRef:        'SIMBA-STUB',
  receiptId:       null,
  notes:           null,
}

describe('Admin dapat membuat Kuitansi', () => {
  it('Admin dapat mengisi form kuitansi dan menyimpannya, nomor kuitansi muncul di daftar', () => {
    // 1-4. Login sebagai Admin.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5. Pilih menu "Kuitansi" di sidebar.
    cy.contains('a', 'Kuitansi').click()
    cy.url().should('include', '/receipts')
    cy.contains('h1', 'Kuitansi', { timeout: 20000 }).should('be.visible')

    // Pasang stub GET /transactions SEBELUM buka modal — query dijalankan saat modal mount
    // (enabled: createOpen). Stub mengembalikan 1 transaksi dummy agar select tidak kosong.
    cy.intercept('GET', '**/transactions*', {
      statusCode: 200,
      body: {
        data:  [STUB_TRANSACTION],
        total: 1,
        page:  1,
        perPage: 500,
      },
    }).as('getTransactions')

    // 6. Klik "+ Buat Kuitansi" — sistem menampilkan modal form.
    cy.contains('button', 'Buat Kuitansi', { timeout: 20000 }).click()

    // Verifikasi modal terbuka.
    cy.get('#modal-title', { timeout: 10000 }).should('contain.text', 'Buat Kuitansi')

    // Tunggu stub transaksi digunakan oleh React Query.
    cy.wait('@getTransactions')

    // 7. Isi No. Kuitansi — unik per run.
    const receiptNumber = `KUIT/${Date.now()}`
    cy.get('input[name="receiptNumber"]')
      .clear()
      .type(receiptNumber, { parseSpecialCharSequences: false })

    // 8. Pilih Transaksi — stub menjamin ada 1 opsi valid, pilih secara dinamis.
    cy.get('select[name="transactionId"]')
      .find('option:not([value=""]):not([disabled])')
      .should('have.length.greaterThan', 0)
    cy.get('select[name="transactionId"]').then(($sel) => {
      const firstValue = Cypress.$($sel)
        .find('option:not([value=""]):not([disabled])')
        .first()
        .val() as string
      cy.wrap($sel).select(firstValue)
    })

    // 9. Pilih Template (opsional — hanya ada jika admin dan template tersedia).
    cy.get('body').then(($body) => {
      if ($body.find('select[name="templateId"]').length > 0) {
        cy.get('select[name="templateId"]').then(($sel) => {
          const firstOpt = Cypress.$($sel)
            .find('option:not([value=""]):not([disabled])')
            .first()
            .val() as string
          if (firstOpt) cy.wrap($sel).select(firstOpt)
        })
      }
    })

    // 10. Intercept POST sebelum submit.
    cy.intercept('POST', '**/receipts').as('createReceipt')

    // 11. Klik tombol submit "Buat Kuitansi" di footer modal (type="submit").
    cy.get('button[type="submit"]').contains(/buat kuitansi/i).click()

    // 12. Sistem menyimpan data kuitansi — POST /receipts berhasil.
    cy.wait('@createReceipt', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'POST /receipts harus berhasil').to.be.oneOf([200, 201])
    })

    // 13. SweetAlert2 success tampil (auto-dismiss 2200ms).
    cy.get('.swal2-popup', { timeout: 15000 }).should('be.visible')
    cy.get('.swal2-title, .swal2-html-container')
      .should('contain.text', 'Kuitansi berhasil dibuat')

    // 14. Modal tertutup setelah alert dismiss.
    cy.get('#modal-title', { timeout: 5000 }).should('not.exist')

    // 15. Kuitansi yang baru dibuat tampil di daftar.
    cy.get('input[type="search"]', { timeout: 10000 })
      .clear()
      .type(receiptNumber, { parseSpecialCharSequences: false })
    cy.contains('td', receiptNumber, { timeout: 10000 }).should('be.visible')
  })
})
