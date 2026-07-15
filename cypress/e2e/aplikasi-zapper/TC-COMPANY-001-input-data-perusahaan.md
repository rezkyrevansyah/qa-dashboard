# TC-COMPANY-001 — Admin Menginput Data Perusahaan

## Credentials Login
Email: admin@baznas.go.id
Password: Admin@12345

## 1. Ringkasan

**Judul asli:** Admin dapat menginput data Perusahaan
**Deskripsi asli:** Sebagai Admin saya ingin dapat menginput list perusahaan existing dan prospect, sehingga data perusahaan akan selalu terbaharui.

**Fitur terkait di kode:**
- List: [src/app/(dashboard)/companies/page.tsx](../../src/app/(dashboard)/companies/page.tsx)
- Form create/edit: [src/components/forms/CompanyForm.tsx](../../src/components/forms/CompanyForm.tsx)
- Data/mutations: [src/app/(dashboard)/companies/_hooks/useCompaniesData.ts](../../src/app/(dashboard)/companies/_hooks/useCompaniesData.ts)
- API client: [src/services/companies.service.ts](../../src/services/companies.service.ts)
- Tipe data: [src/types/index.ts](../../src/types/index.ts)

## 2. Koreksi terhadap skenario asli (baca sebelum membuat script automation)

Skenario asli menyebut "Klik Simpan → status Existing" dan "Status dapat dipilih Existing/Prospect saat submit form". **Ini tidak sesuai implementasi aktual:**

1. Form create **tidak punya field Status**. Saat `POST /companies` berhasil, backend yang menentukan status awal (asumsikan default `prospek` — **harus diverifikasi ke backend real**, lihat TC-COMPANY-001-D).
2. Untuk mengubah status Existing ⇄ Prospek, gunakan aksi terpisah "Switch Status" pada baris tabel (`handleSwitchStatus` di `useCompaniesData.ts`), yang memanggil `PATCH /companies/:id/status`, dan tombol ini **hanya tampil untuk role `admin_zaper`** (`canSwitchStatus = isAdmin`).
3. `CompanyStatus` punya 4 nilai, bukan 2: `Prospek`, `Existing`, `Form` (label "Form Klaim"), `Inactive` (label "Tidak Aktif").
4. `CompanyType` value sebenarnya adalah `Syariat` (bukan "Syariah") dan `Umum`.
5. NPWP dan NPWZ **opsional**, tanpa validasi format — placeholder menyarankan format `00.000.000.0-000.000` tapi tidak ditegakkan oleh schema. Ini adalah gap nyata yang harus diuji sebagai test case, bukan diasumsikan tervalidasi.
6. Field "Relationship Officer (RO)" ada di form tapi tidak disebut skenario asli — dropdown ini opsional; jika dikosongkan, backend akan memakai akun pembuat (user yang login) sebagai RO.

Semua test case di bawah sudah dikoreksi sesuai poin ini.

## 3. Referensi validasi field (dari `CompanyForm.tsx` — zod schema, baris 17-31)

| Field (label UI) | Field (name attr) | Wajib? | Aturan | Pesan error |
|---|---|---|---|---|
| NPWP | `npwp` | Tidak | `max 20 char`, boleh kosong | - |
| NPWZ | `npwz` | Tidak | `max 50 char`, boleh kosong | - |
| Nama Perusahaan | `name` | **Ya** | `min 2, max 200` | "Nama perusahaan wajib diisi" |
| Tipe Perusahaan | `companyType` | **Ya** | enum: `syariat` \| `umum` | "Pilih tipe perusahaan" |
| Tanggal Berdiri | `establishmentDate` | Tidak | `type="date"`, tanpa validasi range | - |
| Nama Pimpinan (Top Management) | `leaderName` | **Ya** | `min 2, max 200` | "Nama pimpinan wajib diisi" |
| Nama Penanggung Jawab (PIC) | `picName` | **Ya** | `min 2, max 100` | "Nama PIC wajib diisi" |
| Bidang Usaha | `sector` | **Ya** | `min 1`, diisi dari `GET /sectors` (bukan hardcoded) | "Bidang usaha wajib dipilih" |
| Relationship Officer (RO) | `roId` | Tidak | dari `GET /users?role=ro&perPage=100`, kosong = pakai akun sendiri | - |
| Nomor Telepon | `phone` | **Ya** | `min 8, max 20` char (tanpa regex digit) | "Nomor telepon tidak valid" |
| Email Perusahaan | `email` | **Ya** | format email standar (zod `.email()`) | "Format email tidak valid" |
| Alamat | `address` | **Ya** | `min 5, max 500` (textarea) | "Alamat wajib diisi" (custom render, bukan lewat `Input`) |
| Catatan Tambahan | `notes` | Tidak | `max 1000` (textarea) | - |

