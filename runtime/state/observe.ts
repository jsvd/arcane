import type { Diff } from "./transaction.ts";

/** Observer callback — receives new value, old value, and context */
export type ObserverCallback<T = unknown> = (
  newValue: T,
  oldValue: T,
  context: ObserverContext,
) => void;

/** Context provided to observer callbacks */
export type ObserverContext = Readonly<{
  path: string;
  diff: Diff;
}>;

/** Unsubscribe function */
export type Unsubscribe = () => void;

/** Pattern for path matching (supports * wildcards) */
export type PathPattern = string;

/** Observer registry — manages subscriptions and dispatches notifications */
export type ObserverRegistry<S> = Readonly<{
  /** Subscribe to changes at a path pattern */
  observe: <T = unknown>(
    pattern: PathPattern,
    callback: ObserverCallback<T>,
  ) => Unsubscribe;

  /** Notify all matching observers after a transaction commits */
  notify: (oldState: S, newState: S, diff: Diff) => void;

  /** Remove all observers */
  clear: () => void;
}>;

type Subscription = {
  pattern: PathPattern;
  callback: ObserverCallback;
};

/** Create a new observer registry */
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
