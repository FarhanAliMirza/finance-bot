import { model } from "../ai/gemini";
import { intentPrompt } from "../ai/prompts";
import { EXPENSE_CATEGORIES, type ParsedExpense } from "../types/expense";
import type {
  ClassifiedIntent,
  EditLastFields,
  ExpenseCategory,
  HeuristicIntent,
  QuestionKind,
  QuestionPeriod,
  QuestionSlots,
} from "../types/intent";
import { today as todayInTimeZone } from "../utils/dates";
import {
  looksLikePaymentMethodEdit,
  resolvePaymentMethod,
} from "../utils/paymentMethods";
import { parseExpense } from "./expenseParser";

export const CATEGORIES: ExpenseCategory[] = [...EXPENSE_CATEGORIES];

const EDIT_RE =
  /\b((change|update|edit|fix)\s+(that|it|this|the last|last (one|expense))|make\s+(it|that|the last one)|actually\s+(it|that)\s+was|last\s+(one|expense)\s+(should|was|is|to)|change\s+that\s+to)\b/i;

const QUESTION_RE =
  /\b(how much|how many|what did i|what have i|what was|what’s my|what's my|whats my|did i spend|spent on|spend on|spending on|show me|tell me|remaining budget|budget (left|status|remaining)|last \d+ expenses?|last expenses?|any expenses|how much i spent)\b/i;

const LOG_VERB_AMOUNT_RE =
  /\b(spent|paid|bought|got)\b[\s\S]{0,48}\d/i;
const LOG_PREFIX_RE = /^\s*(?:₹|rs\.?\s*)?\d+(?:[.,]\d{1,2})?(?:\s|$)/i;

export type ClassifyIntentFn = (
  text: string,
  timeZone: string,
) => Promise<ClassifiedIntent>;

export function unansweredQuestion(): ClassifiedIntent {
  return {
    intent: "question",
    question: {
      kind: "other",
      period: "today",
      from: null,
      to: null,
      category: null,
      paymentMethod: null,
      limit: null,
    },
  };
}

/**
 * Cheap keyword hint. Ambiguous text defaults to question so we never
 * log unless the message looks like a new expense (or Gemini agrees).
 */
export function heuristicIntentHint(text: string): HeuristicIntent {
  const trimmed = text.trim();
  if (!trimmed) return "ambiguous";
  if (EDIT_RE.test(trimmed) || looksLikePaymentMethodEdit(trimmed)) {
    return "edit_last";
  }
  if (QUESTION_RE.test(trimmed)) return "question";
  if (LOG_VERB_AMOUNT_RE.test(trimmed) || LOG_PREFIX_RE.test(trimmed)) {
    return "log";
  }
  return "ambiguous";
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  const text = fence ? fence[1].trim() : trimmed;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Invalid JSON from Gemini");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nestedRecord(
  data: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  return asRecord(data[key]);
}

function readField(data: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) return data[key];
  }
  for (const nest of ["log", "question", "edit_last", "edit", "slots"]) {
    const inner = nestedRecord(data, nest);
    if (!inner) continue;
    for (const key of keys) {
      if (inner[key] !== undefined && inner[key] !== null) return inner[key];
    }
  }
  return undefined;
}

export function coerceCategory(value: unknown): ExpenseCategory | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
}

function asPositiveAmount(value: unknown): number | undefined {
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string") {
    n = Number(value.replace(/[,₹]/g, "").replace(/\brs\.?\s*/i, "").trim());
  } else {
    return undefined;
  }
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function asIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function asIntent(value: unknown): HeuristicIntent | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "log" || key === "expense" || key === "logging") return "log";
  if (key === "question" || key === "query" || key === "ask") return "question";
  if (
    key === "edit_last" ||
    key === "edit" ||
    key === "update" ||
    key === "update_last"
  ) {
    return "edit_last";
  }
  return undefined;
}

function asQuestionKind(value: unknown): QuestionKind {
  if (typeof value !== "string") return "other";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "spend_total" || key === "total" || key === "spending") {
    return "spend_total";
  }
  if (key === "spend_by_category" || key === "category" || key === "by_category") {
    return "spend_by_category";
  }
  if (
    key === "spend_by_method" ||
    key === "method" ||
    key === "by_method" ||
    key === "payment_method"
  ) {
    return "spend_by_method";
  }
  if (key === "budget_status" || key === "budget") return "budget_status";
  if (
    key === "last_expenses" ||
    key === "last_expense" ||
    key === "last" ||
    key === "recent"
  ) {
    return "last_expenses";
  }
  return "other";
}

function asPeriod(value: unknown): QuestionPeriod {
  if (typeof value !== "string") return "today";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "week" || key === "this_week") return "week";
  if (key === "month" || key === "this_month") return "month";
  if (key === "custom" || key === "range") return "custom";
  return "today";
}

