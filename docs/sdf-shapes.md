# SDF Shapes -- Code-Defined Visuals

SDF (Signed Distance Function) shapes let agents create beautiful 2D visuals entirely through code. No image files needed. Shapes are resolution-independent, naturally anti-aliased, and composable.

## Quick Start

```ts
import {
  sdfCircle, sdfBox, sdfRoundedBox, sdfOffset, sdfSmoothUnion,
  sdfEntity, compileToWgsl,
} from "@arcane/runtime/rendering/sdf.ts";

// A glowing orb
sdfEntity({
  shape: sdfCircle(16),
  fill: { type: "glow", color: "#44aaff", intensity: 3.0 },
  position: [100, 100],
});

// A stone platform
sdfEntity({
  shape: sdfRoundedBox(60, 10, 3),
  fill: { type: "gradient", from: "#6b6b6b", to: "#3d3d3d", angle: 90 },
  position: [200, 300],
});

// A tree
const tree = sdfSmoothUnion(4,
  sdfRoundedBox(4, 15, 2),        // trunk
  sdfOffset(sdfCircle(12), 0, -20),  // main canopy
  sdfOffset(sdfCircle(9), -8, -15),  // left canopy
  sdfOffset(sdfCircle(9), 8, -15),   // right canopy
  sdfOffset(sdfCircle(7), 0, -30),   // top
);
sdfEntity({
  shape: tree,
  fill: { type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 },
  position: [400, 280],
});
```

## How It Works

```
TypeScript SDF API
  sdfCircle(), sdfBox(), sdfSmoothUnion(), sdfOffset(), ...
           |
           v
      SdfNode tree (pure data, no side effects)
           |
    compileToWgsl()
           |
           v
      WGSL expression string
      e.g. "op_smooth_union(sd_circle(p, 12.0), sd_box((p - vec2<f32>(0.0, -20.0)), ...))"
           |
    sdfEntity() registers shape + fill
           |
           v
  Rust SDF pipeline (core/renderer/sdf.rs)
    - Generates complete WGSL shader per unique (expression, fill) pair
    - Caches compiled GPU pipelines by hash
    - Renders as instanced screen-aligned quads
           |
           v
  GPU fragment shader evaluates SDF per-pixel
    - Smooth edges via smoothstep anti-aliasing
    - Fill determines coloring (solid, gradient, glow, etc.)
```

SDF nodes are pure data structures. Constructing them has no side effects -- they only describe a shape tree. The actual GPU work happens when the renderer processes registered entities each frame.

## Primitive Reference

### Basic Shapes

#### `sdfCircle(radius)`

A circle centered at the origin.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Circle radius in world units |

```ts
const orb = sdfCircle(20);
// Looks like: a perfect circle, 40 units across
```

#### `sdfBox(width, height)`

An axis-aligned rectangle. Parameters are **half-extents** (half the total width/height).

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Half-width of the box |
| `height` | `number` | Half-height of the box |

```ts
const platform = sdfBox(50, 8);
// Looks like: a 100x16 rectangle, sharp corners
```

#### `sdfRoundedBox(width, height, radius)`

A rectangle with rounded corners.

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Half-width of the box |
| `height` | `number` | Half-height of the box |
| `radius` | `number \| [tl, tr, br, bl]` | Corner radius (uniform or per-corner) |

```ts
const button = sdfRoundedBox(40, 12, 4);
// Looks like: a pill-shaped rectangle

const badge = sdfRoundedBox(20, 20, [8, 8, 0, 0]);
// Looks like: rounded top, sharp bottom
```

#### `sdfEllipse(width, height)`

An ellipse (stretched circle).

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Semi-major axis width |
| `height` | `number` | Semi-minor axis height |

```ts
const shadow = sdfEllipse(30, 8);
// Looks like: a wide, flat oval (good for drop shadows)
```

#### `sdfSegment(from, to)`

A line segment between two points. Returns unsigned distance (no interior).

| Param | Type | Description |
|-------|------|-------------|
| `from` | `[x, y]` | Start point |
| `to` | `[x, y]` | End point |

```ts
const beam = sdfRound(sdfSegment([0, 0], [40, 0]), 2);
// Looks like: a thick horizontal line (use sdfRound() to give it width)
```

#### `sdfTriangle(p0, p1, p2)`

A triangle defined by three vertices.

