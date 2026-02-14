use std::collections::HashSet;

/// Standard gamepad button names (Xbox layout as canonical).
/// These match the TypeScript GamepadButton type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GamepadButton {
    A,
    B,
    X,
    Y,
    LeftBumper,
    RightBumper,
    LeftTrigger,
    RightTrigger,
    Select,
    Start,
    LeftStick,
    RightStick,
    DPadUp,
    DPadDown,
    DPadLeft,
    DPadRight,
    Guide,
}

impl GamepadButton {
    /// Parse from the TS string name.
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "A" => Some(Self::A),
            "B" => Some(Self::B),
            "X" => Some(Self::X),
            "Y" => Some(Self::Y),
            "LeftBumper" => Some(Self::LeftBumper),
            "RightBumper" => Some(Self::RightBumper),
            "LeftTrigger" => Some(Self::LeftTrigger),
            "RightTrigger" => Some(Self::RightTrigger),
            "Select" => Some(Self::Select),
            "Start" => Some(Self::Start),
            "LeftStick" => Some(Self::LeftStick),
            "RightStick" => Some(Self::RightStick),
            "DPadUp" => Some(Self::DPadUp),
            "DPadDown" => Some(Self::DPadDown),
            "DPadLeft" => Some(Self::DPadLeft),
            "DPadRight" => Some(Self::DPadRight),
            "Guide" => Some(Self::Guide),
            _ => None,
        }
    }

    /// Convert to the TS string name.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::A => "A",
            Self::B => "B",
            Self::X => "X",
            Self::Y => "Y",
            Self::LeftBumper => "LeftBumper",
            Self::RightBumper => "RightBumper",
            Self::LeftTrigger => "LeftTrigger",
            Self::RightTrigger => "RightTrigger",
            Self::Select => "Select",
            Self::Start => "Start",
            Self::LeftStick => "LeftStick",
            Self::RightStick => "RightStick",
            Self::DPadUp => "DPadUp",
            Self::DPadDown => "DPadDown",
            Self::DPadLeft => "DPadLeft",
            Self::DPadRight => "DPadRight",
            Self::Guide => "Guide",
        }
    }
}

/// Standard gamepad axis names.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GamepadAxis {
    LeftStickX,
    LeftStickY,
    RightStickX,
    RightStickY,
    LeftTrigger,
    RightTrigger,
}

impl GamepadAxis {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "LeftStickX" => Some(Self::LeftStickX),
            "LeftStickY" => Some(Self::LeftStickY),
            "RightStickX" => Some(Self::RightStickX),
            "RightStickY" => Some(Self::RightStickY),
            "LeftTrigger" => Some(Self::LeftTrigger),
            "RightTrigger" => Some(Self::RightTrigger),
            _ => None,
        }
    }
}

/// Gamepad state snapshot for a single gamepad.
#[derive(Debug, Clone)]
pub struct GamepadState {
    pub name: String,
    pub connected: bool,
    /// Buttons currently held.
    pub buttons_down: HashSet<GamepadButton>,
    /// Buttons pressed this frame.
    pub buttons_pressed: HashSet<GamepadButton>,
    /// Buttons released this frame.
    pub buttons_released: HashSet<GamepadButton>,
    /// Axis values (-1.0 to 1.0 for sticks, 0.0 to 1.0 for triggers).
    pub axes: [f32; 6], // Indexed by GamepadAxis discriminant order
}

impl Default for GamepadState {
    fn default() -> Self {
        Self {
            name: String::new(),
            connected: false,
            buttons_down: HashSet::new(),
            buttons_pressed: HashSet::new(),
            buttons_released: HashSet::new(),
            axes: [0.0; 6],
        }
    }
}

impl GamepadState {
    pub fn begin_frame(&mut self) {
        self.buttons_pressed.clear();
        self.buttons_released.clear();
    }

    pub fn button_down(&mut self, button: GamepadButton) {
        if self.buttons_down.insert(button) {
            self.buttons_pressed.insert(button);
        }
    }

    pub fn button_up(&mut self, button: GamepadButton) {
        if self.buttons_down.remove(&button) {
            self.buttons_released.insert(button);
        }
    }

    pub fn set_axis(&mut self, axis: GamepadAxis, value: f32) {
        let idx = axis as usize;
        if idx < self.axes.len() {
            self.axes[idx] = value;
        }
    }

    pub fn get_axis(&self, axis: GamepadAxis) -> f32 {
        let idx = axis as usize;
        if idx < self.axes.len() {
            self.axes[idx]
        } else {
            0.0
        }
    }

    pub fn is_button_down(&self, button: GamepadButton) -> bool {
        self.buttons_down.contains(&button)
    }

    pub fn is_button_pressed(&self, button: GamepadButton) -> bool {
        self.buttons_pressed.contains(&button)
    }
}

