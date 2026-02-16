# Rendering: Sprites, Text, Shaders & Effects

## Sprites

Draw calls are not persisted. Redraw everything inside `onFrame()` every frame.

```typescript
import { drawSprite, clearSprites, createSolidTexture, loadTexture } from "@arcane/runtime/rendering";

// Create textures once at module scope
const TEX = createSolidTexture("player", 60, 180, 255);  // solid color (0-255 RGB)
const TEX2 = loadTexture("assets/sprite.png");            // image file (cached by path)

// In onFrame:
clearSprites();
drawSprite({ textureId: TEX, x: 100, y: 200, w: 32, h: 32, layer: 1 });
```

`drawSprite` positions the sprite's **top-left corner** in world space. It is always world-space -- there is no `screenSpace` option on sprites.

### Sprite Transforms

Rotation, flip, opacity, and blend modes are all `SpriteOptions` fields:

```typescript
// Rotation (radians, positive = clockwise, around center by default)
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, rotation: angle, layer: 1 });

// Custom rotation origin (0-1 relative to sprite size)
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, rotation: angle,
  originX: 0.5, originY: 1.0, layer: 1 });  // rotate around bottom-center

// Flip + opacity
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, flipX: facingLeft, opacity: 0.5, layer: 1 });

// Blend modes: "alpha" (default), "additive" (glow/fire), "multiply" (shadows), "screen" (highlights)
drawSprite({ textureId: TEX, x, y, w: 8, h: 8, blendMode: "additive", layer: 5 });
```

### drawColorSprite (Convenience)

Skip `createSolidTexture()` -- pass a color inline. Textures are auto-cached.

```typescript
import { drawColorSprite } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";

drawColorSprite({ color: rgb(255, 0, 0), x: 100, y: 200, w: 32, h: 32, layer: 1 });
```

`rgb()` takes 0-255 integers. Alpha defaults to 255; pass a fourth arg for transparency: `rgb(255, 0, 0, 128)`.

## Text

### Bitmap Text (Fixed-Size)

```typescript
import { drawText, getDefaultFont } from "@arcane/runtime/rendering";

const font = getDefaultFont();  // CP437 8x8 bitmap font
drawText("Hello World", 100, 100, { scale: 2, layer: 10 });

// Screen-space HUD text (ignores camera)
drawText("Score: 42", 10, 10, { screenSpace: true, layer: 100 });
```

### MSDF Text (Crisp at Any Zoom)

Resolution-independent text with outlines and shadows. Use when text needs to look sharp at varying zoom levels.

```typescript
import { getDefaultMSDFFont, loadMSDFFont, drawText, measureText } from "@arcane/runtime/rendering";

const font = getDefaultMSDFFont();

// Basic crisp text
drawText("Hello World", 100, 100, { msdfFont: font, scale: 2.0, layer: 10 });

// With outline
drawText("Outlined", 100, 140, {
  msdfFont: font, scale: 2.0, layer: 10,
  outlineWidth: 0.15, outlineColor: { r: 0, g: 0, b: 0, a: 1 },
});

// With drop shadow
drawText("Shadowed", 100, 180, {
  msdfFont: font, scale: 2.0, layer: 10,
  shadowOffsetX: 2, shadowOffsetY: 2, shadowColor: { r: 0, g: 0, b: 0, a: 0.5 },
});

// Measure width for centering
const { width: VPW } = getViewportSize();
const textW = measureText("Centered", font, 2.0);
drawText("Centered", (VPW - textW) / 2, 50, { msdfFont: font, scale: 2.0, screenSpace: true, layer: 100 });

// Load external MSDF font
const customFont = loadMSDFFont("assets/roboto-msdf.png", "assets/roboto-msdf.json");
```

## Nine-Slice Panels

Draw a texture as a scalable UI panel. Corners stay fixed, edges stretch, center fills.

