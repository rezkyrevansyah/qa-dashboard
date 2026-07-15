// =============================================================================
// Cypress UI Test — aplikasi-zapper / Companies (Perusahaan)
//
// Skenario: "Admin dapat menginput data Perusahaan"
// Deskripsi: Sebagai Admin saya ingin dapat menginput list perusahaan existing dan
// prospect, sehingga data perusahaan akan selalu terbaharui.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'
import { fillCompanyForm, submitCompanyForm, validCompanyData } from '../../support/companyForm'

describe('Admin dapat menginput data Perusahaan', () => {
  it('Login sebagai Admin, buka List Perusahaan, tambah perusahaan baru, dan pastikan tampil di daftar', () => {
    // 1-4. Buka halaman Login, masukkan email & password Admin, klik Masuk hingga berhasil ke Dashboard.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5-6. Pilih menu "List Perusahaan" di sidebar -> sistem menampilkan daftar perusahaan & mitra.
    cy.findByRole('link', { name: /list perusahaan/i }).click()
    cy.url().should('include', '/companies')
    cy.findByRole('heading', { name: /daftar perusahaan/i }).should('be.visible')

    // 7-8. Klik "+ Mitra Baru" -> sistem menampilkan Form Registrasi Perusahaan.
    // Timeout diperbesar karena backend/frontend berjalan di Cloud Run (min-instances=0),
    // jadi permintaan pertama setelah idle bisa kena cold start beberapa detik.
    cy.findByRole('button', { name: /mitra baru/i, timeout: 20000 }).click()
    cy.findByRole('heading', { name: /tambah perusahaan baru/i }).should('be.visible')

    // 9. Lengkapi seluruh data perusahaan: NPWP, NPWZ, Nama Perusahaan, Tipe Perusahaan,
    // Tanggal Berdiri, Nama Pimpinan, Nama PIC, Bidang Usaha, Telepon, Email, Alamat, Catatan.
    const data = validCompanyData()
    fillCompanyForm(data)

    // RO: pilih opsi pertama yang tersedia secara dinamis (tidak bergantung nama spesifik).
    cy.findByLabelText(/relationship officer/i)
      .find('option:not([disabled])')
      .should('have.length.greaterThan', 0)
    cy.findByLabelText(/relationship officer/i).then(($select) => {
      const firstValue = Cypress.$($select).find('option:not([disabled])').first().val() as string
      cy.wrap($select).select(firstValue)
    })

    // 10-11. Klik Simpan -> sistem menyimpan data dan menampilkannya di daftar perusahaan.
    cy.intercept('POST', '**/companies').as('createCompany')
    submitCompanyForm()

    cy.wait('@createCompany').then(({ response }) => {
      expect(response?.statusCode, 'POST /companies harus berhasil').to.be.oneOf([200, 201])
      expect(response?.body?.data).to.have.property('name', data.name)

      // ⚠️ Catatan koreksi terhadap skenario asli: Form Registrasi Perusahaan TIDAK punya
      // field "Status" — status bukan dipilih Admin saat submit, melainkan ditentukan
      // otomatis oleh backend. Diverifikasi langsung ke backend real: perusahaan baru
      // SELALU dibuat dengan status "Existing" (bukan "Prospect").
      expect(response?.body?.data?.status, 'status default perusahaan baru').to.eq('existing')
    })

    // Hasil yang diharapkan: alert sukses tampil dan form tertutup.
    cy.contains(/perusahaan berhasil ditambahkan/i).should('be.visible')
    cy.findByRole('heading', { name: /tambah perusahaan baru/i }).should('not.exist')

    // Hasil yang diharapkan: data perusahaan yang berhasil disimpan muncul pada daftar,
    // dengan status "Existing".
    cy.findByPlaceholderText(/cari nama, npwp, pic/i).type(data.name!)
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.contains(data.picName!).should('be.visible')
      cy.contains(/existing/i).should('be.visible')
    })
  })
})
