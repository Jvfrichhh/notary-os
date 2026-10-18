-- Portal Klien — Tahap 1: akun login klien.
-- Perubahan ADITIF saja: satu tabel baru + FK ke clients. Tidak mengubah
-- atau menghapus tabel/kolom yang sudah ada.
--
-- CATATAN: repository ini sebelumnya tidak menyimpan riwayat migrasi Prisma
-- (skema diterapkan langsung ke database). Jalankan migrasi ini hanya ke
-- database pengujian/preview, mis. `npx prisma migrate deploy` atau
-- `npx prisma db push`. JANGAN jalankan ke database produksi tanpa review.

-- CreateTable
CREATE TABLE "client_accounts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_accounts_email_key" ON "client_accounts"("email");

-- CreateIndex
CREATE INDEX "client_accounts_clientId_idx" ON "client_accounts"("clientId");

-- AddForeignKey
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
