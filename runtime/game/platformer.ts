/**
 * Platformer controller: pure functions for 2D side-scrolling movement.
 *
 * State in, state out -- no rendering, no globals. Handles gravity, jump
 * (with coyote time + jump buffer), walk/run, and AABB platform collision.
 *
 * @example
 * ```ts
 * import { createPlatformerState, platformerMove, platformerJump, platformerStep } from "@arcane/runtime/game";
 *
 * const config = { playerWidth: 16, playerHeight: 24, gravity: 980 };
 * let player = createPlatformerState(100, 100);
 *
 * // In your frame callback:
 * if (isKeyDown("ArrowRight")) player = platformerMove(player, 1, false, config);
 * if (isKeyPressed("Space")) player = platformerJump(player, config);
 * player = platformerStep(player, dt, platforms, config);
 * ```
 */

import { aabbOverlap } from "../physics/aabb.ts";
import type { LayeredTilemap } from "../rendering/tilemap.ts";
import { getLayerTile, getTileProperty } from "../rendering/tilemap.ts";

/** Configuration for the platformer controller. All optional fields have sensible defaults. */
export type PlatformerConfig = {
  /** Downward acceleration in pixels/sec^2. Default: 980. */
  gravity?: number;
  /** Initial upward velocity when jumping (negative = up). Default: -400. */
  jumpForce?: number;
  /** Horizontal speed when walking, pixels/sec. Default: 160. */
  walkSpeed?: number;
  /** Horizontal speed when running, pixels/sec. Default: 280. */
  runSpeed?: number;
  /** Maximum downward velocity, pixels/sec. Default: 600. */
  terminalVelocity?: number;
  /** Seconds after leaving ground where jump is still allowed. Default: 0.08. */
  coyoteTime?: number;
  /** Seconds before landing that a jump input is remembered. Default: 0.1. */
  jumpBuffer?: number;
  /** Player AABB width. Required. */
  playerWidth: number;
  /** Player AABB height. Required. */
  playerHeight: number;
};

/** Mutable platformer state. Returned by all platformer functions. */
export type PlatformerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facingRight: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  /** External velocity X (e.g., knockback). Decays by ×0.85 per step. */
  externalVx: number;
  /** External velocity Y (e.g., knockback). Decays by ×0.85 per step. */
  externalVy: number;
};

/** A static platform rectangle. oneWay platforms only block from above. */
export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** If true, only blocks downward movement (pass through from below/sides). */
  oneWay?: boolean;
};

/**
 * Create a new platformer state at the given position.
 *
 * Initializes velocity to zero, airborne, facing right, with no active
 * coyote or jump buffer timers.
 *
 * @param x - Initial horizontal position (left edge of player AABB).
 * @param y - Initial vertical position (top edge of player AABB).
 * @returns A fresh PlatformerState.
 */
export function createPlatformerState(x: number, y: number): PlatformerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    onGround: false,
    facingRight: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    externalVx: 0,
    externalVy: 0,
  };
}

/**
 * Set horizontal movement direction and speed.
 *
 * @param state - Current platformer state.
 * @param direction - -1 (left), 0 (stop), or 1 (right).
 * @param running - If true, use runSpeed instead of walkSpeed.
 * @param config - Platformer configuration.
 * @returns New state with updated vx and facingRight.
 */
export function platformerMove(
  state: PlatformerState,
  direction: -1 | 0 | 1,
  running: boolean,
  config: PlatformerConfig,
): PlatformerState {
  const walkSpeed = config.walkSpeed ?? 160;
  const runSpeed = config.runSpeed ?? 280;
  const speed = running ? runSpeed : walkSpeed;

  return {
    ...state,
    vx: direction * speed + state.externalVx,
    facingRight: direction !== 0 ? direction > 0 : state.facingRight,
  };
}

/**
 * Request a jump. If on the ground (or within coyote time), applies jump force
 * immediately. Otherwise, sets the jump buffer timer so the jump triggers
 * automatically on the next landing.
 *
 * @param state - Current platformer state.
 * @param config - Platformer configuration.
 * @returns New state with jump applied or jump buffer set.
 */
