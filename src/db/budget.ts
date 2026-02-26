import { prisma } from "./prisma";

export async function getUserBudget(userId: string) {
  return prisma.userBudget.findUnique({
    where: {
      userId
    }
  });
}

export async function setUserBudget(userId: string, monthlyBudget: number) {
  return prisma.userBudget.create({
    data: {
      userId,
      monthlyBudget
    }
  });
}

export async function updateUserBudget(userId: string, monthlyBudget: number) {
  return prisma.userBudget.update({
    where: {
      userId
    },
    data: {
      monthlyBudget
    }
  });
}