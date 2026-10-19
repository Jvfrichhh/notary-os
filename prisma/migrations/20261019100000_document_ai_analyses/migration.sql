-- Fitur AI — hasil analisis dokumen (ekstraksi + pra-pemeriksaan).
-- ADITIF: satu tabel baru dengan FK ke documents. Tidak mengubah tabel lain.

-- CreateTable
CREATE TABLE "document_ai_analyses" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "documentType" TEXT,
    "legible" BOOLEAN NOT NULL DEFAULT true,
    "qualityScore" INTEGER,
    "issues" JSONB,
    "extractedFields" JSONB,
    "clientMatch" JSONB,
    "summary" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_ai_analyses_documentId_createdAt_idx" ON "document_ai_analyses"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "document_ai_analyses" ADD CONSTRAINT "document_ai_analyses_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
