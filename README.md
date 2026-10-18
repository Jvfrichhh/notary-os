# Notary OS — Phase 1

Fondasi Sistem Manajemen Kantor Notaris: setup project, database schema, authentication, RBAC dasar, dan shell UI (sidebar + top bar + dashboard). Modul 24 fitur diimplementasikan bertahap di Phase 2-6 (lihat `blueprint-notaris.md`).

## 1. Install dependencies

```bash
npm install
```

## 2. Setup environment

```bash
cp .env.example .env
```

Isi `.env`:

- **DATABASE_URL / DIRECT_URL** — dari Supabase: Project Settings → Database → Connection string. `DATABASE_URL` pakai connection pooling (port 6543), `DIRECT_URL` pakai direct connection (port 5432, dipakai Prisma Migrate).
- **NEXTAUTH_SECRET** — generate dengan `openssl rand -base64 32`.
- **STORAGE_PROVIDER** — `local` untuk development. Ganti ke `r2` + isi kredensial R2 saat deploy ke production.

## 3. Setup database

```bash
npx prisma generate
npx tsx scripts/db-target.ts --expect-ref <project-ref>   # read-only; exit 0 = target terverifikasi
npx prisma db push             # database baru/kosong: bentuk seluruh skema
npx prisma migrate resolve --applied 20261018020000_client_portal_accounts
npx prisma migrate resolve --applied 20261018040000_client_portal_documents
npm run prisma:seed            # data demo; berhenti sendiri jika database sudah berisi data
```

> Jangan memakai `prisma migrate dev` di repo ini untuk saat ini: folder `prisma/migrations` belum punya
> migrasi *baseline*, sehingga `migrate dev` di database kosong akan gagal (FK ke `clients`) dan di
> database berisi data bisa **menawarkan reset**. Lihat bagian "Portal Klien" untuk penjelasan lengkap.

Ini akan membuat seluruh tabel dan mengisi demo data:

| Role | Email | Password |
|---|---|---|
| NOTARY | notary@demo.local | password123 |
| ADMIN | admin@demo.local | password123 |
| STAFF | staff@demo.local | password123 |
| VIEWER | viewer@demo.local | password123 |

Plus 1 sample client (Budi Santoso), 1 visit, 1 job (dengan checklist, task, document, payment), dan 1 service template (Akta Jual Beli).

**Ganti password demo sebelum dipakai di kantor sungguhan.**

## 4. Jalankan development server

```bash
npm run dev
```

Buka http://localhost:3000 → otomatis redirect ke `/login`.

## 5. Yang sudah jadi

**Phase 1 — Fondasi**
- ✅ Authentication (Auth.js, credentials + bcrypt)
- ✅ RBAC dasar (Role, Permission, RolePermission + helper `assertPermission()` / `requirePermission()`)
- ✅ Prisma schema lengkap (20+ model sesuai blueprint)
- ✅ Shell UI: Sidebar (IA final semua modul), TopBar, Global Search placeholder, Notification bell
- ✅ File storage abstraction (`FileStorageService` + Local & R2 provider)
- ✅ Audit log helper (`writeAuditLog()`)
- ✅ Seed data demo (4 role, 1 client, 1 job dengan alur lengkap)

**Phase 2 — Client, Visit, Job, Task, Deadline, Calendar**
- ✅ **Clients** — list (search), detail (overview + visit/job history), create, edit, archive/restore
- ✅ **Visits** — buku tamu (filter hari ini/semua, search), detail, create, "Buat Job" dari visit
- ✅ **Jobs** — create (auto-generate checklist & task dari Service Template), list (Table + Kanban toggle), detail (info, checklist, task, ubah status dengan validasi transisi, payment info, dokumen)
- ✅ **Deadlines** — grouping Overdue / Due Today / Due Soon (≤3 hari) / Upcoming
- ✅ **Calendar** — month view dengan deadline job & appointment, navigasi bulan

**Belum dikerjakan (Phase 3-6, sudah ada placeholder route di sidebar)**
- 🔜 Document Vault (upload, versioning) — Phase 3
- 🔜 Minuta / Salinan / Grosse / Kutipan, Repertorium / Klapper, Legalisasi / Waarmerking / Wasiat — Phase 3-4
- 🔜 Payment/Finance UI, Reports, Notification Center penuh — Phase 5
- 🔜 Admin (manajemen user/role), Audit Log viewer — Phase 5-6

## Navigasi & hak akses per role

