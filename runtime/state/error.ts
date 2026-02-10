/**
 * Structured error type for the Arcane engine.
 * Provides machine-readable codes, human-readable messages, and actionable context.
 * Follows the error design in docs/api-design.md.
 *
 * - `code` - Machine-readable error code (e.g., "TRANSACTION_FAILED", "INVALID_PATH").
 * - `message` - Human-readable error description.
 * - `context.action` - What operation was being attempted.
 * - `context.reason` - Why the operation failed.
 * - `context.state` - Optional snapshot of relevant state at failure time.
 * - `context.suggestion` - Optional suggestion for how to fix the error.
 */
export type ArcaneError = Readonly<{
  code: string;
  message: string;
  context: Readonly<{
    action: string;
    reason: string;
    state?: Readonly<Record<string, unknown>>;
    suggestion?: string;
  }>;
}>;

/**
 * Create an ArcaneError with structured context.
 * Pure function — returns a new frozen error object.
 *
 * @param code - Machine-readable error code (e.g., "TRANSACTION_FAILED").
 * @param message - Human-readable error description.
 * @param context - Structured context with action, reason, and optional suggestion.
 * @returns A new ArcaneError object.
 */
export function createError(
  code: string,
  message: string,
  context: ArcaneError["context"],
): ArcaneError {
  return { code, message, context };
}
