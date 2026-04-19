/**
 * Doubao Seedream Image Generation Adapter.
 * Interfaces with Volcano Engine Ark API for image generation.
 */

/** Shared output file shape used by processors */
export interface OutputFile {
  url: string;
  mime_type?: string;
  sort_order?: number;
}

export interface DoubaoSeedreamParams {
  prompt: string;
  image?: string;   // 参考图 URL
  size?: string;    // 如 "2048x2048"
  model?: string;    // API model ID (e.g. "doubao-seedream-5-0-260128")
  guidance_scale?: number;
  watermark?: boolean;
  response_format?: 'url' | 'b64_json';
}

export interface UpstreamRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Frontend slug → actual API model ID + minimum pixel count */
const MODEL_MAP: Record<string, { apiModel: string; minPixels: number }> = {
  'doubao-seedream-5.0-lite': { apiModel: 'doubao-seedream-5-0-260128', minPixels: 1920 * 1920 },
  'doubao-seedream-4.5':       { apiModel: 'doubao-seedream-4-5-251128', minPixels: 1920 * 1920 },
  'doubao-seedream-4.0':       { apiModel: 'doubao-seedream-4-0-250828', minPixels: 1920 * 1920 },
  'doubao-seedream-3.0-t2i':   { apiModel: 'doubao-seedream-3-0-t2i-250415', minPixels: 1920 * 1920 },
};

function resolveModel(raw: string | undefined): string {
  if (!raw) return MODEL_MAP['doubao-seedream-5.0-lite']!.apiModel;
  if (MODEL_MAP[raw]) return MODEL_MAP[raw]!.apiModel;
  return raw; // allow direct API model IDs
}

function resolveMinPixels(raw: string | undefined): number {
  if (!raw) return 1920 * 1920;
  if (MODEL_MAP[raw]) return MODEL_MAP[raw]!.minPixels;
  return 1920 * 1920;
}

/** Validate input parameters.
 * Accepts either:
 *   - size: "2048x2048" (combined string), or
 *   - width + height (separate fields, e.g. from frontend) → converts to size string
 *
 * Resolves frontend model slugs to actual API model IDs.
 */
export function validate(input: Record<string, unknown>): { valid: boolean; params?: DoubaoSeedreamParams; errors?: Array<{ message: string }> } {
  const prompt = input.prompt as string;
  if (!prompt?.trim()) {
    return { valid: false, errors: [{ message: 'Prompt is required' }] };
  }

  const rawModel = input.model as string | undefined;
  const apiModel = resolveModel(rawModel);
  const minPixels = resolveMinPixels(rawModel);

  // Resolve size: prefer explicit size string, otherwise combine width x height
  let size = (input.size as string) || '2048x2048';
  if (!input.size && (input.width || input.height)) {
    const w = parseInt(input.width as string) || 1920;
    const h = parseInt(input.height as string) || w;
    size = `${w}x${h}`;
  }

  // Validate minimum size for newer models
  const [wStr = '', hStr = ''] = size.split('x');
  const w = parseInt(wStr);
  const h = parseInt(hStr || wStr);
  const actualPixels = w * h;
  if (actualPixels < minPixels) {
    return {
      valid: false,
      errors: [{ message: `图片尺寸需 ≥ ${Math.ceil(Math.sqrt(minPixels))}×${Math.ceil(Math.sqrt(minPixels))}（当前：${w}×${h}）` }],
    };
  }

  const params: DoubaoSeedreamParams = {
    prompt,
    size,
    model: apiModel,
    watermark: (input.watermark as boolean) ?? false,
    response_format: (input.response_format as 'url' | 'b64_json') ?? 'url',
  };
  if (input.image) { params.image = input.image as string; }
  if (input.guidance_scale !== undefined) { params.guidance_scale = input.guidance_scale as number; }

  return { valid: true, params };
}

/** Convert to Doubao Ark API request format */
export function toUpstream(params: DoubaoSeedreamParams, apiKey: string): UpstreamRequest {
  return {
    url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
      prompt: params.prompt,
      image: params.image || undefined,
      size: params.size,
      watermark: params.watermark ?? false,
      response_format: params.response_format ?? 'url',
    },
  };
}

/** Call Doubao Ark API and return parsed outputs */
export async function callAPI(req: UpstreamRequest): Promise<{ outputs: OutputFile[] }> {
  const response = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Doubao API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    data?: Array<{ url?: string; b64_json?: string; size?: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(data.error.message);
  if (!data.data?.length) throw new Error('No images returned');

  const outputs: OutputFile[] = data.data.map((img, i) => ({
    url: img.url ?? '',
    mime_type: 'image/png',
    sort_order: i,
  }));

  return { outputs };
}

/** Estimate cost (in fen/分) */
export function estimateCost(count: number, unitPrice: number): number {
  return Math.round(unitPrice * count);
}
