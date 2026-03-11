# 💰 Finance Bot

> An intelligent Telegram bot that uses AI to track your expenses and manage your budget effortlessly.

---

## 🎯 Overview

**Finance Bot** is a smart expense tracking bot powered by Google's Gemini AI. Simply send natural language messages to the bot, and it automatically extracts expense details, categorizes them, and helps you manage your budget. No complicated forms or manual entry required!

### ✨ Key Features

- 🤖 **AI-Powered Expense Parsing** - Type expenses naturally, and AI understands them
- 💾 **Persistent Storage** - All expenses stored securely in PostgreSQL
- 💰 **Budget Management** - Set monthly budgets and get warnings when you're overspending
- 📊 **Smart Analytics** - View expenses by day, week, or month with detailed breakdowns
- 📈 **Category Tracking** - Automatically categorize expenses (Food, Transport, Shopping, Bills, Entertainment, Other)
- ⚡ **Real-time Feedback** - Instant confirmation when expenses are logged
- 🚨 **Budget Alerts** - Get notified when approaching your monthly limit

### 👾 Live Link : [Finance Tracker Bot](https://t.me/farhans_finance_tracker_bot)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Google Gemini API Key

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo>
   cd finance-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:

   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_token
   GOOGLE_API_KEY=your_gemini_api_key
   DATABASE_URL=your_postgresql_connection_string
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the bot**
   ```bash
   npm run dev        # Development mode with hot reload
   # or
   npm start          # Production mode
   ```

---

## 📱 Commands & Usage

### 💬 Logging Expenses

Simply **send any natural language message** describing your expense:

```
"Spent 150 on coffee this morning"
"Bought groceries for 2500 yesterday"
"Paid 500 for taxi"
"Movie ticket 250"
```

The bot will:

- ✅ Extract the amount
- 📂 Assign a category
- 💭 Save the description
- 📅 Record the date (or use today if not mentioned)

**Response:** `✅ Spent: ₹150 (Food)`

---

### 🔧 Available Commands

#### `/today` - Today's Expenses 📅

View all expenses logged today with:

- 📋 List of all transactions
- 💸 Largest spend of the day
- 📊 Daily total

```
Example Response:
📅 Today (2025-03-09)
• ₹150 (Food) - Coffee
• ₹500 (Transport) - Taxi

💰 Total spent: ₹650
🔢 Transactions: 2
💸 Largest spend: ₹500 (Transport) - Taxi
```

---

#### `/week` - Weekly Summary 📊

Get a complete breakdown of this week's spending:

- 📂 Category breakdown showing spending per category
- 💰 Total spent this week
- 🔢 Number of transactions
- 💸 Largest single expense
- 📆 Date range (Monday to today)

```
Example Response:
🗓️ Week (2025-03-03 - 2025-03-09)

Category Breakdown:
• Food: ₹450
• Transport: ₹800
• Shopping: ₹1200

📊 Total spent: ₹2450
🔢 Transactions: 8
💸 Largest spend: ₹600 (Shopping) - Shoes
```

---

#### `/month` - Monthly Analytics 📈

Detailed analysis of your spending this month:

- 📂 Category breakdown
- 💰 Total monthly spending
- 🔢 Number of transactions
- 💸 Largest expense
- 📊 Daily average spending (to help with budgeting)
- 📅 Date range (1st to today)

```
Example Response:
🗓️ Month (2025-03-01 - 2025-03-09)

Category Breakdown:
• Food: ₹2450
• Transport: ₹1800
• Shopping: ₹3200
• Bills: ₹5000

📊 Total spent: ₹12450
🔢 Transactions: 35
💸 Largest spend: ₹1200 (Shopping) - Electronics
📈 Daily average: ₹1383.33
```

---

#### `/budget` - Budget Status 💰

View your monthly budget and current spending status:

- 🗓️ Monthly budget amount
- 💰 Total spent so far this month
- 📊 Remaining budget
- 📈 Usage percentage (%)
- 💬 Smart comments based on your spending

