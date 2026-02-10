# Phase 10: Sprite Transforms + Rendering Polish — Detailed Scoping

## Overview

Phase 10 completes the sprite rendering system with rotation, advanced blending, custom shaders, and post-processing. This unlocks visual effects and rendering techniques expected in modern 2D games.

**Core additions:**
1. Sprite rotation (arbitrary angles)
2. Sprite flip (H/V without separate frames)
3. Sprite pivot/origin point
4. Blend modes (additive, multiply, screen)
5. Custom shader support (user-defined WGSL)
6. Post-processing pipeline (bloom, blur, vignette)

---

## Part 1: Sprite Transforms

### Current Limitation

Sprites can only be drawn at fixed positions with scale. No rotation, no pivot control.

```typescript
// Current API (Phase 6)
drawSprite('player', { x: 100, y: 100, scale: 2 }); // ❌ Can't rotate
```

**Games that need rotation:**
- Top-down shooters (ship rotates to face cursor)
- Asteroids-style games (spinning asteroids)
- Physics games (tumbling objects)
- Platformers (character roll/flip)

---

### Rotation + Pivot API

```typescript
// runtime/rendering/types.ts
interface SpriteOptions {
  // Existing
  x: number;
  y: number;
  scale?: number;
  tint?: Color;
  atlasRect?: { x: number; y: number; w: number; h: number };

  // New in Phase 10
  rotation?: number; // Radians (0 = right, Math.PI/2 = down, etc.)
  pivot?: Vec2; // Pivot point in local space (default: center)
  flipH?: boolean; // Horizontal flip
  flipV?: boolean; // Vertical flip
  opacity?: number; // Alpha (0 = transparent, 1 = opaque)
  blendMode?: 'normal' | 'additive' | 'multiply' | 'screen';
}

// Example: Rotating ship
drawSprite('ship', {
  x: 100,
  y: 100,
  rotation: angle, // Rotate ship to face cursor
  pivot: { x: 0.5, y: 0.5 }, // Rotate around center (default)
});

// Example: Flip sprite without separate frame
drawSprite('character', {
  x: 100,
  y: 100,
  flipH: facingLeft, // Flip horizontally based on direction
});

// Example: Rotate around custom pivot (e.g., swinging sword)
drawSprite('sword', {
  x: playerX,
  y: playerY,
  rotation: swingAngle,
  pivot: { x: 0, y: 0.5 }, // Rotate around left-center (sword hilt)
});
```

---

### GPU Shader Changes

**Current shader** (Phase 6):
```wgsl
// sprite.wgsl
struct VertexInput {
  @location(0) position: vec2<f32>,      // Quad vertex position
  @location(1) sprite_pos: vec2<f32>,    // Sprite world position
  @location(2) sprite_scale: vec2<f32>,  // Sprite scale
  @location(3) tex_coords: vec2<f32>,    // UV coordinates
  @location(4) tint: vec4<f32>,          // Color tint
}

// Vertex shader transforms sprite to screen space
@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  let world_pos = in.position * in.sprite_scale + in.sprite_pos;
  let clip_pos = camera.proj * camera.view * vec4<f32>(world_pos, 0.0, 1.0);
  return VertexOutput(clip_pos, in.tex_coords, in.tint);
}
```

