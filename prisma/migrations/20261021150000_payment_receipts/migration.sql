-- Tagihan bernomor + kuitansi per pembayaran (DP / angsuran / pelunasan).
ALTER TABLE "payments" ADD COLUMN "invoiceNumber" TEXT;

CREATE TABLE "payment_receipts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "receivedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");
CREATE UNIQUE INDEX "payment_receipts_receiptNumber_key" ON "payment_receipts"("receiptNumber");
CREATE INDEX "payment_receipts_paymentId_idx" ON "payment_receipts"("paymentId");

ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
