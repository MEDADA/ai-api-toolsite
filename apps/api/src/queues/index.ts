import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
};

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

export const imageQueue = new Queue<GenerationJobData>('image-generation', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const videoQueue = new Queue<GenerationJobData>('video-generation', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const audioQueue = new Queue<GenerationJobData>('audio-generation', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export function getQueueByType(taskType: string): Queue<GenerationJobData> {
  switch (taskType) {
    case 'IMAGE': return imageQueue;
    case 'VIDEO': return videoQueue;
    case 'TTS':
    case 'ASR':
    case 'VOICE_CLONE':
      return audioQueue;
    default:
      return imageQueue;
  }
}
