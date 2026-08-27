import { formatRupees } from "./money";
import { UNSPECIFIED_METHOD_LABEL } from "./paymentMethods";

export interface MethodSpendInput {
  amount: number;
  paymentMethod?: string | null;
}

export interface MethodSpendRow {
  method: string;
  amount: number;
  count: number;
}

export function summarizePaymentMethods(
  expenses: MethodSpendInput[],
): MethodSpendRow[] {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const key = expense.paymentMethod || UNSPECIFIED_METHOD_LABEL;
    const current = totals.get(key) ?? { amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    totals.set(key, current);
  }

  return [...totals.entries()]
    .map(([method, stats]) => ({
      method,
      amount: stats.amount,
      count: stats.count,
    }))
    .sort(
      (a, b) => b.amount - a.amount || a.method.localeCompare(b.method),
    );
}

export function formatPaymentMethodBreakdown(
  expenses: MethodSpendInput[],
): string | null {
  if (expenses.length === 0) return null;
  const lines = summarizePaymentMethods(expenses).map(
    (row) => `• ${row.method}: ${formatRupees(row.amount)} (${row.count})`,
  );
  return ["Payment methods:", ...lines].join("\n");
}
