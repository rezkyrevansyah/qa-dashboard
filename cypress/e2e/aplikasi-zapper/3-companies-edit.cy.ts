// =============================================================================
// Cypress UI Test — aplikasi-zapper / Companies (Perusahaan)
//
// ID Test: 3 | ID Project: 84
// Skenario: "Admin dapat mengubah data Perusahaan"
// Deskripsi: Sebagai Admin saya ingin dapat mengupdate data (nama pimpinan, bidang
// usaha, dan alamat), sehingga data perusahaan di label taat zakat terupdate.
//
// Catatan implementasi (diverifikasi langsung dari kode, bukan asumsi):
// - Klik ikon Edit (pensil) pada baris tabel menavigasi ke `/companies/{id}?edit=true`
//   (lihat `companiesColumns.tsx`). Halaman detail (`[id]/page.tsx`) punya `useEffect`
//   yang mendeteksi query param `edit=true` dan membuka modal berjudul
//   "Edit Data Perusahaan" berisi `<CompanyForm mode="edit" defaultValues={company} />`
//   — BUKAN modal "Tambah Perusahaan Baru" seperti pada alur create.
// - Tombol submit pada mode edit bertuliskan "Perbarui Perusahaan" (bukan "Simpan
//   Perusahaan"), memanggil `PUT /companies/:id`.
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'
import { fillCompanyForm, submitCompanyForm, validCompanyData } from '../../support/companyForm'

