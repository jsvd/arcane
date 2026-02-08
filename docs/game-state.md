# Game State

## Game-as-a-Database

The entire game state in Arcane is a single, typed, queryable, observable, transactional data store. Not game objects with properties scattered across a scene tree. One state tree, one source of truth.

This design gives you:
- **Queries**: filter and select entities like database rows
- **Transactions**: batch mutations with rollback
- **Diffs**: know exactly what changed and why
- **Observation**: react to state changes declaratively
- **Determinism**: seeded PRNG makes every run reproducible
- **Recording**: capture and replay entire sessions
- **Save/load**: free — the state tree is serializable by default

## State Tree Structure

The game state is a typed tree:

```typescript
type GameState = {
  party: Character[]
  dungeon: DungeonState
  combat: CombatState | null
  inventory: InventoryState
  quests: QuestState
  world: WorldState
  turn: number
  rng: PRNGState
}

type Character = {
  id: EntityId
  name: string
  class: CharacterClass
  level: number
  hp: { current: number; max: number }
  ac: number
  abilities: AbilityScores
  conditions: Condition[]
  equipment: EquipmentSlots
  spells: SpellSlots
  position: Vec2
}

type CombatState = {
  phase: 'initiative' | 'player-turn' | 'enemy-turn' | 'resolution'
  turnOrder: EntityId[]
  currentActor: EntityId
  round: number
  log: CombatLogEntry[]
}
```

Every piece of game data lives in this tree. No hidden state. No singletons. No globals.

## Query API

Query the state tree like a database:

```typescript
// Find wounded, living characters
const wounded = query(state, 'characters', {
  hp: lt(maxHp),
  alive: true,
})

// Find enemies near the player
const nearbyEnemies = query(state, 'entities', {
  faction: 'hostile',
  position: within(player.position, 5),
})

// Find all items of a type in inventory
const potions = query(state, 'inventory.items', {
  type: 'potion',
  subtype: 'healing',
})

// Compound queries
const threatenedAllies = query(state, 'entities', {
  faction: 'friendly',
  alive: true,
  hp: lt(percent(25, 'maxHp')),
  position: within(anyOf(enemies), 2),
})
```

Queries are composable, typed, and work identically in headless and hosted mode.

## Transactions and Diffs

All state mutations go through transactions:

```typescript
const result = transaction(state, [
  damage('goblin_1', 8),
  addCondition('goblin_1', 'burning', { duration: 3 }),
  spendResource('player', 'spellSlots.level1', 1),
])

// result contains:
result.state     // the new state tree
result.diff      // exactly what changed: { 'goblin_1.hp': { from: 8, to: 0 }, ... }
result.effects   // triggered effects: ['goblin_1.death', 'combat.enemyDefeated']
result.valid     // whether all mutations succeeded
```

Transactions are atomic — if any mutation fails, the entire transaction rolls back. This prevents partial state corruption.

```typescript
// This either succeeds completely or not at all
const result = transaction(state, [
  spendResource('player', 'gold', 500),  // fails if < 500 gold
  addItem('player', 'magic_sword'),
  removeItem('merchant', 'magic_sword'),
])

if (!result.valid) {
  // Nothing changed. Gold is still there. Sword is still in shop.
  console.log(result.error) // "Insufficient gold: have 300, need 500"
}
```

## Observation / Subscription System

React to state changes declaratively:

```typescript
// Watch for character death
observe(state, 'characters.*.hp', (character, oldHp, newHp) => {
  if (newHp <= 0) triggerDeathSequence(character)
})

// Watch for inventory changes
observe(state, 'inventory.items', (items, oldItems, newItems) => {
  const added = diff(oldItems, newItems)
  if (added.length > 0) showPickupNotification(added)
})

// Watch for quest completion
observe(state, 'quests.*.status', (quest, oldStatus, newStatus) => {
  if (newStatus === 'completed') showQuestComplete(quest)
})
```

Observers fire after transactions commit, not during. This prevents cascading mutation bugs.

## Deterministic Simulation

All randomness goes through a seeded PRNG:

```typescript
const state = createState({ rng: seed(42) })

// This roll is always the same for seed 42
const [roll, nextState] = rollDice(state, '2d6+3')

// Replaying the same actions with the same seed produces identical results
```

Determinism enables:
- **Reproducible bugs**: "seed 42, actions [a, b, c]" fully specifies a bug
- **Replay**: play back any session frame by frame
- **Testing**: assertions on random outcomes with known seeds
- **Networking**: clients only need to sync actions, not state

## Session Recording and Replay

Every game session can be recorded as a sequence of (timestamp, action, diff) tuples:

```typescript
const recording = record(game)
// ... player plays for 10 minutes ...
const session = recording.stop()

// session is:
[
  { t: 0,    action: { type: 'move', dir: 'north' }, diff: {...} },
  { t: 150,  action: { type: 'attack', target: 'goblin_1' }, diff: {...} },
  { t: 300,  action: { type: 'cast', spell: 'fireball', target: [3,3] }, diff: {...} },
  // ...
]

// Replay to any point
const replayed = replay(session)
replayed.stateAt(150)  // exact state at timestamp 150

// Scrub forward and backward
replayed.stepForward()
replayed.stepBackward()
replayed.jumpTo(turn: 5)
```

### Generate Tests from Play Sessions

An agent can play-test its own game, record the session, and generate regression tests:

```typescript
const tests = generateTests(session, {
  filter: (action) => action.type === 'death',
})

// Produces:
// test('goblin_1 dies on turn 3 from fireball', () => {
//   const state = stateAtTurn(2)
//   const next = castSpell(state, 'fireball', ...)
//   expect(next.entities.goblin_1.alive).toBe(false)
// })
```

## Save / Load

Save and load are free consequences of explicit state. The entire state tree is serializable:

```typescript
// Save
const saveData = serialize(state)
writeFile('save_01.json', saveData)

// Load
const loaded = deserialize(readFile('save_01.json'))
const game = restoreGame(loaded)
```

No custom serialization logic. No "oh we forgot to save that field." If it's in the state tree, it's saved.

## API Design Principles

The state API follows agent-friendly conventions:

- Every query starts with `get` or `query`
- Every mutation starts with `set`, `add`, or `remove`
- Every check starts with `is`, `has`, or `can`
- No magic strings — enums and union types everywhere
- No implicit state — functions take state in, return state out
- Small API surface — 50 well-designed functions beat 500 specialized ones
- Types ARE documentation

```typescript
// Bad (typical engine API)
player.set_animation("attack")
player.deal_damage(enemy, 5)
if (player.get_state() == "dead") ...

// Good (Arcane — explicit, typed, functional)
const next = applyDamage(state, { source: player.id, target: enemy.id, amount: 5 })
const isDead = query(next, 'entities', { id: enemy.id, alive: false }).length > 0
```