| Param | Type | Description |
|-------|------|-------------|
| `p0` | `[x, y]` | First vertex |
| `p1` | `[x, y]` | Second vertex |
| `p2` | `[x, y]` | Third vertex |

```ts
const arrowHead = sdfTriangle([0, -15], [-10, 5], [10, 5]);
// Looks like: an upward-pointing triangle
```

### Organic Shapes

#### `sdfEgg(ra, rb)`

An egg shape, wider at the bottom, narrower at the top.

| Param | Type | Description |
|-------|------|-------------|
| `ra` | `number` | Primary (large) radius |
| `rb` | `number` | Bulge factor (small radius) |

```ts
const eggShape = sdfEgg(15, 5);
// Looks like: an egg oriented vertically, wider at bottom
```

#### `sdfHeart(size)`

A heart shape with the point facing downward.

| Param | Type | Description |
|-------|------|-------------|
| `size` | `number` | Overall heart size |

```ts
const hp = sdfHeart(12);
// Looks like: a heart symbol, point down
```

#### `sdfMoon(d, ra, rb)`

A crescent moon shape, created by subtracting one circle from another.

| Param | Type | Description |
|-------|------|-------------|
| `d` | `number` | Distance between circle centers |
| `ra` | `number` | Outer circle radius |
| `rb` | `number` | Inner circle radius (subtracted) |

```ts
const crescent = sdfMoon(8, 15, 13);
// Looks like: a crescent moon, opening to the right
```

#### `vesica(r, d)`

A vesica piscis (lens/almond shape) formed by the intersection of two circles.

| Param | Type | Description |
|-------|------|-------------|
| `r` | `number` | Circle radius |
| `d` | `number` | Half-distance between circle centers |

```ts
const lens = vesica(20, 8);
// Looks like: an almond/eye shape
```

### Geometric Shapes

#### `sdfHexagon(radius)`

A regular hexagon.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Inradius (flat-to-flat distance / 2) |

```ts
const tile = sdfHexagon(16);
// Looks like: a flat-topped hexagon
```

#### `sdfPentagon(radius)`

A regular pentagon.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Inradius |

```ts
const pent = sdfPentagon(14);
// Looks like: a regular five-sided polygon
```

#### `octogon(radius)`

A regular octagon.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Inradius |

```ts
const stop = octogon(16);
// Looks like: a stop-sign shape
```

#### `star5(radius, innerFactor)`

A five-pointed star.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Outer radius |
| `innerFactor` | `number` | Inner radius factor (0.382 = regular star) |

```ts
const twinkle = star5(12, 0.4);
// Looks like: a classic five-pointed star
```

#### `sdfStar(radius, points, innerRadius)`

A general n-pointed star with configurable sharpness.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Outer radius |
| `points` | `number` | Number of star points |
| `innerRadius` | `number` | Angular sharpness (2 = minimal, higher = sharper) |

```ts
const burst = sdfStar(16, 8, 3);
// Looks like: an 8-pointed star with moderate sharpness
```

#### `sdfCross(width, height, radius)`

A cross (plus sign) shape.

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Arm half-length |
| `height` | `number` | Arm half-thickness |
| `radius` | `number` | Corner rounding radius |

```ts
const plus = sdfCross(12, 4, 1);
// Looks like: a + sign with slightly rounded corners
```

#### `sdfRing(radius, width)`

A ring (annulus).

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Center radius |
| `width` | `number` | Ring thickness |

```ts
const halo = sdfRing(20, 3);
// Looks like: a thin ring
```

#### `pie(sinCos, radius)`

A circular sector (pie slice). The `sinCos` parameter is `vec2(sin, cos)` of the half-angle.

**Note:** This primitive takes raw sin/cos values. For a pie with half-angle `a` degrees:
```ts
const a = (degrees * Math.PI) / 180;
// pie expects sinCos as the first param in WGSL, but the TS API
// passes params directly: pie(sin(a), cos(a), radius)
```

#### `rounded_x(width, radius)`

A rounded X (multiplication sign) shape.

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Arm half-width |
| `radius` | `number` | Tip rounding radius |

```ts
const closeBtn = sdfRound(sdfCross(8, 2, 0), 1);
// Alternative: use rounded_x for a more natural X shape
```

### Arc

#### `arc(sinCos, radius, thickness)`

A circular arc (partial ring). The arc opens upward, centered on the y-axis.

