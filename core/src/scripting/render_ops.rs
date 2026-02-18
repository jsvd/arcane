use std::cell::RefCell;
use std::path::PathBuf;
use std::rc::Rc;

use deno_core::OpState;

use crate::renderer::SpriteCommand;
use crate::renderer::TilemapStore;
use crate::renderer::PointLight;
use crate::renderer::camera::CameraBounds;
use crate::renderer::msdf::MsdfFontStore;

/// Audio command queued from TS ops, drained by the frame callback.
#[derive(Clone, Debug)]
pub enum BridgeAudioCommand {
    LoadSound { id: u32, path: String },
    PlaySound { id: u32, volume: f32, looping: bool },
    StopSound { id: u32 },
    StopAll,
    SetMasterVolume { volume: f32 },

    // Phase 20: New instance-based commands
    PlaySoundEx {
        sound_id: u32,
        instance_id: u64,
        volume: f32,
        looping: bool,
        bus: u32,
        pan: f32,
        pitch: f32,
        low_pass_freq: u32,
        reverb_mix: f32,
        reverb_delay_ms: u32,
    },
    PlaySoundSpatial {
        sound_id: u32,
        instance_id: u64,
        volume: f32,
        looping: bool,
        bus: u32,
        pitch: f32,
        source_x: f32,
        source_y: f32,
        listener_x: f32,
        listener_y: f32,
    },
    StopInstance { instance_id: u64 },
    SetInstanceVolume { instance_id: u64, volume: f32 },
    SetInstancePitch { instance_id: u64, pitch: f32 },
    UpdateSpatialPositions {
        updates: Vec<(u64, f32, f32)>, // (instance_id, source_x, source_y)
        listener_x: f32,
        listener_y: f32,
    },
    SetBusVolume { bus: u32, volume: f32 },
}

/// Shared state between render ops and the main loop.
/// This is placed into `OpState` when running in renderer mode.
#[derive(Clone)]
pub struct RenderBridgeState {
    pub sprite_commands: Vec<SpriteCommand>,
    pub camera_x: f32,
    pub camera_y: f32,
    pub camera_zoom: f32,
    /// True when TS called setCamera() this frame (prevents sync-back from overwriting it).
    pub camera_dirty: bool,
    pub delta_time: f64,
    /// Input state snapshot (updated each frame by the event loop).
    pub keys_down: std::collections::HashSet<String>,
    pub keys_pressed: std::collections::HashSet<String>,
    pub mouse_x: f32,
    pub mouse_y: f32,
    pub mouse_buttons_down: std::collections::HashSet<u8>,
    pub mouse_buttons_pressed: std::collections::HashSet<u8>,
    /// Gamepad state: buttons down per button name string.
    pub gamepad_buttons_down: std::collections::HashSet<String>,
    /// Gamepad buttons pressed this frame.
    pub gamepad_buttons_pressed: std::collections::HashSet<String>,
    /// Gamepad axis values: axis name -> value.
    pub gamepad_axes: std::collections::HashMap<String, f32>,
    /// Number of connected gamepads.
    pub gamepad_count: u32,
    /// Name of the primary gamepad.
    pub gamepad_name: String,
    /// Touch state: active touch points as (id, x, y).
    pub touch_points: Vec<(u64, f32, f32)>,
    /// Number of active touches.
    pub touch_count: u32,
    /// Pending texture load requests (path → result channel).
    pub texture_load_queue: Vec<(String, u32)>,
    /// Base directory for resolving relative texture paths.
    pub base_dir: PathBuf,
    /// Next texture ID to assign (for pre-registration before GPU load).
    pub next_texture_id: u32,
    /// Map of path → already-assigned texture ID.
    pub texture_path_to_id: std::collections::HashMap<String, u32>,
    /// Tilemap storage (managed by tilemap ops).
    pub tilemaps: TilemapStore,
    /// Lighting: ambient color (0-1 per channel). Default white = no darkening.
    pub ambient_light: [f32; 3],
    /// Lighting: point lights for this frame.
    pub point_lights: Vec<PointLight>,
    /// Audio commands queued by TS, drained each frame.
    pub audio_commands: Vec<BridgeAudioCommand>,
    /// Next sound ID to assign.
    pub next_sound_id: u32,
    /// Map of sound path → assigned sound ID.
    pub sound_path_to_id: std::collections::HashMap<String, u32>,
    /// Font texture creation queue (texture IDs to create as built-in font).
    pub font_texture_queue: Vec<u32>,
    /// Current viewport dimensions in logical pixels (synced from renderer each frame).
    pub viewport_width: f32,
    pub viewport_height: f32,
    /// Display scale factor (e.g. 2.0 on Retina).
    pub scale_factor: f32,
    /// Clear/background color [r, g, b, a] in 0.0-1.0 range.
    pub clear_color: [f32; 4],
    /// Directory for save files (.arcane/saves/ relative to game entry file).
    pub save_dir: PathBuf,
    /// Custom shader creation queue: (id, name, wgsl_source).
    pub shader_create_queue: Vec<(u32, String, String)>,
    /// Custom shader param updates: (shader_id, index, [x, y, z, w]).
    pub shader_param_queue: Vec<(u32, u32, [f32; 4])>,
    /// Next shader ID to assign.
    pub next_shader_id: u32,
    /// Post-process effect creation queue: (id, effect_type_name).
    pub effect_create_queue: Vec<(u32, String)>,
    /// Post-process effect param updates: (effect_id, index, [x, y, z, w]).
    pub effect_param_queue: Vec<(u32, u32, [f32; 4])>,
    /// Post-process effect removal queue.
    pub effect_remove_queue: Vec<u32>,
    /// Flag to clear all post-process effects.
    pub effect_clear: bool,
    /// Next effect ID to assign.
    pub next_effect_id: u32,
    /// Camera bounds (world-space limits).
    pub camera_bounds: Option<CameraBounds>,
    /// Whether global illumination (radiance cascades) is enabled.
    pub gi_enabled: bool,
    /// GI intensity multiplier.
    pub gi_intensity: f32,
    /// GI probe spacing override (None = default 8).
    pub gi_probe_spacing: Option<f32>,
    /// GI interval override (None = default 4).
    pub gi_interval: Option<f32>,
    /// GI cascade count override (None = default 4).
    pub gi_cascade_count: Option<u32>,
    /// Emissive surfaces for GI: (x, y, w, h, r, g, b, intensity).
    pub emissives: Vec<[f32; 8]>,
    /// Occluders for GI: (x, y, w, h).
    pub occluders: Vec<[f32; 4]>,
    /// Directional lights: (angle, r, g, b, intensity).
    pub directional_lights: Vec<[f32; 5]>,
    /// Spot lights: (x, y, angle, spread, range, r, g, b, intensity).
    pub spot_lights: Vec<[f32; 9]>,
    /// MSDF font storage.
    pub msdf_fonts: MsdfFontStore,
    /// Queue for creating built-in MSDF font: (font_id, texture_id).
    pub msdf_builtin_queue: Vec<(u32, u32)>,
    /// Queue for creating MSDF shader: (shader_id, wgsl_source).
    pub msdf_shader_queue: Vec<(u32, String)>,
    /// Pool of MSDF shader IDs (same WGSL, separate uniform buffers for per-draw-call params).
    pub msdf_shader_pool: Vec<u32>,
    /// Pending MSDF texture loads (needs linear sampling, not sRGB).
    pub msdf_texture_load_queue: Vec<(String, u32)>,
    /// Raw RGBA texture upload queue: (texture_id, width, height, pixels).
    pub raw_texture_upload_queue: Vec<(u32, u32, u32, Vec<u8>)>,
    /// Frame timing: milliseconds elapsed during the last frame's script execution.
    pub frame_time_ms: f64,
    /// Frame timing: number of draw calls (sprite commands) queued last frame.
    pub draw_call_count: usize,
}

