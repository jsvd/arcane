/**
 * Physics Playground Demo - Phase 11
 *
 * Interactive physics sandbox demonstrating the Rust physics engine.
 *
 * Controls:
 * - 1: Spawn box
 * - 2: Spawn ball
 * - 3: Spawn small ball cluster
 * - 4: Spawn seesaw (revolute joint)
 * - 5: Spawn rope (distance joint chain)
 * - Space: Launch fast ball upward
 * - R: Reset world
 * - G: Toggle gravity
 * - Click: Spawn current type at mouse position
 */

import {
  setCamera,
  isKeyPressed,
  isMouseButtonPressed,
  getMouseWorldPosition,
  getViewportSize,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout, rgb, drawCircle } from "../../runtime/ui/index.ts";
import { createGame, drawColorSprite, hud } from "../../runtime/game/index.ts";
import { createRng } from "../../runtime/state/index.ts";
import {
  createPhysicsWorld,
  stepPhysics,
  destroyPhysicsWorld,
  createBody,
  getBodyState,
  setBodyVelocity,
  createDistanceJoint,
  createRevoluteJoint,
  getContacts,
} from "../../runtime/physics/index.ts";
import type { BodyId } from "../../runtime/physics/index.ts";

// Colors (0-255 via rgb() helper)
const COL_BOX = rgb(180, 120, 60);
const COL_BALL = rgb(60, 140, 200);
const COL_GROUND = rgb(80, 80, 80);
const COL_SEESAW = rgb(160, 100, 60);
const COL_PIVOT = rgb(200, 200, 50);
const COL_ROPE = rgb(100, 60, 40);
const COL_SLEEP = rgb(100, 100, 120);
const COL_BG = rgb(25, 25, 35);

// Deterministic PRNG for spawn sizing
const rng = createRng(42);

// Body tracking
type TrackedBody = {
  id: BodyId;
  kind: "box" | "ball" | "seesaw" | "rope" | "pivot";
  halfW: number;
  halfH: number;
  radius?: number;
};

let bodies: TrackedBody[] = [];
let spawnMode = 1;
let gravityOn = true;
let bodyCount = 0;

const { width: VPW, height: VPH } = getViewportSize();

function setupWorld(): void {
  destroyPhysicsWorld();
  bodies = [];
  bodyCount = 0;

  createPhysicsWorld({ gravityX: 0, gravityY: 400 });

  // Ground
  const groundHW = VPW / 2;
  const groundHH = 20;
  const groundId = createBody({
    type: "static",
    shape: { type: "aabb", halfW: groundHW, halfH: groundHH },
    x: VPW / 2,
    y: VPH - groundHH,
    material: { restitution: 0.2, friction: 0.8 },
  });
  bodies.push({ id: groundId, kind: "box", halfW: groundHW, halfH: groundHH });

  // Left wall
  const wallHW = 20;
  const wallHH = VPH / 2;
  const leftId = createBody({
    type: "static",
    shape: { type: "aabb", halfW: wallHW, halfH: wallHH },
    x: -wallHW,
    y: VPH / 2,
  });
  bodies.push({ id: leftId, kind: "box", halfW: wallHW, halfH: wallHH });

  // Right wall
  const rightId = createBody({
    type: "static",
    shape: { type: "aabb", halfW: wallHW, halfH: wallHH },
    x: VPW + wallHW,
    y: VPH / 2,
  });
  bodies.push({ id: rightId, kind: "box", halfW: wallHW, halfH: wallHH });
}

function spawnBox(x: number, y: number): void {
  const halfW = 15 + rng.float() * 15;
  const halfH = 15 + rng.float() * 15;
  const id = createBody({
    type: "dynamic",
    shape: { type: "aabb", halfW, halfH },
    x,
    y,
    mass: halfW * halfH * 0.01,
    material: { restitution: 0.3, friction: 0.6 },
  });
  bodies.push({ id, kind: "box", halfW, halfH });
  bodyCount++;
}

