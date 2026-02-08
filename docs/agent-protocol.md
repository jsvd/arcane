# Agent Protocol

The agent protocol is how AI coding agents interact with Arcane during development. It's built into the engine, not bolted on afterward.

## Design Philosophy

Most game engines treat tooling as an afterthought — debug consoles, profilers, inspectors added late. Arcane treats agent interaction as a primary interface, equal to the renderer.

The protocol is split between:
- **Headless** (pure TS, instant, for logic) — 90% of agent work
- **Visual** (Rust engine, for rendering verification) — only when visuals matter

## Configuration

```typescript
// arcane.config.ts
export default {
  agent: {
    repl: true,                    // Expose a REPL agents can pipe commands into
    snapshotOnError: true,         // Auto-snapshot state on every error
    inspectorPort: 4321,           // Game state as queryable API on localhost
  }
}
```

## CLI Commands

The `arcane` CLI provides agent-friendly commands:

```bash
# Text description of current game state
arcane describe
# → "Combat phase. Player's turn. 2 goblins remaining..."

# Inspect specific state path
arcane inspect combat.turnOrder
# → ["player", "goblin_1", "goblin_2"]

# Screenshot from the actual renderer
arcane screenshot --path /tmp/frame.png

# Run all tests (headless, no engine boot)
arcane test

# Run tests matching a pattern
arcane test --filter "combat*"

# Start dev server with hot reload and agent protocol
arcane dev

# Create a new project from template
arcane create my-game --template rpg
```

## HTTP Inspector API

When the game is running in dev mode (`arcane dev`), an HTTP API exposes game state:

```bash
# Query live game state
curl localhost:4321/state/combat
# → { "phase": "player-turn", "currentActor": "player", ... }

# Query specific state paths
curl localhost:4321/state/party.0.hp
# → { "current": 15, "max": 20 }

# Execute an action
curl -X POST localhost:4321/action \
  -d '{"type": "attack", "target": "goblin_1"}'
# → { "result": "hit", "damage": 7, "targetHp": 1 }

# Get a text description of the game
curl localhost:4321/describe
# → "A 60x40 dungeon room. Player (warrior) at [5,3] facing east.
#    2 goblins visible: one at [7,4] (wounded, 3/8 HP), one at [9,2] (full HP).
#    Fog obscures the eastern half. HP 15/20, AC 16, 3 spell slots remaining."

# Rewind to a previous state
curl -X POST localhost:4321/rewind -d '{"turn": 3}'

# Run a "what if" without mutating real state
curl -X POST localhost:4321/simulate \
  -d '{"actions": [{"type": "attack", "target": "goblin_1"}]}'
# → { "outcome": { "hit": true, "damage": 5 }, "stateAfter": {...} }

# List available actions for current actor
curl localhost:4321/actions
# → ["attack", "cast", "defend", "flee", "use-item"]
```

## Text Description Renderer

The killer feature for AI agents. A renderer that outputs natural language instead of pixels:

```
"A 60x40 dungeon room. Player (warrior) at [5,3] facing east.
 2 goblins visible: one at [7,4] (wounded, 3/8 HP), one at [9,2] (full HP).
 Fog obscures the eastern half of the room.
 HUD shows: HP 15/20, AC 16, 3 spell slots remaining.
 Door to the north (locked). Treasure chest at [12,7] (closed).
 Turn 5, round 2 of combat."
```

Claude can "see" the game by reading text. No screenshots needed. No vision API latency. The description renderer is configurable — game developers define what matters for their game:

```typescript
descriptionRenderer({
  include: ['entities', 'terrain', 'hud', 'combat-state'],
  verbosity: 'detailed',  // or 'summary', 'minimal'
  perspective: 'player',  // what the player character can see
})
```

## Headless Game Logic Execution

Game logic runs WITHOUT the engine — pure TypeScript, runs in Node, no Rust, no GPU, no window:

```typescript
import { createGame, step, query } from '@arcane/runtime'
import { BFRPGCombat } from './systems/combat'

const game = createGame({
  systems: [BFRPGCombat],
  state: {
    party: [createCharacter({ class: 'fighter', level: 3 })],
    dungeon: loadDungeon('crypt_of_the_goblin_king'),
  },
})

const next = step(game, { action: 'move', direction: 'north' })
const enemies = query(next, 'entities.hostile.alive')
```

This is what makes agent iteration fast. No engine boot. No window. No GPU. Just logic.

## Headless Test Renderer

For assertions about what *would* be rendered:

```typescript
const frame = headlessRenderer.capture(state)
expect(frame.entityAt(5, 3)).toEqual({ id: 'player', sprite: 'warrior' })
expect(frame.visibleEnemies()).toHaveLength(2)
expect(frame.uiElement('hp-bar').value).toBe(15)
```

## Hot-Reload Workflow

Change any TypeScript file → game reloads in sub-second with the **same state preserved**. Not "restarts from beginning" — actually preserves exact game state across reloads.

This enables the agent workflow loop:

1. Write game logic
2. Hot reload (sub-second)
3. Query game state via the agent protocol
4. "See" the result via the text description renderer
5. Run tests (headless, instant)
6. Fix issues
7. Loop

## REPL Mode

Agents can pipe commands directly into a REPL:

```typescript
// Direct state manipulation for debugging
> state.party[0].hp = 1
> step(state, { action: 'heal', target: 'player' })
> describe(state)
"Player healed to 8/20 HP. Combat continues..."
```

## Error Snapshots

When `snapshotOnError` is enabled, every runtime error automatically captures:
- Full state tree at the moment of error
- The action/event that triggered it
- Stack trace
- A text description of the game state

This gives the agent everything it needs to reproduce and fix bugs without interactive debugging.
