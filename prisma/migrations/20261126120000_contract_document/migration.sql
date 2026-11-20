-- Contrat officiel importé par l'administrateur (remplace le PDF en dur)
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "contractDocumentId" TEXT;

CREATE TABLE IF NOT EXISTS "ContractDocument" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContractDocument_createdAt_idx" ON "ContractDocument"("createdAt");