impl RenderBridgeState {
    pub fn new(base_dir: PathBuf) -> Self {
        let save_dir = base_dir.join(".arcane").join("saves");
        Self {
            sprite_commands: Vec::new(),
            camera_x: 0.0,
            camera_y: 0.0,
            camera_zoom: 1.0,
            camera_dirty: false,
            delta_time: 0.0,
            keys_down: std::collections::HashSet::new(),
            keys_pressed: std::collections::HashSet::new(),
            mouse_x: 0.0,
            mouse_y: 0.0,
            mouse_buttons_down: std::collections::HashSet::new(),
            mouse_buttons_pressed: std::collections::HashSet::new(),
            gamepad_buttons_down: std::collections::HashSet::new(),
            gamepad_buttons_pressed: std::collections::HashSet::new(),
            gamepad_axes: std::collections::HashMap::new(),
            gamepad_count: 0,
            gamepad_name: String::new(),
            touch_points: Vec::new(),
            touch_count: 0,
            texture_load_queue: Vec::new(),
            base_dir,
            next_texture_id: 1,
            texture_path_to_id: std::collections::HashMap::new(),
            tilemaps: TilemapStore::new(),
            ambient_light: [1.0, 1.0, 1.0],
            point_lights: Vec::new(),
            audio_commands: Vec::new(),
            next_sound_id: 1,
            sound_path_to_id: std::collections::HashMap::new(),
            font_texture_queue: Vec::new(),
            viewport_width: 800.0,
            viewport_height: 600.0,
            scale_factor: 1.0,
            clear_color: [0.1, 0.1, 0.15, 1.0],
            save_dir,
            shader_create_queue: Vec::new(),
            shader_param_queue: Vec::new(),
            next_shader_id: 1,
            effect_create_queue: Vec::new(),
            effect_param_queue: Vec::new(),
            effect_remove_queue: Vec::new(),
            effect_clear: false,
            next_effect_id: 1,
            camera_bounds: None,
            gi_enabled: false,
            gi_intensity: 1.0,
            gi_probe_spacing: None,
            gi_interval: None,
            gi_cascade_count: None,
            emissives: Vec::new(),
            occluders: Vec::new(),
            directional_lights: Vec::new(),
            spot_lights: Vec::new(),
            msdf_fonts: MsdfFontStore::new(),
            msdf_builtin_queue: Vec::new(),
            msdf_shader_queue: Vec::new(),
            msdf_shader_pool: Vec::new(),
            msdf_texture_load_queue: Vec::new(),
            raw_texture_upload_queue: Vec::new(),
            frame_time_ms: 0.0,
            draw_call_count: 0,
        }
    }
}

/// Queue a sprite draw command for this frame.
/// Accepts f64 (JavaScript's native number type), converts to f32 for GPU.
#[deno_core::op2(fast)]
pub fn op_draw_sprite(
    state: &mut OpState,
    texture_id: u32,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    layer: i32,
    uv_x: f64,
    uv_y: f64,
    uv_w: f64,
    uv_h: f64,
    tint_r: f64,
    tint_g: f64,
    tint_b: f64,
    tint_a: f64,
    rotation: f64,
    origin_x: f64,
    origin_y: f64,
    flip_x: f64,
    flip_y: f64,
    opacity: f64,
    blend_mode: f64,
    shader_id: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().sprite_commands.push(SpriteCommand {
        texture_id,
        x: x as f32,
        y: y as f32,
        w: w as f32,
        h: h as f32,
        layer,
        uv_x: uv_x as f32,
        uv_y: uv_y as f32,
        uv_w: uv_w as f32,
        uv_h: uv_h as f32,
        tint_r: tint_r as f32,
        tint_g: tint_g as f32,
        tint_b: tint_b as f32,
        tint_a: tint_a as f32,
        rotation: rotation as f32,
        origin_x: origin_x as f32,
        origin_y: origin_y as f32,
        flip_x: flip_x != 0.0,
        flip_y: flip_y != 0.0,
        opacity: opacity as f32,
        blend_mode: (blend_mode as u8).min(3),
        shader_id: shader_id as u32,
    });
}

