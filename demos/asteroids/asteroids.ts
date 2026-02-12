/**
 * Asteroids Demo — Phase 12: Sprite Transforms + Rendering Polish
 *
 * Showcases all Phase 12 features:
 * - Rotation: ship and asteroids rotate
 * - Origin point: ship rotates around center
 * - Flip: ship flips when thrusting backward
 * - Opacity: particle fade-out
 * - Blend modes: additive blending for exhaust and explosions
 * - Custom shaders: (optional, CRT effect via post-processing)
 * - Post-processing: CRT scanline + vignette effects
 *
 * Controls:
 * - Left/Right: Rotate ship
 * - Up: Thrust forward
 * - Space: Shoot
 * - R: Restart
 * - P: Toggle post-processing
 */

import {
  onFrame,
  clearSprites,
  drawSprite,
  setCamera,
  isKeyDown,
  isKeyPressed,
  getDeltaTime,
  createSolidTexture,
  getViewportSize,
  drawText,
  addPostProcessEffect,
  removeEffect,
  setEffectParam,
} from "../../runtime/rendering/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// --- Constants ---
const SHIP_SIZE = 20;
const SHIP_TURN_SPEED = 4.0; // radians/sec
const SHIP_THRUST = 300;
const SHIP_MAX_SPEED = 400;
const SHIP_DRAG = 0.99;
const BULLET_SPEED = 500;
const BULLET_LIFETIME = 1.5;
const BULLET_SIZE = 4;
const ASTEROID_SPEEDS = [40, 60, 90]; // large, medium, small
const ASTEROID_SIZES = [40, 24, 12]; // large, medium, small
const ASTEROID_SPIN = [0.5, 1.0, 2.0]; // rotation speed per size
const SHOOT_COOLDOWN = 0.15;
const PARTICLE_LIFETIME = 0.6;
const INVULNERABLE_TIME = 2.0;

// --- Textures ---
const TEX_SHIP = createSolidTexture("ship", 180, 220, 255);
const TEX_SHIP_THRUST = createSolidTexture("thrust", 255, 160, 50);
const TEX_BULLET = createSolidTexture("bullet", 255, 255, 200);
const TEX_ASTEROID = createSolidTexture("asteroid", 160, 140, 120);
const TEX_PARTICLE = createSolidTexture("particle", 255, 200, 100);
const TEX_EXPLOSION = createSolidTexture("explosion", 255, 120, 40);
const TEX_STAR = createSolidTexture("star", 200, 200, 220);
const TEX_BG = createSolidTexture("bg", 5, 5, 15);

// --- Types ---
type Vec2 = { x: number; y: number };

type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians, 0 = right
  thrusting: boolean;
  alive: boolean;
  invulnerableTimer: number;
  shootCooldown: number;
};

type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 0=large, 1=medium, 2=small
  angle: number;
  spin: number;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  isExplosion: boolean;
};

type Star = {
  x: number;
  y: number;
  brightness: number;
  twinklePhase: number;
};

type GameState = {
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[];
  stars: Star[];
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  fieldW: number;
  fieldH: number;
  time: number;
  postProcessEnabled: boolean;
};

// --- State ---
const { width: vpW, height: vpH } = getViewportSize();
let state = createInitialState(vpW, vpH);

// Post-processing effect handles
let crtEffect = 0;
let vignetteEffect = 0;

function enablePostProcess(): void {
  if (crtEffect === 0) {
    crtEffect = addPostProcessEffect("crt");
    setEffectParam(crtEffect, 0, 600, 0.08, 1.05);
  }
  if (vignetteEffect === 0) {
    vignetteEffect = addPostProcessEffect("vignette");
    setEffectParam(vignetteEffect, 0, 0.6, 0.75);
  }
}

function disablePostProcess(): void {
  if (crtEffect !== 0) {
    removeEffect(crtEffect);
    crtEffect = 0;
  }
  if (vignetteEffect !== 0) {
    removeEffect(vignetteEffect);
    vignetteEffect = 0;
  }
}

// Enable post-processing by default
enablePostProcess();

function createInitialState(w: number, h: number): GameState {
  const stars: Star[] = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      brightness: 0.3 + Math.random() * 0.7,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  return {
    ship: {
      x: w / 2,
      y: h / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2, // point up
      thrusting: false,
      alive: true,
      invulnerableTimer: INVULNERABLE_TIME,
      shootCooldown: 0,
    },
    asteroids: [],
    bullets: [],
    particles: [],
    stars,
    score: 0,
    lives: 3,
    level: 0,
    gameOver: false,
    fieldW: w,
    fieldH: h,
    time: 0,
    postProcessEnabled: true,
  };
}

