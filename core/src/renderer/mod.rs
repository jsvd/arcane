mod gpu;
mod sprite;
mod texture;
pub mod camera;
mod tilemap;
mod lighting;
pub mod font;
pub mod msdf;
pub mod shader;
pub mod postprocess;
pub mod radiance;
pub mod geometry;
pub mod rendertarget;
pub mod sdf;
// Test harness is always public for integration tests
pub mod test_harness;

pub use gpu::GpuContext;
pub use sprite::{SpriteCommand, SpritePipeline};
pub use texture::{TextureId, TextureStore};
pub use camera::Camera2D;
pub use tilemap::{Tilemap, TilemapStore};
pub use lighting::{LightingState, LightingUniform, PointLight, LightData, MAX_LIGHTS};
pub use msdf::{MsdfFont, MsdfFontStore, MsdfGlyph};
pub use shader::ShaderStore;
pub use postprocess::PostProcessPipeline;
pub use radiance::{RadiancePipeline, RadianceState, EmissiveSurface, Occluder, DirectionalLight, SpotLight};
pub use geometry::GeometryBatch;
pub use rendertarget::RenderTargetStore;
pub use sdf::{SdfPipelineStore, SdfCommand, SdfFill};

use crate::scripting::geometry_ops::GeoCommand;
use crate::scripting::sdf_ops::SdfDrawCommand;
use anyhow::Result;

/// Convert a scripting-layer SdfDrawCommand to a rendering-layer SdfCommand.
fn convert_sdf_draw_command(c: SdfDrawCommand) -> SdfCommand {
    let fill = match c.fill_type {
        0 => SdfFill::Solid { color: c.color },
        1 => SdfFill::Outline { color: c.color, thickness: c.fill_param },
        2 => SdfFill::SolidWithOutline { fill: c.color, outline: c.color2, thickness: c.fill_param },
        3 => SdfFill::Gradient { from: c.color, to: c.color2, angle: c.fill_param, scale: c.gradient_scale },
        4 => SdfFill::Glow { color: c.color, intensity: c.fill_param },
        5 => SdfFill::CosinePalette {
            a: [c.palette_params[0], c.palette_params[1], c.palette_params[2]],
            b: [c.palette_params[3], c.palette_params[4], c.palette_params[5]],
            c: [c.palette_params[6], c.palette_params[7], c.palette_params[8]],
            d: [c.palette_params[9], c.palette_params[10], c.palette_params[11]],
        },
        _ => SdfFill::Solid { color: c.color },
    };
    SdfCommand {
        sdf_expr: c.sdf_expr,
        fill,
        x: c.x,
        y: c.y,
        bounds: c.bounds,
        layer: c.layer,
        rotation: c.rotation,
        scale: c.scale,
        opacity: c.opacity,
    }
}

/// A single step in the interleaved render schedule.
/// Sprites, geometry, and SDF commands are merged by layer so that layer ordering
/// is respected across all pipeline types.
#[derive(Debug, PartialEq)]
enum RenderOp {
    /// Render a contiguous range of sorted sprite commands.
    Sprites { start: usize, end: usize },
    /// Render a contiguous range of sorted geometry commands.
    Geometry { start: usize, end: usize },
    /// Render a contiguous range of sorted SDF commands.
    Sdf { start: usize, end: usize },
}

