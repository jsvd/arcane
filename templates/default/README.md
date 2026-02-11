# {{PROJECT_NAME}}

A 2D game built with [Arcane](https://github.com/anthropics/arcane) — an agent-native game engine.

## Getting Started

```bash
# Run development server with hot-reload
arcane dev

# Run tests
arcane test
```

## Project Structure

```
{{PROJECT_NAME}}/
├── AGENTS.md             # LLM development guide (start here if using AI)
├── types/
│   └── arcane.d.ts       # Full API reference with JSDoc
├── src/
│   ├── game.ts           # Pure game logic (state in, state out)
│   ├── game.test.ts      # Tests for game logic
│   └── visual.ts         # Rendering and input handling
├── package.json
├── tsconfig.json
└── README.md
```

## Development

- `arcane dev` — Opens a window with your game. Hot-reloads on save.
- `arcane test` — Discovers and runs `*.test.ts` files headlessly.
- `arcane add <recipe>` — Adds pre-built game systems (e.g., `turn-based-combat`).

### Agent Protocol

Query your game state using the agent protocol:

```bash
arcane describe src/visual.ts        # Text description
arcane inspect src/visual.ts "player" # Query specific state
arcane dev --inspector 4321          # HTTP inspector
```

## Game Assets

Arcane includes built-in commands for discovering and downloading free game assets:

```bash
arcane assets list                    # Browse all 25 free asset packs
arcane assets search "dungeon"        # Search by keyword
arcane assets download tiny-dungeon   # Download and extract to ./assets/
```

All packs are from [Kenney.nl](https://kenney.nl) (CC0 public domain, no attribution required).

## For LLMs

Read `AGENTS.md` for architecture patterns, game loop examples, and API usage.
The complete API with JSDoc is in `types/arcane.d.ts`.
