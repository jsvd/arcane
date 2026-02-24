# SDF Shapes -- Code-Defined Visuals

SDF (Signed Distance Function) shapes let agents create beautiful 2D visuals entirely through code. No image files needed. Shapes are resolution-independent, naturally anti-aliased, and composable.

## Quick Start

```ts
import {
  circle, box, roundedBox, offset, smoothUnion,
  sdfEntity, compileToWgsl,
} from "@arcane/runtime/rendering/sdf.ts";

// A glowing orb
sdfEntity({
  shape: circle(16),
  fill: { type: "glow", color: "#44aaff", intensity: 3.0 },
  position: [100, 100],
});

// A stone platform
sdfEntity({
  shape: roundedBox(60, 10, 3),
  fill: { type: "gradient", from: "#6b6b6b", to: "#3d3d3d", angle: 90 },
  position: [200, 300],
});

// A tree
const tree = smoothUnion(4,
  roundedBox(4, 15, 2),        // trunk
  offset(circle(12), 0, -20),  // main canopy
  offset(circle(9), -8, -15),  // left canopy
  offset(circle(9), 8, -15),   // right canopy
  offset(circle(7), 0, -30),   // top
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
  circle(), box(), smoothUnion(), offset(), ...
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

#### `circle(radius)`

A circle centered at the origin.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Circle radius in world units |

```ts
const orb = circle(20);
// Looks like: a perfect circle, 40 units across
```

#### `box(width, height)`

An axis-aligned rectangle. Parameters are **half-extents** (half the total width/height).

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Half-width of the box |
| `height` | `number` | Half-height of the box |

```ts
const platform = box(50, 8);
// Looks like: a 100x16 rectangle, sharp corners
```

#### `roundedBox(width, height, radius)`

A rectangle with rounded corners.

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Half-width of the box |
| `height` | `number` | Half-height of the box |
| `radius` | `number \| [tl, tr, br, bl]` | Corner radius (uniform or per-corner) |

```ts
const button = roundedBox(40, 12, 4);
// Looks like: a pill-shaped rectangle

const badge = roundedBox(20, 20, [8, 8, 0, 0]);
// Looks like: rounded top, sharp bottom
```

#### `ellipse(width, height)`

An ellipse (stretched circle).

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Semi-major axis width |
| `height` | `number` | Semi-minor axis height |

```ts
const shadow = ellipse(30, 8);
// Looks like: a wide, flat oval (good for drop shadows)
```

#### `segment(from, to)`

A line segment between two points. Returns unsigned distance (no interior).

| Param | Type | Description |
|-------|------|-------------|
| `from` | `[x, y]` | Start point |
| `to` | `[x, y]` | End point |

```ts
const beam = round(segment([0, 0], [40, 0]), 2);
// Looks like: a thick horizontal line (use round() to give it width)
```

#### `triangle(p0, p1, p2)`

A triangle defined by three vertices.

| Param | Type | Description |
|-------|------|-------------|
| `p0` | `[x, y]` | First vertex |
| `p1` | `[x, y]` | Second vertex |
| `p2` | `[x, y]` | Third vertex |

```ts
const arrowHead = triangle([0, -15], [-10, 5], [10, 5]);
// Looks like: an upward-pointing triangle
```

### Organic Shapes

#### `egg(ra, rb)`

An egg shape, wider at the bottom, narrower at the top.

| Param | Type | Description |
|-------|------|-------------|
| `ra` | `number` | Primary (large) radius |
| `rb` | `number` | Bulge factor (small radius) |

```ts
const eggShape = egg(15, 5);
// Looks like: an egg oriented vertically, wider at bottom
```

#### `heart(size)`

A heart shape with the point facing downward.

| Param | Type | Description |
|-------|------|-------------|
| `size` | `number` | Overall heart size |

```ts
const hp = heart(12);
// Looks like: a heart symbol, point down
```

#### `moon(d, ra, rb)`

A crescent moon shape, created by subtracting one circle from another.

| Param | Type | Description |
|-------|------|-------------|
| `d` | `number` | Distance between circle centers |
| `ra` | `number` | Outer circle radius |
| `rb` | `number` | Inner circle radius (subtracted) |

```ts
const crescent = moon(8, 15, 13);
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

