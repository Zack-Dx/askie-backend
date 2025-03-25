/*
  Warnings:

  - Added the required column `sessionId` to the `ChatSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ChatSession_sessionId_createdAt_idx" ON "ChatSession"("sessionId", "createdAt");