/// Clear all queued sprite commands for this frame.
#[deno_core::op2(fast)]
pub fn op_clear_sprites(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().sprite_commands.clear();
}

/// Update the camera position and zoom.
/// Accepts f64 (JavaScript's native number type), converts to f32 for GPU.
#[deno_core::op2(fast)]
pub fn op_set_camera(state: &mut OpState, x: f64, y: f64, zoom: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    b.camera_x = x as f32;
    b.camera_y = y as f32;
    b.camera_zoom = zoom as f32;
    b.camera_dirty = true;
}

/// Get camera state as [x, y, zoom].
#[deno_core::op2]
#[serde]
pub fn op_get_camera(state: &mut OpState) -> Vec<f64> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();
    vec![b.camera_x as f64, b.camera_y as f64, b.camera_zoom as f64]
}

/// Register a texture to be loaded. Returns a texture ID immediately.
/// The actual GPU upload happens on the main thread before the next render.
#[deno_core::op2(fast)]
pub fn op_load_texture(state: &mut OpState, #[string] path: &str) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    // Resolve relative paths against base_dir
    let resolved = if std::path::Path::new(path).is_absolute() {
        path.to_string()
    } else {
        b.base_dir.join(path).to_string_lossy().to_string()
    };

    // Check cache
    if let Some(&id) = b.texture_path_to_id.get(&resolved) {
        return id;
    }

    let id = b.next_texture_id;
    b.next_texture_id += 1;
    b.texture_path_to_id.insert(resolved.clone(), id);
    b.texture_load_queue.push((resolved, id));
    id
}

/// Check if a key is currently held down.
#[deno_core::op2(fast)]
pub fn op_is_key_down(state: &mut OpState, #[string] key: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().keys_down.contains(key)
}

/// Check if a key was pressed this frame.
#[deno_core::op2(fast)]
pub fn op_is_key_pressed(state: &mut OpState, #[string] key: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().keys_pressed.contains(key)
}

/// Get mouse position as [x, y].
#[deno_core::op2]
#[serde]
pub fn op_get_mouse_position(state: &mut OpState) -> Vec<f64> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();
    vec![b.mouse_x as f64, b.mouse_y as f64]
}

/// Check if a mouse button is currently held down.
/// Button 0 = left, 1 = right, 2 = middle.
#[deno_core::op2(fast)]
pub fn op_is_mouse_button_down(state: &mut OpState, button: u8) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().mouse_buttons_down.contains(&button)
}

/// Check if a mouse button was pressed this frame.
/// Button 0 = left, 1 = right, 2 = middle.
#[deno_core::op2(fast)]
pub fn op_is_mouse_button_pressed(state: &mut OpState, button: u8) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().mouse_buttons_pressed.contains(&button)
}

/// Get the delta time (seconds since last frame).
#[deno_core::op2(fast)]
pub fn op_get_delta_time(state: &mut OpState) -> f64 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().delta_time
}

/// Create a solid-color texture from TS. Returns texture ID.
/// The actual GPU upload happens on the main thread.
#[deno_core::op2(fast)]
pub fn op_create_solid_texture(
    state: &mut OpState,
    #[string] name: &str,
    r: u32,
    g: u32,
    b: u32,
    a: u32,
) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut br = bridge.borrow_mut();

    let key = format!("__solid__{name}");
    if let Some(&id) = br.texture_path_to_id.get(&key) {
        return id;
    }

    let id = br.next_texture_id;
    br.next_texture_id += 1;
    br.texture_path_to_id.insert(key.clone(), id);
    // Encode color in the path as a signal to the loader
    br.texture_load_queue
        .push((format!("__solid__:{name}:{r}:{g}:{b}:{a}"), id));
    id
}

/// Upload a raw RGBA texture from a pixel buffer. Cached by name.
/// Returns existing texture ID if a texture with the same name was already uploaded.
#[deno_core::op2(fast)]
pub fn op_upload_rgba_texture(
    state: &mut OpState,
    #[string] name: &str,
    width: f64,
    height: f64,
    #[buffer] pixels: &[u8],
) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    let key = format!("__raw__:{name}");
    if let Some(&id) = b.texture_path_to_id.get(&key) {
        return id;
    }

    let id = b.next_texture_id;
    b.next_texture_id += 1;
    b.texture_path_to_id.insert(key, id);
    b.raw_texture_upload_queue.push((
        id,
        width as u32,
        height as u32,
        pixels.to_vec(),
    ));
    id
}

/// Create a tilemap. Returns tilemap ID.
#[deno_core::op2(fast)]
pub fn op_create_tilemap(
    state: &mut OpState,
    texture_id: u32,
    width: u32,
    height: u32,
    tile_size: f64,
    atlas_columns: u32,
    atlas_rows: u32,
) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge
        .borrow_mut()
        .tilemaps
        .create(texture_id, width, height, tile_size as f32, atlas_columns, atlas_rows)
}

/// Set a tile in a tilemap.
#[deno_core::op2(fast)]
pub fn op_set_tile(state: &mut OpState, tilemap_id: u32, gx: u32, gy: u32, tile_id: u32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    if let Some(tm) = bridge.borrow_mut().tilemaps.get_mut(tilemap_id) {
        tm.set_tile(gx, gy, tile_id as u16);
    }
}