Catatan penting untuk automation: form pakai `noValidate` pada `<form>` — semua validasi murni client-side via react-hook-form + zod, jadi tidak ada validasi HTML5 native yang bisa diandalkan; test harus trigger submit dan cek pesan error yang dirender.

## 4. Role & RBAC (`RoleEnum`, `src/types/index.ts`)

| Role | Value | Lihat List | Create | Edit | Delete | Import | Export | Switch Status |
|---|---|---|---|---|---|---|---|---|
| Admin Zaper | `admin_zaper` | Ya | Ya | Ya (semua) | Ya | Ya | Ya | Ya |
| Relationship Officer | `ro` | Ya | Tidak (tombol hidden) | Ya, **hanya company miliknya sendiri** (`company.roId === currentUser.id`) | Tidak | Tidak | Ya (asumsi — perlu cek) | Tidak |
| Tim Layanan | `tim_layanan` | Ya | Tidak | Tidak | Tidak | Tidak | Tidak dipastikan | Tidak |
| Kepala Divisi | `kepala_divisi` | Ya | Tidak | Tidak | Tidak | Tidak | Tidak dipastikan | Tidak |

Sumber: `canWrite/canDelete/canImport/canSwitchStatus = isAdmin` dan cek `roId` di `companiesColumns.tsx` + `[id]/page.tsx` (lihat plan/eksplorasi). **Setiap kondisi "Tidak" wajib diuji dua arah**: (a) elemen UI tersembunyi, (b) pemanggilan API langsung tetap ditolak backend (bukan cuma disembunyikan di UI) — karena UI-only restriction bisa dibypass.

## 5. Konvensi automation (Cypress + TypeScript)

- Belum ada folder Cypress di repo ini maupun `data-testid`/`data-cy` di komponen. Skenario ini pakai selector berbasis **label/teks** ala `@testing-library/cypress` (`cy.findByLabelText('Nama Perusahaan')`, `cy.findByRole('button', { name: /simpan perusahaan/i })`). **Rekomendasi**: tambahkan atribut `data-cy` ke `Input`/`Select`/`Button` di `CompanyForm.tsx` sebelum menulis automation final, untuk selector yang stabil terhadap perubahan teks/i18n.
- Backend berada di luar repo ini (frontend konsumsi REST API eksternal, base URL `NEXT_PUBLIC_API_BASE_URL`). Untuk test API-level, gunakan `cy.request()` langsung ke endpoint, atau intercept (`cy.intercept()`) bila ingin isolasi dari backend nyata saat menguji UI.
- Status code diasumsikan mengikuti konvensi [reff/error_status.md](../../reff/error_status.md) dan checklist [reff/checklist_kualitas_testing.md](../../reff/checklist_kualitas_testing.md) QT3: field kosong → 400, data invalid → 422, auth gagal → 403. **Tandai dengan "⚠️ verify against real backend"** setiap ekspektasi status code yang belum bisa dipastikan dari frontend saja.
- Setiap test harus independen (tidak bergantung urutan/test lain — sesuai QT1-3), dan idealnya membuat/membersihkan data sendiri (`cy.request` ke endpoint seed/cleanup jika tersedia, atau data unik per run misal email/NPWP dengan timestamp/uuid).

## 6. Template test case

```
### TC-COMPANY-001-<Kategori><No> — <nama singkat>
- Kategori: Positive | Negative | Enum | Duplicate | RBAC | Security | NonFunctional
- Role: admin_zaper | ro | tim_layanan | kepala_divisi | (unauthenticated)
- Precondition: ...
- Data uji:
  | Field | Value |
- Steps:
  1. ...
- Expected Result:
  - UI: ...
  - API: `METHOD /path` → status, body assertion
- Assertion checklist automation:
  - [ ] ...
```

---

## A. Positive / Happy Path

### TC-COMPANY-001-A01 — Admin berhasil login dan membuka List Perusahaan
- Kategori: Positive
- Role: admin_zaper
- Precondition: Akun admin valid tersedia (`ADMIN_EMAIL` / `ADMIN_PASSWORD` dari env/fixture Cypress).
- Steps:
  1. `cy.visit('/login')`.
  2. Isi email: `cy.findByLabelText(/email/i).type(ADMIN_EMAIL)`.
  3. Isi password: `cy.findByLabelText(/password/i).type(ADMIN_PASSWORD)`.
  4. Klik tombol Masuk: `cy.findByRole('button', { name: /masuk/i }).click()`.
  5. Tunggu redirect ke dashboard (`cy.url().should('include', '/dashboard')` atau path dashboard yang sesuai — cek `middleware.ts` untuk path pasti).
  6. Klik menu "List Perusahaan" di sidebar.