**New shader** (Phase 10):
```wgsl
// sprite.wgsl
struct VertexInput {
  @location(0) position: vec2<f32>,      // Quad vertex position (-0.5 to 0.5)
  @location(1) sprite_pos: vec2<f32>,    // Sprite world position
  @location(2) sprite_scale: vec2<f32>,  // Sprite scale
  @location(3) sprite_rotation: f32,     // NEW: Rotation in radians
  @location(4) sprite_pivot: vec2<f32>,  // NEW: Pivot point (0-1 normalized)
  @location(5) sprite_flip: vec2<f32>,   // NEW: Flip flags (1 or -1)
  @location(6) tex_coords: vec2<f32>,    // UV coordinates
  @location(7) tint: vec4<f32>,          // Color tint (with alpha for opacity)
  @location(8) blend_mode: u32,          // NEW: Blend mode index
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  // Apply flip to quad position
  let flipped_pos = in.position * in.sprite_flip;

  // Apply pivot offset
  let pivoted_pos = flipped_pos - (in.sprite_pivot - vec2<f32>(0.5, 0.5));

  // Apply rotation
  let cos_r = cos(in.sprite_rotation);
  let sin_r = sin(in.sprite_rotation);
  let rotation_matrix = mat2x2<f32>(
    cos_r, -sin_r,
    sin_r, cos_r
  );
  let rotated_pos = rotation_matrix * pivoted_pos;

  // Apply scale and translation
  let scaled_pos = rotated_pos * in.sprite_scale;
  let world_pos = scaled_pos + in.sprite_pos;

  // Transform to clip space
  let clip_pos = camera.proj * camera.view * vec4<f32>(world_pos, 0.0, 1.0);

  return VertexOutput(clip_pos, in.tex_coords, in.tint, in.blend_mode);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  var color = textureSample(sprite_texture, sprite_sampler, in.tex_coords);
  color = color * in.tint; // Apply tint and opacity

  // Apply lighting (existing)
  color = apply_lighting(color, in.world_pos);

  // Blend mode handled by pipeline state (see below)
  return color;
}
```

**Rust side (SpriteCommand)**:
```rust
// core/src/renderer/sprite.rs
pub struct SpriteCommand {
    pub position: Vec2,
    pub scale: Vec2,
    pub rotation: f32,        // NEW
    pub pivot: Vec2,          // NEW (0-1 normalized)
    pub flip: Vec2,           // NEW (1.0 or -1.0 for H/V flip)
    pub atlas_rect: Rect,
    pub tint: [f32; 4],       // RGBA (alpha for opacity)
    pub blend_mode: BlendMode, // NEW
    pub texture_id: u32,
}

#[repr(u32)]
pub enum BlendMode {
    Normal = 0,
    Additive = 1,
    Multiply = 2,
    Screen = 3,
}
```

**TypeScript bridge**:
```typescript
// runtime/rendering/sprites.ts
#[op2(fast)]
fn op_draw_sprite(
  texture_id: u32,
  x: f64, y: f64,
  scale_x: f64, scale_y: f64,
  rotation: f64,          // NEW
  pivot_x: f64, pivot_y: f64, // NEW
  flip_h: bool, flip_v: bool, // NEW
  // ... rest
) {
  let flip = Vec2::new(
    if flip_h { -1.0 } else { 1.0 },
    if flip_v { -1.0 } else { 1.0 },
  );

  bridge.push_sprite(SpriteCommand {
    rotation: rotation as f32,
    pivot: Vec2::new(pivot_x as f32, pivot_y as f32),
    flip,
    // ...
  });
}
```

---

### Flip Implementation

Flipping is applied in vertex shader by multiplying quad position by flip factors:

```wgsl
// flipH = true  → flip.x = -1.0
// flipV = true  → flip.y = -1.0
let flipped_pos = in.position * in.sprite_flip;
```

This mirrors the quad without needing separate atlas frames.

**UV coordinates do NOT flip** — they stay the same, so the texture is mirrored correctly.

---

### Performance Considerations

**Vertex shader complexity:**
- Rotation matrix: 2 sin/cos calls per sprite
- Modern GPUs can handle millions of trig ops per frame
- Negligible impact (< 0.1ms for 10k sprites)

**Batching:**
- Rotation/pivot/flip add 5 floats to vertex buffer (20 bytes per sprite)
- Instanced rendering still works (all sprites in one draw call)
- No performance regression expected

---

## Part 2: Blend Modes

### Current Limitation

All sprites use alpha blending:
```
final_color = src_color * src_alpha + dst_color * (1 - src_alpha)
```

**Need for other blend modes:**
- **Additive** (particles, glows, explosions) → `dst + src`
- **Multiply** (shadows, darkening) → `dst * src`
- **Screen** (highlights) → `1 - (1 - dst) * (1 - src)`

---

### Blend Mode Implementation

Blend modes are set via wgpu pipeline state, not shader code.

