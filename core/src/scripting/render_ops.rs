use std::cell::RefCell;
use std::path::PathBuf;
use std::rc::Rc;

use deno_core::OpState;

use crate::renderer::SpriteCommand;
use crate::renderer::TilemapStore;
use crate::renderer::PointLight;

/// Audio command queued from TS ops, drained by the frame callback.
#[derive(Clone, Debug)]
pub enum BridgeAudioCommand {
    LoadSound { id: u32, path: String },
    PlaySound { id: u32, volume: f32, looping: bool },
    StopSound { id: u32 },
    StopAll,
    SetMasterVolume { volume: f32 },
}

/// Shared state between render ops and the main loop.
/// This is placed into `OpState` when running in renderer mode.
#[derive(Clone)]
pub struct RenderBridgeState {
    pub sprite_commands: Vec<SpriteCommand>,
    pub camera_x: f32,
    pub camera_y: f32,
    pub camera_zoom: f32,
    pub delta_time: f64,
    /// Input state snapshot (updated each frame by the event loop).
    pub keys_down: std::collections::HashSet<String>,
    pub keys_pressed: std::collections::HashSet<String>,
    pub mouse_x: f32,
    pub mouse_y: f32,
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
}

impl RenderBridgeState {
    pub fn new(base_dir: PathBuf) -> Self {
        let save_dir = base_dir.join(".arcane").join("saves");
        Self {
            sprite_commands: Vec::new(),
            camera_x: 0.0,
            camera_y: 0.0,
            camera_zoom: 1.0,
            delta_time: 0.0,
            keys_down: std::collections::HashSet::new(),
            keys_pressed: std::collections::HashSet::new(),
            mouse_x: 0.0,
            mouse_y: 0.0,
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

deno_core::extension!(
    render_ext,
    ops = [
        op_draw_sprite,
        op_clear_sprites,
        op_set_camera,
        op_get_camera,
        op_load_texture,
        op_is_key_down,
        op_is_key_pressed,
        op_get_mouse_position,
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
    ],
);