export function platformerJump(
  state: PlatformerState,
  config: PlatformerConfig,
): PlatformerState {
  const jumpForce = config.jumpForce ?? -400;
  const jumpBufferTime = config.jumpBuffer ?? 0.1;

  if (state.onGround || state.coyoteTimer > 0) {
    return {
      ...state,
      vy: jumpForce,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
    };
  }

  return {
    ...state,
    jumpBufferTimer: jumpBufferTime,
  };
}

/**
 * Advance the platformer by one frame. Applies gravity, integrates position,
 * resolves AABB collisions against platforms, and updates coyote time and
 * jump buffer timers.
 *
 * @param state - Current platformer state.
 * @param dt - Frame delta time in seconds.
 * @param platforms - Array of static platform rectangles to collide against.
 * @param config - Platformer configuration.
 * @returns New state after physics integration and collision resolution.
 */
export function platformerStep(
  state: PlatformerState,
  dt: number,
  platforms: Platform[],
  config: PlatformerConfig,
): PlatformerState {
  const gravity = config.gravity ?? 980;
  const jumpForce = config.jumpForce ?? -400;
  const terminalVelocity = config.terminalVelocity ?? 600;
  const coyoteTime = config.coyoteTime ?? 0.08;
  const jumpBufferTime = config.jumpBuffer ?? 0.1;
  const { playerWidth, playerHeight } = config;

  // Clamp dt to prevent tunneling through thin platforms on lag spikes / first frame
  const clampedDt = Math.min(dt, 0.033);

  // 1. Apply gravity
  let vy = Math.min(state.vy + gravity * clampedDt, terminalVelocity);
  let vx = state.vx;
  let x = state.x;
  let y = state.y;

  // 2. Move horizontal
  x += vx * clampedDt;

  // 3. Resolve horizontal collisions (non-oneWay only)
  for (const plat of platforms) {
    if (plat.oneWay) continue;
    const playerAABB = { x, y, w: playerWidth, h: playerHeight };
    const platAABB = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
    if (aabbOverlap(playerAABB, platAABB)) {
      if (vx > 0) {
        x = plat.x - playerWidth;
      } else if (vx < 0) {
        x = plat.x + plat.w;
      }
      vx = 0;
    }
  }

  // 4. Move vertical
  y += vy * clampedDt;

  // 5. Track previous ground state
  const wasOnGround = state.onGround;
  let onGround = false;

  // 6. Resolve vertical collisions
  for (const plat of platforms) {
    const playerAABB = { x, y, w: playerWidth, h: playerHeight };
    const platAABB = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
    if (aabbOverlap(playerAABB, platAABB)) {
      if (vy >= 0) {
        // Falling or stationary
        if (plat.oneWay) {
          // Only resolve if player bottom was above platform top before move
          if (state.y + playerHeight <= plat.y + 1) {
            y = plat.y - playerHeight;
            vy = 0;
            onGround = true;
          }
        } else {
          y = plat.y - playerHeight;
          vy = 0;
          onGround = true;
        }
      } else {
        // Rising
        if (!plat.oneWay) {
          y = plat.y + plat.h;
          vy = 0;
        }
      }
    }
  }

  // 7. Update coyote timer
  let coyoteTimer: number;
  if (wasOnGround && !onGround && vy >= 0) {
    // Just walked off a ledge (not jumped)
    coyoteTimer = coyoteTime;
  } else {
    coyoteTimer = Math.max(state.coyoteTimer - clampedDt, 0);
  }

  // 8. Update jump buffer
  let jumpBufferTimer = Math.max(state.jumpBufferTimer - clampedDt, 0);
  if (onGround && jumpBufferTimer > 0) {
    // Auto-trigger buffered jump
    vy = jumpForce;
    onGround = false;
    jumpBufferTimer = 0;
  }

  return {
    x,
    y,
    vx,
    vy,
    onGround,
    facingRight: state.facingRight,
    coyoteTimer,
    jumpBufferTimer,
    externalVx: state.externalVx * 0.85,
    externalVy: state.externalVy * 0.85,
  };
}

