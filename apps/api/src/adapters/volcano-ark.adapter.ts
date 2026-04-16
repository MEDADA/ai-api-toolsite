/**
 * VolcanoArkAdapter — 火山引擎 Ark API（豆包 Seedance 1.5 Pro）
 *
 * 🔑 API 凭证（已验证可用）：
 * - API Key: 2a020c0a-3116-4210-b94b-b96d3d965b51
 * - Base URL: https://ark.cn-beijing.volces.com
 * - Auth: Bearer Token（无需签名）
 *
 * ✅ 真实调用成功（2026-04-16）：返回 mp4 视频 URL
 */

import type { ValidatedParams, ParsedResult } from './base.adapter'

const API_KEY = process.env.ARK_API_KEY || '2a020c0a-3116-4210-b94b-b96d3d965b51'
const BASE_URL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com'
const MODEL = process.env.ARK_MODEL || 'doubao-seedance-1-5-pro-251215'

interface ArkTask {
  id: string
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  content?: {
    video_url?: string
  }
  output?: {
    results?: Array<{ url: string; type: string }>
  }
  resolution?: string
  duration?: number
  ratio?: string
  error?: { code: string; message: string }
}

async function arkFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BASE_URL}${path}`
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  })
  const data = await resp.json()
  if (data.error) {
    throw new Error(`Ark API [${data.error.code}]: ${data.error.message}`)
  }
  return data
}

async function createArkTask(prompt: string, duration = 5): Promise<string> {
  const result = await arkFetch('/api/v3/contents/generations/tasks', {
    method: 'POST',
    body: JSON.stringify({
      model: MODEL,
      content: [
        {
          type: 'text',
          text: `${prompt} --duration ${duration} --camerafixed false --watermark true`,
        },
      ],
    }),
  })
  return result.id as string
}

async function pollArkTask(taskId: string, maxWaitMs = 120000): Promise<ArkTask> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const task = await arkFetch(`/api/v3/contents/generations/tasks/${taskId}`)
    if (task.status === 'succeeded' || task.status === 'failed') {
      return task
    }
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  throw new Error('Task polling timeout (>120s)')
}

export class VolcanoArkAdapter {
  readonly slug = 'doubao-seedance-1.5-pro'
  readonly type = 'video' as const

  validate(params: unknown): { valid: boolean; errors?: any[]; params?: ValidatedParams } {
    const p = params as Record<string, unknown>
    if (!p.prompt || String(p.prompt).trim().length < 1) {
      return { valid: false, errors: [{ path: 'prompt', message: 'Prompt is required' }] }
    }
    return { valid: true, params: p as ValidatedParams }
  }

  async generate(params: ValidatedParams): Promise<ParsedResult> {
    const p = params as Record<string, unknown>
    const prompt = String(p.prompt)
    const duration = Number(p.duration) || 5

    // 1. 创建任务
    const taskId = await createArkTask(prompt, duration)

    // 2. 轮询直到完成（最多 2 分钟）
    const task = await pollArkTask(taskId)

    if (task.status === 'failed') {
      return { status: 'failed', outputs: [], error: task.error?.message || 'Generation failed' }
    }

    const videoUrl = task.content?.video_url || task.output?.results?.[0]?.url

    return {
      status: 'completed',
      outputs: [
        {
          url: videoUrl,
          mime_type: 'video/mp4',
          sort_order: 0,
          metadata: {
            resolution: task.resolution,
            duration: task.duration,
            ratio: task.ratio,
            task_id: taskId,
          },
        },
      ],
    }
  }

  estimateCost(params: ValidatedParams): number {
    const duration = Number((params as Record<string, unknown>).duration) || 5
    return duration * 150 // ¥1.5/秒 × 100分
  }
}

export const volcanoArkAdapter = new VolcanoArkAdapter()
