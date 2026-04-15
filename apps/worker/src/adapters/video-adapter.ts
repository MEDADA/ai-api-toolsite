/**
 * Seedance Video Generation Adapter.
 * Interfaces with 火山引擎 (Volcengine) Visual Generation API.
 */

import { z } from 'zod';

export const SeedanceVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(500),
  duration: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]).default(5),
  resolution: z.enum(['540p', '720p', '1080p', '4K']).default('1080p'),
  reference_image_url: z.string().url().optional(),
  fps: z.number().optional().default(24),
  camera_control: z.record(z.unknown()).optional(),
});

export type SeedanceVideoParams = z.infer<typeof SeedanceVideoParamsSchema>;

export interface UpstreamRequest {
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface ParsedResult {
  status: 'completed' | 'failed';
  outputs: Array<{
    url: string;
    thumbnail_url?: string;
    duration?: number;
    width?: number;
    height?: number;
    mime_type?: string;
  }>;
  error?: string;
  jobId?: string;
}

interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
  params?: SeedanceVideoParams;
}

/** Validate input parameters */
export function validate(params: unknown): ValidationResult {
  const result = SeedanceVideoParamsSchema.safeParse(params);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    };
  }
  return { valid: true, params: result.data };
}

function signVolcengineRequest(
  method: string,
  path: string,
  body: string,
  accessKey: string,
  secretKey: string,
  timestamp: string
): string {
  // Simplified signature — in production use proper HMAC-SHA256
  const crypto = require('crypto') as typeof import('crypto');
  const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

/** Convert to 火山引擎 Visual Generation API request */
export function toUpstream(params: SeedanceVideoParams, config: {
  access_key: string;
  secret_key: string;
  account_id: string;
  space_name: string;
}): UpstreamRequest {
  const body: Record<string, unknown> = {
    model: 'seedance-2-0',
    request_id: `seedance_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    prompt: params.prompt,
    duration: params.duration ?? 5,
    resolution: params.resolution ?? '1080p',
    fps: params.fps ?? 24,
  };

  if (params.reference_image_url) {
    body.reference_image_url = params.reference_image_url;
  }

  if (params.camera_control) {
    body.camera_control = params.camera_control;
  }

  const bodyStr = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const path = '/api/v1/visual_generation/video';

  const signature = signVolcengineRequest(
    'POST', path, bodyStr,
    config.access_key, config.secret_key, timestamp
  );

  return {
    url: `https://visual.volcengineapi.com${path}`,
    method: 'POST',
    headers: {
      'X-Access-Key': config.access_key,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
    body,
  };
}

/** Parse 火山引擎 response */
export function parseResponse(data: Record<string, unknown>): ParsedResult {
  const code = data.code;
  const message = data.message as string ?? '';

  if (code !== 0 && code !== '0') {
    return { status: 'failed', outputs: [], error: message };
  }

  const videoData = data.data as Record<string, unknown> | undefined;
  if (!videoData) {
    return { status: 'failed', outputs: [], error: 'No video data in response' };
  }

  const duration = videoData.duration as number | undefined;
  const videoUrl = videoData.video_url as string | undefined;

  if (!videoUrl) {
    return { status: 'failed', outputs: [], error: 'No video URL in response' };
  }

  return {
    status: 'completed',
    outputs: [{
      url: videoUrl,
      thumbnail_url: videoData.thumbnail_url ? String(videoData.thumbnail_url) : undefined,
      duration: duration ?? 5,
      mime_type: 'video/mp4',
    }],
    jobId: videoData.task_id as string | undefined,
  };
}

/** Poll 火山引擎 job status */
export async function pollStatus(
  jobId: string,
  config: {
    access_key: string;
    secret_key: string;
  }
): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed'; progress?: number; result?: ParsedResult }> {
  const timestamp = new Date().toISOString();
  const path = `/api/v1/visual_generation/video/${jobId}`;
  const signature = signVolcengineRequest('GET', path, '', config.access_key, config.secret_key, timestamp);

  const resp = await fetch(`https://visual.volcengineapi.com${path}`, {
    headers: {
      'X-Access-Key': config.access_key,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) return { status: 'failed' };

  const data = await resp.json() as Record<string, unknown>;

  // Check status from response
  const statusStr = (data.status as string ?? '').toLowerCase();
  if (statusStr === 'success' || statusStr === 'completed') {
    return { status: 'completed', result: parseResponse(data) };
  }
  if (statusStr === 'failed') {
    return { status: 'failed', result: parseResponse(data) };
  }

  const progress = data.progress as number | undefined;
  return {
    status: statusStr === 'pending' ? 'pending' : 'processing',
    progress: progress ?? undefined,
  };
}

/** Estimate cost (in fen/分) based on duration × unit price */
export function estimateCost(params: SeedanceVideoParams, unitPricePerSecond: number): number {
  const duration = params.duration ?? 5;
  return Math.round(unitPricePerSecond * duration);
}
