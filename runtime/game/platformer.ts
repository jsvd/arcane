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
    vx: direction * speed,
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
  };
}