/// Build an interleaved render schedule from sorted sprite, geometry, and SDF commands.
///
/// All input slices must be pre-sorted by layer. The schedule merges them so that
/// lower layers render first. At the same layer, the order is: sprites, then geometry, then SDF.
fn build_render_schedule(
    sprites: &[SpriteCommand],
    geo: &[GeoCommand],
    sdf: &[SdfCommand],
) -> Vec<RenderOp> {
    let mut schedule = Vec::new();
    let mut si = 0;
    let mut gi = 0;
    let mut di = 0;

    while si < sprites.len() || gi < geo.len() || di < sdf.len() {
        // Get current layer for each type (MAX if exhausted)
        let sprite_layer = if si < sprites.len() { sprites[si].layer } else { i32::MAX };
        let geo_layer = if gi < geo.len() { geo[gi].layer() } else { i32::MAX };
        let sdf_layer = if di < sdf.len() { sdf[di].layer } else { i32::MAX };

        // Find minimum layer
        let min_layer = sprite_layer.min(geo_layer).min(sdf_layer);

        // At the same layer: sprites first, then geo, then SDF
        if sprite_layer == min_layer {
            let start = si;
            // Consume all sprites at or before the next geo/sdf layer
            let bound = geo_layer.min(sdf_layer);
            while si < sprites.len() && sprites[si].layer <= bound {
                si += 1;
            }
            schedule.push(RenderOp::Sprites { start, end: si });
        } else if geo_layer == min_layer {
            let start = gi;
            // Consume geo commands at layers < next sprite layer and <= next sdf layer
            // (sprites come before geo at same layer, but geo comes before sdf)
            let sprite_bound = if si < sprites.len() { sprites[si].layer } else { i32::MAX };
            let sdf_bound = if di < sdf.len() { sdf[di].layer } else { i32::MAX };
            while gi < geo.len() && geo[gi].layer() < sprite_bound && geo[gi].layer() <= sdf_bound {
                gi += 1;
            }
            schedule.push(RenderOp::Geometry { start, end: gi });
        } else {
            let start = di;
            // Consume SDF commands at layers < next sprite/geo layer
            let sprite_bound = if si < sprites.len() { sprites[si].layer } else { i32::MAX };
            let geo_bound = if gi < geo.len() { geo[gi].layer() } else { i32::MAX };
            while di < sdf.len() && sdf[di].layer < sprite_bound && sdf[di].layer < geo_bound {
                di += 1;
            }
            schedule.push(RenderOp::Sdf { start, end: di });
        }
    }

    schedule
}

/// Top-level renderer that owns the GPU context, sprite pipeline, and textures.
pub struct Renderer {
    pub gpu: GpuContext,
    pub sprites: SpritePipeline,
    pub geometry: GeometryBatch,
    pub shaders: ShaderStore,
    pub postprocess: PostProcessPipeline,
    pub textures: TextureStore,
    pub camera: Camera2D,
    pub lighting: LightingState,
    pub radiance: RadiancePipeline,
    pub radiance_state: RadianceState,
    /// Off-screen render targets (owns the GPU textures; bind groups in TextureStore).
    pub render_targets: RenderTargetStore,
    /// Sprite commands queued for the current frame.
    pub frame_commands: Vec<SpriteCommand>,
    /// Geometry commands queued for the current frame (drained from GeoState).
    pub geo_commands: Vec<GeoCommand>,
    /// SDF commands queued for the current frame (drained from SdfState).
    pub sdf_commands: Vec<SdfCommand>,
    /// SDF pipeline store for rendering signed distance field shapes.
    pub sdf_pipeline: SdfPipelineStore,
    /// Display scale factor (e.g. 2.0 on Retina). Used to convert physical → logical pixels.
    pub scale_factor: f32,
    /// Clear color for the render pass background. Default: dark blue-gray.
    pub clear_color: [f32; 4],
    /// Elapsed time in seconds (accumulated, for shader built-ins).
    pub elapsed_time: f32,
    /// Frame delta time in seconds (for shader built-ins).
    pub delta_time: f32,
    /// Mouse position in screen pixels (for shader built-ins).
    pub mouse_pos: [f32; 2],
    /// When true, the next render_frame() will capture the surface to a PNG.
    pub capture_pending: bool,
    /// PNG bytes from the last capture (taken by the frame callback).
    pub capture_result: Option<Vec<u8>>,
}

impl Renderer {
    /// Create a new renderer attached to a winit window.
    pub fn new(window: std::sync::Arc<winit::window::Window>) -> Result<Self> {
        let scale_factor = window.scale_factor() as f32;
        let gpu = GpuContext::new(window)?;
        let sprites = SpritePipeline::new(&gpu);
        let geometry = GeometryBatch::new(&gpu);
        let shaders = ShaderStore::new(&gpu);
        let postprocess = PostProcessPipeline::new(&gpu);
        let sdf_pipeline = SdfPipelineStore::new(&gpu);
        let radiance_pipeline = RadiancePipeline::new(&gpu);
        let textures = TextureStore::new();
        // Set camera viewport to logical pixels so world units are DPI-independent
        let logical_w = gpu.config.width as f32 / scale_factor;
        let logical_h = gpu.config.height as f32 / scale_factor;
        let camera = Camera2D {
            viewport_size: [logical_w, logical_h],
            ..Camera2D::default()
        };
        Ok(Self {
            gpu,
            sprites,
            geometry,
            shaders,
            postprocess,
            radiance: radiance_pipeline,
            radiance_state: RadianceState::new(),
            textures,
            camera,
            lighting: LightingState::default(),
            render_targets: RenderTargetStore::new(),
            frame_commands: Vec::new(),
            geo_commands: Vec::new(),
            sdf_commands: Vec::new(),
            sdf_pipeline,
            scale_factor,
            clear_color: [0.1, 0.1, 0.15, 1.0],
            elapsed_time: 0.0,
            delta_time: 0.0,
            mouse_pos: [0.0, 0.0],
            capture_pending: false,
            capture_result: None,
        })
    }

