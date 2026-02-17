/**
 * Game bootstrap -- createGame() sets up the frame loop with sane defaults.
 *
 * Provides a minimal wrapper that handles common boilerplate:
 * - Auto-clearing sprites each frame
 * - Auto-centering the camera on the viewport (web-like top-left origin)
 * - Setting background color
 * - Wiring up agent protocol for AI interaction
 *
 * @example
 * const game = createGame({ name: "my-game", background: { r: 0.12, g: 0.12, b: 0.2 } });
 * game.onFrame((ctx) => {
 *   drawSprite({ textureId: tex, x: 100, y: 100, w: 32, h: 32 });
 * });
 */

import { onFrame, getDeltaTime } from "../rendering/loop.ts";
import { clearSprites } from "../rendering/sprites.ts";
import { setCamera } from "../rendering/camera.ts";
import { getViewportSize, setBackgroundColor } from "../rendering/input.ts";
import { registerAgent } from "../agent/protocol.ts";
import type { GameConfig, GameContext, FrameCallback, GameStateConfig, Game } from "./types.ts";

/**
 * Create a game instance with sensible defaults for the frame loop.
 *
 * Defaults:
 * - `autoClear: true` -- clears all sprites at the start of each frame.
 * - `autoCamera: true` -- on the first frame, sets the camera so (0,0) is top-left.
 * - `zoom: 1` -- default zoom level.
 *
 * If `background` is provided (0.0-1.0 RGB), calls setBackgroundColor().
 *
 * @param config - Optional configuration. All fields have sensible defaults.
 * @returns A Game object with `onFrame()` and `state()` methods.
 *
 * @example
 * const game = createGame({
 *   name: "dungeon-crawler",
 *   background: { r: 0.08, g: 0.05, b: 0.11 },
 *   zoom: 2,
 * });
 *
 * game.state({
 *   get: () => gameState,
 *   set: (s) => { gameState = s; },
 * });
 *
 * game.onFrame((ctx) => {
 *   update(ctx.dt);
 *   render();
 * });
 */
export function createGame(config?: GameConfig): Game {
  const cfg = config ?? {};
  const autoClear = cfg.autoClear !== false;
  const autoCamera = cfg.autoCamera !== false;
  const zoom = cfg.zoom ?? 1;
  const name = cfg.name;

  if (cfg.background) {
    setBackgroundColor(cfg.background);
  }

  let elapsed = 0;
  let frame = 0;
  let stateRegistered = false;

  const game: Game = {
    onFrame(callback: FrameCallback): void {
      onFrame(() => {
        const dt = getDeltaTime();
        elapsed += dt;
        frame++;

        if (autoClear) {
          clearSprites();
        }

        // On the first frame, auto-center the camera so (0,0) is the top-left corner.
        if (autoCamera && frame === 1) {
          const vp = getViewportSize();
          setCamera(vp.width / 2, vp.height / 2, zoom);
        }

        const ctx: GameContext = {
          dt,
          viewport: getViewportSize(),
          elapsed,
          frame,
        };

        callback(ctx);
      });
    },

    state<S>(stateConfig: GameStateConfig<S>): void {
      if (stateRegistered) return;
      stateRegistered = true;

      // Only register agent protocol if a name was provided.
      if (!name) return;

      registerAgent<S>({
        name,
        getState: stateConfig.get,
        setState: stateConfig.set,
        describe: stateConfig.describe,
        actions: stateConfig.actions,
      });
    },
  };

  return game;
}
