# SDF: Procedural Vector Graphics

SDF (Signed Distance Fields) lets you create resolution-independent shapes entirely in code. No image assets needed. Shapes are defined as TypeScript functions that compile to GPU shaders.

## When to Use SDF

**Good for:**
- Procedural backgrounds (mountains, clouds, terrain)
- UI elements (buttons, panels, health bars)
- Particle-like effects (glows, stars, hearts)
- Prototyping before you have art assets
- Effects that need to scale to any resolution

**Not ideal for:**
- Detailed character sprites (use sprite sheets)
- Complex textures (use images)
- Pixel art aesthetics (use sprites)

## Quick Start

```typescript
import {
  circle, box, triangle, star, heart,
  union, smoothUnion, offset, round,
  sdfEntity, clearSdfEntities, flushSdfEntities,
  solid, gradient, glow,
  LAYERS,
} from "@arcane/runtime/rendering";

// In onFrame:
clearSdfEntities();

sdfEntity({
  shape: circle(30),
  fill: solid("#ff0000"),
  position: [100, 200],
  layer: LAYERS.ENTITIES,
});

flushSdfEntities();
```

## Organizing SDF Code

For maintainable codebases, **encapsulate each shape in its own file**:

```
src/
├── shapes/
│   ├── mountains.ts      # Mountain range shape + factory
│   ├── clouds.ts         # Cloud shape variations
│   ├── trees.ts          # Tree shapes (trunk + foliage)
│   ├── player.ts         # Player character shapes
│   └── index.ts          # Re-export all shapes
├── effects/
│   ├── glow-pickup.ts    # Glowing collectible effect
│   ├── health-bar.ts     # Health bar with gradient
│   └── index.ts
└── game.ts               # Main game logic imports shapes
```

### Shape Module Pattern

Each shape file exports a **shape factory** and optionally a **draw helper**:

```typescript
// src/shapes/mountains.ts
import {
  union, offset, round, triangle, box,
  sdfEntity, gradient, LAYERS,
  type SdfNode,
} from "@arcane/runtime/rendering";

// Shape definition (pure data, no side effects)
const MOUNTAIN_BASE = -120;

export function createMountainRange(): SdfNode {
  return union(
    offset(round(triangle([0, 180], [-140, MOUNTAIN_BASE], [140, MOUNTAIN_BASE]), 25), -60, 0),
    offset(round(triangle([0, 160], [-130, MOUNTAIN_BASE], [130, MOUNTAIN_BASE]), 20), 120, 0),
    offset(round(triangle([0, 130], [-120, MOUNTAIN_BASE], [120, MOUNTAIN_BASE]), 12), -250, 0),
  );
}

// Pre-built instance for simple use cases
export const mountainRange = createMountainRange();

// Draw helper encapsulates positioning and styling
export function drawMountains(screenWidth: number, screenHeight: number) {
  const bounds = screenWidth / 2;
  const height = 180 - MOUNTAIN_BASE; // 300

  sdfEntity({
    shape: mountainRange,
    fill: gradient("#2d5a27", "#f8f8ff", 90, bounds / (height / 2)),
    position: [screenWidth / 2, screenHeight - 120],
    bounds,
    layer: LAYERS.BACKGROUND + 2,
  });
}
```

### Using Shape Modules

```typescript
// src/game.ts
import { drawMountains } from "./shapes/mountains.ts";
import { drawClouds } from "./shapes/clouds.ts";
import { drawPlayer } from "./shapes/player.ts";

game.onFrame(() => {
  clearSdfEntities();

  drawMountains(800, 600);
  drawClouds(time);
  drawPlayer(playerX, playerY, facingLeft);

  flushSdfEntities();
});
```

## Gradient Scale Parameter

When using gradients on non-square shapes, the gradient may not span the full shape. Use the `scale` parameter to fix this:

