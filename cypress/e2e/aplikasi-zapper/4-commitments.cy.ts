// =============================================================================
// Cypress UI Test — aplikasi-zapper / Lembar Komitmen
//
// ID Test: 4 | ID Project: 84
// Skenario: "Admin dapat membuat lembar komitmen"
// Deskripsi: Sebagai Admin saya ingin dapat membuat lembar komitmen dengan
// menggunakan form, sehingga menghemat waktu dalam pembuatan lembar komitmen.
//
// Catatan implementasi (diverifikasi dari kode sumber D:\diti\aplikasi-zaper):
// - Halaman buat: /commitments/new (Next.js App Router, client component)
// - No. Komitmen: input[name="documentNumber"] — diisi manual, BUKAN auto-generated
// - Perusahaan: select[name="companyId"] + input search "Cari perusahaan..."
// - Ruang Lingkup, Tujuan, Komitmen Perusahaan, Komitmen BAZNAS: RichEditor
//   (div[contenteditable="true"]) — tidak punya name attribute, diakses via label
// - PIC (Nama, Telepon, Email): auto-fill dari data perusahaan yang dipilih
// - Setelah submit sukses: SweetAlert2 success → router.push('/commitments/:id')
// - AC-12: No. Komitmen dibuat otomatis — dalam implementasi aktual diisi manual
//   oleh admin sesuai format penomoran, BUKAN di-generate backend. Test mengisi
//   nilai unik per run sebagai representasi nomor yang "dikonfigurasi".
//
// Scope test: Pembuatan Lembar Komitmen saja. Persiapan Template (upload PDF,
// atur posisi variabel) tidak ditest — bergantung file upload & drag-drop canvas.
// Template dianggap sudah tersedia di staging environment.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'

// ── Helper: isi RichEditor via contenteditable ────────────────────────────────
// RichEditor diimplementasikan sebagai div[contenteditable] yang dibungkus Controller
// react-hook-form — tidak punya name attribute, diakses lewat closest wrapper div.
function typeIntoRichEditor(labelText: string, value: string): void {
  cy.contains('label', labelText)
    .closest('div.mb-4')
    .find('[contenteditable="true"]')
    .click()
    .clear()
    .type(value, { delay: 10, parseSpecialCharSequences: false })
}

// ── Helper: isi date input via invoke/trigger ────────────────────────────────
// Input type="date" dari komponen Input tidak selalu merespons .type() langsung.
function setDateInput(labelRe: RegExp, isoDate: string): void {
  cy.findByLabelText(labelRe)
    .invoke('val', isoDate)
    .trigger('input')
    .trigger('change')
}