#### `hexagon(radius)`

A regular hexagon.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Inradius (flat-to-flat distance / 2) |

```ts
const tile = hexagon(16);
// Looks like: a flat-topped hexagon
```

#### `pentagon(radius)`

A regular pentagon.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Inradius |

```ts
const pent = pentagon(14);
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

#### `star(radius, points, innerRadius)`

A general n-pointed star with configurable sharpness.

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Outer radius |
| `points` | `number` | Number of star points |
| `innerRadius` | `number` | Angular sharpness (2 = minimal, higher = sharper) |

```ts
const burst = star(16, 8, 3);
// Looks like: an 8-pointed star with moderate sharpness
```

#### `cross(width, height, radius)`

A cross (plus sign) shape.

| Param | Type | Description |
|-------|------|-------------|
| `width` | `number` | Arm half-length |
| `height` | `number` | Arm half-thickness |
| `radius` | `number` | Corner rounding radius |

```ts
const plus = cross(12, 4, 1);
// Looks like: a + sign with slightly rounded corners
```

#### `ring(radius, width)`

A ring (annulus).

| Param | Type | Description |
|-------|------|-------------|
| `radius` | `number` | Center radius |
| `width` | `number` | Ring thickness |

```ts
const halo = ring(20, 3);
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
const closeBtn = round(cross(8, 2, 0), 1);
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

### `union(...shapes)`

Combine shapes. The result contains the interior of all input shapes.

```ts
const snowman = union(
  circle(20),                   // body
  offset(circle(14), 0, -30),  // head
  offset(circle(10), 0, -54),  // hat? top
);
// Looks like: three circles stacked vertically with hard edges at overlap
```

### `subtract(base, ...cutouts)`

Carve cutout shapes from a base shape. The interior of each cutout becomes exterior.

```ts
const window = subtract(
  box(20, 20),                 // wall
  box(6, 6),                   // window hole
);
// Looks like: a square with a square hole in the center
```

### `intersect(...shapes)`

Keep only the region inside ALL input shapes.

```ts
const lens = intersect(
  offset(circle(20), -8, 0),
  offset(circle(20), 8, 0),
);
// Looks like: a lens/vesica shape (overlap of two circles)
```

### `smoothUnion(k, ...shapes)`

Blend shapes together with smooth transitions at boundaries. The `k` parameter controls blend radius -- larger values produce smoother, more organic merging.

| `k` value | Effect |
|-----------|--------|
| 0-2 | Subtle blend, barely visible |
| 3-6 | Natural organic look (recommended for trees, clouds) |
| 8-12 | Very soft, blobby shapes |
| 15+ | Extreme melting effect |

```ts
const blob = smoothUnion(5,
  circle(15),
  offset(circle(12), 20, 0),
  offset(circle(10), 10, -15),
);
// Looks like: an organic blob, shapes melt into each other
```

### `smoothSubtract(k, base, ...cutouts)`

Smooth subtraction with a fillet at the cut boundary.

```ts
const bitten = smoothSubtract(3,
  circle(20),                   // apple
  offset(circle(8), 15, -5),   // bite
);
// Looks like: a circle with a smooth bite taken out
```

## Transforms

### `offset(shape, x, y)`

Translate a shape by (x, y).

```ts
const raised = offset(circle(10), 0, -30);
// Moves the circle 30 units up (negative y = up in screen coords)
```

### `rotate(shape, degrees)`

Rotate a shape around the origin. Angle in degrees.

```ts
const diamond = rotate(box(10, 10), 45);
// Looks like: a diamond (square rotated 45 degrees)
```

### `scale(shape, factor)`

Uniformly scale a shape. Factor > 1 enlarges, < 1 shrinks.

```ts
const big = scale(star5(10, 0.4), 2.0);
// Looks like: a star twice the original size
```

### `mirrorX(shape)`

Mirror a shape along the X axis (left-right symmetry). Build one half, get both.

