# Cookbook — Advanced Patterns

Self-contained recipes for engine features beyond the basics in `AGENTS.md`. Each snippet is copy-paste ready.

---

## Quick Start with createGame()

Minimal game loop in ~15 lines. `createGame()` auto-clears sprites, sets (0,0) to the top-left, and provides `dt` / viewport / elapsed time in the frame context.

```typescript
import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";
import { setCamera, isKeyDown } from "@arcane/runtime/rendering";

const game = createGame({ name: "my-game", zoom: 2 });
let x = 400, y = 300;

game.onFrame((ctx) => {
  if (isKeyDown("ArrowRight") || isKeyDown("d")) x += 120 * ctx.dt;
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) x -= 120 * ctx.dt;
  if (isKeyDown("ArrowDown") || isKeyDown("s")) y += 120 * ctx.dt;
  if (isKeyDown("ArrowUp") || isKeyDown("w")) y -= 120 * ctx.dt;

  setCamera(x, y, 2);
  drawColorSprite({ color: rgb(60, 180, 255), x: x - 16, y: y - 16, w: 32, h: 32, layer: 1 });
  hud.text("Use arrow keys to move", 10, 10);
});
```

What `createGame()` does for you:
- `autoClear: true` (default) -- clears all sprites at the start of each frame.
- `autoCamera: true` (default) -- on the first frame, sets the camera so (0,0) is top-left.
- `background: { r, g, b }` -- pass 0-255 values, converted to 0.0-1.0 internally.
- `game.state({ get, set })` -- optionally wire up game state for agent protocol.

---

## Drawing Colored Sprites

`drawColorSprite()` lets you pass a `color` directly instead of manually creating a solid texture. Textures are cached by RGBA value internally -- safe to call every frame.

**Before (verbose):**

```typescript
import { createSolidTexture } from "@arcane/runtime/rendering";
import { drawSprite } from "@arcane/runtime/rendering";

const redTex = createSolidTexture("red", 255, 0, 0, 255);   // manual texture
const blueTex = createSolidTexture("blue", 0, 100, 255, 255);

drawSprite({ textureId: redTex, x: 100, y: 200, w: 32, h: 32, layer: 1 });
drawSprite({ textureId: blueTex, x: 150, y: 200, w: 16, h: 16, layer: 1 });
```

**After (convenience):**

```typescript
import { drawColorSprite } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";

drawColorSprite({ color: rgb(255, 0, 0), x: 100, y: 200, w: 32, h: 32, layer: 1 });
drawColorSprite({ color: rgb(0, 100, 255), x: 150, y: 200, w: 16, h: 16, layer: 1 });
```

`rgb()` takes 0-255 integers and returns a normalized `Color` (0.0-1.0). Alpha defaults to 255; pass a fourth argument for transparency: `rgb(255, 0, 0, 128)`.

You can also pass a `textureId` alongside `color` -- when `textureId` is present, it takes priority and the color is ignored.

---

## HUD Shortcuts

The `hud` object provides `text()`, `bar()`, and `label()` with built-in defaults for `screenSpace: true`, layer ordering, and colors. No need to repeat the same options every frame.

**Before (verbose):**

```typescript
import { drawText } from "@arcane/runtime/rendering";
import { drawBar, drawLabel } from "@arcane/runtime/ui";

drawText("Score: 100", 10, 10, { scale: 2, tint: { r: 1, g: 1, b: 1, a: 1 }, layer: 100, screenSpace: true });
drawBar(10, 30, 80, 12, health / maxHealth, {
  fillColor: { r: 0.2, g: 0.8, b: 0.3, a: 1 },
  bgColor: { r: 0.1, g: 0.1, b: 0.15, a: 0.85 },
  borderColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
  borderWidth: 1, layer: 100, screenSpace: true,
});
drawLabel("PAUSED", 350, 280, {
  textColor: { r: 1, g: 1, b: 1, a: 1 },
  bgColor: { r: 0.1, g: 0.1, b: 0.15, a: 0.85 },
  padding: 8, scale: 2, layer: 110, screenSpace: true,
});
```

**After (convenience):**

```typescript
import { hud } from "@arcane/runtime/game";

hud.text("Score: 100", 10, 10);
hud.bar(10, 30, health / maxHealth);
hud.label("PAUSED", 350, 280);
```

All three accept an optional last argument for overrides:

```typescript
import { rgb } from "@arcane/runtime/ui";

hud.text("Critical!", 10, 10, { tint: { r: 1, g: 0.2, b: 0.2, a: 1 }, scale: 3 });
hud.bar(10, 40, mana / maxMana, { fillColor: rgb(50, 100, 255), width: 120 });
hud.label("Game Over", 300, 250, { textColor: rgb(255, 80, 80), scale: 3 });
```

---

## Entity Handles

`createEntity()` binds a world position to an optional physics body and sprite. After `stepPhysics()`, call `syncEntities()` to pull positions from physics, then `drawEntities()` to render.

```typescript
import {
  createEntity, syncEntities, drawEntities, destroyEntity,
  findEntity, findEntities,
} from "@arcane/runtime/game";
import { createPhysicsWorld, stepPhysics } from "@arcane/runtime/physics";
import { rgb } from "@arcane/runtime/ui";

createPhysicsWorld({ gravity: { x: 0, y: 300 } });

const entities: Entity[] = [];

// Ball with physics + colored sprite
const ball = createEntity(400, 100, {
  sprite: { color: rgb(255, 100, 50), w: 24, h: 24, layer: 1 },
  body: { type: "dynamic", shape: { type: "circle", radius: 12 }, material: { restitution: 0.7 } },
  tag: "ball",
});
entities.push(ball);

// Static floor
const floor = createEntity(400, 550, {
  sprite: { color: rgb(100, 100, 100), w: 600, h: 20, layer: 0 },
  body: { type: "static", shape: { type: "aabb", halfW: 300, halfH: 10 } },
  tag: "floor",
});
entities.push(floor);

// In game loop:
game.onFrame((ctx) => {
  stepPhysics(ctx.dt);
  syncEntities(entities);
  drawEntities(entities);

  // Find by tag
  const b = findEntity(entities, "ball");
  if (b) hud.text(`Ball Y: ${b.y | 0}`, 10, 10);
});
```

Use `destroyEntity(entity)` to remove the physics body and mark the entity inactive (skipped by sync and draw). Use `findEntities(entities, "coin")` to find all active entities with a given tag.

---

## Collision Events

`createCollisionRegistry()` provides an event-driven collision system on top of the physics engine. Register callbacks by body or by body pair, then call `processCollisions()` each frame.

