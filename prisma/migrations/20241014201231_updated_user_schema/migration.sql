-- AlterTable
ALTER TABLE "User" ADD COLUMN     "about" TEXT,
ADD COLUMN     "accountAge" INTEGER,
ADD COLUMN     "answersProvided" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "questionsAsked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "twitterUrl" TEXT;
