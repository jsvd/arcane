# Phase 8: Scene Management + Save/Load — Detailed Scoping

## Overview

Phase 8 adds architectural features that unlock "real game" structure. Currently, games register a single `onFrame()` callback with no concept of menu screens, pause states, or persistence. This phase introduces scene lifecycle management and state serialization.

---

## Part 1: Scene Management

### Current Limitation

```typescript
// Current pattern (single frame callback)
onFrame((dt) => {
  // All game logic + menu logic + pause logic in one function
  if (gameState === 'menu') {
    renderMenu();
  } else if (gameState === 'playing') {
    updateGame(dt);
    renderGame();
  } else if (gameState === 'paused') {
    renderPauseMenu();
  }
  // Manual state machine, no lifecycle hooks, messy
});
```

**Problems:**
- No separation of concerns (menu and gameplay mixed)
- No lifecycle hooks (onEnter, onExit)
- Manual state machine (error-prone)
- Can't easily add transitions (fade in/out)
- Asset loading happens immediately (no preloading)

---

### Scene System API

```typescript
// runtime/scenes/types.ts
interface Scene {
  onEnter?(state: any): void | Promise<void>; // Scene initialization (load assets, setup)
  onExit?(state: any): void; // Scene cleanup
  onPause?(state: any): void; // Another scene pushed on top
  onResume?(state: any): void; // Returned from push/pop
  onUpdate(state: any, dt: number): any; // Game logic (returns new state)
  onRender?(state: any): void; // Visual rendering (optional, can render in onUpdate)
}

// runtime/scenes/manager.ts
interface SceneManager {
  // Scene stack management
  pushScene(scene: Scene, transition?: Transition): void;
  popScene(transition?: Transition): void;
  replaceScene(scene: Scene, transition?: Transition): void;

  // Current scene
  currentScene(): Scene | undefined;

  // Scene stack (for debugging)
  stack(): Scene[];
}

interface Transition {
  type: 'fade' | 'slide' | 'wipe' | 'custom';
  duration: number; // in ms
  easing?: EasingFunction; // from Phase 7.5 tweening
  direction?: 'left' | 'right' | 'up' | 'down'; // for slide
  customRender?: (progress: number) => void; // for custom transitions
}

// Example usage
const menuScene: Scene = {
  onEnter(state) {
    console.log('Entered menu');
  },
  onUpdate(state, dt) {
    if (isKeyPressed('Enter')) {
      sceneManager.pushScene(gameplayScene, { type: 'fade', duration: 500 });
    }
    return state;
  },
  onRender(state) {
    drawText('Main Menu', { x: 100, y: 100 });
  },
};

const gameplayScene: Scene = {
  onEnter(state) {
    // Load level assets
  },
  onUpdate(state, dt) {
    // Game logic
    if (isKeyPressed('Escape')) {
      sceneManager.pushScene(pauseScene); // No transition (instant)
    }
    return updateGame(state, dt);
  },
  onPause(state) {
    // Stop music, save state, etc.
  },
  onResume(state) {
    // Resume music
  },
};

const pauseScene: Scene = {
  onUpdate(state, dt) {
    if (isKeyPressed('Escape')) {
      sceneManager.popScene(); // Return to game
    }
    return state;
  },
  onRender(state) {
    // Render game in background (frozen)
    // Render pause overlay
    drawPanel({ x: 100, y: 100, w: 200, h: 150, color: { r: 0, g: 0, b: 0, a: 0.7 } });
    drawText('PAUSED', { x: 150, y: 120 });
  },
};
```

---

### Scene Stack Semantics

```
Stack:                Action:                    Result:
[]                    pushScene(Menu)            [Menu]
[Menu]                pushScene(Game, fade)      [Menu, Game] → Menu.onPause(), Game.onEnter(), fade transition
[Menu, Game]          pushScene(Pause)           [Menu, Game, Pause] → Game.onPause(), Pause.onEnter()
[Menu, Game, Pause]   popScene()                 [Menu, Game] → Pause.onExit(), Game.onResume()
[Menu, Game]          replaceScene(GameOver)     [Menu, GameOver] → Game.onExit(), GameOver.onEnter()
[Menu, GameOver]      popScene()                 [Menu] → GameOver.onExit(), Menu.onResume()
```

