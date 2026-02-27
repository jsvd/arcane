/**
 * Test that the unified "arcane" import works
 */

import { it } from "./testing/harness.ts";
// @ts-expect-error - arcane module is runtime-only, no .d.ts yet
import {
  drawSprite,
  createStore,
  onFrame,
  createButton,
  createPhysicsWorld,
  findPath,
  system,
  tween,
  createEmitter,
  createScene,
  saveGame,
  runWFC,
  registerAgent,
  drawCircle,
  isKeyDown
} from "arcane";

it("arcane barrel export - rendering", () => {
  // Just verify the imports resolve
  if (typeof drawSprite !== "function") {
    throw new Error("drawSprite not exported from arcane");
  }
  if (typeof onFrame !== "function") {
    throw new Error("onFrame not exported from arcane");
  }
  if (typeof isKeyDown !== "function") {
    throw new Error("isKeyDown not exported from arcane");
  }
});

it("arcane barrel export - state", () => {
  if (typeof createStore !== "function") {
    throw new Error("createStore not exported from arcane");
  }
});

it("arcane barrel export - ui", () => {
  if (typeof createButton !== "function") {
    throw new Error("createButton not exported from arcane");
  }
  if (typeof drawCircle !== "function") {
    throw new Error("drawCircle not exported from arcane");
  }
});

it("arcane barrel export - physics", () => {
  if (typeof createPhysicsWorld !== "function") {
    throw new Error("createPhysicsWorld not exported from arcane");
  }
});

it("arcane barrel export - pathfinding", () => {
  if (typeof findPath !== "function") {
    throw new Error("findPath not exported from arcane");
  }
});

it("arcane barrel export - systems", () => {
  if (typeof system !== "function") {
    throw new Error("system not exported from arcane");
  }
});

it("arcane barrel export - tweening", () => {
  if (typeof tween !== "function") {
    throw new Error("tween not exported from arcane");
  }
});

it("arcane barrel export - particles", () => {
  if (typeof createEmitter !== "function") {
    throw new Error("createEmitter not exported from arcane");
  }
});

it("arcane barrel export - scenes", () => {
  if (typeof createScene !== "function") {
    throw new Error("createScene not exported from arcane");
  }
});

it("arcane barrel export - persistence", () => {
  if (typeof saveGame !== "function") {
    throw new Error("saveGame not exported from arcane");
  }
});

it("arcane barrel export - procgen", () => {
  if (typeof runWFC !== "function") {
    throw new Error("runWFC not exported from arcane");
  }
});

it("arcane barrel export - agent", () => {
  if (typeof registerAgent !== "function") {
    throw new Error("registerAgent not exported from arcane");
  }
});
