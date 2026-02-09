import { AssetPack } from "./types.js";

/**
 * Curated catalog of popular Kenney.nl asset packs
 *
 * All Kenney assets are CC0 (public domain) - no attribution required.
 * Download URLs point to kenney.nl direct download links.
 */
export const KENNEY_CATALOG: AssetPack[] = [
  // 2D Sprites - Platformers
  {
    id: "platformer-pack-redux",
    name: "Platformer Pack Redux (360 assets)",
    description: "Complete platformer art pack with characters, tiles, items, and enemies",
    source: "kenney",
    type: ["2d-sprites", "tilesets"],
    license: "CC0",
    url: "https://kenney.nl/assets/platformer-pack-redux",
    downloadUrl: "https://kenney.nl/content/3-assets/145-platformer-pack-redux/platformerpackredux.zip",
    tags: ["platformer", "character", "tiles", "pixel-art"],
  },
  {
    id: "pixel-platformer",
    name: "Pixel Platformer (220 assets)",
    description: "Pixel art platformer pack with characters, tiles, and decorations",
    source: "kenney",
    type: ["2d-sprites", "tilesets"],
    license: "CC0",
    url: "https://kenney.nl/assets/pixel-platformer",
    downloadUrl: "https://kenney.nl/content/3-assets/108-pixel-platformer/pixelplatformer.zip",
    tags: ["platformer", "pixel-art", "retro"],
  },
  {
    id: "abstract-platformer",
    name: "Abstract Platformer (250 assets)",
    description: "Colorful abstract shapes for platformer games",
    source: "kenney",
    type: ["2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/abstract-platformer",
    downloadUrl: "https://kenney.nl/content/3-assets/134-abstract-platformer/abstractplatformer.zip",
    tags: ["platformer", "abstract", "shapes"],
  },

  // 2D Sprites - Top-down
  {
    id: "topdown-shooter",
    name: "Topdown Shooter (496 assets)",
    description: "Top-down shooter assets with ships, enemies, bullets, and effects",
    source: "kenney",
    type: ["2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/topdown-shooter",
    downloadUrl: "https://kenney.nl/content/3-assets/111-topdown-shooter/topdownshooter.zip",
    tags: ["shooter", "topdown", "spaceship"],
  },
  {
    id: "topdown-tanks-redux",
    name: "Topdown Tanks Redux (506 assets)",
    description: "Tank warfare pack with tanks, terrain, bullets, and explosions",
    source: "kenney",
    type: ["2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/topdown-tanks-redux",
    downloadUrl: "https://kenney.nl/content/3-assets/127-topdown-tanks-redux/topdowntanksredux.zip",
    tags: ["tanks", "topdown", "military"],
  },

  // 2D Sprites - RPG/Fantasy
  {
    id: "tiny-dungeon",
    name: "Tiny Dungeon (234 assets)",
    description: "Micro roguelike dungeon tileset with characters and items",
    source: "kenney",
    type: ["2d-sprites", "tilesets"],
    license: "CC0",
    url: "https://kenney.nl/assets/tiny-dungeon",
    downloadUrl: "https://kenney.nl/content/3-assets/156-tiny-dungeon/tinydungeon.zip",
    tags: ["dungeon", "roguelike", "rpg", "pixel-art"],
  },
  {
    id: "tiny-town",
    name: "Tiny Town (239 assets)",
    description: "Medieval town tileset with buildings, characters, and decorations",
    source: "kenney",
    type: ["2d-sprites", "tilesets"],
    license: "CC0",
    url: "https://kenney.nl/assets/tiny-town",
    downloadUrl: "https://kenney.nl/content/3-assets/157-tiny-town/tinytown.zip",
    tags: ["town", "medieval", "rpg", "pixel-art"],
  },
  {
    id: "roguelike-rpg-pack",
    name: "Roguelike RPG Pack (1366 assets)",
    description: "Massive RPG pack with dungeons, characters, items, and UI",
    source: "kenney",
    type: ["2d-sprites", "tilesets", "ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/roguelike-rpg-pack",
    downloadUrl: "https://kenney.nl/content/3-assets/110-roguelike-rpg-pack/roguelikeroleplayingpack.zip",
    tags: ["roguelike", "rpg", "dungeon"],
  },

  // 2D Sprites - Puzzle
  {
    id: "puzzle-pack",
    name: "Puzzle Pack (280 assets)",
    description: "Colorful puzzle pieces, blocks, and UI elements",
    source: "kenney",
    type: ["2d-sprites", "ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/puzzle-pack",
    downloadUrl: "https://kenney.nl/content/3-assets/104-puzzle-pack/puzzlepack.zip",
    tags: ["puzzle", "blocks", "match-3"],
  },
  {
    id: "puzzle-pack-2",
    name: "Puzzle Pack 2 (290 assets)",
    description: "More puzzle elements with gems, blocks, and effects",
    source: "kenney",
    type: ["2d-sprites", "ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/puzzle-pack-2",
    downloadUrl: "https://kenney.nl/content/3-assets/117-puzzle-pack-2/puzzlepack2.zip",
    tags: ["puzzle", "gems", "match-3"],
  },

  // 2D Sprites - Space
  {
    id: "space-shooter-redux",
    name: "Space Shooter Redux (384 assets)",
    description: "Space shooter pack with ships, enemies, bullets, and backgrounds",
    source: "kenney",
    type: ["2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/space-shooter-redux",
    downloadUrl: "https://kenney.nl/content/3-assets/96-space-shooter-redux/spaceshooterredux.zip",
    tags: ["space", "shooter", "shmup"],
  },

  // UI
  {
    id: "ui-pack",
    name: "UI Pack (322 assets)",
    description: "Complete UI pack with buttons, panels, icons, and widgets",
    source: "kenney",
    type: ["ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/ui-pack",
    downloadUrl: "https://kenney.nl/content/3-assets/141-ui-pack/uipack.zip",
    tags: ["ui", "buttons", "interface"],
  },
  {
    id: "ui-pack-rpg-expansion",
    name: "UI Pack RPG Expansion (250 assets)",
    description: "RPG-themed UI elements with fantasy styling",
    source: "kenney",
    type: ["ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/ui-pack-rpg-expansion",
    downloadUrl: "https://kenney.nl/content/3-assets/142-ui-pack-rpg-expansion/uipackrpgexpansion.zip",
    tags: ["ui", "rpg", "fantasy"],
  },
  {
    id: "ui-pack-space-expansion",
    name: "UI Pack Space Expansion (250 assets)",
    description: "Sci-fi themed UI elements with futuristic styling",
    source: "kenney",
    type: ["ui"],
    license: "CC0",
    url: "https://kenney.nl/assets/ui-pack-space-expansion",
    downloadUrl: "https://kenney.nl/content/3-assets/143-ui-pack-space-expansion/uipackspaceexpansion.zip",
    tags: ["ui", "sci-fi", "space"],
  },

  // Audio
  {
    id: "digital-audio",
    name: "Digital Audio (626 sounds)",
    description: "Digital sound effects for games and UI",
    source: "kenney",
    type: ["audio"],
    license: "CC0",
    url: "https://kenney.nl/assets/digital-audio",
    downloadUrl: "https://kenney.nl/content/3-assets/13-digital-audio/digitalaudio.zip",
    tags: ["audio", "sfx", "digital"],
  },
  {
    id: "impact-sounds",
    name: "Impact Sounds (50 sounds)",
    description: "Hit, punch, and impact sound effects",
    source: "kenney",
    type: ["audio"],
    license: "CC0",
    url: "https://kenney.nl/assets/impact-sounds",
    downloadUrl: "https://kenney.nl/content/3-assets/16-impact-sounds/impactsounds.zip",
    tags: ["audio", "sfx", "impact"],
  },
  {
    id: "music-jingles",
    name: "Music Jingles (35 tracks)",
    description: "Short musical jingles and loops",
    source: "kenney",
    type: ["audio"],
    license: "CC0",
    url: "https://kenney.nl/assets/music-jingles",
    downloadUrl: "https://kenney.nl/content/3-assets/64-music-jingles/musicjingles.zip",
    tags: ["audio", "music", "loop"],
  },

  // Fonts
  {
    id: "kenney-fonts",
    name: "Kenney Fonts (11 fonts)",
    description: "Pixel fonts perfect for game UI",
    source: "kenney",
    type: ["fonts"],
    license: "CC0",
    url: "https://kenney.nl/assets/kenney-fonts",
    downloadUrl: "https://kenney.nl/content/3-assets/29-kenney-fonts/kenneyfonts.zip",
    tags: ["fonts", "pixel-art", "ui"],
  },

  // VFX
  {
    id: "particle-pack",
    name: "Particle Pack (284 assets)",
    description: "Particle effects for explosions, smoke, magic, etc",
    source: "kenney",
    type: ["vfx", "2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/particle-pack",
    downloadUrl: "https://kenney.nl/content/3-assets/138-particle-pack/particlepack.zip",
    tags: ["particles", "vfx", "effects"],
  },

  // Tilesets
  {
    id: "1-bit-pack",
    name: "1-Bit Pack (292 assets)",
    description: "Monochrome 1-bit tileset with dungeon, town, and nature",
    source: "kenney",
    type: ["tilesets", "2d-sprites"],
    license: "CC0",
    url: "https://kenney.nl/assets/1-bit-pack",
    downloadUrl: "https://kenney.nl/content/3-assets/153-1-bit-pack/1bitpack.zip",
    tags: ["1-bit", "monochrome", "tileset"],
  },
];
