use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use super::camera::Camera2D;
use super::gpu::GpuContext;
use super::lighting::LightingUniform;
use super::texture::TextureStore;

/// A sprite draw command queued from TypeScript.
#[derive(Debug, Clone)]
pub struct SpriteCommand {
    pub texture_id: u32,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub layer: i32,
    pub uv_x: f32,
    pub uv_y: f32,
    pub uv_w: f32,
    pub uv_h: f32,
    pub tint_r: f32,
    pub tint_g: f32,
    pub tint_b: f32,
    pub tint_a: f32,
    pub rotation: f32,
    pub origin_x: f32,
    pub origin_y: f32,
    pub flip_x: bool,
    pub flip_y: bool,
    pub opacity: f32,
}

/// Per-vertex data for the unit quad.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct QuadVertex {
    position: [f32; 2],
    uv: [f32; 2],
}

/// Per-instance data for each sprite.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct SpriteInstance {
    world_pos: [f32; 2],
    size: [f32; 2],
    uv_offset: [f32; 2],
    uv_size: [f32; 2],
    tint: [f32; 4],
    /// [rotation_radians, origin_x (0-1), origin_y (0-1), padding]
    rotation_origin: [f32; 4],
}

/// Camera uniform buffer data.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct CameraUniform {
    view_proj: [f32; 16],
}

// Unit quad: two triangles forming a 1x1 square at origin
const QUAD_VERTICES: &[QuadVertex] = &[
    QuadVertex { position: [0.0, 0.0], uv: [0.0, 0.0] }, // top-left
    QuadVertex { position: [1.0, 0.0], uv: [1.0, 0.0] }, // top-right
    QuadVertex { position: [1.0, 1.0], uv: [1.0, 1.0] }, // bottom-right
    QuadVertex { position: [0.0, 1.0], uv: [0.0, 1.0] }, // bottom-left
];

const QUAD_INDICES: &[u16] = &[0, 1, 2, 0, 2, 3];

pub struct SpritePipeline {
    pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    camera_buffer: wgpu::Buffer,
    camera_bind_group: wgpu::BindGroup,
    pub texture_bind_group_layout: wgpu::BindGroupLayout,
    lighting_buffer: wgpu::Buffer,
    lighting_bind_group: wgpu::BindGroup,
}

