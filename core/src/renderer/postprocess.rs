use wgpu::util::DeviceExt;

use super::gpu::GpuContext;

/// Maximum user-settable vec4 param slots per effect.
const MAX_EFFECT_PARAMS: usize = 4;
/// Total uniform floats: resolution (vec4) + 4 user vec4 = 5 x 4 = 20
const PARAM_FLOATS: usize = 20;

#[derive(Clone, Copy, Debug)]
pub enum EffectType {
    Bloom,
    Blur,
    Vignette,
    Crt,
}

impl EffectType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "bloom" => Some(EffectType::Bloom),
            "blur" => Some(EffectType::Blur),
            "vignette" => Some(EffectType::Vignette),
            "crt" => Some(EffectType::Crt),
            _ => None,
        }
    }

    fn fragment_source(&self) -> &'static str {
        match self {
            EffectType::Bloom => BLOOM_FRAGMENT,
            EffectType::Blur => BLUR_FRAGMENT,
            EffectType::Vignette => VIGNETTE_FRAGMENT,
            EffectType::Crt => CRT_FRAGMENT,
        }
    }

    /// Default param values for each effect type.
    fn defaults(&self) -> [f32; PARAM_FLOATS] {
        let mut d = [0.0f32; PARAM_FLOATS];
        match self {
            EffectType::Bloom => {
                // values[0]: threshold=0.7, intensity=0.5, radius=3.0
                d[4] = 0.7;
                d[5] = 0.5;
                d[6] = 3.0;
            }
            EffectType::Blur => {
                // values[0]: strength=1.0
                d[4] = 1.0;
            }
            EffectType::Vignette => {
                // values[0]: intensity=0.5, radius=0.8
                d[4] = 0.5;
                d[5] = 0.8;
            }
            EffectType::Crt => {
                // values[0]: scanline_freq=800.0, distortion=0.1, brightness=1.1
                d[4] = 800.0;
                d[5] = 0.1;
                d[6] = 1.1;
            }
        }
        d
    }
}

struct EffectEntry {
    #[allow(dead_code)]
    effect_type: EffectType,
    pipeline: wgpu::RenderPipeline,
    param_buffer: wgpu::Buffer,
    param_bind_group: wgpu::BindGroup,
    param_data: [f32; PARAM_FLOATS],
}

struct OffscreenTarget {
    #[allow(dead_code)]
    texture: wgpu::Texture,
    view: wgpu::TextureView,
    bind_group: wgpu::BindGroup,
    width: u32,
    height: u32,
}

/// Post-processing pipeline: renders sprites to offscreen texture,
/// applies fullscreen effects (ping-pong), outputs to surface.
pub struct PostProcessPipeline {
    /// Ordered list of (id, effect). Applied in insertion order.
    effects: Vec<(u32, EffectEntry)>,
    // Ping-pong offscreen targets
    target_a: Option<OffscreenTarget>,
    target_b: Option<OffscreenTarget>,
    // Shared GPU resources
    texture_bind_group_layout: wgpu::BindGroupLayout,
    params_bind_group_layout: wgpu::BindGroupLayout,
    pipeline_layout: wgpu::PipelineLayout,
    sampler: wgpu::Sampler,
    surface_format: wgpu::TextureFormat,
}

impl PostProcessPipeline {
    /// Create a post-process pipeline for headless testing.
    pub fn new_headless(device: &wgpu::Device, format: wgpu::TextureFormat) -> Self {
        Self::new_internal(device, format)
    }

    pub fn new(gpu: &GpuContext) -> Self {
        Self::new_internal(&gpu.device, gpu.config.format)
    }

