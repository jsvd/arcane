# @arcane-engine/create

Scaffolding tool for creating new Arcane game projects.

## Usage

```bash
npm create @arcane-engine/game my-game
cd my-game
npm install
arcane dev
```

This creates a new Arcane project with:
- `package.json` with @arcane-engine/runtime dependency
- `tsconfig.json` for TypeScript (with `@arcane/runtime` → `@arcane-engine/runtime` path mapping)
- `src/game.ts` for pure game logic
- `src/visual.ts` for rendering (entry point)
- `AGENTS.md` with LLM development guide
- `types/arcane.d.ts` with full API declarations
- `README.md` with usage instructions

## Prerequisites

The Arcane CLI must be installed:

```bash
cargo install arcane-engine
```

Or build from source:

```bash
git clone https://github.com/jsvd/arcane.git
cd arcane
cargo build --release
export PATH="$PATH:$(pwd)/target/release"
```

## What This Does

`@arcane-engine/create` is a thin wrapper around `arcane new <name>`. It's provided for npm ecosystem ergonomics:

```bash
# These are equivalent:
npm create @arcane-engine/game my-game
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

## Next Steps

- [Architecture](https://github.com/jsvd/arcane/blob/main/docs/architecture.md)
- [Documentation](https://github.com/jsvd/arcane/blob/main/docs/)
- [Demos](https://github.com/jsvd/arcane/tree/main/demos/)

## License

Apache 2.0 — see [LICENSE](../../LICENSE)