- Expected Result:
  - UI: Halaman "Daftar Perusahaan & Mitra" tampil, judul `h1` berisi teks tsb, tabel & metrics cards (Total Mitra, Mitra Aktif, Prospek Mitra) terlihat.
  - API: `POST /auth/login` → 200 dengan token; `GET /companies` (list awal) → 200.
- Assertion checklist automation:
  - [ ] Cookie/token tersimpan (`baznas_token`) setelah login sukses.
  - [ ] Redirect ke `/login` TIDAK terjadi (artinya sesi valid).
  - [ ] Tabel companies dan metrics cards ter-render tanpa error.

### TC-COMPANY-001-A02 — Admin berhasil membuka form registrasi perusahaan baru
- Kategori: Positive
- Role: admin_zaper
- Precondition: Sudah di halaman List Perusahaan (lanjutan A01).
- Steps:
  1. Klik tombol `+ Mitra Baru` (`cy.findByRole('button', { name: /mitra baru/i }).click()`).
- Expected Result:
  - UI: Modal "Tambah Perusahaan Baru" terbuka, menampilkan semua field form (lihat tabel §3).
- Assertion checklist automation:
  - [ ] Modal visible dengan title "Tambah Perusahaan Baru".
  - [ ] Semua 12 field ada di DOM: NPWP, NPWZ, Nama Perusahaan, Tipe Perusahaan, Tanggal Berdiri, Nama Pimpinan, PIC, Bidang Usaha, RO, Telepon, Email, Alamat, Catatan.
  - [ ] Tombol "Simpan Perusahaan" & "Batal" ada.

### TC-COMPANY-001-A03 — Admin berhasil menyimpan data perusahaan lengkap (semua field valid, termasuk opsional)
- Kategori: Positive
- Role: admin_zaper
- Precondition: Modal form terbuka (lanjutan A02). Bidang Usaha & RO dropdown sudah ter-load (`GET /sectors`, `GET /users?role=ro`).
- Data uji:
  | Field | Value |
  |---|---|
  | NPWP | `01.234.567.8-901.000` |
  | NPWZ | `NPWZ-0001` |
  | Nama Perusahaan | `PT Automation Test Sejahtera` (buat unik per run, mis. suffix timestamp/uuid agar tidak bentrok data existing) |
  | Tipe Perusahaan | `Umum` |
  | Tanggal Berdiri | `2010-05-17` |
  | Nama Pimpinan | `Budi Santoso` |
  | Nama PIC | `Siti Aminah` |
  | Bidang Usaha | pilih opsi pertama dari hasil `GET /sectors` |
  | RO | kosongkan (biarkan default ke akun sendiri) |
  | Nomor Telepon | `081234567890` |
  | Email | `automation.test+<uid>@maju.co.id` |
  | Alamat | `Jl. Merdeka No. 10, Jakarta Pusat` |
  | Catatan | `Dibuat oleh automation test` |
- Steps:
  1. Isi semua field sesuai tabel data uji di atas menggunakan `cy.findByLabelText(...)`.
  2. Klik "Simpan Perusahaan".
- Expected Result:
  - UI: Alert sukses "Perusahaan berhasil ditambahkan" muncul; modal tertutup; baris baru muncul di tabel dengan nama yang sesuai.
  - API: `POST /companies` → 201 (atau 200), response body berisi `id`, `name`, `status` (catat nilai default status — ⚠️ verify against real backend apakah `prospek` atau lainnya), `roId` (harus sama dengan `currentUser.id` karena dikosongkan).
- Assertion checklist automation:
  - [ ] Toast/alert sukses tampil dan hilang otomatis atau bisa ditutup.
  - [ ] Baris baru untuk nama perusahaan tsb ada di tabel setelah refetch (`GET /companies` terpanggil ulang — react-query invalidate).
  - [ ] Data tersimpan sesuai input (spot check minimal name, email, phone, sector, companyType di detail/row).
  - [ ] `roId` pada response = id user yang login.

