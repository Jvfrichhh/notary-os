-- Draft akta PPAT terhubung ke Buku Akta PPAT + langkah proses PPAT per pekerjaan.
ALTER TABLE "deed_drafts" ADD COLUMN "ppatDeedId" TEXT;

CREATE TABLE "ppat_stages" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppat_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deed_drafts_ppatDeedId_key" ON "deed_drafts"("ppatDeedId");
CREATE UNIQUE INDEX "ppat_stages_jobId_step_key" ON "ppat_stages"("jobId", "step");

ALTER TABLE "deed_drafts" ADD CONSTRAINT "deed_drafts_ppatDeedId_fkey" FOREIGN KEY ("ppatDeedId") REFERENCES "ppat_deeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ppat_stages" ADD CONSTRAINT "ppat_stages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