function spawnLevel(s: GameState): void {
  s.level++;
  const count = 3 + s.level;
  for (let i = 0; i < count; i++) {
    // Spawn away from ship
    let x: number, y: number;
    do {
      x = Math.random() * s.fieldW;
      y = Math.random() * s.fieldH;
    } while (dist(x, y, s.ship.x, s.ship.y) < 150);

    const angle = Math.random() * Math.PI * 2;
    const speed = ASTEROID_SPEEDS[0] + Math.random() * 20;
    s.asteroids.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 0,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * ASTEROID_SPIN[0] * 2,
    });
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function wrap(val: number, max: number): number {
  if (val < 0) return val + max;
  if (val > max) return val - max;
  return val;
}

// --- Update ---
function update(s: GameState, dt: number): void {
  if (s.gameOver) {
    if (isKeyPressed("r") || isKeyPressed("R")) {
      const newState = createInitialState(s.fieldW, s.fieldH);
      Object.assign(s, newState);
    }
    return;
  }

  s.time += dt;

  // Spawn new wave if no asteroids
  if (s.asteroids.length === 0) {
    spawnLevel(s);
  }

  // Ship input
  const ship = s.ship;
  if (ship.alive) {
    if (isKeyDown("ArrowLeft") || isKeyDown("a")) {
      ship.angle -= SHIP_TURN_SPEED * dt;
    }
    if (isKeyDown("ArrowRight") || isKeyDown("d")) {
      ship.angle += SHIP_TURN_SPEED * dt;
    }

    ship.thrusting = isKeyDown("ArrowUp") || isKeyDown("w");
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
      ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;

      // Thrust particles
      if (Math.random() < 0.6) {
        const backAngle = ship.angle + Math.PI;
        const spread = (Math.random() - 0.5) * 0.6;
        s.particles.push({
          x: ship.x + Math.cos(backAngle) * SHIP_SIZE * 0.4,
          y: ship.y + Math.sin(backAngle) * SHIP_SIZE * 0.4,
          vx: Math.cos(backAngle + spread) * (80 + Math.random() * 60),
          vy: Math.sin(backAngle + spread) * (80 + Math.random() * 60),
          life: PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5),
          maxLife: PARTICLE_LIFETIME,
          size: 3 + Math.random() * 4,
          isExplosion: false,
        });
      }
    }

    // Speed limit + drag
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > SHIP_MAX_SPEED) {
      ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
      ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
    }
    ship.vx *= SHIP_DRAG;
    ship.vy *= SHIP_DRAG;

    // Move + wrap
    ship.x = wrap(ship.x + ship.vx * dt, s.fieldW);
    ship.y = wrap(ship.y + ship.vy * dt, s.fieldH);

    // Shooting
    ship.shootCooldown -= dt;
    if (
      (isKeyPressed("Space") || isKeyDown("Space")) &&
      ship.shootCooldown <= 0
    ) {
      ship.shootCooldown = SHOOT_COOLDOWN;
      s.bullets.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE * 0.6,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE * 0.6,
        vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.3,
        vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.3,
        life: BULLET_LIFETIME,
      });
    }

    // Invulnerability timer
    if (ship.invulnerableTimer > 0) {
      ship.invulnerableTimer -= dt;
    }
  } else {
    // Respawn after death
    ship.invulnerableTimer -= dt;
    if (ship.invulnerableTimer <= 0) {
      if (s.lives > 0) {
        ship.alive = true;
        ship.x = s.fieldW / 2;
        ship.y = s.fieldH / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = -Math.PI / 2;
        ship.invulnerableTimer = INVULNERABLE_TIME;
      } else {
        s.gameOver = true;
      }
    }
  }

  // Update bullets
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x = wrap(b.x + b.vx * dt, s.fieldW);
    b.y = wrap(b.y + b.vy * dt, s.fieldH);
    b.life -= dt;
    if (b.life <= 0) {
      s.bullets.splice(i, 1);
    }
  }

  // Update asteroids
  for (const a of s.asteroids) {
    a.x = wrap(a.x + a.vx * dt, s.fieldW);
    a.y = wrap(a.y + a.vy * dt, s.fieldH);
    a.angle += a.spin * dt;
  }

  // Update particles
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      s.particles.splice(i, 1);
    }
  }

  // Bullet-asteroid collisions
  for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
    const b = s.bullets[bi];
    for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
      const a = s.asteroids[ai];
      const r = ASTEROID_SIZES[a.size];
      if (dist(b.x, b.y, a.x, a.y) < r) {
        // Remove bullet
        s.bullets.splice(bi, 1);

        // Score
        s.score += (a.size + 1) * 100;

        // Spawn explosion particles
        spawnExplosion(s, a.x, a.y, r);

        // Split asteroid
        if (a.size < 2) {
          const newSize = a.size + 1;
          for (let k = 0; k < 2; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = ASTEROID_SPEEDS[newSize] + Math.random() * 20;
            s.asteroids.push({
              x: a.x,
              y: a.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: newSize,
              angle: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * ASTEROID_SPIN[newSize] * 2,
            });
          }
        }

        // Remove original asteroid
        s.asteroids.splice(ai, 1);
        break;
      }
    }
  }

  // Ship-asteroid collision
  if (ship.alive && ship.invulnerableTimer <= 0) {
    for (const a of s.asteroids) {
      const r = ASTEROID_SIZES[a.size] + SHIP_SIZE * 0.4;
      if (dist(ship.x, ship.y, a.x, a.y) < r) {
        ship.alive = false;
        s.lives--;
        ship.invulnerableTimer = 1.5;

        // Death explosion
        spawnExplosion(s, ship.x, ship.y, SHIP_SIZE);
        break;
      }
    }
  }

  // Toggle post-processing
  if (isKeyPressed("p") || isKeyPressed("P")) {
    s.postProcessEnabled = !s.postProcessEnabled;
    if (s.postProcessEnabled) {
      enablePostProcess();
    } else {
      disablePostProcess();
    }
  }

  // Restart
  if (isKeyPressed("r") || isKeyPressed("R")) {
    const newState = createInitialState(s.fieldW, s.fieldH);
    Object.assign(s, newState);
  }
}

