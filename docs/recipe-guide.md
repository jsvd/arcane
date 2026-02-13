# Recipe Guide: Building Reusable Game Systems

**Recipes** are plug-and-play game systems that you can add to any Arcane project. They're pure TypeScript modules with no runtime dependencies — just functions that transform state.

## What is a Recipe?

A recipe is:
- **A declarative system** using `system()` and `rule()`
- **Fully testable** — pure functions, state in/state out
- **Composable** — recipes can extend other recipes
- **Portable** — copy into any project with `arcane add`

Examples:
- `turn-based-combat` — Initiative, attack/defend, victory
- `inventory-equipment` — Items, stacking, weight, equipment slots
- `grid-movement` — Grid-based movement with pathfinding
- `fog-of-war` — 8-octant shadowcasting FOV

## Recipe Structure

```
recipes/my-recipe/
├── recipe.json          # Metadata
├── my-recipe.ts         # System definition
├── queries.ts           # State query helpers
├── my-recipe.test.ts    # Tests
└── index.ts             # Public API
```

### `recipe.json` — Metadata

```json
{
  "name": "my-recipe",
  "description": "A short description of what this recipe does",
  "version": "0.1.0",
  "files": [
    "my-recipe.ts",
    "queries.ts",
    "my-recipe.test.ts",
    "index.ts",
    "recipe.json"
  ]
}
```

## Building a Recipe: Health System

Let's build a simple health system with healing and damage.

### Step 1: Define Types

**`health-system.ts`:**

```typescript
import { system, rule, type Rule } from "@arcane/runtime/systems";

export type HealthState = {
  entities: {
    [id: string]: {
      hp: number;
      maxHp: number;
    };
  };
};

export type HealthRuleParams = {
  damage?: { target: string; amount: number };
  heal?: { target: string; amount: number };
  setMaxHp?: { target: string; maxHp: number };
};
```

### Step 2: Define Rules

```typescript
const damageRule = rule<HealthState, HealthRuleParams>("damage", (state, params) => {
  if (!params.damage) return state;

  const { target, amount } = params.damage;
  const entity = state.entities[target];
  if (!entity) return state;

  return {
    ...state,
    entities: {
      ...state.entities,
      [target]: {
        ...entity,
        hp: Math.max(0, entity.hp - amount),
      },
    },
  };
});

const healRule = rule<HealthState, HealthRuleParams>("heal", (state, params) => {
  if (!params.heal) return state;

  const { target, amount } = params.heal;
  const entity = state.entities[target];
  if (!entity) return state;

  return {
    ...state,
    entities: {
      ...state.entities,
      [target]: {
        ...entity,
        hp: Math.min(entity.maxHp, entity.hp + amount),
      },
    },
  };
});

const setMaxHpRule = rule<HealthState, HealthRuleParams>("setMaxHp", (state, params) => {
  if (!params.setMaxHp) return state;

  const { target, maxHp } = params.setMaxHp;
  const entity = state.entities[target];
  if (!entity) return state;

  return {
    ...state,
    entities: {
      ...state.entities,
      [target]: {
        ...entity,
        maxHp,
        hp: Math.min(entity.hp, maxHp), // clamp current HP
      },
    },
  };
});
```

### Step 3: Create the System

```typescript
export const HealthSystem = system<HealthState, HealthRuleParams>({
  rules: [damageRule, healRule, setMaxHpRule],
  queries: {
    // Helper functions for querying state
    getHp: (state: HealthState, id: string) => state.entities[id]?.hp ?? 0,
    getMaxHp: (state: HealthState, id: string) => state.entities[id]?.maxHp ?? 0,
    isAlive: (state: HealthState, id: string) => {
      const entity = state.entities[id];
      return entity ? entity.hp > 0 : false;
    },
    isDead: (state: HealthState, id: string) => {
      const entity = state.entities[id];
      return entity ? entity.hp <= 0 : false;
    },
  },
});
```

### Step 4: Add Tests

**`health-system.test.ts`:**

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { HealthSystem, type HealthState } from "./health-system.ts";