| Param | Type | Description |
|-------|------|-------------|
| `sinCos` | `[sin, cos]` of half-angle | Angular opening |
| `radius` | `number` | Arc radius |
| `thickness` | `number` | Line thickness |

## Composition Operations

### `sdfUnion(...shapes)`

Combine shapes. The result contains the interior of all input shapes.

```ts
const snowman = sdfUnion(
  sdfCircle(20),                   // body
  sdfOffset(sdfCircle(14), 0, -30),  // head
  sdfOffset(sdfCircle(10), 0, -54),  // hat? top
);
// Looks like: three circles stacked vertically with hard edges at overlap
```

### `sdfSubtract(base, ...cutouts)`

Carve cutout shapes from a base shape. The interior of each cutout becomes exterior.

```ts
const window = sdfSubtract(
  sdfBox(20, 20),                 // wall
  sdfBox(6, 6),                   // window hole
);
// Looks like: a square with a square hole in the center
```

### `sdfIntersect(...shapes)`

Keep only the region inside ALL input shapes.

```ts
const lens = sdfIntersect(
  sdfOffset(sdfCircle(20), -8, 0),
  sdfOffset(sdfCircle(20), 8, 0),
);
// Looks like: a lens/vesica shape (overlap of two circles)
```

### `sdfSmoothUnion(k, ...shapes)`

Blend shapes together with smooth transitions at boundaries. The `k` parameter controls blend radius -- larger values produce smoother, more organic merging.

| `k` value | Effect |
|-----------|--------|
| 0-2 | Subtle blend, barely visible |
| 3-6 | Natural organic look (recommended for trees, clouds) |
| 8-12 | Very soft, blobby shapes |
| 15+ | Extreme melting effect |

```ts
const blob = sdfSmoothUnion(5,
  sdfCircle(15),
  sdfOffset(sdfCircle(12), 20, 0),
  sdfOffset(sdfCircle(10), 10, -15),
);
// Looks like: an organic blob, shapes melt into each other
```

### `sdfSmoothSubtract(k, base, ...cutouts)`

Smooth subtraction with a fillet at the cut boundary.

```ts
const bitten = sdfSmoothSubtract(3,
  sdfCircle(20),                   // apple
  sdfOffset(sdfCircle(8), 15, -5),   // bite
);
// Looks like: a circle with a smooth bite taken out
```

## Transforms

### `sdfOffset(shape, x, y)`

Translate a shape by (x, y).

```ts
const raised = sdfOffset(sdfCircle(10), 0, -30);
// Moves the circle 30 units up (negative y = up in screen coords)
```

### `sdfRotate(shape, degrees)`

Rotate a shape around the origin. Angle in degrees.

```ts
const diamond = sdfRotate(sdfBox(10, 10), 45);
// Looks like: a diamond (square rotated 45 degrees)
```

### `sdfScale(shape, factor)`

Uniformly scale a shape. Factor > 1 enlarges, < 1 shrinks.

```ts
const big = sdfScale(star5(10, 0.4), 2.0);
// Looks like: a star twice the original size
```

### `sdfMirrorX(shape)`

Mirror a shape along the X axis (left-right symmetry). Build one half, get both.

```ts
const wing = sdfMirrorX(
  sdfOffset(sdfEllipse(20, 8), 15, 0),  // one wing
);
// Looks like: two wings mirrored around the center
```

### `sdfRepeat(shape, spacingX, spacingY)`

Repeat a shape infinitely on a 2D grid. Each repetition is spaced by (spacingX, spacingY).

```ts
const dots = sdfRepeat(sdfCircle(3), 20, 20);
// Looks like: an infinite grid of small circles, 20 units apart
```

## Modifiers

### `sdfRound(shape, radius)`

Expand the boundary outward, rounding all corners and edges. Equivalent to a Minkowski sum with a circle.

```ts
const softBox = sdfRound(sdfBox(15, 15), 3);
// Looks like: a box with rounded corners (similar to sdfRoundedBox but works on any shape)

const thickLine = sdfRound(sdfSegment([0, 0], [40, 0]), 2);
// Looks like: a horizontal capsule (gives width to a zero-width segment)
```

### `sdfOutline(shape, thickness)`

Convert a filled shape into a hollow outline (onion skinning).

```ts
const ringFromCircle = sdfOutline(sdfCircle(20), 3);
// Looks like: a ring with 3-unit walls (same as sdfRing(20, 3))

const hollowStar = sdfOutline(star5(15, 0.4), 2);
// Looks like: a star outline (no fill, just the border)
```

