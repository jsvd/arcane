/**
 * Physics Playground Demo - Phase 26
 *
 * Interactive physics sandbox demonstrating the Rust physics engine
 * with polygon rotation, constraints, kinematic bodies, and contact visualization.
 *
 * Controls:
 * - 1: Spawn box (polygon - rotates properly!)
 * - 2: Spawn ball (circle)
 * - 3: Spawn small ball cluster
 * - 4: Spawn seesaw (revolute joint with polygon plank)
 * - 5: Spawn rope (distance joint chain)
 * - 6: Spawn moving platform (kinematic body)
 * - 7: Raycast mode (shoots ray from center toward mouse)
 * - 8: Spawn soft spring (bouncy oscillating spring!)
 * - C: Toggle contact visualization
 * - Space: Launch fast ball upward
 * - R: Reset world
 * - G: Toggle gravity
 * - Click: Spawn current type at mouse position (modes 1-6)
 */

import {
  setCamera,
  isKeyPressed,
  isMouseButtonPressed,
  getMouseWorldPosition,
  getViewportSize,
  drawTextWrapped,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout, rgb, drawCircle, drawRing, drawCapsule, drawLine, drawPolygon } from "../../runtime/ui/index.ts";
import { createGame, drawColorSprite, hud } from "../../runtime/game/index.ts";
import { createRng } from "../../runtime/state/index.ts";
import {
  createPhysicsWorld,
  stepPhysics,
  destroyPhysicsWorld,
  createBody,
  getBodyState,
  setBodyVelocity,
  setKinematicVelocity,
  createDistanceJoint,
  createSoftDistanceJoint,
  createRevoluteJoint,
  getContacts,
  getManifolds,
  raycast,
  _boxPolygonVertices,
} from "../../runtime/physics/index.ts";
import type { RayHit } from "../../runtime/physics/index.ts";
import type { BodyId, Contact, ContactManifold } from "../../runtime/physics/index.ts";

// Colors (0-255 via rgb() helper)
const COL_BOX = rgb(180, 120, 60);
const COL_BALL = rgb(60, 140, 200);
const COL_GROUND = rgb(80, 80, 80);
const COL_SEESAW = rgb(160, 100, 60);
const COL_PIVOT = rgb(200, 200, 50);
const COL_ROPE = rgb(100, 60, 40);
const COL_ROPE_LINK = rgb(140, 100, 70);
const COL_SLEEP = rgb(100, 100, 120);
const COL_BG = rgb(25, 25, 35);
const COL_JOINT = rgb(220, 200, 80);
const COL_PLATFORM = rgb(80, 160, 80);
const COL_CONTACT = rgb(255, 50, 50);
const COL_CONTACT_NORMAL = rgb(255, 200, 50);
const COL_RAY = rgb(50, 255, 100);
const COL_RAY_HIT = rgb(255, 100, 255);
const COL_SPRING = rgb(100, 220, 255);
const COL_SPRING_ANCHOR = rgb(200, 180, 255);

// Deterministic PRNG for spawn sizing
const rng = createRng(42);

// Body tracking
type TrackedBody = {
  id: BodyId;
  kind: "box" | "ball" | "seesaw" | "rope" | "pivot" | "platform" | "spring" | "spring_anchor";
  halfW: number;
  halfH: number;
  radius?: number;
  vertices?: [number, number][];  // For polygon shapes
  platformDir?: number;           // For kinematic platforms
  platformMinX?: number;
  platformMaxX?: number;
};

// Joint tracking for visual debug
type TrackedJoint = {
  bodyA: BodyId;
  bodyB: BodyId;
  kind: "distance" | "revolute" | "soft";
};

let bodies: TrackedBody[] = [];
let joints: TrackedJoint[] = [];
let spawnMode = 1;
let gravityOn = true;
let showContacts = false;
let bodyCount = 0;
let sleepingCount = 0;
let lastRayHit: RayHit | null = null;