**Budget Status Indicators:**

- `💰 You're on track with your budget` (< 50% used)
- `🚨 Careful — you're approaching your monthly budget limit` (> 80% used)

```
Example Response:
🗓️ Budget for the month of March is:
₹15000

Current Spendings : ₹12450
Budget Remaining: ₹2550
Usage: 83.00%

🚨 Careful — you're approaching your monthly budget limit.
```

---

#### `/setBudget <amount>` - Set Monthly Budget 📌

Set or update your monthly budget:

```
/setBudget 15000
```

**Responses:**

- `💰 Monthly Budget set to ₹15000` (New budget)
- `💰 Monthly Budget updated from ₹10000 to ₹15000` (Updated)

---

#### `/last` - Recent Expenses 📋

View your most recent expenses in a formatted list:

- Helps you quickly verify recent transactions
- Shows the latest entries first

---

#### `/start` - Welcome Message 🤖

Get a greeting when starting the bot:

```
🤖 Finance bot running...
```

---

## 🏗️ Project Structure

```
finance-bot/
├── src/
│   ├── index.ts                 # Entry point
│   ├── bot/
│   │   ├── bot.ts              # Main bot setup and commands router
│   │   ├── handlers.ts          # Message handler for expense parsing
│   │   └── commands/            # Command handlers
│   │       ├── today.ts         # Daily expenses
│   │       ├── week.ts          # Weekly summary
│   │       ├── month.ts         # Monthly analytics
│   │       ├── getBudget.ts     # View budget
│   │       ├── setBudget.ts     # Set/update budget
│   │       └── last.ts          # Recent expenses
│   ├── ai/
│   │   ├── gemini.ts            # Google Gemini API integration
│   │   └── prompts.ts           # AI prompt templates
│   ├── services/
│   │   ├── expenseParser.ts     # AI-powered expense extraction
│   │   ├── budgetService.ts     # Budget calculations & status
│   │   └── lastExpenseService.ts # Recent expenses formatting
│   ├── db/
│   │   ├── prisma.ts            # Prisma client setup
│   │   ├── budget.ts            # Budget DB operations
│   │   └── expenses.ts          # Expense DB operations
│   ├── types/
│   │   └── expense.ts           # TypeScript types
│   └── utils/
│       ├── dates.ts             # Date utility functions
│       └── validation.ts        # Input validation schemas
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database Schema

### Expense Model

Stores individual expense transactions:

| Field         | Type     | Description                                                       |
| ------------- | -------- | ----------------------------------------------------------------- |
| `id`          | UUID     | Unique expense identifier                                         |
| `userId`      | String   | Telegram user ID                                                  |
| `amount`      | Float    | Expense amount                                                    |
| `category`    | String   | Category (Food, Transport, Shopping, Bills, Entertainment, Other) |
| `description` | String   | What was purchased                                                |
| `createdAt`   | DateTime | When the expense was recorded                                     |

### UserBudget Model

Stores user's monthly budget:

| Field           | Type     | Description                        |
| --------------- | -------- | ---------------------------------- |
| `id`            | UUID     | Unique budget identifier           |
| `userId`        | String   | Telegram user ID (unique per user) |
| `monthlyBudget` | Integer  | Monthly budget amount              |
| `createdAt`     | DateTime | Budget creation date               |
| `updatedAt`     | DateTime | Last update date                   |

---

## 🤖 How AI Parsing Works

1. **Natural Language Input**: You send a message like "Spent 250 on lunch yesterday"
2. **Gemini Processing**: Google Gemini AI extracts:
   - Amount: 250
   - Category: Food (automatically determined)
   - Description: lunch
   - Date: Yesterday's date (intelligently resolved)
3. **Validation**: Response is validated using Zod schemas
4. **Storage**: Expense is saved to PostgreSQL
5. **Feedback**: Bot confirms with emoji-based response

**Smart Features:**

- ✅ Understands relative dates ("today", "yesterday", "last week")
- ✅ Extracts amounts from various formats
- ✅ Auto-categorizes expenses
- ✅ Handles typos and casual language
- ✅ Returns helpful error messages if unclear

---

## 🛠️ Tech Stack

| Component         | Technology                    |
| ----------------- | ----------------------------- |
| **Bot Framework** | node-telegram-bot-api         |
| **AI Engine**     | Google Generative AI (Gemini) |
| **Database**      | PostgreSQL                    |
| **ORM**           | Prisma                        |
| **Language**      | TypeScript                    |
| **Runtime**       | Node.js                       |
| **Validation**    | Zod                           |

---

## 📦 Dependencies

### Production

- `@google/generative-ai` - Gemini AI integration
- `@prisma/client` - Database ORM
- `@prisma/adapter-pg` - PostgreSQL adapter
- `node-telegram-bot-api` - Telegram bot framework
- `pg` - PostgreSQL driver
- `zod` - TypeScript-first schema validation

### Development

- `typescript` - Type safety
- `ts-node` - Run TypeScript directly
- `prisma` - Database tools
- `dotenv` - Environment variables
- Type definitions for Node.js and Telegram

---

## 🚨 Error Handling

The bot provides user-friendly error messages:

| Scenario                | Response                                             |
| ----------------------- | ---------------------------------------------------- |
| Invalid expense message | `❌ Couldn't understand the expense. Try again.`     |
| No budget set           | `No budget set! Set budget with /setBudget (amount)` |
| Invalid budget amount   | `Invalid budget amount. Usage: /setBudget (amount)`  |
| User not found          | `User not found.`                                    |
| No expenses in period   | `No expenses recorded [today/this week/this month].` |