**Key semantics:**
- `pushScene`: Add new scene on top, pause previous scene
- `popScene`: Remove current scene, resume previous scene
- `replaceScene`: Remove current scene, add new scene (no pause/resume)
- Only the **top scene** receives `onUpdate()` and `onRender()` calls
- **All scenes in stack remain in memory** (for background rendering, pause menus)

---

### Transition System

Transitions use Phase 7.5 tweening:

```typescript
// Fade transition
const fadeTransition: Transition = {
  type: 'fade',
  duration: 500,
  easing: 'easeOutQuad',
};

// Implementation (internal):
function renderFadeTransition(progress: number, fromScene: Scene, toScene: Scene, state: any) {
  // Render "from" scene
  fromScene.onRender?.(state);

  // Draw fade overlay
  const alpha = progress; // 0 → 1
  drawRect({ x: 0, y: 0, w: screenWidth, h: screenHeight, color: { r: 0, g: 0, b: 0, a: alpha } });

  if (progress >= 0.5) {
    // Halfway through, render "to" scene underneath (faded in)
    toScene.onRender?.(state);
  }
}

// Slide transition
const slideTransition: Transition = {
  type: 'slide',
  duration: 300,
  direction: 'left',
  easing: 'easeInOutCubic',
};

// Implementation (internal):
function renderSlideTransition(progress: number, fromScene: Scene, toScene: Scene, state: any) {
  const offset = progress * screenWidth;

  // Render "from" scene sliding out
  withCameraOffset({ x: -offset, y: 0 }, () => {
    fromScene.onRender?.(state);
  });

  // Render "to" scene sliding in
  withCameraOffset({ x: screenWidth - offset, y: 0 }, () => {
    toScene.onRender?.(state);
  });
}
```

---

### Scene-Local State

**Problem**: Scenes may want local state that doesn't pollute global state.

**Solution 1: Scene-scoped state**
```typescript
interface Scene<TState = any, TLocalState = any> {
  localState?: TLocalState;
  onEnter?(state: TState, local: TLocalState): void;
  onUpdate(state: TState, local: TLocalState, dt: number): { state: TState; local: TLocalState };
}

const gameplayScene: Scene<GlobalState, { enemies: Enemy[] }> = {
  localState: { enemies: [] },
  onEnter(state, local) {
    local.enemies = spawnEnemies(state.level);
  },
  onUpdate(state, local, dt) {
    // Update local enemies
    local.enemies = updateEnemies(local.enemies, dt);
    return { state, local };
  },
};
```

**Solution 2: State namespacing** (simpler)
```typescript
const gameplayScene: Scene = {
  onEnter(state) {
    return {
      ...state,
      scenes: {
        ...state.scenes,
        gameplay: { enemies: [] },
      },
    };
  },
  onUpdate(state, dt) {
    const local = state.scenes.gameplay;
    // Update local state
    return {
      ...state,
      scenes: {
        ...state.scenes,
        gameplay: { ...local, enemies: updateEnemies(local.enemies, dt) },
      },
    };
  },
};
```

**Recommendation**: Solution 2 (namespacing) — simpler, works with existing state system

---

### Asset Preloading

```typescript
interface Scene {
  preload?(state: any): Promise<void>; // Load assets before onEnter
}

const gameplayScene: Scene = {
  async preload(state) {
    // Load all assets for this scene
    await loadTexture('player.png');
    await loadTexture('enemies.png');
    await loadSound('bgm.ogg');
  },
  onEnter(state) {
    // Assets are guaranteed loaded
    playMusic('bgm.ogg');
  },
};

// Scene manager handles loading screen
sceneManager.pushScene(gameplayScene, {
  type: 'fade',
  duration: 500,
  onPreload: (progress) => {
    // Render loading screen during preload
    drawText(`Loading... ${Math.floor(progress * 100)}%`, { x: 100, y: 100 });
  },
});
```

---

### Implementation Plan (Part 1: Scenes)

**Week 1: Core Scene Manager**
- [ ] SceneManager class with push/pop/replace
- [ ] Scene lifecycle hooks (onEnter, onExit, onPause, onResume, onUpdate)
- [ ] Scene stack management
- [ ] Tests: lifecycle order, stack semantics (30 tests)

