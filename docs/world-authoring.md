# World Authoring

## Code-Defined Scenes

Arcane has no visual scene editor. No `.tscn` files. No drag-and-drop. Scenes are TypeScript code:

```typescript
export const DungeonRoom = scene({
  root: TileMap({ size: [60, 40], tileset: 'dungeon' }),
  children: {
    player: Player({ position: [5, 5] }),
    camera: FollowCamera({ target: 'player', lookahead: 2.0 }),
    fog: FogOfWar({ radius: 8 }),
    ui: layer({
      hud: CharacterHUD(),
      combat: CombatOverlay({ visible: false }),
      pause: PauseMenu({ visible: false }),
    }),
  },
})
```

Scenes are data. They're composable, testable, and version-controllable. Diffs are meaningful. An agent can read, write, and reason about scenes without a visual editor.

## Room / World / Dungeon Specs

Worlds are hierarchical data structures — rooms connected by doors, corridors, and transitions:

```typescript
const CryptOfTheGoblinKing = world({
  name: 'Crypt of the Goblin King',

  rooms: {
    entrance: room({
      size: [20, 15],
      description: 'A crumbling stone entrance, torches flickering.',
      tiles: {
        floor: 'stone_cracked',
        walls: 'dungeon_brick',
        features: [
          door('north', { locked: false, connects: 'hallway' }),
          interactable('torch_1', { position: [2, 1], type: 'torch' }),
        ],
      },
      spawns: [
        encounter('goblin_patrol', {
          enemies: [monster('goblin', 2)],
          trigger: 'on_enter',
        }),
      ],
    }),

    hallway: room({
      size: [30, 8],
      connections: { south: 'entrance', north: 'throne_room', east: 'treasury' },
      spawns: [
        encounter('trap', { type: 'pit_trap', position: [15, 4], dc: 14 }),
      ],
    }),

    throne_room: room({
      size: [25, 25],
      spawns: [
        encounter('boss', {
          enemies: [monster('goblin_king', 1), monster('goblin_guard', 4)],
          trigger: 'on_enter',
          dialogue: 'goblin_king_intro',
        }),
      ],
    }),
  },

  progression: sequence([
    'Clear the entrance',
    'Navigate the hallway (avoid or disarm trap)',
    'Defeat the Goblin King',
  ]),
})
```

## Tilemap Authoring

### Code-Based

```typescript
const entrance = tilemap({
  size: [20, 15],
  layers: {
    ground: fill('stone_floor'),
    walls: border('dungeon_wall', { thickness: 1 }),
    objects: place([
      { tile: 'door_north', position: [10, 0] },
      { tile: 'torch', position: [2, 1] },
      { tile: 'torch', position: [18, 1] },
    ]),
  },
})
```

### ASCII Text Format

For quick prototyping, tilemaps can be defined as ASCII:

```typescript
const entrance = tilemapFromAscii(`
  ###########
  #.........#
  #...M.....#
  #.........#
  #....@....#
  #.........#
  ###D#######
`, {
  '#': 'wall',
  '.': 'floor',
  'M': 'monster_spawn',
  '@': 'player_spawn',
  'D': 'door',
})
```

This format is ideal for AI agents — they can "draw" maps in text, reason about spatial layout, and iterate quickly.

### Tile Legend

Games define their own ASCII legend:

```typescript
const legend = tileLegend({
  '#': { tile: 'wall', collision: true },
  '.': { tile: 'floor' },
  '~': { tile: 'water', properties: { swimmable: true, speed: 0.5 } },
  'T': { tile: 'tree', collision: true, layer: 'objects' },
  'D': { tile: 'door', interactable: true },
  'C': { tile: 'chest', interactable: true, loot: 'random' },
  'M': { spawn: 'monster', remove_tile: true },
  '@': { spawn: 'player', remove_tile: true },
})
```

## Entity Placement

Entities are placed in rooms as part of the room definition:

```typescript
const room = room({
  size: [20, 15],
  entities: [
    npc('merchant', {
      position: [10, 5],
      dialogue: 'merchant_greeting',
      inventory: shopInventory('weapons'),
    }),
    chest({
      position: [15, 12],
      locked: true,
      lockDC: 15,
      loot: [item('potion_of_healing', 2), gold(50)],
    }),
    sign({
      position: [5, 7],
      text: 'Beware: goblins ahead.',
    }),
  ],
})
```

## Encounter Definitions

Encounters are data, not code:

```typescript
const goblinAmbush = encounter({
  name: 'Goblin Ambush',
  trigger: 'on_enter',
  enemies: [
    monster('goblin_archer', { count: 2, position: 'flanking' }),
    monster('goblin_warrior', { count: 1, position: 'blocking' }),
  ],
  conditions: {
    surprise: { check: 'perception', dc: 14 },
    avoidable: { check: 'stealth', dc: 12 },
  },
  rewards: {
    xp: 150,
    loot: randomLoot('goblin_standard', { rolls: 3 }),
  },
})
```

## Procedural Generation

Procedural generation functions return world specs — the same data structures used for hand-authored content:

```typescript
const randomDungeon = generateDungeon({
  rooms: between(5, 12),
  difficulty: 'medium',
  theme: 'undead_crypt',
  guarantees: [
    atLeastOne('boss_encounter'),
    atLeastOne('treasure_room'),
    noDeadEnds(),
  ],
})

// randomDungeon is a regular world spec — same type as hand-authored worlds
// Can be tested, serialized, inspected the same way
```

Procedural and hand-authored content use the same data model. You can:
- Generate a dungeon, then hand-tweak specific rooms
- Start with a hand-authored layout, then procedurally fill rooms
- Generate encounters, then override specific ones

## Testing Worlds

Worlds are data, so they're testable:

```typescript
test('crypt has a path from entrance to boss', () => {
  const world = CryptOfTheGoblinKing
  const path = findPath(world, 'entrance', 'throne_room')
  expect(path).toBeDefined()
  expect(path.length).toBeGreaterThan(0)
})

test('all rooms are reachable', () => {
  const world = CryptOfTheGoblinKing
  const reachable = findReachableRooms(world, 'entrance')
  expect(reachable).toEqual(Object.keys(world.rooms))
})

test('generated dungeon meets constraints', () => {
  for (let seed = 0; seed < 100; seed++) {
    const dungeon = generateDungeon({ ...params, rng: seed })
    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(5)
    expect(hasBossEncounter(dungeon)).toBe(true)
    expect(hasDeadEnds(dungeon)).toBe(false)
  }
})
```
