# Arcane Rendering Philosophy

A critical analysis of how rendering works in Arcane, the design decisions behind it, and the mental model developers need.

## The Two-Pipeline Architecture

Arcane has two GPU rendering pipelines that run each frame:

1. **Sprite pipeline** — Instanced textured quads. Every image, colored rectangle, text glyph, and UI widget goes through this path. Commands are `SpriteCommand` structs with texture ID, position, UV, tint, layer, blend mode, and shader ID.

2. **Geometry pipeline** — Colored triangles and thick lines with no textures. Every shape primitive (circle, polygon, arc, etc.) goes through this path. Commands are `GeoCommand` enums with vertex positions, color, and layer.

Both pipelines share the same camera uniform (view-projection matrix). Since v0.13.3+, they are **interleaved by layer** during rendering — a geometry circle at layer 1 renders before a sprite at layer 5. Before this fix, all geometry always rendered on top of all sprites regardless of layer values.

### What Goes Through Each Pipeline

| Pipeline | Functions | Notes |
|----------|-----------|-------|
| Sprite | drawSprite, drawRect, drawPanel, drawBar, drawLabel, drawText, drawAnimatedSprite, drawNineSlice, drawTilemap, drawTrail, drawFloatingTexts, drawTypewriter | Everything texture-based |
| Geometry | drawCircle, drawEllipse, drawRing, drawLine, drawTriangle, drawArc, drawSector, drawCapsule, drawPolygon | Everything shape-based |

**Key consequence:** Shapes look different from sprites. They are flat-colored triangles with no texture support, no tint, no blend modes, no shaders. A circle drawn with `drawCircle()` is a 64-triangle fan — visually clean but limited. There is no way to apply a texture or gradient to a shape.

## The Coordinate System

### World Space (default)

Camera (0, 0) means the screen center corresponds to world position (0, 0). This is a center-origin system, not a top-left-origin system.

```
         -y
          |
    -x ---+--- +x    (0,0) is screen center
          |
         +y
```

Y increases downward (screen convention, not math convention).

### Making (0,0) = Top-Left

Most games want web-like coordinates where (0, 0) is the top-left corner. The pattern:

```ts
const vp = getViewportSize(); // returns { width, height }
setCamera(vp.width / 2, vp.height / 2);
```

`createGame()` does this automatically when `autoCamera: true` (the default). **Most demo code was written before createGame() existed**, so demos do this manually with varying patterns — don't copy those patterns.

### Screen Space vs World Space

Some functions accept a `screenSpace` option. When `screenSpace: true`, coordinates are in screen pixels (0,0 = top-left) and the engine converts them to world coordinates internally using the camera's current position and zoom.

| Supports screenSpace | Doesn't support screenSpace |
|-|-|
| drawSprite, drawRect, drawPanel, drawBar, drawLabel | drawTilemap (always world) |
| drawCircle, drawLine, drawTriangle, drawRectangle, all shapes | drawAnimatedSprite (always world) |
| drawText, drawTextWrapped, drawTextAligned | |

**The `hud.*` helpers** force `screenSpace: true` automatically, so `hud.text("Score", 10, 10)` renders at screen pixel (10, 10) regardless of camera position.

## Layer Ordering

Layers are integers. Lower values render first (appear behind). Higher values render on top.

### Conventional Ranges

| Range | Purpose | Examples |
|-------|---------|----------|
| 0-10 | Game world | Tilemap (0), props (1-3), characters (5), projectiles (8) |
| 10-50 | World overlays | Selection highlights, debug visualization |
| 90-99 | UI primitives | drawRect default=90, drawPanel default=90 |
| 100-110 | Text | drawText default=100, hud.label default=110 |
| 200+ | Overlays | Full-screen fades, pause screens |
| 250 | Screen transitions | startScreenTransition |

### The Layer Default Problem

This is the most confusing aspect of the rendering API. Different function families have different default layers:

- `drawSprite()` → layer **0**
- `drawCircle()` → layer **0**
- `drawRect()` → layer **90**
- `drawText()` → layer **100**

This means calling `drawRect(10, 10, 50, 50)` then `drawCircle(30, 30, 10)` will show the circle BEHIND the rect, because rect defaults to 90 and circle defaults to 0.

