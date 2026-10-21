-- Register akta PPAT, review draft oleh klien, persetujuan data pribadi (UU PDP).
ALTER TABLE "clients" ADD COLUMN "dataConsentAt" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "dataConsentById" TEXT;

CREATE TABLE "ppat_deeds" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "deedNumber" TEXT NOT NULL,
    "deedDate" TIMESTAMP(3) NOT NULL,
    "deedType" TEXT NOT NULL,
    "jobId" TEXT,
    "clientId" TEXT,
    "partyFrom" TEXT NOT NULL,
    "partyTo" TEXT NOT NULL,
    "rightType" TEXT,
    "location" TEXT,
    "landArea" TEXT,
    "buildingArea" TEXT,
    "transactionValue" DECIMAL(16,2),
    "njopValue" DECIMAL(16,2),
    "nop" TEXT,
    "sspDate" TIMESTAMP(3),
    "sspAmount" DECIMAL(16,2),
    "sspdDate" TIMESTAMP(3),
    "sspdAmount" DECIMAL(16,2),
    "submittedToBpnAt" TIMESTAMP(3),
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppat_deeds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deed_draft_reviews" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "sharedById" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataHash" TEXT NOT NULL,
    "decision" TEXT,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByAccountId" TEXT,

    CONSTRAINT "deed_draft_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ppat_deeds_deedNumber_key" ON "ppat_deeds"("deedNumber");
CREATE UNIQUE INDEX "ppat_deeds_year_sequence_key" ON "ppat_deeds"("year", "sequence");
CREATE INDEX "ppat_deeds_deedDate_idx" ON "ppat_deeds"("deedDate");
CREATE INDEX "deed_draft_reviews_draftId_idx" ON "deed_draft_reviews"("draftId");

ALTER TABLE "ppat_deeds" ADD CONSTRAINT "ppat_deeds_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ppat_deeds" ADD CONSTRAINT "ppat_deeds_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deed_draft_reviews" ADD CONSTRAINT "deed_draft_reviews_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "deed_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