```typescript
import {
  createCollisionRegistry, onBodyCollision, onCollision,
  processCollisions, removeBodyCollisions,
} from "@arcane/runtime/game";
import { stepPhysics } from "@arcane/runtime/physics";

const collisions = createCollisionRegistry();

// Fire callback whenever the player body hits anything
onBodyCollision(collisions, player.bodyId!, (contact) => {
  const other = contact.bodyA === player.bodyId ? contact.bodyB : contact.bodyA;
  console.log("Player hit body", other);
});

// Fire callback only when two specific bodies collide
onCollision(collisions, bullet.bodyId!, enemy.bodyId!, (contact) => {
  destroyEntity(bullet);
  enemyHP -= 10;
});

// In game loop:
game.onFrame((ctx) => {
  stepPhysics(ctx.dt);
  processCollisions(collisions);  // fires all matching callbacks
});

// When removing a body, clean up its callbacks:
removeBodyCollisions(collisions, bullet.bodyId!);
destroyEntity(bullet);
```

---

## Widget Auto-Input

`captureInput()` snapshots mouse/keyboard state once per frame. The `autoUpdate*` functions pass that snapshot to widgets, eliminating the repetitive `(mouseX, mouseY, mouseDown, enterPressed)` arguments.

**Before (verbose):**

```typescript
import { createButton, updateButton, drawButton } from "@arcane/runtime/ui";
import { createSlider, updateSlider, drawSlider } from "@arcane/runtime/ui";
import { getMousePosition, isMouseButtonDown, isKeyPressed } from "@arcane/runtime/rendering";

// Every frame -- manually gather and pass input to each widget:
const mouse = getMousePosition();
const mx = mouse.x, my = mouse.y;
const mouseDown = isMouseButtonDown(0);
const enter = isKeyPressed("Enter");
const left = isKeyPressed("ArrowLeft");
const right = isKeyPressed("ArrowRight");

updateButton(btn, mx, my, mouseDown, enter);
drawButton(btn);
updateSlider(volume, mx, my, mouseDown, left, right);
drawSlider(volume);
```

**After (convenience):**

```typescript
import { createButton, drawButton } from "@arcane/runtime/ui";
import { createSlider, drawSlider } from "@arcane/runtime/ui";
import { captureInput, autoUpdateButton, autoUpdateSlider } from "@arcane/runtime/game";

// Every frame -- capture once, pass to all widgets:
const input = captureInput();

autoUpdateButton(btn, input);
drawButton(btn);
autoUpdateSlider(volume, input);
drawSlider(volume);
```

Also available: `autoUpdateCheckbox(cb, input)` and `autoUpdateFocus(fm, input)`. The `FrameInput` type contains `mouseX`, `mouseY`, `mouseDown`, `enterPressed`, `tabPressed`, `shiftDown`, and all four arrow key pressed states.

---

## Animation State Machine

Declarative state-based animation with crossfade blending and condition-driven transitions.

```typescript
import { createAnimation, playAnimation } from "@arcane/runtime/rendering";
import { createAnimationFSM, updateFSM, drawFSMSprite } from "@arcane/runtime/rendering";

const idle = createAnimation(spriteSheet, 32, 32, 4, 6);   // 4 frames @ 6 fps
const run  = createAnimation(spriteSheet, 32, 32, 6, 12);
const jump = createAnimation(spriteSheet, 32, 32, 2, 8);

const fsm = createAnimationFSM({
  initialState: "idle",
  defaultBlendDuration: 0.1,           // crossfade between states
  states: {
    idle: { animationId: idle, loop: true },
    run:  { animationId: run,  loop: true, speed: 1.5 },
    jump: { animationId: jump, loop: false },
  },
  transitions: [
    { from: "idle", to: "run",  condition: { type: "threshold", param: "speed", value: 0.1, compare: "greaterThan" } },
    { from: "run",  to: "idle", condition: { type: "threshold", param: "speed", value: 0.1, compare: "lessThan" } },
    { from: "idle", to: "jump", condition: { type: "trigger",   param: "jump" } },
    { from: "run",  to: "jump", condition: { type: "trigger",   param: "jump" } },
    { from: "jump", to: "idle", condition: { type: "animationFinished" } },
  ],
});

// In onFrame:
let state = updateFSM(fsm, dt, { speed: Math.abs(vx), jump: justJumped });
drawFSMSprite(state, x, y, 32, 32, { layer: 1, flipX: facingLeft });
```

## Layered Tilemaps

Multiple z-ordered layers sharing one tile atlas. Supports per-layer visibility and opacity.

```typescript
import {
  createLayeredTilemap, setLayerTile, drawLayeredTilemap,
  setLayerVisible, setLayerOpacity, fillLayerTiles,
} from "@arcane/runtime/rendering";

const map = createLayeredTilemap(
  { textureId: atlas, width: 40, height: 30, tileSize: 16, atlasColumns: 16, atlasRows: 16 },
  [
    ["ground",    { zOrder: 0 }],
    ["walls",     { zOrder: 1 }],
    ["decoration",{ zOrder: 2, opacity: 0.8 }],
  ],
);

// Fill a region, then place individual tiles
fillLayerTiles(map, "ground", 0, 0, 39, 29, 1);  // grass everywhere
setLayerTile(map, "walls", 5, 3, 48);             // wall at (5,3)
setLayerVisible(map, "decoration", false);         // toggle layer off

// In onFrame (pass camera position for culling):
const cam = getCamera();
drawLayeredTilemap(map, 0, 0, 0, cam.x, cam.y);
```

## Auto-Tiling

Automatically select tile variants based on neighbors. 4-bit mode uses 16 tiles (cardinal only).

```typescript
import {
  createAutotileMapping4, createAutotileRule, applyAutotile,
} from "@arcane/runtime/rendering";

// 16 tile IDs ordered by bitmask: isolated, N, E, N+E, S, N+S, E+S, ...
const wallTiles = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
const mapping = createAutotileMapping4(wallTiles);
const rule = createAutotileRule([48], 4, mapping, 0);  // tile 48 = "wall member"

// Apply to a region (reads getTile, writes setTile)
applyAutotile(
  map.width, map.height,
  (gx, gy) => getLayerTile(map, "walls", gx, gy),
  (gx, gy, id) => setLayerTile(map, "walls", gx, gy, id),
  rule,
);
```

## Animated Tiles

Register tile IDs that cycle through frames automatically (water, torches, conveyor belts).

