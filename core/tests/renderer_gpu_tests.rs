//! GPU-accelerated renderer tests.
//!
//! These tests require a GPU and are marked `#[ignore]` for CI.
//! Run locally with: `cargo test --lib -p arcane-core -- --ignored`
//! Or with coverage: `./run-coverage-rust.sh --gpu`

use arcane_core::renderer::camera::Camera2D;
use arcane_core::renderer::postprocess::EffectType;
use arcane_core::renderer::test_harness::{clear_target, TestGpu};
use arcane_core::scripting::geometry_ops::GeoCommand;

// ═══════════════════════════════════════════════════════════════════════════
// TextureStore tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_solid_color_white() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    let id = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "white",
        255,
        255,
        255,
        255,
    );

    assert!(id > 0, "Texture ID should be positive");
    assert!(textures.get_bind_group(id).is_some());
    assert_eq!(textures.get_dimensions(id), Some((1, 1)));
}

#[test]
#[ignore] // requires GPU
fn test_solid_color_red() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    let id = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "red",
        255,
        0,
        0,
        255,
    );

    assert!(id > 0);
    assert!(textures.get_bind_group(id).is_some());
}

#[test]
#[ignore] // requires GPU
fn test_solid_color_caching() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    let id1 = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "green",
        0,
        255,
        0,
        255,
    );

    // Same name should return the same ID
    let id2 = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "green",
        0,
        255,
        0,
        255,
    );

    assert_eq!(id1, id2, "Same name should return cached texture ID");
}

#[test]
#[ignore] // requires GPU
fn test_upload_raw_checkerboard() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    // 4x4 checkerboard pattern
    let mut pixels = vec![0u8; 4 * 4 * 4];
    for y in 0..4 {
        for x in 0..4 {
            let idx = (y * 4 + x) * 4;
            let is_white = (x + y) % 2 == 0;
            let c = if is_white { 255 } else { 0 };
            pixels[idx] = c;
            pixels[idx + 1] = c;
            pixels[idx + 2] = c;
            pixels[idx + 3] = 255;
        }
    }

    let id = 1000; // Pre-assigned ID
    textures.upload_raw(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        id,
        &pixels,
        4,
        4,
    );

    assert!(textures.get_bind_group(id).is_some());
    assert_eq!(textures.get_dimensions(id), Some((4, 4)));
}

#[test]
#[ignore] // requires GPU
fn test_missing_texture_returns_none() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let textures = gpu.create_texture_store();

    assert!(textures.get_bind_group(9999).is_none());
    assert!(textures.get_dimensions(9999).is_none());
}

// ═══════════════════════════════════════════════════════════════════════════
// GeometryBatch tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_geometry_batch_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _geometry = gpu.create_geometry_batch();
    // If we got here without panicking, creation succeeded
}

#[test]
#[ignore] // requires GPU
fn test_triangle_white_center() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut geometry = gpu.create_geometry_batch();
    let sprites = gpu.create_sprite_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);

    let target = gpu.create_target(64, 64);

    // Clear to black
    clear_target(&gpu, &target, [0.0, 0.0, 0.0, 1.0]);

    // Add a white triangle covering the center
    geometry.add_triangle(
        16.0, 16.0, 48.0, 16.0, 32.0, 48.0, // vertices
        1.0, 1.0, 1.0, 1.0,                 // white color
    );

    // Prepare camera uniform
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // Render geometry
    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    geometry.flush(&gpu.device, &mut encoder, &target.view, sprites.camera_bind_group());
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

    // Center of triangle should be white
    assert!(
        target.pixel_matches(&pixels, 32, 32, [255, 255, 255, 255], 5),
        "Center pixel should be white, got {:?}",
        target.get_pixel(&pixels, 32, 32)
    );
}

#[test]
#[ignore] // requires GPU
fn test_triangle_rgb_vertices() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _geometry = gpu.create_geometry_batch();
    // Just verify creation works - full color interpolation test requires more complex setup
}

