-- Portal Klien — Tahap 3: akun dibuat/di-reset kantor wajib ganti password.
-- Aditif: satu kolom boolean dengan default.

-- AlterTable
ALTER TABLE "client_accounts" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
