# API Design

Rules for designing Arcane's public APIs. These apply to the TypeScript runtime API — the surface that game developers and AI agents interact with daily.

## The Two Audiences

Every API serves two audiences simultaneously:

1. **AI agents** — consume APIs through code generation, need predictable patterns and strong types
2. **Human developers** — consume APIs through reading and writing, need discoverability and good errors

When these audiences conflict, prefer the choice that makes the API harder to misuse. Both audiences benefit from APIs that are difficult to use incorrectly.

## LLM-Friendly API Rules

### Consistent Verb Prefixes

Every public function starts with a verb that signals its behavior:

| Prefix | Behavior | Returns |
|---|---|---|
| `get` | Read, no side effects | The value |
| `query` | Read with filtering | Array of matches |
| `set` | Write a single value | New state |
| `add` | Add to a collection | New state |
| `remove` | Remove from a collection | New state |
| `is` / `has` / `can` | Boolean check | `boolean` |
| `create` | Construct a new thing | The new thing |
| `apply` | Apply a transformation | New state |
| `roll` | Randomness (uses PRNG) | `[result, newState]` |

An LLM completing code can predict what a function does from its name alone. No function named `get*` ever mutates state. No function named `set*` ever returns data. This is a hard rule.

### No Magic Strings

```typescript
// Bad — agent must guess valid strings, typos are silent failures
player.setState("attacking")
player.hasCondition("poisoned")

// Good — autocomplete and type-checking catch errors
player.setState(CharacterState.Attacking)
player.hasCondition(Condition.Poisoned)
```

Use union types or enums for any value that has a fixed set of options. String literals are acceptable only when the set is open-ended (names, descriptions, custom keys).

### No Implicit State

```typescript
// Bad — what is "current"? Global singleton? Thread-local? Last created?
const combat = getCurrentCombat()
combat.attack(target)

// Good — state is explicit, passed in, returned out
const next = attack(state, { source: player.id, target: goblin.id })
```

Every function takes its dependencies as arguments. No singletons, no globals, no ambient state. An agent can trace the data flow by reading the function signature.

### No Overloaded Signatures

```typescript
// Bad — which overload? What does a string vs object mean?
damage(target, 5)
damage(target, { amount: 5, type: 'fire' })
damage(target, "5d6")

// Good — one signature, clear object parameter
applyDamage(state, { target, amount: 5, type: DamageType.Fire })
```

One function, one signature. If a function needs to handle different cases, use separate named functions: `applyDamage`, `applyDamageRoll`, `applyDamageFormula`.

### Small API Surface

Resist adding functions. Every function added is a function that must be learned, maintained, and not confused with other functions.

- 50 well-designed functions beat 500 specialized ones
- If two functions do similar things, find the unifying abstraction
- If a function is used by one caller, it should probably be inlined
- Helper functions are private until proven useful to multiple consumers

### Types Are Documentation

```typescript
// The type signature tells the agent everything it needs to know
function castSpell(
  state: GameState,
  params: {
    caster: EntityId,
    spell: SpellId,
    target: EntityId | Position,
    options?: { silent?: boolean },
  }
): TransactionResult<GameState>
```

An LLM reads the type and knows: what to pass, what comes back, and what can go wrong. JSDoc comments should explain *why*, not duplicate the types.

## Error Design

Errors serve two purposes: help humans debug, help agents auto-fix.

### Error Structure

```typescript
type ArcaneError = {
  code: string          // Machine-readable: "COMBAT_TARGET_OUT_OF_RANGE"
  message: string       // Human-readable: "Cannot attack goblin_3: distance 7 exceeds weapon range 5"
  context: {            // Everything an agent needs to understand and fix
    action: string      // What was attempted
    reason: string      // Why it failed
    state?: object      // Relevant state at time of error
    suggestion?: string // What to do instead
  }
}
```

### Error Messages

Write error messages as if explaining to a colleague:

```
// Bad
"Invalid target"
"Error in combat system"
"Assertion failed"

// Good
"Cannot attack: target 'goblin_3' is out of range (distance: 7, weapon range: 5)"
"Cannot cast fireball: 0 level-1 spell slots remaining (max: 3, used: 3)"
"Transaction failed: cannot remove item 'sword_1' from inventory — item not found"
```

Every error message answers: what was attempted, why it failed, and (when possible) what to try instead.

### Fail Loudly at Boundaries, Trust Internally

- **System boundaries** (user input, config files, external data): validate strictly, return descriptive errors
- **Internal boundaries** (function-to-function): trust the types, use assertions for invariants
- **Never silently swallow errors** — if something unexpected happens, surface it

## Naming Conventions

### Functions
- `camelCase`
- Verb-first: `getCharacter`, `applyDamage`, `isAlive`
- Specific over generic: `getWoundedAllies` over `filterEntities`

### Types
- `PascalCase`
- Nouns: `Character`, `CombatState`, `SpellSlot`
- No `I` prefix for interfaces, no `T` prefix for types

### Constants and Enums
- `PascalCase` for enum names and values: `DamageType.Fire`
- `SCREAMING_SNAKE` only for true global constants: `MAX_PARTY_SIZE`

### Files
- `kebab-case.ts`
- One primary export per file, file named after the export
- Test files: `<module>.test.ts` next to the source

## Deprecation

When an API needs to change:

1. Mark the old API with `@deprecated` and a migration note
2. Introduce the new API
3. Both coexist for one phase
4. Remove the old API in the following phase

Never break a public API without a deprecation period. Agents may have generated code using the old API — give them time to update.
