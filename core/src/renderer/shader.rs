use std::collections::HashMap;

use wgpu::util::DeviceExt;

use super::gpu::GpuContext;

/// Maximum number of vec4 uniform slots per custom shader (built-in + user).
/// Layout: 2 vec4s for built-ins (time, delta, resolution, mouse, padding) + 14 user vec4s.
const MAX_PARAM_SLOTS: usize = 16;
/// Number of vec4 slots reserved for built-in uniforms (time, delta, resolution, mouse, pad).
const BUILTIN_SLOTS: usize = 2;
/// Size of uniform buffer in bytes (16 vec4s × 16 bytes each = 256 bytes).
const UNIFORM_BUFFER_SIZE: usize = MAX_PARAM_SLOTS * 16;

/// Extract the vertex shader + shared declarations from sprite.wgsl.
/// Everything before `@fragment` is the preamble.
fn shader_preamble() -> &'static str {
    let wgsl = include_str!("shaders/sprite.wgsl");
    let idx = wgsl
        .find("@fragment")
        .expect("sprite.wgsl must contain @fragment");
    &wgsl[..idx]
}

/// Build complete WGSL for a custom shader by combining:
/// 1. Standard preamble (camera, texture, lighting, vertex shader)
/// 2. Custom uniform params declaration (group 3)
/// 3. User's fragment shader code
fn build_custom_wgsl(user_fragment: &str) -> String {
    format!(
        r#"{}
// Custom shader params: 2 built-in vec4s + 14 user vec4 slots = 256 bytes
struct ShaderParams {{
    time: f32,              // elapsed seconds (auto-injected)
    delta: f32,             // frame delta time (auto-injected)
    resolution: vec2<f32>,  // viewport size in logical pixels (auto-injected)
    mouse: vec2<f32>,       // mouse position in screen pixels (auto-injected)
    _pad: vec2<f32>,
    values: array<vec4<f32>, 14>,  // user-defined uniform slots
}};

@group(3) @binding(0)
var<uniform> shader_params: ShaderParams;

{}
"#,
        shader_preamble(),
        user_fragment,
    )
}

struct ShaderEntry {
    pipeline: wgpu::RenderPipeline,
    uniform_buffer: wgpu::Buffer,
    uniform_bind_group: wgpu::BindGroup,
    param_data: [f32; MAX_PARAM_SLOTS * 4],
    dirty: bool,
}

/// Manages custom user-defined fragment shaders.
/// Each shader gets its own render pipeline and uniform buffer.
pub struct ShaderStore {
    shaders: HashMap<u32, ShaderEntry>,
    pipeline_layout: wgpu::PipelineLayout,
    params_bind_group_layout: wgpu::BindGroupLayout,
    surface_format: wgpu::TextureFormat,
}

impl ShaderStore {
    /// Create a shader store for headless testing.
    pub fn new_headless(device: &wgpu::Device, format: wgpu::TextureFormat) -> Self {
        Self::new_internal(device, format)
    }

    pub fn new(gpu: &GpuContext) -> Self {
        Self::new_internal(&gpu.device, gpu.config.format)
    }