/// Manages all connected gamepads. Wraps gilrs.
pub struct GamepadManager {
    gilrs: gilrs::Gilrs,
    /// State for each gamepad slot (up to 4).
    pub gamepads: [GamepadState; 4],
    /// gilrs ID -> slot index mapping.
    id_to_slot: std::collections::HashMap<gilrs::GamepadId, usize>,
    /// Number of connected gamepads.
    pub connected_count: u32,
}

impl GamepadManager {
    pub fn new() -> Option<Self> {
        let gilrs = match gilrs::Gilrs::new() {
            Ok(g) => g,
            Err(e) => {
                eprintln!("[gamepad] Failed to initialize gilrs: {e}");
                return None;
            }
        };

        let mut mgr = Self {
            gilrs,
            gamepads: Default::default(),
            id_to_slot: std::collections::HashMap::new(),
            connected_count: 0,
        };

        // Register initially connected gamepads
        let initial: Vec<(gilrs::GamepadId, String)> = mgr
            .gilrs
            .gamepads()
            .map(|(id, gp)| (id, gp.name().to_string()))
            .collect();

        for (id, name) in initial {
            mgr.connect_gamepad(id, &name);
        }

        Some(mgr)
    }

    /// Call at start of frame to clear per-frame state.
    pub fn begin_frame(&mut self) {
        for gp in &mut self.gamepads {
            if gp.connected {
                gp.begin_frame();
            }
        }
    }

    /// Poll gilrs events and update state. Call once per frame.
    pub fn update(&mut self) {
        while let Some(event) = self.gilrs.next_event() {
            use gilrs::EventType;
            match event.event {
                EventType::Connected => {
                    let gp = self.gilrs.gamepad(event.id);
                    let name = gp.name().to_string();
                    self.connect_gamepad(event.id, &name);
                }
                EventType::Disconnected => {
                    self.disconnect_gamepad(event.id);
                }
                EventType::ButtonPressed(btn, _) => {
                    if let (Some(slot), Some(button)) =
                        (self.id_to_slot.get(&event.id), map_gilrs_button(btn))
                    {
                        self.gamepads[*slot].button_down(button);
                    }
                }
                EventType::ButtonReleased(btn, _) => {
                    if let (Some(slot), Some(button)) =
                        (self.id_to_slot.get(&event.id), map_gilrs_button(btn))
                    {
                        self.gamepads[*slot].button_up(button);
                    }
                }
                EventType::AxisChanged(axis, value, _) => {
                    if let (Some(slot), Some(ga)) =
                        (self.id_to_slot.get(&event.id), map_gilrs_axis(axis))
                    {
                        self.gamepads[*slot].set_axis(ga, value);
                    }
                }
                _ => {}
            }
        }
    }

    fn connect_gamepad(&mut self, id: gilrs::GamepadId, name: &str) {
        // Find first empty slot
        for (i, gp) in self.gamepads.iter_mut().enumerate() {
            if !gp.connected {
                gp.connected = true;
                gp.name = name.to_string();
                gp.buttons_down.clear();
                gp.axes = [0.0; 6];
                self.id_to_slot.insert(id, i);
                self.connected_count += 1;
                eprintln!("[gamepad] Connected: {} (slot {})", name, i);
                return;
            }
        }
        eprintln!("[gamepad] No free slot for: {name}");
    }

    fn disconnect_gamepad(&mut self, id: gilrs::GamepadId) {
        if let Some(slot) = self.id_to_slot.remove(&id) {
            let gp = &mut self.gamepads[slot];
            eprintln!("[gamepad] Disconnected: {} (slot {})", gp.name, slot);
            *gp = GamepadState::default();
            self.connected_count -= 1;
        }
    }

    /// Get state of the first connected gamepad (convenience for single-player).
    pub fn primary(&self) -> &GamepadState {
        for gp in &self.gamepads {
            if gp.connected {
                return gp;
            }
        }
        // Return a default disconnected state
        &self.gamepads[0]
    }
}

/// Map gilrs button to our canonical GamepadButton.
fn map_gilrs_button(btn: gilrs::Button) -> Option<GamepadButton> {
    use gilrs::Button;
    match btn {
        Button::South => Some(GamepadButton::A),
        Button::East => Some(GamepadButton::B),
        Button::West => Some(GamepadButton::X),
        Button::North => Some(GamepadButton::Y),
        Button::LeftTrigger => Some(GamepadButton::LeftBumper),
        Button::RightTrigger => Some(GamepadButton::RightBumper),
        Button::LeftTrigger2 => Some(GamepadButton::LeftTrigger),
        Button::RightTrigger2 => Some(GamepadButton::RightTrigger),
        Button::Select => Some(GamepadButton::Select),
        Button::Start => Some(GamepadButton::Start),
        Button::LeftThumb => Some(GamepadButton::LeftStick),
        Button::RightThumb => Some(GamepadButton::RightStick),
        Button::DPadUp => Some(GamepadButton::DPadUp),
        Button::DPadDown => Some(GamepadButton::DPadDown),
        Button::DPadLeft => Some(GamepadButton::DPadLeft),
        Button::DPadRight => Some(GamepadButton::DPadRight),
        Button::Mode => Some(GamepadButton::Guide),
        _ => None,
    }
}

