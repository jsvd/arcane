# Isometric & Hex Grids

## Isometric Grids

Diamond-projection coordinate transforms for isometric 2.5D games.

```typescript
import {
  isoToWorld, worldToGrid, screenToIso,
  isoDepthLayer, isoMapBounds, isoNeighbors,
  createIsoTilemap, setIsoTile, drawIsoTilemap,
  type IsoConfig,
} from "@arcane/runtime/rendering";
import { getCamera, getViewportSize, setCameraBounds } from "@arcane/runtime/rendering";

const ISO: IsoConfig = { tileW: 64, tileH: 32 };
```

### Grid to World

```typescript
const worldPos = isoToWorld(3, 5, ISO);
// worldPos = { x: (3-5)*32, y: (3+5)*16 } = { x: -64, y: 128 }
```

### Mouse Picking (Screen to Grid)

```typescript
const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();
const cell = screenToIso(mouseScreenX, mouseScreenY, cam, ISO, VPW, VPH);
```

### Depth Sorting

Use `isoDepthLayer(gy)` as the sprite layer. Higher gy = closer to camera = drawn on top.

```typescript
const world = isoToWorld(gx, gy, ISO);
drawSprite({
  textureId: TEX, x: world.x, y: world.y - 16,  // offset Y for objects above ground
  w: 64, h: 48, layer: isoDepthLayer(gy),
});
```

### Iso Tilemap

```typescript
const map = createIsoTilemap({
  width: 20, height: 20, config: ISO,
  textureId: tileAtlas, atlasColumns: 8, atlasRows: 8, tileSize: 64,
});
setIsoTile(map, 3, 5, 1);
drawIsoTilemap(map, cam.x, cam.y, VPW, VPH);

// Camera bounds for the map
const bounds = isoMapBounds(20, 20, ISO);
setCameraBounds(bounds);
```

## Hex Grids

Cube-coordinate system where q + r + s = 0. Supports pointy-top and flat-top orientations.

```typescript
import {
  hex, hexNeighbors, hexDistance, hexToWorld, worldToHex,
  screenToHex, hexRange, hexRing, hexLineDraw,
  createHexTilemap, setHexTile, drawHexTilemap,
  type HexConfig,
} from "@arcane/runtime/rendering";
import { getCamera, getViewportSize } from "@arcane/runtime/rendering";

const HEX: HexConfig = { hexSize: 24, orientation: "pointy" };
```

### Coordinates

```typescript
const origin = hex(0, 0);    // { q: 0, r: 0, s: 0 } -- s computed automatically
const target = hex(3, -1);   // { q: 3, r: -1, s: -2 }
```

### Neighbors & Distance

See `types/rendering.d.ts` for full hex utility functions: `hexNeighbors`, `hexDistance`, `hexRing`, `hexRange`, `hexLineDraw`.

### Hex Tilemap

```typescript
const worldPos = hexToWorld(target, HEX);

// Mouse picking: screen -> hex
const cam = getCamera();
const { width: VPW, height: VPH } = getViewportSize();
const clicked = screenToHex(mouseX, mouseY, cam, HEX, VPW, VPH);

const map = createHexTilemap({
  width: 15, height: 15, config: HEX,
  textureId: hexAtlas, atlasColumns: 4, atlasRows: 4, tileSize: 48,
});
setHexTile(map, 3, -1, 2);
drawHexTilemap(map, cam.x, cam.y, VPW, VPH);
```

## Grid Pathfinding (A*)

Rectangular grid pathfinding:

```typescript
import { findPath } from "@arcane/runtime/pathfinding";

const grid = {
  width: 40, height: 30,
  isWalkable: (x: number, y: number) => !isWall(x, y),
  cost: (x: number, y: number) => isSwamp(x, y) ? 3 : 1,
};

const result = findPath(grid, { x: 0, y: 0 }, { x: 35, y: 25 }, {
  diagonal: true, heuristic: "chebyshev",
});
if (result.found) {
  for (const step of result.path) { /* step.x, step.y */ }
}
```

## Hex Pathfinding

```typescript
import { findHexPath, hexReachable, reachableToArray } from "@arcane/runtime/pathfinding";
import { hex } from "@arcane/runtime/rendering";

const grid = {
  isWalkable: (q: number, r: number) => getTerrain(q, r) !== "water",
  cost: (q: number, r: number) => getTerrain(q, r) === "forest" ? 2 : 1,
};

// Shortest path
const result = findHexPath(grid, hex(0, 0), hex(5, -3));
if (result.found) {
  for (const step of result.path) { /* step.q, step.r */ }
}

// Movement range: all cells reachable within 4 movement points
const reachable = hexReachable(grid, hex(0, 0), 4);
const cells = reachableToArray(reachable);
```
