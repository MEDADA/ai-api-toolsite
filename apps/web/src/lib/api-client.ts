const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOpts } = options;

    let url = `${API_BASE}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
      ).toString();
      url += `?${qs}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...fetchOpts.headers,
    };

    const response = await fetch(url, {
      ...fetchOpts,
      headers,
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      const error = new Error(json.message ?? `HTTP ${response.status}`) as Error & { code?: string };
      error.code = json.code;
      throw error;
    }

    return json.data ?? json;
  }

  // Auth
  async sendCode(phone: string) {
    return this.fetch<{ ok: boolean; expires_in: number }>('/api/v1/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async loginByCode(phone: string, code: string) {
    return this.fetch<{
      ok: boolean; first_login: boolean; user: Record<string, unknown>;
      access_token: string; refresh_token: string; expires_in: number;
    }>('/api/v1/auth/login-by-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.fetch<{ ok: boolean; access_token: string; expires_in: number }>(
      '/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
  }

  // Models
  async getModels(type?: string) {
    return this.fetch<{ models: Array<Record<string, unknown>> }>(
      '/api/v1/models', { params: { type } }
    );
  }

  // Tasks
  async createTask(params: Record<string, unknown>) {
    return this.fetch<{
      task_id: string; status: string; total_cost: number;
      balance: Record<string, number>; expires_at: string; stream_url: string;
    }>('/api/v1/tasks/generate', { method: 'POST', body: JSON.stringify(params) });
  }

  async getTask(taskId: string) {
    return this.fetch<Record<string, unknown>>(`/api/v1/tasks/${taskId}`);
  }

  async listTasks(opts: { type?: string; status?: string; page?: number; page_size?: number } = {}) {
    return this.fetch<{
      tasks: Array<Record<string, unknown>>;
      pagination: Record<string, number>;
    }>('/api/v1/tasks', { params: opts });
  }

  // User
  async getBalance() {
    return this.fetch<{
      available: number; frozen: number; total_recharged: number; total_spent: number;
    }>('/api/v1/user/balance');
  }

  async getLedger(opts: { tx_type?: string; page?: number; page_size?: number } = {}) {
    return this.fetch<{
      records: Array<Record<string, unknown>>; pagination: Record<string, number>;
    }>('/api/v1/user/wallet/ledger', { params: opts });
  }

  async getProfile() {
    return this.fetch<Record<string, unknown>>('/api/v1/user/profile');
  }

  async getConsumption(opts: { page?: number; page_size?: number } = {}) {
    return this.fetch<{
      records: Array<Record<string, unknown>>; pagination: Record<string, number>;
    }>('/api/v1/user/consumption', { params: opts });
  }

  // Recharge
  async createRecharge(amount: number, payMethod: string) {
    return this.fetch<{ order_no: string; pay_url: string; qr_code_url?: string }>(
      '/api/v1/user/recharge', { method: 'POST', body: JSON.stringify({ amount, pay_method: payMethod }) }
    );
  }

  async listRecharges() {
    return this.fetch<{ orders: Array<Record<string, unknown>> }>('/api/v1/user/recharges');
  }

  // Favorites
  async listFavorites() {
    return this.fetch<{ favorites: Array<Record<string, unknown>> }>('/api/v1/favorites');
  }

  async addFavorite(taskId: string) {
    return this.fetch<{ favorite_id: string }>('/api/v1/favorites', {
      method: 'POST', body: JSON.stringify({ task_id: taskId }),
    });
  }

  async removeFavorite(id: string) {
    return this.fetch('/api/v1/favorites', { method: 'DELETE' });
  }

  // OSS
  async getUploadToken(type: 'UPLOAD' | 'RESULT' | 'THUMBNAIL') {
    return this.fetch<{
      AccessKeyId: string; AccessKeySecret: string; SecurityToken: string;
      Expiration: string; bucket: string; endpoint: string; upload_dir: string;
    }>('/api/v1/oss/upload-token', { method: 'POST', body: JSON.stringify({ type }) });
  }
}

export const apiClient = new ApiClient();
