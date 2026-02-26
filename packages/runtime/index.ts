/**
 * @arcane/runtime — Agent-native 2D game engine runtime
 *
 * This package contains the TypeScript runtime APIs for Arcane.
 * Import specific modules from subpaths:
 *
 * @example
 * ```typescript
 * import { createStore } from "@arcane/runtime/state";
 * import { onFrame, drawSprite } from "@arcane/runtime/rendering";
 * import { findPath } from "@arcane/runtime/pathfinding";
 * ```
 *
 * @see https://github.com/jsvd/arcane
 */

// Re-export commonly used types
export type { Vec2, EntityId } from "./src/state/types.ts";
export type { GameStore } from "./src/state/store.ts";
