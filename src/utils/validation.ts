import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum([
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Other"
  ]),
  description: z.string().min(1),
  date: z.string()
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
