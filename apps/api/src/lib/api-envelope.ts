export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  code?: string;
  message?: string;
  data?: T;
  requestId?: string;
}

export function success<T>(data: T, requestId?: string): ApiEnvelope<T> {
  return {
    ok: true,
    data,
    requestId,
  };
}

export function fail(
  code: string,
  message: string,
  requestId?: string
): ApiEnvelope<never> {
  return {
    ok: false,
    code,
    message,
    requestId,
  };
}

export function errorResponse(
  reply: { code: number; send: (body: unknown) => unknown },
  httpStatus: number,
  code: string,
  message: string,
  requestId?: string
) {
  return reply.code(httpStatus).send(fail(code, message, requestId));
}