**Option 1: Multiple pipelines** (recommended)
```rust
// core/src/renderer/sprite.rs
pub struct SpritePipeline {
  normal_pipeline: wgpu::RenderPipeline,
  additive_pipeline: wgpu::RenderPipeline,
  multiply_pipeline: wgpu::RenderPipeline,
  screen_pipeline: wgpu::RenderPipeline,
}

impl SpritePipeline {
  fn create_pipeline(device: &wgpu::Device, blend_mode: BlendMode) -> wgpu::RenderPipeline {
    let blend = match blend_mode {
      BlendMode::Normal => wgpu::BlendState::ALPHA_BLENDING, // Default
      BlendMode::Additive => wgpu::BlendState {
        color: wgpu::BlendComponent {
          src_factor: wgpu::BlendFactor::One,
          dst_factor: wgpu::BlendFactor::One,
          operation: wgpu::BlendOperation::Add,
        },
        alpha: wgpu::BlendComponent::OVER,
      },
      BlendMode::Multiply => wgpu::BlendState {
        color: wgpu::BlendComponent {
          src_factor: wgpu::BlendFactor::Dst,
          dst_factor: wgpu::BlendFactor::Zero,
          operation: wgpu::BlendOperation::Add,
        },
        alpha: wgpu::BlendComponent::OVER,
      },
      BlendMode::Screen => wgpu::BlendState {
        color: wgpu::BlendComponent {
          src_factor: wgpu::BlendFactor::One,
          dst_factor: wgpu::BlendFactor::OneMinusSrc,
          operation: wgpu::BlendOperation::Add,
        },
        alpha: wgpu::BlendComponent::OVER,
      },
    };

    // Create pipeline with blend state
    // ...
  }
}
```

**Rendering:**
```rust
// Batch sprites by blend mode
let mut batches: HashMap<BlendMode, Vec<SpriteCommand>> = HashMap::new();
for sprite in sprites {
  batches.entry(sprite.blend_mode).or_default().push(sprite);
}

// Render each batch with correct pipeline
for (blend_mode, batch) in batches {
  let pipeline = match blend_mode {
    BlendMode::Normal => &self.normal_pipeline,
    BlendMode::Additive => &self.additive_pipeline,
    BlendMode::Multiply => &self.multiply_pipeline,
    BlendMode::Screen => &self.screen_pipeline,
  };

  render_pass.set_pipeline(pipeline);
  // Draw batch...
}
```

**Performance:**
- Adds 1-3 draw calls per frame (one per blend mode used)
- Negligible overhead (pipeline switch is cheap)

---

## Part 3: Custom Shaders

### Requirements

1. User can write custom WGSL fragment/vertex shaders
2. Shaders receive sprite data (position, UVs, tint)
3. Shaders can have uniforms (user data)
4. Shader compilation errors are reported clearly
5. Shader hot-reload (reload on file change)

---

### Custom Shader API

```typescript
// runtime/rendering/shader.ts
interface CustomShader {
  id: string;
  vertex?: string;   // WGSL vertex shader source (optional, defaults to sprite.wgsl)
  fragment: string;  // WGSL fragment shader source (required)
  uniforms?: Record<string, number | number[]>; // User data passed to shader
}

function createShader(def: CustomShader): string; // Returns shader ID
function setShaderUniform(shaderId: string, name: string, value: number | number[]): void;
function deleteShader(shaderId: string): void;

// Draw sprite with custom shader
drawSprite('player', {
  x: 100, y: 100,
  shader: 'crt-effect', // Use custom shader
});

// Example: CRT scanline effect
const crtShader = createShader({
  id: 'crt-effect',
  fragment: `
    @group(0) @binding(0) var sprite_texture: texture_2d<f32>;
    @group(0) @binding(1) var sprite_sampler: sampler;

    @group(3) @binding(0) var<uniform> u_time: f32;
    @group(3) @binding(1) var<uniform> u_scanline_intensity: f32;

    @fragment
    fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
      var color = textureSample(sprite_texture, sprite_sampler, in.tex_coords);

      // Scanline effect
      let scanline = sin(in.position.y * 0.5 + u_time) * 0.5 + 0.5;
      color.rgb *= 1.0 - scanline * u_scanline_intensity;

      return color;
    }
  `,
  uniforms: {
    u_time: 0,
    u_scanline_intensity: 0.3,
  },
});

// Update uniforms each frame
onFrame((dt) => {
  time += dt;
  setShaderUniform('crt-effect', 'u_time', time);
});
```