/// Get a tile from a tilemap.
#[deno_core::op2(fast)]
pub fn op_get_tile(state: &mut OpState, tilemap_id: u32, gx: u32, gy: u32) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge
        .borrow()
        .tilemaps
        .get(tilemap_id)
        .map(|tm| tm.get_tile(gx, gy) as u32)
        .unwrap_or(0)
}

/// Draw a tilemap's visible tiles as sprite commands (camera-culled).
/// Accepts f64 (JavaScript's native number type), converts to f32 for GPU.
#[deno_core::op2(fast)]
pub fn op_draw_tilemap(state: &mut OpState, tilemap_id: u32, world_x: f64, world_y: f64, layer: i32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    let cam_x = b.camera_x;
    let cam_y = b.camera_y;
    let cam_zoom = b.camera_zoom;
    // Default viewport for culling; actual viewport is synced by renderer
    let vp_w = 800.0;
    let vp_h = 600.0;

    if let Some(tm) = b.tilemaps.get(tilemap_id) {
        let cmds = tm.bake_visible(world_x as f32, world_y as f32, layer, cam_x, cam_y, cam_zoom, vp_w, vp_h);
        b.sprite_commands.extend(cmds);
    }
}

// --- Lighting ops ---

/// Set the ambient light color (0-1 per channel).
/// Accepts f64 (JavaScript's native number type), converts to f32 for GPU.
#[deno_core::op2(fast)]
pub fn op_set_ambient_light(state: &mut OpState, r: f64, g: f64, b: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().ambient_light = [r as f32, g as f32, b as f32];
}

/// Add a point light at world position (x,y) with radius, color, and intensity.
/// Accepts f64 (JavaScript's native number type), converts to f32 for GPU.
#[deno_core::op2(fast)]
pub fn op_add_point_light(
    state: &mut OpState,
    x: f64,
    y: f64,
    radius: f64,
    r: f64,
    g: f64,
    b: f64,
    intensity: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().point_lights.push(PointLight {
        x: x as f32,
        y: y as f32,
        radius: radius as f32,
        r: r as f32,
        g: g as f32,
        b: b as f32,
        intensity: intensity as f32,
    });
}

/// Clear all point lights for this frame.
#[deno_core::op2(fast)]
pub fn op_clear_lights(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().point_lights.clear();
}

// --- Audio ops ---

/// Load a sound file. Returns a sound ID.
#[deno_core::op2(fast)]
pub fn op_load_sound(state: &mut OpState, #[string] path: &str) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    let resolved = if std::path::Path::new(path).is_absolute() {
        path.to_string()
    } else {
        b.base_dir.join(path).to_string_lossy().to_string()
    };

    if let Some(&id) = b.sound_path_to_id.get(&resolved) {
        return id;
    }

    let id = b.next_sound_id;
    b.next_sound_id += 1;
    b.sound_path_to_id.insert(resolved.clone(), id);
    b.audio_commands.push(BridgeAudioCommand::LoadSound { id, path: resolved });
    id
}

/// Play a loaded sound.
/// Accepts f64 (JavaScript's native number type), converts to f32 for audio.
#[deno_core::op2(fast)]
pub fn op_play_sound(state: &mut OpState, id: u32, volume: f64, looping: bool) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::PlaySound { id, volume: volume as f32, looping });
}

/// Stop a specific sound.
#[deno_core::op2(fast)]
pub fn op_stop_sound(state: &mut OpState, id: u32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::StopSound { id });
}

/// Stop all sounds.
#[deno_core::op2(fast)]
pub fn op_stop_all_sounds(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::StopAll);
}

/// Set the master volume.
/// Accepts f64 (JavaScript's native number type), converts to f32 for audio.
#[deno_core::op2(fast)]
pub fn op_set_master_volume(state: &mut OpState, volume: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::SetMasterVolume { volume: volume as f32 });
}

// --- Font ops ---

/// Create the built-in font texture. Returns a texture ID.
#[deno_core::op2(fast)]
pub fn op_create_font_texture(state: &mut OpState) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    let key = "__builtin_font__".to_string();
    if let Some(&id) = b.texture_path_to_id.get(&key) {
        return id;
    }

    let id = b.next_texture_id;
    b.next_texture_id += 1;
    b.texture_path_to_id.insert(key, id);
    b.font_texture_queue.push(id);
    id
}

// --- Viewport ops ---

/// Get the current viewport size as [width, height].
#[deno_core::op2]
#[serde]
pub fn op_get_viewport_size(state: &mut OpState) -> Vec<f64> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();
    vec![b.viewport_width as f64, b.viewport_height as f64]
}

/// Get the display scale factor (e.g. 2.0 on Retina).
#[deno_core::op2(fast)]
pub fn op_get_scale_factor(state: &mut OpState) -> f64 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().scale_factor as f64
}

/// Set the background/clear color (r, g, b in 0.0-1.0 range).
#[deno_core::op2(fast)]
pub fn op_set_background_color(state: &mut OpState, r: f64, g: f64, b: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut br = bridge.borrow_mut();
    br.clear_color = [r as f32, g as f32, b as f32, 1.0];
}

// --- File I/O ops (save/load) ---

/// Write a save file. Returns true on success.
#[deno_core::op2(fast)]
pub fn op_save_file(state: &mut OpState, #[string] key: &str, #[string] value: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let save_dir = bridge.borrow().save_dir.clone();

    // Sanitize key: only allow alphanumeric, underscore, dash
    if !key.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return false;
    }

    // Ensure save directory exists
    if std::fs::create_dir_all(&save_dir).is_err() {
        return false;
    }

    let path = save_dir.join(format!("{key}.json"));
    std::fs::write(path, value).is_ok()
}

