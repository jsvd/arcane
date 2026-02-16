---
name: api
description: Look up Arcane API declarations by module or function name. Usage: /api rendering drawSprite, /api physics, /api createGame
allowed-tools: Read, Grep, Glob
---

Look up Arcane engine API declarations from the per-module type files in `types/`.

## Available Modules

rendering, game, input, ui, state, physics, tweening, particles, pathfinding, systems, scenes, persistence, procgen, agent, testing

## Steps

### Parse the argument

The user provides one of:
- **No argument** — list available modules and their file paths
- **Module name only** (e.g., `physics`) — show the full module declarations
- **Module + function/type** (e.g., `rendering drawSprite`) — show that specific declaration with its JSDoc
- **Function/type name only** (e.g., `createGame`) — search across all modules

### 1. No argument — list modules

Print the module list above with paths:
```
types/rendering.d.ts    — sprites, camera, tilemap, lighting, audio, animation, text, input
types/game.d.ts         — createGame, entities, HUD, collision events, widget helpers
types/input.d.ts        — action mapping, gamepad, touch
types/ui.d.ts           — buttons, sliders, toggles, text input, layout, focus
types/state.d.ts        — store, transactions, queries, observers, PRNG
types/physics.d.ts      — rigid bodies, constraints, queries, AABB
types/tweening.d.ts     — tweens, easing, chains (sequence/parallel/stagger)
types/particles.d.ts    — particle emitters
types/pathfinding.d.ts  — A* grid pathfinding, hex pathfinding
types/systems.d.ts      — system(), rule(), extend()
types/scenes.d.ts       — scene management, transitions
types/persistence.d.ts  — save/load, autosave, migrations
types/procgen.d.ts      — WFC, constraints, validation
types/agent.d.ts        — agent protocol, MCP tools
types/testing.d.ts      — test harness, property testing, replay, draw call capture
```

### 2. Module name only — show full declarations

If the file is under 500 lines, read the entire file:
```
Read types/{module}.d.ts
```

If the file is large (500+ lines), summarize the exports by grepping for `export` declarations:
```
Grep pattern="^export " in types/{module}.d.ts
```
Then ask the user if they want a specific function or the full file.

### 3. Module + function/type — show specific declaration

Search for the function or type within the module file:
```
Grep pattern="(function|interface|type|const|class) {name}" in types/{module}.d.ts
```

Show the JSDoc comment block above the match plus the full declaration (including closing brace for interfaces). Use 15 lines of context before the match to capture the JSDoc, and enough lines after to show the full signature or interface body.

### 4. Function/type name only — search all modules

Search across all type files:
```
Grep pattern="(function|interface|type|const|class) {name}" in types/*.d.ts
```

Show which module contains the match, then display the JSDoc + declaration as in step 3.

## Output Format

Always show:
1. The module name and file path
2. The JSDoc comment (if present)
3. The full function signature or type/interface declaration
