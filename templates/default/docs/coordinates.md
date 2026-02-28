# Coordinates, Camera & Viewport

## Coordinate System

**(0, 0) = top-left corner.** X increases right, Y increases down. Matches web canvas, Unity 2D, and Godot conventions.

```
  (0,0) -------- +x
    |
    |
   +y
```

## Camera Basics

The camera defines what part of the world is visible. `setCamera(x, y)` positions the viewport's **top-left** at world (x, y).

```
  Default camera at (0, 0):
  +-----------------------------------+
  | (0, 0)                  (VPW, 0)  |
  |                                   |
  |          (VPW/2, VPH/2)           |
  |                                   |
  | (0, VPH)              (VPW, VPH)  |
  +-----------------------------------+
```

No setup needed — sprites at positive coordinates appear on screen by default.

```typescript
import { setCamera, getCamera, getViewportSize } from "@arcane/runtime/rendering";

// Draw a sprite 10px from the top-left corner — just works
drawSprite({ textureId: tex, x: 10, y: 10, w: 32, h: 32 });

// Scroll the camera to show a different part of the world
setCamera(200, 100);  // viewport top-left now at world (200, 100)
```

## Viewport Size

Never hardcode pixel dimensions. The window is resizable.

```typescript
const { width: VPW, height: VPH } = getViewportSize();
// Returns logical pixels (DPI-independent): 800x600 on a 2x Retina display
```

Derive all layout from viewport dimensions:
- World bounds: `state.viewportW` / `state.viewportH`
- Backgrounds: size to `VPW x VPH` to fill screen
- HUD: use `screenSpace: true` with fixed offsets from edges

## Resolution-Adaptive Design

```typescript
// src/game.ts -- pure logic accepts viewport dimensions
export function createGame(viewportW: number, viewportH: number) {
  const groundY = viewportH - 50;
  return { viewportW, viewportH, playerX: viewportW / 2, playerY: groundY - 32, groundY };
}

// src/visual.ts -- provides actual viewport
const { width, height } = getViewportSize();
let state = createGame(width, height);
```

## Smooth Camera Follow

`followTargetSmooth()` centers the target on screen automatically (handles the half-viewport offset internally).

```typescript
import {
  followTargetSmooth, setCameraBounds, setCameraDeadzone,
} from "@arcane/runtime/rendering";

// Limit camera to world bounds
setCameraBounds({ minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight });

// Player can move 60x40px around center before camera moves
setCameraDeadzone({ width: 60, height: 40 });

// In onFrame:
followTargetSmooth(player.x, player.y, 1.0, 0.08);  // lower = snappier
```

## Animated Zoom

```typescript
import { zoomTo, zoomToPoint } from "@arcane/runtime/rendering";
import { easeInOutCubic } from "@arcane/runtime/tweening";

zoomTo(2.0, 0.5, easeInOutCubic);                          // zoom to 2x over 0.5s
zoomToPoint(3.0, bossX, bossY, 1.0, easeInOutCubic);       // zoom centered on boss
```

## Parallax Scrolling

Multi-layer depth scrolling. Factor 0 = fixed background, 1 = foreground (same as normal sprites).

```typescript
import { drawSprite, getCamera, getViewportSize } from "@arcane/runtime/rendering";

const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();

// Sky (fixed, never scrolls)
drawSprite({ textureId: sky, x: cam.x, y: cam.y,
  w: VPW, h: VPH, layer: 0, parallax: 0 });

// Distant mountains (slow scroll)
drawSprite({ textureId: mountains, x: 0, y: 200,
  w: 1600, h: 200, layer: 1, parallax: 0.3 });

// Trees (medium scroll)
drawSprite({ textureId: trees, x: 0, y: 300,
  w: 1600, h: 150, layer: 2, parallax: 0.6 });
```

## Visible Area Formula

The world region visible on screen at any time:

```
x: camera.x  to  camera.x + viewport.width  / zoom
y: camera.y  to  camera.y + viewport.height / zoom
```