#[test]
#[ignore] // requires GPU
fn test_thick_line_horizontal() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut geometry = gpu.create_geometry_batch();
    let sprites = gpu.create_sprite_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);

    let target = gpu.create_target(64, 64);
    clear_target(&gpu, &target, [0.0, 0.0, 0.0, 1.0]);

    // Horizontal red line at y=32, from x=10 to x=54
    geometry.add_line(10.0, 32.0, 54.0, 32.0, 4.0, 1.0, 0.0, 0.0, 1.0);

    let lighting = arcane_core::renderer::LightingState::default().to_uniform();
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    geometry.flush(&gpu.device, &mut encoder, &target.view, sprites.camera_bind_group());
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

    // Line center should be red
    assert!(
        target.pixel_matches(&pixels, 32, 32, [255, 0, 0, 255], 5),
        "Line center should be red, got {:?}",
        target.get_pixel(&pixels, 32, 32)
    );
}

#[test]
#[ignore] // requires GPU
fn test_geometry_alpha_blending() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut geometry = gpu.create_geometry_batch();
    let sprites = gpu.create_sprite_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);

    let target = gpu.create_target(64, 64);
    clear_target(&gpu, &target, [1.0, 0.0, 0.0, 1.0]); // Red background

    // Semi-transparent blue triangle
    geometry.add_triangle(
        0.0, 0.0, 64.0, 0.0, 32.0, 64.0,
        0.0, 0.0, 1.0, 0.5, // 50% alpha blue
    );

    let lighting = arcane_core::renderer::LightingState::default().to_uniform();
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    geometry.flush(&gpu.device, &mut encoder, &target.view, sprites.camera_bind_group());
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    let pixel = target.get_pixel(&pixels, 32, 32);

    // Should be a blend of red and blue (purple-ish)
    assert!(pixel[0] > 100, "Red channel should still be present");
    assert!(pixel[2] > 100, "Blue channel should be present from triangle");
}

#[test]
#[ignore] // requires GPU
fn test_flush_commands_with_layer_sorting() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut geometry = gpu.create_geometry_batch();
    let sprites = gpu.create_sprite_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);

    // Create commands with different layers
    let commands = vec![
        GeoCommand::Triangle {
            x1: 0.0, y1: 0.0, x2: 64.0, y2: 0.0, x3: 32.0, y3: 64.0,
            r: 1.0, g: 0.0, b: 0.0, a: 1.0,
            layer: 0,
        },
        GeoCommand::Triangle {
            x1: 16.0, y1: 16.0, x2: 48.0, y2: 16.0, x3: 32.0, y3: 48.0,
            r: 0.0, g: 1.0, b: 0.0, a: 1.0,
            layer: 1, // Higher layer, renders on top
        },
    ];

    let target = gpu.create_target(64, 64);
    clear_target(&gpu, &target, [0.0, 0.0, 0.0, 1.0]);

    let lighting = arcane_core::renderer::LightingState::default().to_uniform();
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    geometry.flush_commands(
        &gpu.device,
        &mut encoder,
        &target.view,
        sprites.camera_bind_group(),
        &commands,
        Some(wgpu::Color::BLACK),
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

    // Center should be green (layer 1 on top)
    assert!(
        target.pixel_matches(&pixels, 32, 32, [0, 255, 0, 255], 5),
        "Center should be green (layer 1), got {:?}",
        target.get_pixel(&pixels, 32, 32)
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// PostProcessPipeline tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_postprocess_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let postprocess = gpu.create_postprocess();
    assert!(!postprocess.has_effects());
}

#[test]
#[ignore] // requires GPU
fn test_postprocess_add_effect() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut postprocess = gpu.create_postprocess();

    postprocess.add(&gpu.device, 1, EffectType::Bloom);
    assert!(postprocess.has_effects());
}

#[test]
#[ignore] // requires GPU
fn test_postprocess_all_effect_types() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut postprocess = gpu.create_postprocess();

    postprocess.add(&gpu.device, 1, EffectType::Bloom);
    postprocess.add(&gpu.device, 2, EffectType::Blur);
    postprocess.add(&gpu.device, 3, EffectType::Vignette);
    postprocess.add(&gpu.device, 4, EffectType::Crt);

    assert!(postprocess.has_effects());
}

