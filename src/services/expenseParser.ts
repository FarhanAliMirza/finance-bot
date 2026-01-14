import { model } from "../ai/gemini";
import { expensePrompt } from "../ai/prompts";
import { expenseSchema } from "../utils/validation";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function parseExpense(text: string) {
  const today = getToday();

  const result = await model.generateContent(
    expensePrompt(today) + text
  );

  const raw = result.response.text().trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON from Gemini");
  }

  return expenseSchema.parse(parsed);
}
