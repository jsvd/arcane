/**
 * Arcane Runtime — unified API export
 *
 * This barrel export allows importing from a single "arcane" namespace:
 * ```typescript
 * import { drawSprite, createStore, onFrame } from "arcane";
 * ```
 *
 * Instead of individual submodule imports:
 * ```typescript
 * import { drawSprite } from "@arcane/runtime/rendering";
 * import { createStore } from "@arcane/runtime/state";
 * ```
 */

// State management
export * from "./state/index.ts";

// Rendering
export * from "./rendering/index.ts";

// UI components
export * from "./ui/index.ts";

// Physics
export * from "./physics/index.ts";

// Pathfinding
export * from "./pathfinding/index.ts";

// Systems (ECS-like rules)
export * from "./systems/index.ts";

// Tweening & animation
export * from "./tweening/index.ts";

// Particles
export * from "./particles/index.ts";

// Scenes
export * from "./scenes/index.ts";

// Persistence
export * from "./persistence/index.ts";

// Procedural generation
export * from "./procgen/index.ts";

// Agent protocol
export * from "./agent/index.ts";

// Testing harness
export * from "./testing/index.ts";

// Game helpers (convenience layer)
export * from "./game/index.ts";

// Input
export * from "./input/index.ts";
