import type TelegramBot from "node-telegram-bot-api";

export const HELP_TEXT = `I help you track spending with plain English — no forms.

Send an expense anytime. You'll get Confirm and Undo on each log. If you don't say how you paid (Cash, Card, or UPI), I'll ask before saving.

Ask questions like “how much did I spend today?” or “how much on UPI this month?”
Edit the last saved expense with “change that to 200”, “make it Travel”, or “make it UPI”.

A monthly budget is optional — set one later with /setBudget.

Commands:
/start — welcome / first-run walkthrough
/help — this list
/today — today's expenses
/week — this week's spending
/month — this month's spending
/export — download this month as CSV (add excel, week, today, or dates)
/methods — this month's Cash / Card / UPI breakdown
/budget — budget status
/setBudget <amount> — set or update monthly budget
/setTimezone — show timezone
/setTimezone <IANA> — set timezone, e.g. Asia/Kolkata
/last — recent expenses
/delete — undo last expense`;

export const UNKNOWN_COMMAND_TEXT = "Unknown command. Try /help.";

/** Daily-use commands shown in Telegram's / menu. Other commands still work when typed. */
export const BOT_MENU_COMMANDS: TelegramBot.BotCommand[] = [
  { command: "today", description: "Today's expenses" },
  { command: "week", description: "This week's spending" },
  { command: "last", description: "Recent expenses" },
  { command: "delete", description: "Undo last expense" },
];

/** First slash token without @bot suffix, e.g. "/today" from "/today@MyBot extra". */
export function parseSlashCommand(text: string): string | null {
  if (!text.startsWith("/")) return null;
  const token = text.split(/\s/, 1)[0] ?? "";
  const name = token.split("@", 1)[0] ?? "";
  return name.length > 1 ? name : "/";
}
