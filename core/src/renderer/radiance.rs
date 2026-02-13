//! Radiance Cascades 2D Global Illumination
//!
//! Implements Alexander Sannikov's Radiance Cascades algorithm using wgpu compute shaders.
//! Provides real-time 2D GI with emissive surfaces, occluders, and light propagation.
//!
//! Architecture:
//! 1. Scene pass: CPU writes emissive/occluder data to a scene texture
//! 2. Ray-march pass (per cascade): probes cast rays through the scene
//! 3. Merge passes: upper cascades merge into lower (propagates far-field radiance)
//! 4. Finalize pass: cascade 0 probes sum rays, produces light texture
//! 5. Composition: sprite shader reads light texture to modulate output

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use super::gpu::GpuContext;
use super::lighting::LightingState;

/// Default base ray count for cascade 0 (4 rays = 2x2 block per probe).
const DEFAULT_BASE_RAYS: u32 = 4;

/// Default probe spacing in pixels for cascade 0.
const DEFAULT_PROBE_SPACING: f32 = 8.0;

/// Default ray march interval length in pixels.
const DEFAULT_INTERVAL: f32 = 4.0;

/// Maximum cascade levels.
const MAX_CASCADES: usize = 5;

/// GPU uniform data for radiance cascade compute passes.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct RadianceParams {
    /// [scene_width, scene_height, cascade_index, cascade_count]
    scene_dims: [f32; 4],
    /// [probe_spacing, ray_count, interval_length, gi_intensity]
    cascade_params: [f32; 4],
    /// [camera_x, camera_y, viewport_w, viewport_h]
    camera: [f32; 4],
    /// [ambient_r, ambient_g, ambient_b, _pad]
    ambient: [f32; 4],
}

/// An emissive surface that radiates light.
#[derive(Clone, Debug)]
pub struct EmissiveSurface {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub intensity: f32,
}

/// A rectangular occluder that blocks light.
#[derive(Clone, Debug)]
pub struct Occluder {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// A directional light (infinite distance, parallel rays).
#[derive(Clone, Debug)]
pub struct DirectionalLight {
    pub angle: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub intensity: f32,
}

/// A spot light with position, direction, and spread.
#[derive(Clone, Debug)]
pub struct SpotLight {
    pub x: f32,
    pub y: f32,
    pub angle: f32,
    pub spread: f32,
    pub range: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub intensity: f32,
}

/// Radiance state gathered from TypeScript each frame.
#[derive(Clone, Debug)]
pub struct RadianceState {
    pub enabled: bool,
    pub emissives: Vec<EmissiveSurface>,
    pub occluders: Vec<Occluder>,
    pub directional_lights: Vec<DirectionalLight>,
    pub spot_lights: Vec<SpotLight>,
    pub gi_intensity: f32,
    /// Probe spacing in pixels (smaller = smoother but slower). Default: 8.
    pub probe_spacing: Option<f32>,
    /// Ray march interval length in pixels. Default: 4.
    pub interval: Option<f32>,
    /// Number of cascade levels (more = longer light reach). Default: 4.
    pub cascade_count: Option<u32>,
}

impl Default for RadianceState {
    fn default() -> Self {
        Self::new()
    }
}

impl RadianceState {
    pub fn new() -> Self {
        Self {
            enabled: false,
            emissives: Vec::new(),
            occluders: Vec::new(),
            directional_lights: Vec::new(),
            spot_lights: Vec::new(),
            gi_intensity: 1.0,
            probe_spacing: None,
            interval: None,
            cascade_count: None,
        }
    }
}

/// The radiance cascade compute pipeline.
pub struct RadiancePipeline {
    // Compute pipelines
    ray_march_pipeline: wgpu::ComputePipeline,
    merge_pipeline: wgpu::ComputePipeline,
    finalize_pipeline: wgpu::ComputePipeline,

