# UI: HUD, Widgets & Layout

## HUD Shortcuts

The `hud` object provides screen-space text, bars, and labels with sensible defaults:

```typescript
import { hud } from "@arcane/runtime/game";
import { rgb } from "@arcane/runtime/ui";

hud.text("Score: 100", 10, 10);
hud.bar(10, 30, health / maxHealth);
hud.label("PAUSED", 350, 280);

// Override defaults
hud.text("Critical!", 10, 10, { tint: { r: 1, g: 0.2, b: 0.2, a: 1 }, scale: 3 });
hud.bar(10, 40, mana / maxMana, { fillColor: rgb(50, 100, 255), width: 120 });
hud.label("Game Over", 300, 250, { textColor: rgb(255, 80, 80), scale: 3 });

// Full-screen overlay (pause, damage flash, fade-to-black)
hud.overlay({ r: 0, g: 0, b: 0, a: 0.5 });                    // 50% black
hud.overlay({ r: 1, g: 0, b: 0, a: 0.3 });                    // red damage flash
hud.overlay({ r: 0, g: 0, b: 0, a: fadeAlpha }, { layer: 300 }); // custom layer
```

`hud.overlay()` covers the full viewport with a colored rect at layer 200 (above other HUD). Use it for pause screens, damage flashes, or fade effects. For animated screen transitions, use `startScreenTransition()` instead — see [transitions.md](transitions.md).

## Shape Drawing

Draw circles, lines, and triangles as colored primitives. Same pattern as `drawRect` — supports `screenSpace`, `layer`, and `color`.

```typescript
import { drawCircle, drawLine, drawTriangle } from "@arcane/runtime/ui";
import { rgb } from "@arcane/runtime/ui";

// Circle (cx, cy, radius)
drawCircle(100, 100, 20, { color: rgb(255, 100, 50), layer: 5 });

// Line (x1, y1 → x2, y2, thickness)
drawLine(50, 50, 200, 150, { color: rgb(255, 255, 255), thickness: 2, layer: 5 });

// Triangle (three vertices)
drawTriangle(100, 50, 50, 150, 150, 150, { color: rgb(0, 200, 100), layer: 5 });

// Screen-space shapes (HUD)
drawCircle(20, 20, 8, { color: rgb(255, 0, 0), screenSpace: true, layer: 100 });
```

Shapes are rendered via scanline sprites (circles, triangles) or a rotated rectangle (lines). They work in headless mode for testing via the draw call capture system.

## Screen-Space Rendering

`drawText`, `drawBar`, `drawLabel`, `drawRect`, `drawPanel` all accept `screenSpace: true` to render fixed to the viewport (ignores camera). `drawSprite` does NOT support `screenSpace` -- use the above for HUD elements.

```typescript
import { drawText } from "@arcane/runtime/rendering";
import { drawBar, drawRect, Colors } from "@arcane/runtime/ui";

drawText("HP: 10", 10, 10, { screenSpace: true, layer: 100 });
drawBar(10, 30, 80, 12, 0.75, { fillColor: Colors.SUCCESS, screenSpace: true, layer: 100 });
```

## Buttons

Immediate-mode buttons with hover/press states. Call update then draw each frame.

```typescript
import { createButton, updateButton, drawButton } from "@arcane/runtime/ui";
import { getMousePosition, isKeyPressed } from "@arcane/runtime/rendering";

const btn = createButton(100, 200, 120, 40, "Start Game", {
  normalColor: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
  hoverColor:  { r: 0.3, g: 0.5, b: 0.9, a: 1 },
  textColor:   { r: 1, g: 1, b: 1, a: 1 },
});

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateButton(btn, mx, my, leftDown, isKeyPressed("Enter"));
drawButton(btn);
if (btn.clicked) { /* handle click */ }
```

## Sliders

Draggable sliders with label and value display:

```typescript
import { createSlider, updateSlider, drawSlider } from "@arcane/runtime/ui";

const volume = createSlider(100, 150, 200, 0, 100, 75, "Volume", {
  showValue: true, decimals: 0,
  fillColor: { r: 0.2, g: 0.7, b: 0.3, a: 1 },
});

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateSlider(volume, mx, my, leftDown, isKeyPressed("ArrowLeft"), isKeyPressed("ArrowRight"));
drawSlider(volume);
if (volume.changed) { setMusicVolume(volume.value / 100); }
```

