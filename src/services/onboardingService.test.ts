import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallbackQuery, Message } from "node-telegram-bot-api";
import type TelegramBot from "node-telegram-bot-api";
import { OnboardingStep } from "../../generated/prisma";

vi.mock("../db/onboarding", () => ({
  getUserOnboarding: vi.fn(),
  markOnboardingComplete: vi.fn(),
  upsertUserOnboarding: vi.fn(),
  userHasPriorActivity: vi.fn(),
}));

vi.mock("../db/budget", () => ({
  getUserBudget: vi.fn(),
  setUserBudget: vi.fn(),
  updateUserBudget: vi.fn(),
}));

import {
  getUserOnboarding,
  markOnboardingComplete,
  upsertUserOnboarding,
  userHasPriorActivity,
} from "../db/onboarding";
import { getUserBudget, setUserBudget, updateUserBudget } from "../db/budget";
import {
  BUDGET_PROMPT_TEXT,
  SKIPPED_COMPLETE_TEXT,
  SKIP_BUDGET_CALLBACK_DATA,
  handleOnboardingCallbackQuery,
  handleOnboardingMessage,
  handleStartCommand,
  isSkipBudgetText,
  parseBudgetAmount,
} from "./onboardingService";

const getOnboarding = vi.mocked(getUserOnboarding);
const markComplete = vi.mocked(markOnboardingComplete);
const upsertOnboarding = vi.mocked(upsertUserOnboarding);
const hasPriorActivity = vi.mocked(userHasPriorActivity);
const getBudget = vi.mocked(getUserBudget);
const setBudget = vi.mocked(setUserBudget);
const updateBudget = vi.mocked(updateUserBudget);

const USER_ID = 42;
const CHAT_ID = 99;

function onboardingRecord(
  step: OnboardingStep,
  completedAt: Date | null = null,
) {
  return {
    id: "ob-1",
    userId: String(USER_ID),
    step,
    completedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function message(text: string): Message {
  return {
    message_id: 1,
    date: 0,
    chat: { id: CHAT_ID, type: "private" },
    from: { id: USER_ID, is_bot: false, first_name: "Test" },
    text,
  } as Message;
}

function mockBot() {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 10 }),
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
    editMessageReplyMarkup: vi.fn().mockResolvedValue(true),
  };
}

type BotMock = ReturnType<typeof mockBot>;

function asBot(bot: BotMock): TelegramBot {
  return bot as unknown as TelegramBot;
}

function skipCallback(): CallbackQuery {
  return {
    id: "cq-1",
    from: { id: USER_ID, is_bot: false, first_name: "Test" },
    chat_instance: "1",
    data: SKIP_BUDGET_CALLBACK_DATA,
    message: {
      message_id: 7,
      date: 0,
      chat: { id: CHAT_ID, type: "private" },
      text: BUDGET_PROMPT_TEXT,
    },
  } as CallbackQuery;
}

