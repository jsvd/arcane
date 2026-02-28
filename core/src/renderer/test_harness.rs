//! GPU test harness for headless rendering tests.
//!
//! Provides utilities for creating a GPU context without a window,
//! rendering to textures, and reading back pixel data for verification.

use anyhow::{Context, Result};

use super::camera::Camera2D;
use super::geometry::GeometryBatch;
use super::postprocess::PostProcessPipeline;
use super::radiance::RadiancePipeline;
use super::rendertarget::RenderTargetStore;
use super::sdf::SdfPipelineStore;
use super::shader::ShaderStore;
use super::sprite::SpritePipeline;
use super::texture::TextureStore;

/// Headless GPU context for testing (no window/surface required).
pub struct TestGpu {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub format: wgpu::TextureFormat,
}

/// A GPU context for headless testing that provides the same interface
/// as GpuContext but without requiring a window surface.
pub struct TestGpuContext {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub config: wgpu::SurfaceConfiguration,
}

impl TestGpuContext {
    /// Create from TestGpu with default 64x64 dimensions.
    pub fn from_test_gpu(gpu: &TestGpu) -> Self {
        Self::from_test_gpu_sized(gpu, 64, 64)
    }

    /// Create from TestGpu with specified dimensions.
    pub fn from_test_gpu_sized(gpu: &TestGpu, width: u32, height: u32) -> Self {
        Self {
            device: gpu.device.clone(),
            queue: gpu.queue.clone(),
            config: wgpu::SurfaceConfiguration {
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                format: gpu.format,
                width,
                height,
                present_mode: wgpu::PresentMode::AutoVsync,
                alpha_mode: wgpu::CompositeAlphaMode::Auto,
                view_formats: vec![],
                desired_maximum_frame_latency: 2,
            },
        }
    }
}

