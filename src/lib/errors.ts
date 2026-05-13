import type { ErrorLog } from "@/domain/types";
import { ErrorLogRepository } from "@/repositories";
import { createId } from "@/lib/time";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export async function recordError(action: string, error: unknown): Promise<void> {
  await ErrorLogRepository.append({
    id: createId("error"),
    occurredAt: new Date().toISOString(),
    action,
    reason: getErrorMessage(error),
    retryResult: "not_attempted",
    schemaVersion: 1,
  });
}

export async function markLatestRetryResult(
  action: string,
  retryResult: ErrorLog["retryResult"],
): Promise<void> {
  const recentLogs = await ErrorLogRepository.recent(20);
  const target = recentLogs.find(
    (log) => log.action === action && log.retryResult === "not_attempted",
  );
  if (target) {
    await ErrorLogRepository.updateRetryResult(target.id, retryResult);
  }
}
