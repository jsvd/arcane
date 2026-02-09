# Visual Code Testing Guide

## The Problem

**Game logic tests pass, but the game crashes on visual rendering.**

This happens because:
1. Tests run **headless** (no GPU, no rendering)
2. Rendering API calls are **not validated** in tests
3. Type errors only appear at **runtime** in V8

## The Solution

Arcane provides three layers of protection:

### Layer 1: Mock Renderer (Testing)

Test visual code without GPU using `mock-renderer.ts`:

```typescript
import { describe, it } from "../arcane/runtime/testing/harness.ts";
import { mockRenderer, installMockRenderer } from "../arcane/runtime/testing/mock-renderer.ts";

describe("Visual Tests", () => {
  beforeEach(() => {
    mockRenderer.reset();
    installMockRenderer();
  });

  it("should render HUD correctly", () => {
    function renderHUD(hp: number) {
      drawText(`HP: ${hp}`, {
        x: 10.0,  // Must be float
        y: 10.0,
        size: 16.0,
        color: { r: 1.0, g: 0.0, b: 0.0 }  // 0.0-1.0 range
      });
    }

    renderHUD(100);

    // Validates all calls
    mockRenderer.assertNoErrors();
    mockRenderer.assertCalled("drawText", 1);
  });

  it("should catch wrong API usage", () => {
    // WRONG: drawRect takes separate params, not object
    drawRect({ x: 0, y: 0, width: 100, height: 100 });

    assert(mockRenderer.hasErrors(), "Should catch wrong signature");
  });
});
```

### Layer 2: Runtime Validation (Development)

Add validation to catch errors early:

```typescript
import { validateRectParams, validateTextOptions } from "../arcane/runtime/rendering/validate.ts";

function renderGame(state: GameState) {
  // Validate before calling
  const x = 10.0, y = 20.0, w = 100.0, h = 50.0;
  validateRectParams(x, y, w, h, { color: { r: 0.5, g: 0.5, b: 0.5 } });

  drawRect(x, y, w, h, { color: { r: 0.5, g: 0.5, b: 0.5 } });
}
```

### Layer 3: Type Safety (Static)

Use correct TypeScript types:

```typescript
// ✅ CORRECT
drawRect(0.0, 0.0, 800.0, 600.0, {
  color: { r: 0.5, g: 0.5, b: 0.5 }
});

drawText("Hello", {
  x: 10.0,
  y: 20.0,
  size: 16.0,
  color: { r: 1.0, g: 1.0, b: 1.0 }
});

// ❌ WRONG
drawRect({ x: 0, y: 0, width: 800, height: 600 }); // Wrong signature
drawText("Hello", { x: 10, y: 20 }); // Missing required fields
drawRect(0, 0, 800, 600, { color: { r: 255, g: 255, b: 255 } }); // Wrong color range
```

## API Cheat Sheet

### Color Helper: rgb(r, g, b, a?)
```typescript
import { rgb } from "../arcane/runtime/ui/index.ts";

// Create colors from 0-255 values (auto-normalized to 0.0-1.0)
rgb(255, 128, 0)        // Orange, fully opaque
rgb(255, 0, 0, 128)     // Red, 50% transparent

// Equivalent to manual normalization:
{ r: 1.0, g: 0.5, b: 0.0, a: 1.0 }
```

### drawRect(x, y, w, h, options?)
```typescript
import { rgb } from "../arcane/runtime/ui/index.ts";

drawRect(
  10.0,     // x: float
  20.0,     // y: float
  100.0,    // w: float
  50.0,     // h: float
  {
    color: rgb(255, 128, 0),  // RGB 0-255, auto-normalized
    // or: color: { r: 1.0, g: 0.5, b: 0.0, a: 1.0 }  // manual
    layer: 90,                // optional
    screenSpace: false        // optional
  }
);
```

### drawText(text, options)
```typescript
import { rgb } from "../arcane/runtime/ui/index.ts";

drawText(
  "Hello World",  // text: string
  {
    x: 10.0,               // float
    y: 20.0,               // float
    size: 16.0,            // float
    color: rgb(255, 255, 255),  // White (auto-normalized)
    layer: 100             // optional
  }
);
```

### drawSprite(options)
```typescript
import { rgb } from "../arcane/runtime/ui/index.ts";

drawSprite({
  textureId: 1,               // number
  x: 100.0,                   // float
  y: 100.0,                   // float
  w: 32.0,                    // float
  h: 32.0,                    // float
  layer: 50,                  // optional
  rotation: 0.0,              // optional (radians)
  color: rgb(255, 255, 255)   // optional tint (white = no tint)
});
```

