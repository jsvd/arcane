# Visual Pipeline -- SDF + AI Sprites

How Arcane renders visuals: two complementary systems that coexist in the same scene, sorted by layer.

## Architecture

Arcane has three rendering pipelines that share a single camera and merge-sort by layer:

```
                      TypeScript Game Code
                      /         |         \
               Sprite API    SDF API    Geometry API
                  |             |            |
            SpriteCommand   SdfCommand   GeoCommand
                  |             |            |
           SpritePipeline   SdfPipeline  GeometryBatch
              (GPU)          (GPU)        (GPU)
                  \            |           /
                   \           |          /
                 Merge-walk all by layer
                          |
                   Post-processing
                          |
                     Present frame
```

| Pipeline | What goes through it | Strengths |
|----------|---------------------|-----------|
| Sprite | Textured quads: images, color rects, text glyphs, UI, animations | Texture detail, blend modes, custom shaders |
| SDF | Per-pixel distance field shapes: procedural geometry | Resolution-independent, anti-aliased, composable, no image files |
| Geometry | Colored triangle fans and thick lines: circles, polygons, arcs | Fast, flat-colored shapes, debug visualization |

## SDF Rendering Pipeline

```
TS shape functions: circle(), box(), smoothUnion(), offset(), ...
          |
     SdfNode tree (pure data structure)
          |
     compileToWgsl()  -->  WGSL distance expression string
          |
     sdfEntity({ shape, fill, position })  -->  registers entity
          |
Rust SDF pipeline (core/renderer/sdf.rs)
          |
     For each unique (expression, fill) pair:
       - generate_sdf_shader() builds a complete WGSL module
       - Inlines all SDF primitives + composition ops
       - Adds vertex stage (instanced quad + camera transform)
       - Adds fragment stage (evaluates SDF, applies fill, smoothstep AA)
       - Compiles to wgpu::RenderPipeline (cached by hash)
          |
     Batch commands by pipeline key
          |
     Instanced draw call per batch
       - Shared quad vertex buffer (4 vertices, 6 indices)
       - Per-instance data: position, bounds, rotation, scale, opacity, color
```

### Pipeline Caching

Each unique combination of SDF expression + fill type gets its own GPU pipeline. The pipeline is compiled once and cached by a deterministic hash of the expression string and fill parameters. Subsequent frames with the same shapes skip compilation entirely.

This means:
- 100 trees using the same shape/fill = 1 pipeline, 1 instanced draw call
- 5 different tree variations = 5 pipelines, 5 draw calls
- Changing a fill color creates a new pipeline (the color is baked into the shader)

### Anti-Aliasing

The SDF pipeline uses `smoothstep` on the distance value to produce smooth shape edges. This gives all SDF shapes natural anti-aliasing without MSAA or post-processing.

## AI Asset Generation

For visuals that SDF cannot express (characters, creatures, detailed items), Arcane supports AI-generated sprite assets through an MCP tool workflow.

```
Agent decides "I need a player character sprite"
          |
     MCP tool call to local image generation backend
       - Draw Things (macOS)
       - ComfyUI (cross-platform)
       - DiffusionKit (Apple Silicon)
          |
     Backend generates PNG image
          |
     sharp post-processing (optional)
       - Background removal
       - Padding normalization
       - Sprite sheet assembly
          |
     PNG saved to project assets/
          |
     loadTexture("assets/player.png")
```

### When to Generate vs When to SDF

| Generate a sprite | Use SDF |
|-------------------|---------|
| Player character | Platforms, terrain |
| NPCs with expressions | Trees, rocks, clouds |
| Complex creatures | Collectibles (coins, gems, stars) |
| Detailed items with shading | UI elements |
| Pixel art tileset | Procedural backgrounds |
| Animation frames | Effects (glow, particles) |

## Hybrid Scenes

SDF entities, sprite entities, and geometry shapes coexist in the same scene. They are all sorted by layer and rendered in order. Lower layer values render first (behind), higher values render on top.

