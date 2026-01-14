import { bot } from "./index";
import { prisma } from "../db/prisma";
import { parseExpense } from "../services/expenseParser";

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  try {
    const expense = await parseExpense(msg.text);

    await prisma.expense.create({
      data: {
        userId: msg.from!.id.toString(),
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        createdAt: new Date(expense.date)
      }
    });

    await bot.sendMessage(
      msg.chat.id,
      `✅ Saved: ₹${expense.amount} (${expense.category})`
    );
  } catch (err) {
    console.error(err);
    await bot.sendMessage(
      msg.chat.id,
      "❌ Couldn't understand the expense. Try again."
    );
  }
});
