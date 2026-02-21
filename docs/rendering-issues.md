# Rendering UX Issues and Proposed Fixes

A critical assessment of Arcane's rendering developer experience from the perspective of an experienced game developer and an LLM agent trying to build games.

## Severity Ratings

- **S1** — Agent can't build a working game without knowing this
- **S2** — Agent builds a game that looks wrong or feels broken
- **S3** — Agent writes suboptimal code; works but confusing
- **S4** — Paper cut; minor friction

---

## Issue 1: Games Look Ugly by Default (S1)

### The Problem

When an agent builds a game from scratch, the result is almost always flat-colored rectangles and tiny bitmap text. This isn't a rendering bug — it's a **defaults problem**. The path of least resistance produces ugly games.

### Why It Happens

1. `drawColorSprite()` is the easiest way to put something on screen (no texture loading), but it produces a solid-color 1x1 pixel rectangle stretched to size. Every entity is a flat blob.

2. `drawText()` defaults to the 8x8 CP437 bitmap font. At scale 1, text is 8 pixels tall — nearly unreadable. At scale 3-4, it's blocky and aliased.

3. No demo or guidance suggests starting with loaded textures or MSDF text. The "quick start" path teaches `drawColorSprite` because it has zero setup cost.

### Proposed Fix

**A. Default to MSDF text.** Change `drawText()` to use MSDF font when available, falling back to bitmap only in headless mode. This is a one-line change in `text.ts` that makes all text look dramatically better.

**B. Add a `drawRectangle()` shape function** that uses the geometry pipeline. This avoids the solid-texture detour for simple colored rects, and is consistent with the rest of the shapes API (drawCircle, drawTriangle, etc.). Currently shapes have every primitive EXCEPT rectangle — the most common one.

**C. AGENTS.md should open with "make it look good" defaults:**
```ts
// Step 1: Use MSDF text (crisp at any size)
const font = getDefaultMSDFFont();
drawText("Score: 100", 10, 10, { msdfFont: font, scale: 20 });

// Step 2: Load actual textures for game entities
const playerTex = loadTexture("assets/player.png");
drawSprite({ textureId: playerTex, x: 100, y: 100, w: 32, h: 32 });

// Step 3: Use drawColorSprite ONLY for simple UI backgrounds
drawColorSprite({ color: rgb(40, 40, 60), x: 0, y: 0, w: 200, h: 30, layer: 90 });
```

---

## Issue 2: Layer Defaults Are Inconsistent (S2)

### The Problem

| Function | Default Layer |
|----------|:---:|
| drawSprite() | 0 |
| drawCircle(), drawLine(), all shapes | 0 |
| drawRect(), drawPanel(), drawBar() | 90 |
| drawText() | 100 |
| hud.label() | 110 |

An agent drawing a circle at (100, 100) and a rect at (100, 100) will see the rect on top — not because of draw order, but because rect defaults to layer 90 while circle defaults to 0.

### Why It Exists

The idea was: shapes are "game world" (layer 0), rects are "UI" (layer 90), text is "above UI" (layer 100). This makes sense as a convention but is unintuitive because:

- `drawRect` is in the UI module but often used for game-world backgrounds
- `drawCircle` is also in the UI module but defaults to layer 0
- The implicit layering is invisible in the code

### Proposed Fix

**Option A (minimal): Add layer default to function JSDoc.** Every draw function should state its default layer in the first line of documentation. Currently it's buried in the options type.

**Option B (moderate): Make all defaults 0.** If every draw function defaults to layer 0, developers must explicitly set layers — but at least the behavior is predictable. UI primitives would need `layer: 90` explicitly, which is more verbose but more honest.

**Option C (recommended): Keep current defaults but document a "Layer Map"** prominently in AGENTS.md and the type declarations. A simple ASCII diagram:

```
Layer 0-10:   Game world (sprites, shapes, tilemap)
Layer 90-99:  UI primitives (drawRect, drawPanel, drawBar)
Layer 100:    Text (drawText)
Layer 200+:   Overlays (screen flash, transitions)
```

---

## Issue 3: No drawRectangle() in Shapes (S2)

### The Problem

The shapes module (`runtime/ui/shapes.ts`) provides: circle, ellipse, ring, line, triangle, arc, sector, capsule, polygon. But NOT rectangle — the most commonly needed shape.

To draw a colored rectangle, developers must either:
- Use `drawRect()` (layer 90 default, creates a texture internally)
- Use `drawPolygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]])` (verbose)
- Use `drawColorSprite()` (creates a texture, no screenSpace)

### Why It Matters

Agents asked to "draw a red rectangle" will reach for shapes first, find no `drawRectangle`, then try `drawRect` (wrong layer default), or try `drawPolygon` (verbose and error-prone), or try `drawColorSprite` (no screenSpace). Each path has a different gotcha.

### Proposed Fix

Add `drawRectangle(x, y, w, h, options?)` to `shapes.ts` using two `op_geo_triangle` calls. Default layer 0, supports screenSpace. This fills the obvious gap and aligns with the rest of the shapes API.