#[test]
#[ignore] // requires GPU
fn test_postprocess_set_param() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut postprocess = gpu.create_postprocess();

    postprocess.add(&gpu.device, 1, EffectType::Bloom);
    postprocess.set_param(1, 0, 0.5, 0.8, 2.0, 0.0); // threshold, intensity, radius

    // If we got here without panicking, param setting works
    assert!(postprocess.has_effects());
}

#[test]
#[ignore] // requires GPU
fn test_postprocess_remove_effect() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut postprocess = gpu.create_postprocess();

    postprocess.add(&gpu.device, 1, EffectType::Bloom);
    assert!(postprocess.has_effects());

    postprocess.remove(1);
    assert!(!postprocess.has_effects());
}

#[test]
#[ignore] // requires GPU
fn test_postprocess_clear_all() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut postprocess = gpu.create_postprocess();

    postprocess.add(&gpu.device, 1, EffectType::Bloom);
    postprocess.add(&gpu.device, 2, EffectType::Vignette);
    assert!(postprocess.has_effects());

    postprocess.clear();
    assert!(!postprocess.has_effects());
}

// ═══════════════════════════════════════════════════════════════════════════
// RenderTargetStore tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_render_target_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut targets = gpu.create_render_target_store();

    targets.create(&gpu.device, 1, 128, 128, gpu.format);

    assert!(targets.get_view(1).is_some());
    assert_eq!(targets.get_dims(1), Some((128, 128)));
}

#[test]
#[ignore] // requires GPU
fn test_render_target_destroy() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut targets = gpu.create_render_target_store();

    targets.create(&gpu.device, 1, 64, 64, gpu.format);
    assert!(targets.get_view(1).is_some());

    targets.destroy(1);
    assert!(targets.get_view(1).is_none());
    assert!(targets.get_dims(1).is_none());
}

#[test]
#[ignore] // requires GPU
fn test_render_target_missing_returns_none() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let targets = gpu.create_render_target_store();

    assert!(targets.get_view(9999).is_none());
    assert!(targets.get_dims(9999).is_none());
}

#[test]
#[ignore] // requires GPU
fn test_multiple_render_targets() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut targets = gpu.create_render_target_store();

    targets.create(&gpu.device, 1, 64, 64, gpu.format);
    targets.create(&gpu.device, 2, 128, 128, gpu.format);
    targets.create(&gpu.device, 3, 256, 256, gpu.format);

    assert_eq!(targets.get_dims(1), Some((64, 64)));
    assert_eq!(targets.get_dims(2), Some((128, 128)));
    assert_eq!(targets.get_dims(3), Some((256, 256)));

    // Destroy one, others should still work
    targets.destroy(2);
    assert!(targets.get_view(1).is_some());
    assert!(targets.get_view(2).is_none());
    assert!(targets.get_view(3).is_some());
}

// ═══════════════════════════════════════════════════════════════════════════
// ShaderStore tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_shader_store_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _shaders = gpu.create_shader_store();
    // If we got here without panicking, creation succeeded
}

#[test]
#[ignore] // requires GPU
fn test_shader_create_and_get() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut shaders = gpu.create_shader_store();

    // Simple passthrough fragment shader (uses sprite.wgsl VertexOutput which has `tint`)
    let source = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return color * in.tint;
}
"#;

    shaders.create(&gpu.device, 1, "passthrough", source);

    assert!(shaders.get_pipeline(1).is_some());
    assert!(shaders.get_bind_group(1).is_some());
}

#[test]
#[ignore] // requires GPU
fn test_shader_set_param() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut shaders = gpu.create_shader_store();

    let source = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tint = shader_params.values[0];
    let color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return color * tint;
}
"#;

    shaders.create(&gpu.device, 1, "tint", source);
    shaders.set_param(1, 0, 1.0, 0.5, 0.5, 1.0); // Red tint

    // Flush to GPU with built-in uniform values
    shaders.flush(&gpu.queue, 0.0, 0.016, [800.0, 600.0], [0.0, 0.0]);

    // If we got here without panicking, param setting works
    assert!(shaders.get_pipeline(1).is_some());
}

