# Tilemaps

## Basic Tilemap

Create once, set tiles, draw each frame:

```typescript
import { createTilemap, setTile, getTile, drawTilemap } from "@arcane/runtime/rendering";

const map = createTilemap({
  textureId: atlas, width: 20, height: 15, tileSize: 16, atlasColumns: 8, atlasRows: 8,
});
setTile(map, x, y, tileIndex);

// In onFrame:
drawTilemap(map, 0, 0, 0);  // id, x, y, layer
```

## Layered Tilemaps

Multiple z-ordered layers sharing one tile atlas:

```typescript
import {
  createLayeredTilemap, setLayerTile, getLayerTile,
  drawLayeredTilemap, setLayerVisible, setLayerOpacity, fillLayerTiles,
} from "@arcane/runtime/rendering";

const map = createLayeredTilemap(
  { textureId: atlas, width: 40, height: 30, tileSize: 16, atlasColumns: 16, atlasRows: 16 },
  [
    ["ground",     { zOrder: 0 }],
    ["walls",      { zOrder: 1 }],
    ["decoration", { zOrder: 2, opacity: 0.8 }],
  ],
);

fillLayerTiles(map, "ground", 0, 0, 39, 29, 1);   // grass everywhere
setLayerTile(map, "walls", 5, 3, 48);              // wall at (5,3)
setLayerVisible(map, "decoration", false);          // toggle layer off

// In onFrame (pass camera position for culling):
const cam = getCamera();
drawLayeredTilemap(map, 0, 0, 0, cam.x, cam.y);
```

## Auto-Tiling

Automatically select tile variants based on neighbors. 4-bit mode uses 16 tiles (cardinal only):

```typescript
import {
  createAutotileMapping4, createAutotileRule, applyAutotile,
} from "@arcane/runtime/rendering";

// 16 tile IDs ordered by bitmask: isolated, N, E, N+E, S, N+S, E+S, ...
const wallTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const mapping = createAutotileMapping4(wallTiles);
const rule = createAutotileRule([48], 4, mapping, 0);  // tile 48 = "wall member"

applyAutotile(
  map.width, map.height,
  (gx, gy) => getLayerTile(map, "walls", gx, gy),
  (gx, gy, id) => setLayerTile(map, "walls", gx, gy, id),
  rule,
);
```

## Animated Tiles

Register tile IDs that cycle through frames automatically (water, torches, conveyor belts):

```typescript
import { registerAnimatedTile, updateAnimatedTiles, drawLayeredTilemap } from "@arcane/runtime/rendering";

registerAnimatedTile(64, [64, 65, 66, 67], 0.25);  // 0.25s per frame
registerAnimatedTile(80, [80, 81, 82], 0.15);

// In onFrame (before drawing):
updateAnimatedTiles(dt);
drawLayeredTilemap(map, 0, 0, 0, cam.x, cam.y);
```

## Tile Properties

Attach custom metadata to tile IDs for gameplay queries:

```typescript
import { defineTileProperties, getTilePropertyAt } from "@arcane/runtime/rendering";

defineTileProperties(1,  { walkable: true, name: "grass" });
defineTileProperties(48, { walkable: false, name: "wall" });
defineTileProperties(64, { walkable: true, damage: 5, name: "lava" });

const walkable = getTilePropertyAt(map, "ground", playerTileX, playerTileY, "walkable");
const dmg = getTilePropertyAt(map, "ground", playerTileX, playerTileY, "damage") as number ?? 0;
```
