import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "../types/expense";
import { expenseSchema } from "../utils/validation";
import {
  CATEGORIES,
  coerceCategory,
  extractJsonObject,
  heuristicIntentHint,
  parseClassifiedIntent,
  unansweredQuestion,
} from "./intentClassifier";

const CANONICAL_CATEGORIES = [
  "Food",
  "Travel",
  "Utilities",
  "Shopping",
  "Medical",
  "Subscription",
  "Entertainment",
  "Gift",
  "Investment",
  "Other",
] as const;

const TODAY = "2026-08-27";

function parse(
  raw: string,
  hint: "log" | "question" | "edit_last" | "ambiguous" = "question",
  originalText = "how much I spent today",
) {
  return parseClassifiedIntent(raw, { today: TODAY, hint, originalText });
}

describe("heuristicIntentHint", () => {
  it("treats clear expense logs as log", () => {
    expect(heuristicIntentHint("Spent 150 on coffee")).toBe("log");
    expect(heuristicIntentHint("Paid 500 for taxi yesterday")).toBe("log");
    expect(heuristicIntentHint("150 food")).toBe("log");
    expect(heuristicIntentHint("₹80 snacks")).toBe("log");
  });

  it("treats questions as question, including numbers inside a question", () => {
    expect(heuristicIntentHint("how much I spent today")).toBe("question");
    expect(heuristicIntentHint("what was spend on food this week")).toBe(
      "question",
    );
    expect(heuristicIntentHint("did I spend 500 today?")).toBe("question");
    expect(heuristicIntentHint("what's my budget")).toBe("question");
    expect(heuristicIntentHint("how much on UPI this month")).toBe("question");
    expect(heuristicIntentHint("how many cash payments this week")).toBe(
      "question",
    );
  });

  it("treats last-expense edits as edit_last", () => {
    expect(heuristicIntentHint("change that to 200")).toBe("edit_last");
    expect(heuristicIntentHint("make it Travel")).toBe("edit_last");
    expect(heuristicIntentHint("make it UPI")).toBe("edit_last");
    expect(heuristicIntentHint("that was cash")).toBe("edit_last");
  });

  it("treats bought-for-amount as log even when the number is not next to the verb", () => {
    expect(heuristicIntentHint("Bought groceries for 2500 yesterday")).toBe(
      "log",
    );
  });

  it("defaults greetings and unclear text to ambiguous", () => {
    expect(heuristicIntentHint("hello")).toBe("ambiguous");
    expect(heuristicIntentHint("thanks")).toBe("ambiguous");
    expect(heuristicIntentHint("coffee")).toBe("ambiguous");
    expect(heuristicIntentHint("Movie ticket 250")).toBe("ambiguous");
  });
});

describe("extractJsonObject", () => {
  it("parses raw JSON and fenced JSON", () => {
    expect(extractJsonObject('{"intent":"question"}')).toEqual({
      intent: "question",
    });
    expect(
      extractJsonObject('Here you go:\n```json\n{"intent":"log"}\n```'),
    ).toEqual({ intent: "log" });
  });
});