#[test]
#[ignore] // requires GPU
fn test_shader_missing_returns_none() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let shaders = gpu.create_shader_store();

    assert!(shaders.get_pipeline(9999).is_none());
    assert!(shaders.get_bind_group(9999).is_none());
}

// ═══════════════════════════════════════════════════════════════════════════
// SpritePipeline tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_sprite_pipeline_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _sprites = gpu.create_sprite_pipeline();
    // If we got here without panicking, creation succeeded
}

#[test]
#[ignore] // requires GPU
fn test_sprite_pipeline_prepare() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let camera = gpu.create_camera(800.0, 600.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);
    // If we got here without panicking, prepare works
}

#[test]
#[ignore] // requires GPU
fn test_sprite_render_white_sprite() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    let tex_id = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "white",
        255,
        255,
        255,
        255,
    );

    let target = gpu.create_target(64, 64);

    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // x,y is top-left corner; fill the whole 64×64 target
    let commands = vec![make_sprite(tex_id, 0.0, 0.0, 64.0, 64.0, 0)];

    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

    sprites.render(
        &gpu.device,
        &gpu.queue,
        &textures,
        &shaders,
        &commands,
        &target.view,
        &mut encoder,
        Some(wgpu::Color::BLACK),
    );

    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

    // Center should be white (sprite is centered)
    assert!(
        target.pixel_matches(&pixels, 32, 32, [255, 255, 255, 255], 5),
        "Center should be white, got {:?}",
        target.get_pixel(&pixels, 32, 32)
    );
}

#[test]
#[ignore] // requires GPU
fn test_sprite_render_with_tint() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    let tex_id = textures.create_solid_color(
        &gpu.device,
        &gpu.queue,
        &sprites.texture_bind_group_layout,
        "white",
        255,
        255,
        255,
        255,
    );

    let target = gpu.create_target(64, 64);

    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // x,y is top-left corner; fill the whole 64×64 target with a red-tinted white sprite
    let mut cmd = make_sprite(tex_id, 0.0, 0.0, 64.0, 64.0, 0);
    cmd.tint_r = 1.0;
    cmd.tint_g = 0.0;
    cmd.tint_b = 0.0;
    let commands = vec![cmd];

    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

    sprites.render(
        &gpu.device,
        &gpu.queue,
        &textures,
        &shaders,
        &commands,
        &target.view,
        &mut encoder,
        Some(wgpu::Color::BLACK),
    );

    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");

    // Center should be red due to tint
    let pixel = target.get_pixel(&pixels, 32, 32);
    assert!(
        pixel[0] > 200 && pixel[1] < 50 && pixel[2] < 50,
        "Center should be red, got {:?}",
        pixel
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Camera2D tests (don't require GPU, but included for completeness)
// ═══════════════════════════════════════════════════════════════════════════

#[test]
fn test_camera_view_proj_centered() {
    let camera = Camera2D {
        x: 400.0,
        y: 300.0,
        zoom: 1.0,
        viewport_size: [800.0, 600.0],
        ..Default::default()
    };

    let mat = camera.view_proj();

    // Camera at (400, 300) looking at center of 800x600 viewport
    // Should have identity-like translation (centered view)
    assert!(mat[0] > 0.0, "sx should be positive");
    assert!(mat[5] != 0.0, "sy should be non-zero");
}

#[test]
fn test_camera_zoom_affects_scale() {
    let camera_1x = Camera2D {
        x: 0.0,
        y: 0.0,
        zoom: 1.0,
        viewport_size: [800.0, 600.0],
        ..Default::default()
    };

    let camera_2x = Camera2D {
        x: 0.0,
        y: 0.0,
        zoom: 2.0,
        viewport_size: [800.0, 600.0],
        ..Default::default()
    };

    let mat_1x = camera_1x.view_proj();
    let mat_2x = camera_2x.view_proj();

    // Zoom 2x should have 2x larger scale values
    assert!(
        (mat_2x[0] - mat_1x[0] * 2.0).abs() < 0.0001,
        "2x zoom should double sx"
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SdfPipelineStore tests
// ═══════════════════════════════════════════════════════════════════════════

use arcane_core::renderer::sdf::{SdfCommand, SdfFill};

#[test]
#[ignore] // requires GPU
fn test_sdf_pipeline_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _sdf = gpu.create_sdf_pipeline();
}

#[test]
#[ignore] // requires GPU
fn test_sdf_solid_circle_render() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut sdf = gpu.create_sdf_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);
    let target = gpu.create_target(64, 64);

    clear_target(&gpu, &target, [0.0, 0.0, 0.0, 1.0]);

    sdf.prepare(&gpu.queue, &camera, 0.0);

    let commands = vec![SdfCommand {
        sdf_expr: "length(p) - 20.0".to_string(),
        fill: SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] },
        x: 32.0, y: 32.0, bounds: 25.0, layer: 0,
        rotation: 0.0, scale: 1.0, opacity: 1.0,
    }];

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sdf.render(&gpu.device, &mut encoder, &target.view, &commands, Some(wgpu::Color::BLACK));
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    let center = target.get_pixel(&pixels, 32, 32);
    // Center of the circle should be red
    assert!(center[0] > 200, "Center red channel should be high, got {}", center[0]);
    assert!(center[1] < 50, "Center green channel should be low, got {}", center[1]);
}

