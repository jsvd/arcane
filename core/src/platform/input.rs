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
    /// Mouse buttons pressed this frame.
    pub mouse_buttons_pressed: HashSet<u8>,
    /// Mouse buttons released this frame.
    pub mouse_buttons_released: HashSet<u8>,
}

impl InputState {
    /// Call at the start of each frame to clear per-frame events.
    pub fn begin_frame(&mut self) {
        self.keys_pressed.clear();
        self.keys_released.clear();
        self.mouse_buttons_pressed.clear();
        self.mouse_buttons_released.clear();
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

    /// Record a mouse button press event.
    pub fn mouse_button_down(&mut self, button: u8) {
        if self.mouse_buttons.insert(button) {
            self.mouse_buttons_pressed.insert(button);
        }
    }

    /// Record a mouse button release event.
    pub fn mouse_button_up(&mut self, button: u8) {
        if self.mouse_buttons.remove(&button) {
            self.mouse_buttons_released.insert(button);
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_pressed_survives_until_read() {
        // Simulates the winit event loop sequence:
        // 1. Key event arrives between frames
        // 2. Frame callback reads input
        // 3. begin_frame() clears per-frame state for next frame
        let mut input = InputState::default();

        // Between frames: key event arrives
        input.key_down("ArrowUp");
        assert!(input.is_key_pressed("ArrowUp"));
        assert!(input.is_key_down("ArrowUp"));

        // Frame callback reads it — must still be visible
        assert!(input.is_key_pressed("ArrowUp"));

        // AFTER callback: clear for next frame
        input.begin_frame();
        assert!(!input.is_key_pressed("ArrowUp"));
        assert!(input.is_key_down("ArrowUp")); // still held
    }

    #[test]
    fn begin_frame_before_read_loses_input() {
        // Documents the bug we hit: if begin_frame() runs BEFORE
        // the callback reads, keys_pressed is empty.
        let mut input = InputState::default();

        input.key_down("w");
        assert!(input.is_key_pressed("w"));

        // Wrong order: clear before read
        input.begin_frame();
        assert!(!input.is_key_pressed("w")); // lost!
    }

    #[test]
    fn held_key_does_not_re_trigger_pressed() {
        let mut input = InputState::default();

        input.key_down("a");
        assert!(input.is_key_pressed("a"));

        input.begin_frame();

        // Same key still held — should NOT appear as pressed again
        input.key_down("a");
        assert!(!input.is_key_pressed("a"));
        assert!(input.is_key_down("a"));
    }

    #[test]
    fn key_release_tracked() {
        let mut input = InputState::default();

        input.key_down("Space");
        input.begin_frame();
        input.key_up("Space");

        assert!(!input.is_key_down("Space"));
        assert!(input.keys_released.contains("Space"));

        input.begin_frame();
        assert!(!input.keys_released.contains("Space"));
    }

    #[test]
    fn mouse_position_is_tracked() {
        let mut input = InputState::default();
        assert_eq!(input.mouse_x, 0.0);
        assert_eq!(input.mouse_y, 0.0);

        input.mouse_x = 100.5;
        input.mouse_y = 200.75;

        assert_eq!(input.mouse_x, 100.5);
        assert_eq!(input.mouse_y, 200.75);
    }

    #[test]
    fn multiple_keys_can_be_down_simultaneously() {
        let mut input = InputState::default();

        input.key_down("w");
        input.key_down("a");
        input.key_down("d");

        assert!(input.is_key_down("w"));
        assert!(input.is_key_down("a"));
        assert!(input.is_key_down("d"));
        assert!(input.is_key_pressed("w"));
        assert!(input.is_key_pressed("a"));
        assert!(input.is_key_pressed("d"));
    }

    #[test]
    fn releasing_one_key_does_not_affect_others() {
        let mut input = InputState::default();

        input.key_down("w");
        input.key_down("a");
        input.begin_frame();

        input.key_up("w");

        assert!(!input.is_key_down("w"));
        assert!(input.is_key_down("a"));
    }

    #[test]
    fn key_pressed_works_with_special_keys() {
        let mut input = InputState::default();

        input.key_down("Escape");
        input.key_down("Return");
        input.key_down("ArrowLeft");

        assert!(input.is_key_pressed("Escape"));
        assert!(input.is_key_pressed("Return"));
        assert!(input.is_key_pressed("ArrowLeft"));
    }

    #[test]
    fn default_input_state_has_no_keys_down() {
        let input = InputState::default();

        assert!(!input.is_key_down("a"));
        assert!(!input.is_key_down("Space"));
        assert!(!input.is_key_pressed("w"));
        assert_eq!(input.keys_down.len(), 0);
        assert_eq!(input.keys_pressed.len(), 0);
    }
}
