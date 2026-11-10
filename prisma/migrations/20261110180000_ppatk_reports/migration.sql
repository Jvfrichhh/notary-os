-- Catatan pelaporan PPATK per klien (tabel baru; data lama tidak berubah).
CREATE TABLE IF NOT EXISTS "ppatk_reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ppatk_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ppatk_reports_clientId_idx" ON "ppatk_reports"("clientId");
ALTER TABLE "ppatk_reports" ENABLE ROW LEVEL SECURITY;
