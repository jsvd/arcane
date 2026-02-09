mod gpu;
mod sprite;
mod texture;
mod camera;
mod tilemap;
mod lighting;
pub mod font;

pub use gpu::GpuContext;
pub use sprite::{SpriteCommand, SpritePipeline};
pub use texture::{TextureId, TextureStore};
pub use camera::Camera2D;
pub use tilemap::{Tilemap, TilemapStore};
pub use lighting::{LightingState, LightingUniform, PointLight, LightData, MAX_LIGHTS};

use anyhow::Result;

/// Top-level renderer that owns the GPU context, sprite pipeline, and textures.
pub struct Renderer {
    pub gpu: GpuContext,
    pub sprites: SpritePipeline,
    pub textures: TextureStore,
    pub camera: Camera2D,
    pub lighting: LightingState,
    /// Sprite commands queued for the current frame.
    pub frame_commands: Vec<SpriteCommand>,
}

impl Renderer {
    /// Create a new renderer attached to a winit window.
    pub fn new(window: std::sync::Arc<winit::window::Window>) -> Result<Self> {
        let gpu = GpuContext::new(window)?;
        let sprites = SpritePipeline::new(&gpu);
        let textures = TextureStore::new();
        let camera = Camera2D::default();
        Ok(Self {
            gpu,
            sprites,
            textures,
            camera,
            lighting: LightingState::default(),
            frame_commands: Vec::new(),
        })
    }

    /// Render the current frame's sprite commands and present.
    pub fn render_frame(&mut self) -> Result<()> {
        let output = self.gpu.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("frame_encoder") },
        );

        // Sort by layer, then by texture for batching
        self.frame_commands.sort_by(|a, b| {
            a.layer.cmp(&b.layer).then(a.texture_id.cmp(&b.texture_id))
        });

        let lighting_uniform = self.lighting.to_uniform();

        self.sprites.render(
            &self.gpu,
            &self.textures,
            &self.camera,
            &lighting_uniform,
            &self.frame_commands,
            &view,
            &mut encoder,
        );

        self.gpu.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        self.frame_commands.clear();
        Ok(())
    }

    /// Resize the surface when the window size changes.
    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.gpu.config.width = width;
            self.gpu.config.height = height;
            self.gpu.surface.configure(&self.gpu.device, &self.gpu.config);
            self.camera.viewport_size = [width as f32, height as f32];
        }
    }
}
