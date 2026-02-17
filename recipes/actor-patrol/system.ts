/**
 * Actor patrol recipe: simple enemies with patrol, chase, and sine behaviors.
 *
 * Pure functions -- state in, state out. No rendering, no globals.
 */

import type { Actor, ActorOptions, ActorBehavior, ActorState } from "./types.ts";

export function createActor(x: number, y: number, options?: ActorOptions): Actor {
  const behavior: ActorBehavior = options?.behavior ?? {
    type: "patrol",
    minX: x - 100,
    maxX: x + 100,
    speed: 60,
  };
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: options?.w ?? 16,
    h: options?.h ?? 16,
    hp: options?.hp ?? 3,
    maxHp: options?.hp ?? 3,
    state: "patrol",
    facingRight: true,
    behavior,
    stunTimer: 0,
    elapsed: 0,
    baseY: y,
  };
}

export function updateActor(actor: Actor, dt: number, targetX?: number): Actor {
  if (actor.state === "dead") return actor;

  let { x, y, vx, vy, state, facingRight, stunTimer, elapsed, baseY } = actor;
  elapsed += dt;

  // Handle stun
  if (state === "stunned") {
    stunTimer -= dt;
    if (stunTimer <= 0) {
      state = actor.behavior.type === "patrol" ? "patrol" : "idle";
      stunTimer = 0;
    }
    return { ...actor, x, y, vx: 0, vy: 0, state, stunTimer, elapsed };
  }

  // Behavior-specific movement
  switch (actor.behavior.type) {
    case "patrol": {
      const { minX, maxX, speed } = actor.behavior;
      if (facingRight) {
        vx = speed;
        if (x >= maxX) {
          facingRight = false;
          vx = -speed;
        }
      } else {
        vx = -speed;
        if (x <= minX) {
          facingRight = true;
          vx = speed;
        }
      }
      state = "patrol";
      break;
    }
    case "chase": {
      if (targetX !== undefined) {
        const dx = targetX - x;
        const dist = Math.abs(dx);
        if (dist < actor.behavior.range) {
          state = "chase";
          vx = dx > 0 ? actor.behavior.speed : -actor.behavior.speed;
          facingRight = dx > 0;
        } else {
          state = "idle";
          vx = 0;
        }
      } else {
        state = "idle";
        vx = 0;
      }
      break;
    }
    case "sine": {
      const { amplitude, frequency } = actor.behavior;
      y = baseY + Math.sin(elapsed * frequency) * amplitude;
      vx = 0;
      vy = 0;
      state = "patrol";
      break;
    }
  }

  // Integrate position
  x += vx * dt;
  y += vy * dt;

  return { ...actor, x, y, vx, vy, state, facingRight, stunTimer, elapsed };
}

export function updateActors(actors: Actor[], dt: number, targetX?: number): Actor[] {
  return actors.map((a) => updateActor(a, dt, targetX));
}

export function damageActor(actor: Actor, amount: number, stunDuration: number = 0.5): Actor {
  if (actor.state === "dead") return actor;
  const hp = Math.max(0, actor.hp - amount);
  const state: ActorState = hp <= 0 ? "dead" : "stunned";
  return { ...actor, hp, state, stunTimer: hp <= 0 ? 0 : stunDuration, vx: 0 };
}

export function isActorAlive(actor: Actor): boolean {
  return actor.state !== "dead";
}
