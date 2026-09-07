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
npx prisma migrate dev --name init
npm run prisma:seed
```

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

## Catatan penting

- Semua authorization dicek **server-side** lewat `assertPermission()` — jangan hanya mengandalkan sembunyi tombol di UI saat menambah fitur baru.
- Business logic tidak boleh import `LocalStorageProvider`/`R2StorageProvider` langsung — selalu lewat `getFileStorage()` dari `src/lib/storage/index.ts`.
- `audit_logs` bersifat append-only — jangan tambahkan endpoint update/delete untuk tabel ini.
