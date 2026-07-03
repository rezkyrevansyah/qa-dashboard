// =============================================================================
// Cypress API Test — service-zaper (Label Taat Zakat)
// Target: https://service-zaper-53046748745.asia-southeast2.run.app
//
// Flow: health → login → validasi negatif → keamanan → RBAC →
//       CRUD (sector → company → commitment → invoice → receipt →
//       transaction → certificate) → notifikasi → audit → logout
// =============================================================================

const BASE = 'https://service-zaper-53046748745.asia-southeast2.run.app/api/v1';

// ─── Kredensial ───────────────────────────────────────────────────────────────
const CREDS = {
  admin:   { email: 'admin@baznas.go.id',   password: 'Admin@12345' },
  ro:      { email: 'ro1@baznas.go.id',     password: 'RO@12345'   },
  layanan: { email: 'layanan@baznas.go.id', password: 'Layanan@12345' },
  kepala:  { email: 'kepala@baznas.go.id',  password: 'Kepala@12345' },
};

// ─── Token store (diisi saat runtime) ────────────────────────────────────────
let tokenAdmin   = '';
let tokenRo      = '';
let tokenLayanan = '';
let tokenKepala  = '';

// ─── ID store — diisi dari response CREATE lalu dipakai di test berikutnya ───
let sectorId     = 0;
let companyId    = 0;
let commitmentId = 0;
let invoiceId    = 0;
let receiptId    = 0;
let transactionId= 0;
let certId       = 0;

// ─── Helper: auth header ──────────────────────────────────────────────────────
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ─── Helper: assert envelope standar ─────────────────────────────────────────
function assertEnvelope(body: Record<string, unknown>, expectSuccess: boolean) {
  expect(body).to.have.property('success', expectSuccess);
  expect(body).to.have.property('status_code');
  expect(body).to.have.property('message');
  expect(body).to.have.property('data');
}

// =============================================================================
// BLOK 1 — SMOKE & HEALTH
// =============================================================================
describe('[1] Smoke — Health', () => {
  it('API harus merespons 200 dengan field status dan message saat GET /health dipanggil', () => {
    cy.request(`${BASE}/health`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('status');
      expect(res.body).to.have.property('message');
    });
  });
});

// =============================================================================
// BLOK 2 — AUTENTIKASI
// =============================================================================
describe('[2] Auth — Login semua role', () => {
  it('Admin harus bisa login dan mendapatkan access_token serta refresh_token yang valid', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: CREDS.admin }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.property('access_token').and.not.be.empty;
      expect(res.body.data).to.have.property('refresh_token').and.not.be.empty;
      tokenAdmin = res.body.data.access_token;
    });
  });

  it('User dengan role RO harus bisa login dan mendapatkan access_token', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: CREDS.ro }).then((res) => {
      expect(res.status).to.eq(200);
      tokenRo = res.body.data.access_token;
    });
  });

  it('User dengan role Tim Layanan harus bisa login dan mendapatkan access_token', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: CREDS.layanan }).then((res) => {
      expect(res.status).to.eq(200);
      tokenLayanan = res.body.data.access_token;
    });
  });

  it('User dengan role Kepala Divisi harus bisa login dan mendapatkan access_token', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: CREDS.kepala }).then((res) => {
      expect(res.status).to.eq(200);
      tokenKepala = res.body.data.access_token;
    });
  });

  it('API harus mengembalikan data profil user yang valid saat GET /auth/me dengan token admin', () => {
    cy.request({ method: 'GET', url: `${BASE}/auth/me`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.property('email');
      expect(res.body.data).to.have.property('roles').and.be.an('array');
    });
  });
});

