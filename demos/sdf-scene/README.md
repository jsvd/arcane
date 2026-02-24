# SDF Scene Demo

A complete platformer scene built entirely with the TypeScript SDF API. No image assets.

```
arcane dev demos/sdf-scene/sdf-scene.ts
```

Scene includes:
- Gradient sky with glowing sun and fluffy clouds
- Layered parallax mountains
- Green ground with brown platforms (rounded, outlined)
- Trees as SDF compositions
- Glowing collectible gems, heart, and star
- Simple SDF player character (stick figure)

Tests the full pipeline: TS composition -> WGSL generation -> Rust rendering.