/// Map gilrs axis to our canonical GamepadAxis.
fn map_gilrs_axis(axis: gilrs::Axis) -> Option<GamepadAxis> {
    use gilrs::Axis;
    match axis {
        Axis::LeftStickX => Some(GamepadAxis::LeftStickX),
        Axis::LeftStickY => Some(GamepadAxis::LeftStickY),
        Axis::RightStickX => Some(GamepadAxis::RightStickX),
        Axis::RightStickY => Some(GamepadAxis::RightStickY),
        Axis::LeftZ => Some(GamepadAxis::LeftTrigger),
        Axis::RightZ => Some(GamepadAxis::RightTrigger),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gamepad_button_from_str_roundtrips() {
        let buttons = [
            "A", "B", "X", "Y", "LeftBumper", "RightBumper",
            "LeftTrigger", "RightTrigger", "Select", "Start",
            "LeftStick", "RightStick", "DPadUp", "DPadDown",
            "DPadLeft", "DPadRight", "Guide",
        ];
        for name in buttons {
            let btn = GamepadButton::from_str(name).unwrap();
            assert_eq!(btn.as_str(), name);
        }
    }

    #[test]
    fn gamepad_button_from_str_unknown_returns_none() {
        assert!(GamepadButton::from_str("Unknown").is_none());
    }

    #[test]
    fn gamepad_axis_from_str_valid() {
        assert!(GamepadAxis::from_str("LeftStickX").is_some());
        assert!(GamepadAxis::from_str("LeftStickY").is_some());
        assert!(GamepadAxis::from_str("RightStickX").is_some());
        assert!(GamepadAxis::from_str("RightStickY").is_some());
        assert!(GamepadAxis::from_str("LeftTrigger").is_some());
        assert!(GamepadAxis::from_str("RightTrigger").is_some());
    }

    #[test]
    fn gamepad_axis_from_str_invalid() {
        assert!(GamepadAxis::from_str("Invalid").is_none());
    }

    #[test]
    fn gamepad_state_button_down_pressed() {
        let mut state = GamepadState::default();
        state.button_down(GamepadButton::A);
        assert!(state.is_button_down(GamepadButton::A));
        assert!(state.is_button_pressed(GamepadButton::A));
    }

    #[test]
    fn gamepad_state_begin_frame_clears_pressed() {
        let mut state = GamepadState::default();
        state.button_down(GamepadButton::A);
        state.begin_frame();
        assert!(state.is_button_down(GamepadButton::A));
        assert!(!state.is_button_pressed(GamepadButton::A));
    }

    #[test]
    fn gamepad_state_button_up_releases() {
        let mut state = GamepadState::default();
        state.button_down(GamepadButton::A);
        state.begin_frame();
        state.button_up(GamepadButton::A);
        assert!(!state.is_button_down(GamepadButton::A));
        assert!(state.buttons_released.contains(&GamepadButton::A));
    }

    #[test]
    fn gamepad_state_held_button_does_not_re_press() {
        let mut state = GamepadState::default();
        state.button_down(GamepadButton::A);
        state.begin_frame();
        state.button_down(GamepadButton::A);
        assert!(state.is_button_down(GamepadButton::A));
        assert!(!state.is_button_pressed(GamepadButton::A));
    }

    #[test]
    fn gamepad_state_axis_set_and_get() {
        let mut state = GamepadState::default();
        state.set_axis(GamepadAxis::LeftStickX, 0.75);
        assert!((state.get_axis(GamepadAxis::LeftStickX) - 0.75).abs() < f32::EPSILON);
    }

    #[test]
    fn gamepad_state_default_axes_are_zero() {
        let state = GamepadState::default();
        for i in 0..6 {
            assert_eq!(state.axes[i], 0.0);
        }
    }

    #[test]
    fn gamepad_state_multiple_buttons() {
        let mut state = GamepadState::default();
        state.button_down(GamepadButton::A);
        state.button_down(GamepadButton::B);
        state.button_down(GamepadButton::X);
        assert!(state.is_button_down(GamepadButton::A));
        assert!(state.is_button_down(GamepadButton::B));
        assert!(state.is_button_down(GamepadButton::X));
        assert!(!state.is_button_down(GamepadButton::Y));
    }
}
