# Screen Transitions

Visual effects for scene or level changes. Use these instead of hand-rolling fade overlays with manual timers and fullscreen rectangles.

**Always call `updateScreenTransition(dt)` and `drawScreenTransition()` in your frame loop** — they're no-ops when no transition is active.

## Five Built-in Patterns

- `"fade"` — alpha fade to/from a solid color
- `"wipe"` — horizontal sweep from left to right
- `"circleIris"` — expanding/contracting circle from center
- `"diamond"` — diamond-shaped iris
- `"pixelate"` — increasing pixel size that obscures the image

## Basic Usage

```typescript
import {
  startScreenTransition, updateScreenTransition,
  drawScreenTransition, isScreenTransitionActive,
} from "@arcane/runtime/rendering";

// Trigger transition — callback runs at midpoint (when screen is fully covered)
startScreenTransition("circleIris", 0.6, { color: { r: 0, g: 0, b: 0 } },
  () => { currentScene = "gameplay"; },  // runs at midpoint — swap state here
  () => { console.log("done"); },         // runs when transition finishes
);

// In onFrame (always call, no-op if inactive):
updateScreenTransition(dt);
drawScreenTransition();
```

## Level Transition Pattern

```typescript
function goToNextLevel() {
  startScreenTransition("fade", 0.8, { color: { r: 0, g: 0, b: 0 } },
    () => {
      // This runs when the screen is fully black — swap the level here
      state = generateLevel(state.level + 1);
    },
  );
}

// In game logic — trigger on portal contact:
if (touchingPortal) {
  goToNextLevel();
}
```

## Avoiding Stale Closures

The midpoint callback fires asynchronously — state may change between when you start the transition and when the callback runs (especially under hot-reload). Capture values at call time:

```typescript
// BAD — state.level may have changed by the time midpoint fires
startScreenTransition("fade", 0.5, {}, () => {
  state = loadLevel(state.level + 1);  // stale reference
});

// GOOD — capture the value upfront
const nextLevel = state.level + 1;
startScreenTransition("fade", 0.5, {}, () => {
  state = loadLevel(nextLevel);
});
```

## With Scene Manager

Transitions integrate with the scene manager automatically:

```typescript
import { replaceScene } from "@arcane/runtime/scenes";

replaceScene("gameplay", {
  transition: { type: "diamond", duration: 0.5, color: { r: 0, g: 0, b: 0 } },
});
```
