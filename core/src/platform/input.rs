use std::collections::HashSet;

/// Tracks keyboard and mouse state each frame.
#[derive(Debug, Default)]
pub struct InputState {
    /// Keys currently held down (using winit logical key names).
    pub keys_down: HashSet<String>,
    /// Keys pressed this frame (went from up to down).
    pub keys_pressed: HashSet<String>,
    /// Keys released this frame (went from down to up).
    pub keys_released: HashSet<String>,
    /// Mouse position in window coordinates.
    pub mouse_x: f32,
    pub mouse_y: f32,
    /// Mouse buttons currently held.
    pub mouse_buttons: HashSet<u8>,
}

impl InputState {
    /// Call at the start of each frame to clear per-frame events.
    pub fn begin_frame(&mut self) {
        self.keys_pressed.clear();
        self.keys_released.clear();
    }

    /// Record a key press event.
    pub fn key_down(&mut self, key: &str) {
        if self.keys_down.insert(key.to_string()) {
            self.keys_pressed.insert(key.to_string());
        }
    }

    /// Record a key release event.
    pub fn key_up(&mut self, key: &str) {
        if self.keys_down.remove(key) {
            self.keys_released.insert(key.to_string());
        }
    }

    /// Record mouse movement.
    pub fn mouse_move(&mut self, x: f32, y: f32) {
        self.mouse_x = x;
        self.mouse_y = y;
    }

    /// Check if a key is currently held.
    pub fn is_key_down(&self, key: &str) -> bool {
        self.keys_down.contains(key)
    }

    /// Check if a key was pressed this frame.
    pub fn is_key_pressed(&self, key: &str) -> bool {
        self.keys_pressed.contains(key)
    }
}
