-- Remise sur paiement (montant, justificatif, date)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountNote" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountDate" TIMESTAMP(3);
