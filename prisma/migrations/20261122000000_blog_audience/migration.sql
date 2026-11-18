-- Audience des articles : MEMBERS (blog réservé aux inscrits) ou PUBLIC (journal ouvert, indexable SEO)
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'MEMBERS';
CREATE INDEX IF NOT EXISTS "BlogPost_audience_idx" ON "BlogPost"("audience");
