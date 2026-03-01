# Level Editor Design — Brainstorm

> Status: **Brainstorm** — not a spec. Exploring approaches that fit Arcane's
> code-first, agent-native philosophy while being practical for humans steering
> agents to build game levels.

## The Problem

Building a 2D game level today in Arcane means writing TypeScript by hand:
tilemap arrays, entity spawn positions, collision shapes, patrol paths. This
works but is slow for spatial tasks. Humans think visually about level layout;
typing `setLayerTile(map, "walls", 14, 7, BRICK)` fifty times is tedious even
with agent help.

We already have `/sprite` (visual asset selector -> code), hot-reload (~200ms),
and the agent protocol (inspect/describe/execute). The question is: **what's
the minimal thing we can build that makes level authoring dramatically faster
without abandoning code-is-the-scene?**

## Design Constraints

1. **Code-is-the-scene**: The output must be TypeScript code or JSON that
   TypeScript imports. No binary scene format, no opaque save file.
2. **Agent-native**: The workflow is human-steers-agent. The human makes
   spatial/creative decisions; the agent writes code.
3. **Test-native**: Levels must remain testable, replayable, diffable.
4. **Zero new dependencies**: Browser UI uses vanilla HTML/JS (like the
   catalog). No React, no Electron, no new npm packages.
5. **Incremental**: Each approach below can be built independently. No
   big-bang rewrite.

---

## Approach 1: `/level` Skill — Tile Painter in Browser

**What**: A browser-based tile painter (like the sprite selector) that outputs
a level data JSON. The agent consumes the JSON and generates TypeScript code.

**Workflow**:

1. Human types `/level`
2. Agent launches browser UI with a tilemap grid
3. Human paints tiles, places named markers for spawn points and exits
4. Human clicks "Copy & Close"
5. Agent receives JSON, generates level TypeScript code

**Browser UI features**:
- Grid canvas (configurable size: 20x15, 40x30, etc.)
- Palette panel showing selected sprite pack tiles
- Layer tabs (ground, walls, decoration, collision)
- Click-to-place, drag-to-fill, right-click-to-erase
- Named markers: drop a pin, name it "player_spawn", "chest_1", etc.
- Export button: writes JSON to stdout (same pattern as /sprite)

**Output format** — JSON with layer grids + named markers:

```json
{
  "gridWidth": 20, "gridHeight": 15, "tileSize": 16,
  "pack": "tiny-dungeon",
  "layers": {
    "ground": [[0,0,1,1], [0,1,1,1]],
    "walls":  [[3,3,3,3], [3,0,0,3]]
  },
  "markers": {
    "player_spawn": { "x": 3, "y": 7 },
    "exit_door": { "x": 18, "y": 1 }
  }
}
```

**Pros**: Follows the `/sprite` pattern exactly. Spatial tasks done spatially.
Output is plain data: testable, diffable, version-controllable.

**Cons**: Building a tile painter UI is nontrivial. Doesn't handle entity
logic — just tile placement + markers.

**Effort**: Medium. ~500 lines HTML/JS, ~100 lines skill definition.

---

## Approach 2: ASCII Level DSL + Agent Translation

**What**: Humans write (or agent drafts) ASCII art levels in a `.level` file.
The agent parses them and generates tilemap code. The ASCII stays in the repo
as the source of truth — readable, diffable, editable by anyone.

**Workflow**:

```
Human: "Make me a dungeon, 20x15, two rooms connected by a corridor"

Agent: [generates ASCII draft]

  ####################
  #........#.........#
  #........+.........#
  #........#.........#
  ######+#############
         #
  ########+###########
  #..@...............#
  #.............$..$!#
  ####################

  Legend: # wall  . floor  + door  @ player  $ chest  ! exit
Human: "Make the top room bigger, add a treasure room on the right"
Agent: [edits the ASCII, regenerates code, hot-reload shows result]
```

**File format** (levels/dungeon-01.level):

```
--- dungeon-01
size: 20x15
pack: tiny-dungeon
legend:
  "#": stone-wall
  ".": stone-floor
  "+": wooden-door
  "@": [marker] player_spawn
  "$": [marker] chest
  "!": [marker] exit
---
####################
#........#.........#
#........+.........#
#........#.........#
######+#############
       #
########+###########
#..@...............#
#.............$..$!#
####################
```

The agent has a parseLevel() function that reads this format and emits the
same structured data as Approach 1. The ASCII file stays in the repo as
human-readable documentation of the level layout.

**Pros**: Zero tooling needed. Works in any text editor. Humans and agents can
both read/write it. Naturally diffable in git. Sokoban demo already uses this
pattern. Extremely fast iteration.

**Cons**: Limited to one tile per character (no multi-layer painting). Complex
levels need multiple ASCII files or layer annotations.

**Effort**: Low. ~200 lines of parser code + skill definition.

---

## Approach 3: Live Inspector + Agent Actions (REPL Editor)

