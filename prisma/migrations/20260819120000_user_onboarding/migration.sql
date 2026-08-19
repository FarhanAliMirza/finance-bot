-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('WELCOME', 'EXPENSE_INTRO', 'SET_BUDGET', 'COMPLETED');

-- CreateTable
CREATE TABLE "UserOnboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" "OnboardingStep" NOT NULL DEFAULT 'WELCOME',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOnboarding_userId_key" ON "UserOnboarding"("userId");
