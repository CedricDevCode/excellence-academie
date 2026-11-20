-- Modification / suppression des messages (style WhatsApp)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "HiddenMessage" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "HiddenMessage_messageId_userId_key" ON "HiddenMessage"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "HiddenMessage_userId_idx" ON "HiddenMessage"("userId");
