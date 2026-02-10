# Quick Start: Asset MCP Server v0.2.0

## What Changed

The asset MCP server now reliably finds assets even when you use informal terms like "kitty" or "unicorn".

### Before (v0.1.0)
```
Search "kitty" → No results ❌
Search "unicorn" → No results ❌
Search "xyz123" → Empty result, no help ❌
```

### After (v0.2.0)
```
Search "kitty" → Animal Pack Redux (contains cats) ✅
Search "unicorn" → Animal Pack Redux (contains horses) ✅
Search "xyz123" → Helpful suggestions ✅
```

## Installation

1. **Rebuild the server** (if you haven't already):
   ```bash
   cd mcp/arcane-assets
   npm install
   npm run build
   ```

2. **Configure in Claude Code** (`~/.claude/mcp.json`):
   ```json
   {
     "mcpServers": {
       "arcane-assets": {
         "command": "node",
         "args": ["/Users/arkham/project/arcane/mcp/arcane-assets/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

3. **Restart Claude Code** to load the updated server

## Example Usage

### Searching for Animals

**You say:** "I want to add kitty and unicorn sprites to my game"

**Claude Code will:**
```typescript
// 1. Search for kitty sprites
search_kenney_assets({ query: "kitty" })
// → Finds Animal Pack Redux with cats

// 2. Search for unicorn sprites
search_kenney_assets({ query: "unicorn" })
// → Finds Animal Pack Redux with horses (unicorns are fantasy horses)

// 3. Download the pack
download_kenney_asset({
  id: "animal-pack-redux",
  destination: "./assets"
})
// → Downloads animalpackredux.zip to ./assets/

// 4. Extract and integrate
// Claude extracts the ZIP and updates your game code
```

### Searching for Game Elements

**You say:** "Add wizard and dragon sprites"

**Claude Code will:**
```typescript
search_kenney_assets({ query: "wizard" })
// → Finds: Tiny Battle, Roguelike RPG Pack

search_kenney_assets({ query: "dragon" })
// → Finds: Tiny Battle (highest relevance)

download_kenney_asset({
  id: "tiny-battle",
  destination: "./assets"
})
```

### Exploring the Catalog

**You say:** "Show me all animal packs"

**Claude Code will:**
```typescript
search_kenney_assets({ query: "animal" })
// → Returns 4 packs:
//   - Animal Pack Redux (160 assets)
//   - Creature Mixer (100 assets)
//   - Tiny Battle (234 assets)
//   - Fish Pack (48 assets)
```

## What's Inside Packs

The server now knows what's inside each pack:

### Animal Pack Redux (160 assets)
**Contains:** cat, dog, bird, chicken, cow, pig, sheep, horse, rabbit, mouse, bear, fox

### Tiny Battle (234 assets)
**Contains:** knight, archer, cavalry, wizard, dragon, skeleton, orc

### Roguelike RPG Pack (1366 assets)
**Contains:** knight, wizard, skeleton, orc, chest, potion, weapon, armor, tiles, ui

### Platformer Pack Redux (360 assets)
**Contains:** player, enemies, slime, bee, snail, tiles, coins, gems, spikes

## Synonym Support

The server understands these related terms:

| You search for | Server understands as |
|----------------|----------------------|
| kitty, kitten | cat |
| puppy | dog |
| pony, unicorn | horse |
| mage, sorcerer | wizard |
| warrior, paladin | knight |
| creature, beast | monster |
| treasure, money | coin |
| jewel, crystal | gem |

## Helpful Suggestions

When searches fail, you get guidance:

```typescript
search_kenney_assets({ query: "nonexistent" })
```

**Response:**
```
No results found for "nonexistent".

Suggestions:
  • Try browsing by type: 2d-sprites, audio, fonts, tilesets, ui, vfx
  • Popular packs: platformer-pack-redux, tiny-dungeon, animal-pack-redux, ui-pack
```

## Testing

Run the validation script to verify everything works:

```bash
cd mcp/arcane-assets
node test-search.js
```

Expected output:
```
✅ PASS - Found packs containing cats/kitties
✅ PASS - Found packs containing horses/unicorns
✅ PASS - Found animal packs
✅ PASS - Provided helpful suggestions when no results found

Total packs: 25
Packs with content metadata: 10
```

## New Asset Packs

Five new packs added in this version:

1. **Animal Pack Redux** - Cute cartoon animals (cats, dogs, farm animals)
2. **Creature Mixer** - Mix-and-match monster parts
3. **Tiny Battle** - Medieval units and fantasy creatures
4. **Fish Pack** - Underwater creatures
5. **Toon Characters 1** - Cartoon character sprites

## Troubleshooting

### "MCP server not found"
- Make sure the path in `mcp.json` points to the correct location
- Restart Claude Code after config changes

### "No results for [query]"
- Check the suggestions provided in the response
- Try browsing all packs: `list_kenney_assets()`
- Try searching by type: `search_kenney_assets({ query: "ui", type: "ui" })`

### "Download failed"
- Check destination directory exists and is writable
- Verify internet connection (downloads from kenney.nl)
- Check disk space

## Next Steps

1. Try searching for assets you need
2. Download packs to your game's assets directory
3. Extract ZIP files and integrate sprites into your game
4. Share feedback on what works and what doesn't

## Support

- Documentation: `mcp/arcane-assets/README.md`
- Testing guide: `mcp/arcane-assets/TESTING.md`
- Changelog: `mcp/arcane-assets/CHANGELOG.md`
