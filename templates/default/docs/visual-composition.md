# Visual Composition

Build game objects by combining different shapes. Each example mixes primitives for visual interest.

## Shape Composition Examples

```typescript
// Spaceship — triangle body + rectangle wings + circle cockpit
function drawShip(x: number, y: number, angle: number) {
  drawTriangle(x, y - 20, x - 12, y + 10, x + 12, y + 10, { color: HULL, rotation: angle });
  drawRect(x - 18, y - 2, 8, 12, { color: WING });   // left wing
  drawRect(x + 10, y - 2, 8, 12, { color: WING });   // right wing
  drawCircle(x, y - 8, 5, { color: COCKPIT });       // cockpit
  drawCircle(x, y + 8, 3, { color: ENGINE_GLOW });   // engine
}

// Crystal — stacked triangles with glow
function drawCrystal(x: number, y: number, h: number) {
  drawTriangle(x, y - h, x - 8, y, x + 8, y, { color: CRYSTAL_BRIGHT });
  drawTriangle(x - 4, y - h * 0.6, x - 10, y, x + 2, y, { color: CRYSTAL_DARK });
  drawTriangle(x + 4, y - h * 0.6, x - 2, y, x + 10, y, { color: CRYSTAL_MID });
}

// Character — ellipse body + circle head + rect limbs
function drawCharacter(x: number, y: number) {
  drawEllipse(x, y + 8, 10, 14, { color: BODY });    // torso
  drawCircle(x, y - 10, 8, { color: SKIN });         // head
  drawRect(x - 14, y + 2, 4, 12, { color: BODY });   // left arm
  drawRect(x + 10, y + 2, 4, 12, { color: BODY });   // right arm
  drawRect(x - 6, y + 20, 5, 10, { color: LEGS });   // left leg
  drawRect(x + 1, y + 20, 5, 10, { color: LEGS });   // right leg
}

// Tree — trapezoid trunk + layered triangles for foliage
function drawTree(x: number, y: number) {
  drawRect(x - 6, y, 12, 30, { color: BARK });       // trunk
  drawTriangle(x, y - 40, x - 25, y, x + 25, y, { color: LEAVES_DARK });
  drawTriangle(x, y - 55, x - 20, y - 20, x + 20, y - 20, { color: LEAVES_MID });
  drawTriangle(x, y - 65, x - 15, y - 35, x + 15, y - 35, { color: LEAVES_BRIGHT });
}

// Asteroid — polygon base + circle craters
function drawAsteroid(x: number, y: number, r: number) {
  drawPolygon([/* irregular 8-point polygon coords */], { color: ROCK });
  drawCircle(x - r * 0.3, y - r * 0.2, r * 0.15, { color: SHADOW }); // crater
  drawCircle(x + r * 0.4, y + r * 0.3, r * 0.1, { color: SHADOW });  // crater
}

// Cat — horizontal ellipse body + triangular ears + 4 legs + tail
// Uses flip multiplier for left/right facing (see Common Mistake #35 in AGENTS.md)
function drawCat(x: number, y: number, facingRight: boolean) {
  const flip = facingRight ? 1 : -1;
  drawEllipse(x, y, 20, 12, { color: FUR });                          // body (wide, not tall)
  drawCircle(x + flip * 18, y - 6, 8, { color: FUR });                // head
  drawTriangle(                                                        // left ear (big = recognizable)
    x + flip * 13, y - 20, x + flip * 10, y - 10, x + flip * 16, y - 10,
    { color: EAR_PINK });
  drawTriangle(                                                        // right ear
    x + flip * 23, y - 20, x + flip * 20, y - 10, x + flip * 26, y - 10,
    { color: EAR_PINK });
  drawRect(x - 10, y + 10, 4, 8, { color: FUR });                     // back-left leg
  drawRect(x - 4, y + 10, 4, 8, { color: FUR });                      // back-right leg
  drawRect(x + 8, y + 10, 4, 8, { color: FUR });                      // front-left leg
  drawRect(x + 14, y + 10, 4, 8, { color: FUR });                     // front-right leg
  drawLine(x - flip * 18, y, x - flip * 30, y - 8, { color: FUR });   // tail (curves up)
  drawCircle(x + flip * 16, y - 7, 2, { color: EYES });               // eye
  drawLine(x + flip * 24, y - 4, x + flip * 34, y - 6, { color: WHISKER }); // whisker
  drawLine(x + flip * 24, y - 2, x + flip * 34, y - 2, { color: WHISKER }); // whisker
}

// Unicorn/Horse — large horizontal ellipse + triangular ears + 4 legs + horn + mane
function drawUnicorn(x: number, y: number, facingRight: boolean) {
  const flip = facingRight ? 1 : -1;
  drawEllipse(x, y, 30, 18, { color: COAT });                         // body
  drawEllipse(x + flip * 32, y - 12, 10, 8, { color: COAT });         // head (elongated)
  drawTriangle(                                                        // ear
    x + flip * 34, y - 28, x + flip * 30, y - 18, x + flip * 38, y - 18,
    { color: EAR_PINK });
  drawTriangle(                                                        // horn (tall, narrow)
    x + flip * 36, y - 42, x + flip * 33, y - 26, x + flip * 39, y - 26,
    { color: HORN_GOLD });
  drawRect(x - 14, y + 14, 6, 16, { color: COAT });                   // back-left leg
  drawRect(x - 6, y + 14, 6, 16, { color: COAT });                    // back-right leg
  drawRect(x + 14, y + 14, 6, 16, { color: COAT });                   // front-left leg
  drawRect(x + 22, y + 14, 6, 16, { color: COAT });                   // front-right leg
  // Mane — series of small ellipses along neck
  for (let i = 0; i < 4; i++) {
    drawEllipse(x + flip * (22 + i * 3), y - 16 - i * 3, 4, 6, { color: MANE });
  }
  drawLine(x - flip * 28, y, x - flip * 44, y - 12, { color: MANE }); // tail
  drawCircle(x + flip * 36, y - 14, 2, { color: EYES });               // eye
}
```

