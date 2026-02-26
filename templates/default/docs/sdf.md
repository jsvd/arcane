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
  sdfCircle, sdfBox, sdfTriangle, sdfStar, sdfHeart,
  sdfUnion, sdfSmoothUnion, sdfOffset, sdfRound,
  sdfEntity, clearSdfEntities, flushSdfEntities,
  solid, gradient, glow,
  LAYERS,
} from "@arcane/runtime/rendering";

// In onFrame:
clearSdfEntities();

sdfEntity({
  shape: sdfCircle(30),
  fill: solid("#ff0000"),
  position: [100, 200],
  layer: LAYERS.ENTITIES,
});

flushSdfEntities();
```

## Gradient Scale Parameter

When using gradients on non-square shapes, the gradient may not span the full shape. Use the `scale` parameter to fix this:

```typescript
// Problem: bounds must fit width, but gradient spans full bounds height
sdfEntity({
  shape: sdfTriangle([0, 37], [-43, -37], [43, -37]),
  fill: gradient("#000066", "#ff0000", 90),         // Gradient doesn't reach edges!
  bounds: 43,
});

// Solution: scale adjusts gradient to fit actual shape extent
sdfEntity({
  shape: sdfTriangle([0, 37], [-43, -37], [43, -37]),
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
sdfEntity({
  shape: wideShape,
  fill: gradient("#green", "#white", 90, boundsX / shapeHalfHeight),
  position: [SCREEN_WIDTH / 2, y],
  bounds: SCREEN_WIDTH / 2,
});
```

## Shape Composition

### Boolean Operations

```typescript
sdfUnion(a, b, c)           // Combine shapes (sharp edges)
sdfSmoothUnion(r, a, b, c)  // Combine with rounded blend (r = blend radius)
sdfSubtract(a, b)           // Cut b from a
sdfIntersect(a, b)          // Keep only overlap
```

### Transforms

```typescript
sdfOffset(shape, x, y)      // Move shape
sdfRound(shape, r)          // Round corners by r pixels
sdfScale(shape, s)          // Scale shape (bakes into shader)
sdfRotate(shape, degrees)   // Rotate (bakes into shader)
```

**Performance tip:** Use `sdfEntity({ rotation, scale })` for animation instead of `sdfRotate()`/`sdfScale()`. Instance transforms are GPU-efficient; shape transforms cause shader recompilation.

### Domain Transforms

```typescript
sdfRepeat(shape, spacingX, spacingY)  // Infinite tiling
sdfMirrorX(shape)                      // X-axis symmetry
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
  shape: sdfStar(20, 5, 0.4),
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

- `sdfOffset(shape, 10, 20)` moves shape right and **up**
- `gradient(..., 90)` goes from bottom to top
- Triangle `[0, 50]` is the top vertex, `[0, -50]` is bottom

## Performance Tips

1. **Reuse shape definitions** - Define shapes at module scope, not in onFrame
2. **Use instance transforms** - `rotation`, `scale`, `opacity` on sdfEntity are GPU-efficient
3. **Avoid shape transforms in loops** - `sdfRotate()`, `sdfScale()` on shapes cause shader recompilation
4. **Set explicit bounds** - Auto-calculated bounds may be larger than needed
5. **Batch similar shapes** - Shapes with identical SDF expressions share shaders
