# Visual Testing Foundation - Making Games That Actually Work

## The Problem We Solved

**Before:** Game logic tests pass ✅, but game crashes on render ❌

```
$ cargo run -- test
✅ 135/135 validation checks passed

$ cargo run -- dev game.ts
❌ Error: TypeError: expected f32
```

**Why?**
- Tests run **headless** (no rendering)
- Visual APIs **not validated** in tests
- Type errors appear **at runtime only**

## Foundational Components Added

### 1. Mock Renderer (`runtime/testing/mock-renderer.ts`)

**Purpose:** Test visual code without GPU

**What it does:**
- Intercepts all rendering calls (`drawSprite`, `drawText`, `drawRect`)
- Validates parameter types and value ranges
- Tracks call history for assertions
- Reports errors clearly

**Example:**
```typescript
import { mockRenderer, installMockRenderer } from "arcane/testing/mock-renderer.ts";

describe("Visual Tests", () => {
  beforeEach(() => {
    mockRenderer.reset();
    installMockRenderer();
  });

  it("should render HUD", () => {
    drawText("HP: 100", { x: 10.0, y: 10.0, size: 16.0, color: { r: 1.0, g: 1.0, b: 1.0 } });

    mockRenderer.assertNoErrors();  // ✅ Validates call
    mockRenderer.assertCalled("drawText", 1);
  });

  it("should catch wrong API usage", () => {
    // Wrong: drawRect takes separate params, not object
    drawRect({ x: 0, y: 0, width: 100, height: 100 });

    assert(mockRenderer.hasErrors());  // ✅ Caught!
  });
});
```

**Benefits for AI Agents:**
- ✅ Tests catch rendering errors **before** running game
- ✅ Clear error messages: "drawRect: color.r must be 0.0-1.0, got 255"
- ✅ No GPU needed for CI/testing
- ✅ Fast feedback loop

### 2. Runtime Validation (`runtime/rendering/validate.ts`)

**Purpose:** Catch errors at call site in development

**What it does:**
- Provides validation functions for each API
- Throws errors with clear messages
- Can be stripped in production

**Example:**
```typescript
import { validateRectParams } from "arcane/rendering/validate.ts";

function renderGame(state: GameState) {
  const x = 10.0, y = 20.0, w = 100.0, h = 50.0;
  const opts = { color: { r: 0.5, g: 0.5, b: 0.5 } };

  // Validate before calling (dev mode)
  validateRectParams(x, y, w, h, opts);

  drawRect(x, y, w, h, opts);
}
```

**Benefits for AI Agents:**
- ✅ Errors caught **immediately** at call site
- ✅ Stack traces point to exact problem
- ✅ Can validate generated code before running
- ✅ Self-documenting (shows correct usage)

### 3. Visual Testing Guide (`docs/visual-testing.md`)

**Purpose:** Complete reference for testing visual code

**What it includes:**
- API cheat sheet (correct signatures)
- Common mistakes and fixes
- Game template with tests
- Best practices

**Benefits for AI Agents:**
- ✅ Clear examples of correct usage
- ✅ Shows common pitfalls to avoid
- ✅ Template to follow
- ✅ Single source of truth

### 4. Updated Engineering Philosophy

**Added:** "Visual Code Needs Testing Too" principle

**What it covers:**
- Why visual code must be tested
- Three-layer validation strategy
- Architecture pattern (logic vs rendering)
- Integration with existing principles

**Benefits for AI Agents:**
- ✅ Understand **why** this matters
- ✅ Know **when** to test visual code
- ✅ Follow established **patterns**
- ✅ Maintain consistency with project values

## How This Helps Game Designers (AI & Human)

### Before (Common Failure Mode)

```typescript
// Agent writes game
function renderGame(state) {
  // Wrong API signature
  drawRect({ x: 0, y: 0, width: 800, height: 600 });

  // Wrong color range
  drawText("Hello", { x: 10, y: 10, size: 16, color: { r: 255, g: 255, b: 255 } });
}

// Tests pass (headless)
$ npm test
✅ All tests passed!

// Game crashes (visual)
$ npm run dev
❌ TypeError: expected f32
```

**Problem:** Tests don't validate visual code

