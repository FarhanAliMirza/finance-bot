import { prisma } from "../db/prisma";
import { formatCategoryWithMethod } from "../utils/paymentMethods";

export async function deleteExpense(userId: string) {
  const expense = await prisma.expense.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!expense) {
    return `📝 You don't have any expenses to delete.`;
  } else {
    await prisma.expense.delete({
      where: {
        id: expense.id,
      },
    });
    return `📝 Expense deleted:
- ₹${expense.amount} (${formatCategoryWithMethod(expense.category, expense.paymentMethod)}) - ${expense.description}`;
  }
}

export async function deleteExpenseById(
  userId: string,
  expenseId: string,
): Promise<boolean> {
  const result = await prisma.expense.deleteMany({
    where: {
      id: expenseId,
      userId,
    },
  });
  return result.count > 0;
}
