/// Geometry batch renderer: draws colored triangles and thick lines
/// without textures, using a single TriangleList pipeline.
///
/// Lines are expanded into quads (2 triangles) on the CPU side.
///
/// ## Integration (Phase 2 — renderer/mod.rs + dev.rs)
///
/// In `Renderer`:
/// ```ignore
/// pub geometry: GeometryBatch,
/// ```
///
/// In `Renderer::new()`:
/// ```ignore
/// let geometry = GeometryBatch::new(&gpu, sprites.camera_bind_group_layout());
/// // NOTE: GeometryBatch shares the camera bind group from SpritePipeline.
/// ```
///
/// In the frame callback (dev.rs), after sprite render:
/// ```ignore
/// // Drain GeoState commands
/// let geo_cmds: Vec<GeoCommand> = {
///     let geo = op_state.borrow::<Rc<RefCell<GeoState>>>();
///     let mut gs = geo.borrow_mut();
///     std::mem::take(&mut gs.commands)
/// };
///
/// // Feed commands into GeometryBatch
/// for cmd in &geo_cmds {
///     match cmd {
///         GeoCommand::Triangle { x1,y1,x2,y2,x3,y3,r,g,b,a,.. } =>
///             renderer.geometry.add_triangle(*x1,*y1,*x2,*y2,*x3,*y3,*r,*g,*b,*a),
///         GeoCommand::LineSeg { x1,y1,x2,y2,thickness,r,g,b,a,.. } =>
///             renderer.geometry.add_line(*x1,*y1,*x2,*y2,*thickness,*r,*g,*b,*a),
///     }
/// }
///
/// // Flush geometry (renders after sprites, no clear)
/// renderer.geometry.flush(&renderer.gpu, &mut encoder, &view, &sprites.camera_bind_group());
/// ```

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use super::gpu::GpuContext;

/// Per-vertex data for the geometry pipeline: position + RGBA color.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct GeoVertex {
    pub position: [f32; 2],
    pub color: [f32; 4],
}

/// Maximum number of vertices per frame before flush.
/// 65536 vertices = ~21845 triangles, more than enough for shape primitives.
const MAX_VERTICES: usize = 65536;

pub struct GeometryBatch {
    pipeline: wgpu::RenderPipeline,
    vertices: Vec<GeoVertex>,
}

impl GeometryBatch {
    /// Create a geometry batch for headless testing.
    pub fn new_headless(device: &wgpu::Device, format: wgpu::TextureFormat) -> Self {
        Self::new_internal(device, format)
    }

    /// Create a new geometry batch renderer.
    ///
    /// Shares the sprite pipeline's camera bind group at flush time so both pipelines
    /// use the same view-projection matrix without duplicating the uniform buffer.
    pub fn new(gpu: &GpuContext) -> Self {
        Self::new_internal(&gpu.device, gpu.config.format)
    }