```typescript
import {
  registerAnimatedTile, updateAnimatedTiles, drawLayeredTilemap,
} from "@arcane/runtime/rendering";

// Tile 64 cycles through frames [64, 65, 66, 67] at 0.25s each
registerAnimatedTile(64, [64, 65, 66, 67], 0.25);
registerAnimatedTile(80, [80, 81, 82], 0.15);  // faster animation

// In onFrame (before drawing):
updateAnimatedTiles(dt);
drawLayeredTilemap(map, 0, 0, 0, cam.x, cam.y);
```

## Tile Properties

Attach custom metadata to tile IDs for gameplay queries (collision, damage zones, etc.).

```typescript
import { defineTileProperties, getTilePropertyAt } from "@arcane/runtime/rendering";

defineTileProperties(1,  { walkable: true,  name: "grass" });
defineTileProperties(48, { walkable: false, name: "wall" });
defineTileProperties(64, { walkable: true,  damage: 5, name: "lava" });

// Query during gameplay
const walkable = getTilePropertyAt(map, "ground", playerTileX, playerTileY, "walkable");
const dmg = getTilePropertyAt(map, "ground", playerTileX, playerTileY, "damage") as number ?? 0;
```

## UI Buttons

Immediate-mode buttons with hover/press visual states. Call update then draw each frame.

```typescript
import { createButton, updateButton, drawButton } from "@arcane/runtime/ui";
import { getMousePosition, isKeyPressed } from "@arcane/runtime/rendering";

const btn = createButton(100, 200, 120, 40, "Start Game", {
  normalColor: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
  hoverColor:  { r: 0.3, g: 0.5, b: 0.9, a: 1 },
  textColor:   { r: 1, g: 1, b: 1, a: 1 },
});

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateButton(btn, mx, my, leftDown, isKeyPressed("Enter"));
drawButton(btn);
if (btn.clicked) { /* handle click */ }
```

## UI Sliders

Draggable sliders with label and value display. Arrow keys adjust when focused.

```typescript
import { createSlider, updateSlider, drawSlider } from "@arcane/runtime/ui";

const volume = createSlider(100, 150, 200, 0, 100, 75, "Volume", {
  showValue: true, decimals: 0,
  fillColor: { r: 0.2, g: 0.7, b: 0.3, a: 1 },
});

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateSlider(volume, mx, my, leftDown, isKeyPressed("ArrowLeft"), isKeyPressed("ArrowRight"));
drawSlider(volume);
if (volume.changed) { setMusicVolume(volume.value / 100); }
```

## UI Toggles

Checkboxes and radio groups for boolean/multiple-choice options.

```typescript
import { createCheckbox, updateCheckbox, drawCheckbox } from "@arcane/runtime/ui";
import { createRadioGroup, updateRadioGroup, drawRadioGroup } from "@arcane/runtime/ui";

const muteBox = createCheckbox(100, 100, "Mute Audio", false);
const diffRadio = createRadioGroup(100, 140, ["Easy", "Normal", "Hard"], 1);

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateCheckbox(muteBox, mx, my, leftDown);
drawCheckbox(muteBox);
if (muteBox.toggled) { toggleMute(muteBox.checked); }

updateRadioGroup(diffRadio, mx, my, leftDown,
  isKeyPressed("ArrowUp"), isKeyPressed("ArrowDown"));
drawRadioGroup(diffRadio);
if (diffRadio.changed) { setDifficulty(diffRadio.selectedIndex); }
```

## UI Text Input

Click-to-focus text field with cursor, placeholder, and key event handling.

```typescript
import { createTextInput, updateTextInput, drawTextInput } from "@arcane/runtime/ui";

const nameInput = createTextInput(100, 200, 200, "Enter name...", {
  focusedBorderColor: { r: 0.3, g: 0.6, b: 1, a: 1 },
});
nameInput.maxLength = 20;

// In onFrame — pass key events from your input handling:
const keys: { key: string; pressed: boolean }[] = [];
for (const k of ["a","b","c","Backspace","Delete","ArrowLeft","ArrowRight"]) {
  if (isKeyPressed(k)) keys.push({ key: k, pressed: true });
}
const { x: mx, y: my, leftDown } = getMousePosition();
updateTextInput(nameInput, mx, my, leftDown, keys);
drawTextInput(nameInput, totalTime);  // totalTime for cursor blink
if (nameInput.changed) { playerName = nameInput.text; }
```

## UI Layout

Compute widget positions with stacks, rows, and viewport anchoring.

```typescript
import { verticalStack, horizontalRow, anchorPosition } from "@arcane/runtime/ui";
import { getViewportSize } from "@arcane/runtime/rendering";

const { width: VPW, height: VPH } = getViewportSize();

// Center a menu of 4 buttons
const menuPos = anchorPosition("center", VPW, VPH, 160, 200, 0);
const slots = verticalStack(menuPos.x, menuPos.y, 40, 4, 8);
// slots[0] = {x, y} for first button, slots[1] for second, etc.

// Bottom-right row of 3 action buttons
const barPos = anchorPosition("bottom-right", VPW, VPH, 3 * 50 + 2 * 4, 50, 10);
const actionSlots = horizontalRow(barPos.x, barPos.y, 50, 3, 4);
```

## Focus / Keyboard Navigation

Tab through UI widgets without a mouse. Combine with any widget.

```typescript
import { createFocusManager, registerFocusable, updateFocus } from "@arcane/runtime/ui";

const fm = createFocusManager();
registerFocusable(fm, btn);
registerFocusable(fm, slider);
registerFocusable(fm, checkbox);

// In onFrame:
updateFocus(fm, isKeyPressed("Tab"), isKeyDown("ShiftLeft"));
// Widgets with .focused = true respond to Enter/arrows
```

## Camera Smooth Follow

Smooth camera tracking with bounds clamping and deadzone.

```typescript
import {
  followTargetSmooth, setCameraBounds, setCameraDeadzone, getCamera,
} from "@arcane/runtime/rendering";

// Set world limits (camera won't show anything outside)
setCameraBounds({ minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight });

// Deadzone: player can move 60×40px around center before camera moves
setCameraDeadzone({ width: 60, height: 40 });

// In onFrame:
followTargetSmooth(player.x, player.y, 1.0, 0.08);  // smoothness: lower = snappier
```

## Parallax Scrolling

Multi-layer depth scrolling. Factor 0 = fixed background, 1 = foreground.

```typescript
import { drawParallaxSprite, getCamera, getViewportSize } from "@arcane/runtime/rendering";

const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();

// Sky (fixed, never scrolls)
drawParallaxSprite({ textureId: sky, x: cam.x - VPW/2, y: cam.y - VPH/2,
  w: VPW, h: VPH, layer: 0, parallaxFactor: 0 });

// Distant mountains (slow scroll)
drawParallaxSprite({ textureId: mountains, x: 0, y: 200,
  w: 1600, h: 200, layer: 1, parallaxFactor: 0.3 });

// Trees (medium scroll)
drawParallaxSprite({ textureId: trees, x: 0, y: 300,
  w: 1600, h: 150, layer: 2, parallaxFactor: 0.6 });

// Ground tiles scroll at factor 1.0 (same as regular drawSprite)
```