function spawnBall(x: number, y: number, radius = 10 + rng.float() * 10): BodyId {
  const id = createBody({
    type: "dynamic",
    shape: { type: "circle", radius },
    x,
    y,
    mass: radius * radius * 0.005,
    material: { restitution: 0.6, friction: 0.3 },
  });
  bodies.push({ id, kind: "ball", halfW: radius, halfH: radius, radius });
  bodyCount++;
  return id;
}

function spawnCluster(x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const ox = (rng.float() - 0.5) * 30;
    const oy = (rng.float() - 0.5) * 30;
    spawnBall(x + ox, y + oy, 6 + rng.float() * 6);
  }
}

function spawnSeesaw(x: number, y: number): void {
  // Plank
  const plankHW = 80;
  const plankHH = 6;
  const plankId = createBody({
    type: "dynamic",
    shape: { type: "aabb", halfW: plankHW, halfH: plankHH },
    x,
    y,
    mass: 3.0,
    material: { restitution: 0.2, friction: 0.7 },
  });
  bodies.push({ id: plankId, kind: "seesaw", halfW: plankHW, halfH: plankHH });
  bodyCount++;

  // Pivot (static)
  const pivotId = createBody({
    type: "static",
    shape: { type: "circle", radius: 5 },
    x,
    y: y + plankHH + 5,
  });
  bodies.push({ id: pivotId, kind: "pivot", halfW: 5, halfH: 5, radius: 5 });

  // Revolute joint
  createRevoluteJoint(plankId, pivotId, x, y);
}

function spawnRope(x: number, y: number): void {
  const segCount = 6;
  const segDist = 20;
  const segRadius = 4;

  // Anchor (static)
  const anchorId = createBody({
    type: "static",
    shape: { type: "circle", radius: 5 },
    x,
    y,
  });
  bodies.push({ id: anchorId, kind: "pivot", halfW: 5, halfH: 5, radius: 5 });

  let prevId = anchorId;
  for (let i = 0; i < segCount; i++) {
    const segY = y + (i + 1) * segDist;
    const segId = createBody({
      type: "dynamic",
      shape: { type: "circle", radius: segRadius },
      x,
      y: segY,
      mass: 0.5,
      material: { restitution: 0.1, friction: 0.5 },
    });
    bodies.push({ id: segId, kind: "rope", halfW: segRadius, halfH: segRadius, radius: segRadius });
    bodyCount++;

    createDistanceJoint(prevId, segId, segDist);
    prevId = segId;
  }
}

// Initialize
setupWorld();

// State for agent protocol
type PlaygroundState = {
  spawnMode: number;
  bodyCount: number;
  gravityOn: boolean;
  contacts: number;
};

function getPlaygroundState(): PlaygroundState {
  return { spawnMode, bodyCount, gravityOn, contacts: getContacts().length };
}

// Game setup
const game = createGame({ name: "physics-playground", autoCamera: false });

game.state<PlaygroundState>({
  get: getPlaygroundState,
  set: () => {},
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return `Bodies: ${s.bodyCount}, Mode: ${s.spawnMode}`;
    }
    return `Physics Playground | Bodies: ${s.bodyCount} | Spawn mode: ${s.spawnMode} | Gravity: ${s.gravityOn ? "ON" : "OFF"} | Contacts: ${s.contacts}`;
  },
  actions: {
    reset: {
      handler: () => { setupWorld(); return getPlaygroundState(); },
      description: "Reset the physics world",
    },
    spawnBox: {
      handler: () => { spawnBox(VPW / 2, 100); return getPlaygroundState(); },
      description: "Spawn a box at center-top",
    },
    spawnBall: {
      handler: () => { spawnBall(VPW / 2, 100); return getPlaygroundState(); },
      description: "Spawn a ball at center-top",
    },
  },
});

// Mode names
const MODE_NAMES = ["", "Box", "Ball", "Cluster", "Seesaw", "Rope"];

/** Pick the render color for a tracked body, factoring in sleep state. */
function bodyColor(tracked: TrackedBody, sleeping: boolean): { r: number; g: number; b: number; a: number } {
  switch (tracked.kind) {
    case "box": return sleeping ? COL_SLEEP : COL_BOX;
    case "ball": return sleeping ? COL_SLEEP : COL_BALL;
    case "seesaw": return COL_SEESAW;
    case "pivot": return COL_PIVOT;
    case "rope": return COL_ROPE;
    default: return COL_BOX;
  }
}

