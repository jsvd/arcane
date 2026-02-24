/**
 * {{PROJECT_NAME}} - Rendering
 *
 * All draw calls live here. Called from visual.ts each frame.
 * Split into multiple render files as your game grows (e.g., render-hud.ts, render-world.ts).
 */

import { hud } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";
import { getViewportSize } from "@arcane/runtime/rendering";
import type { GameState } from "./game.ts";

// Pre-compute colors at module scope (never call rgb() inside onFrame — causes GC freezes)
const WHITE = rgb(255, 255, 255);
const GOLD = rgb(255, 215, 0);

/** Draw the game world. Called every frame from visual.ts. */
export function renderWorld(_state: GameState, _vpw: number, _vph: number): void {
  // Draw your game objects here
  // import { drawColorSprite } from "@arcane/runtime/game";
  // drawColorSprite({ color: WHITE, x: _state.x - 16, y: _state.y - 16, w: 32, h: 32, layer: 1 });
}

/** Draw HUD elements. Called every frame from visual.ts. */
export function renderHud(_state: GameState): void {
  // hud.text uses `tint:` (not `color:`) for text color
  const { width: vpW } = getViewportSize();
  hud.text("{{PROJECT_NAME}}", 10, 10, { tint: WHITE });
  // Adapt to your state structure:
  // hud.text(`Score: ${_state.score}`, vpW - 120, 10, { tint: GOLD });
  // hud.bar(10, 30, _state.hp / _state.maxHp);
}
