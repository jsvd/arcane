# Sprite Demo

Validates asset loading with real sprite sheets and sounds.

## Assets Needed

This demo works with fallback colored squares if assets are missing, but to test real asset loading:

### Sprite Sheet (`assets/character.png`)

A horizontal sprite sheet with 5 frames:
- Frame 0: Idle (facing right)
- Frames 1-4: Walk cycle (4 frames)

**Recommended specs:**
- Format: PNG with transparency
- Size: 32×32 pixels per frame (160×32 total)
- Layout: Horizontal strip (5 frames in one row)

**Where to get free sprites:**
- [Kenney.nl](https://kenney.nl/assets) - CC0 game assets
- [OpenGameArt.org](https://opengameart.org/) - Free sprites (check licenses)
- [itch.io](https://itch.io/game-assets/free) - Free game assets

### Sound Effect (`assets/jump.wav`)

A short sound effect (jump, coin, beep, etc.)

**Recommended specs:**
- Format: WAV, OGG, or MP3
- Duration: 0.1-0.5 seconds
- Volume: Normalized

**Where to get free sounds:**
- [freesound.org](https://freesound.org/) - CC0 and CC-BY sounds
- [Kenney.nl](https://kenney.nl/assets) - Has sound packs too
- Generate your own with [sfxr](https://sfxr.me/) or [jsfxr](https://sfxr.me/)

## Running

```bash
cargo run -- dev demos/sprite-demo/sprite-demo.ts
```

## Controls

- **Arrow Keys**: Move character
- **Space**: Play sound effect
- **R**: Reset position

## Testing Without Real Assets

The demo uses colored squares as fallback if assets are missing, so you can test the code immediately and add real assets later.