#[test]
#[ignore] // requires GPU
fn test_sdf_outline_circle() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut sdf = gpu.create_sdf_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);
    let target = gpu.create_target(64, 64);

    clear_target(&gpu, &target, [0.0, 0.0, 0.0, 1.0]);

    sdf.prepare(&gpu.queue, &camera, 0.0);

    let commands = vec![SdfCommand {
        sdf_expr: "length(p) - 20.0".to_string(),
        fill: SdfFill::Outline { color: [0.0, 1.0, 0.0, 1.0], thickness: 3.0 },
        x: 32.0, y: 32.0, bounds: 25.0, layer: 0,
        rotation: 0.0, scale: 1.0, opacity: 1.0,
    }];

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sdf.render(&gpu.device, &mut encoder, &target.view, &commands, Some(wgpu::Color::BLACK));
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    // Center of outline circle should be transparent/black (not filled)
    let center = target.get_pixel(&pixels, 32, 32);
    assert!(center[1] < 50, "Center of outline should NOT be green, got {:?}", center);
}

#[test]
#[ignore] // requires GPU
fn test_sdf_gradient_no_panic() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut sdf = gpu.create_sdf_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);
    let target = gpu.create_target(64, 64);

    sdf.prepare(&gpu.queue, &camera, 0.0);

    let commands = vec![SdfCommand {
        sdf_expr: "length(p) - 20.0".to_string(),
        fill: SdfFill::Gradient {
            from: [1.0, 0.0, 0.0, 1.0],
            to: [0.0, 0.0, 1.0, 1.0],
            angle: 0.0,
            scale: 1.0,
        },
        x: 32.0, y: 32.0, bounds: 25.0, layer: 0,
        rotation: 0.0, scale: 1.0, opacity: 1.0,
    }];

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sdf.render(&gpu.device, &mut encoder, &target.view, &commands, Some(wgpu::Color::BLACK));
    gpu.queue.submit(std::iter::once(encoder.finish()));

    // Just verify no panic
    let _pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
}

#[test]
#[ignore] // requires GPU
fn test_sdf_multiple_shapes() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut sdf = gpu.create_sdf_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);
    let target = gpu.create_target(64, 64);

    sdf.prepare(&gpu.queue, &camera, 0.0);

    let commands = vec![
        SdfCommand {
            sdf_expr: "length(p) - 10.0".to_string(),
            fill: SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] },
            x: 16.0, y: 16.0, bounds: 15.0, layer: 0,
            rotation: 0.0, scale: 1.0, opacity: 1.0,
        },
        SdfCommand {
            sdf_expr: "length(p) - 10.0".to_string(),
            fill: SdfFill::Solid { color: [0.0, 0.0, 1.0, 1.0] },
            x: 48.0, y: 48.0, bounds: 15.0, layer: 1,
            rotation: 0.0, scale: 1.0, opacity: 1.0,
        },
    ];

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sdf.render(&gpu.device, &mut encoder, &target.view, &commands, Some(wgpu::Color::BLACK));
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let _pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
}

