/**
 * {{PROJECT_NAME}} - Configuration
 *
 * Constants, tuning values, and shared types.
 * Import from here in game.ts, render.ts, and visual.ts.
 */

// --- Tuning ---
export const SPEED = 200;
export const ZOOM = 1.0;

// --- Colors (pre-compute at module scope — never call rgb() inside onFrame) ---
// import { rgb } from "@arcane-engine/runtime/ui";
// export const BG_COLOR = rgb(20, 20, 31);
// export const PLAYER_COLOR = rgb(60, 180, 255);
// export const ENEMY_COLOR = rgb(255, 80, 60);

/** Background color (0.0-1.0 floats). Use rgb(20, 20, 31) if you prefer 0-255. */
export const BG_COLOR = { r: 0.08, g: 0.08, b: 0.12 };

// --- Types ---
// Move shared types here as your game grows