    // Composition render pipeline (fullscreen quad that multiplies light texture onto sprites)
    compose_pipeline: wgpu::RenderPipeline,
    compose_bind_group_layout: wgpu::BindGroupLayout,

    // Bind group layout (shared across passes)
    compute_bind_group_layout: wgpu::BindGroupLayout,

    // Uniform buffer
    params_buffer: wgpu::Buffer,

    // Scene texture: emissive (RGB) + occluder (A)
    scene_texture: Option<SceneTexture>,

    // Cascade textures (ping-pong pair for merge)
    cascade_textures: Option<CascadeTextures>,

    // Light output texture (scene resolution)
    light_texture: Option<LightTexture>,

    // Configuration
    pub base_rays: u32,
    pub probe_spacing: f32,
    pub interval: f32,
    pub cascade_count: u32,

    // Sampler for the composition pass
    sampler: wgpu::Sampler,
    #[allow(dead_code)]
    surface_format: wgpu::TextureFormat,
}

struct SceneTexture {
    texture: wgpu::Texture,
    view: wgpu::TextureView,
    width: u32,
    height: u32,
}

struct CascadeTextures {
    // Two textures for ping-pong during merge (kept alive for GPU references)
    #[allow(dead_code)]
    tex_a: wgpu::Texture,
    view_a: wgpu::TextureView,
    #[allow(dead_code)]
    tex_b: wgpu::Texture,
    view_b: wgpu::TextureView,
    width: u32,
    height: u32,
}

struct LightTexture {
    #[allow(dead_code)]
    texture: wgpu::Texture,
    view: wgpu::TextureView,
    bind_group: wgpu::BindGroup,
    #[allow(dead_code)]
    width: u32,
    #[allow(dead_code)]
    height: u32,
}

impl RadiancePipeline {
    pub fn new(gpu: &GpuContext) -> Self {
        let shader = gpu.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("radiance_compute_shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/radiance.wgsl").into()),
        });

        // Bind group layout for compute passes
        let compute_bind_group_layout =
            gpu.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("radiance_compute_bind_group_layout"),
                entries: &[
                    // binding 0: uniform params
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                    // binding 1: scene texture (read)
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        },
                        count: None,
                    },
                    // binding 2: cascade input texture (read)
                    wgpu::BindGroupLayoutEntry {
                        binding: 2,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        },
                        count: None,
                    },
                    // binding 3: cascade output (storage write)
                    wgpu::BindGroupLayoutEntry {
                        binding: 3,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::StorageTexture {
                            access: wgpu::StorageTextureAccess::WriteOnly,
                            format: wgpu::TextureFormat::Rgba16Float,
                            view_dimension: wgpu::TextureViewDimension::D2,
                        },
                        count: None,
                    },
                ],
            });

        let compute_layout =
            gpu.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("radiance_compute_layout"),
                bind_group_layouts: &[&compute_bind_group_layout],
                push_constant_ranges: &[],
            });

        let ray_march_pipeline =
            gpu.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some("radiance_ray_march"),
                layout: Some(&compute_layout),
                module: &shader,
                entry_point: Some("ray_march"),
                compilation_options: Default::default(),
                cache: None,
            });

        let merge_pipeline =
            gpu.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some("radiance_merge"),
                layout: Some(&compute_layout),
                module: &shader,
                entry_point: Some("merge_cascades"),
                compilation_options: Default::default(),
                cache: None,
            });

        let finalize_pipeline =
            gpu.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some("radiance_finalize"),
                layout: Some(&compute_layout),
                module: &shader,
                entry_point: Some("finalize"),
                compilation_options: Default::default(),
                cache: None,
            });

        // Params uniform buffer
        let params_buffer = gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("radiance_params_buffer"),
            contents: bytemuck::cast_slice(&[RadianceParams {
                scene_dims: [0.0; 4],
                cascade_params: [0.0; 4],
                camera: [0.0; 4],
                ambient: [1.0, 1.0, 1.0, 0.0],
            }]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        // Composition pass: renders light texture over the sprite output
        let compose_bind_group_layout =
            gpu.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("radiance_compose_bind_group_layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                ],
            });

        let compose_layout =
            gpu.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("radiance_compose_layout"),
                bind_group_layouts: &[&compose_bind_group_layout],
                push_constant_ranges: &[],
            });

        let compose_shader =
            gpu.device.create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some("radiance_compose_shader"),
                source: wgpu::ShaderSource::Wgsl(COMPOSE_WGSL.into()),
            });

        let compose_pipeline =
            gpu.device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some("radiance_compose_pipeline"),
                layout: Some(&compose_layout),
                vertex: wgpu::VertexState {
                    module: &compose_shader,
                    entry_point: Some("vs_main"),
                    buffers: &[],
                    compilation_options: Default::default(),
                },
                fragment: Some(wgpu::FragmentState {
                    module: &compose_shader,
                    entry_point: Some("fs_main"),
                    targets: &[Some(wgpu::ColorTargetState {
                        format: gpu.config.format,
                        blend: Some(wgpu::BlendState {
                            // Additive: result = src * dst + dst * 1
                            // = dst * (1 + src) — GI adds light without darkening
                            color: wgpu::BlendComponent {
                                src_factor: wgpu::BlendFactor::Dst,
                                dst_factor: wgpu::BlendFactor::One,
                                operation: wgpu::BlendOperation::Add,
                            },
                            alpha: wgpu::BlendComponent::OVER,
                        }),
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                    compilation_options: Default::default(),
                }),
                primitive: wgpu::PrimitiveState {
                    topology: wgpu::PrimitiveTopology::TriangleList,
                    ..Default::default()
                },
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview: None,
                cache: None,
            });

        let sampler = gpu.device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("radiance_sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });

        Self {
            ray_march_pipeline,
            merge_pipeline,
            finalize_pipeline,
            compose_pipeline,
            compose_bind_group_layout,
            compute_bind_group_layout,
            params_buffer,
            scene_texture: None,
            cascade_textures: None,
            light_texture: None,
            base_rays: DEFAULT_BASE_RAYS,
            probe_spacing: DEFAULT_PROBE_SPACING,
            interval: DEFAULT_INTERVAL,
            cascade_count: 4,
            sampler,
            surface_format: gpu.config.format,
        }
    }

    /// Ensure textures exist and match the given scene dimensions.
    fn ensure_textures(&mut self, gpu: &GpuContext, scene_w: u32, scene_h: u32) {
        let needs_recreate = self
            .scene_texture
            .as_ref()
            .map(|t| t.width != scene_w || t.height != scene_h)
            .unwrap_or(true);

        if !needs_recreate {
            return;
        }

        // Scene texture
        let scene_tex = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("radiance_scene_texture"),
            size: wgpu::Extent3d {
                width: scene_w,
                height: scene_h,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba32Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        let scene_view = scene_tex.create_view(&wgpu::TextureViewDescriptor::default());
        self.scene_texture = Some(SceneTexture {
            texture: scene_tex,
            view: scene_view,
            width: scene_w,
            height: scene_h,
        });

        // Cascade textures: size determined by probe grid and ray block layout
        // For cascade 0: probes_x * rays_per_side x probes_y * rays_per_side
        // All cascades use the same total memory, but the largest cascade texture size
        // is determined by cascade 0 (most probes, fewest rays).
        let probes_x = (scene_w as f32 / self.probe_spacing).ceil() as u32;
        let probes_y = (scene_h as f32 / self.probe_spacing).ceil() as u32;
        let rays_per_side = (self.base_rays as f32).sqrt().ceil() as u32;
        let cascade_w = probes_x * rays_per_side;
        let cascade_h = probes_y * rays_per_side;

        // Ensure minimum size
        let cascade_w = cascade_w.max(1);
        let cascade_h = cascade_h.max(1);

        let create_cascade_tex = |label: &str| -> (wgpu::Texture, wgpu::TextureView) {
            let tex = gpu.device.create_texture(&wgpu::TextureDescriptor {
                label: Some(label),
                size: wgpu::Extent3d {
                    width: cascade_w,
                    height: cascade_h,
                    depth_or_array_layers: 1,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rgba16Float,
                usage: wgpu::TextureUsages::TEXTURE_BINDING
                    | wgpu::TextureUsages::STORAGE_BINDING,
                view_formats: &[],
            });
            let view = tex.create_view(&wgpu::TextureViewDescriptor::default());
            (tex, view)
        };

        let (tex_a, view_a) = create_cascade_tex("radiance_cascade_a");
        let (tex_b, view_b) = create_cascade_tex("radiance_cascade_b");

        self.cascade_textures = Some(CascadeTextures {
            tex_a,
            view_a,
            tex_b,
            view_b,
            width: cascade_w,
            height: cascade_h,
        });

        // Light texture: scene resolution
        let light_tex = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("radiance_light_texture"),
            size: wgpu::Extent3d {
                width: scene_w,
                height: scene_h,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::STORAGE_BINDING,
            view_formats: &[],
        });

        let light_view = light_tex.create_view(&wgpu::TextureViewDescriptor::default());

        let light_bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("radiance_light_bind_group"),
            layout: &self.compose_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&light_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&self.sampler),
                },
            ],
        });

        self.light_texture = Some(LightTexture {
            texture: light_tex,
            view: light_view,
            bind_group: light_bind_group,
            width: scene_w,
            height: scene_h,
        });
    }

    /// Build the scene texture data from emissives, occluders, point lights,
    /// directional lights, and spot lights.
    fn build_scene_data(
        &self,
        scene_w: u32,
        scene_h: u32,
        radiance: &RadianceState,
        lighting: &LightingState,
        camera_x: f32,
        camera_y: f32,
        viewport_w: f32,
        viewport_h: f32,
    ) -> Vec<u8> {
        let w = scene_w as usize;
        let h = scene_h as usize;
        // Rgba32Float: 4 channels × 4 bytes = 16 bytes per pixel
        let mut pixels = vec![0.0f32; w * h * 4];

        // World-space origin for the scene texture (camera-centered)
        let world_left = camera_x - viewport_w / 2.0;
        let world_top = camera_y - viewport_h / 2.0;

        // Rasterize emissive surfaces (HDR — intensity is preserved)
        for em in &radiance.emissives {
            let px0 = ((em.x - world_left) as i32).max(0) as usize;
            let py0 = ((em.y - world_top) as i32).max(0) as usize;
            let px1 = ((em.x + em.width - world_left) as i32).min(w as i32) as usize;
            let py1 = ((em.y + em.height - world_top) as i32).min(h as i32) as usize;

            let er = em.r * em.intensity;
            let eg = em.g * em.intensity;
            let eb = em.b * em.intensity;

            for py in py0..py1 {
                for px in px0..px1 {
                    let idx = (py * w + px) * 4;
                    pixels[idx] += er;
                    pixels[idx + 1] += eg;
                    pixels[idx + 2] += eb;
                }
            }
        }

        // Rasterize point lights as emissive circles
        for light in &lighting.lights {
            let cx = (light.x - world_left) as i32;
            let cy = (light.y - world_top) as i32;
            let r_px = (light.radius * 0.1).max(2.0) as i32;

            let er = light.r * light.intensity;
            let eg = light.g * light.intensity;
            let eb = light.b * light.intensity;

            for dy in -r_px..=r_px {
                for dx in -r_px..=r_px {
                    if dx * dx + dy * dy <= r_px * r_px {
                        let px = (cx + dx) as usize;
                        let py = (cy + dy) as usize;
                        if px < w && py < h {
                            let idx = (py * w + px) * 4;
                            pixels[idx] += er;
                            pixels[idx + 1] += eg;
                            pixels[idx + 2] += eb;
                        }
                    }
                }
            }
        }

        // Rasterize spot lights as emissive spots
        for spot in &radiance.spot_lights {
            let cx = (spot.x - world_left) as i32;
            let cy = (spot.y - world_top) as i32;
            let r_px = 3i32;

            let er = spot.r * spot.intensity;
            let eg = spot.g * spot.intensity;
            let eb = spot.b * spot.intensity;

            for dy in -r_px..=r_px {
                for dx in -r_px..=r_px {
                    if dx * dx + dy * dy <= r_px * r_px {
                        let px = (cx + dx) as usize;
                        let py = (cy + dy) as usize;
                        if px < w && py < h {
                            let idx = (py * w + px) * 4;
                            pixels[idx] += er;
                            pixels[idx + 1] += eg;
                            pixels[idx + 2] += eb;
                        }
                    }
                }
            }
        }

        // Rasterize occluders (alpha = 1.0)
        for occ in &radiance.occluders {
            let px0 = ((occ.x - world_left) as i32).max(0) as usize;
            let py0 = ((occ.y - world_top) as i32).max(0) as usize;
            let px1 = ((occ.x + occ.width - world_left) as i32).min(w as i32) as usize;
            let py1 = ((occ.y + occ.height - world_top) as i32).min(h as i32) as usize;

            for py in py0..py1 {
                for px in px0..px1 {
                    let idx = (py * w + px) * 4;
                    pixels[idx + 3] = 1.0; // occluder flag
                }
            }
        }

        // Return as raw bytes (f32 → bytemuck cast)
        bytemuck::cast_slice(&pixels).to_vec()
    }

    /// Execute the full radiance cascade pipeline for one frame.
    /// Returns true if the light texture was computed and the compose pass should run.
    pub fn compute(
        &mut self,
        gpu: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        radiance: &RadianceState,
        lighting: &LightingState,
        camera_x: f32,
        camera_y: f32,
        viewport_w: f32,
        viewport_h: f32,
    ) -> bool {
        if !radiance.enabled {
            return false;
        }

        // Apply quality overrides from game code
        if let Some(ps) = radiance.probe_spacing {
            self.probe_spacing = ps;
        }
        if let Some(iv) = radiance.interval {
            self.interval = iv;
        }
        if let Some(cc) = radiance.cascade_count {
            self.cascade_count = cc;
        }

        // Scene resolution is the viewport size (in logical pixels)
        let scene_w = viewport_w.ceil() as u32;
        let scene_h = viewport_h.ceil() as u32;
        if scene_w == 0 || scene_h == 0 {
            return false;
        }

        self.ensure_textures(gpu, scene_w, scene_h);

        let scene_tex = self.scene_texture.as_ref().unwrap();
        let cascades = self.cascade_textures.as_ref().unwrap();
        let light_tex = self.light_texture.as_ref().unwrap();

        // Upload scene data to GPU
        let scene_data = self.build_scene_data(
            scene_w, scene_h, radiance, lighting, camera_x, camera_y, viewport_w, viewport_h,
        );

        gpu.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &scene_tex.texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &scene_data,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(scene_w * 16), // Rgba32Float: 16 bytes per pixel
                rows_per_image: Some(scene_h),
            },
            wgpu::Extent3d {
                width: scene_w,
                height: scene_h,
                depth_or_array_layers: 1,
            },
        );

        let cascade_count = self.cascade_count.min(MAX_CASCADES as u32);

        // === Pass 1: Ray-march each cascade (highest first) ===
        // We write each cascade to tex_a using a dedicated bind group,
        // then in merge pass we read from tex_a and write to tex_b.
        for c in (0..cascade_count).rev() {
            let params = RadianceParams {
                scene_dims: [scene_w as f32, scene_h as f32, c as f32, cascade_count as f32],
                cascade_params: [
                    self.probe_spacing,
                    self.base_rays as f32,
                    self.interval,
                    radiance.gi_intensity,
                ],
                camera: [camera_x, camera_y, viewport_w, viewport_h],
                ambient: [
                    lighting.ambient[0],
                    lighting.ambient[1],
                    lighting.ambient[2],
                    0.0,
                ],
            };

            gpu.queue.write_buffer(
                &self.params_buffer,
                0,
                bytemuck::cast_slice(&[params]),
            );

            // For ray-march: write to tex_a (scene + empty cascade_in + tex_a as output)
            let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some(&format!("radiance_ray_march_bg_{c}")),
                layout: &self.compute_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: self.params_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::TextureView(&scene_tex.view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: wgpu::BindingResource::TextureView(&cascades.view_b),
                    },
                    wgpu::BindGroupEntry {
                        binding: 3,
                        resource: wgpu::BindingResource::TextureView(&cascades.view_a),
                    },
                ],
            });

            {
                let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                    label: Some(&format!("radiance_ray_march_{c}")),
                    timestamp_writes: None,
                });
                pass.set_pipeline(&self.ray_march_pipeline);
                pass.set_bind_group(0, &bind_group, &[]);
                pass.dispatch_workgroups(
                    (cascades.width + 7) / 8,
                    (cascades.height + 7) / 8,
                    1,
                );
            }

            // === Pass 2: Merge (if not the highest cascade) ===
            if c < cascade_count - 1 {
                // Read from tex_a (ray-marched), write to tex_b
                let merge_bg = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
                    label: Some(&format!("radiance_merge_bg_{c}")),
                    layout: &self.compute_bind_group_layout,
                    entries: &[
                        wgpu::BindGroupEntry {
                            binding: 0,
                            resource: self.params_buffer.as_entire_binding(),
                        },
                        wgpu::BindGroupEntry {
                            binding: 1,
                            resource: wgpu::BindingResource::TextureView(&scene_tex.view),
                        },
                        wgpu::BindGroupEntry {
                            binding: 2,
                            resource: wgpu::BindingResource::TextureView(&cascades.view_a),
                        },
                        wgpu::BindGroupEntry {
                            binding: 3,
                            resource: wgpu::BindingResource::TextureView(&cascades.view_b),
                        },
                    ],
                });

                {
                    let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                        label: Some(&format!("radiance_merge_{c}")),
                        timestamp_writes: None,
                    });
                    pass.set_pipeline(&self.merge_pipeline);
                    pass.set_bind_group(0, &merge_bg, &[]);
                    pass.dispatch_workgroups(
                        (cascades.width + 7) / 8,
                        (cascades.height + 7) / 8,
                        1,
                    );
                }

                // Copy tex_b back to tex_a for the next level's merge
                // (the finalize pass reads from cascade_in which is tex_b after the last merge)
            }
        }

        // === Pass 3: Finalize — cascade 0 -> light texture ===
        {
            let params = RadianceParams {
                scene_dims: [scene_w as f32, scene_h as f32, 0.0, cascade_count as f32],
                cascade_params: [
                    self.probe_spacing,
                    self.base_rays as f32,
                    self.interval,
                    radiance.gi_intensity,
                ],
                camera: [camera_x, camera_y, viewport_w, viewport_h],
                ambient: [
                    lighting.ambient[0],
                    lighting.ambient[1],
                    lighting.ambient[2],
                    0.0,
                ],
            };

            gpu.queue.write_buffer(
                &self.params_buffer,
                0,
                bytemuck::cast_slice(&[params]),
            );

            // Read from the last written cascade (tex_b if merged, tex_a if only ray-marched)
            let final_cascade_view = if cascade_count > 1 {
                &cascades.view_b
            } else {
                &cascades.view_a
            };

            let finalize_bg = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("radiance_finalize_bg"),
                layout: &self.compute_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: self.params_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::TextureView(&scene_tex.view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: wgpu::BindingResource::TextureView(final_cascade_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 3,
                        resource: wgpu::BindingResource::TextureView(&light_tex.view),
                    },
                ],
            });

            {
                let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                    label: Some("radiance_finalize"),
                    timestamp_writes: None,
                });
                pass.set_pipeline(&self.finalize_pipeline);
                pass.set_bind_group(0, &finalize_bg, &[]);
                pass.dispatch_workgroups((scene_w + 7) / 8, (scene_h + 7) / 8, 1);
            }
        }

        true
    }

    /// Compose the light texture onto the sprite output.
    /// Call this after sprites have been rendered to the target view.
    /// This applies additive blending: sprite_color + light_contribution.
    /// The sprite shader already handles ambient + point lights via multiplication.
    /// GI adds indirect illumination on top.
    pub fn compose(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        target: &wgpu::TextureView,
    ) {
        let Some(ref light_tex) = self.light_texture else {
            return;
        };

        let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("radiance_compose_pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: target,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Load, // keep existing sprite output
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });

        pass.set_pipeline(&self.compose_pipeline);
        pass.set_bind_group(0, &light_tex.bind_group, &[]);
        pass.draw(0..3, 0..1); // fullscreen triangle
    }
}

