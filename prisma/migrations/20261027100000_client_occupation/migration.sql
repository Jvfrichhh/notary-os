-- Pekerjaan/profesi klien sesuai KTP (untuk laporan tahunan PKJM). Kolom baru, boleh kosong.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
