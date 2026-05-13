import Dexie from "dexie";
import { db } from "@/db/dexie";
import {
  assignDisplayOrderByTime,
  compactDisplayOrder,
  normalizeScheduleEntry,
  ScheduleValidationError,
  sortScheduleEntries,
  validateScheduleEntries,
  type ScheduleEntryDraft,
} from "@/domain/schedule";
import type { WeeklyScheduleEntry } from "@/domain/types";

const WEEKDAY_DISPLAY_ORDER_INDEX = "[weekday+displayOrder]" as const;

async function listWeekdayEntries(
  weekday: WeeklyScheduleEntry["weekday"],
): Promise<WeeklyScheduleEntry[]> {
  return db.schedule
    .where(WEEKDAY_DISPLAY_ORDER_INDEX)
    .between([weekday, Dexie.minKey], [weekday, Dexie.maxKey])
    .toArray();
}

async function normalizePreviousWeekday(
  weekday: WeeklyScheduleEntry["weekday"],
): Promise<void> {
  const remainingEntries = compactDisplayOrder(await listWeekdayEntries(weekday));
  validateScheduleEntries(remainingEntries);
  if (remainingEntries.length > 0) {
    await db.schedule.bulkPut(remainingEntries);
  }
}

export { ScheduleValidationError };
export type { ScheduleEntryDraft };

export const ScheduleRepository = {
  async listByWeekday(
    weekday: WeeklyScheduleEntry["weekday"],
  ): Promise<WeeklyScheduleEntry[]> {
    return sortScheduleEntries(await listWeekdayEntries(weekday));
  },
  async listAll(): Promise<WeeklyScheduleEntry[]> {
    return sortScheduleEntries(await db.schedule.toArray());
  },
  async upsert(entry: ScheduleEntryDraft): Promise<void> {
    await db.transaction("rw", db.schedule, async () => {
      const previous = await db.schedule.get(entry.id);
      const targetWeekdayEntries = (await listWeekdayEntries(entry.weekday)).filter(
        (currentEntry) => currentEntry.id !== entry.id,
      );

      if (entry.displayOrder === undefined) {
        const nextWeekdayEntries = assignDisplayOrderByTime([
          ...targetWeekdayEntries,
          entry,
        ]);
        validateScheduleEntries(nextWeekdayEntries);
        await db.schedule.bulkPut(nextWeekdayEntries);
      } else {
        const normalizedEntry = normalizeScheduleEntry(entry, entry.displayOrder);
        validateScheduleEntries([...targetWeekdayEntries, normalizedEntry]);
        await db.schedule.put(normalizedEntry);
      }

      if (previous && previous.weekday !== entry.weekday) {
        await normalizePreviousWeekday(previous.weekday);
      }
    });
  },
  async remove(id: string): Promise<void> {
    await db.transaction("rw", db.schedule, async () => {
      const existing = await db.schedule.get(id);
      if (!existing) return;

      await db.schedule.delete(id);
      await normalizePreviousWeekday(existing.weekday);
    });
  },
};
