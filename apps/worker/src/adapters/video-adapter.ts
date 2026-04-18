/**
 * Seedance Video Adapter — 火山引擎 Ark API v3.
 * Uses same ARK_API_KEY as image generation, different model + request format.
 */
import { z } from 'zod';

export const SeedanceVideoParamsSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().int().min(3).max(15).default(5),
  resolution: z.enum(['540p', '720p', '1080p', '4K']).default('1080p'),
  reference_image_url: z.string().url().optional(),
  fps: z.number().optional().default(24),
  camera_control: z.record(z.unknown()).optional(),
});

export type SeedanceVideoParams = z.infer<typeof SeedanceVideoParamsSchema>;

export interface ParsedResult {
  status: 'completed' | 'failed';
  outputs: Array<{ url: string; thumbnail_url?: string; duration?: number }>;
  error?: string;
  jobId?: string;
}

export function validate(params: unknown): { valid: boolean; errors?: Array<{ message: string }>; params?: SeedanceVideoParams } {
  const result = SeedanceVideoParamsSchema.safeParse(params);
  if (!result.success) {
    return { valid: false, errors: result.error.errors.map(e => ({ message: e.message })) };
  }
  return { valid: true, params: result.data };
}

export function toUpstream(params: SeedanceVideoParams, apiKey: string): {
  url: string; method: string; headers: Record<string, string>; body: Record<string, unknown>;
} {
  // Build content array (text required, image optional)
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: 'text',
      text: `${params.prompt} --duration ${params.duration} --camerafixed false --watermark true`,
    },
  ];

  if (params.reference_image_url) {
    content.push({
      type: 'image_url',
      image_url: { url: params.reference_image_url },
    });
  }

  return {
    url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedance-1-5-pro-251215',
      content,
    },
  };
}

export function parseResponse(data: Record<string, unknown>): ParsedResult {
  const code = data.code as number | undefined;
  if (code !== 0 && code !== undefined) {
    return { status: 'failed', outputs: [], error: String(data.message ?? 'Upstream error') };
  }

  const task = data.data as Record<string, unknown> | undefined;
  if (!task) return { status: 'failed', outputs: [], error: 'No data in response' };

  const taskId = task.task_id as string;
  const outputs = task.outputs as Array<{ url: string }> | undefined;

  if (!taskId) return { status: 'failed', outputs: [], error: 'No task_id in response' };

  return {
    status: 'completed',
    outputs: (outputs ?? []).map(o => ({ url: o.url })),
    jobId: taskId,
  };
}

/** Poll video task status (async API) */
export async function pollStatus(jobId: string, apiKey: string): Promise<{
  status: 'completed' | 'failed'; outputs: Array<{ url: string }>; result?: ParsedResult; error?: string
}> {
  const MAX_RETRIES = 30;
  const INTERVAL_MS = 5000;

  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, INTERVAL_MS));

    try {
      const resp = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json() as Record<string, unknown>;
      const parsed = parseResponse(data);
      if (parsed.status === 'completed' || parsed.status === 'failed') {
        return { status: parsed.status, outputs: parsed.outputs as Array<{ url: string }>, result: parsed };
      }
    } catch (e) {
      // continue polling
    }
  }
  return { status: 'failed', outputs: [], error: 'Polling timeout' };
}