    fn new_internal(device: &wgpu::Device, surface_format: wgpu::TextureFormat) -> Self {
        // Create bind group layouts matching SpritePipeline's groups 0-2
        let camera_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("shader_camera_layout"),
                    entries: &[wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::VERTEX,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    }],
                });

        let texture_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("shader_texture_layout"),
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

        let lighting_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("shader_lighting_layout"),
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

        // Group 3: custom uniform params
        let params_bind_group_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("shader_params_layout"),
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
                    label: Some("custom_shader_pipeline_layout"),
                    bind_group_layouts: &[
                        &camera_layout,
                        &texture_layout,
                        &lighting_layout,
                        &params_bind_group_layout,
                    ],
                    push_constant_ranges: &[],
                });

        Self {
            shaders: HashMap::new(),
            pipeline_layout,
            params_bind_group_layout,
            surface_format,
        }
    }

    /// Compile a custom shader from user-provided WGSL fragment source.
    /// The source must contain a `@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>`.
    /// Standard declarations (camera, texture, lighting, vertex shader) are prepended automatically.
    /// Custom uniforms are available as `shader_params.values[0..15]` (vec4 array).
    pub fn create(&mut self, device: &wgpu::Device, id: u32, _name: &str, source: &str) {
        let full_wgsl = build_custom_wgsl(source);

        let shader_module = device
            .create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some("custom_shader"),
                source: wgpu::ShaderSource::Wgsl(full_wgsl.into()),
            });

        let vertex_layout = wgpu::VertexBufferLayout {
            array_stride: 16, // QuadVertex: 2×f32 + 2×f32 = 16 bytes
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x2,
                },
            ],
        };

        let instance_layout = wgpu::VertexBufferLayout {
            array_stride: 64, // SpriteInstance: 16 floats × 4 bytes = 64
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 2,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 3,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: 16,
                    shader_location: 4,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: 24,
                    shader_location: 5,
                    format: wgpu::VertexFormat::Float32x2,
                },
                wgpu::VertexAttribute {
                    offset: 32,
                    shader_location: 6,
                    format: wgpu::VertexFormat::Float32x4,
                },
                wgpu::VertexAttribute {
                    offset: 48,
                    shader_location: 7,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        };

        let pipeline =
            device
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("custom_shader_pipeline"),
                    layout: Some(&self.pipeline_layout),
                    vertex: wgpu::VertexState {
                        module: &shader_module,
                        entry_point: Some("vs_main"),
                        buffers: &[vertex_layout, instance_layout],
                        compilation_options: Default::default(),
                    },
                    fragment: Some(wgpu::FragmentState {
                        module: &shader_module,
                        entry_point: Some("fs_main"),
                        targets: &[Some(wgpu::ColorTargetState {
                            format: self.surface_format,
                            blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                            write_mask: wgpu::ColorWrites::ALL,
                        })],
                        compilation_options: Default::default(),
                    }),
                    primitive: wgpu::PrimitiveState {
                        topology: wgpu::PrimitiveTopology::TriangleList,
                        strip_index_format: None,
                        front_face: wgpu::FrontFace::Ccw,
                        cull_mode: None,
                        polygon_mode: wgpu::PolygonMode::Fill,
                        unclipped_depth: false,
                        conservative: false,
                    },
                    depth_stencil: None,
                    multisample: wgpu::MultisampleState::default(),
                    multiview: None,
                    cache: None,
                });

        // Create uniform buffer (zero-initialized)
        let uniform_buffer =
            device
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("shader_params_buffer"),
                    contents: &[0u8; UNIFORM_BUFFER_SIZE],
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });

        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("shader_params_bind_group"),
            layout: &self.params_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
        });

        self.shaders.insert(
            id,
            ShaderEntry {
                pipeline,
                uniform_buffer,
                uniform_bind_group,
                param_data: [0.0; MAX_PARAM_SLOTS * 4],
                dirty: false,
            },
        );
    }

    /// Set a vec4 user parameter slot for a shader. Index 0-13 maps to WGSL `values[0..13]`.
    /// Internally offset by BUILTIN_SLOTS so user slot 0 → param_data[8..11].
    pub fn set_param(&mut self, id: u32, index: u32, x: f32, y: f32, z: f32, w: f32) {
        if let Some(entry) = self.shaders.get_mut(&id) {
            let offset_index = (index as usize + BUILTIN_SLOTS).min(MAX_PARAM_SLOTS - 1);
            let i = offset_index * 4;
            entry.param_data[i] = x;
            entry.param_data[i + 1] = y;
            entry.param_data[i + 2] = z;
            entry.param_data[i + 3] = w;
            entry.dirty = true;
        }
    }

    /// Flush uniform buffers to GPU, auto-injecting built-in values.
    /// Built-ins (time, delta, resolution, mouse) are written every frame for all shaders.
    pub fn flush(
        &mut self,
        queue: &wgpu::Queue,
        time: f32,
        delta: f32,
        resolution: [f32; 2],
        mouse: [f32; 2],
    ) {
        for entry in self.shaders.values_mut() {
            // Always write built-ins (first 8 floats = 2 vec4 slots)
            entry.param_data[0] = time;
            entry.param_data[1] = delta;
            entry.param_data[2] = resolution[0];
            entry.param_data[3] = resolution[1];
            entry.param_data[4] = mouse[0];
            entry.param_data[5] = mouse[1];
            entry.param_data[6] = 0.0; // _pad.x
            entry.param_data[7] = 0.0; // _pad.y

            // Always upload — built-ins change every frame
            queue.write_buffer(
                &entry.uniform_buffer,
                0,
                bytemuck::cast_slice(&entry.param_data),
            );
            entry.dirty = false;
        }
    }

    /// Get the pipeline for a custom shader.
    pub fn get_pipeline(&self, id: u32) -> Option<&wgpu::RenderPipeline> {
        self.shaders.get(&id).map(|e| &e.pipeline)
    }

    /// Get the uniform bind group for a custom shader (group 3).
    pub fn get_bind_group(&self, id: u32) -> Option<&wgpu::BindGroup> {
        self.shaders.get(&id).map(|e| &e.uniform_bind_group)
    }
}