describe('Admin dapat mengubah data Perusahaan', () => {
  it('Admin dapat mengedit data perusahaan (Pimpinan, PIC, Bidang Usaha, RO, Telepon, Email, Alamat, Catatan) dan perubahan tampil di sistem', () => {
    // 1-4. Buka halaman Login, masukkan email & password Admin, klik Masuk hingga berhasil ke Dashboard.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5-6. Pilih menu "List Perusahaan" -> sistem menampilkan daftar perusahaan yang telah terdaftar.
    cy.findByRole('link', { name: /list perusahaan/i }).click()
    cy.url().should('include', '/companies')
    cy.findByRole('heading', { name: /daftar perusahaan/i }).should('be.visible')

    // Precondition: siapkan 1 perusahaan baru lewat form registrasi, supaya baris & data
    // awal yang diedit deterministik — bukan bergantung baris yang kebetulan ada di halaman 1.
    // RO awal: opsi pertama yang tersedia — akan diubah ke opsi berbeda saat edit.
    cy.findByRole('button', { name: /mitra baru/i, timeout: 20000 }).click()
    cy.findByRole('heading', { name: /tambah perusahaan baru/i }).should('be.visible')
    const original = validCompanyData()
    fillCompanyForm(original)

    // Pilih RO index-0 saat create.
    cy.findByLabelText(/relationship officer/i)
      .find('option:not([disabled])')
      .should('have.length.greaterThan', 0)
    cy.findByLabelText(/relationship officer/i).then(($select) => {
      const firstValue = Cypress.$($select).find('option:not([disabled])').first().val() as string
      cy.wrap($select).select(firstValue)
    })

    cy.intercept('POST', '**/companies').as('createCompany')
    submitCompanyForm()
    cy.wait('@createCompany').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains(/perusahaan berhasil ditambahkan/i).should('be.visible')

    // 7. Pilih perusahaan yang baru dibuat (lewat search box), lalu klik ikon Edit (pensil).
    cy.findByPlaceholderText(/cari nama, npwp, pic/i).type(original.name!)
    cy.contains('tr', original.name!, { timeout: 10000 }).within(() => {
      cy.get('button[title="Edit Data"]').click()
    })
    cy.url({ timeout: 20000 }).should('include', 'edit=true')

    // 8. Sistem menampilkan Form Data Perusahaan (mode edit) beserta data yang dipilih.
    cy.findByRole('heading', { name: /edit data perusahaan/i, timeout: 20000 }).should('be.visible')
    cy.findByLabelText(/nama perusahaan/i).should('have.value', original.name)
    cy.findByLabelText(/email perusahaan/i).should('have.value', original.email)
    cy.findByRole('button', { name: /perbarui perusahaan/i }).should('exist')

    // 9. Ubah field yang diminta skenario: Nama Pimpinan, Nama PIC, Bidang Usaha, RO, Telepon,
    // Email, Alamat, Catatan. NPWP/NPWZ/Tipe Perusahaan/Tanggal Berdiri dibiarkan (tidak
    // disebut skenario) — fillCompanyForm hanya menyentuh key yang benar-benar diberikan.
    const suffix = `${Date.now()}`
    const updated = {
      leaderName: `Andi Wijaya Updated ${suffix}`,
      picName: `Rina Kartika Updated ${suffix}`,
      phone: '081298765432',
      email: `updated.${suffix}@maju.co.id`,
      address: `Jl. Sudirman No. 99, Jakarta Selatan (updated ${suffix})`,
      notes: `Data diperbarui oleh automation test ${suffix}`,
    }
    fillCompanyForm(updated)

    // Bidang Usaha: pilih opsi lain selain yang sedang terpilih, supaya perubahannya
    // benar-benar berbeda (bukan kebetulan sama dengan nilai sebelumnya).
    let updatedSector = ''
    cy.findByLabelText(/bidang usaha/i).then(($select) => {
      const currentValue = Cypress.$($select).val() as string
      const options = [...Cypress.$($select).find('option:not([disabled])')]
      const differentValue = options
        .map((o) => o.getAttribute('value'))
        .find((v) => v && v !== currentValue)
      updatedSector = differentValue ?? currentValue
      cy.wrap($select).select(updatedSector)
    })

    // RO: ubah ke opsi yang berbeda dari yang sedang terpilih (index berikutnya, atau index-0 jika
    // yang terpilih sudah index-0 sebelumnya — pilihan tidak bergantung nama spesifik).
    cy.findByLabelText(/relationship officer/i)
      .find('option:not([disabled])')
      .should('have.length.greaterThan', 1)
    cy.findByLabelText(/relationship officer/i).then(($select) => {
      const currentValue = Cypress.$($select).val() as string
      const opts = Cypress.$($select).find('option:not([disabled])')
      const values = [...opts].map((o) => o.getAttribute('value') ?? '')
      const different = values.find((v) => v && v !== currentValue) ?? values[0]
      cy.wrap($select).select(different)
    })

    // 10. Klik "Perbarui Perusahaan" — sistem mengirim PUT /companies/:id.
    cy.intercept('PUT', '**/companies/*').as('updateCompany')
    cy.findByRole('button', { name: /perbarui perusahaan/i }).click()

    // 11. Sistem berhasil menyimpan perubahan: PUT mengembalikan 200, toast sukses tampil,
    // dan modal tertutup.
    cy.wait('@updateCompany', { timeout: 20000 }).then(({ response }) => {
      expect(response?.statusCode, 'PUT /companies/:id harus berhasil').to.be.oneOf([200, 201])
    })
    cy.contains(/perusahaan berhasil diperbarui/i, { timeout: 10000 }).should('be.visible')
    cy.findByRole('heading', { name: /edit data perusahaan/i }).should('not.exist')

    // 12. Toast sukses tampil sebagai konfirmasi perubahan tersimpan.
    cy.contains(/perusahaan berhasil diperbarui/i, { timeout: 10000 }).should('be.visible')

    // Kembali ke list untuk verifikasi data terbaru muncul di tabel.
    cy.findByRole('link', { name: /list perusahaan/i }).click()
    cy.findByRole('heading', { name: /daftar perusahaan/i, timeout: 10000 }).should('be.visible')
    cy.findByPlaceholderText(/cari nama, npwp, pic/i, { timeout: 10000 }).clear().type(original.name!)
    cy.contains('tr', original.name!, { timeout: 10000 }).within(() => {
      cy.contains(updated.picName!).should('be.visible')
    })
  })
})