```typescript
// Problem: bounds must fit width, but gradient spans full bounds height
sdfEntity({
  shape: triangle([0, 37], [-43, -37], [43, -37]),  // Height: 74, Width: 86
  fill: gradient("#000066", "#ff0000", 90),         // Gradient doesn't reach edges!
  bounds: 43,  // Must be 43 to fit width
});

// Solution: scale adjusts gradient to fit actual shape extent
sdfEntity({
  shape: triangle([0, 37], [-43, -37], [43, -37]),
  fill: gradient("#000066", "#ff0000", 90, 43 / 37),  // scale = bounds / half-height
  bounds: 43,
});
```

**The formula:** `scale = bounds / (shape_extent_in_gradient_direction / 2)`

For a 90° gradient (bottom-to-top), use the shape's Y extent. For 0° (left-to-right), use X extent.

## Bounds: Clipping vs. Gradient

The `bounds` parameter serves two purposes:
1. **Clipping:** Only pixels within ±bounds from the entity center are rendered
2. **Gradient mapping:** Gradients span from -bounds to +bounds

If your shape extends beyond bounds, it gets clipped. If your shape is smaller than bounds, gradients won't reach the edges (unless you use the scale parameter).

**Common pattern for wide shapes:**
```typescript
const SCREEN_WIDTH = 800;

sdfEntity({
  shape: wideShape,
  fill: gradient("#green", "#white", 90, boundsX / shapeHalfHeight),
  position: [SCREEN_WIDTH / 2, y],
  bounds: SCREEN_WIDTH / 2,  // Full screen width
});
```

## Shape Composition

### Boolean Operations

```typescript
union(a, b, c)           // Combine shapes (sharp edges)
smoothUnion(r, a, b, c)  // Combine with rounded blend (r = blend radius)
subtract(a, b)           // Cut b from a
intersect(a, b)          // Keep only overlap
```

### Transforms

```typescript
offset(shape, x, y)      // Move shape
round(shape, r)          // Round corners by r pixels
scale(shape, s)          // Scale shape (bakes into shader)
rotate(shape, degrees)   // Rotate (bakes into shader)
```

**Performance tip:** Use `sdfEntity({ rotation, scale })` for animation instead of `rotate()`/`scale()`. Instance transforms are GPU-efficient; shape transforms cause shader recompilation.

### Domain Transforms

```typescript
repeat(shape, spacingX, spacingY)  // Infinite tiling
mirrorX(shape)                      // X-axis symmetry
```

## Fill Types

```typescript
solid("#ff0000")                           // Flat color
gradient("#blue", "#red", 90)              // Linear gradient (angle in degrees)
gradient("#blue", "#red", 90, 1.5)         // With scale for non-square shapes
glow("#ff0000", 0.25)                      // Soft glow (lower intensity = larger)
solidOutline("#fill", "#stroke", 2)        // Fill with outline
outlineFill("#stroke", 2)                  // Outline only
cosinePalette(a, b, c, d)                  // Animated rainbow palette
```

## Animation Helpers

Use these with `sdfEntity` instance properties for efficient GPU animation:

```typescript
pulse(time, speed, min, max)    // Oscillating scale
spin(time, degreesPerSecond)    // Continuous rotation
bob(time, speed, amplitude)     // Vertical bobbing
breathe(time, speed, min, max)  // Opacity pulse

sdfEntity({
  shape: star(20, 5, 0.4),
  fill: glow("#gold", 0.2),
  position: [x, y],
  scale: pulse(time, 2, 0.9, 1.1),
  rotation: spin(time, 45),
  opacity: breathe(time, 3, 0.7, 1.0),
  bounds: 60,
});
```

## Coordinate System

SDF uses math coordinates: **+Y is up**, **+X is right**. This differs from screen coordinates where Y increases downward.

- `offset(shape, 10, 20)` moves shape right and **up**
- `gradient(..., 90)` goes from bottom to top
- Triangle `[0, 50]` is the top vertex, `[0, -50]` is bottom

## Performance Tips

1. **Reuse shape definitions** - Define shapes at module scope, not in onFrame
2. **Use instance transforms** - `rotation`, `scale`, `opacity` on sdfEntity are GPU-efficient
3. **Avoid shape transforms in loops** - `rotate()`, `scale()` on shapes cause shader recompilation
4. **Set explicit bounds** - Auto-calculated bounds may be larger than needed
5. **Batch similar shapes** - Shapes with identical SDF expressions share shaders