describe('Admin dapat membuat Lembar Komitmen', () => {
  it('Admin dapat mengisi form dan menyimpan lembar komitmen baru, data muncul di halaman detail', () => {
    // 1-4. Login sebagai Admin.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5. Pilih menu "Lembar Komitmen" di sidebar.
    cy.contains('a', 'Lembar Komitmen').click()
    cy.url().should('include', '/commitments')
    cy.contains('h1', 'Lembar Komitmen').should('be.visible')

    // 6. Klik "Buat Lembar Komitmen" — sistem menampilkan halaman form baru.
    cy.contains('button', 'Buat Lembar Komitmen', { timeout: 20000 }).click()
    cy.url().should('include', '/commitments/new')
    cy.contains('h1', 'Buat Lembar Komitmen').should('be.visible')

    // 7. Isi No. Komitmen — unik per run agar tidak bentrok dengan data existing.
    // (AC-12: nomor komitmen dibuat sesuai format penomoran yang dikonfigurasi admin.)
    const docNumber = `F-TEST-BAZNAS/${Date.now()}`
    cy.get('input[name="documentNumber"]').clear().type(docNumber, { parseSpecialCharSequences: false })

    // 8. Pilih Perusahaan — tunggu list ter-load dari API, lalu pilih opsi pertama secara dinamis.
    cy.get('select[name="companyId"]')
      .find('option:not([value=""])')
      .should('have.length.greaterThan', 0)
    cy.get('select[name="companyId"]').then(($sel) => {
      const firstValue = Cypress.$($sel).find('option:not([value=""])').first().val() as string
      cy.wrap($sel).select(firstValue)
    })

    // 9. Isi Isi Komitmen — 4 RichEditor field.
    // Beri jeda setelah pilih perusahaan supaya auto-fill PIC selesai.
    cy.wait(500)
    typeIntoRichEditor('Ruang Lingkup (No.6)',       'Komitmen meliputi pembayaran zakat perusahaan secara rutin setiap tahun.')
    typeIntoRichEditor('Tujuan Komitmen (No.7)',     'Meningkatkan kesadaran perusahaan dalam menunaikan kewajiban zakat.')
    typeIntoRichEditor('Komitmen Perusahaan (No.9)', 'Perusahaan berkomitmen membayar zakat sebesar 2,5% dari keuntungan bersih.')
    typeIntoRichEditor('Komitmen BAZNAS (No.10)',    'BAZNAS berkomitmen memberikan sertifikat Taat Zakat dan laporan distribusi.')

    // 10. Isi Periode Komitmen dan Tanggal Penandatanganan.
    setDateInput(/periode mulai/i,            '2026-01-01')
    setDateInput(/periode selesai/i,          '2026-12-31')
    setDateInput(/tanggal penandatanganan/i,  '2026-01-15')

    // 11. PIC — auto-fill dari perusahaan. Jika kosong (perusahaan tidak punya PIC),
    // isi manual agar form dapat disubmit (Nama PIC & Telepon PIC wajib).
    cy.findByLabelText(/nama pic/i).then(($el) => {
      if (!($el.val() as string).trim()) {
        cy.wrap($el).clear().type('PIC Automation Test', { parseSpecialCharSequences: false })
      }
    })
    cy.findByLabelText(/no\. telepon pic/i).then(($el) => {
      if (!($el.val() as string).trim()) {
        cy.wrap($el).clear().type('081234567890', { parseSpecialCharSequences: false })
      }
    })
    cy.findByLabelText(/email pic/i).then(($el) => {
      const val = ($el.val() as string).trim()
      if (!val || !val.includes('@')) {
        cy.wrap($el).clear().type(`automation.pic+${Date.now()}@maju.co.id`, { parseSpecialCharSequences: false })
      }
    })

    // 12. Isi Lain-lain (opsional).
    cy.get('textarea[name="notes"]').clear().type('Dibuat oleh automation test Cypress.', { parseSpecialCharSequences: false })

    // 13. Intercept POST lalu klik Simpan — dicoba hingga 3 kali dengan jeda,
    // untuk mengantisipasi tombol yang belum aktif atau respons lambat dari staging.
    cy.intercept('POST', '**/commitments').as('createCommitment')
    cy.contains('button', 'Simpan Lembar Komitmen').first().click()
    cy.wait(1500)
    cy.contains('button', 'Simpan Lembar Komitmen').first().click()
    cy.wait(1500)
    cy.contains('button', 'Simpan Lembar Komitmen').first().click()

    // 14. Sistem menyimpan data — POST /commitments mengembalikan 200/201.
    cy.wait('@createCommitment', { timeout: 30000 }).then(({ response }) => {
      expect(response?.statusCode, 'POST /commitments harus berhasil').to.be.oneOf([200, 201])
    })

    // 15. SweetAlert2 success tampil.
    cy.get('.swal2-popup', { timeout: 15000 }).should('be.visible')
    cy.get('.swal2-title, .swal2-html-container')
      .should('contain.text', 'Lembar komitmen berhasil dibuat')

    // 16. Sistem redirect ke halaman detail lembar komitmen yang baru dibuat.
    cy.url({ timeout: 15000 }).should('match', /\/commitments\/\d+/)
  })
})