## Pathfinding

A* on a grid with walkability checks. Supports diagonal movement and cost functions.

```typescript
import { findPath } from "@arcane/runtime/pathfinding";

const grid = {
  width: 40,
  height: 30,
  isWalkable: (x: number, y: number) => !isWall(x, y),
  cost: (x: number, y: number) => isSwamp(x, y) ? 3 : 1,
};

const result = findPath(grid, { x: 0, y: 0 }, { x: 35, y: 25 }, {
  diagonal: true,
  heuristic: "chebyshev",  // best for 8-directional movement
});

if (result.found) {
  for (const step of result.path) {
    // step.x, step.y — grid coordinates along the path
  }
}
```

## Tween Chains

Compose sequential, parallel, and staggered tween animations.

```typescript
import { sequence, parallel, stagger, updateTweens, easeOutBack } from "@arcane/runtime/tweening";

const pos = { x: 0, y: 0, scale: 0 };

// Run tweens one after another
sequence([
  { target: pos, props: { y: -50 },  duration: 0.3, options: { easing: easeOutBack } },
  { target: pos, props: { y: 0 },    duration: 0.2 },
  { target: pos, props: { scale: 1 }, duration: 0.15 },
]);

// Run tweens simultaneously
parallel([
  { target: pos, props: { x: 100 }, duration: 0.5 },
  { target: pos, props: { y: 200 }, duration: 0.5 },
]);

// Stagger: each starts 0.1s after the previous
const items = [obj1, obj2, obj3, obj4];
stagger(
  items.map(item => ({ target: item, props: { opacity: 1 }, duration: 0.3 })),
  0.1,
);

// In onFrame: updateTweens(dt) drives all active tweens
```

## Camera Shake + Screen Flash

Game-feel effects built on the tween system. Read offsets/flash state each frame.

```typescript
import {
  shakeCamera, getCameraShakeOffset,
  flashScreen, getScreenFlash,
} from "@arcane/runtime/tweening";
import { setCamera, drawRect, getViewportSize } from "@arcane/runtime/rendering";

// Trigger on hit
shakeCamera(8, 0.3);                    // 8px intensity, 0.3s duration
flashScreen(1, 0, 0, 0.2, 0.6);        // red flash, 0.2s, 60% opacity

// In onFrame:
const shake = getCameraShakeOffset();
setCamera(camX + shake.x, camY + shake.y);

const flash = getScreenFlash();
if (flash) {
  const { width: VPW, height: VPH } = getViewportSize();
  drawRect(0, 0, VPW, VPH, {
    color: { r: flash.r, g: flash.g, b: flash.b, a: flash.opacity },
    screenSpace: true, layer: 200,
  });
}
```

## Lighting

Ambient darkness with point light sources. Lights must be re-added each frame.

```typescript
import { setAmbientLight, addPointLight, clearLights } from "@arcane/runtime/rendering";

// Dark dungeon: low ambient light
setAmbientLight(0.15, 0.15, 0.2);

// In onFrame:
// Player torch (warm light, follows player)
addPointLight(player.x + 16, player.y + 16, 120, 1.0, 0.8, 0.5, 1.2);

// Campfire (flickering — vary radius/intensity slightly)
const flicker = 1.0 + Math.sin(totalTime * 8) * 0.1;
addPointLight(fireX, fireY, 80 * flicker, 1.0, 0.6, 0.2, flicker);

// Spell effect (blue, temporary)
if (spellActive) {
  addPointLight(spellX, spellY, 200, 0.3, 0.5, 1.0, 2.0);
}
```

## Animated Zoom

Smooth zoom transitions with optional focus point.

```typescript
import { zoomTo, zoomToPoint } from "@arcane/runtime/rendering";
import { easeInOutCubic } from "@arcane/runtime/tweening";

// Zoom to 2x over 0.5 seconds
zoomTo(2.0, 0.5, easeInOutCubic);

// Zoom to 3x centered on a specific world position
zoomToPoint(3.0, bossX, bossY, 1.0, easeInOutCubic);
```

## MSDF Text (Crisp Scalable Text)

Resolution-independent text that stays sharp at any zoom level. Supports outlines, shadows, and color.

```typescript
import { getDefaultMSDFFont, loadMSDFFont, drawText, measureText } from "@arcane/runtime/rendering";

const font = getDefaultMSDFFont(); // built-in monospace font

// Basic usage — crisp at any camera zoom
drawText("Hello World", 100, 100, { msdfFont: font, scale: 2.0, layer: 10 });

// Colored text with outline
drawText("GAME OVER", 200, 150, {
  msdfFont: font, scale: 4.0, layer: 10,
  color: { r: 1, g: 0.2, b: 0.2, a: 1 },
  outlineWidth: 0.12,
  outlineColor: { r: 0, g: 0, b: 0, a: 1 },
});

// Drop shadow
drawText("Score: 1000", 10, 10, {
  msdfFont: font, scale: 1.5, layer: 100, screenSpace: true,
  shadowOffsetX: 1, shadowOffsetY: 1,
  shadowColor: { r: 0, g: 0, b: 0, a: 0.6 },
});

// Measure text width for centering
const { width: VPW } = getViewportSize();
const textW = measureText("Centered", font, 2.0);
drawText("Centered", (VPW - textW) / 2, 50, {
  msdfFont: font, scale: 2.0, screenSpace: true, layer: 100,
});

// Load external MSDF font (atlas PNG + metrics JSON)
const customFont = loadMSDFFont("assets/roboto-msdf.png", "assets/roboto-msdf.json");
drawText("Custom font", 100, 200, { msdfFont: customFont, scale: 1.0, layer: 10 });
```

**When to use MSDF vs bitmap text:** Use MSDF (`msdfFont`) when text needs to look crisp at varying zoom levels or large sizes. Use bitmap (`font` from `getDefaultFont()`) for small fixed-size text like debug overlays.

## Global Illumination

2D global illumination via Radiance Cascades. Emissive sprites cast colored light; occluders block it.

