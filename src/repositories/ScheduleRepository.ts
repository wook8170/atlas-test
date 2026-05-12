import { db } from "@/db/dexie";
import { getCurrentOrNextEntry, sortScheduleEntries } from "@/domain/schedule";
import type { WeeklyScheduleEntry } from "@/domain/types";

export const ScheduleRepository = {
  async listByWeekday(weekday: number): Promise<WeeklyScheduleEntry[]> {
    const entries = await db.schedule.where("weekday").equals(weekday).sortBy("startMinute");
    return entries.filter((entry) => entry.isActive !== false);
  },
  async listAll(): Promise<WeeklyScheduleEntry[]> {
    return sortScheduleEntries(await db.schedule.toArray());
  },
  async getById(id: string): Promise<WeeklyScheduleEntry | undefined> {
    return db.schedule.get(id);
  },
  async upsert(entry: WeeklyScheduleEntry): Promise<void> {
    await db.schedule.put(entry);
  },
  async replaceAll(entries: WeeklyScheduleEntry[]): Promise<void> {
    await db.transaction("rw", db.schedule, async () => {
      await db.schedule.clear();
      await db.schedule.bulkPut(entries);
    });
  },
  async remove(id: string): Promise<void> {
    await db.schedule.delete(id);
  },
  async getCurrentOrNextEntry(now: Date): Promise<{ current?: WeeklyScheduleEntry; next?: WeeklyScheduleEntry }> {
    const entries = await this.listByWeekday(now.getDay());
    return getCurrentOrNextEntry(entries, now.getHours() * 60 + now.getMinutes());
  },
};
