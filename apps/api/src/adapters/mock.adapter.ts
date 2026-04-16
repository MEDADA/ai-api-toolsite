/**
 * Mock Seedance Adapter — 本地开发/测试用
 * 替换为真实 Volcano Engine API 调用时，只需改这里
 */

import type { ValidatedParams, ParsedResult } from './base.adapter'

export class MockSeedanceAdapter {
  readonly slug = 'seedance-1.5-pro'
  readonly type = 'video' as const

  validate(params: unknown): { valid: boolean; errors?: any[]; params?: ValidatedParams } {
    const p = params as Record<string, any>
    if (!p.prompt || p.prompt.length < 1) {
      return { valid: false, errors: [{ path: 'prompt', message: 'Prompt is required' }] }
    }
    return { valid: true, params: p as ValidatedParams }
  }

  async generate(params: ValidatedParams): Promise<ParsedResult> {
    // 模拟生成延迟 3-8 秒
    const delay = 3000 + Math.random() * 5000
    await new Promise(resolve => setTimeout(resolve, delay))

    // 随机决定成功/失败（90% 成功）
    if (Math.random() < 0.1) {
      return {
        status: 'failed',
        outputs: [],
        error: 'Mock: upstream timeout (10% chance in mock mode)'
      }
    }

    // 返回 Unsplash 视频/图片作为模拟结果
    const images = [
      'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
    ]
    const selected = images.slice(0, Math.min(params.image_count ?? 1, 3))

    return {
      status: 'completed',
      outputs: selected.map((url, i) => ({
        url,
        thumbnail_url: url.replace('w=800', 'w=300'),
        mime_type: 'image/jpeg',
        sort_order: i,
      })),
    }
  }

  estimateCost(params: ValidatedParams): number {
    const duration = (params as any).duration ?? 5
    return duration * 150 // ¥1.5/秒 × 100分
  }
}

export const mockSeedanceAdapter = new MockSeedanceAdapter()