const { width: VPW, height: VPH } = getViewportSize();

function setupWorld(): void {
  destroyPhysicsWorld();
  bodies = [];
  joints = [];
  bodyCount = 0;
  sleepingCount = 0;

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
  const vertices = _boxPolygonVertices(halfW, halfH);

  const id = createBody({
    type: "dynamic",
    shape: { type: "polygon", vertices },
    x,
    y,
    mass: halfW * halfH * 0.01,
    material: { restitution: 0.3, friction: 0.6 },
  });
  bodies.push({ id, kind: "box", halfW, halfH, vertices });
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
  // Use polygon shape so the plank can rotate properly!
  const plankHW = 80;
  const plankHH = 6;
  const vertices = _boxPolygonVertices(plankHW, plankHH);

  const plankId = createBody({
    type: "dynamic",
    shape: { type: "polygon", vertices },
    x,
    y,
    mass: 3.0,
    material: { restitution: 0.2, friction: 0.7 },
  });
  bodies.push({ id: plankId, kind: "seesaw", halfW: plankHW, halfH: plankHH, vertices });
  bodyCount++;

  // Pivot (static)
  const pivotY = y + plankHH + 5;
  const pivotId = createBody({
    type: "static",
    shape: { type: "circle", radius: 5 },
    x,
    y: pivotY,
  });
  bodies.push({ id: pivotId, kind: "pivot", halfW: 5, halfH: 5, radius: 5 });

  // Revolute joint - anchor at pivot position
  createRevoluteJoint(plankId, pivotId, x, pivotY);
  joints.push({ bodyA: plankId, bodyB: pivotId, kind: "revolute" });
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
    joints.push({ bodyA: prevId, bodyB: segId, kind: "distance" });
    prevId = segId;
  }
}

function spawnPlatform(x: number, y: number): void {
  const platHW = 50;
  const platHH = 8;
  const vertices = _boxPolygonVertices(platHW, platHH);

  const id = createBody({
    type: "kinematic",
    shape: { type: "polygon", vertices },
    x,
    y,
    mass: 1.0,  // Doesn't matter for kinematic
    material: { restitution: 0.1, friction: 0.9 },
  });

  const minX = x - 80;
  const maxX = x + 80;

  bodies.push({
    id,
    kind: "platform",
    halfW: platHW,
    halfH: platHH,
    vertices,
    platformDir: 1,
    platformMinX: minX,
    platformMaxX: maxX,
  });
  bodyCount++;
}

function spawnSpring(x: number, y: number): void {
  // Soft spring: static anchor + dynamic ball connected with soft constraint
  const restLength = 80;
  const ballRadius = 12;

  // Anchor (static)
  const anchorId = createBody({
    type: "static",
    shape: { type: "circle", radius: 6 },
    x,
    y,
  });
  bodies.push({ id: anchorId, kind: "spring_anchor", halfW: 6, halfH: 6, radius: 6 });

  // Bouncing ball
  const ballId = createBody({
    type: "dynamic",
    shape: { type: "circle", radius: ballRadius },
    x,
    y: y + restLength,
    mass: 1.0,
    material: { restitution: 0.3, friction: 0.5 },
  });
  bodies.push({ id: ballId, kind: "spring", halfW: ballRadius, halfH: ballRadius, radius: ballRadius });
  bodyCount++;

  // Soft distance joint: 2 Hz oscillation, underdamped (0.3 = bouncy!)
  createSoftDistanceJoint(anchorId, ballId, restLength, {
    frequencyHz: 2.0,
    dampingRatio: 0.3,
  });
  joints.push({ bodyA: anchorId, bodyB: ballId, kind: "soft" });
}

