import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallbackQuery, Message } from "node-telegram-bot-api";
import type TelegramBot from "node-telegram-bot-api";

vi.mock("../db/expenses", () => ({
  getExpensesBetween: vi.fn(),
}));
vi.mock("../db/userSettings", () => ({
  getUserTimeZone: vi.fn(),
}));

import { getExpensesBetween } from "../db/expenses";
import { getUserTimeZone } from "../db/userSettings";
import { exportCommand } from "./commands/export";
import {
  encodeNamedExportCallback,
  encodeRangeExportCallback,
  exportDownloadKeyboard,
  handleExportCallbackQuery,
  parseExportCallbackData,
  NO_EXPENSES_EXPORT_TEXT,
} from "./exportHandlers";
import { exportRanges } from "../services/exportRangeStore";

const NOW = new Date("2026-08-26T20:00:00.000Z");
const USER = "42";
const CHAT = 99;

function fakeBot() {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    sendDocument: vi.fn().mockResolvedValue({ message_id: 2 }),
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
  };
}

function fakeMsg(text: string): Message {
  return {
    text,
    from: { id: Number(USER) },
    chat: { id: CHAT },
  } as Message;
}

function fakeQuery(data: string, fromId = Number(USER)): CallbackQuery {
  return {
    id: "cb-1",
    data,
    from: { id: fromId },
    message: { chat: { id: CHAT }, message_id: 5 },
  } as CallbackQuery;
}

describe("export callback_data", () => {
  it("stays under Telegram's 64-byte limit", () => {
    const named = encodeNamedExportCallback("xlsx", "month", "123456789012");
    expect(named.length).toBeLessThanOrEqual(64);
    expect(parseExportCallbackData(named)).toEqual({
      format: "xlsx",
      window: { kind: "month" },
      userId: "123456789012",
    });
    const range = encodeRangeExportCallback("csv", "abcdef0123");
    expect(range.length).toBeLessThanOrEqual(64);
    expect(parseExportCallbackData(range)).toEqual({
      format: "csv",
      rangeId: "abcdef0123",
    });
  });
});

describe("exportDownloadKeyboard", () => {
  afterEach(() => {
    exportRanges.clearAll();
  });

  it("uses named-period callbacks for today/week/month", () => {
    const keyboard = exportDownloadKeyboard({ kind: "today" }, USER, CHAT);
    const buttons = keyboard.inline_keyboard[0];
    expect(buttons.map((b) => b.text)).toEqual([
      "Download CSV",
      "Download Excel",
    ]);
    expect(buttons[0].callback_data).toBe("expx:csv:today:42");
    expect(buttons[1].callback_data).toBe("expx:xlsx:today:42");
  });
});

describe("exportCommand", () => {
  beforeEach(() => {
    vi.mocked(getUserTimeZone).mockResolvedValue("Asia/Kolkata");
    vi.mocked(getExpensesBetween).mockReset();
  });

  it("sends a CSV document for this month", async () => {
    vi.mocked(getExpensesBetween).mockResolvedValue([
      {
        createdAt: new Date("2026-08-10T10:00:00.000Z"),
        amount: 150,
        category: "Food",
        paymentMethod: "UPI",
        description: "Coffee",
      },
    ] as never);
    const bot = fakeBot();
    await exportCommand(fakeMsg("/export"), bot as unknown as TelegramBot, NOW);

    expect(bot.sendDocument).toHaveBeenCalledTimes(1);
    const [, buffer, options, fileOptions] = bot.sendDocument.mock.calls[0];
    expect(fileOptions.filename).toBe("expenses-2026-08.csv");
    expect(options.caption).toBe("August 2026 · 1 expense");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString("utf8")).toContain("Coffee");
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it("sends empty copy and no document when the period has no expenses", async () => {
    vi.mocked(getExpensesBetween).mockResolvedValue([] as never);
    const bot = fakeBot();
    await exportCommand(fakeMsg("/export week"), bot as unknown as TelegramBot, NOW);

    expect(bot.sendMessage).toHaveBeenCalledWith(CHAT, NO_EXPENSES_EXPORT_TEXT);
    expect(bot.sendDocument).not.toHaveBeenCalled();
  });
});

describe("handleExportCallbackQuery", () => {
  beforeEach(() => {
    vi.mocked(getUserTimeZone).mockResolvedValue("Asia/Kolkata");
    vi.mocked(getExpensesBetween).mockReset();
    vi.mocked(getExpensesBetween).mockResolvedValue([
      {
        createdAt: new Date("2026-08-10T10:00:00.000Z"),
        amount: 150,
        category: "Food",
        paymentMethod: "UPI",
        description: "Coffee",
      },
    ] as never);
  });

  afterEach(() => {
    exportRanges.clearAll();
  });

  it("exports for the user who opened the summary", async () => {
    const bot = fakeBot();
    const handled = await handleExportCallbackQuery(
      fakeQuery("expx:csv:month:42"),
      bot as unknown as TelegramBot,
    );
    expect(handled).toBe(true);
    expect(bot.sendDocument).toHaveBeenCalledTimes(1);
    expect(getExpensesBetween).toHaveBeenCalledWith(
      USER,
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("ignores taps from another Telegram user", async () => {
    const bot = fakeBot();
    const handled = await handleExportCallbackQuery(
      fakeQuery("expx:csv:month:42", 99),
      bot as unknown as TelegramBot,
    );
    expect(handled).toBe(true);
    expect(bot.sendDocument).not.toHaveBeenCalled();
    expect(getExpensesBetween).not.toHaveBeenCalled();
  });

  it("does not treat draft callbacks as export taps", async () => {
    const bot = fakeBot();
    const handled = await handleExportCallbackQuery(
      fakeQuery("exp:ok:draft-id"),
      bot as unknown as TelegramBot,
    );
    expect(handled).toBe(false);
    expect(bot.sendDocument).not.toHaveBeenCalled();
  });
});