### TC-COMPANY-001-A04 — Admin berhasil menyimpan data perusahaan dengan hanya field wajib (field opsional kosong)
- Kategori: Positive
- Role: admin_zaper
- Data uji: NPWP, NPWZ, Tanggal Berdiri, RO, Catatan **dikosongkan semua**; field wajib (Nama Perusahaan, Tipe Perusahaan, Nama Pimpinan, PIC, Bidang Usaha, Telepon, Email, Alamat) diisi valid & unik.
- Steps:
  1. Buka form, isi hanya field wajib.
  2. Klik "Simpan Perusahaan".
- Expected Result:
  - UI: Sukses tersimpan tanpa error validasi meski field opsional kosong.
  - API: `POST /companies` → 201, `npwp`/`npwz`/`establishmentDate`/`roId`/`notes` bernilai null/empty di response.
- Assertion checklist automation:
  - [ ] Tidak ada pesan error validasi tampil untuk field opsional yang dikosongkan.
  - [ ] Perusahaan berhasil tersimpan dan muncul di list.

### TC-COMPANY-001-A05 — Admin mengubah status perusahaan dari Prospek ke Existing (Switch Status)
- Kategori: Positive
- Role: admin_zaper
- Precondition: Ada 1 perusahaan berstatus `Prospek` di list (hasil A03/A04, atau seed data).
- Steps:
  1. Cari baris perusahaan dengan status Prospek di tabel.
  2. Klik aksi "Switch Status" / toggle status pada baris tsb.
  3. Konfirmasi bila ada dialog konfirmasi.
- Expected Result:
  - UI: Alert sukses "Status diperbarui"; badge status baris berubah dari "Prospek" menjadi "Existing".
  - API: `PATCH /companies/:id/status` dengan body `{ status: 'existing' }` → 200.
- Assertion checklist automation:
  - [ ] Badge status berubah tanpa perlu manual refresh (react-query invalidate bekerja).
  - [ ] Filter status "Existing" pada toolbar menampilkan perusahaan ini setelah perubahan.

### TC-COMPANY-001-A06 — Data perusahaan Existing dan Prospek sama-sama tampil pada daftar
- Kategori: Positive
- Role: admin_zaper
- Precondition: Minimal 1 perusahaan `Existing` dan 1 `Prospek` ada di data (dari A03-A05).
- Steps:
  1. Buka List Perusahaan tanpa filter status.
- Expected Result:
  - Kedua perusahaan (Existing & Prospek) tampil di tabel yang sama.
  - Metrics card "Mitra Aktif" dan "Prospek Mitra" mencerminkan jumlah yang benar.
- Assertion checklist automation:
  - [ ] ⚠️ Catatan bug potensial: `stats.existing`/`stats.prospek` di `useCompaniesData.ts` dihitung dari **data halaman aktif saja** (`companies.filter(...)`), bukan total agregat dari API. Jika total data > 1 halaman, angka metrics BISA salah. Tambahkan test: buat >`perPage` data campuran status, pindah halaman, verifikasi apakah metrics card tetap konsisten dengan total sebenarnya atau menunjukkan bug ini.

---

## B. Field Validation — Negative Cases

Semua test di bagian ini: buka form create (A02), isi 1 field dengan nilai invalid sesuai tabel di bawah (field lain diisi valid), klik "Simpan Perusahaan", lalu assert pesan error yang sesuai muncul **dan** `POST /companies` **tidak terpanggil** (submit diblok di client sebelum request keluar, karena validasi zod client-side).

### TC-COMPANY-001-B01 — Nama Perusahaan kosong
- Data: `name = ''`
- Expected: Pesan error "Nama perusahaan wajib diisi" tampil di bawah field Nama Perusahaan.

### TC-COMPANY-001-B02 — Nama Perusahaan terlalu pendek (1 karakter)
- Data: `name = 'A'`
- Expected: Error validasi min-length tampil (pesan sama: "Nama perusahaan wajib diisi", karena zod `.min(2, ...)` pakai pesan yang sama untuk kasus kosong maupun kurang dari 2 karakter).

### TC-COMPANY-001-B03 — Nama Perusahaan melebihi 200 karakter
- Data: `name` = string 201 karakter.
- Expected: Submit diblok / error validasi max-length.

### TC-COMPANY-001-B04 — Tipe Perusahaan tidak dipilih
- Data: `companyType` dibiarkan pada default (`Umum` — karena default value form sudah `CompanyType.Umum`, field ini technically selalu terisi). **Test alternatif**: paksa via `cy.request`/manipulasi DOM untuk kirim value invalid (bukan `syariat`/`umum`) langsung ke API, cek respons backend.
- Expected: API menolak value enum yang tidak valid (⚠️ verify against real backend — kemungkinan 422).