```ts
export function drawRectangle(
  x: number, y: number, w: number, h: number,
  options?: ShapeOptions,
): void {
  // Two triangles forming a rectangle via geometry pipeline
}
```

---

## Issue 4: Camera Coordinate System Is Unintuitive (S2)

### The Problem

Default camera (0, 0) = screen center. Most developers expect (0, 0) = top-left.

`createGame()` with `autoCamera: true` (the default) fixes this on frame 1. But:

1. Most demos were written before `createGame()` existed, so they show manual camera setup with 5+ different patterns
2. Agents reading demos copy the manual pattern instead of relying on `createGame()`
3. The AGENTS.md explains the fix but the cognitive load is high

### Defense of Current Decision

The center-origin camera is correct for a 2D game engine. It matches OpenGL/wgpu conventions, makes zoom work naturally (zoom toward center), and makes camera follow intuitive (character at world position = screen center). Top-left origin is a web/HTML convention, not a game convention.

The `autoCamera` flag in `createGame()` is the right solution. The problem is documentation and demo consistency, not the design.

### Proposed Fix

**Update all demos** to use `createGame()` with the default `autoCamera: true`. Remove manual `setCamera(vpW/2, vpH/2)` calls. This creates a consistent pattern for agents to learn from.

---

## Issue 5: screenSpace Is Missing from drawSprite() (S2)

### The Problem

`drawSprite()` — the most fundamental rendering function — does not support `screenSpace`. Every other draw function does (drawRect, drawCircle, drawText, all shapes).

An agent told "draw a HUD icon using a sprite" has no way to position it in screen space without manual coordinate conversion:

```ts
// What they want to write:
drawSprite({ textureId: icon, x: 10, y: 10, w: 32, h: 32, screenSpace: true }); // DOESN'T EXIST

// What they must write:
const cam = getCamera();
const vp = getViewportSize();
const worldX = 10 / cam.zoom + cam.x - vp.width / (2 * cam.zoom);
const worldY = 10 / cam.zoom + cam.y - vp.height / (2 * cam.zoom);
drawSprite({ textureId: icon, x: worldX, y: worldY, w: 32 / cam.zoom, h: 32 / cam.zoom });
```

### Defense

`drawSprite()` sends commands directly to the GPU pipeline. Adding screenSpace would require coordinate conversion in the hot path (every sprite, every frame). Since sprites are the most performance-sensitive draw call, keeping them world-only is defensible.

However, the conversion is already done in `drawRect()` and `drawText()` using the same `toWorld()` pattern, so the perf argument is weak — it's just a few multiplications.

### Proposed Fix

Add `screenSpace` support to `drawSprite()` using the same `toWorld()` pattern from `primitives.ts`. The conversion happens in TS before the op call — zero GPU overhead. This eliminates the single biggest API gap.

---

## Issue 6: rgb() vs 0.0-1.0 Float Confusion (S2)

### The Problem

Colors are `{ r, g, b, a }` with 0.0-1.0 floats. The `rgb()` helper converts 0-255 integers:

```ts
rgb(255, 0, 0)  →  { r: 1.0, g: 0.0, b: 0.0, a: 1.0 }
```

But many APIs accept raw Color objects, and developers (human and LLM) mix up the ranges:

```ts
// WRONG — will be white (all channels > 1.0 clamp to 1.0)
drawCircle(100, 100, 20, { color: { r: 255, g: 0, b: 0, a: 1 } });

// CORRECT
drawCircle(100, 100, 20, { color: rgb(255, 0, 0) });
drawCircle(100, 100, 20, { color: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 } });
```

### Defense

The 0.0-1.0 convention matches GPU shaders, OpenGL, wgpu, and most game engines. The `rgb()` helper exists precisely for the web-developer convenience case. This is a documentation issue, not a design issue.

### Proposed Fix

**Make `rgb()` the ONLY recommended way to create colors** in all documentation and examples. Never show raw `{ r: 0.5, g: 0.2, b: 0.8 }` literals in docs — always show `rgb(128, 51, 204)`. The helper is already there; the docs just need to use it consistently.

Add validation in debug mode: if any color channel > 1.0, log a warning.

---

## Issue 7: Demo Code Teaches Bad Patterns (S3)

### The Problem

Demos were written incrementally over many phases. Each demo uses the API idioms available at the time it was written. Later phases added convenience functions, but older demos weren't updated.

### Specific Bad Patterns in Demos

1. **Manual camera setup** instead of `createGame({ autoCamera: true })`
   - Found in: hello-world, platformer, breakout, sokoban, roguelike, visual-polish, hex-strategy

2. **Manual `updateTweens(dt)` / `updateParticles(dt)`** instead of `autoSubsystems: true`
   - Found in: juice-showcase, visual-polish

3. **`hud.text()` with hard-coded pixel offsets** instead of layout helpers
   - Found in: roguelike, breakout, sokoban

4. **Manual input polling + input map redundancy**
   - Found in: gamepad-platformer (reads both input map AND raw gamepad axes)

5. **Camera-relative HUD math** instead of `screenSpace: true`
   - Found in: hex-strategy (computes `hudX = cam.x - (vp.width / 2) * scale`)

### Proposed Fix