## Shape Selection Guide

| Shape | Best for |
|-------|----------|
| `drawTriangle()` | Ships, arrows, crystals, roofs, trees |
| `drawRect()` | Buildings, platforms, limbs, bars, UI panels |
| `drawPolygon()` | Irregular terrain, asteroids, shields, explosions |
| `drawCircle()` | Heads, wheels, projectiles, glows, joints |
| `drawEllipse()` | Bodies, clouds, shadows, stretched elements |
| `drawLine()` | Lasers, connections, grid lines, trajectories |
| `drawCapsule()` | Pills, rounded platforms, characters |
| `drawArc()` / `drawRing()` | Health rings, radar sweeps, partial circles |

For complex procedural graphics (gradients, glows, stars, hearts, mountains), use **SDF shapes** instead. See [sdf.md](sdf.md).

## Visual Depth Techniques

Rich visuals come from **layering**, not complexity. These patterns make flat shapes feel alive:

```typescript
// Glow effect — larger transparent shape behind solid core
drawCircle(x, y, r + 8, { color: withAlpha(GLOW_COLOR, 0.3), layer: 1 });  // outer glow
drawCircle(x, y, r + 4, { color: withAlpha(GLOW_COLOR, 0.5), layer: 1 });  // inner glow
drawCircle(x, y, r, { color: CORE_COLOR, layer: 2 });                       // solid core

// Highlight/shine — small bright spot offset toward light source
drawCircle(x - r * 0.3, y - r * 0.3, r * 0.25, { color: withAlpha(WHITE, 0.6), layer: 3 });

// Shadow/depth — darker shape offset down-right
drawCircle(x + 2, y + 2, r, { color: withAlpha(BLACK, 0.3), layer: 0 });   // shadow
drawCircle(x, y, r, { color: MAIN_COLOR, layer: 1 });                       // main shape

// Rim lighting — thin bright edge
drawCircle(x, y, r, { color: DARK_COLOR, layer: 1 });                       // base
drawCircle(x, y, r - 2, { color: MAIN_COLOR, layer: 1 });                   // inset creates rim

// Pulsing glow (animated) — use elapsed time
const pulse = 0.7 + 0.3 * Math.sin(elapsed * 3);
drawCircle(x, y, r * (1 + pulse * 0.2), { color: withAlpha(GLOW, 0.3 * pulse), layer: 1 });
```

## Starfield / Background Particles

Pre-generate at module scope, animate with `elapsed`:

```typescript
const STARS = Array.from({ length: 100 }, (_, i) => ({
  x: (i * 97) % 1000 - 500, y: (i * 53) % 800 - 400,
  size: 1 + (i % 3), twinkle: i * 0.5,
}));

// In onFrame:
for (const s of STARS) {
  const brightness = 0.4 + 0.6 * Math.sin(elapsed * 2 + s.twinkle);
  drawCircle(s.x, s.y, s.size * brightness, { color: withAlpha(WHITE, brightness), layer: 0 });
}
```

## Drawing Animals

Animals look like blobs when built from circles alone. For recognizable animals:

- **Horizontal ellipses** for bodies (wider than tall)
- **Large triangles** for ears (the biggest recognition feature for cats/dogs)
- **Rectangles** for legs (show all 4 for quadrupeds)
- **Lines/triangles** for tails and whiskers
- **Flip multiplier** for direction: `const flip = facingRight ? 1 : -1;` — multiply all X offsets

See Cat and Unicorn examples above.