### TC-COMPANY-001-B05 — Nama Pimpinan kosong
- Data: `leaderName = ''`
- Expected: Error "Nama pimpinan wajib diisi".

### TC-COMPANY-001-B06 — Nama Pimpinan 1 karakter
- Data: `leaderName = 'X'`
- Expected: Error "Nama pimpinan wajib diisi" (min 2).

### TC-COMPANY-001-B07 — Nama PIC kosong
- Data: `picName = ''`
- Expected: Error "Nama PIC wajib diisi".

### TC-COMPANY-001-B08 — Nama PIC melebihi 100 karakter
- Data: `picName` = 101 karakter.
- Expected: Submit diblok, error max-length.

### TC-COMPANY-001-B09 — Bidang Usaha tidak dipilih
- Data: `sector = ''` (dropdown dibiarkan pada placeholder "Pilih bidang usaha").
- Expected: Error "Bidang usaha wajib dipilih".

### TC-COMPANY-001-B10 — Alamat kosong
- Data: `address = ''`
- Expected: Error "Alamat wajib diisi" (custom render — cek elemen `<p class="text-red-500">` di bawah textarea alamat, BUKAN via prop `error` komponen `Input` karena field ini pakai `<textarea>` manual).

### TC-COMPANY-001-B11 — Alamat kurang dari 5 karakter
- Data: `address = 'Jl.'`
- Expected: Error "Alamat wajib diisi" (min 5).

### TC-COMPANY-001-B12 — Alamat melebihi 500 karakter
- Data: `address` = 501 karakter.
- Expected: Submit diblok, error max-length.

### TC-COMPANY-001-B13 — Nomor Telepon kosong
- Data: `phone = ''`
- Expected: Error "Nomor telepon tidak valid".

### TC-COMPANY-001-B14 — Nomor Telepon kurang dari 8 karakter
- Data: `phone = '12345'`
- Expected: Error "Nomor telepon tidak valid".

### TC-COMPANY-001-B15 — Nomor Telepon melebihi 20 karakter
- Data: `phone` = 21 digit angka.
- Expected: Submit diblok, error max-length.

### TC-COMPANY-001-B16 — Nomor Telepon berisi huruf/simbol non-digit (gap validasi)
- Data: `phone = 'abcdefgh'` (8 huruf, lolos length check tapi bukan angka).
- Expected: ⚠️ **Ekspektasi berdasarkan kode saat ini: LOLOS validasi client** karena zod schema hanya cek `min(8).max(20)` tanpa regex digit. Test ini harus ditulis untuk **mengonfirmasi gap ini secara eksplisit** — jika ternyata backend menolak (422), catat sebagai temuan; jika backend juga menerima, ini genuine data-quality bug yang perlu dilaporkan ke tim produk, bukan cuma test.

### TC-COMPANY-001-B17 — Email kosong
- Data: `email = ''`
- Expected: Error "Format email tidak valid".

### TC-COMPANY-001-B18 — Email format salah (tanpa @, tanpa domain, dsb)
- Data uji (parametrize / `it.each`): `'not-an-email'`, `'user@'`, `'@domain.com'`, `'user domain.com'`, `'user@@domain.com'`.
- Expected: Error "Format email tidak valid" untuk setiap kasus.

### TC-COMPANY-001-B19 — NPWP melebihi 20 karakter
- Data: `npwp` = 21 karakter.
- Expected: Submit diblok, error max-length (meski NPWP opsional, batas panjang tetap berlaku bila diisi).

### TC-COMPANY-001-B20 — NPWP format bebas (gap validasi — bukan format resmi NPWP)
- Data: `npwp = '12345'` (angka acak, bukan format `00.000.000.0-000.000`).
- Expected: ⚠️ **Lolos validasi client** (tidak ada regex format). Tulis test untuk mengonfirmasi gap ini, sama seperti B16.

### TC-COMPANY-001-B21 — NPWZ melebihi 50 karakter
- Data: `npwz` = 51 karakter.
- Expected: Submit diblok, error max-length.

### TC-COMPANY-001-B22 — Catatan melebihi 1000 karakter
- Data: `notes` = 1001 karakter.
- Expected: Submit diblok, error max-length.

### TC-COMPANY-001-B23 — Semua field wajib dikosongkan sekaligus
- Data: submit form kosong total (klik Simpan langsung tanpa isi apapun selain default `companyType=Umum`).
- Expected: Semua pesan error field wajib tampil bersamaan (name, leaderName, picName, sector, phone, email, address) — total 7 pesan error.
- Assertion checklist automation:
  - [ ] `POST /companies` **tidak pernah terpanggil** (intercept dan assert `cy.get('@createCompany').should('not.have.been.called')` atau setara).

