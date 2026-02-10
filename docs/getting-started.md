# Getting Started with Arcane

> **Note:** Arcane is currently in Phase 7 (distribution). To use it, you need to build from source. Full npm/crates.io publishing coming soon!

## Installation (From Source)

### Prerequisites

- Rust 1.70+ (`rustup update`)
- Node.js 18+
- npm or pnpm

### Build Arcane CLI

```bash
git clone https://github.com/anthropics/arcane.git
cd arcane
cargo build --release

# The `arcane` binary is now at: target/release/arcane
# Optionally add to PATH or use full path
```

## Create Your First Game

### 1. Create a New Project

```bash
# Using the arcane binary you just built
./target/release/arcane new my-game
cd my-game
```

This creates:
```
my-game/
├── package.json      # @arcane/runtime dependency
├── tsconfig.json     # TypeScript configuration
├── src/
│   ├── game.ts      # Pure game logic
│   └── visual.ts    # Rendering layer (entry point)
└── README.md
```

### 2. Install Dependencies

**Current workaround:** The `@arcane/runtime` package isn't published yet, so link to the engine repo:

```bash
# In the arcane engine repo
cd packages/runtime
npm link

# In your game project
cd my-game
npm link @arcane/runtime
npm install
```

**After Phase 7 publishing:** Just run `npm install`

### 3. Run Your Game

```bash
# From your game directory
arcane dev
```

A window opens with:
- A blue square at the center
- "Hello, Arcane!" text

Press `Cmd+Q` (Mac) or close the window to exit.

## Project Structure

### `src/game.ts` - Pure Game Logic

All game logic should be **pure functions**: state in, state out.

```typescript
import { seed } from "@arcane/runtime/state";
import type { PRNGState } from "@arcane/runtime/state";

export type GameState = {
  rng: PRNGState;
  score: number;
};

export function createGame(seedValue: number): GameState {
  return {
    rng: seed(seedValue),
    score: 0,
  };
}

export function incrementScore(state: GameState): GameState {
  return {
    ...state,
    score: state.score + 1,
  };
}
```

### `src/visual.ts` - Rendering Layer

The entry point for `arcane dev`. Handles rendering and input.

```typescript
import { onFrame, drawSprite, setCamera } from "@arcane/runtime/rendering";
import { isKeyPressed } from "@arcane/runtime/rendering";
import { registerAgent } from "@arcane/runtime/agent";
import { createGame, incrementScore } from "./game.ts";

let state = createGame(42);

// Register agent protocol for debugging
registerAgent({
  name: "my-game",
  getState: () => state,
  setState: (s) => { state = s; },
});

// Game loop
onFrame((dt) => {
  // Handle input
  if (isKeyPressed(" ")) {
    state = incrementScore(state);
  }

  // Render
  setCamera(0, 0, 4.0);
  // ... your rendering code
});
```

## Development Workflow

### Hot Reload

Edit `src/visual.ts` and save - changes appear instantly without restarting.

**Note:** Only the visual layer hot-reloads. For `src/game.ts` changes, restart `arcane dev`.

### Type Checking

Type errors are caught automatically when you run `arcane dev`:

```
[type-check] Running TypeScript type checker...
[type-check] ✅ No type errors found
```

### Testing

Write tests in `*.test.ts` files:

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { createGame, incrementScore } from "./game.ts";

describe("Score", () => {
  it("increments by 1", () => {
    let state = createGame(42);
    state = incrementScore(state);
    assert.equal(state.score, 1);
  });
});
```

Run tests:
```bash
arcane test
```

### Agent Protocol

Query your game state while it's running:

```bash
# Get text description
arcane describe src/visual.ts

# Query specific path
arcane inspect src/visual.ts "score"

# HTTP inspector (in another terminal while game runs)
arcane dev --inspector 4321
curl http://localhost:4321/describe
curl http://localhost:4321/state/score
```

## Next Steps

- **Tutorial:** [Build Sokoban in 10 Minutes](tutorial-sokoban.md) *(coming soon)*
- **Recipes:** Add pre-built systems with `arcane add <recipe-name>`
- **Examples:** Check out `demos/` in the engine repo
- **API Reference:** [Full API Documentation](api-reference.md) *(coming soon)*

## Common Issues

### "Could not find template directory"

The `arcane new` command needs to find `templates/default/`. Ensure you're running the binary from the built location or that templates are installed alongside it.

### "@arcane/runtime not found"

The package isn't published yet. Use `npm link` as described above, or work directly in the `demos/` directory of the engine repo.

### "Type check failed"

Arcane uses strict TypeScript checking. Fix the reported type errors before the game will run. This prevents runtime errors!

## Getting Help

- **Issues:** https://github.com/anthropics/arcane/issues
- **Discussions:** https://github.com/anthropics/arcane/discussions
- **Documentation:** https://github.com/anthropics/arcane/tree/main/docs
