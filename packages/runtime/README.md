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

- [Architecture](https://github.com/anthropics/arcane/blob/main/docs/architecture.md)
- [Demos](https://github.com/anthropics/arcane/tree/main/demos)

## License

Apache 2.0