```typescript
import {
  setGIEnabled, setGIQuality, setAmbientLight,
  addPointLight, addDirectionalLight, addSpotLight, clearLights,
  drawSprite,
} from "@arcane/runtime/rendering";

// Enable GI (call once at init, before onFrame)
setGIEnabled(true);
setGIQuality("medium"); // "low" (fast), "medium" (balanced), "high" (quality)

// Dark ambient for dungeon atmosphere
setAmbientLight(0.08, 0.08, 0.12);

// In onFrame — lights are per-frame, clear and re-add:
// Point light: x, y, radius, r, g, b, intensity
addPointLight(player.x + 16, player.y + 16, 120, 1.0, 0.8, 0.5, 1.5);

// Directional light (sunlight/moonlight): angle (radians), r, g, b, intensity
addDirectionalLight(Math.PI * 0.75, 0.3, 0.3, 0.5, 0.4); // cool moonlight from upper-right

// Spot light: x, y, radius, angle, arc, r, g, b, intensity
addSpotLight(guardX, guardY, 200, guardAngle, Math.PI / 4, 1, 1, 0.8, 2.0);

// Emissive sprites emit light into the GI system
drawSprite({ textureId: TEX_LAVA, x: 100, y: 200, w: 32, h: 8, emissive: true, layer: 1 });
drawSprite({ textureId: TEX_CRYSTAL, x: 300, y: 150, w: 16, h: 16, emissive: true, layer: 1 });

// Occluder sprites block light (walls, pillars)
drawSprite({ textureId: TEX_PILLAR, x: 200, y: 180, w: 16, h: 48, occluder: true, layer: 1 });
```

**Day/night cycle** — animate ambient light and directional light over time:
```typescript
const dayProgress = (totalTime % 60) / 60; // 0-1 over 60 seconds
const sunAngle = dayProgress * Math.PI * 2;
const brightness = Math.max(0, Math.sin(dayProgress * Math.PI)); // peaks at noon
setAmbientLight(0.1 + 0.4 * brightness, 0.1 + 0.35 * brightness, 0.15 + 0.25 * brightness);
addDirectionalLight(sunAngle, 1.0, 0.9, 0.7, brightness * 0.6);
```

## Audio

### Spatial Audio Scene

```typescript
import { loadSound, playSoundAt, setListenerPosition, updateSpatialAudio } from "@arcane/runtime/rendering";
import { onFrame, getDeltaTime, isKeyDown } from "@arcane/runtime/rendering";

const ambientSound = loadSound("torch.ogg");
// Place looping sound sources in the world
const torch1 = playSoundAt(ambientSound, { x: 200, y: 100, loop: true, volume: 0.8 });
const torch2 = playSoundAt(ambientSound, { x: 600, y: 300, loop: true, volume: 0.8 });

let playerX = 400, playerY = 300;

onFrame(() => {
  const dt = getDeltaTime();
  if (isKeyDown("w")) playerY -= 150 * dt;
  if (isKeyDown("s")) playerY += 150 * dt;
  if (isKeyDown("a")) playerX -= 150 * dt;
  if (isKeyDown("d")) playerX += 150 * dt;

  setListenerPosition(playerX, playerY);
  updateSpatialAudio();
});
```

### Music Crossfade Between Zones

```typescript
import { crossfadeMusic } from "@arcane/runtime/rendering";

let currentZone = "forest";

function onZoneChange(newZone: string) {
  if (newZone === currentZone) return;
  currentZone = newZone;
  // Crossfade over 2 seconds at 80% volume
  crossfadeMusic(`${newZone}-theme.ogg`, 2000, 0.8);
}
```

### Audio Mixer with Bus Controls

```typescript
import { setBusVolume, getBusVolume, playSound, loadSound } from "@arcane/runtime/rendering";

// Set per-category volumes (final = base × bus × master)
setBusVolume("sfx", 0.9);
setBusVolume("music", 0.6);
setBusVolume("ambient", 0.3);
setBusVolume("voice", 1.0);

// Play sounds on specific buses
const explosion = loadSound("boom.ogg");
playSound(explosion, { bus: "sfx", pitchVariation: 0.15 });
```

## Wave Function Collapse (Procedural Generation)

Generate tile-based levels with adjacency and structural constraints.

```typescript
import { generateWFC } from "@arcane/runtime/procgen";
import { reachability, border, minCount, maxCount, exactCount } from "@arcane/runtime/procgen";

const FLOOR = "floor", WALL = "wall", DOOR = "door", CHEST = "chest";

const result = generateWFC({
  width: 30,
  height: 20,
  tiles: [FLOOR, WALL, DOOR, CHEST],
  adjacency: [
    { tile: FLOOR, neighbors: { north: [FLOOR, DOOR, WALL, CHEST], east: [FLOOR, DOOR, WALL, CHEST], south: [FLOOR, DOOR, WALL, CHEST], west: [FLOOR, DOOR, WALL, CHEST] } },
    { tile: WALL,  neighbors: { north: [WALL, FLOOR, DOOR], east: [WALL, FLOOR, DOOR], south: [WALL, FLOOR, DOOR], west: [WALL, FLOOR, DOOR] } },
    { tile: DOOR,  neighbors: { north: [FLOOR], east: [FLOOR], south: [FLOOR], west: [FLOOR] } },
    { tile: CHEST, neighbors: { north: [FLOOR, WALL], east: [FLOOR, WALL], south: [FLOOR, WALL], west: [FLOOR, WALL] } },
  ],
  constraints: [
    border(WALL),                      // edges are always walls
    reachability(FLOOR, DOOR, CHEST),  // all walkable tiles connected
    minCount(DOOR, 2),                // at least 2 doors
    maxCount(CHEST, 5),               // at most 5 chests
  ],
  seed: 42,
  maxAttempts: 100,
});

if (result.success) {
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const tile = result.grid[y][x];
      // Map tile names to tilemap indices and setTile(...)
    }
  }
}
```

**Validate generated levels** — run gameplay-specific checks after generation:
```typescript
import { validateLevel, generateAndTest } from "@arcane/runtime/procgen";

// validateLevel runs custom predicates on the generated grid
const valid = validateLevel(result, [
  (grid) => grid.flat().filter(t => t === DOOR).length >= 2,
  (grid) => { /* check path from entrance to exit exists */ return true; },
]);

// generateAndTest: keep generating until validation passes
const goodLevel = generateAndTest(wfcOptions, validators, { maxRetries: 50 });
```

## Property-Based Testing

Verify game logic invariants across randomly generated inputs with automatic shrinking.

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { checkProperty, assertProperty, integer, float, array, oneOf, record } from "@arcane/runtime/testing";

