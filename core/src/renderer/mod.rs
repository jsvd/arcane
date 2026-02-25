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

/// A single step in the interleaved render schedule.
/// Sprites, geometry, and SDF commands are merged by layer so that layer ordering
/// is respected across all pipeline types.
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
        })
    }

    /// Set geometry commands for the current frame (drained from GeoState in dev.rs).
    pub fn set_geo_commands(&mut self, cmds: Vec<GeoCommand>) {
        self.geo_commands = cmds;
    }

    /// Set SDF commands for the current frame.
    /// Converts SdfDrawCommand (from scripting ops) to SdfCommand (for rendering).
    pub fn set_sdf_commands(&mut self, cmds: Vec<SdfDrawCommand>) {
        self.sdf_commands = cmds.into_iter().map(|c| {
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
        }).collect();
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
