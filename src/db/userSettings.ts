import { prisma } from "./prisma";
import {
  DEFAULT_TIMEZONE,
  canonicalTimeZone,
} from "../utils/dates";

export async function getUserTimeZone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const stored = settings?.timezone;
  return canonicalTimeZone(stored ?? "") ?? DEFAULT_TIMEZONE;
}

export async function setUserTimeZone(userId: string, timezone: string) {
  const canonical = canonicalTimeZone(timezone);
  if (!canonical) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  return prisma.userSettings.upsert({
    where: { userId },
    create: { userId, timezone: canonical },
    update: { timezone: canonical },
  });
}