/// Load a save file. Returns the contents or empty string if not found.
#[deno_core::op2]
#[string]
pub fn op_load_file(state: &mut OpState, #[string] key: &str) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let save_dir = bridge.borrow().save_dir.clone();

    let path = save_dir.join(format!("{key}.json"));
    std::fs::read_to_string(path).unwrap_or_default()
}

/// Delete a save file. Returns true on success.
#[deno_core::op2(fast)]
pub fn op_delete_file(state: &mut OpState, #[string] key: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let save_dir = bridge.borrow().save_dir.clone();

    let path = save_dir.join(format!("{key}.json"));
    std::fs::remove_file(path).is_ok()
}

/// List all save file keys (filenames without .json extension).
#[deno_core::op2]
#[serde]
pub fn op_list_save_files(state: &mut OpState) -> Vec<String> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let save_dir = bridge.borrow().save_dir.clone();

    let mut keys = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&save_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                if let Some(stem) = path.file_stem() {
                    keys.push(stem.to_string_lossy().to_string());
                }
            }
        }
    }
    keys.sort();
    keys
}

// --- Shader ops ---

/// Create a custom fragment shader from WGSL source. Returns a shader ID.
#[deno_core::op2(fast)]
pub fn op_create_shader(state: &mut OpState, #[string] name: &str, #[string] source: &str) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    let id = b.next_shader_id;
    b.next_shader_id += 1;
    b.shader_create_queue
        .push((id, name.to_string(), source.to_string()));
    id
}

/// Set a vec4 parameter slot on a custom shader. Index 0-15.
#[deno_core::op2(fast)]
pub fn op_set_shader_param(
    state: &mut OpState,
    shader_id: u32,
    index: u32,
    x: f64,
    y: f64,
    z: f64,
    w: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().shader_param_queue.push((
        shader_id,
        index,
        [x as f32, y as f32, z as f32, w as f32],
    ));
}

// --- Post-process effect ops ---

/// Add a post-process effect. Returns an effect ID.
#[deno_core::op2(fast)]
pub fn op_add_effect(state: &mut OpState, #[string] effect_type: &str) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    let id = b.next_effect_id;
    b.next_effect_id += 1;
    b.effect_create_queue
        .push((id, effect_type.to_string()));
    id
}

/// Set a vec4 parameter slot on a post-process effect. Index 0-3.
#[deno_core::op2(fast)]
pub fn op_set_effect_param(
    state: &mut OpState,
    effect_id: u32,
    index: u32,
    x: f64,
    y: f64,
    z: f64,
    w: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().effect_param_queue.push((
        effect_id,
        index,
        [x as f32, y as f32, z as f32, w as f32],
    ));
}

/// Remove a single post-process effect by ID.
#[deno_core::op2(fast)]
pub fn op_remove_effect(state: &mut OpState, effect_id: u32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().effect_remove_queue.push(effect_id);
}

/// Remove all post-process effects.
#[deno_core::op2(fast)]
pub fn op_clear_effects(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().effect_clear = true;
}

// --- Camera bounds ops ---

/// Set camera bounds (world-space limits).
#[deno_core::op2(fast)]
pub fn op_set_camera_bounds(state: &mut OpState, min_x: f64, min_y: f64, max_x: f64, max_y: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().camera_bounds = Some(CameraBounds {
        min_x: min_x as f32,
        min_y: min_y as f32,
        max_x: max_x as f32,
        max_y: max_y as f32,
    });
}

/// Clear camera bounds (no limits).
#[deno_core::op2(fast)]
pub fn op_clear_camera_bounds(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().camera_bounds = None;
}

/// Get camera bounds as [minX, minY, maxX, maxY] or empty if none.
#[deno_core::op2]
#[serde]
pub fn op_get_camera_bounds(state: &mut OpState) -> Vec<f64> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();
    match b.camera_bounds {
        Some(bounds) => vec![
            bounds.min_x as f64,
            bounds.min_y as f64,
            bounds.max_x as f64,
            bounds.max_y as f64,
        ],
        None => vec![],
    }
}

// --- Global Illumination ops ---

/// Enable radiance cascades global illumination.
#[deno_core::op2(fast)]
pub fn op_enable_gi(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().gi_enabled = true;
}

/// Disable radiance cascades global illumination.
#[deno_core::op2(fast)]
pub fn op_disable_gi(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().gi_enabled = false;
}

/// Set the GI intensity multiplier.
#[deno_core::op2(fast)]
pub fn op_set_gi_intensity(state: &mut OpState, intensity: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().gi_intensity = intensity as f32;
}

/// Set GI quality parameters (probe spacing, interval, cascade count).
/// Pass 0 for any parameter to keep the current/default value.
#[deno_core::op2(fast)]
pub fn op_set_gi_quality(state: &mut OpState, probe_spacing: f64, interval: f64, cascade_count: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    if probe_spacing > 0.0 {
        b.gi_probe_spacing = Some(probe_spacing as f32);
    }
    if interval > 0.0 {
        b.gi_interval = Some(interval as f32);
    }
    if cascade_count > 0.0 {
        b.gi_cascade_count = Some(cascade_count as u32);
    }
}

/// Add an emissive surface (light source) for GI.
#[deno_core::op2(fast)]
pub fn op_add_emissive(
    state: &mut OpState,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    r: f64,
    g: f64,
    b: f64,
    intensity: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().emissives.push([
        x as f32,
        y as f32,
        w as f32,
        h as f32,
        r as f32,
        g as f32,
        b as f32,
        intensity as f32,
    ]);
}

/// Clear all emissive surfaces.
#[deno_core::op2(fast)]
pub fn op_clear_emissives(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().emissives.clear();
}

