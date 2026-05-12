import { db } from "@/db/dexie";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { sortScheduleEntries } from "@/domain/time";

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
  async remove(id: string): Promise<void> {
    await db.schedule.delete(id);
  },
};
