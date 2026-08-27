import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "node-telegram-bot-api";
import type TelegramBot from "node-telegram-bot-api";
import type { ClassifiedIntent } from "../types/intent";
import type { ParsedExpense } from "../types/expense";

vi.mock("./expenseDraftHandlers", () => ({
  sendExpenseDraft: vi.fn(),
}));
vi.mock("../services/questionService", () => ({
  answerQuestion: vi.fn(),
}));
vi.mock("../services/editLastExpenseService", () => ({
  editLastExpense: vi.fn(),
}));
vi.mock("../db/userSettings", () => ({
  getUserTimeZone: vi.fn(),
}));

import { handleMessage } from "./handlers";
import { sendExpenseDraft } from "./expenseDraftHandlers";
import { answerQuestion } from "../services/questionService";
import { editLastExpense } from "../services/editLastExpenseService";
import { getUserTimeZone } from "../db/userSettings";

const expense: ParsedExpense = {
  amount: 150,
  category: "Food",
  description: "coffee",
  date: "2026-08-27",
};

function fakeMsg(text: string): Message {
  return {
    text,
    from: { id: 42 },
    chat: { id: 99 },
  } as Message;
}

function fakeBot() {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
  };
}

describe("handleMessage intent routing", () => {
  beforeEach(() => {
    vi.mocked(getUserTimeZone).mockResolvedValue("Asia/Kolkata");
    vi.mocked(sendExpenseDraft).mockReset();
    vi.mocked(answerQuestion).mockReset();
    vi.mocked(editLastExpense).mockReset();
  });

  it("routes log to the expense draft and does not query or edit", async () => {
    const bot = fakeBot();
    const classified: ClassifiedIntent = { intent: "log", expense };
    await handleMessage(fakeMsg("Spent 150 on coffee"), bot as unknown as TelegramBot, {
      classify: async () => classified,
    });

    expect(sendExpenseDraft).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendExpenseDraft).mock.calls[0][2]).toEqual(expense);
    expect(answerQuestion).not.toHaveBeenCalled();
    expect(editLastExpense).not.toHaveBeenCalled();
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it("routes question to a DB-backed NL reply and never logs", async () => {
    const bot = fakeBot();
    vi.mocked(answerQuestion).mockResolvedValue({
      text: "You spent ₹1,240 today across 3 expenses.",
      exportWindow: { kind: "today" },
    });
    const classified: ClassifiedIntent = {
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
    };

    await handleMessage(fakeMsg("how much I spent today"), bot as unknown as TelegramBot, {
      classify: async () => classified,
    });

    expect(sendExpenseDraft).not.toHaveBeenCalled();
    expect(editLastExpense).not.toHaveBeenCalled();
    expect(answerQuestion).toHaveBeenCalledWith(
      "42",
      classified.question,
      "Asia/Kolkata",
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      99,
      "You spent ₹1,240 today across 3 expenses.",
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }),
    );
  });

  it("routes edit_last to the latest saved expense and never logs", async () => {
    const bot = fakeBot();
    vi.mocked(editLastExpense).mockResolvedValue(
      "Updated your last expense to ₹200 (Travel).",
    );
    const classified: ClassifiedIntent = {
      intent: "edit_last",
      fields: { amount: 200, category: "Travel" },
    };

    await handleMessage(fakeMsg("change that to 200 travel"), bot as unknown as TelegramBot, {
      classify: async () => classified,
    });

    expect(sendExpenseDraft).not.toHaveBeenCalled();
    expect(answerQuestion).not.toHaveBeenCalled();
    expect(editLastExpense).toHaveBeenCalledWith(
      "42",
      classified.fields,
      "Asia/Kolkata",
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      99,
      "Updated your last expense to ₹200 (Travel).",
    );
  });
});
