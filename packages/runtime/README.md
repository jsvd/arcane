# @arcane/runtime

TypeScript runtime for Arcane — a code-first, test-native, agent-native 2D game engine.

## Installation

```bash
npm install @arcane/runtime
```

**Note:** You also need the Arcane CLI:
```bash
cargo install arcane-cli
```

## Quick Example

```typescript
import { createStore } from "@arcane/runtime/state";
import { onFrame, drawSprite } from "@arcane/runtime/rendering";

const store = createStore({ player: { x: 0, y: 0 } });

onFrame(() => {
  const state = store.getState();
  drawSprite("player", state.player.x, state.player.y, { width: 32, height: 32 });
});
```

## Documentation

- [Getting Started](https://github.com/anthropics/arcane/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/anthropics/arcane/blob/main/docs/api-reference.md)
- [Examples](https://github.com/anthropics/arcane/tree/main/examples)

## License

Apache 2.0
