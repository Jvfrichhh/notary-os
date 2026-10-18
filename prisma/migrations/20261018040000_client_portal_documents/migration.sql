-- Portal Klien — Tahap 2: unggah dokumen oleh klien, pemeriksaan staff,
-- notifikasi klien. Semua perubahan ADITIF (kolom nullable / tabel baru).
-- Terapkan hanya ke database pengujian/preview; produksi lewat review.

-- CreateEnum
CREATE TYPE "ChecklistReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'NEEDS_REVISION');

-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "reviewStatus" "ChecklistReviewStatus",
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "uploadedByClientAccountId" TEXT;

-- CreateTable
CREATE TABLE "client_notifications" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_notifications_clientId_isRead_idx" ON "client_notifications"("clientId", "isRead");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedByClientAccountId_fkey" FOREIGN KEY ("uploadedByClientAccountId") REFERENCES "client_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notifications" ADD CONSTRAINT "client_notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
