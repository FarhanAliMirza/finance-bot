import TelegramBot from "node-telegram-bot-api";
import type { CallbackQuery } from "node-telegram-bot-api";
import { getExpensesBetween } from "../db/expenses";
import { getUserTimeZone } from "../db/userSettings";
import {
  buildExportFile,
  instantRangeForExport,
  type ExportFormat,
  type ExportWindow,
} from "../services/expenseExport";
import { exportRanges } from "../services/exportRangeStore";

export const NO_EXPENSES_EXPORT_TEXT = "No expenses in this period.";

const EXPORT_CALLBACK_PREFIX = "expx:";

export type ExportCallback =
  | {
      format: ExportFormat;
      window: { kind: "today" | "week" | "month" };
      userId: string;
    }
  | { format: ExportFormat; rangeId: string };

export function encodeNamedExportCallback(
  format: ExportFormat,
  period: "today" | "week" | "month",
  userId: string,
): string {
  return `${EXPORT_CALLBACK_PREFIX}${format}:${period}:${userId}`;
}

export function encodeRangeExportCallback(
  format: ExportFormat,
  rangeId: string,
): string {
  return `${EXPORT_CALLBACK_PREFIX}${format}:r:${rangeId}`;
}

export function parseExportCallbackData(
  data: string | undefined,
): ExportCallback | null {
  if (!data) return null;
  const named = /^expx:(csv|xlsx):(today|week|month):(.+)$/.exec(data);
  if (named) {
    return {
      format: named[1] as ExportFormat,
      window: { kind: named[2] as "today" | "week" | "month" },
      userId: named[3],
    };
  }
  const custom = /^expx:(csv|xlsx):r:(.+)$/.exec(data);
  if (custom) {
    return { format: custom[1] as ExportFormat, rangeId: custom[2] };
  }
  return null;
}

export function exportDownloadKeyboard(
  window: ExportWindow,
  userId: string,
  chatId: number,
): TelegramBot.InlineKeyboardMarkup {
  if (window.kind === "custom") {
    const range = exportRanges.create({
      userId,
      chatId,
      from: window.from,
      to: window.to,
    });
    return {
      inline_keyboard: [
        [
          {
            text: "Download CSV",
            callback_data: encodeRangeExportCallback("csv", range.id),
          },
          {
            text: "Download Excel",
            callback_data: encodeRangeExportCallback("xlsx", range.id),
          },
        ],
      ],
    };
  }
  return {
    inline_keyboard: [
      [
        {
          text: "Download CSV",
          callback_data: encodeNamedExportCallback("csv", window.kind, userId),
        },
        {
          text: "Download Excel",
          callback_data: encodeNamedExportCallback("xlsx", window.kind, userId),
        },
      ],
    ],
  };
}

async function answerCallback(
  bot: TelegramBot,
  query: CallbackQuery,
  text?: string,
) {
  try {
    await bot.answerCallbackQuery(query.id, text ? { text } : {});
  } catch (err) {
    console.error(err);
  }
}

export async function sendExpenseExport(
  bot: TelegramBot,
  input: {
    userId: string;
    chatId: number;
    format: ExportFormat;
    window: ExportWindow;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  const timeZone = await getUserTimeZone(input.userId);
  const range = instantRangeForExport(input.window, timeZone, now);
  if (!range) {
    await bot.sendMessage(input.chatId, NO_EXPENSES_EXPORT_TEXT);
    return;
  }

  const expenses = await getExpensesBetween(
    input.userId,
    range.startInclusive,
    range.endExclusive,
  );
  const file = await buildExportFile(
    expenses,
    input.window,
    timeZone,
    input.format,
    now,
  );
  if (file.empty) {
    await bot.sendMessage(input.chatId, NO_EXPENSES_EXPORT_TEXT);
    return;
  }

  await bot.sendDocument(
    input.chatId,
    file.buffer,
    { caption: file.caption },
    { filename: file.filename, contentType: file.contentType },
  );
}

/** Returns true when this callback was an export tap (caller should not treat it as a draft). */
export async function handleExportCallbackQuery(
  query: CallbackQuery,
  bot: TelegramBot,
): Promise<boolean> {
  if (!query.data?.startsWith(EXPORT_CALLBACK_PREFIX)) return false;

  const parsed = parseExportCallbackData(query.data);
  const tapperId = query.from?.id?.toString();
  const chatId = query.message?.chat.id;

  if (!parsed || !tapperId || chatId == null) {
    await answerCallback(bot, query);
    return true;
  }

  if ("userId" in parsed && parsed.userId !== tapperId) {
    await answerCallback(bot, query);
    return true;
  }

  let window: ExportWindow;
  let ownerId: string;
  if ("rangeId" in parsed) {
    const stored = exportRanges.get(parsed.rangeId);
    if (!stored) {
      await answerCallback(bot, query, "This expired");
      return true;
    }
    if (stored.userId !== tapperId) {
      await answerCallback(bot, query);
      return true;
    }
    window = { kind: "custom", from: stored.from, to: stored.to };
    ownerId = stored.userId;
  } else {
    window = parsed.window;
    ownerId = parsed.userId;
  }

  try {
    await sendExpenseExport(bot, {
      userId: ownerId,
      chatId,
      format: parsed.format,
      window,
    });
    await answerCallback(bot, query);
  } catch (err) {
    console.error(err);
    await answerCallback(bot, query, "Couldn't export");
  }
  return true;
}
