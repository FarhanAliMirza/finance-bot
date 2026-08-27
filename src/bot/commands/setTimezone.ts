import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getUserTimeZone, setUserTimeZone } from "../../db/userSettings";
import { canonicalTimeZone } from "../../utils/dates";

export const SET_TIMEZONE_USAGE = "/setTimezone Asia/Kolkata";

export const UNKNOWN_TIMEZONE_TEXT = `Unknown timezone. Usage: ${SET_TIMEZONE_USAGE}`;

export function currentTimezoneMessage(timeZone: string): string {
  return `Your timezone is ${timeZone}.\n\nUsage: ${SET_TIMEZONE_USAGE}`;
}

export function timezoneSavedMessage(timeZone: string): string {
  return `Timezone set to ${timeZone}.`;
}

/** Remainder after `/setTimezone` or `/setTimezone@Bot`. */
export function parseTimezoneArgument(text: string): string | undefined {
  const afterCommand = text.replace(/^\/setTimezone(?:@\S+)?/, "").trim();
  if (!afterCommand) return undefined;
  return afterCommand.split(/\s+/)[0];
}

export async function setTimezoneCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  if (!msg.text) return;

  const arg = parseTimezoneArgument(msg.text);
  if (!arg) {
    const current = await getUserTimeZone(userId);
    await bot.sendMessage(msg.chat.id, currentTimezoneMessage(current));
    return;
  }

  const canonical = canonicalTimeZone(arg);
  if (!canonical) {
    await bot.sendMessage(msg.chat.id, UNKNOWN_TIMEZONE_TEXT);
    return;
  }

  await setUserTimeZone(userId, canonical);
  await bot.sendMessage(msg.chat.id, timezoneSavedMessage(canonical));
}
