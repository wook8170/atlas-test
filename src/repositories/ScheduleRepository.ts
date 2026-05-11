import { db } from "@/db/dexie";
import type { WeeklyScheduleEntry } from "@/domain/types";
import { sortScheduleEntries } from "@/lib/timetable";

export const ScheduleRepository = {
  async listByWeekday(weekday: number): Promise<WeeklyScheduleEntry[]> {
    const entries = await db.schedule.where("weekday").equals(weekday).toArray();
    return sortScheduleEntries(entries);
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