    fn new_internal(device: &wgpu::Device, surface_format: wgpu::TextureFormat) -> Self {
        // Group 0: input texture + sampler
        let texture_bind_group_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("postprocess_texture_layout"),
                    entries: &[
                        wgpu::BindGroupLayoutEntry {
                            binding: 0,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Texture {
                                multisampled: false,
                                view_dimension: wgpu::TextureViewDimension::D2,
                                sample_type: wgpu::TextureSampleType::Float {
                                    filterable: true,
                                },
                            },
                            count: None,
                        },
                        wgpu::BindGroupLayoutEntry {
                            binding: 1,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Sampler(
                                wgpu::SamplerBindingType::Filtering,
                            ),
                            count: None,
                        },
                    ],
                });

        // Group 1: effect params uniform
        let params_bind_group_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("postprocess_params_layout"),
                    entries: &[wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    }],
                });

        let pipeline_layout =
            device
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("postprocess_pipeline_layout"),
                    bind_group_layouts: &[
                        &texture_bind_group_layout,
                        &params_bind_group_layout,
                    ],
                    push_constant_ranges: &[],
                });

        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("postprocess_sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });

        Self {
            effects: Vec::new(),
            target_a: None,
            target_b: None,
            texture_bind_group_layout,
            params_bind_group_layout,
            pipeline_layout,
            sampler,
            surface_format,
        }
    }

    /// Returns true if there are active effects.
    pub fn has_effects(&self) -> bool {
        !self.effects.is_empty()
    }

    /// Add an effect. The id is pre-assigned by the bridge.
    pub fn add(&mut self, device: &wgpu::Device, id: u32, effect_type: EffectType) {
        let wgsl = build_effect_wgsl(effect_type.fragment_source());

        let shader_module =
            device
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("postprocess_shader"),
                    source: wgpu::ShaderSource::Wgsl(wgsl.into()),
                });

        let pipeline =
            device
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("postprocess_pipeline"),
                    layout: Some(&self.pipeline_layout),
                    vertex: wgpu::VertexState {
                        module: &shader_module,
                        entry_point: Some("vs_main"),
                        buffers: &[], // fullscreen triangle via vertex_index
                        compilation_options: Default::default(),
                    },
                    fragment: Some(wgpu::FragmentState {
                        module: &shader_module,
                        entry_point: Some("fs_main"),
                        targets: &[Some(wgpu::ColorTargetState {
                            format: self.surface_format,
                            blend: None,
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

        let param_data = effect_type.defaults();

        let param_buffer =
            device
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("postprocess_param_buffer"),
                    contents: bytemuck::cast_slice(&param_data),
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });

        let param_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("postprocess_param_bind_group"),
            layout: &self.params_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: param_buffer.as_entire_binding(),
            }],
        });

        self.effects.push((
            id,
            EffectEntry {
                effect_type,
                pipeline,
                param_buffer,
                param_bind_group,
                param_data,
            },
        ));
    }

    /// Set a user param vec4 slot (0-3) on an effect.
    pub fn set_param(&mut self, id: u32, index: u32, x: f32, y: f32, z: f32, w: f32) {
        if let Some((_, entry)) = self.effects.iter_mut().find(|(eid, _)| *eid == id) {
            let base = 4 + (index as usize).min(MAX_EFFECT_PARAMS - 1) * 4;
            entry.param_data[base] = x;
            entry.param_data[base + 1] = y;
            entry.param_data[base + 2] = z;
            entry.param_data[base + 3] = w;
        }
    }

    /// Remove an effect by ID.
    pub fn remove(&mut self, id: u32) {
        self.effects.retain(|(eid, _)| *eid != id);
    }

    /// Remove all effects.
    pub fn clear(&mut self) {
        self.effects.clear();
    }

    /// Ensure offscreen targets exist and match surface dimensions.
    fn ensure_targets(&mut self, gpu: &GpuContext) {
        let w = gpu.config.width;
        let h = gpu.config.height;

        let needs_recreate = self
            .target_a
            .as_ref()
            .map(|t| t.width != w || t.height != h)
            .unwrap_or(true);

        if needs_recreate {
            self.target_a = Some(self.create_target(gpu, w, h, "postprocess_a"));
            self.target_b = Some(self.create_target(gpu, w, h, "postprocess_b"));
        }
    }

    fn create_target(
        &self,
        gpu: &GpuContext,
        width: u32,
        height: u32,
        label: &str,
    ) -> OffscreenTarget {
        let texture = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(label),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: self.surface_format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT
                | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        let bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("{label}_bind_group")),
            layout: &self.texture_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&self.sampler),
                },
            ],
        });

        OffscreenTarget {
            texture,
            view,
            bind_group,
            width,
            height,
        }
    }

    /// Get the offscreen target view for sprite rendering.
    /// Sprites render here instead of the surface when effects are active.
    pub fn sprite_target(&mut self, gpu: &GpuContext) -> &wgpu::TextureView {
        self.ensure_targets(gpu);
        &self.target_a.as_ref().unwrap().view
    }

    /// Apply all effects and output to the surface.
    /// Call after sprites have been rendered to sprite_target().
    pub fn apply(
        &mut self,
        gpu: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        surface_view: &wgpu::TextureView,
    ) {
        let n = self.effects.len();
        if n == 0 {
            return;
        }

        let resolution = [gpu.config.width as f32, gpu.config.height as f32];

        // Flush all param buffers with current resolution
        for (_, entry) in self.effects.iter_mut() {
            entry.param_data[0] = resolution[0];
            entry.param_data[1] = resolution[1];
            gpu.queue.write_buffer(
                &entry.param_buffer,
                0,
                bytemuck::cast_slice(&entry.param_data),
            );
        }

        // Ping-pong: sprites were rendered to target_a.
        // Effect 0: read A -> write B (or surface if last)
        // Effect 1: read B -> write A (or surface if last)
        // ...
        for i in 0..n {
            let is_last = i == n - 1;

            // Source bind group (for sampling)
            let source_bg = if i % 2 == 0 {
                &self.target_a.as_ref().unwrap().bind_group
            } else {
                &self.target_b.as_ref().unwrap().bind_group
            };

            // Destination view
            let dest_view = if is_last {
                surface_view
            } else if i % 2 == 0 {
                &self.target_b.as_ref().unwrap().view
            } else {
                &self.target_a.as_ref().unwrap().view
            };

            let (_, entry) = &self.effects[i];

            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("postprocess_pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: dest_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            pass.set_pipeline(&entry.pipeline);
            pass.set_bind_group(0, source_bg, &[]);
            pass.set_bind_group(1, &entry.param_bind_group, &[]);
            pass.draw(0..3, 0..1); // fullscreen triangle
        }
    }
}

