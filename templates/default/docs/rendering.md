# Rendering: Sprites, Text, Shaders & Effects

> **Tip:** Use `/sprite player enemies tiles` to find and download sprite packs from Asset Palace. The skill generates atlas code with proper UV coordinates.

> **Procedural graphics:** For resolution-independent vector shapes without image assets, see [sdf.md](sdf.md).

## Sprites

Draw calls are not persisted. Redraw everything inside `onFrame()` every frame.

```typescript
import { drawSprite, clearSprites, createSolidTexture, loadTexture } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";

// Create textures once at module scope
const TEX = createSolidTexture("player", rgb(60, 180, 255));  // solid color via rgb()
const TEX2 = loadTexture("assets/sprite.png");            // image file (cached by path)

// In onFrame:
clearSprites();
drawSprite({ textureId: TEX, x: 100, y: 200, w: 32, h: 32, layer: 1 });
```

`drawSprite` positions the sprite's **top-left corner** in world space. It is always world-space -- there is no `screenSpace` option on sprites.

### Sprite Atlases

Load sprites from Asset Palace JSON definitions with automatic UV normalization:

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

const atlas = loadAtlasFromDef({
  id: "space-shooter",
  primarySheet: "Spritesheet/sheet.png",
  sheetWidth: 1024,
  sheetHeight: 1024,
  sprites: {
    "player-ship": { x: 211, y: 941, w: 99, h: 75 },
    "enemy-ufo": { x: 444, y: 0, w: 91, h: 91 },
  },
}, { basePath: "assets/space-shooter-redux/" });

// Draw centered at position (unlike raw drawSprite which uses top-left)
atlas.draw("player-ship", { x: player.x, y: player.y, scale: 0.5 });
atlas.draw("enemy-ufo", { x: enemy.x, y: enemy.y, rotation: angle });

// Or get SpriteOptions for manual control
const opts = atlas.sprite("player-ship", { x: 100, y: 200 });
drawSprite(opts);
```

Use `/sprite` to find packs and generate atlas definitions automatically.

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

### Sprite Groups (Composite Characters)

Bundle multiple sprite parts with relative offsets. Draw multi-part characters, equipment, or vehicles with a single call.

```typescript
import { createSpriteGroup, drawSpriteGroup, setPartVisible } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";

const knight = createSpriteGroup([
  { name: "body",   offsetX: 0, offsetY: 0,    w: 16, h: 16, color: rgb(150, 150, 150) },
  { name: "head",   offsetX: 2, offsetY: -12,  w: 12, h: 12, color: rgb(255, 200, 170) },
  { name: "sword",  offsetX: 14, offsetY: -2,  w: 6,  h: 20, color: rgb(200, 200, 230), layerOffset: 1 },
  { name: "shield", offsetX: -8, offsetY: 0,   w: 8,  h: 14, color: rgb(139, 69, 19), layerOffset: 1 },
], /* baseLayer */ 5);

// Draw at position — all parts rendered with correct offsets
drawSpriteGroup(knight, player.x, player.y);

// Flip entire group (sword swaps sides, offsets mirror automatically)
drawSpriteGroup(knight, player.x, player.y, { flipX: !facingRight });

// Control opacity (e.g., ghost effect)
drawSpriteGroup(knight, player.x, player.y, { opacity: 0.5 });

// Toggle individual parts
setPartVisible(knight, "shield", hasShield);
setPartVisible(knight, "sword", hasSword);
```

Parts with `flipWithParent: false` stay in place when the group flips (useful for symmetrical elements). Part opacity multiplies with group opacity.

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

// With outline — note: outline is a nested object, not flat fields
drawText("Outlined", 100, 140, {
  msdfFont: font, scale: 2.0, layer: 10,
  outline: { width: 2, color: { r: 0, g: 0, b: 0, a: 1 } },
});

// With drop shadow
drawText("Shadowed", 100, 180, {
  msdfFont: font, scale: 2.0, layer: 10,
  shadow: { offsetX: 2, offsetY: 2, color: { r: 0, g: 0, b: 0, a: 0.5 } },
});

// Measure width for centering
const { width: VPW } = getViewportSize();
const { width: textW } = measureText("Centered", { msdfFont: font, scale: 2.0 });
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

setEffectParam(crt, 0, 0.3);  // param index 0, value 0.3
removeEffect(bloom);
clearEffects();
```

## Custom Shaders

Three tiers of shader usage — from zero-WGSL to full control. See [docs/shaders.md](shaders.md) for the complete guide.

**Tier 1: Effect presets** (most common — no WGSL needed):
```typescript
import { outlineEffect, dissolveEffect } from "@arcane/runtime/rendering";

const fx = outlineEffect({ color: [1, 0, 0, 1], width: 2 });
drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });
fx.set("outlineWidth", 3.0); // update at runtime
```

**Tier 2: Named uniforms** (custom WGSL with ergonomic params):
```typescript
import { createShader, setShaderUniform } from "@arcane/runtime/rendering";

const fx = createShader("tint", wgslSource, { color: "vec3", intensity: "float" });
setShaderUniform(fx, "color", 1.0, 0.5, 0.0);
setShaderUniform(fx, "intensity", 0.8);
```

All shaders get auto-injected built-ins: `shader_params.time`, `.delta`, `.resolution`, `.mouse`.

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
  enableGlobalIllumination, setGIQuality, setAmbientLight,
  addPointLight, addDirectionalLight, addSpotLight,
  addEmissive, addOccluder,
} from "@arcane/runtime/rendering";

enableGlobalIllumination();
setGIQuality({ probeSpacing: 8, cascadeCount: 4 });  // fine-tune GI quality
setAmbientLight(0.08, 0.08, 0.12);

// In onFrame:
addPointLight(player.x, player.y, 120, 1.0, 0.8, 0.5, 1.5);
addDirectionalLight({ angle: Math.PI * 0.75, r: 0.3, g: 0.3, b: 0.5, intensity: 0.4 });  // moonlight
addSpotLight({ x: guardX, y: guardY, angle: guardAngle, spread: Math.PI / 4, range: 200, r: 1, g: 1, b: 0.8, intensity: 2.0 });

// Emissive regions emit light into GI (separate from sprites)
addEmissive({ x: 100, y: 200, w: 32, h: 8, r: 1, g: 0.5, b: 0.1, intensity: 2.0 });

// Occluder regions block light (separate from sprites)
addOccluder({ x: 150, y: 200, w: 16, h: 64 });
```

### Day/Night Cycle

```typescript
const dayProgress = (totalTime % 60) / 60;
const sunAngle = dayProgress * Math.PI * 2;
const brightness = Math.max(0, Math.sin(dayProgress * Math.PI));
setAmbientLight(0.1 + 0.4 * brightness, 0.1 + 0.35 * brightness, 0.15 + 0.25 * brightness);
addDirectionalLight({ angle: sunAngle, r: 1.0, g: 0.9, b: 0.7, intensity: brightness * 0.6 });
```

Layer ordering: lower numbers draw behind higher ones. Use the `LAYERS` constants (`BACKGROUND=0`, `GROUND=10`, `ENTITIES=20`, `FOREGROUND=30`, `UI=40`) or custom numbers. If something is invisible, check it isn't behind a higher-layer element.
