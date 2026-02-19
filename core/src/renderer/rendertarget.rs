/// Render target store: off-screen textures that TS can draw into,
/// then use as sprite inputs.
///
/// Each render target owns a wgpu::Texture + TextureView created with
/// RENDER_ATTACHMENT | TEXTURE_BINDING usage. The format matches the
/// surface format so the same SpritePipeline can render into it.
///
/// Lifecycle:
/// 1. `create()` — allocates GPU texture + view
/// 2. `get_view()` — returns the view for render pass target
/// 3. `destroy()` — drops GPU resources

use std::collections::HashMap;

use super::gpu::GpuContext;

/// A single off-screen render target.
pub struct RenderTargetEntry {
    pub texture: wgpu::Texture,
    pub view: wgpu::TextureView,
    pub width: u32,
    pub height: u32,
}

/// Stores all live render targets, keyed by their ID (which doubles as TextureId).
pub struct RenderTargetStore {
    pub targets: HashMap<u32, RenderTargetEntry>,
}

impl RenderTargetStore {
    pub fn new() -> Self {
        Self {
            targets: HashMap::new(),
        }
    }

    /// Allocate a new off-screen render target.
    ///
    /// The texture format matches the surface format (`surface_format`) so the
    /// sprite pipeline can render into it without a format mismatch.
    pub fn create(
        &mut self,
        gpu: &GpuContext,
        id: u32,
        width: u32,
        height: u32,
        surface_format: wgpu::TextureFormat,
    ) {
        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(&format!("render_target_{id}")),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            // Must match surface format so SpritePipeline (compiled for surface_format)
            // can render into this target without a pipeline/attachment format mismatch.
            format: surface_format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT
                | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        self.targets.insert(
            id,
            RenderTargetEntry {
                texture,
                view,
                width,
                height,
            },
        );
    }

    /// Get the TextureView for rendering INTO this target.
    pub fn get_view(&self, id: u32) -> Option<&wgpu::TextureView> {
        self.targets.get(&id).map(|e| &e.view)
    }

    /// Get dimensions of a render target.
    pub fn get_dims(&self, id: u32) -> Option<(u32, u32)> {
        self.targets.get(&id).map(|e| (e.width, e.height))
    }

    /// Drop GPU resources for a render target.
    pub fn destroy(&mut self, id: u32) {
        self.targets.remove(&id);
    }
}