beforeEach(() => {
  vi.clearAllMocks();
  markComplete.mockResolvedValue(onboardingRecord(OnboardingStep.COMPLETED, new Date()));
  upsertOnboarding.mockResolvedValue(onboardingRecord(OnboardingStep.SET_BUDGET));
  hasPriorActivity.mockResolvedValue(false);
  getBudget.mockResolvedValue(null);
  setBudget.mockResolvedValue({
    id: "b-1",
    userId: String(USER_ID),
    monthlyBudget: 15000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe("isSkipBudgetText", () => {
  it("accepts skip in any casing, with surrounding spaces", () => {
    expect(isSkipBudgetText("skip")).toBe(true);
    expect(isSkipBudgetText("Skip")).toBe(true);
    expect(isSkipBudgetText("SKIP")).toBe(true);
    expect(isSkipBudgetText("  skip  ")).toBe(true);
  });

  it("does not treat other messages as skip", () => {
    expect(isSkipBudgetText("skip please")).toBe(false);
    expect(isSkipBudgetText("15000")).toBe(false);
    expect(isSkipBudgetText("/setBudget 15000")).toBe(false);
  });
});

describe("parseBudgetAmount", () => {
  it("parses a bare number or /setBudget amount", () => {
    expect(parseBudgetAmount("15000")).toBe(15000);
    expect(parseBudgetAmount("/setBudget 15000")).toBe(15000);
  });

  it("returns null for skip and other text", () => {
    expect(parseBudgetAmount("skip")).toBeNull();
    expect(parseBudgetAmount("Spent 150 on coffee")).toBeNull();
  });
});

describe("handleOnboardingMessage", () => {
  it("completes onboarding without writing a budget when the user types skip", async () => {
    getOnboarding.mockResolvedValue(onboardingRecord(OnboardingStep.SET_BUDGET));
    const bot = mockBot();

    const handled = await handleOnboardingMessage(message("Skip"), asBot(bot));

    expect(handled).toBe(true);
    expect(markComplete).toHaveBeenCalledWith(String(USER_ID));
    expect(setBudget).not.toHaveBeenCalled();
    expect(updateBudget).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(CHAT_ID, SKIPPED_COMPLETE_TEXT);
    expect(bot.sendMessage.mock.calls.some((call) => String(call[1]).includes("/setBudget"))).toBe(
      true,
    );
  });

  it("saves a budget and completes when the user enters a number", async () => {
    getOnboarding.mockResolvedValue(onboardingRecord(OnboardingStep.SET_BUDGET));
    const bot = mockBot();

    const handled = await handleOnboardingMessage(message("15000"), asBot(bot));

    expect(handled).toBe(true);
    expect(setBudget).toHaveBeenCalledWith(String(USER_ID), 15000);
    expect(markComplete).toHaveBeenCalledWith(String(USER_ID));
    expect(bot.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      "💰 Monthly Budget set to ₹15000",
    );
  });

  it("re-prompts with a Skip button when the reply is not a number or skip", async () => {
    getOnboarding.mockResolvedValue(onboardingRecord(OnboardingStep.SET_BUDGET));
    const bot = mockBot();

    const handled = await handleOnboardingMessage(
      message("Spent 150 on coffee"),
      asBot(bot),
    );

    expect(handled).toBe(true);
    expect(markComplete).not.toHaveBeenCalled();
    expect(setBudget).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining("This step is optional"),
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Skip", callback_data: SKIP_BUDGET_CALLBACK_DATA }],
          ],
        },
      },
    );
  });

  it("sends the budget prompt with a Skip button when starting onboarding", async () => {
    getOnboarding.mockResolvedValue(null);
    const bot = mockBot();

    await handleOnboardingMessage(message("hi"), asBot(bot));

    expect(bot.sendMessage).toHaveBeenCalledWith(CHAT_ID, BUDGET_PROMPT_TEXT, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Skip", callback_data: SKIP_BUDGET_CALLBACK_DATA }],
        ],
      },
    });
    expect(markComplete).not.toHaveBeenCalled();
  });

  it("does not intercept messages after onboarding is complete (including skipped)", async () => {
    getOnboarding.mockResolvedValue(
      onboardingRecord(OnboardingStep.COMPLETED, new Date()),
    );
    const bot = mockBot();

    const handled = await handleOnboardingMessage(
      message("Spent 150 on coffee"),
      asBot(bot),
    );

    expect(handled).toBe(false);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });
});

describe("handleOnboardingCallbackQuery", () => {
  it("completes onboarding without a budget when Skip is tapped", async () => {
    getOnboarding.mockResolvedValue(onboardingRecord(OnboardingStep.SET_BUDGET));
    const bot = mockBot();

    const handled = await handleOnboardingCallbackQuery(skipCallback(), asBot(bot));

    expect(handled).toBe(true);
    expect(markComplete).toHaveBeenCalledWith(String(USER_ID));
    expect(setBudget).not.toHaveBeenCalled();
    expect(updateBudget).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(CHAT_ID, SKIPPED_COMPLETE_TEXT);
    expect(bot.editMessageReplyMarkup).toHaveBeenCalled();
    expect(bot.answerCallbackQuery).toHaveBeenCalledWith("cq-1", { text: "Skipped" });
  });

  it("does not re-complete if the user already finished onboarding", async () => {
    getOnboarding.mockResolvedValue(
      onboardingRecord(OnboardingStep.COMPLETED, new Date()),
    );
    const bot = mockBot();

    const handled = await handleOnboardingCallbackQuery(skipCallback(), asBot(bot));

    expect(handled).toBe(true);
    expect(markComplete).not.toHaveBeenCalled();
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it("leaves expense draft callbacks to the expense handler", async () => {
    const bot = mockBot();
    const query = {
      ...skipCallback(),
      data: "exp:ok:123e4567-e89b-12d3-a456-426614174000",
    } as CallbackQuery;

    const handled = await handleOnboardingCallbackQuery(query, asBot(bot));

    expect(handled).toBe(false);
    expect(markComplete).not.toHaveBeenCalled();
    expect(bot.answerCallbackQuery).not.toHaveBeenCalled();
  });
});

describe("handleStartCommand", () => {
  it("does not re-force a budget for users who already completed onboarding", async () => {
    getOnboarding.mockResolvedValue(
      onboardingRecord(OnboardingStep.COMPLETED, new Date()),
    );
    const bot = mockBot();

    await handleStartCommand(message("/start"), asBot(bot));

    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining("Welcome back"),
    );
    expect(upsertOnboarding).not.toHaveBeenCalled();
    expect(setBudget).not.toHaveBeenCalled();
  });
});
