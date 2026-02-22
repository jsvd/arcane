---
name: sound
description: Find and setup sounds from Asset Palace. Downloads packs, generates audio code. Usage: /sound explosion effects, /sound background music
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

# /sound - Find and setup sounds from Asset Palace

You are helping a game developer find and use sound effects and music in their Arcane game.

## What You Do

1. **Search** Asset Palace for sound packs matching the user's needs
2. **Download** the pack if not already present in `assets/`
3. **Generate** TypeScript code to load and play the sounds

## Asset Palace Location

Asset Palace repository: https://github.com/anthropics/asset_palace

```
sounds/
  kenney/              # Kenney.nl packs
    impact-sounds.json
    interface-sounds.json
    music-jingles.json
    ...
  opengameart/         # OpenGameArt packs
  _index.json          # Pack catalog
```

## Workflow

### Step 1: Check if pack already downloaded

Before downloading, check if the pack exists:

```bash
ls assets/ 2>/dev/null
test -d assets/<pack-id> && test -f assets/<pack-id>.json && echo "EXISTS"
```

If exists, skip download and use existing files.

### Step 2: Search for packs

Fetch and search Asset Palace for matching sound packs:

```bash
# Get pack index
curl -s "https://raw.githubusercontent.com/anthropics/asset_palace/main/sounds/kenney/_index.json"

# Or fetch a specific pack definition
curl -s "https://raw.githubusercontent.com/anthropics/asset_palace/main/sounds/kenney/impact-sounds.json"
```

Look at:
- Pack names and descriptions
- `sounds` object keys (sound names)
- `tags` object for categories like "explosion", "ui", "music", "ambient"

### Step 3: Download if needed

```bash
# Create assets directory
mkdir -p assets

# Get the pack definition
curl -o assets/impact-sounds.json \
  "https://raw.githubusercontent.com/anthropics/asset_palace/main/sounds/kenney/impact-sounds.json"

# Read downloadUrl from JSON and fetch the pack
DOWNLOAD_URL=$(cat assets/impact-sounds.json | grep -o '"downloadUrl"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
curl -L -o /tmp/sounds.zip "$DOWNLOAD_URL"
unzip -o /tmp/sounds.zip -d assets/impact-sounds/
rm /tmp/sounds.zip
```

### Step 4: Find matching sounds

Read the pack JSON and find sounds matching the user's request:

```json
{
  "id": "impact-sounds",
  "primaryDir": "Audio",
  "sounds": {
    "explosion-01": { "file": "explosion_01.wav" },
    "explosion-02": { "file": "explosion_02.wav" },
    "laser-shoot": { "file": "laserShoot.wav" }
  },
  "tags": {
    "explosion": ["explosion-01", "explosion-02"],
    "weapon": ["laser-shoot"]
  }
}
```

### Step 5: Generate code

Provide ready-to-use TypeScript:

```typescript
import { loadSound, playSound, playMusic } from "@arcane/runtime/rendering";

// Load sounds (do once at startup)
const explosionSfx = loadSound("assets/impact-sounds/Audio/explosion_01.wav");
const laserSfx = loadSound("assets/impact-sounds/Audio/laserShoot.wav");

// Play one-shot sound effect
playSound(explosionSfx);

// Play with options
playSound(laserSfx, { volume: 0.7, pitchVariation: 0.1 });

// For background music
const bgMusic = loadSound("assets/music-loops/track_01.ogg");
playMusic(bgMusic, { loop: true, volume: 0.5 });
```

## Output Format

Always provide:

1. **Pack name** and what sounds it contains
2. **Sound names** matching the request (with file format)
3. **Download commands** (only if pack not already present)
4. **Complete TypeScript code** ready to copy-paste

## Example Interaction

**User:** `/sound I need explosion and laser sound effects`

**Response:**

Found **impact-sounds** (Kenney) with matching sounds:

**Explosions:**
- `explosion-01` (explosion_01.wav)
- `explosion-02` (explosion_02.wav)
- `explosion-03` (explosion_03.wav)

**Lasers/Weapons:**
- `laser-shoot` (laserShoot.wav)
- `laser-large` (laserLarge.wav)