function spawnExplosion(s: GameState, x: number, y: number, radius: number): void {
  const count = 8 + Math.floor(radius * 0.5);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 120;
    s.particles.push({
      x: x + (Math.random() - 0.5) * radius * 0.5,
      y: y + (Math.random() - 0.5) * radius * 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      size: 2 + Math.random() * 6,
      isExplosion: true,
    });
  }
}

// --- Render ---
function render(s: GameState): void {
  clearSprites();

  const fw = s.fieldW;
  const fh = s.fieldH;

  // Background
  drawSprite({ textureId: TEX_BG, x: 0, y: 0, w: fw, h: fh, layer: -10 });

  // Stars (twinkle with opacity)
  for (const star of s.stars) {
    const twinkle =
      0.5 + 0.5 * Math.sin(s.time * 2 + star.twinklePhase);
    const alpha = star.brightness * twinkle;
    drawSprite({
      textureId: TEX_STAR,
      x: star.x - 1,
      y: star.y - 1,
      w: 2,
      h: 2,
      layer: -5,
      opacity: alpha,
    });
  }

  // Particles (additive blending + opacity fade)
  for (const p of s.particles) {
    const t = p.life / p.maxLife;
    const tex = p.isExplosion ? TEX_EXPLOSION : TEX_PARTICLE;
    drawSprite({
      textureId: tex,
      x: p.x - p.size / 2,
      y: p.y - p.size / 2,
      w: p.size,
      h: p.size,
      layer: 5,
      opacity: t,
      blendMode: "additive",
    });
  }

  // Asteroids (rotation)
  for (const a of s.asteroids) {
    const r = ASTEROID_SIZES[a.size];
    drawSprite({
      textureId: TEX_ASTEROID,
      x: a.x - r,
      y: a.y - r,
      w: r * 2,
      h: r * 2,
      layer: 2,
      rotation: a.angle,
      originX: 0.5,
      originY: 0.5,
    });
  }

  // Bullets
  for (const b of s.bullets) {
    const opacity = Math.min(b.life / 0.3, 1);
    drawSprite({
      textureId: TEX_BULLET,
      x: b.x - BULLET_SIZE / 2,
      y: b.y - BULLET_SIZE / 2,
      w: BULLET_SIZE,
      h: BULLET_SIZE,
      layer: 3,
      opacity,
      blendMode: "additive",
    });
  }

  // Ship
  const ship = s.ship;
  if (ship.alive) {
    // Invulnerability blink
    const visible =
      ship.invulnerableTimer <= 0 ||
      Math.floor(s.time * 8) % 2 === 0;

    if (visible) {
      // Thrust glow behind ship (additive)
      if (ship.thrusting) {
        const backAngle = ship.angle + Math.PI;
        const glowX = ship.x + Math.cos(backAngle) * SHIP_SIZE * 0.5;
        const glowY = ship.y + Math.sin(backAngle) * SHIP_SIZE * 0.5;
        const glowSize = SHIP_SIZE * (0.8 + Math.sin(s.time * 20) * 0.2);
        drawSprite({
          textureId: TEX_SHIP_THRUST,
          x: glowX - glowSize / 2,
          y: glowY - glowSize / 2,
          w: glowSize,
          h: glowSize,
          layer: 4,
          blendMode: "additive",
          opacity: 0.7,
          rotation: ship.angle,
          originX: 0.5,
          originY: 0.5,
        });
      }

      // Ship body (rotation + flip when going backward)
      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      const movingBackward =
        speed > 30 &&
        Math.cos(ship.angle) * ship.vx + Math.sin(ship.angle) * ship.vy <
          -30;

      drawSprite({
        textureId: TEX_SHIP,
        x: ship.x - SHIP_SIZE / 2,
        y: ship.y - SHIP_SIZE / 2,
        w: SHIP_SIZE,
        h: SHIP_SIZE,
        layer: 10,
        rotation: ship.angle,
        originX: 0.5,
        originY: 0.5,
        flipX: movingBackward,
      });
    }
  }

  // HUD
  const hudY = 8;
  drawLabel("Score: " + s.score, 10, hudY, 100);
  drawLabel("Lives: " + s.lives, fw - 110, hudY, 100);
  drawLabel("Level: " + s.level, fw / 2 - 40, hudY, 80);

  if (s.postProcessEnabled) {
    drawLabel("CRT: ON", fw - 110, fh - 24, 100);
  } else {
    drawLabel("CRT: OFF", fw - 110, fh - 24, 100);
  }

  if (s.gameOver) {
    drawText("GAME OVER", fw / 2 - 72, fh / 2 - 20, {
      scale: 2,
      tint: { r: 1, g: 0.3, b: 0.3, a: 1 },
    });
    drawText("Press R to restart", fw / 2 - 72, fh / 2 + 10);
  }

  if (!s.ship.alive && !s.gameOver) {
    drawText("Destroyed!", fw / 2 - 40, fh / 2 - 10, {
      tint: { r: 1, g: 0.5, b: 0.2, a: 1 },
    });
  }
}