```ts
// Layer 0: Background terrain (SDF)
sdfEntity({ shape: mountainShape, fill: mountainFill, position: [400, 350], layer: 0 });

// Layer 1-2: Decorations (SDF)
sdfEntity({ shape: treeShape, fill: treeFill, position: [200, 280], layer: 1 });
sdfEntity({ shape: bushShape, fill: bushFill, position: [350, 300], layer: 2 });

// Layer 3: Ground platform (SDF)
sdfEntity({ shape: platformShape, fill: platformFill, position: [400, 320], layer: 3 });

// Layer 5: Player character (sprite)
drawSprite({ textureId: playerTex, x: 300, y: 280, w: 32, h: 48, layer: 5 });

// Layer 8: Collectibles (SDF with glow)
sdfEntity({ shape: gemShape, fill: gemGlow, position: [500, 260], layer: 8 });

// Layer 90+: HUD (sprites/text)
hud.text("Score: 100", 10, 10);
hud.bar(10, 30, hp / maxHp);
```

The three pipelines are interleaved by layer during the render pass. A sprite at layer 5 renders after an SDF shape at layer 3 but before a geometry circle at layer 8.

## Asset Manifest

Projects can maintain a `manifest.json` that catalogs both SDF recipes and sprite assets for agent discoverability:

```json
{
  "sdf": {
    "tree-oak": {
      "description": "Deciduous tree with rounded canopy",
      "tags": ["nature", "decoration"],
      "source": "recipes/tree-oak.ts"
    },
    "platform-stone": {
      "description": "Wide stone platform",
      "tags": ["terrain", "platform"],
      "source": "recipes/platform-stone.ts"
    }
  },
  "sprites": {
    "player-idle": {
      "path": "assets/sprites/player-idle.png",
      "size": [32, 48],
      "tags": ["character", "player"],
      "generated": true,
      "prompt": "pixel art knight idle pose, 32x48, transparent background"
    },
    "goblin": {
      "path": "assets/sprites/goblin.png",
      "size": [24, 24],
      "tags": ["character", "enemy"],
      "generated": true
    }
  },
  "palette": {
    "primary": "#3366cc",
    "secondary": "#cc4444",
    "background": "#1a1a2e",
    "accent": "#ffdd44",
    "nature-dark": "#2a5a1a",
    "nature-light": "#4a9a3a",
    "stone": "#6b6b6b"
  }
}
```

The palette section is the bridge between SDF and sprite visual consistency.

## Style Consistency

The biggest risk with hybrid SDF + sprite scenes is visual mismatch. SDF shapes are clean geometric forms; AI-generated sprites have painterly detail. To keep them cohesive:

### Shared Palette

Extract 4-8 key colors from your sprites and define them as your project palette. Use these exact hex values in SDF fills.

```ts
// Define palette once
const PALETTE = {
  ground: "#5a4a3a",
  grass: "#3a7a2a",
  sky: "#4a8acc",
  stone: "#7a7a7a",
  accent: "#ffcc00",
};

// Use in SDF fills
const treeFill: SdfFill = {
  type: "gradient",
  from: PALETTE.ground,
  to: PALETTE.grass,
  angle: 90,
};
```

### Consistent Outline Style

If sprites have outlines (common in pixel art), add outlines to SDF shapes too:

```ts
// Sprites have 1px black outlines? Match it:
const platformFill: SdfFill = {
  type: "solid_outline",
  fill: PALETTE.stone,
  outline: "#333333",
  thickness: 1.5,
};
```

### Matching Detail Level

If sprites are low-resolution pixel art (16x16, 32x32), keep SDF shapes simple. A 5-circle tree next to a 16x16 character looks wrong. Use fewer primitives and bolder shapes.

If sprites are high-resolution painterly art, SDF shapes can afford more complexity and subtle gradients.

### Background-Foreground Separation

SDF works best for background elements (terrain, sky, decorations). Sprites work best for foreground elements (characters, NPCs, interactive items). This natural separation reduces direct visual comparison between the two styles.

```
Layer 0-2:  SDF background (mountains, clouds, sky)
Layer 3-4:  SDF mid-ground (platforms, terrain)
Layer 5-8:  Sprite foreground (characters, enemies, items)
Layer 90+:  SDF/sprite UI (HUD, menus)
```
