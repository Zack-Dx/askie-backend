-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiumEndDate" TIMESTAMP(3),
ADD COLUMN     "premiumStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionPlan" TEXT;
