import { db } from "@/db/dexie";
import type { ErrorLog } from "@/domain/types";

export const ErrorLogRepository = {
  async append(log: ErrorLog): Promise<void> {
    await db.errorLogs.put(log);
  },
  async recent(limit = 20): Promise<ErrorLog[]> {
    return db.errorLogs.orderBy("occurredAt").reverse().limit(limit).toArray();
  },
  async updateRetryResult(
    id: string,
    retryResult: ErrorLog["retryResult"],
  ): Promise<void> {
    await db.errorLogs.update(id, { retryResult });
  },
};
