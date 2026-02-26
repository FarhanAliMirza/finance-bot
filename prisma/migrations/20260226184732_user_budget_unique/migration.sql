/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserBudget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserBudget_userId_key" ON "UserBudget"("userId");