/// Build complete WGSL source for a post-process effect.
fn build_effect_wgsl(fragment_source: &str) -> String {
    format!("{}\n{}\n", EFFECT_PREAMBLE, fragment_source)
}

/// Shared declarations + fullscreen vertex shader for all effects.
const EFFECT_PREAMBLE: &str = r#"
@group(0) @binding(0)
var t_input: texture_2d<f32>;

@group(0) @binding(1)
var s_input: sampler;

struct EffectParams {
    resolution: vec4<f32>,
    values: array<vec4<f32>, 4>,
};

@group(1) @binding(0)
var<uniform> params: EffectParams;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
    // Fullscreen triangle: 3 vertices cover clip space [-1,1]
    var out: VertexOutput;
    let uv = vec2<f32>(f32((idx << 1u) & 2u), f32(idx & 2u));
    out.position = vec4<f32>(uv * 2.0 - 1.0, 0.0, 1.0);
    out.uv = vec2<f32>(uv.x, 1.0 - uv.y);
    return out;
}
"#;

/// Simplified single-pass bloom: bright-pass + weighted blur + additive composite.
/// Params: values[0].x = threshold, values[0].y = intensity, values[0].z = radius.
const BLOOM_FRAGMENT: &str = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let resolution = params.resolution.xy;
    let threshold = params.values[0].x;
    let intensity = params.values[0].y;
    let radius = params.values[0].z;

    let texel = 1.0 / resolution;
    let original = textureSample(t_input, s_input, in.uv);

    // 3x3 Gaussian-weighted bright-pass blur
    var bloom = vec3<f32>(0.0);

    let s00 = textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0, -1.0) * texel * radius).rgb;
    let s10 = textureSample(t_input, s_input, in.uv + vec2<f32>( 0.0, -1.0) * texel * radius).rgb;
    let s20 = textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0, -1.0) * texel * radius).rgb;
    let s01 = textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0,  0.0) * texel * radius).rgb;
    let s11 = textureSample(t_input, s_input, in.uv).rgb;
    let s21 = textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0,  0.0) * texel * radius).rgb;
    let s02 = textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0,  1.0) * texel * radius).rgb;
    let s12 = textureSample(t_input, s_input, in.uv + vec2<f32>( 0.0,  1.0) * texel * radius).rgb;
    let s22 = textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0,  1.0) * texel * radius).rgb;

    let lum = vec3<f32>(0.2126, 0.7152, 0.0722);
    bloom += max(dot(s00, lum) - threshold, 0.0) * s00 * 0.0625;
    bloom += max(dot(s10, lum) - threshold, 0.0) * s10 * 0.125;
    bloom += max(dot(s20, lum) - threshold, 0.0) * s20 * 0.0625;
    bloom += max(dot(s01, lum) - threshold, 0.0) * s01 * 0.125;
    bloom += max(dot(s11, lum) - threshold, 0.0) * s11 * 0.25;
    bloom += max(dot(s21, lum) - threshold, 0.0) * s21 * 0.125;
    bloom += max(dot(s02, lum) - threshold, 0.0) * s02 * 0.0625;
    bloom += max(dot(s12, lum) - threshold, 0.0) * s12 * 0.125;
    bloom += max(dot(s22, lum) - threshold, 0.0) * s22 * 0.0625;

    return vec4<f32>(original.rgb + bloom * intensity, original.a);
}
"#;

