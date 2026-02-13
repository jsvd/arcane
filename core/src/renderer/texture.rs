use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result};

use super::gpu::GpuContext;

/// Opaque handle to a loaded texture.
pub type TextureId = u32;

/// Entry for a single loaded texture.
struct TextureEntry {
    _texture: wgpu::Texture,
    bind_group: wgpu::BindGroup,
    width: u32,
    height: u32,
}

/// Handle-based texture store. Loads PNGs, uploads to GPU, returns opaque handles.
pub struct TextureStore {
    textures: HashMap<TextureId, TextureEntry>,
    path_to_id: HashMap<String, TextureId>,
    next_id: TextureId,
}

impl TextureStore {
    pub fn new() -> Self {
        Self {
            textures: HashMap::new(),
            path_to_id: HashMap::new(),
            next_id: 1, // 0 reserved for "no texture"
        }
    }

    /// Load a texture from a PNG file. Returns the texture handle.
    /// If the same path was already loaded, returns the cached handle.
    pub fn load(
        &mut self,
        gpu: &GpuContext,
        bind_group_layout: &wgpu::BindGroupLayout,
        path: &Path,
    ) -> Result<TextureId> {
        let path_str = path.to_string_lossy().to_string();

        if let Some(&id) = self.path_to_id.get(&path_str) {
            return Ok(id);
        }

        let img_data = std::fs::read(path)
            .with_context(|| format!("Failed to read texture: {}", path.display()))?;

        let img = image::load_from_memory(&img_data)
            .with_context(|| format!("Failed to decode image: {}", path.display()))?
            .to_rgba8();

        let (width, height) = img.dimensions();

        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(&path_str),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        gpu.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &img,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = gpu.device.create_sampler(&wgpu::SamplerDescriptor {
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("texture_bind_group_{}", self.next_id)),
            layout: bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });

        let id = self.next_id;
        self.next_id += 1;

        self.textures.insert(
            id,
            TextureEntry {
                _texture: texture,
                bind_group,
                width,
                height,
            },
        );
        self.path_to_id.insert(path_str, id);

        Ok(id)
    }

    /// Create a solid-color 1x1 texture. Useful for placeholder sprites.
    pub fn create_solid_color(
        &mut self,
        gpu: &GpuContext,
        bind_group_layout: &wgpu::BindGroupLayout,
        name: &str,
        r: u8,
        g: u8,
        b: u8,
        a: u8,
    ) -> TextureId {
        let path_key = format!("__solid__{name}");
        if let Some(&id) = self.path_to_id.get(&path_key) {
            return id;
        }

        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(name),
            size: wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        gpu.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &[r, g, b, a],
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4),
                rows_per_image: Some(1),
            },
            wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = gpu.device.create_sampler(&wgpu::SamplerDescriptor {
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("solid_color_bind_group_{name}")),
            layout: bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });

        let id = self.next_id;
        self.next_id += 1;

        self.textures.insert(
            id,
            TextureEntry {
                _texture: texture,
                bind_group,
                width: 1,
                height: 1,
            },
        );
        self.path_to_id.insert(path_key, id);

        id
    }

    /// Upload raw RGBA pixel data as a texture with a pre-assigned ID.
    /// Used for procedurally generated textures (e.g., built-in font).
    pub fn upload_raw(
        &mut self,
        gpu: &GpuContext,
        bind_group_layout: &wgpu::BindGroupLayout,
        id: TextureId,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) {
        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(&format!("raw_texture_{id}")),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        gpu.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            pixels,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = gpu.device.create_sampler(&wgpu::SamplerDescriptor {
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });

        let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("raw_texture_bind_group_{id}")),
            layout: bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });

        self.textures.insert(
            id,
            TextureEntry {
                _texture: texture,
                bind_group,
                width,
                height,
            },
        );
    }

    /// Upload raw RGBA pixels as a linear (non-sRGB) texture with bilinear filtering.
    /// Use this for distance field atlases (MSDF, SDF) where values must be sampled linearly.
    pub fn upload_raw_linear(
        &mut self,
        gpu: &GpuContext,
        bind_group_layout: &wgpu::BindGroupLayout,
        id: TextureId,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) {
        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(&format!("raw_linear_texture_{id}")),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        gpu.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            pixels,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = gpu.device.create_sampler(&wgpu::SamplerDescriptor {
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });

        let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("raw_linear_texture_bind_group_{id}")),
            layout: bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });

        self.textures.insert(
            id,
            TextureEntry {
                _texture: texture,
                bind_group,
                width,
                height,
            },
        );
    }

    /// Get the bind group for a texture handle.
    pub fn get_bind_group(&self, id: TextureId) -> Option<&wgpu::BindGroup> {
        self.textures.get(&id).map(|e| &e.bind_group)
    }

    /// Get texture dimensions.
    pub fn get_dimensions(&self, id: TextureId) -> Option<(u32, u32)> {
        self.textures.get(&id).map(|e| (e.width, e.height))
    }
}
