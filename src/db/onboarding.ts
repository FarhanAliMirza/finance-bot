import { prisma } from "./prisma";
import { OnboardingStep } from "../../generated/prisma";

export async function getUserOnboarding(userId: string) {
  return prisma.userOnboarding.findUnique({
    where: { userId },
  });
}

export async function upsertUserOnboarding(
  userId: string,
  step: OnboardingStep,
  completedAt?: Date | null,
) {
  return prisma.userOnboarding.upsert({
    where: { userId },
    create: {
      userId,
      step,
      completedAt: completedAt ?? null,
    },
    update: {
      step,
      completedAt: completedAt === undefined ? undefined : completedAt,
    },
  });
}

export async function markOnboardingComplete(userId: string) {
  return upsertUserOnboarding(userId, OnboardingStep.COMPLETED, new Date());
}

export async function userHasPriorActivity(userId: string): Promise<boolean> {
  const budget = await prisma.userBudget.findUnique({ where: { userId } });
  if (budget) return true;

  const expense = await prisma.expense.findFirst({
    where: { userId },
    select: { id: true },
  });
  return !!expense;
}
