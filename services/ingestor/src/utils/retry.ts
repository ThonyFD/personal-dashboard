// Retry helper for transient/connection-level failures.
//
// Motivation: the Workload Identity Federation token exchange against
// https://sts.googleapis.com/v1/token occasionally fails at the socket level
// ("Premature close"). The Google client libraries surface this as a gRPC
// UNKNOWN (code 2) that they do NOT classify as transient, so they don't retry
// and the whole process crashes on the first Secret Manager call. We retry it
// ourselves with exponential backoff.

const TRANSIENT_MESSAGE_PATTERNS = [
  'premature close',
  'invalid response body',
  'getting metadata from plugin',
  'sts.googleapis.com',
  'other side closed',
  'socket hang up',
  'econnreset',
  'etimedout',
  'eai_again',
  'epipe',
  'terminated',
  'network',
];

const TRANSIENT_ERROR_CODES = new Set([
  2, // gRPC UNKNOWN — what the STS "Premature close" surfaces as
  14, // gRPC UNAVAILABLE
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_SOCKET',
]);

export function isTransientError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (TRANSIENT_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true;
  }

  const code = (error as { code?: number | string } | null)?.code;
  return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
}

export interface RetryOptions {
  /** Additional attempts after the first try (default 4). */
  retries?: number;
  /** Base delay in ms for exponential backoff (default 500). */
  baseDelayMs?: number;
  /** Maximum backoff delay in ms (default 8000). */
  maxDelayMs?: number;
  /** Label used in retry log messages. */
  label?: string;
  /** Predicate deciding whether an error is worth retrying. */
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 4,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    label = 'operation',
    shouldRetry = isTransientError,
  } = options;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries || !shouldRetry(error)) {
        throw error;
      }
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = backoff + Math.floor(Math.random() * 250);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  ${label} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
