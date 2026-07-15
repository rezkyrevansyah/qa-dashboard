# Test Scenarios — Companies (Perusahaan)

Dokumen test scenario untuk fitur manajemen data Perusahaan di aplikasi Zaper, ditulis agar bisa langsung dipakai sebagai input untuk membuat automation test dengan **Cypress + TypeScript**.

## Isi folder

- [TC-COMPANY-001-input-data-perusahaan.md](TC-COMPANY-001-input-data-perusahaan.md) — Skenario lengkap "Admin dapat menginput data Perusahaan", diperluas dari 1 skenario mentah menjadi 59 test case: Positive (A), Field Validation (B), Enum & Dropdown (C), Duplicate/Uniqueness (D), RBAC (E), Security SQLi/XSS (F), Non-Functional (G).

## Mapping ke checklist internal proyek

Lihat [reff/checklist_kualitas_testing.md](../../reff/checklist_kualitas_testing.md) (SD-106).

| Checklist | Item | Dicakup di |
|---|---|---|
| QT1-6 | Validasi parameter, SQLi, XSS | Bagian B (validasi), F (SQLi/XSS) |
| QT3-2 | Required field kosong → 400 | Bagian B (semua field wajib) |
| QT3-3 | Data invalid → 422 | Bagian B, D |
| QT3-4 | Auth gagal → 403 | Bagian E |
| QT3-5/6 | SQLi/XSS → 400 | Bagian F |
| QT3-1 | Response time ≤ 3 detik | Bagian G01-G02 |
| QT3-7 | API selalu ada callback, tidak null | Bagian G03 |
| QT4-5 | Autentikasi, RBAC, proteksi SQLi/XSS | Bagian E, F |
| QT6-1/6-4 | Smoke: akses & tampil data | Bagian G04 |

## Asumsi & batasan penting (baca sebelum generate script Cypress)

1. **Backend tidak ada di repo frontend ini** (`aplikasi-zaper` adalah Next.js frontend yang mengonsumsi REST API eksternal via `NEXT_PUBLIC_API_BASE_URL`). Setiap ekspektasi HTTP status code yang belum bisa dipastikan dari kode frontend ditandai **"⚠️ verify against real backend"** — jalankan dulu terhadap backend staging sebelum menganggap ekspektasi tsb final.
2. **Tidak ada `data-testid`/`data-cy`** di komponen manapun saat dokumen ini ditulis. Skenario memakai selector berbasis label/role (`cy.findByLabelText`, `cy.findByRole`) ala `@testing-library/cypress`. Jika automation butuh selector lebih stabil, tambahkan `data-cy` ke `src/components/forms/CompanyForm.tsx` dan komponen UI terkait (`Input`, `Select`, `Button`) terlebih dahulu.
3. **Belum ada folder/config Cypress** di repo ini. Automation engineer perlu setup awal: `cypress.config.ts`, `cypress/e2e/`, `cypress/support/`, plugin `@testing-library/cypress` untuk selector berbasis label.
4. Skenario asli menyebut "Status Existing/Prospect dipilih saat submit form" — ini **tidak sesuai implementasi aktual**. Form create tidak punya field status; status diubah lewat aksi terpisah "Switch Status" yang admin-only. Lihat bagian §2 di file utama untuk detail koreksi lengkap.
5. Beberapa gap validasi ditemukan by-design dari kode saat ini (bukan asumsi): NPWP/NPWZ tanpa validasi format, Nomor Telepon tanpa validasi digit-only. Ini didokumentasikan sebagai test case eksplisit (B16, B20) agar automation mengonfirmasi perilaku aktual, bukan berasumsi tervalidasi.
6. Status `Form` dan `Inactive` pada `CompanyStatus` baru dicakup di level filter (C07) — belum ditemukan alur UI yang men-trigger transisi ke status tsb. Perlu klarifikasi dari tim produk jika automation ingin menguji transisi lengkap ke semua 4 status.
