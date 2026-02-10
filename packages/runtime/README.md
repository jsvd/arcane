# @arcane/runtime

> Agent-native 2D game engine runtime

TypeScript APIs for building 2D games with agent-first design. Pure functional game logic, powerful state management, and built-in agent protocol for AI-assisted development.

## Installation

```bash
npm install @arcane/runtime
```

## Quick Start

```typescript
import { onFrame, drawSprite, setCamera } from "@arcane/runtime";

let x = 0;

onFrame((dt) => {
  x += 100 * dt; // Move 100 pixels per second

  setCamera(0, 0, 4.0);
  drawSprite({
    textureId: 1,
    x, y: 0,
    w: 32, h: 32
  });
});
```

## Features

- **Pure Functional State** - State in, state out. All game logic is pure functions
- **Transactions & Diffs** - Atomic state updates with automatic diff computation
- **Deterministic PRNG** - Seeded random number generation for reproducible gameplay
- **Agent Protocol** - Built-in support for AI agent interaction
- **Recipe System** - Composable game system patterns
- **Headless Testing** - All game logic runs without rendering

## Modules

### State Management
```typescript
import { createStore, transaction, query } from "@arcane/runtime/state";
```

### Rendering
```typescript
import { onFrame, drawSprite, setCamera } from "@arcane/runtime/rendering";
```

### UI
```typescript
import { drawPanel, drawBar, drawLabel } from "@arcane/runtime/ui";
```

### Physics
```typescript
import { aabbOverlap, circleAABBOverlap } from "@arcane/runtime/physics";
```

### Pathfinding
```typescript
import { findPath } from "@arcane/runtime/pathfinding";
```

### Systems & Recipes
```typescript
import { system, rule, applyRule, extend } from "@arcane/runtime/systems";
```

### Agent Protocol
```typescript
import { registerAgent } from "@arcane/runtime/agent";
```

## Documentation

- [Getting Started](https://github.com/anthropics/arcane/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/anthropics/arcane/blob/main/docs/api-reference.md)
- [Recipe Guide](https://github.com/anthropics/arcane/blob/main/docs/recipe-guide.md)

## License

Apache-2.0
