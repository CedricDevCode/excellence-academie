-- Messagerie interne + Bibliothèque en ligne
CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "type" TEXT NOT NULL DEFAULT 'DIRECT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ConversationMember" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "ConversationMember_userId_idx" ON "ConversationMember"("userId");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");

CREATE TABLE IF NOT EXISTS "MessageAttachment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "size" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "LibraryDocument" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "courseId" TEXT,
  "courseTitle" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LibraryDocument_courseId_idx" ON "LibraryDocument"("courseId");
CREATE INDEX IF NOT EXISTS "LibraryDocument_createdAt_idx" ON "LibraryDocument"("createdAt");