---

## C. Enum & Dropdown Cases

### TC-COMPANY-001-C01 — Tipe Perusahaan: pilih Syariat
- Steps: pilih opsi "Syariat" pada dropdown Tipe Perusahaan, lengkapi field wajib lain, submit.
- Expected: Tersimpan dengan `companyType: 'syariat'`; badge/label di tabel/detail menampilkan tipe sesuai.

### TC-COMPANY-001-C02 — Tipe Perusahaan: pilih Umum (default)
- Steps: biarkan default (Umum), submit.
- Expected: Tersimpan dengan `companyType: 'umum'`.

### TC-COMPANY-001-C03 — Bidang Usaha memuat opsi dari API secara dinamis
- Steps: intercept `GET /sectors`, buka form, cek dropdown Bidang Usaha berisi opsi sesuai response intercept (bukan daftar hardcoded).
- Expected: Opsi dropdown = data dari API. Jika `GET /sectors` gagal/lambat, dropdown menampilkan placeholder "Memuat..." lalu disabled.
- Assertion checklist automation:
  - [ ] Uji skenario `GET /sectors` mengembalikan array kosong → dropdown tidak ada opsi, submit dengan sector kosong tetap divalidasi wajib.
  - [ ] Uji skenario `GET /sectors` gagal (500/network error) → alert error "Gagal memuat bidang usaha" tampil (lihat `alert.error` di `CompanyForm.tsx`).

### TC-COMPANY-001-C04 — RO dropdown dikosongkan → backend pakai akun pembuat sebagai RO
- Sudah dicakup di A03. Tambahan: assert hint text "Kosongkan untuk memakai akun Anda sebagai RO" tampil di UI.

### TC-COMPANY-001-C05 — RO dropdown dipilih eksplisit
- Steps: pilih salah satu RO dari dropdown (hasil `GET /users?role=ro&perPage=100`), submit.
- Expected: `roId` pada response = id RO yang dipilih (bukan akun admin yang login).

### TC-COMPANY-001-C06 — RO list kosong (tidak ada user dengan role RO)
- Steps: intercept `GET /users?role=ro...` return data kosong.
- Expected: Dropdown RO disabled, placeholder "Belum ada akun RO"; form tetap bisa disubmit (RO optional).

### TC-COMPANY-001-C07 — Filter status di List Perusahaan mencakup 4 nilai status
- Steps: buka dropdown/filter status di `CompaniesToolbar`.
- Expected: Opsi filter mencakup minimal: Prospek, Existing, Form (Klaim), Inactive (Tidak Aktif) — bukan cuma 2 opsi seperti skenario asli asumsikan.
- Assertion checklist automation:
  - [ ] Setiap opsi filter, saat dipilih, memanggil `GET /companies?status=<value>` dengan value enum yang benar (`prospek`/`existing`/`form`/`inactive`).

---

## D. Duplicate / Uniqueness

### TC-COMPANY-001-D01 — Membuat perusahaan dengan NPWP yang sudah terdaftar
- Kategori: Duplicate
- Precondition: Sudah ada 1 perusahaan tersimpan dengan NPWP tertentu (mis. dari A03).
- Steps: Buat perusahaan baru dengan NPWP identik, field lain berbeda & valid, submit.
- Expected: ⚠️ **Verify against real backend** — kemungkinan response `409 Conflict` atau `422` dengan `message` seperti "NPWP sudah terdaftar". Tidak ada validasi uniqueness di client, jadi ini murni tanggung jawab backend.
- Assertion checklist automation:
  - [ ] Alert error menampilkan `message` dari response backend apa adanya (`getApiErrorMessage`), bukan pesan generik — cek isi alert cocok dengan `error.response.data.message`.
  - [ ] Form TIDAK menutup modal dan data tidak duplikat di tabel setelah gagal.

### TC-COMPANY-001-D02 — Membuat perusahaan dengan NPWZ yang sudah terdaftar
- Sama seperti D01, tapi untuk field NPWZ. ⚠️ Verify against real backend.

### TC-COMPANY-001-D03 — Membuat perusahaan dengan Email yang sudah dipakai perusahaan lain
- Sama pola D01, untuk field Email perusahaan (bukan email login). ⚠️ Verify against real backend apakah email company unik atau boleh sama.

