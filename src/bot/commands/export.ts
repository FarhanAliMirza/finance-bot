import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { parseIsoDate } from "../../utils/dates";
import type { ExportFormat, ExportWindow } from "../../services/expenseExport";
import { sendExpenseExport } from "../exportHandlers";

export const EXPORT_USAGE_TEXT = `Usage: /export [today|week|month]
Or: /export 2026-08-01 2026-08-15
Add csv or excel to pick a format (CSV is the default).`;

export type ParsedExportArgs =
  | { ok: true; format: ExportFormat; window: ExportWindow }
  | { ok: false };

const FORMAT_ALIASES: Record<string, ExportFormat> = {
  csv: "csv",
  excel: "xlsx",
  xlsx: "xlsx",
};

const NAMED_PERIODS = new Set<ExportWindow["kind"]>(["today", "week", "month"]);

/** Remainder after `/export` or `/export@Bot`, including format and period. */
export function parseExportArgs(text: string): ParsedExportArgs {
  const rest = text.replace(/^\/export(?:@\S+)?/i, "").trim();
  const tokens = rest === "" ? [] : rest.split(/\s+/);

  let format: ExportFormat | undefined;
  let period: "today" | "week" | "month" | undefined;
  const dates: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (FORMAT_ALIASES[lower]) {
      if (format) return { ok: false };
      format = FORMAT_ALIASES[lower];
      continue;
    }
    if (NAMED_PERIODS.has(lower as "today" | "week" | "month")) {
      if (period || dates.length > 0) return { ok: false };
      period = lower as "today" | "week" | "month";
      continue;
    }
    if (parseIsoDate(token)) {
      if (period || dates.length >= 2) return { ok: false };
      dates.push(token);
      continue;
    }
    return { ok: false };
  }

  const resolvedFormat = format ?? "csv";
  if (dates.length === 1) {
    return {
      ok: true,
      format: resolvedFormat,
      window: { kind: "custom", from: dates[0], to: dates[0] },
    };
  }
  if (dates.length === 2) {
    const [a, b] = dates;
    const from = a <= b ? a : b;
    const to = a <= b ? b : a;
    return {
      ok: true,
      format: resolvedFormat,
      window: { kind: "custom", from, to },
    };
  }
  return {
    ok: true,
    format: resolvedFormat,
    window: { kind: period ?? "month" },
  };
}

export async function exportCommand(
  msg: Message,
  bot: TelegramBot,
  now: Date = new Date(),
) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  if (!msg.text) return;

  const parsed = parseExportArgs(msg.text);
  if (!parsed.ok) {
    await bot.sendMessage(msg.chat.id, EXPORT_USAGE_TEXT);
    return;
  }

  await sendExpenseExport(bot, {
    userId,
    chatId: msg.chat.id,
    format: parsed.format,
    window: parsed.window,
    now,
  });
}
