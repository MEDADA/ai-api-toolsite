import type {
  LoginResult,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskDetailResponse,
  WalletBalance,
  WalletLedgerRecord,
  ModelListResponse,
  StsToken,
  RechargeCreateRequest,
  RechargeCreateResponse,
  RechargeRecord,
  SSECompleted,
  SSEFailed,
  SSEProgress,
  SSETaskQueued,
  SSETaskStarted,
} from '@/lib/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | undefined>;
};

// ─── SSE Event Types ────────────────────────────────────────
export type TaskStreamEvent =
  | { type: 'queued'; data: SSETaskQueued }
  | { type: 'started'; data: SSETaskStarted }
  | { type: 'progress'; data: SSEProgress }
  | { type: 'completed'; data: SSECompleted }
  | { type: 'failed'; data: SSEFailed };

// ─── ApiClient ──────────────────────────────────────────────
class ApiClient {
  private _token: string | null = null;

  setAuthToken(token: string): void {
    this._token = token;
  }

  clearAuthToken(): void {
    this._token = null;
  }

  getAuthToken(): string | null {
    return this._token;
  }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOpts } = options;

    let url = `${API_BASE}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this._token && { Authorization: `Bearer ${this._token}` }),
      ...fetchOpts.headers,
    };

    const response = await fetch(url, {
      ...fetchOpts,
      headers,
    });

    if (response.status === 401) {
      // Trigger logout by clearing token
      this.clearAuthToken();
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/?login=required';
      }
      throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTHORIZED' });
    }

    const json = (await response.json()) as { ok?: boolean; message?: string; code?: string; data?: T };

    if (!response.ok || json.ok === false) {
      const err = new Error(json.message ?? `HTTP ${response.status}`) as Error & { code?: string; status?: number };
      if (json.code !== undefined) { err.code = json.code; }
      if (response.status !== undefined) { err.status = response.status; }
      throw err;
    }

    return (json.data ?? json) as T;
  }

  // ── Auth ──────────────────────────────────────────────────
  readonly auth = {
    sendCode: (phone: string): Promise<{ ok: boolean; expires_in: number }> =>
      this.fetch('/api/v1/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    loginByCode: (phone: string, code: string): Promise<LoginResult> =>
      this.fetch('/api/v1/auth/login-by-code', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),

    refresh: (refreshToken: string): Promise<{ ok: boolean; access_token: string; expires_in: number }> =>
      this.fetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
  };

  // ── Models ─────────────────────────────────────────────────
  readonly models = {
    list: (type?: string): Promise<ModelListResponse> =>
      this.fetch('/api/v1/models', { params: { type } }),
  };

  // ── Tasks ─────────────────────────────────────────────────
  readonly tasks = {
    create: (params: CreateTaskRequest): Promise<CreateTaskResponse> =>
      this.fetch('/api/v1/tasks/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    get: (taskId: string): Promise<TaskDetailResponse> =>
      this.fetch(`/api/v1/tasks/${taskId}`),

    list: (filters: {
      type?: string;
      status?: string;
      page?: number;
      page_size?: number;
    } = {}): Promise<{ tasks: TaskDetailResponse[]; pagination: { total: number; page: number; page_size: number; total_pages: number } }> =>
      this.fetch('/api/v1/tasks', { params: filters }),

    /**
     * Connects to SSE stream for a task.
     * In browser: returns EventSource (caller must call .close()).
     * In test/server env: returns a mock controller for testing.
     */
    getStream(taskId: string): EventSource {
      const url = `${API_BASE}/api/v1/tasks/${taskId}/stream`;
      const es = new EventSource(url, { withCredentials: true });
      return es;
    },
  };

  /**
   * Polls a task until completion or failure.
   * Returns final task state.
   */
  async pollTaskUntilDone(taskId: string, intervalMs = 3000): Promise<TaskDetailResponse> {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const task = await this.tasks.get(taskId);
          if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
            clearInterval(timer);
            resolve(task);
          }
        } catch (e) {
          clearInterval(timer);
          reject(e);
        }
      }, intervalMs);
    });
  }

  // ── Wallet ────────────────────────────────────────────────
  readonly wallet = {
    getBalance: (): Promise<WalletBalance> =>
      this.fetch('/api/v1/user/balance'),

    getLedger: (opts: {
      tx_type?: string;
      page?: number;
      page_size?: number;
    } = {}): Promise<{
      records: WalletLedgerRecord[];
      pagination: { total: number; page: number; page_size: number; total_pages: number };
    }> => this.fetch('/api/v1/user/wallet/ledger', { params: opts }),

    getConsumption: (opts: {
      page?: number;
      page_size?: number;
    } = {}): Promise<{
      records: WalletLedgerRecord[];
      pagination: { total: number; page: number; page_size: number; total_pages: number };
    }> => this.fetch('/api/v1/user/consumption', { params: opts }),
  };

  // ── Recharge ───────────────────────────────────────────────
  readonly recharge = {
    create: (params: RechargeCreateRequest): Promise<RechargeCreateResponse> =>
      this.fetch('/api/v1/user/recharge', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    list: (): Promise<{ orders: RechargeRecord[] }> =>
      this.fetch('/api/v1/user/recharges'),
  };

  // ── Favorites ─────────────────────────────────────────────
  readonly favorites = {
    list: (): Promise<{ favorites: Array<{ id: string; task_id: string; created_at: string; task: TaskDetailResponse }> }> =>
      this.fetch('/api/v1/favorites'),

    add: (taskId: string): Promise<{ favorite_id: string }> =>
      this.fetch('/api/v1/favorites', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      }),

    remove: (id: string): Promise<void> =>
      this.fetch(`/api/v1/favorites/${id}`, { method: 'DELETE' }),
  };

  // ── OSS ────────────────────────────────────────────────────
  readonly oss = {
    getUploadToken: (type: 'UPLOAD' | 'RESULT' | 'THUMBNAIL'): Promise<StsToken> =>
      this.fetch('/api/v1/oss/upload-token', {
        method: 'POST',
        body: JSON.stringify({ type }),
      }),
  };

  // ── User ──────────────────────────────────────────────────
  readonly user = {
    getProfile: (): Promise<LoginResult['user']> =>
      this.fetch('/api/v1/user/profile'),
  };
}

export const apiClient = new ApiClient();