### TC-COMPANY-001-D04 — Membuat perusahaan dengan Nama Perusahaan identik (persis sama)
- ⚠️ Verify against real backend — kemungkinan diperbolehkan (nama bukan unique key) atau ditolak. Dokumentasikan hasil aktual sebagai baseline expected untuk automation.

---

## E. RBAC / Authorization

Untuk tiap test di bawah, uji **dua arah**: (1) UI — elemen aksi tersembunyi/disabled, (2) API — panggilan langsung ke endpoint tetap ditolak walau UI dibypass (mis. via `cy.request` dengan token role tsb).

### TC-COMPANY-001-E01 — Role `ro` tidak melihat tombol "+ Mitra Baru"
- Login sebagai RO → buka List Perusahaan → assert tombol "+ Mitra Baru" tidak ada di DOM (`canWrite = isAdmin` → false untuk RO).

### TC-COMPANY-001-E02 — Role `ro` mencoba create company via API langsung ditolak
- `cy.request({ method: 'POST', url: '/companies', headers: { Authorization: <RO token> }, body: {...valid payload...}, failOnStatusCode: false })`.
- Expected: 403 Forbidden. ⚠️ Verify against real backend — pastikan backend benar-benar menegakkan RBAC, bukan cuma UI.

### TC-COMPANY-001-E03 — Role `tim_layanan` tidak melihat tombol create/import/export/delete/switch-status
- Login sebagai Tim Layanan → assert semua tombol aksi tsb tidak ada/disabled; hanya bisa melihat list & detail (read-only).

### TC-COMPANY-001-E04 — Role `kepala_divisi` tidak melihat tombol create/import/export/delete/switch-status
- Sama seperti E03, untuk role Kepala Divisi.

### TC-COMPANY-001-E05 — Role `ro` dapat mengedit company miliknya sendiri
- Precondition: Company dengan `roId` = id user RO yang login.
- Steps: login sebagai RO tsb, buka detail/list, assert tombol Edit tampil dan berfungsi untuk company ini.
- Expected: Update berhasil (`PUT /companies/:id` → 200).

### TC-COMPANY-001-E06 — Role `ro` TIDAK dapat mengedit company milik RO lain
- Precondition: Company dengan `roId` ≠ id user RO yang login.
- Steps: login sebagai RO A, coba akses/edit company milik RO B (baik lewat UI — tombol Edit hidden, maupun `cy.request` PUT langsung ke endpoint).
- Expected: UI tombol Edit tidak tampil; API `PUT /companies/:id` → 403. ⚠️ Verify against real backend.

### TC-COMPANY-001-E07 — Role `admin_zaper` dapat mengedit/menghapus/switch-status company siapapun
- Baseline positive check untuk melengkapi matrix RBAC — admin tidak dibatasi `roId`.

### TC-COMPANY-001-E08 — User belum login (unauthenticated) diarahkan ke /login saat akses /companies
- Steps: clear cookies/token, `cy.visit('/companies')` langsung.
- Expected: Redirect ke `/login` (middleware guard berbasis cookie `baznas_token`).

### TC-COMPANY-001-E09 — Token kadaluarsa/invalid saat sedang di halaman Companies
- Steps: set token invalid/expired, trigger API call (mis. reload atau submit form).
- Expected: Axios interceptor 401 → force logout, redirect ke `/login`.

---

## F. Security (SQL Injection & XSS) — sesuai checklist QT1-6 & QT3-5/6

Payload berikut diinput ke **setiap field teks** (Nama Perusahaan, Nama Pimpinan, PIC, Alamat, Catatan, dan Email sebagai kasus khusus karena formatnya berbeda). Field lain diisi valid.

**Payload SQL Injection:**
```
' OR '1'='1
'; DROP TABLE companies; --
1; SELECT * FROM users
' UNION SELECT password FROM users --
```

**Payload XSS:**
```
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
javascript:alert(1)
<svg onload=alert(1)>
```

### TC-COMPANY-001-F01 — SQLi payload di field Nama Perusahaan
- Expected: Jika payload melebihi batas panjang/format wajar dan tetap sesuai `min/max` zod, submit **client-side akan lolos** (zod tidak filter isi string, hanya panjang). Maka assert di level **API**: `POST /companies` dengan payload ini → backend harus menyimpan sebagai string literal (escaped) TANPA mengeksekusi query berbahaya, dan idealnya menolak dengan 400 jika ada WAF/sanitasi. ⚠️ Verify against real backend — dokumentasikan hasil aktual (400 reject vs 201 accept-as-literal-string keduanya bisa dianggap aman, yang TIDAK aman adalah bila menyebabkan server error 500 atau data corruption).

