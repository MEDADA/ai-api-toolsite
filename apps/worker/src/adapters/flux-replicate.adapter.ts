/**
 * flux-replicate.adapter.ts — FLUX via Replicate API
 *
 * 🔑 API 凭证（由用户提供）：
 *   - API Token: REPLICATE_API_TOKEN 环境变量
 *   - Base URL: https://api.replicate.com
 *
 * 模型版本：
 *   - black-forest-labs/flux-1.1-pro: 商业级画质，最新
 *   - black-forest-labs/flux-schnell: 快速生成（1-4步）
 *
 * 尺寸参考：
 *   - flux-pro: 1024×1024, 576×1024, 1024×576, 1152×896, 896×1152, 1344×768, 768×1344, 1536×640, 640×1536
 *   - flux-schnell: 同上但最高 1024×1024
 */

import { z } from 'zod';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? '';
const REPLICATE_BASE = 'https://api.replicate.com';

export const FluxProParamsSchema = z.object({
  prompt: z.string().min(1, 'Prompt 不能为空'),
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '3:2', '2:3', '4:3', '3:4', '21:9']).default('1:1'),
  // 图像质量/风格
  guidance_scale: z.number().min(1).max(20).default(3.5),
  // 输出尺寸映射
  width: z.number().default(1024),
  height: z.number().default(1024),
  // 生成步数（仅 schnell）
  num_inference_steps: z.number().int().min(1).max(50).optional(),
  // 参考图（可选）
  image_prompt: z.string().url().optional(),
  // 负面提示词
  negative_prompt: z.string().optional(),
});

export type FluxProParams = z.infer<typeof FluxProParamsSchema>;

export interface FluxParsedResult {
  status: 'completed' | 'failed' | 'processing';
  outputs: Array<{ url: string; width?: number; height?: number }>;
  error?: string;
  jobId?: string;
}

// Make all fields optional in internal return types (exactOptionalPropertyTypes)
export interface FluxPollResult {
  status: 'completed' | 'failed' | 'processing';
  outputs: Array<{ url: string; width?: number; height?: number }>;
  error?: string;
  jobId?: string;
}

/** 尺寸 → width/height 映射表 */
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  '1:1':   { width: 1024, height: 1024 },
  '16:9':   { width: 1344, height: 768  },
  '9:16':   { width: 768,  height: 1344 },
  '3:2':    { width: 1152, height: 768  },
  '2:3':    { width: 768,  height: 1152 },
  '4:3':    { width: 1024, height: 768  },
  '3:4':    { width: 768,  height: 1024 },
  '21:9':   { width: 1536, height: 640  },
};

export function fluxValidate(params: unknown): {
  valid: boolean;
  errors?: Array<{ message: string }>;
  params?: FluxProParams;
} {
  // 兼容旧格式：直接传 width/height
  const raw = params as Record<string, unknown>;
  const safe = {
    ...raw,
    aspect_ratio: (raw.aspect_ratio as string) || '1:1',
    guidance_scale: Number(raw.guidance_scale ?? 3.5),
    width: Number(raw.width ?? (ASPECT_RATIO_MAP[raw.aspect_ratio as string]?.width ?? 1024)),
    height: Number(raw.height ?? (ASPECT_RATIO_MAP[raw.aspect_ratio as string]?.height ?? 1024)),
  };
  const result = FluxProParamsSchema.safeParse(safe);
  if (!result.success) {
    return { valid: false, errors: result.error.errors.map(e => ({ message: e.message })) };
  }
  return { valid: true, params: result.data };
}

export function fluxToUpstream(params: FluxProParams): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const size = ASPECT_RATIO_MAP[params.aspect_ratio] ?? { width: params.width, height: params.height };

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspect_ratio,
    guidance_scale: params.guidance_scale,
    output_quality: 95,
    num_images: 1,
  };

  if (params.negative_prompt) {
    input.negative_prompt = params.negative_prompt;
  }
  if (params.image_prompt) {
    input.image_prompt = params.image_prompt;
  }
  if (params.num_inference_steps) {
    input.num_inference_steps = params.num_inference_steps;
  }

  return {
    url: `${REPLICATE_BASE}/v1/models/black-forest-labs/flux-1.1-pro/predictions`,
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: { version: 'ac732df83cea7fff18b8472768c88ad043c350aa8664dca64df87ddf977a8b09', input },
  };
}

export function fluxParseCreateResponse(data: Record<string, unknown>): {
  status: 'completed' | 'failed' | 'processing';
  jobId?: string;
  error?: string;
} {
  const id = data.id as string | undefined;
  if (!id) {
    // 有错误
    const errors = data.errors as Array<{ status: number; detail: string }> | undefined;
    if (errors?.length) {
      return { status: 'failed', error: errors[0].detail ?? 'Replicate error' };
    }
    return { status: 'failed', error: 'No prediction ID in Replicate response' };
  }

  const status = data.status as string;
  if (status === 'failed') {
    return { status: 'failed', error: 'Replicate prediction failed: ' + JSON.stringify(data.output ?? data) };
  }
  if (status === 'succeeded') {
    // 同步完成的模型（schnell）
    const output = data.output as string[] | undefined;
    if (output?.length) {
      return { status: 'completed', jobId: id as string | undefined };
    }
  }
  return { status: 'processing', jobId: id as string | undefined };
}

export function fluxParseStatusResponse(data: Record<string, unknown>): FluxPollResult {
  const status = data.status as string;
  const id = data.id as string | undefined;

  if (status === 'failed') {
    const errors = data.errors as Array<{ status: number; detail: string }> | undefined;
    return { status: 'failed', outputs: [], error: errors?.[0]?.detail ?? 'Generation failed', jobId: id as string | undefined };
  }

  if (status === 'succeeded') {
    const output = data.output as string[] | undefined;
    if (output?.length) {
      return { status: 'completed', outputs: [{ url: output[0] }], jobId: id as string | undefined };
    }
    return { status: 'failed', outputs: [], error: 'No output in succeeded prediction', jobId: id as string | undefined };
  }

  // processing / starting
  return { status: 'processing', outputs: [], jobId: id as string | undefined };
}

/** 轮询 Replicate prediction */
export async function fluxPollStatus(jobId: string, maxRetries = 60, intervalMs = 3000): Promise<FluxPollResult> {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(intervalMs);

    try {
      const resp = await fetch(`${REPLICATE_BASE}/v1/predictions/${jobId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        console.error(`[FluxPoll] HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json() as Record<string, unknown>;
      const parsed = fluxParseStatusResponse(data);

      if (parsed.status === 'completed' || parsed.status === 'failed') {
        return parsed;
      }
    } catch (e) {
      console.error(`[FluxPoll] Attempt ${i + 1} error:`, e);
    }
  }

  return { status: 'failed', outputs: [], error: 'Flux polling timeout (>3min)' };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