describe("combat math", () => {
  it("damage is never negative", () => {
    assertProperty(
      [integer(1, 100), integer(0, 50)],  // attack, defense
      ([attack, defense]) => calculateDamage(attack, defense) >= 0,
    );
  });

  it("healing doesn't exceed max HP", () => {
    assertProperty(
      [integer(1, 100), integer(1, 100), integer(1, 50)],  // current, max, heal
      ([current, max, heal]) => {
        const result = applyHealing(current, max, heal);
        return result >= current && result <= max;
      },
      { iterations: 500 },  // run 500 random cases
    );
  });
});
```

## Screen Transitions

Visual effects for scene changes. Five built-in patterns: fade, wipe, circleIris, diamond, pixelate. At the midpoint of the transition, the actual scene swap happens (hidden behind the overlay).

```typescript
import {
  startScreenTransition, updateScreenTransition,
  drawScreenTransition, isScreenTransitionActive,
} from "@arcane/runtime/rendering";
import { getDeltaTime, onFrame } from "@arcane/runtime/rendering";

let currentScene = "menu";

// Start a circle-iris transition lasting 0.6 seconds
startScreenTransition("circleIris", 0.6, { color: { r: 0, g: 0, b: 0 } }, () => {
  // This runs at the midpoint — swap scene here
  currentScene = "gameplay";
}, () => {
  // This runs when the transition finishes
  console.log("Transition complete");
});

onFrame(() => {
  const dt = getDeltaTime();

  // Update and render your current scene
  if (currentScene === "menu") renderMenu();
  else renderGameplay();

  // Always update + draw the transition overlay (no-op if inactive)
  updateScreenTransition(dt);
  drawScreenTransition();
});
```

All five types: `"fade"`, `"wipe"`, `"circleIris"`, `"diamond"`, `"pixelate"`. The `isScreenTransitionActive()` function returns true while a transition is in progress.

## Nine-Slice Panels

Draw a texture as a scalable UI panel. Corners stay fixed size, edges stretch in one axis, and the center fills the remainder. Useful for dialogue boxes, inventory panels, and buttons.

```typescript
import { drawNineSlice } from "@arcane/runtime/rendering";
import { loadTexture } from "@arcane/runtime/rendering";

const panelTex = loadTexture("panel.png");

// Uniform 16px border on all sides (texture is 64x64)
drawNineSlice(panelTex, 50, 50, 300, 200, {
  border: 16,
  textureWidth: 64,
  textureHeight: 64,
  layer: 10,
});

// Per-edge borders for asymmetric panels
drawNineSlice(panelTex, 400, 50, 200, 150, {
  border: { top: 12, bottom: 16, left: 8, right: 8 },
  textureWidth: 64,
  textureHeight: 64,
  screenSpace: true,
  opacity: 0.9,
});
```

The `border` field accepts either a uniform number or a `{ top, bottom, left, right }` object. Set `textureWidth`/`textureHeight` to your source texture dimensions for correct UV calculation.

## Trail / Ribbon Effects

A ribbon that follows a moving point. Points are added each frame and old ones fade out. Useful for sword swipes, projectile trails, and mouse cursors.

```typescript
import { createTrail, updateTrail, drawTrail, clearTrail } from "@arcane/runtime/rendering";
import { onFrame, getDeltaTime, getMouseWorldPosition } from "@arcane/runtime/rendering";

// Sword swipe: orange trail that fades to transparent
const swordTrail = createTrail({
  maxLength: 20,
  width: 12,
  color: { r: 1, g: 0.6, b: 0.1, a: 1 },
  endColor: { r: 1, g: 0.2, b: 0, a: 0 },
  maxAge: 0.3,
  layer: 5,
  blendMode: "additive",
});

// Projectile trail: white, narrow, longer lifespan
const bulletTrail = createTrail({
  maxLength: 40,
  width: 3,
  color: { r: 1, g: 1, b: 1, a: 0.8 },
  maxAge: 0.5,
  layer: 3,
});

onFrame(() => {
  const dt = getDeltaTime();

  // Feed current position each frame
  updateTrail(swordTrail, swordTipX, swordTipY, dt);
  drawTrail(swordTrail);

  updateTrail(bulletTrail, bullet.x, bullet.y, dt);
  drawTrail(bulletTrail);

  // Clear trail on teleport or scene change
  if (teleported) clearTrail(swordTrail);
});
```

## Impact Juice

One-call combinators that orchestrate camera shake, hitstop (frame freeze), screen flash, and particle burst together. The `consumeHitstopFrame()` pattern lets you freeze gameplay while keeping rendering active.

```typescript
import {
  impact, impactLight, impactHeavy, consumeHitstopFrame,
} from "@arcane/runtime/rendering";
import { onFrame, getDeltaTime } from "@arcane/runtime/rendering";
import { updateTweens } from "@arcane/runtime/tweening";
import { updateParticles } from "@arcane/runtime/particles";

// Full custom impact on enemy hit
impact(enemy.x, enemy.y, {
  shake: { intensity: 8, duration: 0.2 },
  hitstop: 3,                    // freeze gameplay for 3 frames
  flash: { r: 1, g: 1, b: 1, duration: 0.1, opacity: 0.6 },
  particles: { count: 20, color: { r: 1, g: 0.5, b: 0, a: 1 } },
});

// Or use presets:
impactLight(enemy.x, enemy.y);   // small shake + brief flash
impactHeavy(boss.x, boss.y);    // big shake + long flash + particles

// Frame loop with hitstop support:
onFrame(() => {
  const dt = getDeltaTime();

  if (!consumeHitstopFrame()) {
    // Normal gameplay update (skipped during hitstop)
    updateGameplay(dt);
  }

  // These always run, even during hitstop
  updateTweens(dt);
  updateParticles(dt);
  renderGame();
});
```

## Floating Text

Auto-animating text that rises and fades. Used for damage numbers, XP gains, gold pickups, and status messages.

```typescript
import {
  spawnFloatingText, updateFloatingTexts, drawFloatingTexts,
} from "@arcane/runtime/rendering";
import { onFrame, getDeltaTime } from "@arcane/runtime/rendering";

// Red damage number with pop effect
spawnFloatingText(enemy.x, enemy.y - 16, "-25", {
  color: { r: 1, g: 0.2, b: 0.2, a: 1 },
  rise: 40,
  duration: 0.8,
  scale: 1.5,
  pop: true,           // brief scale-up at spawn
});

// Gold pickup — green, drifts right
spawnFloatingText(chest.x, chest.y, "+50 gold", {
  color: { r: 0.2, g: 1, b: 0.3, a: 1 },
  rise: 25,
  duration: 1.0,
  driftX: 20,
});

// Heal — gentle white, slower rise
spawnFloatingText(player.x, player.y - 8, "+10 HP", {
  color: { r: 0.5, g: 1, b: 0.5, a: 1 },
  rise: 20,
  duration: 1.2,
});

