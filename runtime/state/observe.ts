import type { Diff } from "./transaction.ts";

/**
 * Callback invoked when an observed path changes.
 * Receives the new value, old value, and context about the change.
 *
 * @param newValue - The value after the change.
 * @param oldValue - The value before the change.
 * @param context - Metadata about the change (path, full diff).
 */
export type ObserverCallback<T = unknown> = (
  newValue: T,
  oldValue: T,
  context: ObserverContext,
) => void;

/**
 * Context provided to observer callbacks when a change is detected.
 *
 * - `path` - The specific path that changed (e.g., "player.hp").
 * - `diff` - The full Diff from the transaction that triggered this notification.
 */
export type ObserverContext = Readonly<{
  path: string;
  diff: Diff;
}>;

/**
 * Function returned by observe() to unsubscribe from further notifications.
 * Call it to stop receiving callbacks for that subscription.
 */
export type Unsubscribe = () => void;

/**
 * Pattern for matching state paths. Supports `*` wildcards at any segment position.
 * Examples: "player.hp", "enemies.*.hp", "*.position".
 * Each `*` matches exactly one path segment.
 */
export type PathPattern = string;

/**
 * Observer registry that manages subscriptions and dispatches change notifications.
 * Created via {@link createObserverRegistry}. Used internally by GameStore.
 *
 * - `observe` - Subscribe to changes matching a path pattern. Returns an Unsubscribe function.
 * - `notify` - Dispatch notifications to all matching observers for a given diff.
 * - `clear` - Remove all observers (useful for cleanup/reset).
 */
export type ObserverRegistry<S> = Readonly<{
  /** Subscribe to changes at a path pattern. Returns an unsubscribe function. */
  observe: <T = unknown>(
    pattern: PathPattern,
    callback: ObserverCallback<T>,
  ) => Unsubscribe;

  /** Notify all matching observers after a transaction commits. */
  notify: (oldState: S, newState: S, diff: Diff) => void;

  /** Remove all observers. */
  clear: () => void;
}>;

type Subscription = {
  pattern: PathPattern;
  callback: ObserverCallback;
};

/**
 * Create a new observer registry for tracking state change subscriptions.
 * Used internally by {@link createStore} to power the store's observe() method.
 *
 * @returns A new ObserverRegistry with observe, notify, and clear methods.
 */
export function createObserverRegistry<S>(): ObserverRegistry<S> {
  const subscriptions = new Set<Subscription>();

  return {
    observe<T = unknown>(
      pattern: PathPattern,
      callback: ObserverCallback<T>,
    ): Unsubscribe {
      const sub: Subscription = {
        pattern,
        callback: callback as ObserverCallback,
      };
      subscriptions.add(sub);
      return () => {
        subscriptions.delete(sub);
      };
    },

    notify(oldState: S, newState: S, diff: Diff): void {
      for (const entry of diff.entries) {
        for (const sub of subscriptions) {
          if (pathMatches(sub.pattern, entry.path)) {
            sub.callback(
              getByPath(newState, entry.path),
              getByPath(oldState, entry.path),
              { path: entry.path, diff },
            );
          }
        }
      }
    },

    clear(): void {
      subscriptions.clear();
    },
  };
}

// --- Internal: path pattern matching ---

/** Check if a concrete path matches a pattern with * wildcards */
function pathMatches(pattern: string, path: string): boolean {
  const patternParts = pattern.split(".");
  const pathParts = path.split(".");

  if (patternParts.length !== pathParts.length) return false;

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "*") continue;
    if (patternParts[i] !== pathParts[i]) return false;
  }

  return true;
}

/** Traverse an object by dot-separated path */
function getByPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