**Week 2: Transition System**
- [ ] Transition interface
- [ ] Fade transition (using Phase 7.5 tweens)
- [ ] Slide transition (4 directions)
- [ ] Wipe transition (curtain effect)
- [ ] Custom transition support
- [ ] Tests: transition progress, easing (20 tests)

**Week 3: Scene Polish**
- [ ] Scene-local state (namespacing pattern)
- [ ] Asset preloading with progress
- [ ] Error handling (scene throws → catch, show error scene)
- [ ] Scene debug overlay (show stack, current scene name)
- [ ] Tests: preloading, error recovery (20 tests)

---

## Part 2: Save/Load System

### Requirements

1. **Serialize full game state to JSON**
2. **Deserialize with validation** (detect corrupt saves)
3. **Multiple save slots** (save1.json, save2.json, etc.)
4. **Auto-save** (periodic + event-triggered)
5. **Schema migration** (load saves from older versions)
6. **Save metadata** (timestamp, playtime, thumbnail)

---

### Save Format

```typescript
// Save file structure
interface SaveFile {
  version: string; // Engine version (e.g., "0.1.0")
  gameVersion: string; // Game-specific version (for schema migration)
  timestamp: number; // Unix timestamp
  playtime: number; // Total playtime in seconds
  metadata: Record<string, any>; // Game-specific (level, character name, etc.)
  state: any; // Full game state (serialized)
  thumbnail?: string; // Base64-encoded screenshot
}

// Example save file
{
  "version": "0.1.0",
  "gameVersion": "1.2.0",
  "timestamp": 1704067200000,
  "playtime": 3600,
  "metadata": {
    "characterName": "Hero",
    "level": 5,
    "location": "Dungeon Floor 3"
  },
  "state": {
    "entities": { ... },
    "player": { ... },
    "dungeon": { ... }
  },
  "thumbnail": "data:image/png;base64,iVBORw0KG..."
}
```

---

### Save/Load API

```typescript
// runtime/persistence/save.ts
interface SaveOptions {
  slot: number; // 0, 1, 2, ... (for multiple save files)
  metadata?: Record<string, any>; // Custom metadata
  thumbnail?: boolean; // Capture screenshot?
}

interface LoadOptions {
  slot: number;
  migrate?: (oldState: any, oldVersion: string) => any; // Schema migration
}

async function saveGame(state: any, options: SaveOptions): Promise<void>;
async function loadGame(options: LoadOptions): Promise<any>;
async function listSaves(): Promise<SaveMetadata[]>;
async function deleteSave(slot: number): Promise<void>;

interface SaveMetadata {
  slot: number;
  timestamp: number;
  playtime: number;
  metadata: Record<string, any>;
  thumbnail?: string;
}

// Example usage
// Save
await saveGame(state, {
  slot: 0,
  metadata: { characterName: state.player.name, level: state.player.level },
  thumbnail: true,
});

// Load
const state = await loadGame({
  slot: 0,
  migrate: (oldState, oldVersion) => {
    if (oldVersion === '1.0.0') {
      // Migrate v1.0.0 → v1.1.0
      return { ...oldState, newField: 'default' };
    }
    return oldState;
  },
});

// List saves (for save/load menu)
const saves = await listSaves();
for (const save of saves) {
  console.log(`Slot ${save.slot}: ${save.metadata.characterName} (Level ${save.metadata.level})`);
}
```

---

### Auto-Save

```typescript
// Auto-save every 5 minutes
let autoSaveTimer = 0;
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

onFrame((dt) => {
  autoSaveTimer += dt;
  if (autoSaveTimer >= AUTO_SAVE_INTERVAL) {
    saveGame(state, { slot: 0, metadata: { autosave: true } });
    autoSaveTimer = 0;
  }
});

// Auto-save on level transition
function changeLevel(state: any, newLevel: number) {
  const newState = { ...state, level: newLevel };
  saveGame(newState, { slot: 0, metadata: { level: newLevel } }); // Fire-and-forget
  return newState;
}

// Auto-save on quit
window.addEventListener('beforeunload', () => {
  saveGame(state, { slot: 0, metadata: { autosave: true } });
});
```

---

### Schema Migration