// In game loop:
onFrame(() => {
  const dt = getDeltaTime();
  updateFloatingTexts(dt);
  drawFloatingTexts();
});
```

## Typewriter Dialogue

Progressive character-by-character text reveal. Supports configurable speed, punctuation pauses, and skip-ahead.

```typescript
import {
  createTypewriter, updateTypewriter, drawTypewriter,
  skipTypewriter, resetTypewriter, isTypewriterComplete,
} from "@arcane/runtime/rendering";
import { onFrame, getDeltaTime, isKeyPressed } from "@arcane/runtime/rendering";
import { drawNineSlice } from "@arcane/runtime/rendering";

const dialogues = [
  "The dragon approaches... Are you ready?",
  "Take this sword. It belonged to your father.",
];
let dialogueIndex = 0;

const tw = createTypewriter(dialogues[0], {
  speed: 30,                       // characters per second
  punctuationPause: 0.15,         // extra pause on . , ! ?
  onComplete: () => {
    // Dialogue line finished revealing
  },
});

onFrame(() => {
  const dt = getDeltaTime();

  // Skip or advance on key press
  if (isKeyPressed("Space") || isKeyPressed("Enter")) {
    if (isTypewriterComplete(tw)) {
      // Advance to next line
      dialogueIndex++;
      if (dialogueIndex < dialogues.length) {
        resetTypewriter(tw, dialogues[dialogueIndex]);
      }
    } else {
      // Skip to end of current line
      skipTypewriter(tw);
    }
  }

  updateTypewriter(tw, dt);

  // Draw dialogue box background (nine-slice panel) + text
  drawNineSlice(panelTex, 50, 400, 700, 100, {
    border: 16, textureWidth: 64, textureHeight: 64,
    screenSpace: true, layer: 99,
  });
  drawTypewriter(tw, 70, 420, {
    scale: 1,
    tint: { r: 1, g: 1, b: 1, a: 1 },
    layer: 100,
    screenSpace: true,
  });
});
```

## Isometric Grids

Diamond-projection coordinate transforms for isometric 2.5D games. Convert between grid, world, and screen space.

```typescript
import {
  isoToWorld, worldToGrid, screenToIso,
  isoDepthLayer, isoMapBounds, IsoConfig,
  createIsoTilemap, setIsoTile, drawIsoTilemap,
} from "@arcane/runtime/rendering";
import { getCamera, getViewportSize, setCameraBounds } from "@arcane/runtime/rendering";

const ISO: IsoConfig = { tileW: 64, tileH: 32 };

// Convert grid cell to world pixel position
const worldPos = isoToWorld(3, 5, ISO);
// worldPos = { x: (3-5)*32, y: (3+5)*16 } = { x: -64, y: 128 }

// Click handling: screen coords -> grid cell
const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();
const cell = screenToIso(mouseScreenX, mouseScreenY, cam, ISO, VPW, VPH);
// cell = { x: gridX, y: gridY }

// Depth sorting: use isoDepthLayer(gy) as the sprite layer
const layer = isoDepthLayer(cell.y); // gy * 10, leaves room for sub-layers

// Camera bounds for an isometric map
const bounds = isoMapBounds(20, 20, ISO);
setCameraBounds(bounds);

// Iso tilemap: create, populate, and draw
const map = createIsoTilemap({
  width: 20, height: 20,
  config: ISO,
  textureId: tileAtlas,
  atlasColumns: 8, atlasRows: 8,
  tileSize: 64,
});
setIsoTile(map, 3, 5, 1);  // place tile ID 1 at grid (3, 5)
drawIsoTilemap(map, cam.x, cam.y, VPW, VPH);
```

## Hex Grids

Cube-coordinate hex system (q + r + s = 0). Supports both pointy-top and flat-top orientations with neighbors, distance, pathfinding, and rendering.

```typescript
import {
  hex, hexNeighbors, hexDistance, hexToWorld, worldToHex,
  screenToHex, hexRange, HexConfig,
} from "@arcane/runtime/rendering";
import { getCamera, getViewportSize } from "@arcane/runtime/rendering";

const HEX: HexConfig = { hexSize: 24, orientation: "pointy" };

// Create a hex coordinate (s is computed automatically)
const origin = hex(0, 0);    // { q: 0, r: 0, s: 0 }
const target = hex(3, -1);   // { q: 3, r: -1, s: -2 }

// Get all 6 neighbors
const neighbors = hexNeighbors(0, 0);  // array of 6 HexCoord

// Distance (minimum hex steps)
const dist = hexDistance(origin, target);  // 3

// Convert hex to world pixels for drawing
const worldPos = hexToWorld(target, HEX);

// Click handling: screen -> hex
const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();
const clicked = screenToHex(mouseX, mouseY, cam, HEX, VPW, VPH);

// Get all hexes within 3 steps of origin
const area = hexRange(origin, 3);  // array of HexCoord
```

**Hex pathfinding** — A* and flood-fill reachability on hex grids:

```typescript
import { findHexPath, hexReachable, reachableToArray } from "@arcane/runtime/pathfinding";
import { hex } from "@arcane/runtime/rendering";

const grid = {
  isWalkable: (q: number, r: number) => getTerrain(q, r) !== "water",
  cost: (q: number, r: number) => getTerrain(q, r) === "forest" ? 2 : 1,
};

// Find shortest path
const result = findHexPath(grid, hex(0, 0), hex(5, -3));
if (result.found) {
  for (const step of result.path) {
    // step.q, step.r — hex coordinates along the path
  }
}

// Movement range: all cells reachable within 4 movement points
const reachable = hexReachable(grid, hex(0, 0), 4);
const cells = reachableToArray(reachable);
// Highlight reachable cells on the map
```

## Gamepad Input

Read gamepad buttons and analog sticks. Uses Xbox layout as the canonical button/axis names.

```typescript
import {
  isGamepadButtonDown, isGamepadButtonPressed,
  getGamepadAxis, getGamepadCount,
} from "@arcane/runtime/rendering";