/// Composition shader: fullscreen pass that samples the light texture
/// and multiplies it with existing pixel values.
const COMPOSE_WGSL: &str = r#"
@group(0) @binding(0)
var t_light: texture_2d<f32>;

@group(0) @binding(1)
var s_light: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
    var out: VertexOutput;
    let uv = vec2<f32>(f32((idx << 1u) & 2u), f32(idx & 2u));
    out.position = vec4<f32>(uv * 2.0 - 1.0, 0.0, 1.0);
    out.uv = vec2<f32>(uv.x, 1.0 - uv.y);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let light = textureSample(t_light, s_light, in.uv);
    // Output the light color — blend state does the multiplication with dst
    return light;
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_radiance_params_size() {
        assert_eq!(std::mem::size_of::<RadianceParams>(), 64);
    }

    #[test]
    fn test_emissive_surface_clone() {
        let em = EmissiveSurface {
            x: 10.0,
            y: 20.0,
            width: 32.0,
            height: 32.0,
            r: 1.0,
            g: 0.5,
            b: 0.0,
            intensity: 2.0,
        };
        let em2 = em.clone();
        assert_eq!(em2.x, 10.0);
        assert_eq!(em2.intensity, 2.0);
    }

    #[test]
    fn test_occluder_clone() {
        let occ = Occluder {
            x: 50.0,
            y: 60.0,
            width: 100.0,
            height: 20.0,
        };
        let occ2 = occ.clone();
        assert_eq!(occ2.width, 100.0);
    }

    #[test]
    fn test_radiance_state_default() {
        let state = RadianceState::default();
        assert!(!state.enabled);
        assert!(state.emissives.is_empty());
        assert!(state.occluders.is_empty());
        assert!(state.directional_lights.is_empty());
        assert!(state.spot_lights.is_empty());
        assert_eq!(state.gi_intensity, 1.0);
    }

    #[test]
    fn test_directional_light() {
        let dl = DirectionalLight {
            angle: 1.5,
            r: 1.0,
            g: 0.9,
            b: 0.7,
            intensity: 0.8,
        };
        assert_eq!(dl.angle, 1.5);
    }

    #[test]
    fn test_spot_light() {
        let sl = SpotLight {
            x: 100.0,
            y: 200.0,
            angle: 0.0,
            spread: 0.5,
            range: 300.0,
            r: 1.0,
            g: 1.0,
            b: 0.8,
            intensity: 1.5,
        };
        assert_eq!(sl.range, 300.0);
    }
}