impl TestGpu {
    /// Create a headless GPU context for testing.
    /// Returns None if no suitable GPU adapter is available.
    pub fn new() -> Option<Self> {
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::default(),
            compatible_surface: None, // headless
            force_fallback_adapter: false,
        }))?;

        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                label: Some("test_device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
                ..Default::default()
            },
            None,
        ))
        .ok()?;

        Some(Self {
            device,
            queue,
            format: wgpu::TextureFormat::Rgba8Unorm,
        })
    }

    /// Create a render target texture that can be read back.
    pub fn create_target(&self, width: u32, height: u32) -> TestRenderTarget {
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("test_target"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: self.format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        // Buffer for reading back pixels (4 bytes per pixel, aligned to 256)
        let bytes_per_row = ((width * 4 + 255) / 256) * 256;
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("test_readback"),
            size: (bytes_per_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        TestRenderTarget {
            texture,
            view,
            buffer,
            width,
            height,
            bytes_per_row,
        }
    }

    // ── Pipeline factory methods ──────────────────────────────────────────────

    /// Create a SpritePipeline for headless testing.
    pub fn create_sprite_pipeline(&self) -> SpritePipeline {
        SpritePipeline::new_headless(&self.device, &self.queue, self.format)
    }

    /// Create a TextureStore for headless testing.
    pub fn create_texture_store(&self) -> TextureStore {
        TextureStore::new()
    }

    /// Create a GeometryBatch for headless testing.
    pub fn create_geometry_batch(&self) -> GeometryBatch {
        GeometryBatch::new_headless(&self.device, self.format)
    }

    /// Create a PostProcessPipeline for headless testing.
    pub fn create_postprocess(&self) -> PostProcessPipeline {
        PostProcessPipeline::new_headless(&self.device, self.format)
    }

    /// Create a ShaderStore for headless testing.
    pub fn create_shader_store(&self) -> ShaderStore {
        ShaderStore::new_headless(&self.device, self.format)
    }

    /// Create a RenderTargetStore for headless testing.
    pub fn create_render_target_store(&self) -> RenderTargetStore {
        RenderTargetStore::new()
    }

    /// Create an SdfPipelineStore for headless testing.
    pub fn create_sdf_pipeline(&self) -> SdfPipelineStore {
        SdfPipelineStore::new_headless(&self.device, self.format)
    }

    /// Create a RadiancePipeline for headless testing.
    pub fn create_radiance_pipeline(&self) -> RadiancePipeline {
        RadiancePipeline::new_headless(&self.device, self.format)
    }

    /// Create a default Camera2D for testing.
    /// Camera position is top-left origin (0,0), viewing the area (0..width, 0..height).
    pub fn create_camera(&self, width: f32, height: f32) -> Camera2D {
        Camera2D {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
            viewport_size: [width, height],
            ..Camera2D::default()
        }
    }
}

/// A render target that can be read back to CPU memory.
pub struct TestRenderTarget {
    pub texture: wgpu::Texture,
    pub view: wgpu::TextureView,
    buffer: wgpu::Buffer,
    pub width: u32,
    pub height: u32,
    bytes_per_row: u32,
}

impl TestRenderTarget {
    /// Read back the rendered pixels as RGBA bytes.
    /// Call this after submitting render commands.
    pub fn read_pixels(&self, gpu: &TestGpu) -> Result<Vec<u8>> {
        let mut encoder = gpu.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("readback_encoder") },
        );

        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo {
                texture: &self.texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyBufferInfo {
                buffer: &self.buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(self.bytes_per_row),
                    rows_per_image: Some(self.height),
                },
            },
            wgpu::Extent3d {
                width: self.width,
                height: self.height,
                depth_or_array_layers: 1,
            },
        );

        gpu.queue.submit(std::iter::once(encoder.finish()));

        // Map the buffer and read pixels
        let buffer_slice = self.buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            tx.send(result).unwrap();
        });
        gpu.device.poll(wgpu::Maintain::Wait);
        rx.recv().unwrap().context("Failed to map buffer")?;

        let data = buffer_slice.get_mapped_range();

        // Copy data, removing row padding
        let mut pixels = Vec::with_capacity((self.width * self.height * 4) as usize);
        for y in 0..self.height {
            let start = (y * self.bytes_per_row) as usize;
            let end = start + (self.width * 4) as usize;
            pixels.extend_from_slice(&data[start..end]);
        }

        drop(data);
        self.buffer.unmap();

        Ok(pixels)
    }

    /// Get a pixel color at (x, y) as [R, G, B, A].
    pub fn get_pixel(&self, pixels: &[u8], x: u32, y: u32) -> [u8; 4] {
        let idx = ((y * self.width + x) * 4) as usize;
        [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]]
    }

    /// Check if a pixel approximately matches an expected color (within tolerance).
    pub fn pixel_matches(&self, pixels: &[u8], x: u32, y: u32, expected: [u8; 4], tolerance: u8) -> bool {
        let actual = self.get_pixel(pixels, x, y);
        actual.iter().zip(expected.iter()).all(|(a, e)| {
            (*a as i16 - *e as i16).abs() <= tolerance as i16
        })
    }
}

/// Helper to clear a render target to a solid color.
pub fn clear_target(gpu: &TestGpu, target: &TestRenderTarget, color: [f32; 4]) {
    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: Some("clear_encoder") },
    );

    {
        let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("clear_pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: &target.view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color {
                        r: color[0] as f64,
                        g: color[1] as f64,
                        b: color[2] as f64,
                        a: color[3] as f64,
                    }),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
    }

    gpu.queue.submit(std::iter::once(encoder.finish()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // requires GPU
    fn test_gpu_context_creation() {
        let gpu = TestGpu::new().expect("Failed to create GPU context");
        // If we got here, the GPU context was created successfully
        let _target = gpu.create_target(16, 16);
    }

    #[test]
    #[ignore] // requires GPU
    fn test_clear_and_readback() {
        let gpu = TestGpu::new().expect("Failed to create GPU context");
        let target = gpu.create_target(64, 64);

        // Clear to red
        clear_target(&gpu, &target, [1.0, 0.0, 0.0, 1.0]);

        let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

        // Check center pixel is red
        assert!(target.pixel_matches(&pixels, 32, 32, [255, 0, 0, 255], 1));
    }

    #[test]
    #[ignore] // requires GPU
    fn test_clear_to_green() {
        let gpu = TestGpu::new().expect("Failed to create GPU context");
        let target = gpu.create_target(32, 32);

        clear_target(&gpu, &target, [0.0, 1.0, 0.0, 1.0]);

        let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
        assert!(target.pixel_matches(&pixels, 16, 16, [0, 255, 0, 255], 1));
    }
}
