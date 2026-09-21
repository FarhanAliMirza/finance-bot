# 💰 Finance Bot

> An intelligent Telegram bot that uses Jev and Gemini to track your expenses and manage your budget effortlessly.

---

## 🎯 Overview

**Finance Bot** is a smart expense tracking bot powered by Google's Gemini AI. Send natural language messages to log expenses, ask about spending, or edit your last expense. No complicated forms or manual entry required!

### ✨ Key Features

- 👋 **First-run onboarding** - New users get a short walkthrough (features + optional budget setup) once
- 🤖 **AI-Powered Expense Parsing** - Type expenses naturally, and AI understands them
- 💬 **Free-text questions** - Ask how much you spent today, this week, this month, or on a category
- ✏️ **Edit last expense** - “Change that to 200” updates the latest saved expense
- 💾 **Persistent Storage** - All expenses stored securely in PostgreSQL
- 💰 **Budget Management** - Set a monthly budget now or later; optional during onboarding
- 📊 **Smart Analytics** - View expenses by day, week, or month with detailed breakdowns
- 📤 **Export** - Download a period as CSV (or Excel) with `/export` or the buttons on `/today`, `/week`, `/month`
- 📈 **Category Tracking** - Automatically categorize expenses (Food, Travel, Utilities, Shopping, Medical, Subscription, Entertainment, Gift, Investment, Other)
- 💳 **Payment methods** - Cash, Card, or UPI (inferred from the message, or asked with buttons before save)
- ⚡ **Real-time Feedback** - Confirm or undo a draft, then a richer confirmation after save
- 🗑️ **Quick Undo** - Undo on the confirmation (that expense), or `/delete` for the latest one
- 🚨 **Budget Pace** - Remaining budget and pace status when a monthly budget is set

### 👾 Live Link : [Finance Tracker Bot](https://t.me/farhans_finance_tracker_bot)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- TypeSafe API key
- Google Gemini API key

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
   Copy [`.env.example`](.env.example) to `.env` and fill in values:

   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_token
   TYPESAFE_API_KEY=your_typesafe_api_key
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=your_postgresql_connection_string
   DIRECT_URL=your_postgresql_direct_url
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

For feature work while live users stay on production, see [DEVELOPMENT.md](DEVELOPMENT.md) (feature branches, separate test bot/DB, merge and redeploy).

---

## 📱 Commands & Usage

### 👋 First-run onboarding

New users (no prior expenses/budget and onboarding not finished) are guided once:

1. Welcome and what the bot does
2. How to log expenses in natural language (with examples)
3. Optional monthly budget — reply with a number, `/setBudget <amount>`, tap **Skip**, or type `skip`

Skipping finishes onboarding with **no** `UserBudget` row. Set one later with `/setBudget`.

After that, free-text is classified as a new expense, a question, or an edit to your last expense. Returning users skip onboarding; `/start` shows a short welcome.

### 💬 Logging Expenses

Send a **clear expense log** in natural language:

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
- 📅 Dates and summaries use **your timezone** (default `Asia/Kolkata`; change with `/setTimezone`)

You first get a **draft** with **Confirm** and **Undo**. If the message does not say how you paid, the draft asks **Cash / Card / UPI** (and Cancel) instead — tapping a method saves. Drafts that already have a method auto-save after 3 minutes; drafts still waiting for a method expire **without** saving. Undo before save cancels the draft; Undo after save deletes **that** expense (`/delete` still removes the latest one).

**Draft:**

```
📝 Confirm this expense?
₹150 (Food, UPI)
Coffee
27 Aug
```

**After save:** `✅ Logged ₹150 (Food, UPI)` plus description and date. If a budget is set, remaining budget, usage %, and pace status are included (for example `On track for this point in the month.`). You can also log `"Paid 150 via UPI"` / `"swiped the card"` / `"cash"` — or pick the method from buttons when it is missing.

---

### ❓ Questions and edits (free text)

Slash commands (`/today`, `/week`, `/month`, `/budget`, `/last`, `/export`) are unchanged. For **non-command** messages that are not a new expense log, the bot answers in short natural language (totals always come from the database, never from the model).

```
"how much I spent today"
"what was spend on food this week"
"how much on UPI this month"
"what's my budget"
"last 3 expenses"
```

Example replies:

```
You spent ₹1,240 today across 3 expenses.
Food this week is ₹3,200 (4 expenses).
No food expenses this week yet.
This month you've used ₹8,400 of your ₹15,000 budget — ₹6,600 left, on track for this point in the month.
Your last expense was ₹150 on Food — Lunch at cafe, 27 Aug.
```

Edit the **latest saved expense** (not a draft that was never confirmed):

```
"change that to 200"
"make it Travel"
"make it UPI"
```

Reply: `Updated your last expense to ₹200 (Travel).` If you have no saved expense: `You don't have a saved expense to edit yet.`

---

### 🔧 Available Commands

#### `/start` - Start / welcome 👋

- New users: begins (or restarts) the onboarding walkthrough
- Returning users: short welcome; normal expense logging continues

#### `/help` - Command list

Lists every command, plus how to log expenses in plain English (including Cash / Card / UPI), Confirm/Undo, optional budget (`/setBudget`), and timezone (`/setTimezone`).

The Telegram `/` menu shows daily-use commands only: `/today`, `/week`, `/last`, `/delete`. Other commands (including `/methods` and `/export`) still work when typed.

#### `/today` - Today's Expenses 📅

View all expenses logged today with:

- 📋 List of all transactions
- 💸 Largest spend of the day
- 📊 Daily total

```
Example Response:
🗓️ Today (2025-03-09)

• ₹150 (Food, UPI) - Coffee
• ₹500 (Travel) - Taxi

💸 Largest spend: ₹500 (Travel)
📊 Total spent: ₹650
🔢 Transactions: 2
```

---

#### `/week` - Weekly Summary 📊

Get a complete breakdown of this week's spending:

- 📂 Category breakdown showing spending per category
- 💰 Total spent this week
- 🔢 Number of transactions
- 💸 Largest single expense
- 📆 Date range (Monday to today, in your timezone)

```
Example Response:
🗓️ Week (2025-03-03 - 2025-03-09)

Category Breakdown:
• Food: ₹450
• Travel: ₹800
• Shopping: ₹1200

📊 Total spent: ₹2450
🔢 Transactions: 8
💸 Largest spend: ₹600 (Shopping) - Shoes

Payment methods:
• UPI: ₹1,250 (5)
• Cash: ₹800 (2)
• Card: ₹400 (1)
```

---

#### `/month` - Monthly Analytics 📈

Detailed analysis of your spending this month:

- 📂 Category breakdown
- 💰 Total monthly spending
- 🔢 Number of transactions
- 💸 Largest expense
- 📊 Daily average spending (to help with budgeting)
- 📅 Date range (1st to today, in your timezone)

```
Example Response:
🗓️ Month (2025-03-01 - 2025-03-09)

Category Breakdown:
• Food: ₹2450
• Travel: ₹1800
• Shopping: ₹3200
• Utilities: ₹5000

📊 Total spent: ₹12450
🔢 Transactions: 35
💸 Largest spend: ₹1200 (Shopping) - Electronics
📈 Daily average: ₹1383.33
```

When there are expenses, `/today`, `/week`, and `/month` include **Download CSV** and **Download Excel** buttons for that window. Empty summaries have no download buttons.

---

#### `/export` - Download expenses 📤

Download your expenses for a period as a spreadsheet. Default is **this month** as **CSV**. Excel only when you ask (`excel` / `xlsx`, or the Excel button on a summary).

```
/export
/export csv
/export excel
/export week
/export month
/export today
/export 2026-08-01 2026-08-15
/export excel week
/export week excel
```

Dates are inclusive in **your timezone**. The file is one row per expense (Date, Amount, Category, Payment method, Description), oldest first. Payment method is `Cash` / `Card` / `UPI`, or `Unspecified` when missing.

If there are no expenses in that period: `No expenses in this period.` (no file).

Not in Telegram's `/` menu — type `/export`, or use the buttons on `/today`, `/week`, `/month`, and matching questions like “how much this month”.

---

#### `/methods` - Payment methods this month 💳

Amount and count per payment method for the current month (Cash, Card, UPI). Old rows with no method show as `Unspecified`. Also appended on `/week` and `/month`. Not in Telegram's `/` menu — type `/methods`.

```
Example Response:
Payment methods:
• UPI: ₹8,400 (12)
• Cash: ₹1,200 (8)
• Card: ₹3,000 (2)
```