// Check if a gamepad is connected
if (getGamepadCount() > 0) {
  // Face buttons
  if (isGamepadButtonPressed("A")) jump();
  if (isGamepadButtonDown("X")) attack();

  // D-Pad
  if (isGamepadButtonDown("DPadLeft")) moveLeft();

  // Analog sticks: -1 to 1
  const lx = getGamepadAxis("LeftStickX");
  const ly = getGamepadAxis("LeftStickY");

  // Apply deadzone to avoid drift
  const DEADZONE = 0.15;
  const moveX = Math.abs(lx) > DEADZONE ? lx : 0;
  const moveY = Math.abs(ly) > DEADZONE ? ly : 0;

  player.x += moveX * speed * dt;
  player.y += moveY * speed * dt;

  // Triggers: 0 to 1
  const rightTrigger = getGamepadAxis("RightTrigger");
  if (rightTrigger > 0.5) fireBow();
}
```

Button names: `"A"`, `"B"`, `"X"`, `"Y"`, `"LeftBumper"`, `"RightBumper"`, `"LeftTrigger"`, `"RightTrigger"`, `"DPadUp"`, `"DPadDown"`, `"DPadLeft"`, `"DPadRight"`, `"Select"`, `"Start"`, `"LeftStick"`, `"RightStick"`, `"Guide"`.

Axis names: `"LeftStickX"`, `"LeftStickY"`, `"RightStickX"`, `"RightStickY"`, `"LeftTrigger"`, `"RightTrigger"`.

## Touch Input

Multi-touch support for mobile and tablet devices. Touch positions are available in both screen and world coordinates.

```typescript
import {
  getTouchCount, isTouchActive, getTouchPosition, getTouchWorldPosition,
} from "@arcane/runtime/rendering";

// Check if any touch is active
if (isTouchActive()) {
  // Primary touch (index 0) in screen pixels
  const screenPos = getTouchPosition(0);

  // Primary touch in world coordinates (camera-adjusted)
  const worldPos = getTouchWorldPosition(0);

  // Tap-to-move pattern
  player.targetX = worldPos.x;
  player.targetY = worldPos.y;
}

// Multi-touch: check touch count
const touchCount = getTouchCount();
if (touchCount >= 2) {
  const pos1 = getTouchPosition(0);
  const pos2 = getTouchPosition(1);
  // Use for pinch-to-zoom, two-finger gestures, etc.
}
```

## Input Action Mapping

Map named actions to physical inputs (keyboard, gamepad, mouse, touch). Abstracts away the specific input device so your game logic works with any controller.

```typescript
import {
  createInputMap, isActionDown, isActionPressed,
  getActionValue, setActionBindings,
} from "@arcane/runtime/input";

// Define action bindings — strings are shorthand for common inputs
const map = createInputMap({
  jump: ["Space", "GamepadA"],
  attack: ["x", "GamepadX", "MouseLeft"],
  moveRight: [
    { type: "key", key: "d" },
    { type: "key", key: "ArrowRight" },
    { type: "gamepadAxis", axis: "LeftStickX", direction: 1 },
    "GamepadDPadRight",
  ],
  moveLeft: [
    { type: "key", key: "a" },
    { type: "key", key: "ArrowLeft" },
    { type: "gamepadAxis", axis: "LeftStickX", direction: -1 },
    "GamepadDPadLeft",
  ],
});

// In frame loop — works with keyboard OR gamepad automatically:
if (isActionPressed("jump", map)) {
  player.vy = -300;
}
if (isActionDown("attack", map)) {
  swingSword();
}

// Analog value: 0 or 1 for digital inputs, -1 to 1 for analog sticks
const moveX = getActionValue("moveRight", map) - getActionValue("moveLeft", map);
player.x += moveX * speed * dt;

// Remapping at runtime (e.g., from a settings menu)
setActionBindings(map, "jump", ["w", "GamepadB"]);
```

Shorthand strings: keyboard keys use their name directly (`"Space"`, `"a"`, `"ArrowUp"`). Gamepad buttons use `"GamepadA"`, `"GamepadB"`, `"GamepadX"`, `"GamepadY"`, `"GamepadLB"`, `"GamepadRB"`, `"GamepadDPadUp"`, etc. Mouse buttons use `"MouseLeft"`, `"MouseRight"`, `"MouseMiddle"`.

## Visual Testing (Draw Call Capture)

Test rendering output without a GPU. Captures draw call intent as structured data — works in headless mode.

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import {
  enableDrawCallCapture, disableDrawCallCapture,
  getDrawCalls, clearDrawCalls, findDrawCalls,
  assertSpriteDrawn, assertTextDrawn, assertDrawCallCount,
  assertNothingDrawnAt, assertLayerHasDrawCalls, assertScreenSpaceDrawn,
  getDrawCallSummary,
} from "@arcane/runtime/testing";
import { drawSprite, drawText } from "@arcane/runtime/rendering";
import { drawRect, drawBar } from "@arcane/runtime/ui";

// Enable capture before running game frame code
enableDrawCallCapture();

// Simulate a frame — these work even in headless mode
drawSprite({ textureId: 1, x: 100, y: 200, w: 32, h: 32, layer: 1 });
drawSprite({ textureId: 2, x: 150, y: 200, w: 32, h: 32, layer: 1 });
drawText("HP: 10", 10, 10, { screenSpace: true });
drawBar(10, 30, 200, 20, 0.75, { screenSpace: true });

// Inspect what was drawn
const calls = getDrawCalls();        // all draw calls this frame
const summary = getDrawCallSummary(); // { total: 4, sprite: 2, text: 1, bar: 1 }

// Find specific draw calls
const sprites = findDrawCalls({ type: "sprite" });
const hudText = findDrawCalls({ type: "text", screenSpace: true });
const atPos = findDrawCalls({ x: 100, y: 200 });

// Assertions — throw with descriptive errors on failure
assertSpriteDrawn({ textureId: 1 });                // at least one sprite with this texture
assertTextDrawn("HP: 10");                           // text containing substring
assertDrawCallCount("sprite", 2);                    // exact count
assertNothingDrawnAt(500, 500);                      // no sprites overlap this point
assertLayerHasDrawCalls(1);                          // layer has content
assertScreenSpaceDrawn("text");                      // HUD text exists

// Between frames: clear and redraw
clearDrawCalls();

// When done testing
disableDrawCallCapture();
```

**In tests:**

```typescript
describe("HUD rendering", () => {
  it("shows health bar when player is damaged", () => {
    enableDrawCallCapture();

    const state = { hp: 5, maxHp: 10 };
    renderHUD(state);  // your game's HUD function

    assertTextDrawn("HP");
    const bars = findDrawCalls({ type: "bar" });
    assert.equal(bars.length, 1);
    if (bars[0].type === "bar") {
      assert.equal(bars[0].fillRatio, 0.5);  // 5/10
    }

    disableDrawCallCapture();
  });

  it("does not render debug overlay in release mode", () => {
    enableDrawCallCapture();

    renderFrame({ debug: false });

    const debugText = findDrawCalls({ content: "FPS:", type: "text" });
    assert.equal(debugText.length, 0);

    disableDrawCallCapture();
  });
});
```

**Diagnosing issues:** When a visual assertion fails, the error message tells you what was actually drawn. Use `getDrawCallSummary()` or `getDrawCalls()` to dump the full frame for inspection.
