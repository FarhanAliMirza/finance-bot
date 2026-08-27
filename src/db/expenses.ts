import { prisma } from "./prisma";
import type { ParsedExpense, PaymentMethod } from "../types/expense";
import { createdAtForParsedDate } from "../utils/dates";
import { getUserTimeZone } from "./userSettings";

export async function createExpense(userId: string, expense: ParsedExpense) {
  const timeZone = await getUserTimeZone(userId);
  return prisma.expense.create({
    data: {
      userId,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      paymentMethod: expense.paymentMethod ?? null,
      createdAt: createdAtForParsedDate(expense.date, timeZone),
    },
  });
}

export async function getExpensesBetween(
  userId: string,
  startInclusive: Date,
  endExclusive: Date,
) {
  return prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: startInclusive,
        lt: endExclusive,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestExpenses(userId: string, take: number) {
  return prisma.expense.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getLatestExpense(userId: string) {
  return prisma.expense.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateExpenseById(
  userId: string,
  expenseId: string,
  data: {
    amount?: number;
    category?: string;
    description?: string;
    paymentMethod?: PaymentMethod | null;
    createdAt?: Date;
  },
) {
  const result = await prisma.expense.updateMany({
    where: { id: expenseId, userId },
    data,
  });
  return result.count > 0;
}
