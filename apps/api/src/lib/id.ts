import { randomBytes, createHash } from 'crypto';

/**
 * Generate a CUID-like ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('base64url');
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Generate a request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('base64url')}`;
}

/**
 * Hash a string (for idempotency key check)
 */
export function hashString(str: string): string {
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Generate a merchant order number
 */
export function generateOrderNo(prefix = 'R'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