#[test]
#[ignore] // requires GPU
fn test_sdf_glow_fill() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut sdf = gpu.create_sdf_pipeline();
    let camera = gpu.create_camera(64.0, 64.0);
    let target = gpu.create_target(64, 64);

    sdf.prepare(&gpu.queue, &camera, 0.0);

    let commands = vec![SdfCommand {
        sdf_expr: "length(p) - 15.0".to_string(),
        fill: SdfFill::Glow { color: [1.0, 1.0, 0.0, 1.0], intensity: 2.0 },
        x: 32.0, y: 32.0, bounds: 25.0, layer: 0,
        rotation: 0.0, scale: 1.0, opacity: 1.0,
    }];

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sdf.render(&gpu.device, &mut encoder, &target.view, &commands, Some(wgpu::Color::BLACK));
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let _pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
}

// ═══════════════════════════════════════════════════════════════════════════
// RadiancePipeline tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_radiance_pipeline_creation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let _radiance = gpu.create_radiance_pipeline();
}

// NOTE: RadiancePipeline::compute() requires &GpuContext (needs window surface).
// Only creation can be tested headlessly; compute pass tests need `arcane dev`.

// ═══════════════════════════════════════════════════════════════════════════
// Expanded SpritePipeline tests
// ═══════════════════════════════════════════════════════════════════════════

/// Create a SpriteCommand for testing.
/// `x, y` is the **top-left corner** of the sprite in world coordinates.
/// To fill a 64×64 target, use `make_sprite(id, 0.0, 0.0, 64.0, 64.0, 0)`.
fn make_sprite(tex_id: u32, x: f32, y: f32, w: f32, h: f32, layer: i32) -> arcane_core::renderer::SpriteCommand {
    arcane_core::renderer::SpriteCommand {
        texture_id: tex_id,
        x, y, w, h, layer,
        uv_x: 0.0, uv_y: 0.0, uv_w: 1.0, uv_h: 1.0,
        tint_r: 1.0, tint_g: 1.0, tint_b: 1.0, tint_a: 1.0,
        rotation: 0.0, origin_x: 0.5, origin_y: 0.5,
        flip_x: false, flip_y: false, opacity: 1.0,
        blend_mode: 0, shader_id: 0,
    }
}

#[test]
#[ignore] // requires GPU
fn test_sprite_opacity_half() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    let tex_id = textures.create_solid_color(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        "white", 255, 255, 255, 255,
    );

    let target = gpu.create_target(64, 64);
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    let mut cmd = make_sprite(tex_id, 0.0, 0.0, 64.0, 64.0, 0);
    cmd.opacity = 0.5;

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &[cmd], &target.view, &mut encoder, Some(wgpu::Color::BLACK),
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    let center = target.get_pixel(&pixels, 32, 32);
    // At 50% opacity over black, should be roughly 127
    assert!(center[0] > 90 && center[0] < 180,
        "50% opacity white over black should be ~127, got {}", center[0]);
}

#[test]
#[ignore] // requires GPU
fn test_sprite_flip_x() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    // Create a 2x1 texture: left=red, right=blue
    let pixels_data: [u8; 8] = [255, 0, 0, 255, 0, 0, 255, 255];
    let tex_id = 2000;
    textures.upload_raw(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        tex_id, &pixels_data, 2, 1,
    );

    let target = gpu.create_target(64, 64);
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // Render with flip_x = true
    let mut cmd = make_sprite(tex_id, 0.0, 0.0, 64.0, 64.0, 0);
    cmd.flip_x = true;

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &[cmd], &target.view, &mut encoder, Some(wgpu::Color::BLACK),
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    // With flip_x, left side should now be blue (was right)
    let left = target.get_pixel(&pixels, 10, 32);
    let right = target.get_pixel(&pixels, 54, 32);
    assert!(left[2] > left[0], "Flipped: left should be more blue than red, got {:?}", left);
    assert!(right[0] > right[2], "Flipped: right should be more red than blue, got {:?}", right);
}