```bash
# Download (run once)
mkdir -p assets
curl -o assets/impact-sounds.json "https://raw.githubusercontent.com/anthropics/asset_palace/main/sounds/kenney/impact-sounds.json"
curl -L -o /tmp/impacts.zip "https://kenney.nl/media/pages/assets/impact-sounds/..."
unzip -o /tmp/impacts.zip -d assets/impact-sounds/
```

```typescript
import { loadSound, playSound } from "@arcane/runtime/rendering";

// Load sounds at startup
const explosion1 = loadSound("assets/impact-sounds/Audio/explosion_01.wav");
const explosion2 = loadSound("assets/impact-sounds/Audio/explosion_02.wav");
const explosion3 = loadSound("assets/impact-sounds/Audio/explosion_03.wav");
const laserSfx = loadSound("assets/impact-sounds/Audio/laserShoot.wav");

// Play with randomization
function playExplosion() {
  const sounds = [explosion1, explosion2, explosion3];
  const idx = Math.floor(Math.random() * sounds.length);
  playSound(sounds[idx], { volume: 0.8, pitchVariation: 0.15 });
}

// Play laser
playSound(laserSfx, { volume: 0.6 });
```

## Common Audio Patterns

### Multiple Variations (Randomize)

```typescript
const explosions = [
  loadSound("assets/impact-sounds/Audio/explosion_01.wav"),
  loadSound("assets/impact-sounds/Audio/explosion_02.wav"),
  loadSound("assets/impact-sounds/Audio/explosion_03.wav"),
];

function playExplosion() {
  const idx = Math.floor(Math.random() * explosions.length);
  playSound(explosions[idx], { pitchVariation: 0.1 });
}
```

### Spatial Audio

```typescript
import { playSoundAt, setListenerPosition, updateSpatialAudio } from "@arcane/runtime/rendering";

// In onFrame:
setListenerPosition(player.x, player.y);
updateSpatialAudio();

// Play sound at world position (auto-pans based on listener)
playSoundAt(explosionSfx, { x: enemy.x, y: enemy.y, maxDistance: 500 });
```

### Music Crossfade

```typescript
import { playMusic, crossfadeMusic } from "@arcane/runtime/rendering";

const menuMusic = loadSound("assets/music/menu.ogg");
const battleMusic = loadSound("assets/music/battle.ogg");

// Start menu music
playMusic(menuMusic, { loop: true, volume: 0.6 });

// Crossfade to battle (2 second transition)
crossfadeMusic(battleMusic, { duration: 2.0, volume: 0.7 });
```

### Bus Mixing

```typescript
import { setBusVolume, playSound } from "@arcane/runtime/rendering";

// Set category volumes
setBusVolume("sfx", 0.8);
setBusVolume("music", 0.5);
setBusVolume("ambient", 0.3);

// Play on specific bus
playSound(explosionSfx, { bus: "sfx" });
```

### Sound Pooling (Limit Concurrent)

```typescript
import { setPoolConfig } from "@arcane/runtime/rendering";

// Limit to 3 simultaneous instances, stop oldest when exceeded
setPoolConfig(laserSfx, { maxInstances: 3, policy: "oldest" });
```

## Audio API Reference

```typescript
// Load (cached by path)
const sfx = loadSound("path/to/sound.wav");

// Play one-shot
playSound(sfx);
playSound(sfx, { volume: 0.8, bus: "sfx", pitchVariation: 0.1 });

// Play at position (spatial)
playSoundAt(sfx, { x, y, maxDistance: 400, volume: 0.8 });

// Music (auto-loops)
playMusic(music, { volume: 0.6, loop: true });

// Crossfade between tracks
crossfadeMusic(newTrack, { duration: 2.0 });

// Instance control
const id = playSound(sfx);
setInstanceVolume(id, 0.5);
stopInstance(id);

// Global control
stopSound(sfx);      // Stop all instances of this sound
stopAll();           // Stop everything
setVolume(0.5);      // Master volume
```

## Important Notes

- Paths are relative to entry file. If entry is `src/visual.ts`, use `../assets/` or absolute paths.
- `loadSound()` caches by path — calling twice returns the same handle.
- Supported formats: `.wav`, `.ogg`, `.mp3`, `.flac`
- Use `pitchVariation` for natural-sounding repeated effects (e.g., footsteps, gunfire).
- Call `updateSpatialAudio()` every frame when using spatial audio.