/**
 * Apply an instant velocity impulse (e.g., knockback). The impulse is added
 * to movement velocity each frame and decays over time (x0.85 per step).
 *
 * @param state - Current platformer state.
 * @param vx - Horizontal impulse velocity.
 * @param vy - Vertical impulse velocity.
 * @returns New state with impulse added to external velocity.
 */
export function platformerApplyImpulse(
  state: PlatformerState,
  vx: number,
  vy: number,
): PlatformerState {
  return {
    ...state,
    externalVx: state.externalVx + vx,
    externalVy: state.externalVy + vy,
  };
}

// ---------------------------------------------------------------------------
// Jump physics helpers
// ---------------------------------------------------------------------------

/**
 * Maximum jump height on flat ground: h = v^2 / (2g).
 *
 * Uses the absolute value of jumpForce and gravity from the config.
 * Useful for level design: checking whether a gap is clearable.
 *
 * @param config - Platformer configuration.
 * @returns Maximum height in pixels.
 *
 * @example
 * ```ts
 * const h = getJumpHeight({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400 });
 * // h ≈ 81.6 pixels
 * ```
 */
export function getJumpHeight(config: PlatformerConfig): number {
  const v = Math.abs(config.jumpForce ?? -400);
  const g = Math.abs(config.gravity ?? 980);
  if (g === 0) return Infinity;
  return (v * v) / (2 * g);
}

/**
 * Total airtime for a jump on flat ground: t = 2v / g.
 *
 * This is the time from leaving the ground to landing back at the same height.
 * Assumes no terminal velocity capping.
 *
 * @param config - Platformer configuration.
 * @returns Airtime in seconds.
 *
 * @example
 * ```ts
 * const t = getAirtime({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400 });
 * // t ≈ 0.816 seconds
 * ```
 */
export function getAirtime(config: PlatformerConfig): number {
  const v = Math.abs(config.jumpForce ?? -400);
  const g = Math.abs(config.gravity ?? 980);
  if (g === 0) return Infinity;
  return (2 * v) / g;
}

/**
 * Horizontal distance covered during a full jump on flat ground.
 *
 * reach = speed * airtime, where speed is walkSpeed or runSpeed.
 *
 * @param config - Platformer configuration.
 * @param running - If true, use runSpeed instead of walkSpeed. Default: false.
 * @returns Horizontal jump reach in pixels.
 *
 * @example
 * ```ts
 * const reach = getJumpReach({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400, walkSpeed: 160, runSpeed: 280 });
 * // walking: 160 * 0.816 ≈ 130.6 pixels
 * const runReach = getJumpReach(config, true);
 * // running: 280 * 0.816 ≈ 228.6 pixels
 * ```
 */
export function getJumpReach(config: PlatformerConfig, running?: boolean): number {
  const speed = running ? (config.runSpeed ?? 280) : (config.walkSpeed ?? 160);
  return speed * getAirtime(config);
}

// ---------------------------------------------------------------------------
// Grid-to-platforms utility
// ---------------------------------------------------------------------------

/**
 * Convert a 2D number grid into merged Platform rectangles.
 *
 * Uses greedy rectangle merging: scans rows left-to-right to find horizontal
 * spans of consecutive solid tiles, then extends each span downward as far as
 * possible. Produces fewer, larger rectangles than one-per-tile.
 *
 * @param grid - 2D array of tile IDs (grid[row][col]). Row 0 = top.
 * @param tileSize - Size of each tile in world units.
 * @param solidTileIds - Tile IDs considered solid. 0 is typically empty.
 * @param startX - World X offset for the grid origin. Default: 0.
 * @param startY - World Y offset for the grid origin. Default: 0.
 * @returns Array of merged Platform rectangles in world coordinates.
 *
 * @example
 * ```ts
 * const grid = [
 *   [0, 0, 0, 0],
 *   [1, 1, 0, 0],
 *   [1, 1, 1, 0],
 * ];
 * const platforms = gridToPlatforms(grid, 16, [1]);
 * // Produces merged rectangles instead of one per tile
 * ```
 */
