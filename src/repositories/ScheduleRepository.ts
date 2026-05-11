import { db } from "@/db/dexie";
import type { WeeklyScheduleEntry } from "@/domain/types";

export const ScheduleRepository = {
  async listByWeekday(weekday: number): Promise<WeeklyScheduleEntry[]> {
    const entries = await db.schedule.where("weekday").equals(weekday).toArray();
    return entries
      .filter((entry) => entry.isActive)
      .sort((left, right) => left.order - right.order || left.startMinute - right.startMinute);
  },
  async listAll(): Promise<WeeklyScheduleEntry[]> {
    return db.schedule.toArray();
  },
  async upsert(entry: WeeklyScheduleEntry): Promise<void> {
    await db.schedule.put(entry);
  },
  async remove(id: string): Promise<void> {
    await db.schedule.delete(id);
  },
};
