import { db } from "@/db/dexie";
import type { WeeklyScheduleEntry } from "@/domain/types";

const STARTER_SCHEDULE: WeeklyScheduleEntry[] = [
  { id: "mon-1", weekday: 1, startMinute: 540, endMinute: 580, subject: "국어", color: "#ffb86b", schemaVersion: 1 },
  { id: "mon-2", weekday: 1, startMinute: 600, endMinute: 640, subject: "수학", color: "#78d6ff", schemaVersion: 1 },
  { id: "mon-3", weekday: 1, startMinute: 660, endMinute: 700, subject: "과학", color: "#87d69b", schemaVersion: 1 },
  { id: "tue-1", weekday: 2, startMinute: 540, endMinute: 580, subject: "영어", color: "#9db4ff", schemaVersion: 1 },
  { id: "tue-2", weekday: 2, startMinute: 600, endMinute: 640, subject: "음악", color: "#f7a8d7", schemaVersion: 1 },
  { id: "tue-3", weekday: 2, startMinute: 660, endMinute: 700, subject: "체육", color: "#ffd36e", schemaVersion: 1 },
  { id: "wed-1", weekday: 3, startMinute: 540, endMinute: 580, subject: "사회", color: "#7fd7c8", schemaVersion: 1 },
  { id: "wed-2", weekday: 3, startMinute: 600, endMinute: 640, subject: "미술", color: "#ff9f80", schemaVersion: 1 },
  { id: "wed-3", weekday: 3, startMinute: 660, endMinute: 700, subject: "국어", color: "#ffb86b", schemaVersion: 1 },
  { id: "thu-1", weekday: 4, startMinute: 540, endMinute: 580, subject: "수학", color: "#78d6ff", schemaVersion: 1 },
  { id: "thu-2", weekday: 4, startMinute: 600, endMinute: 640, subject: "과학", color: "#87d69b", schemaVersion: 1 },
  { id: "thu-3", weekday: 4, startMinute: 660, endMinute: 700, subject: "창체", color: "#c89bff", schemaVersion: 1 },
  { id: "fri-1", weekday: 5, startMinute: 540, endMinute: 580, subject: "영어", color: "#9db4ff", schemaVersion: 1 },
  { id: "fri-2", weekday: 5, startMinute: 600, endMinute: 640, subject: "체육", color: "#ffd36e", schemaVersion: 1 },
  { id: "fri-3", weekday: 5, startMinute: 660, endMinute: 700, subject: "독서", color: "#a6d885", schemaVersion: 1 },
];

export const ScheduleRepository = {
  async listByWeekday(weekday: WeeklyScheduleEntry["weekday"]): Promise<WeeklyScheduleEntry[]> {
    return db.schedule.where("weekday").equals(weekday).sortBy("startMinute");
  },
  async listAll(): Promise<WeeklyScheduleEntry[]> {
    return db.schedule.toArray();
  },
  async ensureSeedData(): Promise<void> {
    await db.transaction("rw", db.schedule, async () => {
      if ((await db.schedule.count()) > 0) {
        return;
      }
      await db.schedule.bulkPut(STARTER_SCHEDULE);
    });
  },
  async upsert(entry: WeeklyScheduleEntry): Promise<void> {
    await db.schedule.put(entry);
  },
  async remove(id: string): Promise<void> {
    await db.schedule.delete(id);
  },
};
