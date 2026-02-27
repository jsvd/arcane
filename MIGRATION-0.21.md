# Migration Guide: v0.20 → v0.21

## Breaking Changes

### 1. Vec2 API: Tuples → Objects

**What changed:** All SDF functions now use `{x, y}` objects instead of `[x, y]` tuples.

**Before (v0.20):**
```typescript
const shape = sdfCircle([100, 100], 50);
const moved = sdfOffset(shape, [10, 20]);
```

**After (v0.21):**
```typescript
const shape = sdfCircle({x: 100, y: 100}, 50);
const moved = sdfOffset(shape, {x: 10, y: 20});
```

**Why:** Objects are more discoverable (`.x` autocompletes), self-documenting (`{x, y}` vs `[0, 1]`), and prevent swapped coordinates.

**Migration:** Search for `sdf` function calls and replace tuple literals with object literals. This affects:
- `sdfCircle`, `sdfBox`, `sdfLine`, `sdfPolygon`, etc. (position parameters)
- `sdfOffset`, `sdfScale`, `sdfRotate` (transform parameters)

### 2. SDF Glow: intensity → spread

**What changed:** The glow fill parameter is now `spread` (higher = bigger glow) instead of `intensity` (higher = smaller glow).

**Before (v0.20):**
```typescript
fill: glow("#ff6600", 3)  // smaller glow
```

**After (v0.21):**
```typescript
fill: glow("#ff6600", 30) // bigger glow
```

**Why:** The old `intensity` parameter had backwards semantics. Higher values should make the effect bigger, not smaller.

**Migration:** Replace `glow(color, intensity)` calls:
- Old `intensity: 1` (large) → new `spread: 50`
- Old `intensity: 5` (small) → new `spread: 10`
- Roughly: `spread ≈ 50 / intensity`

### 3. Asset Paths: Always Project-Relative

**What changed:** Asset paths are now always relative to the current working directory, not the entry file's parent.

**Before (v0.20):**
```typescript
// In demos/my-game/src/visual.ts
loadTexture("id", "../assets/sprite.png")  // relative to src/
```

**After (v0.21):**
```typescript
// In demos/my-game/src/visual.ts
loadTexture("id", "assets/sprite.png")     // relative to project root
```

**Why:** Eliminates confusion about whether paths are relative to the entry file or the project. Now they're always project-relative.

**Migration:** Remove `../` prefixes from asset paths if you were using entry-relative paths.

## New Features (Additive, No Migration Needed)

### 4. Particle Convenience API

**New functions:**
```typescript
// One-shot burst (explosion, impact, coin pickup)
drawBurst(x, y, {
  count: 20,
  velocityY: [-100, -20],
  startColor: { r: 1, g: 0.5, b: 0, a: 1 },
  endColor: { r: 0.5, g: 0, b: 0, a: 0 },
});

// Continuous stream (jetpack, torch, trail)
onFrame((dt) => {
  drawContinuous("jetpack", player.x, player.y, dt, {
    rate: 30,
    velocityY: [20, 40],
  });
});

// Cleanup
stopContinuous("jetpack");
```

**Old API still works:** `spawnEmitter()`, `updateParticles()`, `drawAllParticles()` are unchanged.

### 5. Tiled Sprites

**New function:**
```typescript
// Tile a 16x16 grass texture across a 320x240 area
drawTiledSprite({
  textureId: grassTex,
  x: 0, y: 0,
  w: 320, h: 240,
  tileW: 16, tileH: 16,
});
```

### 6. Unified Import Namespace

**New import style:**
```typescript
import { drawSprite, createStore, onFrame } from "arcane";
```

**Old imports still work:**
```typescript
import { drawSprite } from "@arcane/runtime/rendering";
import { createStore } from "@arcane/runtime/state";
```

### 7. Screenshot Command

**New CLI command:**
```bash
arcane screenshot output.png
```

Requires an active `arcane dev` session with MCP enabled.

### 8. KeyName Normalization

**New feature:** `isKeyDown()` and `isKeyPressed()` now accept multiple formats:
```typescript
isKeyDown("a")         // lowercase letter
isKeyDown("KeyA")      // DOM KeyboardEvent.code
isKeyDown("ArrowUp")   // arrow keys
isKeyDown("Digit1")    // number row
isKeyDown("F1")        // function keys
```

All normalize to the same internal representation.

## Upgrade Checklist

- [ ] Update SDF position/offset parameters from tuples to objects
- [ ] Update `glow()` calls: replace `intensity` with `spread` (inverse)
- [ ] Remove `../` prefixes from asset paths (now project-relative)
- [ ] (Optional) Adopt new particle API for simpler effects
- [ ] (Optional) Use `import from "arcane"` for cleaner imports
- [ ] Run `arcane test` to verify no regressions

## Questions?

See the [CHANGELOG](CHANGELOG.md) for full details or open an issue at https://github.com/jsvd/arcane/issues.
