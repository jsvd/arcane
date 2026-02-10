# Phase 11: Advanced Input + Interactive UI — Detailed Scoping

## Overview

Phase 11 expands platform reach and transforms UI from draw-only to interactive. Currently, the engine only supports keyboard and mouse. This phase adds gamepad support, touch input, input mapping, and a full interactive UI system with layout.

**Core additions:**
1. Gamepad/controller support (analog sticks, triggers, vibration)
2. Touch input (tap, swipe, multi-touch)
3. Input mapping system (named actions, remappable controls)
4. Interactive UI widgets (buttons, text input, sliders)
5. Layout system (flexbox-style auto-layout)
6. UI focus system (keyboard/gamepad navigation)

---

## Part 1: Gamepad Support

### Requirements

- Detect connected gamepads
- Read analog stick positions (with deadzone handling)
- Read trigger values (analog 0-1)
- Read button states (pressed, just pressed, released)
- Handle multiple gamepads (local multiplayer)
- Vibration/haptics support
- Support multiple controller layouts (Xbox, PlayStation, Switch)

---

### Gamepad API

```typescript
// runtime/rendering/input.ts
interface GamepadState {
  connected: boolean;
  buttons: Record<string, boolean>; // Button name → pressed
  axes: Record<string, number>;     // Axis name → value (-1 to 1)
  triggers: Record<string, number>; // Trigger name → value (0 to 1)
}

// Query gamepad state
function getGamepad(index: number): GamepadState | undefined;
function isGamepadConnected(index: number): boolean;
function getGamepadCount(): number;

// Button queries (similar to keyboard)
function isGamepadButtonDown(index: number, button: string): boolean;
function isGamepadButtonPressed(index: number, button: string): boolean;
function isGamepadButtonReleased(index: number, button: string): boolean;

// Analog stick queries
function getGamepadAxis(index: number, axis: string): number;
function getGamepadLeftStick(index: number): Vec2;
function getGamepadRightStick(index: number): Vec2;

// Trigger queries
function getGamepadTrigger(index: number, trigger: string): number;

// Vibration
function vibrateGamepad(index: number, leftMotor: number, rightMotor: number, duration: number): void;

// Example usage
onFrame((dt) => {
  // Player 1 controls
  const leftStick = getGamepadLeftStick(0);
  const jump = isGamepadButtonPressed(0, 'A'); // Xbox button names

  // Move player
  player.x += leftStick.x * speed * dt;
  player.y += leftStick.y * speed * dt;

  if (jump) {
    player.velocity.y = jumpStrength;
  }

  // Vibrate on impact
  if (player.justHitWall) {
    vibrateGamepad(0, 0.5, 0.5, 200); // 50% intensity for 200ms
  }
});
```

---

### Button/Axis Naming

**Standard layout** (based on Xbox controller):
```typescript
// Buttons
'A', 'B', 'X', 'Y',           // Face buttons
'LB', 'RB',                   // Shoulder buttons
'LT', 'RT',                   // Triggers (as buttons)
'Start', 'Select',            // Start/Select (Back)
'LSB', 'RSB',                 // Stick buttons (L3/R3)
'DPadUp', 'DPadDown', 'DPadLeft', 'DPadRight', // D-pad

// Axes
'LeftStickX', 'LeftStickY',   // Left analog stick (-1 to 1)
'RightStickX', 'RightStickY', // Right analog stick (-1 to 1)

// Triggers (analog)
'LeftTrigger', 'RightTrigger', // 0 to 1
```

**Platform mappings:**
- Xbox: Native layout
- PlayStation: A=Cross, B=Circle, X=Square, Y=Triangle, LB=L1, RB=R1, Start=Options, Select=Share
- Switch: A=B, B=A, X=Y, Y=X (rotated), LB=L, RB=R, Start=Plus, Select=Minus
- Generic: Best-effort mapping via SDL GameController DB

---

### Deadzone Handling