```ts
const wing = mirrorX(
  offset(ellipse(20, 8), 15, 0),  // one wing
);
// Looks like: two wings mirrored around the center
```

### `repeat(shape, spacingX, spacingY)`

Repeat a shape infinitely on a 2D grid. Each repetition is spaced by (spacingX, spacingY).

```ts
const dots = repeat(circle(3), 20, 20);
// Looks like: an infinite grid of small circles, 20 units apart
```

## Modifiers

### `round(shape, radius)`

Expand the boundary outward, rounding all corners and edges. Equivalent to a Minkowski sum with a circle.

```ts
const softBox = round(box(15, 15), 3);
// Looks like: a box with rounded corners (similar to roundedBox but works on any shape)

const thickLine = round(segment([0, 0], [40, 0]), 2);
// Looks like: a horizontal capsule (gives width to a zero-width segment)
```

### `outline(shape, thickness)`

Convert a filled shape into a hollow outline (onion skinning).

```ts
const ringFromCircle = outline(circle(20), 3);
// Looks like: a ring with 3-unit walls (same as ring(20, 3))

const hollowStar = outline(star5(15, 0.4), 2);
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
const tree = smoothUnion(4,
  roundedBox(4, 15, 2),        // trunk
  offset(circle(14), 0, -20),  // main canopy
  offset(circle(10), -9, -15), // left canopy
  offset(circle(10), 9, -15),  // right canopy
  offset(circle(8), 0, -32),   // top
);
```

**Fill:** `{ type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 }`

**Looks like:** A deciduous tree with a brown trunk blending into a rounded green canopy. The smooth union merges the foliage circles into one organic mass.

**Tags:** nature, decoration, world

---

### Tree (Pine)

```ts
const pine = smoothUnion(2,
  roundedBox(3, 18, 1),                       // trunk
  offset(triangle([0, -50], [-18, -15], [18, -15]), 0, 0),  // bottom tier
  offset(triangle([0, -55], [-14, -25], [14, -25]), 0, 0),  // middle tier
  offset(triangle([0, -60], [-10, -35], [10, -35]), 0, 0),  // top tier
);
```

**Fill:** `{ type: "gradient", from: "#4a2a0a", to: "#1a5a2a", angle: 90 }`

**Looks like:** A conifer tree with layered triangular branches tapering upward over a narrow trunk.

**Tags:** nature, decoration, world

---

### Mountain

```ts
const mountain = smoothUnion(6,
  triangle([0, -40], [-50, 10], [50, 10]),       // main peak
  offset(triangle([0, -25], [-35, 10], [35, 10]), -20, 5), // left foothill
  offset(triangle([0, -20], [-25, 10], [25, 10]), 25, 8),  // right foothill
);
```

**Fill:** `{ type: "gradient", from: "#4a4a5a", to: "#8a8a9a", angle: 90 }`

**Looks like:** A mountain range with one tall central peak and two lower foothills blending into it. Gray rock gradient, darker at base.

**Tags:** terrain, background, nature

---

### Cloud

```ts
const cloud = smoothUnion(6,
  ellipse(20, 10),              // center body
  offset(circle(12), -14, -4),  // left bump
  offset(circle(14), 8, -6),    // right bump
  offset(circle(9), -22, 2),    // far left
  offset(circle(10), 20, 0),    // far right
);
```

**Fill:** `{ type: "solid", color: "#e8e8f0" }`

**Looks like:** A fluffy cumulus cloud with irregular bumps along the top. The high smooth-union factor makes the circles melt together into one continuous puffy shape.

**Tags:** nature, decoration, background, sky

---

### Platform (Stone)

```ts
const stonePlatform = round(box(48, 6), 2);
```

**Fill:** `{ type: "solid_outline", fill: "#6b6b6b", outline: "#4a4a4a", thickness: 1.5 }`

**Looks like:** A wide, solid stone platform with a subtle dark outline. Clean and minimal.

**Tags:** terrain, platform, world

---

### Platform (Wooden)

```ts
const woodPlatform = roundedBox(48, 5, 1);
```

