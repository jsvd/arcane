# Systems and Recipes

## Overview

Arcane game logic is built from **systems** — declarative rule sets that govern game behavior. Systems are composed from **recipes** — pre-built, typed, composable modules that implement common game patterns.

The key insight: game rules read like game design documents. An agent can take a rulebook and translate it almost directly into system definitions.

## Declarative System Definitions

A system is a named collection of rules, state, and queries:

```typescript
const TacticalCombat = system({
  name: 'tactical-combat',

  state: {
    phase: oneOf('initiative', 'player-turn', 'enemy-turn', 'resolution'),
    turnOrder: arrayOf(entityRef),
    currentActor: entityRef,
    round: number,
  },

  rules: [
    rule('initiative')
      .when(combatStarts)
      .then(rollInitiativeForAll, sortByInitiative, startFirstTurn),

    rule('attack')
      .when(actorChooses('attack'), hasValidTarget)
      .then(rollToHit, applyDamage, checkDeath, advanceTurn),

    rule('cast-spell')
      .when(actorChooses('cast'), hasSpellSlots, targetInRange)
      .then(consumeSlot, resolveSpellEffect, advanceTurn),

    rule('end-of-round')
      .when(allActorsActed)
      .then(tickConditions, processRegeneration, incrementRound, rollInitiativeForAll),
  ],

  queries: {
    validTargets: (actor) =>
      entitiesWhere({ hostile: true, alive: true, inRange: actor.weapon.range }),
    availableActions: (actor) =>
      filterByResources(actor, ['attack', 'cast', 'defend', 'flee']),
  },
})
```

Each rule is:
- **Named** — for overriding and testing
- **Conditional** — fires only when preconditions are met
- **Composable** — chains of pure functions
- **Independently testable** — test a single rule in isolation

## The `extend` Pattern

Customize systems without forking them:

```typescript
const BFRPGCombat = extend(TacticalCombat, {
  rules: [
    // Replace an existing rule
    rule('death-threshold')
      .replaces('check-death')
      .when(hpBelow(0))
      .then(
        when(hpBelow(neg(constitution)), markDead),
        when(hpBetween(neg(constitution), 0), startDying),
      ),

    // Add a new rule
    rule('stabilization')
      .when(isDying, isStartOfTurn)
      .then(rollD20, when(isNat20, stabilize), otherwise(loseOneHp)),

    // Add morale rules
    rule('morale-check')
      .when(allyDied, isNPC)
      .then(rollMorale, when(failed, attemptFlee)),
  ],

  state: {
    // Add new state fields
    morale: mapOf(entityRef, number),
  },
})
```

`extend` is the core composition mechanism. It lets you:
- **Replace** rules by name
- **Add** new rules
- **Remove** rules
- **Extend** the state schema
- **Override** queries

The base system stays untouched. Your customizations are explicit and diffable.

## Composable Recipes

Recipes are pre-built systems distributed as packages:

```bash
npx arcane add @arcane/turn-based-combat
npx arcane add @arcane/inventory-equipment
npx arcane add @arcane/fog-of-war
npx arcane add @arcane/dialogue-branching
```

These aren't asset store packages with prefabs and sprites. They're **typed, composable logic modules** that wire into your state tree.

### Planned Recipes

| Recipe | What It Provides |
|---|---|
| `turn-based-combat` | Initiative, turns, actions, targeting, damage resolution |
| `inventory-equipment` | Items, stacking, equipment slots, encumbrance |
| `dialogue-branching` | Dialogue trees, conditions, consequences, NPC memory |
| `dungeon-generation` | Procedural rooms, corridors, encounters, treasure placement |
| `fog-of-war` | Visibility, exploration, memory of seen areas |
| `save-load` | Serialization, save slots, auto-save, migration |
| `character-progression` | XP, leveling, class features, multiclass |

### How Recipes Wire Into the State Tree

Each recipe declares the state it needs. When you compose recipes, their state merges into the game state tree:

```typescript
const game = createGame({
  systems: [
    TurnBasedCombat,
    InventoryEquipment,
    FogOfWar,
  ],
})

// The state tree automatically includes:
// state.combat    — from TurnBasedCombat
// state.inventory — from InventoryEquipment
// state.fog       — from FogOfWar
```

If two recipes touch the same state, you wire them together explicitly:

```typescript
const game = createGame({
  systems: [TurnBasedCombat, InventoryEquipment],
  wiring: {
    // When combat deals damage, check if armor absorbs it
    'combat.applyDamage': pipe(
      InventoryEquipment.calculateArmorReduction,
      TurnBasedCombat.applyDamage,
    ),
  },
})
```

## Testing Systems

Every rule is testable in isolation:

```typescript
test('attack rule: hit applies damage', () => {
  const state = createCombatState({
    attacker: character({ toHit: 5 }),
    defender: character({ ac: 12, hp: 10 }),
    rng: seed(42), // seed that produces a hit
  })

  const next = applyRule(TacticalCombat, 'attack', state, {
    target: 'defender',
  })

  expect(next.defender.hp).toBeLessThan(10)
})

test('end-of-round ticks conditions', () => {
  const state = createCombatState({
    entities: [
      character({ conditions: [{ type: 'burning', duration: 3 }] }),
    ],
  })

  const next = applyRule(TacticalCombat, 'end-of-round', state)

  expect(next.entities[0].conditions[0].duration).toBe(2)
})
```

## Recipe Marketplace Vision

Long-term, recipes become an ecosystem:

- Community builds and publishes recipes to npm
- Recipes have typed interfaces — `implements('combat')`, `implements('inventory')`
- Agents can search for, install, and customize recipes
- Recipes include their own test suites
- Quality recipes rise through usage and community rating

The ecosystem compounds: as more recipes exist, agents can build more complex games faster.