#[test]
#[ignore] // requires GPU
fn test_sprite_flip_y() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    // Create a 1x2 texture: top=red, bottom=green
    let pixels_data: [u8; 8] = [255, 0, 0, 255, 0, 255, 0, 255];
    let tex_id = 2001;
    textures.upload_raw(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        tex_id, &pixels_data, 1, 2,
    );

    let target = gpu.create_target(64, 64);
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    let mut cmd = make_sprite(tex_id, 0.0, 0.0, 64.0, 64.0, 0);
    cmd.flip_y = true;

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &[cmd], &target.view, &mut encoder, Some(wgpu::Color::BLACK),
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    // With flip_y, top should now be green (was bottom)
    let top = target.get_pixel(&pixels, 32, 10);
    let bottom = target.get_pixel(&pixels, 32, 54);
    assert!(top[1] > top[0], "Flipped: top should be more green than red, got {:?}", top);
    assert!(bottom[0] > bottom[1], "Flipped: bottom should be more red than green, got {:?}", bottom);
}

#[test]
#[ignore] // requires GPU
fn test_sprite_layer_ordering() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    let red_id = textures.create_solid_color(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        "red", 255, 0, 0, 255,
    );
    let green_id = textures.create_solid_color(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        "green", 0, 255, 0, 255,
    );

    let target = gpu.create_target(64, 64);
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // Red at layer 0, green at layer 1 (on top)
    let cmd_red = make_sprite(red_id, 0.0, 0.0, 64.0, 64.0, 0);
    let cmd_green = make_sprite(green_id, 0.0, 0.0, 64.0, 64.0, 1);

    // Sort by layer (as render_frame does)
    let mut commands = vec![cmd_red, cmd_green];
    commands.sort_by_key(|c| c.layer);

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );

    // Render layer 0 first, then layer 1
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &commands[0..1], &target.view, &mut encoder, Some(wgpu::Color::BLACK),
    );
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &commands[1..2], &target.view, &mut encoder, None,
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    let center = target.get_pixel(&pixels, 32, 32);
    // Green (layer 1) should be on top
    assert!(center[1] > 200, "Green layer should be on top, got {:?}", center);
    assert!(center[0] < 50, "Red should be hidden, got {:?}", center);
}

#[test]
#[ignore] // requires GPU
fn test_sprite_rotation() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();
    let shaders = gpu.create_shader_store();
    let camera = gpu.create_camera(64.0, 64.0);
    let lighting = arcane_core::renderer::LightingState::default().to_uniform();

    let tex_id = textures.create_solid_color(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        "white", 255, 255, 255, 255,
    );

    let target = gpu.create_target(64, 64);
    sprites.prepare(&gpu.device, &gpu.queue, &camera, &lighting);

    // Render a narrow tall sprite rotated 90° — should become wide.
    // Position at (28, 12) so the center (28+4, 12+20) = (32, 32) is at viewport center.
    let mut cmd = make_sprite(tex_id, 28.0, 12.0, 8.0, 40.0, 0);
    cmd.rotation = std::f32::consts::FRAC_PI_2; // 90°

    let mut encoder = gpu.device.create_command_encoder(
        &wgpu::CommandEncoderDescriptor { label: None },
    );
    sprites.render(
        &gpu.device, &gpu.queue, &textures, &shaders,
        &[cmd], &target.view, &mut encoder, Some(wgpu::Color::BLACK),
    );
    gpu.queue.submit(std::iter::once(encoder.finish()));

    let pixels = target.read_pixels(&gpu).expect("Failed to read pixels");
    // After 90° rotation, a narrow vertical sprite becomes a narrow horizontal one
    // The sprite should be visible at center
    let center = target.get_pixel(&pixels, 32, 32);
    assert!(center[0] > 200, "Center should be white after rotation, got {:?}", center);
}