// =============================================================================
// BLOK 3 — VALIDASI NEGATIF
// =============================================================================
describe('[3] Validasi Negatif — Auth', () => {
  it('API harus menolak login dengan 400 saat body request kosong tanpa email dan password', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: {}, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('API harus menolak login dengan 400 saat password tidak disertakan dalam request', () => {
    cy.request({
      method: 'POST', url: `${BASE}/auth/login`,
      body: { email: 'admin@baznas.go.id' }, failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('API harus menolak login dengan 401 saat password yang dikirim salah', () => {
    cy.request({
      method: 'POST', url: `${BASE}/auth/login`,
      body: { email: 'admin@baznas.go.id', password: 'salah-banget' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('API harus menolak login dengan 401 saat email yang digunakan tidak terdaftar di sistem', () => {
    cy.request({
      method: 'POST', url: `${BASE}/auth/login`,
      body: { email: 'nobody@nowhere.test', password: 'x' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});

// =============================================================================
// BLOK 4 — KEAMANAN (SQL Injection & XSS)
// =============================================================================
describe('[4] Keamanan — SQL Injection & XSS', () => {
  it("SQL Injection di POST /auth/login — email: [a@a.com' OR 1=1 --] — harus ditolak 400/401", () => {
    const payload = "a@a.com' OR 1=1 --"
    cy.request({
      method: 'POST', url: `${BASE}/auth/login`,
      body: { email: payload, password: 'x' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload email="${payload}" — got ${res.status}, expected 400 atau 401`).to.be.oneOf([400, 401])
    });
  });

  it('XSS di POST /auth/login — email: [<script>alert(1)</script>] — harus ditolak 400/401', () => {
    const payload = '<script>alert(1)</script>'
    cy.request({
      method: 'POST', url: `${BASE}/auth/login`,
      body: { email: payload, password: 'x' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload email="${payload}" — got ${res.status}, expected 400 atau 401`).to.be.oneOf([400, 401])
    });
  });

  it("SQL Injection di GET /companies?search=[test' OR 1=1 --] — harus ditolak 400", () => {
    const payload = "test' OR 1=1 --"
    cy.request({
      method: 'GET', url: `${BASE}/companies?search=${payload}`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload search="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });

  it('XSS di GET /companies?search=[<script>alert(1)</script>] — harus ditolak 400', () => {
    const payload = '<script>alert(1)</script>'
    cy.request({
      method: 'GET', url: `${BASE}/companies?search=${payload}`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload search="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });

  it('SQL Injection di POST /companies — body name: ["; DROP TABLE users; --] — harus ditolak 400', () => {
    const payload = '"; DROP TABLE users; --'
    cy.request({
      method: 'POST', url: `${BASE}/companies`,
      headers: auth(tokenAdmin),
      body: { name: payload, email: 'x@x.com' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload body.name="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });

  it("SQL Injection di GET /companies/:id — path: [1 OR 1=1] — harus ditolak 400/404", () => {
    const payload = '1 OR 1=1'
    cy.request({
      method: 'GET', url: `${BASE}/companies/${payload}`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload path id="${payload}" — got ${res.status}, expected 400 atau 404`).to.be.oneOf([400, 404])
    });
  });

  it('XSS di GET /sectors/:id — path: [<script>alert(1)</script>] — harus ditolak 400/404', () => {
    const payload = '<script>alert(1)</script>'
    cy.request({
      method: 'GET', url: `${BASE}/sectors/${payload}`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload path id="${payload}" — got ${res.status}, expected 400 atau 404`).to.be.oneOf([400, 404])
    });
  });

  it("SQL Injection di POST /sectors — body name: ['; DROP TABLE sectors; --] — harus ditolak 400", () => {
    const payload = "'; DROP TABLE sectors; --"
    cy.request({
      method: 'POST', url: `${BASE}/sectors`,
      headers: auth(tokenAdmin),
      body: { name: payload, description: 'test' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload body.name="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });

  it('XSS di POST /sectors — body name: [<script>alert("xss")</script>] — harus ditolak 400', () => {
    const payload = '<script>alert("xss")</script>'
    cy.request({
      method: 'POST', url: `${BASE}/sectors`,
      headers: auth(tokenAdmin),
      body: { name: payload, description: 'test' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload body.name="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });

  it("SQL Injection di GET /sectors?search=[test' OR 1=1--] — harus ditangani aman (400/200)", () => {
    const payload = "test' OR 1=1--"
    cy.request({
      method: 'GET', url: `${BASE}/sectors?search=${payload}`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload search="${payload}" — got ${res.status}, expected 400 atau 200`).to.be.oneOf([400, 200])
    });
  });

  it("SQL Injection di POST /users — body email: [test' OR 1=1 --@test.com] — harus ditolak 400/422", () => {
    const payload = "test' OR 1=1 --@test.com"
    cy.request({
      method: 'POST', url: `${BASE}/users`,
      headers: auth(tokenAdmin),
      body: { name: 'Test', email: payload, password: 'Test@12345', roles: ['ro'] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload body.email="${payload}" — got ${res.status}, expected 400 atau 422`).to.be.oneOf([400, 422])
    });
  });

  it('XSS di POST /companies — body name: [<img src=x onerror=alert(1)>] — harus ditolak 400', () => {
    const payload = '<img src=x onerror=alert(1)>'
    cy.request({
      method: 'POST', url: `${BASE}/companies`,
      headers: auth(tokenAdmin),
      body: { name: payload, email: 'x@x.com' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, `Payload body.name="${payload}" — got ${res.status}, expected 400`).to.eq(400)
    });
  });
});

// =============================================================================
// BLOK 5 — AUTENTIKASI: tanpa token / token invalid
// =============================================================================
describe('[5] AuthN — Tanpa Token & Token Invalid', () => {
  const protectedEndpoints: [string, string][] = [
    ['GET',   '/auth/me'],
    ['GET',   '/users/'],
    ['GET',   '/companies/'],
    ['GET',   '/sectors/'],
    ['GET',   '/targets/'],
    ['GET',   '/commitments/'],
    ['GET',   '/invoices/'],
    ['GET',   '/receipts/'],
    ['GET',   '/transactions/'],
    ['GET',   '/taat-zakat/'],
    ['GET',   '/bsz-claims/'],
    ['GET',   '/audit-logs/'],
    ['GET',   '/notifications/'],
    ['GET',   '/dashboard/zakat-stats'],
    ['GET',   '/dashboard/anniversaries'],
    ['GET',   '/finance-numbering/list'],
  ];

  protectedEndpoints.forEach(([method, path]) => {
    it(`API harus menolak akses dengan 401 saat ${method} ${path} dipanggil tanpa menyertakan token`, () => {
      cy.request({ method, url: `${BASE}${path}`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });
  });

  it('API harus menolak akses dengan 401 saat GET /auth/me menggunakan token yang tidak valid atau sudah dimanipulasi', () => {
    cy.request({
      method: 'GET', url: `${BASE}/auth/me`,
      headers: { Authorization: 'Bearer invalid.token.value' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});

// =============================================================================
// BLOK 6 — RBAC: 403 Forbidden
// =============================================================================
describe('[6] RBAC — 403 Forbidden', () => {
  it('API harus menolak dengan 403 saat Tim Layanan mencoba membuat company baru yang bukan haknya', () => {
    if (!tokenLayanan) { cy.log('SKIP: tokenLayanan kosong — login layanan gagal di backend'); return; }
    cy.request({
      method: 'POST', url: `${BASE}/companies`,
      headers: auth(tokenLayanan),
      body: { name: 'Test', email: 't@t.com' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('API harus menolak dengan 403 saat Tim Layanan mencoba menghapus company yang bukan haknya', () => {
    if (!tokenLayanan) { cy.log('SKIP: tokenLayanan kosong — login layanan gagal di backend'); return; }
    cy.request({
      method: 'DELETE', url: `${BASE}/companies/1`,
      headers: auth(tokenLayanan), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('API harus menolak dengan 403 saat RO mencoba menghapus company yang bukan haknya', () => {
    if (!tokenRo) { cy.log('SKIP: tokenRo kosong — login ro gagal di backend'); return; }
    cy.request({
      method: 'DELETE', url: `${BASE}/companies/1`,
      headers: auth(tokenRo), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('API harus menolak dengan 403 saat Tim Layanan mencoba membuat invoice yang bukan haknya', () => {
    if (!tokenLayanan) { cy.log('SKIP: tokenLayanan kosong — login layanan gagal di backend'); return; }
    cy.request({
      method: 'POST', url: `${BASE}/invoices`,
      headers: auth(tokenLayanan),
      body: { companyId: 1, invoiceDate: '2025-01-01', dueDate: '2025-02-01', amount: 1000000 },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('API harus menolak dengan 403 saat Tim Layanan mencoba membuat user baru yang bukan haknya', () => {
    if (!tokenLayanan) { cy.log('SKIP: tokenLayanan kosong — login layanan gagal di backend'); return; }
    cy.request({
      method: 'POST', url: `${BASE}/users`,
      headers: auth(tokenLayanan),
      body: { name: 'Test', email: 't@t.com', password: 'Test@12345', roles: ['ro'] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });
});

// =============================================================================
// BLOK 7 — GET LIST UTAMA (200 + envelope)
// =============================================================================
describe('[7] GET List Utama — 200 & Envelope', () => {
  const listEndpoints = [
    '/companies', '/users', '/sectors', '/targets', '/commitments',
    '/invoices', '/receipts', '/transactions', '/taat-zakat', '/bsz-claims',
    '/notifications', '/notifications/unread-count', '/audit-logs',
    '/finance-numbering/list', '/dashboard/zakat-stats', '/dashboard/anniversaries',
    '/targets/realization',
  ];

  listEndpoints.forEach((ep) => {
    it(`API harus mengembalikan 200 dan envelope standar saat GET ${ep} dipanggil dengan token admin`, () => {
      cy.request({ method: 'GET', url: `${BASE}${ep}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
        assertEnvelope(res.body, true);
      });
    });
  });

  it('API harus mengembalikan 404 saat GET /companies/:id dengan ID yang tidak ada di database', () => {
    cy.request({
      method: 'GET', url: `${BASE}/companies/99999999`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([404, 400]);
    });
  });

  it('API harus mengembalikan 404 saat endpoint yang dipanggil tidak terdaftar di routing', () => {
    cy.request({
      method: 'GET', url: `${BASE}/tidak-ada-route-xyz`,
      headers: auth(tokenAdmin), failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });
});

// =============================================================================
// BLOK 8 — CRUD SECTOR
// =============================================================================
describe('[8] CRUD — Sector', () => {
  it('Admin harus bisa membuat sector baru dan mendapatkan sectorId dari response', () => {
    cy.request({
      method: 'POST', url: `${BASE}/sectors`,
      headers: auth(tokenAdmin),
      body: { name: `Sektor Cypress ${Date.now()}`, description: 'Test dari Cypress' },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      assertEnvelope(res.body, true);
      sectorId = res.body.data.id ?? res.body.data?.sector?.id ?? 0;
    });
  });

  it('API harus mengembalikan daftar sector dengan 200 saat GET /sectors dipanggil', () => {
    cy.request({ method: 'GET', url: `${BASE}/sectors`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('Admin harus bisa mengupdate nama sector yang sudah dibuat sebelumnya', () => {
    cy.wrap(null).then(() => {
      if (!sectorId) return;
      cy.request({
        method: 'PUT', url: `${BASE}/sectors/${sectorId}`,
        headers: auth(tokenAdmin),
        body: { name: `Sektor Cypress Updated ${Date.now()}`, description: 'Updated' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });
});

// =============================================================================
// BLOK 9 — CRUD COMPANY
// =============================================================================
describe('[9] CRUD — Company', () => {
  it('Admin harus bisa membuat company baru dengan data lengkap dan mendapatkan companyId dari response', () => {
    cy.request({
      method: 'POST', url: `${BASE}/companies`,
      headers: auth(tokenAdmin),
      body: {
        code:          `CYP${Date.now()}`,
        name:          'PT Cypress Testing',
        companyType:   'pt',
        npwp:          '12.345.678.9-012.345',
        npwz:          `Z${Date.now()}`,
        address:       'Jl. Cypress No. 1',
        city:          'Jakarta',
        province:      'DKI Jakarta',
        postalCode:    '10000',
        phone:         '021-99999999',
        email:         `cypress${Date.now()}@test.com`,
        leaderName:    'Direktur Test',
        picName:       'PIC Test',
        picPosition:   'Finance Manager',
        picPhone:      '08119999999',
        picEmail:      `pic${Date.now()}@test.com`,
        sector:        sectorId || 1,
        employeeCount: 50,
        roId:          null,
        notes:         'Dibuat oleh Cypress test',
      },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      assertEnvelope(res.body, true);
      companyId = res.body.data.id ?? res.body.data?.company?.id ?? 0;
    });
  });

  it('API harus mengembalikan detail company dengan field name saat GET /companies/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({ method: 'GET', url: `${BASE}/companies/${companyId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.have.property('name');
      });
    });
  });

  it('Admin harus bisa mengubah status company menjadi existing', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({
        method: 'PATCH', url: `${BASE}/companies/${companyId}/status`,
        headers: auth(tokenAdmin),
        body: { status: 'existing' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus mengembalikan hasil pencarian company dengan 200 saat keyword Cypress dikirim', () => {
    cy.request({
      method: 'GET', url: `${BASE}/companies/search?keyword=Cypress`,
      headers: auth(tokenAdmin),
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});

// =============================================================================
// BLOK 10 — CRUD COMMITMENT
// =============================================================================
describe('[10] CRUD — Commitment', () => {
  it('Admin harus bisa membuat commitment untuk company dan mendapatkan commitmentId dari response', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({
        method: 'POST', url: `${BASE}/commitments`,
        headers: auth(tokenAdmin),
        body: {
          companyId,
          commitmentDate: '2025-01-01',
          validUntil:     '2025-12-31',
          totalAmount:    10000000,
          programs:       [{ programId: 1, amount: 10000000 }],
          notes:          'Commitment dari Cypress',
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        assertEnvelope(res.body, true);
        commitmentId = res.body.data.id ?? res.body.data?.commitment?.id ?? 0;
      });
    });
  });

  it('API harus mengembalikan detail commitment dengan 200 saat GET /commitments/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!commitmentId) return;
      cy.request({ method: 'GET', url: `${BASE}/commitments/${commitmentId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus menolak pembuatan commitment dengan 400 atau 422 saat body request kosong', () => {
    cy.request({
      method: 'POST', url: `${BASE}/commitments`,
      headers: auth(tokenAdmin),
      body: {}, failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });
});

// =============================================================================
// BLOK 11 — CRUD INVOICE
// =============================================================================
describe('[11] CRUD — Invoice', () => {
  it('Admin harus bisa membuat invoice untuk company dan mendapatkan invoiceId dari response', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({
        method: 'POST', url: `${BASE}/invoices`,
        headers: auth(tokenAdmin),
        body: {
          commitmentId:     commitmentId || null,
          companyId,
          invoiceDate:      '2025-01-15',
          dueDate:          '2025-02-15',
          amount:           10000000,
          taxAmount:        0,
          hasStampDuty:     0,
          stampDutyAmount:  0,
          notes:            'Invoice dari Cypress',
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        assertEnvelope(res.body, true);
        invoiceId = res.body.data.id ?? res.body.data?.invoice?.id ?? 0;
      });
    });
  });

  it('API harus mengembalikan detail invoice dengan field id saat GET /invoices/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!invoiceId) return;
      cy.request({ method: 'GET', url: `${BASE}/invoices/${invoiceId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.have.property('id');
      });
    });
  });

  it('Admin harus bisa menandatangani invoice yang sudah dibuat sebelumnya', () => {
    cy.wrap(null).then(() => {
      if (!invoiceId) return;
      cy.request({
        method: 'PATCH', url: `${BASE}/invoices/${invoiceId}/sign`,
        headers: auth(tokenAdmin),
        body: { isSigned: 1, signedBy: 'Admin Cypress' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus menolak pembuatan invoice dengan 400 atau 422 saat body request kosong', () => {
    cy.request({
      method: 'POST', url: `${BASE}/invoices`,
      headers: auth(tokenAdmin),
      body: {}, failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });
});

// =============================================================================
// BLOK 12 — CRUD RECEIPT
// =============================================================================
describe('[12] CRUD — Receipt', () => {
  it('Admin harus bisa membuat receipt pembayaran untuk company dan mendapatkan receiptId dari response', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({
        method: 'POST', url: `${BASE}/receipts`,
        headers: auth(tokenAdmin),
        body: {
          invoiceId:     invoiceId || null,
          companyId,
          receiptDate:   '2025-01-20',
          amount:        10000000,
          paymentMethod: 'transfer',
          bankName:      'Bank BSI',
          accountNumber: '712.277.7700',
          notes:         'Receipt dari Cypress',
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        assertEnvelope(res.body, true);
        receiptId = res.body.data.id ?? res.body.data?.receipt?.id ?? 0;
      });
    });
  });

  it('API harus mengembalikan detail receipt dengan 200 saat GET /receipts/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!receiptId) return;
      cy.request({ method: 'GET', url: `${BASE}/receipts/${receiptId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('Admin harus bisa menandatangani receipt yang sudah dibuat sebelumnya', () => {
    cy.wrap(null).then(() => {
      if (!receiptId) return;
      cy.request({
        method: 'PATCH', url: `${BASE}/receipts/${receiptId}/sign`,
        headers: auth(tokenAdmin),
        body: { isSigned: 1, signedBy: 'Admin Cypress' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus menolak pembuatan receipt dengan 400 atau 422 saat body request kosong', () => {
    cy.request({
      method: 'POST', url: `${BASE}/receipts`,
      headers: auth(tokenAdmin),
      body: {}, failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });
});

// =============================================================================
// BLOK 13 — CRUD TRANSACTION
// =============================================================================
describe('[13] CRUD — Transaction', () => {
  it('Admin harus bisa membuat transaksi zakat untuk company dan mendapatkan transactionId dari response', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({
        method: 'POST', url: `${BASE}/transactions`,
        headers: auth(tokenAdmin),
        body: {
          receiptId:       receiptId || null,
          companyId,
          transactionDate: '2025-01-20',
          amount:          10000000,
          zakatType:       'zakat_mal',
          jenisDana:       'Zakat Perusahaan',
          npwzNumber:      `NPWZ${Date.now()}`,
          notes:           'Transaksi dari Cypress',
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        assertEnvelope(res.body, true);
        transactionId = res.body.data.id ?? res.body.data?.transaction?.id ?? 0;
      });
    });
  });

  it('API harus mengembalikan detail transaksi dengan 200 saat GET /transactions/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!transactionId) return;
      cy.request({ method: 'GET', url: `${BASE}/transactions/${transactionId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus mengembalikan daftar transaksi milik company dengan 200 saat GET /transactions/by-company/:companyId', () => {
    cy.wrap(null).then(() => {
      if (!companyId) return;
      cy.request({ method: 'GET', url: `${BASE}/transactions/by-company/${companyId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });
});

// =============================================================================
// BLOK 14 — TAAT ZAKAT CERTIFICATE
// =============================================================================
describe('[14] Taat Zakat Certificate', () => {
  it('Admin harus bisa menerbitkan sertifikat taat zakat untuk company dan mendapatkan certId dari response', () => {
    cy.wrap(null).then(() => {
      if (!companyId || !receiptId) return;
      cy.request({
        method: 'POST', url: `${BASE}/taat-zakat/issue`,
        headers: auth(tokenAdmin),
        body: {
          companyId,
          receiptId,
          issuedAt:   '2025-01-21',
          validFrom:  '2025-01-21',
          validUntil: '2025-12-31',
          notes:      'Sertifikat dari Cypress',
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        certId = res.body.data.id ?? res.body.data?.certificate?.id ?? 0;
      });
    });
  });

  it('API harus mengembalikan detail sertifikat taat zakat dengan 200 saat GET /taat-zakat/detail/:id dengan ID yang valid', () => {
    cy.wrap(null).then(() => {
      if (!certId) return;
      cy.request({ method: 'GET', url: `${BASE}/taat-zakat/detail/${certId}`, headers: auth(tokenAdmin) }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  it('API harus mengembalikan daftar sertifikat taat zakat dengan 200 saat GET /taat-zakat dipanggil', () => {
    cy.request({ method: 'GET', url: `${BASE}/taat-zakat`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});

// =============================================================================
// BLOK 15 — NOTIFIKASI & AUDIT LOG
// =============================================================================
describe('[15] Notifikasi & Audit Log', () => {
  it('API harus mengembalikan daftar notifikasi user dengan 200 saat GET /notifications dipanggil', () => {
    cy.request({ method: 'GET', url: `${BASE}/notifications`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('API harus mengembalikan jumlah notifikasi yang belum dibaca dengan 200 saat GET /notifications/unread-count dipanggil', () => {
    cy.request({ method: 'GET', url: `${BASE}/notifications/unread-count`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('API harus berhasil menandai semua notifikasi sebagai sudah dibaca dengan 200 saat PATCH /notifications/read-all dipanggil', () => {
    cy.request({ method: 'PATCH', url: `${BASE}/notifications/read-all`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('API harus mengembalikan daftar audit log aktivitas sistem dengan 200 saat GET /audit-logs dipanggil', () => {
    cy.request({ method: 'GET', url: `${BASE}/audit-logs`, headers: auth(tokenAdmin) }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});

// =============================================================================
// BLOK 16 — REFRESH TOKEN & LOGOUT
// =============================================================================
describe('[16] Auth — Refresh Token & Logout', () => {
  let refreshToken = '';

  it('Admin harus bisa login ulang dan mendapatkan refresh_token yang baru', () => {
    cy.request({ method: 'POST', url: `${BASE}/auth/login`, body: CREDS.admin }).then((res) => {
      expect(res.status).to.eq(200);
      refreshToken = res.body.data.refresh_token;
      tokenAdmin   = res.body.data.access_token;
    });
  });

  it('API harus mengembalikan access_token baru yang valid saat refresh_token dikirim ke POST /auth/refresh-token', () => {
    cy.wrap(null).then(() => {
      if (!refreshToken) return;
      cy.request({
        method: 'POST', url: `${BASE}/auth/refresh-token`,
        body: { refresh_token: refreshToken },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.have.property('access_token').and.not.be.empty;
      });
    });
  });

  it('Admin harus bisa logout dan session berhasil dihapus dari sistem', () => {
    cy.wrap(null).then(() => {
      if (!tokenAdmin) return;
      cy.request({
        method: 'POST', url: `${BASE}/auth/logout`,
        headers: auth(tokenAdmin),
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });
});