Analog sticks have physical deadzone (small movements don't register):

```typescript
function applyDeadzone(value: number, threshold: number = 0.15): number {
  if (Math.abs(value) < threshold) {
    return 0;
  }
  // Rescale to 0-1 outside deadzone
  return (value - Math.sign(value) * threshold) / (1 - threshold);
}

// Internal implementation
function getGamepadAxis(index: number, axis: string): number {
  const raw = getRawAxisValue(index, axis);
  return applyDeadzone(raw, 0.15); // 15% deadzone (standard)
}
```

**Radial deadzone** (for stick magnitude):
```typescript
function applyRadialDeadzone(x: number, y: number, threshold: number = 0.15): Vec2 {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude < threshold) {
    return { x: 0, y: 0 };
  }
  // Rescale
  const scale = (magnitude - threshold) / (1 - threshold) / magnitude;
  return { x: x * scale, y: y * scale };
}
```

---

### Rust Implementation (winit + gilrs)

```rust
// Cargo.toml
[dependencies]
gilrs = "0.11" // Gamepad input library

// core/src/platform/gamepad.rs
use gilrs::{Gilrs, GamepadId, Button, Axis};

pub struct GamepadState {
  gilrs: Gilrs,
  connected: Vec<GamepadId>,
  button_states: HashMap<(usize, Button), ButtonState>,
  axis_values: HashMap<(usize, Axis), f32>,
}

impl GamepadState {
  pub fn new() -> Self {
    let gilrs = Gilrs::new().expect("Failed to initialize gamepad support");
    Self {
      gilrs,
      connected: Vec::new(),
      button_states: HashMap::new(),
      axis_values: HashMap::new(),
    }
  }

  pub fn update(&mut self) {
    // Poll events
    while let Some(event) = self.gilrs.next_event() {
      match event.event {
        gilrs::EventType::ButtonPressed(button, _) => {
          self.button_states.insert((event.id.into(), button), ButtonState::JustPressed);
        }
        gilrs::EventType::ButtonReleased(button, _) => {
          self.button_states.insert((event.id.into(), button), ButtonState::JustReleased);
        }
        gilrs::EventType::AxisChanged(axis, value, _) => {
          self.axis_values.insert((event.id.into(), axis), value);
        }
        gilrs::EventType::Connected => {
          self.connected.push(event.id);
        }
        gilrs::EventType::Disconnected => {
          self.connected.retain(|&id| id != event.id);
        }
        _ => {}
      }
    }

    // Update button states (JustPressed → Down, JustReleased → Up)
    for state in self.button_states.values_mut() {
      match state {
        ButtonState::JustPressed => *state = ButtonState::Down,
        ButtonState::JustReleased => *state = ButtonState::Up,
        _ => {}
      }
    }
  }

  pub fn is_button_down(&self, gamepad_index: usize, button: Button) -> bool {
    matches!(
      self.button_states.get(&(gamepad_index, button)),
      Some(ButtonState::Down) | Some(ButtonState::JustPressed)
    )
  }

  pub fn vibrate(&mut self, gamepad_index: usize, left: f32, right: f32, duration_ms: u64) {
    if let Some(&gamepad_id) = self.connected.get(gamepad_index) {
      let gamepad = self.gilrs.gamepad(gamepad_id);
      gamepad.set_rumble(left, right, duration_ms);
    }
  }
}
```

**TypeScript ops:**
```rust
#[op2(fast)]
fn op_is_gamepad_button_down(
  gamepad_index: u32,
  #[string] button: String,
) -> bool {
  let gamepad_state = /* get from OpState */;
  let button = parse_button(&button);
  gamepad_state.is_button_down(gamepad_index as usize, button)
}

#[op2(fast)]
fn op_get_gamepad_axis(
  gamepad_index: u32,
  #[string] axis: String,
) -> f64 {
  let gamepad_state = /* get from OpState */;
  let axis = parse_axis(&axis);
  gamepad_state.get_axis(gamepad_index as usize, axis) as f64
}

#[op2]
fn op_vibrate_gamepad(
  gamepad_index: u32,
  left: f64,
  right: f64,
  duration_ms: u32,
) {
  let gamepad_state = /* get from OpState */;
  gamepad_state.vibrate(gamepad_index as usize, left as f32, right as f32, duration_ms as u64);
}
```

---

## Part 2: Touch Input

### Requirements

- Detect touch start, move, end
- Track multiple simultaneous touches (multi-touch)
- Detect tap, long-press, swipe gestures
- Pinch-to-zoom, rotate gestures
- Touch position in world space (relative to camera)

---

### Touch API

```typescript
// runtime/rendering/input.ts
interface Touch {
  id: number;        // Unique touch ID
  x: number;         // Screen-space X
  y: number;         // Screen-space Y
  startX: number;    // Touch start position
  startY: number;
  startTime: number; // Timestamp (ms)
  phase: 'started' | 'moved' | 'ended';
}

// Query active touches
function getTouches(): Touch[];
function getTouchCount(): number;
function getTouch(id: number): Touch | undefined;

// Gesture detection
function isTap(): boolean; // Tap just happened
function isLongPress(): boolean; // Touch held for >500ms
function getSwipe(): Vec2 | null; // Returns swipe direction (null if not a swipe)
function getPinchScale(): number; // Returns pinch-to-zoom scale factor (1 = no change)

// Example usage
onFrame((dt) => {
  // Move character with touch drag
  const touches = getTouches();
  if (touches.length === 1) {
    const touch = touches[0];
    if (touch.phase === 'moved') {
      player.x = touch.x;
      player.y = touch.y;
    }
  }

  // Pinch-to-zoom
  const pinchScale = getPinchScale();
  if (pinchScale !== 1) {
    camera.zoom *= pinchScale;
  }

  // Swipe to attack
  const swipe = getSwipe();
  if (swipe) {
    player.attack(swipe);
  }
});
```

---

### Gesture Detection

**Tap:**
```typescript
function isTap(): boolean {
  // Touch ended within 300ms and didn't move >10px
  const recentEndedTouches = touches.filter(t =>
    t.phase === 'ended' &&
    Date.now() - t.startTime < 300 &&
    distance(t.startX, t.startY, t.x, t.y) < 10
  );
  return recentEndedTouches.length > 0;
}
```

**Swipe:**
```typescript
function getSwipe(): Vec2 | null {
  const recentEndedTouches = touches.filter(t =>
    t.phase === 'ended' &&
    Date.now() - t.startTime < 500
  );

  for (const touch of recentEndedTouches) {
    const dx = touch.x - touch.startX;
    const dy = touch.y - touch.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 50) {
      // Swipe detected
      return { x: dx / distance, y: dy / distance }; // Normalized direction
    }
  }
  return null;
}
```

**Pinch-to-zoom:**
```typescript
function getPinchScale(): number {
  const activeTouches = touches.filter(t => t.phase !== 'ended');
  if (activeTouches.length !== 2) {
    return 1; // No pinch
  }

  const [t1, t2] = activeTouches;

  // Current distance
  const currentDist = distance(t1.x, t1.y, t2.x, t2.y);

  // Initial distance
  const initialDist = distance(t1.startX, t1.startY, t2.startX, t2.startY);

  return currentDist / initialDist;
}
```

---

### Rust Implementation (winit touch events)

```rust
// core/src/platform/touch.rs
use winit::event::{Touch as WinitTouch, TouchPhase};

pub struct TouchState {
  active_touches: HashMap<u64, TouchInfo>,
  gesture_detector: GestureDetector,
}

pub struct TouchInfo {
  id: u64,
  x: f32,
  y: f32,
  start_x: f32,
  start_y: f32,
  start_time: std::time::Instant,
  phase: TouchPhase,
}

impl TouchState {
  pub fn handle_touch_event(&mut self, touch: WinitTouch) {
    match touch.phase {
      TouchPhase::Started => {
        self.active_touches.insert(touch.id, TouchInfo {
          id: touch.id,
          x: touch.location.x as f32,
          y: touch.location.y as f32,
          start_x: touch.location.x as f32,
          start_y: touch.location.y as f32,
          start_time: std::time::Instant::now(),
          phase: TouchPhase::Started,
        });
      }
      TouchPhase::Moved => {
        if let Some(info) = self.active_touches.get_mut(&touch.id) {
          info.x = touch.location.x as f32;
          info.y = touch.location.y as f32;
          info.phase = TouchPhase::Moved;
        }
      }
      TouchPhase::Ended | TouchPhase::Cancelled => {
        if let Some(mut info) = self.active_touches.remove(&touch.id) {
          info.phase = TouchPhase::Ended;
          self.gesture_detector.add_ended_touch(info);
        }
      }
    }
  }

  pub fn get_touches(&self) -> Vec<TouchInfo> {
    self.active_touches.values().cloned().collect()
  }
}
```

---

## Part 3: Input Mapping System

### Requirements

- Named actions ("jump", "attack", "menu") instead of raw keys
- Map actions to multiple inputs (keyboard, gamepad, touch)
- Remappable controls (user can rebind)
- Input buffering (queue inputs for combos)
- Input contexts (different mappings for menu vs gameplay)

---

### Input Mapping API

```typescript
// runtime/input/actions.ts
interface ActionMapping {
  action: string;
  inputs: InputBinding[];
}

type InputBinding =
  | { type: 'key'; key: string }
  | { type: 'gamepad'; gamepad: number; button: string }
  | { type: 'mouse'; button: number }
  | { type: 'touch'; gesture: string };

// Define action mappings
function defineAction(action: string, bindings: InputBinding[]): void;
function clearActions(): void;

// Query actions (instead of raw keys)
function isActionDown(action: string): boolean;
function isActionPressed(action: string): boolean;
function isActionReleased(action: string): boolean;
function getActionValue(action: string): number; // For analog inputs (0-1)

// Input contexts (switch between control schemes)
function pushInputContext(name: string): void;
function popInputContext(): void;

// Example: Define actions
defineAction('jump', [
  { type: 'key', key: 'Space' },
  { type: 'gamepad', gamepad: 0, button: 'A' },
]);

defineAction('move-left', [
  { type: 'key', key: 'ArrowLeft' },
  { type: 'key', key: 'KeyA' },
  { type: 'gamepad', gamepad: 0, axis: 'LeftStickX', threshold: -0.5 },
]);

defineAction('attack', [
  { type: 'key', key: 'KeyX' },
  { type: 'mouse', button: 0 },
  { type: 'gamepad', gamepad: 0, button: 'X' },
]);

// Use actions in game code
onFrame((dt) => {
  if (isActionPressed('jump')) {
    player.jump();
  }

  if (isActionDown('move-left')) {
    player.x -= speed * dt;
  }

  if (isActionPressed('attack')) {
    player.attack();
  }
});

// Input contexts (different controls for menu)
pushInputContext('menu');
defineAction('select', [{ type: 'key', key: 'Enter' }]);
defineAction('back', [{ type: 'key', key: 'Escape' }]);
// ... menu code ...
popInputContext(); // Return to gameplay controls
```

---

### Remappable Controls

```typescript
// Allow user to rebind controls
function rebindAction(action: string, newBinding: InputBinding): void;
function getActionBindings(action: string): InputBinding[];

// Example: Rebind UI
function showRebindUI(action: string) {
  console.log(`Press a key to rebind "${action}"...`);

  // Wait for key press
  const key = waitForKeyPress(); // Blocks until key pressed

  // Rebind
  rebindAction(action, { type: 'key', key });

  console.log(`"${action}" rebound to ${key}`);
}

// Save bindings to file (use Phase 8 save/load)
const bindings = getAllActionBindings();
saveToFile('controls.json', JSON.stringify(bindings));
```

---

### Input Buffering

For fighting-game-style combos or coyote-time jumps:

```typescript
// Buffer inputs for 100ms
function bufferAction(action: string, duration: number = 100): void;
function consumeBufferedAction(action: string): boolean;

// Example: Coyote-time jump (can jump slightly after leaving platform)
onFrame((dt) => {
  if (!player.isGrounded) {
    bufferAction('jump', 150); // Buffer jump input for 150ms
  }

  if (player.isGrounded && consumeBufferedAction('jump')) {
    player.jump(); // Execute buffered jump
  }
});
```

---

## Part 4: Interactive UI System

### Current Limitation

UI is draw-only (no interaction):
```typescript
// Current: Can draw buttons, but can't click them
drawPanel({ x: 100, y: 100, w: 200, h: 50 });
drawLabel('Start Game', { x: 150, y: 115 });

// No way to detect if button was clicked
```

---

### Interactive UI API

```typescript
// runtime/ui/interactive.ts
interface ButtonOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  onClick?: () => void;
  style?: ButtonStyle;
}

interface ButtonStyle {
  normalColor: Color;
  hoverColor: Color;
  pressedColor: Color;
  textColor: Color;
}

function drawButton(options: ButtonOptions): boolean; // Returns true if clicked

// Example usage
onFrame((dt) => {
  if (drawButton({ x: 100, y: 100, w: 200, h: 50, label: 'Start Game' })) {
    // Button was clicked
    sceneManager.pushScene(gameplayScene);
  }

  if (drawButton({ x: 100, y: 160, w: 200, h: 50, label: 'Quit' })) {
    quitGame();
  }
});

// Text input field
interface TextInputOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
  placeholder?: string;
  maxLength?: number;
}

function drawTextInput(options: TextInputOptions): string; // Returns current value

// Example
let playerName = '';
onFrame((dt) => {
  playerName = drawTextInput({
    x: 100, y: 100, w: 200, h: 30,
    value: playerName,
    placeholder: 'Enter your name',
    maxLength: 20,
  });
});

// Slider
interface SliderOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  value: number; // 0-1
  label?: string;
}

function drawSlider(options: SliderOptions): number; // Returns new value

// Example
let volume = 0.5;
onFrame((dt) => {
  volume = drawSlider({
    x: 100, y: 100, w: 200, h: 20,
    value: volume,
    label: 'Volume',
  });
});
```

---

### Immediate Mode UI (ImGui-style)

UI state is managed by the engine (no manual state tracking):

```typescript
// Behind the scenes
let uiState = {
  hotWidget: null,    // Widget under mouse
  activeWidget: null, // Widget being interacted with
  focusedWidget: null, // Widget with keyboard focus
};

function drawButton(options: ButtonOptions): boolean {
  const id = generateId(options); // Stable ID based on position

  const isHovered = isMouseInRect(options);
  const isPressed = isHovered && isMouseButtonDown(0);
  const wasClicked = isHovered && isMouseButtonPressed(0);

  // Update UI state
  if (isHovered) {
    uiState.hotWidget = id;
  }
  if (isPressed) {
    uiState.activeWidget = id;
  }

  // Choose color based on state
  let color = options.style?.normalColor || { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  if (uiState.activeWidget === id) {
    color = options.style?.pressedColor || { r: 0.3, g: 0.3, b: 0.3, a: 1 };
  } else if (uiState.hotWidget === id) {
    color = options.style?.hoverColor || { r: 0.6, g: 0.6, b: 0.6, a: 1 };
  }

  // Draw button
  drawPanel({ ...options, color });
  drawLabel(options.label, { x: options.x + 10, y: options.y + 10, color: options.style?.textColor });

  return wasClicked;
}
```

---

### Focus System (Keyboard/Gamepad Navigation)

```typescript
// Focus management
function setFocusedWidget(id: string): void;
function getFocusedWidget(): string | null;
function focusNextWidget(): void;
function focusPreviousWidget(): void;

// Example: Tab navigation
onFrame((dt) => {
  if (isKeyPressed('Tab')) {
    if (isKeyDown('Shift')) {
      focusPreviousWidget();
    } else {
      focusNextWidget();
    }
  }

  // Activate focused widget with Enter
  if (isKeyPressed('Enter')) {
    const focused = getFocusedWidget();
    if (focused === 'start-button') {
      startGame();
    }
  }
});

// Draw focused widget with outline
function drawButton(options: ButtonOptions): boolean {
  const id = generateId(options);
  const isFocused = getFocusedWidget() === id;

  // Draw button...

  if (isFocused) {
    drawRect({ ...options, color: { r: 1, g: 1, b: 0, a: 1 }, filled: false }); // Yellow outline
  }

  return wasClicked || (isFocused && isKeyPressed('Enter'));
}
```

---

## Part 5: Layout System

### Requirements

- Automatic positioning (no manual x/y calculations)
- Flexbox-style layout (horizontal, vertical, grid)
- Responsive sizing (fill, fit-content, fixed)
- Anchoring (attach to screen edges/corners)
- Padding, margins, gaps

---

### Layout API

```typescript
// runtime/ui/layout.ts
interface LayoutOptions {
  direction: 'horizontal' | 'vertical' | 'grid';
  gap?: number; // Space between children
  padding?: number; // Space inside container
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  align?: 'start' | 'center' | 'end'; // Cross-axis alignment
  justify?: 'start' | 'center' | 'end' | 'space-between'; // Main-axis alignment
}

function beginLayout(options: LayoutOptions): void;
function endLayout(): void;

// Example: Vertical menu
beginLayout({ direction: 'vertical', gap: 10, anchor: 'center' });
  if (drawButton({ w: 200, h: 50, label: 'Start Game' })) { /* ... */ }
  if (drawButton({ w: 200, h: 50, label: 'Settings' })) { /* ... */ }
  if (drawButton({ w: 200, h: 50, label: 'Quit' })) { /* ... */ }
endLayout();

// Example: Horizontal toolbar
beginLayout({ direction: 'horizontal', gap: 5, anchor: 'top-left', padding: 10 });
  if (drawButton({ w: 50, h: 50, label: '▶' })) { play(); }
  if (drawButton({ w: 50, h: 50, label: '⏸' })) { pause(); }
  if (drawButton({ w: 50, h: 50, label: '⏹' })) { stop(); }
endLayout();

// Example: Grid inventory
beginLayout({ direction: 'grid', gap: 5, gridColumns: 5 });
  for (const item of inventory) {
    if (drawItemSlot(item)) {
      useItem(item);
    }
  }
endLayout();
```

---

### Layout Stack (Nested Layouts)

```typescript
// Layouts can be nested
beginLayout({ direction: 'vertical', anchor: 'center' });
  drawLabel('Settings', { fontSize: 24 });

  beginLayout({ direction: 'horizontal', gap: 10 });
    drawLabel('Volume:');
    volume = drawSlider({ w: 200, h: 20, value: volume });
  endLayout();

  beginLayout({ direction: 'horizontal', gap: 10 });
    drawLabel('Difficulty:');
    difficulty = drawDropdown({ w: 200, h: 30, options: ['Easy', 'Normal', 'Hard'], value: difficulty });
  endLayout();

  if (drawButton({ w: 200, h: 50, label: 'Back' })) {
    sceneManager.popScene();
  }
endLayout();
```

---

## Implementation Plan

### Week 1: Gamepad Support
- [ ] Integrate gilrs crate (Rust)
- [ ] Gamepad state tracking (buttons, axes, triggers)
- [ ] Deadzone handling
- [ ] Vibration support
- [ ] TypeScript ops
- [ ] Tests: gamepad queries (manual testing required)

### Week 2: Touch Input
- [ ] Touch event handling (winit)
- [ ] Multi-touch tracking
- [ ] Gesture detection (tap, swipe, pinch)
- [ ] TypeScript API
- [ ] Tests: gesture recognition (unit tests + manual)

### Week 3: Input Mapping
- [ ] Action definition system
- [ ] Input binding resolution
- [ ] Input contexts (stack-based)
- [ ] Remappable controls
- [ ] Input buffering
- [ ] Tests: action queries, rebinding (60 tests)

### Week 4: Interactive UI
- [ ] UI state management (hot, active, focused)
- [ ] Button widget
- [ ] Text input widget
- [ ] Slider widget
- [ ] Checkbox, radio button
- [ ] Tests: widget interaction (40 tests)

### Week 5: Layout System
- [ ] Layout stack (nested layouts)
- [ ] Horizontal/vertical layout
- [ ] Grid layout
- [ ] Anchoring (screen edges)
- [ ] Padding, margins, gaps
- [ ] Tests: layout math (30 tests)

### Week 6: Demo + Polish
- [ ] Gamepad Platformer demo (analog stick movement, vibration)
- [ ] Settings menu with UI (sliders, buttons, text input)
- [ ] Touch controls demo (mobile-friendly)
- [ ] Control remapping UI
- [ ] Documentation (input tutorial, UI tutorial)

**Total: ~130 tests, ~3500 LOC**

---

## Success Criteria

### Gamepad
- [ ] Xbox/PlayStation/Switch controllers work
- [ ] Analog stick movement feels responsive
- [ ] Vibration works on supported controllers
- [ ] Multiple gamepads work (local multiplayer)

### Touch
- [ ] Tap, swipe, pinch gestures detect correctly
- [ ] Multi-touch works (2+ simultaneous touches)
- [ ] Touch position in world space is accurate

### Input Mapping
- [ ] Named actions work (no raw key checks in game code)
- [ ] Rebinding works (user can change controls)
- [ ] Input contexts switch correctly (menu vs gameplay)

### UI
- [ ] Buttons respond to mouse, touch, and gamepad
- [ ] Text input captures keyboard correctly
- [ ] Sliders drag smoothly
- [ ] Focus system works (tab navigation, gamepad d-pad)

### Layout
- [ ] Auto-layout eliminates manual positioning
- [ ] Nested layouts work correctly
- [ ] Responsive to screen resize
- [ ] Anchoring to screen edges works

### Demo
- [ ] Platformer controlled via gamepad feels good
- [ ] Settings menu looks polished
- [ ] Touch controls work on mobile browser

---

## Open Questions

### 1. Should UI be retained-mode or immediate-mode?

**Immediate-mode** (recommended for Phase 11):
- UI drawn every frame (ImGui-style)
- No widget objects (stateless)
- Simple, easy to reason about

**Retained-mode**:
- Widget objects persist between frames
- More complex state management
- Better for very large UIs (10k+ widgets)

**Recommendation**: Immediate-mode (simpler, sufficient for most games)

---

### 2. How to handle UI scaling (high-DPI displays)?

```typescript
// Option 1: Scale UI automatically based on DPI
const dpiScale = window.devicePixelRatio || 1;
drawButton({ x: 100 * dpiScale, y: 100 * dpiScale, ... });

// Option 2: Use virtual resolution (render at 1080p, scale to screen)
setVirtualResolution(1920, 1080);
drawButton({ x: 100, y: 100, ... }); // Always 1080p coordinates
```

**Recommendation**: Option 2 (virtual resolution) — simpler for game developers

---

### 3. Should UI support custom rendering (skinning)?

```typescript
// Allow custom draw functions for widgets
function drawCustomButton(options: ButtonOptions, drawFn: (state: ButtonState) => void): boolean;

drawCustomButton({ x: 100, y: 100, w: 200, h: 50 }, (state) => {
  // Custom rendering
  if (state.pressed) {
    drawSprite('button-pressed', { ... });
  } else if (state.hovered) {
    drawSprite('button-hover', { ... });
  } else {
    drawSprite('button-normal', { ... });
  }
});
```

**Recommendation**: Yes (add in Phase 11 or 11.5)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gamepad support is platform-specific | Medium | High | Use gilrs (cross-platform library) |
| Touch gestures are hard to get right | High | Medium | Copy proven algorithms (e.g., Godot) |
| Immediate-mode UI is too slow | Low | High | Profile, optimize, or switch to retained-mode |
| Layout system is too complex | Medium | Medium | Start simple (horizontal/vertical only), add grid later |
| Input mapping is confusing | High | Medium | Good documentation, visual rebinding UI |

---

## Future Enhancements (Phase 11.5)

- [ ] Scroll containers (overflow with scrollbar)
- [ ] Drag-and-drop (for inventory management, card games)
- [ ] Modal dialogs (confirm, cancel, text input)
- [ ] Tooltips (hover information)
- [ ] Context menus (right-click menus)
- [ ] Rich text (bold, italic, colors, inline sprites)
- [ ] 9-slice rendering (stretch panel borders without distortion)
- [ ] Accessibility (screen reader support, colorblind modes)