---

### Shader System Architecture

**Rust side:**
```rust
// core/src/renderer/shader.rs
pub struct ShaderManager {
  device: Arc<wgpu::Device>,
  shaders: HashMap<String, CustomShaderPipeline>,
  default_pipeline: Arc<wgpu::RenderPipeline>,
}

pub struct CustomShaderPipeline {
  pipeline: wgpu::RenderPipeline,
  uniform_buffer: wgpu::Buffer,
  bind_group: wgpu::BindGroup,
}

impl ShaderManager {
  pub fn create_shader(
    &mut self,
    id: String,
    vertex_src: Option<String>,
    fragment_src: String,
    uniforms: HashMap<String, UniformValue>,
  ) -> Result<(), ShaderError> {
    // Compile WGSL
    let vertex_module = if let Some(src) = vertex_src {
      self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some(&format!("{}_vertex", id)),
        source: wgpu::ShaderSource::Wgsl(src.into()),
      })
    } else {
      self.default_vertex_module.clone()
    };

    let fragment_module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
      label: Some(&format!("{}_fragment", id)),
      source: wgpu::ShaderSource::Wgsl(fragment_src.into()),
    });

    // Create pipeline
    let pipeline = self.device.create_render_pipeline(/* ... */);

    // Create uniform buffer
    let uniform_buffer = create_uniform_buffer(&uniforms);

    // Create bind group
    let bind_group = create_bind_group(&uniform_buffer);

    self.shaders.insert(id, CustomShaderPipeline { pipeline, uniform_buffer, bind_group });
    Ok(())
  }

  pub fn set_uniform(&mut self, shader_id: &str, name: &str, value: UniformValue) {
    // Write to uniform buffer
  }
}
```

**TypeScript ops:**
```rust
#[op2(async)]
async fn op_create_shader(
  #[string] id: String,
  #[string] fragment_src: String,
  #[serde] uniforms: HashMap<String, serde_json::Value>,
) -> Result<(), anyhow::Error> {
  let shader_manager = /* get from OpState */;
  shader_manager.create_shader(id, None, fragment_src, uniforms)?;
  Ok(())
}

#[op2]
fn op_set_shader_uniform(
  #[string] shader_id: String,
  #[string] name: String,
  #[serde] value: serde_json::Value,
) {
  // ...
}
```

---

### Shader Compilation Errors

```rust
impl ShaderManager {
  pub fn create_shader(/* ... */) -> Result<(), ShaderError> {
    let fragment_module = match self.device.create_shader_module(/* ... */) {
      Ok(module) => module,
      Err(e) => {
        return Err(ShaderError::CompilationFailed {
          shader_id: id.clone(),
          error: format!("{:?}", e),
        });
      }
    };
    // ...
  }
}

// TypeScript side catches error
try {
  createShader({ id: 'crt', fragment: '...' });
} catch (e) {
  console.error('Shader compilation failed:', e.message);
  // Fallback to default shader
}
```

---

### Shader Hot-Reload

Shader files can be reloaded on change:

```rust
// Watch shader files for changes
let shader_watcher = notify::recommended_watcher(move |res: Result<notify::Event, _>| {
  if let Ok(event) = res {
    if event.kind.is_modify() {
      for path in event.paths {
        if path.extension() == Some("wgsl") {
          // Reload shader
          let id = path.file_stem().unwrap().to_string_lossy();
          let src = std::fs::read_to_string(&path).unwrap();
          shader_manager.reload_shader(&id, src);
        }
      }
    }
  }
});
```

---

## Part 4: Post-Processing Pipeline

### Overview

Post-processing applies effects to the entire screen (bloom, blur, vignette, etc.).

**Architecture:**
1. Render game to offscreen texture (render target)
2. Apply post-processing shader to texture
3. Draw full-screen quad with processed texture

---

### Post-Processing API

