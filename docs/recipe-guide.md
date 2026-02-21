# Recipe Guide: Building Reusable Game Systems

Recipes are plug-and-play game systems using `system()` and `rule()`. Pure TypeScript, no dependencies, fully testable.

## API Overview

```typescript
import { system, rule, applyRule, getApplicableRules, extend } from "@arcane/runtime/systems";
import type { SystemDef, RuleResult } from "@arcane/runtime/systems";
```

## Building a Health System

### Define State and Rules

```typescript
// health-system.ts
import { system, rule } from "@arcane/runtime/systems";

type HealthState = {
  entities: Record<string, { hp: number; maxHp: number }>;
};

// rule() returns a fluent builder
// Chain .when() for conditions, .then() for actions
const damageRule = rule<HealthState>("damage")
  .when((state, args) => {
    const target = args.target as string;
    return state.entities[target]?.hp > 0;
  })
  .then((state, args) => {
    const target = args.target as string;
    const amount = args.amount as number;
    const entity = state.entities[target];
    return {
      ...state,
      entities: {
        ...state.entities,
        [target]: { ...entity, hp: Math.max(0, entity.hp - amount) },
      },
    };
  });

const healRule = rule<HealthState>("heal")
  .when((state, args) => {
    const target = args.target as string;
    const entity = state.entities[target];
    return entity && entity.hp > 0 && entity.hp < entity.maxHp;
  })
  .then((state, args) => {
    const target = args.target as string;
    const amount = args.amount as number;
    const entity = state.entities[target];
    return {
      ...state,
      entities: {
        ...state.entities,
        [target]: { ...entity, hp: Math.min(entity.maxHp, entity.hp + amount) },
      },
    };
  });

// Rules without conditions always fire
const reviveRule = rule<HealthState>("revive")
  .then((state, args) => {
    const target = args.target as string;
    const entity = state.entities[target];
    if (!entity || entity.hp > 0) return state;
    return {
      ...state,
      entities: {
        ...state.entities,
        [target]: { ...entity, hp: Math.floor(entity.maxHp / 2) },
      },
    };
  });

// system() takes name + rules array
export const HealthSystem = system("health", [damageRule, healRule, reviveRule]);
```

### Using the System

```typescript
import { applyRule, getApplicableRules } from "@arcane/runtime/systems";
import { HealthSystem, type HealthState } from "./health-system.ts";

let state: HealthState = {
  entities: {
    player: { hp: 20, maxHp: 20 },
    goblin: { hp: 5, maxHp: 5 },
  },
};

// applyRule() is a standalone function - NOT a method on the system
const result = applyRule(HealthSystem, "damage", state, { target: "goblin", amount: 3 });

// result has { ok, state, ruleName, error? }
if (result.ok) {
  state = result.state;
  console.log(state.entities.goblin.hp); // 2
}

// getApplicableRules() returns names of rules whose conditions pass
const available = getApplicableRules(HealthSystem, state);
// ["damage", "heal", "revive"] - depending on current state
```

### Testing

```typescript
// health-system.test.ts
import { describe, it, assert } from "@arcane/runtime/testing";
import { applyRule, getApplicableRules } from "@arcane/runtime/systems";
import { HealthSystem } from "./health-system.ts";

describe("HealthSystem", () => {
  const initialState = () => ({
    entities: {
      player: { hp: 10, maxHp: 20 },
      enemy: { hp: 5, maxHp: 5 },
    },
  });

  it("damage reduces hp", () => {
    const result = applyRule(HealthSystem, "damage", initialState(), {
      target: "enemy",
      amount: 3,
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.entities.enemy.hp, 2);
  });

  it("damage fails on dead target", () => {
    const state = { entities: { dead: { hp: 0, maxHp: 10 } } };
    const result = applyRule(HealthSystem, "damage", state, { target: "dead", amount: 5 });
    assert.equal(result.ok, false);
    assert.equal(result.error?.code, "CONDITION_FAILED");
  });

  it("heal caps at maxHp", () => {
    const result = applyRule(HealthSystem, "heal", initialState(), {
      target: "player",
      amount: 100,
    });
    assert.equal(result.ok, true);
    assert.equal(result.state.entities.player.hp, 20); // capped
  });

  it("getApplicableRules returns valid actions", () => {
    const rules = getApplicableRules(HealthSystem, initialState());
    assert.ok(rules.includes("damage"));
    assert.ok(rules.includes("heal"));
  });
});
```

## Extending Systems

Use `extend()` to add, replace, or remove rules without modifying the original.

```typescript
import { extend, rule } from "@arcane/runtime/systems";
import { HealthSystem } from "./health-system.ts";

// Add a new rule
const regenRule = rule<HealthState>("regen")
  .when((state, args) => {
    const target = args.target as string;
    const e = state.entities[target];
    return e && e.hp > 0 && e.hp < e.maxHp;
  })
  .then((state, args) => {
    const target = args.target as string;
    const e = state.entities[target];
    return {
      ...state,
      entities: { ...state.entities, [target]: { ...e, hp: Math.min(e.maxHp, e.hp + 1) } },
    };
  });

// Replace an existing rule using .replaces()
const criticalDamageRule = rule<HealthState>("criticalDamage")
  .replaces("damage") // replaces the original "damage" rule
  .when((state, args) => state.entities[args.target as string]?.hp > 0)
  .then((state, args) => {
    const target = args.target as string;
    const amount = (args.amount as number) * 2; // double damage!
    const e = state.entities[target];
    return {
      ...state,
      entities: { ...state.entities, [target]: { ...e, hp: Math.max(0, e.hp - amount) } },
    };
  });

const ExtendedHealthSystem = extend(HealthSystem, {
  rules: [regenRule, criticalDamageRule], // add regen, replace damage
  remove: ["revive"], // remove the revive rule
});
```

## Recipe Structure

```
recipes/my-recipe/
  recipe.json          # Metadata
  my-recipe.ts         # System definition
  my-recipe.test.ts    # Tests
  index.ts             # Public exports
```

**recipe.json:**
```json
{
  "name": "health-system",
  "description": "Health, damage, and healing",
  "version": "0.1.0",
  "files": ["health-system.ts", "health-system.test.ts", "index.ts", "recipe.json"]
}
```

**index.ts:**
```typescript
export { HealthSystem } from "./health-system.ts";
export type { HealthState } from "./health-system.ts";
```

## Best Practices

- **Pure functions**: State in, state out, no side effects
- **One system, one responsibility**: Keep recipes focused
- **Test every rule**: Verify both success and failure paths
- **Use `.when()` guards**: Prevent invalid state transitions
- **Use `.replaces()` for overrides**: Cleaner than remove + add

See `recipes/turn-based-combat/` and `recipes/inventory-equipment/` for complete examples.