function asLimit(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(10, Math.round(n));
}

function buildQuestion(
  data: Record<string, unknown>,
  originalText: string,
): QuestionSlots {
  const category = coerceCategory(readField(data, "category")) ?? null;
  const paymentMethod =
    resolvePaymentMethod(
      readField(data, "paymentMethod", "method"),
      originalText,
    ) ?? null;
  let kind = asQuestionKind(readField(data, "kind"));
  if (kind === "spend_by_category" && !category) kind = "spend_total";
  if (kind === "spend_by_method" && !paymentMethod) kind = "spend_total";
  if (kind === "spend_total" && paymentMethod && !category) {
    kind = "spend_by_method";
  }
  return {
    kind,
    period: asPeriod(readField(data, "period")),
    from: asIsoDate(readField(data, "from")) ?? null,
    to: asIsoDate(readField(data, "to")) ?? null,
    category,
    paymentMethod,
    limit: asLimit(readField(data, "limit")),
  };
}

function buildExpense(
  data: Record<string, unknown>,
  today: string,
  originalText: string,
): ParsedExpense | null {
  const amount = asPositiveAmount(readField(data, "amount"));
  if (amount == null) return null;
  const description =
    (typeof readField(data, "description") === "string"
      ? String(readField(data, "description")).trim()
      : "") || originalText.trim() || "Expense";
  const paymentMethod = resolvePaymentMethod(
    readField(data, "paymentMethod", "method"),
    originalText,
  );
  return {
    amount,
    category: coerceCategory(readField(data, "category")) ?? "Other",
    description,
    date: asIsoDate(readField(data, "date")) ?? today,
    ...(paymentMethod ? { paymentMethod } : {}),
  };
}

function buildEditFields(
  data: Record<string, unknown>,
  originalText: string,
): EditLastFields {
  const fields: EditLastFields = {};
  const amount = asPositiveAmount(readField(data, "amount"));
  if (amount != null) fields.amount = amount;
  const category = coerceCategory(readField(data, "category"));
  if (category) fields.category = category;
  const description = readField(data, "description");
  if (typeof description === "string" && description.trim()) {
    fields.description = description.trim();
  }
  const date = asIsoDate(readField(data, "date"));
  if (date) fields.date = date;
  const paymentMethod = resolvePaymentMethod(
    readField(data, "paymentMethod", "method"),
    originalText,
  );
  if (paymentMethod) fields.paymentMethod = paymentMethod;
  return fields;
}

/**
 * Parse Gemini JSON into a classified intent, applying the keyword hint so
 * we never log a question and never treat a clear log as unanswerable noise.
 */
export function parseClassifiedIntent(
  raw: string,
  options: { today: string; hint: HeuristicIntent; originalText: string },
): ClassifiedIntent {
  const { today, hint, originalText } = options;
  let data: Record<string, unknown>;
  try {
    const parsed = asRecord(extractJsonObject(raw));
    if (!parsed) throw new Error("not an object");
    data = parsed;
  } catch {
    if (hint === "edit_last") return { intent: "edit_last", fields: {} };
    if (hint === "log") throw new Error("Invalid JSON from Gemini");
    return unansweredQuestion();
  }

  const modelIntent = asIntent(readField(data, "intent", "type"));
  const expense = buildExpense(data, today, originalText);
  const question = buildQuestion(data, originalText);
  const fields = buildEditFields(data, originalText);

  if (hint === "edit_last") {
    return { intent: "edit_last", fields };
  }

  if (hint === "question") {
    return { intent: "question", question };
  }

  if (hint === "log") {
    if (expense) return { intent: "log", expense };
    if (modelIntent === "edit_last") return { intent: "edit_last", fields };
    if (modelIntent === "question") return { intent: "question", question };
    return unansweredQuestion();
  }

  // Ambiguous: trust Gemini, default to question so we never invent a log.
  if (modelIntent === "log" && expense) return { intent: "log", expense };
  if (modelIntent === "edit_last") return { intent: "edit_last", fields };
  return { intent: "question", question };
}

export async function classifyIntent(
  text: string,
  timeZone: string,
): Promise<ClassifiedIntent> {
  const today = todayInTimeZone(timeZone);
  const hint = heuristicIntentHint(text);

  try {
    const result = await model.generateContent(intentPrompt(today, hint) + text);
    return parseClassifiedIntent(result.response.text(), {
      today,
      hint,
      originalText: text,
    });
  } catch (err) {
    console.error(err);
    if (hint === "log") {
      try {
        const expense = await parseExpense(text, timeZone);
        return { intent: "log", expense };
      } catch (parseErr) {
        console.error(parseErr);
        return unansweredQuestion();
      }
    }
    if (hint === "edit_last") return { intent: "edit_last", fields: {} };
    return unansweredQuestion();
  }
}
