# Arcane API Reference

Complete reference for the Arcane TypeScript runtime API.

**Version:** 0.1.0

## Table of Contents

- [State Management](#state-management) — `@arcane/runtime/state`
- [Rendering](#rendering) — `@arcane/runtime/rendering`
- [UI Primitives](#ui-primitives) — `@arcane/runtime/ui`
- [Physics](#physics) — `@arcane/runtime/physics`
- [Pathfinding](#pathfinding) — `@arcane/runtime/pathfinding`
- [Systems & Recipes](#systems--recipes) — `@arcane/runtime/systems`
- [Agent Protocol](#agent-protocol) — `@arcane/runtime/agent`
- [Testing](#testing) — `@arcane/runtime/testing`

---

## State Management

**Import:** `@arcane/runtime/state`

### Types

```typescript
type Vec2 = { x: number; y: number };
type EntityId = string;
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

type Mutation<T> = (draft: T) => void;
type Diff = { path: string[]; value: any }[];

interface PRNGState {
  seed: number;
  state: [number, number, number, number];
}
```

### Transaction

```typescript
function transaction<T>(state: T, mutation: Mutation<T>): T
```

Create an immutable copy of state with mutations applied.

**Example:**
```typescript
const next = transaction(state, (draft) => {
  draft.player.x += 1;
  draft.score += 10;
});
```

### Diff Computation

```typescript
function computeDiff<T>(prev: T, next: T): Diff
```

Compute the difference between two states.

### PRNG (Xoshiro128**)

```typescript
function seed(value: number): PRNGState
function random(rng: PRNGState): { value: number; rng: PRNGState }
function rollDice(rng: PRNGState, sides: number): { value: number; rng: PRNGState }
```

Deterministic random number generation for reproducible gameplay.

**Example:**
```typescript
let rng = seed(42);
const roll = rollDice(rng, 20);
console.log(roll.value); // 1-20
rng = roll.rng; // Update RNG state
```

### Query

```typescript
function query<T>(state: T, path: string): any
function get<T>(state: T, predicate: (entity: any) => boolean): any | undefined
function has<T>(state: T, predicate: (entity: any) => boolean): boolean
function filter<T>(state: T, predicate: (entity: any) => boolean): any[]
```

Query state by path or predicate.

**Example:**
```typescript
const hp = query(state, "player.hp");
const enemies = filter(state, (e) => e.type === "enemy" && e.hp > 0);
```

### Store

```typescript
interface GameStore<T> {
  getState(): T;
  setState(state: T): void;
  subscribe(listener: (state: T) => void): () => void;
}

function createStore<T>(initialState: T): GameStore<T>
```

Observable state container.

**Example:**
```typescript
const store = createStore({ score: 0 });
store.subscribe((state) => console.log(state.score));
store.setState({ score: 10 }); // logs "10"
```

### Error Handling

```typescript
class ArcaneError extends Error {
  code: string;
  details?: any;
}

function createError(code: string, message: string, details?: any): ArcaneError
```

---

## Rendering

**Import:** `@arcane/runtime/rendering`

### Frame Loop

```typescript
function onFrame(callback: () => void): void
function getDeltaTime(): number
```

Register a frame callback. Called every frame at ~60 FPS.

**Example:**
```typescript
onFrame(() => {
  const dt = getDeltaTime();
  updatePhysics(dt);
  render();
});
```

### Sprites

```typescript
interface SpriteOptions {
  width?: number;
  height?: number;
  rotation?: number;
  sourceRect?: { x: number; y: number; width: number; height: number };
  tint?: { r: number; g: number; b: number; a: number };
}

function drawSprite(
  textureId: string,
  x: number,
  y: number,
  options?: SpriteOptions
): void

function clearSprites(): void
```

Draw sprites. Origin is top-left corner. Y increases downward.

**Example:**
```typescript
drawSprite("player", 100, 200, {
  width: 32,
  height: 32,
  rotation: Math.PI / 4,
});
```

### Textures

```typescript
function loadTexture(id: string, path: string): void
function createSolidTexture(id: string, r: number, g: number, b: number, a: number): void
```

Load textures or create solid color textures. Colors are 0.0-1.0.

**Example:**
```typescript
loadTexture("player", "./assets/player.png");
createSolidTexture("red", 1.0, 0.0, 0.0, 1.0);
```

### Camera

```typescript
interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

function setCamera(x: number, y: number, zoom: number): void
function getCamera(): CameraState
function followTarget(targetX: number, targetY: number, smoothing?: number): void
```

Control camera position and zoom. Higher zoom = bigger on screen.

**Example:**
```typescript
setCamera(player.x, player.y, 4.0);
followTarget(player.x, player.y, 0.1); // smooth follow
```

### Input

```typescript
function isKeyDown(key: string): boolean
function isKeyPressed(key: string): boolean
function getMousePosition(): { x: number; y: number }
```

Query keyboard and mouse input.

**Example:**
```typescript
if (isKeyPressed("Space")) {
  jump();
}
if (isKeyDown("ArrowRight")) {
  moveRight();
}
```

### Text Rendering

```typescript
interface FontId {
  id: string;
}

interface TextOptions {
  font?: FontId;
  scale?: number;
  color?: { r: number; g: number; b: number; a: number };
}

function getDefaultFont(): FontId
function loadFont(id: string, path: string): FontId
function drawText(text: string, x: number, y: number, options?: TextOptions): void
function measureText(text: string, font?: FontId): { width: number; height: number }
```

Render text using CP437 bitmap fonts.

**Example:**
```typescript
const font = getDefaultFont();
drawText("Score: 100", 10, 10, {
  font,
  scale: 2.0,
  color: { r: 1, g: 1, b: 1, a: 1 },
});
```

### Animation

```typescript
interface Animation {
  textureId: string;
  frameCount: number;
  frameDuration: number;
  loop: boolean;
}

interface AnimationState {
  animation: Animation;
  currentFrame: number;
  elapsedTime: number;
  playing: boolean;
}

function createAnimation(
  textureId: string,
  frameCount: number,
  frameDuration: number,
  loop?: boolean
): Animation

function updateAnimation(state: AnimationState, dt: number): AnimationState

function drawAnimatedSprite(
  state: AnimationState,
  x: number,
  y: number,
  spriteWidth: number,
  spriteHeight: number
): void
```

Sprite sheet animation.

**Example:**
```typescript
let anim = {
  animation: createAnimation("walk", 4, 0.1, true),
  currentFrame: 0,
  elapsedTime: 0,
  playing: true,
};

onFrame(() => {
  anim = updateAnimation(anim, getDeltaTime());
  drawAnimatedSprite(anim, player.x, player.y, 32, 32);
});
```

### Audio

```typescript
function loadSound(id: string, path: string): void
function playSound(id: string, volume?: number): void
function playMusic(id: string, volume?: number): void
function stopSound(id: string): void
function setVolume(id: string, volume: number): void
```

Audio playback. Volume is 0.0-1.0.

**Example:**
```typescript
loadSound("jump", "./assets/jump.wav");
playSound("jump", 0.8);

playMusic("bgm", 0.5); // loops by default
```

### Tilemap

```typescript
interface TilemapId {
  id: number;
}

function createTilemap(
  width: number,
  height: number,
  tileWidth: number,
  tileHeight: number,
  atlasTextureId: string,
  atlasColumns: number
): TilemapId

function setTile(tilemap: TilemapId, x: number, y: number, tileIndex: number): void
function getTile(tilemap: TilemapId, x: number, y: number): number
function drawTilemap(tilemap: TilemapId): void
```

Efficient tile-based rendering.

**Example:**
```typescript
const map = createTilemap(20, 15, 32, 32, "tiles", 8);
setTile(map, 0, 0, 1); // tile index 1 from atlas
drawTilemap(map);
```

### Lighting

```typescript
interface AmbientLight {
  r: number;
  g: number;
  b: number;
  intensity: number;
}

interface PointLight {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
  radius: number;
}

function setAmbientLight(light: AmbientLight): void
function addPointLight(light: PointLight): void
function clearLights(): void
```

Dynamic lighting system.

**Example:**
```typescript
setAmbientLight({ r: 0.2, g: 0.2, b: 0.3, intensity: 0.3 });
addPointLight({
  x: player.x,
  y: player.y,
  r: 1.0,
  g: 0.9,
  b: 0.7,
  intensity: 1.0,
  radius: 200,
});
```

---

## UI Primitives

**Import:** `@arcane/runtime/ui`

### Types

```typescript
interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

function rgb(r: number, g: number, b: number, a?: number): Color
```

Helper to create colors from 0-255 values (auto-normalized to 0.0-1.0).

**Example:**
```typescript
const red = rgb(255, 0, 0);      // { r: 1.0, g: 0, b: 0, a: 1.0 }
const transBlue = rgb(0, 0, 255, 128); // { r: 0, g: 0, b: 1.0, a: 0.5 }
```

### Primitives

```typescript
function drawRect(x: number, y: number, width: number, height: number, color: Color): void

interface PanelOptions {
  borderColor?: Color;
  borderWidth?: number;
}
function drawPanel(
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: Color,
  options?: PanelOptions
): void

interface BarOptions {
  borderColor?: Color;
  borderWidth?: number;
}
function drawBar(
  x: number,
  y: number,
  width: number,
  height: number,
  fillRatio: number,
  fillColor: Color,
  bgColor: Color,
  options?: BarOptions
): void

interface LabelOptions {
  font?: FontId;
  scale?: number;
  textColor?: Color;
  bgColor?: Color;
  padding?: number;
}
function drawLabel(
  text: string,
  x: number,
  y: number,
  options?: LabelOptions
): void
```

High-level UI components.

**Example:**
```typescript
import { drawPanel, drawBar, drawLabel, rgb } from "@arcane/runtime/ui";

drawPanel(10, 10, 200, 80, rgb(30, 30, 30, 220), {
  borderColor: rgb(100, 100, 100),
  borderWidth: 2,
});

drawBar(20, 30, 180, 20, hp / maxHp, rgb(200, 50, 50), rgb(50, 50, 50));
drawLabel("HP", 20, 35, { textColor: rgb(255, 255, 255) });
```

---

## Physics

**Import:** `@arcane/runtime/physics`

### AABB Collision

```typescript
interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

function aabbOverlap(a: AABB, b: AABB): boolean
function circleAABBOverlap(cx: number, cy: number, radius: number, box: AABB): boolean
function circleAABBResolve(
  cx: number,
  cy: number,
  radius: number,
  box: AABB
): { nx: number; ny: number; depth: number } | null
```

Axis-aligned bounding box collision detection and resolution.

**Example:**
```typescript
const player = { x: 10, y: 10, width: 32, height: 32 };
const wall = { x: 40, y: 10, width: 32, height: 32 };

if (aabbOverlap(player, wall)) {
  console.log("Collision!");
}
```

---

## Pathfinding

**Import:** `@arcane/runtime/pathfinding`

### A* Pathfinding

```typescript
interface PathGrid {
  width: number;
  height: number;
  isWalkable: (x: number, y: number) => boolean;
}

interface PathOptions {
  allowDiagonal?: boolean;
}

interface PathResult {
  path: Array<{ x: number; y: number }>;
  found: boolean;
}

function findPath(
  grid: PathGrid,
  start: { x: number; y: number },
  goal: { x: number; y: number },
  options?: PathOptions
): PathResult
```

A* pathfinding with binary min-heap optimization.

**Example:**
```typescript
const grid = {
  width: 20,
  height: 15,
  isWalkable: (x, y) => dungeon.tiles[y][x] === "floor",
};

const result = findPath(grid, { x: 0, y: 0 }, { x: 10, y: 10 }, {
  allowDiagonal: false,
});

if (result.found) {
  console.log("Path length:", result.path.length);
}
```

---

## Systems & Recipes

**Import:** `@arcane/runtime/systems`

### Types

```typescript
interface Rule<TState, TParams> {
  name: string;
  apply: (state: TState, params: TParams) => TState;
}

interface RuleResult<TState> {
  state: TState;
  changes: string[];
}

interface SystemDef<TState, TParams> {
  rules: Rule<TState, TParams>[];
  queries?: Record<string, (state: TState, ...args: any[]) => any>;
}

interface ExtendOptions<TState, TParams> {
  rules?: Rule<TState, TParams>[];
  queries?: Record<string, (state: TState, ...args: any[]) => any>;
}
```

### Functions

```typescript
function rule<TState, TParams>(
  name: string,
  apply: (state: TState, params: TParams) => TState
): Rule<TState, TParams>

function system<TState, TParams>(def: SystemDef<TState, TParams>): {
  applyRule: (state: TState, ruleName: string, params: TParams) => TState;
  getApplicableRules: (state: TState, params: TParams) => string[];
  queries: Record<string, any>;
}

function extend<TState, TParams>(
  base: ReturnType<typeof system<TState, TParams>>,
  options: ExtendOptions<TState, TParams>
): ReturnType<typeof system<TState, TParams>>
```

Declarative game systems framework.

**Example:**
```typescript
const HealthSystem = system({
  rules: [
    rule("damage", (state, params: { target: string; amount: number }) => ({
      ...state,
      entities: {
        ...state.entities,
        [params.target]: {
          ...state.entities[params.target],
          hp: state.entities[params.target].hp - params.amount,
        },
      },
    })),
  ],
  queries: {
    isAlive: (state, id) => state.entities[id].hp > 0,
  },
});

let state = { entities: { player: { hp: 10 } } };
state = HealthSystem.applyRule(state, "damage", { target: "player", amount: 3 });
console.log(HealthSystem.queries.isAlive(state, "player")); // true
```

---

## Agent Protocol

**Import:** `@arcane/runtime/agent`

### Types

```typescript
interface ActionInfo {
  name: string;
  description: string;
  schema: Record<string, string>;
  execute: (params: any) => void;
}

interface DescribeOptions {
  verbosity?: "minimal" | "normal" | "detailed";
}

interface AgentConfig<T = any> {
  name?: string;
  getState: () => T;
  setState?: (state: T) => void;
  describe?: (options?: DescribeOptions) => string;
  actions?: ActionInfo[];
}
```

### Functions

```typescript
function registerAgent<T>(config: AgentConfig<T>): void
```

Register an agent protocol for AI interaction.

**Example:**
```typescript
registerAgent({
  name: "my-game",
  getState: () => gameState,
  setState: (s) => { gameState = s; },
  describe: (options) => {
    if (options?.verbosity === "detailed") {
      return `Player: ${gameState.player.hp}/${gameState.player.maxHp} HP...`;
    }
    return `HP: ${gameState.player.hp}`;
  },
  actions: [
    {
      name: "heal",
      description: "Heal the player",
      schema: { amount: "number" },
      execute: (params) => {
        gameState = healPlayer(gameState, params.amount);
      },
    },
  ],
});
```

Then query via CLI:
```bash
arcane describe src/visual.ts
arcane inspect src/visual.ts "player.hp"
```

---

## Testing

**Import:** `@arcane/runtime/testing`

### Functions

```typescript
function describe(suiteName: string, fn: () => void): void
function it(testName: string, fn: () => void | Promise<void>): void

namespace assert {
  function equal<T>(actual: T, expected: T, message?: string): void
  function notEqual<T>(actual: T, expected: T, message?: string): void
  function ok(value: any, message?: string): void
  function throws(fn: () => void, message?: string): void
  function deepEqual<T>(actual: T, expected: T, message?: string): void
}

function expect<T>(actual: T): {
  toBe(expected: T): void;
  toEqual(expected: T): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toThrow(): void;
}
```

Universal test framework (works in Node and V8).

**Example:**
```typescript
import { describe, it, assert, expect } from "@arcane/runtime/testing";

describe("Player", () => {
  it("moves right", () => {
    const state = { player: { x: 0 } };
    const next = movePlayer(state, "right");
    assert.equal(next.player.x, 1);
  });

  it("increases score", () => {
    const state = { score: 0 };
    const next = increaseScore(state, 10);
    expect(next.score).toBe(10);
  });
});
```

Run tests:
```bash
arcane test                    # V8 runtime
./run-tests.sh                 # Node runtime (faster)
```

---

## Version History

- **0.1.0** — Initial release (Phase 7)

## See Also

- [Getting Started](getting-started.md)
- [Tutorial: Sokoban](tutorial-sokoban.md)
- [Tutorial: RPG](tutorial-rpg.md)
- [Recipe Guide](recipe-guide.md)
- [Systems & Recipes](systems-and-recipes.md)