## Fill Types

### Solid

Flat color inside the shape, transparent outside.

```ts
fill: { type: "solid", color: "#ff4444" }
```

### Outline

Stroke along the shape boundary only, transparent interior.

```ts
fill: { type: "outline", color: "#ffffff", thickness: 2 }
```

### Solid with Outline

Filled interior with a differently-colored stroke along the edge.

```ts
fill: { type: "solid_outline", fill: "#3366cc", outline: "#ffffff", thickness: 2 }
```

### Gradient

Linear gradient mapped through a rotation angle. The angle is in degrees: 0 = left-to-right, 90 = bottom-to-top.

```ts
fill: { type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 }
// Brown at bottom, green at top (good for trees)
```

### Glow

Exponential falloff outside the shape boundary. Creates a bloom/halo effect. The shape interior is fully lit, and the glow fades with distance.

```ts
fill: { type: "glow", color: "#ffcc00", intensity: 4.0 }
// intensity controls falloff speed: higher = tighter glow, lower = wider spread
```

| Intensity | Effect |
|-----------|--------|
| 1-2 | Wide, diffuse glow |
| 3-5 | Medium glow (good for torches, collectibles) |
| 6-10 | Tight halo (good for sparks, particles) |

### Cosine Palette

Procedural coloring using Inigo Quilez's cosine color palette formula: `color = a + b * cos(2*PI * (c*t + d))` where `t` is derived from the SDF distance. Produces rich, organic color variation across the shape.

```ts
fill: {
  type: "cosine_palette",
  a: [0.5, 0.5, 0.5],   // base color offset
  b: [0.5, 0.5, 0.5],   // amplitude
  c: [1.0, 1.0, 1.0],   // frequency
  d: [0.00, 0.33, 0.67], // phase shift per channel
}
// Rainbow palette -- classic cosine gradient
```

Common presets:

```ts
// Sunset: warm orange-to-purple
{ a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 0.5], d: [0.0, 0.1, 0.2] }

// Ocean: deep blue-to-teal
{ a: [0.0, 0.5, 0.5], b: [0.0, 0.5, 0.5], c: [0.0, 0.5, 0.33], d: [0.0, 0.2, 0.33] }

// Lava: dark red-to-bright orange
{ a: [0.5, 0.2, 0.0], b: [0.5, 0.3, 0.0], c: [0.8, 0.4, 0.0], d: [0.0, 0.0, 0.0] }

// Forest: earthy green-to-brown
{ a: [0.3, 0.4, 0.2], b: [0.2, 0.3, 0.1], c: [1.0, 0.5, 0.5], d: [0.0, 0.15, 0.2] }
```

## Common SDF Recipes

Copy-paste ready recipes for common game entities. Each includes the shape, suggested fill, a description of what it looks like, and tags for discoverability.

### Tree (Oak)

```ts
const tree = sdfSmoothUnion(4,
  sdfRoundedBox(4, 15, 2),        // trunk
  sdfOffset(sdfCircle(14), 0, -20),  // main canopy
  sdfOffset(sdfCircle(10), -9, -15), // left canopy
  sdfOffset(sdfCircle(10), 9, -15),  // right canopy
  sdfOffset(sdfCircle(8), 0, -32),   // top
);
```

**Fill:** `{ type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 }`

**Looks like:** A deciduous tree with a brown trunk blending into a rounded green canopy. The smooth union merges the foliage circles into one organic mass.

**Tags:** nature, decoration, world

---

### Tree (Pine)

```ts
const pine = sdfSmoothUnion(2,
  sdfRoundedBox(3, 18, 1),                       // trunk
  sdfOffset(sdfTriangle([0, -50], [-18, -15], [18, -15]), 0, 0),  // bottom tier
  sdfOffset(sdfTriangle([0, -55], [-14, -25], [14, -25]), 0, 0),  // middle tier
  sdfOffset(sdfTriangle([0, -60], [-10, -35], [10, -35]), 0, 0),  // top tier
);
```

**Fill:** `{ type: "gradient", from: "#4a2a0a", to: "#1a5a2a", angle: 90 }`

**Looks like:** A conifer tree with layered triangular branches tapering upward over a narrow trunk.

**Tags:** nature, decoration, world

---

### Mountain

