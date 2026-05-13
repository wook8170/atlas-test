import { describe, expect, it } from "vitest";
import {
  toWeeklyScheduleEntry,
  validateTimetableDraft,
  type TimetableDraft,
} from "./timetableForm";

const validDraft: TimetableDraft = {
  weekday: 1,
  subject: "수학",
  startTime: "09:00",
  endTime: "09:40",
  color: "#4f7cff",
};

describe("validateTimetableDraft", () => {
  it("rejects drafts without a subject", () => {
    expect(
      validateTimetableDraft({
        ...validDraft,
        subject: "   ",
      }),
    ).toBe("과목명을 입력해야 저장할 수 있어요.");
  });

  it("rejects drafts without both times", () => {
    expect(
      validateTimetableDraft({
        ...validDraft,
        startTime: "",
      }),
    ).toBe("시작 시각과 종료 시각을 모두 입력해야 저장할 수 있어요.");
  });

  it("rejects end times that are not later than the start time", () => {
    expect(
      validateTimetableDraft({
        ...validDraft,
        endTime: "08:50",
      }),
    ).toBe("종료 시각은 시작 시각보다 늦어야 해요.");
  });
});

describe("toWeeklyScheduleEntry", () => {
  it("converts validated time inputs into minute offsets", () => {
    expect(toWeeklyScheduleEntry(validDraft, "entry-1")).toEqual({
      id: "entry-1",
      weekday: 1,
      startMinute: 540,
      endMinute: 580,
      subject: "수학",
      color: "#4f7cff",
      schemaVersion: 1,
    });
  });
});