// Update kinematic platforms
function updatePlatforms(): void {
  const speed = 60;
  for (const body of bodies) {
    if (body.kind === "platform" && body.platformDir !== undefined) {
      const bs = getBodyState(body.id);
      // Reverse direction at edges
      if (bs.x >= body.platformMaxX!) {
        body.platformDir = -1;
      } else if (bs.x <= body.platformMinX!) {
        body.platformDir = 1;
      }
      setKinematicVelocity(body.id, speed * body.platformDir, 0);
    }
  }
}

// Draw a rotated polygon
function drawRotatedPolygon(
  cx: number,
  cy: number,
  angle: number,
  vertices: [number, number][],
  color: { r: number; g: number; b: number; a: number },
  layer: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const worldVerts: [number, number][] = vertices.map(([vx, vy]) => [
    cx + vx * cos - vy * sin,
    cy + vx * sin + vy * cos,
  ]);
  drawPolygon(worldVerts, { color, layer });
}

// Initialize
setupWorld();

// State for agent protocol
type PlaygroundState = {
  spawnMode: number;
  bodyCount: number;
  gravityOn: boolean;
  contacts: number;
  showContacts: boolean;
};

function getPlaygroundState(): PlaygroundState {
  return { spawnMode, bodyCount, gravityOn, contacts: getContacts().length, showContacts };
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
    toggleContacts: {
      handler: () => { showContacts = !showContacts; return getPlaygroundState(); },
      description: "Toggle contact point visualization",
    },
  },
});

// Mode names
const MODE_NAMES = ["", "Box", "Ball", "Cluster", "Seesaw", "Rope", "Platform", "Raycast", "Spring"];

/** Pick the render color for a tracked body, factoring in sleep state. */
function bodyColor(tracked: TrackedBody, sleeping: boolean): { r: number; g: number; b: number; a: number } {
  switch (tracked.kind) {
    case "box": return sleeping ? COL_SLEEP : COL_BOX;
    case "ball": return sleeping ? COL_SLEEP : COL_BALL;
    case "seesaw": return COL_SEESAW;
    case "pivot": return COL_PIVOT;
    case "rope": return COL_ROPE;
    case "platform": return COL_PLATFORM;
    case "spring": return sleeping ? COL_SLEEP : COL_SPRING;
    case "spring_anchor": return COL_SPRING_ANCHOR;
    default: return COL_BOX;
  }
}

