export type PaceStatusKind = "over" | "too_fast" | "on_track" | "under";

export interface BudgetPaceInput {
  spent: number;
  monthlyBudget: number;
  dayOfMonth: number;
  daysInMonth: number;
}

export interface BudgetPace {
  spent: number;
  remaining: number;
  usagePct: number;
  daysInMonth: number;
  dayOfMonth: number;
  expectedPct: number;
  statusKind: PaceStatusKind;
  statusText: string;
}

/** ±10 percentage points around expected usage so tiny day-to-day diffs don't flip status. */
export const PACE_BAND = 0.1;

/**
 * Linear expected spend: by day D of a month with N days, expected usage is D/N.
 * actual = spent / monthlyBudget. Remaining is not clamped (can be negative).
 *
 * - over:     spent > monthlyBudget
 * - too_fast: actual > expected + PACE_BAND (0.10)
 * - under:    actual < expected - PACE_BAND
 * - on_track: otherwise (including last-day ~90% used, and day-1 with no spend)
 */
export function computeBudgetPace(input: BudgetPaceInput): BudgetPace {
  const { spent, monthlyBudget, dayOfMonth, daysInMonth } = input;
  const remaining = monthlyBudget - spent;
  const expectedFraction =
    daysInMonth > 0 ? dayOfMonth / daysInMonth : 1;
  const actualFraction =
    monthlyBudget > 0 ? spent / monthlyBudget : spent > 0 ? Infinity : 0;

  const usagePct = Number.isFinite(actualFraction)
    ? Math.round(actualFraction * 100)
    : 100;
  const expectedPct = Math.round(expectedFraction * 100);

  let statusKind: PaceStatusKind;
  if (spent > monthlyBudget) {
    statusKind = "over";
  } else if (actualFraction > expectedFraction + PACE_BAND) {
    statusKind = "too_fast";
  } else if (actualFraction < expectedFraction - PACE_BAND) {
    statusKind = "under";
  } else {
    statusKind = "on_track";
  }

  return {
    spent,
    remaining,
    usagePct,
    daysInMonth,
    dayOfMonth,
    expectedPct,
    statusKind,
    statusText: paceStatusText(statusKind, usagePct, expectedFraction),
  };
}

/** Recompute pace as if `extraAmount` were already spent this month. */
export function withAdditionalSpend(
  pace: BudgetPace,
  extraAmount: number,
): BudgetPace {
  return computeBudgetPace({
    spent: pace.spent + extraAmount,
    monthlyBudget: pace.spent + pace.remaining,
    dayOfMonth: pace.dayOfMonth,
    daysInMonth: pace.daysInMonth,
  });
}

function paceStatusText(
  kind: PaceStatusKind,
  usagePct: number,
  expectedFraction: number,
): string {
  switch (kind) {
    case "over":
      return "";
    case "too_fast":
      return expectedFraction < 0.5
        ? `Spending faster than the month — ${usagePct}% used with most of the month left.`
        : `Spending faster than the month — ${usagePct}% used.`;
    case "on_track":
      return "On track for this point in the month.";
    case "under":
      return "Under pace — plenty of budget left for the rest of the month.";
  }
}
