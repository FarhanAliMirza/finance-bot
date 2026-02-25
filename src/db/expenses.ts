import { prisma } from "./prisma";

export async function getExpensesBetween(
  userId: string,
  from: string,
  to: string
) {
  return prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: from,
        lte: to
      }
    },
    orderBy: { createdAt: "desc" }
  });
}