    /// Set geometry commands for the current frame (drained from GeoState in dev.rs).
    pub fn set_geo_commands(&mut self, cmds: Vec<GeoCommand>) {
        self.geo_commands = cmds;
    }

    /// Set SDF commands for the current frame.
    /// Converts SdfDrawCommand (from scripting ops) to SdfCommand (for rendering).
    pub fn set_sdf_commands(&mut self, cmds: Vec<SdfDrawCommand>) {
        self.sdf_commands = cmds.into_iter().map(convert_sdf_draw_command).collect();
    }

    /// Render the current frame's sprite, geometry, and SDF commands, interleaved by layer.
    pub fn render_frame(&mut self) -> Result<()> {
        let output = self.gpu.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("frame_encoder") },
        );

        // Sort sprites by layer → shader_id → blend_mode → texture_id for batching
        self.frame_commands.sort_by(|a, b| {
            a.layer
                .cmp(&b.layer)
                .then(a.shader_id.cmp(&b.shader_id))
                .then(a.blend_mode.cmp(&b.blend_mode))
                .then(a.texture_id.cmp(&b.texture_id))
        });

        // Sort geometry commands by layer
        self.geo_commands.sort_by_key(|c| c.layer());

        // Sort SDF commands by layer
        self.sdf_commands.sort_by_key(|c| c.layer);

        // Build interleaved render schedule
        let schedule = build_render_schedule(&self.frame_commands, &self.geo_commands, &self.sdf_commands);

        // Flush custom shader uniforms with auto-injected built-ins
        self.shaders.flush(
            &self.gpu.queue,
            self.elapsed_time,
            self.delta_time,
            self.camera.viewport_size,
            self.mouse_pos,
        );

        let lighting_uniform = self.lighting.to_uniform();
        let clear_color = wgpu::Color {
            r: self.clear_color[0] as f64,
            g: self.clear_color[1] as f64,
            b: self.clear_color[2] as f64,
            a: self.clear_color[3] as f64,
        };

        // Write camera + lighting uniforms once for the whole frame
        self.sprites.prepare(&self.gpu.device, &self.gpu.queue, &self.camera, &lighting_uniform);
        self.sdf_pipeline.prepare(&self.gpu.queue, &self.camera, 0.0);

        // Run radiance cascade GI compute pass (if enabled)
        let gi_active = self.radiance.compute(
            &self.gpu,
            &mut encoder,
            &self.radiance_state,
            &self.lighting,
            self.camera.x,
            self.camera.y,
            self.camera.viewport_size[0],
            self.camera.viewport_size[1],
        );

        if self.postprocess.has_effects() {
            // Render to offscreen target, then apply effects to surface
            {
                let sprite_target = self.postprocess.sprite_target(&self.gpu);
                let camera_bg = self.sprites.camera_bind_group();

                if schedule.is_empty() {
                    // No commands at all — still need to clear
                    self.sprites.render(
                        &self.gpu.device, &self.gpu.queue, &self.textures, &self.shaders,
                        &[], sprite_target, &mut encoder, Some(clear_color),
                    );
                } else {
                    let mut first = true;
                    for op in &schedule {
                        let cc = if first { Some(clear_color) } else { None };
                        first = false;
                        match op {
                            RenderOp::Sprites { start, end } => {
                                self.sprites.render(
                                    &self.gpu.device, &self.gpu.queue, &self.textures, &self.shaders,
                                    &self.frame_commands[*start..*end],
                                    sprite_target, &mut encoder, cc,
                                );
                            }
                            RenderOp::Geometry { start, end } => {
                                self.geometry.flush_commands(
                                    &self.gpu.device, &mut encoder, sprite_target,
                                    camera_bg, &self.geo_commands[*start..*end], cc,
                                );
                            }
                            RenderOp::Sdf { start, end } => {
                                self.sdf_pipeline.render(
                                    &self.gpu.device, &mut encoder, sprite_target,
                                    &self.sdf_commands[*start..*end], cc,
                                );
                            }
                        }
                    }
                }
            }
            // Apply GI light texture to the offscreen target before post-processing
            if gi_active {
                let sprite_target = self.postprocess.sprite_target(&self.gpu);
                self.radiance.compose(&mut encoder, sprite_target);
            }
            self.postprocess.apply(&self.gpu, &mut encoder, &view);
        } else {
            // No effects — render directly to surface
            let camera_bg = self.sprites.camera_bind_group();

            if schedule.is_empty() {
                // No commands at all — still need to clear
                self.sprites.render(
                    &self.gpu.device, &self.gpu.queue, &self.textures, &self.shaders,
                    &[], &view, &mut encoder, Some(clear_color),
                );
            } else {
                let mut first = true;
                for op in &schedule {
                    let cc = if first { Some(clear_color) } else { None };
                    first = false;
                    match op {
                        RenderOp::Sprites { start, end } => {
                            self.sprites.render(
                                &self.gpu.device, &self.gpu.queue, &self.textures, &self.shaders,
                                &self.frame_commands[*start..*end],
                                &view, &mut encoder, cc,
                            );
                        }
                        RenderOp::Geometry { start, end } => {
                            self.geometry.flush_commands(
                                &self.gpu.device, &mut encoder, &view,
                                camera_bg, &self.geo_commands[*start..*end], cc,
                            );
                        }
                        RenderOp::Sdf { start, end } => {
                            self.sdf_pipeline.render(
                                &self.gpu.device, &mut encoder, &view,
                                &self.sdf_commands[*start..*end], cc,
                            );
                        }
                    }
                }
            }
            // Apply GI light texture to the surface
            if gi_active {
                self.radiance.compose(&mut encoder, &view);
            }
        }

        self.gpu.queue.submit(std::iter::once(encoder.finish()));

        // Capture the rendered frame if requested (before present consumes the surface)
        if self.capture_pending {
            self.capture_pending = false;
            self.capture_result = self.capture_surface(&output.texture);
        }

        output.present();

        self.frame_commands.clear();
        self.geo_commands.clear();
        self.sdf_commands.clear();
        Ok(())
    }

    /// Resize the surface when the window size changes.
    /// GPU surface uses physical pixels; camera viewport uses logical pixels.
    pub fn resize(&mut self, physical_width: u32, physical_height: u32, scale_factor: f32) {
        if physical_width > 0 && physical_height > 0 {
            self.scale_factor = scale_factor;
            self.gpu.config.width = physical_width;
            self.gpu.config.height = physical_height;
            self.gpu.surface.configure(&self.gpu.device, &self.gpu.config);
            // Camera uses logical pixels so 1 world unit ≈ 1 logical pixel at zoom 1
            self.camera.viewport_size = [
                physical_width as f32 / scale_factor,
                physical_height as f32 / scale_factor,
            ];
        }
    }

    // ── Frame capture ─────────────────────────────────────────────────────

    /// Copy the surface texture to a CPU-side PNG. Returns None on failure.
    fn capture_surface(&self, texture: &wgpu::Texture) -> Option<Vec<u8>> {
        let width = self.gpu.config.width;
        let height = self.gpu.config.height;
        let bytes_per_pixel: u32 = 4;
        let unpadded_bytes_per_row = width * bytes_per_pixel;
        let padded_bytes_per_row = ((unpadded_bytes_per_row + 255) / 256) * 256;

        let buffer = self.gpu.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("capture_readback"),
            size: (padded_bytes_per_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = self.gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("capture_encoder") },
        );

        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo {
                texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyBufferInfo {
                buffer: &buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(padded_bytes_per_row),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        );

        self.gpu.queue.submit(std::iter::once(encoder.finish()));

        // Map the buffer synchronously
        let buffer_slice = buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });
        self.gpu.device.poll(wgpu::Maintain::Wait);

        if rx.recv().ok()?.ok().is_none() {
            return None;
        }

        let data = buffer_slice.get_mapped_range();

        // Strip row padding and handle BGRA→RGBA if needed
        let is_bgra = format!("{:?}", self.gpu.config.format).contains("Bgra");
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for y in 0..height {
            let start = (y * padded_bytes_per_row) as usize;
            let end = start + (width * 4) as usize;
            let row = &data[start..end];
            if is_bgra {
                // Swap B↔R for each pixel
                for chunk in row.chunks_exact(4) {
                    pixels.extend_from_slice(&[chunk[2], chunk[1], chunk[0], chunk[3]]);
                }
            } else {
                pixels.extend_from_slice(row);
            }
        }

        drop(data);
        buffer.unmap();

        // Encode to PNG using the `image` crate
        use image::ImageEncoder;
        let mut png_bytes = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        if encoder.write_image(&pixels, width, height, image::ExtendedColorType::Rgba8).is_err() {
            return None;
        }

        Some(png_bytes)
    }

    // ── Render target helpers ──────────────────────────────────────────────

    /// Allocate a new off-screen render target and register it as a samplable texture.
    pub fn create_render_target(&mut self, id: u32, width: u32, height: u32) {
        let surface_format = self.gpu.config.format;
        self.render_targets.create(&self.gpu.device, id, width, height, surface_format);
        if let Some(view) = self.render_targets.get_view(id) {
            self.textures.register_render_target(
                &self.gpu.device,
                &self.sprites.texture_bind_group_layout,
                id,
                view,
                width,
                height,
            );
        }
    }

    /// Free a render target's GPU resources and remove it from the texture store.
    pub fn destroy_render_target(&mut self, id: u32) {
        self.render_targets.destroy(id);
        self.textures.unregister_render_target(id);
    }

    /// Render sprite commands into each queued render target (off-screen pre-pass).
    ///
    /// Call this BEFORE `render_frame()` so targets are ready as sprite inputs.
    /// Uses a separate command encoder + GPU submit to avoid ordering conflicts.
    pub fn render_targets_prepass(
        &mut self,
        target_queues: std::collections::HashMap<u32, Vec<SpriteCommand>>,
    ) {
        if target_queues.is_empty() {
            return;
        }

        let mut encoder = self.gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("rt_encoder") },
        );
        let lighting_uniform = self.lighting.to_uniform();

        for (target_id, mut cmds) in target_queues {
            let view = self.render_targets.get_view(target_id);
            let dims = self.render_targets.get_dims(target_id);
            if let (Some(view), Some((tw, th))) = (view, dims) {
                // Sort by layer → shader_id → blend_mode → texture_id
                cmds.sort_by(|a, b| {
                    a.layer
                        .cmp(&b.layer)
                        .then(a.shader_id.cmp(&b.shader_id))
                        .then(a.blend_mode.cmp(&b.blend_mode))
                        .then(a.texture_id.cmp(&b.texture_id))
                });
                // Orthographic camera: (0,0) = top-left of the render target
                let target_camera = Camera2D {
                    x: tw as f32 / 2.0,
                    y: th as f32 / 2.0,
                    zoom: 1.0,
                    viewport_size: [tw as f32, th as f32],
                    ..Camera2D::default()
                };
                self.sprites.prepare(&self.gpu.device, &self.gpu.queue, &target_camera, &lighting_uniform);
                self.sprites.render(
                    &self.gpu.device,
                    &self.gpu.queue,
                    &self.textures,
                    &self.shaders,
                    &cmds,
                    view,
                    &mut encoder,
                    Some(wgpu::Color { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }),
                );
            }
        }

        self.gpu.queue.submit(std::iter::once(encoder.finish()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Test helpers ─────────────────────────────────────────────────────

    fn sprite(layer: i32) -> SpriteCommand {
        SpriteCommand {
            texture_id: 1, x: 0.0, y: 0.0, w: 16.0, h: 16.0, layer,
            uv_x: 0.0, uv_y: 0.0, uv_w: 1.0, uv_h: 1.0,
            tint_r: 1.0, tint_g: 1.0, tint_b: 1.0, tint_a: 1.0,
            rotation: 0.0, origin_x: 0.5, origin_y: 0.5,
            flip_x: false, flip_y: false, opacity: 1.0,
            blend_mode: 0, shader_id: 0,
        }
    }

    fn geo(layer: i32) -> GeoCommand {
        GeoCommand::Triangle {
            x1: 0.0, y1: 0.0, x2: 16.0, y2: 0.0, x3: 8.0, y3: 16.0,
            r: 1.0, g: 1.0, b: 1.0, a: 1.0, layer,
        }
    }

    fn sdf(layer: i32) -> SdfCommand {
        SdfCommand {
            sdf_expr: "length(p) - 10.0".to_string(),
            fill: SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] },
            x: 32.0, y: 32.0, bounds: 15.0, layer,
            rotation: 0.0, scale: 1.0, opacity: 1.0,
        }
    }

    fn sdf_draw(fill_type: u32) -> SdfDrawCommand {
        SdfDrawCommand {
            sdf_expr: "length(p) - 10.0".to_string(),
            fill_type,
            color: [1.0, 0.0, 0.0, 1.0],
            color2: [0.0, 1.0, 0.0, 1.0],
            fill_param: 2.0,
            palette_params: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0, 1.0, 1.0, 0.0, 0.33, 0.67],
            gradient_scale: 1.5,
            x: 10.0, y: 20.0, bounds: 30.0, layer: 5,
            rotation: 0.1, scale: 2.0, opacity: 0.8,
        }
    }

    // ── build_render_schedule tests ──────────────────────────────────────

    #[test]
    fn test_schedule_empty_inputs() {
        let schedule = build_render_schedule(&[], &[], &[]);
        assert!(schedule.is_empty());
    }

    #[test]
    fn test_schedule_sprites_only() {
        let sprites = vec![sprite(0), sprite(1)];
        let schedule = build_render_schedule(&sprites, &[], &[]);
        assert_eq!(schedule, vec![RenderOp::Sprites { start: 0, end: 2 }]);
    }

    #[test]
    fn test_schedule_geo_only() {
        let geo_cmds = vec![geo(0), geo(1)];
        let schedule = build_render_schedule(&[], &geo_cmds, &[]);
        assert_eq!(schedule, vec![RenderOp::Geometry { start: 0, end: 2 }]);
    }

    #[test]
    fn test_schedule_sdf_only() {
        let sdf_cmds = vec![sdf(0), sdf(1)];
        let schedule = build_render_schedule(&[], &[], &sdf_cmds);
        assert_eq!(schedule, vec![RenderOp::Sdf { start: 0, end: 2 }]);
    }

    #[test]
    fn test_schedule_same_layer_order() {
        // All at layer 0: sprites first, then geo, then sdf
        let sprites = vec![sprite(0)];
        let geo_cmds = vec![geo(0)];
        let sdf_cmds = vec![sdf(0)];
        let schedule = build_render_schedule(&sprites, &geo_cmds, &sdf_cmds);
        assert_eq!(schedule.len(), 3);
        assert_eq!(schedule[0], RenderOp::Sprites { start: 0, end: 1 });
        assert_eq!(schedule[1], RenderOp::Geometry { start: 0, end: 1 });
        assert_eq!(schedule[2], RenderOp::Sdf { start: 0, end: 1 });
    }

    #[test]
    fn test_schedule_interleaved_layers() {
        // sprites at 0, geo at 1, sdf at 2
        let sprites = vec![sprite(0)];
        let geo_cmds = vec![geo(1)];
        let sdf_cmds = vec![sdf(2)];
        let schedule = build_render_schedule(&sprites, &geo_cmds, &sdf_cmds);
        assert_eq!(schedule.len(), 3);
        assert_eq!(schedule[0], RenderOp::Sprites { start: 0, end: 1 });
        assert_eq!(schedule[1], RenderOp::Geometry { start: 0, end: 1 });
        assert_eq!(schedule[2], RenderOp::Sdf { start: 0, end: 1 });
    }

    #[test]
    fn test_schedule_mixed_layers() {
        // sprites at 0 and 2, geo at 1
        let sprites = vec![sprite(0), sprite(2)];
        let geo_cmds = vec![geo(1)];
        let schedule = build_render_schedule(&sprites, &geo_cmds, &[]);
        // Sprite at layer 0 first, then geo at layer 1, then sprite at layer 2
        assert!(schedule.len() >= 2);
        assert!(matches!(schedule[0], RenderOp::Sprites { .. }));
    }

    #[test]
    fn test_schedule_all_consumed() {
        // Verify all commands are consumed (no gaps in ranges)
        let sprites = vec![sprite(0), sprite(0), sprite(1)];
        let geo_cmds = vec![geo(0), geo(2)];
        let sdf_cmds = vec![sdf(1)];
        let schedule = build_render_schedule(&sprites, &geo_cmds, &sdf_cmds);

        let mut sprite_count = 0;
        let mut geo_count = 0;
        let mut sdf_count = 0;
        for op in &schedule {
            match op {
                RenderOp::Sprites { start, end } => sprite_count += end - start,
                RenderOp::Geometry { start, end } => geo_count += end - start,
                RenderOp::Sdf { start, end } => sdf_count += end - start,
            }
        }
        assert_eq!(sprite_count, 3, "all sprites consumed");
        assert_eq!(geo_count, 2, "all geo consumed");
        assert_eq!(sdf_count, 1, "all sdf consumed");
    }

    // ── convert_sdf_draw_command tests ───────────────────────────────────

    #[test]
    fn test_convert_sdf_solid() {
        let cmd = convert_sdf_draw_command(sdf_draw(0));
        assert!(matches!(cmd.fill, SdfFill::Solid { color } if color == [1.0, 0.0, 0.0, 1.0]));
    }

    #[test]
    fn test_convert_sdf_outline() {
        let cmd = convert_sdf_draw_command(sdf_draw(1));
        assert!(matches!(cmd.fill, SdfFill::Outline { color, thickness }
            if color == [1.0, 0.0, 0.0, 1.0] && thickness == 2.0));
    }

    #[test]
    fn test_convert_sdf_solid_with_outline() {
        let cmd = convert_sdf_draw_command(sdf_draw(2));
        assert!(matches!(cmd.fill, SdfFill::SolidWithOutline { fill, outline, thickness }
            if fill == [1.0, 0.0, 0.0, 1.0] && outline == [0.0, 1.0, 0.0, 1.0] && thickness == 2.0));
    }

    #[test]
    fn test_convert_sdf_gradient() {
        let cmd = convert_sdf_draw_command(sdf_draw(3));
        assert!(matches!(cmd.fill, SdfFill::Gradient { from, to, angle, scale }
            if from == [1.0, 0.0, 0.0, 1.0] && to == [0.0, 1.0, 0.0, 1.0]
            && angle == 2.0 && scale == 1.5));
    }

    #[test]
    fn test_convert_sdf_glow() {
        let cmd = convert_sdf_draw_command(sdf_draw(4));
        assert!(matches!(cmd.fill, SdfFill::Glow { color, intensity }
            if color == [1.0, 0.0, 0.0, 1.0] && intensity == 2.0));
    }

    #[test]
    fn test_convert_sdf_cosine_palette() {
        let cmd = convert_sdf_draw_command(sdf_draw(5));
        assert!(matches!(cmd.fill, SdfFill::CosinePalette { a, b, c, d }
            if a == [0.5, 0.5, 0.5] && b == [0.5, 0.5, 0.5]
            && c == [1.0, 1.0, 1.0] && d == [0.0, 0.33, 0.67]));
    }

    #[test]
    fn test_convert_sdf_unknown_fallback() {
        let cmd = convert_sdf_draw_command(sdf_draw(99));
        assert!(matches!(cmd.fill, SdfFill::Solid { color } if color == [1.0, 0.0, 0.0, 1.0]));
    }

    #[test]
    fn test_convert_sdf_field_passthrough() {
        let cmd = convert_sdf_draw_command(sdf_draw(0));
        assert_eq!(cmd.sdf_expr, "length(p) - 10.0");
        assert_eq!(cmd.x, 10.0);
        assert_eq!(cmd.y, 20.0);
        assert_eq!(cmd.bounds, 30.0);
        assert_eq!(cmd.layer, 5);
        assert_eq!(cmd.rotation, 0.1);
        assert_eq!(cmd.scale, 2.0);
        assert_eq!(cmd.opacity, 0.8);
    }
}
