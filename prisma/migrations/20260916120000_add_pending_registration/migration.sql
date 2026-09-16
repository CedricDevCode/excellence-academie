-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "telephone" TEXT,
    "pays" TEXT,
    "ville" TEXT,
    "courseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" TEXT,
    "coursParticuliers" BOOLEAN NOT NULL DEFAULT false,
    "monthlyAmount" DOUBLE PRECISION,
    "dateNaissance" TEXT,
    "geniusPhone" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_token_key" ON "PendingRegistration"("token");
