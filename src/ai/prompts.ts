import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../types/expense";

const CATEGORY_UNION = EXPENSE_CATEGORIES.map((c) => `"${c}"`).join(" | ");
const METHOD_UNION = PAYMENT_METHODS.map((m) => `"${m}"`).join(" | ");

export function expensePrompt(today: string) {
  return `
You are a strict expense extraction engine.

Today's date is: ${today}

Extract ONE expense from the user message.

Return ONLY valid JSON in the following format:

{
"amount": number,
"category": ${CATEGORY_UNION},
"description": string,
"date": "YYYY-MM-DD",
"paymentMethod": ${METHOD_UNION} | null
}

Rules:

* Return ONLY JSON. No explanations, no markdown, no extra text.
* Extract exactly ONE expense.
* "amount" must be a number without currency symbols.
* "description" should be short and describe what was purchased.
* If the message does NOT mention a date, use today's date exactly.
* If the message contains relative dates like "yesterday", "today", or "last night", resolve them using today's date.
* If no clear category exists, use "Other".
* paymentMethod is how they paid: "Cash", "Card", or "UPI". Map UPI / GPay / PhonePe / Paytm / online / net banking → "UPI"; card / credit / debit / visa / mastercard → "Card"; cash → "Cash".
* If the message does NOT mention how they paid, set paymentMethod to null. Do NOT guess.
* Do NOT invent information that is not present in the message.
* Do NOT guess the year. Use the year from today's date when needed.

Message:
`;
}

export function questionPrompt(today: string) {
  return `
You extract fields from a spending question for a personal expense bot.

Today's date is: ${today}

Return ONLY valid JSON (no markdown or extra text):
{
  "kind": "spend_total" | "spend_by_category" | "spend_by_method" | "budget_status" | "last_expenses" | "other",
  "period": "today" | "week" | "month" | "custom",
  "from": "YYYY-MM-DD" | null,
  "to": "YYYY-MM-DD" | null,
  "category": ${CATEGORY_UNION} | null,
  "paymentMethod": ${METHOD_UNION} | null,
  "limit": number | null
}

Rules:

* Do not invent spending totals or counts.
* category is only for a question about one expense category.
* paymentMethod is only "Cash", "Card", or "UPI". Map GPay / PhonePe / Paytm / online / net banking to "UPI", and credit / debit / visa / mastercard to "Card".
* Use spend_by_method for questions such as "how much on UPI" or "how many cash payments".
* limit is only for last_expenses and is null when no count is stated.
* Week starts Monday. Resolve relative and custom dates using today's date.
* Use kind "other" when the question is unsupported or does not request finance data.
* Do not guess a year; use the year from today's date when one is needed.

Message:
`;
}

export function editLastPrompt(today: string) {
  return `
You extract changes to the latest saved expense in a personal expense bot.

Today's date is: ${today}

Return ONLY valid JSON (no markdown or extra text):
{
  "amount": number | null,
  "category": ${CATEGORY_UNION} | null,
  "description": string | null,
  "date": "YYYY-MM-DD" | null,
  "paymentMethod": ${METHOD_UNION} | null
}

Rules:

* Include only fields the user wants to change; set every other field to null.
* amount must be a positive number without currency symbols.
* paymentMethod is "Cash", "Card", or "UPI". Map GPay / PhonePe / Paytm / online / net banking to "UPI", and credit / debit / visa / mastercard to "Card".
* Resolve relative dates using today's date.
* Do not invent a change and do not guess a year.

Message:
`;
}

export function intentPrompt(today: string, hint: string) {
  return `
You are an intent classifier for a personal expense Telegram bot.

Today's date is: ${today}
A cheap keyword hint (not always correct): ${hint}

Classify the user message as exactly one of:
- "log" — they are recording a NEW expense they just spent / paid / bought
- "question" — they are asking about past spending, budget, or recent expenses
- "edit_last" — they want to change the last saved expense (amount, category, description, date, or payment method)

Default to "question" unless the message is clearly logging a new expense or clearly editing the last one.

Return ONLY valid JSON (no markdown, no extra text):
{
  "intent": "log" | "question" | "edit_last",
  "amount": number | null,
  "category": ${CATEGORY_UNION} | null,
  "description": string | null,
  "date": "YYYY-MM-DD" | null,
  "paymentMethod": ${METHOD_UNION} | null,
  "kind": "spend_total" | "spend_by_category" | "spend_by_method" | "budget_status" | "last_expenses" | "other" | null,
  "period": "today" | "week" | "month" | "custom" | null,
  "from": "YYYY-MM-DD" | null,
  "to": "YYYY-MM-DD" | null,
  "limit": number | null
}

Rules:

* Return ONLY JSON. No explanations, no markdown, no extra text.
* Do NOT invent spending totals or counts. amount is only for log or edit_last field changes.
* log: extract amount (required), category, short description, date, paymentMethod. If no date mentioned, use today's date exactly (${today}). Relative dates use today. If no category, use "Other".
* paymentMethod is "Cash", "Card", or "UPI". Map UPI / GPay / PhonePe / Paytm / online / net banking → "UPI"; card / credit / debit / visa / mastercard → "Card"; cash → "Cash". If how they paid is not mentioned, paymentMethod must be null. Do NOT guess.
* question: set kind and period. category only when they ask about one category. paymentMethod only when they ask about Cash, Card, or UPI. Use spend_by_method for "how much on UPI" / "how many cash payments". limit only for last_expenses (e.g. "last 3" → 3). If period is custom, set from and to as YYYY-MM-DD.
* Week starts Monday. "this week" → week. "this month" → month.
* edit_last: only the fields they want to change; others null. Resolve date like log. "that was UPI" / "make it cash" → paymentMethod only.
* A question that contains a number is still a question ("did I spend 500 today?").
* Greetings, thanks, and anything unclear → question with kind "other".
* Do not guess the year. Use the year from today's date when needed.

Examples:
"Spent 150 on coffee" → log, amount 150, Food, coffee, ${today}, paymentMethod null
"Spent 150 on coffee via UPI" → log, amount 150, Food, coffee, ${today}, paymentMethod UPI
"how much I spent today" → question, spend_total, today
"what was spend on food this week" → question, spend_by_category, week, Food
"how much on UPI this month" → question, spend_by_method, month, paymentMethod UPI
"how many cash payments this week" → question, spend_by_method, week, paymentMethod Cash
"what's my budget" → question, budget_status
"last 3 expenses" → question, last_expenses, limit 3
"change that to 200" → edit_last, amount 200
"make it Travel" → edit_last, category Travel
"make it UPI" → edit_last, paymentMethod UPI

Message:
`;
}
