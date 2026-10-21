-- Tautan draft akta -> akta resmi (Sahkan & Daftarkan). ADITIF: satu kolom
-- nullable + indeks unik + FK.

-- AlterTable
ALTER TABLE "deed_drafts" ADD COLUMN     "deedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "deed_drafts_deedId_key" ON "deed_drafts"("deedId");

-- AddForeignKey
ALTER TABLE "deed_drafts" ADD CONSTRAINT "deed_drafts_deedId_fkey" FOREIGN KEY ("deedId") REFERENCES "deeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
