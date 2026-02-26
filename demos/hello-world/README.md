# demos/hello-world

A 2D game built with [Arcane](https://github.com/jsvd/arcane) - an agent-native game engine.

## Getting Started

```bash
# Run development server with hot-reload
arcane dev

# Run tests
arcane test
```

## Project Structure

```
demos/hello-world/
├── src/
│   ├── game.ts      # Pure game logic (state in, state out)
│   └── visual.ts    # Rendering and input handling
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Running the Game

```bash
arcane dev
```

Opens a window with your game. Changes to `src/visual.ts` trigger hot-reload.

### Agent Protocol

Query your game state using the agent protocol:

```bash
# Get text description
arcane describe src/visual.ts

# Query specific state path
arcane inspect src/visual.ts "rng.seed"

# With HTTP inspector
arcane dev --inspector 4321
curl http://localhost:4321/describe
```

## Next Steps

- Read the [Arcane docs](https://github.com/jsvd/arcane/tree/main/docs)
- Explore [example projects](https://github.com/jsvd/arcane/tree/main/demos)
- Add [recipes](https://github.com/jsvd/arcane/tree/main/recipes) with `arcane add <recipe-name>`

## Learn More

- [Architecture](https://github.com/jsvd/arcane/blob/main/docs/architecture.md)
- [Recipe Guide](https://github.com/jsvd/arcane/blob/main/docs/recipe-guide.md)
- [Demos](https://github.com/jsvd/arcane/tree/main/demos/)