### TC-COMPANY-001-F02 — SQLi payload di field Email
- Sesuai pola `validation.test.ts` yang sudah ada di repo — payload SQLi di posisi email otomatis gagal validasi format email (`z.string().email()`), jadi ini **tertangkap di client**. Expected: error "Format email tidak valid" tampil, `POST /companies` tidak terpanggil.

### TC-COMPANY-001-F03 — XSS payload di field Alamat/Catatan
- Expected: Payload tersimpan sebagai teks biasa; saat ditampilkan kembali di tabel/detail, **tidak ter-render sebagai HTML/script aktif** (React escaping default seharusnya aman) — assert tidak ada `alert()` ter-trigger dan tidak ada elemen `<script>`/`<img onerror>` benar-benar tereksekusi di DOM (cek via `cy.on('window:alert')` harus TIDAK terpanggil).

### TC-COMPANY-001-F04 — XSS payload di field Email
- Sama seperti F02 — payload XSS berbentuk email invalid otomatis tertangkap oleh validasi format email di client.

### TC-COMPANY-001-F05 — Oversized/injection-length payload (buffer guard)
- Data: payload SQLi/XSS di-repeat puluhan kali hingga > 200 karakter, dimasukkan ke field Nama Perusahaan.
- Expected: Tertolak oleh validasi `max(200)` di client — error max-length tampil, bukan error SQLi spesifik (mengonfirmasi pola yang sudah ada di `src/__tests__/validation.test.ts`).

### TC-COMPANY-001-F06 — Path traversal / command injection-shaped string di Catatan
- Data: `../../../etc/passwd`, `$(rm -rf /)`, `` `whoami` ``.
- Expected: Diterima sebagai teks biasa (field bebas, max 1000), tidak menyebabkan error server; pastikan saat ditampilkan ulang tidak dieksekusi sebagai command apapun (ini murni string di DB/UI).

---

## G. Non-Functional Quick Checks

### TC-COMPANY-001-G01 — Response time `POST /companies` ≤ 3 detik (QT3-1)
- Steps: ukur waktu response `POST /companies` pada skenario A03 menggunakan `cy.request` timing atau `cy.intercept` dengan pencatatan waktu.
- Expected: < 3000ms.

### TC-COMPANY-001-G02 — Response time `GET /companies` (list, termasuk saat data besar) ≤ 3 detik
- Precondition: Idealnya dataset besar (bisa manfaatkan `public/templates/test_import_2000_perusahaan.xlsx` sebagai referensi skala data, meski test ini fokus ke GET, bukan import).
- Expected: < 3000ms.

### TC-COMPANY-001-G03 — Setiap pemanggilan API menghasilkan callback yang jelas, tidak `null`/hang (QT3-7)
- Expected: Baik sukses maupun gagal, response selalu punya body terstruktur (bukan response kosong/`null`) dan UI selalu keluar dari state loading (tidak stuck spinner).

### TC-COMPANY-001-G04 — Smoke check: halaman Companies dapat diakses dan tabel/grafik metrics tampil (QT6-1/6-4)
- Expected: `GET /companies` → 200; metrics cards menampilkan angka (bukan error/blank).

---

## 7. Ringkasan cakupan (cross-check terhadap field & role)

| Field wajib | Test case negative |
|---|---|
| name | B01, B02, B03 |
| companyType | B04 |
| leaderName | B05, B06 |
| picName | B07, B08 |
| sector | B09 |
| address | B10, B11, B12 |
| phone | B13, B14, B15, B16 |
| email | B17, B18 |

| Field opsional | Test case terkait |
|---|---|
| npwp | B19, B20 |
| npwz | B21 |
| establishmentDate | (tidak ada validasi — cukup dicakup di A03/A04 sebagai smoke) |
| roId | C04, C05, C06 |
| notes | B22 |

| Role | Test case RBAC |
|---|---|
| admin_zaper | A01-A06, E07 |
| ro | E01, E02, E05, E06 |
| tim_layanan | E03 |
| kepala_divisi | E04 |
| unauthenticated | E08, E09 |

| CompanyStatus | Dicakup di |
|---|---|
| Prospek | A05 (before), C07 |
| Existing | A05 (after), A06, C07 |
| Form | C07 (filter only — belum ada alur transisi ke status ini yang ditemukan di kode, catat sebagai area yang perlu klarifikasi produk) |
| Inactive | C07 (filter only — sama seperti Form) |

**Total test case: 6 (A) + 23 (B) + 7 (C) + 4 (D) + 9 (E) + 6 (F) + 4 (G) = 59 test case.**