**Fill:** `{ type: "gradient", from: "#8B6914", to: "#A07828", angle: 0 }`

**Looks like:** A wooden plank platform with a horizontal wood-grain gradient from darker to lighter brown.

**Tags:** terrain, platform, world

---

### Gem / Diamond Collectible

```ts
const gem = rotate(box(8, 12), 0);
// Or for a more faceted look:
const facetedGem = intersect(
  rotate(box(10, 14), 0),
  rotate(box(10, 14), 30),
);
```

**Fill:** `{ type: "glow", color: "#44ddff", intensity: 3.0 }`

**Looks like:** A glowing diamond shape. The glow fill makes it shimmer and stand out against any background.

**Tags:** collectible, pickup, item

---

### Heart (Health Pickup)

```ts
const healthHeart = heart(10);
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
const shield = smoothUnion(2,
  intersect(
    circle(16),
    offset(box(16, 20), 0, 4),  // clip bottom into flat base
  ),
  offset(cross(10, 3, 0), 0, 0),  // cross emblem
);
```

**Fill:** `{ type: "solid_outline", fill: "#3355aa", outline: "#aabbcc", thickness: 2 }`

**Looks like:** A blue shield with a silver border and a cross emblem. Rounded top, flat bottom.

**Tags:** item, equipment, UI, defense

---

### House (Simple)

```ts
const house = union(
  box(16, 12),                                    // walls
  offset(triangle([0, -20], [-20, -4], [20, -4]), 0, 0),  // roof
);
```

**Fill:** `{ type: "gradient", from: "#8B7355", to: "#CC4444", angle: 90 }`

**Looks like:** A simple house with brown walls and a red triangular roof.

**Tags:** building, decoration, world

---

### Sword

```ts
const sword = union(
  roundedBox(2, 20, 1),          // blade
  offset(roundedBox(7, 2, 1), 0, 16),  // crossguard
  offset(roundedBox(2, 6, 1), 0, 22),  // grip
  offset(circle(3), 0, 28),     // pommel
);
```

**Fill:** `{ type: "gradient", from: "#ccccdd", to: "#666677", angle: 90 }`

**Looks like:** A medieval sword with a straight blade, crossguard, grip, and round pommel. Metallic silver gradient.

**Tags:** item, equipment, weapon

---

### Arrow

```ts
const arrow = union(
  roundedBox(1, 18, 0.5),                         // shaft
  offset(triangle([0, -22], [-5, -14], [5, -14]), 0, 0), // head
);
```

**Fill:** `{ type: "solid", color: "#aa8844" }`

**Looks like:** A simple arrow with a thin wooden shaft and a triangular head pointing upward.

**Tags:** item, projectile, weapon

---

### Coin

```ts
const coin = outline(circle(10), 2);
// Or with inner detail:
const detailedCoin = union(
  outline(circle(10), 2),
  circle(2),  // center dot
);
```

**Fill:** `{ type: "solid", color: "#ffcc00" }`

**Looks like:** A gold coin, rendered as a thick ring with a center dot.

**Tags:** collectible, currency, pickup

---

### Water Surface

```ts
const water = smoothUnion(8,
  ellipse(60, 4),
  offset(ellipse(40, 3), 15, -2),
  offset(ellipse(35, 3), -20, 1),
);
```

**Fill:** `{ type: "gradient", from: "#1a4a8a", to: "#3a8acc", angle: 0 }`

**Looks like:** A wavy water surface with smooth undulations. The gradient runs horizontally for a water shimmer effect.

**Tags:** terrain, water, nature, decoration

---

### Grass Clump

```ts
const grass = smoothUnion(2,
  offset(ellipse(3, 10), -4, 0),
  offset(ellipse(3, 12), 0, -1),
  offset(ellipse(3, 10), 4, 0),
  offset(ellipse(2, 8), -7, 2),
  offset(ellipse(2, 8), 7, 2),
);
```

**Fill:** `{ type: "gradient", from: "#2a6a1a", to: "#4a9a3a", angle: 90 }`