```typescript
// Game defines migration functions
const migrations: Record<string, (state: any) => any> = {
  '1.0.0': (state) => state, // No changes from 1.0.0
  '1.1.0': (state) => ({
    ...state,
    inventory: state.inventory || [], // Add inventory field
  }),
  '1.2.0': (state) => ({
    ...state,
    equipment: state.equipment || {}, // Add equipment field
    inventory: state.inventory.map(item => ({ ...item, stackable: true })), // Add stackable flag
  }),
};

// Load with migration
const state = await loadGame({
  slot: 0,
  migrate: (oldState, oldVersion) => {
    let state = oldState;
    // Apply migrations in order
    const versions = Object.keys(migrations).sort();
    for (const version of versions) {
      if (version > oldVersion) {
        state = migrations[version](state);
      }
    }
    return state;
  },
});
```

---

### Platform-Specific Storage

**Browser (Web)**:
```typescript
// Use localStorage (5-10 MB limit)
function saveToBrowser(slot: number, data: SaveFile): void {
  localStorage.setItem(`arcane-save-${slot}`, JSON.stringify(data));
}

function loadFromBrowser(slot: number): SaveFile | null {
  const json = localStorage.getItem(`arcane-save-${slot}`);
  return json ? JSON.parse(json) : null;
}
```

**Desktop (Native)**:
```typescript
// Use file system (unlimited storage)
// Platform layer provides ops
#[op2(async)]
async fn op_save_to_file(
  #[string] path: String,
  #[string] data: String,
) -> Result<(), anyhow::Error> {
  tokio::fs::write(path, data).await?;
  Ok(())
}

#[op2(async)]
async fn op_load_from_file(
  #[string] path: String,
) -> Result<String, anyhow::Error> {
  let data = tokio::fs::read_to_string(path).await?;
  Ok(data)
}

// TypeScript side
async function saveToFile(slot: number, data: SaveFile): Promise<void> {
  const path = `${getSaveDir()}/save-${slot}.json`;
  await Deno.core.ops.op_save_to_file(path, JSON.stringify(data));
}
```

**Abstraction:**
```typescript
// runtime/persistence/storage.ts
interface StorageBackend {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

class BrowserStorage implements StorageBackend { /* localStorage */ }
class FileSystemStorage implements StorageBackend { /* Rust ops */ }

// Auto-detect platform
const storage: StorageBackend = typeof localStorage !== 'undefined'
  ? new BrowserStorage()
  : new FileSystemStorage();
```

---

### Screenshot Thumbnails

```typescript
// Capture current frame as thumbnail
function captureScreenshot(): string {
  // Ask Rust to read back framebuffer
  const pixels = Deno.core.ops.op_capture_framebuffer();
  // Encode to PNG, then base64
  const png = encodePNG(pixels);
  return `data:image/png;base64,${btoa(png)}`;
}

// Rust side
#[op2]
fn op_capture_framebuffer() -> Result<Vec<u8>, anyhow::Error> {
  // Read from GPU texture
  let pixels = renderer.read_framebuffer()?;
  Ok(pixels)
}
```

**Deferred**: Screenshot capture requires render-to-texture, which is Phase 10. For Phase 8, skip thumbnails or use placeholder.

---

### Implementation Plan (Part 2: Save/Load)

**Week 1: Core Serialization**
- [ ] JSON serialization (deterministic key order)
- [ ] Validation (detect corrupt saves)
- [ ] Save file format (version, metadata, state)
- [ ] Tests: round-trip (save → load → same state) (30 tests)

**Week 2: Storage Backends**
- [ ] Browser localStorage backend
- [ ] Desktop file system backend (Rust ops)
- [ ] Storage abstraction layer
- [ ] Tests: platform-specific storage (20 tests)

**Week 3: Save Management**
- [ ] Multiple save slots
- [ ] List/delete saves
- [ ] Schema migration system
- [ ] Auto-save (timer + event-triggered)
- [ ] Tests: migration, auto-save (30 tests)

---

## Demo: Menu Flow Game

Full game lifecycle with scene transitions and save/load.

**Scenes:**
1. **Title Screen** — "Press any key to start"
2. **Main Menu** — New Game, Continue, Settings, Quit
3. **Settings** — Volume sliders, control remapping
4. **Character Select** — Choose name and class
5. **Gameplay** — Simple roguelike (reuse existing demo)
6. **Pause Menu** — Resume, Settings, Save, Quit
7. **Game Over** — Final score, Retry, Quit