```ts
const mountain = sdfSmoothUnion(6,
  sdfTriangle([0, -40], [-50, 10], [50, 10]),       // main peak
  sdfOffset(sdfTriangle([0, -25], [-35, 10], [35, 10]), -20, 5), // left foothill
  sdfOffset(sdfTriangle([0, -20], [-25, 10], [25, 10]), 25, 8),  // right foothill
);
```

**Fill:** `{ type: "gradient", from: "#4a4a5a", to: "#8a8a9a", angle: 90 }`

**Looks like:** A mountain range with one tall central peak and two lower foothills blending into it. Gray rock gradient, darker at base.

**Tags:** terrain, background, nature

---

### Cloud

```ts
const cloud = sdfSmoothUnion(6,
  sdfEllipse(20, 10),              // center body
  sdfOffset(sdfCircle(12), -14, -4),  // left bump
  sdfOffset(sdfCircle(14), 8, -6),    // right bump
  sdfOffset(sdfCircle(9), -22, 2),    // far left
  sdfOffset(sdfCircle(10), 20, 0),    // far right
);
```

**Fill:** `{ type: "solid", color: "#e8e8f0" }`

**Looks like:** A fluffy cumulus cloud with irregular bumps along the top. The high smooth-union factor makes the circles melt together into one continuous puffy shape.

**Tags:** nature, decoration, background, sky

---

### Platform (Stone)

```ts
const stonePlatform = sdfRound(sdfBox(48, 6), 2);
```

**Fill:** `{ type: "solid_outline", fill: "#6b6b6b", outline: "#4a4a4a", thickness: 1.5 }`

**Looks like:** A wide, solid stone platform with a subtle dark outline. Clean and minimal.

**Tags:** terrain, platform, world

---

### Platform (Wooden)

```ts
const woodPlatform = sdfRoundedBox(48, 5, 1);
```

**Fill:** `{ type: "gradient", from: "#8B6914", to: "#A07828", angle: 0 }`

**Looks like:** A wooden plank platform with a horizontal wood-grain gradient from darker to lighter brown.

**Tags:** terrain, platform, world

---

### Gem / Diamond Collectible

```ts
const gem = sdfRotate(sdfBox(8, 12), 0);
// Or for a more faceted look:
const facetedGem = sdfIntersect(
  sdfRotate(sdfBox(10, 14), 0),
  sdfRotate(sdfBox(10, 14), 30),
);
```

**Fill:** `{ type: "glow", color: "#44ddff", intensity: 3.0 }`

**Looks like:** A glowing diamond shape. The glow fill makes it shimmer and stand out against any background.

**Tags:** collectible, pickup, item

---

### Heart (Health Pickup)

```ts
const healthHeart = sdfHeart(10);
```

**Fill:** `{ type: "glow", color: "#ff3355", intensity: 4.0 }`

**Looks like:** A classic heart symbol with a warm red glow, point facing down.

**Tags:** collectible, pickup, health, UI

---

### Star (Bonus Collectible)

```ts
const bonusStar = star5(12, 0.4);
```

**Fill:** `{ type: "glow", color: "#ffdd00", intensity: 3.5 }`

**Looks like:** A five-pointed star with a bright golden glow.

**Tags:** collectible, pickup, bonus

---

### Shield

```ts
const shield = sdfSmoothUnion(2,
  sdfIntersect(
    sdfCircle(16),
    sdfOffset(sdfBox(16, 20), 0, 4),  // clip bottom into flat base
  ),
  sdfOffset(sdfCross(10, 3, 0), 0, 0),  // cross emblem
);
```

**Fill:** `{ type: "solid_outline", fill: "#3355aa", outline: "#aabbcc", thickness: 2 }`

**Looks like:** A blue shield with a silver border and a cross emblem. Rounded top, flat bottom.

**Tags:** item, equipment, UI, defense

---

### House (Simple)

```ts
const house = sdfUnion(
  sdfBox(16, 12),                                    // walls
  sdfOffset(sdfTriangle([0, -20], [-20, -4], [20, -4]), 0, 0),  // roof
);
```

**Fill:** `{ type: "gradient", from: "#8B7355", to: "#CC4444", angle: 90 }`

**Looks like:** A simple house with brown walls and a red triangular roof.

**Tags:** building, decoration, world

---

### Sword

