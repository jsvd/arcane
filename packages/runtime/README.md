# @arcane-engine/runtime

TypeScript runtime for Arcane — a code-first, test-native, agent-native 2D game engine.

## Installation

```bash
npm install @arcane-engine/runtime
```

**Note:** You also need the Arcane CLI:
```bash
cargo install arcane-engine
```

## Quick Example

```typescript
import { onFrame, drawSprite, createSolidTexture, setCamera, getViewportSize } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";

const TEX = createSolidTexture("player", rgb(60, 180, 255));
const { width: VPW, height: VPH } = getViewportSize();

onFrame(() => {
  setCamera(VPW / 2, VPH / 2); // (0,0) = top-left
  drawSprite({ textureId: TEX, x: 100, y: 100, w: 32, h: 32, layer: 1 });
});
```

> **Note:** Code imports use `@arcane/runtime/{module}` (mapped via tsconfig paths to `@arcane-engine/runtime`). The Arcane CLI scaffolds this automatically.

## Modules

`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `scenes`, `persistence`, `procgen`, `agent`, `testing`

## Documentation

- [Architecture](https://github.com/jsvd/arcane/blob/main/docs/architecture.md)
- [Demos](https://github.com/jsvd/arcane/tree/main/demos)

## License

Apache 2.0
