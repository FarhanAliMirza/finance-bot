import { prisma } from "../db/prisma";

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
- ₹${expense.amount} (${expense.category}) - ${expense.description}`;
  }
}
