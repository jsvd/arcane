/**
 * Screen-space rendering context.
 *
 * Provides {@link withScreenSpace} to batch multiple draw calls
 * as screen-space without repeating `screenSpace: true` on each one.
 * Explicit `screenSpace` on individual calls always wins.
 */

/** Stack depth — simple counter since we only track one boolean. */
let _ssDepth = 0;

/**
 * Execute a callback with screen-space rendering active.
 * All draw calls inside `fn` that don't explicitly set `screenSpace`
 * will default to `screenSpace: true`.
 *
 * Nesting is safe — the context pops when each `withScreenSpace` returns.
 * Explicit `screenSpace: true` or `screenSpace: false` on individual
 * calls always overrides the context.
 *
 * @param fn - Callback containing draw calls.
 *
 * @example
 * withScreenSpace(() => {
 *   drawRect(10, 10, 200, 30, { color: red });   // auto screen-space
 *   drawText("HP: 100", 15, 15, { scale: 2 });   // auto screen-space
 *   drawSprite({ ..., screenSpace: false });       // explicit override wins
 * });
 */
export function withScreenSpace(fn: () => void): void {
  _ssDepth++;
  try {
    fn();
  } finally {
    _ssDepth--;
  }
}

/**
 * Check whether a `withScreenSpace` context is currently active.
 *
 * @returns `true` if inside a `withScreenSpace()` callback.
 */
export function isScreenSpaceActive(): boolean {
  return _ssDepth > 0;
}

/**
 * Resolve the effective screen-space flag for a draw call.
 *
 * If `explicit` is `true` or `false`, returns that value (caller wins).
 * If `explicit` is `undefined`, returns `true` when inside a
 * `withScreenSpace()` context, `false` otherwise.
 *
 * @param explicit - The caller-supplied `screenSpace` option (may be undefined).
 * @returns The resolved screen-space flag.
 *
 * @internal Used by drawSprite, drawText, drawRect, shapes, etc.
 */
export function resolveScreenSpace(explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  return _ssDepth > 0;
}
