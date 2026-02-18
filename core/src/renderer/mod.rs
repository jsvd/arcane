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

use anyhow::Result;

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
    /// Sprite commands queued for the current frame.
    pub frame_commands: Vec<SpriteCommand>,
    /// Display scale factor (e.g. 2.0 on Retina). Used to convert physical → logical pixels.
    pub scale_factor: f32,
    /// Clear color for the render pass background. Default: dark blue-gray.
    pub clear_color: [f32; 4],
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
            frame_commands: Vec::new(),
            scale_factor,
            clear_color: [0.1, 0.1, 0.15, 1.0],
        })
    }

    /// Render the current frame's sprite commands and present.
    pub fn render_frame(&mut self) -> Result<()> {
        let output = self.gpu.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("frame_encoder") },
        );

        // Sort by layer → shader_id → blend_mode → texture_id for batching
        self.frame_commands.sort_by(|a, b| {
            a.layer
                .cmp(&b.layer)
                .then(a.shader_id.cmp(&b.shader_id))
                .then(a.blend_mode.cmp(&b.blend_mode))
                .then(a.texture_id.cmp(&b.texture_id))
        });

        // Flush dirty custom shader uniforms
        self.shaders.flush(&self.gpu);

        let lighting_uniform = self.lighting.to_uniform();
        let clear_color = wgpu::Color {
            r: self.clear_color[0] as f64,
            g: self.clear_color[1] as f64,
            b: self.clear_color[2] as f64,
            a: self.clear_color[3] as f64,
        };

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
            // Render sprites to offscreen target, then apply effects to surface
            {
                let sprite_target = self.postprocess.sprite_target(&self.gpu);
                self.sprites.render(
                    &self.gpu,
                    &self.textures,
                    &self.shaders,
                    &self.camera,
                    &lighting_uniform,
                    &self.frame_commands,
                    sprite_target,
                    &mut encoder,
                    clear_color,
                );
                // Geometry overlays on sprites before post-processing
                let camera_bg = self.sprites.camera_bind_group();
                self.geometry.flush(&self.gpu, &mut encoder, sprite_target, camera_bg);
            }
            // Apply GI light texture to the offscreen target before post-processing
            if gi_active {
                let sprite_target = self.postprocess.sprite_target(&self.gpu);
                self.radiance.compose(&mut encoder, sprite_target);
            }
            self.postprocess.apply(&self.gpu, &mut encoder, &view);
        } else {
            // No effects — render directly to surface
            self.sprites.render(
                &self.gpu,
                &self.textures,
                &self.shaders,
                &self.camera,
                &lighting_uniform,
                &self.frame_commands,
                &view,
                &mut encoder,
                clear_color,
            );
            // Geometry overlays on sprites
            let camera_bg = self.sprites.camera_bind_group();
            self.geometry.flush(&self.gpu, &mut encoder, &view, camera_bg);
            // Apply GI light texture to the surface
            if gi_active {
                self.radiance.compose(&mut encoder, &view);
            }
        }

        self.gpu.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        self.frame_commands.clear();
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
}