**Rewrite 3-4 key demos** using modern idioms (createGame, autoSubsystems, hud helpers, MSDF text). Keep old demos as "advanced" examples but flag the canonical pattern clearly.

Priority rewrites:
1. hello-world — The first thing a developer sees
2. platformer — The most common game type
3. breakout — Simple but demonstrates shapes + sprites + text

---

## Issue 8: followTargetSmooth Smoothness Is Non-Intuitive (S3)

### The Problem

```ts
followTargetSmooth(targetX, targetY, zoom, smoothness);
```

The `smoothness` parameter is an exponential decay constant:
- 0.001 = very fast (almost instant)
- 0.1 = smooth (default)
- 0.999 = nearly frozen

Most developers expect the opposite: 0 = no smoothing, 1 = maximum smoothing. Or they expect it to be a speed/duration.

### Proposed Fix

Either:
- **Rename** to `followTargetSmooth(target, zoom, { damping: 0.1 })` to indicate it's a damping factor, not a speed
- **Document** the semantics prominently: "lower = faster tracking, higher = more lag"
- **Add a `followTargetSpeed()` variant** that takes a "catch-up speed" in units/second

---

## Issue 9: No Unified "What Should I Use?" Decision Guide (S3)

### The Problem

There are 30+ draw functions across 6 modules. An agent asked to "draw a health bar" could reasonably try:

1. `drawBar()` — correct, but layer 90 default
2. `drawRect()` twice (bg + fill) — works, but manual
3. `drawColorSprite()` twice — works, but no screenSpace
4. `drawPolygon()` twice — works, but verbose
5. `hud.bar()` — correct for HUD, but different API

No documentation provides a decision tree.

### Proposed Fix

Add a decision tree to AGENTS.md:

```
"I want to draw..."
├── A textured image → drawSprite()
├── A colored rectangle
│   ├── For HUD/menu → drawRect({ screenSpace: true })
│   └── For game world → drawColorSprite()
├── A circle/shape
│   ├── Filled → drawCircle/drawPolygon/drawTriangle()
│   └── Outline → drawArc/drawRing/drawLine()
├── Text
│   ├── HUD text → hud.text()
│   ├── World text → drawText()
│   └── Crisp text → drawText({ msdfFont: getDefaultMSDFFont() })
├── A health/progress bar
│   ├── HUD → hud.bar()
│   └── World (above enemy) → drawBar({ screenSpace: false })
├── A panel/dialog box → drawPanel() or drawNineSlice()
└── A tilemap → createTilemap() + drawTilemap()
```

---

## Issue 10: Particle Rendering Is Shape-Only (S3)

### The Problem

`drawAllParticles()` renders every particle as a `drawCircle()` call. This means particles are always flat-colored circles — no textures, no blend modes, no variety.

Games with particle effects (explosions, fire, sparkles) look noticeably cheap because every particle is a solid-color circle.

### Proposed Fix

Add an optional `textureId` to particle emitter config. When set, render particles as sprites instead of circles. This is a moderate change (modify `emitter.ts` to call `drawSprite()` instead of `drawCircle()` when texture is available) but has high visual impact.

---

## Issue 11: No Built-in Color Palette (S4)

### The Problem

Every demo defines its own color constants:
```ts
const RED = rgb(255, 0, 0);
const GREEN = rgb(0, 255, 0);
const DARK = rgb(25, 25, 40);
// ...repeated in every demo
```

There's no built-in palette. The ui/types.ts has `WHITE` internally but doesn't export it.

### Proposed Fix

Export a small palette from `ui/types.ts`:

```ts
export const Colors = {
  white: rgb(255, 255, 255),
  black: rgb(0, 0, 0),
  red: rgb(220, 50, 50),
  green: rgb(50, 200, 50),
  blue: rgb(50, 100, 220),
  yellow: rgb(240, 220, 50),
  // ... 10-15 common colors
};
```

This eliminates boilerplate and ensures consistent coloring across games. Already available in runtime/ui/colors.ts based on test output — just needs better documentation/promotion.

---

## Summary: Highest Impact Changes

Ranked by (impact on visual quality x ease of implementation):

| # | Change | Impact | Effort | Status |
|---|--------|--------|--------|--------|
| 1 | Add drawRectangle() to shapes | High | Trivial (10 lines) | **DONE** |
| 2 | Add screenSpace to drawSprite() | High | Small (20 lines) | **DONE** |
| 3 | Add "What Should I Use?" decision tree to AGENTS.md | High | Docs only | **DONE** |
| 4 | Default drawText() to MSDF when available | High | Small (5 lines) | **DONE** |
| 5 | Update hello-world + platformer + breakout demos to modern patterns | High | Medium | **DONE** |
| 6 | Add Layer Map diagram to AGENTS.md | Medium | Docs only | **DONE** |
| 7 | Add textured particle support | Medium | Medium | **DONE** |
| 8 | Normalize all doc examples to use rgb() not raw floats | Medium | Docs only | **DONE** |
| 9 | Export a Colors palette | Low | Trivial | Already done (Colors in ui/colors.ts) |
| 10 | Add color channel validation in debug mode | Low | Small | **DONE** |
