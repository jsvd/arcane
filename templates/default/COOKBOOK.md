# Cookbook — Advanced Patterns

Self-contained recipes for engine features beyond the basics in `AGENTS.md`. Each snippet is copy-paste ready.

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
