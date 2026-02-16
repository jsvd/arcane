# Coordinates, Camera & Viewport

## Camera Basics

The camera defines what part of the world is visible. By default it is at `(0, 0)` which is the **center** of the screen. This is not a web canvas.

```typescript
import { setCamera, getCamera, getViewportSize } from "@arcane/runtime/rendering";

// Make (0, 0) the top-left corner (web-like)
const { width: VPW, height: VPH } = getViewportSize();
setCamera(VPW / 2, VPH / 2);

// Follow a player character
setCamera(player.x, player.y, 2.0);  // 2x zoom
```

Call `setCamera()` every frame. Without it, sprites at positive coordinates appear bottom-right of center.

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
import { drawParallaxSprite, getCamera, getViewportSize } from "@arcane/runtime/rendering";

const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();

// Sky (fixed, never scrolls)
drawParallaxSprite({ textureId: sky, x: cam.x - VPW / 2, y: cam.y - VPH / 2,
  w: VPW, h: VPH, layer: 0, parallaxFactor: 0 });

// Distant mountains (slow scroll)
drawParallaxSprite({ textureId: mountains, x: 0, y: 200,
  w: 1600, h: 200, layer: 1, parallaxFactor: 0.3 });

// Trees (medium scroll)
drawParallaxSprite({ textureId: trees, x: 0, y: 300,
  w: 1600, h: 150, layer: 2, parallaxFactor: 0.6 });
```

## Visible Area Formula

The world region visible on screen at any time:

```
camera.x +/- viewport.width  / (2 * zoom)
camera.y +/- viewport.height / (2 * zoom)
```
