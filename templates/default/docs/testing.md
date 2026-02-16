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

Verify invariants across randomly generated inputs with automatic shrinking:

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { checkProperty, assertProperty, integer, float, array, oneOf, record } from "@arcane/runtime/testing";

describe("combat math", () => {
  it("damage is never negative", () => {
    assertProperty(
      [integer(1, 100), integer(0, 50)],
      ([attack, defense]) => calculateDamage(attack, defense) >= 0,
    );
  });

  it("healing does not exceed max HP", () => {
    const result = checkProperty(
      [integer(1, 100), integer(1, 100), integer(1, 50)],
      ([current, max, heal]) => {
        const result = applyHealing(current, max, heal);
        return result >= current && result <= max;
      },
      { iterations: 500 },
    );
    assert.ok(result.passed, result.failureMessage);
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