```typescript
import { drawNineSlice, loadTexture } from "@arcane/runtime/rendering";

const panelTex = loadTexture("panel.png");

// Uniform 16px border
drawNineSlice(panelTex, 50, 50, 300, 200, {
  border: 16, textureWidth: 64, textureHeight: 64, layer: 10,
});

// Per-edge borders
drawNineSlice(panelTex, 400, 50, 200, 150, {
  border: { top: 12, bottom: 16, left: 8, right: 8 },
  textureWidth: 64, textureHeight: 64, screenSpace: true, opacity: 0.9,
});
```

## Post-Processing

Screen-wide effects applied after all sprites are drawn:

```typescript
import { addPostProcessEffect, setEffectParam, removeEffect, clearEffects } from "@arcane/runtime/rendering";

const crt = addPostProcessEffect("crt");       // scanlines + barrel distortion
const bloom = addPostProcessEffect("bloom");    // glow around bright areas
const blur = addPostProcessEffect("blur");      // gaussian blur
const vig = addPostProcessEffect("vignette");   // darkened edges

setEffectParam(crt, "intensity", 0.3);
removeEffect(bloom);
clearEffects();
```

## Custom Shaders

User-defined WGSL fragment shaders with 16 vec4 uniform slots:

```typescript
import { createShaderFromSource, setShaderParam } from "@arcane/runtime/rendering";

const shader = createShaderFromSource("dissolve", `
  @fragment fn main(@location(0) uv: vec2<f32>, @location(1) color: vec4<f32>) -> @location(0) vec4<f32> {
    let threshold = params[0].x;
    // ... WGSL fragment shader code
    return color;
  }
`);
setShaderParam(shader, 0, 0.5, 0, 0, 0);
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, shaderId: shader, layer: 1 });
```

## Lighting

Ambient darkness with point light sources. Lights must be re-added each frame.

```typescript
import { setAmbientLight, addPointLight, clearLights } from "@arcane/runtime/rendering";

setAmbientLight(0.15, 0.15, 0.2);  // dark dungeon

// In onFrame:
addPointLight(player.x + 16, player.y + 16, 120, 1.0, 0.8, 0.5, 1.2);  // warm torch

// Flickering campfire
const flicker = 1.0 + Math.sin(totalTime * 8) * 0.1;
addPointLight(fireX, fireY, 80 * flicker, 1.0, 0.6, 0.2, flicker);
```

## Global Illumination

2D GI via Radiance Cascades. Emissive sprites cast colored light; occluders block it.

```typescript
import {
  setGIEnabled, setGIQuality, setAmbientLight,
  addPointLight, addDirectionalLight, addSpotLight, drawSprite,
} from "@arcane/runtime/rendering";

setGIEnabled(true);
setGIQuality("medium");  // "low", "medium", "high"
setAmbientLight(0.08, 0.08, 0.12);

// In onFrame:
addPointLight(player.x, player.y, 120, 1.0, 0.8, 0.5, 1.5);
addDirectionalLight(Math.PI * 0.75, 0.3, 0.3, 0.5, 0.4);  // moonlight
addSpotLight(guardX, guardY, 200, guardAngle, Math.PI / 4, 1, 1, 0.8, 2.0);

// Emissive sprites emit light into GI
drawSprite({ textureId: TEX_LAVA, x: 100, y: 200, w: 32, h: 8, emissive: true, layer: 1 });

// Occluder sprites block light
drawSprite({ textureId: TEX_WALL, x: 150, y: 200, w: 16, h: 64, occluder: true, layer: 1 });
```

### Day/Night Cycle

```typescript
const dayProgress = (totalTime % 60) / 60;
const sunAngle = dayProgress * Math.PI * 2;
const brightness = Math.max(0, Math.sin(dayProgress * Math.PI));
setAmbientLight(0.1 + 0.4 * brightness, 0.1 + 0.35 * brightness, 0.15 + 0.25 * brightness);
addDirectionalLight(sunAngle, 1.0, 0.9, 0.7, brightness * 0.6);
```

## Layer Ordering

Lower layer numbers draw behind higher ones:
- 0: background / ground tiles
- 1-10: game objects
- 90+: UI primitives
- 100+: HUD text

If something is invisible, it may be drawn behind something else on a higher layer.
