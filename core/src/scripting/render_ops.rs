use std::cell::RefCell;
use std::path::PathBuf;
use std::rc::Rc;

use deno_core::OpState;

use crate::renderer::SpriteCommand;
use crate::renderer::TilemapStore;
use crate::renderer::PointLight;

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
}

impl RenderBridgeState {
    pub fn new(base_dir: PathBuf) -> Self {
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
        }
    }
}

/// Queue a sprite draw command for this frame.
#[deno_core::op2(fast)]
pub fn op_draw_sprite(
    state: &mut OpState,
    texture_id: u32,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    layer: i32,
    uv_x: f32,
    uv_y: f32,
    uv_w: f32,
    uv_h: f32,
    tint_r: f32,
    tint_g: f32,
    tint_b: f32,
    tint_a: f32,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().sprite_commands.push(SpriteCommand {
        texture_id,
        x,
        y,
        w,
        h,
        layer,
        uv_x,
        uv_y,
        uv_w,
        uv_h,
        tint_r,
        tint_g,
        tint_b,
        tint_a,
    });
}

/// Clear all queued sprite commands for this frame.
#[deno_core::op2(fast)]
pub fn op_clear_sprites(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().sprite_commands.clear();
}

/// Update the camera position and zoom.
#[deno_core::op2(fast)]
pub fn op_set_camera(state: &mut OpState, x: f32, y: f32, zoom: f32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    b.camera_x = x;
    b.camera_y = y;
    b.camera_zoom = zoom;
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
#[deno_core::op2(fast)]
pub fn op_draw_tilemap(state: &mut OpState, tilemap_id: u32, world_x: f32, world_y: f32, layer: i32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    let mut b = bridge.borrow_mut();
    let cam_x = b.camera_x;
    let cam_y = b.camera_y;
    let cam_zoom = b.camera_zoom;
    // Default viewport for culling; actual viewport is synced by renderer
    let vp_w = 800.0;
    let vp_h = 600.0;

    if let Some(tm) = b.tilemaps.get(tilemap_id) {
        let cmds = tm.bake_visible(world_x, world_y, layer, cam_x, cam_y, cam_zoom, vp_w, vp_h);
        b.sprite_commands.extend(cmds);
    }
}

// --- Lighting ops ---

/// Set the ambient light color (0-1 per channel).
#[deno_core::op2(fast)]
pub fn op_set_ambient_light(state: &mut OpState, r: f32, g: f32, b: f32) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().ambient_light = [r, g, b];
}

/// Add a point light at world position (x,y) with radius, color, and intensity.
#[deno_core::op2(fast)]
pub fn op_add_point_light(
    state: &mut OpState,
    x: f32,
    y: f32,
    radius: f32,
    r: f32,
    g: f32,
    b: f32,
    intensity: f32,
) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().point_lights.push(PointLight {
        x,
        y,
        radius,
        r,
        g,
        b,
        intensity,
    });
}

/// Clear all point lights for this frame.
#[deno_core::op2(fast)]
pub fn op_clear_lights(state: &mut OpState) {
    let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
    bridge.borrow_mut().point_lights.clear();
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
    ],
);
