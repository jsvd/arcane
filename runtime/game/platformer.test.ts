import { describe, it, assert } from "../testing/harness.ts";
import {
  createPlatformerState,
  platformerMove,
  platformerJump,
  platformerStep,
  platformerApplyImpulse,
  getJumpHeight,
  getAirtime,
  getJumpReach,
  gridToPlatforms,
} from "./platformer.ts";
import type { PlatformerConfig, PlatformerState, Platform } from "./platformer.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PlatformerConfig = {
  playerWidth: 16,
  playerHeight: 24,
  gravity: 980,
  jumpForce: -400,
  walkSpeed: 160,
  runSpeed: 280,
  terminalVelocity: 600,
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
};

/** A wide floor platform well below the spawn point. */
function floor(): Platform {
  return { x: -500, y: 200, w: 1000, h: 50 };
}

/** Place the player standing on top of the floor platform. */
function standingOnFloor(config: PlatformerConfig = DEFAULT_CONFIG): PlatformerState {
  return {
    ...createPlatformerState(100, 200 - config.playerHeight!),
    onGround: true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("platformer", () => {
  // 1
  it("createPlatformerState initializes with correct defaults", () => {
    const s = createPlatformerState(50, 75);
    assert.equal(s.x, 50);
    assert.equal(s.y, 75);
    assert.equal(s.vx, 0);
    assert.equal(s.vy, 0);
    assert.equal(s.onGround, false);
    assert.equal(s.facingRight, true);
    assert.equal(s.coyoteTimer, 0);
    assert.equal(s.jumpBufferTimer, 0);
  });

  // 2
  it("platformerMove sets vx positive for direction=1", () => {
    const s = createPlatformerState(0, 0);
    const next = platformerMove(s, 1, false, DEFAULT_CONFIG);
    assert.equal(next.vx, 160);
  });

  // 3
  it("platformerMove sets vx negative for direction=-1", () => {
    const s = createPlatformerState(0, 0);
    const next = platformerMove(s, -1, false, DEFAULT_CONFIG);
    assert.equal(next.vx, -160);
  });

  // 4
  it("platformerMove direction=0 sets vx=0", () => {
    const s = { ...createPlatformerState(0, 0), vx: 160 };
    const next = platformerMove(s, 0, false, DEFAULT_CONFIG);
    assert.equal(next.vx, 0);
  });

  // 5
  it("platformerMove updates facingRight", () => {
    const s = createPlatformerState(0, 0);
    assert.equal(s.facingRight, true);

    const left = platformerMove(s, -1, false, DEFAULT_CONFIG);
    assert.equal(left.facingRight, false);

    const right = platformerMove(left, 1, false, DEFAULT_CONFIG);
    assert.equal(right.facingRight, true);

    // direction=0 preserves current facing
    const stop = platformerMove(left, 0, false, DEFAULT_CONFIG);
    assert.equal(stop.facingRight, false);
  });

  // 6
  it("platformerMove uses runSpeed when running=true", () => {
    const s = createPlatformerState(0, 0);
    const next = platformerMove(s, 1, true, DEFAULT_CONFIG);
    assert.equal(next.vx, 280);
  });

  // 7
  it("platformerJump applies jumpForce when onGround", () => {
    const s = standingOnFloor();
    const next = platformerJump(s, DEFAULT_CONFIG);
    assert.equal(next.vy, -400);
    assert.equal(next.onGround, false);
  });

  // 8
  it("platformerJump sets jumpBufferTimer when airborne", () => {
    const s = createPlatformerState(0, 0); // airborne (onGround=false)
    const next = platformerJump(s, DEFAULT_CONFIG);
    assert.equal(next.jumpBufferTimer, 0.1);
    // vy unchanged (no immediate jump)
    assert.equal(next.vy, 0);
  });

  // 9
  it("platformerStep applies gravity (vy increases over time)", () => {
    const s = createPlatformerState(100, 0);
    const dt = 1 / 60;
    const next = platformerStep(s, dt, [], DEFAULT_CONFIG);
    // vy should have increased by gravity * dt
    const expected = 980 * dt;
    assert.ok(Math.abs(next.vy - expected) < 0.001, `vy should be ~${expected}, got ${next.vy}`);
  });

  // 10
  it("platformerStep clamps to terminal velocity", () => {
    // Start with vy near terminal velocity
    const s = { ...createPlatformerState(100, 0), vy: 590 };
    const dt = 1 / 60;
    const next = platformerStep(s, dt, [], DEFAULT_CONFIG);
    assert.ok(next.vy <= 600, `vy should be clamped to 600, got ${next.vy}`);
  });

  // 11
  it("platformerStep: character lands on platform", () => {
    // Player falling above a platform
    const s = { ...createPlatformerState(100, 170), vy: 200 };
    const platforms = [floor()];
    const dt = 1 / 60;

    // Step enough times for the player to reach the platform
    let state = s;
    for (let i = 0; i < 60; i++) {
      state = platformerStep(state, dt, platforms, DEFAULT_CONFIG);
      if (state.onGround) break;
    }

    assert.equal(state.onGround, true);
    assert.equal(state.vy, 0);
    assert.equal(state.y, 200 - DEFAULT_CONFIG.playerHeight);
  });

  // 12
  it("platformerStep: horizontal collision stops movement", () => {
    // Wall to the right
    const wall: Platform = { x: 120, y: 0, w: 50, h: 300 };
    // Player moving right, close to wall
    const s = { ...standingOnFloor(), x: 110, vx: 300 };
    const dt = 1 / 60;
    const next = platformerStep(s, dt, [floor(), wall], DEFAULT_CONFIG);

    // Should be snapped to wall left edge minus player width
    assert.equal(next.x, 120 - DEFAULT_CONFIG.playerWidth);
    assert.equal(next.vx, 0);
  });

  // 13
  it("platformerStep: one-way platform allows passing through from below", () => {
    const oneWay: Platform = { x: 0, y: 100, w: 200, h: 20, oneWay: true };
    // Player below the platform, moving up
    const s = { ...createPlatformerState(50, 130), vy: -300 };
    const dt = 1 / 60;

    let state = s;
    for (let i = 0; i < 10; i++) {
      state = platformerStep(state, dt, [oneWay], DEFAULT_CONFIG);
    }

    // Player should have passed through (y should be above the platform)
    assert.ok(state.y < 100, `Player should pass through one-way from below, y=${state.y}`);
  });

  // 14
  it("platformerStep: one-way platform blocks from above", () => {
    const oneWay: Platform = { x: 0, y: 200, w: 500, h: 20, oneWay: true };
    // Player above and falling
    const s = { ...createPlatformerState(50, 170), vy: 100 };
    const dt = 1 / 60;

    let state = s;
    for (let i = 0; i < 60; i++) {
      state = platformerStep(state, dt, [oneWay], DEFAULT_CONFIG);
      if (state.onGround) break;
    }

    assert.equal(state.onGround, true);
    assert.equal(state.y, 200 - DEFAULT_CONFIG.playerHeight);
  });

  // 15
  it("platformerStep: coyote time allows jumping shortly after walking off ledge", () => {
    // Start standing on a small platform
    const smallPlat: Platform = { x: 90, y: 200, w: 40, h: 50 };
    const config = { ...DEFAULT_CONFIG, coyoteTime: 0.08 };

    // Player standing on the platform
    let state: PlatformerState = {
      ...createPlatformerState(90, 200 - config.playerHeight),
      onGround: true,
      vx: 160, // walking right
    };

    const dt = 1 / 60;

    // Step until the player walks off the edge (takes ~15 frames)
    for (let i = 0; i < 30; i++) {
      state = platformerStep(state, dt, [smallPlat], config);
      if (!state.onGround && state.coyoteTimer > 0) break;
    }

    // Should have coyote timer active
    assert.ok(state.coyoteTimer > 0, `coyoteTimer should be > 0, got ${state.coyoteTimer}`);
    assert.equal(state.onGround, false);

    // Jump should still work during coyote time
    const jumped = platformerJump(state, config);
    assert.equal(jumped.vy, config.jumpForce!);
  });

  // 16
  it("platformerStep: coyote time expires after configured duration", () => {
    const config = { ...DEFAULT_CONFIG, coyoteTime: 0.05 };

    // Simulate having just walked off a ledge
    let state: PlatformerState = {
      ...createPlatformerState(100, 100),
      onGround: false,
      coyoteTimer: 0.05,
      vy: 0,
    };

    const dt = 1 / 60;

    // Step enough times to exceed 0.05 seconds
    for (let i = 0; i < 10; i++) {
      state = platformerStep(state, dt, [], config);
    }

    // Coyote timer should have expired
    assert.equal(state.coyoteTimer, 0);

    // Jump should NOT work (sets buffer instead)
    const result = platformerJump(state, config);
    assert.ok(result.jumpBufferTimer > 0, "Should set jump buffer, not jump");
  });

  // 17
  it("platformerStep: jump buffer triggers jump on landing", () => {
    const config = { ...DEFAULT_CONFIG, jumpBuffer: 0.1 };

    // Player falling toward a platform, with jump buffer active
    let state: PlatformerState = {
      ...createPlatformerState(100, 170),
      vy: 200,
      jumpBufferTimer: 0.08,
    };

    const platforms = [floor()];
    const dt = 1 / 60;

    // Step until landing
    for (let i = 0; i < 60; i++) {
      state = platformerStep(state, dt, platforms, config);
      // Once the jump buffer triggers, vy will be negative
      if (state.vy < 0) break;
    }

    // The buffered jump should have triggered
    assert.equal(state.vy, config.jumpForce!);
    assert.equal(state.onGround, false);
    assert.equal(state.jumpBufferTimer, 0);
  });

  // 18
  it("platformerStep: multiple platforms resolve correctly", () => {
    const ground: Platform = { x: 0, y: 300, w: 500, h: 50 };
    const shelf: Platform = { x: 200, y: 200, w: 100, h: 20 };

    // Player falling onto the shelf
    const s = { ...createPlatformerState(220, 170), vy: 150 };
    const dt = 1 / 60;

    let state = s;
    for (let i = 0; i < 60; i++) {
      state = platformerStep(state, dt, [ground, shelf], DEFAULT_CONFIG);
      if (state.onGround) break;
    }

    // Should land on shelf (y=200), not fall to ground (y=300)
    assert.equal(state.y, 200 - DEFAULT_CONFIG.playerHeight);
    assert.equal(state.onGround, true);
  });

  // 19
  it("platformerStep: no platforms means free fall", () => {
    const s = createPlatformerState(100, 0);
    const dt = 1 / 60;

    let state = s;
    for (let i = 0; i < 30; i++) {
      state = platformerStep(state, dt, [], DEFAULT_CONFIG);
    }

    assert.equal(state.onGround, false);
    assert.ok(state.vy > 0, "Should be falling");
    assert.ok(state.y > 0, "Should have moved downward");
  });

  // 20
  it("platformerStep: large dt does not tunnel through platform", () => {
    // Player standing on a thin platform (16px tall)
    const thinPlat: Platform = { x: 0, y: 200, w: 300, h: 16 };
    const s = standingOnFloor();
    // Override to stand on the thin platform instead
    const standing: PlatformerState = {
      ...s,
      x: 100,
      y: 200 - DEFAULT_CONFIG.playerHeight,
      onGround: true,
    };

    // Simulate a huge dt spike (e.g. 500ms lag or first frame after load)
    const result = platformerStep(standing, 0.5, [thinPlat], DEFAULT_CONFIG);

    // Player should still be on the platform, not fallen through
    assert.equal(result.onGround, true, "Should still be on ground after large dt");
    assert.equal(result.y, 200 - DEFAULT_CONFIG.playerHeight, "Should not have fallen through");
  });

  // 21
  it("platformerStep: facingRight preserved through step", () => {
    const s = { ...createPlatformerState(100, 100), facingRight: false };
    const dt = 1 / 60;
    const next = platformerStep(s, dt, [], DEFAULT_CONFIG);
    assert.equal(next.facingRight, false);

    const s2 = { ...createPlatformerState(100, 100), facingRight: true };
    const next2 = platformerStep(s2, dt, [], DEFAULT_CONFIG);
    assert.equal(next2.facingRight, true);
  });

  // 22
  it("createPlatformerState initializes externalVx/Vy to zero", () => {
    const s = createPlatformerState(50, 75);
    assert.equal(s.externalVx, 0);
    assert.equal(s.externalVy, 0);
  });

  // 23
  it("platformerApplyImpulse adds to externalVx and externalVy", () => {
    const s = createPlatformerState(0, 0);
    const next = platformerApplyImpulse(s, 200, -150);
    assert.equal(next.externalVx, 200);
    assert.equal(next.externalVy, -150);
  });

  // 24
  it("platformerApplyImpulse accumulates multiple impulses", () => {
    let s = createPlatformerState(0, 0);
    s = platformerApplyImpulse(s, 100, -50);
    s = platformerApplyImpulse(s, 50, -25);
    assert.equal(s.externalVx, 150);
    assert.equal(s.externalVy, -75);
  });

  // 25
  it("platformerMove includes externalVx in result vx", () => {
    let s = createPlatformerState(0, 0);
    s = platformerApplyImpulse(s, 100, 0);
    const next = platformerMove(s, 1, false, DEFAULT_CONFIG);
    // walkSpeed (160) + externalVx (100)
    assert.equal(next.vx, 260);
  });

  // 26
  it("platformerStep decays externalVx and externalVy by 0.85", () => {
    let s = createPlatformerState(100, 0);
    s = platformerApplyImpulse(s, 200, -100);
    const dt = 1 / 60;
    const next = platformerStep(s, dt, [], DEFAULT_CONFIG);
    assert.ok(
      Math.abs(next.externalVx - 200 * 0.85) < 0.001,
      `externalVx should be ${200 * 0.85}, got ${next.externalVx}`,
    );
    assert.ok(
      Math.abs(next.externalVy - (-100 * 0.85)) < 0.001,
      `externalVy should be ${-100 * 0.85}, got ${next.externalVy}`,
    );
  });

  // 27
  it("platformerStep decays external velocity over multiple frames", () => {
    let s = createPlatformerState(100, 0);
    s = platformerApplyImpulse(s, 100, 0);
    const dt = 1 / 60;

    for (let i = 0; i < 30; i++) {
      s = platformerStep(s, dt, [], DEFAULT_CONFIG);
    }

    // After 30 frames of 0.85 decay: 100 * 0.85^30 ≈ 0.76
    assert.ok(
      Math.abs(s.externalVx) < 1,
      `externalVx should have decayed to near zero, got ${s.externalVx}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Jump physics helpers
// ---------------------------------------------------------------------------

describe("jump physics helpers", () => {
  const PHYSICS_CONFIG: PlatformerConfig = {
    playerWidth: 16,
    playerHeight: 24,
    gravity: 980,
    jumpForce: -400,
    walkSpeed: 160,
    runSpeed: 280,
  };

  // 28
  it("getJumpHeight computes h = v^2 / (2g)", () => {
    const h = getJumpHeight(PHYSICS_CONFIG);
    // 400^2 / (2 * 980) = 160000 / 1960 ≈ 81.632...
    const expected = (400 * 400) / (2 * 980);
    assert.ok(Math.abs(h - expected) < 0.001, `Expected ~${expected}, got ${h}`);
  });

  // 29
  it("getAirtime computes t = 2v / g", () => {
    const t = getAirtime(PHYSICS_CONFIG);
    // 2 * 400 / 980 ≈ 0.8163...
    const expected = (2 * 400) / 980;
    assert.ok(Math.abs(t - expected) < 0.001, `Expected ~${expected}, got ${t}`);
  });

  // 30
  it("getJumpReach computes reach = walkSpeed * airtime", () => {
    const reach = getJumpReach(PHYSICS_CONFIG);
    const airtime = (2 * 400) / 980;
    const expected = 160 * airtime;
    assert.ok(Math.abs(reach - expected) < 0.001, `Expected ~${expected}, got ${reach}`);
  });

  // 31
  it("getJumpReach with running uses runSpeed", () => {
    const reach = getJumpReach(PHYSICS_CONFIG, true);
    const airtime = (2 * 400) / 980;
    const expected = 280 * airtime;
    assert.ok(Math.abs(reach - expected) < 0.001, `Expected ~${expected}, got ${reach}`);
  });

  // 32
  it("getJumpHeight uses defaults when config fields are omitted", () => {
    const minConfig: PlatformerConfig = { playerWidth: 16, playerHeight: 24 };
    const h = getJumpHeight(minConfig);
    // defaults: jumpForce=-400, gravity=980
    const expected = (400 * 400) / (2 * 980);
    assert.ok(Math.abs(h - expected) < 0.001, `Expected ~${expected}, got ${h}`);
  });

  // 33
  it("getAirtime uses defaults when config fields are omitted", () => {
    const minConfig: PlatformerConfig = { playerWidth: 16, playerHeight: 24 };
    const t = getAirtime(minConfig);
    const expected = (2 * 400) / 980;
    assert.ok(Math.abs(t - expected) < 0.001, `Expected ~${expected}, got ${t}`);
  });

  // 34
  it("getJumpReach uses defaults when config fields are omitted", () => {
    const minConfig: PlatformerConfig = { playerWidth: 16, playerHeight: 24 };
    const reach = getJumpReach(minConfig);
    const expected = 160 * (2 * 400) / 980;
    assert.ok(Math.abs(reach - expected) < 0.001, `Expected ~${expected}, got ${reach}`);
  });

  // 35
  it("getJumpHeight returns Infinity for zero gravity", () => {
    const cfg: PlatformerConfig = { playerWidth: 16, playerHeight: 24, gravity: 0 };
    assert.equal(getJumpHeight(cfg), Infinity);
  });

  // 36
  it("getAirtime returns Infinity for zero gravity", () => {
    const cfg: PlatformerConfig = { playerWidth: 16, playerHeight: 24, gravity: 0 };
    assert.equal(getAirtime(cfg), Infinity);
  });

  // 37
  it("jump reach is always greater with running than walking", () => {
    const walk = getJumpReach(PHYSICS_CONFIG, false);
    const run = getJumpReach(PHYSICS_CONFIG, true);
    assert.ok(run > walk, `Running reach (${run}) should exceed walking reach (${walk})`);
  });

  // 38
  it("higher jumpForce produces higher jump", () => {
    const low: PlatformerConfig = { ...PHYSICS_CONFIG, jumpForce: -200 };
    const high: PlatformerConfig = { ...PHYSICS_CONFIG, jumpForce: -600 };
    assert.ok(getJumpHeight(high) > getJumpHeight(low), "Higher jump force should yield higher jump");
  });

  // 39
  it("higher gravity reduces jump height", () => {
    const lowG: PlatformerConfig = { ...PHYSICS_CONFIG, gravity: 500 };
    const highG: PlatformerConfig = { ...PHYSICS_CONFIG, gravity: 1500 };
    assert.ok(getJumpHeight(lowG) > getJumpHeight(highG), "Lower gravity should yield higher jump");
  });
});

// ---------------------------------------------------------------------------
// Grid-to-platforms
// ---------------------------------------------------------------------------

describe("gridToPlatforms", () => {
  // 40
  it("returns empty array for empty grid", () => {
    const result = gridToPlatforms([], 16, [1]);
    assert.equal(result.length, 0);
  });

  // 41
  it("returns empty array for grid with no solid tiles", () => {
    const grid = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 0);
  });

  // 42
  it("single solid tile produces one platform", () => {
    const grid = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 1);
    assert.equal(result[0].x, 16);
    assert.equal(result[0].y, 16);
    assert.equal(result[0].w, 16);
    assert.equal(result[0].h, 16);
  });

  // 43
  it("horizontal span merges into one wide platform", () => {
    const grid = [
      [1, 1, 1, 1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 1);
    assert.equal(result[0].x, 0);
    assert.equal(result[0].y, 0);
    assert.equal(result[0].w, 64);
    assert.equal(result[0].h, 16);
  });

  // 44
  it("vertical span merges downward", () => {
    const grid = [
      [1],
      [1],
      [1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 1);
    assert.equal(result[0].x, 0);
    assert.equal(result[0].y, 0);
    assert.equal(result[0].w, 16);
    assert.equal(result[0].h, 48);
  });

  // 45
  it("2x2 block merges into one platform", () => {
    const grid = [
      [1, 1],
      [1, 1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 1);
    assert.equal(result[0].w, 32);
    assert.equal(result[0].h, 32);
  });

  // 46
  it("L-shape produces multiple platforms", () => {
    const grid = [
      [1, 0],
      [1, 1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    // Greedy: row 0 col 0 -> tries to extend down, col 0 row 1 is also solid -> forms 1x2
    // Then row 1 col 1 -> 1x1
    assert.equal(result.length, 2);

    // First platform: column 0, rows 0-1
    const p0 = result[0];
    assert.equal(p0.x, 0);
    assert.equal(p0.y, 0);
    assert.equal(p0.w, 16);
    assert.equal(p0.h, 32);

    // Second platform: column 1, row 1
    const p1 = result[1];
    assert.equal(p1.x, 16);
    assert.equal(p1.y, 16);
    assert.equal(p1.w, 16);
    assert.equal(p1.h, 16);
  });

  // 47
  it("respects startX and startY offsets", () => {
    const grid = [[1]];
    const result = gridToPlatforms(grid, 16, [1], 100, 200);
    assert.equal(result[0].x, 100);
    assert.equal(result[0].y, 200);
  });

  // 48
  it("accepts Set<number> for solidTileIds", () => {
    const grid = [[1, 2, 3]];
    const result = gridToPlatforms(grid, 16, new Set([1, 2]));
    // 1 and 2 are solid and adjacent, 3 is not -> one 2-wide platform
    assert.equal(result.length, 1);
    assert.equal(result[0].w, 32);
  });

  // 49
  it("multiple solid tile IDs all count as solid", () => {
    const grid = [
      [1, 2, 3, 0],
    ];
    const result = gridToPlatforms(grid, 16, [1, 2, 3]);
    assert.equal(result.length, 1);
    assert.equal(result[0].w, 48);
  });

  // 50
  it("gap in row produces two platforms", () => {
    const grid = [
      [1, 1, 0, 1, 1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 2);
    assert.equal(result[0].w, 32);
    assert.equal(result[1].w, 32);
    assert.equal(result[1].x, 48);
  });

  // 51
  it("large rectangular block merges fully", () => {
    const grid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const result = gridToPlatforms(grid, 8, [1]);
    assert.equal(result.length, 1);
    assert.equal(result[0].w, 24);
    assert.equal(result[0].h, 24);
  });

  // 52
  it("checkerboard pattern produces individual 1x1 platforms", () => {
    const grid = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 5);
    // Each should be 16x16
    for (const p of result) {
      assert.equal(p.w, 16);
      assert.equal(p.h, 16);
    }
  });

  // 53
  it("different tile size scales world coordinates", () => {
    const grid = [[1, 1]];
    const result = gridToPlatforms(grid, 32, [1]);
    assert.equal(result[0].w, 64);
    assert.equal(result[0].h, 32);
  });

  // 54
  it("grid with only zero tiles returns empty", () => {
    const grid = [[0, 0], [0, 0]];
    const result = gridToPlatforms(grid, 16, [1]);
    assert.equal(result.length, 0);
  });

  // 55
  it("greedy merging extends rectangle downward correctly", () => {
    // The top row has 3 wide, second row only 2 wide at same position
    // Should NOT merge into a single rect because row 2 doesn't match full span
    const grid = [
      [1, 1, 1],
      [1, 1, 0],
    ];
    const result = gridToPlatforms(grid, 16, [1]);
    // Row 0: span is cols 0-2 (3 wide). Can it extend down? Row 1 cols 0-2: [1,1,0] -> no.
    // So platform 1: (0,0) 48x16
    // Then row 1: col 0-1 are unvisited and solid -> span 0-1, no more rows -> (0,16) 32x16
    assert.equal(result.length, 2);
    assert.equal(result[0].w, 48);
    assert.equal(result[0].h, 16);
    assert.equal(result[1].w, 32);
    assert.equal(result[1].h, 16);
  });
});