impl SpritePipeline {
    pub fn new(gpu: &GpuContext) -> Self {
        let shader = gpu.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("sprite_shader"),
            source: wgpu::ShaderSource::Wgsl(
                include_str!("shaders/sprite.wgsl").into(),
            ),
        });

        // Camera uniform bind group layout (group 0)
        let camera_bind_group_layout =
            gpu.device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("camera_bind_group_layout"),
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

        // Texture bind group layout (group 1)
        let texture_bind_group_layout =
            gpu.device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("texture_bind_group_layout"),
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

        // Lighting uniform bind group layout (group 2)
        let lighting_bind_group_layout =
            gpu.device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("lighting_bind_group_layout"),
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
            gpu.device
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("sprite_pipeline_layout"),
                    bind_group_layouts: &[
                        &camera_bind_group_layout,
                        &texture_bind_group_layout,
                        &lighting_bind_group_layout,
                    ],
                    push_constant_ranges: &[],
                });

        // Vertex buffer layouts
        let vertex_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<QuadVertex>() as wgpu::BufferAddress,
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
            array_stride: std::mem::size_of::<SpriteInstance>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 2,
                    format: wgpu::VertexFormat::Float32x2, // world_pos
                },
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 3,
                    format: wgpu::VertexFormat::Float32x2, // size
                },
                wgpu::VertexAttribute {
                    offset: 16,
                    shader_location: 4,
                    format: wgpu::VertexFormat::Float32x2, // uv_offset
                },
                wgpu::VertexAttribute {
                    offset: 24,
                    shader_location: 5,
                    format: wgpu::VertexFormat::Float32x2, // uv_size
                },
                wgpu::VertexAttribute {
                    offset: 32,
                    shader_location: 6,
                    format: wgpu::VertexFormat::Float32x4, // tint
                },
                wgpu::VertexAttribute {
                    offset: 48,
                    shader_location: 7,
                    format: wgpu::VertexFormat::Float32x4, // rotation_origin
                },
            ],
        };

        let pipeline = gpu.device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("sprite_pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[vertex_layout, instance_layout],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: gpu.config.format,
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

        let vertex_buffer = gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("quad_vertex_buffer"),
            contents: bytemuck::cast_slice(QUAD_VERTICES),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let index_buffer = gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("quad_index_buffer"),
            contents: bytemuck::cast_slice(QUAD_INDICES),
            usage: wgpu::BufferUsages::INDEX,
        });

        let camera_uniform = CameraUniform {
            view_proj: Camera2D::default().view_proj(),
        };

        let camera_buffer = gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("camera_uniform_buffer"),
            contents: bytemuck::cast_slice(&[camera_uniform]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let camera_bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("camera_bind_group"),
            layout: &camera_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        // Lighting uniform buffer (272 bytes = LightingUniform size)
        let default_lighting = LightingUniform {
            ambient: [1.0, 1.0, 1.0],
            light_count: 0,
            lights: [super::lighting::LightData {
                pos_radius: [0.0; 4],
                color_intensity: [0.0; 4],
            }; super::lighting::MAX_LIGHTS],
        };

        let lighting_buffer = gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("lighting_uniform_buffer"),
            contents: bytemuck::cast_slice(&[default_lighting]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let lighting_bind_group = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("lighting_bind_group"),
            layout: &lighting_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: lighting_buffer.as_entire_binding(),
            }],
        });

        Self {
            pipeline,
            vertex_buffer,
            index_buffer,
            camera_buffer,
            camera_bind_group,
            texture_bind_group_layout,
            lighting_buffer,
            lighting_bind_group,
        }
    }

    /// Render a sorted list of sprite commands. Commands should be sorted by layer then texture_id.
    pub fn render(
        &self,
        gpu: &GpuContext,
        textures: &TextureStore,
        camera: &Camera2D,
        lighting: &LightingUniform,
        commands: &[SpriteCommand],
        target: &wgpu::TextureView,
        encoder: &mut wgpu::CommandEncoder,
        clear_color: wgpu::Color,
    ) {
        // Update camera uniform
        let camera_uniform = CameraUniform {
            view_proj: camera.view_proj(),
        };
        gpu.queue.write_buffer(
            &self.camera_buffer,
            0,
            bytemuck::cast_slice(&[camera_uniform]),
        );

        // Update lighting uniform
        gpu.queue.write_buffer(
            &self.lighting_buffer,
            0,
            bytemuck::cast_slice(&[*lighting]),
        );

        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("sprite_render_pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: target,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(clear_color),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });

        render_pass.set_pipeline(&self.pipeline);
        render_pass.set_bind_group(0, &self.camera_bind_group, &[]);
        render_pass.set_bind_group(2, &self.lighting_bind_group, &[]);
        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);

        // Batch by texture_id
        let mut i = 0;
        while i < commands.len() {
            let tex_id = commands[i].texture_id;
            let batch_start = i;
            while i < commands.len() && commands[i].texture_id == tex_id {
                i += 1;
            }
            let batch = &commands[batch_start..i];

            // Get texture bind group
            let bind_group = match textures.get_bind_group(tex_id) {
                Some(bg) => bg,
                None => continue, // skip if texture not loaded
            };

            // Build instance buffer for this batch
            let instances: Vec<SpriteInstance> = batch
                .iter()
                .map(|cmd| {
                    // Apply flip by negating UV and shifting offset
                    let mut uv_x = cmd.uv_x;
                    let mut uv_y = cmd.uv_y;
                    let mut uv_w = cmd.uv_w;
                    let mut uv_h = cmd.uv_h;
                    if cmd.flip_x {
                        uv_x += uv_w;
                        uv_w = -uv_w;
                    }
                    if cmd.flip_y {
                        uv_y += uv_h;
                        uv_h = -uv_h;
                    }
                    SpriteInstance {
                        world_pos: [cmd.x, cmd.y],
                        size: [cmd.w, cmd.h],
                        uv_offset: [uv_x, uv_y],
                        uv_size: [uv_w, uv_h],
                        tint: [cmd.tint_r, cmd.tint_g, cmd.tint_b, cmd.tint_a * cmd.opacity],
                        rotation_origin: [cmd.rotation, cmd.origin_x, cmd.origin_y, 0.0],
                    }
                })
                .collect();

            let instance_buffer =
                gpu.device
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("sprite_instance_buffer"),
                        contents: bytemuck::cast_slice(&instances),
                        usage: wgpu::BufferUsages::VERTEX,
                    });

            render_pass.set_bind_group(1, bind_group, &[]);
            render_pass.set_vertex_buffer(1, instance_buffer.slice(..));
            render_pass.draw_indexed(0..6, 0, 0..instances.len() as u32);
        }
    }
}
