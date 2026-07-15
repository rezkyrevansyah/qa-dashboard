// =============================================================================
// Cypress UI Test — aplikasi-zapper / Companies (Perusahaan)
//
// ID Test: 2 | ID Project: 84
// Skenario: "Admin dapat mengganti label perusahaan"
// Deskripsi: Sebagai Admin saya ingin dapat mengganti label perusahaan (existing dan
// prospect), sehingga status perusahaan tersebut selalu terbaharui.
//
// ⚠️ Koreksi terhadap skenario asli (diverifikasi langsung ke backend & FE real sandbox):
// 1. Tombol "Ubah Status" pada baris tabel TIDAK membuka dialog pemilihan status
//    (Existing/Prospect) dan TIDAK ada tombol "Simpan" terpisah — satu klik ikon tsb
//    LANGSUNG memanggil `PATCH /companies/:id/status` (lihat `handleSwitchStatus` di
//    `useCompaniesData.ts` dan tombol di `companiesColumns.tsx`). Langkah skenario asli
//    "pilih status" + "klik simpan" sebagai dua langkah terpisah tidak sesuai implementasi.
// 2. Backend MENGABAIKAN field `status` di request body endpoint tsb — endpoint ini murni
//    men-toggle status `existing` ⇄ `inactive` di server, terlepas dari nilai yang benar-benar
//    dikirim FE (FE menghitung & mengirim target Prospek/Existing, tapi backend selalu
//    menghasilkan existing/inactive apa pun isi body-nya — sudah diverifikasi empiris,
//    termasuk dengan body kosong `{}` yang tetap men-toggle). Jadi "mengubah dari Existing
//    ke Prospect" seperti diharapkan skenario TIDAK PERNAH benar-benar terjadi lewat tombol
//    ini di kondisi backend saat ini. Test ini memverifikasi PERILAKU NYATA (toggle
//    existing ⇄ inactive, dua arah), bukan asumsi skenario yang sudah tidak sesuai kode.
// 3. Tombol "Ubah Status" hanya tampil untuk role admin_zaper (`canSwitchStatus = isAdmin`).
//
// Target FE: https://fe-zaper-staging-53046748745.asia-southeast2.run.app
// =============================================================================

import { CREDS } from '../../support/commands'
import { fillCompanyForm, submitCompanyForm, validCompanyData } from '../../support/companyForm'

describe('Admin dapat mengganti label perusahaan', () => {
  it('Admin dapat toggle status perusahaan (Existing ⇄ Inactive) lewat tombol Ubah Status, dan perubahan tampil di daftar', () => {
    // 1-4. Buka halaman Login, masukkan email & password Admin, klik Masuk hingga berhasil ke Dashboard.
    cy.loginUI(CREDS.admin.email, CREDS.admin.password)
    cy.url().should('include', '/dashboard')

    // 5-6. Pilih menu "List Perusahaan" -> sistem menampilkan daftar perusahaan beserta statusnya.
    cy.findByRole('link', { name: /list perusahaan/i }).click()
    cy.url().should('include', '/companies')
    cy.findByRole('heading', { name: /daftar perusahaan/i }).should('be.visible')

    // Precondition: siapkan 1 perusahaan baru lewat form registrasi, supaya baris & status
    // awal yang diuji deterministik — bukan bergantung baris pertama yang kebetulan ada di
    // halaman 1 (dataset sandbox bisa berubah-ubah dari run test lain).
    cy.findByRole('button', { name: /mitra baru/i, timeout: 20000 }).click()
    cy.findByRole('heading', { name: /tambah perusahaan baru/i }).should('be.visible')
    const data = validCompanyData()
    fillCompanyForm(data)
    cy.intercept('POST', '**/companies').as('createCompany')
    submitCompanyForm()
    cy.wait('@createCompany').then(({ response }) => {
      expect(response?.statusCode, 'POST /companies harus berhasil').to.be.oneOf([200, 201])
      expect(response?.body?.data?.status, 'status default perusahaan baru').to.eq('existing')
    })
    cy.contains(/perusahaan berhasil ditambahkan/i).should('be.visible')

    // 7. Pilih perusahaan yang baru dibuat (cari lewat search box supaya baris yang tepat
    // ketemu, bukan asumsi ada di halaman pertama).
    cy.findByPlaceholderText(/cari nama, npwp, pic/i).type(data.name!)
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.contains(/existing/i).should('be.visible')
    })

    // 8-10 (versi nyata aplikasi — lihat catatan koreksi #1 di atas): klik ikon "Ubah Status".
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.intercept('PATCH', '**/companies/*/status').as('switchStatus1')
      cy.get('button[title*="Ubah Status"]').click()
    })
    cy.wait('@switchStatus1').then(({ response }) => {
      expect(response?.statusCode, 'PATCH /companies/:id/status harus berhasil').to.eq(200)
      // ⚠️ Hasil aktual (lihat catatan koreksi #2): backend selalu toggle 'existing' -> 'inactive'.
      expect(response?.body?.data?.status, 'status hasil toggle pertama').to.eq('inactive')
    })

    // 11-12. Sistem menyimpan perubahan & langsung menampilkan status baru di daftar.
    cy.contains(/status diperbarui/i).should('be.visible')
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.contains(/tidak aktif/i, { timeout: 10000 }).should('be.visible')
    })

    // Toggle kedua — membuktikan perubahan status berlaku dua arah ("atau sebaliknya" pada
    // skenario asli), meski pasangan statusnya existing ⇄ inactive (bukan existing ⇄ prospek).
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.intercept('PATCH', '**/companies/*/status').as('switchStatus2')
      cy.get('button[title*="Ubah Status"]').click()
    })
    cy.wait('@switchStatus2').then(({ response }) => {
      expect(response?.statusCode, 'PATCH /companies/:id/status harus berhasil').to.eq(200)
      expect(response?.body?.data?.status, 'status hasil toggle kedua').to.eq('existing')
    })
    cy.contains(/status diperbarui/i).should('be.visible')
    cy.contains('tr', data.name!, { timeout: 10000 }).within(() => {
      cy.contains(/existing/i, { timeout: 10000 }).should('be.visible')
    })
  })
})