---

## 💡 Tips & Tricks

### Natural Language Examples

The bot understands various formats:

- ✅ "Spent 500 on groceries"
- ✅ "150 for movie + popcorn"
- ✅ "Paid 2000 rent yesterday"
- ✅ "Transport: 100"
- ✅ "Coffee ₹45 this morning"

### Budget Smart Tips

- Set a realistic monthly budget with `/setBudget`
- Check `/week` to catch overspending early
- Review `/month` analytics to spot spending patterns
- Act on `🚨` alerts before hitting the limit

### Categories

Expenses are auto-categorized into:

- 🍕 Food
- 🚕 Transport
- 🛍️ Shopping
- 📄 Bills
- 🎬 Entertainment
- ❓ Other (for uncategorized)

---

## 🔒 Security & Privacy

- Bot uses Telegram's official API
- User data is stored only in your database
- No data is shared with third parties
- Environment variables keep sensitive info secure
- Use strong passwords for database access

---

## 📝 Available Scripts

```bash
npm run dev        # Run in development mode with TypeScript
npm run build      # Compile TypeScript and generate Prisma client
npm start          # Build and run in production
```

---

## 🐛 Troubleshooting

**Bot not responding?**

- Check if bot token is correct in `.env`
- Verify database connection
- Check Telegram polling is enabled

**Expenses not being saved?**

- Ensure database migrations are applied: `npx prisma migrate deploy`
- Verify DATABASE_URL in `.env`

**AI parsing fails?**

- Check Google Gemini API key is valid
- Verify API quota hasn't been exceeded
- Try using clearer expense descriptions

**Budget calculations wrong?**

- Ensure timezone is correct
- Check that expenses have proper `createdAt` dates

---

## 🎯 Future Enhancements

- 📊 Visual charts and graphs
- 📧 Email summaries
- 🔄 Recurring expense tracking
- 💳 Multi-currency support
- 📱 Mobile app companion
- 🏦 Bank integration
- 💬 Natural language queries ("How much did I spend on food?")

---

## 📄 License

ISC

---

## 👨‍💻 About

Created with ❤️ for smarter expense tracking.

**Need help?** Check the `/help` command or review this README.

---

_Last updated: March 2026_ 🚀