    fn new_internal(device: &wgpu::Device, surface_format: wgpu::TextureFormat) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("geom_shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/geom.wgsl").into()),
        });

        let camera_bgl =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("geom_camera_bind_group_layout"),
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

        let pipeline_layout =
            device
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("geom_pipeline_layout"),
                    bind_group_layouts: &[&camera_bgl],
                    push_constant_ranges: &[],
                });

        let vertex_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<GeoVertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                // position: vec2<f32> at location 0
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2,
                },
                // color: vec4<f32> at location 1
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        };

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("geom_pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[vertex_layout],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
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

        Self {
            pipeline,
            vertices: Vec::with_capacity(MAX_VERTICES),
        }
    }

    /// Push a single colored triangle (3 vertices).
    pub fn add_triangle(
        &mut self,
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        x3: f32, y3: f32,
        r: f32, g: f32, b: f32, a: f32,
    ) {
        if self.vertices.len() + 3 > MAX_VERTICES {
            return; // silently drop if full
        }
        let color = [r, g, b, a];
        self.vertices.push(GeoVertex { position: [x1, y1], color });
        self.vertices.push(GeoVertex { position: [x2, y2], color });
        self.vertices.push(GeoVertex { position: [x3, y3], color });
    }

    /// Push a thick line segment as two triangles forming a quad.
    /// The quad extends `thickness/2` on each side of the line.
    pub fn add_line(
        &mut self,
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        thickness: f32,
        r: f32, g: f32, b: f32, a: f32,
    ) {
        if self.vertices.len() + 6 > MAX_VERTICES {
            return;
        }
        let dx = x2 - x1;
        let dy = y2 - y1;
        let len = (dx * dx + dy * dy).sqrt();
        if len < 1e-8 {
            return; // degenerate line
        }
        // Perpendicular direction, normalized, scaled by half-thickness
        let half = thickness * 0.5;
        let nx = -dy / len * half;
        let ny = dx / len * half;

        let color = [r, g, b, a];
        // Quad corners: p1+n, p1-n, p2-n, p2+n
        let a0 = GeoVertex { position: [x1 + nx, y1 + ny], color };
        let b0 = GeoVertex { position: [x1 - nx, y1 - ny], color };
        let c0 = GeoVertex { position: [x2 - nx, y2 - ny], color };
        let d0 = GeoVertex { position: [x2 + nx, y2 + ny], color };

        // Two triangles: a0-b0-c0, a0-c0-d0
        self.vertices.push(a0);
        self.vertices.push(b0);
        self.vertices.push(c0);
        self.vertices.push(a0);
        self.vertices.push(c0);
        self.vertices.push(d0);
    }

    /// Upload vertices and draw. Call after all add_triangle/add_line for this frame.
    /// Does NOT clear the render target (uses LoadOp::Load to layer over sprites).
    pub fn flush(
        &mut self,
        device: &wgpu::Device,
        encoder: &mut wgpu::CommandEncoder,
        target: &wgpu::TextureView,
        camera_bind_group: &wgpu::BindGroup,
    ) {
        if self.vertices.is_empty() {
            return;
        }

        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("geom_vertex_buffer"),
            contents: bytemuck::cast_slice(&self.vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let vertex_count = self.vertices.len() as u32;

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("geom_render_pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: target,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Load, // don't clear — overlay on top of sprites
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, camera_bind_group, &[]);
            pass.set_vertex_buffer(0, vertex_buffer.slice(..));
            pass.draw(0..vertex_count, 0..1);
        }

        self.vertices.clear();
    }

    /// Render a slice of GeoCommands with configurable load op.
    ///
    /// `clear_color`: `Some(color)` → `LoadOp::Clear(color)` (first pass),
    ///                 `None` → `LoadOp::Load` (subsequent passes).
    pub fn flush_commands(
        &mut self,
        device: &wgpu::Device,
        encoder: &mut wgpu::CommandEncoder,
        target: &wgpu::TextureView,
        camera_bind_group: &wgpu::BindGroup,
        commands: &[crate::scripting::geometry_ops::GeoCommand],
        clear_color: Option<wgpu::Color>,
    ) {
        if commands.is_empty() {
            return;
        }

        // Convert GeoCommands to vertices
        let mut verts: Vec<GeoVertex> = Vec::new();
        for cmd in commands {
            match cmd {
                crate::scripting::geometry_ops::GeoCommand::Triangle {
                    x1, y1, x2, y2, x3, y3, r, g, b, a, ..
                } => {
                    let color = [*r, *g, *b, *a];
                    verts.push(GeoVertex { position: [*x1, *y1], color });
                    verts.push(GeoVertex { position: [*x2, *y2], color });
                    verts.push(GeoVertex { position: [*x3, *y3], color });
                }
                crate::scripting::geometry_ops::GeoCommand::LineSeg {
                    x1, y1, x2, y2, thickness, r, g, b, a, ..
                } => {
                    let dx = x2 - x1;
                    let dy = y2 - y1;
                    let len = (dx * dx + dy * dy).sqrt();
                    if len < 1e-8 {
                        continue;
                    }
                    let half = thickness * 0.5;
                    let nx = -dy / len * half;
                    let ny = dx / len * half;
                    let color = [*r, *g, *b, *a];
                    let a0 = GeoVertex { position: [x1 + nx, y1 + ny], color };
                    let b0 = GeoVertex { position: [x1 - nx, y1 - ny], color };
                    let c0 = GeoVertex { position: [x2 - nx, y2 - ny], color };
                    let d0 = GeoVertex { position: [x2 + nx, y2 + ny], color };
                    verts.push(a0);
                    verts.push(b0);
                    verts.push(c0);
                    verts.push(a0);
                    verts.push(c0);
                    verts.push(d0);
                }
            }
        }

        if verts.is_empty() {
            return;
        }

        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("geom_vertex_buffer"),
            contents: bytemuck::cast_slice(&verts),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let vertex_count = verts.len() as u32;

        let load_op = match clear_color {
            Some(color) => wgpu::LoadOp::Clear(color),
            None => wgpu::LoadOp::Load,
        };

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("geom_render_pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: target,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: load_op,
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, camera_bind_group, &[]);
            pass.set_vertex_buffer(0, vertex_buffer.slice(..));
            pass.draw(0..vertex_count, 0..1);
        }
    }

    /// Discard all queued vertices without rendering.
    pub fn clear(&mut self) {
        self.vertices.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn geo_vertex_is_24_bytes() {
        // position (2 * f32 = 8) + color (4 * f32 = 16) = 24 bytes
        assert_eq!(std::mem::size_of::<GeoVertex>(), 24);
    }

    #[test]
    fn line_quad_geometry_is_correct() {
        // Verify the perpendicular math for a horizontal line
        let (x1, y1, x2, y2) = (0.0f32, 0.0, 10.0, 0.0);
        let thickness = 2.0f32;
        let dx = x2 - x1;
        let dy = y2 - y1;
        let len = (dx * dx + dy * dy).sqrt();
        let half = thickness * 0.5;
        let nx = -dy / len * half;
        let ny = dx / len * half;

        // For a horizontal line, perpendicular is vertical
        assert!((nx - 0.0).abs() < 1e-6, "nx should be 0 for horizontal line");
        assert!((ny - 1.0).abs() < 1e-6, "ny should be 1 for horizontal line");
    }

    #[test]
    fn diagonal_line_perpendicular() {
        let (x1, y1, x2, y2) = (0.0f32, 0.0, 10.0, 10.0);
        let thickness = 2.0f32;
        let dx = x2 - x1;
        let dy = y2 - y1;
        let len = (dx * dx + dy * dy).sqrt();
        let half = thickness * 0.5;
        let nx = -dy / len * half;
        let ny = dx / len * half;

        // Perpendicular length should equal half-thickness
        let perp_len = (nx * nx + ny * ny).sqrt();
        assert!((perp_len - 1.0).abs() < 1e-6, "perpendicular length should be half-thickness");
    }
}