```typescript
// runtime/rendering/postprocess.ts
interface PostProcessEffect {
  shader: string; // Fragment shader source
  uniforms?: Record<string, number | number[]>;
}

function addPostProcessEffect(effect: PostProcessEffect): string;
function removePostProcessEffect(id: string): void;
function clearPostProcessEffects(): void;

// Example: Bloom effect
addPostProcessEffect({
  shader: `
    @group(0) @binding(0) var screen_texture: texture_2d<f32>;
    @group(0) @binding(1) var screen_sampler: sampler;

    @fragment
    fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
      var color = textureSample(screen_texture, screen_sampler, in.tex_coords);

      // Extract bright pixels
      let brightness = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
      if (brightness > 0.8) {
        color.rgb *= 1.5; // Boost bright areas
      }

      return color;
    }
  `,
});

// Example: Vignette effect
addPostProcessEffect({
  shader: `
    @fragment
    fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
      var color = textureSample(screen_texture, screen_sampler, in.tex_coords);

      // Vignette (darken edges)
      let center = vec2<f32>(0.5, 0.5);
      let dist = distance(in.tex_coords, center);
      let vignette = smoothstep(0.8, 0.3, dist);
      color.rgb *= vignette;

      return color;
    }
  `,
});
```

---

### Render-to-Texture Implementation

**Rust side:**
```rust
// core/src/renderer/postprocess.rs
pub struct PostProcessPipeline {
  // Offscreen render target
  render_target: wgpu::Texture,
  render_target_view: wgpu::TextureView,

  // Full-screen quad
  quad_vertex_buffer: wgpu::Buffer,
  quad_pipeline: wgpu::RenderPipeline,

  // Post-process effects (applied in order)
  effects: Vec<PostProcessEffect>,
}

impl PostProcessPipeline {
  pub fn render(
    &self,
    encoder: &mut wgpu::CommandEncoder,
    final_target: &wgpu::TextureView,
  ) {
    // 1. Render game to offscreen texture
    let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
      color_attachments: &[Some(wgpu::RenderPassColorAttachment {
        view: &self.render_target_view,
        ops: wgpu::Operations {
          load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
          store: wgpu::StoreOp::Store,
        },
        ..Default::default()
      })],
      ..Default::default()
    });

    // Draw all sprites to render_target
    sprite_pipeline.render(&mut render_pass);
    drop(render_pass);

    // 2. Apply post-process effects
    let mut current_texture = &self.render_target_view;
    for effect in &self.effects {
      // Draw full-screen quad with effect shader
      let mut render_pass = encoder.begin_render_pass(/* ... */);
      render_pass.set_pipeline(&effect.pipeline);
      render_pass.set_bind_group(0, &effect.bind_group, &[]); // Bind input texture
      render_pass.draw(0..6, 0..1); // Full-screen quad (2 triangles)
      drop(render_pass);

      current_texture = &effect.output_view;
    }

    // 3. Final blit to screen
    encoder.copy_texture_to_texture(/* current_texture → final_target */);
  }
}
```

**Performance:**
- Render-to-texture adds ~0.5ms per effect
- Each effect is one full-screen pass
- Keep effects count low (<5)

---

### Built-in Post-Process Effects

```typescript
// Blur (Gaussian)
function addBlurEffect(radius: number): string;

// Bloom (bright areas glow)
function addBloomEffect(threshold: number, intensity: number): string;

// Vignette (darken edges)
function addVignetteEffect(intensity: number): string;

// Chromatic aberration (RGB split)
function addChromaticAberrationEffect(offset: number): string;

// CRT (scanlines + barrel distortion)
function addCRTEffect(): string;

// Example usage
addBloomEffect(0.8, 1.5);
addVignetteEffect(0.5);
```

---

## Implementation Plan

### Week 1: Sprite Rotation + Pivot
- [ ] Add rotation/pivot/flip to SpriteCommand
- [ ] Update vertex shader (rotation matrix, pivot offset)
- [ ] Add #[op2] params for new fields
- [ ] Tests: rotation math, pivot behavior (20 tests)

### Week 2: Blend Modes
- [ ] Create multiple pipelines (normal, additive, multiply, screen)
- [ ] Batch sprites by blend mode
- [ ] Add blend mode to SpriteOptions
- [ ] Tests: blend mode rendering (manual verification)

### Week 3: Custom Shaders
- [ ] ShaderManager (compile, store, bind)
- [ ] Uniform buffer management
- [ ] Shader hot-reload
- [ ] Error reporting
- [ ] Tests: shader compilation, uniform updates (30 tests)

