/**
 * FLUX.2 Image Generation Adapter.
 * Interfaces with Replicate API (and compatible endpoints).
 */

import { z } from 'zod';

export const FluxImageParamsSchema = z.object({
  prompt: z.string().min(1).max(2000),
  reference_image_url: z.string().url().optional(),
  width: z.enum(['512', '1024', '1080']).default('1024'),
  height: z.enum(['512', '1024', '1920']).default('1024'),
  style: z.string().optional(),
  num_inference_steps: z.enum(['fast', 'standard', 'high']).default('standard'),
  image_count: z.number().int().min(1).max(4).default(1),
  strength: z.number().min(0).max(1).default(0.7),
});

export type FluxImageParams = z.infer<typeof FluxImageParamsSchema>;

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
    width?: number;
    height?: number;
    mime_type?: string;
  }>;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
  params?: FluxImageParams;
}

/** Validate input parameters */
export function validate(params: unknown): ValidationResult {
  const result = FluxImageParamsSchema.safeParse(params);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }
  return { valid: true, params: result.data };
}

/** Convert to Replicate API request format */
export function toUpstream(params: FluxImageParams, apiKey: string, baseUrl?: string): UpstreamRequest {
  const base = baseUrl ?? 'https://api.replicate.com';

  const body: Record<string, unknown> = {
    version: 'latest',
    input: {
      prompt: params.prompt,
      num_outputs: params.image_count,
      aspect_ratio: `${params.width}:${params.height}`,
    },
  };

  // Inference steps mapping
  const stepsMap: Record<string, number> = { fast: 4, standard: 20, high: 50 };
  (body.input as Record<string, unknown>).num_inference_steps = stepsMap[params.num_inference_steps] ?? 20;

  if (params.reference_image_url) {
    (body.input as Record<string, unknown>).image = params.reference_image_url;
    (body.input as Record<string, unknown>).strength = params.strength ?? 0.7;
  }

  if (params.style) {
    (body.input as Record<string, unknown>).style = params.style;
  }

  return {
    url: `${base}/v1/predictions`,
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  };
}

/** Parse Replicate prediction response */
export function parseResponse(data: Record<string, unknown>): ParsedResult {
  const status = data.status as string;

  if (status === 'failed' || status === 'canceled') {
    return {
      status: 'failed',
      outputs: [],
      error: String(data.error ?? 'Generation failed'),
    };
  }

  if (status === 'succeeded') {
    const output = data.output as string | string[] | undefined;
    const urls = Array.isArray(output) ? output : output ? [output] : [];

    return {
      status: 'completed',
      outputs: urls.map((url, i) => ({
        url,
        sort_order: i,
        mime_type: 'image/png',
      })),
    };
  }

  return {
    status: 'failed',
    outputs: [],
    error: `Unexpected status: ${status}`,
  };
}

/** Poll Replicate prediction status */
export async function pollStatus(
  predictionId: string,
  apiKey: string,
  baseUrl?: string,
  totalSteps?: number
): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed'; progress: number; result?: ParsedResult }> {
  const base = baseUrl ?? 'https://api.replicate.com';
  const resp = await fetch(`${base}/v1/predictions/${predictionId}`, {
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    return { status: 'failed' };
  }

  const data = await resp.json() as Record<string, unknown>;
  const status = data.status as string;

  if (status === 'succeeded') return { status: 'completed', progress: 100, result: parseResponse(data) };
  if (status === 'failed' || status === 'canceled') return { status: 'failed', progress: 0, result: parseResponse(data) };

  const sampleCount = data.metrics ? (data.metrics as Record<string, number>).sample_count : undefined;
  const steps = totalSteps ?? 20;
  const pct = sampleCount !== undefined ? Math.min(100, Math.round((sampleCount / steps) * 100)) : undefined;

  return {
    status: status === 'starting' ? 'pending' : 'processing',
    progress: pct ?? 50, // default to 50% if unknown
  };
}

/** Estimate cost (in fen/分) */
export function estimateCost(params: FluxImageParams, unitPrice: number): number {
  const count = params.image_count ?? 1;
  return Math.round(unitPrice * count);
}