---

#### `/budget` - Budget Status 💰

View your monthly budget and current spending status:

- 🗓️ Monthly budget amount
- 💰 Total spent so far this month
- 📊 Remaining budget
- 📈 Usage percentage (%)
- 💬 Smart comments based on your spending

**Budget Status Indicators** (pace vs expected spend this far into the month):

- `On track for this point in the month.`
- `Spending faster than the month — …% used.` (early-month variant mentions most of the month left)
- `Under pace — plenty of budget left for the rest of the month.`
- `Over by ₹…` when spent is over the monthly limit (remaining can be negative)

```
Example Response:
🗓️ Budget for the month of March is :
₹15,000

Current Spendings : ₹12,450
Budget remaining: ₹2,550
Usage: 83%
Spending faster than the month — 83% used.
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

#### `/setTimezone` - Timezone 🌍

Day, week, month, and budget windows use your IANA timezone. Every user defaults to **Asia/Kolkata** until they set one.

```
/setTimezone
/setTimezone Asia/Kolkata
```

**Responses:**

- No argument — current timezone and usage:
  ```
  Your timezone is Asia/Kolkata.

  Usage: /setTimezone Asia/Kolkata
  ```
- Valid IANA name: `Timezone set to Asia/Kolkata.`
- Unknown name: `Unknown timezone. Usage: /setTimezone Asia/Kolkata`

`/setTimezone` is listed in `/help` but is not in Telegram's `/` menu.

---

#### `/last` - Last 5 Expenses 📋

View your **last 5** expenses (newest first) plus a total of those entries:

- Helps you quickly verify recent transactions
- Shows up to 5 of the latest entries
- Includes a combined total for the listed expenses

```
Example Response:
🧾 Last 5 expenses:

- ₹150 (Food, UPI) - Coffee
- ₹500 (Travel) - Taxi
- ₹250 (Entertainment) - Movie ticket
- ₹1200 (Shopping) - Shoes
- ₹80 (Food) - Snacks

💸 Total: 2180
```

---

#### `/delete` - Delete Last Expense 🗑️

Deletes your **most recent** expense:

- Useful for undoing a mistaken entry
- Always targets the latest expense for your user
- Separate from **Undo** on a confirmation, which deletes that specific (draft-saved) expense

**Responses:**

- Success:
  ```
  📝 Expense deleted:
  - ₹150 (Food) - Coffee
  ```
- Nothing to delete: `📝 You don't have any expenses to delete.`

---

## 🏗️ Project Structure

