/**
 * Shared queue data types for BullMQ workers.
 * Must match the queue definitions in apps/api/src/queues/index.ts.
 */

export interface GenerationJobData {
  taskId: string;
  userId: string;
  modelSlug: string;
  modelId: string;
  inputParams: Record<string, unknown>;
  totalCost: number;
  channelId: string;
  retryCount: number;
  createdAt: string;
}

export const JOB_ATTEMPTS = 3;
export const JOB_BACKOFF_DELAY = 10_000; // 10 seconds
export const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
