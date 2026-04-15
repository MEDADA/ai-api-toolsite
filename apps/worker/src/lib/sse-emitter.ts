/**
 * SSE event publisher via Redis PubSub.
 * Publishes events to task-specific channels for the API server to forward via SSE.
 */

import Redis from 'ioredis';

let _redis: Redis | null = null;

async function getRedis(): Promise<Redis | null> {
  if (_redis) return _redis;

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379');
  const password = process.env.REDIS_PASSWORD;

  try {
    _redis = new Redis({ host, port, password: password || undefined, lazyConnect: true });
    await _redis.connect();
    return _redis;
  } catch {
    console.warn('[SSE] Redis unavailable, SSE events will not be published');
    return null;
  }
}

/**
 * Publish an SSE event to the task's Redis channel.
 * The API server subscribes to `task:${taskId}` and forwards events via SSE.
 */
export async function publishSSE(
  taskId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    const channel = `task:${taskId}`;
    const message = JSON.stringify({ event, data });
    await redis.publish(channel, message);
  } catch (err) {
    console.error(`[SSE] Failed to publish event ${event} for task ${taskId}:`, err);
  }
}