Daftar menu sidebar ada di **satu tempat**: `src/lib/navigation.ts`. Setiap item
punya `permissions` (cukup salah satu). Layout `(dashboard)/layout.tsx` mengambil
permission user sekali lewat `getUserPermissions()`, lalu menyaring menu sebelum
dikirim ke `Sidebar`. Menu hanyalah kenyamanan UI — keamanan sesungguhnya ada di:

- **Halaman**: `requirePermission()` / `requireAnyPermission()` di awal tiap `page.tsx`.
  Kalau tidak berhak, user dialihkan ke `/dashboard?denied=1` dan melihat pemberitahuan.
- **Server Action / API**: `assertPermission()` (lempar `PermissionError`) dan cek session.
- **Middleware**: hanya memastikan *sudah login* (role tersimpan di DB, jadi cek
  permission dilakukan di server component/action, bukan di edge middleware).

Menu per role bawaan (dari `prisma/seed.ts`):

| Role | Menu yang tampil |
|---|---|
| NOTARY | Semua (16 menu) |
| ADMIN | Semua kecuali **Admin** |
| STAFF | Dashboard, Notifikasi, Clients, Visits, Joblist, Calendar, Deadlines, Document Vault, Reports |
| VIEWER | Semua kecuali **Admin** (semua halaman bersifat baca saja; tombol tambah/ubah/hapus tidak tampil dan action ditolak server) |

Menambah menu baru: tambahkan item di `NAV_SECTIONS` dengan permission yang **sama**
dengan yang dipakai `requirePermission()` di halamannya.

Pemeriksaan cepat tanpa database: `npx tsx scripts/check-navigation.ts`.
Uji end-to-end per role (server & seed harus sudah jalan): `node scripts/e2e-access-check.mjs`.

## Portal Klien (tahap 1 — fondasi)

Portal klien hidup di `/portal` dan memakai **akun terpisah** dari akun internal:

| | Akun internal | Akun portal klien |
|---|---|---|
| Tabel | `users` (+ Role/Permission RBAC) | `client_accounts` → FK `clientId` ke `clients` |
| Login | `/login` (provider `credentials`) | `/portal/login` (provider `client-credentials`) |
| Isi session | `kind: "staff"`, `role` | `kind: "client"`, `clientId` |
| Guard server | `requireUser()` / `requirePermission()` | `requireClientAccount()` (`src/lib/portalSession.ts`) |

Aturan akses (ditegakkan di `src/middleware.ts` **dan** di tiap halaman/action):
- Akun klien hanya bisa membuka `/portal/**`; ke halaman/API internal → dialihkan/403.
- Akun internal tidak memakai portal; ke `/portal` → dialihkan ke `/dashboard`.
- Setiap query portal dibatasi `where: { clientId }` dari session yang diverifikasi ulang ke DB
  pada tiap request (akun nonaktif / klien diarsipkan langsung kehilangan akses).
- Job milik klien lain → 404, sama seperti job yang tidak ada.

Yang sudah ada:
- Tahap 1: login, dashboard (ringkasan + daftar pekerjaan), detail pekerjaan (status versi klien, target,
  riwayat perubahan status).
- Tahap 2: **unggah dokumen per item checklist** (`/portal/jobs/[id]`, server action
  `uploadChecklistDocument`), status pemeriksaan (Menunggu pemeriksaan / Diterima / Perlu diperbaiki +
  catatan kantor), unduh dokumen miliknya (`/api/portal/documents/[id]/download`), **notifikasi klien**
  (`/portal/notifications`). Di sisi internal: halaman job menampilkan unggahan klien dengan tombol
  **Terima / Perlu Perbaikan** (`reviewChecklistDocument`, butuh `edit_jobs`); perubahan status job
  otomatis membuat notifikasi klien.
Belum ada: pembuatan/penonaktifan akun klien dari UI internal, reset password mandiri.

**Perubahan skema** (aditif):
- `prisma/migrations/20261018020000_client_portal_accounts/` — tabel `client_accounts`.
- `prisma/migrations/20261018040000_client_portal_documents/` — enum `ChecklistReviewStatus`; kolom
  `reviewStatus/reviewNote/reviewedAt/reviewedById` di `checklist_items`; kolom
  `uploadedByClientAccountId` di `documents`; tabel `client_notifications`.

> Repo ini tidak punya migrasi *baseline* (skema lama dibuat tanpa `prisma migrate`), jadi migrasi di atas
> **tidak bisa** membentuk database kosong sendirian (ia hanya membuat 1 tabel yang ber-FK ke `clients`).

