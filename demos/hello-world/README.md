# demos/hello-world

A 2D game built with [Arcane](https://github.com/anthropics/arcane) - an agent-native game engine.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server with hot-reload
npm run dev

# Run tests
npm run test
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

- Read the [Arcane docs](https://github.com/anthropics/arcane/tree/main/docs)
- Explore [example projects](https://github.com/anthropics/arcane/tree/main/demos)
- Add [recipes](https://github.com/anthropics/arcane/tree/main/recipes) with `arcane add <recipe-name>`

## Learn More

- [Getting Started Guide](https://github.com/anthropics/arcane/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/anthropics/arcane/blob/main/docs/api-reference.md)
- [Recipe Guide](https://github.com/anthropics/arcane/blob/main/docs/recipe-guide.md)