**Recommendation:** Always pass explicit `layer` values. Don't rely on defaults.

## Drawing Colored Rectangles — Five Ways

This is the clearest example of API surface area that confuses developers:

### 1. `drawRectangle()` — Game world shapes (recommended for simple rects)
```ts
drawRectangle(100, 100, 50, 50, { color: rgb(255, 0, 0), layer: 5 });
```
- Uses geometry pipeline (two triangles, no texture)
- Default layer: **0** (same as other shapes)
- Supports screenSpace
- Flat color only, no rotation/blend mode

### 2. `drawSprite()` with `color` — Game world with sprite features
```ts
drawSprite({ color: rgb(255, 0, 0), x: 100, y: 100, w: 50, h: 50, layer: 5 });
```
- Pass `color` instead of `textureId`; a 1x1 solid texture is auto-cached per color
- Default layer: 0
- Supports screenSpace, rotation, flip, opacity, blend mode

### 3. `drawRect()` — UI/HUD rectangles
```ts
drawRect(100, 100, 50, 50, { color: rgb(255, 0, 0), layer: 90, screenSpace: true });
```
- Also creates/caches a solid texture internally
- Default layer: **90** (designed for UI)
- Supports screenSpace
- No rotation/flip/blend mode

### 4. `drawPolygon()` — Arbitrary geometry (verbose)
```ts
drawPolygon([[100,100],[150,100],[150,150],[100,150]], { color: rgb(255,0,0), layer: 5 });
```
- Uses geometry pipeline (no texture at all)
- Default layer: 0
- Supports screenSpace
- Verbose vertex list — prefer `drawRectangle()` for axis-aligned rects

### 5. `drawSprite()` — Full control
```ts
const tex = createSolidTexture("red", { r: 1, g: 0, b: 0, a: 1 });
drawSprite({ textureId: tex, x: 100, y: 100, w: 50, h: 50, layer: 5, screenSpace: true });
```
- Explicit texture management
- Full sprite options (rotation, blend, shader, screenSpace, etc.)

### When to Use Which

- **Simple colored rect** (game world) → `drawRectangle()`
- **Colored rect with rotation/blend** → `drawSprite({ color })` with rotation/blend options
- **HUD elements** (health bars, menus) → `drawRect()` with `screenSpace: true`
- **Textured sprites** → `drawSprite()` with a loaded texture
- **Debug/wireframe** → `drawPolygon()` or `drawLine()`

## Color System

Colors are `{ r, g, b, a }` objects with values **0.0 to 1.0**.

The `rgb(r, g, b)` helper converts 0-255 integers to 0.0-1.0:
```ts
rgb(255, 128, 0) → { r: 1.0, g: 0.502, b: 0.0, a: 1.0 }
```

Common mistake: passing 0-255 integers directly where 0.0-1.0 is expected. `setBackgroundColor(255, 0, 0)` will NOT work as expected — it clamps to 1.0.

## Text Rendering

Two font systems:

1. **Bitmap font** (CP437 8x8) — Built-in, pixel-perfect at small sizes, aliased when scaled up. Used by `drawText()` by default.

2. **MSDF font** — Resolution-independent signed distance field. Crisp at any size. Supports outlines and shadows. Used by passing `msdfFont` option to `drawText()`.

```ts
// Bitmap (default) — good for pixel art games
drawText("Score: 100", 10, 10, { scale: 2 });

// MSDF — good for polished/readable text
const font = getDefaultMSDFFont();
drawText("Score: 100", 10, 10, { msdfFont: font, scale: 24 });
```

MSDF is significantly higher quality. Use it for anything player-facing that should look good.

## Visual Quality Considerations

### Why Games Look "Ugly"

Games built by agents often look like simple colored polygons because:

1. **No textures loaded** — Agent defaults to `drawSprite({ color })` which creates 1x1 solid textures. Everything is flat rectangles.

2. **No MSDF text** — Default bitmap font is 8x8 pixels. At scale 1 it's tiny. At scale 4 it's blocky. Switching to MSDF makes text crisp instantly.

3. **No post-processing** — The engine supports bloom, blur, vignette, CRT, and custom shaders. These add visual polish but agents don't know to use them.

4. **Default layer 0 for everything** — Without explicit layering, sprites overlap unpredictably.

