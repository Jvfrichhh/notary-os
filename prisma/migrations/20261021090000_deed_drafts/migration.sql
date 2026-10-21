-- Draft akta dari template. ADITIF: satu tabel baru dengan FK ke jobs.

-- CreateTable
CREATE TABLE "deed_drafts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT,
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deed_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deed_drafts_jobId_idx" ON "deed_drafts"("jobId");

-- AddForeignKey
ALTER TABLE "deed_drafts" ADD CONSTRAINT "deed_drafts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