### Week 4: Post-Processing
- [ ] Render-to-texture setup
- [ ] Full-screen quad rendering
- [ ] Effect chaining (multiple passes)
- [ ] Built-in effects (bloom, blur, vignette)
- [ ] Tests: effect composition (manual verification)

### Week 5: Asteroids Demo
- [ ] Rotating ship (thrust + rotation controls)
- [ ] Spinning asteroids
- [ ] Particle trails (additive blending)
- [ ] Bloom on explosions
- [ ] CRT shader (optional)

### Week 6: Polish + Optimization
- [ ] Performance profiling (measure GPU time)
- [ ] Optimize batching (minimize pipeline switches)
- [ ] Documentation (shader tutorial)
- [ ] Retrofit existing demos (use new features)

**Total: ~50 tests, ~3000 LOC (Rust + TypeScript)**

---

## Success Criteria

### Sprite Transforms
- [ ] Ship rotates smoothly (60 FPS with 100+ rotating sprites)
- [ ] Pivot point works correctly (sword swings around hilt)
- [ ] Flip works without separate atlas frames

### Blend Modes
- [ ] Additive particles glow convincingly
- [ ] Multiply creates realistic shadows
- [ ] No visual artifacts (z-fighting, blending errors)

### Custom Shaders
- [ ] Can write custom fragment shader
- [ ] Shader compilation errors are clear
- [ ] Shader hot-reload works (reload on save)
- [ ] Uniforms update correctly

### Post-Processing
- [ ] Bloom effect looks good (no halos)
- [ ] Blur is smooth (no banding)
- [ ] Multiple effects can be chained
- [ ] Performance is acceptable (<2ms for 3 effects)

### Demo
- [ ] Asteroids clone is fully playable
- [ ] Ship and asteroids rotate realistically
- [ ] Particle trails with additive blending look good
- [ ] CRT shader adds retro feel

---

## Open Questions

### 1. Should rotation be degrees or radians?

**Radians** (recommended):
- Standard in graphics (OpenGL, WebGL, wgpu)
- Math functions (sin, cos) use radians
- More precise (no conversion overhead)

**Degrees**:
- More intuitive for humans (90° = quarter turn)
- Need conversion (deg * PI / 180)

**Recommendation**: Radians (align with web standards, `Math.PI` helpers)

---

### 2. How to handle shader uniforms efficiently?

**Option 1: Per-sprite uniforms** (flexible, slow)
```rust
// Each sprite can have different uniform values
struct SpriteCommand {
  shader_id: Option<String>,
  uniforms: HashMap<String, f32>,
}
// Cons: Expensive (buffer write per sprite)
```

**Option 2: Global uniforms** (fast, inflexible)
```rust
// All sprites using shader share uniforms
shader_manager.set_global_uniform("u_time", time);
// Cons: Can't have per-sprite variation
```

**Recommendation**: Option 2 (global uniforms) — sufficient for most effects (time, screen size, etc.)

---

### 3. Should post-processing be per-scene or global?

**Global** (recommended):
- Apply to entire screen
- Simpler to implement

**Per-scene**:
- Different effects for menu vs gameplay
- More control

**Recommendation**: Global for Phase 10, per-scene in Phase 11 if needed

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rotation math is wrong (gimbal lock, etc.) | Low | High | Use standard 2D rotation matrix, test thoroughly |
| Blend modes look wrong | Medium | Medium | Visual testing, compare to reference (Photoshop) |
| Shader compilation is slow | Low | Medium | Cache compiled pipelines |
| Post-processing tanks frame rate | Medium | High | Profile, limit effects to <5 per frame |
| WGSL syntax errors are cryptic | High | Medium | Wrap errors with helpful messages |

---

## Future Enhancements (Phase 10.5)

- [ ] Normal mapping (fake 3D lighting on 2D sprites)
- [ ] Sprite masking (clip regions)
- [ ] Signed distance field (SDF) rendering (for crisp vector graphics)
- [ ] Per-pixel lighting (instead of per-sprite)
- [ ] Shadow casting (2D shadows from point lights)
- [ ] Deferred rendering (separate geometry and lighting passes)