```ts
const sword = sdfUnion(
  sdfRoundedBox(2, 20, 1),          // blade
  sdfOffset(sdfRoundedBox(7, 2, 1), 0, 16),  // crossguard
  sdfOffset(sdfRoundedBox(2, 6, 1), 0, 22),  // grip
  sdfOffset(sdfCircle(3), 0, 28),     // pommel
);
```

**Fill:** `{ type: "gradient", from: "#ccccdd", to: "#666677", angle: 90 }`

**Looks like:** A medieval sword with a straight blade, crossguard, grip, and round pommel. Metallic silver gradient.

**Tags:** item, equipment, weapon

---

### Arrow

```ts
const arrow = sdfUnion(
  sdfRoundedBox(1, 18, 0.5),                         // shaft
  sdfOffset(sdfTriangle([0, -22], [-5, -14], [5, -14]), 0, 0), // head
);
```

**Fill:** `{ type: "solid", color: "#aa8844" }`

**Looks like:** A simple arrow with a thin wooden shaft and a triangular head pointing upward.

**Tags:** item, projectile, weapon

---

### Coin

```ts
const coin = sdfOutline(sdfCircle(10), 2);
// Or with inner detail:
const detailedCoin = sdfUnion(
  sdfOutline(sdfCircle(10), 2),
  sdfCircle(2),  // center dot
);
```

**Fill:** `{ type: "solid", color: "#ffcc00" }`

**Looks like:** A gold coin, rendered as a thick ring with a center dot.

**Tags:** collectible, currency, pickup

---

### Water Surface

```ts
const water = sdfSmoothUnion(8,
  sdfEllipse(60, 4),
  sdfOffset(sdfEllipse(40, 3), 15, -2),
  sdfOffset(sdfEllipse(35, 3), -20, 1),
);
```

**Fill:** `{ type: "gradient", from: "#1a4a8a", to: "#3a8acc", angle: 0 }`

**Looks like:** A wavy water surface with smooth undulations. The gradient runs horizontally for a water shimmer effect.

**Tags:** terrain, water, nature, decoration

---

### Grass Clump

```ts
const grass = sdfSmoothUnion(2,
  sdfOffset(sdfEllipse(3, 10), -4, 0),
  sdfOffset(sdfEllipse(3, 12), 0, -1),
  sdfOffset(sdfEllipse(3, 10), 4, 0),
  sdfOffset(sdfEllipse(2, 8), -7, 2),
  sdfOffset(sdfEllipse(2, 8), 7, 2),
);
```

**Fill:** `{ type: "gradient", from: "#2a6a1a", to: "#4a9a3a", angle: 90 }`

**Looks like:** A small clump of grass blades, darker at the base and lighter at the tips.

**Tags:** nature, decoration, ground

---

### Bush

```ts
const bush = sdfSmoothUnion(5,
  sdfEllipse(14, 10),
  sdfOffset(sdfCircle(8), -10, -3),
  sdfOffset(sdfCircle(9), 8, -4),
  sdfOffset(sdfCircle(6), 0, -10),
);
```

**Fill:** `{ type: "gradient", from: "#2a5a1a", to: "#3a8a2a", angle: 90 }`

**Looks like:** A round, bushy shrub. Dark green at the bottom, lighter at the top.

**Tags:** nature, decoration, world

---

### Rock / Boulder

```ts
const rock = sdfSmoothUnion(3,
  sdfEllipse(14, 10),
  sdfOffset(sdfEllipse(10, 8), 6, -3),
  sdfOffset(sdfEllipse(8, 6), -5, -5),
);
```

**Fill:** `{ type: "gradient", from: "#4a4a4a", to: "#7a7a7a", angle: 90 }`

**Looks like:** An irregular rocky boulder with lumpy edges. Gray gradient, darker at base.

**Tags:** terrain, decoration, nature, obstacle

---

### Castle Turret

```ts
const turret = sdfUnion(
  sdfBox(12, 18),                                          // tower body
  sdfOffset(sdfBox(15, 3), 0, -18),                           // parapet base
  // Crenellations
  sdfOffset(sdfBox(3, 4), -10, -24),
  sdfOffset(sdfBox(3, 4), 0, -24),
  sdfOffset(sdfBox(3, 4), 10, -24),
);
```

**Fill:** `{ type: "solid_outline", fill: "#8a8a7a", outline: "#5a5a4a", thickness: 1.5 }`

**Looks like:** A stone castle turret with three crenellations (merlons) along the top.

**Tags:** building, decoration, world, medieval

---

### Flower