/// 9-tap Gaussian blur.
/// Params: values[0].x = strength (texel offset multiplier).
const BLUR_FRAGMENT: &str = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let resolution = params.resolution.xy;
    let strength = params.values[0].x;

    let texel = 1.0 / resolution * strength;

    var color = vec4<f32>(0.0);
    color += textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0, -1.0) * texel) * 0.0625;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>( 0.0, -1.0) * texel) * 0.125;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0, -1.0) * texel) * 0.0625;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0,  0.0) * texel) * 0.125;
    color += textureSample(t_input, s_input, in.uv) * 0.25;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0,  0.0) * texel) * 0.125;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>(-1.0,  1.0) * texel) * 0.0625;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>( 0.0,  1.0) * texel) * 0.125;
    color += textureSample(t_input, s_input, in.uv + vec2<f32>( 1.0,  1.0) * texel) * 0.0625;

    return color;
}
"#;

/// Vignette: darkens edges based on distance from center.
/// Params: values[0].x = intensity (0-1), values[0].y = radius (0-1).
const VIGNETTE_FRAGMENT: &str = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let intensity = params.values[0].x;
    let radius = params.values[0].y;

    let original = textureSample(t_input, s_input, in.uv);

    let center = in.uv - vec2<f32>(0.5);
    let dist = length(center) * 1.414;
    let vignette = smoothstep(radius, radius - 0.3, dist);
    let factor = mix(1.0, vignette, intensity);

    return vec4<f32>(original.rgb * factor, original.a);
}
"#;

/// CRT effect: scanlines + barrel distortion + chromatic aberration.
/// Params: values[0].x = scanline_freq, values[0].y = distortion, values[0].z = brightness.
const CRT_FRAGMENT: &str = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let scanline_freq = params.values[0].x;
    let distortion = params.values[0].y;
    let brightness = params.values[0].z;

    // Barrel distortion
    let center = in.uv - vec2<f32>(0.5);
    let dist2 = dot(center, center);
    let distorted_uv = in.uv + center * dist2 * distortion;

    // Black outside screen bounds
    if distorted_uv.x < 0.0 || distorted_uv.x > 1.0 || distorted_uv.y < 0.0 || distorted_uv.y > 1.0 {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }

    let original = textureSample(t_input, s_input, distorted_uv);

    // Scanlines
    let scanline = sin(distorted_uv.y * scanline_freq) * 0.5 + 0.5;
    let scanline_effect = mix(0.8, 1.0, scanline);

    // Chromatic aberration (subtle RGB offset at edges)
    let ca_offset = center * dist2 * 0.003;
    let r = textureSample(t_input, s_input, distorted_uv + ca_offset).r;
    let g = original.g;
    let b = textureSample(t_input, s_input, distorted_uv - ca_offset).b;

    return vec4<f32>(vec3<f32>(r, g, b) * scanline_effect * brightness, original.a);
}
"#;