### Menyiapkan database PENGUJIAN (jangan produksi)

Semua perintah dijalankan dengan `DATABASE_URL`/`DIRECT_URL` yang menunjuk ke database pengujian.
Verifikasi target dulu — script ini hanya membaca:

```bash
npx tsx scripts/db-target.ts --expect-ref <project-ref DB pengujian>
# exit 0 hanya jika ref DATABASE_URL = ref DIRECT_URL = --expect-ref dan koneksi berhasil.
# Tanpa --expect-ref: inspeksi tetap tampil tetapi exit 3 (BELUM terverifikasi).
# exit 4 URL tidak diset/valid · 5 kedua URL beda project · 6 ref tidak cocok · 7 koneksi gagal.
# Project-ref Supabase: bagian <ref> pada username "postgres.<ref>" (pooler) / host "db.<ref>.supabase.co" (direct).
```

Lalu untuk **database kosong** (pakai db-target sebagai gerbang di tiap langkah tulis):

```bash
npx tsx scripts/db-target.ts --expect-ref <ref> && npx prisma db push
npx tsx scripts/db-target.ts --expect-ref <ref> && npx prisma migrate resolve --applied 20261018020000_client_portal_accounts && npx prisma migrate resolve --applied 20261018040000_client_portal_documents
npx tsx scripts/db-target.ts --expect-ref <ref> && npm run prisma:seed
npx tsx scripts/db-target.ts --expect-ref <ref>     # cek akhir: client_accounts ada, migrasi tercatat applied
```

**Tanpa Prisma CLI** (mis. lewat SQL editor / MCP Supabase): `python3 scripts/prisma-to-ddl.py prisma/schema.prisma`
menghasilkan DDL seluruh skema mengikuti konvensi Prisma (diverifikasi identik dengan kedua file migrasi portal
dan dieksekusi bersih di PostgreSQL 16); lalu `scripts/seed-demo.sql` mengisi data demo yang sama dengan
`prisma/seed.ts` (berhenti sendiri jika DB berisi data; password via pgcrypto bcrypt). Setelah itu catat kedua
migrasi di `_prisma_migrations` (atau `prisma migrate resolve --applied ...`). Verifikasi akhir tetap dengan
`prisma migrate diff --from-url <DB> --to-schema-datamodel prisma/schema.prisma --exit-code` saat CLI tersedia.

Untuk database **yang sudah punya skema lama** (mis. salinan/clone data): `npx prisma migrate deploy`
hanya akan menambahkan `client_accounts`. Jangan pakai `prisma migrate dev` pada database berisi data —
ia bisa menawarkan *reset* saat mendeteksi drift; **tolak**.

Akun demo setelah seed: `client@demo.local` (CLI-0001) dan `client2@demo.local` (CLI-0002), password `password123`.

Validasi file migrasi vs SQL yang dihasilkan Prisma (tanpa DB): `node scripts/check-portal-migration.mjs`.
Uji pengaman lapis 1 secara terisolasi (tanpa jaringan/DB/Playwright): `node scripts/test-e2e-guard.mjs`.
Unit test identitas DB: `node scripts/test-db-identity.mjs`. Uji alur `db-target.ts` dengan stub Prisma (tanpa DB): `node scripts/test-db-target.mjs`.

Uji otomatis: `node scripts/e2e-portal-check.mjs` dan `node scripts/e2e-access-check.mjs` (server & seed harus
jalan). Pengaman (`scripts/lib/e2e-guard.mjs`): domain produksi ditolak mutlak; target remote butuh
`E2E_ALLOW_REMOTE=1` **dan** `E2E_EXPECTED_DB_REF=<project-ref DB pengujian>`; skenario yang menulis DB hanya
berjalan jika `E2E_TEST_DATABASE_URL` cocok dengan ref itu **dan** pre-flight membuktikan aplikasi memakai DB
yang sama (login akun demo mengubah `lastLoginAt` di DB tersebut). Data yang diubah skenario selalu dipulihkan.

## Catatan penting

- Semua authorization dicek **server-side** lewat `assertPermission()` — jangan hanya mengandalkan sembunyi tombol di UI saat menambah fitur baru.
- Business logic tidak boleh import `LocalStorageProvider`/`R2StorageProvider` langsung — selalu lewat `getFileStorage()` dari `src/lib/storage/index.ts`.
- `audit_logs` bersifat append-only — jangan tambahkan endpoint update/delete untuk tabel ini.