describe("parseClassifiedIntent", () => {
  it("parses a log with slot defaults", () => {
    const result = parse(
      JSON.stringify({
        intent: "log",
        amount: 150,
        category: "food",
        description: "coffee",
      }),
      "log",
      "Spent 150 on coffee",
    );
    expect(result).toEqual({
      intent: "log",
      expense: {
        amount: 150,
        category: "Food",
        description: "coffee",
        date: TODAY,
      },
    });
  });

  it("defaults missing log category and description", () => {
    const result = parse(
      JSON.stringify({ intent: "log", amount: 80 }),
      "log",
      "80",
    );
    expect(result.intent).toBe("log");
    if (result.intent === "log") {
      expect(result.expense.category).toBe("Other");
      expect(result.expense.description).toBe("80");
      expect(result.expense.date).toBe(TODAY);
    }
  });

  it("parses a question and defaults period to today", () => {
    const result = parse(
      JSON.stringify({ intent: "question", kind: "spend_total" }),
      "question",
    );
    expect(result).toEqual({
      intent: "question",
      question: {
        kind: "spend_total",
        period: "today",
        from: null,
        to: null,
        category: null,
        paymentMethod: null,
        limit: null,
      },
    });
  });

  it("parses category+week question slots and clamps last_expenses limit", () => {
    const category = parse(
      JSON.stringify({
        intent: "question",
        kind: "spend_by_category",
        period: "week",
        category: "Food",
      }),
      "question",
    );
    expect(category).toEqual({
      intent: "question",
      question: {
        kind: "spend_by_category",
        period: "week",
        from: null,
        to: null,
        category: "Food",
        paymentMethod: null,
        limit: null,
      },
    });

    const last = parse(
      JSON.stringify({
        intent: "question",
        kind: "last_expenses",
        limit: 99,
      }),
      "question",
    );
    expect(last.intent).toBe("question");
    if (last.intent === "question") {
      expect(last.question.kind).toBe("last_expenses");
      expect(last.question.limit).toBe(10);
    }
  });

  it("parses a partial edit_last", () => {
    const result = parse(
      JSON.stringify({
        intent: "edit_last",
        amount: 200,
        category: "Travel",
      }),
      "edit_last",
    );
    expect(result).toEqual({
      intent: "edit_last",
      fields: { amount: 200, category: "Travel" },
    });
  });

  it("does not log when the hint is question, even if Gemini says log", () => {
    const result = parse(
      JSON.stringify({
        intent: "log",
        amount: 150,
        kind: "spend_total",
        period: "today",
      }),
      "question",
    );
    expect(result.intent).toBe("question");
    if (result.intent === "question") {
      expect(result.question.kind).toBe("spend_total");
      expect(result.question.period).toBe("today");
    }
  });

  it("trusts Gemini log when the text is ambiguous", () => {
    const result = parse(
      JSON.stringify({
        intent: "log",
        amount: 250,
        category: "Entertainment",
        description: "Movie ticket",
      }),
      "ambiguous",
      "Movie ticket 250",
    );
    expect(result).toEqual({
      intent: "log",
      expense: {
        amount: 250,
        category: "Entertainment",
        description: "Movie ticket",
        date: TODAY,
      },
    });
  });

  it("defaults ambiguous Gemini output to a question", () => {
    const result = parse(
      JSON.stringify({ intent: "question", kind: "other" }),
      "ambiguous",
      "hello",
    );
    expect(result.intent).toBe("question");
  });

  it("falls back to an unanswered question on invalid JSON", () => {
    expect(parse("not json", "question")).toEqual(unansweredQuestion());
  });

  it("throws on invalid JSON when the hint is log so the caller can fall back", () => {
    expect(() => parse("not json", "log", "Spent 150 on coffee")).toThrow(
      /Invalid JSON/,
    );
  });

  it("parses a log with a payment method and leaves method unset when unmentioned", () => {
    const withMethod = parse(
      JSON.stringify({
        intent: "log",
        amount: 150,
        category: "Food",
        description: "coffee",
        paymentMethod: "upi",
      }),
      "log",
      "Spent 150 on coffee via UPI",
    );
    expect(withMethod).toEqual({
      intent: "log",
      expense: {
        amount: 150,
        category: "Food",
        description: "coffee",
        date: TODAY,
        paymentMethod: "UPI",
      },
    });

    const withoutMethod = parse(
      JSON.stringify({
        intent: "log",
        amount: 150,
        category: "Food",
        description: "coffee",
        paymentMethod: null,
      }),
      "log",
      "Spent 150 on coffee",
    );
    expect(withoutMethod).toEqual({
      intent: "log",
      expense: {
        amount: 150,
        category: "Food",
        description: "coffee",
        date: TODAY,
      },
    });
  });

  it("infers payment method from the original log text when Gemini omits it", () => {
    const result = parse(
      JSON.stringify({
        intent: "log",
        amount: 150,
        category: "Food",
        description: "coffee",
      }),
      "log",
      "Paid 150 via GPay",
    );
    expect(result.intent).toBe("log");
    if (result.intent === "log") {
      expect(result.expense.paymentMethod).toBe("UPI");
    }
  });

  it("parses spend_by_method questions", () => {
    const result = parse(
      JSON.stringify({
        intent: "question",
        kind: "spend_by_method",
        period: "month",
        paymentMethod: "UPI",
      }),
      "question",
      "how much on UPI this month",
    );
    expect(result).toEqual({
      intent: "question",
      question: {
        kind: "spend_by_method",
        period: "month",
        from: null,
        to: null,
        category: null,
        paymentMethod: "UPI",
        limit: null,
      },
    });
  });

  it("upgrades a spend_total question when the text names a method", () => {
    const result = parse(
      JSON.stringify({
        intent: "question",
        kind: "spend_total",
        period: "week",
      }),
      "question",
      "how many cash payments this week",
    );
    expect(result.intent).toBe("question");
    if (result.intent === "question") {
      expect(result.question.kind).toBe("spend_by_method");
      expect(result.question.paymentMethod).toBe("Cash");
      expect(result.question.period).toBe("week");
    }
  });

  it("parses an edit_last payment method", () => {
    const result = parse(
      JSON.stringify({
        intent: "edit_last",
        paymentMethod: "UPI",
      }),
      "edit_last",
      "make it UPI",
    );
    expect(result).toEqual({
      intent: "edit_last",
      fields: { paymentMethod: "UPI" },
    });
  });

  it("does not log when amount is missing even if the hint is log", () => {
    const result = parse(
      JSON.stringify({ intent: "log", category: "Food" }),
      "log",
      "coffee",
    );
    expect(result.intent).toBe("question");
  });
});

describe("expense categories", () => {
  it("matches the canonical 10-name list in the type, zod enum, and classifier", () => {
    expect([...EXPENSE_CATEGORIES]).toEqual([...CANONICAL_CATEGORIES]);
    expect(CATEGORIES).toEqual([...CANONICAL_CATEGORIES]);
    expect([...expenseSchema.shape.category.options]).toEqual([
      ...CANONICAL_CATEGORIES,
    ]);
    expect(coerceCategory("travel")).toBe("Travel");
    expect(coerceCategory("utilities")).toBe("Utilities");
    expect(coerceCategory("subscription")).toBe("Subscription");
    expect(coerceCategory("Transport")).toBeUndefined();
    expect(coerceCategory("Bills")).toBeUndefined();
  });
});
