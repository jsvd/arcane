# @arcane/create

Scaffolding tool for creating new Arcane game projects.

## Usage

```bash
npm create @arcane/game my-game
cd my-game
npm install
arcane dev
```

This creates a new Arcane project with:
- `package.json` with @arcane/runtime dependency
- `tsconfig.json` for TypeScript
- `src/game.ts` for pure game logic
- `src/visual.ts` for rendering (entry point)
- `README.md` with usage instructions

## Prerequisites

The Arcane CLI must be installed:

```bash
cargo install arcane-cli
```

Or build from source:

```bash
git clone https://github.com/anthropics/arcane.git
cd arcane
cargo build --release
export PATH="$PATH:$(pwd)/target/release"
```

## What This Does

`@arcane/create` is a thin wrapper around `arcane new <name>`. It's provided for npm ecosystem ergonomics:

```bash
# These are equivalent:
npm create @arcane/game my-game
arcane new my-game
```

## After Creation

1. **Install dependencies:**
   ```bash
   cd my-game
   npm install
   ```

2. **Run with hot-reload:**
   ```bash
   arcane dev
   ```

3. **Run tests:**
   ```bash
   arcane test
   ```

4. **Add recipes:**
   ```bash
   arcane add turn-based-combat
   ```

## Next Steps

- [Getting Started Guide](https://github.com/anthropics/arcane/blob/main/docs/getting-started.md)
- [Tutorials](https://github.com/anthropics/arcane/blob/main/docs/)
- [API Reference](https://github.com/anthropics/arcane/blob/main/docs/api-reference.md)
- [Examples](https://github.com/anthropics/arcane/tree/main/examples/)

## License

Apache 2.0 — see [LICENSE](../../LICENSE)
