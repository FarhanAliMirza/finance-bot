import TelegramBot from "node-telegram-bot-api";
import { getUserBudget, updateUserBudget, setUserBudget } from "../../db/budget";
import { today } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";

export async function setBudgetCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  if (!msg.text){
    return;
  }
  const monthlyBudget = parseInt(msg.text.split(" ")[1]);
  if (isNaN(monthlyBudget)) {
    await bot.sendMessage(msg.chat.id, "Invalid budget amount. Usage: /setBudget (amount)");
    return;
  }
  const budget = await getUserBudget(userId);
  if (!budget) {
    await setUserBudget(userId, monthlyBudget);
    await bot.sendMessage(
      msg.chat.id,
      `💰 Monthly Budget set to ₹${monthlyBudget}`
    );
    return;
  }
  if (budget.monthlyBudget === monthlyBudget) {
    await bot.sendMessage(msg.chat.id, `💰 Monthly Budget set to ₹${monthlyBudget}`);
    return;
  }
  await updateUserBudget(userId, monthlyBudget);
  await bot.sendMessage(
    msg.chat.id,
    `💰 Monthly Budget updated from ₹${budget.monthlyBudget} to ₹${monthlyBudget}`
  );
}