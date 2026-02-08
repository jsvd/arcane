/** Structured error type — per docs/api-design.md */
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

/** Create an ArcaneError */
export function createError(
  code: string,
  message: string,
  context: ArcaneError["context"],
): ArcaneError {
  return { code, message, context };
}
