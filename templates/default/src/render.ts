/**
 * {{PROJECT_NAME}} - Rendering
 *
 * All draw calls live here. Called from visual.ts each frame.
 * Split into multiple render files as your game grows (e.g., render-hud.ts, render-world.ts).
 */

import { hud } from "@arcane/runtime/game";
import type { GameState } from "./game.ts";

/** Draw the game world. Called every frame from visual.ts. */
export function renderWorld(_state: GameState, _vpw: number, _vph: number): void {
  // Draw your game objects here
  // import { drawColorSprite } from "@arcane/runtime/game";
  // import { rgb } from "@arcane/runtime/ui";
  // drawColorSprite({ color: rgb(60, 180, 255), x: 10, y: 10, w: 32, h: 32, layer: 1 });
}

/** Draw HUD elements. Called every frame from visual.ts. */
export function renderHud(_state: GameState): void {
  hud.text("{{PROJECT_NAME}}", 10, 10);
  // hud.bar(10, 30, _state.hp / _state.maxHp);
}
