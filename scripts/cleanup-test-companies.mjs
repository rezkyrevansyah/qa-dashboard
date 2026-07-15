// cleanup-test-companies.mjs
//
// Menghapus data perusahaan sisa hasil run cypress/e2e/aplikasi-zapper/companies.cy.ts
// (semua nama diawali "PT Automation Test ...") dari backend sandbox, lewat endpoint
// delete yang sama persis dengan tombol "Hapus Data" di aplikasi-zaper
// (DELETE /companies/:id — lihat src/services/companies.service.ts).
//
// Default: DRY RUN — cuma menampilkan daftar yang akan dihapus, tidak menghapus apa pun.
// Tambahkan --yes untuk benar-benar menghapus.
//
// Usage:
//   node scripts/cleanup-test-companies.mjs            # dry run (lihat daftar saja)
//   node scripts/cleanup-test-companies.mjs --yes       # benar-benar menghapus

const API_BASE = 'https://service-zaper-53046748745.asia-southeast2.run.app/api/v1'
const ADMIN_CREDS = { email: 'admin@baznas.go.id', password: 'Admin@12345' }
const NAME_PREFIX = 'PT Automation Test'
const PER_PAGE = 100

const DRY_RUN = !process.argv.includes('--yes')

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDS),
  })
  if (!res.ok) throw new Error(`Login gagal: ${res.status} ${await res.text()}`)
  const body = await res.json()
  const token = body?.data?.access_token
  if (!token) throw new Error('Login berhasil tapi access_token tidak ditemukan di response')
  return token
}

async function findMatchingCompanies(token) {
  const matches = []
  let page = 1
  for (;;) {
    const url = `${API_BASE}/companies?keyword=${encodeURIComponent(NAME_PREFIX)}&page=${page}&perPage=${PER_PAGE}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`GET /companies gagal (page ${page}): ${res.status} ${await res.text()}`)
    const body = await res.json()
    const data = body?.data ?? []
    if (data.length === 0) break

    for (const c of data) {
      if (typeof c.name === 'string' && c.name.startsWith(NAME_PREFIX)) {
        matches.push({ id: c.id, name: c.name, status: c.status })
      }
    }

    if (data.length < PER_PAGE) break
    page += 1
  }
  return matches
}

async function deleteCompany(token, id) {
  const res = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return { ok: res.ok, status: res.status, body: res.ok ? null : await res.text().catch(() => '') }
}

async function main() {
  console.log(`[cleanup] Mode: ${DRY_RUN ? 'DRY RUN (tidak menghapus apa pun)' : 'DELETE SUNGGUHAN'}`)
  console.log(`[cleanup] Login sebagai ${ADMIN_CREDS.email} ...`)
  const token = await login()

  console.log(`[cleanup] Mencari perusahaan dengan nama berawalan "${NAME_PREFIX}" ...`)
  const matches = await findMatchingCompanies(token)
  console.log(`[cleanup] Ditemukan ${matches.length} data.`)

  if (matches.length === 0) {
    console.log('[cleanup] Tidak ada yang perlu dihapus.')
    return
  }

  matches.forEach((c) => console.log(`  - #${c.id} ${c.name} (status: ${c.status})`))

  if (DRY_RUN) {
    console.log('\n[cleanup] Ini baru DRY RUN. Jalankan ulang dengan --yes untuk benar-benar menghapus:')
    console.log('  node scripts/cleanup-test-companies.mjs --yes')
    return
  }

  console.log('\n[cleanup] Menghapus...')
  let success = 0
  let failed = 0
  for (const c of matches) {
    const result = await deleteCompany(token, c.id)
    if (result.ok) {
      success += 1
      console.log(`  ✓ #${c.id} ${c.name}`)
    } else {
      failed += 1
      console.error(`  ✗ #${c.id} ${c.name} → ${result.status} ${result.body}`)
    }
  }

  console.log(`\n[cleanup] Selesai: ${success} terhapus, ${failed} gagal (dari ${matches.length} total).`)
}

main().catch((err) => {
  console.error('[cleanup] FATAL:', err.message)
  process.exit(1)
})
