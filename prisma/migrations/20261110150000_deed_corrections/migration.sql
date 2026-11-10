-- Berita Acara Pembetulan (Pasal 51 UUJN): catatan pembetulan kesalahan tulis/ketik
-- pada minuta akta yang sudah ditandatangani. Tabel baru; data lama tidak berubah.
CREATE TABLE IF NOT EXISTS "deed_corrections" (
    "id" TEXT NOT NULL,
    "deedId" TEXT NOT NULL,
    "baNumber" TEXT NOT NULL,
    "baDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deed_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deed_corrections_deedId_idx" ON "deed_corrections"("deedId");

DO $$ BEGIN
  ALTER TABLE "deed_corrections" ADD CONSTRAINT "deed_corrections_deedId_fkey" FOREIGN KEY ("deedId") REFERENCES "deeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sama seperti tabel lain: API publik Supabase dikunci (aplikasi masuk lewat Prisma).
ALTER TABLE "deed_corrections" ENABLE ROW LEVEL SECURITY;
