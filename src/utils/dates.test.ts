import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDateInTimeZone,
  canonicalTimeZone,
  createdAtForParsedDate,
  formatHumanDate,
  formatZonedDateTime,
  isValidTimeZone,
  monthCalendar,
  monthRange,
  startOfMonth,
  startOfWeek,
  today,
  todayRange,
  weekRange,
  zonedDateTimeToUtc,
  dateRangeForIsoDays,
} from "./dates";

const KOLKATA = "Asia/Kolkata";
const UTC = "UTC";

/** Wednesday 26 Aug 2026 20:00 UTC = Thursday 27 Aug 01:30 IST. */
const WED_20_UTC = new Date("2026-08-26T20:00:00.000Z");

/** Sunday 23 Aug 2026 20:00 UTC = Monday 24 Aug 01:30 IST. */
const SUN_20_UTC = new Date("2026-08-23T20:00:00.000Z");

/** Monday 31 Aug 2026 20:00 UTC = Tuesday 1 Sep 01:30 IST. */
const AUG31_20_UTC = new Date("2026-08-31T20:00:00.000Z");

describe("canonicalTimeZone / isValidTimeZone", () => {
  it("accepts IANA names and returns the canonical form", () => {
    expect(canonicalTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(canonicalTimeZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(canonicalTimeZone("UTC")).toBe("UTC");
    expect(isValidTimeZone("America/New_York")).toBe(true);
  });

  it("rejects unknown names", () => {
    expect(canonicalTimeZone("Not/AZone")).toBeNull();
    expect(canonicalTimeZone("Asia/Kolkatta")).toBeNull();
    expect(canonicalTimeZone("")).toBeNull();
    expect(canonicalTimeZone("   ")).toBeNull();
    expect(isValidTimeZone("Foo/Bar")).toBe(false);
  });
});

describe("today in user timezone", () => {
  it("treats 2026-08-26 20:00 UTC as 27 Aug in Asia/Kolkata", () => {
    expect(today(KOLKATA, WED_20_UTC)).toBe("2026-08-27");
    expect(today(UTC, WED_20_UTC)).toBe("2026-08-26");
    expect(calendarDateInTimeZone(WED_20_UTC, KOLKATA)).toEqual({
      year: 2026,
      month: 8,
      day: 27,
    });
  });
});

describe("week starts Monday in that timezone", () => {
  it("uses Monday of the local week (27 Aug 2026 IST is Thursday)", () => {
    expect(startOfWeek(KOLKATA, WED_20_UTC)).toBe("2026-08-24");
    expect(startOfWeek(UTC, WED_20_UTC)).toBe("2026-08-24");
  });

  it("rolls to the new Monday after local midnight when UTC is still Sunday", () => {
    expect(today(UTC, SUN_20_UTC)).toBe("2026-08-23");
    expect(startOfWeek(UTC, SUN_20_UTC)).toBe("2026-08-17");
    expect(today(KOLKATA, SUN_20_UTC)).toBe("2026-08-24");
    expect(startOfWeek(KOLKATA, SUN_20_UTC)).toBe("2026-08-24");
  });
});

describe("month bounds", () => {
  it("keeps August in UTC but starts September in IST at 31 Aug 20:00 UTC", () => {
    expect(startOfMonth(UTC, AUG31_20_UTC)).toBe("2026-08-01");
    expect(startOfMonth(KOLKATA, AUG31_20_UTC)).toBe("2026-09-01");
  });

  it("uses [local 1st 00:00, next local midnight after today)", () => {
    const range = monthRange(KOLKATA, WED_20_UTC);
    expect(range.startInclusive.toISOString()).toBe(
      zonedDateTimeToUtc({ year: 2026, month: 8, day: 1 }, { hour: 0 }, KOLKATA).toISOString(),
    );
    expect(range.endExclusive.toISOString()).toBe(
      zonedDateTimeToUtc({ year: 2026, month: 8, day: 28 }, { hour: 0 }, KOLKATA).toISOString(),
    );
  });
});

describe("todayRange / weekRange exclusive end", () => {
  it("maps IST today to [27 Aug 00:00 IST, 28 Aug 00:00 IST)", () => {
    const range = todayRange(KOLKATA, WED_20_UTC);
    expect(range.startInclusive.toISOString()).toBe("2026-08-26T18:30:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2026-08-27T18:30:00.000Z");
  });

  it("does not use the same instant for both bounds", () => {
    const range = todayRange(KOLKATA, WED_20_UTC);
    expect(range.endExclusive.getTime()).toBeGreaterThan(
      range.startInclusive.getTime(),
    );
  });

  it("spans Monday 00:00 IST through end of today", () => {
    const range = weekRange(KOLKATA, WED_20_UTC);
    expect(range.startInclusive.toISOString()).toBe("2026-08-23T18:30:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2026-08-27T18:30:00.000Z");
  });
});

describe("dateRangeForIsoDays", () => {
  it("maps inclusive local days to an exclusive UTC window", () => {
    const range = dateRangeForIsoDays("2026-08-26", "2026-08-27", KOLKATA);
    expect(range).not.toBeNull();
    expect(range!.startInclusive.toISOString()).toBe("2026-08-25T18:30:00.000Z");
    expect(range!.endExclusive.toISOString()).toBe("2026-08-27T18:30:00.000Z");
  });

  it("swaps bounds when from is after to", () => {
    const range = dateRangeForIsoDays("2026-08-27", "2026-08-26", KOLKATA);
    expect(range!.startInclusive.toISOString()).toBe("2026-08-25T18:30:00.000Z");
    expect(range!.endExclusive.toISOString()).toBe("2026-08-27T18:30:00.000Z");
  });
});

describe("pace day-of-month uses TZ calendar", () => {
  it("counts 27 Aug in Kolkata and 26 Aug in UTC at 20:00 UTC", () => {
    const kolkata = monthCalendar(KOLKATA, WED_20_UTC);
    expect(kolkata.dayOfMonth).toBe(27);
    expect(kolkata.daysInMonth).toBe(31);
    expect(kolkata.month).toBe(8);

    const utc = monthCalendar(UTC, WED_20_UTC);
    expect(utc.dayOfMonth).toBe(26);
    expect(utc.month).toBe(8);
  });

  it("uses September day 1 in Kolkata at 31 Aug 20:00 UTC", () => {
    const kolkata = monthCalendar(KOLKATA, AUG31_20_UTC);
    expect(kolkata.month).toBe(9);
    expect(kolkata.dayOfMonth).toBe(1);
    expect(kolkata.daysInMonth).toBe(30);
  });
});

describe("createdAtForParsedDate", () => {
  it("uses now when the parsed date is today in the user TZ", () => {
    const created = createdAtForParsedDate("2026-08-27", KOLKATA, WED_20_UTC);
    expect(created).toBe(WED_20_UTC);
  });

  it("uses now when the parsed date is missing", () => {
    expect(createdAtForParsedDate(undefined, KOLKATA, WED_20_UTC)).toBe(
      WED_20_UTC,
    );
    expect(createdAtForParsedDate("n/a", KOLKATA, WED_20_UTC)).toBe(WED_20_UTC);
  });

  it("stores local noon UTC for a different calendar day", () => {
    const created = createdAtForParsedDate("2026-08-26", KOLKATA, WED_20_UTC);
    expect(created.toISOString()).toBe("2026-08-26T06:30:00.000Z");
  });
});

describe("zonedDateTimeToUtc", () => {
  it("converts Kolkata midnight and noon to UTC", () => {
    const midnight = zonedDateTimeToUtc(
      { year: 2026, month: 8, day: 27 },
      { hour: 0 },
      KOLKATA,
    );
    expect(midnight.toISOString()).toBe("2026-08-26T18:30:00.000Z");

    const noon = zonedDateTimeToUtc(
      { year: 2026, month: 8, day: 27 },
      { hour: 12 },
      KOLKATA,
    );
    expect(noon.toISOString()).toBe("2026-08-27T06:30:00.000Z");
  });
});

describe("formatZonedDateTime", () => {
  it("includes the local date and time", () => {
    expect(formatZonedDateTime(WED_20_UTC, KOLKATA)).toBe("2026-08-27 01:30");
    expect(formatZonedDateTime(WED_20_UTC, UTC)).toBe("2026-08-26 20:00");
  });
});

describe("formatHumanDate", () => {
  it("omits the year when it matches the current year in the user TZ", () => {
    expect(formatHumanDate("2026-08-27", KOLKATA, WED_20_UTC)).toBe("27 Aug");
    expect(formatHumanDate("2025-08-27", KOLKATA, WED_20_UTC)).toBe(
      "27 Aug 2025",
    );
  });
});

describe("addCalendarDays", () => {
  it("rolls across month boundaries", () => {
    expect(addCalendarDays({ year: 2026, month: 8, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 9,
      day: 1,
    });
  });
});