// Draw contact visualization using manifolds (shows all contact points)
function drawContactsFromManifolds(manifolds: ContactManifold[]): void {
  for (const m of manifolds) {
    // Get body states to transform local anchors to world space
    const stateA = getBodyState(m.bodyA);
    const stateB = getBodyState(m.bodyB);
    if (!stateA || !stateB) continue;

    for (const point of m.points) {
      // Transform local anchor A to world space
      const cosA = Math.cos(stateA.angle);
      const sinA = Math.sin(stateA.angle);
      const worldX = point.localAX * cosA - point.localAY * sinA + stateA.x;
      const worldY = point.localAX * sinA + point.localAY * cosA + stateA.y;

      // Red dot at contact point
      drawCircle(worldX, worldY, 4, { color: COL_CONTACT, layer: 10 });

      // Normal direction line
      const normalLen = 20;
      drawLine(
        worldX,
        worldY,
        worldX + m.normalX * normalLen,
        worldY + m.normalY * normalLen,
        { color: COL_CONTACT_NORMAL, thickness: 2, layer: 10 }
      );
    }
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
  if (isKeyPressed("6")) spawnMode = 6;
  if (isKeyPressed("7")) spawnMode = 7;
  if (isKeyPressed("8")) spawnMode = 8;

  // Toggle contact visualization
  if (isKeyPressed("c")) {
    showContacts = !showContacts;
  }

  // Reset
  if (isKeyPressed("r")) {
    setupWorld();
  }

  // Toggle gravity
  if (isKeyPressed("g")) {
    gravityOn = !gravityOn;
    destroyPhysicsWorld();
    bodies = [];
    joints = [];
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
      joints = [];
      bodyCount = 0;
    }
  }

  // Click to spawn (modes 1-6) or raycast continuously (mode 7)
  const mouse = getMouseWorldPosition();
  if (spawnMode === 7) {
    // Raycast mode: continuously shoot ray from center toward mouse
    const centerX = VPW / 2;
    const centerY = VPH / 2;
    const dirX = mouse.x - centerX;
    const dirY = mouse.y - centerY;
    // Normalize and cast
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 1) {
      lastRayHit = raycast(centerX, centerY, dirX / len, dirY / len, 2000);
    }
  } else if (isMouseButtonPressed(0)) {
    const mx = mouse.x;
    const my = mouse.y;
    switch (spawnMode) {
      case 1: spawnBox(mx, my); break;
      case 2: spawnBall(mx, my); break;
      case 3: spawnCluster(mx, my); break;
      case 4: spawnSeesaw(mx, my); break;
      case 5: spawnRope(mx, my); break;
      case 6: spawnPlatform(mx, my); break;
      case 8: spawnSpring(mx, my); break;
    }
    lastRayHit = null;
  } else {
    lastRayHit = null;
  }

  // Space: fast ball upward
  if (isKeyPressed("Space")) {
    const ballId = spawnBall(VPW / 2, VPH - 60, 8);
    setBodyVelocity(ballId, (rng.float() - 0.5) * 100, -600);
  }

  // Update kinematic platforms
  updatePlatforms();

  // Step physics
  stepPhysics(ctx.dt);

  // Get contacts for display
  const contacts = getContacts();

  // Render

  // Background
  drawColorSprite({ color: COL_BG, x: 0, y: 0, w: VPW, h: VPH, layer: 0 });

  // Draw joint/constraint connections
  for (const joint of joints) {
    const stateA = getBodyState(joint.bodyA);
    const stateB = getBodyState(joint.bodyB);

    if (joint.kind === "distance") {
      // Rope links: draw capsule between body centers
      drawCapsule(stateA.x, stateA.y, stateB.x, stateB.y, 2, {
        color: COL_ROPE_LINK,
        layer: 1,
      });
    } else if (joint.kind === "soft") {
      // Soft spring: draw zigzag-ish line
      const dx = stateB.x - stateA.x;
      const dy = stateB.y - stateA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const segments = 8;
      const amplitude = 6;
      const perpX = -dy / dist;
      const perpY = dx / dist;

      let lastX = stateA.x;
      let lastY = stateA.y;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const baseX = stateA.x + dx * t;
        const baseY = stateA.y + dy * t;
        const offset = (i < segments) ? amplitude * (i % 2 === 0 ? 1 : -1) : 0;
        const nx = baseX + perpX * offset;
        const ny = baseY + perpY * offset;
        drawLine(lastX, lastY, nx, ny, {
          color: COL_SPRING,
          thickness: 2,
          layer: 1,
        });
        lastX = nx;
        lastY = ny;
      }
    } else {
      // Revolute joint: draw ring at pivot + connecting lines
      drawRing(stateB.x, stateB.y, 6, 10, { color: COL_JOINT, layer: 3 });
      drawLine(stateA.x, stateA.y, stateB.x, stateB.y, {
        color: COL_JOINT,
        thickness: 2,
        layer: 1,
      });
    }
  }

  // Draw all tracked bodies
  sleepingCount = 0;
  for (const tracked of bodies) {
    const bs = getBodyState(tracked.id);
    if (bs.sleeping) sleepingCount++;
    const col = bodyColor(tracked, bs.sleeping);

    if (tracked.radius) {
      // Circle: render via geometry pipeline (efficient triangle fan)
      drawCircle(bs.x, bs.y, tracked.radius, { color: col, layer: 2 });
    } else if (tracked.vertices) {
      // Polygon: draw rotated vertices
      drawRotatedPolygon(bs.x, bs.y, bs.angle, tracked.vertices, col, 2);
    } else {
      // Fallback AABB: draw from center with rotation
      drawColorSprite({
        color: col,
        x: bs.x - tracked.halfW,
        y: bs.y - tracked.halfH,
        w: tracked.halfW * 2,
        h: tracked.halfH * 2,
        rotation: bs.angle,
        originX: tracked.halfW,
        originY: tracked.halfH,
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

  // Draw contact points if enabled (uses manifolds to show all 2 points per edge)
  if (showContacts) {
    const manifolds = getManifolds();
    drawContactsFromManifolds(manifolds);
  }

  // Draw raycast result if in raycast mode
  if (spawnMode === 7) {
    const centerX = VPW / 2;
    const centerY = VPH / 2;
    // Draw origin marker
    drawCircle(centerX, centerY, 6, { color: COL_RAY, layer: 10 });

    if (lastRayHit) {
      // Draw ray line from center to hit point
      drawLine(centerX, centerY, lastRayHit.hitX, lastRayHit.hitY, {
        color: COL_RAY,
        thickness: 2,
        layer: 10,
      });
      // Draw hit point
      drawCircle(lastRayHit.hitX, lastRayHit.hitY, 8, { color: COL_RAY_HIT, layer: 11 });
      // Draw small ring around hit body indicator
      drawRing(lastRayHit.hitX, lastRayHit.hitY, 10, 14, { color: COL_RAY_HIT, layer: 11 });
    } else {
      // No hit - draw ray toward mouse position (long line)
      const dirX = mouse.x - centerX;
      const dirY = mouse.y - centerY;
      const len = Math.sqrt(dirX * dirX + dirY * dirY);
      if (len > 1) {
        const endX = centerX + (dirX / len) * 2000;
        const endY = centerY + (dirY / len) * 2000;
        drawLine(centerX, centerY, endX, endY, {
          color: COL_RAY,
          thickness: 2,
          layer: 10,
        });
      }
    }
  }

  // --- HUD ---
  const hudX = HUDLayout.TOP_LEFT.x;
  const hudY = HUDLayout.TOP_LEFT.y;
  const lh = HUDLayout.LINE_HEIGHT;

  hud.text("Physics Playground", hudX, hudY);

  hud.text(`Mode [1-7]: ${MODE_NAMES[spawnMode]}`, hudX, hudY + lh, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.WARNING,
  });

  hud.text(`Gravity: ${gravityOn ? "ON" : "OFF"} [G]`, hudX, hudY + lh * 2, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: gravityOn ? Colors.SUCCESS : Colors.LOSE,
  });

  hud.text(`Contacts: ${showContacts ? "ON" : "OFF"} [C]`, hudX, hudY + lh * 3, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: showContacts ? Colors.INFO : Colors.LIGHT_GRAY,
  });

  hud.text("[R] Reset  [Space] Launch  [Click] Spawn", hudX, hudY + lh * 4, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
  });

  // Physics info panel (top-right) using drawTextWrapped
  const infoX = VPW - 200;
  const infoY = HUDLayout.TOP_LEFT.y;
  let infoText =
    `Bodies: ${bodyCount}\n` +
    `Sleeping: ${sleepingCount}\n` +
    `Contacts: ${contacts.length}\n` +
    `Joints: ${joints.length}`;
  // Add raycast info when in raycast mode
  if (spawnMode === 7 && lastRayHit) {
    infoText += `\n\nRay hit:\n` +
      `  Body: ${lastRayHit.bodyId}\n` +
      `  Dist: ${lastRayHit.distance.toFixed(1)}\n` +
      `  Pos: (${lastRayHit.hitX.toFixed(0)}, ${lastRayHit.hitY.toFixed(0)})`;
  }
  drawTextWrapped(infoText, infoX, infoY, {
    maxWidth: 190,
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
    screenSpace: true,
    layer: 100,
  });
});
