# Finance Bot — current context

Telegram expense tracker. Users log spending in plain English, ask about totals, and manage an optional monthly budget. Amounts in answers always come from PostgreSQL.

This file describes behavior that exists in the codebase now.

## Stack

- TypeScript, Node.js 18+
- Telegram: `node-telegram-bot-api` (long polling)
- AI: Google Gemini (`gemini-3-flash-preview`) via `@google/generative-ai` and `GEMINI_API_KEY`
- Database: PostgreSQL through Prisma (`@prisma/adapter-pg`)
- Validation: Zod
- Excel export: exceljs
- Tests: Vitest (`npm test`)

## Environment

| Variable | Role |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Bot token |
| `GEMINI_API_KEY` | Gemini |
| `DATABASE_URL` | Prisma client connection |
| `DIRECT_URL` | Prisma CLI / migrations |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run typecheck`.

Live users are served from `master`. Feature work uses a separate bot token and test database. See `DEVELOPMENT.md`.

## Data

Per Telegram user (`userId` is the Telegram user id as a string). Currency display is rupees (`₹`).

**Expense** — `amount`, `category`, `description`, optional `paymentMethod` (`Cash` | `Card` | `UPI`), `createdAt`. Older rows may have no payment method; reports label those `Unspecified`. A backdated day is stored as local noon in the user's timezone; otherwise `createdAt` is insert time.

**UserBudget** — one optional `monthlyBudget` (integer) per user. No row means no budget.

**UserSettings** — IANA `timezone`. Missing row means `Asia/Kolkata`.

**UserOnboarding** — `step`: `WELCOME`, `EXPENSE_INTRO`, `SET_BUDGET`, `COMPLETED`, plus optional `completedAt`.

Categories: Food, Travel, Utilities, Shopping, Medical, Subscription, Entertainment, Gift, Investment, Other.

## First-run onboarding

New users with no prior expenses or budget, and onboarding not finished, get one walkthrough:

1. Welcome
2. How to log expenses, with examples
3. Optional monthly budget — a number, `/setBudget <amount>`, **Skip**, or the word `skip`

Skip finishes onboarding with no `UserBudget` row. Users who already had expenses or a budget before onboarding existed are marked complete and skip the walkthrough.

`/start` restarts the walkthrough for users who have not finished it, and shows a short welcome for returning users.

## Free-text routing

Slash commands skip classification. After onboarding, other text is classified as `log`, `question`, or `edit_last`.

Gemini extracts the intent and slots. Keyword hints bias unclear text toward a question unless it looks like a new expense or an edit of the last one. Totals are computed in Prisma. Gemini does not invent amounts.

Relative dates ("today", "yesterday", and similar) are resolved in the user's timezone. The week starts Monday.

### Log an expense

A clear expense sentence becomes a draft. The parser stores amount, category, description, date, and payment method when the message states one.

- Method already known: **Confirm** and **Undo**. Confirm saves. Undo before save cancels the draft. If neither is tapped, the draft auto-saves after 3 minutes.
- Method missing: **Cash**, **Card**, **UPI**, and Cancel. Tapping a method saves. These drafts expire after 3 minutes without saving.

Undo on the confirmation after save deletes that expense. `/delete` still deletes the latest saved expense, which may be a different row.

After save, the reply confirms amount, category, and method. If a monthly budget exists, it also includes remaining budget, usage percent, and pace.

### Questions

Supported question kinds, answered from the database in short natural language:

- Spend total for today, this week, this month, or a custom date range
- Spend in one category for a period
- Spend by payment method for a period
- Budget status
- Recent expenses (default last one when the user asks for the last expense)

When the answer covers a period that has expenses, the reply includes **Download CSV** and **Download Excel** for that window. Empty results have no download buttons.

Questions the classifier cannot map get a short help reply. Budget questions with no budget say none is set.

### Edit last expense

Edits apply to the latest **saved** expense, not an unsaved draft. Fields that can change: amount, category, description, date, payment method.

Examples: "change that to 200", "make it Travel", "make it UPI".

No saved expense: `You don't have a saved expense to edit yet.` Nothing recognizable to change: a short retry hint.

## Commands

Telegram's `/` menu lists only `/today`, `/week`, `/last`, and `/delete`. The others work when typed. Unknown commands get `Unknown command. Try /help.`

| Command | Behavior |
| --- | --- |
| `/start` | Onboarding, or a short welcome if already finished |
| `/help` | Command list plus how to log, ask, edit, set a budget, and set a timezone |
| `/today` | Today's expenses, largest spend, total, count. Download buttons when the day is not empty |
| `/week` | Monday through today: category breakdown, total, count, largest spend, payment-method breakdown. Download buttons when not empty |
| `/month` | 1st through today: category breakdown, total, count, largest spend, daily average, payment-method breakdown. Download buttons when not empty |
| `/export` | Download a period. Default is this month as CSV. `excel` or `xlsx` selects Excel. Period can be `today`, `week`, `month`, one ISO date, or two inclusive ISO dates. Empty period: `No expenses in this period.` and no file |
| `/methods` | This month's amount and count per Cash, Card, UPI, plus Unspecified when present |
| `/budget` | Monthly budget, spent, remaining (can be negative), usage percent, pace line. No row: tells the user to `/setBudget` |
| `/setBudget <amount>` | Create or update the monthly budget. During the budget onboarding step, a valid amount also finishes onboarding |
| `/setTimezone` | Show the current timezone. `/setTimezone <IANA>` sets it. Unknown names are rejected |
| `/last` | Up to the last 5 expenses, newest first, plus their combined total |
| `/delete` | Delete the most recent expense. Nothing to delete gets a short notice |

Export files are one row per expense, oldest first: Date, Amount, Category, Payment method, Description. Dates are inclusive in the user's timezone. Excel cells use category and payment-method colors.

## Budget pace

Used on `/budget` and on the confirmation after a save, only when a monthly budget exists.

Expected usage is day-of-month / days-in-month. A band of 10 percentage points around that line avoids flipping status on small differences.

- Over the monthly limit
- Faster than the month (usage above expected + 10 points)
- On track
- Under pace (usage below expected − 10 points)

## AI boundary

Gemini is used to parse a new expense and to classify free text (`log` | `question` | `edit_last`) and fill slots. Reports, exports, budget math, and saved rows are application code and the database.
