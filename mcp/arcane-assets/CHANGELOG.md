# Changelog

## [0.2.0] - 2026-02-10

### Added
- **Smart synonym search** - Automatically understands related terms (e.g., "kitty" → "cat", "unicorn" → "horse")
- **Content-aware search** - Searches inside packs for specific sprites and assets
- **Search suggestions** - Provides helpful recommendations when no results found
- **Content metadata** - Added `contents` field to asset packs listing specific sprites inside
- **Relevance scoring** - Search results now sorted by relevance (exact matches rank higher)
- **5 new asset packs:**
  - `animal-pack-redux` - 160 cute cartoon animals (cats, dogs, farm animals)
  - `creature-mixer` - 100 mix-and-match monster parts
  - `tiny-battle` - 234 medieval battle units and fantasy creatures
  - `fish-pack` - 48 underwater creatures
  - `toon-characters-1` - 16 cartoon characters

### Changed
- Expanded catalog from 24 to 25+ packs
- Search algorithm now prioritizes content matches over description matches
- Improved search response format with helpful messages for empty results

### Fixed
- Searches like "kitty", "unicorn", "wizard" now return relevant results
- Search no longer limited to exact keyword matches in pack names

## [0.1.0] - 2026-01-XX

### Added
- Initial release with 24 curated Kenney.nl asset packs
- 6 MCP tools: list, search, get, download, types, tags
- CC0 licensed assets (public domain)
- HTTP download support with redirect handling
