# Audio

> **Tip:** Use `/sound explosion laser` to find and download sound packs from Asset Palace. The skill generates ready-to-use code.

## Loading & Playing Sounds

```typescript
import { loadSound, playSound, stopSound, setVolume } from "@arcane/runtime/rendering";

const sfx = loadSound("explosion.ogg");  // cached by path
const id = playSound(sfx, { volume: 0.8, bus: "sfx", pitchVariation: 0.1 });

// Instance control
setInstanceVolume(id, 0.5);
stopInstance(id);
```

## Music

```typescript
import { playMusic, crossfadeMusic } from "@arcane/runtime/rendering";

playMusic("forest-theme.ogg", 0.8);  // path, volume (0.0-1.0)

// Crossfade between zones
crossfadeMusic("dungeon-theme.ogg", 2000, 0.8);  // 2s fade, 80% volume
```

## Spatial Audio

Stereo panning based on position relative to the listener:

```typescript
import { loadSound, playSoundAt, setListenerPosition, updateSpatialAudio } from "@arcane/runtime/rendering";

const ambientSound = loadSound("torch.ogg");
const torch1 = playSoundAt(ambientSound, { x: 200, y: 100, loop: true, volume: 0.8 });
const torch2 = playSoundAt(ambientSound, { x: 600, y: 300, loop: true, volume: 0.8 });

// In onFrame:
setListenerPosition(playerX, playerY);
updateSpatialAudio();  // call every frame
```

## Bus Mixing

Independent volume per category. Final volume = base * bus * master.

```typescript
import { setBusVolume, getBusVolume, playSound, loadSound } from "@arcane/runtime/rendering";

setBusVolume("sfx", 0.9);
setBusVolume("music", 0.6);
setBusVolume("ambient", 0.3);
setBusVolume("voice", 1.0);

const explosion = loadSound("boom.ogg");
playSound(explosion, { bus: "sfx", pitchVariation: 0.15 });
```

## Sound Pooling

Limit concurrent instances of the same sound:

```typescript
import { setPoolConfig } from "@arcane/runtime/rendering";

setPoolConfig(sfx, { maxInstances: 3, policy: "oldest" });
```

## Music Crossfade Between Zones

```typescript
let currentZone = "forest";

function onZoneChange(newZone: string) {
  if (newZone === currentZone) return;
  currentZone = newZone;
  crossfadeMusic(`${newZone}-theme.ogg`, 2000, 0.8);
}
```
