# Testing the Asset MCP Server

## Quick Test

Run the test script to validate all improvements:

```bash
node test-search.js
```

Expected output:
```
✅ PASS - Found packs containing cats/kitties
✅ PASS - Found packs containing horses/unicorns
✅ PASS - Found animal packs
✅ PASS - Provided helpful suggestions when no results found
```

## Manual Testing with Claude Code

Once the MCP server is configured in `~/.claude/mcp.json`, test these scenarios:

### Test 1: Synonym Search (kitty → cat)

**Prompt:** "Search for kitty sprites"

**Expected:** Should find `animal-pack-redux` containing cats

**MCP Call:**
```typescript
search_kenney_assets({ query: "kitty" })
```

**Result:**
```json
{
  "packs": [
    {
      "id": "animal-pack-redux",
      "name": "Animal Pack Redux (160 assets)",
      "contents": ["cat", "dog", "bird", ...]
    }
  ],
  "total": 1
}
```

### Test 2: Content-Aware Search (wizard)

**Prompt:** "Find packs with wizard sprites"

**Expected:** Should find `tiny-battle` and `roguelike-rpg-pack`

**MCP Call:**
```typescript
search_kenney_assets({ query: "wizard" })
```

**Result:** Multiple packs ranked by relevance (ones with "wizard" in contents ranked higher)

### Test 3: Helpful Suggestions (no results)

**Prompt:** "Search for zzz999" (nonsense query)

**Expected:** Should provide helpful suggestions

**MCP Call:**
```typescript
search_kenney_assets({ query: "zzz999" })
```

**Result:**
```
No results found for "zzz999".

Suggestions:
  • Try browsing by type: 2d-sprites, audio, fonts, tilesets, ui, vfx
  • Popular packs: platformer-pack-redux, tiny-dungeon, animal-pack-redux, ui-pack

{
  "packs": [],
  "total": 0,
  "suggestions": [...]
}
```

### Test 4: Type Filtering

**Prompt:** "Find audio with impact sounds"

**MCP Call:**
```typescript
search_kenney_assets({ query: "impact", type: "audio" })
```

**Result:** Should find `impact-sounds` pack only

### Test 5: Download Flow

**Prompt:** "Download the animal pack to ./assets"

**MCP Calls:**
```typescript
// First, search
search_kenney_assets({ query: "animal" })

// Then download
download_kenney_asset({
  id: "animal-pack-redux",
  destination: "./assets"
})
```

**Result:** ZIP file downloaded to `./assets/animalpackredux.zip`

## Common Search Terms to Test

### Animals
- `cat`, `kitty`, `kitten` → Animal Pack Redux
- `dog`, `puppy` → Animal Pack Redux
- `horse`, `pony`, `unicorn` → Animal Pack Redux
- `dragon` → Tiny Battle, Roguelike RPG Pack
- `fish` → Fish Pack

### Characters
- `wizard`, `mage` → Tiny Battle, Roguelike RPG Pack
- `knight`, `warrior` → Tiny Battle, Roguelike RPG Pack, Platformer Pack Redux
- `hero`, `player` → Multiple packs

### Objects
- `coin`, `treasure` → Platformer Pack Redux
- `button` → UI Pack
- `explosion` → Space Shooter Redux, Particle Pack

### Styles
- `pixel-art` → Tiny Dungeon, Pixel Platformer
- `cartoon` → Animal Pack Redux, Toon Characters
- `1-bit` → 1-Bit Pack

## Performance Expectations

- **Search latency:** < 1ms (in-memory catalog)
- **Download latency:** Depends on file size and network (typically 1-5 seconds for most packs)
- **Memory usage:** < 10MB (catalog is small)

## Known Limitations

1. **Catalog is curated** - Only includes selected Kenney packs, not the entire Kenney library
2. **Content metadata is manual** - Not auto-generated from actual pack contents
3. **No fuzzy matching** - "cet" won't find "cat" (only synonyms work)
4. **Downloads are synchronous** - Large packs (>50MB) may take time
5. **No extraction** - Downloads ZIP files, user must extract them

## Future Improvements

- [ ] Add fuzzy string matching for typos
- [ ] Auto-generate content metadata from actual sprite filenames
- [ ] Support automatic ZIP extraction
- [ ] Add thumbnail URLs for visual browsing
- [ ] Integrate Freesound.org for sound effects
- [ ] Add itch.io integration for community assets
