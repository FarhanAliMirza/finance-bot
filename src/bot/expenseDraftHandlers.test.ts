import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallbackQuery } from "node-telegram-bot-api";
import type TelegramBot from "node-telegram-bot-api";
import type { ParsedExpense } from "../types/expense";
import {
  expenseDrafts,
  encodePaymentMethodCallback,
} from "../services/expenseDraftStore";
import {
  EXPENSE_EXPIRED_UNSAVED_TEXT,
  formatExpenseDraftReply,
} from "../utils/budgetMessages";

vi.mock("../db/expenses", () => ({
  createExpense: vi.fn(),
}));
vi.mock("../db/userSettings", () => ({
  getUserTimeZone: vi.fn(),
}));
vi.mock("../services/budgetService", () => ({
  getMonthBudgetSnapshot: vi.fn(),
}));
vi.mock("../services/deleteExpenseService", () => ({
  deleteExpenseById: vi.fn(),
}));

import { createExpense } from "../db/expenses";
import { getUserTimeZone } from "../db/userSettings";
import { getMonthBudgetSnapshot } from "../services/budgetService";
import {
  draftKeyboardFor,
  handleDraftExpire,
  handleExpenseCallbackQuery,
  sendExpenseDraft,
} from "./expenseDraftHandlers";

const expense: ParsedExpense = {
  amount: 150,
  category: "Food",
  description: "coffee",
  date: "2026-08-27",
};

function fakeBot() {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 10 }),
    editMessageText: vi.fn().mockResolvedValue(true),
    editMessageReplyMarkup: vi.fn().mockResolvedValue(true),
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
  };
}

describe("draftKeyboardFor", () => {
  it("uses Confirm/Undo when the method is already known", () => {
    const keyboard = draftKeyboardFor("draft-1", {
      ...expense,
      paymentMethod: "UPI",
    });
    const labels = keyboard.inline_keyboard.flat().map((b) => b.text);
    expect(labels).toEqual(["✅ Confirm", "↩️ Undo"]);
  });

  it("uses Cash/Card/UPI plus Cancel when the method is missing", () => {
    const keyboard = draftKeyboardFor("draft-1", expense);
    const labels = keyboard.inline_keyboard.flat().map((b) => b.text);
    expect(labels).toEqual(["💵 Cash", "💳 Card", "📱 UPI", "↩️ Cancel"]);
  });
});

describe("sendExpenseDraft keyboards", () => {
  beforeEach(() => {
    vi.mocked(getUserTimeZone).mockResolvedValue("Asia/Kolkata");
    vi.mocked(getMonthBudgetSnapshot).mockResolvedValue(null);
  });

  afterEach(() => {
    expenseDrafts.clearAll();
  });

  it("sends the method keyboard when paymentMethod is missing", async () => {
    const bot = fakeBot();
    await sendExpenseDraft(
      { text: "Spent 150 on coffee", from: { id: 42 }, chat: { id: 99 } } as never,
      bot as unknown as TelegramBot,
      expense,
    );
    const markup = bot.sendMessage.mock.calls[0][2].reply_markup;
    const labels = markup.inline_keyboard.flat().map((b: { text: string }) => b.text);
    expect(labels).toEqual(["💵 Cash", "💳 Card", "📱 UPI", "↩️ Cancel"]);
    expect(bot.sendMessage.mock.calls[0][1]).toContain("How did you pay?");
  });

  it("sends Confirm/Undo when paymentMethod is inferred", async () => {
    const bot = fakeBot();
    await sendExpenseDraft(
      { text: "via UPI", from: { id: 42 }, chat: { id: 99 } } as never,
      bot as unknown as TelegramBot,
      { ...expense, paymentMethod: "UPI" },
    );
    const markup = bot.sendMessage.mock.calls[0][2].reply_markup;
    const labels = markup.inline_keyboard.flat().map((b: { text: string }) => b.text);
    expect(labels).toEqual(["✅ Confirm", "↩️ Undo"]);
    expect(bot.sendMessage.mock.calls[0][1]).toBe(
      formatExpenseDraftReply(
        { ...expense, paymentMethod: "UPI" },
        null,
        "Asia/Kolkata",
      ),
    );
  });
});

describe("handleDraftExpire", () => {
  afterEach(() => {
    expenseDrafts.clearAll();
  });

  it("does not save when a method was never chosen", async () => {
    const bot = fakeBot();
    const draft = expenseDrafts.create({
      userId: "42",
      chatId: 99,
      expense,
    });
    expenseDrafts.bindMessage(draft.id, 10);
    await handleDraftExpire(
      { kind: "discard", draft: expenseDrafts.get(draft.id)! },
      bot as unknown as TelegramBot,
    );
    expect(createExpense).not.toHaveBeenCalled();
    expect(bot.editMessageText).toHaveBeenCalledWith(
      EXPENSE_EXPIRED_UNSAVED_TEXT,
      expect.objectContaining({ chat_id: 99, message_id: 10 }),
    );
  });
});

describe("payment method callback", () => {
  beforeEach(() => {
    vi.mocked(getUserTimeZone).mockResolvedValue("Asia/Kolkata");
    vi.mocked(getMonthBudgetSnapshot).mockResolvedValue(null);
    vi.mocked(createExpense).mockResolvedValue({ id: "exp-1" } as never);
  });

  afterEach(() => {
    expenseDrafts.clearAll();
  });

  it("sets the method and saves on tap", async () => {
    const bot = fakeBot();
    const draft = expenseDrafts.create({
      userId: "42",
      chatId: 99,
      expense,
    });
    expenseDrafts.bindMessage(draft.id, 10);
    const query = {
      id: "q1",
      from: { id: 42 },
      data: encodePaymentMethodCallback(draft.id, "UPI"),
    } as CallbackQuery;

    await handleExpenseCallbackQuery(query, bot as unknown as TelegramBot);

    expect(createExpense).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ paymentMethod: "UPI", amount: 150 }),
    );
    expect(bot.answerCallbackQuery).toHaveBeenCalledWith("q1", { text: "Saved" });
  });
});
