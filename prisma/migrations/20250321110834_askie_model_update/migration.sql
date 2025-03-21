-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeAskieQuota" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "lastAskieUsed" TIMESTAMP(3),
ADD COLUMN     "premiumAskieQuota" INTEGER NOT NULL DEFAULT 5;
