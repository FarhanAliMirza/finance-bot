import { model } from "../ai/gemini";
import { expensePrompt } from "../ai/prompts";
import { today as todayInTimeZone } from "../utils/dates";
import { expenseSchema } from "../utils/validation";
import {
  coercePaymentMethod,
  heuristicPaymentMethod,
} from "../utils/paymentMethods";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return { ...(value as Record<string, unknown>) };
}

export async function parseExpense(text: string, timeZone: string) {
  const today = todayInTimeZone(timeZone);

  const result = await model.generateContent(
    expensePrompt(today) + text
  );

  const raw = result.response.text().trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON from Gemini");
  }

  const record = asRecord(parsed);
  if (record) {
    const coerced = coercePaymentMethod(record.paymentMethod);
    const inferred = coerced ?? heuristicPaymentMethod(text);
    if (inferred) {
      record.paymentMethod = inferred;
    } else {
      delete record.paymentMethod;
    }
    return expenseSchema.parse(record);
  }

  return expenseSchema.parse(parsed);
}