export function gridToPlatforms(
  grid: number[][],
  tileSize: number,
  solidTileIds: number[] | Set<number>,
  startX: number = 0,
  startY: number = 0,
): Platform[] {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;
  if (cols === 0) return [];

  const solidSet = solidTileIds instanceof Set ? solidTileIds : new Set(solidTileIds);
  const visited: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    visited[r] = new Array(cols).fill(false);
  }

  const platforms: Platform[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      if (!solidSet.has(grid[r][c])) continue;

      // Find horizontal span starting at (r, c)
      let spanEnd = c;
      while (spanEnd + 1 < cols && !visited[r][spanEnd + 1] && solidSet.has(grid[r][spanEnd + 1])) {
        spanEnd++;
      }

      // Extend span downward
      let rowEnd = r;
      outer: while (rowEnd + 1 < rows) {
        for (let cc = c; cc <= spanEnd; cc++) {
          if (visited[rowEnd + 1][cc] || !solidSet.has(grid[rowEnd + 1][cc])) {
            break outer;
          }
        }
        rowEnd++;
      }

      // Mark cells as visited
      for (let rr = r; rr <= rowEnd; rr++) {
        for (let cc = c; cc <= spanEnd; cc++) {
          visited[rr][cc] = true;
        }
      }

      // Convert to world coordinates
      platforms.push({
        x: startX + c * tileSize,
        y: startY + r * tileSize,
        w: (spanEnd - c + 1) * tileSize,
        h: (rowEnd - r + 1) * tileSize,
      });
    }
  }

  return platforms;
}

/**
 * Read a tilemap layer and convert solid tiles to Platform rectangles.
 *
 * Extracts the tile grid from a LayeredTilemap layer, determines which tiles
 * are solid, and delegates to gridToPlatforms for greedy merging.
 *
 * By default, a tile is considered solid if getTileProperty(tileId, "solid")
 * returns a truthy value. Pass a custom isSolid function to override.
 *
 * @param tilemap - A LayeredTilemap from the rendering module.
 * @param layerName - Name of the layer to read.
 * @param isSolid - Optional predicate: returns true if a tile ID is solid.
 *   Default checks getTileProperty(tileId, "solid").
 * @param startX - World X offset. Default: 0.
 * @param startY - World Y offset. Default: 0.
 * @returns Array of merged Platform rectangles in world coordinates.
 *
 * @example
 * ```ts
 * // Using tile properties (define solid tiles beforehand)
 * defineTileProperties(1, { solid: true });
 * defineTileProperties(2, { solid: true });
 * const platforms = platformsFromTilemap(myMap, "collision");
 *
 * // Using a custom predicate
 * const platforms = platformsFromTilemap(myMap, "ground", (id) => id >= 1 && id <= 10);
 * ```
 */
export function platformsFromTilemap(
  tilemap: LayeredTilemap,
  layerName: string,
  isSolid?: (tileId: number) => boolean,
  startX: number = 0,
  startY: number = 0,
): Platform[] {
  const layer = tilemap.layers.get(layerName);
  if (!layer) return [];

  const { width, height, tileSize } = tilemap;

  // Build grid from tilemap layer
  const grid: number[][] = [];
  for (let r = 0; r < height; r++) {
    grid[r] = [];
    for (let c = 0; c < width; c++) {
      grid[r][c] = getLayerTile(tilemap, layerName, c, r);
    }
  }

  // Determine solid set
  const solidCheck = isSolid ?? ((tileId: number) => !!getTileProperty(tileId, "solid"));

  // Collect all unique non-zero tile IDs and filter by solidCheck
  const solidIds = new Set<number>();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const id = grid[r][c];
      if (id !== 0 && solidCheck(id)) {
        solidIds.add(id);
      }
    }
  }

  return gridToPlatforms(grid, tileSize, solidIds, startX, startY);
}