describe("HealthSystem", () => {
  it("applies damage", () => {
    const state: HealthState = {
      entities: {
        player: { hp: 10, maxHp: 10 },
      },
    };

    const next = HealthSystem.applyRule(state, "damage", {
      damage: { target: "player", amount: 3 },
    });

    assert.equal(next.entities.player.hp, 7);
  });

  it("heals up to maxHp", () => {
    const state: HealthState = {
      entities: {
        player: { hp: 5, maxHp: 10 },
      },
    };

    const next = HealthSystem.applyRule(state, "heal", {
      heal: { target: "player", amount: 10 },
    });

    assert.equal(next.entities.player.hp, 10); // capped at maxHp
  });

  it("queries isAlive correctly", () => {
    const state: HealthState = {
      entities: {
        alive: { hp: 5, maxHp: 10 },
        dead: { hp: 0, maxHp: 10 },
      },
    };

    assert.equal(HealthSystem.queries.isAlive(state, "alive"), true);
    assert.equal(HealthSystem.queries.isAlive(state, "dead"), false);
  });
});
```

### Step 5: Export Public API

**`index.ts`:**

```typescript
export { HealthSystem, type HealthState, type HealthRuleParams } from "./health-system.ts";
export * as HealthQueries from "./queries.ts";
```

### Step 6: Create recipe.json

```json
{
  "name": "health-system",
  "description": "Health, healing, and damage system",
  "version": "0.1.0",
  "files": [
    "health-system.ts",
    "health-system.test.ts",
    "index.ts",
    "recipe.json"
  ]
}
```

## Using Your Recipe

### In the Engine Repo

Place your recipe in `recipes/health-system/` and users can add it:

```bash
arcane add health-system
```

### In Your Game

```typescript
import { HealthSystem, type HealthState } from "./recipes/health-system/index.ts";

let state: HealthState = {
  entities: {
    player: { hp: 20, maxHp: 20 },
    goblin: { hp: 5, maxHp: 5 },
  },
};

// Apply damage
state = HealthSystem.applyRule(state, "damage", {
  damage: { target: "goblin", amount: 3 },
});

// Check if dead
if (HealthSystem.queries.isDead(state, "goblin")) {
  console.log("Goblin defeated!");
}
```

## Advanced: Extending Recipes

Recipes can extend other recipes using `extend()`:

```typescript
import { extend } from "@arcane/runtime/systems";
import { HealthSystem, type HealthState } from "./recipes/health-system/index.ts";

// Add regeneration to the health system
export const RegeneratingHealthSystem = extend(HealthSystem, {
  rules: [
    rule("regenerate", (state: HealthState, params: { target: string; amount: number }) => {
      const entity = state.entities[params.target];
      if (!entity || entity.hp >= entity.maxHp) return state;

      return {
        ...state,
        entities: {
          ...state.entities,
          [params.target]: {
            ...entity,
            hp: Math.min(entity.maxHp, entity.hp + params.amount),
          },
        },
      };
    }),
  ],
});
```

## Advanced: Composing State

Recipes define their own state shape. Compose them in your game:

```typescript
import { HealthSystem, type HealthState } from "./recipes/health-system/index.ts";
import { InventorySystem, type InventoryState } from "./recipes/inventory-equipment/index.ts";

type GameState = {
  health: HealthState;
  inventory: InventoryState;
  // ... other systems
};

let game: GameState = {
  health: {
    entities: {
      player: { hp: 20, maxHp: 20 },
    },
  },
  inventory: {
    slots: [],
  },
};

// Apply rules to subsections of state
game = {
  ...game,
  health: HealthSystem.applyRule(game.health, "damage", {
    damage: { target: "player", amount: 5 },
  }),
};
```

## Recipe Best Practices

### ✅ DO

- **Keep recipes focused** — one system, one responsibility
- **Use pure functions** — state in, state out, no side effects
- **Write comprehensive tests** — test every rule and query
- **Document parameters** — use TypeScript types and JSDoc comments
- **Provide examples** — show common usage in README or comments

### ❌ DON'T

- **Don't depend on other recipes** — keep them independent
- **Don't use global state** — everything goes through parameters
- **Don't add rendering code** — recipes are pure logic
- **Don't hardcode values** — make them configurable via parameters

## Recipe Ideas

Here are some recipe ideas to get you started:

### Easy
- **cooldown-system** — Track ability cooldowns
- **buff-debuff** — Temporary status effects
- **quest-tracker** — Quest progress and completion
- **dialogue-tree** — Branching conversation system

### Medium
- **crafting-system** — Recipe-based item crafting
- **skill-tree** — Unlockable abilities and upgrades
- **trading-system** — Buy/sell with NPCs
- **day-night-cycle** — Time of day affects gameplay

### Advanced
- **faction-reputation** — Track standing with multiple factions
- **procedural-loot** — Generate items with random stats
- **ai-behavior-tree** — Modular AI decision making
- **network-sync** — State synchronization for multiplayer

## Publishing Recipes

To share your recipe with the community:

1. Create a pull request to the Arcane repo adding it to `recipes/`
2. Include comprehensive tests (aim for 100% coverage)
3. Add a README with usage examples
4. Follow the naming convention: `kebab-case-name`

## Example: Full Turn-Based Combat Recipe

See `recipes/turn-based-combat/` for a complete example featuring:
- Initiative-based turn order
- Attack and defend actions
- Victory condition detection
- Comprehensive test suite
- Query helpers for UI

## Next Steps

- Browse existing recipes in `recipes/` for inspiration
- Check the generated API declarations in `templates/default/types/arcane.d.ts` for the full systems API

---

**Happy recipe building!** Share your creations with the community! 🧑‍🍳
