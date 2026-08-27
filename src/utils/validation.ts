import { z } from "zod";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../types/expense";

export const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1),
  date: z.string(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
