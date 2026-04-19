/**
 * kling-video.adapter.ts —  快手可灵 Kling AI 视频生成 API
 *
 * 🔑 API 凭证（由用户提供）：
 *   - API Key: KLING_API_KEY 环境变量
 *   - Base URL: https://api.kling.ai
 *
 * 模型：
 *   - kling-v1 (标准): 3-10s, 1080p
 *   - kling-v1-5 (高表现): 3-10s, 对运动理解更强
 *
 * 定价参考（需 Prisma seed 录入）：
 *   - 3s: ¥1.0
 *   - 5s: ¥1.8
 *   - 10s: ¥3.5
 */

import { z } from 'zod';

const KLING_API_KEY = process.env.KLING_API_KEY ?? '';
const KLING_BASE_URL = 'https://api.kling.ai';

export const KlingVideoParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt 不能为空'),
  duration: z.enum(['3', '5', '10']).default('5'),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  model_version: z.enum(['kling-v1', 'kling-v1-5']).default('kling-v1'),
  // 图生视频（可选）
  image_url: z.string().url().optional(),
  // 镜头控制（可选）
  camera_type: z.enum(['fixed', 'auto', 'cinematic']).default('auto'),
  // 负面提示词
  negative_prompt: z.string().optional(),
});

export type KlingVideoParams = z.infer<typeof KlingVideoParamsSchema>;

export interface KlingParsedResult {
  status: 'completed' | 'failed' | 'processing';
  outputs: Array<{ url: string; thumbnail_url?: string; duration?: number }>;
  error?: string;
  jobId?: string;
}

/** Kling API 创建任务响应 */
interface KlingCreateTaskResponse {
  data: {
    task_id: string;
  };
  code: number;
  message: string;
}

/** Kling API 任务状态响应 */
interface KlingTaskResponse {
  data: {
    task_id: string;
    status: 'pending' | 'processing' | 'succeed' | 'failed';
    task_status_msg?: string;
    video?: {
      url: string;
      cover_image_url?: string;
      duration?: number;
    };
    error?: { code: string; message: string };
  };
  code: number;
  message: string;
}

export function klingValidate(params: unknown): {
  valid: boolean;
  errors?: Array<{ message: string }>;
  params?: KlingVideoParams;
} {
  const result = KlingVideoParamsSchema.safeParse(params);
  if (!result.success) {
    return { valid: false, errors: result.error.errors.map(e => ({ message: e.message })) };
  }
  return { valid: true, params: result.data };
}

export function klingToUpstream(params: KlingVideoParams): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const body: Record<string, unknown> = {
    model_version: params.model_version,
    prompt: params.prompt,
    duration: params.duration,
    aspect_ratio: params.aspect_ratio,
    camera_type: params.camera_type,
  };

  if (params.image_url) {
    // 图生视频模式
    body.image_url = params.image_url;
  }
  if (params.negative_prompt) {
    body.negative_prompt = params.negative_prompt;
  }

  return {
    url: `${KLING_BASE_URL}/v1/videos/generations`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body,
  };
}

export function klingParseCreateResponse(data: Record<string, unknown>): {
  status: 'completed' | 'failed' | 'processing';
  jobId?: string;
  error?: string;
} {
  const resp = data as Partial<KlingCreateTaskResponse>;
  if (resp.code !== 0) {
    return { status: 'failed', error: resp.message ?? 'Kling API error' };
  }
  const taskId = resp.data?.task_id;
  if (!taskId) {
    return { status: 'failed', error: 'No task_id in Kling response: ' + JSON.stringify(data) };
  }
  return { status: 'processing', jobId: taskId };
}

export function klingParseStatusResponse(data: Record<string, unknown>): KlingParsedResult {
  const resp = data as Partial<KlingTaskResponse>;
  if (resp.code !== 0) {
    return { status: 'failed', outputs: [], error: resp.message ?? 'Kling status error' };
  }

  const task = resp.data;
  if (!task) {
    return { status: 'failed', outputs: [], error: 'No data in Kling status response' };
  }

  const taskId = task.task_id ?? '';

  if (task.status === 'failed') {
    const msg = task.error?.message ?? task.task_status_msg ?? 'Generation failed';
    return { status: 'failed', outputs: [], error: msg, jobId: taskId };
  }

  if (task.status === 'succeed' && task.video) {
    return {
      status: 'completed',
      jobId: taskId,
      outputs: [{
        url: task.video.url,
        thumbnail_url: task.video.cover_image_url,
        duration: task.video.duration ?? parseInt(KlingVideoParamsSchema.parse({}).duration) * 1,
      }],
    };
  }

  // pending / processing
  return { status: 'processing', outputs: [], jobId: taskId };
}

/** 轮询 Kling 任务状态 */
export async function klingPollStatus(jobId: string, maxRetries = 45, intervalMs = 8000): Promise<KlingParsedResult> {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(intervalMs);

    try {
      const resp = await fetch(`${KLING_BASE_URL}/v1/videos/generations/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${KLING_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`[KlingPoll] HTTP ${resp.status}: ${text}`);
        continue;
      }

      const data = await resp.json() as Record<string, unknown>;
      const parsed = klingParseStatusResponse(data);

      if (parsed.status === 'completed' || parsed.status === 'failed') {
        return parsed;
      }
    } catch (e) {
      console.error(`[KlingPoll] Attempt ${i + 1} error:`, e);
    }
  }

  return { status: 'failed', outputs: [], error: 'Kling polling timeout (>6min)' };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
