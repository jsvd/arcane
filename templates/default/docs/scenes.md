# Scenes & Persistence

## Scene Manager

Multi-screen games: title, menu, gameplay, pause, game over.

```typescript
import {
  createScene, createSceneInstance, startSceneManager,
  pushScene, popScene, replaceScene, getActiveScene,
} from "@arcane/runtime/scenes";

const GameScene = createScene<{ score: number }>({
  name: "game",
  create: () => ({ score: 0 }),
  onEnter: (state, ctx) => state,
  onUpdate: (state, dt, ctx) => state,
  onRender: (state, ctx) => { /* draw */ },
  onPause: (state) => state,
  onResume: (state, ctx) => state,
  onExit: (state) => {},
});

startSceneManager(createSceneInstance(GameScene), {
  onUpdate: (dt) => { updateTweens(dt); updateParticles(dt); },
});
```

### Navigation

From within scene callbacks via the `ctx` parameter:
- `ctx.push(instance, transition?)` -- push on top (current pauses)
- `ctx.pop(transition?)` -- pop current (previous resumes)
- `ctx.replace(instance, transition?)` -- swap current for new
- `ctx.getData<T>()` -- get data passed to `createSceneInstance`

### Transitions

```typescript
{ type: "fade", duration: 0.3, color: { r: 0, g: 0, b: 0 } }
{ type: "none" }  // instant (e.g., pause overlay)
```

Scene stack: push adds on top (current pauses), pop removes top (previous resumes), replace swaps top.

### Data Passing

```typescript
const instance = createSceneInstance(GameOverScene, { finalScore: 1000 });
// Inside GameOverScene:
const data = ctx.getData<{ finalScore: number }>();
```

## Save/Load

Persist game state with schema migration support.

```typescript
import {
  configureSaveSystem, saveGame, loadGame, hasSave, deleteSave, listSaves,
  enableAutoSave, disableAutoSave, updateAutoSave,
} from "@arcane/runtime/persistence";
import { createFileStorage } from "@arcane/runtime/persistence/storage";

// Configure (call once at startup)
configureSaveSystem({ storage: createFileStorage(), version: 1 });

// Save
saveGame(gameState, { slot: "save1", label: "Level 3" });

// Load
const result = loadGame<GameState>("save1");
if (result.ok) gameState = result.state!;

// Check / list / delete
if (hasSave("save1")) { /* ... */ }
const saves = listSaves();  // sorted by timestamp desc
deleteSave("save1");
```

## Auto-Save

```typescript
enableAutoSave({ getState: () => gameState, interval: 30, options: { slot: "autosave" } });

// In onFrame or scene manager onUpdate:
updateAutoSave(dt);
```

## Schema Migrations

Handle save format changes between versions:

```typescript
configureSaveSystem({ version: 2 });
registerMigration({
  version: 2, description: "Add inventory",
  up: (data: any) => ({ ...data, inventory: [] }),
});
// Old v1 saves automatically migrate to v2 on load
```