game.onFrame((ctx) => {
  setCamera(VPW / 2, VPH / 2, 1);

  // Input: mode selection
  if (isKeyPressed("1")) spawnMode = 1;
  if (isKeyPressed("2")) spawnMode = 2;
  if (isKeyPressed("3")) spawnMode = 3;
  if (isKeyPressed("4")) spawnMode = 4;
  if (isKeyPressed("5")) spawnMode = 5;

  // Reset
  if (isKeyPressed("r")) {
    setupWorld();
  }

  // Toggle gravity
  if (isKeyPressed("g")) {
    gravityOn = !gravityOn;
    destroyPhysicsWorld();
    bodies = [];
    createPhysicsWorld({ gravityX: 0, gravityY: gravityOn ? 400 : 0 });
    // Recreating world clears bodies, so reset
    setupWorld();
    if (!gravityOn) {
      destroyPhysicsWorld();
      createPhysicsWorld({ gravityX: 0, gravityY: 0 });
      // Re-add ground/walls
      const groundHW = VPW / 2;
      const groundHH = 20;
      const groundId = createBody({
        type: "static",
        shape: { type: "aabb", halfW: groundHW, halfH: groundHH },
        x: VPW / 2,
        y: VPH - groundHH,
      });
      bodies = [{ id: groundId, kind: "box", halfW: groundHW, halfH: groundHH }];
      bodyCount = 0;
    }
  }

  // Click to spawn
  const mouse = getMouseWorldPosition();
  if (isMouseButtonPressed(0)) {
    const mx = mouse.x;
    const my = mouse.y;
    switch (spawnMode) {
      case 1: spawnBox(mx, my); break;
      case 2: spawnBall(mx, my); break;
      case 3: spawnCluster(mx, my); break;
      case 4: spawnSeesaw(mx, my); break;
      case 5: spawnRope(mx, my); break;
    }
  }

  // Space: fast ball upward
  if (isKeyPressed("Space")) {
    const ballId = spawnBall(VPW / 2, VPH - 60, 8);
    setBodyVelocity(ballId, (rng.float() - 0.5) * 100, -600);
  }

  // Step physics
  stepPhysics(ctx.dt);

  // Get contacts for display
  const contacts = getContacts();

  // Render

  // Background
  drawColorSprite({ color: COL_BG, x: 0, y: 0, w: VPW, h: VPH, layer: 0 });

  // Draw all tracked bodies
  for (const tracked of bodies) {
    const bs = getBodyState(tracked.id);
    const col = bodyColor(tracked, bs.sleeping);

    if (tracked.radius) {
      // Circle: render as filled circle
      drawCircle(bs.x, bs.y, tracked.radius, { color: col, layer: 2 });
    } else {
      // AABB: draw from center
      drawColorSprite({
        color: col,
        x: bs.x - tracked.halfW,
        y: bs.y - tracked.halfH,
        w: tracked.halfW * 2,
        h: tracked.halfH * 2,
        layer: 2,
      });
    }
  }

  // Ground highlight
  drawColorSprite({
    color: COL_GROUND,
    x: 0,
    y: VPH - 40,
    w: VPW,
    h: 40,
    layer: 1,
  });

  // --- HUD ---
  const hudX = HUDLayout.TOP_LEFT.x;
  const hudY = HUDLayout.TOP_LEFT.y;
  const lh = HUDLayout.LINE_HEIGHT;

  hud.text("Physics Playground", hudX, hudY);

  hud.text(`Bodies: ${bodyCount}  Contacts: ${contacts.length}`, hudX, hudY + lh, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
  });

  hud.text(`Mode [1-5]: ${MODE_NAMES[spawnMode]}`, hudX, hudY + lh * 2, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.WARNING,
  });

  hud.text(`Gravity: ${gravityOn ? "ON" : "OFF"} [G]`, hudX, hudY + lh * 3, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: gravityOn ? Colors.SUCCESS : Colors.LOSE,
  });

  hud.text("[R] Reset  [Space] Launch  [Click] Spawn", hudX, hudY + lh * 4, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
  });
});
