const SCHEDULE_KEY = "schedule-cache";
const RECORDS_KEY = "study-records";
const TIMER_KEY = "active-timer";

export class MemoryStorage {
  #store = new Map();

  constructor(seed = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.#store.set(key, value);
    }
  }

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    this.#store.set(key, value);
  }

  removeItem(key) {
    this.#store.delete(key);
  }
}

function readJson(storage, key, fallback) {
  const raw = storage.getItem(key);

  if (raw === null) {
    return fallback;
  }

  return JSON.parse(raw);
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function normalizeDate(dateLike) {
  return new Date(dateLike).toISOString().slice(0, 10);
}

export class OfflineStudyApp {
  #storage;
  #now;

  constructor({ storage = new MemoryStorage(), now = () => new Date() } = {}) {
    this.#storage = storage;
    this.#now = now;
  }

  get storage() {
    return this.#storage;
  }

  seedSchedule(entries) {
    writeJson(this.#storage, SCHEDULE_KEY, entries);
    return entries;
  }

  async syncSchedule(fetchSchedule) {
    try {
      const entries = await fetchSchedule();
      this.seedSchedule(entries);

      return {
        source: "remote",
        entries,
      };
    } catch (error) {
      return {
        source: "cache",
        entries: this.listScheduleEntries(),
        error,
      };
    }
  }

  listScheduleEntries() {
    return readJson(this.#storage, SCHEDULE_KEY, []);
  }

  getScheduleForDate(dateLike) {
    const targetDate = normalizeDate(dateLike);

    return this.listScheduleEntries().filter((entry) => entry.date === targetDate);
  }

  startTimer({ scheduleId, startedAt = this.#now().toISOString(), label }) {
    if (this.getActiveTimer()) {
      throw new Error("An active timer already exists.");
    }

    const timer = {
      scheduleId,
      label,
      startedAt,
    };

    writeJson(this.#storage, TIMER_KEY, timer);
    return timer;
  }

  getActiveTimer() {
    return readJson(this.#storage, TIMER_KEY, null);
  }

  stopTimer({ endedAt = this.#now().toISOString(), outcome = "completed" } = {}) {
    const activeTimer = this.getActiveTimer();

    if (!activeTimer) {
      throw new Error("No active timer.");
    }

    const durationMs = Math.max(
      0,
      new Date(endedAt).getTime() - new Date(activeTimer.startedAt).getTime(),
    );

    const record = {
      id: `${activeTimer.scheduleId}-${new Date(endedAt).getTime()}`,
      scheduleId: activeTimer.scheduleId,
      label: activeTimer.label,
      startedAt: activeTimer.startedAt,
      endedAt,
      durationMs,
      outcome,
    };

    this.saveRecord(record);
    this.#storage.removeItem(TIMER_KEY);

    return record;
  }

  saveRecord(record) {
    const records = this.listRecords({ newestFirst: false });
    records.push(record);
    writeJson(this.#storage, RECORDS_KEY, records);
    return record;
  }

  listRecords({ scheduleId, from, to, newestFirst = true } = {}) {
    const records = readJson(this.#storage, RECORDS_KEY, []);
    const filtered = records.filter((record) => {
      if (scheduleId && record.scheduleId !== scheduleId) {
        return false;
      }

      if (from && new Date(record.startedAt) < new Date(from)) {
        return false;
      }

      if (to && new Date(record.endedAt) > new Date(to)) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const delta =
        new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
      return newestFirst ? -delta : delta;
    });

    return filtered;
  }
}
