/// Render-to-texture ops: create off-screen render targets, draw into them,
/// then use them as TextureIds in subsequent drawSprite calls.
///
/// ## API (TS-side)
/// ```ts
/// const rt = createRenderTarget(256, 256);  // → RenderTargetId (also usable as TextureId)
/// beginRenderTarget(rt);
///   drawSprite(...);  // renders into rt's texture, camera: (0,0) = top-left
/// endRenderTarget();
/// drawSprite({ textureId: rt, x: 0, y: 0, w: 256, h: 256 });
/// ```
///
/// ## Design
/// - `op_create_render_target` allocates an ID from the shared `next_texture_id` counter
///   (avoiding any collision with regular textures) and queues GPU resource creation.
/// - `op_begin_render_target` sets `active_target = Some(id)`. While active,
///   `op_draw_sprite` and `op_submit_sprite_batch` route commands to the target's
///   queue instead of the main bridge sprite list.
/// - `op_end_render_target` clears `active_target`.
/// - dev.rs drains `create_queue`, `target_sprite_queues`, and `destroy_queue`
///   each frame before the main render pass.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use deno_core::OpState;

use crate::renderer::SpriteCommand;
use crate::scripting::render_ops::RenderBridgeState;

/// State for all live render targets and the currently active one.
pub struct TargetState {
    /// If Some, sprite commands route to this target instead of the main pass.
    pub active_target: Option<u32>,
    /// GPU resource creation requests, drained by dev.rs each frame.
    pub create_queue: Vec<(u32, u32, u32)>, // (id, width, height)
    /// GPU resource destroy requests, drained by dev.rs each frame.
    pub destroy_queue: Vec<u32>,
    /// Per-target sprite command queues, drained by dev.rs for off-screen rendering.
    pub target_sprite_queues: HashMap<u32, Vec<SpriteCommand>>,
}

impl TargetState {
    pub fn new() -> Self {
        Self {
            active_target: None,
            create_queue: Vec::new(),
            destroy_queue: Vec::new(),
            target_sprite_queues: HashMap::new(),
        }
    }
}

/// Create an off-screen render target of the given pixel dimensions.
/// Returns an ID that doubles as both a `RenderTargetId` and a `TextureId`.
///
/// The ID is allocated from the shared texture ID pool to guarantee no
/// collision with regular textures or other render targets.
#[deno_core::op2(fast)]
fn op_create_render_target(state: &mut OpState, w: f64, h: f64) -> u32 {
    // Allocate from shared texture ID counter to avoid any collision
    let id = {
        let bridge = state.borrow_mut::<Rc<RefCell<RenderBridgeState>>>();
        let mut b = bridge.borrow_mut();
        let id = b.next_texture_id;
        b.next_texture_id += 1;
        id
    };
    let ts = state.borrow_mut::<Rc<RefCell<TargetState>>>();
    ts.borrow_mut()
        .create_queue
        .push((id, w as u32, h as u32));
    id
}

/// Route subsequent drawSprite calls into this render target.
/// Coordinate system inside the target: (0, 0) = top-left of target.
#[deno_core::op2(fast)]
fn op_begin_render_target(state: &mut OpState, id: u32) {
    let ts = state.borrow_mut::<Rc<RefCell<TargetState>>>();
    ts.borrow_mut().active_target = Some(id);
}

/// Return to rendering into the main surface.
#[deno_core::op2(fast)]
fn op_end_render_target(state: &mut OpState) {
    let ts = state.borrow_mut::<Rc<RefCell<TargetState>>>();
    ts.borrow_mut().active_target = None;
}

/// Free the GPU resources for a render target.
/// After this call, using the ID as a TextureId produces a transparent sprite.
#[deno_core::op2(fast)]
fn op_destroy_render_target(state: &mut OpState, id: u32) {
    let ts = state.borrow_mut::<Rc<RefCell<TargetState>>>();
    let mut ts = ts.borrow_mut();
    ts.destroy_queue.push(id);
    ts.target_sprite_queues.remove(&id);
    // If this target was active, end it
    if ts.active_target == Some(id) {
        ts.active_target = None;
    }
}

deno_core::extension!(
    target_ext,
    ops = [
        op_create_render_target,
        op_begin_render_target,
        op_end_render_target,
        op_destroy_render_target,
    ],
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_target_state_new() {
        let state = TargetState::new();
        assert!(state.active_target.is_none());
        assert!(state.create_queue.is_empty());
        assert!(state.destroy_queue.is_empty());
        assert!(state.target_sprite_queues.is_empty());
    }

    #[test]
    fn test_set_active_target() {
        let mut state = TargetState::new();
        assert!(state.active_target.is_none());

        state.active_target = Some(42);
        assert_eq!(state.active_target, Some(42));

        state.active_target = None;
        assert!(state.active_target.is_none());
    }

    #[test]
    fn test_create_queue() {
        let mut state = TargetState::new();

        state.create_queue.push((1, 256, 256));
        state.create_queue.push((2, 128, 128));

        assert_eq!(state.create_queue.len(), 2);
        assert_eq!(state.create_queue[0], (1, 256, 256));
        assert_eq!(state.create_queue[1], (2, 128, 128));
    }

    #[test]
    fn test_destroy_queue() {
        let mut state = TargetState::new();

        state.destroy_queue.push(5);
        state.destroy_queue.push(10);

        assert_eq!(state.destroy_queue.len(), 2);
        assert!(state.destroy_queue.contains(&5));
        assert!(state.destroy_queue.contains(&10));
    }

    #[test]
    fn test_target_sprite_queues() {
        let mut state = TargetState::new();

        state.target_sprite_queues.insert(1, Vec::new());
        state.target_sprite_queues.insert(2, Vec::new());

        assert!(state.target_sprite_queues.contains_key(&1));
        assert!(state.target_sprite_queues.contains_key(&2));
        assert!(!state.target_sprite_queues.contains_key(&3));

        state.target_sprite_queues.remove(&1);
        assert!(!state.target_sprite_queues.contains_key(&1));
    }

    #[test]
    fn test_destroy_clears_active() {
        let mut state = TargetState::new();
        state.active_target = Some(5);

        // Simulate destroy logic
        state.destroy_queue.push(5);
        state.target_sprite_queues.remove(&5);
        if state.active_target == Some(5) {
            state.active_target = None;
        }

        assert!(state.active_target.is_none());
    }
}
