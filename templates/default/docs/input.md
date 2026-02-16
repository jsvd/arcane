# Input: Keyboard, Gamepad & Touch

## Keyboard

```typescript
import { isKeyDown, isKeyPressed } from "@arcane/runtime/rendering";

// isKeyDown: true while held
if (isKeyDown("ArrowRight")) player.x += speed * dt;

// isKeyPressed: true only on the frame the key goes down
if (isKeyPressed("Space")) jump();
```

Key names use the `KeyName` type: `"ArrowLeft"`, `"ArrowRight"`, `"ArrowUp"`, `"ArrowDown"`, `"Space"`, `"Enter"`, `"Escape"`, `"ShiftLeft"`, `"a"` through `"z"`, `"Digit0"` through `"Digit9"`. Space is `"Space"`, not `" "`.

## Gamepad

Xbox layout as canonical button/axis names:

```typescript
import {
  isGamepadConnected, isGamepadButtonDown, isGamepadButtonPressed,
  getGamepadAxis, getGamepadCount,
} from "@arcane/runtime/rendering";

if (isGamepadConnected(0)) {
  // Analog sticks: -1 to 1 (apply deadzone!)
  const rawX = getGamepadAxis("LeftStickX");
  const rawY = getGamepadAxis("LeftStickY");
  const DEADZONE = 0.15;
  const dx = Math.abs(rawX) > DEADZONE ? rawX : 0;
  const dy = Math.abs(rawY) > DEADZONE ? rawY : 0;
  player.x += dx * speed * dt;
  player.y += dy * speed * dt;

  // Face buttons
  if (isGamepadButtonPressed("A")) jump();
  if (isGamepadButtonDown("RightTrigger")) fire();
}
```

Button names: `"A"`, `"B"`, `"X"`, `"Y"`, `"LeftBumper"`, `"RightBumper"`, `"LeftTrigger"`, `"RightTrigger"`, `"DPadUp"`, `"DPadDown"`, `"DPadLeft"`, `"DPadRight"`, `"Select"`, `"Start"`, `"LeftStick"`, `"RightStick"`, `"Guide"`.

Axis names: `"LeftStickX"`, `"LeftStickY"`, `"RightStickX"`, `"RightStickY"`, `"LeftTrigger"`, `"RightTrigger"`.

## Touch

```typescript
import { isTouchActive, getTouchPosition, getTouchWorldPosition, getTouchCount } from "@arcane/runtime/rendering";

if (isTouchActive()) {
  const screenPos = getTouchPosition(0);      // screen pixels
  const worldPos = getTouchWorldPosition(0);   // world coordinates (camera-aware)
  if (worldPos) moveToward(player, worldPos.x, worldPos.y, speed * dt);
}

// Multi-touch
if (getTouchCount() >= 2) {
  const pos1 = getTouchPosition(0);
  const pos2 = getTouchPosition(1);
  // pinch-to-zoom, two-finger gestures, etc.
}
```

## Input Actions

Higher-level abstraction over raw input. Map named actions to physical inputs:

```typescript
import {
  createInputMap, isActionDown, isActionPressed, getActionValue, setActionBindings,
} from "@arcane/runtime/input";

const input = createInputMap({
  jump: ["Space", "GamepadA"],
  attack: ["x", "GamepadX", "MouseLeft"],
  moveRight: [
    { type: "key", key: "d" },
    { type: "key", key: "ArrowRight" },
    { type: "gamepadAxis", axis: "LeftStickX", direction: 1 },
    "GamepadDPadRight",
  ],
  moveLeft: [
    { type: "key", key: "a" },
    { type: "key", key: "ArrowLeft" },
    { type: "gamepadAxis", axis: "LeftStickX", direction: -1 },
    "GamepadDPadLeft",
  ],
});

// In onFrame:
if (isActionPressed("jump", input)) player.vy = -300;
if (isActionDown("attack", input)) swingSword();

// Analog value: 0/1 for digital, -1 to 1 for analog
const moveX = getActionValue("moveRight", input) - getActionValue("moveLeft", input);
player.x += moveX * speed * dt;

// Remapping at runtime
setActionBindings(input, "jump", ["w", "GamepadB"]);
```

String shorthands: `"Space"`, `"a"`-`"z"`, `"ArrowLeft"`, `"GamepadA"`, `"GamepadLB"`, `"GamepadDPadUp"`, `"MouseLeft"`. Or use full `InputSource` objects for analog axes.

## Input Buffering & Combos

```typescript
import { createInputBuffer, updateInputBuffer, checkCombo, consumeCombo } from "@arcane/runtime/input";

const buffer = createInputBuffer(1.0);  // 1s window
const fireball = { sequence: ["down", "right", "attack"], window: 0.5 };

// In onFrame:
updateInputBuffer(buffer, input, totalTime);
if (checkCombo(buffer, fireball, totalTime)) {
  consumeCombo(buffer, fireball);
  castFireball();
}
```

## Multi-Input Fallback Pattern

Check keyboard first, then gamepad, then touch:

```typescript
let dx = 0;
if (isKeyDown("ArrowRight")) dx = 1;
else if (isKeyDown("ArrowLeft")) dx = -1;
else {
  const raw = getGamepadAxis("LeftStickX");
  dx = Math.abs(raw) > 0.15 ? raw : 0;
}
```

Or use the Input Actions system above for cleaner multi-input handling.
