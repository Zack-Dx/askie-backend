/*
  Warnings:

  - A unique constraint covering the columns `[picture]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `picture` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "picture" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_picture_key" ON "User"("picture");