**Save/Load integration:**
- Auto-save on level change
- Manual save from pause menu
- Continue button on main menu loads last save
- Save select screen shows metadata (name, level, timestamp)

**Scene transitions:**
- Title → Menu: fade (1 second)
- Menu → Gameplay: slide left (0.5 seconds)
- Gameplay → Pause: instant (push on top)
- Pause → Gameplay: instant (pop)
- Gameplay → Game Over: fade to red (1 second)

**Implementation:** ~500 lines of game logic + scene definitions

---

## Success Criteria

### Scene Management
- [ ] Can navigate menu → game → pause → game without manual state machine
- [ ] Scene lifecycle hooks fire in correct order
- [ ] Transitions are smooth (60 FPS during transition)
- [ ] Scene stack works (push/pop/replace semantics correct)
- [ ] 70+ tests

### Save/Load
- [ ] Can save and load game state perfectly (deterministic)
- [ ] Multiple save slots work
- [ ] Auto-save triggers correctly
- [ ] Schema migration handles version changes
- [ ] Works on both web and desktop
- [ ] 80+ tests

### Demo
- [ ] Menu Flow Game is fully playable
- [ ] All scene transitions work
- [ ] Can save mid-game and restore
- [ ] Continue button loads last save
- [ ] Game feels polished (transitions, auto-save feedback)

---

## Open Questions

### 1. Should scenes have their own state, or share global state?

**Shared global state** (recommended):
- Simpler (one state tree)
- Transactions work across scenes
- Agent can query entire state

**Scene-local state**:
- Isolated (menu state doesn't pollute game state)
- Easier to reason about
- But: how to share data between scenes?

**Recommendation**: Shared global state with namespacing pattern

---

### 2. How to handle async scene transitions?

```typescript
// Problem: What if scene transition takes 2 seconds, and user presses button during transition?
sceneManager.pushScene(gameplayScene, { type: 'fade', duration: 2000 });
// During fade, user presses Escape
// Should: ignore input? queue input? cancel transition?
```

**Options:**
1. Block input during transitions
2. Queue input (apply after transition)
3. Allow cancel (ESC during fade → cancel transition)

**Recommendation**: Option 1 (block input) — simplest, prevents edge cases

---

### 3. How to render background scenes (for pause menus)?

Pause menu should show game in background (frozen). Options:

**Option 1: Re-render previous scene**
```typescript
pauseScene.onRender(state) {
  // Render game scene (frozen)
  gameplayScene.onRender(state);
  // Render pause overlay
  drawPanel({ ... });
}
```

**Option 2: Cache previous frame**
```typescript
// Before pushing pause scene, capture framebuffer
const cachedFrame = captureScreenshot();

pauseScene.onRender(state) {
  // Draw cached frame as background
  drawTexture(cachedFrame);
  // Render pause overlay
  drawPanel({ ... });
}
```

**Recommendation**: Option 1 (re-render) — simpler, no framebuffer capture needed (deferred to Phase 10)

---

## Integration with Existing Systems

### With Phase 7.5 Tweening
- Scene transitions use tweens for smooth animations
- `sceneManager.pushScene(scene, { type: 'fade', duration: 500, easing: 'easeOutQuad' })`

### With Phase 5 Recipes
- Scenes can use recipes in `onUpdate`
- Save/load works with recipe-based state

### With Phase 3 Agent Protocol
- Agent can query current scene: `arcane inspect game.ts "sceneManager.currentScene().name"`
- Agent can trigger scene changes: `sceneManager.pushScene(...)`

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Save format changes break old saves | High | High | Schema migration system from day 1 |
| Transitions are janky (not 60 FPS) | Medium | Medium | Profile, optimize, or simplify transitions |
| Scene stack is confusing | Medium | Medium | Good documentation + debug overlay |
| LocalStorage quota exceeded | Low | Medium | Warn user, fallback to file system on desktop |
| Scene lifecycle hooks are called in wrong order | High | High | Comprehensive tests for all push/pop/replace cases |

---

## Future Enhancements (Phase 8.5)

- [ ] Scene serialization (save scene stack, restore on load)
- [ ] Scene pooling (reuse scene instances)
- [ ] Scene preloading (load next scene in background)
- [ ] Cloud save support (sync saves across devices)
- [ ] Save compression (gzip before storing)
- [ ] Encrypted saves (prevent cheating)