```
finance-bot/
├── src/
│   ├── index.ts                 # Entry point
│   ├── bot/
│   │   ├── bot.ts              # Main bot setup and commands router
│   │   ├── handlers.ts          # Free-text router (log / question / edit last)
│   │   ├── expenseDraftHandlers.ts # Confirm/Undo or Cash/Card/UPI draft
│   │   ├── exportHandlers.ts      # CSV/Excel download buttons + callbacks
│   │   └── commands/            # Command handlers
│   │       ├── today.ts         # Daily expenses
│   │       ├── week.ts          # Weekly summary
│   │       ├── month.ts         # Monthly analytics
│   │       ├── export.ts        # /export CSV or Excel
│   │       ├── methods.ts       # Payment-method breakdown this month
│   │       ├── getBudget.ts     # View budget
│   │       ├── setBudget.ts     # Set/update budget
│   │       ├── setTimezone.ts   # View/set IANA timezone
│   │       ├── last.ts          # Last 5 expenses
│   │       └── delete.ts        # Delete most recent expense
│   ├── ai/
│   │   ├── gemini.ts            # Google Gemini API integration
│   │   ├── typesafe.ts          # Jev intent choice + confidence policy
│   │   └── prompts.ts           # AI prompt templates
│   ├── services/
│   │   ├── expenseParser.ts     # AI-powered expense extraction
│   │   ├── intentClassifier.ts  # Gemini intent + slot extraction
│   │   ├── questionService.ts   # DB-backed NL answers
│   │   ├── editLastExpenseService.ts # Patch latest saved expense
│   │   ├── budgetService.ts     # Budget calculations & status
│   │   ├── lastExpenseService.ts # Recent expenses formatting
│   │   ├── deleteExpenseService.ts # Delete most recent expense
│   │   ├── onboardingService.ts # First-run walkthrough (optional budget)
│   │   ├── expenseDraftStore.ts # In-memory drafts + 3 min auto-save
│   │   ├── expenseExport.ts     # CSV / Excel file build
│   │   └── exportRangeStore.ts  # Short-lived custom export windows
│   ├── db/
│   │   ├── prisma.ts            # Prisma client setup
│   │   ├── budget.ts            # Budget DB operations
│   │   ├── expenses.ts          # Expense DB operations
│   │   ├── onboarding.ts        # Onboarding progress
│   │   └── userSettings.ts      # Per-user timezone
│   ├── types/
│   │   ├── expense.ts           # TypeScript types
│   │   └── intent.ts            # Classifier intents and slots
│   └── utils/
│       ├── dates.ts             # Timezone-aware date windows
│       ├── validation.ts        # Input validation schemas
│       ├── money.ts             # Rupee formatting
│       ├── budgetPace.ts        # Pace vs expected spend
│       ├── budgetMessages.ts    # Draft, log, and budget copy
│       ├── paymentMethods.ts    # Cash / Card / UPI inference and labels
│       ├── paymentMethodMessages.ts # Amount + count by method
│       └── questionMessages.ts  # Short NL replies for questions/edits
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example                 # Env var template (no secrets)
├── DEVELOPMENT.md               # Feature-branch workflow for live production
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
| `category`    | String   | Category (Food, Travel, Utilities, Shopping, Medical, Subscription, Entertainment, Gift, Investment, Other) |
| `description` | String   | What was purchased                                                |
| `paymentMethod` | Cash / Card / UPI? | How it was paid (nullable for older rows; labeled `Unspecified` in reports) |
| `createdAt`   | DateTime | When the expense was recorded (real insert time, or local noon for a backdated day) |

### UserBudget Model

Stores user's monthly budget:

| Field           | Type     | Description                        |
| --------------- | -------- | ---------------------------------- |
| `id`            | UUID     | Unique budget identifier           |
| `userId`        | String   | Telegram user ID (unique per user) |
| `monthlyBudget` | Integer  | Monthly budget amount              |
| `createdAt`     | DateTime | Budget creation date               |
| `updatedAt`     | DateTime | Last update date                   |

Budget is optional: a user can finish onboarding with no `UserBudget` row.

### UserSettings Model

Per-user preferences (timezone). A missing row means default **Asia/Kolkata**.

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `id`        | UUID     | Unique settings identifier           |
| `userId`    | String   | Telegram user ID (unique per user)   |
| `timezone`  | String   | IANA timezone (default `Asia/Kolkata`) |
| `createdAt` | DateTime | Record creation date                 |
| `updatedAt` | DateTime | Last update date                     |

### UserOnboarding Model

Tracks first-run walkthrough progress:

| Field         | Type           | Description                                      |
| ------------- | -------------- | ------------------------------------------------ |
| `id`          | UUID           | Unique onboarding identifier                     |
| `userId`      | String         | Telegram user ID (unique per user)               |
| `step`        | OnboardingStep | `WELCOME`, `EXPENSE_INTRO`, `SET_BUDGET`, `COMPLETED` |
| `completedAt` | DateTime?      | When the walkthrough finished                    |
| `createdAt`   | DateTime       | Record creation date                             |
| `updatedAt`   | DateTime       | Last update date                                 |

---

## 🤖 How AI Routing Works

1. **Slash commands** (`/today`, etc.) skip classification.
2. **Free text** (after onboarding): Jev classifies `log` | `question` | `edit_last` | `other` with confidence. Unclear or low-confidence messages get safe help instead of triggering an action. If TypeSafe is unavailable, the previous Gemini classifier is used as a service fallback.
3. **Branch extraction**: after Jev chooses a supported route, Gemini extracts only that route's fields. It does not decide the route.
4. **log** → Confirm/Undo draft when the method is known (auto-save after 3 minutes). If Cash / Card / UPI is missing, method buttons save on tap; no auto-save until a method is set.
5. **question** → Prisma totals for today / this week / this month (your timezone, week starts Monday), including by category or payment method. Gemini never invents amounts.
6. **edit_last** → updates the latest saved `Expense` row (amount, category, description, date, and/or payment method).

**Smart Features:**

- ✅ Understands relative dates ("today", "yesterday", "last week")
- ✅ Extracts amounts from various formats
- ✅ Auto-categorizes expenses
- ✅ Handles typos and casual language
- ✅ Answers spending questions in short natural language
- ✅ Returns helpful error messages if unclear

---

## 🛠️ Tech Stack

| Component         | Technology                    |
| ----------------- | ----------------------------- |
| **Bot Framework** | node-telegram-bot-api         |
| **AI Routing**    | TypeSafe System One (Jev)     |
| **AI Extraction** | Google Generative AI (Gemini) |
| **Database**      | PostgreSQL                    |
| **ORM**           | Prisma                        |
| **Language**      | TypeScript                    |
| **Runtime**       | Node.js                       |
| **Validation**    | Zod                           |
| **Excel export**  | exceljs                       |

---

## 📦 Dependencies

### Production

- `@google/generative-ai` - Gemini AI integration
- `@typesafe-ai/sdk` - Jev intent routing with typed choices and confidence
- `@prisma/client` - Database ORM
- `@prisma/adapter-pg` - PostgreSQL adapter
- `node-telegram-bot-api` - Telegram bot framework
- `exceljs` - Excel (.xlsx) export
- `pg` - PostgreSQL driver
- `zod` - TypeScript-first schema validation

### Development

- `typescript` - Type safety
- `ts-node` - Run TypeScript directly
- `prisma` - Database tools
- `dotenv` - Environment variables
- `vitest` - Unit tests
- Type definitions for Node.js and Telegram

---

## 🚨 Error Handling

The bot provides user-friendly error messages:

| Scenario                | Response                                                   |
| ----------------------- | ---------------------------------------------------------- |
| Invalid expense message | `❌ Couldn't understand the expense. Try again.`           |
| Unclear free text       | Short NL help, or “I can tell you spending for today…”     |
| No last expense to edit | `You don't have a saved expense to edit yet.`              |
| Draft send failed       | `❌ Couldn't send the confirmation. Try again.`            |
| No budget set           | `No budget set ! Set budget with /setBudget (amount)`      |
| Invalid budget amount   | `Invalid budget amount. Usage: /setBudget (amount)`        |
| User not found          | `User not found.`                                          |
| No expenses in period   | `No expenses recorded [today/this week/this month].`       |
| Empty export            | `No expenses in this period.` (no file)                    |
| No recent expenses      | `No expenses found.`                                       |
| Nothing to delete       | `📝 You don't have any expenses to delete.`                |