/// Add a rectangular occluder that blocks light.
#[deno_core::op2(fast)]
pub fn op_add_occluder(state: &mut OpState, x: f64, y: f64, w: f64, h: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().occluders.push([x as f32, y as f32, w as f32, h as f32]);
}

/// Clear all occluders.
#[deno_core::op2(fast)]
pub fn op_clear_occluders(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().occluders.clear();
}

/// Add a directional light (infinite distance, parallel rays).
#[deno_core::op2(fast)]
pub fn op_add_directional_light(
    state: &mut OpState,
    angle: f64,
    r: f64,
    g: f64,
    b: f64,
    intensity: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().directional_lights.push([
        angle as f32,
        r as f32,
        g as f32,
        b as f32,
        intensity as f32,
    ]);
}

/// Add a spot light with position, direction, and spread.
#[deno_core::op2(fast)]
pub fn op_add_spot_light(
    state: &mut OpState,
    x: f64,
    y: f64,
    angle: f64,
    spread: f64,
    range: f64,
    r: f64,
    g: f64,
    b: f64,
    intensity: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().spot_lights.push([
        x as f32,
        y as f32,
        angle as f32,
        spread as f32,
        range as f32,
        r as f32,
        g as f32,
        b as f32,
        intensity as f32,
    ]);
}

// --- Phase 20: New audio ops ---

/// Play a sound with extended parameters (pan, pitch, effects, bus).
/// Accepts f64 for all numeric params (deno_core convention), converts to f32/u32/u64 internally.
#[deno_core::op2(fast)]
pub fn op_play_sound_ex(
    state: &mut OpState,
    sound_id: u32,
    instance_id: f64,
    volume: f64,
    looping: bool,
    bus: u32,
    pan: f64,
    pitch: f64,
    low_pass_freq: u32,
    reverb_mix: f64,
    reverb_delay_ms: u32,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::PlaySoundEx {
        sound_id,
        instance_id: instance_id as u64,
        volume: volume as f32,
        looping,
        bus,
        pan: pan as f32,
        pitch: pitch as f32,
        low_pass_freq,
        reverb_mix: reverb_mix as f32,
        reverb_delay_ms,
    });
}

/// Play a sound with spatial audio (3D positioning).
/// Accepts f64 for all numeric params (deno_core convention), converts to f32/u64 internally.
#[deno_core::op2(fast)]
pub fn op_play_sound_spatial(
    state: &mut OpState,
    sound_id: u32,
    instance_id: f64,
    volume: f64,
    looping: bool,
    bus: u32,
    pitch: f64,
    source_x: f64,
    source_y: f64,
    listener_x: f64,
    listener_y: f64,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::PlaySoundSpatial {
        sound_id,
        instance_id: instance_id as u64,
        volume: volume as f32,
        looping,
        bus,
        pitch: pitch as f32,
        source_x: source_x as f32,
        source_y: source_y as f32,
        listener_x: listener_x as f32,
        listener_y: listener_y as f32,
    });
}

/// Stop a specific audio instance.
/// Accepts f64 (deno_core convention), converts to u64 internally.
#[deno_core::op2(fast)]
pub fn op_stop_instance(state: &mut OpState, instance_id: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::StopInstance {
        instance_id: instance_id as u64,
    });
}

/// Set the volume of a specific audio instance.
/// Accepts f64 (deno_core convention), converts to u64/f32 internally.
#[deno_core::op2(fast)]
pub fn op_set_instance_volume(state: &mut OpState, instance_id: f64, volume: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::SetInstanceVolume {
        instance_id: instance_id as u64,
        volume: volume as f32,
    });
}

/// Set the pitch of a specific audio instance.
/// Accepts f64 (deno_core convention), converts to u64/f32 internally.
#[deno_core::op2(fast)]
pub fn op_set_instance_pitch(state: &mut OpState, instance_id: f64, pitch: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::SetInstancePitch {
        instance_id: instance_id as u64,
        pitch: pitch as f32,
    });
}

/// Update positions for multiple spatial audio instances in a batch.
/// Uses JSON string for variable-length data (simplest approach with deno_core 0.385.0).
/// Format: {"instanceIds": [id1, id2, ...], "sourceXs": [x1, x2, ...], "sourceYs": [y1, y2, ...], "listenerX": x, "listenerY": y}
#[deno_core::op2(fast)]
pub fn op_update_spatial_positions(state: &mut OpState, #[string] data_json: &str, listener_x: f64, listener_y: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();

    // Parse JSON (simple ad-hoc parsing for array data)
    // In production, we'd use serde_json, but for minimal dependencies, parse manually
    let mut updates = Vec::new();

    // Extract arrays from JSON manually (hacky but works for simple structure)
    if let Some(ids_start) = data_json.find("\"instanceIds\":[") {
        if let Some(xs_start) = data_json.find("\"sourceXs\":[") {
            if let Some(ys_start) = data_json.find("\"sourceYs\":[") {
                let ids_str = &data_json[ids_start + 15..];
                let xs_str = &data_json[xs_start + 12..];
                let ys_str = &data_json[ys_start + 12..];

                let ids_end = ids_str.find(']').unwrap_or(0);
                let xs_end = xs_str.find(']').unwrap_or(0);
                let ys_end = ys_str.find(']').unwrap_or(0);

                let ids: Vec<u64> = ids_str[..ids_end]
                    .split(',')
                    .filter_map(|s| s.trim().parse().ok())
                    .collect();
                let xs: Vec<f32> = xs_str[..xs_end]
                    .split(',')
                    .filter_map(|s| s.trim().parse().ok())
                    .collect();
                let ys: Vec<f32> = ys_str[..ys_end]
                    .split(',')
                    .filter_map(|s| s.trim().parse().ok())
                    .collect();

                for i in 0..ids.len().min(xs.len()).min(ys.len()) {
                    updates.push((ids[i], xs[i], ys[i]));
                }
            }
        }
    }

    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::UpdateSpatialPositions {
        updates,
        listener_x: listener_x as f32,
        listener_y: listener_y as f32,
    });
}

