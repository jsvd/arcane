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

    // Flush to GPU
    shaders.flush(&gpu.queue);

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

    let commands = vec![arcane_core::renderer::SpriteCommand {
        texture_id: tex_id,
        x: 32.0,
        y: 32.0,
        w: 32.0,
        h: 32.0,
        layer: 0,
        uv_x: 0.0,
        uv_y: 0.0,
        uv_w: 1.0,
        uv_h: 1.0,
        tint_r: 1.0,
        tint_g: 1.0,
        tint_b: 1.0,
        tint_a: 1.0,
        rotation: 0.0,
        origin_x: 0.5,
        origin_y: 0.5,
        flip_x: false,
        flip_y: false,
        opacity: 1.0,
        blend_mode: 0, // alpha blend
        shader_id: 0,
    }];

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

    let commands = vec![arcane_core::renderer::SpriteCommand {
        texture_id: tex_id,
        x: 32.0,
        y: 32.0,
        w: 64.0,
        h: 64.0,
        layer: 0,
        uv_x: 0.0,
        uv_y: 0.0,
        uv_w: 1.0,
        uv_h: 1.0,
        tint_r: 1.0,
        tint_g: 0.0,
        tint_b: 0.0,
        tint_a: 1.0, // Red tint
        rotation: 0.0,
        origin_x: 0.5,
        origin_y: 0.5,
        flip_x: false,
        flip_y: false,
        opacity: 1.0,
        blend_mode: 0,
        shader_id: 0,
    }];

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