function drawLabel(text: string, x: number, y: number, _w: number): void {
  drawText(text, x, y, { tint: { r: 0.8, g: 0.8, b: 0.9, a: 1 } });
}

// --- Setup camera ---
setCamera(vpW / 2, vpH / 2);

// --- Game loop ---
onFrame(() => {
  const dt = getDeltaTime();
  update(state, Math.min(dt, 0.05));
  render(state);
});

// --- Agent protocol ---
registerAgent({
  name: "asteroids",
  version: "1.0",
  getState: () => ({
    score: state.score,
    lives: state.lives,
    level: state.level,
    gameOver: state.gameOver,
    shipAlive: state.ship.alive,
    shipX: Math.round(state.ship.x),
    shipY: Math.round(state.ship.y),
    asteroidCount: state.asteroids.length,
    bulletCount: state.bullets.length,
    postProcessEnabled: state.postProcessEnabled,
  }),
  actions: [
    {
      name: "restart",
      description: "Restart the game",
      handler: () => {
        const newState = createInitialState(state.fieldW, state.fieldH);
        Object.assign(state, newState);
        return { success: true };
      },
    },
    {
      name: "togglePostProcess",
      description: "Toggle CRT post-processing effect",
      handler: () => {
        state.postProcessEnabled = !state.postProcessEnabled;
        if (state.postProcessEnabled) {
          enablePostProcess();
        } else {
          disablePostProcess();
        }
        return { enabled: state.postProcessEnabled };
      },
    },
  ],
  describe: () =>
    `Asteroids — Score: ${state.score} | Lives: ${state.lives} | Level: ${state.level}` +
    (state.gameOver ? " | GAME OVER" : "") +
    ` | Asteroids: ${state.asteroids.length}` +
    ` | CRT: ${state.postProcessEnabled ? "ON" : "OFF"}`,
});