/// Set the volume for an audio bus (affects all sounds on that bus).
/// Accepts f64 (deno_core convention), converts to f32 internally.
#[deno_core::op2(fast)]
pub fn op_set_bus_volume(state: &mut OpState, bus: u32, volume: f64) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().audio_commands.push(BridgeAudioCommand::SetBusVolume {
        bus,
        volume: volume as f32,
    });
}

// --- MSDF text ops ---

/// Create the built-in MSDF font (from CP437 bitmap data converted to SDF).
/// Returns a JSON string: { "fontId": N, "textureId": M, "shaderId": S }
#[deno_core::op2]
#[string]
pub fn op_create_msdf_builtin_font(state: &mut OpState) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    // Check if already created
    let key = "__msdf_builtin__".to_string();
    if let Some(&tex_id) = b.texture_path_to_id.get(&key) {
        // Already created — find the font ID
        // The font was registered with the texture_id as the lookup key
        let font_id_key = format!("__msdf_font_{tex_id}__");
        if let Some(&font_id) = b.texture_path_to_id.get(&font_id_key) {
            let pool = &b.msdf_shader_pool;
            let shader_id = pool.first().copied().unwrap_or(0);
            let pool_json: Vec<String> = pool.iter().map(|id| id.to_string()).collect();
            return format!(
                "{{\"fontId\":{},\"textureId\":{},\"shaderId\":{},\"shaderPool\":[{}]}}",
                font_id, tex_id, shader_id, pool_json.join(",")
            );
        }
    }

    // Assign texture ID
    let tex_id = b.next_texture_id;
    b.next_texture_id += 1;
    b.texture_path_to_id.insert(key, tex_id);

    // Generate MSDF atlas data and register font
    let (_pixels, _width, _height, mut font) =
        crate::renderer::msdf::generate_builtin_msdf_font();
    font.texture_id = tex_id;

    // Register font in the store
    let font_id = b.msdf_fonts.register(font);
    b.texture_path_to_id
        .insert(format!("__msdf_font_{tex_id}__"), font_id);

    // Queue the texture for GPU upload.
    // dev.rs will call generate_builtin_msdf_font() again and upload pixels.
    b.msdf_builtin_queue.push((font_id, tex_id));

    // Ensure MSDF shader pool exists
    let pool = ensure_msdf_shader_pool(&mut b);
    let shader_id = pool.first().copied().unwrap_or(0);
    let pool_json: Vec<String> = pool.iter().map(|id| id.to_string()).collect();

    format!(
        "{{\"fontId\":{},\"textureId\":{},\"shaderId\":{},\"shaderPool\":[{}]}}",
        font_id, tex_id, shader_id, pool_json.join(",")
    )
}

/// Get MSDF glyph metrics for a text string. Returns JSON array of glyph info.
/// Each glyph: { "uv": [x, y, w, h], "advance": N, "width": N, "height": N, "offsetX": N, "offsetY": N }
#[deno_core::op2]
#[string]
pub fn op_get_msdf_glyphs(
    state: &mut OpState,
    font_id: u32,
    #[string] text: &str,
) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();

    let font = match b.msdf_fonts.get(font_id) {
        Some(f) => f,
        None => return "[]".to_string(),
    };

    let mut entries = Vec::new();
    for ch in text.chars() {
        if let Some(glyph) = font.get_glyph(ch) {
            entries.push(format!(
                "{{\"char\":{},\"uv\":[{},{},{},{}],\"advance\":{},\"width\":{},\"height\":{},\"offsetX\":{},\"offsetY\":{}}}",
                ch as u32,
                glyph.uv_x, glyph.uv_y, glyph.uv_w, glyph.uv_h,
                glyph.advance, glyph.width, glyph.height,
                glyph.offset_x, glyph.offset_y,
            ));
        }
    }

    format!("[{}]", entries.join(","))
}

/// Get MSDF font info. Returns JSON: { "fontSize": N, "lineHeight": N, "distanceRange": N, "textureId": N }
#[deno_core::op2]
#[string]
pub fn op_get_msdf_font_info(state: &mut OpState, font_id: u32) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();

    match b.msdf_fonts.get(font_id) {
        Some(font) => format!(
            "{{\"fontSize\":{},\"lineHeight\":{},\"distanceRange\":{},\"textureId\":{}}}",
            font.font_size, font.line_height, font.distance_range, font.texture_id,
        ),
        None => "null".to_string(),
    }
}

/// Load an MSDF font from an atlas image path + metrics JSON string.
/// Returns a JSON string: { "fontId": N, "textureId": M, "shaderId": S }
#[deno_core::op2]
#[string]
pub fn op_load_msdf_font(
    state: &mut OpState,
    #[string] atlas_path: &str,
    #[string] metrics_json: &str,
) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();

    // Resolve atlas path
    let resolved = if std::path::Path::new(atlas_path).is_absolute() {
        atlas_path.to_string()
    } else {
        b.base_dir.join(atlas_path).to_string_lossy().to_string()
    };

    // Load atlas texture (reuse existing if already loaded)
    let tex_id = if let Some(&id) = b.texture_path_to_id.get(&resolved) {
        id
    } else {
        let id = b.next_texture_id;
        b.next_texture_id += 1;
        b.texture_path_to_id.insert(resolved.clone(), id);
        b.msdf_texture_load_queue.push((resolved, id));
        id
    };

    // Parse metrics
    let font = match crate::renderer::msdf::parse_msdf_metrics(metrics_json, tex_id) {
        Ok(f) => f,
        Err(e) => {
            return format!("{{\"error\":\"{}\"}}", e);
        }
    };

    let font_id = b.msdf_fonts.register(font);
    let pool = ensure_msdf_shader_pool(&mut b);
    let shader_id = pool.first().copied().unwrap_or(0);
    let pool_json: Vec<String> = pool.iter().map(|id| id.to_string()).collect();

    format!(
        "{{\"fontId\":{},\"textureId\":{},\"shaderId\":{},\"shaderPool\":[{}]}}",
        font_id, tex_id, shader_id, pool_json.join(",")
    )
}

