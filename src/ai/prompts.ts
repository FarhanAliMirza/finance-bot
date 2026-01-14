export function expensePrompt(today: string) {
  return `
You are an expense extraction engine.

Today's date is: ${today}

Extract expense details from the message below.

Return ONLY valid JSON in this format:
{
  "amount": number,
  "category": "Food" | "Transport" | "Shopping" | "Bills" | "Entertainment" | "Other",
  "description": string,
  "date": "YYYY-MM-DD"
}

Rules:
- If the message does NOT mention a date, use today's date exactly
- If the message mentions words like "yesterday", infer correctly using today's date
- Do NOT guess the year
- Do NOT include text outside JSON

Message:
`;
}
