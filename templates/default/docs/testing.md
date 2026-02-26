# Testing

## Test Harness

Tests use `describe`/`it`/`assert` from `@arcane/runtime/testing`. They run in both Node.js and V8.

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";

describe("combat", () => {
  it("damage reduces HP", () => {
    const state = applyDamage({ hp: 100 }, 25);
    assert.equal(state.hp, 75);
  });
});
```

Run tests:
```bash
arcane test           # discovers and runs all *.test.ts files headlessly
```

## Property-Based Testing

Verify game logic invariants across randomly generated input sequences. The engine generates random `InputFrame`s (key presses, mouse clicks), feeds them through your update function, and checks invariants hold at every frame. Failing cases are automatically shrunk.

```typescript
import { describe, it } from "@arcane/runtime/testing";
import { assertProperty, randomKeys } from "@arcane/runtime/testing";

describe("combat math", () => {
  it("HP never goes negative", () => {
    assertProperty({
      name: "hp-non-negative",
      seed: 42,
      numRuns: 50,
      framesPerRun: 100,
      initialState: { hp: 100, maxHp: 100 },
      generator: randomKeys(["Space", "a", "d"]),
      update: (state, input, dt) => gameUpdate(state, input, dt),
      invariant: (state) => state.hp >= 0,
    });
  });
});
```

## Visual Testing (Draw Call Capture)

Test rendering output without a GPU. Captures draw call intent as structured data.

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import {
  enableDrawCallCapture, disableDrawCallCapture,
  getDrawCalls, clearDrawCalls, findDrawCalls,
  assertSpriteDrawn, assertTextDrawn, assertDrawCallCount,
  assertNothingDrawnAt, assertLayerHasDrawCalls, assertScreenSpaceDrawn,
  getDrawCallSummary,
} from "@arcane/runtime/testing";
import { drawSprite, drawText } from "@arcane/runtime/rendering";
import { drawBar } from "@arcane/runtime/ui";

describe("HUD rendering", () => {
  it("shows health bar when player is damaged", () => {
    enableDrawCallCapture();

    const state = { hp: 5, maxHp: 10 };
    renderHUD(state);

    assertTextDrawn("HP");
    const bars = findDrawCalls({ type: "bar" });
    assert.equal(bars.length, 1);
    if (bars[0].type === "bar") {
      assert.equal(bars[0].fillRatio, 0.5);
    }

    disableDrawCallCapture();
  });
});
```

### Capture API

```typescript
enableDrawCallCapture();           // start capturing
disableDrawCallCapture();          // stop capturing

getDrawCalls();                    // all draw calls this frame
getDrawCallSummary();              // { total: 4, sprite: 2, text: 1, bar: 1 }
clearDrawCalls();                  // reset between frames

findDrawCalls({ type: "sprite" });               // filter by type
findDrawCalls({ type: "text", screenSpace: true }); // filter by property
findDrawCalls({ x: 100, y: 200 });               // filter by position

assertSpriteDrawn({ textureId: 1 });
assertTextDrawn("HP: 10");
assertDrawCallCount("sprite", 2);
assertNothingDrawnAt(500, 500);
assertLayerHasDrawCalls(1);
assertScreenSpaceDrawn("text");
```

When a visual assertion fails, use `getDrawCallSummary()` or `getDrawCalls()` to dump the full frame for inspection.
