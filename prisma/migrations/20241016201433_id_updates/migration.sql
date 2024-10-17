-- DropIndex
DROP INDEX "User_githubId_key";

-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "googleId" SET DEFAULT '',
ALTER COLUMN "githubId" SET DEFAULT '';