---

## 💡 Tips & Tricks

### Natural Language Examples

The bot understands various formats:

- ✅ "Spent 500 on groceries"
- ✅ "150 for movie + popcorn"
- ✅ "Paid 2000 rent yesterday"
- ✅ "Travel: 100"
- ✅ "Coffee ₹45 this morning"
- ✅ "Paid 150 via UPI"
- ✅ "Swiped the card for 800 groceries"

### Budget Smart Tips

- Set a realistic monthly budget with `/setBudget` (or skip onboarding and set it later)
- Check `/week` to catch overspending early
- Review `/month` analytics to spot spending patterns
- Use `/last` to double-check recent entries, `/delete` for the latest expense, or Undo on a confirmation for that expense
- Watch pace status on logs and `/budget` if you're spending faster than the month
- `/export` — download this month (or today/week/custom dates) as CSV or Excel
- Ask in plain English: “how much did I spend today?” or “change that to 200”

### Categories

Expenses are auto-categorized into:

- 🍕 Food
- ✈️ Travel
- 💡 Utilities
- 🛍️ Shopping
- 🏥 Medical
- 🔁 Subscription
- 🎬 Entertainment
- 🎁 Gift
- 📈 Investment
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
npm test           # Run unit tests (Vitest)
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

- Periods use the user's timezone (default `Asia/Kolkata`; change with `/setTimezone`)
- Check that expenses have proper `createdAt` timestamps (not UTC midnight of a date-only string)

---

## 🎯 Future Enhancements

- 📊 Visual charts and graphs
- 📧 Email summaries
- 🔄 Recurring expense tracking
- 💳 Multi-currency support
- 📱 Mobile app companion
- 🏦 Bank integration

---

## 📄 License

ISC

---

## 👨‍💻 About

Created with ❤️ for smarter expense tracking.

**Need help?** Review this README for commands and usage.

---

_Last updated: August 2026_ 🚀