## Toggles

Checkboxes and radio groups:

```typescript
import { createCheckbox, updateCheckbox, drawCheckbox } from "@arcane/runtime/ui";
import { createRadioGroup, updateRadioGroup, drawRadioGroup } from "@arcane/runtime/ui";

const muteBox = createCheckbox(100, 100, "Mute Audio", false);
const diffRadio = createRadioGroup(100, 140, ["Easy", "Normal", "Hard"], 1);

// In onFrame:
const { x: mx, y: my, leftDown } = getMousePosition();
updateCheckbox(muteBox, mx, my, leftDown);
drawCheckbox(muteBox);
if (muteBox.toggled) { toggleMute(muteBox.checked); }

updateRadioGroup(diffRadio, mx, my, leftDown,
  isKeyPressed("ArrowUp"), isKeyPressed("ArrowDown"));
drawRadioGroup(diffRadio);
if (diffRadio.changed) { setDifficulty(diffRadio.selectedIndex); }
```

## Text Input

```typescript
import { createTextInput, updateTextInput, drawTextInput } from "@arcane/runtime/ui";

const nameInput = createTextInput(100, 200, 200, "Enter name...", {
  focusedBorderColor: { r: 0.3, g: 0.6, b: 1, a: 1 },
});
nameInput.maxLength = 20;

// In onFrame:
const keys: { key: string; pressed: boolean }[] = [];
for (const k of ["a", "b", "c", "Backspace", "Delete", "ArrowLeft", "ArrowRight"]) {
  if (isKeyPressed(k)) keys.push({ key: k, pressed: true });
}
const { x: mx, y: my, leftDown } = getMousePosition();
updateTextInput(nameInput, mx, my, leftDown, keys);
drawTextInput(nameInput, totalTime);  // totalTime for cursor blink
if (nameInput.changed) { playerName = nameInput.text; }
```

## Layout Helpers

Compute widget positions with stacks, rows, and viewport anchoring:

```typescript
import { verticalStack, horizontalRow, anchorPosition } from "@arcane/runtime/ui";
import { getViewportSize } from "@arcane/runtime/rendering";

const { width: VPW, height: VPH } = getViewportSize();

// Center a menu of 4 buttons
const menuPos = anchorPosition("center", VPW, VPH, 160, 200, 0);
const slots = verticalStack(menuPos.x, menuPos.y, 40, 4, 8);
// slots[0] = {x, y} for first button, slots[1] for second, etc.

// Bottom-right row of 3 action buttons
const barPos = anchorPosition("bottom-right", VPW, VPH, 3 * 50 + 2 * 4, 50, 10);
const actionSlots = horizontalRow(barPos.x, barPos.y, 50, 3, 4);
```

## Focus / Keyboard Navigation

Tab through UI widgets without a mouse:

```typescript
import { createFocusManager, registerFocusable, updateFocus } from "@arcane/runtime/ui";

const fm = createFocusManager();
registerFocusable(fm, btn);
registerFocusable(fm, slider);
registerFocusable(fm, checkbox);

// In onFrame:
updateFocus(fm, isKeyPressed("Tab"), isKeyDown("ShiftLeft"));
```

## Widget Auto-Input (Convenience)

`captureInput()` snapshots mouse/keyboard state once per frame. The `autoUpdate*` functions pass that snapshot to widgets automatically:

```typescript
import { createButton, drawButton } from "@arcane/runtime/ui";
import { createSlider, drawSlider } from "@arcane/runtime/ui";
import { captureInput, autoUpdateButton, autoUpdateSlider } from "@arcane/runtime/game";

// Every frame -- capture once, pass to all widgets:
const input = captureInput();

autoUpdateButton(btn, input);
drawButton(btn);
autoUpdateSlider(volume, input);
drawSlider(volume);
```

Also available: `autoUpdateCheckbox(cb, input)` and `autoUpdateFocus(fm, input)`.