```ts
const petal = sdfOffset(sdfEllipse(4, 8), 0, -8);
const flower = sdfSmoothUnion(2,
  sdfCircle(4),                  // center
  petal,                      // top petal
  sdfRotate(petal, 72),          // petals around center
  sdfRotate(petal, 144),
  sdfRotate(petal, 216),
  sdfRotate(petal, 288),
);
```

**Fill:** `{ type: "gradient", from: "#ffaa00", to: "#ff4488", angle: 90 }`

**Looks like:** A five-petaled flower with an orange center blending to pink petals.

**Tags:** nature, decoration, collectible

---

### Sun

```ts
const sunRay = sdfOffset(sdfRoundedBox(2, 8, 1), 0, -18);
const sun = sdfSmoothUnion(3,
  sdfCircle(10),
  sunRay,
  sdfRotate(sunRay, 45),
  sdfRotate(sunRay, 90),
  sdfRotate(sunRay, 135),
  sdfRotate(sunRay, 180),
  sdfRotate(sunRay, 225),
  sdfRotate(sunRay, 270),
  sdfRotate(sunRay, 315),
);
```

**Fill:** `{ type: "glow", color: "#ffdd44", intensity: 2.0 }`

**Looks like:** A sun with eight rays radiating outward. The glow fill gives it a warm halo.

**Tags:** sky, background, decoration, nature

---

### Moon (Crescent)

```ts
const crescentMoon = sdfMoon(8, 14, 12);
```

**Fill:** `{ type: "solid", color: "#eeeedd" }`

**Looks like:** A crescent moon shape, pale yellow-white.

**Tags:** sky, background, decoration, nature, night

---

### Torch / Flame

```ts
const flame = sdfSmoothUnion(4,
  sdfEgg(8, 3),                     // main flame body
  sdfOffset(sdfEgg(5, 2), 0, -10),    // upper tongue
  sdfOffset(sdfCircle(3), -3, -4),    // left flicker
  sdfOffset(sdfCircle(3), 3, -4),     // right flicker
);
const torch = sdfUnion(
  sdfOffset(sdfRoundedBox(3, 10, 1), 0, 16),  // handle
  flame,                                   // flame
);
```

**Fill (flame):** `{ type: "glow", color: "#ff8822", intensity: 2.5 }`

**Fill (complete torch):** `{ type: "gradient", from: "#8B6914", to: "#ff8822", angle: 90 }`

**Looks like:** A torch with a wooden handle and a flickering flame. The glow fill on the flame alone gives a warm light effect.

**Tags:** decoration, light, item, medieval

---

### Key

```ts
const key = sdfUnion(
  sdfRing(5, 2),                          // bow (ring at top)
  sdfOffset(sdfRoundedBox(1.5, 10, 0.5), 0, 12),  // shaft
  sdfOffset(sdfRoundedBox(4, 1.5, 0.5), 2, 20),   // bit (teeth)
  sdfOffset(sdfRoundedBox(3, 1.5, 0.5), 1.5, 16), // second bit
);
```

**Fill:** `{ type: "solid", color: "#ddaa33" }`

**Looks like:** A golden key with a circular bow, straight shaft, and two teeth.

**Tags:** collectible, item, key, pickup

---

### Potion Bottle

```ts
const potion = sdfSmoothUnion(2,
  sdfEllipse(8, 10),                         // bottle body
  sdfOffset(sdfRoundedBox(3, 5, 1), 0, -12),   // neck
  sdfOffset(sdfRoundedBox(5, 2, 1), 0, -16),   // cap
);
```

**Fill:** `{ type: "gradient", from: "#6622aa", to: "#aa44ff", angle: 90 }`

**Looks like:** A round potion bottle with a narrow neck and cap, filled with purple liquid.

**Tags:** item, collectible, pickup, potion

---

### Skull

```ts
const skull = sdfSmoothUnion(2,
  sdfEllipse(10, 12),                        // cranium
  sdfOffset(sdfRoundedBox(8, 4, 2), 0, 10),    // jaw
);
// Subtract eye sockets and nose
const skullComplete = sdfSubtract(
  skull,
  sdfOffset(sdfCircle(3), -4, -2),    // left eye
  sdfOffset(sdfCircle(3), 4, -2),     // right eye
  sdfOffset(sdfTriangle([0, 3], [-2, 6], [2, 6]), 0, 0),  // nose
);
```