**Looks like:** A small clump of grass blades, darker at the base and lighter at the tips.

**Tags:** nature, decoration, ground

---

### Bush

```ts
const bush = smoothUnion(5,
  ellipse(14, 10),
  offset(circle(8), -10, -3),
  offset(circle(9), 8, -4),
  offset(circle(6), 0, -10),
);
```

**Fill:** `{ type: "gradient", from: "#2a5a1a", to: "#3a8a2a", angle: 90 }`

**Looks like:** A round, bushy shrub. Dark green at the bottom, lighter at the top.

**Tags:** nature, decoration, world

---

### Rock / Boulder

```ts
const rock = smoothUnion(3,
  ellipse(14, 10),
  offset(ellipse(10, 8), 6, -3),
  offset(ellipse(8, 6), -5, -5),
);
```

**Fill:** `{ type: "gradient", from: "#4a4a4a", to: "#7a7a7a", angle: 90 }`

**Looks like:** An irregular rocky boulder with lumpy edges. Gray gradient, darker at base.

**Tags:** terrain, decoration, nature, obstacle

---

### Castle Turret

```ts
const turret = union(
  box(12, 18),                                          // tower body
  offset(box(15, 3), 0, -18),                           // parapet base
  // Crenellations
  offset(box(3, 4), -10, -24),
  offset(box(3, 4), 0, -24),
  offset(box(3, 4), 10, -24),
);
```

**Fill:** `{ type: "solid_outline", fill: "#8a8a7a", outline: "#5a5a4a", thickness: 1.5 }`

**Looks like:** A stone castle turret with three crenellations (merlons) along the top.

**Tags:** building, decoration, world, medieval

---

### Flower

```ts
const petal = offset(ellipse(4, 8), 0, -8);
const flower = smoothUnion(2,
  circle(4),                  // center
  petal,                      // top petal
  rotate(petal, 72),          // petals around center
  rotate(petal, 144),
  rotate(petal, 216),
  rotate(petal, 288),
);
```

**Fill:** `{ type: "gradient", from: "#ffaa00", to: "#ff4488", angle: 90 }`

**Looks like:** A five-petaled flower with an orange center blending to pink petals.

**Tags:** nature, decoration, collectible

---

### Sun

```ts
const sunRay = offset(roundedBox(2, 8, 1), 0, -18);
const sun = smoothUnion(3,
  circle(10),
  sunRay,
  rotate(sunRay, 45),
  rotate(sunRay, 90),
  rotate(sunRay, 135),
  rotate(sunRay, 180),
  rotate(sunRay, 225),
  rotate(sunRay, 270),
  rotate(sunRay, 315),
);
```

**Fill:** `{ type: "glow", color: "#ffdd44", intensity: 2.0 }`

**Looks like:** A sun with eight rays radiating outward. The glow fill gives it a warm halo.

**Tags:** sky, background, decoration, nature

---

### Moon (Crescent)

```ts
const crescentMoon = moon(8, 14, 12);
```

**Fill:** `{ type: "solid", color: "#eeeedd" }`

**Looks like:** A crescent moon shape, pale yellow-white.

**Tags:** sky, background, decoration, nature, night

---

### Torch / Flame

```ts
const flame = smoothUnion(4,
  egg(8, 3),                     // main flame body
  offset(egg(5, 2), 0, -10),    // upper tongue
  offset(circle(3), -3, -4),    // left flicker
  offset(circle(3), 3, -4),     // right flicker
);
const torch = union(
  offset(roundedBox(3, 10, 1), 0, 16),  // handle
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
const key = union(
  ring(5, 2),                          // bow (ring at top)
  offset(roundedBox(1.5, 10, 0.5), 0, 12),  // shaft
  offset(roundedBox(4, 1.5, 0.5), 2, 20),   // bit (teeth)
  offset(roundedBox(3, 1.5, 0.5), 1.5, 16), // second bit
);
```

**Fill:** `{ type: "solid", color: "#ddaa33" }`

**Looks like:** A golden key with a circular bow, straight shaft, and two teeth.

**Tags:** collectible, item, key, pickup

---

