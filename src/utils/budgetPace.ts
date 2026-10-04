export type PaceStatusKind =
  | "over"
  | "too_fast"
  | "slightly_ahead"
  | "on_track"
  | "under";

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

/** Rounded points either side of expected usage that still count as on track. */
const ON_TRACK_SLACK_PCT = 1;

/** Highest rounded points above expected usage that stay a mild warning. */
const SLIGHTLY_AHEAD_MAX_PCT = 8;

/**
 * Linear expected spend: by day D of a month with N days, expected usage is D/N.
 * actual = spent / monthlyBudget. Remaining is not clamped (can be negative).
 * Pace status uses rounded usage and expected percents.
 *
 * - over:            spent > monthlyBudget
 * - too_fast:        rounded usage is 9 or more points above rounded expected
 * - slightly_ahead:  rounded usage is 2 to 8 points above rounded expected
 * - under:           rounded usage is more than 1 point below rounded expected
 * - on_track:        otherwise (1 point below through 1 point above)
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

  const gapPct = usagePct - expectedPct;

  let statusKind: PaceStatusKind;
  if (spent > monthlyBudget) {
    statusKind = "over";
  } else if (gapPct > SLIGHTLY_AHEAD_MAX_PCT) {
    statusKind = "too_fast";
  } else if (gapPct > ON_TRACK_SLACK_PCT) {
    statusKind = "slightly_ahead";
  } else if (gapPct < -ON_TRACK_SLACK_PCT) {
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
    case "slightly_ahead":
      return "A little ahead of the month — worth slowing down.";
    case "on_track":
      return "On track for this point in the month.";
    case "under":
      return "Nice — you're under pace, with room to spare.";
  }
}