### After (Protected by Foundation)

```typescript
// game.test.ts
import { mockRenderer, installMockRenderer } from "arcane/testing/mock-renderer.ts";

describe("Visual Layer", () => {
  beforeEach(() => {
    mockRenderer.reset();
    installMockRenderer();
  });

  it("should render without errors", () => {
    renderGame({ player: { health: 100 } });

    mockRenderer.assertNoErrors();  // ✅ Catches both errors!
  });
});

// Tests fail (catches errors)
$ npm test
❌ Rendering errors found:
  - drawRect: x must be number, got object
  - drawText: color.r must be 0.0-1.0, got 255
```

**Solution:** Tests validate visual code too

### What AI Agents Get

1. **Immediate Feedback**
   - Errors caught in tests, not at runtime
   - Clear messages about what's wrong
   - Examples of correct usage

2. **Validated Patterns**
   - Game template shows correct structure
   - Separate logic from rendering
   - Both layers properly tested

3. **Self-Documenting Code**
   - Validation functions show correct types
   - Error messages explain requirements
   - Tests demonstrate usage

4. **Confidence**
   - If tests pass, visual code works
   - No surprises at runtime
   - Incremental development validated

## Architecture: The Pit of Success

**Goal:** Make it easier to do the right thing than the wrong thing

### Pattern: Separate Logic from Rendering

```typescript
// game-logic.ts (100% tested, no rendering)
export function createGameEngine() {
  const store = createStore(initialState);

  return {
    getState: () => store.getState(),
    handleCommand: (cmd: string) => {
      const newState = processCommand(store.getState(), cmd);
      store.replaceState(newState);
      return newState;
    }
  };
}

// game-visual.ts (thin layer, validated)
export function createVisualLayer(engine: GameEngine) {
  onFrame(() => {
    const state = engine.getState();
    renderState(state);  // Only rendering, no logic
  });
}

function renderState(state: GameState) {
  // Clear background
  drawRect(0.0, 0.0, 800.0, 600.0, { color: { r: 0.0, g: 0.0, b: 0.0 } });

  // Render HUD
  drawText(`HP: ${state.player.health}`, {
    x: 10.0,
    y: 10.0,
    size: 16.0,
    color: { r: 1.0, g: 1.0, b: 1.0 }
  });
}

// game-logic.test.ts (tests pure functions)
describe("Game Logic", () => {
  it("should process commands", () => {
    const engine = createGameEngine();
    const state = engine.handleCommand("attack guard");

    assert(state.npcs.guard.health < 30);
  });
});

// game-visual.test.ts (tests rendering)
describe("Visual Layer", () => {
  it("should render without errors", () => {
    mockRenderer.reset();
    installMockRenderer();

    renderState({ player: { health: 100 } });

    mockRenderer.assertNoErrors();
    mockRenderer.assertCalled("drawRect", 1);
    mockRenderer.assertCalled("drawText", 1);
  });
});
```

**Why This Works:**
1. **Logic tests** validate game behavior (headless, fast)
2. **Visual tests** validate rendering (mock, fast)
3. **Both pass** = game works in production
4. **Clear separation** = easy to understand and maintain

## Checklist for Game Developers

When creating a game with visual rendering:

- [ ] Separate game logic from rendering
- [ ] Write unit tests for game logic (headless)
- [ ] Write visual tests using mock renderer
- [ ] Use explicit floats (`.0` suffix)
- [ ] Use correct API signatures
- [ ] Use 0.0-1.0 range for colors
- [ ] Add runtime validation in development
- [ ] Run tests before running game
- [ ] Check `mockRenderer.assertNoErrors()`

## Summary

**Before:** Tests don't catch visual errors → game crashes at runtime

**After:** Visual code is tested → errors caught in tests → games work

**Foundational Components:**
1. ✅ Mock Renderer - test without GPU
2. ✅ Runtime Validation - catch errors early
3. ✅ Visual Testing Guide - clear examples
4. ✅ Engineering Philosophy - established principles

**Result:** AI agents (and humans) can confidently create games that work the first time they run visually, because visual code is tested just like game logic.

**The Goal:** Make it impossible to write untested visual code that crashes at runtime.
