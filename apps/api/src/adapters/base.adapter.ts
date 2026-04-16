// Shared types for all generation adapters

export interface ValidatedParams {
  [key: string]: unknown
}

export interface OutputFile {
  url: string
  mime_type: string
  sort_order: number
  thumbnail_url?: string
  metadata?: Record<string, unknown>
}

export interface ParsedResult {
  status: 'completed' | 'failed'
  outputs: OutputFile[]
  error?: string
}
