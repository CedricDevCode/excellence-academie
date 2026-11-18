-- Blog : vues, style de titre, notes, abonnés alertes, images en base
ALTER TABLE "BlogPost"
  ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "titleStyle" TEXT;

CREATE INDEX "BlogPost_views_idx" ON "BlogPost"("views");

CREATE TABLE "BlogRating" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogRating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlogRating_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE,
  CONSTRAINT "BlogRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "BlogRating_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);
CREATE UNIQUE INDEX "BlogRating_postId_userId_key" ON "BlogRating"("postId", "userId");
CREATE INDEX "BlogRating_postId_idx" ON "BlogRating"("postId");

CREATE TABLE "BlogSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogSubscriber_email_key" ON "BlogSubscriber"("email");

CREATE TABLE "BlogImage" (
  "id" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BlogImage_createdAt_idx" ON "BlogImage"("createdAt");