### Potion Bottle

```ts
const potion = smoothUnion(2,
  ellipse(8, 10),                         // bottle body
  offset(roundedBox(3, 5, 1), 0, -12),   // neck
  offset(roundedBox(5, 2, 1), 0, -16),   // cap
);
```

**Fill:** `{ type: "gradient", from: "#6622aa", to: "#aa44ff", angle: 90 }`

**Looks like:** A round potion bottle with a narrow neck and cap, filled with purple liquid.

**Tags:** item, collectible, pickup, potion

---

### Skull

```ts
const skull = smoothUnion(2,
  ellipse(10, 12),                        // cranium
  offset(roundedBox(8, 4, 2), 0, 10),    // jaw
);
// Subtract eye sockets and nose
const skullComplete = subtract(
  skull,
  offset(circle(3), -4, -2),    // left eye
  offset(circle(3), 4, -2),     // right eye
  offset(triangle([0, 3], [-2, 6], [2, 6]), 0, 0),  // nose
);
```

**Fill:** `{ type: "solid_outline", fill: "#e8e0d0", outline: "#888070", thickness: 1 }`

**Looks like:** A cartoon skull with round eye sockets and a triangular nose hole.

**Tags:** decoration, enemy, item, danger

---

### Crystal

```ts
const crystal = intersect(
  rotate(box(8, 16), 0),
  rotate(box(8, 16), 30),
  rotate(box(8, 16), -30),
);
```

**Fill:** `{ type: "glow", color: "#88ccff", intensity: 3.0 }`

**Looks like:** A hexagonal crystal shape formed by intersecting three rotated rectangles. The glow fill gives it a magical shimmer.

**Tags:** collectible, decoration, magical, item

---

### Flag

```ts
const flag = union(
  roundedBox(1.5, 25, 0.5),                                // pole
  offset(triangle([0, -25], [20, -20], [0, -15]), 0, 0),   // flag pennant
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
- Simple shapes (`circle`, `box`) evaluate in nanoseconds per pixel. They are extremely fast.
- Complex compositions (10+ operations) are still fast for decoration and terrain. The GPU evaluates SDF math efficiently.
- Use `repeat()` for tiled patterns (e.g., a grid of dots) instead of creating separate entities.
- Pipeline compilation happens once and is cached by hash. Subsequent frames reuse the cached pipeline.

## Tips for Agents

1. **Start with SDF for everything**, switch to sprites only when a shape is too complex to express as geometry (characters, creatures, detailed items).
2. **Use `smoothUnion` with k=3-6** for organic, natural-looking shapes. Trees, clouds, and rocks all benefit from smooth blending.
3. **Layer gradient fills for depth.** Use angle 90 (bottom-to-top) with dark colors at the bottom and light at the top. This gives a natural sense of ground shadow and sky light.
4. **Use `glow` fill for collectibles and magical effects.** It makes items instantly recognizable as interactive.
5. **Extract palette from your first sprite** and use those same hex colors in SDF fills. This keeps the visual style cohesive across SDF and sprite content.
6. **Combine transforms for complex effects.** A `mirrorX` wrapping an `offset` shape builds symmetric designs with half the work.
7. **Test shapes with `compileToWgsl()`** to see the generated WGSL expression. If the expression is extremely long (hundreds of characters), consider simplifying.
8. **Use `solid_outline` fill** to make shapes pop against busy backgrounds. The outline provides visual separation.
9. **Reserve `cosine_palette` fill** for magical/alien/special effects. It produces complex color patterns that draw attention.
10. **Keep recipes in constants** so the same shape tree can be reused across many entities without recompilation:
    ```ts
    // Define once
    const TREE_SHAPE = smoothUnion(4, ...);
    const TREE_FILL: SdfFill = { type: "gradient", from: "#5a3a1a", to: "#2d8a4e", angle: 90 };

    // Stamp many times -- same pipeline, instanced rendering
    for (let i = 0; i < 20; i++) {
      sdfEntity({ shape: TREE_SHAPE, fill: TREE_FILL, position: [i * 60, 280] });
    }
    ```