**What**: Use the existing arcane dev --inspector HTTP server to build a
read-modify-render loop. The human describes changes in natural language,
the agent executes actions through the inspector, and the game window
updates live.

**Workflow**:

```
Human: "Add a wall along the top edge"
Agent: [POST /action/setTileRow {"layer":"walls","y":0,"tileId":3}]
       [game window updates immediately]
Human: "Now put a door at position 10,0"
Agent: [POST /action/setTile {"layer":"walls","x":10,"y":0,"tileId":5}]
Human: "Good. Export this level."
Agent: [GET /state -> generates level-01.ts from the state]
```

**Required additions**:
- Register tilemap mutation actions in the agent protocol:
  setTile, setTileRow, setTileRect, clearLayer, placeMarker
- Add exportLevel action that serializes current tilemap state to JSON
- Optional: browser overlay on game window showing grid + cursor

**Pros**: Uses existing infrastructure. Human stays in terminal + game window.
Natural language level editing. Agent sees the same state the human sees.

**Cons**: Slow for large spatial changes unless agent has batch operations.
No direct spatial input from human unless we add a click overlay.

**Effort**: Low-Medium. Mostly registering new agent actions.

---

## Approach 4: Hybrid — WFC Generate + Human Refine

**What**: Use WFC procedural generation as the starting point, then let
the human refine via any of the above approaches.

**Workflow**:

```
Human: "Generate a dungeon. Two big rooms, narrow corridors."
Agent: [configures WFC constraints: reachability, border, minCount(door,2)]
       [runs generate(), validates, shows result in game window]
Human: "Move the spawn to the left room, add a secret room top-right"
Agent: [manually edits the generated grid, re-validates constraints]
```

**Pros**: Fast starting point. Constraints are testable (assertProperty across
100 seeds). Human refines rather than creating from scratch.

**Cons**: Only works for tile-based grid levels. WFC adjacency rules need
careful setup per tileset.

**Effort**: Low. WFC already exists. Just needs a skill wrapper.

---

## Approach 5: Screenshot Annotation Loop

**What**: The agent runs arcane dev, captures a screenshot, and the human
annotates it with drawing/instructions. Uses multimodal model capabilities.

**Workflow**:

```
Human: [screenshot] "Put walls along the red line I drew, enemies at the Xs"
Agent: [interprets annotations, generates setTile calls, hot-reloads]
Human: [new screenshot] "Move that group 3 tiles right"
Agent: [adjusts positions, hot-reloads]
```

**Pros**: Most natural spatial interaction. No new UI. Works for any visual
element, not just tiles.

**Cons**: Requires multimodal model. Annotation precision is limited. Slow
feedback loop. Not deterministic.

**Effort**: Low (prompt engineering), but UX depends on vision quality.

---

## Recommended Path: Layered Approach

These approaches form a natural stack:

```
Layer 4: Screenshot annotation  (opportunistic, zero-build)
Layer 3: WFC generate + refine  (procedural games)
Layer 2: /level tile painter    (visual precision)
Layer 1: ASCII DSL              (universal baseline)
Layer 0: Agent protocol actions (already exists)
```

**Phase 1 — Build Layers 0+1:**
1. Add tilemap mutation actions to agent protocol
2. Build ASCII .level parser + skill
3. Immediately useful, costs almost nothing

**Phase 2 — Add Layer 2:**
4. Build browser tile painter (extend Asset Palace)
5. Outputs same JSON format, so agent code-gen is shared

**Phase 3 — Layer 3:**
6. Wrap WFC in /generate-level skill with pack defaults
7. Generated levels refined via ASCII or painter

Layer 4 works today with no code changes — just document it as a tip.

---

## Shared Level Data Format

All approaches converge on one intermediate format:

```typescript
export type LevelData = {
  id: string;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  pack: string;
  layers: Record<string, number[][]>;
  markers: Record<string, { x: number; y: number }>;
  properties?: Record<string, Record<string, unknown>>;
};

export function loadLevel(data: LevelData, atlas: SpriteAtlas) {
  const map = createLayeredTilemap(/* from data */);
  for (const [name, rows] of Object.entries(data.layers)) {
    applyGridData(map, name, rows);
  }
  return { map, markers: data.markers, properties: data.properties };
}
```

---

## Open Questions

1. **Multi-layer ASCII**: Should .level support multiple layers? Options:
   separate --- sections per layer, or single layer + auto-tile inference.

2. **Entity spawns vs markers**: Markers are named positions. Should the
   format also define entity types, patrol paths, trigger zones? Or keep
   that in code with markers as the bridge?

3. **Tileset mapping**: How does ASCII legend map to atlas tile IDs?
   Per-project config? Convention? Auto-detect from pack metadata?

4. **Round-tripping**: If someone edits generated .level.ts by hand, can
   we regenerate ASCII from it? Or treat generated code as one-way output?

5. **Collaboration**: In agent-team mode, should level files have ownership
   rules? (e.g., one agent owns levels/, another owns systems/)