**Fill:** `{ type: "solid_outline", fill: "#e8e0d0", outline: "#888070", thickness: 1 }`

**Looks like:** A cartoon skull with round eye sockets and a triangular nose hole.

**Tags:** decoration, enemy, item, danger

---

### Crystal

```ts
const crystal = sdfIntersect(
  sdfRotate(sdfBox(8, 16), 0),
  sdfRotate(sdfBox(8, 16), 30),
  sdfRotate(sdfBox(8, 16), -30),
);
```

**Fill:** `{ type: "glow", color: "#88ccff", intensity: 3.0 }`

**Looks like:** A hexagonal crystal shape formed by intersecting three rotated rectangles. The glow fill gives it a magical shimmer.

**Tags:** collectible, decoration, magical, item

---

### Flag

```ts
const flag = sdfUnion(
  sdfRoundedBox(1.5, 25, 0.5),                                // pole
  sdfOffset(sdfTriangle([0, -25], [20, -20], [0, -15]), 0, 0),   // flag pennant
);
```

**Fill:** `{ type: "gradient", from: "#666666", to: "#cc2222", angle: 0 }`

**Looks like:** A flagpole with a red triangular pennant. Gray pole on the left, red flag flowing right.

**Tags:** decoration, world, checkpoint

## When to Use SDF vs Sprites

| Use SDF for | Use Sprites for |
|---|---|
| Platforms, terrain | Player characters |
| Backgrounds, sky elements | NPCs with faces/expressions |
| Simple collectibles (gems, coins, stars) | Complex creatures |
| UI elements (buttons, indicators) | Detailed items with fine art |
| Effects (glow, particles) | Animation sequences |
| Trees, clouds, rocks, bushes | Pixel art styles |
| Procedural decorations | Pre-drawn tilesets |

**Rule of thumb:** Use SDF for anything that could reasonably be described as "a shape" or "shapes combined together." Use sprites for anything that needs artist-drawn detail, facial expressions, or frame-by-frame animation.

## Performance Notes

- SDF entities sharing the same shape + fill are instanced into a **single draw call**. Drawing 100 trees with the same SDF = 1 draw call.
- Each unique (expression, fill) pair compiles to its own WGSL shader and render pipeline. Aim for **fewer than 100 unique SDF expressions** per scene.
- Simple shapes (`sdfCircle`, `sdfBox`) evaluate in nanoseconds per pixel. They are extremely fast.
- Complex compositions (10+ operations) are still fast for decoration and terrain. The GPU evaluates SDF math efficiently.
- Use `sdfRepeat()` for tiled patterns (e.g., a grid of dots) instead of creating separate entities.
- Pipeline compilation happens once and is cached by hash. Subsequent frames reuse the cached pipeline.

## Tips for Agents

1. **Start with SDF for everything**, switch to sprites only when a shape is too complex to express as geometry (characters, creatures, detailed items).
2. **Use `sdfSmoothUnion` with k=3-6** for organic, natural-looking shapes. Trees, clouds, and rocks all benefit from smooth blending.
3. **Layer gradient fills for depth.** Use angle 90 (bottom-to-top) with dark colors at the bottom and light at the top. This gives a natural sense of ground shadow and sky light.
4. **Use `glow` fill for collectibles and magical effects.** It makes items instantly recognizable as interactive.
5. **Extract palette from your first sprite** and use those same hex colors in SDF fills. This keeps the visual style cohesive across SDF and sprite content.
6. **Combine transforms for complex effects.** A `sdfMirrorX` wrapping an `sdfOffset` shape builds symmetric designs with half the work.
7. **Test shapes with `compileToWgsl()`** to see the generated WGSL expression. If the expression is extremely long (hundreds of characters), consider simplifying.
8. **Use `solid_outline` fill** to make shapes pop against busy backgrounds. The outline provides visual separation.
9. **Reserve `cosine_palette` fill** for magical/alien/special effects. It produces complex color patterns that draw attention.
10. **Keep recipes in constants** so the same shape tree can be reused across many entities without recompilation:
    ```ts
    // Define once
    const TREE_SHAPE = sdfSmoothUnion(4, ...);
    const TREE_FILL: SdfFill = { type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 };

    // Stamp many times -- same pipeline, instanced rendering
    for (let i = 0; i < 20; i++) {
      sdfEntity({ shape: TREE_SHAPE, fill: TREE_FILL, position: [i * 60, 280] });
    }
    ```
