import { db } from "@/db/dexie";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { sortScheduleEntries } from "@/domain/time";

export const ScheduleRepository = {
  async listByWeekday(weekday: number): Promise<WeeklyScheduleEntry[]> {
    return db.schedule.where("weekday").equals(weekday).sortBy("startMinute");
  },
  async listAll(): Promise<WeeklyScheduleEntry[]> {
    return sortScheduleEntries(await db.schedule.toArray());
  },
  async upsert(entry: WeeklyScheduleEntry): Promise<void> {
    await db.schedule.put(entry);
  },
  async remove(id: string): Promise<void> {
    await db.schedule.delete(id);
  },
};
