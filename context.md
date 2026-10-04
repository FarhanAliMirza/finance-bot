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
- Spend matching a description term for a period
- Spend by payment method for a period
- Budget status
- Recent expenses (default last one when the user asks for the last expense)

When the answer covers a period that has expenses, the reply includes **Download CSV** and **Download Excel** for that window. Empty results have no download buttons.

Description searches support questions such as “How much did I spend on coffee this month?”, “Show my Uber expenses this week”, and “What did I spend on medicines between 1 Sep and 15 Sep?” Matching is a case-insensitive literal substring search over saved descriptions, scoped to the requesting user and period. The reply includes the search term, matching total, and count. Description-search replies do not include download buttons because existing exports contain every expense in the period rather than only the matches.

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

Expected usage is day-of-month / days-in-month. Spending faster than that line flips only after 10 percentage points. On the slow side, one rounded point under expected stays on track; two or more points under is under pace.

- Over the monthly limit
- Faster than the month (usage above expected + 10 points)
- On track (including exactly 1 rounded point under expected)
- Under pace (rounded usage more than 1 point below rounded expected): `Nice — you're under pace, with room to spare.`

## AI boundary

Gemini is used to parse a new expense and to classify free text (`log` | `question` | `edit_last`) and fill slots. Reports, exports, budget math, and saved rows are application code and the database.

## Proposed features — not implemented

The features below are implementation plans only. They do not describe behavior
that currently exists. They should preserve the existing expense logging,
question, export, edit-last, `/last`, and `/delete` behavior unless a plan below
explicitly extends it.

### Month-to-month comparison

#### Human-understandable language

Add `/compare` to show whether the user is spending more or less than in the
previous month. The comparison should use equal elapsed portions of the two
months. For example, on 28 September it compares 1–28 September with 1–28
August, rather than comparing a partial September with all of August.

The reply includes both totals, the rupee difference, and the percentage
increase or decrease when a percentage can be calculated. If the previous
period has no spending, the bot reports the new spending without claiming an
infinite percentage increase.

#### Agents to understand

- Implement `/compare` as a command first. Do not change free-text
  classification in the initial version. Natural-language comparison can later
  be introduced as a separate `month_comparison` question kind.
- Add a timezone-aware comparison-range helper to `src/utils/dates.ts`. It
  should return current and previous `InstantRange` values plus display labels.
  Determine the user's local year, month, and day; construct the current range
  from local day 1 through the end of today; move back one calendar month; and
  cap the previous end day to the number of days in that month. Convert local
  boundaries with `startOfDayUtc()`. Do not subtract a fixed millisecond
  duration to find the previous month.
- Expected edge cases include January rolling back to December, March 29–31
  comparing through the last valid February day, leap years, and timezones
  whose local midnight is on a different UTC date.
- Create `src/services/monthComparisonService.ts`. Fetch both periods with
  `getExpensesBetween()` using `Promise.all`, then calculate `currentTotal`,
  `previousTotal`, signed and absolute difference, direction, and percentage.
  A positive difference means increased spending.
- Percentage rules: if both totals are zero, report no spending in either
  period; if only the previous total is zero, omit the percentage; otherwise
  use `abs((currentTotal - previousTotal) / previousTotal) * 100`. Round only
  for display so intermediate calculations retain precision.
- Add a formatter that produces a short reply for increased, decreased,
  unchanged, current-only, and both-empty states. Keep the first version
  total-only; category-level comparison is a separate enhancement.
- Create `src/bot/commands/compare.ts`, get the Telegram user ID and timezone,
  call the service, and send the formatted result. Register `/compare` in the
  command switch in `src/bot/bot.ts` and document it in `/help`. It does not
  need to be added to the four-command Telegram menu initially.
- No database migration is required.
- Test with a fixed `now`: normal comparisons, increased/decreased/unchanged
  totals, zero totals, January rollover, short and leap-year February, and
  timezone boundaries.

### Delete a selected recent expense

#### Human-understandable language

Keep `/delete` as the quick way to delete the latest saved expense. Extend
`/last` so each of the five recent expenses has its own delete button. This lets
users remove an older incorrect entry without deleting newer valid expenses
first.

After a selected expense is deleted, show an **Undo delete** button for five
minutes. A stale, already-used, or unauthorized button should not change any
data and should return a short notice.

#### Agents to understand

- Refactor `src/services/lastExpenseService.ts` so the `/last` flow has both
  formatted text and the queried expense IDs. It may return a structured result
  or separate querying from formatting. Preserve the existing newest-first
  limit of five and combined total.
- In `src/bot/commands/last.ts`, send an inline keyboard with one delete button
  per expense. Use concise labels such as `🗑 ₹150 · coffee`; truncate only the
  visible description. Encode callback data as `delexp:<expenseId>`. Telegram
  limits callback data to 64 bytes, and this prefix plus the current UUID fits.
- Add a dedicated handler such as
  `handleDeleteExpenseCallbackQuery(query, bot): Promise<boolean>`. It must
  return `false` for unrelated callbacks and be called in
  `src/bot/bot.ts` before `handleExpenseCallbackQuery()`, because the latter
  currently acknowledges callback data it does not recognize.
- Never authorize from callback data alone. Read and delete with both
  `id: expenseId` and `userId: query.from.id.toString()`. The existing
  `deleteExpenseById(userId, expenseId)` already uses `deleteMany` with both
  fields and is safe to reuse. This ownership check is required in group chats,
  where another user may be able to tap the button.
- Treat a delete count of zero as stale, unauthorized, or already deleted.
  Answer the callback with a neutral message and do not expose whether an
  expense belongs to another user. Double taps must delete at most once.
- Before deletion, fetch the complete owned row. After successful deletion,
  store an undo snapshot containing its original `id`, `userId`, `amount`,
  `category`, `description`, `paymentMethod`, and `createdAt`, plus `chatId`,
  a short random token, and a five-minute expiry. Use a small in-memory store
  patterned after the existing draft/range stores, with atomic consume and
  timer cleanup behavior.
- Encode undo callbacks as `undodel:<token>`. On undo, verify the stored owner
  and chat, atomically consume the token, and recreate the row directly with
  Prisma using its original ID and timestamp. Do not call `createExpense()`,
  because it derives a new timestamp from a parsed date. An undo token can
  succeed only once.
- In-memory undo is intentionally best-effort: deployment or process restart
  invalidates outstanding undo buttons. Respond with `This undo expired.` in
  that case. Persistent undo or soft deletion would require a later schema
  change.
- After deletion, answer the callback promptly and edit or replace the old
  keyboard so its delete buttons are no longer presented as current. The
  message may be refreshed with the remaining latest expenses and an undo
  button. Ignore Telegram's harmless “message is not modified” error using the
  same pattern as the draft handler.
- Preserve the existing `/delete` command and post-save draft Undo behavior;
  this feature adds a separate callback prefix and must not change either flow.
- Test selected deletion, user isolation, group-chat taps, malformed and stale
  callbacks, double taps, exact-field restoration, one-time undo, expiry,
  callback length, and routing alongside onboarding, export, and draft
  callbacks.