/// Pool size for MSDF shaders (same WGSL, different uniform buffers).
const MSDF_SHADER_POOL_SIZE: usize = 8;

/// Ensure the MSDF shader pool exists in the bridge state. Returns the pool of shader IDs.
fn ensure_msdf_shader_pool(b: &mut RenderBridgeState) -> Vec<u32> {
    if !b.msdf_shader_pool.is_empty() {
        return b.msdf_shader_pool.clone();
    }

    let source = crate::renderer::msdf::MSDF_FRAGMENT_SOURCE.to_string();
    let mut pool = Vec::with_capacity(MSDF_SHADER_POOL_SIZE);

    for _ in 0..MSDF_SHADER_POOL_SIZE {
        let id = b.next_shader_id;
        b.next_shader_id += 1;
        b.msdf_shader_queue.push((id, source.clone()));
        pool.push(id);
    }

    b.msdf_shader_pool = pool.clone();
    pool
}

// --- Gamepad ops ---

/// Get the number of connected gamepads.
#[deno_core::op2(fast)]
pub fn op_get_gamepad_count(state: &mut OpState) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().gamepad_count
}

/// Get the name of the primary gamepad.
#[deno_core::op2]
#[string]
pub fn op_get_gamepad_name(state: &mut OpState) -> String {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().gamepad_name.clone()
}

/// Check if a gamepad button is currently held down.
/// Button name is the canonical string (e.g. "A", "B", "LeftBumper", "DPadUp").
#[deno_core::op2(fast)]
pub fn op_is_gamepad_button_down(state: &mut OpState, #[string] button: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().gamepad_buttons_down.contains(button)
}

/// Check if a gamepad button was pressed this frame.
#[deno_core::op2(fast)]
pub fn op_is_gamepad_button_pressed(state: &mut OpState, #[string] button: &str) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().gamepad_buttons_pressed.contains(button)
}

/// Get a gamepad axis value (-1.0 to 1.0 for sticks, 0.0 to 1.0 for triggers).
/// Axis name: "LeftStickX", "LeftStickY", "RightStickX", "RightStickY", "LeftTrigger", "RightTrigger".
#[deno_core::op2(fast)]
pub fn op_get_gamepad_axis(state: &mut OpState, #[string] axis: &str) -> f64 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().gamepad_axes.get(axis).copied().unwrap_or(0.0) as f64
}

// --- Touch ops ---

/// Get the number of active touch points.
#[deno_core::op2(fast)]
pub fn op_get_touch_count(state: &mut OpState) -> u32 {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().touch_count
}

/// Get a touch point position by index. Returns [x, y] or empty array if not found.
#[deno_core::op2]
#[serde]
pub fn op_get_touch_position(state: &mut OpState, index: u32) -> Vec<f64> {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let b = bridge.borrow();
    if let Some(&(_, x, y)) = b.touch_points.get(index as usize) {
        vec![x as f64, y as f64]
    } else {
        vec![]
    }
}

/// Check if any touch is currently active.
#[deno_core::op2(fast)]
pub fn op_is_touch_active(state: &mut OpState) -> bool {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow().touch_count > 0
}

deno_core::extension!(
    render_ext,
    ops = [
        op_draw_sprite,
        op_clear_sprites,
        op_set_camera,
        op_get_camera,
        op_load_texture,
        op_upload_rgba_texture,
        op_is_key_down,
        op_is_key_pressed,
        op_get_mouse_position,
        op_is_mouse_button_down,
        op_is_mouse_button_pressed,
        op_get_delta_time,
        op_create_solid_texture,
        op_create_tilemap,
        op_set_tile,
        op_get_tile,
        op_draw_tilemap,
        op_set_ambient_light,
        op_add_point_light,
        op_clear_lights,
        op_load_sound,
        op_play_sound,
        op_stop_sound,
        op_stop_all_sounds,
        op_set_master_volume,
        op_play_sound_ex,
        op_play_sound_spatial,
        op_stop_instance,
        op_set_instance_volume,
        op_set_instance_pitch,
        op_update_spatial_positions,
        op_set_bus_volume,
        op_create_font_texture,
        op_get_viewport_size,
        op_get_scale_factor,
        op_set_background_color,
        op_save_file,
        op_load_file,
        op_delete_file,
        op_list_save_files,
        op_create_shader,
        op_set_shader_param,
        op_add_effect,
        op_set_effect_param,
        op_remove_effect,
        op_clear_effects,
        op_set_camera_bounds,
        op_clear_camera_bounds,
        op_get_camera_bounds,
        op_enable_gi,
        op_disable_gi,
        op_set_gi_intensity,
        op_set_gi_quality,
        op_add_emissive,
        op_clear_emissives,
        op_add_occluder,
        op_clear_occluders,
        op_add_directional_light,
        op_add_spot_light,
        op_create_msdf_builtin_font,
        op_get_msdf_glyphs,
        op_get_msdf_font_info,
        op_load_msdf_font,
        op_get_gamepad_count,
        op_get_gamepad_name,
        op_is_gamepad_button_down,
        op_is_gamepad_button_pressed,
        op_get_gamepad_axis,
        op_get_touch_count,
        op_get_touch_position,
        op_is_touch_active,
    ],
);
