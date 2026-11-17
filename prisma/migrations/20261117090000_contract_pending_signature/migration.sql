-- Contrat créé dès l'inscription puis signé plus tard depuis l'espace étudiant.
ALTER TABLE "Contract" ALTER COLUMN "signatureData" DROP NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "signedAt" DROP NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "signedAt" DROP DEFAULT;
