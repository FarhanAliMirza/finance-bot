/**
 * Timezone-aware calendar helpers.
 *
 * Query windows are [startInclusive, endExclusive) UTC instants derived from
 * the user's local calendar (e.g. today = local midnight → next local midnight).
 * Missing / invalid stored timezones fall back to Asia/Kolkata at the call site.
 */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type InstantRange = {
  startInclusive: Date;
  endExclusive: Date;
};

function tzParts(
  instant: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...options,
  }).formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return map;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatIsoDate(date: CalendarDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

/** Local wall-clock `YYYY-MM-DD HH:mm` for `instant` in `timeZone`. */
export function formatZonedDateTime(instant: Date, timeZone: string): string {
  const parts = tzParts(instant, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return `${parts.year}-${pad2(Number(parts.month))}-${pad2(Number(parts.day))} ${pad2(hour)}:${pad2(Number(parts.minute))}`;
}

export function parseIsoDate(isoDate: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function sameCalendarDay(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Canonical IANA name, or null if Intl rejects the identifier. */
export function canonicalTimeZone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const resolved = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
    // ICU still reports the old Asia/Calcutta alias for Kolkata.
    if (resolved === "Asia/Calcutta") return "Asia/Kolkata";
    return resolved;
  } catch {
    return null;
  }
}

export function isValidTimeZone(input: string): boolean {
  return canonicalTimeZone(input) !== null;
}

export function calendarDateInTimeZone(
  instant: Date,
  timeZone: string,
): CalendarDate {
  const parts = tzParts(instant, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** 0 = Sunday … 6 = Saturday in `timeZone`. */
export function weekdayInTimeZone(instant: Date, timeZone: string): number {
  const parts = tzParts(instant, timeZone, { weekday: "short" });
  const index = WEEKDAY_SHORT.indexOf(
    parts.weekday as (typeof WEEKDAY_SHORT)[number],
  );
  return index === -1 ? 0 : index;
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/**
 * Offset of `timeZone` at `instant`: localWallClockAsUTC - instant.
 * Example: Kolkata (UTC+5:30) → +5.5 hours.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = tzParts(instant, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** UTC instant for a wall-clock time on a calendar day in `timeZone`. */
export function zonedDateTimeToUtc(
  date: CalendarDate,
  time: { hour: number; minute?: number; second?: number },
  timeZone: string,
): Date {
  const hour = time.hour;
  const minute = time.minute ?? 0;
  const second = time.second ?? 0;
  const utcGuess = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
    second,
  );
  const offset1 = timeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utcMs = utcGuess - offset1;
  const offset2 = timeZoneOffsetMs(new Date(utcMs), timeZone);
  if (offset1 !== offset2) {
    utcMs = utcGuess - offset2;
  }
  return new Date(utcMs);
}

export function startOfDayUtc(date: CalendarDate, timeZone: string): Date {
  return zonedDateTimeToUtc(date, { hour: 0 }, timeZone);
}

export function today(timeZone: string, now: Date = new Date()): string {
  return formatIsoDate(calendarDateInTimeZone(now, timeZone));
}

/** Monday of the local week containing `now`, as YYYY-MM-DD. */
export function startOfWeek(timeZone: string, now: Date = new Date()): string {
  return formatIsoDate(startOfWeekCalendar(timeZone, now));
}

export function startOfWeekCalendar(
  timeZone: string,
  now: Date = new Date(),
): CalendarDate {
  const cal = calendarDateInTimeZone(now, timeZone);
  const weekday = weekdayInTimeZone(now, timeZone);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(cal, -daysFromMonday);
}

export function startOfMonth(timeZone: string, now: Date = new Date()): string {
  const cal = calendarDateInTimeZone(now, timeZone);
  return formatIsoDate({ year: cal.year, month: cal.month, day: 1 });
}

export function monthName(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
  }).format(now);
}

/** Local calendar parts of `now` in `timeZone` (for budget pace). */
export function monthCalendar(timeZone: string, now: Date = new Date()) {
  const cal = calendarDateInTimeZone(now, timeZone);
  const daysInMonth = new Date(Date.UTC(cal.year, cal.month, 0)).getUTCDate();
  return {
    year: cal.year,
    month: cal.month,
    dayOfMonth: cal.day,
    daysInMonth,
  };
}

export function todayRange(
  timeZone: string,
  now: Date = new Date(),
): InstantRange {
  const cal = calendarDateInTimeZone(now, timeZone);
  return {
    startInclusive: startOfDayUtc(cal, timeZone),
    endExclusive: startOfDayUtc(addCalendarDays(cal, 1), timeZone),
  };
}

/** Monday 00:00 local through end of today (next local midnight, exclusive). */
export function weekRange(
  timeZone: string,
  now: Date = new Date(),
): InstantRange {
  const monday = startOfWeekCalendar(timeZone, now);
  const tomorrow = addCalendarDays(calendarDateInTimeZone(now, timeZone), 1);
  return {
    startInclusive: startOfDayUtc(monday, timeZone),
    endExclusive: startOfDayUtc(tomorrow, timeZone),
  };
}

/** 1st of the month 00:00 local through end of today. */
export function monthRange(
  timeZone: string,
  now: Date = new Date(),
): InstantRange {
  const cal = calendarDateInTimeZone(now, timeZone);
  return {
    startInclusive: startOfDayUtc(
      { year: cal.year, month: cal.month, day: 1 },
      timeZone,
    ),
    endExclusive: startOfDayUtc(addCalendarDays(cal, 1), timeZone),
  };
}

/**
 * Inclusive local calendar days [fromIso, toIso] as
 * [startInclusive, endExclusive) UTC. Swaps the bounds if from > to.
 */
export function dateRangeForIsoDays(
  fromIso: string,
  toIso: string,
  timeZone: string,
): InstantRange | null {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return null;
  let startCal = from;
  let endCal = to;
  if (startOfDayUtc(to, timeZone).getTime() < startOfDayUtc(from, timeZone).getTime()) {
    startCal = to;
    endCal = from;
  }
  return {
    startInclusive: startOfDayUtc(startCal, timeZone),
    endExclusive: startOfDayUtc(addCalendarDays(endCal, 1), timeZone),
  };
}

/** Human-readable expense date, e.g. `27 Aug` or `27 Aug 2026` if not this year. */
export function formatHumanDate(
  isoDate: string,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  const label = `${parsed.day} ${SHORT_MONTHS[parsed.month - 1]}`;
  const currentYear = calendarDateInTimeZone(now, timeZone).year;
  return parsed.year === currentYear ? label : `${label} ${parsed.year}`;
}

/**
 * Instant stored on Expense.createdAt at Confirm / 3-min auto-save.
 *
 * - Parsed date is today in the user TZ, missing, or unparseable → `now`
 *   (real insert time; DB `@default(now())` would also be fine).
 * - Parsed date is a different local calendar day (e.g. "yesterday") → 12:00
 *   on that local day, converted to UTC, so /today /week /month grouping
 *   lands on the intended calendar day. Noon avoids DST start/end midnights.
 */
export function createdAtForParsedDate(
  parsedDate: string | undefined | null,
  timeZone: string,
  now: Date = new Date(),
): Date {
  const parsed = parsedDate ? parseIsoDate(parsedDate) : null;
  if (!parsed) return now;
  const todayCal = calendarDateInTimeZone(now, timeZone);
  if (sameCalendarDay(parsed, todayCal)) return now;
  return zonedDateTimeToUtc(parsed, { hour: 12 }, timeZone);
}