5. **No parallax or depth** — A static camera with flat sprites feels lifeless. Adding parallax layers or camera follow adds perceived depth.

### Quick Visual Upgrade Checklist

- [ ] Use MSDF font for text: `drawText("...", x, y, { msdfFont: getDefaultMSDFFont(), scale: 24 })`
- [ ] Load actual sprite textures instead of solid colors
- [ ] Set explicit layers for all draw calls
- [ ] Use `followTargetSmooth()` instead of static camera
- [ ] Add at least one post-processing effect (e.g., vignette)
- [ ] Use `drawPanel()` for UI containers instead of bare `drawRect()`
- [ ] Apply slight camera shake on impacts: `shakeCamera(3, 0.1)` (intensity, duration)

## HUD Positioning

For screen-space UI, use the `hud.*` helpers which auto-set `screenSpace: true`:

```ts
hud.text("Score: 100", 10, 10);           // top-left corner, screen pixels
hud.bar(10, 30, hp / maxHp);              // health bar below score
hud.label("GAME OVER", 300, 250);         // centered label with panel
```

For custom HUD layout, use `getViewportSize()`:
```ts
const vp = getViewportSize();
drawText("Right-aligned", vp.width - 100, 10, { screenSpace: true, layer: 100 });
```

**Never destructure `getViewportSize()` as an array** — it returns `{ width, height }`, not `[w, h]`.

## The createGame() Bootstrap

`createGame()` sets up the frame loop with sensible defaults:

```ts
const game = createGame({
  name: "my-game",
  background: rgb(20, 20, 41),  // dark blue background
  // autoCamera: true,     // default: makes (0,0) = top-left
  // autoClear: true,      // default: clears sprites each frame
  // autoSubsystems: true, // default: auto-updates tweens, particles, transitions
});

game.onFrame((dt) => {
  // Your game logic and rendering here
});
```

With `autoSubsystems: true` (default), you don't need to manually call `updateTweens()`, `updateParticles()`, `updateScreenTransition()`, `drawScreenTransition()`, or `drawScreenFlash()`. They're handled automatically.

## Three Shader Tiers

Custom shaders provide a progressive disclosure path from zero-WGSL to full control:

### Tier 1: Effect Presets (no WGSL)
```ts
const fx = outlineEffect({ color: [1, 0, 0, 1], width: 2 });
drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });
fx.set("outlineWidth", 3.0);
```
8 presets: `outlineEffect`, `flashEffect`, `dissolveEffect`, `pixelateEffect`, `hologramEffect`, `waterEffect`, `glowEffect`, `grayscaleEffect`. Each is a factory returning a `ShaderEffect` with named uniform accessors.

### Tier 2: Named Uniform API (custom WGSL, ergonomic params)
```ts
const fx = createShader("dissolve", wgslSource, { threshold: "float", edgeColor: "vec3" });
setShaderUniform(fx, "threshold", 0.5);
setShaderUniform(fx, "edgeColor", 1.0, 0.5, 0.0);
```
You write WGSL, but reference uniforms by name instead of slot index.

### Tier 3: Raw WGSL (full control)
```ts
const fx = createShaderFromSource("custom", wgslSource);
setShaderParam(fx, 0, 1.0, 0.5, 0.0, 1.0);
```
Direct slot-indexed access. 14 user vec4 slots.

All three tiers get auto-injected built-in uniforms: `shader_params.time`, `.delta`, `.resolution`, `.mouse`.

## Architecture Summary

```
TypeScript Game Code
  ├── drawSprite() → op_draw_sprite → SpriteCommand → SpritePipeline (GPU)
  ├── drawCircle() → op_geo_triangle × 64 → GeoCommand → GeometryBatch (GPU)
  ├── drawText()   → glyph sprites → SpriteCommand → SpritePipeline (GPU)
  └── hud.*()      → screenSpace conversion → drawText/drawRect/etc.

Frame Rendering:
  1. Sort all SpriteCommands by layer
  2. Sort all GeoCommands by layer
  3. Merge-walk both sorted lists by layer (sprites first at same layer)
  4. For each block: emit GPU render pass (Clear first, then Load)
  5. Apply post-processing effects (if any)
  6. Present frame
```
