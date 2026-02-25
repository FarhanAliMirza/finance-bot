import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../db/prisma";
import { parseExpense } from "../services/expenseParser";
import type { Message } from "node-telegram-bot-api";

export async function handleMessage(msg: Message, bot: TelegramBot) {
  try {
    if (!msg.text) return;
    const expense = await parseExpense(msg.text);

    await prisma.expense.create({
      data: {
        userId: msg.from!.id.toString(),
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        createdAt: new Date(expense.date),
      },
    });

    await bot.sendMessage(
      msg.chat.id,
      `✅ Saved: ₹${expense.amount} (${expense.category})`,
    );
  } catch (err) {
    console.error(err);
    await bot.sendMessage(
      msg.chat.id,
      "❌ Couldn't understand the expense. Try again.",
    );
  }
}
