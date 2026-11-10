-- Kolom & tabel baru saja (semua boleh kosong); data lama tidak berubah.

-- Klien: status perkawinan, wakil badan usaha, dan PMPJ.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "maritalStatus" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "representative" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sourceOfFunds" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "transactionPurpose" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "beneficialOwner" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "isPep" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "pmpjUpdatedAt" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "pmpjUpdatedById" TEXT;

-- Tagihan: rincian honorarium / pajak titipan / biaya instansi / lain-lain.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "feeAmount" DECIMAL(14,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "taxDepositAmount" DECIMAL(14,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "agencyFeeAmount" DECIMAL(14,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "otherAmount" DECIMAL(14,2);

-- Salinan: penerima & tanggal diberikan.
ALTER TABLE "salinan" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE "salinan" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);

-- Buku Daftar Protes.
CREATE TABLE IF NOT EXISTS "protes" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requesterName" TEXT NOT NULL,
    "clientId" TEXT,
    "instrumentType" TEXT NOT NULL,
    "instrumentNumber" TEXT,
    "amount" DECIMAL(16,2),
    "againstName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "protes_number_key" ON "protes"("number");
CREATE INDEX IF NOT EXISTS "protes_date_idx" ON "protes"("date");
ALTER TABLE "protes" ENABLE ROW LEVEL SECURITY;