// ═══════════════════════════════════════════════════════════════════════════
// Expanded ShaderStore tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_shader_multiple_params() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut shaders = gpu.create_shader_store();

    let source = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tint = shader_params.values[0];
    let color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return color * tint;
}
"#;

    shaders.create(&gpu.device, 1, "multi_param", source);

    // Set all 14 user slots
    for i in 0..14u32 {
        shaders.set_param(1, i, i as f32, 0.0, 0.0, 1.0);
    }

    // Flush with built-ins
    shaders.flush(&gpu.queue, 1.0, 0.016, [800.0, 600.0], [100.0, 200.0]);

    // No panic = success
    assert!(shaders.get_pipeline(1).is_some());
}

#[test]
#[ignore] // requires GPU
fn test_shader_builtin_injection() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut shaders = gpu.create_shader_store();

    // Shader that uses built-in time value
    let source = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let t = shader_params.time;
    let color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return color * vec4<f32>(t, t, t, 1.0);
}
"#;

    shaders.create(&gpu.device, 1, "time_test", source);
    shaders.flush(&gpu.queue, 2.5, 0.016, [1024.0, 768.0], [50.0, 75.0]);

    // If we got here without panicking, built-in injection works
    assert!(shaders.get_pipeline(1).is_some());
}

#[test]
#[ignore] // requires GPU
fn test_shader_multiple_shaders() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let mut shaders = gpu.create_shader_store();

    let source1 = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return textureSample(t_diffuse, s_diffuse, in.tex_coords) * in.tint;
}
"#;
    let source2 = r#"
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return vec4<f32>(1.0 - color.rgb, color.a);
}
"#;

    shaders.create(&gpu.device, 1, "shader1", source1);
    shaders.create(&gpu.device, 2, "shader2", source2);

    assert!(shaders.get_pipeline(1).is_some());
    assert!(shaders.get_pipeline(2).is_some());
    assert!(shaders.get_bind_group(1).is_some());
    assert!(shaders.get_bind_group(2).is_some());

    shaders.flush(&gpu.queue, 0.0, 0.016, [800.0, 600.0], [0.0, 0.0]);
}

// NOTE: PostProcess render tests (bloom, vignette, CRT) require &GpuContext
// (needs a window surface for sprite_target/apply). Only API tests above are headless.
// Full render-path postprocess tests would need `arcane dev` or a real window.

// ═══════════════════════════════════════════════════════════════════════════
// Expanded Texture tests
// ═══════════════════════════════════════════════════════════════════════════

#[test]
#[ignore] // requires GPU
fn test_large_texture_1024() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    // Create a 1024x1024 texture (solid blue)
    let size = 1024 * 1024 * 4;
    let mut pixels = vec![0u8; size];
    for i in (0..size).step_by(4) {
        pixels[i] = 0;      // R
        pixels[i + 1] = 0;  // G
        pixels[i + 2] = 255; // B
        pixels[i + 3] = 255; // A
    }

    let tex_id = 3000;
    textures.upload_raw(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        tex_id, &pixels, 1024, 1024,
    );

    assert!(textures.get_bind_group(tex_id).is_some());
    assert_eq!(textures.get_dimensions(tex_id), Some((1024, 1024)));
}

#[test]
#[ignore] // requires GPU
fn test_texture_overwrite() {
    let gpu = TestGpu::new().expect("Failed to create GPU context");
    let sprites = gpu.create_sprite_pipeline();
    let mut textures = gpu.create_texture_store();

    let tex_id = 4000;

    // Upload red 4x4
    let red_pixels: Vec<u8> = (0..4*4).flat_map(|_| vec![255, 0, 0, 255]).collect();
    textures.upload_raw(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        tex_id, &red_pixels, 4, 4,
    );
    assert!(textures.get_bind_group(tex_id).is_some());

    // Re-upload green 8x8 to the same ID
    let green_pixels: Vec<u8> = (0..8*8).flat_map(|_| vec![0, 255, 0, 255]).collect();
    textures.upload_raw(
        &gpu.device, &gpu.queue, &sprites.texture_bind_group_layout,
        tex_id, &green_pixels, 8, 8,
    );
    assert!(textures.get_bind_group(tex_id).is_some());
    assert_eq!(textures.get_dimensions(tex_id), Some((8, 8)));
}
