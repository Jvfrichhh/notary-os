-- Kolom & tabel baru saja (semua boleh kosong); data lama tidak berubah.
ALTER TABLE "ppat_deeds" ADD COLUMN IF NOT EXISTS "landRegistered" BOOLEAN;
ALTER TABLE "minuta" ADD COLUMN IF NOT EXISTS "signedDocumentId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "ppnAmount" DECIMAL(14,2);

CREATE TABLE IF NOT EXISTS "holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "holidays_date_key" ON "holidays"("date");

CREATE TABLE IF NOT EXISTS "original_documents" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedFrom" TEXT,
    "receivedById" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedTo" TEXT,
    "returnedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "original_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "original_documents_jobId_idx" ON "original_documents"("jobId");
CREATE INDEX IF NOT EXISTS "original_documents_clientId_idx" ON "original_documents"("clientId");

CREATE TABLE IF NOT EXISTS "copy_certifications" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requesterName" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copy_certifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "copy_certifications_number_key" ON "copy_certifications"("number");
CREATE INDEX IF NOT EXISTS "copy_certifications_date_idx" ON "copy_certifications"("date");

CREATE TABLE IF NOT EXISTS "payment_refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_refundNumber_key" ON "payment_refunds"("refundNumber");
CREATE INDEX IF NOT EXISTS "payment_refunds_paymentId_idx" ON "payment_refunds"("paymentId");

ALTER TABLE "holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "original_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copy_certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_refunds" ENABLE ROW LEVEL SECURITY;