## Common Mistakes

### 1. Wrong Function Signature
```typescript
// ❌ WRONG
drawRect({ x: 0, y: 0, width: 100, height: 100 });

// ✅ CORRECT
drawRect(0.0, 0.0, 100.0, 100.0);
```

### 2. Integer Instead of Float
```typescript
// ❌ WRONG
drawText("Hello", { x: 10, y: 20, size: 16 });

// ✅ CORRECT
drawText("Hello", { x: 10.0, y: 20.0, size: 16.0 });
```

### 3. Wrong Color Range
```typescript
// ❌ WRONG (0-255 range)
{ color: { r: 255, g: 128, b: 0 } }

// ✅ CORRECT (0.0-1.0 range, manual normalization)
{ color: { r: 1.0, g: 0.5, b: 0.0 } }

// ✅ BETTER (use rgb() helper for auto-normalization)
import { rgb } from "../arcane/runtime/ui/index.ts";
{ color: rgb(255, 128, 0) }  // Automatically normalized to 0.0-1.0
```

### 4. Missing Required Fields
```typescript
// ❌ WRONG
drawText("Hello", { x: 10.0, y: 20.0 });  // Missing size

// ✅ CORRECT
drawText("Hello", { x: 10.0, y: 20.0, size: 16.0 });
```

## Game Template with Visual Tests

```typescript
// game.ts
import { createStore } from "../arcane/runtime/state/store.ts";
import { drawText, drawRect } from "../arcane/runtime/rendering/index.ts";
import { onFrame } from "../arcane/runtime/rendering/loop.ts";

// Separate game logic from rendering
export function createGameLogic() {
  const store = createStore(initialState);

  return {
    getState: () => store.getState(),
    handleCommand: (cmd: string) => {
      // Pure logic, fully testable
      const newState = processCommand(store.getState(), cmd);
      store.replaceState(newState);
      return newState;
    }
  };
}

// Visual layer (thin, validated)
export function createVisualLayer(gameLogic: ReturnType<typeof createGameLogic>) {
  onFrame(() => {
    const state = gameLogic.getState();
    renderState(state);
  });
}

function renderState(state: GameState) {
  // All rendering here
  drawRect(0.0, 0.0, 800.0, 600.0, { color: { r: 0.0, g: 0.0, b: 0.0 } });
  drawText(`HP: ${state.player.health}`, {
    x: 10.0,
    y: 10.0,
    size: 16.0,
    color: { r: 1.0, g: 1.0, b: 1.0 }
  });
}

// game.test.ts
import { describe, it, assert } from "../arcane/runtime/testing/harness.ts";
import { mockRenderer, installMockRenderer } from "../arcane/runtime/testing/mock-renderer.ts";
import { createGameLogic, renderState } from "./game.ts";

describe("Game Logic", () => {
  it("should process commands correctly", () => {
    const game = createGameLogic();
    const state = game.handleCommand("attack guard");

    assert(state.npcs.guard.health < 30, "Guard took damage");
  });
});

describe("Visual Layer", () => {
  beforeEach(() => {
    mockRenderer.reset();
    installMockRenderer();
  });

  it("should render without errors", () => {
    const state = { player: { health: 100 }, npcs: { guard: { health: 30 } } };
    renderState(state);

    mockRenderer.assertNoErrors();
  });

  it("should use correct API signatures", () => {
    const state = { player: { health: 100 } };
    renderState(state);

    const rectCalls = mockRenderer.getCalls("drawRect");
    assert(rectCalls.length > 0, "drawRect was called");

    const textCalls = mockRenderer.getCalls("drawText");
    assert(textCalls.length > 0, "drawText was called");
  });
});
```

## Best Practices

1. **Separate Logic from Rendering**
   - Game logic = pure functions (fully tested)
   - Rendering = thin layer (validated with mocks)

2. **Use Explicit Floats**
   - Always use `.0` suffix: `10.0` not `10`
   - V8 requires explicit f32 types

3. **Test Visual Code**
   - Use `mockRenderer` in tests
   - Call `assertNoErrors()` after rendering
   - Check that APIs are called correctly

4. **Validate in Development**
   - Use `validateRectParams()`, `validateTextOptions()`
   - Catch errors before they reach V8
   - Remove validation in production if needed

5. **Follow API Signatures**
   - Check docs for correct parameter order
   - Don't pass objects where separate params expected
   - Use correct color range (0.0-1.0)

## Summary

**Visual code needs validation just like game logic.**

- ✅ Game logic → Unit tests (headless)
- ✅ Visual code → Mock renderer tests
- ✅ API calls → Runtime validation
- ✅ Both → CI passes, game works!
